// Trayectorias que no atraviesan cuerpos. Cada obstáculo es { c: centro, r: radio de navegación,
// llegada?: true } (ver docs/ESCALA-Y-ESPACIO.md: el radio de navegación no es el de un halo ni el de
// una nebulosa, que se pueden cruzar).
//
// Reglas de aplicación (las mismas para corregir y para comprobar):
//  · si el destino está dentro del obstáculo, no se aplica, salvo que sea de «llegada» (la galaxia
//    de casa): entonces solo se libra el tramo final, a menos de 2,2 r del destino;
//  · si la salida está dentro (la cámara parte de casa), la ruta puede salir pero no adentrarse:
//    se libran los puntos que no están más de un 5 % más cerca del centro que el punto de partida.
//
// La comprobación es sobre la CURVA FINAL muestreada densamente y SEGMENTO a segmento (distancia
// del centro al segmento, no solo a sus extremos): corregir puntos aislados no garantiza que el
// tramo entre dos muestras no corte un cuerpo pequeño.
import * as THREE from 'three';

export const sinRepetidos = lista => lista.filter((p, i) => i === 0 || p.distanceTo(lista[i - 1]) > 2);

const tmp = new THREE.Vector3(), ab = new THREE.Vector3();
// Punto del segmento AB más cercano a C (en `fuera`) y su distancia.
export function cercanoSegmento(a, b, c, fuera = new THREE.Vector3()) {
  ab.subVectors(b, a); const l2 = ab.lengthSq();
  const t = l2 > 0 ? THREE.MathUtils.clamp(tmp.subVectors(c, a).dot(ab) / l2, 0, 1) : 0;
  fuera.copy(a).addScaledVector(ab, t); return fuera.distanceTo(c);
}
const aplica = (o, p, desde, hasta) => {
  const destinoDentro = hasta.distanceTo(o.c) <= o.r, salidaDentro = desde.distanceTo(o.c) < o.r;
  if (destinoDentro && !(o.llegada && p.distanceTo(hasta) > o.r * 2.2)) return false;
  if (salidaDentro && p.distanceTo(o.c) >= desde.distanceTo(o.c) * 0.95) return false;   // margen del 5 %: el giro inicial alrededor de casa
  return true;
};

// Holgura mínima de la curva frente a los obstáculos (distancia / radio; ≥ 1 es no tocar).
export function holgura(curva, desde, hasta, obstaculos, muestras = 2000) {
  const pts = curva.getSpacedPoints(muestras), q = new THREE.Vector3();
  let minimo = Infinity, cual = -1;
  for (let i = 1; i < pts.length; i++) obstaculos.forEach((o, k) => {
    const d = cercanoSegmento(pts[i - 1], pts[i], o.c, q);
    if (!aplica(o, q, desde, hasta)) return;
    if (d / o.r < minimo) { minimo = d / o.r; cual = k; }
  });
  return { minimo, obstaculo: cual };
}

// Desvía la curva alrededor de cada cuerpo que corta: se busca su punto de máxima aproximación y la
// dirección del trayecto allí, y los puntos cercanos se apartan hacia un LADO perpendicular a esa
// dirección (empujar en radial no basta: si la ruta pasa por el centro, los puntos se moverían a lo
// largo de la propia ruta). Se repite hasta que la curva final densa, por segmentos, los libra.
export function esquivar(curva, desde, hasta, obstaculos, { pasadas = 10, muestras = 200, margen = 1.25 } = {}) {
  let actual = curva;
  const q = new THREE.Vector3(), arriba = new THREE.Vector3(0, 1, 0);
  for (let pasada = 0; pasada < pasadas; pasada++) {
    const densos = actual.getSpacedPoints(1500);
    let cambiado = false;
    const pts = actual.getSpacedPoints(muestras + pasada * 60);
    for (const o of obstaculos) {
      // Máxima aproximación (por segmentos) entre los tramos en los que aplica.
      let mejor = Infinity, enI = -1, cerca = new THREE.Vector3();
      for (let i = 1; i < densos.length; i++) { const d = cercanoSegmento(densos[i - 1], densos[i], o.c, q); if (d < mejor && aplica(o, q, desde, hasta)) { mejor = d; enI = i; cerca.copy(q); } }
      if (mejor >= o.r) continue;
      const t = densos[Math.min(densos.length - 1, enI)].clone().sub(densos[enI - 1]).normalize();
      // Lado del desvío: hacia donde ya pasa la ruta; si pasa por el centro, por encima.
      const lado = cerca.clone().sub(o.c); lado.addScaledVector(t, -lado.dot(t));
      if (lado.length() < o.r * 1e-3) { lado.copy(arriba).addScaledVector(t, -arriba.dot(t)); if (lado.length() < 1e-3) lado.set(1, 0, 0).addScaledVector(t, -t.x); }
      lado.normalize();
      const R = o.r * margen;
      for (let i = 1; i < pts.length - 1; i++) {
        const rel = pts[i].clone().sub(o.c), a = rel.dot(t);
        if (Math.abs(a) >= R * 1.15 || !aplica(o, pts[i], desde, hasta)) continue;
        const necesaria = Math.sqrt(Math.max(0, R * R * 1.15 * 1.15 - a * a)), actualLado = rel.dot(lado);
        if (rel.length() < R * 1.15 && actualLado < necesaria) { pts[i].addScaledVector(lado, necesaria - actualLado); cambiado = true; }
      }
    }
    if (!cambiado) break;
    actual = new THREE.CatmullRomCurve3(sinRepetidos(pts), false, 'centripetal');
  }
  return actual;
}
