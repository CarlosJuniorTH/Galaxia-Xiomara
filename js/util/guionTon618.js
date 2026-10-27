// Guion del videoclip de TON 618 con «I Wanna Be Yours» (Arctic Monkeys; fragmento ton618.m4a = 101,634–138,971 s de la
// canción). Sin navegador ni three.js: lo usan js/escena/ton618.js, js/util/guionAgujeros.js y sus pruebas. Todo es
// función del segundo del fragmento (si el reloj salta, la imagen es la de ese segundo).
//
// La historia es lo que un agujero negro HACE: tragar lo que cae. Una estrella viene de lejos y cae hacia él; la marea la
// estira en un hilo (la letra: lo que guardaba en el corazón ya no se puede esconder), pasa rozando el horizonte justo en
// el primer «yours» (su imagen se curva alrededor de la sombra), da la vuelta y su materia se enrosca en anillos que
// encienden el disco: cada «yours» enciende un anillo más y una onda de luz cae hasta el horizonte. Al principio TON 618
// es un agujero dormido con un disco frío y tenue («versión de inicio»); al acabar, el disco completo que se queda.
//
// Tiempos medidos (segundos del fragmento): Whisper sobre la voz aislada (Demucs) para la primera mitad; para la segunda
// (la voz repite el estribillo y Whisper se pierde) los arranques de la voz con librosa: cada frase empieza en un compás
// impar (17,79 · 21,34 · 24,89 · 28,44 · 32,02 · 35,55), el «be» cae en ese compás y el «yours» medio segundo después,
// sostenido. 136 BPM: tiempo 0,4445 s, compás 1,778 s; el bombo en el 1 y en el contratiempo del 3–4; la caja en el 3.

const suave = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const muySuave = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * k * (k * (k * 6 - 15) + 10); };
// Un golpe de luz: sube en 25 ms y se apaga en «caida» segundos (sin parpadeo de un cuadro).
const golpe = (dt, caida) => dt < 0 ? 0 : (1 - Math.exp(-dt / 0.025)) * Math.exp(-dt / caida);

// Marcas (js/data/bandaSonora.js las usa tal cual): secretos «secrets…» · corazon «…my heart» · esconder «harder to
// hide…» · quizas «maybe…» · tuyo (el primer «yours»: la estrella pasa rozando) · tuyo2 / tuyo3 (el gancho, dos veces) ·
// mantra (empieza la repetición) · cumbre (el último «yours» completo: el disco entero) · fundido (queda en calma).
export const MARCAS_TON618 = Object.freeze({ secretos: 1.42, corazon: 4.04, esconder: 4.64, quizas: 8.02, tuyo: 11.18, tuyo2: 12.98, tuyo3: 14.74, mantra: 17.79, cumbre: 32.51, fundido: 35 });
// Cada «yours» de la voz (los del mantra, cada dos compases).
export const TUYOS = Object.freeze([11.18, 12.98, 14.74, 18.3, 21.82, 25.39, 28.95, 32.51, 36.05]);
// Golpes de bombo (no_vocals de Demucs, energía por debajo de 150 Hz).
export const BOMBO = Object.freeze([0, 1.74, 3.08, 3.53, 5.31, 6.63, 7.08, 8.86, 10.18, 10.63, 12.41, 13.29, 14.19, 15.08, 15.96, 17.3, 17.75, 19.52, 20.85, 21.3, 23.08, 24.42, 24.86, 26.63, 27.97, 28.41, 30.19, 31.52, 31.97, 33.74, 35.07, 35.53, 37.3]);
export const DURACION_TON618 = 37.3;

