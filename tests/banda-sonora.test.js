import test from 'node:test';
import assert from 'node:assert/strict';
import { reescalar, marcasCruzadas, momentoReposo } from '../js/util/sincronia.js';
import { MOMENTOS, PRUEBA, FASES_SUPERNOVA, configuracionActiva } from '../js/data/bandaSonora.js';
import { faseSupernova, TIEMPOS_AMOR } from '../js/util/supernovaAmor.js';
import { DESTINOS, LEJANOS } from '../js/data/universo.js';
import { HITOS as HITOS_INTRO, DURACION as DURACION_INTRO, PULSOS } from '../js/ui/portada.js';

// Hitos de ejemplo (los de la portada anterior) para probar el reescalado.
const HITOS = { encuentro: 4.6, corazon: 5.1, galaxia: 6.1, tarjeta: 8.9 };

test('la portada reescalada pone cada hito en su marca y sigue al ritmo normal después', () => {
  const marcas = { encuentro: 12, corazon: 14, galaxia: 17.5, tarjeta: 31 };
  for (const [n, s] of Object.entries(marcas)) assert.ok(Math.abs(reescalar(s, marcas, HITOS) - HITOS[n]) < 1e-9, n);
  assert.equal(reescalar(0, marcas, HITOS), 0);
  assert.ok(Math.abs(reescalar(6, marcas, HITOS) - 2.3) < 1e-9, 'a mitad de camino del encuentro, a mitad de su animación');
  assert.ok(Math.abs(reescalar(41, marcas, HITOS) - (HITOS.tarjeta + 10)) < 1e-9, 'tras la última marca, 1 s = 1 s');
  // Monótona (la animación nunca va hacia atrás) y continua.
  let antes = 0; for (let s = 0; s < 60; s += 0.01) { const t = reescalar(s, marcas, HITOS); assert.ok(t >= antes - 1e-12); assert.ok(t - antes < 0.05); antes = t; }
});

test('sin marcas (o con marcas imposibles) la portada va a su ritmo de siempre', () => {
  for (const marcas of [{}, null, { encuentro: null, tarjeta: null }]) for (const s of [0, 3, 8.9, 20]) assert.equal(reescalar(s, marcas, HITOS), s);
  // Una marca que iría hacia atrás se ignora; las demás siguen valiendo.
  const marcas = { encuentro: 10, corazon: 8, tarjeta: 20 };
  assert.ok(Math.abs(reescalar(10, marcas, HITOS) - 4.6) < 1e-9 && Math.abs(reescalar(20, marcas, HITOS) - 8.9) < 1e-9);
  assert.equal(reescalar(-2, { encuentro: 10 }, HITOS), 0);
});

test('las marcas se avisan una vez al cruzarlas, también al dar la vuelta un bucle', () => {
  const m = { a: 0, b: 2, c: 5, nula: null };
  assert.deepEqual(marcasCruzadas(m, -1e-3, 0.1), ['a']);
  assert.deepEqual(marcasCruzadas(m, 0.1, 1.9), []);
  assert.deepEqual(marcasCruzadas(m, 1.9, 5.2), ['b', 'c']);
  assert.deepEqual(marcasCruzadas(m, 5.2, 5.3), []);
  assert.deepEqual(marcasCruzadas(m, 5.8, 0.3, { duracion: 6, bucle: true }), ['a']);
  assert.deepEqual(marcasCruzadas(m, 4.9, 2.5, { duracion: 6, bucle: true }), ['c', 'a', 'b']);
});

test('en casa suena la canción del mes si la hay; si no, y fuera de casa, el ambiente', () => {
  const tiene = n => n === 'mes-10';
  assert.equal(momentoReposo('hogar', 10, tiene), 'mes-10');
  assert.equal(momentoReposo('hogar', 11, tiene), 'ambiente');
  assert.equal(momentoReposo('rosa', 10, tiene), 'ambiente');
});

