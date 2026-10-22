// Geometría de los destinos del cosmos (pura, sin escena): la usan cosmos.js, el catálogo de
// galaxias y las pruebas. Dirección en el cielo respecto a la vista inicial de casa: acimut (grados,
// + a la derecha) y elevación (grados, + hacia arriba); distancia en unidades de la escena.
import { DISTANCIA_SUPERNOVA, desdeMal, LEJANIA } from './escalaCosmica.js';
export const GIRO_INICIO = Math.atan2(0.2, 0.88);
export function direccion(acimut, elevacion, distancia, V) {
  const a = acimut * Math.PI / 180, e = elevacion * Math.PI / 180, c = Math.cos(GIRO_INICIO), s = Math.sin(GIRO_INICIO);
  const x = Math.sin(a) * Math.cos(e), y = Math.sin(e), z = -Math.cos(a) * Math.cos(e);
  // giro alrededor de Y (como applyAxisAngle(Y, GIRO_INICIO))
  return new V(x * c + z * s, y, -x * s + z * c).multiplyScalar(distancia);
}
// Distancias a Xiomara (unidades; 1 u ≈ 51 años luz). La supernova a 100 millones de años luz;
// TON 618 aún más lejos (140 Mal; el real está a ~10 800 Mal: comprimido); el cuásar a 100 Mal (tan lejos como la supernova, en otra dirección); la
// Vía Láctea (Sagitario A*) a 1,3 Mal; el púlsar, cerca (licencia).
// Todos los grandes destinos, tan lejos como la supernova (100 Mal), cada uno en su dirección.
export const DIST_TON = Math.round(desdeMal(100 * LEJANIA)), DIST_SGR = Math.round(desdeMal(100 * LEJANIA)), DIST_CUASAR = Math.round(desdeMal(100 * LEJANIA)), DIST_PULSAR = Math.round(desdeMal(100 * LEJANIA)), DIST_DENEB = Math.round(desdeMal(300 * LEJANIA));   // Deneb, tres veces más lejos: más pequeña y tenue desde casa
export const SITIOS_DESTINO = Object.freeze({ ton618: [150, -4, DIST_TON], sagitario: [72, -5, DIST_SGR], supernova: [18, -24, DISTANCIA_SUPERNOVA], cuasar: [-145, -2, DIST_CUASAR], pulsar: [-80, -4, DIST_PULSAR], deneb: [-30, 26, DIST_DENEB] });
export const posicionDestino = (id, V) => id === 'xiomara' ? new V(0, 0, 0) : direccion(...SITIOS_DESTINO[id], V);
