// Identidad entre niveles de detalle: las estrellas 3D de cada galaxia (de cerca) reproducen su
// imagen (de lejos). Se compara con la imagen REAL que pinta cada generador (incluidos Andrómeda y
// la colisión), no solo con la fórmula de las estrellas: distribución de luz, orientación,
// y los rasgos principales (brazos, barra, anillo, núcleos, colas de marea, polvo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { GENERADORES } from '../js/escena/texturasPlaneta.js';
import { DESCRIPTORES, ANDROMEDA, COLISION, componentesAndromeda, componentesColision } from '../js/escena/formasGalaxia.js';
import { estrellaGalaxia } from '../js/escena/campoGalaxias.js';
import { crearRuido } from '../js/util/ruido.js';
import { generador } from '../js/util/azarSemilla.js';

const L = 96, G = 16;
function imagen(d) {
  const datos = d.especial ? GENERADORES[d.especial]({ semilla: d.semilla, ancho: L, alto: L }) : GENERADORES.galaxia({ tipo: d.tipo, semilla: d.semilla, ancho: L, alto: L, brazos: d.brazos, enrollado: d.enrollado, paleta: d.paleta });
  const lum = new Float64Array(G * G);
  for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) { const j = (y * L + x) * 4; const l = (datos[j] + datos[j + 1] + datos[j + 2]) / 765; lum[Math.floor(y / L * G) * G + Math.floor(x / L * G)] += Math.pow(l, d.especial ? 1.25 : 1 / 0.85); }   // deshace la curva de cada generador
  return lum;
}
function estrellas(d, n = 30000) {
  const azar = Math.random; Math.random = generador(7);   // reproducible
  try { return Array.from({ length: n }, () => estrellaGalaxia(d)); } finally { Math.random = azar; }
}
function histograma(pts) { const h = new Float64Array(G * G); for (const [u, v] of pts) { const x = Math.floor((u + 1) / 2 * G), y = Math.floor((v + 1) / 2 * G); if (x >= 0 && x < G && y >= 0 && y < G) h[y * G + x]++; } return h; }
const pearson = (a, b) => { const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n; let ab = 0, aa = 0, bb = 0; for (let i = 0; i < n; i++) { ab += (a[i] - ma) * (b[i] - mb); aa += (a[i] - ma) ** 2; bb += (b[i] - mb) ** 2; } return ab / Math.sqrt(aa * bb); };
// Eje principal de una distribución (momentos de segundo orden), en grados [0, 180).
function eje(peso) { let s = 0, mx = 0, my = 0; for (let i = 0; i < G * G; i++) { const x = i % G, y = (i / G) | 0; s += peso[i]; mx += x * peso[i]; my += y * peso[i]; } mx /= s; my /= s; let xx = 0, yy = 0, xy = 0; for (let i = 0; i < G * G; i++) { const x = i % G - mx, y = ((i / G) | 0) - my; xx += x * x * peso[i]; yy += y * y * peso[i]; xy += x * y * peso[i]; } return { angulo: ((Math.atan2(2 * xy, xx - yy) / 2) * 180 / Math.PI + 180) % 180, alargamiento: Math.sqrt((xx + yy + Math.hypot(xx - yy, 2 * xy)) / Math.max(1e-9, xx + yy - Math.hypot(xx - yy, 2 * xy))) }; }

test('cada galaxia: la luz de sus estrellas 3D se reparte como la de su imagen', () => {
  for (const d of DESCRIPTORES) {
    if (d.tipo === 'canto') continue;   // ese tipo de imagen no se usa en el campo (se usa la espiral de canto)
    const r = pearson(imagen(d), histograma(estrellas(d)));
    assert.ok(r > 0.9, `${d.especial || d.tipo}/${d.semilla}: correlación imagen-estrellas ${r.toFixed(3)}`);
  }
});

