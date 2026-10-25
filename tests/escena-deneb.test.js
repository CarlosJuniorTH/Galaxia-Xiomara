// Deneb («Middle»): el tiempo se rebobina hasta que no queda nada, la estrella nace con la promesa, su mundo se construye y
// «en el medio» se enciende el centro de cada hilo; el drop, con su bombo; empieza y termina en su estado normal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ESCENA_DENEB, CAMARA_DENEB, estadoDeneb } from '../js/util/escenaDeneb.js';
import { ESCENA_DENEB as REEXPORTADA, ESCENAS_GIGANTES, escalarEscena } from '../js/util/escenasGigantes.js';
import { MOMENTOS } from '../js/data/bandaSonora.js';

const m = ESCENA_DENEB.marcas, d = s => ({ ...estadoDeneb(s, ESCENA_DENEB) });
const cerca = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const CAMPOS = ['tau', 'estrella', 'brasa', 'reloj', 'gloria', 'medio', 'calido', 'foco'];

test('Deneb: la escena, la misma en todas partes y con las marcas en orden', () => {
  assert.equal(REEXPORTADA, ESCENA_DENEB); assert.equal(ESCENAS_GIGANTES.deneb, ESCENA_DENEB);
  assert.deepEqual(MOMENTOS.deneb.marcas, ESCENA_DENEB.marcas);
  const v = Object.values(m); assert.ok(v.every((x, i) => i === 0 || x > v[i - 1])); assert.equal(v.at(-1), ESCENA_DENEB.duracion);
});

test('Deneb: empieza y termina en su estado normal (la estrella entera con su mundo), sin saltos', () => {
  const a = d(0), b = d(m.fin), c = d(m.fin + 50);
  for (const k of CAMPOS) { assert.ok(cerca(a[k], b[k], 1e-3), `${k}: ${a[k]} ≠ ${b[k]}`); assert.ok(cerca(b[k], c[k]), k); }
  assert.equal(b.tau, 1); assert.equal(b.estrella, 1); assert.equal(b.reloj, 1); assert.equal(b.encendido, -1);
  // Continuo: ningún campo salta entre dos cuadros (salvo el destello, que crece en un cuarto de segundo).
  let antes = d(0);
  for (let s = 1 / 60; s < m.fin; s += 1 / 60) { const e = d(s); for (const k of ['tau', 'estrella', 'gloria', 'calido', 'foco']) assert.ok(Math.abs(e[k] - antes[k]) < 0.12, `${k} salta en ${s.toFixed(2)}`); antes = e; }
});

test('Deneb: «turn back the time» rebobina hasta la nada y la promesa la hace nacer', () => {
  assert.equal(d(m.atras - 0.05).tau, 1);
  assert.ok(d(m.atras + 1).reloj < -1, 'el tiempo de la estrella corre hacia atrás');
  // La formación baja sin volver a subir hasta la nada…
  let t = 1; for (let s = m.atras; s <= m.promesa; s += 0.1) { const x = d(s).tau; assert.ok(x <= t + 1e-9, `sube en ${s}`); t = x; }
  assert.ok(d(6.7).estrella < 0.1 && d(7).brasa > 0.5, 'la estrella se apaga y queda una brasa');
  assert.ok(d(m.nada + 0.3).tau < 0.03 && d(m.nada + 0.3).estrella === 0 && d(m.nada + 0.3).brasa === 0, '«for us»: ya no hay nada');
  assert.ok(d(m.bien + 0.05).pum > 0.5 && d(m.bien2 + 0.05).pum > 0.5, 'los dos «alright» laten');
  // …y vuelve a crecer desde la promesa: cae la nube, nace en «build», su mundo se completa en «in the middle».
  t = 0; for (let s = m.promesa; s <= m.medio; s += 0.1) { const x = d(s).tau; assert.ok(x >= t - 1e-9, `baja en ${s}`); t = x; }
  assert.ok(d(m.construir - 0.4).estrella < 0.1 && d(m.construir + 0.6).estrella > 0.9, 'nace en «build»');
  assert.ok(d(m.construir + 0.3).encendido > 0 && d(m.construir - 0.1).encendido === -1);
  assert.ok(d(m.mundo).tau < 0.7 && d(m.contigo).tau > 0.8 && cerca(d(m.medio).tau, 1, 1e-3), 'el mundo se construye hilo a hilo');
  assert.ok(d(m.medio - 0.05).medio === 0 && d(m.medio + 0.3).medio > 0.9, '«in the middle»');
});

test('Deneb: el bombo solo late donde suena y el drop la enciende del todo', () => {
  for (let s = 3; s < m.drop - 0.2; s += 0.29) if (Math.abs(s - m.bien) > 1.3 && Math.abs(s - m.bien2) > 1.3) assert.ok(d(s).pum < 0.02, `sin bombo en ${s.toFixed(2)}`);
  assert.ok(d(m.drop + 0.3).gloria > 0.95 && d(m.drop - 0.3).gloria < 0.5);
  // En el drop, un golpe en cada pulso (103 BPM) y el primero de cada compás más fuerte.
  const p = ESCENA_DENEB.pulso, golpe = s => d(s).pum;
  assert.ok(golpe(m.drop + 4 * p + 0.01) > golpe(m.drop + 5 * p + 0.01) && golpe(m.drop + 5 * p + 0.01) > golpe(m.drop + 5.5 * p));
  assert.ok(d(m.segunda + 3).calido > 0.6, 'la segunda mitad, más cálida');
});

test('Deneb: la pista de cámara, en orden, dentro de la canción y fuera de la estrella', () => {
  const formas = new Set(['suave', 'rapida', 'corte', 'lineal']);
  assert.equal(CAMARA_DENEB[0].t, 0); assert.equal(CAMARA_DENEB.at(-1).t, ESCENA_DENEB.duracion);
  CAMARA_DENEB.forEach((p, i) => {
    assert.ok(i === 0 || p.t > CAMARA_DENEB[i - 1].t, `orden en ${p.t}`);
    assert.ok(formas.has(p.curva) && p.pos.length === 3 && p.mira.length === 3 && p.fov > 30 && p.fov < 80, `plano ${p.t}`);
    assert.ok(p.pos[2] > 0.3, `la cámara no entra en la estrella (0,22) en ${p.t}`);
  });
  // En el drop, planos que cambian a compás (cortes o golpes); en los versos, suaves.
  const drop = CAMARA_DENEB.filter(p => p.t >= m.drop && p.t < m.segunda);
  assert.ok(drop.length >= 5 && drop.every(p => p.curva === 'corte' || p.curva === 'rapida'));
  assert.ok(CAMARA_DENEB.some(p => cerca(p.t, m.medio) && Math.abs(p.pos[1]) < 20 && p.curva === 'suave'), '«in the middle»: de frente');
});

test('Deneb: escalada a otra duración, las mismas fases en proporción', () => {
  const c = escalarEscena(ESCENA_DENEB, ESCENA_DENEB.duracion * 1.1), e = estadoDeneb(c.marcas.nada + 0.3, c, {});
  assert.ok(e.tau < 0.05); assert.equal(estadoDeneb(c.duracion, c, {}).tau, 1);
});
