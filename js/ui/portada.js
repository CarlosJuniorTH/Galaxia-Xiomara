// Intro: un videoclip de 32 s con «Maps» (momento «inicio» de js/data/bandaSonora.js), rodado como una película con una
// cámara que se mueve sobre un mapa del Atlántico hecho de motas. La canción es una súplica a alguien que está lejos: la
// voz llama una y otra vez («say…»), pide que la esperen («wait…») y jura que nadie la quiere como ella. El clip lo cuenta
// con los dos: Carlos llama desde Madrid y cada llamada, una onda sobre el mapa, va descubriendo su orilla; Xiomara
// responde desde Buenos Aires (plano y contraplano, cada vez más abiertos); al llamarse a la vez la cámara se aleja y
// aparece el océano entero entre los dos. En el primer «wait» él sale a buscarla siguiendo el mapa (la cámara viaja con
// él: travelling con su ruta, sus coordenadas y los kilómetros que faltan); en el segundo sale ella. Se encuentran en el
// ecuador, en mitad del mundo (0 km): la línea del ecuador se enciende, la cámara gira despacio alrededor del encuentro
// mientras la voz sostiene su nota y nace un corazón de motas con sus nombres. En el último estribillo la cámara sube, el
// mapa se curva y se cierra en un globo (el mundo se les queda pequeño), el globo se aleja hasta ser una sola luz y la
// cámara se lanza hacia ella: al otro lado, el cielo de nuestro universo, la tarjeta y, arriba, ese pequeño mundo con su
// punto de encuentro, girando.
// Lienzo 2D sin degradados ni halos: la luz son motas nítidas (cuadrados y círculos de 1,5–3 px, líneas finas).
// La «cámara» es una proyección en perspectiva del plano del mapa (centro, zoom, inclinación, giro sobre la vertical y
// alabeo): da profundidad, paralaje con el cielo de fondo (tres capas de estrellas a distintas distancias) y la luz de
// cada uno flota sobre el mapa con su reflejo. Todo se calcula en función del tiempo t del clip (sin estado entre
// cuadros): con la canción, t es su reloj (js/ui/entrada.js) y la imagen va clavada a la música aunque se pierdan cuadros.
// Con movimiento reducido (calma), la misma historia sin destellos, ondas, sacudidas ni el salto final.
import { ORILLAS, COSTAS, LAGOS, ISLAS } from '../data/costas.js';

