// El escalón suave común (js/util/suave.js) da, número a número, lo mismo que cada una de las copias a las que sustituye
// (cielo, maravillas, impulsoVisual, texturasPlaneta, formasGalaxia, guiones de los agujeros, TON 618 y Sagitario, escenas
// del púlsar y de los gigantes), también con tramos al revés, vacíos, infinitos y NaN.
import test from 'node:test';
import assert from 'node:assert/strict';
import { suave, suaveEn, suaveEnSeguro } from '../js/util/suave.js';
import { paso } from '../js/escena/formasGalaxia.js';

const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;
const antiguas = {
  'a,b,x (min/max)': [(a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, (a, b, x) => suave(a, b, x)],
  'a,b,x (max/min, impulsoVisual)': [(a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, (a, b, x) => suave(a, b, x)],
  'paso de formasGalaxia': [(a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, (a, b, x) => paso(a, b, x)],
  'x,a,b (guionAgujeros, guionTon618)': [(a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); }, (a, b, x) => suaveEn(x, a, b)],
  'x,a,b con sat (guionSagitario)': [(a, b, x) => { const k = sat((x - a) / (b - a)); return k * k * (3 - 2 * k); }, (a, b, x) => suaveEn(x, a, b)],
  'x,a,b con tramo ≥ 1e-6 (escenaPulsar, escenasGigantes)': [(a, b, s) => { const x = sat((s - a) / Math.max(1e-6, b - a)); return x * x * (3 - 2 * x); }, (a, b, x) => suaveEnSeguro(x, a, b)],
};
const valores = [-Infinity, -1e9, -3, -1, -0.5, -1e-7, -0, 0, 1e-7, 0.1, 0.25, 1 / 3, 0.5, 0.7, 0.999, 1, 1.0000001, 2, 7.5, 1e9, Infinity, NaN];

for (const [nombre, [vieja, nueva]] of Object.entries(antiguas)) {
  test(`suave común = copia ${nombre}`, () => {
    let n = 0;
    for (const a of valores) for (const b of valores) for (const x of valores) {
      const v = vieja(a, b, x), w = nueva(a, b, x);
      assert.ok(Object.is(v, w), `${nombre}: a=${a} b=${b} x=${x}: ${v} ≠ ${w}`); n++;
    }
    // Y una nube de valores al azar (semilla fija).
    let s = 12345; const azar = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 * 6 - 3; };
    for (let i = 0; i < 20000; i++) { const a = azar(), b = azar(), x = azar(); assert.ok(Object.is(vieja(a, b, x), nueva(a, b, x)), `${nombre}: ${a} ${b} ${x}`); n++; }
    assert.ok(n > 20000);
  });
}
