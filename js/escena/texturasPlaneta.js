// Texturas de planetas calculadas sobre la esfera, sin DOM: se ejecutan en un Web Worker
// (obreroTexturas.js) mientras el hilo principal compila los shaders. Cada función
// devuelve píxeles RGBA (filas de arriba abajo, alfa 255) listos para una DataTexture.
import { crearRuido, pintarEsfera } from '../util/ruido.js';
import { componentesGalaxia, componentesAndromeda, componentesColision } from './formasGalaxia.js';
import { CONTINENTES, MARES, ESPANA, ARGENTINA } from './geografia.js';

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const paso = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pixeles = (ancho, alto, fn) => { const d = new Uint8ClampedArray(ancho * alto * 4); pintarEsfera(d, ancho, alto, fn); return d; };

// Gigante gaseoso: bandas suaves deformadas por turbulencia fbm y algunas tormentas.
function gaseosa({ paleta, semilla, ancho, alto }) {
  const { fbm } = crearRuido(semilla), colores = paleta.map(hex);
  const tormentas = [[0.35, 0.28, 0.5], [-0.2, -0.35, 0.8], [0.5, 0.1, -0.7]].map(v => { const l = Math.hypot(...v); return v.map(c => c / l); });
  return pixeles(ancho, alto, (x, y, z) => {
    const giro = fbm(x * 2.2, y * 2.2, z * 2.2, 4) - 0.5;
    const yy = y + giro * 0.16 + (fbm(x * 7, y * 7, z * 7, 3) - 0.5) * 0.035;
    let b = 0.5 + 0.3 * Math.sin(yy * 11 + Math.sin(yy * 4) * 1.6) + 0.12 * Math.sin(yy * 31 + 1.3);
    for (const [tx, ty, tz] of tormentas) { const d = Math.hypot(x - tx, (y - ty) * 2.2, z - tz); if (d < 0.18) b += (1 - d / 0.18) ** 2 * 0.45; }
    const k = Math.min(0.999, Math.max(0, b)) * (colores.length - 1), i = Math.floor(k);
    return mezcla(colores[i], colores[Math.min(i + 1, colores.length - 1)], k - i);
  });
}

// Cuerpo rocoso con cráteres, como nuestra Luna: muchos cráteres pequeños y pocos grandes
// (ley de potencias), cuenco con borde elevado, pico central en los grandes, manto de
// eyecciones claro, rayos brillantes en los más jóvenes (como Tycho) y mares lisos y oscuros.
// Con relieve, la altura va en el canal alfa (el sombreado la usa para el relieve).
function crateres({ paleta, semilla, cantidad = 46, ancho, alto, mares = 0, relieve = false, rayos = 0 }) {
  const { fbm, azar } = crearRuido(semilla), [oscuro, medio, claro] = paleta.map(hex);
  const lista = Array.from({ length: cantidad }, () => {
    const u = azar() * 2 - 1, a = azar() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    return [Math.cos(a) * r, u, Math.sin(a) * r, 0.02 + Math.pow(azar(), 2.6) * 0.21, azar()];
  });
  // Los cráteres con rayos llevan su propia base tangente para medir el ángulo alrededor.
  const conRayos = lista.filter(c => c[3] > 0.06).slice(0, rayos).map(([cx, cy, cz, r, e]) => {
    let t1 = [cz, 0, -cx]; const l = Math.hypot(...t1) || 1; t1 = t1.map(k => k / l);
    const t2 = [cy * t1[2] - cz * t1[1], cz * t1[0] - cx * t1[2], cx * t1[1] - cy * t1[0]];
    return [cx, cy, cz, r, e, t1, t2];
  });
  return pixeles(ancho, alto, (x, y, z) => {
    let h = fbm(x * 3, y * 3, z * 3, 5) * 0.5 + fbm(x * 14, y * 14, z * 14, 3) * 0.14 + fbm(x * 40, y * 40, z * 40, 2) * 0.05;
    let alb = 0.56 + (fbm(x * 5 + 3, y * 5, z * 5, 4) - 0.5) * 0.36;
    const m = mares ? paso(0.5, 0.6, fbm(x * 1.3 + 5, y * 1.3, z * 1.3, 3)) * mares : 0, k = 1 - m * 0.65;
    for (const [cx, cy, cz, r] of lista) {
      const lim = r * 2.2; if (Math.abs(x - cx) > lim || Math.abs(y - cy) > lim || Math.abs(z - cz) > lim) continue;
      const d = Math.hypot(x - cx, y - cy, z - cz) / r; if (d > 2.2) continue;
      const fuerza = (0.55 + r * 3) * k;
      if (d < 1) {
        h += (-0.3 * (1 - d * d) + 0.3 * paso(0.5, 1, d) * (1 - paso(0.95, 1.25, d))) * fuerza; alb -= 0.02 * (1 - d) * k;
        if (r > 0.08) h += 0.2 * Math.exp(-d * d * 45) * fuerza;          // pico central
      } else { const ej = 1 - paso(1, 2.2, d); h += 0.12 * ej * ej * fuerza; alb += 0.035 * ej * k; }
    }
    for (const [cx, cy, cz, r, e, t1, t2] of conRayos) {
      const dx = x - cx, dy = y - cy, dz = z - cz, d = Math.hypot(dx, dy, dz); if (d > r * 7 || d < r * 0.9) continue;
      const ang = Math.atan2(dx * t2[0] + dy * t2[1] + dz * t2[2], dx * t1[0] + dy * t1[1] + dz * t1[2]);
      const n = fbm(Math.cos(ang) * 9 + e * 13, Math.sin(ang) * 9, e * 9, 3);   // rectos: solo dependen del ángulo
      alb += paso(0.58, 0.7, n) * Math.pow(1 - d / (r * 7), 1.6) * 0.32;
    }
    alb = alb * (1 - m * 0.48); h = h * (1 - m * 0.5) - m * 0.08;
    const t = Math.min(1, Math.max(0, alb));
    const c = t < 0.5 ? mezcla(oscuro, medio, t * 2) : mezcla(medio, claro, (t - 0.5) * 2);
    return relieve ? [c[0], c[1], c[2], Math.min(255, Math.max(0, (h * 0.42 + 0.3) * 255))] : c;
  });
}

