import test from 'node:test';
import assert from 'node:assert/strict';
import { ESCENA_PULSAR, ESCENA_CUASAR, ESCENA_DENEB, estadoPulsar, estadoCuasar, estadoDeneb, crearDirector, escalarEscena, GIRO_QUIETO } from '../js/util/escenasGigantes.js';

const NORMAL = { giro: 1, tiempo: 1, haces: 1, apertura: 1, motasHaz: 0, brillo: 0 };
const cerca = (a, b, e = 1e-6) => Math.abs(a - b) < e;

test('las marcas están en orden y dentro de la duración', () => {
  for (const c of [ESCENA_PULSAR, ESCENA_CUASAR, ESCENA_DENEB]) {
    const v = Object.values(c.marcas);
    assert.ok(v.every((x, i) => i === 0 || x > v[i - 1]), c.id);
    assert.equal(v[0], 0); assert.equal(v.at(-1), c.duracion);
  }
});

test('el púlsar empieza y termina en su estado normal, casi se para y late al compás de la canción', () => {
  for (const s of [0, ESCENA_PULSAR.duracion]) { const e = estadoPulsar(s, ESCENA_PULSAR); for (const k in NORMAL) assert.ok(cerca(e[k], NORMAL[k]), `${k} en ${s}`); }
  const m = ESCENA_PULSAR.marcas, h = s => ({ ...estadoPulsar(s, ESCENA_PULSAR) });
  for (let s = m.bailar; s <= m.fin - 2; s += 0.25) assert.ok(cerca(h(s).giro, GIRO_QUIETO));
  // Late en cada pulso (108 BPM: cada 0,556 s desde el 0), con el primero de cada compás más fuerte.
  const P = ESCENA_PULSAR.pulso, k0 = Math.ceil(m.estribillo / P) + 4;
  const enPulso = h(k0 * P + 0.01).pulso, entre = h(k0 * P + P * 0.6).pulso;
  assert.ok(enPulso > 0.4 && entre < enPulso * 0.3, `pulso ${enPulso} / entre pulsos ${entre}`);
  const compas = Math.ceil(m.estribillo / (4 * P)) * 4;
  assert.ok(h(compas * P + 0.01).pulso > h((compas + 1) * P + 0.01).pulso, 'el primer pulso del compás, más fuerte');
  // Crece con la canción: la fuerza del latido y los haces, más en el estribillo que al empezar.
  assert.ok(h(m.estribillo + 1).fuerza > h(m.corazon + 1).fuerza && h(m.corazon + 1).fuerza > h(m.bailar + 0.8).fuerza);
  assert.ok(h(m.segunda + 1).fuerza > h(m.estribillo + 1).fuerza);
  assert.ok(h(m.estribillo + 1).apertura > h(m.quererte).apertura && h(m.estribillo - 1).brillo === 0 && h(m.estribillo + 1).brillo > 0.95);
  // Sin saltos en lo que no es el latido: ninguna curva cambia más de un 8 % de su recorrido en 1/60 s.
  for (let s = 0; s < ESCENA_PULSAR.duracion; s += 1 / 60) { const a = h(s), b = h(s + 1 / 60); for (const k of ['giro', 'motasHaz', 'brillo', 'fuerza', 'tibio']) assert.ok(Math.abs(a[k] - b[k]) < 0.08, `${k} en ${s.toFixed(2)}`); }
});

