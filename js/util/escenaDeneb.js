// Deneb → deneb.m4a (43,4 s), un trozo de «Middle» (DJ Snake ft. Bipolar Sunshine) a 105 BPM: un pulso cada 0,5716 s y un
// compás cada 2,286 s desde el 0 (medido en sus pulsos y compases) (compases en 0; 2,30; 4,57; …; 20,57; …; 32,00; …; 41,15). Aquí solo hay números y curvas
// (sin three.js): las pruebas los comprueban sin navegador. Lo que se dibuja: js/escena/deneb.js.
//
// La historia la cuenta lo que hace una estrella: NACER. Al llegar se ve Deneb tal como es (supergigante blanca azulada,
// con sus protuberancias y su «mundo»: los anillos de motas que la rodean). Con la letra:
//   0–2,5    se acaba el compás de la parte anterior (aún hay bombo): Deneb tal cual.
//   2,5      el ritmo se apaga (pre-estribillo solo con voz): silencio, calma.
//   4,33     «turn back the time» (giro 4,33 · vuelta 4,67 · tiempo 5,21): el tiempo se REBOBINA de verdad, a la vista:
//            todo lo que pasó para que naciera la estrella ocurre al revés. Los anillos se deshacen en el disco, la estrella se apaga y encoge hasta una brasa (5,8–6,7), y el disco se desenrosca hasta ser otra vez
//            una nube oscura y fría; la superficie, el viento y las órbitas corren hacia atrás.
//   7,03 / 8,56  los dos «alright»: la brasa da sus dos últimos latidos mientras todo se dispersa.
//   9,57     «for us»: ya no hay nada. Una nube oscura y quieta: «como si no fuese nada».
//   11,03    «I promise»: la nube cae hacia el centro (girando, como cae el gas de verdad) y se aplana en un disco.
//   12,01    «build»: ENCENDIDO. Nace la estrella: un frente de motas sale de ella y crece hasta su tamaño.
//   13,23    «new world»: lo que sobra del disco se ordena en siete anillos (órbitas) alrededor de ella, de dentro
//            afuera; las protuberancias, arcos rosas, nacen primero, pegadas a ella. 14,9 «for us two»: en uno de los
//            anillos se forman dos mundos pequeños, juntos (uno rosa y otro dorado).
//   16,01 / 17,49  «with you»: el mundo se cierra; la cámara la rodea.
//   19,16    «in the middle»: su mundo terminado y visto de lleno, ella en el centro exacto: los anillos se encienden
//            uno tras otro de fuera adentro, hacia ella, y la estrella responde.
//   20,57    el DROP: el estribillo instrumental con su bombo. Deneb en toda su gloria: la superficie hierve, el viento y las
//            protuberancias se avivan, cada golpe manda una onda de luz por los anillos y lanza eyecciones de motas.
//   32,00    segunda mitad: todo igual de vivo, más cálido (rosa y oro en los anillos).
//   41,15    se serena hasta su estado de siempre (el mismo que al llegar: sin saltos).
// El estado es el mismo en s = 0 y en s ≥ fin (el «normal», lo que se ve fuera de la escena).
export const ESCENA_DENEB = {
  id: 'deneb', duracion: 43.4, pulso: 43.44 / 76, compas: 4, desfase: 0,
  marcas: { inicio: 0, silencio: 2.5, atras: 4.33, tiempo: 5.21, bien: 7.03, bien2: 8.56, nada: 9.57, promesa: 11.03, construir: 12.01, mundo: 13.23, dos: 14.93, contigo: 16.01, tu: 17.49, medio: 19.16, drop: 20.57, segunda: 32, fundido: 41.15, fin: 43.4 }
};