test('la configuración tiene todos los momentos, con ids reales, y solo los audios preparados', () => {
  const ids = new Set([...DESTINOS, ...LEJANOS].map(d => d.id));
  for (const id of ['supernova', 'pulsar', 'deneb', 'cuasar', 'ton618', 'sagitario', 'gigante']) { assert.ok(MOMENTOS[id], id); assert.ok(ids.has(id), `${id} existe en universo.js`); }
  assert.ok(MOMENTOS.inicio && MOMENTOS.viajes && MOMENTOS.mes[10]);
  assert.equal(MOMENTOS.viajes.bucle, false); assert.equal(MOMENTOS.viajes.hastaLlegar, true); assert.equal(MOMENTOS.viajes.duracion, 15);
  // «Maps»: una marca por hito del videoclip de la intro (js/ui/portada.js), en orden y dentro del fragmento de 32 s.
  const mi = MOMENTOS.inicio.marcas, orden = Object.keys(HITOS_INTRO).sort((a, b) => HITOS_INTRO[a] - HITOS_INTRO[b]);
  for (const k of orden) assert.ok(Number.isFinite(mi[k]), k);
  for (let i = 1; i < orden.length; i++) assert.ok(mi[orden[i - 1]] < mi[orden[i]], orden[i]);
  assert.ok(mi.tarjeta < DURACION_INTRO && MOMENTOS.inicio.duracion === DURACION_INTRO);
  // Cada momento con canción usa su archivo con su nombre; las estancias, «<lugar>-estancia.m4a». Nada en bucle.
  const activos = configuracionActiva('').momentos;
  for (const n of ['inicio', 'viajes', 'supernova', 'pulsar', 'deneb', 'cuasar', 'ton618', 'sagitario', 'hogar']) assert.equal(activos[n].archivo, `${n}.m4a`, n);
  for (const n of ['supernova', 'pulsar', 'deneb', 'cuasar', 'ton618', 'sagitario', 'hogar']) { assert.equal(activos[`${n}-estancia`].archivo, `${n}-estancia.m4a`); assert.ok(activos[`${n}-estancia`].esEstancia); }
  for (const [n, m] of Object.entries(activos)) {
    assert.equal(m.bucle, false, `${n}: nada va en bucle salvo el ambiente`);
    for (const k of ['archivo', 'duracion', 'volumen', 'bucle', 'marcas']) assert.ok(k in m, `${n}.${k}`);
    assert.ok(m.volumen > 0 && m.volumen <= 1);
  }
  const prueba = configuracionActiva('?pruebaAudio');
  assert.equal(prueba.carpeta, PRUEBA.carpeta);
  assert.ok(prueba.momentos.inicio.archivo && prueba.momentos.viajes.archivo);
  assert.equal(prueba.momentos['mes-10'].archivo, null);
});

test('las marcas de la supernova caen en las fases de su ceremonia', () => {
  // Segundo s desde que empieza la ceremonia → estado de la estrella (inestable durante la espera, luego estallido).
  const fase = s => s < TIEMPOS_AMOR.espera ? faseSupernova('inestable', 0, TIEMPOS_AMOR.espera - s) : faseSupernova('estallido', s - TIEMPOS_AMOR.espera);
  for (const [nombre, s] of Object.entries(FASES_SUPERNOVA)) assert.equal(fase(s + 0.01), nombre, `${nombre} a los ${s} s`);
  assert.deepEqual(MOMENTOS.supernova.marcas, { ...FASES_SUPERNOVA });
});

test('el videoclip de la intro va a 1:1 con «Maps» y sus hitos de imagen caen en compás o en la voz', () => {
  const mi = MOMENTOS.inicio.marcas;
  for (const [k, h] of Object.entries(HITOS_INTRO)) assert.ok(Math.abs(reescalar(h, mi, HITOS_INTRO) - h) < 1e-9, k);
  // Encuentro, nombres, cielo, salto y tarjeta, en el primer tiempo de un compás (cada cuatro pulsos).
  for (const k of ['encuentro', 'nombres', 'cielo', 'salto', 'tarjeta']) { const i = PULSOS.indexOf(HITOS_INTRO[k]); assert.ok(i >= 0 && i % 4 === 0, k); }
  // Los pulsos, crecientes y a ~0,5 s (120 BPM) de 0 a 32.
  for (let i = 1; i < PULSOS.length; i++) assert.ok(Math.abs(PULSOS[i] - PULSOS[i - 1] - 0.5) < 0.06, `pulso ${i}`);
});
