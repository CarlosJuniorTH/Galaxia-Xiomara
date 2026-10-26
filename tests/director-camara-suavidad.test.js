// Suavidad global del director de cámara (js/util/directorCamara.js): Carlos pidió movimientos «lentos, suaves,
// siguiendo con suavidad; nada de girar a un lado y luego a otro».
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPista, muestrearCamara, esfericasACartesianas, pistaDe, crearMuestra, crearSuavizador, segundoAdelantado, siguienteCorte, CORTE_MIN, SUAVIDAD } from '../js/util/directorCamara.js';

const GIGANTES = ['pulsar', 'cuasar', 'deneb', 'ton618', 'sagitario', 'supernova'];
const unit = s => esfericasACartesianas([s.pos[0], s.pos[1], 1]);
const angulo = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;

// El director a 60 cuadros por segundo, como index.js: la pista adelantada (sin cruzar cortes) pasa por el filtro; en cada
// corte el filtro salta con ella. Velocidades y aceleraciones de la cámara y su error frente a la pista en cada plano.
function simular(pista, { fps = 60 } = {}) {
  const P = normalizarPista(pista), dt = 1 / fps, fin = P.at(-1).t + 1, f = crearSuavizador(), raw = crearMuestra(), out = crearMuestra();
  f.fijar(muestrearCamara(P, 0, crearMuestra()));
  const r = { vAng: 0, aAng: 0, vDist: 0, vFov: 0, vGiro: 0, errores: [], cortes: 0 };
  let prev = null, vPrev = null, tPrev = 0;
  for (let t = dt; t <= fin; t += dt) {
    let corte = false;
    if (siguienteCorte(P, tPrev) <= t) { f.fijar(muestrearCamara(P, t, crearMuestra())); corte = true; r.cortes++; }
    muestrearCamara(P, segundoAdelantado(P, t), raw);
    f.paso(raw, dt, out);
    const cur = { u: unit(out), d: out.pos[2], fov: out.fov, giro: out.giro };
    if (prev && !corte) {
      const v = angulo(prev.u, cur.u) / dt;
      r.vAng = Math.max(r.vAng, v); if (vPrev !== null) r.aAng = Math.max(r.aAng, Math.abs(v - vPrev) / dt);
      r.vDist = Math.max(r.vDist, Math.abs(Math.log(cur.d / prev.d)) / dt); r.vFov = Math.max(r.vFov, Math.abs(cur.fov - prev.fov) / dt); r.vGiro = Math.max(r.vGiro, Math.abs(cur.giro - prev.giro) / dt);
      vPrev = v;
    } else vPrev = null;
    for (const q of P) if (q.t > tPrev && q.t <= t) r.errores.push(angulo(cur.u, unit(muestrearCamara(P, q.t, crearMuestra()))));
    prev = cur; tPrev = t;
  }
  return r;
}

test('cortes poco frecuentes: a menos de CORTE_MIN del anterior pasan a ser suaves (y el plano del mismo segundo sobra)', () => {
  const p = normalizarPista([{ t: 0, pos: [0, 0, 1], curva: 'corte' }, { t: 2, pos: [10, 0, 1] }, { t: 2, pos: [90, 0, 1], curva: 'corte' }, { t: 5, pos: [0, 0, 2], curva: 'corte' }, { t: 7, pos: [5, 0, 2] }, { t: 7, pos: [40, 0, 1], curva: 'corte' }, { t: 12, pos: [40, 0, 1], curva: 'corte' }]);
  assert.deepEqual(p.map(q => [q.t, q.curva, q.pos[0]]), [[0, 'corte', 0], [2, 'suave', 10], [2, 'corte', 90], [5, 'suave', 0], [7, 'suave', 40], [12, 'corte', 40]]);
  for (const id of GIGANTES) {
    const q = pistaDe(id); if (!q) continue;
    const cortes = q.filter((x, i) => i > 0 && (x.curva === 'corte' || x.t <= q[i - 1].t)).map(x => x.t);
    for (let i = 1; i < cortes.length; i++) assert.ok(cortes[i] - cortes[i - 1] >= CORTE_MIN, `${id}: cortes en ${cortes}`);
  }
});

