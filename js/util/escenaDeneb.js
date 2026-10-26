// Deneb → deneb.m4a (43,4 s), un trozo de «Middle» (DJ Snake ft. Bipolar Sunshine) a 105 BPM: un pulso cada 0,5716 s y un
// compás cada 2,286 s desde el 0 (medido en sus pulsos y compases) (compases en 0; 2,30; 4,57; …; 20,57; …; 32,00; …; 41,15). Aquí solo hay números y curvas
// (sin three.js): las pruebas los comprueban sin navegador. Lo que se dibuja: js/escena/deneb.js.
//
// La historia la cuenta lo que hace una estrella así de luminosa: NACER y ESCULPIR con su luz la nube de la que nace (como
// Deneb con la nebulosa Norteamérica/Pelícano, en el Cisne). Al llegar se ve como es: la supergigante blanca azulada en
// el centro de una cavidad que su luz ha abierto en la nube, con paredes de filamentos y pilares iluminados desde dentro.
// Tiempos medidos sobre la voz aislada (arranques de sílaba) y el bombo de la instrumental. Con la letra:
//   0–2,5    se acaba el compás de la parte anterior (aún hay bombo): Deneb y su nube tal cual.
//   2,5      el ritmo se apaga (pre-estribillo solo con voz): silencio, calma.
//   4,27     el deseo de volver atrás en el tiempo (4,27 · 4,62 · 5,11): el tiempo se REBOBINA de verdad, a la vista:
//            la luz se retira de la nube, el gas vuelve a llenar la cavidad, la estrella se apaga y encoge hasta una
//            chispa (5,8–6,7) y la nube se queda oscura; la superficie y el viento corren hacia atrás.
//   7,03 / 8,56  los dos «que todo esté bien»: la chispa da sus dos últimos latidos y se apaga.
//   9,57     ya no hay nada: una nube oscura y quieta, «como si no fuese nada».
//   10,87    la promesa: el núcleo de la nube cae girando hacia el centro.
//   12,01    construir: ENCENDIDO. Nace la estrella: un frente de motas sale de ella.
//   12,86    un mundo nuevo para los dos: su luz enciende y talla la nube de dentro afuera: abre la cavidad, empuja el gas
//            hasta un borde brillante, deja los pilares con la punta hacia ella y se lleva hacia fuera el gas de delante.
//   16,01 / 17,35  contigo: la cavidad se completa.
//   19,16    en el medio: la estrella en el centro exacto de su cavidad iluminada; la luz corre por toda la nube de fuera
//            adentro, hacia ella, y la estrella responde.
//   20,57    el DROP (el bombo, en la rejilla de 0,5716 s): Deneb en toda su gloria; con cada golpe una onda de luz
//            recorre la nube desde ella hacia fuera y lanza eyecciones de motas.
//   32,00    segunda mitad: todo igual de vivo, más cálido.
//   41,15    se serena hasta su estado de siempre (el mismo que al llegar: sin saltos).
// El estado es el mismo en s = 0 y en s ≥ fin (el «normal», lo que se ve fuera de la escena).
export const ESCENA_DENEB = {
  id: 'deneb', duracion: 43.4, pulso: 43.44 / 76, compas: 4, desfase: 0,
  marcas: { inicio: 0, silencio: 2.5, atras: 4.27, tiempo: 5.11, bien: 7.03, bien2: 8.56, nada: 9.57, promesa: 10.87, construir: 12.01, mundo: 12.86, dos: 14.93, contigo: 16.01, tu: 17.35, medio: 19.16, drop: 20.57, segunda: 32, fundido: 41.15, fin: 43.4 }
};