// Planeta océano: continentes rosados con costas suaves, plataforma turquesa y casquetes;
// las ciudades quedan siempre en tierra. Devuelve superficie y máscara de océano (R).
function oceano({ semilla, ciudades, ancho, alto }) {
  const { fbm } = crearRuido(semilla);
  const hondo = hex('#1a3a96'), mar = hex('#3f86e8'), costa = hex('#8fe0f0'), tierra = hex('#d7a3c9'), monte = hex('#f6dcef'), hielo = hex('#f4f6ff');
  const mascara = new Uint8ClampedArray(ancho * alto * 4);
  let i = 0;
  const superficie = pixeles(ancho, alto, (x, y, z) => {
    let h = fbm(x * 1.6 + 3, y * 1.6, z * 1.6, 6) - 0.5;
    for (const c of ciudades) h += 0.35 * Math.max(0, 1 - Math.hypot(x - c[0], y - c[1], z - c[2]) / 0.42);
    const polo = paso(0.82, 0.9, Math.abs(y) + (fbm(x * 5, y * 5, z * 5, 3) - 0.5) * 0.12);
    let c;
    if (h < 0.02) { const t = paso(-0.25, 0.02, h); c = mezcla(hondo, mar, t); if (t > 0.85) c = mezcla(c, costa, (t - 0.85) / 0.15 * 0.7); mascara[i] = 255; }
    mascara[i + 3] = 255; i += 4;
    if (!c) c = mezcla(tierra, monte, paso(0.05, 0.3, h));
    return mezcla(c, hielo, polo);
  });
  return { superficie, mascara };
}

// Nubes: blanco (la cobertura va en el color; el shader la usa como alfa).
// Nubes como las de la Tierra vista desde el espacio: la franja de tormentas del ecuador,
// cielos más despejados sobre los desiertos subtropicales, borrascas en espiral en latitudes
// medias (giran al revés en cada hemisferio) y nubes más finas en los polos.
function nubes({ semilla, ancho, alto }) {
  const { fbm, azar } = crearRuido(semilla), RAD = Math.PI / 180;
  const ciclones = Array.from({ length: 10 }, () => {
    const hemi = azar() < 0.5 ? 1 : -1, lat = hemi * (36 + azar() * 24) * RAD, lon = azar() * Math.PI * 2;
    return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon), 0.16 + azar() * 0.14, hemi];
  });
  return pixeles(ancho, alto, (x, y, z) => {
    let px = x, py = y, pz = z;
    for (const [cx, cy, cz, r, hemi] of ciclones) {
      const dx = px - cx, dy = py - cy, dz = pz - cz, d = Math.hypot(dx, dy, dz); if (d >= r) continue;
      // Remolino: girar el punto alrededor del eje del ciclón, más cuanto más cerca del centro.
      const a = 3.2 * Math.pow(1 - d / r, 2) * hemi, c = Math.cos(a), s = Math.sin(a), k = px * cx + py * cy + pz * cz;
      const qx = py * cz - pz * cy, qy = pz * cx - px * cz, qz = px * cy - py * cx;
      px = px * c + qx * s + cx * k * (1 - c); py = py * c + qy * s + cy * k * (1 - c); pz = pz * c + qz * s + cz * k * (1 - c);
    }
    const lat = Math.asin(Math.max(-1, Math.min(1, y))) / RAD, aLat = Math.abs(lat);
    const base = 0.45 + 0.28 * Math.exp(-Math.pow(lat / 7, 2)) - 0.22 * Math.exp(-Math.pow((aLat - 24) / 8, 2)) + 0.16 * Math.exp(-Math.pow((aLat - 55) / 11, 2));
    const n = fbm(px * 2.6 + fbm(px * 5, py * 5, pz * 5, 2) * 0.6, py * 3.6, pz * 2.6, 5), detalle = fbm(px * 11, py * 11, pz * 11, 3);
    const v = paso(0.66 - base * 0.32, 0.82 - base * 0.22, n * 0.75 + detalle * 0.25) * 255;
    return [v, v, v];
  });
}

