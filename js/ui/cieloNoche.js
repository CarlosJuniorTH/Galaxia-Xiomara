// «El cielo de aquella noche»: el cielo real del 15 de diciembre de 2025 sobre Barcelona (Cas)
// y Buenos Aires (Xio) en el mismo instante (4 horas de diferencia en diciembre), como una foto
// de todo el cielo: miles de estrellas con su color, la Vía Láctea con su polvo, el color del
// cielo según el Sol (día, crepúsculo, noche), Júpiter, Saturno, la Luna con su fase y la
// silueta del horizonte. Las constelaciones y los nombres se pueden ocultar.
const RAD = Math.PI / 180;

// [nombre, AR (horas), Dec (grados), magnitud]
const ESTRELLAS = [
  ['Sirio', 6.752, -16.716, -1.46], ['Canopus', 6.399, -52.696, -0.74], ['Arturo', 14.261, 19.182, -0.05], ['Rigil Kentaurus', 14.66, -60.834, -0.27],
  ['Vega', 18.616, 38.784, 0.03], ['Capella', 5.278, 45.998, 0.08], ['Rigel', 5.242, -8.202, 0.13], ['Proción', 7.655, 5.225, 0.34],
  ['Achernar', 1.629, -57.237, 0.46], ['Betelgeuse', 5.919, 7.407, 0.5], ['Hadar', 14.064, -60.373, 0.61], ['Altair', 19.846, 8.868, 0.76],
  ['Acrux', 12.443, -63.099, 0.77], ['Aldebarán', 4.599, 16.509, 0.85], ['Antares', 16.49, -26.432, 0.96], ['Espiga', 13.42, -11.161, 0.97],
  ['Pólux', 7.755, 28.026, 1.14], ['Fomalhaut', 22.961, -29.622, 1.16], ['Deneb', 20.69, 45.28, 1.25], ['Mimosa', 12.795, -59.689, 1.25],
  ['Régulo', 10.14, 11.967, 1.35], ['Adhara', 6.977, -28.972, 1.5], ['Cástor', 7.577, 31.888, 1.58], ['Gacrux', 12.519, -57.113, 1.63],
  ['Bellatrix', 5.419, 6.35, 1.64], ['Elnath', 5.438, 28.608, 1.65], ['Miaplacidus', 9.22, -69.717, 1.68], ['Alnilam', 5.604, -1.202, 1.69],
  ['Alnair', 22.137, -46.961, 1.74], ['Alnitak', 5.679, -1.943, 1.77], ['Alioth', 12.9, 55.96, 1.77], ['Dubhe', 11.062, 61.751, 1.79],
  ['Mirfak', 3.405, 49.861, 1.79], ['Wezen', 7.14, -26.393, 1.83], ['Avior', 8.375, -59.51, 1.86], ['Alkaid', 13.792, 49.313, 1.86],
  ['Menkalinan', 5.992, 44.948, 1.9], ['Alhena', 6.628, 16.399, 1.93], ['Peacock', 20.427, -56.735, 1.94], ['Polaris', 2.53, 89.264, 1.98],
  ['Mirzam', 6.378, -17.956, 1.98], ['Alphard', 9.46, -8.659, 1.98], ['Hamal', 2.12, 23.462, 2.0], ['Diphda', 0.727, -17.987, 2.02],
  ['Mizar', 13.399, 54.925, 2.04], ['Saiph', 5.796, -9.67, 2.06], ['Alpheratz', 0.14, 29.091, 2.06], ['Mirach', 1.162, 35.621, 2.05],
  ['Almach', 2.065, 42.33, 2.1], ['Denébola', 11.818, 14.572, 2.1], ['Algieba', 10.333, 19.842, 2.0], ['Algol', 3.136, 40.956, 2.12],
  ['Mintaka', 5.533, -0.299, 2.23], ['Sadr', 20.37, 40.257, 2.23], ['Schedar', 0.675, 56.537, 2.24], ['Caph', 0.153, 59.15, 2.28],
  ['Merak', 11.031, 56.382, 2.37], ['Scheat', 23.063, 28.083, 2.42], ['Phecda', 11.897, 53.695, 2.44], ['Aludra', 7.402, -29.303, 2.45],
  ['Navi', 0.945, 60.717, 2.47], ['Markab', 23.079, 15.205, 2.49], ['Gienah', 20.77, 33.97, 2.48], ['Menkar', 3.038, 4.09, 2.54],
  ['Theta Aurigae', 5.995, 37.213, 2.6], ['Ruchbah', 1.43, 60.235, 2.68], ['Hassaleh', 4.95, 33.166, 2.69], ['Algenib', 0.22, 15.184, 2.83],
  ['Delta Crucis', 12.252, -58.749, 2.8], ['Alcíone', 3.791, 24.105, 2.87], ['Delta Cygni', 19.75, 45.131, 2.87], ['Tejat', 6.383, 22.514, 2.88],
  ['Gomeisa', 7.453, 8.289, 2.89], ['Epsilon Persei', 3.964, 40.01, 2.89], ['Gamma Persei', 3.08, 53.506, 2.93], ['Mebsuta', 6.732, 25.131, 3.0],
  ['Delta Persei', 3.715, 47.788, 3.01], ['Furud', 6.338, -30.064, 3.02], ['Zeta Tauri', 5.627, 21.143, 3.0], ['Albireo', 19.512, 27.96, 3.05],
  ['Megrez', 12.257, 57.033, 3.31], ['Segin', 1.907, 63.67, 3.37], ['Meissa', 5.585, 9.934, 3.39], ['Ain', 4.477, 19.18, 3.53], ['Gamma Tauri', 4.33, 15.628, 3.65],
  ['Merope', 3.772, 23.948, 4.18], ['Maia', 3.763, 24.368, 3.87], ['Electra', 3.748, 24.113, 3.7], ['Atlas', 3.819, 24.053, 3.62], ['Taygeta', 3.754, 24.467, 4.3]
];
const CONSTELACIONES = [
  ['Orión', [['Betelgeuse', 'Bellatrix'], ['Bellatrix', 'Mintaka'], ['Mintaka', 'Alnilam'], ['Alnilam', 'Alnitak'], ['Alnitak', 'Saiph'], ['Saiph', 'Rigel'], ['Rigel', 'Mintaka'], ['Betelgeuse', 'Alnitak'], ['Betelgeuse', 'Meissa'], ['Meissa', 'Bellatrix']]],
  ['Tauro', [['Aldebarán', 'Ain'], ['Aldebarán', 'Gamma Tauri'], ['Ain', 'Elnath'], ['Aldebarán', 'Zeta Tauri']]],
  ['Géminis', [['Cástor', 'Pólux'], ['Cástor', 'Mebsuta'], ['Mebsuta', 'Tejat'], ['Pólux', 'Alhena']]],
  ['Can Mayor', [['Sirio', 'Mirzam'], ['Sirio', 'Wezen'], ['Wezen', 'Adhara'], ['Wezen', 'Aludra'], ['Adhara', 'Furud']]],
  ['Can Menor', [['Proción', 'Gomeisa']]],
  ['Auriga', [['Capella', 'Menkalinan'], ['Menkalinan', 'Theta Aurigae'], ['Theta Aurigae', 'Elnath'], ['Elnath', 'Hassaleh'], ['Hassaleh', 'Capella']]],
  ['Perseo', [['Mirfak', 'Gamma Persei'], ['Mirfak', 'Delta Persei'], ['Delta Persei', 'Epsilon Persei'], ['Mirfak', 'Algol']]],
  ['Casiopea', [['Caph', 'Schedar'], ['Schedar', 'Navi'], ['Navi', 'Ruchbah'], ['Ruchbah', 'Segin']]],
  ['Osa Mayor', [['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Dubhe'], ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid']]],
  ['Pegaso', [['Markab', 'Scheat'], ['Scheat', 'Alpheratz'], ['Alpheratz', 'Algenib'], ['Algenib', 'Markab']]],
  ['Andrómeda', [['Alpheratz', 'Mirach'], ['Mirach', 'Almach']]],
  ['Cisne', [['Deneb', 'Sadr'], ['Sadr', 'Albireo'], ['Gienah', 'Sadr'], ['Sadr', 'Delta Cygni']]],
  ['Leo', [['Régulo', 'Algieba'], ['Algieba', 'Denébola'], ['Denébola', 'Régulo']]],
  ['Cruz del Sur', [['Acrux', 'Gacrux'], ['Mimosa', 'Delta Crucis']]],
  ['Centauro', [['Rigil Kentaurus', 'Hadar']]]
];
const ETIQUETAS = new Set(['Sirio', 'Canopus', 'Rigel', 'Betelgeuse', 'Aldebarán', 'Capella', 'Proción', 'Pólux', 'Cástor', 'Achernar', 'Polaris', 'Vega', 'Deneb', 'Acrux', 'Régulo', 'Fomalhaut']);
// Planetas visibles aquella noche (posición del 15/12/2025): Júpiter en Géminis, Saturno en Piscis.
const PLANETAS = [['Júpiter', 7.82, 21.6, -2.6, '#ffe2a8'], ['Saturno', 23.8, -3.9, 1.0, '#f3d59a']];
const LUGARES = [
  { nombre: 'Barcelona', quien: 'Cas', lat: 41.39, lon: 2.17, utc: 1 },        // hora de invierno (UTC+1)
  { nombre: 'Buenos Aires', quien: 'Xio', lat: -34.6, lon: -58.38, utc: -3 }   // UTC−3 todo el año
];
// Color real de las estrellas conocidas (por su temperatura); las demás, blanco cálido.
const COLORES = { 'Betelgeuse': '#ffb27a', 'Antares': '#ff9d6e', 'Aldebarán': '#ffc08a', 'Arturo': '#ffcf98', 'Pólux': '#ffd9a8', 'Mirach': '#ffc999', 'Hamal': '#ffd6a6',
  'Dubhe': '#ffdcae', 'Capella': '#fff1d0', 'Rigel': '#c6d8ff', 'Espiga': '#bcd0ff', 'Achernar': '#c4d6ff', 'Bellatrix': '#c8d8ff', 'Regulo': '#d4e0ff', 'Régulo': '#d4e0ff',
  'Alnilam': '#c2d4ff', 'Alnitak': '#c4d6ff', 'Mintaka': '#c8d8ff', 'Saiph': '#c8d8ff', 'Acrux': '#c0d2ff', 'Mimosa': '#c4d6ff', 'Hadar': '#c4d6ff', 'Sirio': '#e4ecff', 'Vega': '#dfe8ff',
  'Deneb': '#eef2ff', 'Canopus': '#fff8ec', 'Proción': '#fff6e6', 'Gacrux': '#ffb98a', 'Mirfak': '#fff4dc', 'Alcíone': '#d0dcff' };

// Catálogo de estrellas débiles: real en lo estadístico (más densas en la Vía Láctea, muchas
// más débiles que brillantes, colores por temperatura). Fijo para que el cielo no cambie.
const DEBILES = (() => {
  let s = 20251215; const azar = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const polo = ecuatorial(192.859 / 15, 27.128), lista = [];
  while (lista.length < 2600) {
    const z = azar() * 2 - 1, a = azar() * Math.PI * 2, v = [Math.sqrt(1 - z * z) * Math.cos(a), Math.sqrt(1 - z * z) * Math.sin(a), z];
    const b = Math.asin(v[0] * polo[0] + v[1] * polo[1] + v[2] * polo[2]) / RAD;
    if (azar() > 0.35 + 0.65 * Math.exp(-Math.pow(b / 14, 2))) continue;
    const mag = 6.6 - Math.pow(azar(), 0.55) * 3.3, t = azar();
    lista.push([((Math.atan2(v[1], v[0]) / RAD + 360) % 360) / 15, Math.asin(v[2]) / RAD, mag, t < 0.12 ? '#ffc9a0' : t < 0.3 ? '#fff0dc' : t < 0.82 ? '#fffaf4' : '#d6e2ff']);
  }
  return lista;
})();
function ecuatorial(ar, dec) { const a = ar * 15 * RAD, d = dec * RAD; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; }
const NGP = ecuatorial(192.859 / 15, 27.128), GC = ecuatorial(266.405 / 15, -28.936);
const GY = [NGP[1] * GC[2] - NGP[2] * GC[1], NGP[2] * GC[0] - NGP[0] * GC[2], NGP[0] * GC[1] - NGP[1] * GC[0]];

const dia = jd => jd - 2451545.0;
const juliano = fechaUTC => fechaUTC / 864e5 + 2440587.5;
function tsl(jd, lon) { return ((18.697374558 + 24.06570982441908 * dia(jd) + lon / 15) % 24 + 24) % 24; }
function horizontales(ar, dec, lat, sideral) {
  const h = (sideral - ar) * 15 * RAD, d = dec * RAD, f = lat * RAD;
  const alt = Math.asin(Math.sin(d) * Math.sin(f) + Math.cos(d) * Math.cos(f) * Math.cos(h));
  const az = Math.atan2(-Math.sin(h) * Math.cos(d), Math.cos(f) * Math.sin(d) - Math.sin(f) * Math.cos(d) * Math.cos(h));
  return [alt / RAD, (az / RAD + 360) % 360];
}
function solar(jd) {
  const d = dia(jd), g = (357.529 + 0.98560028 * d) * RAD, q = 280.459 + 0.98564736 * d, L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD, e = 23.439 * RAD;
  return { ar: ((Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / RAD + 360) % 360) / 15, dec: Math.asin(Math.sin(e) * Math.sin(L)) / RAD };
}
// Luna (precisión de ~1°, suficiente para el dibujo) y su fase.
function luna(jd) {
  const d = dia(jd), L = 218.316 + 13.176396 * d, M = (134.963 + 13.064993 * d) * RAD, F = (93.272 + 13.22935 * d) * RAD;
  const lam = (L + 6.289 * Math.sin(M)) * RAD, bet = 5.128 * Math.sin(F) * RAD, e = 23.44 * RAD;
  const ar = Math.atan2(Math.sin(lam) * Math.cos(e) - Math.tan(bet) * Math.sin(e), Math.cos(lam));
  const dec = Math.asin(Math.sin(bet) * Math.cos(e) + Math.cos(bet) * Math.sin(e) * Math.sin(lam));
  const g = (357.528 + 0.9856003 * d) * RAD, lamSol = 280.46 + 0.9856474 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g);
  const elong = ((lam / RAD - lamSol) % 360 + 360) % 360;
  return { ar: ((ar / RAD / 15) + 24) % 24, dec: dec / RAD, iluminada: (1 - Math.cos(elong * RAD)) / 2, creciente: elong < 180 };
}
// Ruido de valor 2D-3D pequeño para la textura de la Vía Láctea.
const PERM = (() => { const p = Array.from({ length: 256 }, (_, i) => i); let s = 7; for (let i = 255; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } return p.concat(p); })();
const VAL = Float32Array.from({ length: 256 }, (_, i) => ((PERM[i] * 7919) % 256) / 255);
function ruido(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const v = (a, b, c) => VAL[PERM[PERM[PERM[(xi + a) & 255] + ((yi + b) & 255)] + ((zi + c) & 255)]];
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(v(0, 0, 0), v(1, 0, 0), sx), l(v(0, 1, 0), v(1, 1, 0), sx), sy), l(l(v(0, 0, 1), v(1, 0, 1), sx), l(v(0, 1, 1), v(1, 1, 1), sx), sy), sz);
}
const fbm = (x, y, z) => ruido(x, y, z) * 0.5 + ruido(x * 2.1, y * 2.1, z * 2.1) * 0.27 + ruido(x * 4.3, y * 4.3, z * 4.3) * 0.15 + ruido(x * 8.7, y * 8.7, z * 8.7) * 0.08;