// La pista de cámara del videoclip (formato y ejes del director de cámara, js/util/directorCamara.js): t en segundos del
// fragmento; pos = [azimut°, elevación°, distancia] alrededor de Deneb en radios de encuadre (1 = la distancia de llegada;
// la estrella mide 0,22, su cavidad ~0,46 y la nube llega a ~1); azimut 0 / elevación 0 = desde Deneb hacia casa: por
// ahí está abierta la cavidad. Un solo travelling lento y continuo: el azimut siempre hacia el mismo lado (de −10° a 38°
// en toda la canción, ~1°/s), mirando dentro de la cavidad; se aleja para ver la nube entera cuando no hay nada y
// mientras se construye su mundo, queda de frente en «en el medio», se acerca despacio en el drop y acaba como empezó.
const PISTA = [
  { t: 0, pos: [-10, 8, 1.15], mira: [0, 0, 0], fov: 55, curva: 'corte' },   // llegada: Deneb y su cavidad
  { t: 4.27, pos: [-7, 9, 1.2], curva: 'lineal' },                           // el tiempo se rebobina…
  { t: 9.6, pos: [3, 14, 1.75], curva: 'lineal' },                           // …hasta la nube oscura: se ve entera
  { t: 12.01, pos: [9, 12, 1.4], curva: 'lineal' },                          // se enciende
  { t: 16.01, pos: [15, 9, 1.6], curva: 'lineal' },                          // su luz talla la nube: abierto para verlo crecer
  { t: 19.16, pos: [19, 4, 1.42], curva: 'lineal' },                         // en el medio: de frente, ella en el centro
  { t: 20.57, pos: [21, 4, 1.3], curva: 'lineal' },                          // el drop
  { t: 28.0, pos: [27, 8, 1.05], curva: 'lineal' },                          // se acerca despacio con el bombo
  { t: 32.0, pos: [31, 10, 1.12], curva: 'lineal' },                         // segunda mitad
  { t: 41.15, pos: [36, 9, 1.18], curva: 'lineal' },
  { t: 43.4, pos: [38, 8, 1.15], curva: 'suave' }                            // se posa como al llegar
];
export const CAMARA_DENEB = PISTA;
// En vertical (móvil): más cerca (la nube llena el alto) y mirando algo más arriba (el director deja el centro del gigante
// por encima del de la pantalla: así queda centrada).
export const CAMARA_DENEB_VERTICAL = PISTA.map(p => ({ ...p, pos: [p.pos[0], p.pos[1], +(p.pos[2] * 0.82).toFixed(3)], ...(p.mira ? { mira: [0, 0.05, 0] } : {}) }));
const vertical = () => typeof window !== 'undefined' && window.innerWidth < window.innerHeight * 0.9;
Object.defineProperty(ESCENA_DENEB, 'camara', { get: () => vertical() ? CAMARA_DENEB_VERTICAL : CAMARA_DENEB, enumerable: true });

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
    // Formación (0 nube oscura · 0,46 núcleo caído · 0,5–0,6 encendido · 0,62 estrella hecha · 1 la nube tallada del todo).
    tau: curva([[0, 1], [m.atras, 1], [m.tiempo, 0.8], [a(5.9), 0.6], [a(6.7), 0.45], [m.bien2 - a(0.6), 0.2], [m.nada + a(0.1), 0.02], [m.promesa, 0], [m.promesa + a(0.55), 0.24], [m.construir, 0.46], [m.construir + a(0.5), 0.6], [m.mundo, 0.64], [m.contigo, 0.88], [m.medio, 1], [m.fin, 1]]),
    // Sentido y velocidad del tiempo de la estrella (superficie, viento, flujo de la nube): negativo = rebobinado.
    reloj: curva([[0, 1], [m.atras - a(0.1), 1], [m.atras + a(0.5), -3.2], [m.bien2, -2.2], [m.nada + a(0.2), 0.08], [m.promesa, 0.08], [m.promesa + a(0.6), 1.6], [m.construir + a(0.6), 1], [m.fin, 1]]),
    // Actividad: su estado normal 0,55; joven y tranquila en los versos; del todo en el drop.
    gloria: curva([[0, 0.55], [m.silencio, 0.55], [m.silencio + a(0.5), 0.42], [m.construir + a(0.3), 0.42], [m.medio, 0.48], [m.drop - a(0.2), 0.4], [m.drop, 0.42], [m.drop + a(0.18), 1], [m.segunda, 1], [m.segunda + a(0.4), 0.86], [m.fundido, 0.86], [m.fin, 0.55]]),
    // Fuerza del latido con el bombo (solo donde suena: antes del 2,5 y desde el drop).
    fuerza: curva([[0, 0.25], [m.silencio - a(0.1), 0.25], [m.silencio + a(0.1), 0], [m.drop - a(0.05), 0], [m.drop, 1], [m.fundido, 0.85], [m.fin, 0.25]]),
    calido: curva([[0, 0.25], [m.atras, 0.25], [m.tiempo, 0], [m.segunda, 0], [m.segunda + a(1.5), 0.75], [m.fundido, 0.75], [m.fin, 0.25]]),
    foco: curva([[0, 0], [m.silencio, 0.7], [m.tiempo, 0.9], [m.construir + a(0.5), 0.9], [m.medio, 0.75], [m.fundido, 0.75], [m.fin, 0]]),
    // Las nebulosas lejanas y el cielo profundo: casi apagados (su propia nube es su cielo).
    nubes: curva([[0, 1], [m.fin, 1]])
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
//  tau      formación (0 nube oscura · 0,45 chispa · 0,5–0,6 encendido · 0,62 estrella · 1 su cavidad tallada);
//  estrella cuánto existe la estrella (0–1: tamaño y luz) y brasa  la chispa de la que nace (0–1);
//  reloj    velocidad (con signo) del tiempo propio de la estrella: negativa al rebobinar;
//  gloria   actividad (superficie, viento, nube: 0,4 joven · 0,55 normal · 1 drop);
//  pum      el latido en este instante (ya con su fuerza), `edad` (s desde el último pulso) y `fuerza` (la del bombo);
//  encendido segundos desde que nace (−1 si no toca: el frente de motas del encendido);
//  medio    el destello del «in the middle» (0–1) y `medioT` los segundos desde entonces (−1 antes): la luz corre
//           por la nube de fuera adentro, hacia ella;
//  calido   rosa y oro en la nube (0–1);  foco  penumbra del resto del cielo (0–0,9);  nubes  cuánto se apagan las
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
