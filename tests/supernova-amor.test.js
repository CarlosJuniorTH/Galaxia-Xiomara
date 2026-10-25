import test from 'node:test';
import assert from 'node:assert/strict';
import { puntoCorazon, faseSupernova, TIEMPOS_AMOR, RECUERDO_SUPERNOVA } from '../js/util/supernovaAmor.js';
import { crearProgreso } from '../js/util/progreso.js';

test('la figura cierra sin discontinuidad, tiene dos lóbulos y profundidad finita', () => {
  const a = puntoCorazon(0), b = puntoCorazon(2 * Math.PI);
  assert.ok(a.every((v, i) => Math.abs(v - b[i]) < 1e-9));
  const izquierda = puntoCorazon(Math.PI / 4), derecha = puntoCorazon(-Math.PI / 4);
  assert.ok(izquierda[1] > a[1], 'el centro superior queda por debajo de los lóbulos');
  assert.ok(Math.abs(izquierda[0] + derecha[0]) < 1e-9);
  assert.ok(puntoCorazon(Math.PI)[1] < 0, 'punta inferior');
  for (let t = 0; t < 6.3; t += 0.01) for (const r of [0, 0.5, 1, 1.06]) assert.ok(puntoCorazon(t, r, 240).every(Number.isFinite));
});

test('la escena pasa por encuentro, silencio, expansión, formación y recuerdo duradero', () => {
  assert.equal(faseSupernova('inestable', 0, 8), 'encuentro');
  assert.equal(faseSupernova('inestable', 0, 0.4), 'silencio');
  assert.equal(faseSupernova('estallido', 0.5), 'expansion');
  assert.equal(faseSupernova('estallido', 9), 'formacion');
  assert.equal(faseSupernova('estallido', 13), 'revelacion');
  assert.equal(faseSupernova('estallido', TIEMPOS_AMOR.revelar), 'recuerdo');
  assert.equal(faseSupernova('remanente', 100000), 'recuerdo');
});

test('el recuerdo de la supernova se conserva en la copia y tras recargar sin duplicarse', () => {
  const datos = new Map(); const almacen = { getItem: k => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, v) };
  const p = crearProgreso(almacen); p.anotar('visitas', RECUERDO_SUPERNOVA); p.anotar('visitas', RECUERDO_SUPERNOVA);
  const recargado = crearProgreso(almacen);
  assert.equal(recargado.tiene('visitas', RECUERDO_SUPERNOVA), true);
  assert.equal(recargado.estado.visitas.length, 1);
});

test('el foco oculta distracciones y restaura los estados incluso si falla el dibujo', async () => {
  const { Group, Scene } = await import('three');
  const { conFocoSupernova } = await import('../js/escena/focoSupernova.js');
  const escena = new Scene(), cosmos = new Group(), sn = new Group(), planeta = new Group(), fondo = new Group(), invisible = new Group();
  invisible.visible = false; escena.add(cosmos, fondo, invisible); cosmos.add(sn, planeta);
  assert.throws(() => conFocoSupernova(escena, cosmos, sn, () => {
    assert.equal(sn.visible, true); assert.equal(planeta.visible, false); assert.equal(fondo.visible, false);
    throw new Error('GPU perdida');
  }), /GPU perdida/);
  assert.equal(planeta.visible, true); assert.equal(fondo.visible, true); assert.equal(invisible.visible, false);
});

test('la supernova se puede repetir, conservar y cancelar antes del estallido sin perder la geometría', async () => {
  const { Vector3 } = await import('three');
  const guardarDocumento = globalThis.document, guardarMedia = globalThis.matchMedia, guardarLocation = globalThis.location;
  const gradiente = () => ({ addColorStop() {} });
  const ctx = new Proxy({ createRadialGradient: gradiente, createLinearGradient: gradiente }, { get: (o, k) => k in o ? o[k] : () => {} });
  globalThis.location = { search: '' };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
  try {
    const { crearSupernova } = await import('../js/escena/supernova.js');
    const sn = crearSupernova({ uScale: { value: 400 }, uPR: { value: 2 }, escala: 40 });
    const vista = new Vector3(0, 0, 4000);
    sn.actualizar(0, vista, vista); assert.equal(sn.estado, 'estable');
    const E = TIEMPOS_AMOR.espera;
    assert.equal(sn.preparar(), E); assert.equal(sn.preparar(), E);
    sn.actualizar(E - 0.5, vista, vista); assert.equal(sn.fase, 'silencio');
    sn.actualizar(E, vista, vista); assert.equal(sn.fase, 'expansion');
    // Sin aros fijos de choque: no quedan anillos quietos tras la explosión.
    const ondas=[];sn.grupo.traverse(o=>{if(o.geometry?.type==='TorusGeometry')ondas.push(o);});
    sn.actualizar(E + 3,vista,vista); assert.ok(ondas.every(o=>!o.visible),'sin anillos fijos');
    sn.actualizar(E + TIEMPOS_AMOR.revelar + 0.1, vista, vista); assert.equal(sn.fase, 'recuerdo');
    sn.actualizar(10000, vista, vista); assert.equal(sn.estado, 'remanente');
    assert.equal(sn.preparar(), -1, 'el recuerdo no se destruye al visitarlo');
    sn.reiniciar(); assert.equal(sn.preparar({ repetir: true }), E);
    sn.recordar(); assert.equal(sn.estado, 'remanente');
    sn.grupo.traverse(o => { const pos = o.geometry?.getAttribute('position'); if(pos) assert.ok(pos.array.every(Number.isFinite)); o.geometry?.dispose(); o.material?.dispose(); });
  } finally { globalThis.document = guardarDocumento; globalThis.matchMedia = guardarMedia; globalThis.location = guardarLocation; }
});

test('la ceremonia dura lo que «Sparks»: estalla en el pico (41,7 s), se revela con «I said ooh» y la animación solo se estira', async () => {
  const { faltaAnimacion, faltaReal, desdeAnimacion } = await import('../js/util/supernovaAmor.js');
  const T = TIEMPOS_AMOR;
  assert.ok(Math.abs(T.espera - 41.7) < 1e-9 && T.espera + T.formado > 52 && T.espera + T.formado < 58 && T.espera + T.reposo <= 62.4);
  // Los tramos empiezan y terminan donde la animación de siempre (14 s de espera; 4/16/19/25 tras el estallido), sin saltos.
  assert.equal(faltaAnimacion(T.espera), 14); assert.equal(faltaAnimacion(0), 0);
  assert.equal(desdeAnimacion(T.formar), 4); assert.equal(desdeAnimacion(T.formado), 16); assert.equal(desdeAnimacion(T.revelar), 19); assert.equal(desdeAnimacion(T.reposo), 25);
  let a = -1, b = -1; for (let x = 0; x <= 70; x += 0.01) { const fa = faltaAnimacion(Math.min(x, T.espera)), da = desdeAnimacion(x); assert.ok(fa >= a - 1e-9 && da > b); a = fa; b = da; }
  for (const f of [0.5, 3.8, 7, 9.5, 13]) assert.ok(Math.abs(faltaAnimacion(faltaReal(f)) - f) < 1e-9);
  // La formación ocurre a la vez que en la animación original, en su reloj: la revelación es el corazón ya formado.
  assert.equal(faseSupernova('estallido', T.formado - 0.01), 'formacion'); assert.equal(faseSupernova('estallido', T.formado + 0.01), 'revelacion');
});
