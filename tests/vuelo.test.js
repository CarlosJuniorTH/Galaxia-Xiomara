// Vuelo por fases (A selección, B maniobra, C alineación, D ruptura, E crucero, F aproximación,
// G llegada) por el universo real del catálogo: maniobra segura, alineación antes del salto, crucero
// recto, mirando siempre al destino, más rápido que la luz, con el paisaje del camino pasando por
// los bordes; velocidad continua, saltar, modalidad breve y movimiento reducido.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { planificarVuelo, distanciaAlCorredor, FASES } from '../js/util/vuelo.js';
import { holgura } from '../js/util/ruta.js';
import { universoCatalogo, distanciaSegmento } from '../js/data/catalogo.js';
import { aMal, LLEGADA_GIGANTE, SEMIEJES_CORAZON } from '../js/data/escalaCosmica.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const U = universoCatalogo(THREE), D = U.destinos;
const cercania = p => { let m = Infinity; for (const g of U.galaxias) m = Math.min(m, g.pos.distanceTo(p) - g.r * 1.1); for (const n of U.nebulosas) m = Math.min(m, n.pos.distanceTo(p) - n.r * 1.3); return m; };
const paisaje = U.galaxias.filter(g => g.paisaje === 'supernova');
const GALAXIA = { c: v(0, 0, 0), r: 1600, llegada: true };
const enEncuadre = (centro, desde, d) => centro.clone().add(desde.clone().sub(centro).normalize().multiplyScalar(d));
const CASA = v(1300, 2700, 5700);
const LS = LLEGADA_GIGANTE.supernova, LT = LLEGADA_GIGANTE.ton618, RS = SEMIEJES_CORAZON[0], RT = 23059;
const ESCENARIOS = {
  'casa → supernova (100 Mal)': { desde: CASA, miraDesde: v(0, 70, 0), centro: D.supernova, hasta: enEncuadre(D.supernova, CASA, LS), obstaculos: [GALAXIA, { c: v(0, 0, 0), r: 420 }] },
  'supernova → casa': { desde: enEncuadre(D.supernova, CASA, LS), miraDesde: D.supernova, hasta: CASA, mira: v(0, 70, 0), centro: v(0, 0, 0), rAprox: 12000, obstaculos: [GALAXIA, { c: D.supernova, r: RS }] },
  'supernova → TON 618': { desde: enEncuadre(D.supernova, CASA, LS), miraDesde: D.supernova, centro: D.ton618, hasta: enEncuadre(D.ton618, D.supernova, LT), obstaculos: [{ c: D.ton618, r: RT }, { c: D.supernova, r: RS }] },
  'TON 618 → supernova': { desde: D.ton618.clone().add(v(0, 3000, LT)), miraDesde: D.ton618, centro: D.supernova, hasta: enEncuadre(D.supernova, D.ton618, LS), obstaculos: [{ c: D.ton618, r: RT }, { c: D.supernova, r: RS }] },
  'detrás de un cuerpo que bloquea el corredor': { desde: v(0, 0, 9000), miraDesde: v(0, 0, 0), hasta: v(0, 0, -40000), centro: v(0, 0, -45000), obstaculos: [{ c: v(0, 0, 3000), r: 2500 }], sinCatalogo: true }
};
const planes = {};
const planear = (nombre, extra = {}) => { const e = ESCENARIOS[nombre], mira = e.mira ?? e.centro; return planificarVuelo({ ...e, mira, cercania: e.sinCatalogo ? null : cercania, ...extra }); };