// ── La estrella que cae (el mismo cálculo en el shader de js/escena/ton618.js, GLSL_CAIDA) ──
// Órbita parabólica (ecuación de Barker) con el pericentro a Q radios de sombra justo en el primer «yours»; plano
// inclinado INCL sobre el disco (llega desde arriba). Tras el pericentro la materia se enrosca: su radio va hacia el de
// su anillo (rc) y su giro hacia el de Kepler del disco. Ángulos como los del disco: (cos φ, sin φ) en el plano XZ.
export const CAIDA = Object.freeze({ Q: 2.4, S0: 2.0, PSI: 0.0873, INCL: -0.26, T1: 1.0, T2: 1.6 });
const giroKepler = r => 1.0472 * Math.pow(r / 1.3, -1.5);
// Posición (en radios de sombra) de la materia que va por su camino con «tau» segundos desde el pericentro y anillo rc.
export function caminoCaida(tau, rc = 4, o = [0, 0, 0]) {
  const { Q, S0, PSI, INCL, T1, T2 } = CAIDA;
  let r, f, plano;
  if (tau <= 0) {
    // Barker: D³ + 3D − 3T = 0 (Cardano; raíz cúbica con signo).
    const T = tau / S0, w = Math.sqrt(2.25 * T * T + 1), D = Math.cbrt(1.5 * T + w) + Math.cbrt(1.5 * T - w);
    r = Q * (1 + D * D); f = 2 * Math.atan(D); plano = 1;
  } else {
    const wp = 2 / S0, wc = giroKepler(Math.max(rc, 1)), e1 = Math.exp(-tau / T1), e2 = Math.exp(-tau / T2);
    r = rc + (Q - rc) * (1 + tau / T2) * e2; f = wc * tau + (wp - wc) * T1 * (1 - e1); plano = Math.exp(-tau / 1.5);
  }
  // En el plano de la órbita: P (hacia el pericentro) y Q' (perpendicular, inclinada INCL); al enroscarse cae al disco.
  const c = Math.cos(PSI), s = Math.sin(PSI), x = r * Math.cos(f), y = r * Math.sin(f), ci = 1 - (1 - Math.cos(INCL)) * plano;
  o[0] = x * c - y * s * ci; o[1] = y * Math.sin(INCL) * plano; o[2] = x * s + y * c * ci;
  return o;
}
// Estiramiento de la marea (segundos de camino que separan la cabeza de la cola): una estrella compacta hasta «harder to
// hide», se estira al acercarse y, tras el pericentro, el hilo se alarga sin parar (cada parte a su ritmo).
export const estiramiento = t => 0.012 + 0.35 * suave(t, MARCAS_TON618.esconder, 10.2) + 0.5 * Math.max(0, t - 10.2);
// La estrella (su centro) en el segundo t.
export const estrella = (t, o) => caminoCaida(t - MARCAS_TON618.tuyo, 4, o);

// ── Guion de la imagen ──
//  encendido  0 → 1: cuánto disco está encendido (al llegar, un disco frío y tenue; cada «yours» enciende otro anillo)
//  revelar    luz de la imagen curvada (lo de detrás de la sombra): 0,5 dormido → 1 («harder to hide») → 1,25 → 1
//  destello   el anillo de fotones en cada «yours» (una línea nítida más viva, sin halo)
//  ola / olaR0 / olaF   onda de luz que cae desde el borde encendido hasta el horizonte (progreso 0 → 1, radio de salida, fuerza)
//  bombo      el golpe del bombo en el disco de fuera
//  caida      presencia de la estrella y su hilo (0 fuera de la escena; se funde en el disco al final)
//  latidoEstrella   el destello de la estrella en «my heart»
//  cumbre     el golpe de luz de todo el disco en el último «yours» completo (se apaga en ~1,5 s)
//  avivar     el disco que come brilla más (1 en reposo; sube con el mantra hasta la cumbre y vuelve a 1)
//  flujo      velocidad con la que el disco cae en espiral hacia el centro (1 = la de siempre)
//  calma      0 → 1 en el fundido
const ENCENDIDO = [[MARCAS_TON618.tuyo, 0.26], [12.98, 0.34], [14.74, 0.42], [18.3, 0.52], [21.82, 0.62], [25.39, 0.72], [28.95, 0.84], [32.51, 1]];
export function guionTon618(t, M = MARCAS_TON618, { reducido = false } = {}, o = {}) {
  const k = reducido ? 0.3 : 1;
  o.t = t;
  // Encendido a saltos en cada «yours» (cada salto se asienta en 0,9 s); antes, el disco dormido.
  let enc = 0.12;
  for (let i = 0; i < ENCENDIDO.length; i++) { const s = ENCENDIDO[i][0], v = ENCENDIDO[i][1]; enc += (v - enc) * muySuave(t, s - 0.15, s + 0.9); }
  o.encendido = Math.min(1, enc + (1 - enc) * muySuave(t, M.fundido, M.fundido + 2));
  o.revelar = 0.5 + 0.5 * suave(t, M.esconder, M.quizas) + 0.25 * suave(t, M.tuyo - 0.6, M.tuyo + 1) - 0.25 * suave(t, M.cumbre + 0.5, M.fundido + 2);
  o.destello = 0; o.ola = -1; o.olaR0 = 6.8; o.olaF = 0;
  for (let i = 0; i < TUYOS.length; i++) {
    const s = TUYOS[i]; if (t < s - 0.2) break;
    o.destello += golpe(t - s, i === 0 ? 0.9 : 0.55) * (i === 0 ? 1.4 : i === 7 ? 1.2 : 0.8) * k;
    // La onda cae desde el borde ya encendido (el de antes de este «yours») hasta el horizonte en 1,6 s, acelerando.
    if (i >= 1) { const p = (t - s + 0.2) / 1.6; if (p <= 1.15) { o.ola = p; o.olaR0 = 1.3 + 5.5 * ENCENDIDO[Math.min(i - 1, ENCENDIDO.length - 1)][1]; o.olaF = (reducido ? 0.3 : 1) * (i === 7 ? 1.3 : 1); } }
  }
  o.bombo = 0;
  for (const b of BOMBO) { if (b > t) break; o.bombo = golpe(t - b, 0.16); }
  o.bombo *= (t < M.tuyo ? 0.12 : 0.3) * k * (1 - suave(t, M.fundido, M.fundido + 2));
  o.latidoEstrella = golpe(t - M.corazon, 0.45) * k;
  o.caida = 1 - muySuave(t, 30, 36.5);
  o.cumbre = golpe(t - M.cumbre, 1.5) * k;
  o.avivar = 1 + 0.45 * suave(t, M.tuyo, M.mantra) + 0.35 * suave(t, 28.95, M.cumbre) - 0.8 * suave(t, M.cumbre + 0.5, M.fundido + 2);
  o.flujo = 1 + 4 * suave(t, M.tuyo, M.mantra) * (1 - suave(t, M.cumbre, M.fundido + 2));
  o.calma = muySuave(t, M.fundido, M.fundido + 2.3);
  return o;
}
export const REPOSO_TON618 = Object.freeze({ t: 0, encendido: 1, avivar: 1, cumbre: 0, revelar: 1, destello: 0, ola: -1, olaR0: 6.8, olaF: 0, bombo: 0, latidoEstrella: 0, caida: 0, flujo: 1, calma: 0 });

