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

// (TON 618: tests/guion-ton618.test.js)

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
  assert.equal(guionSagitario(M.estribillo + 1, marcasDe('sagitario'), { reducido: true }).chispaFuerza, 0);
  assert.deepEqual(Object.keys(guionReposo('ton618')).sort(), Object.keys(guionTon618(3, M)).sort(), 'el reposo tiene los mismos campos');
});