for (const [nombre, e] of Object.entries(ESCENARIOS)) {
  test(`vuelo ${nombre}: fases, alineación, corredor recto, velocidad continua y llegada`, () => {
    const mira = e.mira ?? e.centro, plan = planes[nombre] = planear(nombre);
    // Toda la trayectoria libra los obstáculos y las galaxias del catálogo cercanas al corredor.
    const cercanas = e.sinCatalogo ? [] : U.galaxias.filter(g => distanciaSegmento(g.pos, plan.recta.v1, plan.recta.v2) < 60000 && g.pos.length() > 3000).map(g => ({ c: g.pos, r: g.r * 1.1 }));
    const h = holgura(plan.trayectoria(), e.desde, e.hasta, [...e.obstaculos, ...cercanas], 6000);
    assert.ok(h.minimo >= 1, `${nombre}: trayectoria libre (${h.minimo.toFixed(2)}) — ${plan.motivo}`);
    const N = 2400, dt = plan.duracion / N, muestras = [];
    for (let i = 0; i <= N; i++) muestras.push({ t: i * dt, ...plan.evaluar(i * dt) });
    // Orden de fases (A → G) y fases del viaje presentes.
    let ultima = 0; for (const m of muestras) { const k = FASES.indexOf(m.fase); assert.ok(k >= ultima, `${nombre}: fase ${m.fase} después de ${FASES[ultima]}`); ultima = k; }
    for (const f of ['ruptura', 'crucero', 'aproximacion', 'llegada']) assert.ok(muestras.some(m => m.fase === f), `${nombre}: tiene ${f}`);
    // Sin estelas hasta el salto.
    for (const m of muestras) if (['seleccion', 'maniobra', 'alineacion'].includes(m.fase)) assert.equal(m.corriente, 0, `${nombre}: estelas durante ${m.fase}`);
    // Alineada antes del salto: al empezar la ruptura, la mirada apunta por el corredor.
    const r0 = muestras.find(m => m.fase === 'ruptura'), dirCorr = plan.recta.v2.clone().sub(plan.recta.v1).normalize();
    assert.ok(r0.mira.clone().sub(r0.pos).normalize().angleTo(dirCorr) < 0.02, `${nombre}: alineación al saltar`);
    // Crucero rectilíneo; el avance (punto de fuga de las estelas) es la recta y la mirada apunta
    // siempre al destino (sin giros de cámara: lo bonito pasa por los bordes).
    const crucero = muestras.filter(m => m.fase === 'crucero');
    for (let i = 1; i < crucero.length; i++) {
      assert.ok(distanciaAlCorredor(plan, crucero[i].pos) < 1e-4 * plan.recta.getLength() + 1, `${nombre}: el crucero se sale de la recta`);
      const avance = crucero[i].pos.clone().sub(crucero[i - 1].pos);
      if (avance.length() > 1) { assert.ok(avance.normalize().angleTo(dirCorr) < 1e-3, `${nombre}: el avance no sigue el corredor`); assert.ok(crucero[i].mira.clone().sub(crucero[i].pos).normalize().angleTo(dirCorr) < 0.5 * Math.PI / 180, `${nombre}: la mirada se aparta del destino`); }
    }
    assert.ok(crucero.length * dt >= 1.5, `${nombre}: crucero de ${(crucero.length * dt).toFixed(1)} s`);
    // Velocidad continua: sin saltos entre muestras consecutivas.
    // (Solo velocidades apreciables: al arrancar desde parado la proporción entre muestras no dice nada.)
    const pasos = muestras.slice(1).map((m, i) => m.pos.distanceTo(muestras[i].pos)), umbral = Math.max(5, Math.max(...pasos) * 0.01);
    let maxSalto = 0; for (let i = 1; i < pasos.length; i++) { const a = pasos[i], b = pasos[i - 1]; if (b > umbral && a > umbral) maxSalto = Math.max(maxSalto, a / b, b / a); }
    assert.ok(maxSalto < 1.6, `${nombre}: cambio brusco de velocidad (×${maxSalto.toFixed(2)})`);
    // Llega exactamente al encuadre.
    const fin = plan.evaluar(plan.duracion);
    assert.ok(fin.pos.distanceTo(e.hasta) < 1 && fin.mira.distanceTo(mira) < 1, `${nombre}: llegada exacta`);
  });
}

test('el viaje a la supernova es rapidísimo (9–19 s) y el paisaje pasa por los bordes: galaxias que crecen y quedan atrás', () => {
  const plan = planes['casa → supernova (100 Mal)'] ?? planear('casa → supernova (100 Mal)');
  assert.ok(plan.duracion >= 9 && plan.duracion <= 19, `${plan.duracion.toFixed(1)} s`);
  // Recorrido real: 100 Mal menos el encuadre de llegada (el gigante es enorme: se le ve entero desde lejos).
  assert.ok(aMal(plan.camino.getLength()) > 75, `${aMal(plan.camino.getLength()).toFixed(1)} Mal`);
  // Galaxias del paisaje que, delante (≤ 50° de la mirada), superan 25 px de radio y después quedan atrás.
  const vistas = new Map(), N = 3000;
  for (let i = 0; i <= N; i++) {
    const t = i / N * plan.duracion, e = plan.evaluar(t), dir = e.mira.clone().sub(e.pos).normalize();
    for (const g of paisaje) {
      const w0 = g.pos.clone().sub(e.pos), d = w0.length(), px = g.r / d * 780, ang = w0.angleTo(dir) * 180 / Math.PI, r = vistas.get(g.id) ?? { max: 0, atras: false };
      if (ang < 50) r.max = Math.max(r.max, px); else if (r.max > 25 && ang > 90) r.atras = true;
      vistas.set(g.id, r);
    }
  }
  const pasan = [...vistas].filter(([, r]) => r.max > 25 && r.atras).length;
  assert.ok(pasan >= 15, `${pasan} galaxias pasan por los bordes`);
  // Nunca rozan la cámara: ninguna llega a ocupar más de media pantalla.
  for (const [id, r] of vistas) assert.ok(r.max < 450, `${id}: ${r.max.toFixed(0)} px`);
});

