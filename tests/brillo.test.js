import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector2 } from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BrilloMips, anchuras, NIVELES } from '../js/escena/brillo.js';

test('el resplandor es una cadena de mips de ½ a 1/32 de la escena, sin profundidad, con los parámetros del original', () => {
  const original = new UnrealBloomPass(new Vector2(390, 844), 0.45, 0.3, 0.78);
  const mips = new BrilloMips(new Vector2(390, 844), 0.45, 0.3, 0.78);
  try {
    for (const [w, h] of [[780, 1688], [1688, 780], [1920, 1080]]) {
      original.setSize(w, h); mips.setSize(w, h);
      assert.equal(mips.nMips, original.nMips);
      assert.deepEqual(mips.bajadas.map(t => [t.width, t.height]), original.renderTargetsHorizontal.map(t => [t.width, t.height]), 'mismos niveles: ½, ¼ … 1/32');
      assert.ok([...mips.bajadas, ...mips.subidas].every(t => !t.depthBuffer && !t.stencilBuffer));
    }
    for (const clave of ['strength', 'radius', 'threshold']) assert.equal(mips[clave], original[clave]);
    assert.equal(mips.salida, mips.subidas[0], 'la pasada final lee el nivel de ½ ya acumulado');
  } finally { original.dispose(); mips.dispose(); }
});

test('cada nivel tiene la anchura del original (bajada + tiendas + su núcleo) y la bajada usa el filtro de 13 lecturas', () => {
  const a = anchuras();
  assert.equal(a.length, NIVELES);
  for (const n of a) assert.ok(Math.abs(n.conseguida - n.varianza) < 1e-6 * Math.max(1, n.varianza), JSON.stringify(n));
  assert.ok(a.every((n, k) => k === 0 || n.varianza > a[k - 1].varianza), 'cada nivel más ancho que el anterior');
  const mips = new BrilloMips(new Vector2(390, 844), 0.45, 0.3, 0.78);
  try {
    assert.equal((mips.prefiltro.fragmentShader.match(/lee\(vec2\(/g) || []).length, 13);
    assert.match(mips.prefiltro.fragmentShader, /noValido/);
    assert.match(mips.materialesSubida[0].fragmentShader, /0\.0625/);
  } finally { mips.dispose(); }
});
