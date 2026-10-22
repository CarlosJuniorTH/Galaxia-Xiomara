// Descripción común de la forma de cada galaxia: la usan su IMAGEN (texturasPlaneta.js, de lejos)
// y sus ESTRELLAS 3D (campoGalaxias.js, de cerca). Cada función devuelve, para un punto (u, v) del
// plano del disco (radio 1 = borde de la imagen), la intensidad de cada componente: bulbo, disco,
// brazos, anillo, colas, cúmulos, nudos y polvo. La imagen las pinta con sus colores; las estrellas
// se colocan muestreando esas mismas intensidades (y el polvo las oculta). Así los brazos, la
// barra, el anillo, los núcleos, las colas de marea y los carriles de polvo están en el mismo sitio,
// con la misma orientación y silueta, en los dos niveles de detalle.
// Sin dependencias de navegador: se ejecuta en el Web Worker de texturas y en el hilo principal.
export const paso = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const mixto = (a, b, t) => a + (b - a) * t;

// Parámetros de forma de las galaxias especiales (una sola fuente).
export const ANDROMEDA = Object.freeze({ brazos: 2, enrollado: 7.2, perturbacion: 2.4, anillo: { radio: 0.56, ancho: 0.09 } });
export const COLISION = Object.freeze({
  nucleos: [{ c: [-0.11, 0.05], angulo: 0.5 }, { c: [0.13, -0.06], angulo: -0.9 }],
  colas: [[[-0.11, 0.05], [0.02, -0.75], [-0.72, -0.62]], [[0.13, -0.06], [0.05, 0.72], [0.76, 0.58]]], anchoCola: 0.045
});

// Descriptor de cada tipo de galaxia del campo (índice = imagen en galaxiasLejanas.js).
// 9: Andrómeda, grande y muy inclinada; 10: dos galaxias en colisión (como las Antenas).
export const DESCRIPTORES = Object.freeze([
  { tipo: 'espiral', semilla: 3, brazos: 2, enrollado: 4.4, paleta: 'clasica' },
  { tipo: 'espiral', semilla: 11, brazos: 2, enrollado: 3.4, paleta: 'rosa' },
  { tipo: 'barrada', semilla: 5, brazos: 2, enrollado: 3.8, paleta: 'dorada' },
  { tipo: 'floculenta', semilla: 7, brazos: 3, enrollado: 4.8, paleta: 'turquesa' },
  { tipo: 'eliptica', semilla: 2, paleta: 'dorada' },
  { tipo: 'canto', semilla: 4, brazos: 2, enrollado: 4.2, paleta: 'clasica' },
  { tipo: 'irregular', semilla: 6, paleta: 'azul' },
  { tipo: 'espiral', semilla: 19, brazos: 3, enrollado: 3.9, paleta: 'violeta' },
  { tipo: 'barrada', semilla: 23, brazos: 2, enrollado: 4.2, paleta: 'azul' },
  { tipo: 'espiral', especial: 'andromeda', semilla: 31, brazos: ANDROMEDA.brazos, enrollado: ANDROMEDA.enrollado, paleta: 'clasica', lado: [768, 1024] },
  { tipo: 'colision', especial: 'colision', semilla: 9, paleta: 'dorada', lado: [640, 896] }
]);

