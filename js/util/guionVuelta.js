// Los dos videoclips de la primera vuelta al Sol: «Falta una luz» (mes 11) y «La primera vuelta» (mes 12). Solo datos y
// cálculo, sin Three.js ni DOM: la escena (js/escena/teatroVuelta.js) y su interfaz (js/ui/teatroVuelta.js) leen este guion en
// el segundo de la canción. Física que cuentan: dos astros que giran uno alrededor del otro recorren juntos la órbita; cada
// 30° es un mes; al mes 11 queda un tramo sin recorrer y al mes 12 la órbita se cierra sobre su propio comienzo.
const GRADO = Math.PI / 180, VUELTA = Math.PI * 2;
export const PASO_MES = VUELTA / 12;

// Interpolación monótona (Fritsch–Carlson): sin rebasar ninguna clave, así la cámara nunca da marcha atrás entre dos planos.
export function pistaSuave(claves) {
  const n = claves.length, t = claves.map(c => c[0]), v = claves.map(c => c[1]), m = new Array(n).fill(0), d = [];
  for (let i = 0; i < n - 1; i++) d[i] = (v[i + 1] - v[i]) / (t[i + 1] - t[i]);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return s => {
    if (s <= t[0]) return v[0];
    if (s >= t[n - 1]) return v[n - 1];
    let i = 0; while (s > t[i + 1]) i++;
    const h = t[i + 1] - t[i], u = (s - t[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * v[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}
const suave = (a, b, s) => { const k = Math.min(1, Math.max(0, (s - a) / (b - a))); return k * k * k * (k * (k * 6 - 15) + 10); };

const CHISPAS_ANIO = [78.04, 80.04, 82.01, 84.03, 86.03, 88.03, 90.02, 92.02];
// Textos propios (BORRADOR: revisar Carlos). Ninguno cita la canción.
const GUIONES = {
  11: {
    id: 'mes-11', titulo: 'Falta una luz', duracion: 38.85,
    // El primer mes en cuanto se ve la órbita; cada mes, un poco más de dos compases; noviembre se posa al entrar el final.
    frente: pistaSuave([[0, 0], [1.2, 2 * GRADO], [8, 45 * GRADO], [20, 192 * GRADO], [28, 306 * GRADO], [31.5, 330 * GRADO], [38.85, 330 * GRADO]]),
    // Empieza pegada a la primera estrella, con el Sol detrás, y se va abriendo hasta ver la cadena entera y el hueco arriba.
    camara: {
      az: pistaSuave([[0, 10], [14, 60], [28, 120], [38.85, 160]]),
      el: pistaSuave([[0, 20], [16, 40], [38.85, 62]]),
      dist: pistaSuave([[0, 13], [16, 22], [38.85, 27]]),
      distV: pistaSuave([[0, 40], [16, 54], [38.85, 66]]),   // en vertical, de cerca de la pareja hasta ver la cinta entera
      abre: pistaSuave([[0, 0], [5, 0.05], [18, 1], [38.85, 1]]),
      mira: [pistaSuave([[0, 6], [9, 0.8], [16, 0], [38.85, 0]]), pistaSuave([[0, 0], [38.85, 0]]), pistaSuave([[0, 0], [38.85, 0]])]
    },
    meses: { desde: 0.4, hasta: 33.2 },
    textos: [
      { desde: 33.2, hasta: 38.2, clase: 'grande abajo', texto: 'Once meses.' },
      { desde: 34.6, hasta: 38.2, clase: 'pie abajo letra', texto: 'Falta una luz.' }
    ],
    abrir: () => 0, nombres: () => 0, ola: () => -1, corona: null, chispas: [], onda: 0, cielo: () => 0.4,
    espera: s => suave(30, 33, s)
  },
  12: {
    id: 'mes-12', titulo: 'La primera vuelta', duracion: 98.01,
    // El último tramo acaba justo en el estribillo (14,02 s, el compás 114,68 de la canción): ahí se cierra la órbita.
    frente: pistaSuave([[0, 330 * GRADO], [3, 330 * GRADO], [14.02, 360 * GRADO], [98.01, 360 * GRADO]]),
    camara: {
      az: pistaSuave([[0, 306], [14, 342], [44, 402], [62, 446], [78, 472], [98.01, 492]]),
      el: pistaSuave([[0, 16], [14, 24], [44, 42], [62, 76], [98.01, 87]]),
      dist: pistaSuave([[0, 12.5], [14, 20], [44, 30], [62, 40], [98.01, 44]]),
      // En vertical, los dos soles vienen hacia nosotros y cierran la vuelta; luego la cámara sube hasta tener el anillo entero de frente.
      distV: pistaSuave([[0, 38], [14, 46], [30, 62], [62, 66], [98.01, 67]]),
      // De cerca hasta que la órbita se cierra: entonces la cámara se abre y se ve entera.
      abre: pistaSuave([[0, 0], [11, 0.05], [20, 1], [98.01, 1]]),
      // Mira primero al tramo que falta y, una vez cerrada, al Sol.
      mira: [pistaSuave([[0, 7.4], [14, 6], [24, 0], [98.01, 0]]), pistaSuave([[0, 0], [18, 0], [32, 2.5], [48, 2.5], [62, 0], [98.01, 0]]), pistaSuave([[0, -4.8], [14, -1.5], [24, 0], [98.01, 0]])]
    },
    meses: null,
    textos: [
      { desde: 0.8, hasta: 7.5, clase: 'pie', texto: 'Faltaba una luz…' },
      { desde: 14.2, hasta: 17.8, clase: 'grande', texto: 'Una vuelta al Sol' },
      { desde: 14.6, hasta: 17.8, clase: 'pie', texto: '940 millones de kilómetros, juntos.' },
      { desde: 45, hasta: 57, clase: 'pie', texto: 'Y lo recorrido cayó hacia dentro, y se encendió.' },
      { desde: 78.1, hasta: 91.6, clase: 'grande abajo', texto: 'Un año' },
      { desde: 79.6, hasta: 91.6, clase: 'pie abajo', texto: '15 · 12 · 2025 — 15 · 12 · 2026' },
      { desde: 92.4, hasta: 96.8, clase: 'grande abajo', texto: 'Y solo es la primera.' }
    ],
    // Al cerrarse, la materia de la cinta empieza a caer en espiral; llega al centro y lo enciende (ver tejidoLuz.js).
    abrir: s => suave(22, 60, s),
    nombres: s => suave(62, 72, s),
    cielo: pistaSuave([[0, 0.4], [44, 0.42], [62, 0.5], [98.01, 0.34]]),
    // Mientras suben las estrellas, lo que escribió Carlos de cada mes (js/config.js): [desde, hasta, mes].
    frases: [[18, 22, 0], [22.2, 25.4, 2], [25.6, 28.8, 3], [29, 32.2, 5], [32.4, 35.6, 7], [35.8, 39, 8], [39.2, 42.8, 10]],
    // La luz que recorre la órbita recién cerrada, dos vueltas (en radianes; −1 = apagada).
    ola: s => s < 14.02 || s > 18.5 ? -1 : (s - 14.02) / 4.48 * 2 * VUELTA,
    // Cada estrella sube de la órbita en su compás: de la primera (18 s) a la decimotercera (42 s).
    corona: { inicio: 18, paso: 2 },
    chispas: CHISPAS_ANIO,
    // La estrella que falta espera hasta que llegan; al cerrarse, una onda de luz sale de la órbita.
    espera: s => 1 - suave(13.2, 14.4, s), onda: 14.02,
    // El corazón late con cada golpe del estribillo final.
    latido: s => { let ultimo = -9; for (const c of CHISPAS_ANIO) if (c <= s) ultimo = c; return Math.exp(-(s - ultimo) * 4.2); },
    // La vuelta siguiente: los dos astros echan a andar alrededor de los nombres (en estrellas de la corona).
    segunda: pistaSuave([[0, 0], [86, 0], [98.01, 4.6]])
  }
};
export const SEP_FINAL = 17;   // las dos estrellas, cada una en el centro de su lóbulo del infinito
// «Dos soles», el videoclip del lugar nuevo (js/escena/dosSoles.js): separación, ángulo del giro, corriente e infinito.
// El infinito acaba de cara a la cámara: su ángulo es el de la cámara más 90° (y una vuelta).
GUIONES.dossoles = {
  id: 'mes-dossoles', titulo: 'Dos soles', duracion: 59.28, binaria: true,
  // En cada segundo: la cámara, más arriba al final para leer el infinito.
  frente: () => 0, abrir: () => 0, nombres: () => 0, ola: () => -1, espera: () => 0, corona: null, chispas: [], meses: null, onda: 0,
  // Cada uno con su disco; la gravedad los acerca, los discos crecen hasta tocarse en el golpe de la canción (30,93 s) y desde ahí el
  // flujo común traza el infinito (la física, en js/escena/tejidoLuz.js).
  disco: pistaSuave([[0, 8.5], [20.62, 9.5], [30.93, 26], [46, 46], [59.28, 46]]), contacto: s => s < 30.93 ? -1 : s - 30.93,
  flujo: s => suave(30.93, 36, s), infinito: s => suave(31.5, 46, s),
  // Sus nombres, sobre cada uno, mientras aún están lejos.
  etiquetas: { desde: 0.6, hasta: 20, textos: ['Carlos · Barcelona', 'Xiomara · Buenos Aires'] },
  cielo: pistaSuave([[0, 0.34], [20, 0.42], [59.28, 0.46]]),
  // Empieza mirando a lo largo de la pareja (una cerca y otra lejos, que caben en vertical) y acaba de cara al infinito.
  camara: {
    az: pistaSuave([[0, 0], [20, 26], [46, 56], [59.28, 60]]),
    el: pistaSuave([[0, 30], [30, 42], [46, 72], [59.28, 80]]),
    dist: pistaSuave([[0, 64], [20.62, 58], [30.93, 46], [46, 36], [59.28, 34]]),
    distV: pistaSuave([[0, 56], [8, 57], [22, 66], [44, 72], [59.28, 74]]),
    abre: () => 1,
    mira: [() => 0, () => 0, () => 0]
  },
  sep: pistaSuave([[0, 24], [20.62, 23], [30.93, 18], [46, SEP_FINAL], [59.28, SEP_FINAL]]),
  ang: pistaSuave([[0, 0], [20, 60], [31, 230], [46, 500], [59.28, 510]]),   // en grados
  textos: [
    { desde: 1, hasta: 7.6, clase: 'grande', texto: '10.466 km' },
    { desde: 2.2, hasta: 7.6, clase: 'pie', texto: 'Un océano en medio.' },
    { desde: 9, hasta: 17.5, clase: 'pie', texto: 'Y aun así, dos soles que se buscan.' },
    { desde: 21, hasta: 29.5, clase: 'pie', texto: 'La gravedad no entiende de distancias.' },
    { desde: 34, hasta: 44, clase: 'pie', texto: 'Cada uno le da al otro parte de su luz.' },
    { desde: 47.5, hasta: 57.5, clase: 'grande', texto: 'Nuestro pequeño infinito' },
    { desde: 49.5, hasta: 57.5, clase: 'pie', texto: 'Once meses. Un solo cielo.' }
  ]
};
export const guionVuelta = clave => GUIONES[clave] || null;
export const MESES_CON_CLIP = [11, 12];
// Los estrenos: desde su fecha (de Argentina, 'AAAA-MM-DD'), la primera vez que se entra en cada dispositivo la intro sale como
// siempre y, al pulsar para entrar, su videoclip sustituye al vuelo; luego se llega a la galaxia. Una sola vez. Si ese día no se
// entró, espera a la primera visita dentro de su plazo: un regalo así no se pierde por no abrirlo a tiempo.
const ESTRENOS = [
  { clave: 12, desde: '2026-12-15', hasta: '2027-01-14', lugar: 'vuelta', novedad: 'Se ha abierto un lugar nuevo', nombre: 'Nuestra primera vuelta', texto: 'Una órbita cerrada, con sus trece estrellas, que seguirá aquí todos los años que vengan.' },
  { clave: 'dossoles', desde: '2026-11-15', hasta: '2026-12-14', lugar: 'dossoles', novedad: 'Se ha abierto un lugar nuevo', nombre: 'Dos soles', texto: 'Las dos estrellas que acabas de ver ya viven en tu universo, girando juntas para siempre.' }
];
// Lo que el evento deja en el universo: se anuncia al llegar a casa, como cuando un juego abre un mundo nuevo.
export const novedadDeEstreno = clave => ESTRENOS.find(e => e.clave === clave) || null;
export const clipDeEstreno = (fecha, visto = () => false) => ESTRENOS.find(e => fecha >= e.desde && fecha <= e.hasta && !visto(e.clave))?.clave ?? 0;
// «Falta una luz» se ve una sola vez, al encontrar la estrella del mes 11; desde el año, los dos se pueden repetir en el álbum.
export const clipEnAlbum = fecha => fecha >= '2026-12-15';

// La frase del mes que toca en ese segundo (null si ninguna): { mes }.
export function fraseEnEscena(guion, s) { const f = guion.frases?.find(x => s >= x[0] && s < x[1]); return f ? { mes: f[2], id: f[0] } : null; }

// El mes que se está nombrando en ese segundo (−1 si ninguno).
export function mesEnEscena(guion, s) {
  if (!guion.corona && !guion.meses) return -1;
  if (guion.corona) { const i = Math.floor((s - guion.corona.inicio) / guion.corona.paso); return i >= 0 && i < 13 ? i : -1; }
  if (s < guion.meses.desde || s >= guion.meses.hasta) return -1;
  return Math.min(11, Math.floor(guion.frente(s) / PASO_MES + 1e-6));
}