// La pista de cámara del videoclip (formato y ejes del director de cámara, js/util/directorCamara.js): t en segundos del
// fragmento; pos = [azimut°, elevación°, distancia] alrededor de Deneb en radios de encuadre (1 = la distancia de llegada;
// la estrella mide 0,22 y sus anillos llegan a 1,0); azimut 0 / elevación 0 = desde Deneb hacia casa. Los anillos están en
// un plano inclinado 24° hacia casa.
// Un solo travelling lento y continuo (Carlos: movimientos suaves, con mucha sensibilidad): el azimut siempre avanza en el
// mismo sentido (de 0 a 100° en toda la canción), la cámara sube despacio hasta ver los anillos de lleno en «in the
// middle», se acerca un poco en el drop y vuelve a bajar hasta el mismo encuadre de la llegada: acaba como empezó. Sin cortes, sin giros
// de cámara y sin cambios de sentido: todos los tramos encadenados (lineales, con tangentes continuas).
const PISTA = [
  { t: 0, pos: [0, 10, 1.0], mira: [0, 0, 0], fov: 55, curva: 'corte' },     // llegada: Deneb tal cual
  { t: 4.33, pos: [6, 12, 0.93], curva: 'lineal' },                           // «turn back the time»
  { t: 9.6, pos: [18, 24, 1.15], curva: 'lineal' },                           // se aparta para ver cómo todo se deshace
  { t: 12.0, pos: [24, 26, 1.05], curva: 'lineal' },                          // «promise… build»: se enciende
  { t: 14.93, pos: [32, 36, 0.98], curva: 'lineal' },                         // «new world… us two»: los anillos se ordenan
  { t: 17.49, pos: [40, 52, 1.0], curva: 'lineal' },                          // «with you»: sube despacio…
  { t: 19.16, pos: [45, 64, 1.02], curva: 'lineal' },                         // «in the middle»: sus anillos de lleno, ella en el centro
  { t: 20.57, pos: [50, 58, 0.9], curva: 'lineal' },                          // el drop: se acerca
  { t: 24.0, pos: [60, 44, 0.8], curva: 'lineal' },
  { t: 28.0, pos: [70, 34, 0.78], curva: 'lineal' },
  { t: 32.0, pos: [80, 26, 0.84], curva: 'lineal' },                          // segunda mitad
  { t: 36.57, pos: [88, 18, 0.92], curva: 'lineal' },
  { t: 41.15, pos: [96, 12, 1.0], curva: 'lineal' },
  { t: 43.4, pos: [100, 10, 1.0], curva: 'suave' }                            // se posa como al llegar (misma altura y distancia)
];
export const CAMARA_DENEB = PISTA;
ESCENA_DENEB.camara = PISTA;

