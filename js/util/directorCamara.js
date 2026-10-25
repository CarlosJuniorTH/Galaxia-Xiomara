// Director de cámara de los videoclips de los gigantes (sin three.js: lo usan js/escena/index.js y sus pruebas).
//
// Cada escena declara una PISTA de cámara: una lista de planos en el segundo de su canción (el reloj del fragmento,
// bandaSonora.tiempo(id)). Todo en el sistema de coordenadas del gigante y en unidades de su radio de encuadre R (la
// distancia a la que index.js lo encuadra al llegar: `lejano.dist`; en la supernova, la del corazón ya nacido):
//
//   { t: 4.2, pos: [az, el, dist], mira: [x, y, z], fov: 40, curva: 'suave', giro: 0 }
//
//   t      segundo del fragmento de audio en el que la cámara ESTÁ en este plano.
//   pos    posición relativa al centro del gigante en esféricas: azimut y elevación en grados y distancia en radios R.
//          Azimut 0 / elevación 0 = la dirección del gigante hacia casa (el origen del universo), en su plano; el azimut
//          crece hacia la derecha de quien mira desde ahí; elevación +90 = su «arriba» (eje de los chorros del cuásar,
//          normal del disco de TON 618, el eje Y del universo en los demás), del lado en el que queda casa. El azimut no
//          se recorta: para dar una vuelta entera, de 0 a 360 (o a -360).
//   mira   punto mirado relativo al centro, en radios R, en los ejes del gigante: x a la derecha, y arriba, z hacia casa.
//   fov    campo de visión vertical en grados (60 es el normal de la web).
//   curva  cómo se llega a ESTE plano desde el anterior:
//            'suave'  (por defecto) acelera y frena (easeInOut): un movimiento tranquilo que se posa en el plano;
//            'rapida' sale disparada y frena al llegar (easeOut fuerte): un golpe, un acercamiento brusco;
//            'corte'  salto seco en el segundo `t` (hasta entonces sigue el plano anterior): un golpe de batería;
//            'lineal' travelling a velocidad constante (encadena sin pararse con el siguiente plano lineal).
//          Dos planos con el mismo `t` también saltan del uno al otro (mover A→B y cortar a C en el mismo segundo).
//   giro   alabeo en grados alrededor de la línea de mirada (opcional).
// Lo que falta en un plano (mira, fov, giro) se hereda del anterior; en el primero: [0,0,0], 60 y 0. La curva, si falta, es 'suave'.
// Antes del primer plano la cámara está en él; después del último, se queda en el último.
//
// Interpolación: Hermite con tangentes de Catmull-Rom (en el tiempo: tramos de duración distinta no dan tirones) sobre
// azimut, elevación, distancia, mira, fov y giro, con el parámetro de cada tramo pasado por su curva. Un corte rompe la
// curva: los tramos de un lado no tiran de los del otro. Al empezar, si el primer plano no es un corte, el director
// funde la posición real de la cámara con la pista en los primeros segundos; al terminar, funde a un encuadre normal.
import { ESCENAS_GIGANTES } from './escenasGigantes.js';
import { CAMARA_AGUJEROS } from './guionAgujeros.js';
import { CAMARA_SUPERNOVA } from './supernovaAmor.js';

export const FOV_BASE = 60;
export const CURVAS = Object.freeze(['suave', 'rapida', 'corte', 'lineal']);
// Duración (s) de los fundidos de entrada y salida (con movimiento reducido, más cortos).
export const ENTRADA = 2, SALIDA = 2.5;
// Límites del zoom al devolver el control, en radios de encuadre: de cerca, lo de siempre al llegar; de lejos, ~2,5×.
export const LIMITES = Object.freeze({ min: 0.3, max: 2.5 });

const GRADOS = Math.PI / 180;
const fin = (v, d) => Number.isFinite(v) ? v : d;
const tres = (v, d) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite) ? [v[0], v[1], v[2]] : d.slice();

// Pista lista para muestrear: ordenada por t (estable), con lo que falta heredado y sin planos inválidos. null si no
// queda ningún plano. Se cachea por pista (la misma lista de planos se normaliza una vez).
const cache = new WeakMap();
export function normalizarPista(pista) {
  if (!Array.isArray(pista) || !pista.length) return null;
  if (cache.has(pista)) return cache.get(pista);
  const validos = pista.map((p, i) => ({ p, i })).filter(({ p }) => p && Number.isFinite(p.t) && Array.isArray(p.pos) && p.pos.length === 3 && p.pos.every(Number.isFinite))
    .sort((a, b) => a.p.t - b.p.t || a.i - b.i);
  let previo = { mira: [0, 0, 0], fov: FOV_BASE, giro: 0 };
  const planos = validos.map(({ p }) => {
    const plano = { t: p.t, pos: [p.pos[0], Math.max(-89.5, Math.min(89.5, p.pos[1])), Math.max(0.02, p.pos[2])], mira: tres(p.mira, previo.mira), fov: Math.max(5, Math.min(120, fin(p.fov, previo.fov))), giro: fin(p.giro, previo.giro), curva: CURVAS.includes(p.curva) ? p.curva : 'suave' };
    previo = plano; return plano;
  });
  const lista = planos.length ? Object.freeze(planos) : null;
  cache.set(pista, lista);
  return lista;
}
export const duracionPista = pista => { const p = normalizarPista(pista); return p ? p[p.length - 1].t : 0; };