// Imágenes de estrella (halo suave) por color, para dibujar miles sin coste.
const SPRITES = new Map();
function sprite(color) {
  if (SPRITES.has(color)) return SPRITES.get(color);
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, '#ffffff'); r.addColorStop(0.12, color); r.addColorStop(0.35, color + '55'); r.addColorStop(1, color + '00');
  g.fillStyle = r; g.fillRect(0, 0, 32, 32); SPRITES.set(color, c); return c;
}

function dibujar(lienzo, lugar, utc, { lineas, nombres }) {
  const dpr = Math.min(devicePixelRatio || 1, 2), lado = lienzo.clientWidth || 300;
  if (lienzo.width !== Math.round(lado * dpr)) { lienzo.width = Math.round(lado * dpr); lienzo.height = Math.round(lado * dpr); }
  const g = lienzo.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = lado / 2 - 18, cx = lado / 2, cy = lado / 2;
  const jd = juliano(utc), sideral = tsl(jd, lugar.lon), f = lugar.lat * RAD;
  const proyectar = (alt, az) => { const r = (90 - alt) / 90 * R; return [cx - r * Math.sin(az * RAD), cy - r * Math.cos(az * RAD)]; };
  const sol = solar(jd), [altSol, azSol] = horizontales(sol.ar, sol.dec, lugar.lat, sideral);
  // Cuánto deja ver el cielo según dónde esté el Sol: día, crepúsculos y noche cerrada.
  const oscuridad = Math.min(1, Math.max(0, (-altSol - 2) / 16)), limite = altSol > -1 ? -1.6 : altSol > -6 ? 1 : altSol > -12 ? 3.2 : altSol > -18 ? 5.2 : 6.6;
  // Fondo: color del cielo, Vía Láctea con textura, resplandor del horizonte. Píxel a píxel a
  // media resolución y escalado (suave y rápido).
  const N = Math.round(Math.min(260, lado * 0.75)), img = new ImageData(N, N), k = (2 * R) / N;
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const dx = (px + 0.5) * k - R, dy = (py + 0.5) * k - R, rr = Math.hypot(dx, dy) / R; if (rr > 1) continue;
    const alt = 90 * (1 - rr) * RAD, az = Math.atan2(-dx, -dy);
    const sd = Math.sin(f) * Math.sin(alt) + Math.cos(f) * Math.cos(alt) * Math.cos(az), dec = Math.asin(sd);
    const H = Math.atan2(-Math.sin(az) * Math.cos(alt), Math.cos(f) * Math.sin(alt) - Math.sin(f) * Math.cos(alt) * Math.cos(az));
    const ar = sideral * 15 * RAD - H, e = [Math.cos(dec) * Math.cos(ar), Math.cos(dec) * Math.sin(ar), Math.sin(dec)];
    const b = Math.asin(e[0] * NGP[0] + e[1] * NGP[1] + e[2] * NGP[2]) / RAD, l = Math.atan2(e[0] * GY[0] + e[1] * GY[1] + e[2] * GY[2], e[0] * GC[0] + e[1] * GC[1] + e[2] * GC[2]) / RAD;
    const bulbo = Math.exp(-Math.pow(l / 38, 2)), ancho = 7 + 7 * bulbo, n = fbm(e[0] * 9 + 3, e[1] * 9, e[2] * 9), n2 = fbm(e[0] * 22, e[1] * 22 + 5, e[2] * 22);
    let via = Math.exp(-Math.pow((b + (n - 0.5) * 4) / ancho, 2)) * (0.35 + 0.65 * n) * (0.45 + bulbo * 1.3) * (0.7 + 0.5 * n2);
    const grieta = Math.exp(-Math.pow((b - 1.5 + (n2 - 0.5) * 3) / 2.6, 2)) * (l > -40 && l < 70 ? 1 : 0.25) * (0.5 + n);
    via *= 1 - Math.min(0.85, grieta * 0.75);
    const altG = 90 * (1 - rr);
    // Cielo: azul de día, crepúsculo anaranjado hacia el Sol, negro azulado de noche.
    const haciaSol = Math.max(0, Math.cos(az - azSol * RAD)), horizonte = Math.exp(-altG / 14);
    const dia = Math.min(1, Math.max(0, (altSol + 6) / 10)), crep = Math.exp(-Math.pow((altSol + 5) / 6, 2));
    let r = 6 + 4 * horizonte, gg = 7 + 5 * horizonte, bb = 18 + 10 * horizonte;
    r += dia * (60 + 70 * horizonte) + crep * horizonte * (150 * haciaSol + 30); gg += dia * (105 + 60 * horizonte) + crep * horizonte * (70 * haciaSol + 20); bb += dia * (185 + 30 * horizonte) + crep * horizonte * (40 + 30 * (1 - haciaSol));
    r += horizonte * 22 * oscuridad; gg += horizonte * 15 * oscuridad; bb += horizonte * 8 * oscuridad;   // resplandor de la ciudad
    const vv = via * 150 * oscuridad * oscuridad;
    r += vv * (0.95 + bulbo * 0.1); gg += vv * (0.9 - bulbo * 0.04); bb += vv * (0.95 - bulbo * 0.25);
    const j = (py * N + px) * 4; img.data[j] = Math.min(255, r); img.data[j + 1] = Math.min(255, gg); img.data[j + 2] = Math.min(255, bb); img.data[j + 3] = 255;
  }
  const fondo = document.createElement('canvas'); fondo.width = fondo.height = N; fondo.getContext('2d').putImageData(img, 0, 0);
  g.clearRect(0, 0, lado, lado);
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
  g.imageSmoothingEnabled = true; g.drawImage(fondo, cx - R, cy - R, 2 * R, 2 * R);
  // Estrellas: las débiles del catálogo y las brillantes reales, con su color; la atmósfera
  // las apaga cerca del horizonte.
  g.globalCompositeOperation = 'lighter';
  const pintar = (ar, dec, mag, color, escala = 1) => {
    const [alt, az] = horizontales(ar, dec, lugar.lat, sideral); if (alt < 0) return null;
    const m = mag + 0.25 / Math.max(0.12, Math.sin(Math.max(1, alt) * RAD)) - 0.25;     // extinción
    if (m > limite) return null;
    const [x, y] = proyectar(alt, az), brillo = Math.min(1, Math.pow(2.512, (limite - m) * 0.85) * 0.09), t = Math.max(1.2, (6.8 - m) * 1.05) * (R / 160) * escala;
    g.globalAlpha = brillo; g.drawImage(sprite(color), x - t, y - t, t * 2, t * 2); return [x, y, m, alt];
  };
  for (const [ar, dec, mag, color] of DEBILES) pintar(ar, dec, mag, color);
  const posicion = new Map();
  for (const [nombre, ar, dec, mag] of ESTRELLAS) { const p = pintar(ar, dec, mag, COLORES[nombre] || '#fff6ec', mag < 1.5 ? 1.25 : 1); if (p) posicion.set(nombre, p); }
  g.globalAlpha = 1;
  for (const [nombre, ar, dec, mag, color] of PLANETAS) {
    const [alt, az] = horizontales(ar, dec, lugar.lat, sideral); if (alt < 0 || mag > limite + 1) continue;
    const [x, y] = proyectar(alt, az), t = (4.2 - mag) * 1.25 * (R / 160);
    g.drawImage(sprite(color), x - t * 1.6, y - t * 1.6, t * 3.2, t * 3.2);
    if (nombres) { g.globalCompositeOperation = 'source-over'; g.fillStyle = color; g.font = `600 ${Math.max(9, R * 0.05)}px 'Quicksand', sans-serif`; g.textAlign = 'left'; g.fillText(nombre, x + t + 3, y + t + 8); g.globalCompositeOperation = 'lighter'; }
  }
  // La Luna con su fase y su halo, y el Sol si está sobre el horizonte.
  const l = luna(jd), [altL, azL] = horizontales(l.ar, l.dec, lugar.lat, sideral);
  g.globalCompositeOperation = 'source-over';
  if (altL > -0.5) {
    const [x, y] = proyectar(altL, azL), r = R * 0.04;
    const halo = g.createRadialGradient(x, y, r, x, y, r * 6); halo.addColorStop(0, 'rgba(240,235,220,0.25)'); halo.addColorStop(1, 'rgba(240,235,220,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(30,28,40,0.85)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    const kf = l.iluminada * 2 - 1, s = l.creciente ? 1 : -1, viaDerecha = (kf < 0 && s > 0) || (kf >= 0 && s < 0);
    g.fillStyle = '#f2ead8'; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, Math.PI / 2, s < 0); g.ellipse(x, y, Math.abs(kf) * r, r, 0, Math.PI / 2, -Math.PI / 2, viaDerecha); g.fill();
    if (nombres) { g.fillStyle = 'rgba(244,236,220,0.85)'; g.font = `${Math.max(9, R * 0.05)}px 'Quicksand', sans-serif`; g.textAlign = 'left'; g.fillText('Luna', x + r + 4, y + 3); }
  }
  if (altSol > -0.5) {
    const [x, y] = proyectar(Math.max(0, altSol), azSol), r = R * 0.05, sg = g.createRadialGradient(x, y, 0, x, y, r * 7);
    sg.addColorStop(0, 'rgba(255,250,235,1)'); sg.addColorStop(0.15, 'rgba(255,235,190,0.8)'); sg.addColorStop(1, 'rgba(255,220,160,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(x, y, r * 7, 0, Math.PI * 2); g.fill();
  }
  // Constelaciones (opcionales): líneas finas y su nombre.
  if (lineas) {
    g.lineWidth = 0.8; g.strokeStyle = `rgba(255,190,220,${0.18 + 0.12 * oscuridad})`; g.fillStyle = 'rgba(255,205,228,0.5)';
    g.font = `italic ${Math.max(10, R * 0.055)}px 'Cormorant Garamond', serif`; g.textAlign = 'center';
    for (const [nombre, tramos] of CONSTELACIONES) {
      const puntos = [];
      for (const [a, b] of tramos) { const pa = posicion.get(a), pb = posicion.get(b); if (!pa || !pb) continue; g.beginPath(); g.moveTo(pa[0], pa[1]); g.lineTo(pb[0], pb[1]); g.stroke(); puntos.push(pa, pb); }
      if (nombres && puntos.length >= 2) { const x = puntos.reduce((s, p) => s + p[0], 0) / puntos.length, y = puntos.reduce((s, p) => s + p[1], 0) / puntos.length; g.fillText(nombre, x, y + R * 0.11); }
    }
  }
  if (nombres) {
    g.fillStyle = 'rgba(240,228,246,0.78)'; g.font = `${Math.max(9, R * 0.048)}px 'Quicksand', sans-serif`; g.textAlign = 'left';
    for (const [nombre, [x, y]] of posicion) if (ETIQUETAS.has(nombre)) g.fillText(nombre, x + 5, y - 4);
  }
  // Silueta del horizonte (colinas y árboles) y el borde del cielo.
  g.fillStyle = '#05040a'; g.beginPath();
  for (let i = 0; i <= 360; i += 2) {
    const a = i * RAD, h = 1.2 + 2.6 * Math.max(0, ruido(i * 0.06, lugar.lat, 1) - 0.25) + (ruido(i * 0.5, lugar.lon, 2) > 0.8 ? 1.5 : 0);
    const [x, y] = proyectar(h, i); i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  for (let i = 360; i >= 0; i -= 6) { const [x, y] = proyectar(-2, i); g.lineTo(x, y); }
  g.fill();
  g.restore();
  g.strokeStyle = 'rgba(231,206,229,0.3)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(232,198,160,0.9)'; g.font = `600 ${Math.max(10, R * 0.06)}px 'Quicksand', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [t, az] of [['N', 0], ['E', 90], ['S', 180], ['O', 270]]) { const [x, y] = proyectar(-12, az); g.fillText(t, x, y); }
  g.textBaseline = 'alphabetic';
  return { luna: { ...l, alt: altL }, altSol };
}

export function crearCieloNoche() {
  const dialogo = document.getElementById('cielo-noche');
  if (!dialogo) return { abrir() {} };
  const lienzos = [...dialogo.querySelectorAll('canvas')], hora = dialogo.querySelector('#cielo-hora'), etiqueta = dialogo.querySelector('#cielo-hora-texto'), nota = dialogo.querySelector('#cielo-nota');
  const horas = [...dialogo.querySelectorAll('.cielos figcaption')];
  const opciones = { lineas: true, nombres: true };
  for (const b of dialogo.querySelectorAll('[data-opcion]')) b.addEventListener('click', () => { opciones[b.dataset.opcion] = !opciones[b.dataset.opcion]; b.setAttribute('aria-pressed', String(opciones[b.dataset.opcion])); programar(); });
  // Fecha y hora locales de un instante (UTC) en una ciudad, p. ej. «15 dic · 04:00».
  const local = (utc, desfase) => { const f = new Date(utc + desfase * 3600e3); return `${f.getUTCDate()} dic · ${String(f.getUTCHours()).padStart(2, '0')}:${String(f.getUTCMinutes()).padStart(2, '0')}`; };
  for (const b of dialogo.querySelectorAll('[data-hora]')) b.addEventListener('click', () => { hora.value = b.dataset.hora; programar(); });
  function pintar() {
    // Un mismo instante para los dos: el control marca la hora de Barcelona (UTC+1) y
    // Buenos Aires va 4 horas por detrás (UTC−3) en diciembre.
    const hb = Number(hora.value), utc = Date.UTC(2025, 11, 15, 0, 0) + (hb - LUGARES[0].utc) * 3600e3;
    const [tb, ta] = LUGARES.map(l => local(utc, l.utc));
    etiqueta.textContent = `Barcelona ${tb} · Buenos Aires ${ta}`;
    const [bcn, bsas] = LUGARES.map((lugar, i) => dibujar(lienzos[i], lugar, utc, opciones));
    horas[0].textContent = `Cas · Barcelona · ${tb}`; horas[1].textContent = `Xio · Buenos Aires · ${ta}`;
    for (const b of dialogo.querySelectorAll('[data-hora]')) b.setAttribute('aria-pressed', String(Number(b.dataset.hora) === hb));
    const estado = r => r.altSol > 0 ? 'aún era de día' : r.altSol > -6 ? 'estaba atardeciendo' : r.altSol > -12 ? 'caía la noche' : 'ya era de noche cerrada';
    const fase = Math.round(bcn.luna.iluminada * 100), arriba = [bcn, bsas].some(r => r.luna.alt > 0);
    nota.textContent = `En diciembre os separaban 4 horas: en Barcelona ${estado(bcn)} y en Buenos Aires ${estado(bsas)}. Júpiter brillaba en Géminis y Saturno en Piscis; la Luna, ${bcn.luna.creciente ? 'creciente' : 'menguante'} al ${fase} %, ${arriba ? 'asomaba sobre uno de los dos horizontes' : 'todavía no había salido para ninguno'}. Dibujado como se vería lejos de las luces de la ciudad.`;
  }
  let pendiente = 0;
  const programar = () => { if (!pendiente) pendiente = requestAnimationFrame(() => { pendiente = 0; pintar(); }); };
  hora.addEventListener('input', programar);
  dialogo.querySelector('.cerrar-panel')?.addEventListener('click', () => dialogo.close());
  dialogo.addEventListener('click', e => { if (e.target === dialogo) dialogo.close(); });
  addEventListener('resize', () => { if (dialogo.open) programar(); });
  return { abrir() { if (!dialogo.open) dialogo.showModal(); programar(); } };
}
