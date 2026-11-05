import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guionVuelta, mesEnEscena, pistaSuave, MESES_CON_CLIP, clipDelDia } from '../js/util/guionVuelta.js';
import { escalaGalaxia } from '../js/escena/crecimiento.js';
import { mesesConFraccion } from '../js/util/tiempo.js';

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
test('el clip abre la visita solo el día exacto', () => {
  assert.equal(clipDelDia('2026-11-15'), 11); assert.equal(clipDelDia('2026-12-15'), 12);
  for (const f of ['2026-11-14', '2026-11-16', '2026-12-14', '2026-12-16', '2027-12-15']) assert.equal(clipDelDia(f), 0);
});
test('la galaxia crece cada mes sin saltos y siempre con tope', () => {
  assert.equal(escalaGalaxia(10), 1); assert.ok(escalaGalaxia(11) > 1 && escalaGalaxia(12) > escalaGalaxia(11));
  assert.ok(escalaGalaxia(11.5) > escalaGalaxia(11) && escalaGalaxia(11.5) < escalaGalaxia(12)); assert.ok(escalaGalaxia(600) <= 1.36);
});
test('los meses con fracción avanzan a diario y no llegan al mes siguiente', () => {
  const m = f => mesesConFraccion('2025-12-15', new Date(f));
  assert.equal(m('2026-11-15T12:00:00-03:00'), 11); assert.ok(Math.abs(m('2026-11-30T12:00:00-03:00') - 11.5) < 1e-9);
  assert.ok(m('2026-12-14T12:00:00-03:00') < 12); assert.equal(m('2026-12-15T12:00:00-03:00'), 12);
});