const TAU = Math.PI * 2, RAD = Math.PI / 180;
const sat = k => k < 0 ? 0 : k > 1 ? 1 : k;
const tramo = (t, a, b) => sat((t - a) / (b - a));
const suave = k => k * k * (3 - 2 * k);
const suave2 = k => k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
const salida = k => 1 - (1 - k) * (1 - k) * (1 - k);
const entra = k => k * k * k;
const rebote = k => { const c = 1.6, u = k - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const merc = lat => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360)) * 180 / Math.PI;
const desmerc = y => (2 * Math.atan(Math.exp(y * Math.PI / 180)) - Math.PI / 2) * 180 / Math.PI;
// Azar sembrado (mulberry32): el mismo cielo y el mismo mapa en cada visita y al girar la pantalla.
function sembrado(semilla) { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Pulsos de la canción (negras a ~117,5 BPM; un compás cada cuatro, cada ~2 s), en segundos del fragmento: medidos con
// scripts/analizar-audio.py sobre assets/musica/inicio.m4a.
export const PULSOS = Object.freeze([0, 0.49, 1, 1.49, 1.97, 2.48, 3, 3.51, 3.99, 4.51, 5.02, 5.5, 6.01, 6.52, 7.01, 7.52, 8.01, 8.52,
  9.01, 9.52, 10.03, 10.52, 11.03, 11.54, 12.03, 12.54, 13.03, 13.51, 14.02, 14.51, 15.02, 15.51, 16.02, 16.51, 17, 17.51, 18.02,
  18.51, 19.02, 19.51, 19.99, 20.5, 21.01, 21.5, 22.01, 22.5, 23.01, 23.52, 24.03, 24.52, 25.01, 25.5, 26.01, 26.49, 27.01, 27.49,
  27.98, 28.49, 29, 29.49, 30, 30.51, 31, 31.51, 32]);
// Guion (segundos del clip = segundos del fragmento; con canción, cada hito cae en la marca del mismo nombre de su
// momento «inicio», js/util/sincronia.js). La letra, con sus tiempos (Whisper large-v3 sobre la voz aislada, verificada
// con los ataques de la voz), en js/data/bandaSonora.js; aquí, lo que se ve:
//   luzCarlos   1,17  primera llamada de la voz: se enciende la luz de Carlos (primer plano de Madrid, cámara inclinada)
//   luzXiomara  3,25  la respuesta: corte al contraplano, Buenos Aires, se enciende la de Xiomara
//   mapa        5,11  él vuelve a llamar (plano más abierto: las ondas descubren su orilla)
//   ruta        7,13  ella responde (más abierto)
//   juntos      9,09  se llaman a la vez: la cámara se aleja y aparece el océano entre los dos (clímax a 9,8)
//   espera     10,91  primer «wait»: el mapa entero, el camino se traza y él sale a buscarla (travelling con él)
//   respuesta  15,73  segundo «wait»: corte a ella, que sale a su encuentro
//   encuentro  19,99  se encuentran en el ecuador (0 km): se enciende el ecuador, nace el corazón, la cámara gira
//   nombres    22,01  «Carlos & Xiomara» (durante la nota larga de la voz)
//   cielo      24,03  último estribillo: la cámara sube, el corazón vuelve a ser una luz y el mapa se curva
//   mundo      26,01  el mapa ya es un globo: el mundo se les queda pequeño
//   salto      27,98  el globo, ya una luz, nos lleva a toda velocidad hacia dentro (instrumental)
//   tarjeta    30     al otro lado, el cielo de nuestro universo, la tarjeta y el pequeño mundo arriba
export const HITOS = Object.freeze({ luzCarlos: 1.17, luzXiomara: 3.25, mapa: 5.11, ruta: 7.13, juntos: 9.09, espera: 10.91, respuesta: 15.73, encuentro: 19.99, nombres: 22.01, cielo: 24.03, mundo: 26.01, salto: 27.98, tarjeta: 30 });
export const DURACION = 32;
const H = HITOS;
// Las llamadas de la voz (cada sílaba, una onda de motas sobre el mapa desde la luz que «habla»): primero él, luego ella,
// otra vez él y ella, y a la vez en la última, cuando la canción crece hacia el primer «wait». [segundo, alcance en
// grados del mapa]
const LLAMADAS = {
  carlos: [[1.17, 3.5], [1.65, 5], [2.11, 6.5], [2.59, 8], [2.95, 10], [5.11, 13], [5.45, 16], [6.15, 19], [6.67, 23], [9.09, 40], [9.49, 55], [10.13, 70], [10.61, 95]],
  xiomara: [[3.25, 3.5], [3.63, 5.5], [4.19, 7.5], [4.65, 10], [7.13, 13], [7.53, 16], [8.19, 19], [8.65, 23], [9.09, 40], [9.49, 55], [10.13, 70], [10.61, 95]]
};
const DUR_ONDA = 1.25;
// Golpes de la base y de la letra: un empujón de la cámara (zoom) que se apaga enseguida. [segundo, fuerza]
const GOLPES = [[1.49, 0.01], [2.74, 0.01], [4.76, 0.01], [7.52, 0.012], [8.75, 0.012], [10.91, 0.05], [11.28, 0.012], [15.73, 0.04], [19.99, 0.05], [28.72, 0.03], [29.48, 0.02]];
// El texto de la historia (lo dice Carlos, con sus palabras: no es la letra), arriba. «» = se apaga.
export const FRASES = Object.freeze([
  { desde: 5.5, texto: 'Te llamé desde mi orilla…' },
  { desde: 7.5, texto: '…y me respondiste desde la tuya.' },
  { desde: 9.05, texto: '' },
  { desde: 12.3, texto: 'Seguí el mapa que lleva hasta ti…' },
  { desde: 15.5, texto: '' },
  { desde: 16.5, texto: '…y tú venías a buscarme.' },
  { desde: 19.3, texto: '' },
  { desde: 24.6, texto: 'Y el mundo se nos quedó pequeño.' },
  { desde: 27.7, texto: '' }
]);
// Puntos de paso del camino (longitud, latitud): de Madrid sale al Atlántico por Portugal, baja al oeste de Canarias y
// Cabo Verde, cruza el ecuador junto a San Pedro y San Pablo y entra en el Río de la Plata.
const CAMINO_PASOS = [ORILLAS.carlos, [-9.6, 38.6], [-19.5, 27.5], [-27, 9], [-30.5, -6], [-40, -24], [-52, -33.5], ORILLAS.xiomara];

// ── Geometría fija (no depende de la pantalla): el camino en coordenadas del mundo (x = longitud, y = −Mercator) ──
const RUTA_N = 320, RX = new Float64Array(RUTA_N + 1), RY = new Float64Array(RUTA_N + 1);
{
  const P = CAMINO_PASOS.map(([lon, lat]) => [lon, -merc(lat)]), tr = P.length - 1, fino = 3000;
  const lx = new Float64Array(fino + 1), ly = new Float64Array(fino + 1), ac = new Float64Array(fino + 1);
  for (let i = 0; i <= fino; i++) {
    const f = Math.min(tr - 1e-6, i / fino * tr), j = f | 0, u = f - j;
    const p0 = P[Math.max(0, j - 1)], p1 = P[j], p2 = P[j + 1], p3 = P[Math.min(tr, j + 2)];
    const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
    lx[i] = cr(p0[0], p1[0], p2[0], p3[0]); ly[i] = cr(p0[1], p1[1], p2[1], p3[1]);
    if (i) ac[i] = ac[i - 1] + Math.hypot(lx[i] - lx[i - 1], ly[i] - ly[i - 1]);
  }
  for (let j = 0, i = 0; j <= RUTA_N; j++) { const d = ac[fino] * j / RUTA_N; while (i < fino - 1 && ac[i + 1] < d) i++; const u = (d - ac[i]) / Math.max(1e-9, ac[i + 1] - ac[i]); RX[j] = lx[i] + (lx[i + 1] - lx[i]) * u; RY[j] = ly[i] + (ly[i + 1] - ly[i]) * u; }
}
// Punto del camino (fracción s) en WX, WY.
let WX = 0, WY = 0;
function enRuta(s) { const f = sat(s) * RUTA_N, i = Math.min(RUTA_N - 1, f | 0), u = f - i; WX = RX[i] + (RX[i + 1] - RX[i]) * u; WY = RY[i] + (RY[i + 1] - RY[i]) * u; }
// El encuentro: donde el camino cruza el ecuador (y = 0).
const S_ENC = (() => { for (let j = 0; j < RUTA_N; j++) if (RY[j] <= 0 && RY[j + 1] > 0) return (j + (0 - RY[j]) / (RY[j + 1] - RY[j])) / RUTA_N; return 0.5; })();
enRuta(S_ENC);
const MX = WX, MY = 0, M_LON = MX;
const CX = ORILLAS.carlos[0], CY = -merc(ORILLAS.carlos[1]), XX = ORILLAS.xiomara[0], XY = -merc(ORILLAS.xiomara[1]);

// Índice del último pulso ≤ t (búsqueda binaria; -1 antes del primero).
function pulso(t) {
  if (t < PULSOS[0]) return -1;
  let a = 0, b = PULSOS.length - 1;
  while (a < b) { const m = (a + b + 1) >> 1; if (PULSOS[m] <= t) a = m; else b = m - 1; }
  return a;
}
// Avance de 0 a 1 entre a y b a golpes de pulso: en cada pulso un empujón que frena antes del siguiente (mezcla: cuánto
// se nota el golpe; 0 = recto).
const nodosTramo = new Map();
function aPulsos(t, a, b, mezcla = 1) {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const clave = a * 1e4 + b;
  let n = nodosTramo.get(clave);
  if (!n) { n = [a, ...PULSOS.filter(p => p > a + 0.12 && p < b - 0.12), b]; nodosTramo.set(clave, n); }
  let i = 0; while (n[i + 1] <= t) i++;
  const k = (i + salida((t - n[i]) / (n[i + 1] - n[i]))) / (n.length - 1);
  return mezcla * k + (1 - mezcla) * (t - a) / (b - a);
}
// Latido: un golpe en cada tiempo fuerte (pulso par) y su eco 0,22 s después.
function latido(t, desde) {
  let i = pulso(t); if (i < 0 || t < desde) return 0;
  if (i % 2) i--;
  const d = t - PULSOS[i];
  return Math.exp(-d * 8) + (d > 0.22 ? 0.55 * Math.exp(-(d - 0.22) * 9) : 0);
}
// Viaje de cada luz por su camino (fracción de la ruta: 0 = Madrid, 1 = Buenos Aires). Él sale en el primer «wait» y
// lleva algo más de la mitad de su parte cuando sale ella, más deprisa; se encuentran en el ecuador en «encuentro».
function viajeCarlos(t, calma) { const m = calma ? 0 : 0.4; return t < H.respuesta ? 0.56 * S_ENC * aPulsos(t, H.espera, H.respuesta, m) : S_ENC * (0.56 + 0.44 * aPulsos(t, H.respuesta, H.encuentro, m)); }
function viajeXiomara(t, calma) { return 1 - (1 - S_ENC) * aPulsos(t, H.respuesta, H.encuentro, calma ? 0 : 0.4); }
const miles = n => { const s = String(Math.max(0, Math.round(n))); return s.length > 3 ? s.slice(0, -3) + '.' + s.slice(-3) : s; };
// Distancia de verdad sobre la Tierra (haversine) entre dos puntos del mundo, en km.
function km(x1, y1, x2, y2) {
  const la1 = desmerc(-y1) * RAD, la2 = desmerc(-y2) * RAD, dl = (x2 - x1) * RAD;
  const a = Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dl / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}
// Coordenadas como en una carta náutica: 23°41′ N · 19°05′ O.
const gms = (v, pos, neg) => { const a = Math.abs(v), g = Math.floor(a), m = Math.floor((a - g) * 60); return `${g}°${String(m).padStart(2, '0')}′ ${v >= 0 ? pos : neg}`; };
const coordenadas = (x, y) => `${gms(desmerc(-y), 'N', 'S')}  ·  ${gms(x, 'E', 'O')}`;

// Colores (rosa y violeta sobre negro): Carlos, violeta; Xiomara, rosa; lo de los dos, blanco rosado.
const VIOLETA = [205, 170, 255], ROSA = [255, 150, 205], BLANCO = [255, 236, 246];
// (con caché: en cada cuadro no se crea ningún texto de color nuevo, que en el móvil acaba en pausas del recolector)
const cacheColor = new Map();
function rgba(c, a) {
  let m = cacheColor.get(c); if (!m) cacheColor.set(c, m = new Map());
  const k = Math.round(a * 1000); let v = m.get(k);
  if (!v) m.set(k, v = `rgba(${c[0]},${c[1]},${c[2]},${(k / 1000).toFixed(3)})`);
  return v;
}
const cacheFuente = new Map();
const fuente = (tam, familia) => { const k = familia + tam; let v = cacheFuente.get(k); if (!v) cacheFuente.set(k, v = familia === 'v' ? `${tam}px 'Great Vibes', cursive` : familia === 'c' ? `italic ${tam}px 'Cormorant Garamond', serif` : familia === 'r' ? `400 ${tam}px 'Cormorant Garamond', serif` : `600 ${tam}px Quicksand, sans-serif`); return v; };
// Tonos de las motas del mapa (rosa, lila, blanco) y el de las que enciende una onda al pasar.
const TONOS = ['rgb(242,184,222)', 'rgb(214,186,255)', 'rgb(255,222,240)', 'rgb(255,246,252)'];
const COL = [rgba(VIOLETA, 1), rgba(ROSA, 1), rgba(BLANCO, 1)];

// ── Máscara de tierra: las costas rasterizadas una vez en coordenadas (longitud, Mercator), 4 px por grado ──
const MR = 4, MY0 = 172, MW = 360 * MR, MH = (172 + 142) * MR;
let mascara = null;
function construirMascara() {
  const c = document.createElement('canvas'); c.width = MW; c.height = MH;
  const g = c.getContext('2d', { willReadFrequently: true });
  const trazar = p => { g.beginPath(); for (let i = 0; i < p.length; i += 2) { const px = (p[i] + 180) * MR, py = (MY0 - merc(p[i + 1])) * MR; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.fill(); };
  g.fillStyle = '#fff'; COSTAS.forEach(trazar);
  g.globalCompositeOperation = 'destination-out'; LAGOS.forEach(trazar);
  const d = g.getImageData(0, 0, MW, MH).data; mascara = new Uint8Array(MW * MH);
  for (let i = 0; i < mascara.length; i++) mascara[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  c.width = c.height = 1;
}
// ¿Tierra en (x = longitud, y = −Mercator)?
function tierraEn(x, y) { const i = Math.floor((x + 180) * MR), j = Math.floor((MY0 + y) * MR); return i >= 0 && i < MW && j >= 0 && j < MH && mascara[j * MW + i] === 1; }

// reloj(): t del clip en segundos, o null mientras no ha empezado (no se dibuja nada).
// alFrase(texto): cambia el texto de la historia. alPrevio(): 0,45 s antes de «tarjeta». alFinal(): llega «tarjeta»
// (aparece el cielo y la tarjeta).
export function crearPortada(lienzo, { reloj = () => null, calma = false, alFrase = () => {}, alPrevio = () => {}, alFinal = () => {} } = {}) {
  const x = lienzo.getContext('2d');
  const movil = matchMedia('(pointer:coarse)').matches;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let ancho = 0, alto = 0, m = 0, vertical = true, k0 = 1, activo = true, id = 0, frase = -1, finalDado = false, previoDado = false, saltoCuadro = false;
  let Fx = 0, Fy = 0, Sf = 1;
  if (!mascara) construirMascara();

  // ── Contenido fijo (sembrado): el mismo en el móvil y en el PC ──
  const azar = sembrado(15122025);
  // Cielo de fondo en tres capas (lejos, medio, cerca): se mueven con la cámara a distinta velocidad (paralaje).
  const ESTRELLAS = 300, eu = new Float32Array(ESTRELLAS), ev = new Float32Array(ESTRELLAS), et = new Float32Array(ESTRELLAS), ea = new Float32Array(ESTRELLAS), ef = new Float32Array(ESTRELLAS), ep = new Float32Array(ESTRELLAS), en = new Float32Array(ESTRELLAS);
  for (let i = 0; i < ESTRELLAS; i++) {
    eu[i] = azar(); ev[i] = azar(); const capa = i % 3; ep[i] = [0.05, 0.13, 0.26][capa];
    et[i] = [0.9, 1.25, 1.7][capa] + azar() * 0.5; ea[i] = 0.25 + azar() * 0.6; ef[i] = azar() * TAU;
    en[i] = PULSOS[i % 3];   // nacen en los tres primeros pulsos, un tercio en cada uno
  }
  // Corazón: 640 motas en volumen (el contorno, denso; por dentro, más suelto y con grosor): gira un poco sobre sí mismo.
  const CORAZON = 640, hx = new Float32Array(CORAZON), hy = new Float32Array(CORAZON), hz = new Float32Array(CORAZON), ht = new Float32Array(CORAZON), hc = new Uint8Array(CORAZON), hf = new Float32Array(CORAZON);
  for (let i = 0; i < CORAZON; i++) {
    const a = azar() * TAU, s = Math.sin(a), borde = azar() < 0.62, lleno = borde ? 1 - azar() * 0.05 : 0.2 + Math.sqrt(azar()) * 0.72;
    hx[i] = (16 * s * s * s / 17) * lleno + (azar() - 0.5) * 0.03; hy[i] = -((13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17) * lleno - 0.12 + (azar() - 0.5) * 0.03;
    hz[i] = (azar() - 0.5) * (borde ? 0.1 : 0.42 * Math.sqrt(1 - lleno * lleno * 0.8));
    ht[i] = 1.5 + azar() * azar() * 1.4; const r = azar(); hc[i] = r < 0.45 ? 1 : r < 0.8 ? 0 : 2; hf[i] = azar() * TAU;
  }
  // Estrellas del camino (se encienden al pasar cada luz).
  const CAMINO = 70, cs = new Float32Array(CAMINO), cj = new Float32Array(CAMINO), ct = new Float32Array(CAMINO);
  for (let i = 0; i < CAMINO; i++) { cs[i] = (i + 0.5) / CAMINO; cj[i] = (azar() - 0.5) * 1.3; ct[i] = 1.6 + azar() * 1; }
  const CHISPAS = 36, qa = new Float32Array(CHISPAS), qv = new Float32Array(CHISPAS);
  for (let i = 0; i < CHISPAS; i++) { qa[i] = (i + azar() * 0.8) / CHISPAS * TAU; qv[i] = 0.35 + azar() * 0.75; }

  // ── Motas del mapa, en tres niveles de detalle (se rehacen al cambiar el tamaño: su paso depende de la escala) ──
  // Nivel 0 en todo el mundo (cada ~5,4 px en el plano general); el 1, a la mitad de paso, en todo lo que la cámara ve
  // desde z ≈ 1,3; el 2 y el 3, a un cuarto y a un octavo, alrededor de las dos ciudades (los primeros planos: z ≥ 2,7 y
  // z ≥ 5,3 solo se usan ahí, así no se ve dónde acaba cada nivel). Cada nivel, ordenado en celdas de 4° para recorrer solo
  // lo que se ve.
  const CEL = 4, NCX = Math.ceil(360 / CEL), Y0C = -172, NCY = Math.ceil((172 + 142) / CEL);
  let niveles = [], pasoBase = 5.4;
  // Las rejillas están anidadas: todas parten del mismo origen y la de cada nivel, con la mitad de paso, solo guarda las
  // motas que la anterior no tiene; así, con dos niveles a la vez, la densidad es justo la del fino (sin dobles).
  const h32 = (a, b, c) => { let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(c + 7, 0x9e3779b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function nivel(p0, k, lon0, lon1, y0, y1, islas = false) {
    const paso = p0 / 2 ** k, dy = paso * 0.866, xs = [], ys = [], tn = [], al = [];
    for (let f = Math.ceil((y0 + 150) / dy), fF = Math.floor((y1 + 150) / dy); f <= fF; f++) {
      const y = -150 + f * dy, off = f & 1 ? 0.5 : 0;
      for (let c = Math.ceil((lon0 + 180) / paso - off), cF = Math.floor((lon1 + 180) / paso - off); c <= cF; c++) {
        if (k > 0 && (f & 1) === 0 && ((c - (f >> 1)) & 1) === 0) continue;   // ya está en el nivel anterior
        const h1 = h32(f, c, k), h2 = h32(c, f, k + 31), px = -180 + (c + off) * paso + (h1 - 0.5) * paso * 0.16, py = y + (h2 - 0.5) * paso * 0.16;
        if (!tierraEn(px, py)) continue;
        xs.push(px); ys.push(py); const t = h32(f + 3, c, k + 9); tn.push(t < 0.48 ? 0 : t < 0.8 ? 1 : 2); al.push(0.55 + 0.45 * h32(f, c + 5, k + 17));
      }
    }
    if (islas) for (const [lon, lat] of ISLAS) { xs.push(lon); ys.push(-merc(lat)); tn.push(2); al.push(1); }
    const n = xs.length, celda = new Uint16Array(n), cuenta = new Uint32Array(NCX * NCY + 1);
    for (let i = 0; i < n; i++) { const c = Math.min(NCY - 1, Math.max(0, Math.floor((ys[i] - Y0C) / CEL))) * NCX + Math.min(NCX - 1, Math.max(0, Math.floor((xs[i] + 180) / CEL))); celda[i] = c; cuenta[c + 1]++; }
    for (let c = 0; c < NCX * NCY; c++) cuenta[c + 1] += cuenta[c];
    const pos = cuenta.slice(), X = new Float32Array(n), Y = new Float32Array(n), T = new Uint8Array(n), A = new Float32Array(n);
    for (let i = 0; i < n; i++) { const j = pos[celda[i]]++; X[j] = xs[i]; Y[j] = ys[i]; T[j] = tn[i]; A[j] = al[i]; }
    return { paso, n, X, Y, T, A, inicio: cuenta };
  }
  // Globo: motas de tierra sobre una esfera (espiral de Fibonacci) con su rango para aclararlas cuando el globo es pequeño,
  // más meridianos y paralelos en motas muy tenues.
  let globo = { n: 0 }, rejillaGlobo = { n: 0 };
  function construirGlobo(R) {
    const N = Math.round(Math.max(6000, Math.min(26000, 4 * Math.PI * R * R / 30))), r = sembrado(77), gx = [], gy = [], gz = [], gt = [], gr = [];
    const oro = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const z = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - z * z), a = i * oro, lat = Math.asin(z) / RAD, lon = ((a / RAD + 180) % 360 + 360) % 360 - 180;
      if (lat < -80 || !tierraEn(lon, -merc(lat))) continue;
      gx.push(rr * Math.cos(a)); gy.push(z); gz.push(rr * Math.sin(a)); const c = r(); gt.push(c < 0.48 ? 0 : c < 0.8 ? 1 : 2); gr.push(r());
    }
    // (la longitud de cada mota se guarda en su vector: lon = atan2(z, x))
    globo = { n: gx.length, x: Float32Array.from(gx), y: Float32Array.from(gy), z: Float32Array.from(gz), t: Uint8Array.from(gt), r: Float32Array.from(gr) };
    const rx = [], ry = [], rz = [];
    for (let lon = -180; lon < 180; lon += 15) for (let la = -80; la <= 80; la += 3.5) { const c = Math.cos(la * RAD); rx.push(c * Math.cos(lon * RAD)); ry.push(Math.sin(la * RAD)); rz.push(c * Math.sin(lon * RAD)); }
    for (const la of [-60, -30, 0, 30, 60]) for (let lon = -180; lon < 180; lon += 3.5) { const c = Math.cos(la * RAD); rx.push(c * Math.cos(lon * RAD)); ry.push(Math.sin(la * RAD)); rz.push(c * Math.sin(lon * RAD)); }
    rejillaGlobo = { n: rx.length, x: Float32Array.from(rx), y: Float32Array.from(ry), z: Float32Array.from(rz) };
  }

  // ── Medidas ──
  function medir() {
    ancho = innerWidth; alto = innerHeight; m = Math.min(ancho, alto); vertical = alto >= ancho;
    lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr);
    // Escala base (zoom 1): las dos orillas ocupan ~60 % de la pantalla (en horizontal, la altura manda).
    k0 = Math.min(ancho * (vertical ? 0.62 : 0.42) / (CX - XX), alto * (vertical ? 0.54 : 0.62) / (XY - CY));
    // Paso de las motas en el plano general: ~6 px (algo más en pantallas grandes, que no se llenen de motas).
    pasoBase = Math.max(6, m / 115); const p0 = pasoBase / k0;
    niveles = [
      nivel(p0, 0, -180, 180, -150, 100, true),
      nivel(p0, 1, -125, 80, -125, 100),
      nivel(p0, 2, -49, 42, -84, -4),
      nivel(p0, 2, -104, -13, -3, 77),
      nivel(p0, 3, -19, 11, -59, -29),
      nivel(p0, 3, -73, -43, 22, 52)
    ];
    construirGlobo(m * 0.4);
    // Al final, el mundo pequeño arriba y la tarjeta debajo.
    Fx = ancho / 2; Fy = alto * (vertical ? 0.17 : 0.18); Sf = vertical ? Math.min(m * 0.19, alto * 0.115) : m * 0.11;
    // En el móvil apaisado la tarjeta ocupa toda la altura: el mundo va a su izquierda, en el hueco libre.
    if (!vertical && alto < 560) { const hueco = (ancho - Math.min(430, ancho - 32)) / 2; Fx = hueco / 2; Fy = alto * 0.5; Sf = Math.max(0, Math.min(m * 0.22, hueco / 2 - 14)); }
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  medir();
  let esperaMedir = 0;
  const alCambiar = () => { clearTimeout(esperaMedir); esperaMedir = setTimeout(medir, 120); };
  addEventListener('resize', alCambiar);

  // ── La cámara ──
  // Estado: [x, y (mundo), ln zoom, inclinación°, giro sobre la vertical°, alabeo°, ancla vertical (fracción de pantalla)]
  const E = (wx, wy, z, inc, giro, alabeo = 0, ancla = 0.5) => Float64Array.of(wx, wy, Math.log(z), inc, giro, alabeo, ancla);
  const mezclar = (o, a, b, k) => { for (let i = 0; i < 7; i++) o[i] = a[i] + (b[i] - a[i]) * k; return o; };
  const CAM = new Float64Array(7), TA = new Float64Array(7), TB = new Float64Array(7);
  // Planos fijos.
  const P_C0 = E(CX, CY, 4.9, 52, -18, 0, 0.45), P_C1 = E(CX, CY, 5.9, 46, -7, 0, 0.45);
  const P_X0 = E(XX, XY, 4.9, 52, 18, 0, 0.45), P_X1 = E(XX, XY, 5.9, 46, 7, 0, 0.45);
  const P_C2 = E(CX, CY + 1.5, 2.7, 40, -11, 0, 0.45), P_C3 = E(CX, CY + 1.5, 3.15, 35, -4, 0, 0.45);
  const P_X2 = E(XX, XY - 1.5, 2.7, 40, 11, 0, 0.52), P_X3 = E(XX, XY - 1.5, 3.15, 35, 4, 0, 0.52);
  const P_TODO = E((CX + XX) / 2, (CY + XY) / 2, 1, 16, 0, 0, 0.5);
  const P_ORBITA = E(MX, MY, 2.4, 50, -36, 0, 0.64), P_ALTO = E(MX, MY, 0.42, 0, 0, 0, 0.5);
  // Plano que sigue a una luz: centrado un poco por delante de ella en su camino.
  function siguiendo(o, s, ds, z, inc, giro, ancla) { enRuta(s + ds); o[0] = WX; o[1] = WY; o[2] = Math.log(z); o[3] = inc; o[4] = giro; o[5] = 0; o[6] = ancla; return o; }
  // Plano a dos: el punto medio entre las dos luces, con el zoom que las deja a ~45 % de la pantalla.
  function aDos(o, t) {
    enRuta(viajeCarlos(t, calma)); const ax = WX, ay = WY; enRuta(viajeXiomara(t, calma));
    const d = Math.hypot(WX - ax, WY - ay) + 1e-3, z = Math.max(1.25, Math.min(2.5, (vertical ? alto * 0.4 : alto * 0.5) / (d * k0)));
    o[0] = (ax + WX) / 2; o[1] = (ay + WY) / 2; o[2] = Math.log(z); o[3] = 30; o[4] = 0; o[5] = 0; o[6] = 0.5; return o;
  }
  function camara(t) {
    if (t < H.luzXiomara) mezclar(CAM, P_C0, P_C1, suave(tramo(t, 0, H.luzXiomara)));
    else if (t < H.mapa) mezclar(CAM, P_X0, P_X1, suave(tramo(t, H.luzXiomara, H.mapa)));
    else if (t < H.ruta) mezclar(CAM, P_C2, P_C3, suave(tramo(t, H.mapa, H.ruta)));
    else if (t < H.juntos) mezclar(CAM, P_X2, P_X3, suave(tramo(t, H.ruta, H.juntos)));
    else if (t < H.espera) mezclar(CAM, P_X3, P_TODO, suave2(tramo(t, H.juntos, H.espera)));
    else if (t < H.respuesta) {
      // Con él: un latigazo del plano general al travelling (0,8 s) y luego viaja a su lado.
      const s = viajeCarlos(t, calma), z = 2.15 - 0.3 * tramo(t, 11.7, H.respuesta);
      siguiendo(TB, s, 0.02, z, 44, -24 + 8 * tramo(t, 11.7, H.respuesta), 0.42);
      mezclar(CAM, P_TODO, TB, calma ? suave(tramo(t, H.espera, H.espera + 1.4)) : salida(tramo(t, H.espera, H.espera + 0.8)));
    } else if (t < H.encuentro) {
      // Corte a ella, que sale; desde 17,6 la cámara se abre a un plano a dos que las va acercando.
      siguiendo(TA, viajeXiomara(t, calma), -0.025, 2.15, 46, 20 - 8 * tramo(t, H.respuesta, 17.6), 0.58);
      aDos(TB, t);
      mezclar(CAM, TA, TB, suave(tramo(t, 17.6, 19.3)));
    } else if (t < H.cielo) {
      aDos(TA, H.encuentro);
      mezclar(CAM, TA, P_ORBITA, suave(tramo(t, H.encuentro, H.cielo)));
    } else mezclar(CAM, P_ORBITA, P_ALTO, suave2(tramo(t, H.cielo, 25.6)));
    // Empujones de los golpes.
    if (!calma) { let g = 0; for (const [s, f] of GOLPES) if (t >= s && t < s + 0.6) g += f * Math.exp(-(t - s) * 9); CAM[2] += g; }
  }

  // Proyección del plano del mapa (valores del cuadro): de (x, y) del mundo y altura h (px) a la pantalla en QX, QY, con
  // su escala de perspectiva en QF (0 = detrás de la cámara).
  let cX = 0, cY = 0, S = 1, cg = 1, sg = 0, ci = 1, si = 0, ca = 1, sa = 0, D = 1, ax = 0, ay = 0, QX = 0, QY = 0, QF = 0;
  function preparar() {
    cX = CAM[0]; cY = CAM[1]; S = k0 * Math.exp(CAM[2]);
    cg = Math.cos(CAM[4] * RAD); sg = Math.sin(CAM[4] * RAD); ci = Math.cos(CAM[3] * RAD); si = Math.sin(CAM[3] * RAD);
    ca = Math.cos(CAM[5] * RAD); sa = Math.sin(CAM[5] * RAD);
    D = Math.max(ancho, alto) * 1.25; ax = ancho / 2; ay = alto * CAM[6];
  }
  function proyectar(wx, wy, h = 0) {
    const dx = (wx - cX) * S, dy = (wy - cY) * S, u = dx * cg - dy * sg, v = dx * sg + dy * cg;
    const den = D - v * si - h * ci; if (den < D * 0.3) { QF = 0; return false; }
    const f = D / den, px = u * f, py = (v * ci - h * si) * f;
    QX = ax + px * ca - py * sa; QY = ay + px * sa + py * ca; QF = f; return true;
  }
  // Caja del mundo que se ve (para recorrer solo esas celdas): las esquinas de la pantalla llevadas al plano.
  let bx0 = 0, bx1 = 0, by0 = 0, by1 = 0;
  function cajaVisible() {
    bx0 = by0 = Infinity; bx1 = by1 = -Infinity;
    const vmin = -D * 0.68 / Math.max(0.05, si);   // (hasta donde la perspectiva deja la escala en 0,6: más allá se apaga)
    for (let e = 0; e < 4; e++) {
      const sx = (e & 1 ? ancho * 1.08 : -ancho * 0.08) - ax, sy = (e & 2 ? alto * 1.08 : -alto * 0.08) - ay;
      const px = sx * ca + sy * sa, py = -sx * sa + sy * ca;
      let v = py * D / (ci * D + py * si); if (!(v > vmin) || ci * D + py * si <= 0) v = vmin;
      const f = D / (D - v * si), u = px / f;
      const wx = cX + (u * cg + v * sg) / S, wy = cY + (-u * sg + v * cg) / S;
      if (wx < bx0) bx0 = wx; if (wx > bx1) bx1 = wx; if (wy < by0) by0 = wy; if (wy > by1) by1 = wy;
    }
  }

  // Lista del cuadro: motas proyectadas (posición, lado y tono), para pintarlas por tono en pocas llamadas.
  const MAXP = 40000, LX = new Float32Array(MAXP), LY = new Float32Array(MAXP), LS = new Float32Array(MAXP), LB = new Uint8Array(MAXP);
  let nL = 0;
  // Ondas activas del cuadro (centro y radio en el mundo).
  const OX = new Float32Array(32), OY = new Float32Array(32), OR = new Float32Array(32);
  let nO = 0;
  // Zonas de los rótulos del cuadro (las motas del mapa que caen dentro se apagan).
  const ZX0 = new Float32Array(4), ZX1 = new Float32Array(4), ZY0 = new Float32Array(4), ZY1 = new Float32Array(4);
  let nZ = 0;
  const enZona = (px, py) => { for (let z = 0; z < nZ; z++) { const ex = (px - ZX0[z]) / ZX1[z], ey = (py - ZY0[z]) / ZY1[z]; if (ex * ex + ey * ey < 1) return true; } return false; };
  const zona = (x0, y0, x1, y1) => { if (nZ < 4) { ZX0[nZ] = (x0 + x1) / 2; ZY0[nZ] = (y0 + y1) / 2; ZX1[nZ] = (x1 - x0) * 0.62; ZY1[nZ] = (y1 - y0) * 0.75; nZ++; } };

  // ── Piezas de dibujo ──
  function circulo(px, py, r) { x.moveTo(px + r, py); x.arc(px, py, r, 0, TAU); }
  // Una luz: núcleo blanco, anillo de su color, cruz de rayos finos y seis motas en órbita (todo nítido).
  function luz(px, py, color, tam, t, alfa = 1) {
    if (tam <= 0.01 || alfa <= 0.01) return;
    x.globalAlpha = alfa;
    x.fillStyle = rgba(color, 1); x.beginPath(); circulo(px, py, 3.1 * tam); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); circulo(px, py, 1.7 * tam); x.fill();
    const L = (11 + Math.sin(t * 5.3) * 1.5) * tam, l = 5.5 * tam;
    x.strokeStyle = rgba(color, 0.85); x.lineWidth = 1; x.beginPath();
    x.moveTo(px - L, py); x.lineTo(px + L, py); x.moveTo(px, py - L); x.lineTo(px, py + L); x.stroke();
    x.strokeStyle = rgba(color, 0.45); x.beginPath(); x.moveTo(px - l, py - l); x.lineTo(px + l, py + l); x.moveTo(px - l, py + l); x.lineTo(px + l, py - l); x.stroke();
    x.fillStyle = rgba(color, 0.9); x.beginPath();
    for (let i = 0; i < 6; i++) { const a = t * 1.7 + i * TAU / 6, r = (8 + Math.sin(t * 2 + i) * 1.2) * tam; circulo(px + Math.cos(a) * r, py + Math.sin(a) * r * 0.8, 0.9); }
    x.fill(); x.globalAlpha = 1;
  }
  // Una luz que flota sobre el mapa: su reflejo en el plano y un hilo finísimo hasta ella (se ve con la cámara inclinada).
  function luzSobreMapa(wx, wy, color, tam, t, alfa = 1) {
    const alt = 14 * tam;
    if (!proyectar(wx, wy, 0)) return false;
    const rx = QX, ry = QY, f = QF;
    proyectar(wx, wy, alt);
    if (si > 0.2 && alfa > 0.01) {
      x.globalAlpha = alfa * 0.5 * sat((si - 0.2) * 3); x.strokeStyle = rgba(color, 0.7); x.lineWidth = 0.8;
      x.beginPath(); x.moveTo(rx, ry); x.lineTo(QX, QY + 3 * tam); x.stroke();
      x.fillStyle = rgba(color, 1); x.beginPath(); x.ellipse(rx, ry, 2.6 * f, 2.6 * f * Math.max(0.25, ci), 0, 0, TAU); x.fill();
    }
    luz(QX, QY, color, tam * Math.min(1.35, Math.max(0.7, f)), t, alfa);
    return true;
  }
  // Líneas de puntos: motas cuadradas colocadas a mano cada «paso» px sobre una polilínea, en el camino actual (se pintan
  // con un fill). Nada de setLineDash: los trazos discontinuos, con miles de motas, hacían que Chrome dejara de acelerar el
  // lienzo y el clip caía a 10 FPS con la CPU ×4. pIni empieza una polilínea; pA le añade un tramo hasta (px, py).
  let dPX = 0, dPY = 0, dResto = 0, dPaso = 6, dLado = 1.2;
  function pIni(px, py, paso, lado) { dPX = px; dPY = py; dResto = 0; dPaso = paso; dLado = lado; }
  function pA(px, py) {
    const dx = px - dPX, dy = py - dPY, L = Math.hypot(dx, dy);
    // (si el tramo no toca la pantalla, se salta entero)
    if (Math.max(dPX, px) < -4 || Math.min(dPX, px) > ancho + 4 || Math.max(dPY, py) < -4 || Math.min(dPY, py) > alto + 4) { dResto = (dResto - L) % dPaso; if (dResto < 0) dResto += dPaso; dPX = px; dPY = py; return; }
    const h = dLado / 2;
    let s = dResto;
    for (; s <= L; s += dPaso) { const k = L > 0 ? s / L : 0, qx = dPX + dx * k, qy = dPY + dy * k; if (qx > -4 && qx < ancho + 4 && qy > -4 && qy < alto + 4) x.rect(qx - h, qy - h, dLado, dLado); }
    dResto = s - L; dPX = px; dPY = py;
  }
  // Una onda sobre el plano: anillo de motas que se abre; en perspectiva, una elipse.
  function ondaPlano(wx, wy, r, color, alfa) {
    if (alfa <= 0.01) return;
    x.globalAlpha = alfa; x.fillStyle = rgba(color, 1);
    x.beginPath(); let abierto = false;
    for (let i = 0; i <= 72; i++) {
      const a = i / 72 * TAU;
      if (proyectar(wx + Math.cos(a) * r, wy + Math.sin(a) * r)) { if (abierto) pA(QX, QY); else pIni(QX, QY, r * S > 400 ? 7 : 5.5, 1.7); abierto = true; } else abierto = false;
    }
    x.fill(); x.globalAlpha = 1;
  }
  // Chispas de un golpe: trazos cortos que salen disparados y se apagan.
  function chispas(px, py, edad, color, R, dur = 0.9) {
    if (edad < 0 || edad > dur) return;
    const u = edad / dur, d1 = salida(u), d0 = salida(Math.max(0, u - 0.08));
    x.globalAlpha = (1 - u); x.strokeStyle = rgba(color, 1); x.lineWidth = 1.3; x.beginPath();
    for (let i = 0; i < CHISPAS; i++) { const c = Math.cos(qa[i]), s = Math.sin(qa[i]), r1 = R * qv[i] * d1, r0 = R * qv[i] * d0; x.moveTo(px + c * r0, py + s * r0); x.lineTo(px + c * r1, py + s * r1); }
    x.stroke(); x.globalAlpha = 1;
  }
  // Rótulo de un personaje, como en los títulos de una película: el nombre (Great Vibes) y debajo un dato fino
  // (Quicksand espaciada). Centrado en px, con su línea base en py; se recoloca para no salirse de la pantalla.
  function rotulo(px, py, nombre, dato, alfa, tamN) {
    if (alfa <= 0.01) return;
    const tn = Math.round(tamN), tp = Math.round(Math.max(9, Math.min(12, m * 0.025))), mitad = Math.max(tn * 2.2, tp * 9);
    const qx = Math.max(16 + mitad, Math.min(ancho - 16 - mitad, px)), qy = Math.max(tn + 8, Math.min(alto - tp - 30, py));
    if (soloZonas) { zona(qx - mitad, qy - tn * 0.9, qx + mitad, qy + tp + 14); return; }
    texto(qx, qy, nombre, tn, 'v', 'rgb(255,214,236)', alfa, '0px', true);
    if (dato) texto(qx + 1.5, qy + tp + 9, dato, tp, 'q', 'rgb(232,200,224)', alfa, '3px', true);
  }
  // «Carlos & Xiomara»: los nombres en Great Vibes y el «&» en Cormorant Garamond redonda (el de Great Vibes y el de
  // la cursiva parecen una «E»; es el mismo de la cabecera del universo), un poco más pequeño y alzado, con su aire a cada lado. Anchos medidos una vez por tamaño.
  // (las fuentes del lienzo se piden ya: si no, el primer texto saldría con la de respaldo y su ancho medido, mal)
  if (document.fonts?.load) Promise.all(["40px 'Great Vibes'", "italic 40px 'Cormorant Garamond'", "40px 'Cormorant Garamond'", "600 12px Quicksand"].map(f => document.fonts.load(f))).then(() => sellos.clear(), () => {});
  function pareja(cx, py, tam, alfa) {
    if (alfa <= 0.01) return;
    const tn = Math.round(tam), clave = 'pareja' + tn;
    let s = sellos.get(clave);
    if (!s) {
      const ta = Math.round(tam * 0.92), g = lienzoSello();
      g.font = fuente(tn, 'v'); const a = g.measureText('Carlos').width, c = g.measureText('Xiomara').width; g.font = fuente(ta, 'r'); const y = g.measureText('&').width, aire = tn * 0.2;
      s = nuevoSello(a + y + c + 2 * aire, tn, (g, x0, base) => {
        g.fillStyle = 'rgb(255,209,230)'; g.font = fuente(tn, 'v'); g.fillText('Carlos', x0, base); g.fillText('Xiomara', x0 + a + y + 2 * aire, base);
        g.fillStyle = 'rgb(255,226,240)'; g.font = fuente(ta, 'r'); g.fillText('&', x0 + a + aire, base - tn * 0.04);
      });
      sellos.set(clave, s);
    }
    ponerSello(s, cx, py, alfa);
  }
  // Texto. Con fijo, se dibuja una vez en un lienzo aparte (un «sello») y en cada cuadro solo se estampa: fillText con
  // letterSpacing en cada cuadro costaba cuadros en el móvil. Los textos que cambian (km, coordenadas), sin espaciado.
  const sellos = new Map();
  let lienzoMedidas = null;
  const lienzoSello = () => (lienzoMedidas ||= document.createElement('canvas').getContext('2d'));
  // Un sello de ancho w y cuerpo tam: un lienzo con margen para los rasgos de la letra; dibujo(g, x0, base).
  function nuevoSello(w, tam, dibujo) {
    const mx = tam * 0.5, arriba = tam * 1.25, abajo = tam * 0.55, c = document.createElement('canvas');
    c.width = Math.ceil((w + 2 * mx) * dpr); c.height = Math.ceil((arriba + abajo) * dpr);
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    dibujo(g, mx, arriba);
    return { c, w: (w + 2 * mx), h: arriba + abajo, arriba, mx };
  }
  function ponerSello(s, cx, py, alfa) {
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = alfa;
    x.drawImage(s.c, cx - s.w / 2, py - s.arriba, s.w, s.h);
    x.globalAlpha = 1; x.globalCompositeOperation = 'lighter';
  }
  function texto(px, py, cadena, tam, familia, color, alfa, espacio = '0px', fijo = false) {
    if (alfa <= 0.01) return;
    const tn = Math.round(tam);
    if (fijo) {
      const clave = cadena + '|' + tn + familia + color + espacio;
      let s = sellos.get(clave);
      if (!s) {
        if (sellos.size > 60) sellos.clear();
        const g = lienzoSello(); g.font = fuente(tn, familia); if ('letterSpacing' in g) g.letterSpacing = espacio;
        const w = g.measureText(cadena).width; if ('letterSpacing' in g) g.letterSpacing = '0px';
        s = nuevoSello(w, tn, (h, x0, base) => { h.fillStyle = color; h.font = fuente(tn, familia); if ('letterSpacing' in h) h.letterSpacing = espacio; h.fillText(cadena, x0, base); });
        sellos.set(clave, s);
      }
      ponerSello(s, px, py, alfa);
      return;
    }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = alfa; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = color; x.font = fuente(tn, familia); x.fillText(cadena, px, py);
    x.globalAlpha = 1; x.globalCompositeOperation = 'lighter';
  }

  // Revelado del mapa: cada llamada descubre la orilla de quien llama hasta donde llega su onda.
  function revelado(lista, t) {
    let r = 0;
    for (const [s, R] of lista) { if (t < s) break; const u = Math.min(1, (t - s) / DUR_ONDA); r = Math.max(r, R * salida(u)); }
    return calma ? Math.max(r, 0) : r;
  }

  // ── El cuadro ──
  function dibujar(t) {
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.clearRect(0, 0, ancho, alto);
    x.globalCompositeOperation = 'lighter';
    camara(t); preparar();
    const antes = t < H.tarjeta;
    const tC = viajeCarlos(t, calma), tX = viajeXiomara(t, calma);
    // Fases del final: el mapa se curva en globo (morf), el globo se aleja (lejos) y el salto.
    const morf = suave(tramo(t, 25.0, 26.5)), lejos = entra(tramo(t, 26.9, H.salto));
    const uS = calma ? 0 : tramo(t, H.salto, H.salto + 1.6), enSalto = uS > 0 && uS < 1;
    const vivo = calma ? 1 - tramo(t, H.salto, H.salto + 1.4) : 1 - tramo(uS, 0.7, 1);
    // Brillo de los golpes de la letra.
    const golpe = calma ? 0 : Math.max(0, 1 - (t - H.espera) / 0.5) * (t >= H.espera) + Math.max(0, 1 - (t - H.respuesta) / 0.5) * (t >= H.respuesta) + 0.8 * Math.max(0, 1 - (t - H.encuentro) / 0.6) * (t >= H.encuentro);

    // 1. El cielo de fondo: tres capas que se mueven con la cámara a distinta velocidad; en el salto, estelas hacia fuera.
    if (antes && vivo > 0) {
      const L = Math.hypot(ancho, alto), ip = pulso(t), destello = ip >= 0 ? Math.exp(-(t - PULSOS[ip]) * 6) : 0;
      const zc = Math.exp(CAM[2]), gr = -CAM[4] * RAD * 0.5, cgr = Math.cos(gr), sgr = Math.sin(gr);
      const g1 = enSalto ? 1 + (Math.exp(3.2 * uS * uS) - 1) * 1.2 : 1, g0 = enSalto ? 1 + (Math.exp(3.2 * Math.max(0, uS - 0.04) ** 2) - 1) * 1.2 : 1;
      x.fillStyle = 'rgb(240,228,255)';
      for (let nv = 0; nv < 3; nv++) {
        x.globalAlpha = (0.3 + nv * 0.3) * vivo; x.beginPath();
        for (let i = 0; i < ESTRELLAS; i++) {
          if (t < en[i]) continue;
          let a = ea[i] * (0.65 + 0.35 * Math.sin(t * 1.6 + ef[i])) * Math.min(1, (t - en[i]) / 0.35) * (1 + golpe * 0.6);
          if (!calma && i % 8 === ip % 8) a += destello * 0.5;
          if (Math.min(2, (a * 3.2) | 0) !== nv) continue;
          const p = ep[i], esc = zc ** (p * 0.8);
          let u = ((eu[i] * L - cX * k0 * p * 3) % L + L) % L - L / 2, v = ((ev[i] * L - cY * k0 * p * 3) % L + L) % L - L / 2;
          u *= esc; v *= esc; let px = ancho / 2 + u * cgr - v * sgr, py = alto / 2 + u * sgr + v * cgr;
          if (enSalto) { px = ancho / 2 + (px - ancho / 2) * g1; py = alto / 2 + (py - alto / 2) * g1; }
          if (px < -3 || px > ancho + 3 || py < -3 || py > alto + 3) continue;
          const r = et[i] * (enSalto ? 1 + uS : 1);
          x.rect(px - r / 2, py - r / 2, r, r);
        }
        x.fill();
      }
      if (enSalto) {
        x.strokeStyle = 'rgb(240,228,255)'; x.lineWidth = 1; x.globalAlpha = 0.55 * vivo; x.beginPath();
        for (let i = 0; i < ESTRELLAS; i++) {
          const p = ep[i], esc = zc ** (p * 0.8);
          let u = ((eu[i] * L - cX * k0 * p * 3) % L + L) % L - L / 2, v = ((ev[i] * L - cY * k0 * p * 3) % L + L) % L - L / 2;
          u *= esc; v *= esc; const px = u * cgr - v * sgr, py = u * sgr + v * cgr;
          x.moveTo(ancho / 2 + px * g0, alto / 2 + py * g0); x.lineTo(ancho / 2 + px * g1, alto / 2 + py * g1);
        }
        x.stroke();
      }
    }

    // Revelado y ondas del cuadro.
    const revC = t < H.espera + 0.3 ? revelado(LLAMADAS.carlos, t) : 999, revX = t < H.espera + 0.3 ? revelado(LLAMADAS.xiomara, t) : 999;
    const revCalma = calma ? 999 * tramo(t, H.luzCarlos, H.espera) : 0;
    nO = 0;
    if (!calma && t < H.espera) {
      for (let o = 0; o < 2; o++) for (const [s, R] of o ? LLAMADAS.xiomara : LLAMADAS.carlos) {
        const e = t - s; if (e < 0 || e > 0.75 || nO >= 32) continue;   // (encienden motas solo los frentes recientes: cuesta poco)
        enRuta(o ? tX : tC); OX[nO] = WX; OY[nO] = WY; OR[nO] = R * salida(e / DUR_ONDA); nO++;
      }
    }

    // 2. La rejilla de la carta (meridianos y paralelos cada 10°) y el ecuador, que se enciende en el encuentro.
    const mapaVis = (1 - morf) * vivo * (t < H.salto ? 1 : 0);
    const rejilla = mapaVis * (calma ? tramo(t, H.mapa, H.espera) : Math.max(sat(Math.max(revC, revX) / 30), tramo(t, H.juntos, H.espera)));
    if (rejilla > 0.01) {
      cajaVisible();
      x.fillStyle = 'rgb(190,170,255)';
      x.globalAlpha = 0.2 * rejilla; x.beginPath(); dPaso = 6; dLado = 1.1;
      for (let lon = Math.ceil(bx0 / 10) * 10; lon <= bx1; lon += 10) segmento(lon, Math.max(by0, -150), lon, Math.min(by1, 142));
      for (let lat = -70; lat <= 70; lat += 10) { if (lat === 0) continue; const y = -merc(lat); if (y < by0 || y > by1) continue; segmento(Math.max(bx0, -180), y, Math.min(bx1, 180), y); }
      x.fill();
      // El ecuador: más claro; desde el encuentro, una luz que corre por él hacia los dos lados.
      if (by0 < 0 && by1 > 0) {
        const corre = t > H.encuentro ? salida(tramo(t, H.encuentro, H.encuentro + 2.2)) * 200 : 0;
        x.globalAlpha = 0.34 * rejilla; x.beginPath(); segmento(Math.max(bx0, -180), 0, Math.min(bx1, 180), 0); x.fill();
        if (corre > 0) { x.globalAlpha = 0.9 * rejilla * (1 - 0.5 * tramo(t, H.encuentro + 2.2, H.cielo)); x.fillStyle = 'rgb(255,226,244)'; dPaso = 4.5; dLado = 1.6; x.beginPath(); segmento(MX - corre, 0, MX + corre, 0); x.fill(); }
      }
    }

    // 3. El mapa: motas de tierra en tres niveles de detalle, con perspectiva; aparecen donde llegan las llamadas y las
    // ondas encienden las que cruzan.
    if (mapaVis > 0.01 && t > 0.3) {
      if (rejilla <= 0.01) cajaVisible();
      zonasTexto(t);
      // El mapa en penumbra (antes de que lo descubran las llamadas) aparece en el primer compás.
      const penumbra = calma ? tramo(t, 0.2, 1.4) : tramo(t, 0.3, 1.1);
      // Mientras late el corazón, el mapa baja a la mitad (que el corazón y los nombres se lean).
      const atenua = 1 - 0.55 * tramo(t, H.encuentro, H.encuentro + 0.4) * (1 - tramo(t, H.cielo, H.cielo + 0.6));
      nL = 0;
      const cx0 = Math.max(0, Math.floor((bx0 + 180) / CEL)), cx1 = Math.min(NCX - 1, Math.floor((bx1 + 180) / CEL));
      const cy0 = Math.max(0, Math.floor((by0 - Y0C) / CEL)), cy1 = Math.min(NCY - 1, Math.floor((by1 - Y0C) / CEL));
      const destelloMapa = Math.min(1, golpe) * (t < H.encuentro + 1 ? 1 : 0), dMin = D * 0.3;
      const todo = revC >= 999 && revX >= 999;
      for (let nvl = 0; nvl < niveles.length; nvl++) {
        const N = niveles[nvl], esp = N.paso * S;
        // Cada nivel fino entra cuando sus motas quedan a más de ~3,6 px (y del todo a ~5,2); el 0, si se aleja mucho,
        // se aclara para no amontonarse.
        const e0 = pasoBase * 0.95, e1 = pasoBase * 1.35;
        if (nvl > 0 && esp < e0) continue;
        const queda0 = nvl === 0 && esp < e1 * 0.8 ? (esp / (e1 * 0.8)) ** 2 : 1;
        for (let cy = cy0; cy <= cy1; cy++) {
          for (let c = cy * NCX + cx0, cf = cy * NCX + cx1; c <= cf; c++) {
            for (let i = N.inicio[c], fin = N.inicio[c + 1]; i < fin; i++) {
              const wx = N.X[i], wy = N.Y[i];
              let dC = 0, dX = 0, oscura = false;
              if (!todo) {
                // (borde irregular: cada mota tiene su umbral, así lo descubierto no es un disco)
                const h = 0.86 + 0.28 * ((N.A[i] * 7.31) % 1);
                const ac = wx - CX, bc = wy - CY, ax2 = wx - XX, bx2 = wy - XY;   // (sqrt a mano: Math.hypot es lento en el bucle caliente)
                dC = Math.sqrt(ac * ac + bc * bc) - revC * h; dX = Math.sqrt(ax2 * ax2 + bx2 * bx2) - revX * h;
                oscura = dC > 0 && dX > 0 && dC + revC * h > revCalma && dX + revX * h > revCalma;
                // (la penumbra, con la mitad de motas: se lee igual y cuesta la mitad)
                if (oscura && (penumbra <= 0.01 || h > 1.0)) continue;
              }
              if (queda0 < 1 && ((N.A[i] * 13.7) % 1) > queda0) continue;
              const dx = (wx - cX) * S, dy = (wy - cY) * S, u = dx * cg - dy * sg, v = dx * sg + dy * cg, den = D - v * si;
              if (den < dMin) continue;
              const f = D / den;
              // (cerca de la cámara manda el zoom: así ningún nivel fino asoma solo por la perspectiva y no se ve dónde acaba)
              const ef = esp * (f < 1 ? f : 1);
              if (nvl > 0 && ef < e0) continue;
              const px = u * f, py = v * ci * f, qx = ax + px * ca - py * sa, qy = ay + px * sa + py * ca;
              if (qx < -4 || qx > ancho + 4 || qy < -4 || qy > alto + 4) continue;
              let a = N.A[i] * sat((f - 0.6) / 0.25);
              if (nvl > 0) a *= sat((ef - e0) / (e1 - e0));
              if (a < 0.08) continue;
              let b = N.T[i] * 2 + (a > 0.72 ? 1 : 0), lado = Math.max(1.5, Math.min(3, 2.15 * Math.min(1.4, Math.max(0.7, f))));
              // Frente de cada llamada: motas recién descubiertas, más claras.
              if (oscura) b = 8;
              // (el frente de cada onda: una banda de ~2 px en pantalla, también cerca de la cámara)
              if (!oscura) for (let o = 0; o < nO; o++) { const ox = wx - OX[o], oy = wy - OY[o], d = Math.abs(Math.sqrt(ox * ox + oy * oy) - OR[o]) * S * f; if (d < 2.4 + OR[o] * 0.02 * S) { b = 6; lado += 0.4; break; } }
              // Detrás de los rótulos (una elipse), las motas quedan en penumbra: el texto se lee limpio.
              if (nZ) for (let z = 0; z < nZ; z++) { const ex = (qx - ZX0[z]) / ZX1[z], ey = (qy - ZY0[z]) / ZY1[z]; if (ex * ex + ey * ey < 1) { b = 8; break; } }
              if (nL < MAXP) { LX[nL] = qx; LY[nL] = qy; LS[nL] = lado; LB[nL] = b; nL++; }
            }
          }
        }
      }
      for (let b = 0; b < 9; b++) {
        if (b === 7) continue;
        x.fillStyle = b === 6 ? TONOS[3] : b === 8 ? TONOS[1] : TONOS[b >> 1]; x.globalAlpha = mapaVis * atenua * (b === 6 ? 1 : b === 8 ? 0.27 * Math.max(penumbra, todo ? 1 : 0) : b & 1 ? 0.95 : 0.55); x.beginPath();
        let hay = false;
        for (let i = 0; i < nL; i++) if (LB[i] === b) { const l = LS[i]; x.rect(LX[i] - l / 2, LY[i] - l / 2, l, l); hay = true; }
        if (hay) x.fill();
      }
      // En cada golpe de la letra, el mapa entero se enciende un instante.
      if (destelloMapa > 0.02) {
        x.fillStyle = TONOS[3]; x.globalAlpha = destelloMapa * 0.55 * mapaVis; x.beginPath();
        for (let i = 0; i < nL; i++) if (LB[i] < 7) { const l = LS[i]; x.rect(LX[i] - l / 2, LY[i] - l / 2, l, l); }
        x.fill();
      }
      x.globalAlpha = 1;
    }

    // 4. Las ondas de las llamadas sobre el plano.
    if (!calma && t < H.espera + 1.4) {
      for (let o = 0; o < 2; o++) for (const [s, R] of o ? LLAMADAS.xiomara : LLAMADAS.carlos) {
        const e = t - s; if (e < 0 || e > DUR_ONDA) continue;
        enRuta(o ? tX : tC); ondaPlano(WX, WY, R * salida(e / DUR_ONDA), o ? ROSA : VIOLETA, (1 - e / DUR_ONDA) * 0.9 * (1 - tramo(t, H.espera, H.espera + 0.35)));
      }
    }

    // 5. El camino: el mapa que lleva hasta ella se traza en el primer «wait» (motas tenues de una orilla a otra); las
    // estrellas que cada luz va dejando; tras el encuentro, una línea fina lo une todo.
    if (antes && t > H.espera && mapaVis > 0.01) {
      const traza = calma ? tramo(t, H.espera, H.espera + 1.5) : salida(tramo(t, H.espera, H.espera + 1.1)), apaga = 1 - tramo(t, H.encuentro, H.encuentro + 1);
      if (apaga > 0) {
        x.globalAlpha = 0.6 * apaga * mapaVis; x.fillStyle = 'rgb(236,214,255)';
        x.beginPath(); const a = Math.round(traza * RUTA_N); let abierto = false;
        for (let j = 0; j <= a; j++) { if (proyectar(RX[j], RY[j])) { if (abierto) pA(QX, QY); else pIni(QX, QY, 7, 1.5); abierto = true; } else abierto = false; }
        x.fill();
      }
      if (t > H.encuentro) {
        x.globalAlpha = 0.4 * tramo(t, H.encuentro + 0.3, H.encuentro + 1.6) * mapaVis; x.strokeStyle = 'rgb(244,220,255)'; x.lineWidth = 0.9;
        x.beginPath(); let abierto = false;
        // (se corta detrás de los rótulos: no tacha los nombres)
        for (let j = 0; j <= RUTA_N; j++) { if (proyectar(RX[j], RY[j]) && !enZona(QX, QY)) { if (abierto) x.lineTo(QX, QY); else x.moveTo(QX, QY); abierto = true; } else abierto = false; }
        x.stroke();
      }
      for (let lado = 0; lado < 2; lado++) {
        x.fillStyle = rgba(lado ? ROSA : VIOLETA, 1); x.globalAlpha = mapaVis; x.beginPath();
        for (let i = 0; i < CAMINO; i++) {
          const s = cs[i], d = lado ? s - tX : tC - s;
          if ((lado ? s < S_ENC : s >= S_ENC) || d < 0) continue;
          enRuta(s); if (!proyectar(WX + cj[i], WY + cj[i] * 0.5)) continue;
          const r = ct[i] * Math.min(1.3, QF) * (1 + 1.5 * Math.max(0, 1 - d / 0.02)) * (0.85 + 0.15 * Math.sin(t * 3 + i));
          x.rect(QX - r / 2, QY - r / 2, r, r);
        }
        x.fill();
      }
      x.globalAlpha = 1;
    }

    // 6. Las dos luces (en casa hasta su «wait», luego viajan con una estela) y, desde el encuentro, la de los dos.
    if (t < H.encuentro + 0.05 && mapaVis > 0.01) {
      for (let o = 0; o < 2; o++) {
        const col = o ? ROSA : VIOLETA, enc = o ? H.luzXiomara : H.luzCarlos, sale = o ? H.respuesta : H.espera, f = o ? viajeXiomara : viajeCarlos;
        if (t < enc) continue;
        if (t > sale) {   // estela: dónde estaba hace unos instantes (sin memoria: se recalcula con el reloj)
          x.fillStyle = rgba(col, 1); x.beginPath();
          for (let j = 1; j <= 14; j++) { enRuta(f(t - j * 0.04, calma)); if (proyectar(WX, WY, 14)) { const r = 1.9 * (1 - j / 16); x.rect(QX - r, QY - r, 2 * r, 2 * r); } }
          x.globalAlpha = 0.7 * mapaVis; x.fill(); x.globalAlpha = 1;
        }
        const nace = calma ? tramo(t, enc, enc + 0.6) : rebote(tramo(t, enc, enc + 0.45));
        // Mientras llama, la luz crece un poco con cada sílaba.
        let voz = 0; if (!calma && t < H.espera) for (const [s] of o ? LLAMADAS.xiomara : LLAMADAS.carlos) if (t >= s && t < s + 0.4) voz = Math.max(voz, 1 - (t - s) / 0.4);
        enRuta(f(t, calma));
        luzSobreMapa(WX, WY, col, nace * (1 + 0.25 * voz + 0.35 * Math.max(0, 1 - (t - sale) / 0.5) * (t >= sale)), t, mapaVis);
        if (!calma && QF > 0) chispas(QX, QY, t - sale, col, m * 0.15);
      }
    }

    // 7. El encuentro: destello en el plano, la luz de los dos y el corazón que nace sobre ella.
    if (t > H.encuentro && antes) {
      const lat = calma ? 0 : latido(t, H.encuentro + 0.4);
      if (!calma && mapaVis > 0.01) { const e = t - H.encuentro; ondaPlano(MX, MY, 12 * salida(Math.min(1, e / 1.2)), ROSA, (1 - Math.min(1, e / 1.2)) * mapaVis); ondaPlano(MX, MY, 9 * salida(Math.min(1, (e - 0.12) / 1.2)), VIOLETA, e > 0.12 ? (1 - Math.min(1, (e - 0.12) / 1.2)) * mapaVis : 0); }
      if (mapaVis > 0.01 && morf < 0.02) {
        luzSobreMapa(MX, MY, BLANCO, (calma ? 1 : rebote(tramo(t, H.encuentro, H.encuentro + 0.5))) * (1 + 0.18 * lat), t, mapaVis);
        if (!calma && QF > 0) chispas(QX, QY, t - H.encuentro, BLANCO, m * 0.3, 1.1);
      }
      // El corazón: crece sobre la luz, late, gira un poco sobre sí mismo; en «cielo» se recoge otra vez en ella.
      if (corazon(t)) {
        const tamC = KT, bx = KX, by = KY;
        const giro = calma ? 0 : 0.42 * Math.sin((t - H.encuentro) * 0.75), cgi = Math.cos(giro), sgi = Math.sin(giro);
        for (let c = 0; c < 3; c++) for (let nv = 0; nv < 2; nv++) {
          x.fillStyle = COL[c]; x.globalAlpha = (nv ? 1 : 0.5) * vivo; x.beginPath();
          for (let i = 0; i < CORAZON; i++) {
            if (hc[i] !== c) continue;
            const tb = Math.sin(t * 1.3 + hf[i]) * 0.01, xr = hx[i] * cgi + hz[i] * sgi, zr = -hx[i] * sgi + hz[i] * cgi;
            if ((zr < 0.02) !== !!nv) continue;
            const f = 1 / (1 + zr * 0.35), r = ht[i] * f;
            x.rect(bx + (xr + tb) * tamC * f - r / 2, by + (hy[i] + tb) * tamC * f - r / 2, r, r);
          }
          x.fill();
        }
        x.globalAlpha = 1;
      }
    }

    // 8. El mundo: el mapa se curva y se cierra en un globo que gira; luego se aleja hasta ser una luz. Al final, pequeño,
    // arriba, sobre el cielo del universo.
    const final = t >= H.tarjeta;
    if ((morf > 0 && t < H.salto + 0.2 && vivo > 0) || final) {
      let gx, gy, R, lon0, lat0, alfa, quedan;
      if (!final) {
        proyectar(MX, MY, 0); gx = QX; gy = QY;
        // (en el móvil apaisado, el globo no llega a la frase de arriba)
        const R0 = S * 57.3, R1 = Math.min(m * 0.4, alto * 0.5 - 84); R = (R0 + (R1 - R0) * morf) * (1 - 0.965 * lejos);
        lon0 = M_LON - 14 * suave(tramo(t, 25.2, H.salto)); lat0 = 8 * morf; alfa = vivo; quedan = 1 - 0.85 * lejos;
      } else {
        const llega = calma ? suave(tramo(t, H.tarjeta, H.tarjeta + 1.2)) : rebote(tramo(t, H.tarjeta, H.tarjeta + 1));
        gx = Fx; gy = Fy; R = Sf * llega; lon0 = M_LON - 6 + 22 * Math.sin((t - H.tarjeta) * 0.16); lat0 = 14; alfa = sat(llega * 1.5); quedan = 0.4;
      }
      dibujarGlobo(t, gx, gy, R, lon0, lat0, alfa, quedan, final ? 1 : morf, final);
    }
    // El salto: la luz del mundo, ya un punto, en el centro de la estampida.
    if (!calma && lejos > 0.6 && t < H.salto + 0.9) { const a = t < H.salto ? 1 : 1 - tramo(t, H.salto, H.salto + 0.9); luz(ancho / 2, alto / 2, BLANCO, 0.7 + 0.8 * tramo(t, 26.9, H.salto) + 1.6 * uS, t, a); }

    // 9. Rótulos: los nombres en los primeros planos, la distancia y las coordenadas en el viaje, «0 km» en el encuentro.
    if (antes) rotulos(t, tC, tX);

    // El texto de la historia y el final (tarjeta y cielo).
    let indice = -1; for (let i = 0; i < FRASES.length; i++) if (t >= FRASES[i].desde) indice = i;
    if (indice !== frase) { frase = indice; alFrase(FRASES[indice]?.texto ?? ''); }
    // Medio segundo antes, con la pantalla en negro tras el salto, se prepara la tarjeta (su primer pintado y su desenfoque
    // cuestan un cuadro largo: así cae donde no se ve nada moverse).
    if (!previoDado && t >= H.tarjeta - 0.45) { previoDado = true; alPrevio(); }
    if (!finalDado && t >= H.tarjeta) { finalDado = true; alFinal(); }
  }

  // Un segmento recto del mundo (los meridianos y paralelos de Mercator lo son, y la perspectiva los deja rectos),
  // recortado por delante de la cámara.
  function segmento(x1, y1, x2, y2) {
    const pa = proyectarV(x1, y1), pb = proyectarV(x2, y2), lim = D * 0.32;
    let a = 0, b = 1;
    if (pa < lim && pb < lim) return;
    if (pa < lim) a = (lim - pa) / (pb - pa); else if (pb < lim) b = (pa - lim) / (pa - pb);
    proyectar(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a); const sx = QX, sy = QY;
    proyectar(x1 + (x2 - x1) * b, y1 + (y2 - y1) * b);
    pIni(sx, sy, dPaso, dLado); pA(QX, QY);
  }
  // (el denominador de la perspectiva de un punto del plano)
  function proyectarV(wx, wy) { const dx = (wx - cX) * S, dy = (wy - cY) * S; return D - (dx * sg + dy * cg) * si; }

  // El globo: tierra en motas (por tono), rejilla tenue, el borde en puntos, el camino de los dos y su luz.
  function dibujarGlobo(t, gx, gy, R, lon0, lat0, alfa, quedan, forma, final) {
    if (R < 0.5 || alfa <= 0.01) return;
    const l0 = lon0 * RAD, cl = Math.cos(l0), sl = Math.sin(l0), p0 = lat0 * RAD, cp = Math.cos(p0), sp = Math.sin(p0);
    // Mientras se forma (forma < 1), cada mota viaja desde su sitio en el mapa plano hasta el globo (las del centro, antes).
    const plano = forma < 1;
    nL = 0;
    const lado = Math.max(1.5, Math.min(2.4, R / 70));
    for (let i = 0; i < globo.n; i++) {
      if (globo.r[i] > quedan) continue;
      // Girar: primero la longitud (eje polar), luego la inclinación (eje x).
      const X0 = globo.x[i], Z0 = globo.z[i], Y0 = globo.y[i];
      const xa = Z0 * cl - X0 * sl, za = X0 * cl + Z0 * sl;   // za > 0: hacia nosotros
      const yb = Y0 * cp - za * sp, zb = Y0 * sp + za * cp;
      let px = gx + xa * R, py = gy - yb * R, a = zb;
      if (plano) {
        const lon = Math.atan2(Z0, X0) / RAD, lat = Math.asin(Y0) / RAD, k = sat((forma - 0.25 * Math.min(1, Math.abs(lon - lon0) / 90)) / 0.75);
        if (!proyectar(lon, -merc(lat))) { if (zb < 0) continue; }
        else { px = QX + (px - QX) * suave(k); py = QY + (py - QY) * suave(k); }
        a = zb < 0 ? (1 - k) * 0.8 : 0.35 + 0.65 * Math.max(zb, 1 - k);
        if (forma < 0.25) a *= forma / 0.25;
      } else if (zb < 0.02) continue;
      if (px < -3 || px > ancho + 3 || py < -3 || py > alto + 3) continue;
      if (nL < MAXP) { LX[nL] = px; LY[nL] = py; LS[nL] = lado * (0.75 + 0.25 * Math.max(0, zb)); LB[nL] = globo.t[i] * 2 + (a > 0.6 ? 1 : 0); nL++; }
    }
    for (let b = 0; b < 6; b++) {
      x.fillStyle = TONOS[b >> 1]; x.globalAlpha = alfa * (b & 1 ? 0.95 : 0.5); x.beginPath();
      let hay = false;
      for (let i = 0; i < nL; i++) if (LB[i] === b) { const l = LS[i]; x.rect(LX[i] - l / 2, LY[i] - l / 2, l, l); hay = true; }
      if (hay) x.fill();
    }
    // Rejilla (meridianos cada 15° y cinco paralelos) y borde, cuando ya es globo.
    const g = sat((forma - 0.6) / 0.4) * alfa;
    if (g > 0.01 && R > 12) {
      x.fillStyle = 'rgb(190,170,255)'; x.globalAlpha = 0.32 * g; x.beginPath();
      const rr = Math.max(0.9, Math.min(1.3, R / 140)), paso = R > 60 ? 1 : 2;
      for (let i = 0; i < rejillaGlobo.n; i += paso) {
        const X0 = rejillaGlobo.x[i], Z0 = rejillaGlobo.z[i], Y0 = rejillaGlobo.y[i], xa = Z0 * cl - X0 * sl, za = X0 * cl + Z0 * sl, yb = Y0 * cp - za * sp, zb = Y0 * sp + za * cp;
        if (zb < 0.05) continue;
        x.rect(gx + xa * R - rr / 2, gy - yb * R - rr / 2, rr, rr);
      }
      x.fill();
      x.globalAlpha = 0.45 * g; x.fillStyle = 'rgb(214,190,255)'; x.beginPath();
      const nb = Math.max(24, Math.round(TAU * (R + 2) / 5)), lb = R > 60 ? 1.3 : 1.1;
      for (let i = 0; i < nb; i++) { const a = i / nb * TAU; x.rect(gx + Math.cos(a) * (R + 2) - lb / 2, gy + Math.sin(a) * (R + 2) - lb / 2, lb, lb); }
      x.fill();
    }
    // El camino de los dos sobre el globo y su luz en el ecuador.
    const enGlobo = (wx, wy) => { const lon = wx * RAD, lat = desmerc(-wy) * RAD, X0 = Math.cos(lat) * Math.cos(lon), Z0 = Math.cos(lat) * Math.sin(lon), Y0 = Math.sin(lat), xa = Z0 * cl - X0 * sl, za = X0 * cl + Z0 * sl; QX = gx + xa * R; QY = gy - (Y0 * cp - za * sp) * R; QF = Y0 * sp + za * cp; };
    if (g > 0.01) {
      x.globalAlpha = 0.75 * g; x.strokeStyle = 'rgb(246,222,255)'; x.lineWidth = R > 60 ? 1.1 : 0.9; x.beginPath();
      for (let j = 0; j <= RUTA_N; j += 4) { enGlobo(RX[j], RY[j]); if (j) x.lineTo(QX, QY); else x.moveTo(QX, QY); }
      x.stroke();
      for (let o = 0; o < 2; o++) { enGlobo(o ? XX : CX, o ? XY : CY); x.fillStyle = COL[o ? 1 : 0]; x.globalAlpha = g; x.beginPath(); circulo(QX, QY, R > 60 ? 2 : 1.4); x.fill(); }
    }
    const lat = calma ? 0 : latido(t, H.encuentro);
    enGlobo(MX, MY);
    if (QF > 0) luz(QX, QY, BLANCO, (final ? 0.55 : 0.9) * (1 + 0.15 * lat) * Math.min(1, 0.4 + R / 120), t, alfa * (final ? 1 : sat(forma * 3)));
    x.globalAlpha = 1;
  }

  // El corazón del cuadro: tamaño (KT), centro (KX, KY) y suelo bajo él (KL, la luz de los dos). false si no está.
  let KT = 0, KX = 0, KY = 0, KL = 0;
  function corazon(t) {
    if (t <= H.encuentro || t >= H.tarjeta) return false;
    const lat = calma ? 0 : latido(t, H.encuentro + 0.4);
    const crece = calma ? suave(tramo(t, H.encuentro, H.encuentro + 0.9)) : rebote(tramo(t, H.encuentro + 0.1, H.encuentro + 0.9));
    const recoge = suave(tramo(t, H.cielo, H.cielo + 0.75));
    KT = m * (vertical ? 0.24 : 0.2) * crece * (1 - recoge) * (1 + 0.06 * lat);
    if (KT <= 0.5 || !proyectar(MX, MY, 0)) return false;
    KX = QX; KL = QY; KY = QY - (KT * 1.15 + 18) * (1 - recoge * 0.9);
    return true;
  }
  // Rótulos del clip (lienzo): la tipografía de los créditos de una película. Con medir, solo apunta sus zonas.
  let soloZonas = false;
  function zonasTexto(t) { nZ = 0; soloZonas = true; rotulos(t, viajeCarlos(t, calma), viajeXiomara(t, calma)); soloZonas = false; }
  function rotulos(t, tC, tX) {
    const tamN = Math.max(34, Math.min(58, m * 0.105)), tp = Math.max(10, Math.min(12, m * 0.027));
    // Apertura: «Para Xiomara», fina, antes de la primera llamada.
    const ap = tramo(t, 0.15, 0.55) * (1 - tramo(t, 0.95, 1.25));
    if (!soloZonas) texto(ancho / 2 + 3, alto * 0.5, 'PARA XIOMARA', tp + 2, 'q', 'rgb(240,210,230)', ap, '7px', true);
    // Los nombres, bajo el corazón (durante la nota larga), y dónde se han encontrado.
    const an = tramo(t, H.nombres, H.nombres + 1) * (1 - tramo(t, H.cielo - 0.2, H.cielo + 0.4));
    if (an > 0 && corazon(t)) {
      const tn = Math.max(30, m * (vertical ? 0.1 : 0.075)), yN = Math.min(alto - 60, Math.max(KY + KT * 1.05 + tn * 0.95, KL + tn * 1.3));
      if (soloZonas) zona(ancho / 2 - tn * 3.3, yN - tn * 0.85, ancho / 2 + tn * 3.3, yN + tn * 0.62 + 8);
      else {
        pareja(ancho / 2, yN + (1 - an) * 8, tn, an);
        texto(ancho / 2 + 2, yN + tn * 0.62 + (1 - an) * 8, 'EN MITAD DEL MUNDO', tp, 'q', 'rgb(236,206,228)', an * 0.85, '4px', true);
      }
    }
    // Primeros planos: el nombre de quien llama y dónde está, bajo su luz.
    const planos = [
      [H.luzCarlos + 0.25, H.luzXiomara, CX, CY, 'Carlos', 'MADRID  ·  40°25′ N', tamN],
      [H.luzXiomara + 0.25, H.mapa, XX, XY, 'Xiomara', 'BUENOS AIRES  ·  34°36′ S', tamN],
      [H.mapa + 0.2, H.ruta, CX, CY, 'Carlos', 'ESPAÑA', tamN * 0.78],
      [H.ruta + 0.2, H.juntos, XX, XY, 'Xiomara', 'ARGENTINA', tamN * 0.78]
    ];
    for (const [a, b, wx, wy, nombre, dato, tn] of planos) {
      if (t < a || t >= b) continue;
      const al = tramo(t, a, a + 0.5) * (1 - tramo(t, b - 0.3, b));
      if (proyectar(wx, wy, 0)) rotulo(QX, QY + tn * 1.15 + 18, nombre, dato, al, tn);
    }
    // El viaje: cuánto falta entre los dos (km de verdad sobre la Tierra) y dónde va cada uno.
    if (t > H.espera + 0.3 && t < H.encuentro + 1.8) {
      enRuta(tC); const ax0 = WX, ay0 = WY; enRuta(tX);
      const d = t < H.encuentro ? km(ax0, ay0, WX, WY) : 0;
      const a = tramo(t, H.espera + 0.3, H.espera + 0.9) * (1 - tramo(t, H.encuentro + 1.2, H.encuentro + 1.8));
      const yb = alto - Math.max(60, alto * (vertical ? 0.1 : 0.09)), tg = Math.max(26, Math.min(40, m * 0.08));
      if (soloZonas) { zona(ancho / 2 - Math.max(tg * 3.4, tp * 13), yb - tg - 8 - tp - 6, ancho / 2 + Math.max(tg * 3.4, tp * 13), yb + tp + 18); return; }
      texto(ancho / 2 + 2, yb - tg - 8, 'ENTRE TÚ Y YO', tp, 'q', 'rgb(236,206,228)', a * 0.8, '5px', true);
      texto(ancho / 2, yb, `${miles(d)} km`, tg, 'q', 'rgb(255,226,240)', a);
      // Coordenadas de quien viaja en el plano (él; desde el segundo «wait», ella).
      const quien = t < H.respuesta ? 0 : t < 17.6 ? 1 : -1;
      if (quien >= 0) { enRuta(quien ? tX : tC); texto(ancho / 2 + 1, yb + tp + 12, coordenadas(WX, WY), tp, 'q', quien ? 'rgb(255,190,224)' : 'rgb(222,200,255)', a * 0.85 * (quien ? tramo(t, H.respuesta, H.respuesta + 0.4) : 1) * (quien ? 1 : 1 - tramo(t, H.respuesta - 0.3, H.respuesta))); }
      else if (t >= H.encuentro) texto(ancho / 2 + 1, yb + tp + 12, '0°00′  ·  ECUADOR', tp, 'q', 'rgb(255,226,240)', a * 0.85, '3px', true);
    }
  }

  function cuadro() {
    if (!activo) return;
    id = requestAnimationFrame(cuadro);
    // Ya en la tarjeta (el mundo quieto arriba), en el móvil basta con 30 FPS: menos calor mientras se lee.
    const t = reloj();
    if (t === null || t === undefined) return;
    if (movil && t > H.tarjeta + 2 && (saltoCuadro = !saltoCuadro)) return;
    dibujar(t);
  }
  id = requestAnimationFrame(cuadro);

  return {
    // Para las pruebas: un cuadro en un instante dado (sin esperar al reloj).
    dibujar,
    parar() { activo = false; cancelAnimationFrame(id); removeEventListener('resize', alCambiar); clearTimeout(esperaMedir); },
    get finalDado() { return finalDado; },
    // (para las pruebas: motas pintadas en el último cuadro)
    get motas() { return nL; }
  };
}