// Curva monótona por claves [[s, v], …] (Fritsch–Carlson): pasa por cada clave sin pasarse ni rebotar, con velocidad
// continua (el rebobinado acelera y frena sin tirones).
function curva(claves) {
  const n = claves.length, x = claves.map(c => c[0]), y = claves.map(c => c[1]), d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / Math.max(1e-6, x[i + 1] - x[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 3 * (x[i + 1] - x[i - 1]) / ((2 * x[i + 1] - x[i] - x[i - 1]) / d[i - 1] + (x[i + 1] + x[i] - 2 * x[i - 1]) / d[i]);
  m[0] = 0; m[n - 1] = 0;
  return s => {
    if (s <= x[0]) return y[0]; if (s >= x[n - 1]) return y[n - 1];
    let i = 0; while (s > x[i + 1]) i++;
    const h = x[i + 1] - x[i], t = (s - x[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// Las curvas en los segundos de la canción (las marcas de arriba). Escalan con las marcas (escalarEscena).
function curvasDe(m) {
  const k = m.fin / 43.4, a = v => v * k;   // las claves intermedias, en proporción si cambia la duración
  return {
    // Formación (0 nube oscura · 0,5 disco con la estrella encendiéndose · 0,62 estrella hecha · 1 su mundo completo).
    tau: curva([[0, 1], [m.atras, 1], [m.tiempo, 0.8], [a(5.9), 0.6], [a(6.7), 0.45], [m.bien2 - a(0.6), 0.2], [m.nada + a(0.1), 0.02], [m.promesa, 0], [m.promesa + a(0.55), 0.24], [m.construir, 0.46], [m.construir + a(0.5), 0.6], [m.mundo, 0.64], [m.contigo, 0.88], [m.medio, 1], [m.fin, 1]]),
    // Sentido y velocidad del tiempo de la estrella (superficie, viento, órbitas): negativo = rebobinado.
    reloj: curva([[0, 1], [m.atras - a(0.1), 1], [m.atras + a(0.5), -3.2], [m.bien2, -2.2], [m.nada + a(0.2), 0.08], [m.promesa, 0.08], [m.promesa + a(0.6), 1.6], [m.construir + a(0.6), 1], [m.fin, 1]]),
    // Actividad: su estado normal 0,55; joven y tranquila en los versos; del todo en el drop.
    gloria: curva([[0, 0.55], [m.silencio, 0.55], [m.silencio + a(0.5), 0.42], [m.construir + a(0.3), 0.42], [m.medio, 0.48], [m.drop - a(0.2), 0.4], [m.drop, 0.42], [m.drop + a(0.18), 1], [m.segunda, 1], [m.segunda + a(0.4), 0.86], [m.fundido, 0.86], [m.fin, 0.55]]),
    // Fuerza del latido con el bombo (solo donde suena: antes del 2,5 y desde el drop).
    fuerza: curva([[0, 0.25], [m.silencio - a(0.1), 0.25], [m.silencio + a(0.1), 0], [m.drop - a(0.05), 0], [m.drop, 1], [m.fundido, 0.85], [m.fin, 0.25]]),
    calido: curva([[0, 0.25], [m.atras, 0.25], [m.tiempo, 0], [m.segunda, 0], [m.segunda + a(1.5), 0.75], [m.fundido, 0.75], [m.fin, 0.25]]),
    foco: curva([[0, 0], [m.silencio, 0.7], [m.tiempo, 0.9], [m.construir + a(0.5), 0.9], [m.medio, 0.75], [m.fundido, 0.75], [m.fin, 0]]),
    // Las nebulosas lejanas: casi apagadas mientras no hay nada (que la nube y la estrella se lean), tenues después.
    nubes: curva([[0, 0], [m.silencio, 0.7], [m.tiempo, 0.93], [m.construir + a(0.5), 0.93], [m.medio, 0.85], [m.fundido, 0.85], [m.fin, 0]])
  };
}
const cache = new WeakMap();
const curvas = config => { let c = cache.get(config.marcas); if (!c) cache.set(config.marcas, c = curvasDe(config.marcas)); return c; };

// Latido en cada pulso de la canción («pum»: el golpe y un eco menor), con el primero de cada compás más fuerte.
// Devuelve 0–1 y deja en `e.edad` los segundos desde el último pulso.
export function latidoDeneb(s, { pulso, compas = 4, desfase = 0 }, e, reducido = false) {
  const b = (s - desfase) / pulso, k = Math.floor(b), edad = (b - k) * pulso;
  e.edad = edad;
  const golpe = Math.exp(-edad / (reducido ? 0.3 : 0.12)), eco = !reducido && edad > 0.16 ? 0.35 * Math.exp(-(edad - 0.16) / 0.08) : 0;
  return (golpe + eco) * ((((k % compas) + compas) % compas) === 0 ? 1 : 0.7);
}

const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;

// Estado de Deneb en el segundo `s` (escribe en `e`). Fuera de la escena (s ≤ 0 o s ≥ fin), el normal.
//  tau      formación (0 nube · 0,45 brasa · 0,5–0,6 encendido · 0,62 estrella · 1 su mundo completo);
//  estrella cuánto existe la estrella (0–1: tamaño y luz) y brasa  la protoestrella roja (0–1);
//  reloj    velocidad (con signo) del tiempo propio de la estrella: negativa al rebobinar;
//  gloria   actividad (superficie, viento, anillos: 0,4 joven · 0,55 normal · 1 drop);
//  pum      el latido en este instante (ya con su fuerza), `edad` (s desde el último pulso) y `fuerza` (la del bombo);
//  encendido segundos desde que nace (−1 si no toca: el frente de motas del encendido);
//  medio    el destello del «in the middle» (0–1) y `medioT` los segundos desde entonces (−1 antes): los anillos se
//           encienden de fuera adentro, hacia ella;
//  calido   rosa y oro en los anillos (0–1);  foco  penumbra del resto del cielo (0–0,9);  nubes  cuánto se apagan las
//           nebulosas lejanas (0–0,93: casi del todo mientras la estrella no existe).
export function estadoDeneb(s, config, e = {}, reducido = false) {
  const m = config.marcas, c = curvas(config), t = Math.min(Math.max(s, 0), m.fin);
  e.tau = sat(c.tau(t));
  e.estrella = sat((e.tau - 0.44) / 0.14); e.estrella = e.estrella * e.estrella * (3 - 2 * e.estrella);
  e.brasa = sat((e.tau - 0.22) / 0.2) * (1 - e.estrella);
  e.reloj = reducido ? Math.max(-1, c.reloj(t)) : c.reloj(t);
  e.gloria = c.gloria(t);
  e.fuerza = c.fuerza(t) * (reducido ? 0.4 : 1);
  e.pum = latidoDeneb(t, config, e, reducido) * e.fuerza;
  // Los dos «alright»: la brasa late dos veces mientras se apaga.
  for (const b of [m.bien, m.bien2]) { const x = t - b; if (x >= 0 && x < 1.2) e.pum = Math.max(e.pum, 0.8 * Math.exp(-x / 0.35)); }
  const x = t - m.construir; e.encendido = x >= 0 && x < 2.5 && s < m.fin ? x : -1;
  const y = t - m.medio; e.medio = y >= 0 && s < m.fin ? sat(y / 0.25) * Math.exp(-Math.max(0, y - 0.25) / 1.1) : 0; e.medioT = y >= 0 && s < m.fin ? y : -1;
  e.calido = c.calido(t);
  e.foco = c.foco(t); e.nubes = c.nubes(t);
  return e;
}