// Píxeles de la imagen real (u, v, luz lineal) y estrellas (u, v, 1): se comparan con las mismas medidas.
const LP = 128;
function pixeles(d) {
  const datos = d.especial ? GENERADORES[d.especial]({ semilla: d.semilla, ancho: LP, alto: LP }) : GENERADORES.galaxia({ tipo: d.tipo, semilla: d.semilla, ancho: LP, alto: LP, brazos: d.brazos, enrollado: d.enrollado, paleta: d.paleta });
  const out = []; for (let y = 0; y < LP; y++) for (let x = 0; x < LP; x++) { const j = (y * LP + x) * 4; out.push([(x + 0.5) / LP * 2 - 1, (y + 0.5) / LP * 2 - 1, Math.pow((datos[j] + datos[j + 1] + datos[j + 2]) / 765, d.especial ? 1.25 : 1 / 0.85)]); }   // deshace la curva de cada generador
  return out;
}
const comoPeso = pts => pts.map(([u, v]) => [u, v, 1]);
const fraccion = (pts, f) => { let s = 0, t = 0; for (const [u, v, w] of pts) { t += w; if (f(u, v)) s += w; } return s / t; };
const ejeEn = (pts, rMin, rMax) => { let xx = 0, yy = 0, xy = 0; for (const [u, v, w] of pts) { const r = Math.hypot(u, v); if (r < rMin || r > rMax) continue; xx += u * u * w; yy += v * v * w; xy += u * v * w; } return { ang: Math.atan2(2 * xy, xx - yy) / 2, exc: Math.hypot(xx - yy, 2 * xy) / (xx + yy) }; };
const difAng = (a, b) => { const d = Math.abs(a - b) % Math.PI; return Math.min(d, Math.PI - d); };
const mediaPeso = (pts, f, g) => { let s = 0, t = 0; for (const [u, v, w] of pts) if (f(u, v)) { s += g(u, v) * w; t += w; } return s / t; };

test('orientación y silueta: ejes y alargamiento de las estrellas coinciden con la imagen, por zonas', () => {
  for (const d of DESCRIPTORES.filter(d => d.tipo !== 'canto')) {
    const img = pixeles(d), est = comoPeso(estrellas(d));
    for (const [r0, r1] of [[0.05, 0.3], [0.3, 0.9]]) {
      const a = ejeEn(img, r0, r1), b = ejeEn(est, r0, r1);
      assert.ok(Math.abs(a.exc - b.exc) < 0.08, `${d.especial || d.tipo}/${d.semilla} r ${r0}–${r1}: excentricidad ${a.exc.toFixed(2)} frente a ${b.exc.toFixed(2)}`);
      if (a.exc > 0.12) assert.ok(difAng(a.ang, b.ang) < 0.12, `${d.especial || d.tipo}/${d.semilla} r ${r0}–${r1}: eje ${a.ang.toFixed(2)} frente a ${b.ang.toFixed(2)} rad`);
    }
  }
});

test('barrada: la barra está en la imagen y en las estrellas con el mismo ángulo', () => {
  for (const d of DESCRIPTORES.filter(d => d.tipo === 'barrada')) {
    const a = ejeEn(pixeles(d), 0.0, 0.18), b = ejeEn(comoPeso(estrellas(d)), 0.0, 0.18);
    assert.ok(difAng(a.ang, b.ang) < 0.12 && a.exc > 0.1, `${d.semilla}: barra ${a.ang.toFixed(2)} (imagen, exc ${a.exc.toFixed(2)}) frente a ${b.ang.toFixed(2)} rad`);
  }
});

