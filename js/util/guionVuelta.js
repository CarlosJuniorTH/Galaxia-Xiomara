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

// Los dos soles en la cinta: [ángulo de la cabeza, radio] y cuánto van juntos (junta 1: girando el uno alrededor del otro, con su
// infinito; 0: cada uno por su cuenta). Devuelve dónde está cada uno, en el plano. La galaxia del año la dibujan ellos: al cerrarse
// la vuelta se separan y bajan en espiral por la cresta de cada brazo (js/escena/tejidoLuz.js, misma fórmula), hasta encontrarse
// en el centro y encenderlo; luego suben por los mismos brazos y se reúnen arriba para empezar la vuelta siguiente.
export const R_CINTA = 10, ENROSQUE = 3.3, GIRO_BRAZOS = 0.035, FASE_BRAZOS = Math.PI / 2 - 24 * GIRO_BRAZOS;
const rBaja = pistaSuave([[24, R_CINTA], [38, 7.2], [50, 3.6], [60, 0.7]]), rSube = pistaSuave([[60, 0.7], [66, 2.6], [72, R_CINTA]]);
export const radioFrente = s => s < 24 ? R_CINTA : s < 60 ? rBaja(s) : 0;   // hasta dónde han llegado: de ahí hacia fuera, galaxia encendida
const ARRIBA_ANIO = 308 * GRADO;   // lo que queda arriba en la pantalla con la cámara del final
const angBrazo = (s, r) => FASE_BRAZOS + GIRO_BRAZOS * s + Math.log(r / R_CINTA) * ENROSQUE;
const ANG_72 = angBrazo(72, R_CINTA), oroArriba = pistaSuave([[72, ANG_72], [93.5, ARRIBA_ANIO]]);   // (por el camino más corto: uno por cada lado)
const rosaArriba = pistaSuave([[72, ANG_72 + Math.PI], [93.5, ARRIBA_ANIO]]);
function solesAnio(s, frente) {
  const polar = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
  if (s < 24) {
    const k = suave(18, 24, s), head = frente(s), a = k * Math.PI / 2;
    return { centro: polar(head, R_CINTA), oro: polar(head + a, R_CINTA), rosa: polar(head - a, R_CINTA), junta: 1 - suave(18, 20.5, s) };
  }
  if (s < 72) {
    const r = s < 60 ? rBaja(s) : rSube(s), a = angBrazo(s, r), j = s < 60 ? suave(57.5, 60, s) : 1 - suave(60, 62.5, s);
    return { centro: [0, 0], oro: polar(a, r), rosa: polar(a + Math.PI, r), junta: j };
  }
  if (s < 93.5) { const j = suave(91.5, 93.5, s), oa = oroArriba(s), ra = rosaArriba(s); return { centro: polar(ARRIBA_ANIO, R_CINTA), oro: polar(oa, R_CINTA), rosa: polar(ra, R_CINTA), junta: j }; }
  const a = ARRIBA_ANIO + (s - 93.5) * 0.11;   // y echan a andar otra vez
  return { centro: polar(a, R_CINTA), oro: polar(a, R_CINTA), rosa: polar(a, R_CINTA), junta: 1 };
}
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
      dist: pistaSuave([[0, 15], [8, 17], [18, 30], [38.85, 36]]),
      distV: pistaSuave([[0, 26], [6, 29], [20, 58], [38.85, 66]]),   // en vertical, junto a la pareja hasta ver la cinta entera
      abre: pistaSuave([[0, 0], [8, 0], [18, 1], [38.85, 1]])            // sigue a los dos soles y luego los suelta
    },
    meses: { desde: 0.4, hasta: 33.2 },
    textos: [
      { desde: 33.2, hasta: 38.2, clase: 'grande abajo', texto: 'Once meses.' },
      { desde: 34.6, hasta: 38.2, clase: 'pie abajo letra', texto: 'Falta una luz.' }
    ],
    abrir: () => 0, nombres: () => 0, ola: () => -1, corona: null, chispas: [], onda: 0, cielo: () => 0.4,
    soles: s => { const a = GUIONES[11].frente(s), p = [Math.cos(a) * R_CINTA, Math.sin(a) * R_CINTA]; return { centro: p, oro: p, rosa: p, junta: 1 }; },
    espera: s => suave(30, 33, s)
  },
  12: {
    id: 'mes-12', titulo: 'La primera vuelta', duracion: 98.01,
    // El último tramo acaba justo en el estribillo (14,02 s, el compás 114,68 de la canción): ahí se cierra la órbita.
    frente: pistaSuave([[0, 330 * GRADO], [3, 330 * GRADO], [14.02, 360 * GRADO], [98.01, 360 * GRADO]]),
    camara: {
      az: pistaSuave([[0, 306], [14, 342], [44, 402], [62, 446], [78, 472], [98.01, 492]]),
      el: pistaSuave([[0, 22], [14, 28], [24, 36], [44, 46], [62, 76], [98.01, 87]]),
      // Junto a los dos soles hasta que la vuelta se cierra; entonces se abre, y sube hasta tener el anillo entero de frente.
      dist: pistaSuave([[0, 16], [10, 18], [28, 38], [62, 44], [98.01, 44]]),
      distV: pistaSuave([[0, 23], [8, 26], [14, 34], [24, 58], [40, 64], [62, 66], [98.01, 67]]),
      abre: pistaSuave([[0, 0], [12.5, 0], [23, 1], [98.01, 1]])
    },
    meses: null,
    textos: [
      { desde: 0.8, hasta: 7.5, clase: 'pie', texto: 'Faltaba una luz…' },
      { desde: 14.2, hasta: 17.8, clase: 'grande', texto: 'Una vuelta al Sol' },
      { desde: 14.6, hasta: 17.8, clase: 'pie', texto: '940 millones de kilómetros, juntos.' },
      { desde: 45, hasta: 58, clase: 'pie', texto: 'Y todo lo recorrido cae hacia el centro…' },
      { desde: 78.1, hasta: 91.6, clase: 'grande abajo', texto: 'Un año' },
      { desde: 79.6, hasta: 91.6, clase: 'pie abajo', texto: '15 · 12 · 2025 — 15 · 12 · 2026' },
      { desde: 92.4, hasta: 96.8, clase: 'grande abajo', texto: 'Y solo es la primera.' }
    ],
    // La galaxia la dibujan los dos soles al bajar (radioFrente); al encontrarse en el centro, se enciende.
    abrir: s => 1 - radioFrente(s) / R_CINTA, nucleo: s => suave(59.5, 62, s), encuentro: 60, explota: 60, rSol: s => s < 24 || s >= 72 ? -1 : s < 60 ? rBaja(s) : rSube(s), soles: s => solesAnio(s, GUIONES[12].frente),
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
    // (Los soles recorren la cinta otra vez al final: solesAnio.)
    segunda: () => 0
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
  disco: pistaSuave([[0, 7.6], [20.62, 8.4], [28, 9.6], [30.93, 18], [36, 30], [46, 46], [59.28, 46]]), contacto: s => s < 30.93 ? -1 : s - 30.93,
  flujo: s => suave(30.93, 36, s), infinito: s => suave(31.5, 46, s),
  // Antes de tocarse, cada uno lanza un brazo de plasma hacia el otro: se buscan, y llegan a la vez, en el golpe.
  alcance: pistaSuave([[0, 0], [3, 0], [14, 0.46], [22, 0.66], [28, 0.86], [30.93, 1], [59.28, 1]]),
  // La distancia que queda entre los dos, en kilómetros: baja mientras se buscan y llega a cero al tocarse.
  contador: { desde: 0.8, hasta: 33.2, km: s => Math.round(10466 * (1 - GUIONES.dossoles.alcance(s)) / 2) * 2 },
  // Al compás (2,58 s) desde que se tocan: toda la luz late con la canción. Y su materia sale al espacio en dos espirales.
  pulso: s => s < 30.93 ? 0 : Math.exp(-((s - 30.93) % 2.5775) * 2.8), espiral: s => suave(33, 48, s), explota: 30.93,
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
  // En grados. Despacio y en diagonal hasta tocarse (caben en vertical); al tocarse, el giro se dispara.
  ang: pistaSuave([[0, 0], [20, 24], [30.93, 72], [46, 500], [59.28, 510]]),
  textos: [
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
