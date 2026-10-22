import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { distanciaGalaxia, escalaLimitada } from '../js/util/encuadre.js';

test('el encuadre vertical conserva la anchura visible de la galaxia', () => {
  const referencia = 16 / 9;
  const anchura = aspecto => 2 * distanciaGalaxia(aspecto) * Math.tan(Math.PI / 6) * aspecto;
  for (const aspecto of [390 / 844, 360 / 800, 430 / 932, 844 / 390]) {
    assert.ok(anchura(aspecto) >= anchura(referencia) - 1e-8);
  }
  assert.equal(distanciaGalaxia(referencia), 950);
});

test('un recuerdo cercano conserva su límite CSS al acercarse y cambiar orientación', () => {
  for (const alto of [390, 844, 932]) for (const profundidad of [0, 5, 30, 90, 400, 3000]) {
    const escala = escalaLimitada(46, 26, profundidad, alto, 60);
    assert.ok(escala >= 0 && escala <= 46);
    if (profundidad > 0) {
      const pixeles = escala * alto / (2 * profundidad * Math.tan(Math.PI / 6));
      assert.ok(pixeles <= 26 + 1e-8);
    }
  }
});

test('los degradados GLSL constantes no usan smoothstep con límites invertidos', async () => {
  for (const nombre of await readdir(new URL('../js/escena/', import.meta.url))) {
    if (!nombre.endsWith('.js')) continue;
    const texto = await readFile(new URL(`../js/escena/${nombre}`, import.meta.url), 'utf8');
    for (const m of texto.matchAll(/smoothstep\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,/g)) {
      assert.ok(Number(m[1]) < Number(m[2]), `${nombre}: ${m[0]}`);
    }
  }
});
