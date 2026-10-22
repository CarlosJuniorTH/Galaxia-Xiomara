// Precisión numérica a 100 millones de años luz (≈ 2·10⁶ unidades): la GPU trabaja en float32.
// three.js calcula modelView = vista⁻¹·mundo en doble precisión en la CPU, así que una geometría con
// coordenadas LOCALES (cada galaxia, nebulosa y destino en su propio grupo) solo recibe posiciones
// relativas a la cámara: el error no depende de lo lejos que esté del origen. Aquí se reproduce el
// camino real (redondeo a float32 de matrices y vértices) en los puntos más exigentes y se compara
// con lo que pasaría con coordenadas de mundo en float32 (lo que no se hace).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { posicionDestino } from '../js/data/sitios.js';

const f32 = x => Math.fround(x);
// Transforma un punto con una matriz (elementos en columna) redondeando como una GPU float32.
function gpu(m, p) {
  const e = m.elements.map(f32), x = f32(p.x), y = f32(p.y), z = f32(p.z);
  const r = [0, 1, 2, 3].map(i => f32(f32(f32(e[i] * x) + f32(e[4 + i] * y)) + f32(f32(e[8 + i] * z) + e[12 + i])));
  return new THREE.Vector3(r[0] / r[3], r[1] / r[3], r[2] / r[3]);
}
// Error en píxeles (focal de 780 px, PC 1440×900) de un vértice local de un objeto en `centro`,
// visto desde `camara` a `distancia` mirando hacia él.
function errorPx(centro, distancia, local, { mundoFloat32 = false } = {}) {
  const cam = new THREE.PerspectiveCamera(60, 1.6, 1, 1e8); cam.position.copy(centro).add(new THREE.Vector3(0.37, 0.61, 1).normalize().multiplyScalar(distancia)); cam.lookAt(centro); cam.updateMatrixWorld();
  const obj = new THREE.Object3D(); obj.position.copy(centro); obj.updateMatrixWorld();
  const exacto = local.clone().applyMatrix4(obj.matrixWorld).applyMatrix4(cam.matrixWorldInverse);
  const mv = new THREE.Matrix4().multiplyMatrices(cam.matrixWorldInverse, obj.matrixWorld);   // en doble, como three
  const real = mundoFloat32 ? gpu(cam.matrixWorldInverse, local.clone().add(centro)) : gpu(mv, local);
  const f = 780;
  return Math.hypot(real.x - exacto.x, real.y - exacto.y) * f / Math.max(1, -exacto.z);
}

test('con geometría local, el error de posición a 100–140 Mal es invisible (< 0,02 px) incluso de cerca', () => {
  const casos = [['supernova (corazón, de cerca)', posicionDestino('supernova', THREE.Vector3), 6000, new THREE.Vector3(5200, -3100, 900)],
    ['TON 618 (disco, de cerca)', posicionDestino('ton618', THREE.Vector3), 3000, new THREE.Vector3(2500, 40, -1800)],
    ['cuásar', posicionDestino('cuasar', THREE.Vector3), 2500, new THREE.Vector3(800, 300, 200)],
    ['galaxia de un encuentro a 47 Mal, al pasar', new THREE.Vector3(150000, -730000, -1630000).multiplyScalar(47 / 100), 4000, new THREE.Vector3(1400, 20, -500)]];
  for (const [nombre, c, d, v] of casos) {
    const e = errorPx(c, d, v), ingenuo = errorPx(c, d, v, { mundoFloat32: true });
    assert.ok(e < 0.02, `${nombre}: ${e.toFixed(4)} px`);
    // Con coordenadas de mundo en float32 (lo que NO se hace) el error sería miles de veces mayor.
    assert.ok(ingenuo > e * 50, `${nombre}: ingenuo ${ingenuo.toFixed(3)} px frente a ${e.toFixed(5)} px`);
  }
});

test('profundidad: con el plano cercano adaptativo, la resolución del búfer de 24 bits basta a cualquier distancia', () => {
  // Resolución de profundidad a distancia z: Δz ≈ z²·(lejos−cerca)/(cerca·lejos·2²⁴) ≈ z²/(cerca·2²⁴).
  const res = (z, cerca) => z * z / (cerca * 2 ** 24);
  // Llegada al corazón (cerca ≈ 0,002·25 000 = 50): el corazón (semiejes 8 206 × 5 630) se resuelve.
  assert.ok(res(25000 + 5630, 50) < 2, `corazón: ${res(30630, 50).toFixed(2)} u`);
  // Paso junto a una galaxia a 3 000 (cerca ≈ 6): su disco (espesor ~30) se resuelve.
  assert.ok(res(4000, 6) < 0.2, `galaxia al pasar: ${res(4000, 6).toFixed(3)} u`);
  // Galaxias remotas a 3 Mal del corazón (60 000) desde la llegada: resolución ≪ separación entre galaxias
  // (las lejanas son imágenes o puntos transparentes que no escriben profundidad).
  assert.ok(res(240000, 50) < 20000 / 100, `remotas: ${res(240000, 50).toFixed(0)} u`);
});