// ── Pista de cámara (la lleva el director común, js/util/directorCamara.js): segundos del fragmento; pos = [azimut°,
// elevación°, distancia] respecto al centro, en el marco del disco (azimut 0 = el lado de casa; elevación sobre el plano
// del disco); distancia y mira en radios de encuadre (la distancia de llegada: 1 = donde deja el viaje; la sombra mide
// 0,11 y el disco 0,7). El primer plano no es un corte: el director entra en la pista desde donde esté la cámara. ──
export const CAMARA_TON618 = Object.freeze([
  // Lenta y suave, siempre hacia el mismo lado (una sola vuelta en toda la canción), sin vaivenes.
  // Llegada: el agujero dormido; la estrella asoma a la izquierda, lejos.
  { t: 0, pos: [0, 9.2, 1.0], mira: [0, 0, 0], fov: 60, curva: 'suave' },
  // «secrets… heart» / «harder to hide»: la cámara empieza a rodear el agujero, despacio, y se acerca un poco; la
  // estrella va quedando detrás de él y se estira.
  { t: 4.6, pos: [-14, 9, 0.93], mira: [-0.03, 0.01, 0], fov: 58, curva: 'lineal' },
  { t: 8.02, pos: [-45, 6, 0.82], mira: [-0.01, 0.01, 0], fov: 55, curva: 'lineal' },
  // Primer «yours»: la estrella pasa justo por detrás; su luz rodea la sombra. La cámara, casi en el plano.
  { t: 11.18, pos: [-90, 4, 0.72], mira: [0, 0, 0], fov: 52, curva: 'lineal' },
  // El gancho y el mantra: sigue la vuelta, sube poco a poco para ver el disco encenderse anillo a anillo y las ondas
  // que caen al horizonte en cada «yours».
  { t: 18.3, pos: [-150, 14, 0.66], mira: [0, 0, 0], fov: 52, curva: 'lineal' },
  { t: 25.39, pos: [-215, 22, 0.62], mira: [0, 0, 0], fov: 52, curva: 'lineal' },
  { t: 29.4, pos: [-255, 26, 0.6], mira: [0, 0, 0], fov: 52, curva: 'lineal' },
  // La cumbre (el último «yours» entero): baja despacio hasta casi el plano: el disco entero ardiendo, su imagen curvada
  // por encima y por debajo de la sombra, en el golpe de luz.
  { t: 32.51, pos: [-290, 5, 0.54], mira: [0, 0.02, 0], fov: 50, curva: 'lineal' },
  { t: 34.6, pos: [-312, 6, 0.6], mira: [0, 0.01, 0], fov: 52, curva: 'lineal' },
  // Fundido: se aleja hasta el encuadre de llegada y devuelve el control.
  { t: 37.3, pos: [-345, 12, 0.92], mira: [0, 0, 0], fov: 60, curva: 'suave' }
]);
