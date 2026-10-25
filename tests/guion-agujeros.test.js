import test from 'node:test';
import assert from 'node:assert/strict';
import { guionTon618, guionSagitario, guionReposo, marcasDe, finEscena, PULSO, DURACION, COMPAS } from '../js/util/guionAgujeros.js';
import { MOMENTOS } from '../js/data/bandaSonora.js';

test('las escenas usan las marcas de la banda sonora y terminan con su canción', () => {
  for (const id of ['ton618', 'sagitario']) {
    assert.ok(MOMENTOS[id].archivo, `${id} tiene canción`);
    for (const [k, v] of Object.entries(MOMENTOS[id].marcas)) assert.equal(marcasDe(id)[k], v, `${id}.${k}`);
    assert.ok(finEscena(id) <= DURACION[id] + 0.5 && finEscena(id) > DURACION[id] - 2, `${id}: la escena acaba con la canción`);
  }
  assert.ok(Math.abs(COMPAS.ton618 - 1.778) < 0.01 && Math.abs(COMPAS.sagitario - 2.345) < 0.01, 'un compás cada 1,78 s y 2,34 s');
});

test('TON 618: la materia cae, las corrientes se funden en el último «tuyo» y queda en calma', () => {
  const M = marcasDe('ton618'), g = t => ({ ...guionTon618(t, M) });
  assert.equal(g(0).corrientes, 0); assert.equal(g(0).latido, 0);
  assert.ok(g(M.serTuyo + 2.5).corrientes > 0.99, 'las corrientes aparecen con «quiero ser tuyo»');
  assert.ok(g(M.ultimoTuyo - 2).fusion < 0.05 && g(M.ultimoTuyo + 1.3).fusion > 0.99, 'se funden en el último «tuyo»');
  assert.ok(g(finEscena('ton618')).calma > 0.99 && g(120).calma === 1 && g(120).latido < 1e-6, 'después, calma sin repetirse');
  assert.equal(g(120).deriva, 0, 'la cámara deja de moverse sola');
  // Los latidos del estribillo caen en la rejilla de la canción (tiempos pares) y no antes del estribillo.
  const P = PULSO.ton618.periodo; let max = 0, tMax = 0;
  for (let t = M.estribillo + 2 * P * 3; t < M.estribillo + 2 * P * 4; t += 0.005) { const l = g(t).latido; if (l > max) { max = l; tMax = t; } }
  const fase = ((tMax - PULSO.ton618.inicio) / (2 * P)) % 1;
  assert.ok(fase < 0.12, `el latido cae justo después de un tiempo par (fase ${fase.toFixed(3)})`);
  assert.ok(g(M.estribillo - 0.3).latido < 0.25, 'antes del estribillo, solo respiraciones suaves');
  // Sin saltos en lo que se mueve (el reloj puede ir a trompicones: la imagen no).
  for (const k of ['revelar', 'corrientes', 'avance', 'fusion', 'calma', 'deriva']) { let a = g(0)[k]; for (let t = 0; t < 45; t += 0.02) { const b = g(t)[k]; assert.ok(Math.abs(b - a) < 0.05, `${k} a ${t.toFixed(2)} s`); a = b; } }
});

test('Sagitario A*: las órbitas se ordenan a compases, dibujan corazones en el estribillo y la pareja llega en la segunda frase', () => {
  const M = marcasDe('sagitario'), g = t => ({ ...guionSagitario(t, M) });
  assert.equal(g(0).orden, 0); assert.ok(g(M.estribillo).orden > 0.99, 'ordenadas al llegar el estribillo');
  assert.ok(g(M.estribillo - 1).corazon < 0.05 && g(M.estribillo + 2.1).corazon > 0.99, 'corazones en el estribillo');
  assert.ok(g(M.segundaFrase - 1).pareja === 0 && g(M.segundaFrase + 2.5).pareja > 0.99, 'la pareja en la segunda frase');
  assert.ok(g(60).calma === 1 && g(60).corazon === 1, 'en calma, los corazones se quedan');
  // Cada compás, un paso: a mitad de un compás el orden ya casi no se mueve (se asentó con la música).
  const c = COMPAS.sagitario, t0 = Math.ceil(5 / c) * c, d1 = g(t0 + 0.2 * c).orden - g(t0).orden, d2 = g(t0 + 0.9 * c).orden - g(t0 + 0.7 * c).orden;
  assert.ok(d1 > 0 && d2 === 0, `paso a compás (${d1.toFixed(3)}, ${d2.toFixed(3)})`);
});

test('movimiento reducido: la misma escena, más tranquila', () => {
  const M = marcasDe('ton618');
  let max = 0, maxR = 0; for (let t = 0; t < 40; t += 0.01) { max = Math.max(max, guionTon618(t, M).latido); const r = guionTon618(t, M, { reducido: true }); maxR = Math.max(maxR, r.latido); assert.equal(r.ondaFuerza, 0); }
  assert.ok(maxR < max * 0.4, `latidos ${maxR.toFixed(2)} frente a ${max.toFixed(2)}`);
  assert.equal(guionSagitario(M.estribillo + 1, marcasDe('sagitario'), { reducido: true }).chispaFuerza, 0);
  assert.deepEqual(Object.keys(guionReposo('ton618')).sort(), Object.keys(guionTon618(3, M)).sort(), 'el reposo tiene los mismos campos');
});
