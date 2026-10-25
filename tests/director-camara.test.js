import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPista, muestrearCamara, mezclarMuestras, aplicarCurva, esfericasACartesianas, cartesianasAEsfericas, pistaDe, duracionPista, crearMuestra, FOV_BASE, LIMITES } from '../js/util/directorCamara.js';
import { ESCENAS_GIGANTES } from '../js/util/escenasGigantes.js';

const cerca = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const PISTA = [
  { t: 0, pos: [30, 10, 3], mira: [0, 0, 0], fov: 50, curva: 'corte' },
  { t: 4, pos: [80, 25, 1.6], mira: [0, 0.2, 0], fov: 40, curva: 'suave' },
  { t: 6, pos: [100, 20, 1.2], curva: 'lineal' },
  { t: 8, pos: [120, 15, 0.8], curva: 'lineal' },
  { t: 10, pos: [0, 0, 2], fov: 70, curva: 'corte', giro: 12 },
  { t: 12, pos: [20, 5, 1.5], curva: 'rapida' }
];

test('la pista se ordena, hereda lo que falta y descarta planos inválidos', () => {
  const p = normalizarPista([{ t: 5, pos: [10, 0, 1] }, { t: 1, pos: [0, 0, 2], fov: 45, mira: [0, 1, 0] }, { t: 3, pos: [NaN, 0, 1] }, null, { t: 2 }]);
  assert.equal(p.length, 2);
  assert.deepEqual(p.map(x => x.t), [1, 5]);
  assert.equal(p[1].fov, 45); assert.deepEqual(p[1].mira, [0, 1, 0]); assert.equal(p[1].curva, 'suave'); assert.equal(p[0].giro, 0);
  assert.equal(normalizarPista([]), null); assert.equal(normalizarPista(null), null);
  assert.equal(normalizarPista(PISTA), normalizarPista(PISTA), 'se normaliza una vez');
  assert.equal(duracionPista(PISTA), 12);
});

test('en cada plano la cámara está exactamente en él, y fuera de la pista se queda en el primero o el último', () => {
  for (const plano of normalizarPista(PISTA)) {
    const m = muestrearCamara(PISTA, plano.t);
    for (let k = 0; k < 3; k++) assert.ok(cerca(m.pos[k], plano.pos[k]), `pos en ${plano.t}`);
    assert.ok(cerca(m.fov, plano.fov)); assert.ok(cerca(m.giro, plano.giro));
  }
  assert.deepEqual(muestrearCamara(PISTA, -3).pos, [30, 10, 3]);
  assert.deepEqual(muestrearCamara(PISTA, 99).pos, [20, 5, 1.5]);
});

test('corte: el plano anterior sigue hasta el segundo exacto y salta seco', () => {
  const antes = muestrearCamara(PISTA, 9.999), despues = muestrearCamara(PISTA, 10);
  assert.ok(cerca(antes.pos[0], 120, 1e-9) && cerca(despues.pos[0], 0) && despues.giro === 12);
  // Dos planos en el mismo segundo: se salta del uno al otro.
  const doble = [{ t: 0, pos: [0, 0, 1] }, { t: 2, pos: [40, 0, 1] }, { t: 2, pos: [-90, 0, 3] }, { t: 4, pos: [-80, 0, 3] }];
  assert.ok(muestrearCamara(doble, 1.99).pos[0] > 39 && cerca(muestrearCamara(doble, 2).pos[0], -90));
});

test('suave se posa (sin velocidad en los extremos), rápida sale disparada y lineal va a velocidad constante', () => {
  assert.equal(aplicarCurva('suave', 0), 0); assert.equal(aplicarCurva('suave', 1), 1); assert.ok(aplicarCurva('suave', 0.05) < 0.01);
  assert.ok(aplicarCurva('rapida', 0.1) > 0.3 && aplicarCurva('rapida', 1) === 1);
  assert.equal(aplicarCurva('corte', 0.99), 0); assert.equal(aplicarCurva('corte', 1), 1);
  const v = t => (muestrearCamara(PISTA, t + 0.01).pos[0] - muestrearCamara(PISTA, t).pos[0]) / 0.01;
  assert.ok(Math.abs(v(0)) < 1 && Math.abs(v(3.989)) < 1 && v(2) > 15, 'suave: sale y se posa parada (de 0 a 4)');
  // Entre 6 y 8 (lineal, encadenado con otro lineal): sin tirones y velocidad casi constante.
  const vs = [6.2, 6.6, 7, 7.4, 7.8].map(v);
  assert.ok(Math.max(...vs) - Math.min(...vs) < 4, `lineal ${vs.map(x => x.toFixed(1))}`);
  assert.ok(v(10.02) > v(11.5) * 3, 'rápida: frena al llegar');
});

