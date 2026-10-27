// Ruido azul (void-and-cluster, Ulichney 1993) de 32×32, generado una vez al cargar (~1024² sumas, unos milisegundos):
// el desfase del primer paso de cada rayo del gas volumétrico (nube.js). Cada cuadro se le suma un desfase de razón áurea,
// así cada píxel recorre todos los desfases en pocos cuadros y la acumulación temporal (capaVolumen.js) los promedia: el
// mismo gas con menos muestras y sin bandas. Como ruido azul, lo que queda en un cuadro suelto no forma grumos.
import * as THREE from 'three';

export const LADO_RUIDO = 32;

export function generarRuidoAzul(L = LADO_RUIDO, sigma = 1.5) {
  const n = L * L, energia = new Float64Array(n), lleno = new Uint8Array(n), rango = new Float32Array(n);
  const radio = Math.ceil(sigma * 4), nucleo = [];
  for (let dy = -radio; dy <= radio; dy++) for (let dx = -radio; dx <= radio; dx++) nucleo.push([dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))]);
  const sumar = (k, s) => { const x = k % L, y = (k / L) | 0; for (const [dx, dy, w] of nucleo) energia[((y + dy + L) % L) * L + ((x + dx + L) % L)] += s * w; };
  // Orden de llenado: cada punto nuevo va al hueco más vacío (menos energía de los ya puestos). Empieza con una semilla fija.
  let semilla = 12345; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  let k0 = Math.floor(azar() * n);
  for (let i = 0; i < n; i++) {
    lleno[k0] = 1; rango[k0] = (i + 0.5) / n; sumar(k0, 1);
    let mejor = -1, e = Infinity;
    for (let k = 0; k < n; k++) if (!lleno[k] && energia[k] < e) { e = energia[k]; mejor = k; }
    k0 = mejor;
  }
  return rango;
}

let textura = null;
export function texturaRuidoAzul() {
  if (textura) return textura;
  const r = generarRuidoAzul(), datos = new Uint8Array(LADO_RUIDO * LADO_RUIDO * 4);
  for (let k = 0; k < r.length; k++) { const v = Math.round(r[k] * 255); datos[k * 4] = datos[k * 4 + 1] = datos[k * 4 + 2] = v; datos[k * 4 + 3] = 255; }
  textura = new THREE.DataTexture(datos, LADO_RUIDO, LADO_RUIDO, THREE.RGBAFormat);
  textura.minFilter = textura.magFilter = THREE.NearestFilter; textura.wrapS = textura.wrapT = THREE.RepeatWrapping; textura.needsUpdate = true;
  return textura;
}

// Uniformes compartidos por todo el gas: la tabla y el desfase del cuadro (< 0: sin desfase, 0,5 fijo como antes).
export const AZAR_VOLUMEN = { uRuidoAzul: { value: null }, uAzarVolumen: { value: -1 } };