test('interpolación monótona: entre dos planos ningún canal se pasa de largo (no gira a un lado y luego al otro)', () => {
  const P = normalizarPista([{ t: 0, pos: [0, 0, 1] }, { t: 1, pos: [60, 10, 0.5], curva: 'lineal' }, { t: 1.4, pos: [62, 30, 2], curva: 'lineal' }, { t: 5, pos: [-20, 0, 1], curva: 'lineal' }, { t: 6, pos: [-25, 5, 1.1], curva: 'lineal' }]);
  for (let i = 0; i + 1 < P.length; i++) for (let t = P[i].t; t <= P[i + 1].t; t += 0.01) {
    const m = muestrearCamara(P, t);
    for (let k = 0; k < 3; k++) { const lo = Math.min(P[i].pos[k], P[i + 1].pos[k]) - 1e-9, hi = Math.max(P[i].pos[k], P[i + 1].pos[k]) + 1e-9; assert.ok(m.pos[k] >= lo && m.pos[k] <= hi, `canal ${k} en ${t.toFixed(2)}: ${m.pos[k]}`); }
  }
  // Y en las pistas reales tampoco.
  for (const id of GIGANTES) {
    const Q = pistaDe(id); if (!Q) continue;
    for (let i = 0; i + 1 < Q.length; i++) { if (Q[i + 1].t <= Q[i].t) continue; for (let t = Q[i].t; t <= Q[i + 1].t; t += 0.05) { const m = muestrearCamara(Q, t); for (let k = 0; k < 3; k++) assert.ok(m.pos[k] >= Math.min(Q[i].pos[k], Q[i + 1].pos[k]) - 1e-6 && m.pos[k] <= Math.max(Q[i].pos[k], Q[i + 1].pos[k]) + 1e-6, `${id} canal ${k} en ${t.toFixed(2)}`); } }
  }
});

test('el filtro no se pasa de largo, respeta su velocidad y su aceleración máximas y el alabeo cambia muy despacio', () => {
  const f = crearSuavizador(), a = crearMuestra(), b = crearMuestra(), o = crearMuestra();
  f.fijar(a); b.pos[0] = 120; b.pos[2] = 3; b.giro = 30;
  let maxAz = 0, v = 0, maxV = 0, maxA = 0, antes = 0, maxG = 0, g0 = 0;
  for (let i = 0; i < 60 * 25; i++) {
    f.paso(b, 1 / 60, o);
    const nv = (o.pos[0] - antes) * 60; maxV = Math.max(maxV, Math.abs(nv)); if (i > 0) maxA = Math.max(maxA, Math.abs(nv - v) * 60);
    v = nv; antes = o.pos[0]; maxAz = Math.max(maxAz, o.pos[0]); maxG = Math.max(maxG, Math.abs(o.giro - g0) * 60); g0 = o.giro;
  }
  assert.ok(maxAz <= 120 + 1e-6, `sin pasarse: ${maxAz}`);
  assert.ok(Math.abs(o.pos[0] - 120) < 0.05 && Math.abs(o.pos[2] - 3) < 0.01 && Math.abs(o.giro - 30) < 0.1, 'llega');
  assert.ok(maxV <= SUAVIDAD.angular.v + 1e-6 && maxA <= SUAVIDAD.angular.a * 1.05, `v ${maxV.toFixed(1)} a ${maxA.toFixed(1)}`);
  assert.ok(maxG <= SUAVIDAD.giro.v + 1e-6, `giro ${maxG}`);
  // El azimut por el camino corto: de 350 a 10 no da la vuelta entera.
  const g = crearSuavizador(); a.pos[0] = 350; g.fijar(a); b.pos[0] = 10; for (let i = 0; i < 600; i++) g.paso(b, 1 / 60, o);
  assert.ok(Math.abs(((o.pos[0] % 360) + 360) % 360 - 10) < 0.1);
});

test('en las pistas reales la cámara va lenta y suave (velocidad y aceleración acotadas) y llega a sus planos a tiempo', () => {
  for (const id of GIGANTES) {
    const p = pistaDe(id); if (!p) continue;
    const r = simular(p), e = r.errores.slice().sort((a, b) => a - b), mediana = e[Math.floor(e.length / 2)];
    console.log(`  ${id}: v ${r.vAng.toFixed(1)}°/s, a ${r.aAng.toFixed(1)}°/s², zoom ${r.vDist.toFixed(2)}/s, fov ${r.vFov.toFixed(1)}°/s, alabeo ${r.vGiro.toFixed(1)}°/s, cortes ${r.cortes}, error en los planos: mediana ${mediana.toFixed(1)}°, máx ${e.at(-1).toFixed(1)}°`);
    assert.ok(r.vAng <= SUAVIDAD.angular.v * Math.SQRT2 * 1.05, `${id}: velocidad angular ${r.vAng}`);
    assert.ok(r.aAng <= SUAVIDAD.angular.a * Math.SQRT2 * 1.5, `${id}: aceleración angular ${r.aAng}`);
    assert.ok(r.vDist <= SUAVIDAD.distancia.v * 1.05 && r.vFov <= SUAVIDAD.fov.v * 1.05 && r.vGiro <= SUAVIDAD.giro.v * 1.05, `${id}: zoom ${r.vDist}, fov ${r.vFov}, alabeo ${r.vGiro}`);
    assert.ok(mediana < 6, `${id}: llega a sus planos a tiempo con la música (mediana ${mediana.toFixed(1)}°)`);
  }
});