// Espirales, barradas, floculentas y de canto (generador `galaxia`).
export function componentesGalaxia(tipo, u, v, { fbm, ruido }, semilla, brazos = 2, enrollado = 4.2) {
  const r = Math.hypot(u, v), th = Math.atan2(v, u);
  if (tipo === 'eliptica') { const re = Math.hypot(u, v * 1.45); return { r, bulbo: Math.exp(-re / 0.09) * 1.1 + Math.exp(-re / 0.3) * 0.45, disco: 0, brazo: 0, jovenes: 0, cumulos: 0, nudo: 0, polvo: 0, barra: 0 }; }
  if (tipo === 'irregular') {
    const n = fbm(u * 2.2 + 3, v * 2.2, semilla, 5), grumos = Math.pow(Math.max(0, fbm(u * 6, v * 6 + 4, semilla, 3) - 0.48) * 3, 2);
    const forma = Math.max(0, 1 - r * 1.25 + (n - 0.5) * 0.9);
    return { r, bulbo: 0, disco: forma, brazo: 0, jovenes: forma * (0.35 + grumos * 1.2), cumulos: 0, nudo: forma * grumos * 0.7 * (ruido(u * 30, v * 30, 1) > 0.72 ? 1 : 0.15), polvo: 0, barra: 0 };
  }
  const barra = tipo === 'barrada' ? Math.exp(-Math.pow(u * Math.cos(0.4) + v * Math.sin(0.4), 2) / 0.05 - Math.pow(-u * Math.sin(0.4) + v * Math.cos(0.4), 2) / 0.0035) : 0;
  const rr = Math.max(r, 0.02), inicio = tipo === 'barrada' ? 0.22 : 0.06;
  const caos = tipo === 'floculenta' ? 2.2 : 0.9;
  const fase = th * brazos - Math.log(rr) * enrollado + (fbm(u * 3, v * 3, semilla + 2, 3) - 0.5) * caos;
  const brazo = Math.pow(0.5 + 0.5 * Math.cos(fase), tipo === 'floculenta' ? 1.6 : 3) * paso(inicio, inicio + 0.12, r);
  const polvoBrazo = Math.pow(0.5 + 0.5 * Math.cos(fase + 0.75), 7) * paso(0.08, 0.2, r) * (0.5 + fbm(u * 9, v * 9, semilla + 5, 3));
  const disco = Math.exp(-r / 0.32);
  const bulbo = Math.exp(-r / 0.075) * 1.15 + Math.exp(-r / 0.18) * 0.35 + barra * 0.8;
  const grano = fbm(u * 14, v * 14, semilla, 3), espolones = Math.pow(fbm(u * 26 + 1, v * 26, semilla + 8, 3), 3) * 2.2;
  const jovenes = brazo * disco * (0.35 + grano * 0.9 + espolones);
  const cumulos = Math.pow(grano, 4) * disco * 0.35;
  const nudo = Math.pow(Math.max(0, ruido(u * 34 + semilla, v * 34, 2.5) - 0.64) * 2.8, 2) * brazo * paso(0.12, 0.3, r) * (1 - paso(0.75, 0.95, r));
  const polvo = Math.min(0.85, polvoBrazo * 0.9 * (tipo === 'canto' ? 0 : 1));
  return { r, bulbo, barra, disco, brazo, jovenes, cumulos, nudo, polvo };
}

// Andrómeda: espiral muy enrollada con perturbación turbulenta, anillo de formación estelar y polvo.
export function componentesAndromeda(u, v, { fbm }, semilla = 31) {
  const r = Math.hypot(u, v), th = Math.atan2(v, u), rr = Math.max(r, 0.004), A = ANDROMEDA;
  const qx = fbm(u * 2.5 + 3, v * 2.5, semilla, 4) - 0.5, qy = fbm(u * 2.5, v * 2.5 + 5, semilla, 4) - 0.5;
  const fase = th * A.brazos - Math.log(rr) * A.enrollado + qx * A.perturbacion;
  const floculento = fbm(u * 6 + qx, v * 6 + qy, semilla + 9, 4);
  const brazo = Math.pow(0.5 + 0.5 * Math.cos(fase), 1.5) * (0.55 + 0.7 * floculento);
  const bulbo = Math.exp(-7.67 * (Math.pow(rr / 0.13, 0.25) - 1)) * 0.06;
  const disco = Math.exp(-r / 0.24) * (1 - paso(0.82, 0.98, r));
  const anillo = Math.exp(-Math.pow((r - A.anillo.radio + qy * 0.08) / A.anillo.ancho, 2));
  const grano = fbm(u * 22 + qx, v * 22 + qy, semilla + 2, 4), fino = fbm(u * 60, v * 60, semilla + 7, 2);
  const cumulos = Math.pow(Math.max(0, grano - 0.55) * 2.2, 2) * (0.6 + fino);
  const enBrazos = paso(0.1, 0.26, r);
  const discoViejo = disco * 0.62 * (0.7 + 0.45 * mixto(1, brazo, enBrazos)) * (0.85 + grano * 0.3);
  const jovenes = disco * brazo * (0.3 + cumulos * 1.4) * paso(0.18, 0.4, r) + anillo * (0.24 + cumulos * 1.0);
  const nudo = Math.pow(Math.max(0, fbm(u * 46 + semilla, v * 46, 3.1, 3) - 0.6) * 4.5, 2.2) * (brazo * disco * 2 + anillo) * paso(0.2, 0.35, r);
  const fil = 1 - Math.abs(fbm(u * 9 + qx * 2, v * 9 + qy * 2, semilla + 4, 5) * 2 - 1);
  const carril = Math.pow(0.5 + 0.5 * Math.cos(fase + 0.9), 12) * paso(0.12, 0.25, r) * (1 - paso(0.78, 0.95, r));
  const polvo = Math.min(0.75, carril * paso(0.45, 0.85, fil) * 0.6 + paso(0.72, 0.95, fil) * disco * 0.9 * paso(0.15, 0.3, r) + anillo * Math.pow(fil, 4) * 0.45);
  return { r, fase, bulbo, disco, brazo, anillo, discoViejo, jovenes, nudo, cumulos, polvo };
}