// Zonas secas reales [lon0, lon1, lat0, lat1, intensidad]: Sahara, Arabia, Irán, Thar,
// Taklamakán, Gobi, Australia, Kalahari-Namib, suroeste de EE. UU., Atacama y Patagonia.
// Cordilleras reales [puntos (lon, lat), ancho en grados, altura]: dan relieve y nieve.
const CORDILLERAS = [
  [[[-75, 10], [-78, -2], [-76, -12], [-70, -18], [-69, -27], [-70, -34], [-72, -42], [-73, -50], [-71, -54]], 3.2, 1.0],   // Andes
  [[[-150, 62], [-135, 58], [-122, 50], [-112, 44], [-107, 38], [-106, 32]], 4.5, 0.62],                                      // Rocosas
  [[[70, 37], [76, 35], [81, 31], [86, 28], [92, 28], [97, 28]], 3.0, 1.0],                                                   // Himalaya
  [[[78, 36], [86, 34], [94, 33], [100, 34]], 6.5, 0.62],                                                                     // meseta del Tíbet
  [[[5.5, 44.5], [7.5, 46], [10.5, 46.6], [14, 47]], 1.6, 0.72],                                                             // Alpes
  [[[-1.8, 43.1], [0.5, 42.7], [2.6, 42.4]], 1.0, 0.55],                                                                     // Pirineos
  [[[-8, 31], [-3, 33], [3, 35], [9, 36]], 2.0, 0.45],                                                                        // Atlas
  [[[59, 50], [60, 57], [61, 64], [64, 68]], 1.6, 0.35],                                                                      // Urales
  [[[-84, 34], [-79, 38], [-75, 41], [-70, 45]], 2.2, 0.3],                                                                   // Apalaches
  [[[36, 12], [38, 6], [36, 0], [34, -6]], 3.0, 0.45],                                                                        // macizo etíope y rift
  [[[42, 43], [45, 42], [48, 41]], 1.4, 0.55],                                                                                // Cáucaso
  [[[147, -37], [150, -32], [152, -27]], 1.8, 0.28]                                                                           // cordillera Divisoria
];
// Caja de cada cordillera (con margen): fuera de ella su aporte es despreciable y no se calcula.
const CAJAS = CORDILLERAS.map(([puntos, ancho]) => { const m = ancho * 3, lon = puntos.map(p => p[0]), lat = puntos.map(p => p[1]);
  return [Math.min(...lon) - m * 2, Math.max(...lon) + m * 2, Math.min(...lat) - m, Math.max(...lat) + m]; });
const DESIERTOS = [[-16, 34, 16, 31, 1], [36, 57, 15, 31, 1], [52, 66, 26, 35, 0.75], [68, 75, 24, 29, 0.7], [76, 90, 37, 41, 0.8], [92, 113, 39, 46, 0.7], [118, 141, -30, -20, 0.95], [13, 24, -27, -19, 0.8], [-117, -103, 26, 36, 0.7], [-71, -68, -28, -18, 0.8], [-71, -65, -50, -38, 0.55]];

// Relleno por líneas de un polígono [lon, lat] sobre una malla equirectangular.
function rasterizar(malla, W, H, poligono, valor) {
  for (let y = 0; y < H; y++) {
    const lat = 90 - (y + 0.5) / H * 180, cortes = [];
    for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
      const [x1, y1] = poligono[j], [x2, y2] = poligono[i];
      if ((y1 > lat) !== (y2 > lat)) cortes.push(((x1 + (lat - y1) * (x2 - x1) / (y2 - y1)) + 180) / 360 * W);
    }
    cortes.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cortes.length; k += 2) for (let x = Math.max(0, Math.ceil(cortes[k] - 0.5)); x < Math.min(W, cortes[k + 1] - 0.5); x++) malla[y * W + x] = valor;
  }
}
// Desenfoque de caja separable (envuelve en longitud), para costas suaves y la plataforma.
function desenfocar(malla, W, H, r, pasadas = 2) {
  let a = malla, b = new Float32Array(W * H);
  for (let p = 0; p < pasadas; p++) {
    for (let y = 0; y < H; y++) { let suma = 0; for (let k = -r; k <= r; k++) suma += a[y * W + ((k + W) % W)]; for (let x = 0; x < W; x++) { b[y * W + x] = suma / (2 * r + 1); suma += a[y * W + ((x + r + 1) % W)] - a[y * W + ((x - r + W) % W)]; } }
    for (let x = 0; x < W; x++) { let suma = 0; for (let k = -r; k <= r; k++) suma += b[Math.min(H - 1, Math.max(0, k)) * W + x]; for (let y = 0; y < H; y++) { a[y * W + x] = suma / (2 * r + 1); suma += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x]; } }
  }
  return a;
}

