import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPlanificador } from '../js/util/planificador.js';
import { resolucionPostal, crearCapturador } from '../js/util/captura.js';

// Simula rAF a una frecuencia de pantalla y cuenta cuántos cuadros se dibujan en `ms`.
function simular(plan, hz, ms, estado = () => ({}), desde = 0) {
  let dibujados = 0;
  for (let t = desde; t < desde + ms; t += 1000 / hz) if (plan.decidir(t, estado(t))) dibujados++;
  return dibujados;
}

test('dentro, el móvil dibuja siempre a 60 (también a 120 Hz) y el PC al ritmo de la pantalla con tope 120', () => {
  const movil = crearPlanificador({ objetivo: 60 });
  const n = simular(movil, 120, 1000, () => ({ activo: true }));
  assert.ok(n >= 59 && n <= 61, `${n}`);
  const m = simular(crearPlanificador({ objetivo: 60 }), 60, 1000, () => ({ activo: true }));
  assert.ok(m >= 59 && m <= 61, `a 60 Hz se dibuja cada cuadro: ${m}`);
  const pc = simular(crearPlanificador({ objetivo: 60, alto: 120 }), 240, 1000, () => ({ activo: true }));
  assert.ok(pc >= 118 && pc <= 121, `PC a 240 Hz: ${pc}`);
  const pc120 = simular(crearPlanificador({ objetivo: 60, alto: 120 }), 120, 1000, () => ({ activo: true }));
  assert.ok(pc120 >= 118 && pc120 <= 121, `PC a 120 Hz: ${pc120}`);
});

test('nunca un ritmo intermedio: sin tocar sigue a 60; quieto 15 s no dibuja y el toque vuelve a 60 en el cuadro siguiente', () => {
  const plan = crearPlanificador({ objetivo: 60, esperaMs: 15000 });
  plan.actividad(0);
  const reciente = simular(plan, 120, 1000, () => ({}), 0);
  assert.ok(reciente >= 59 && reciente <= 61, `sin tocar, aún a 60: ${reciente}`);
  assert.ok(simular(plan, 120, 1000, () => ({}), 10000) >= 59, 'a los 10 s, sigue a 60 (sin paso a 30)');
  assert.equal(simular(plan, 120, 3000, () => ({}), 16000), 0, 'quieto más de 15 s: 0 FPS');
  const animado = simular(plan, 120, 1000, () => ({ activo: true }), 19000);
  assert.ok(animado >= 59 && animado <= 61, `una animación vuelve a 60: ${animado}`);
  assert.equal(simular(plan, 120, 1000, () => ({}), 20000), 0, 'y al acabar, sin tocar desde hace rato, se duerme');
  plan.actividad(21000);
  assert.ok(plan.decidir(21000 + 1000 / 120, {}), 'el toque dibuja en el cuadro siguiente');
  assert.ok(simular(plan, 120, 1000, () => ({}), 21000 + 2000 / 120) >= 58, 'y sigue a 60');
});

test('en lectura no se dibuja y en pausa solo cuando se pide un cuadro', () => {
  const plan = crearPlanificador();
  plan.decidir(0, {});
  assert.equal(simular(plan, 60, 2000, () => ({ reposo: true }), 100), 0);
  assert.equal(simular(plan, 60, 2000, () => ({ quieto: true }), 3000), 0);
  plan.pedirCuadro();
  assert.equal(simular(plan, 60, 2000, () => ({ quieto: true }), 6000), 1);
});

test('la postal respeta un presupuesto de memoria y restaura la resolución siempre', async () => {
  assert.equal(resolucionPostal(430, 775, 3), 3);              // iPhone: 3,0 Mpx
  assert.ok(resolucionPostal(3840, 2160, 2) <= 1.25);          // monitor 4K: no se duplica
  let actual = 2; const fijadas = [];
  const capturar = crearCapturador({ obtener: () => actual, fijar: v => { actual = v; fijadas.push(v); } });
  assert.equal(await capturar(3, async () => 'ok'), 'ok');
  assert.equal(actual, 2);
  await assert.rejects(capturar(3, async () => { throw new Error('copia 2D fallida'); }), /copia 2D/);
  assert.equal(actual, 2, 'restaurada tras el error');
  let liberar; const lenta = capturar(3, () => new Promise(r => (liberar = r)));
  await assert.rejects(capturar(3, async () => 'otra'), /Ya se está guardando/);
  liberar('fin'); assert.equal(await lenta, 'fin'); assert.equal(actual, 2);
  assert.deepEqual(fijadas, [3, 2, 3, 2, 3, 2]);
});
