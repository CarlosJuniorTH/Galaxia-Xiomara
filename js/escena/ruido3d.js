// Ruido 3D periódico precalculado en una textura (64³, dos canales) para el humo volumétrico del cielo profundo:
// R: ruido de gradiente (Perlin) con periodo 8; G: Worley invertido (celdas, bordes de «coliflor») con periodo 8.
// Se genera una vez (≈ 60 ms) y se muestrea en la GPU con interpolación trilineal y repetición.
import * as THREE from 'three';
import { generador, semillaDe } from '../util/azarSemilla.js';

export function crearRuido3D(N = 64, P = 8) {
  const azar = generador(semillaDe('humo-3d'));
  // Gradientes y puntos de Worley por celda (periódicos).
  const G = new Float32Array(P * P * P * 3), W = new Float32Array(P * P * P * 3);
  for (let i = 0; i < P * P * P; i++) {
    const u = azar() * 2 - 1, a = azar() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    G.set([s * Math.cos(a), s * Math.sin(a), u], i * 3); W.set([azar(), azar(), azar()], i * 3);
  }
  const idx = (x, y, z) => ((((x % P) + P) % P) * P + (((y % P) + P) % P)) * P + (((z % P) + P) % P);
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const datos = new Uint8Array(N * N * N * 2);
  let k = 0;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x / N * P, py = y / N * P, pz = z / N * P, ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz), fx = px - ix, fy = py - iy, fz = pz - iz;
    // Perlin
    let v = 0;
    for (let c = 0; c < 8; c++) {
      const dx = c & 1, dy = (c >> 1) & 1, dz = (c >> 2) & 1, g = idx(ix + dx, iy + dy, iz + dz) * 3;
      const d = G[g] * (fx - dx) + G[g + 1] * (fy - dy) + G[g + 2] * (fz - dz);
      v += d * (dx ? fade(fx) : 1 - fade(fx)) * (dy ? fade(fy) : 1 - fade(fy)) * (dz ? fade(fz) : 1 - fade(fz));
    }
    // Worley (distancia al punto más cercano en las 27 celdas vecinas)
    let m = 9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const w = idx(ix + a, iy + b, iz + c) * 3, ddx = ix + a + W[w] - px, ddy = iy + b + W[w + 1] - py, ddz = iz + c + W[w + 2] - pz;
      const d2 = ddx * ddx + ddy * ddy + ddz * ddz; if (d2 < m) m = d2;
    }
    datos[k++] = Math.max(0, Math.min(255, Math.round((v * 0.9 + 0.5) * 255)));
    datos[k++] = Math.max(0, Math.min(255, Math.round((1 - Math.min(1, Math.sqrt(m))) * 255)));
  }
  const t = new THREE.Data3DTexture(datos, N, N, N);
  t.format = THREE.RGFormat; t.type = THREE.UnsignedByteType;
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
}