test('el cuásar se calma, se enciende con la historia y culmina en «es mi mujer ideal»', () => {
  const m = ESCENA_CUASAR.marcas, c = s => ({ ...estadoCuasar(s, ESCENA_CUASAR) });
  const ini = c(0), fin = c(ESCENA_CUASAR.duracion);
  for (const e of [ini, fin]) { assert.ok(cerca(e.tiempo, 1) && e.anillo < 1e-6 && e.otras < 1e-6 && e.foco < 1e-6 && e.cima === -1 && e.acento === -1); }
  assert.ok(c(m.vi).tiempo < 0.35, 'se calma');
  assert.ok(c(m.salir - 0.5).anillo === 0 && c(m.salir + 1.5).anillo > 0.35, 'la primera chispa');
  assert.ok(c(m.novios - 0.1).subida === 0 && c(m.increible + 2).subida > 0.3 && c(m.reir + 2).subida > c(m.increible + 2).subida);
  assert.ok(c(m.otras + 2).otras > 0.95 && c(m.reir + 1.5).otras < 0.02, 'las otras luces se apagan con «pero ella»');
  assert.ok(c(m.reir + 1).risa > 0.9 && c(m.disfrutar + 1).risa < 0.05);
  assert.ok(c(m.cima).subida > 0.99 && c(m.ideal + 0.5).cima > 0 && c(m.ideal + 0.5).acento > 0, 'el clímax');
  for (let s = 0; s < ESCENA_CUASAR.duracion; s += 1 / 60) { const a = c(s), b = c(s + 1 / 60); for (const k of ['tiempo', 'anillo', 'subida', 'otras', 'risa', 'calido', 'foco']) assert.ok(Math.abs(a[k] - b[k]) < 0.08, `${k} en ${s.toFixed(2)}`); }
});

test('las marcas de las canciones son las de las escenas', async () => {
  const { MOMENTOS } = await import('../js/data/bandaSonora.js');
  assert.equal(MOMENTOS.pulsar.archivo, 'pulsar.m4a'); assert.equal(MOMENTOS.cuasar.archivo, 'cuasar.m4a');
  assert.deepEqual(MOMENTOS.pulsar.marcas, ESCENA_PULSAR.marcas); assert.equal(MOMENTOS.deneb.archivo, 'deneb.m4a'); assert.deepEqual(MOMENTOS.deneb.marcas, ESCENA_DENEB.marcas); assert.deepEqual(MOMENTOS.cuasar.marcas, ESCENA_CUASAR.marcas);
});

// Deneb: tests/escena-deneb.test.js.

test('el director sigue el reloj que se le pasa, espera si no sabe y se cancela suave', () => {
  let audio = null, fin = null;
  const d = crearDirector(ESCENA_PULSAR, { salida: 1 });
  d.iniciar(100, { reloj: () => audio, alFin: v => { fin = v; } });
  d.avanzar(101, 1 / 60); assert.equal(d.segundo, 0, 'sin audio todavía, espera');
  audio = 12.5; d.avanzar(102, 1 / 60); assert.equal(d.segundo, 12.5);
  d.cancelar(); assert.equal(fin, false); assert.equal(d.activa, false);
  const pesos = []; for (let i = 0; i < 70; i++) { d.avanzar(103, 1 / 60); pesos.push(d.peso); }
  assert.ok(pesos.every((p, i) => i === 0 || p <= pesos[i - 1]) && pesos.at(-1) === 0 && pesos[10] > 0.5);
  assert.equal(d.segundo, 12.5, 'al cancelar, el estado se queda quieto mientras se desvanece');
  // Sin reloj: el tiempo propio desde que empezó.
  const p = crearDirector(ESCENA_PULSAR); p.iniciar(5, { alFin: v => { fin = v; } }); p.avanzar(9, 0); assert.equal(p.segundo, 4);
  p.avanzar(5 + ESCENA_PULSAR.duracion + 1, 0); assert.equal(fin, true); assert.equal(p.peso, 0);
  // Una escena que persiste al terminar se queda hasta que se cancela.
  const n = crearDirector({ ...ESCENA_PULSAR, persiste: true }); n.iniciar(0); n.avanzar(ESCENA_PULSAR.duracion + 1, 0);
  assert.ok(n.terminada && n.peso === 1 && n.visible); n.cancelar(); n.avanzar(0, 10); assert.equal(n.peso, 0);
});

test('escalar una escena mueve sus marcas en proporción', () => {
  const e = escalarEscena(ESCENA_PULSAR, 56);
  const k = 56 / ESCENA_PULSAR.duracion;
  assert.equal(e.duracion, 56); assert.ok(cerca(e.marcas.estribillo, 15 * k)); assert.equal(ESCENA_PULSAR.marcas.estribillo, 15); assert.ok(cerca(e.pulso, ESCENA_PULSAR.pulso * k));
  assert.ok(cerca(escalarEscena(ESCENA_DENEB, ESCENA_DENEB.duracion / 2).pulso, ESCENA_DENEB.pulso / 2));
});