test('saltar el viaje: el resto del crucero en unos segundos, con velocidad suave, y la aproximación normal', () => {
  const plan = planes['casa → supernova (100 Mal)'] ?? planear('casa → supernova (100 Mal)');
  const t0 = plan.tiempos.crucero[0] + 1.5, w = plan.saltar(t0, 2.5);
  assert.ok(Math.abs(w(0) - t0) < 0.02 && Math.abs(w(2.5) - plan.tiempos.aproximacion[0]) < 0.02, `${w(0)} / ${w(2.5)}`);
  // A 60 cuadros por segundo: la velocidad es continua (acelera y frena de forma pareja) y la
  // aceleración no cambia de golpe (sin tirones): el mayor cambio de aceleración entre cuadros es pequeño
  // frente a la aceleración máxima.
  const v = []; let anterior = plan.evaluar(w(0) - 1 / 60).pos;
  for (let tau = 0; tau <= 3.5; tau += 1 / 60) { const p = plan.evaluar(w(tau)).pos; v.push(p.distanceTo(anterior)); anterior = p; }
  const acel = v.slice(1).map((x, k) => x - v[k]), tiron = Math.max(...acel.slice(1).map((x, k) => Math.abs(x - acel[k]))), maxA = Math.max(...acel.map(Math.abs));
  assert.ok(v.every(x => x > 0), 'avanza siempre');
  assert.ok(tiron < 0.35 * maxA, `cambio de aceleración entre cuadros ${tiron.toFixed(0)} frente a ${maxA.toFixed(0)}`);
  assert.equal(plan.saltar(plan.tiempos.aproximacion[0]), null, 'en la aproximación ya no se salta');
});

test('modalidad breve: el mismo recorrido en ~60 % del tiempo', () => {
  const normal = planes['casa → supernova (100 Mal)'] ?? planear('casa → supernova (100 Mal)'), breve = planear('casa → supernova (100 Mal)', { breve: true });
  const tv = p => p.tiempos.viaje[1] - p.tiempos.viaje[0];
  assert.ok(tv(breve) < tv(normal) * 0.75 && tv(breve) > 4, `${tv(breve).toFixed(1)} s frente a ${tv(normal).toFixed(1)} s`);
  assert.ok(breve.evaluar(breve.duracion).pos.distanceTo(ESCENARIOS['casa → supernova (100 Mal)'].hasta) < 1);
});

test('si el corredor ya está libre, no hay rodeo; si no, la maniobra es corta y despeja', () => {
  const libre = planificarVuelo({ desde: v(0, 0, 0), miraDesde: v(0, 0, -10), hasta: v(0, 0, -40000), mira: v(0, 0, -45000), centro: v(0, 0, -45000), obstaculos: [] });
  assert.equal(libre.salida.distanceTo(v(0, 0, 0)), 0);
  const e = ESCENARIOS['detrás de un cuerpo que bloquea el corredor'], bloq = planificarVuelo({ ...e, mira: e.centro });
  assert.ok(bloq.salida.distanceTo(e.desde) > 0 && bloq.salida.distanceTo(e.desde) < 15000, `maniobra de ${bloq.salida.distanceTo(e.desde).toFixed(0)}`);
});

test('movimiento reducido: sin estelas ni ruptura y más corto', () => {
  const normal = planear('casa → supernova (100 Mal)'), red = planear('casa → supernova (100 Mal)', { reducido: true });
  assert.ok(red.duracion < normal.duracion);
  for (let t = 0; t <= red.duracion; t += red.duracion / 200) { const m = red.evaluar(t); assert.equal(m.corriente, 0); assert.equal(m.ruptura, 0); }
});

test('el perfil del viaje se prepara a trozos (sin pausa al pulsar) y da exactamente el mismo vuelo', () => {
  const entero = planear('casa → supernova (100 Mal)'), trozos = planear('casa → supernova (100 Mal)');
  assert.equal(trozos.listo, false, 'al planificar aún no se ha calculado el perfil');
  // Antes de la ruptura no hace falta: la selección y la alineación se evalúan sin terminarlo.
  trozos.evaluar(trozos.ruptura[0] * 0.5); assert.equal(trozos.listo, false);
  let pasos = 0; while (!trozos.preparar(0.05)) pasos++;
  assert.ok(pasos > 10, `repartido en varios cuadros (${pasos})`);
  assert.ok(Math.abs(entero.duracion - trozos.duracion) < 1 / 60, 'la duración estimada mientras se prepara difiere menos de un cuadro');
  entero.perfil;   // (se termina de golpe)
  assert.equal(trozos.duracion, entero.duracion);
  assert.deepEqual(trozos.tiempos, entero.tiempos);
  for (let i = 0; i <= 50; i++) { const t = entero.duracion * i / 50, a = entero.evaluar(t), b = trozos.evaluar(t);
    assert.ok(a.pos.distanceTo(b.pos) === 0 && a.mira.distanceTo(b.mira) === 0 && a.fase === b.fase, `instante ${t}`); }
});
