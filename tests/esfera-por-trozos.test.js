// La esfera envolvente a trozos (js/escena/carga/preparacion.js) es exactamente la de three.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { esferaPorTrozos } from '../js/escena/carga/preparacion.js';

test('esferaPorTrozos = BufferGeometry.computeBoundingSphere, bit a bit', async () => {
  let s = 7; const azar = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  for (const n of [60000, 200003]) {
    const p = new Float32Array(n * 3); for (let i = 0; i < p.length; i++) p[i] = (azar() - 0.3) * 1e4 * (i % 3 + 1);
    const a = new THREE.BufferGeometry(), b = new THREE.BufferGeometry();
    a.setAttribute('position', new THREE.BufferAttribute(p, 3)); b.setAttribute('position', new THREE.BufferAttribute(p.slice(), 3));
    a.computeBoundingSphere(); let cedidas = 0; await esferaPorTrozos(b, async () => { cedidas++; });
    assert.ok(cedidas > 2);
    assert.ok(Object.is(a.boundingSphere.radius, b.boundingSphere.radius));
    assert.deepEqual(a.boundingSphere.center.toArray(), b.boundingSphere.center.toArray());
  }
});