test('Andrómeda: brazos (enrollamiento 7,2 y perturbación), anillo y polvo como en su imagen', () => {
  const d = DESCRIPTORES.find(d => d.especial === 'andromeda'), R = crearRuido(d.semilla), img = pixeles(d), est = comoPeso(estrellas(d));
  assert.equal(d.enrollado, ANDROMEDA.enrollado, 'el descriptor y la imagen usan el mismo enrollamiento');
  const banda = (u, v) => { const r = Math.hypot(u, v); return r > 0.2 && r < 0.5; }, cos = (u, v) => Math.cos(componentesAndromeda(u, v, R, d.semilla).fase);
  const ci = mediaPeso(img, banda, cos), ce = mediaPeso(est, banda, cos);
  assert.ok(ci > 0.02 && Math.abs(ci - ce) < 0.02, `fase de los brazos: imagen ${ci.toFixed(3)}, estrellas ${ce.toFixed(3)}`);
  // Con el enrollamiento antiguo (4,0) la fase NO coincidiría: la prueba distingue.
  const cos4 = (u, v) => { const k = componentesAndromeda(u, v, R, d.semilla); return Math.cos(k.fase + Math.log(Math.max(k.r, 0.004)) * (ANDROMEDA.enrollado - 4)); };
  assert.ok(mediaPeso(img, banda, cos4) < ci - 0.03, 'el enrollamiento 4,0 no describe la imagen');
  const anillo = (u, v) => Math.abs(Math.hypot(u, v) - ANDROMEDA.anillo.radio) < ANDROMEDA.anillo.ancho;
  const ai = fraccion(img, anillo), ae = fraccion(est, anillo);
  assert.ok(Math.abs(ae / ai - 1) < 0.2, `luz en el anillo: imagen ${(ai * 100).toFixed(1)} %, estrellas ${(ae * 100).toFixed(1)} %`);
  const polvo = (u, v) => componentesAndromeda(u, v, R, d.semilla).polvo > 0.4;
  const pi = fraccion(img, polvo), pe = fraccion(est, polvo);
  assert.ok(Math.abs(pe - pi) < 0.03, `luz en los carriles de polvo: imagen ${(pi * 100).toFixed(1)} %, estrellas ${(pe * 100).toFixed(1)} %`);
});

test('colisión: núcleos, colas de marea con su curvatura y polvo como en su imagen', () => {
  const d = DESCRIPTORES.find(d => d.especial === 'colision'), R = crearRuido(d.semilla), img = pixeles(d), pts = estrellas(d), est = comoPeso(pts);
  for (const { c: [cx, cy] } of COLISION.nucleos) {
    const f = (u, v) => Math.hypot(u - cx, v - cy) < 0.06, a = fraccion(img, f), b = fraccion(est, f);
    assert.ok(Math.abs(b / a - 1) < 0.25, `núcleo (${cx}, ${cy}): imagen ${(a * 100).toFixed(1)} %, estrellas ${(b * 100).toFixed(1)} %`);
  }
  for (const [p0, p1, p2] of COLISION.colas) {
    const curva = []; for (let t = 0.35; t <= 0.95; t += 0.05) curva.push([(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]);
    const cerca = (u, v) => curva.some(([x, y]) => Math.hypot(u - x, v - y) < 0.07);
    const a = fraccion(img, cerca), b = fraccion(est, cerca);
    assert.ok(a > 0.005 && Math.abs(b / a - 1) < 0.3, `cola hacia (${p2}): imagen ${(a * 100).toFixed(2)} %, estrellas ${(b * 100).toFixed(2)} %`);
    const espejo = (u, v) => curva.some(([x, y]) => Math.hypot(u + x, v - y) < 0.07);   // reflejada: allí no hay cola
    assert.ok(fraccion(est, espejo) < b * 0.5, 'la cola tiene su lado: no es un halo simétrico');
  }
  const polvo = (u, v) => componentesColision(u, v, R, d.semilla).polvo > 0.45;
  const pi = fraccion(img, polvo), pe = fraccion(est, polvo);
  assert.ok(Math.abs(pe - pi) < 0.03, `luz en los filamentos de polvo: imagen ${(pi * 100).toFixed(1)} %, estrellas ${(pe * 100).toFixed(1)} %`);
});
