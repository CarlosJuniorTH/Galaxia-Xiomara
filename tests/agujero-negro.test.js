import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, PerspectiveCamera } from 'three';
import { crearAgujeroNegro } from '../js/escena/agujeroNegro.js';

test('la materia que cae al núcleo conserva forma circular y límite, y se anima en la GPU', () => {
  const scene = new Scene(), camera = new PerspectiveCamera();
  const uScale = { value: 1200 }, uPR = { value: 3 };
  const nucleo = crearAgujeroNegro({ scene, uScale, uPR });
  const puntos = [];
  scene.traverse(o => { if (o.isPoints) puntos.push(o); });
  assert.equal(puntos.length, 1);
  const { material, geometry } = puntos[0];
  assert.equal(material.isShaderMaterial, true);
  assert.equal(material.uniforms.uPR, uPR);
  assert.equal(material.uniforms.uMaximo.value, 3);
  assert.match(material.fragmentShader, /if \(d > 0.5\) discard/);
  const n = geometry.getAttribute('position').count;
  assert.ok(n >= 360);
  for (const nombre of ['aColor', 'aSize', 'aPhase']) assert.equal(geometry.getAttribute(nombre).count, n);
  for (const tiempo of [0, 10, 3600]) {
    nucleo.actualizar(tiempo, 1 / 60, { camera, pulso: 0 });
    assert.ok(geometry.getAttribute('position').array.every(Number.isFinite));
    assert.equal(material.uniforms.uTime.value, tiempo);
  }
  scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
});