// Dos galaxias en fusión (como las Antenas): núcleos, cuerpos deformados, zona central, colas de marea.
const colaBezier = (u, v, p0, p1, p2, ancho) => { let m = 9, tt = 0; for (let k = 0; k <= 48; k++) { const t = k / 48, a0 = (1 - t) * (1 - t), a1 = 2 * (1 - t) * t, a2 = t * t;
  const dx = u - (a0 * p0[0] + a1 * p1[0] + a2 * p2[0]), dy = v - (a0 * p0[1] + a1 * p1[1] + a2 * p2[1]), dd = (dx * dx + dy * dy) / Math.pow(ancho * (0.6 + t * 1.4), 2); if (dd < m) { m = dd; tt = t; } } return Math.exp(-m) * (1 - tt * 0.75); };
export function componentesColision(u0, v0, { fbm }, semilla = 9) {
  const qx = fbm(u0 * 3 + 1, v0 * 3, semilla, 4) - 0.5, qy = fbm(u0 * 3, v0 * 3 + 7, semilla, 4) - 0.5;
  const u = u0 + qx * 0.08, v = v0 + qy * 0.08, C = COLISION;
  let nucleos = 0, cuerpo = 0;
  for (const { c: [cx, cy], angulo: a } of C.nucleos) {
    const du = u - cx, dv = v - cy, eu = du * Math.cos(a) + dv * Math.sin(a), ev = -du * Math.sin(a) + dv * Math.cos(a);
    const rn = Math.max(Math.hypot(u - cx, (v - cy) * 1.2), 0.01), re = Math.hypot(eu, ev * 2.1);
    nucleos += Math.exp(-rn / 0.028) * 1.2 + Math.exp(-rn / 0.08) * 0.35;
    cuerpo += Math.exp(-re / 0.16);
  }
  const centro = Math.exp(-Math.hypot(u - 0.01, v + 0.01) / 0.16);
  const grano = fbm(u * 26, v * 26, semilla + 3, 4), fino = fbm(u * 70, v * 70, semilla + 5, 2);
  const cumulos = Math.pow(Math.max(0, grano - 0.52) * 2.3, 2) * (0.5 + fino);
  const nudos = Math.pow(Math.max(0, fbm(u * 40 + semilla, v * 40, 4.5, 3) - 0.6) * 4.2, 2.2) * (centro * 1.4 + cuerpo * 0.5);
  const colas = C.colas.reduce((s, [p0, p1, p2]) => s + colaBezier(u, v, p0, p1, p2, C.anchoCola), 0);
  const fil = 1 - Math.abs(fbm(u * 8, v * 8, semilla + 6, 5) * 2 - 1);
  const polvo = Math.min(0.7, paso(0.6, 0.92, fil) * (centro * 1.3 + cuerpo * 0.5));
  return { u, v, nucleos, cuerpo, centro, grano, cumulos, nudos, colas, polvo };
}
