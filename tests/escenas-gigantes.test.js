import test from 'node:test';
import assert from 'node:assert/strict';
import { ESCENA_PULSAR, ESCENA_DENEB, estadoPulsar, estadoDeneb, crearDirector, escalarEscena, GIRO_QUIETO } from '../js/util/escenasGigantes.js';

const NORMAL = { giro: 1, tiempo: 1, haces: 1, apertura: 1, motasHaz: 0, brillo: 0 };
const cerca = (a, b, e = 1e-6) => Math.abs(a - b) < e;

test('las marcas están en orden y dentro de la duración', () => {
  for (const c of [ESCENA_PULSAR, ESCENA_DENEB]) {
    const v = Object.values(c.marcas);
    assert.ok(v.every((x, i) => i === 0 || x > v[i - 1]), c.id);
    assert.equal(v[0], 0); assert.equal(v.at(-1), c.duracion);
  }
});

test('el púlsar empieza y termina en su estado normal y entre medias casi se para', () => {
  for (const s of [0, ESCENA_PULSAR.duracion]) { const e = estadoPulsar(s, ESCENA_PULSAR); for (const k in NORMAL) assert.ok(cerca(e[k], NORMAL[k]), `${k} en ${s}`); }
  const m = ESCENA_PULSAR.marcas, h = s => estadoPulsar(s, ESCENA_PULSAR);
  for (let s = m.quieto; s <= m.vuelta; s += 0.25) assert.ok(cerca(h(s).giro, GIRO_QUIETO));
  // Los haces se abren y encienden poco a poco y del todo en «hermosa».
  assert.ok(h(m.corazon).apertura > h(m.quieto + 2).apertura && h(m.hermosa + 0.5).apertura > h(m.corazon).apertura);
  assert.ok(h(m.hermosa + 0.6).haces > 2 && h(m.hermosa - 2).brillo === 0 && h(m.hermosa + 1).brillo > 0.95);
  // Sin saltos: ninguna curva cambia más de un 8 % de su recorrido en 1/60 s.
  for (let s = 0; s < ESCENA_PULSAR.duracion; s += 1 / 60) { const a = { ...h(s) }, b = h(s + 1 / 60); for (const k of ['giro', 'haces', 'apertura', 'motasHaz', 'brillo']) assert.ok(Math.abs(a[k] - b[k]) < 0.08, `${k} en ${s.toFixed(2)}`); }
});

test('Deneb late, su luz crece y el mundo se ordena tras el estribillo y queda en calma', () => {
  const m = ESCENA_DENEB.marcas, d = s => estadoDeneb(s, ESCENA_DENEB);
  assert.equal(d(0).nace, 0); assert.equal(d(0).luz, 0);
  assert.ok(d(m.subida - 1).luz === 0 && d(m.estribillo).luz > 0.99);
  assert.ok(d(m.estribillo - 1).nace === 0 && d(m.mundo).forma > 0.99 && d(m.mundo + 2).mundo > 0.99);
  const final = d(m.fin), despues = d(m.fin + 100);
  assert.ok(final.calma > 0.99 && final.nace > 0.99 && final.forma > 0.99, 'al final queda el mundo nuevo');
  for (const k of ['luz', 'nace', 'forma', 'mundo', 'calma', 'latido']) assert.ok(cerca(final[k], despues[k]), k);
});

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
  // Deneb persiste al terminar hasta que se cancela.
  const n = crearDirector(ESCENA_DENEB); n.iniciar(0); n.avanzar(ESCENA_DENEB.duracion + 1, 0);
  assert.ok(n.terminada && n.peso === 1 && n.visible); n.cancelar(); n.avanzar(0, 10); assert.equal(n.peso, 0);
});

test('escalar una escena mueve sus marcas en proporción', () => {
  const e = escalarEscena(ESCENA_PULSAR, 56);
  assert.equal(e.duracion, 56); assert.equal(e.marcas.hermosa, 42); assert.equal(ESCENA_PULSAR.marcas.hermosa, 21);
  assert.ok(cerca(escalarEscena(ESCENA_DENEB, 18).latido, ESCENA_DENEB.latido / 2));
});