// La Tierra de «Dos orillas»: continentes reales simplificados, biomas por latitud y
// humedad, plataforma continental clara, hielo polar. España y Argentina van en la
// máscara (G y B) para iluminarse con suavidad; R marca el océano (brillo del sol).
function tierra({ semilla, ancho: W, alto: H }) {
  const { fbm } = crearRuido(semilla);
  const tierraM = new Float32Array(W * H);
  for (const c of CONTINENTES) rasterizar(tierraM, W, H, c, 1);
  for (const m of MARES) rasterizar(tierraM, W, H, m, 0);
  const costa = desenfocar(Float32Array.from(tierraM), W, H, 2);
  const plataforma = desenfocar(Float32Array.from(tierraM), W, H, 7);
  const espM = new Float32Array(W * H), argM = new Float32Array(W * H);
  rasterizar(espM, W, H, ESPANA, 1); rasterizar(argM, W, H, ARGENTINA, 1);
  const espS = desenfocar(Float32Array.from(espM), W, H, 2, 1), argS = desenfocar(Float32Array.from(argM), W, H, 2, 1);
  const superficie = new Uint8ClampedArray(W * H * 4), mascara = new Uint8ClampedArray(W * H * 4);
  const C = h => hex(h);
  const hondo = C('#0a2257'), medio = C('#174a93'), somero = C('#2d8bb8'), hielo = C('#f2f6ff');
  const selva = C('#24552d'), bosque = C('#3f6b3a'), pradera = C('#7d9a58'), estepa = C('#a89e6c'), arena = C('#d8bf8e'), duna = C('#e3c99a'), taiga = C('#3d5e45'), tundra = C('#8e9a84'), roca = C('#8a7a6a');
  for (let y = 0; y < H; y++) {
    const lat = 90 - (y + 0.5) / H * 180, la = lat * Math.PI / 180, cl = Math.cos(la), aLat = Math.abs(lat);
    for (let x = 0; x < W; x++) {
      const lon = (x + 0.5) / W * 360 - 180, lo = lon * Math.PI / 180, i = y * W + x, j = i * 4;
      const px = cl * Math.cos(lo), py = Math.sin(la), pz = cl * Math.sin(lo);
      const n = fbm(px * 3 + 7, py * 3, pz * 3, 5), n2 = fbm(px * 9, py * 9 + 3, pz * 9, 3);
      const esTierra = costa[i] + (n - 0.5) * 0.45 > 0.5 || lat < -70 + (n - 0.5) * 6;
      let c, secoGlobal = 0, altura = -0.05;
      if (esTierra) {
        const humedad = fbm(px * 2.2 + 11, py * 2.2, pz * 2.2, 4), zona = aLat + (n - 0.5) * 9;
        // Climas por latitud con transiciones suaves: selva → bosque/pradera → taiga → tundra → hielo.
        c = mezcla(selva, bosque, paso(8, 20, zona));
        c = mezcla(c, mezcla(bosque, pradera, paso(0.42, 0.62, 1 - humedad)), paso(20, 30, zona));
        c = mezcla(c, taiga, paso(46, 56, zona));
        c = mezcla(c, tundra, paso(58, 66, zona));
        c = mezcla(c, hielo, Math.max(paso(68, 78, zona), lat < -60 ? 1 : 0));
        // Desiertos donde los hay de verdad, con borde irregular.
        let seco = 0;
        for (const [l0, l1, a0, a1, k] of DESIERTOS) {
          const d = Math.hypot((lon - (l0 + l1) / 2) / ((l1 - l0) / 2 + 4), (lat - (a0 + a1) / 2) / ((a1 - a0) / 2 + 3));
          seco = Math.max(seco, k * (1 - paso(0.5, 1.15, d + (n - 0.5) * 0.9 + (n2 - 0.5) * 0.45)));
        }
        c = mezcla(c, mezcla(estepa, mezcla(arena, duna, n2), paso(0.35, 0.8, seco)), seco); secoGlobal = seco;
        c = mezcla(c, roca, paso(0.62, 0.78, n2) * 0.35);           // relieve
        // Altura: suave en las llanuras y montañas de cresta (ruido «ridged») en las cordilleras.
        altura = 0.12 + (n - 0.5) * 0.18 + (n2 - 0.5) * 0.08;
        let cresta = 0.5, cerca = false;
        for (const [l0, l1, a0, a1] of CAJAS) if (lon > l0 && lon < l1 && lat > a0 && lat < a1) { cerca = true; break; }
        if (cerca) cresta = 1 - Math.abs(fbm(px * 28 + 2, py * 28, pz * 28, 4) * 2 - 1);
        for (const [n, [puntos, ancho, alto]] of CORDILLERAS.entries()) {
          const [l0, l1, a0, a1] = CAJAS[n]; if (lon < l0 || lon > l1 || lat < a0 || lat > a1) continue;
          let d = 99;
          for (let k = 1; k < puntos.length; k++) {
            const [ax, ay] = puntos[k - 1], [bx, by] = puntos[k], cx = Math.cos(la);
            const ux = (bx - ax) * cx, uy = by - ay, wx = (lon - ax) * cx, wy = lat - ay, t = Math.max(0, Math.min(1, (wx * ux + wy * uy) / (ux * ux + uy * uy)));
            d = Math.min(d, Math.hypot(wx - ux * t, wy - uy * t));
          }
          altura += Math.exp(-Math.pow(d / ancho, 2)) * alto * (0.35 + 0.55 * cresta);
        }
        c = mezcla(c, [124, 108, 90], paso(0.32, 0.8, altura) * 0.7);                          // roca desnuda
        c = mezcla(c, [244, 246, 250], paso(0.85, 1.05, altura + aLat * 0.0025) * paso(0.6, 0.88, cresta) * 0.85);   // nieve solo en las crestas altas
        const v = 0.86 + n2 * 0.24; c = [c[0] * v, c[1] * v, c[2] * v];
        // Las dos orillas, apenas teñidas (la luz suave la añade el shader con la máscara).
        // España (Cas) en azul y Argentina (Xio) en rosa, como en el corazón de «El hilo invisible».
        c = mezcla(c, [168, 205, 242], espS[i] * 0.26); c = mezcla(c, [236, 170, 196], argS[i] * 0.26);
      } else {
        const p = plataforma[i] + (n - 0.5) * 0.1;
        c = mezcla(mezcla(hondo, medio, paso(0.02, 0.3, p) + (n2 - 0.5) * 0.15), somero, paso(0.42, 0.55, p) * 0.28);
        if (aLat > 78 + (n - 0.5) * 6) c = mezcla(c, hielo, 0.85);
        mascara[j] = 255;
      }
      superficie[j] = c[0]; superficie[j + 1] = c[1]; superficie[j + 2] = c[2];
      superficie[j + 3] = Math.round(Math.min(1, Math.max(0, 0.1 + altura * 0.75)) * 255);   // altura (relieve en el shader)
      // Orillas: relleno tenue y borde más brillante.
      const bordeE = Math.max(0, Math.min(1, espS[i] * (1 - espS[i]) * 4)), bordeA = Math.max(0, Math.min(1, argS[i] * (1 - argS[i]) * 4));
      mascara[j + 1] = Math.min(255, (espS[i] * 0.3 + bordeE * 0.9) * 255); mascara[j + 2] = Math.min(255, (argS[i] * 0.3 + bordeA * 0.9) * 255);
      // Luces de las ciudades (lado nocturno): racimos en tierras habitables, más junto a la costa.
      let luces = 0;
      if (esTierra && lat > -45 && lat < 62 && !(lat < -60)) {
        const habitable = (1 - paso(0.3, 0.7, secoGlobal)) * (1 - paso(55, 62, aLat));
        // Solo los picos del ruido encienden una ciudad, y solo en regiones densas: puntos dispersos.
        const racimo = paso(0.62, 0.74, fbm(px * 70 + 1, py * 70, pz * 70, 2)) * paso(0.5, 0.66, fbm(px * 6 + 9, py * 6, pz * 6, 3));
        luces = Math.min(1, racimo * habitable * (0.5 + paso(0.5, 0.9, costa[i]) * 0.2 + (1 - paso(0.5, 1, plataforma[i])) * 0.8));
      }
      mascara[j + 3] = Math.round(luces * 255);
    }
  }
  return { superficie, mascara };
}

