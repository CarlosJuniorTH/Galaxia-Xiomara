import test from 'node:test';
import assert from 'node:assert/strict';
import { crearIndiceEsferas } from '../js/util/indiceEsferas.js';

// El índice espacial da EXACTAMENTE la misma distancia que recorrer todas las esferas.
test('índice de esferas: misma distancia que la fuerza bruta', () => {
  let s = 12345; const azar = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const esferas = Array.from({ length: 3000 }, (_, i) => ({ x: (azar() - 0.5) * 4e7 * (i % 7 ? 1 : 0.05), y: (azar() - 0.5) * 6e6, z: (azar() - 0.5) * 4e7, r: 1000 + azar() ** 4 * 4e5 }));
  const indice = crearIndiceEsferas(esferas);
  for (let k = 0; k < 2000; k++) {
    const x = (azar() - 0.5) * 5e7, y = (azar() - 0.5) * 1e7, z = (azar() - 0.5) * 5e7;
    let m = Infinity; for (const e of esferas) m = Math.min(m, Math.hypot(e.x - x, e.y - y, e.z - z) - e.r);
    assert.ok(Math.abs(indice.distancia(x, y, z) - m) < 1e-6, `punto ${k}`);
  }
  assert.equal(crearIndiceEsferas([]).distancia(0, 0, 0), Infinity);
});