test('sin saltos fuera de los cortes: cada 1/60 s se mueve poco', () => {
  for (let t = 0; t < 12; t += 1 / 60) {
    if (t < 10 && t + 1 / 60 >= 10) continue;   // el corte
    const a = muestrearCamara(PISTA, t, crearMuestra()), b = muestrearCamara(PISTA, t + 1 / 60, crearMuestra());
    assert.ok(Math.abs(a.pos[0] - b.pos[0]) < 2.5 && Math.abs(a.pos[2] - b.pos[2]) < 0.06 && Math.abs(a.fov - b.fov) < 1, `en ${t.toFixed(2)}`);
  }
});

test('la distancia, la elevación y el fov nunca se salen de lo posible', () => {
  const loca = [{ t: 0, pos: [0, 85, 0.05], curva: 'lineal' }, { t: 0.2, pos: [0, -85, 4], fov: 150, curva: 'lineal' }, { t: 0.4, pos: [0, 89, 0.03], fov: 2, curva: 'lineal' }];
  for (let t = 0; t <= 0.4; t += 0.005) { const m = muestrearCamara(loca, t); assert.ok(m.pos[2] >= 0.02 && Math.abs(m.pos[1]) <= 89.5 && m.fov >= 5 && m.fov <= 120); }
});

test('muestrear no crea memoria nueva: escribe en la muestra que se le pasa', () => {
  const s = crearMuestra(), pos = s.pos;
  assert.equal(muestrearCamara(PISTA, 3, s), s); assert.equal(s.pos, pos);
});

test('mezclar va por el camino corto del azimut', () => {
  const a = { pos: [350, 0, 1], mira: [0, 0, 0], fov: 60, giro: 0 }, b = { pos: [10, 20, 2], mira: [0, 1, 0], fov: 40, giro: 10 };
  const m = mezclarMuestras(a, b, 0.5);
  assert.ok(cerca(m.pos[0], 360) && cerca(m.pos[1], 10) && cerca(m.pos[2], 1.5) && cerca(m.fov, 50) && cerca(m.mira[1], 0.5) && cerca(m.giro, 5));
  assert.deepEqual(mezclarMuestras(a, b, 1).pos.map(x => +x.toFixed(6) % 360), [10, 20, 2]);
});

test('esféricas ↔ cartesianas: az 0 / el 0 es hacia casa (z), el azimut gira a la derecha (x) y la elevación sube (y)', () => {
  const v = esfericasACartesianas([0, 0, 2]); assert.ok(cerca(v[2], 2) && cerca(v[0], 0) && cerca(v[1], 0));
  assert.ok(cerca(esfericasACartesianas([90, 0, 1])[0], 1)); assert.ok(cerca(esfericasACartesianas([0, 90, 1])[1], 1));
  for (const p of [[37, 12, 1.4], [-120, -40, 0.7], [179, 80, 3]]) {
    const q = cartesianasAEsfericas(esfericasACartesianas(p));
    for (let k = 0; k < 3; k++) assert.ok(cerca(q[k], p[k], 1e-9), `${p} → ${q}`);
  }
});

test('cada gigante encuentra su pista (o ninguna) y las de las escenas están dentro de su canción', () => {
  assert.ok(pistaDe('pulsar')?.length >= 2, 'el púlsar trae una pista de ejemplo');
  for (const [id, c] of Object.entries(ESCENAS_GIGANTES)) {
    const p = pistaDe(id); if (!p) continue;
    assert.ok(p[0].t >= 0 && p.at(-1).t <= c.duracion + 1e-9, id);
    // Siempre fuera del gigante: nunca más cerca que el límite de zoom de cerca.
    for (let t = 0; t <= c.duracion; t += 0.1) assert.ok(muestrearCamara(p, t).pos[2] >= LIMITES.min, `${id} en ${t.toFixed(1)}`);
  }
  assert.equal(pistaDe('nada'), null);
  assert.ok(pistaDe('pulsar', { camara: [{ t: 0, pos: [0, 0, 1] }] }).length === 1, 'la configuración de la escena puede traer otra');
  assert.equal(FOV_BASE, 60);
});