// ── Cielo de fondo ──
// Galaxia como en las fotografías: bulbo amarillento, disco exponencial, brazos en espiral
// logarítmica con estrellas jóvenes azuladas, nudos rosados de formación estelar (regiones HII)
// y franjas de polvo oscuro en el borde interior de los brazos. Tipos: espiral, barrada,
// floculenta, elíptica, de canto (con franja de polvo, como la del Sombrero) e irregular.
// Andrómeda como en las fotografías de larga exposición: bulbo enorme y cálido (perfil de
// De Vaucouleurs), disco con brazos muy cerrados que, inclinado, se ven como anillos; franjas
// de polvo oscuro y filamentoso, el anillo azul de estrellas jóvenes con nudos rosados,
// cúmulos sueltos y un halo exterior muy tenue. Se dibuja de frente; la inclinación la pone
// el plano en el que se pega.
const mixto = (a, b, t) => a + (b - a) * t;
function andromeda({ semilla = 31, ancho: W, alto: H }) {
  const { fbm, ruido, azar } = crearRuido(semilla);
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W * 2 - 1, v = (y + 0.5) / H * 2 - 1, r = Math.hypot(u, v), th = Math.atan2(v, u);
    // Forma común con las estrellas 3D (formasGalaxia.js).
    const k = componentesAndromeda(u, v, { fbm }, semilla);
    let c = [0, 0, 0];
    const suma = (col, x) => { c[0] += col[0] * x; c[1] += col[1] * x; c[2] += col[2] * x; };
    suma([1.0, 0.86, 0.66], Math.min(2.4, k.bulbo));                                   // bulbo
    suma([0.96, 0.88, 0.8], k.discoViejo);                                              // disco viejo
    suma([0.58, 0.72, 1.0], k.jovenes);                                                 // estrellas jóvenes
    suma([1.0, 0.42, 0.62], k.nudo * 0.9);                                              // regiones HII
    suma([0.82, 0.86, 1.0], Math.exp(-r / 0.55) * 0.06);                                // halo exterior
    c = c.map((x, i) => x * (1 - k.polvo * (i === 2 ? 1 : 0.92)));                     // el polvo enrojece un poco
    if (azar() < 0.0018) suma([1, 0.97, 0.94], 0.5 + azar() * 1.2);                    // estrellas de primer plano
    const borde = 1 - paso(0.86, 0.995, r), j = (y * W + x) * 4;
    d[j] = Math.min(255, Math.pow(c[0] * borde, 0.8) * 255); d[j + 1] = Math.min(255, Math.pow(c[1] * borde, 0.8) * 255); d[j + 2] = Math.min(255, Math.pow(c[2] * borde, 0.8) * 255); d[j + 3] = 255;
  }
  return d;
}

