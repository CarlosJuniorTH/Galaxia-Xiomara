import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guionVuelta, mesEnEscena, pistaSuave, MESES_CON_CLIP } from '../js/util/guionVuelta.js';

test('pistaSuave no rebasa ninguna clave ni da marcha atrás', () => {
  const p = pistaSuave([[0, 0], [1, 5], [2, 5], [9, 40]]); let antes = -1;
  for (let s = 0; s <= 9; s += 0.01) { const v = p(s); assert.ok(v >= antes - 1e-9 && v <= 40 + 1e-9); antes = v; }
});
for (const m of MESES_CON_CLIP) test(`mes ${m}: la cámara gira en un solo sentido, despacio y sin saltos`, () => {
  const g = guionVuelta(m); let az = g.camara.az(0), d = g.camara.dist(0);
  for (let s = 0.1; s <= g.duracion; s += 0.1) {
    const a = g.camara.az(s), dd = g.camara.dist(s);
    assert.ok(a >= az - 1e-9, `az retrocede en ${s}`); assert.ok(a - az < 0.45, `az demasiado rápido en ${s}`); assert.ok(Math.abs(dd - d) < 0.2, `dist salta en ${s}`);
    az = a; d = dd;
  }
});
test('mes 11: se detiene en noviembre, con un tramo por recorrer', () => {
  const g = guionVuelta(11);
  assert.ok(Math.abs(g.frente(g.duracion) - 330 * Math.PI / 180) < 1e-6);
  const vistos = new Set(); for (let s = 0; s < g.duracion; s += 0.05) { const i = mesEnEscena(g, s); if (i >= 0) vistos.add(i); }
  assert.deepEqual([...vistos].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});
test('mes 12: la órbita se cierra justo en el estribillo, y nombra los trece recuerdos', () => {
  const g = guionVuelta(12);
  assert.ok(g.frente(13) < Math.PI * 2 - 1e-3); assert.ok(Math.abs(g.frente(14.02) - Math.PI * 2) < 1e-6);
  const vistos = new Set(); for (let s = 0; s < g.duracion; s += 0.05) { const i = mesEnEscena(g, s); if (i >= 0) vistos.add(i); }
  assert.equal(vistos.size, 13);
});
