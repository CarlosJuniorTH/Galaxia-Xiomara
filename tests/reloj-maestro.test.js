// Reloj maestro (js/util/relojMaestro.js) con un AudioContext simulado: continuo, sin ir nunca hacia atrás, pegado al audio
// cuando suena y quieto cuando el audio se para.
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRelojMaestro } from '../js/util/relojMaestro.js';

function montar() {
  let p = 1000, oculta = false;
  // Contexto simulado: su tiempo avanza con la página mientras suena; la salida va 40 ms por detrás (latencia).
  const ctx = { state: 'suspended', t: 0, base: null, get currentTime() { return this.t + 0.04; }, outputLatency: 0.04, baseLatency: 0,
    getOutputTimestamp() { return this.state === 'running' ? { contextTime: this.t, performanceTime: p } : { contextTime: this.t, performanceTime: 0 }; } };
  const reloj = crearRelojMaestro({ ahoraPagina: () => p, instanteCuadro: () => p, oculta: () => oculta }); reloj.usarContexto(ctx);
  const avanzar = (ms, { audio = true } = {}) => { p += ms; if (audio && ctx.state === 'running') ctx.t += ms / 1000; return reloj.cuadro(); };
  return { ctx, reloj, avanzar, ocultar: v => { oculta = v; } };
}

test('sin audio va con la página, y un hueco largo (pestaña oculta) no cuenta entero', () => {
  const { reloj, avanzar } = montar();
  const a = reloj.ahora(), b = avanzar(16.7);
  assert.ok(Math.abs(b - a - 0.0167) < 1e-9);
  const c = avanzar(5000);
  assert.ok(c - b <= 0.25 + 1e-9 && c > b);
});

test('al sonar el audio sigue desde donde iba (sin salto) y después avanza exactamente con él', () => {
  const { ctx, reloj, avanzar } = montar();
  for (let i = 0; i < 30; i++) avanzar(16.7);
  const antes = reloj.ahora();
  ctx.state = 'running'; ctx.t = 123.4;
  const primero = avanzar(16.7);
  assert.ok(primero >= antes && primero - antes < 0.05, 'continuo al cambiar de origen');
  assert.equal(reloj.dominio, 'audio');
  const t0 = ctx.t, s0 = primero;
  for (let i = 0; i < 120; i++) avanzar(16.7);
  assert.ok(Math.abs((reloj.ahora() - s0) - (ctx.t - t0)) < 1e-6, 'avanza lo mismo que el audio');
  assert.ok(Math.abs(reloj.desfase()) < 1, 'lo que se ve es lo que se oye (< 1 ms)');
  // Programar en el contexto: el instante del reloj maestro y el del contexto se corresponden.
  assert.ok(Math.abs(reloj.deContexto(reloj.aContexto(42)) - 42) < 1e-12);
});

test('cuadros irregulares (jank) no lo desvían: sigue al audio, sin saltos ni retrocesos', () => {
  const { ctx, reloj, avanzar } = montar();
  ctx.state = 'running'; avanzar(16.7);
  const s0 = reloj.ahora(), t0 = ctx.t; let prev = s0;
  for (const ms of [16.7, 80, 16.7, 16.7, 250, 33, 16.7, 16.7, 16.7]) { const s = avanzar(ms); assert.ok(s > prev); prev = s; }
  assert.ok(Math.abs((reloj.ahora() - s0) - (ctx.t - t0)) < 1e-6);
});

test('con el audio parado (oculta) se queda quieto y al volver sigue desde ahí; parado a la vista, sigue con la página', () => {
  const { ctx, reloj, avanzar, ocultar } = montar();
  ctx.state = 'running'; avanzar(16.7); for (let i = 0; i < 10; i++) avanzar(16.7);
  const quieto = reloj.ahora();
  ctx.state = 'suspended'; ocultar(true);
  assert.equal(avanzar(3000, { audio: false }), quieto, 'oculta: quieto, como la música');
  ocultar(false); ctx.state = 'running';
  const vuelta = avanzar(16.7);
  assert.ok(vuelta >= quieto && vuelta - quieto < 0.05, 'sigue desde donde se paró');
  // El sistema retiene el audio con la página a la vista: medio segundo quieto y después el reloj de la página.
  ctx.state = 'interrupted';
  const r1 = avanzar(200, { audio: false });
  assert.ok(Math.abs(r1 - vuelta) < 1e-9);
  avanzar(600, { audio: false });
  assert.equal(reloj.dominio, 'pagina');
  const r2 = avanzar(16.7, { audio: false });
  assert.ok(r2 > r1 && r2 - r1 < 0.05);
});

test('jitter del audio (cuantos de 128 muestras): la imagen avanza lisa, sin saltos', () => {
  const { ctx, reloj } = montar();
  let p = 0; const r = crearRelojMaestro({ ahoraPagina: () => p, instanteCuadro: () => p });
  // Sin getOutputTimestamp: currentTime avanza a saltos de 128 muestras (2,67 ms a 48 kHz).
  const c = { state: 'running', t: 0, get currentTime() { return Math.floor(this.t / (128 / 48000)) * (128 / 48000); }, outputLatency: 0.02, baseLatency: 0 };
  r.usarContexto(c);
  const pasos = [];
  let prev = r.cuadro();
  for (let i = 0; i < 600; i++) { p += 16.667; c.t += 0.016667; const s = r.cuadro(); pasos.push(s - prev); prev = s; }
  const resto = pasos.slice(60), media = resto.reduce((a, b) => a + b, 0) / resto.length;
  assert.ok(resto.every(d => Math.abs(d - media) < 0.0012), 'cada cuadro avanza lo mismo (±1,2 ms)');
  assert.ok(Math.abs(r.desfase()) < 3, 'y la imagen va a menos de 3 ms del audio');
  void ctx; void reloj;
});