// Dos galaxias fusionándose, como las Antenas en las imágenes del Hubble: dos núcleos
// anaranjados envueltos en polvo, una zona central caótica llena de cúmulos azules y nudos
// rosados de estrellas recién nacidas, filamentos oscuros que la cruzan y dos colas de marea
// larguísimas, tenues y curvas, hechas de estrellas arrancadas.
function colision({ semilla = 9, ancho: W, alto: H }) {
  const { fbm, ruido, azar } = crearRuido(semilla);
  const d = new Uint8ClampedArray(W * H * 4);
  const cola = (u, v, p0, p1, p2, ancho) => { let m = 9, tt = 0; for (let k = 0; k <= 48; k++) { const t = k / 48, a0 = (1 - t) * (1 - t), a1 = 2 * (1 - t) * t, a2 = t * t;
    const dx = u - (a0 * p0[0] + a1 * p1[0] + a2 * p2[0]), dy = v - (a0 * p0[1] + a1 * p1[1] + a2 * p2[1]), dd = (dx * dx + dy * dy) / Math.pow(ancho * (0.6 + t * 1.4), 2); if (dd < m) { m = dd; tt = t; } } return Math.exp(-m) * (1 - tt * 0.75); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u0 = (x + 0.5) / W * 2 - 1, v0 = (y + 0.5) / H * 2 - 1;
    // Forma común con las estrellas 3D (formasGalaxia.js).
    const k = componentesColision(u0, v0, { fbm }, semilla);
    let c = [0, 0, 0];
    const suma = (col, x) => { c[0] += col[0] * x; c[1] += col[1] * x; c[2] += col[2] * x; };
    suma([1.0, 0.72, 0.42], k.nucleos);
    suma([0.95, 0.84, 0.74], k.cuerpo * 0.55 * (0.65 + k.grano * 0.7));
    suma([0.55, 0.72, 1.0], (k.centro * 1.1 + k.cuerpo * 0.4) * k.cumulos * 1.5);
    suma([1.0, 0.38, 0.6], k.nudos * 2.0);
    suma([0.66, 0.76, 1.0], k.colas * (0.12 + k.grano * 0.3 + k.cumulos * 0.6));
    suma([1.0, 0.5, 0.7], k.colas * k.nudos * 0.6);
    c = c.map((x, i) => x * (1 - k.polvo * (i === 2 ? 1 : 0.9)));
    if (azar() < 0.0015) suma([1, 0.97, 0.94], 0.5 + azar());
    const borde = 1 - paso(0.85, 0.995, Math.hypot(u0, v0)), j = (y * W + x) * 4;
    d[j] = Math.min(255, Math.pow(c[0] * borde, 0.8) * 255); d[j + 1] = Math.min(255, Math.pow(c[1] * borde, 0.8) * 255); d[j + 2] = Math.min(255, Math.pow(c[2] * borde, 0.8) * 255); d[j + 3] = 255;
  }
  return d;
}

