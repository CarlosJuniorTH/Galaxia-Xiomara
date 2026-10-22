import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPlanificador } from '../js/util/planificador.js';
import { crearReguladorResolucion } from '../js/util/resolucion.js';
import { resolucionPostal, crearCapturador } from '../js/util/captura.js';

// Simula rAF a una frecuencia de pantalla y cuenta cuántos cuadros se dibujan en `ms`.
function simular(plan, hz, ms, estado = () => ({}), desde = 0) {
  let dibujados = 0;
  for (let t = desde; t < desde + ms; t += 1000 / hz) if (plan.decidir(t, estado(t))) dibujados++;
  return dibujados;
}

test('a 120 Hz no se dibuja más de 60 veces por segundo durante la interacción', () => {
  const plan = crearPlanificador();
  const n = simular(plan, 120, 1000, () => ({ activo: true }));
  assert.ok(n >= 59 && n <= 61, `${n}`);
  const plan60 = crearPlanificador();
  const m = simular(plan60, 60, 1000, () => ({ activo: true }));
  assert.ok(m >= 59 && m <= 61, `a 60 Hz se dibuja cada cuadro: ${m}`);
});

test('sin actividad pasa a contemplación (30 FPS) y vuelve a 60 al tocar', () => {
  const plan = crearPlanificador({ contemplacion: 30, esperaMs: 4000 });
  plan.actividad(0);
  assert.ok(simular(plan, 120, 1000, () => ({}), 0) >= 59, 'actividad reciente');
  const quieta = simular(plan, 120, 1000, () => ({}), 5000);
  assert.ok(quieta >= 29 && quieta <= 31, `contemplación: ${quieta}`);
  plan.actividad(6000);
  assert.ok(simular(plan, 120, 1000, () => ({}), 6000) >= 59, 'al tocar vuelve a 60');
});

test('en lectura no se dibuja y en pausa solo cuando se pide un cuadro', () => {
  const plan = crearPlanificador();
  plan.decidir(0, {});
  assert.equal(simular(plan, 60, 2000, () => ({ reposo: true }), 100), 0);
  assert.equal(simular(plan, 60, 2000, () => ({ quieto: true }), 3000), 0);
  plan.pedirCuadro();
  assert.equal(simular(plan, 60, 2000, () => ({ quieto: true }), 6000), 1);
});

test('el regulador no sube con ventanas estables no consecutivas (16,7/19 ms alternadas)', () => {
  const registrar = crearReguladorResolucion({ minimo: 1.5, maximo: 3, inicial: 2 });
  const ventana = ms => { let r = null; for (let t = 0; t < 1500; t += ms) { const v = registrar(ms); if (v !== null) r = v; } return r; };
  for (const ms of [16.7, 19, 16.7, 19, 16.7, 19, 16.7, 19]) assert.equal(ventana(ms), null, `subió tras ${ms}`);
  for (let i = 0; i < 5; i++) assert.equal(ventana(16.7), null);
  assert.equal(ventana(16.7), 2.25, 'seis consecutivas sí suben');
});

test('reiniciar descarta la ventana en curso (pausas y cambios de ritmo)', () => {
  const registrar = crearReguladorResolucion({ minimo: 1.5, maximo: 3, inicial: 2 });
  for (let t = 0; t < 2500; t += 40) registrar(40);   // cuadros lentos de contemplación…
  registrar.reiniciar();                               // …descartados al cambiar de modo
  let r = null; for (let t = 0; t < 1000; t += 16.7) r = registrar(16.7) ?? r;
  assert.equal(r, null, 'no baja la resolución por cuadros de otro ritmo');
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
