import test from 'node:test';
import assert from 'node:assert/strict';
import { ESCENA_PULSAR, ESCENA_CUASAR, ESCENA_DENEB, estadoPulsar, estadoCuasar, REPOSO_CUASAR, estadoDeneb, crearDirector, escalarEscena, GIRO_QUIETO } from '../js/util/escenasGigantes.js';

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

test('el cuásar se enciende con la historia: los chorros se recogen, nacen y crecen en las frases clave y acaba en su diseño de siempre', () => {
  const m = ESCENA_CUASAR.marcas, c = s => ({ ...estadoCuasar(s, ESCENA_CUASAR) });
  for (const s of [0, ESCENA_CUASAR.duracion, ESCENA_CUASAR.duracion + 3]) assert.deepEqual(c(s), { ...REPOSO_CUASAR }, `reposo en ${s}`);
  // Justo antes de acabar ya es casi el de siempre (sin salto al terminar).
  const casi = c(ESCENA_CUASAR.duracion - 0.02);
  for (const k of ['alcance', 'disco', 'giro', 'gas', 'caida', 'fotones', 'destello', 'lobulo']) assert.ok(Math.abs(casi[k] - REPOSO_CUASAR[k]) < 0.03, `${k} al final: ${casi[k]}`);
  for (const k of ['otras', 'calido', 'foco', 'ondaK', 'frente']) assert.ok(casi[k] < 0.03, k);
  // Dormido: chorros recogidos y disco apagado hasta «la vi»; entonces asoman.
  assert.ok(c(m.recogido + 0.5).alcance < 0.01 && c(m.recogido + 0.5).disco < 0.4 && c(m.vi - 0.05).alcance < 0.01);
  assert.ok(c(m.vi + 0.3).alcance > 0.05 && c(m.vi + 0.2).frente > 0.3 && c(m.vi + 0.2).ondaK > 0.5, 'la primera chispa');
  // Los chorros solo crecen (nunca se encogen tras recogerse) y en las frases clave.
  let previo = 0;
  for (let s = m.recogido; s < ESCENA_CUASAR.duracion; s += 0.05) { const a = c(s).alcance; assert.ok(a >= previo - 1e-9, `crece en ${s.toFixed(2)}`); previo = a; }
  const salto = (a, b) => c(b).alcance - c(a).alcance;
  for (const k of ['salir', 'novios', 'wow', 'golpe1', 'golpe2', 'golpe3', 'cima']) assert.ok(salto(m[k] - 0.05, m[k] + 1) > 0.04, `estirón en ${k}`);
  assert.ok(salto(m.otras, m.pero) < 1e-6, 'las otras no hacen crecer los chorros');
  assert.ok(c(m.otras + 2).otras > 0.4 && c(m.bellas + 1.5).otras > 0.95 && c(m.pero + 0.85).otras < 0.01, 'las otras luces se apagan con «pero ella»');
  assert.ok(c(m.reir + 0.3).ondaK > 0.9 && c(m.disfrutar + 1).ondaK < 0.01, 'la risa');
  assert.ok(c(m.disfrutar + 1.2).calido > 0.95);
  assert.ok(c(m.cima - 0.3).conv > 0.5 && c(m.cima + 0.1).conv === -1 && c(m.cima + 0.5).cima > 0, 'se recoge la luz y sale la onda');
  assert.ok(c(m.cima - 0.1).alcance < 0.9 && c(m.estalla).alcance > 1.03 && c(m.estalla + 0.2).lobulo > 1.5, 'los chorros llegan a la punta y florecen');
  for (let s = 0.02; s < ESCENA_CUASAR.duracion; s += 1 / 60) { const a = c(s), b = c(s + 1 / 60); for (const k of ['alcance', 'disco', 'gas', 'fotones', 'otras', 'calido', 'foco', 'lobulo']) assert.ok(Math.abs(a[k] - b[k]) < 0.08, `${k} en ${s.toFixed(2)}`); }
});

test('la pista de cámara del cuásar: en orden, dentro de la canción y sin meterse en el gigante', () => {
  const p = ESCENA_CUASAR.camara;
  assert.equal(p[0].t, 0); assert.ok(p.at(-1).t <= ESCENA_CUASAR.duracion);
  for (let i = 1; i < p.length; i++) assert.ok(p[i].t > p[i - 1].t, `orden en ${p[i].t}`);
  for (const k of p) {
    assert.ok(['suave', 'rapida', 'corte', 'lineal'].includes(k.curva) && k.fov >= 30 && k.fov <= 60);
    // Nunca dentro del disco y lejos del eje de los chorros (radio de la nube del chorro ≈ 0,16 radios en la punta).
    const [az, el, d] = k.pos, g = Math.PI / 180, alto = Math.sin(el * g) * d, fuera = Math.cos(el * g) * d;
    assert.ok(d >= 0.25 && fuera > 0.22, `lejos del eje en ${k.t}`);
    assert.ok(Math.abs(alto) > 0.03 || fuera > 0.95, `no atraviesa el disco en ${k.t}`);
  }
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
