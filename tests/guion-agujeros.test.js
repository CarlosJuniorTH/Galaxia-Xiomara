import test from 'node:test';
import assert from 'node:assert/strict';
import { guionTon618, guionSagitario, guionReposo, marcasDe, finEscena, PULSO, DURACION, COMPAS } from '../js/util/guionAgujeros.js';
import { MOMENTOS } from '../js/data/bandaSonora.js';
import { MARCAS_SAGITARIO, ESCENA_SAGITARIO, posicionPista } from '../js/util/guionSagitario.js';

test('las escenas usan las marcas de la banda sonora y terminan con su canción', () => {
  for (const id of ['ton618', 'sagitario']) {
    assert.ok(MOMENTOS[id].archivo, `${id} tiene canción`);
    for (const [k, v] of Object.entries(MOMENTOS[id].marcas)) assert.equal(marcasDe(id)[k], v, `${id}.${k}`);
    assert.ok(finEscena(id) <= DURACION[id] + 0.5 && finEscena(id) > DURACION[id] - 2, `${id}: la escena acaba con la canción`);
  }
  assert.ok(Math.abs(COMPAS.ton618 - 1.778) < 0.01 && Math.abs(COMPAS.sagitario - 2.345) < 0.01, 'un compás cada 1,78 s y 2,34 s');
});

// (TON 618: tests/guion-ton618.test.js)

test('Sagitario A*: el agujero hambriento traga un grumo en cada «sí» y S2 lo roza en el primero', () => {
  const M = marcasDe('sagitario'), g = t => JSON.parse(JSON.stringify(guionSagitario(t, M)));
  assert.equal(M.si1, MARCAS_SAGITARIO.si1);
  assert.ok(g(1).alimento < 0.45 && g(M.si1 - 0.2).alimento < 0.45, 'empieza hambriento (versión de inicio)');
  assert.ok(g(M.si4 + 2).alimento > 0.99 && g(60).alimento > 0.99, 'acaba con el diseño final');
  // Cada «sí» es un escalón: el flujo solo crece y lo hace justo en sus «sí».
  let a = 0; for (let t = 0; t < 40; t += 0.05) { const b = g(t).alimento; assert.ok(b >= a - 1e-9, `alimento a ${t}`); a = b; }
  for (const k of ['si1', 'si2', 'si3', 'si4']) {
    assert.ok(g(M[k] + 0.12).destello > 0.6, `llamarada en ${k}`);
    assert.ok(g(M[k] - 1.5).destello < 0.25, `antes de ${k} no hay llamarada`);
  }
  // Cada grumo se suelta antes de su «sí» y lo traga en su «sí».
  const o = g(10); for (let i = 0; i < 4; i++) assert.ok(o.grumosIni[i] < o.grumosFin[i] - 4 && Math.abs(o.grumosFin[i] - M[`si${i + 1}`]) < 1e-9);
  // S2: pericentro (anomalía media 0) en el primer «sí»; una vuelta entera en la escena (apocentro al principio).
  assert.ok(Math.abs(g(M.si1).s2) < 1e-9 && Math.abs(g(0).s2 + Math.PI) < 1e-9);
  assert.ok(g(M.si1 - 2).foco > 0.9 && g(M.si2).foco < 0.05, 'el foco en S2 mientras cae');
  assert.ok(g(2).revela < 0.2 && g(M.si1 - 2).revela > 0.99, 'las elipses quedan dibujadas antes del estribillo');
  assert.ok(g(60).calma === 1 && g(M.si4 + 1).ecos[3] > 0, 'en calma; los ecos salen de cada «sí»');
  assert.deepEqual(Object.keys(guionReposo('sagitario')).sort(), Object.keys(guionSagitario(3, M)).sort(), 'el reposo tiene los mismos campos');
});

test('Sagitario A*: la pista de cámara sigue el contrato del director', () => {
  const C = ESCENA_SAGITARIO.camara;
  assert.equal(C[0].t, 0); assert.ok(Math.abs(C.at(-1).t - DURACION.sagitario) < 0.05, 'acaba con la canción');
  for (let i = 0; i < C.length; i++) {
    const p = C[i];
    assert.ok(['suave', 'rapida', 'corte', 'lineal'].includes(p.curva), `curva ${i}`);
    assert.ok(p.pos.length === 3 && p.mira.length === 3 && p.fov >= 30 && p.fov <= 60, `plano ${i}`);
    // Nunca tan cerca que todo se disperse (0,45 radios de encuadre) ni más lejos que el encuadre de llegada.
    assert.ok(p.pos[2] >= 0.45 && p.pos[2] <= 1.1, `distancia ${i}`);
    if (i) assert.ok(p.t > C[i - 1].t, `orden ${i}`);
  }
  // Movimientos lentos: sin cortes ni golpes, sin alabeo y nunca más de 4° de azimut por segundo.
  for (let i = 1; i < C.length; i++) {
    assert.ok(['suave', 'lineal'].includes(C[i].curva) && !C[i].giro, `plano ${i} sin cortes ni golpes`);
    assert.ok(Math.abs(C[i].pos[0] - C[i - 1].pos[0]) / (C[i].t - C[i - 1].t) <= 4, `plano ${i}: giro lento`);
  }
  // En el primer «sí» la cámara está pegada al agujero (S2 lo roza).
  const cerca = C.filter(p => Math.abs(p.t - MARCAS_SAGITARIO.si1) < 1.2);
  assert.ok(cerca.length && cerca.every(p => p.pos[2] < 0.65));
  const [x, y, z] = posicionPista([90, 0, 2]); assert.ok(Math.abs(x - 2) < 1e-9 && Math.abs(y) < 1e-9 && Math.abs(z) < 1e-9);
});

test('movimiento reducido: la misma escena, más tranquila', () => {
  const M = marcasDe('ton618');
  const S = marcasDe('sagitario'); assert.ok(guionSagitario(S.si1 + 0.1, S, { reducido: true }).destello < guionSagitario(S.si1 + 0.1, S).destello * 0.4);
  assert.deepEqual(Object.keys(guionReposo('ton618')).sort(), Object.keys(guionTon618(3, M)).sort(), 'el reposo tiene los mismos campos');
});