// Paletas: cada galaxia con su carácter (como en las imágenes procesadas de telescopio).
export const PALETAS_GALAXIA = {
  clasica: [[1.0, 0.86, 0.66], [0.62, 0.76, 1.0], [1.0, 0.36, 0.56]],
  rosa: [[1.0, 0.82, 0.76], [1.0, 0.55, 0.82], [1.0, 0.4, 0.72]],
  dorada: [[1.0, 0.84, 0.52], [1.0, 0.78, 0.48], [1.0, 0.48, 0.32]],
  violeta: [[1.0, 0.82, 0.92], [0.74, 0.55, 1.0], [1.0, 0.45, 0.88]],
  turquesa: [[1.0, 0.9, 0.74], [0.42, 0.95, 0.95], [1.0, 0.45, 0.62]],
  azul: [[0.95, 0.9, 1.0], [0.42, 0.6, 1.0], [0.92, 0.42, 1.0]]
};
function galaxia({ tipo = 'espiral', semilla = 1, ancho: W, alto: H, brazos = 2, enrollado = 4.2, paleta = 'clasica' }) {
  const { fbm, ruido, azar } = crearRuido(semilla);
  const d = new Uint8ClampedArray(W * H * 4);
  const [bulboC, jovenC, hiiC] = PALETAS_GALAXIA[paleta] || PALETAS_GALAXIA.clasica, discoC = [0.95, 0.88, 0.85];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let u = (x + 0.5) / W * 2 - 1, v = (y + 0.5) / H * 2 - 1;
    if (tipo === 'canto') v *= 4.2;                                   // disco visto de lado
    const r = Math.hypot(u, v), th = Math.atan2(v, u);
    let c = [0, 0, 0];
    const suma = (col, k) => { c[0] += col[0] * k; c[1] += col[1] * k; c[2] += col[2] * k; };
    if (tipo === 'eliptica' || tipo === 'irregular') {
      // Forma común con las estrellas 3D (formasGalaxia.js).
      const k = componentesGalaxia(tipo, u, v, { fbm, ruido }, semilla);
      suma(bulboC, k.bulbo); suma(jovenC, k.jovenes); suma(hiiC, k.nudo);
    } else {
      // Forma común con las estrellas 3D (formasGalaxia.js).
      const k = componentesGalaxia(tipo, u, v, { fbm, ruido }, semilla, brazos, enrollado);
      suma(bulboC, k.bulbo);
      suma(discoC, k.disco * 0.1);
      suma(jovenC, k.jovenes * 1.15);
      suma(jovenC, k.cumulos);                                         // cúmulos entre los brazos
      suma(hiiC, k.nudo * 2.2);                                        // regiones HII: nudos rosados sobre los brazos
      c = c.map(x => x * (1 - k.polvo));
      if (tipo === 'canto') { const franja = Math.exp(-Math.pow(v / 4.2 / 0.035, 2)) * THREE_smooth(0.02, 0.15, Math.abs(u)) * (0.75 + fbm(u * 20, v, semilla, 2) * 0.4); c = c.map(k => k * (1 - Math.min(0.92, franja))); }
    }
    // Estrellas resueltas sueltas y halo general.
    if (azar() < 0.0025 * Math.exp(-r * 1.5)) suma([1, 0.97, 0.92], 0.6 + azar());
    const borde = 1 - THREE_smooth(0.5, 0.97, Math.hypot((x + 0.5) / W * 2 - 1, (y + 0.5) / H * 2 - 1));   // sin borde visible
    const j = (y * W + x) * 4;
    d[j] = Math.min(255, Math.pow(c[0] * borde, 0.85) * 255); d[j + 1] = Math.min(255, Math.pow(c[1] * borde, 0.85) * 255); d[j + 2] = Math.min(255, Math.pow(c[2] * borde, 0.85) * 255); d[j + 3] = 255;
  }
  return d;
}
const THREE_smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Nebulosa de emisión como en las fotografías del Hubble: gas con forma irregular y retorcida
// (doble deformación del ruido), filamentos y frentes de ionización brillantes donde el gas
// cambia de densidad, columnas y vetas de polvo oscuro, un cúmulo de estrellas jóvenes que la
// ioniza desde dentro (su luz, no sus estrellas) y colores por zonas: oxígeno turquesa cerca de las estrellas, hidrógeno
// rojo-rosado en el cuerpo y azufre dorado en los bordes. Bordes deshilachados, nunca un cuadro.
// Tonos: 0 hidrógeno y oxígeno; 1 violeta y azul; 2 planetaria verde azulada; 3 el Cangrejo;
// 4 paleta del Hubble (dorado y turquesa).
// Formas (como las regiones reales): 'emision' (nube retorcida con frentes de ionización);
// 'cavidad' (anillo de gas con un hueco central vaciado por el cúmulo, como la Roseta); 'pilares'
// (columnas de polvo con bordes encendidos y cabezas brillantes, como los Pilares de la Creación);
// 'filamentos' (velos finos de un remanente antiguo, como el Velo); 'reflexion' (luz azulada
// suave con vetas de polvo); 'oscura' (una nube de polvo recortada contra gas brillante, con el borde
// encendido, como la Cabeza de Caballo).
function nebulosaFondo({ semilla = 1, ancho: W, alto: H, tono = 0, forma: tipo = 'emision' }) {
  const { fbm, azar } = crearRuido(semilla);
  const d = new Uint8ClampedArray(W * H * 4);
  const TONOS = [
    [[1.0, 0.3, 0.42], [0.3, 0.92, 0.88], [1.0, 0.62, 0.4]], [[0.92, 0.4, 0.82], [0.45, 0.62, 1.0], [0.75, 0.55, 1.0]],
    [[0.35, 0.95, 0.72], [0.55, 0.8, 1.0], [0.9, 0.5, 0.6]], [[0.55, 0.65, 1.0], [0.8, 0.88, 1.0], [1.0, 0.45, 0.22]],
    [[0.95, 0.72, 0.35], [0.35, 0.85, 0.95], [1.0, 0.48, 0.3]]
  ];
  const [ha, oiii, sii] = TONOS[tono] || TONOS[0];
  const cx = (azar() - 0.5) * 0.25, cy = (azar() - 0.5) * 0.25;   // el cúmulo que la ilumina
  // Columnas de los pilares: posición, anchura, altura y una leve inclinación.
  const columnas = Array.from({ length: 3 }, (_, i) => ({ x: -0.42 + i * 0.4 + (azar() - 0.5) * 0.12, ancho: 0.07 + azar() * 0.05, alto: 0.05 + azar() * 0.5, incl: (azar() - 0.5) * 0.25 }));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W * 2 - 1, v = (y + 0.5) / H * 2 - 1, r = Math.hypot(u, v);
    // Doble deformación: formas retorcidas, como el gas real.
    const q1 = fbm(u * 1.4 + 7, v * 1.4, semilla, 4), q2 = fbm(u * 1.4, v * 1.4 + 3, semilla + 1, 4);
    const wu = u + (q1 - 0.5) * 0.6, wv = v + (q2 - 0.5) * 0.6, rw = Math.hypot(wu, wv);
    const r2 = fbm(wu * 2.2 + 2, wv * 2.2, semilla + 2, 5), r3 = fbm(wu * 5 + 9, wv * 5, semilla + 3, 4);
    let forma = Math.max(0, 1 - r * (1.15 + (q1 - 0.5) * 1.3)) * paso(0.25, 0.6, r2 + 0.2);
    let gas = Math.pow(r2, 1.3) * forma * (0.75 + 0.5 * r3);
    // Frentes de ionización: bordes finos y brillantes donde cambia la densidad.
    let frente = Math.exp(-Math.pow((r2 - 0.56) / 0.07, 2)) * forma * 0.75 * (0.6 + 0.6 * r3);
    let filamentos = Math.pow(1 - Math.abs(fbm(wu * 4, wv * 4, semilla + 5, 4) * 2 - 1), 6) * forma * 0.5;
    let polvo = paso(0.52, 0.78, fbm(wu * 3.2 + 4, wv * 3.2, semilla + 6, 5)) * forma * 0.95 + Math.pow(1 - Math.abs(fbm(wu * 6, wv * 6 + 2, semilla + 7, 3) * 2 - 1), 10) * forma * 0.3;
    let cerca = Math.exp(-Math.hypot(u - cx, v - cy) / 0.28);
    if (tipo === 'cavidad') {
      const radio = 0.5 + (q1 - 0.5) * 0.18, anillo = Math.exp(-Math.pow((rw - radio) / 0.2, 2)), interior = Math.exp(-Math.pow((rw - (radio - 0.2)) / 0.045, 2));
      forma = anillo * paso(0.2, 0.55, r2 + 0.25) * (1 - paso(0.82, 0.98, r));
      gas = Math.pow(r2, 1.1) * forma * (0.7 + 0.6 * r3) * 1.15; frente = interior * paso(0.3, 0.6, r2) * 0.9 * (0.6 + 0.6 * r3);
      filamentos *= anillo * 1.4; polvo = paso(0.6, 0.8, fbm(wu * 5 + 4, wv * 5, semilla + 6, 4)) * forma * 0.9;
      cerca = Math.exp(-r / 0.14) * 0.8;   // el cúmulo en el hueco
    } else if (tipo === 'pilares') {
      const fondo = paso(0.95, -0.2, v) * paso(0.2, 0.7, r2 + 0.2) * (1 - paso(0.75, 0.98, r));
      let columna = 0, borde = 0, cabeza = 0;
      for (const c of columnas) {
        const vy = (v + 1) / 2, ancho = c.ancho * (1.4 - vy * 0.6) * (0.85 + (r3 - 0.5) * 0.5), xc = c.x + c.incl * (vy - 0.5) + (q1 - 0.5) * 0.08;
        const dx = Math.abs(wu * 0.35 + u * 0.65 - xc) / ancho;
        const enAltura = paso(-c.alto - 0.12, -c.alto + 0.05, -v);   // de abajo hasta su altura
        columna = Math.max(columna, (1 - paso(0.75, 1.05, dx)) * enAltura);
        borde = Math.max(borde, Math.exp(-Math.pow((dx - 0.95) / 0.14, 2)) * enAltura);
        cabeza = Math.max(cabeza, Math.exp(-Math.pow(dx / 1.1, 2) - Math.pow((v + c.alto) / 0.06, 2)));
      }
      forma = Math.max(fondo, columna * 0.9);
      gas = fondo * Math.pow(r2, 1.2) * (0.8 + 0.4 * r3) * 1.1 + cabeza * 0.8; frente = borde * 0.9 + cabeza * 0.5;
      polvo = Math.min(0.95, columna * (0.75 + 0.3 * r3)); filamentos *= fondo; cerca = Math.exp(-Math.hypot(u, v + 0.9) / 0.45) * 0.9;   // la luz llega de arriba
    } else if (tipo === 'filamentos') {
      const cascara = Math.exp(-Math.pow((rw - 0.55 - (q2 - 0.5) * 0.3) / 0.28, 2)) * (1 - paso(0.85, 0.99, r));
      const hilo = Math.pow(1 - Math.abs(fbm(wu * 3.2 + 1, wv * 3.2, semilla + 8, 5) * 2 - 1), 14), hilo2 = Math.pow(1 - Math.abs(fbm(wu * 6 + 3, wv * 6, semilla + 9, 4) * 2 - 1), 18);
      forma = cascara; gas = (hilo * 1.2 + hilo2 * 0.6) * cascara * (0.6 + 0.6 * r3); frente = hilo2 * cascara * 0.4; filamentos = hilo * cascara * 0.9; polvo = 0; cerca = 0;
    } else if (tipo === 'reflexion') {
      const nube = Math.exp(-r * r / 0.32) * (0.55 + 0.6 * r2) * (1 - paso(0.8, 0.98, r));
      forma = nube; gas = nube * 0.55 * (0.8 + 0.4 * r3); frente = 0; filamentos = Math.pow(1 - Math.abs(fbm(wu * 3, wv * 9, semilla + 5, 4) * 2 - 1), 8) * nube * 0.35;
      polvo = Math.pow(1 - Math.abs(fbm(wu * 2.5, wv * 6 + 2, semilla + 7, 4) * 2 - 1), 6) * nube * 0.8; cerca = Math.exp(-Math.hypot(u - cx, v - cy) / 0.2) * 1.2;
    } else if (tipo === 'oscura') {
      const fondo = Math.exp(-r * r / 0.45) * paso(0.15, 0.6, r2 + 0.25) * (1 - paso(0.8, 0.98, r));
      const silueta = paso(0.47, 0.53, fbm(wu * 1.8 + 3, wv * 1.8 - 1, semilla + 10, 5) + (0.35 - Math.hypot(u, v + 0.15)) * 0.9);
      const orla = Math.exp(-Math.pow((fbm(wu * 1.8 + 3, wv * 1.8 - 1, semilla + 10, 5) + (0.35 - Math.hypot(u, v + 0.15)) * 0.9 - 0.47) / 0.025, 2));
      forma = fondo; gas = fondo * Math.pow(r2, 1.1) * 1.2; frente = orla * fondo * 1.1; polvo = Math.min(0.97, silueta * 0.97 + polvo * 0.2); cerca = 0.25;
    }
    let c = [0, 0, 0];
    for (let k = 0; k < 3; k++) c[k] = ha[k] * (gas * 1.35 + frente * 0.6) * (1 - cerca * 0.5) + oiii[k] * (gas * cerca * 1.6 + frente * cerca * 0.8) + sii[k] * (filamentos * 0.9 + frente * (1 - cerca) * 0.35);
    if (tipo === 'reflexion') c = c.map((k, i) => k * 0.4 + [0.35, 0.55, 1.0][i] * (gas * 1.4 + cerca * gas * 1.2));   // la luz azul de estrellas cercanas, reflejada
    c = c.map(k => k * (1 - Math.min(0.97, polvo)));
    // Sin estrellas pintadas en el gas: en un volumen se estirarían con el paralaje. Las estrellas
    // son del campo estelar; aquí queda solo la luz que el cúmulo ioniza (el brillo «cerca»).
    const vineta = 1 - paso(0.6, 0.97, r + (q2 - 0.5) * 0.15); c = c.map(k => k * vineta);   // nunca llega al borde
    const j = (y * W + x) * 4;
    d[j] = Math.min(255, c[0] * 255); d[j + 1] = Math.min(255, c[1] * 255); d[j + 2] = Math.min(255, c[2] * 255); d[j + 3] = 255;
  }
  return d;
}

export const GENERADORES = { gaseosa, crateres, oceano, nubes, tierra, galaxia, nebulosaFondo, andromeda, colision };