// Curvas de cada tramo (u ∈ [0, 1]).
export function aplicarCurva(curva, u) {
  const x = u < 0 ? 0 : u > 1 ? 1 : u;
  if (curva === 'lineal') return x;
  if (curva === 'rapida') return 1 - (1 - x) ** 4;
  if (curva === 'corte') return x < 1 ? 0 : 1;
  return x * x * (3 - 2 * x);   // suave
}

// Canales que se interpolan: [az, el, dist, mx, my, mz, fov, giro].
const N = 8;
const canal = (p, k) => k < 3 ? p.pos[k] : k < 6 ? p.mira[k - 3] : k === 6 ? p.fov : p.giro;
// ¿El plano b empieza un plano nuevo (corte, o el mismo segundo que el anterior)?
const rompe = (a, b) => b.curva === 'corte' || b.t <= a.t;

export function crearMuestra() { return { pos: [0, 0, 1], mira: [0, 0, 0], fov: FOV_BASE, giro: 0, indice: 0 }; }

// Muestra de la pista en el segundo t (escribe en `salida`: sin memoria nueva en cada cuadro).
export function muestrearCamara(pista, t, salida = crearMuestra()) {
  const P = normalizarPista(pista);
  if (!P) return null;
  const n = P.length;
  let i = 0;
  // Último plano con t_i ≤ t (si hay varios en el mismo segundo, el último de ellos).
  while (i + 1 < n && P[i + 1].t <= t) i++;
  const a = P[i], b = P[i + 1];
  salida.indice = i;
  if (!b || t <= a.t && i === 0 || b.curva === 'corte') {
    // Antes del primero, después del último o esperando a un corte: quieta en el plano a.
    for (let k = 0; k < N; k++) escribir(salida, k, canal(a, k));
    return salida;
  }
  const h = b.t - a.t, u = aplicarCurva(b.curva, (t - a.t) / h);
  // Vecinos para las tangentes; si un corte los separa, se reflejan (el tramo sigue recto en ese extremo).
  const p0 = i > 0 && !rompe(P[i - 1], a) ? P[i - 1] : null, p3 = i + 2 < n && !rompe(b, P[i + 2]) ? P[i + 2] : null;
  const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  for (let k = 0; k < N; k++) {
    const va = canal(a, k), vb = canal(b, k);
    const ma = p0 ? (vb - canal(p0, k)) / (b.t - p0.t) : (vb - va) / h, mb = p3 ? (canal(p3, k) - va) / (p3.t - a.t) : (vb - va) / h;
    escribir(salida, k, h00 * va + h10 * h * ma + h01 * vb + h11 * h * mb);
  }
  salida.pos[1] = Math.max(-89.5, Math.min(89.5, salida.pos[1])); salida.pos[2] = Math.max(0.02, salida.pos[2]); salida.fov = Math.max(5, Math.min(120, salida.fov));
  return salida;
}
function escribir(s, k, v) { if (k < 3) s.pos[k] = v; else if (k < 6) s.mira[k - 3] = v; else if (k === 6) s.fov = v; else s.giro = v; }

// Mezcla de dos muestras (k = 0 → a, 1 → b), el azimut por el camino corto. Escribe en `salida` (puede ser a o b).
export function mezclarMuestras(a, b, k, salida = crearMuestra()) {
  let d = ((b.pos[0] - a.pos[0]) % 360 + 540) % 360 - 180;
  if (d === -180 && b.pos[0] > a.pos[0]) d = 180;
  const az = a.pos[0] + d * k;
  for (let j = 1; j < 3; j++) salida.pos[j] = a.pos[j] + (b.pos[j] - a.pos[j]) * k;
  for (let j = 0; j < 3; j++) salida.mira[j] = a.mira[j] + (b.mira[j] - a.mira[j]) * k;
  salida.pos[0] = az; salida.fov = a.fov + (b.fov - a.fov) * k; salida.giro = a.giro + (b.giro - a.giro) * k;
  return salida;
}

// Esféricas del gigante [az°, el°, dist] → cartesianas en sus ejes [x derecha, y arriba, z hacia casa], y al revés.
export function esfericasACartesianas(pos, salida = [0, 0, 0]) {
  const az = pos[0] * GRADOS, el = pos[1] * GRADOS, d = pos[2];
  salida[0] = d * Math.cos(el) * Math.sin(az); salida[1] = d * Math.sin(el); salida[2] = d * Math.cos(el) * Math.cos(az);
  return salida;
}
export function cartesianasAEsfericas(v, salida = [0, 0, 0]) {
  const d = Math.hypot(v[0], v[1], v[2]);
  salida[0] = Math.atan2(v[0], v[2]) / GRADOS; salida[1] = d > 1e-9 ? Math.asin(Math.max(-1, Math.min(1, v[1] / d))) / GRADOS : 0; salida[2] = d;
  return salida;
}

// La pista de cada gigante: la de su escena (js/util/escenasGigantes.js, `camara` en ESCENA_PULSAR, ESCENA_CUASAR,
// ESCENA_DENEB), la de los agujeros (CAMARA_AGUJEROS en js/util/guionAgujeros.js) o la de la supernova (CAMARA_SUPERNOVA en
// js/util/supernovaAmor.js). `config`: la configuración con la que se lanzó la escena (si trae otra pista). null: sin pista
// (la cámara se queda donde está, con los controles bloqueados, y al final vuelve igualmente a un encuadre normal).
export function pistaDe(id, config = null) {
  const propia = config?.camara ?? ESCENAS_GIGANTES[id]?.camara ?? CAMARA_AGUJEROS[id] ?? (id === 'supernova' ? CAMARA_SUPERNOVA : null);
  return normalizarPista(propia);
}
