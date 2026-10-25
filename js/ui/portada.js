// Intro: un videoclip de 32 s con la canción de la portada (momento «inicio» de js/data/bandaSonora.js). Dos luces en
// las dos orillas del Atlántico (Carlos en España, Xiomara en Argentina) se llaman, el mapa que las separa aparece a su
// alrededor, cada una sigue un camino de estrellas sobre el océano hasta la otra, y de su encuentro nace un corazón de
// luz; el mapa se deshace en cielo («dos orillas, un mismo cielo»), el corazón nos lleva a toda velocidad hacia dentro y
// al otro lado está el cielo de nuestro universo, con la tarjeta para entrar.
// Lienzo 2D sin degradados ni halos: la luz son motas y puntos nítidos (arcos y rectángulos de 1–3 px, líneas finas).
// Todo se dibuja en función del tiempo t del clip (sin estado entre cuadros): con la canción, t es su reloj
// (js/ui/entrada.js) y la imagen va clavada a la música aunque se pierdan cuadros; sin canción, un reloj propio.
// Con movimiento reducido (calma) la misma historia, sin destellos, ondas, latidos ni el salto final.
import { esTierra, ORILLAS } from '../data/costas.js';

const TAU = Math.PI * 2;
const sat = k => k < 0 ? 0 : k > 1 ? 1 : k;
const tramo = (t, a, b) => sat((t - a) / (b - a));
const suave = k => k * k * (3 - 2 * k);
const salida = k => 1 - (1 - k) * (1 - k) * (1 - k);
const rebote = k => { const c = 1.6, u = k - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI;
const desmerc = y => (2 * Math.atan(Math.exp(y * Math.PI / 180)) - Math.PI / 2) * 180 / Math.PI;
// Azar sembrado (mulberry32): el mismo cielo y el mismo mapa en cada visita y al girar la pantalla.
function sembrado(semilla) { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Pulsos de la canción (negras a ~120 BPM; un compás cada cuatro, cada ~2 s), en segundos del fragmento: medidos con
// scripts/analizar-audio.py sobre assets/musica/inicio.m4a. Las imágenes entran y laten con ellos.
export const PULSOS = Object.freeze([0, 0.49, 1, 1.49, 1.97, 2.48, 3, 3.51, 3.99, 4.51, 5.02, 5.5, 6.01, 6.52, 7.01, 7.52, 8.01, 8.52,
  9.01, 9.52, 10.03, 10.52, 11.03, 11.54, 12.03, 12.54, 13.03, 13.51, 14.02, 14.51, 15.02, 15.51, 16.02, 16.51, 17, 17.51, 18.02,
  18.51, 19.02, 19.51, 19.99, 20.5, 21.01, 21.5, 22.01, 22.5, 23.01, 23.52, 24.03, 24.52, 25.01, 25.5, 26.01, 26.49, 27.01, 27.49,
  27.98, 28.49, 29, 29.49, 30, 30.51, 31, 31.51, 32]);
// Guion (segundos del clip). Con canción, cada hito cae en la marca del mismo nombre de su momento «inicio»
// (js/util/sincronia.js, reescalar); estas son las marcas de assets/musica/inicio.m4a, así que el clip va a 1:1.
//   luzCarlos   primera llamada de la voz: se enciende la luz de Carlos en España
//   luzXiomara  segunda llamada: se enciende la de Xiomara en Argentina
//   mapa        tercera: el mapa se despliega desde las dos luces, compás a compás
//   ruta        cuarta: aparece el camino posible entre las dos orillas y la distancia
//   espera      primer golpe de la letra: Carlos sale a buscarla, dejando estrellas sobre el océano
//   respuesta   segundo golpe: Xiomara sale a su encuentro
//   encuentro   se encuentran en mitad del océano (0 km) y nace el corazón de luz
//   nombres     «Carlos & Xiomara»
//   cielo       el mapa ya es cielo: «Dos orillas, un mismo cielo»
//   salto       el corazón nos lleva a toda velocidad hacia dentro
//   tarjeta     al otro lado, el cielo de nuestro universo y la tarjeta para entrar
export const HITOS = Object.freeze({ luzCarlos: 1.17, luzXiomara: 3.25, mapa: 5.11, ruta: 7.13, espera: 10.91, respuesta: 15.73, encuentro: 19.99, nombres: 22.01, cielo: 24.03, salto: 27.98, tarjeta: 30 });
export const DURACION = 32;
const H = HITOS;
// Las llamadas de la voz (cada sílaba, una onda de motas desde la luz que «habla»): primero él, luego ella, y a la vez
// en la última, cuando la canción crece hacia el primer golpe.
const LLAMADAS = { carlos: [1.17, 1.65, 2.11, 2.59, 5.11, 5.45, 6.15, 6.67, 9.09, 9.49, 10.13, 10.61], xiomara: [3.25, 3.63, 4.19, 4.65, 7.13, 7.53, 8.19, 8.65, 9.09, 9.49, 10.13, 10.61] };
// El texto de la historia (lo dice Carlos), en compás. «» = se apaga.
export const FRASES = Object.freeze([
  { desde: 6.01, texto: 'Tú en una orilla del mundo; yo, en la otra…' },
  { desde: 8.01, texto: '…y un océano entre los dos.' },
  { desde: 10.55, texto: '' },
  { desde: 12.03, texto: 'Seguí el mapa de las estrellas…' },
  { desde: 15.45, texto: '' },
  { desde: 16.02, texto: '…y tú también me buscabas.' },
  { desde: 19.45, texto: '' },
  { desde: 24.03, texto: 'Dos orillas, un mismo cielo.' },
  { desde: 26.01, texto: '…y un universo solo nuestro.' },
  { desde: 27.6, texto: '' }
]);
const KM = 10000;
// Puntos de paso del camino (longitud, latitud): de Madrid sale al Atlántico por Portugal, baja al oeste de Canarias y
// Cabo Verde, cruza el ecuador en mitad del océano y entra en el Río de la Plata.
const CAMINO_PASOS = [ORILLAS.carlos, [-10.5, 38.5], [-20, 27], [-27, 8], [-31, -10], [-42, -27], ORILLAS.xiomara];   // de Madrid a Buenos Aires hay ~10 045 km: la cuenta empieza en redondo

// Índice del último pulso ≤ t (búsqueda binaria; -1 antes del primero).
function pulso(t) {
  if (t < PULSOS[0]) return -1;
  let a = 0, b = PULSOS.length - 1;
  while (a < b) { const m = (a + b + 1) >> 1; if (PULSOS[m] <= t) a = m; else b = m - 1; }
  return a;
}
// Avance de 0 a 1 entre a y b a golpes de pulso: en cada pulso un empujón que frena antes del siguiente (mezcla: cuánto
// se nota el golpe; 0 = recto). Los nodos de cada tramo se calculan una vez.
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
// Latido del corazón: un golpe en cada tiempo fuerte (pulso par) y su eco 0,22 s después.
function latido(t, desde) {
  let i = pulso(t); if (i < 0 || t < desde) return 0;
  if (i % 2) i--;
  const d = t - PULSOS[i];
  return Math.exp(-d * 8) + (d > 0.22 ? 0.55 * Math.exp(-(d - 0.22) * 9) : 0);
}
// Viaje de cada luz por su camino (fracción de la ruta: 0 = España, 1 = Argentina). Él sale en el primer golpe y llega
// a un cuarto del camino en el segundo; entonces sale ella, más deprisa, y se encuentran en el centro en «encuentro».
function viajeCarlos(t, calma) { const m = calma ? 0 : 0.45; return t < H.respuesta ? 0.27 * aPulsos(t, H.espera, H.respuesta, m) : 0.27 + 0.23 * aPulsos(t, H.respuesta, H.encuentro, m); }
function viajeXiomara(t, calma) { return 1 - 0.5 * aPulsos(t, H.respuesta, H.encuentro, calma ? 0 : 0.45); }
const miles = n => { const s = String(Math.max(0, Math.round(n))); return s.length > 3 ? s.slice(0, -3) + '.' + s.slice(-3) : s; };

// Colores (rosa y violeta sobre negro): Carlos, violeta; Xiomara, rosa; lo de los dos, blanco rosado.
const VIOLETA = [205, 170, 255], ROSA = [255, 150, 205], BLANCO = [255, 236, 246];
// (con caché: en cada cuadro no se crea ningún texto nuevo, que en el móvil acaba en pausas del recolector)
const cacheColor = new Map();
function rgba(c, a) {
  let m = cacheColor.get(c); if (!m) cacheColor.set(c, m = new Map());
  const k = Math.round(a * 1000); let v = m.get(k);
  if (!v) m.set(k, v = `rgba(${c[0]},${c[1]},${c[2]},${(k / 1000).toFixed(3)})`);
  return v;
}
const cacheFuente = new Map();
const fuente = (tam, familia) => { const k = familia + tam; let v = cacheFuente.get(k); if (!v) cacheFuente.set(k, v = familia === 'v' ? `${tam}px 'Great Vibes', cursive` : `600 ${tam}px Quicksand, sans-serif`); return v; };
const COL = [rgba(VIOLETA, 1), rgba(ROSA, 1), rgba(BLANCO, 1)];

// reloj(): t del clip en segundos, o null mientras no ha empezado (no se dibuja nada).
// alFrase(texto): cambia el texto de la historia. alFinal(): llega «tarjeta» (aparece el cielo y la tarjeta).
export function crearPortada(lienzo, { reloj = () => null, calma = false, alFrase = () => {}, alFinal = () => {} } = {}) {
  const x = lienzo.getContext('2d');
  const movil = matchMedia('(pointer:coarse)').matches;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let ancho = 0, alto = 0, m = 0, vertical = true, k = 1, ox = 0, oy = 0, activo = true, id = 0, frase = -1, finalDado = false, saltoCuadro = false;
  let Hx = 0, Hy = 0, Fx = 0, Fy = 0, S = 1, Sf = 1, nx = 0, ny = 0, cx = 0, cy = 0, xx = 0, xy = 0;
  const mapa = document.createElement('canvas'), xm = mapa.getContext('2d');
  // Ruta: la curva de España a Argentina, muestreada por distancia (RUTA_N tramos iguales).
  const RUTA_N = 240, rx = new Float32Array(RUTA_N + 1), ry = new Float32Array(RUTA_N + 1);
  const punto = s => { situar(s); return [PX, PY]; };
  // Lo mismo sin crear nada (en cada cuadro): deja el punto en PX, PY.
  let PX = 0, PY = 0;
  function situar(s) { const f = sat(s) * RUTA_N, i = Math.min(RUTA_N - 1, f | 0), u = f - i; PX = rx[i] + (rx[i + 1] - rx[i]) * u; PY = ry[i] + (ry[i + 1] - ry[i]) * u; }

  // ── Contenido fijo (sembrado): el mismo en el móvil y en el PC ──
  const azar = sembrado(15122025);
  const ESTRELLAS = 260, ex = new Float32Array(ESTRELLAS), ey = new Float32Array(ESTRELLAS), et = new Float32Array(ESTRELLAS), ea = new Float32Array(ESTRELLAS), ef = new Float32Array(ESTRELLAS), en = new Float32Array(ESTRELLAS);
  for (let i = 0; i < ESTRELLAS; i++) { ex[i] = azar(); ey[i] = azar(); et[i] = 0.8 + azar() * azar() * 1.4; ea[i] = 0.25 + azar() * 0.6; ef[i] = azar() * TAU;
    // Aparecen en los tres primeros pulsos (antes de la primera llamada), un tercio en cada uno.
    en[i] = PULSOS[i % 3]; }
  // Corazón: 900 motas sobre la curva clásica (el contorno, denso; por dentro, más suelto), en rosa, violeta y blanco.
  const CORAZON = 900, hx = new Float32Array(CORAZON), hy = new Float32Array(CORAZON), ht = new Float32Array(CORAZON), ha = new Float32Array(CORAZON), hc = new Uint8Array(CORAZON), hf = new Float32Array(CORAZON), hd = new Float32Array(CORAZON), hv = new Float32Array(CORAZON);
  for (let i = 0; i < CORAZON; i++) {
    const a = azar() * TAU, s = Math.sin(a), lleno = azar() < 0.6 ? 1 - azar() * 0.06 : 0.25 + Math.sqrt(azar()) * 0.65;
    hx[i] = (16 * s * s * s / 17) * lleno + (azar() - 0.5) * 0.05; hy[i] = -((13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17) * lleno - 0.12 + (azar() - 0.5) * 0.05;
    ht[i] = 0.9 + azar() * azar() * 1.6; ha[i] = 0.55 + azar() * 0.45; const r = azar(); hc[i] = r < 0.45 ? 1 : r < 0.82 ? 0 : 2; hf[i] = azar() * TAU;
    hd[i] = Math.atan2(hy[i], hx[i]) + (azar() - 0.5) * 0.6; hv[i] = 0.55 + azar() * 0.9;
  }
  // Estrellas del camino (se encienden al pasar cada luz) y chispas de los dos golpes y del encuentro.
  const CAMINO = 56, cs = new Float32Array(CAMINO), cj = new Float32Array(CAMINO), ct = new Float32Array(CAMINO);
  for (let i = 0; i < CAMINO; i++) { cs[i] = (i + 0.5) / CAMINO; cj[i] = (azar() - 0.5) * 7; ct[i] = 1 + azar() * 0.9; }
  const CHISPAS = 36, qa = new Float32Array(CHISPAS), qv = new Float32Array(CHISPAS);
  for (let i = 0; i < CHISPAS; i++) { qa[i] = (i + azar() * 0.8) / CHISPAS * TAU; qv[i] = 0.35 + azar() * 0.75; }
  // Motas del mapa (se rehacen al cambiar el tamaño de la pantalla).
  let tierra = { n: 0 }, alzadas = { n: 0 }, porC = null, porX = null;

  // ── Medidas, proyección (Mercator) y mapa ──
  function medir() {
    ancho = innerWidth; alto = innerHeight; m = Math.min(ancho, alto); vertical = alto >= ancho;
    lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr);
    mapa.width = lienzo.width; mapa.height = lienzo.height;
    // Escala: las dos orillas ocupan ~60 % de la pantalla (en horizontal, la altura manda).
    const C = ORILLAS.carlos, X = ORILLAS.xiomara;
    k = Math.min(ancho * (vertical ? 0.62 : 0.42) / (C[0] - X[0]), alto * (vertical ? 0.54 : 0.62) / (merc(C[1]) - merc(X[1])));
    ox = 0; oy = 0;
    // El camino: una curva suave (Catmull-Rom) por puntos de paso sobre el océano, sin pisar África ni Brasil.
    const P = CAMINO_PASOS.map(([lon, lat]) => [lon * k, -merc(lat) * k]), tramos = P.length - 1;
    const fino = 2400, lx = new Float32Array(fino + 1), ly = new Float32Array(fino + 1), acum = new Float32Array(fino + 1);
    for (let i = 0; i <= fino; i++) {
      const f = Math.min(tramos - 1e-6, i / fino * tramos), j = f | 0, u = f - j;
      const p0 = P[Math.max(0, j - 1)], p1 = P[j], p2 = P[j + 1], p3 = P[Math.min(tramos, j + 2)];
      const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
      lx[i] = cr(p0[0], p1[0], p2[0], p3[0]); ly[i] = cr(p0[1], p1[1], p2[1], p3[1]);
      if (i) acum[i] = acum[i - 1] + Math.hypot(lx[i] - lx[i - 1], ly[i] - ly[i - 1]);
    }
    for (let j = 0, i = 0; j <= RUTA_N; j++) { const d = acum[fino] * j / RUTA_N; while (i < fino - 1 && acum[i + 1] < d) i++; const u = (d - acum[i]) / Math.max(1e-6, acum[i + 1] - acum[i]); rx[j] = lx[i] + (lx[i + 1] - lx[i]) * u; ry[j] = ly[i] + (ly[i + 1] - ly[i]) * u; }
    // El encuentro (mitad del camino) en el centro de la pantalla: se desplaza todo para que caiga ahí.
    Hx = ancho / 2; Hy = alto * (vertical ? 0.5 : 0.53);
    const [h0x, h0y] = punto(0.5); ox = Hx - h0x; oy = Hy - h0y;
    for (let j = 0; j <= RUTA_N; j++) { rx[j] += ox; ry[j] += oy; }
    [cx, cy] = punto(0); [xx, xy] = punto(1);
    // Normal del camino en el encuentro (hacia el este): ahí va la cuenta de los km y hacia ahí se separan las estrellas.
    { const [a0, b0] = punto(0.48), [a1, b1] = punto(0.52), L = Math.hypot(a1 - a0, b1 - b0); nx = -(b1 - b0) / L; ny = (a1 - a0) / L; if (nx < 0) { nx = -nx; ny = -ny; } }
    S = m * (vertical ? 0.27 : 0.2);
    // Al final el corazón queda arriba, pequeño, y la tarjeta debajo (como la galaxia de antes).
    Fx = ancho / 2; Fy = alto * (vertical ? 0.155 : 0.17); Sf = m * (vertical ? 0.13 : 0.1);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    construirMapa();
  }

  // El mapa: una rejilla hexagonal de motas (cada ~6 px) donde hay tierra, más los meridianos y paralelos cada 15° en
  // motas más finas. Hacia los bordes se deshace en motas sueltas (sin degradado). Se pinta una vez en su lienzo.
  function construirMapa() {
    const r = sembrado(1922), paso = Math.max(5.2, m / 78), R = Math.hypot(ancho, alto) * 0.5;
    const borde = (px, py) => { const d = Math.hypot(px - Hx, py - Hy) / R; return d < 0.6 ? 1 : sat(1 - (d - 0.6) / 0.4); };
    const tx = [], ty = [], tc = [], ta = [];
    for (let f = 0, py = paso * 0.5; py < alto + paso; f++, py += paso * 0.866) {
      const lat = desmerc((oy - py) / k); if (lat > 84 || lat < -84) continue;
      for (let px = (f % 2 ? paso : paso / 2); px < ancho + paso; px += paso) {
        const a = borde(px, py); if (a <= 0 || r() > a ** 0.6) continue;
        if (!esTierra((px - ox) / k, lat)) continue;
        tx.push(px + (r() - 0.5) * 0.6); ty.push(py + (r() - 0.5) * 0.6); const c = r(); tc.push(c < 0.5 ? 0 : c < 0.8 ? 1 : 2); ta.push((0.5 + 0.5 * r()) * (0.45 + 0.55 * a));
      }
    }
    const n = tx.length;
    tierra = { n, x: Float32Array.from(tx), y: Float32Array.from(ty), c: Uint8Array.from(tc), a: Float32Array.from(ta) };
    // Índices ordenados por distancia a cada orilla: el frente del mapa que se despliega se busca sin recorrerlo todo.
    const ordenar = (px, py) => { const d = new Float32Array(n); for (let i = 0; i < n; i++) d[i] = Math.hypot(tierra.x[i] - px, tierra.y[i] - py); const idx = Uint32Array.from({ length: n }, (_, i) => i).sort((a, b) => d[a] - d[b]); return { idx, d: Float32Array.from(idx, i => d[i]) }; };
    porC = ordenar(cx, cy); porX = ordenar(xx, xy);
    // Las motas que se alzan cuando el mapa se hace cielo (unas 700 al azar).
    const elegidas = []; for (let i = 0; i < n; i++) if (r() < 700 / Math.max(700, n)) elegidas.push(i);
    const na = elegidas.length;
    alzadas = { n: na, x: new Float32Array(na), y: new Float32Array(na), sube: new Float32Array(na), t0: new Float32Array(na), f: new Float32Array(na), a: new Float32Array(na) };
    elegidas.forEach((i, j) => { alzadas.x[j] = tierra.x[i]; alzadas.y[j] = tierra.y[i]; alzadas.sube[j] = 14 + r() * 50; alzadas.t0[j] = 20.2 + r() * 2.2; alzadas.f[j] = r() * TAU; alzadas.a[j] = 0.45 + r() * 0.5; });
    // Pintado del mapa en su lienzo.
    xm.setTransform(dpr, 0, 0, dpr, 0, 0); xm.clearRect(0, 0, ancho, alto);
    // Meridianos y paralelos cada 15° (el ecuador, un poco más claro).
    xm.fillStyle = 'rgb(185,165,255)';
    const gr = (px, py, a) => { if (px < 0 || px > ancho || py < 0 || py > alto) return; const b = borde(px, py) * a; if (b <= 0.01) return; xm.globalAlpha = b; xm.beginPath(); xm.arc(px, py, 0.7, 0, TAU); xm.fill(); };
    for (let lon = -180; lon <= 180; lon += 15) { const px = ox + lon * k; if (px < 0 || px > ancho) continue; for (let py = 3; py < alto; py += 7) if (!esTierra(lon, desmerc((oy - py) / k))) gr(px, py, 0.2); }
    for (let lat = -75; lat <= 75; lat += 15) { const py = oy - merc(lat) * k; if (py < 0 || py > alto) continue; for (let px = 3; px < ancho; px += 7) if (!esTierra((px - ox) / k, lat)) gr(px, py, lat === 0 ? 0.36 : 0.2); }
    const rMota = Math.max(1.1, paso * 0.19);
    const tonos = ['rgb(242,184,222)', 'rgb(214,186,255)', 'rgb(255,220,238)'];
    for (let i = 0; i < n; i++) { xm.globalAlpha = tierra.a[i]; xm.fillStyle = tonos[tierra.c[i]]; xm.beginPath(); xm.arc(tierra.x[i], tierra.y[i], rMota, 0, TAU); xm.fill(); }
    xm.globalAlpha = 1;
  }
  medir();
  let esperaMedir = 0;
  const alCambiar = () => { clearTimeout(esperaMedir); esperaMedir = setTimeout(medir, 120); };
  addEventListener('resize', alCambiar);

  // ── Piezas de dibujo ──
  // Motas en lote: un camino por color y nivel de brillo (miles de motas en pocas llamadas de relleno).
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
  // Onda de una llamada: un anillo de motas que se abre (línea discontinua de puntos redondos).
  function onda(px, py, edad, color, R = 46) {
    if (edad < 0 || edad > 1.15) return;
    const u = edad / 1.15;
    x.globalAlpha = (1 - u) * 0.9; x.strokeStyle = rgba(color, 1); x.lineWidth = 1.7; x.setLineDash([0, 5]); x.lineCap = 'round';
    x.beginPath(); x.arc(px, py, 5 + R * salida(u), 0, TAU); x.stroke();
    x.setLineDash([]); x.lineCap = 'butt'; x.globalAlpha = 1;
  }
  // Chispas de un golpe: trazos cortos que salen disparados y se apagan.
  function chispas(px, py, edad, color, R, dur = 0.9) {
    if (edad < 0 || edad > dur) return;
    const u = edad / dur, d1 = salida(u), d0 = salida(Math.max(0, u - 0.08));
    x.globalAlpha = (1 - u); x.strokeStyle = rgba(color, 1); x.lineWidth = 1.3; x.beginPath();
    for (let i = 0; i < CHISPAS; i++) { const c = Math.cos(qa[i]), s = Math.sin(qa[i]), r1 = R * qv[i] * d1, r0 = R * qv[i] * d0; x.moveTo(px + c * r0, py + s * r0); x.lineTo(px + c * r1, py + s * r1); }
    x.stroke(); x.globalAlpha = 1;
  }
  // Rótulo de una orilla: el nombre (Great Vibes) y el país (Quicksand espaciada), arriba o abajo de su luz.
  function rotulo(px, py, nombre, pais, arriba, alfa) {
    if (alfa <= 0.01) return;
    const tn = Math.round(Math.max(24, m * 0.072)), mitad = Math.max(54, tn * 1.9);
    const qx = Math.max(16 + mitad, Math.min(ancho - 16 - mitad, px));
    x.globalAlpha = alfa; x.textAlign = 'center';
    x.fillStyle = 'rgb(255,214,236)'; x.font = fuente(tn, 'v'); x.textBaseline = 'alphabetic';
    x.fillText(nombre, qx, arriba ? py - 30 : py + 22 + tn * 0.8);
    x.fillStyle = 'rgb(232,200,224)'; x.font = fuente(Math.round(Math.max(9, m * 0.022)), 'q');
    if ('letterSpacing' in x) x.letterSpacing = '4px';
    x.fillText(pais, qx + 2, arriba ? py - 16 : py + 30 + tn * 1.15);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    x.globalAlpha = 1;
  }

  // ── El cuadro ──
  function dibujar(t) {
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.clearRect(0, 0, ancho, alto);
    x.globalCompositeOperation = 'lighter';
    const tC = viajeCarlos(t, calma), tX = viajeXiomara(t, calma);
    // Salto final: de «salto» a 1,7 s después todo sale disparado desde el centro (el corazón nos lleva dentro). Antes,
    // en «Made…», todo se recoge un poco hacia él (coger aire).
    const uS = calma ? 0 : tramo(t, H.salto, H.salto + 1.7), recoge = calma ? 0 : 0.05 * suave(tramo(t, H.salto - 0.65, H.salto)) * (1 - uS);
    const escape = u => 1 - recoge + (Math.exp(3.4 * u * u) - 1) * 1.15;
    const g1 = escape(uS), g0 = escape(Math.max(0, uS - 0.035)), enSalto = uS > 0 && uS < 1;
    // Fundido de todo lo anterior al salto: en calma, un fundido sin más; si no, lo que queda cerca del centro.
    const vivo = calma ? 1 - tramo(t, H.salto, H.salto + 1.4) : 1 - tramo(uS, 0.75, 1);
    const antes = t < H.tarjeta;
    // Golpes de la letra: brillo de todo en el primer instante.
    const golpe = calma ? 0 : Math.max(0, 1 - (t - H.espera) / 0.5) * (t >= H.espera) + Math.max(0, 1 - (t - H.respuesta) / 0.5) * (t >= H.respuesta) + 0.8 * Math.max(0, 1 - (t - H.encuentro) / 0.6) * (t >= H.encuentro);
    const crece = tramo(t, 9.09, H.espera) * (t < H.espera + 0.4 ? 1 : 0);

    // 1. Estrellas de fondo: nacen en los tres primeros pulsos; titilan, y en cada pulso brilla una de cada ocho.
    if (antes && vivo > 0) {
      const ip = pulso(t), destello = ip >= 0 ? Math.exp(-(t - PULSOS[ip]) * 6) : 0;
      x.fillStyle = 'rgb(240,228,255)';
      for (let nivel = 0; nivel < 3; nivel++) {
        x.globalAlpha = (0.32 + nivel * 0.3) * vivo; x.beginPath();
        for (let i = 0; i < ESTRELLAS; i++) {
          if (t < en[i]) continue;
          let a = ea[i] * (0.65 + 0.35 * Math.sin(t * 1.6 + ef[i])) * Math.min(1, (t - en[i]) / 0.35) * (1 + crece * 0.6 + golpe * 0.8);
          if (calma === false && i % 8 === ip % 8) a += destello * 0.6;
          if (Math.min(2, (a * 3.2) | 0) !== nivel) continue;
          let px = ex[i] * ancho, py = ey[i] * alto, r = et[i];
          if (enSalto) { const qx = Hx + (px - Hx) * g1, qy = Hy + (py - Hy) * g1; px = qx; py = qy; r *= 1 + uS; }
          x.rect(px - r / 2, py - r / 2, r, r);
        }
        x.fill();
      }
      if (enSalto) {   // y su estela: trazos rectos hacia fuera
        x.strokeStyle = 'rgb(240,228,255)'; x.lineWidth = 1; x.globalAlpha = 0.55 * vivo; x.beginPath();
        for (let i = 0; i < ESTRELLAS; i++) { const dx = ex[i] * ancho - Hx, dy = ey[i] * alto - Hy; x.moveTo(Hx + dx * g0, Hy + dy * g0); x.lineTo(Hx + dx * g1, Hy + dy * g1); }
        x.stroke();
      }
    }

    // 2. El mapa: se despliega desde cada luz (un poco alrededor de cada una en su primer compás, y desde «mapa» a
    // golpes de pulso hasta cubrirlo todo); su frente son motas más claras. En el encuentro empieza a deshacerse en
    // cielo: se apaga y unas 700 motas se alzan y quedan como estrellas.
    const R0 = m * 0.17, Rtodo = Math.hypot(ancho, alto) * 1.02;
    const despliega = calma ? tramo(t, H.mapa, 8.01) : aPulsos(t, H.mapa, 8.01);
    const rC = R0 * salida(tramo(t, 1.97, 3.3)) + (Rtodo - R0) * despliega, rX = R0 * salida(tramo(t, 3.99, 5.3)) + (Rtodo - R0) * despliega;
    const mapaAlfa = 1 - suave(tramo(t, H.encuentro + 0.4, 23.6));
    if (mapaAlfa > 0 && (rC > 0 || rX > 0) && t < H.salto + 0.3) {
      x.globalAlpha = mapaAlfa;
      if (rC < Rtodo || rX < Rtodo) {
        x.save(); x.beginPath(); if (rC > 0) circulo(cx, cy, rC); if (rX > 0) circulo(xx, xy, rX); x.clip();
        x.drawImage(mapa, 0, 0, ancho, alto); x.restore();
        // Frente: las motas que el borde está cruzando, más claras y algo más grandes (tapan las que el recorte corta).
        x.fillStyle = 'rgb(255,232,246)'; x.globalAlpha = 0.95; x.beginPath();
        for (const [orden, r, ox2, oy2, otro, ro] of [[porC, rC, cx, cy, porX, rX], [porX, rX, xx, xy, porC, rC]]) {
          if (r <= 0 || r >= Rtodo) continue;
          let a = 0, b = orden.d.length; while (a < b) { const h = (a + b) >> 1; if (orden.d[h] < r - 3.5) a = h + 1; else b = h; }
          for (let j = a; j < orden.d.length && orden.d[j] <= r + 1.5; j++) {
            const i = orden.idx[j], px = tierra.x[i], py = tierra.y[i];
            if (ro > 0 && Math.hypot(px - (otro === porC ? cx : xx), py - (otro === porC ? cy : xy)) < ro - 3.5) continue;
            circulo(px, py, Math.max(1.35, m / 78 * 0.24));
          }
        }
        x.fill();
      } else x.drawImage(mapa, 0, 0, ancho, alto);
      // En cada golpe, el mapa entero se enciende un instante (se dibuja otra vez encima).
      if (golpe > 0.02 && t < H.encuentro + 1) { x.globalAlpha = Math.min(1, golpe) * 0.7 * mapaAlfa; x.drawImage(mapa, 0, 0, ancho, alto); }
      x.globalAlpha = 1;
    }
    // Las motas que se alzan: suben despacio, se vuelven blancas y titilan como estrellas (hasta el salto).
    if (t > 20.2 && antes && vivo > 0) {
      for (let nivel = 0; nivel < 2; nivel++) {
        x.fillStyle = nivel ? 'rgb(255,236,250)' : 'rgb(222,200,255)'; x.globalAlpha = (nivel ? 0.95 : 0.6) * vivo; x.beginPath();
        for (let j = 0; j < alzadas.n; j++) {
          const u = tramo(t, alzadas.t0[j], alzadas.t0[j] + 3.2); if (u <= 0) continue;
          const brillo = alzadas.a[j] * (0.7 + 0.3 * Math.sin(t * 2.1 + alzadas.f[j]));
          if ((brillo > 0.6) !== !!nivel) continue;
          let px = alzadas.x[j], py = alzadas.y[j] - alzadas.sube[j] * salida(u);
          const r = 1 + 0.5 * u;
          if (enSalto) { px = Hx + (px - Hx) * g1; py = Hy + (py - Hy) * g1; }
          x.rect(px - r / 2, py - r / 2, r, r);
        }
        x.fill();
      }
    }

    // 3. Las orillas: los nombres, la luz de cada uno (se enciende en su llamada) y sus ondas.
    const rot = vivo * (1 - tramo(t, H.salto - 0.65, H.salto)), nombresFuera = 1 - 0.85 * tramo(t, H.nombres - 0.6, H.nombres + 0.3);
    if (antes && rot > 0) {
      rotulo(cx, cy, 'Carlos', 'ESPAÑA', true, tramo(t, H.luzCarlos + 0.2, H.luzCarlos + 1) * (t > H.espera ? 0.7 : 1) * rot * nombresFuera);
      rotulo(xx, xy, 'Xiomara', 'ARGENTINA', false, tramo(t, H.luzXiomara + 0.2, H.luzXiomara + 1) * (t > H.respuesta ? 0.7 : 1) * rot * nombresFuera);
      // Lo que queda en casa cuando cada uno se va: una estrella fija con su anillo de motas.
      x.globalCompositeOperation = 'lighter';
      for (const [px, py, col, se] of [[cx, cy, VIOLETA, t > H.espera], [xx, xy, ROSA, t > H.respuesta]]) {
        if (!se) continue;
        x.globalAlpha = rot; x.fillStyle = rgba(col, 1); x.beginPath(); circulo(px, py, 2); x.fill();
        x.strokeStyle = rgba(col, 0.8); x.lineWidth = 1.2; x.setLineDash([0, 3.6]); x.lineCap = 'round'; x.beginPath(); x.arc(px, py, 6.5, 0, TAU); x.stroke(); x.setLineDash([]); x.lineCap = 'butt';
      }
      x.globalAlpha = 1;
      if (!calma) {
        situar(tC); for (const s of LLAMADAS.carlos) onda(PX, PY, t - s, VIOLETA, s > 9 ? 70 : 46);
        situar(tX); for (const s of LLAMADAS.xiomara) onda(PX, PY, t - s, ROSA, s > 9 ? 70 : 46);
      }
    }

    // 4. El camino: primero, posible (motas tenues que se trazan desde las dos orillas en «ruta»); después, las
    // estrellas que cada luz va dejando; tras el encuentro, una línea fina lo une todo (la constelación de los dos).
    if (antes && t > H.ruta && vivo > 0) {
      const traza = suave(tramo(t, H.ruta, 8.4)) * 0.5, apaga = 1 - tramo(t, H.encuentro, H.encuentro + 1);
      if (apaga > 0) {
        x.globalAlpha = 0.5 * apaga * vivo; x.strokeStyle = 'rgb(230,205,255)'; x.lineWidth = 1.3; x.setLineDash([0, 6]); x.lineCap = 'round';
        x.beginPath(); const a = Math.round(traza * RUTA_N); x.moveTo(rx[0], ry[0]); for (let j = 1; j <= a; j++) x.lineTo(rx[j], ry[j]);
        x.moveTo(rx[RUTA_N], ry[RUTA_N]); for (let j = RUTA_N - 1; j >= RUTA_N - a; j--) x.lineTo(rx[j], ry[j]);
        x.stroke(); x.setLineDash([]); x.lineCap = 'butt';
      }
      if (t > H.encuentro) {
        x.globalAlpha = 0.32 * tramo(t, H.encuentro + 0.3, H.encuentro + 1.6) * rot; x.strokeStyle = 'rgb(240,215,255)'; x.lineWidth = 0.8;
        // (se interrumpe dentro del corazón: lo atraviesa por detrás sin tachar su forma)
        x.beginPath(); let dentro = true;
        for (let j = 0; j <= RUTA_N; j++) { const fuera = Math.hypot(rx[j] - Hx, (ry[j] - Hy) * 1.1) > S * 1.02; if (fuera) { if (dentro) x.moveTo(rx[j], ry[j]); else x.lineTo(rx[j], ry[j]); } dentro = !fuera; }
        x.stroke();
      }
      // Estrellas del camino.
      for (const [col, lado] of [[VIOLETA, 0], [ROSA, 1]]) {
        x.fillStyle = rgba(col, 1); x.globalAlpha = vivo; x.beginPath();
        for (let i = 0; i < CAMINO; i++) {
          const s = cs[i], d = lado ? s - tX : tC - s;
          if ((lado ? s < 0.5 : s >= 0.5) || d < 0) continue;
          situar(s); let px = PX + nx * cj[i], py = PY + ny * cj[i];
          if (enSalto) { px = Hx + (px - Hx) * g1; py = Hy + (py - Hy) * g1; }
          circulo(px, py, ct[i] * (1 + 1.6 * Math.max(0, 1 - d / 0.025)) * (0.85 + 0.15 * Math.sin(t * 3 + i)));
        }
        x.fill();
      }
      x.globalAlpha = 1;
    }

    // 5. Las dos luces: en casa hasta su golpe, luego viajan por el camino con una estela de motas; los golpes las
    // hacen estallar en chispas; al encontrarse se funden en el corazón.
    if (t < H.encuentro + 0.05) {
      for (const [col, enc, sale, f] of [[VIOLETA, H.luzCarlos, H.espera, viajeCarlos], [ROSA, H.luzXiomara, H.respuesta, viajeXiomara]]) {
        if (t < enc) continue;
        situar(f(t, calma)); const px = PX, py = PY;
        if (t > sale) {   // estela: dónde estaba hace unos instantes (sin memoria: se recalcula con el reloj)
          x.fillStyle = rgba(col, 1); x.beginPath();
          for (let j = 1; j <= 16; j++) { situar(f(t - j * 0.035, calma)); circulo(PX, PY, 1.7 * (1 - j / 18)); }
          x.globalAlpha = 0.75; x.fill(); x.globalAlpha = 1;
        }
        const nace = calma ? tramo(t, enc, enc + 0.6) : rebote(tramo(t, enc, enc + 0.45));
        luz(px, py, col, nace * (1 + 0.35 * Math.max(0, 1 - (t - sale) / 0.5) * (t >= sale) + crece * 0.25), t);
        if (!calma) chispas(px, py, t - sale, col, m * 0.16);
      }
    }

    // 6. La distancia: 10.000 km que bajan mientras las dos luces se acercan; 0 km al encontrarse.
    if (t > 8.01 && t < H.encuentro + 0.3) {
      const a = tramo(t, 8.01, 8.8) * (1 - tramo(t, H.encuentro, H.encuentro + 0.3)), km = t < H.espera ? KM : KM * (tX - tC) / 1;
      const tam = Math.round(Math.max(11, m * 0.03));
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = a; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgb(246,214,232)'; x.font = fuente(tam, 'q'); if ('letterSpacing' in x) x.letterSpacing = '3px';
      const d = m * 0.085; x.fillText(`${miles(km)} km`, Hx + nx * d, Hy + ny * d);
      if ('letterSpacing' in x) x.letterSpacing = '0px';
      x.globalAlpha = 1; x.globalCompositeOperation = 'lighter';
    }

    // 7. El corazón: nace del encuentro (las motas salen de donde se tocaron), late con la música, recibe los nombres;
    // en el salto se vuelve estela y al otro lado vuelve, pequeño, arriba, sobre el cielo del universo.
    if (t > H.encuentro) {
      // Destello del encuentro: dos anillos de motas (rosa y violeta) y chispas blancas.
      if (!calma) { onda(Hx, Hy, t - H.encuentro, ROSA, m * 0.42); onda(Hx, Hy, t - H.encuentro - 0.12, VIOLETA, m * 0.36); chispas(Hx, Hy, t - H.encuentro, BLANCO, m * 0.32, 1.1); }
      const final = t >= H.tarjeta;
      const lat = calma ? 0 : latido(t, H.encuentro + 0.4) * (final ? 0.05 : 0.08);
      const kN = calma ? suave(tramo(t, H.encuentro, H.encuentro + 0.9)) : rebote(tramo(t, H.encuentro, H.encuentro + 0.75));
      const llega = final ? (calma ? 1 : salida(tramo(t, H.tarjeta, H.tarjeta + 1.3))) : 1, llega0 = final && !calma ? salida(tramo(t - 0.045, H.tarjeta, H.tarjeta + 1.3)) : llega;
      const ccx = final ? Fx : Hx, ccy = final ? Fy : Hy, tam = (final ? Sf : S * kN) * (1 + lat), lejos = Math.hypot(ancho, alto) * 0.75;
      const alfa = final ? (calma ? tramo(t, H.tarjeta, H.tarjeta + 1.2) : Math.min(1, llega * 2)) : vivo * Math.min(1, (t - H.encuentro) / 0.25);
      if (alfa > 0.01) {
        for (let c = 0; c < 3; c++) {
          for (let nivel = 0; nivel < 2; nivel++) {
            x.fillStyle = COL[c]; x.globalAlpha = alfa * (nivel ? 1 : 0.6); x.beginPath();
            for (let i = 0; i < CORAZON; i++) {
              if (hc[i] !== c || (ha[i] > 0.8) !== !!nivel) continue;
              const tiembla = Math.sin(t * 1.3 + hf[i]) * 0.012;
              let px = ccx + (hx[i] + tiembla) * tam, py = ccy + (hy[i] + tiembla) * tam, r = ht[i] * (final ? 0.85 : 1);
              if (final && llega < 1) { const d = (1 - llega) * lejos * hv[i]; px += Math.cos(hd[i]) * d; py += Math.sin(hd[i]) * d; }
              else if (enSalto) { px = Hx + (px - Hx) * g1 * (1 + uS * 2); py = Hy + (py - Hy) * g1 * (1 + uS * 2); r *= 1 + uS * 1.5; }
              circulo(px, py, r);
            }
            x.fill();
          }
          // Estelas: en el salto hacia fuera; al llegar arriba, desde fuera hasta su sitio.
          if ((enSalto || (final && llega < 0.995)) && !calma) {
            x.strokeStyle = COL[c]; x.lineWidth = 1; x.globalAlpha = alfa * 0.5; x.beginPath();
            for (let i = c; i < CORAZON; i += 3) {
              if (hc[i] !== c) continue;
              if (enSalto) { const px = Hx + hx[i] * tam, py = Hy + hy[i] * tam, ga = g0 * (1 + Math.max(0, uS - 0.035) * 2), gb = g1 * (1 + uS * 2); x.moveTo(Hx + (px - Hx) * ga, Hy + (py - Hy) * ga); x.lineTo(Hx + (px - Hx) * gb, Hy + (py - Hy) * gb); }
              else { const bx = Fx + hx[i] * tam, by = Fy + hy[i] * tam, d1 = (1 - llega) * lejos * hv[i], d0 = (1 - llega0) * lejos * hv[i]; x.moveTo(bx + Math.cos(hd[i]) * d0, by + Math.sin(hd[i]) * d0); x.lineTo(bx + Math.cos(hd[i]) * d1, by + Math.sin(hd[i]) * d1); }
            }
            x.stroke();
          }
        }
        x.globalAlpha = 1;
      }
      // Los nombres, bajo el corazón.
      const an = tramo(t, H.nombres, H.nombres + 1) * (1 - tramo(t, H.salto - 0.5, H.salto));
      if (an > 0) {
        const tn = Math.round(Math.max(30, m * (vertical ? 0.1 : 0.075)));
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = an; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
        x.fillStyle = 'rgb(255,209,230)'; x.font = fuente(tn, 'v');
        x.fillText('Carlos & Xiomara', Hx, Hy + S * 0.98 + tn * 0.9 + (1 - an) * 8);
        x.globalAlpha = 1;
      }
    }

    // El texto de la historia y el final (tarjeta y cielo).
    let indice = -1; for (let i = 0; i < FRASES.length; i++) if (t >= FRASES[i].desde) indice = i;
    if (indice !== frase) { frase = indice; alFrase(FRASES[indice]?.texto ?? ''); }
    if (!finalDado && t >= H.tarjeta) { finalDado = true; alFinal(); }
  }

  function cuadro() {
    if (!activo) return;
    id = requestAnimationFrame(cuadro);
    // Ya en la tarjeta (el corazón quieto arriba), en el móvil basta con 30 FPS: menos calor mientras se lee.
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
    get finalDado() { return finalDado; }
  };
}
