import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector2 } from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BrilloEficiente } from '../js/escena/brillo.js';

test('el brillo conserva resolución, cinco niveles y parámetros al redimensionar', () => {
  const original = new UnrealBloomPass(new Vector2(390, 844), 0.45, 0.3, 0.78);
  const eficiente = new BrilloEficiente(new Vector2(390, 844), 0.45, 0.3, 0.78);
  try {
    for (const [w, h] of [[780, 1688], [1688, 780], [1920, 1080]]) {
      original.setSize(w, h); eficiente.setSize(w, h);
      const objetivos = p => [p.renderTargetBright, ...p.renderTargetsHorizontal, ...p.renderTargetsVertical];
      assert.equal(eficiente.nMips, original.nMips);
      assert.deepEqual(objetivos(eficiente).map(t => [t.width, t.height, t.texture.type]), objetivos(original).map(t => [t.width, t.height, t.texture.type]));
      assert.ok(objetivos(eficiente).every(t => !t.depthBuffer && !t.stencilBuffer));
      assert.deepEqual(eficiente.separableBlurMaterials.map(m => m.uniforms.invSize.value.toArray()), original.separableBlurMaterials.map(m => m.uniforms.invSize.value.toArray()));
    }
    for (const clave of ['strength', 'radius', 'threshold']) assert.equal(eficiente[clave], original[clave]);
  } finally { original.dispose(); eficiente.dispose(); }
});
