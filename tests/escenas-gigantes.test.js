import test from 'node:test';
import assert from 'node:assert/strict';
import { ESCENA_PULSAR, ESCENA_CUASAR, ESCENA_DENEB, estadoPulsar, estadoCuasar, REPOSO_CUASAR, estadoDeneb, crearDirector, escalarEscena } from '../js/util/escenasGigantes.js';
import { vueltasPulsar, ritmoGiro, azimutHaz, elevacionHaz } from '../js/util/escenaPulsar.js';

const cerca = (a, b, e = 1e-6) => Math.abs(a - b) < e;

test('las marcas están en orden y dentro de la duración', () => {
  for (const c of [ESCENA_PULSAR, ESCENA_CUASAR, ESCENA_DENEB]) {
    const v = Object.values(c.marcas);
    assert.ok(v.every((x, i) => i === 0 || x > v[i - 1]), c.id);
    assert.equal(v[0], 0); assert.equal(v.at(-1), c.duracion);
  }
});

test('el púlsar nunca se para: su giro solo cambia con la música y es continuo', () => {
  const c = ESCENA_PULSAR, P = c.pulso;
  // Siempre gira hacia delante (nunca se para ni se invierte) y sin saltos de velocidad entre cuadros.
  for (let s = -2; s < c.duracion + 5; s += 1 / 120) {
    const a = vueltasPulsar(s, c), b = vueltasPulsar(s + 1 / 120, c);
    assert.ok(b > a, `gira hacia delante en ${s.toFixed(2)}`);
    assert.ok(Math.abs(ritmoGiro((s + 1 / 120) / P, c) - ritmoGiro(s / P, c)) < 0.01, `sin acelerones en ${s.toFixed(2)}`);
  }
  // La integral exacta coincide con sumar el ritmo (trapecios finos).
  let v = 0; for (let s = 0; s < 30; s += 1e-3) v += ritmoGiro((s + 5e-4) / P, c) * 1e-3 / P;
  assert.ok(Math.abs(v - vueltasPulsar(30, c)) < 1e-3, `${v} / ${vueltasPulsar(30, c)}`);
  // Los cambios de giro caen en la música: dormido 1/8, con «caliente» 1/4 (una vuelta por compás), con el grave 1/2.
  const m = c.marcas;
  assert.equal(ritmoGiro(m.quererte / P, c), 0.125);
  assert.ok(ritmoGiro(m.caliente / P, c) > 0.125 && ritmoGiro((m.caliente + 2) / P, c) === 0.25);
  assert.equal(ritmoGiro((m.grave - 1.2) / P, c), 0.25); assert.ok(Math.abs(ritmoGiro(m.grave / P, c) - 0.5) < 0.01); assert.equal(ritmoGiro(m.fin / P, c), 0.5);
  // El haz de arriba pasa por el mismo punto en los golpes: 270° en los compases del pre-estribillo, 180° cada dos pulsos
  // desde el grave; los planos «en el haz» de la pista de cámara están ahí (a la elevación de su cono).
  for (let k = 16; k <= 28; k += 4) assert.ok(Math.abs(azimutHaz(k * P, c) - 270) < 1e-6, `compás ${k / 4}`);
  for (let k = 30; k <= 58; k += 2) assert.ok(Math.abs(azimutHaz(k * P, c) - 180) < 1e-6, `pulso ${k}`);
  const enHaz = c.camara.filter(p => Math.abs(Math.abs(p.pos[1]) - elevacionHaz(c)) < 3);
  assert.ok(enHaz.length >= 3, 'planos en el camino del haz');
  // Cámara lenta (Carlos): sin cortes ni golpes de cámara.
  assert.ok(c.camara.every(p => p.curva === 'suave' || p.curva === 'lineal'), 'solo planos suaves o travellings');
});

test('el púlsar despierta con la canción: toro de plasma, haces, latido en los golpes y barrido del faro, y queda despierto', async () => {
  const c = ESCENA_PULSAR, m = c.marcas, h = s => ({ ...estadoPulsar(s, c) });
  const dormido = h(0), final = h(c.duracion), despues = h(c.duracion + 50);
  assert.ok(dormido.largo === 0 && dormido.luzHaz === 0 && dormido.casquetes === 0 && dormido.fuerza === 0 && dormido.toro === 0 && dormido.barrido === 0, 'dormido: sin haces, sin latido, toro apagado');
  assert.ok(h(m.quererte - 0.3).toro === 0 && h(m.caliente + 1).toro > 1.1, 'el toro se enciende con «quererte», de dentro afuera');
  assert.ok(h(2.0).largo === 0 && h(3.7).largo > 0.99, 'los haces nacen con el primer bombo (2,19)');
  assert.ok(h(m.caliente - 0.5).fuerza === 0 && h(m.caliente + 1).fuerza > 0.35, 'empieza a latir con «caliente»');
  assert.ok(h(m.previa - 0.5).ondas === 0 && h(m.previa + 1).ondas > 0.5, 'las ondas del ecuador salen desde el pre-estribillo');
  assert.ok(h(m.amor - 0.4).barrido === 0 && h(m.grave + 1).barrido > 0.95, 'el faro enciende el polvo desde «de tu amor» y del todo con el grave');
  assert.ok(h(m.segunda + 1.5).tibio > 0.95, 'rosa y oro en la segunda vuelta');
  for (const k of ['largo', 'luzHaz', 'casquetes', 'toro', 'luzToro', 'barrido', 'tibio', 'ritmo']) assert.ok(cerca(final[k], despues[k]), `persiste: ${k}`);
  assert.ok(final.largo > 0.99 && final.luzHaz > 0.8 && final.toro > 1.1 && final.luzToro > 0.7 && final.barrido > 0.6, 'su diseño final, despierto');
  // Late en los golpes medidos de la canción (bombo y 808), no en un metrónomo: fuerte justo en el golpe y casi nada entre golpes.
  const { GOLPES_PULSAR } = await import('../js/util/escenaPulsar.js');
  const g808 = GOLPES_PULSAR.find(([t]) => t > m.estribillo + 0.3)[0];
  assert.ok(h(g808 + 0.01).pulso > 0.4 && h(g808 + 0.4).pulso < h(g808 + 0.01).pulso * 0.3, 'late en el golpe');
  for (let i = 1; i < GOLPES_PULSAR.length; i++) assert.ok(GOLPES_PULSAR[i][0] > GOLPES_PULSAR[i - 1][0], 'golpes en orden');
  // Sin saltos en lo que no es el latido: ninguna curva cambia más de un 8 % en 1/60 s (el grave enciende en 0,3 s).
  for (let s = 0; s < c.duracion; s += 1 / 60) { const a = h(s), b = h(s + 1 / 60); for (const k of ['largo', 'luzHaz', 'casquetes', 'calor', 'fuerza', 'toro', 'luzToro', 'ondas', 'barrido', 'tibio', 'foco']) assert.ok(Math.abs(a[k] - b[k]) < 0.08, `${k} en ${s.toFixed(2)}`); }
});

test('la pista de cámara del púlsar: ordenada, dentro de la canción y sin atravesar la estrella ni el viento', () => {
  const pista = ESCENA_PULSAR.camara;
  assert.equal(pista[0].t, 0); assert.ok(pista.at(-1).t <= ESCENA_PULSAR.duracion);
  for (let i = 1; i < pista.length; i++) assert.ok(pista[i].t > pista[i - 1].t, `orden en ${pista[i].t}`);
  for (const p of pista) { assert.ok(['suave', 'rapida', 'corte', 'lineal'].includes(p.curva)); assert.ok(p.pos[2] >= 0.3 && p.pos[2] <= 1.2, `distancia en ${p.t}`); assert.ok(p.fov >= 30 && p.fov <= 60); }
  // El último plano: un encuadre normal del gigante (no lejísimos ni pegado).
  assert.ok(pista.at(-1).pos[2] > 0.5 && pista.at(-1).pos[2] < 1.1);
});

test('el cuásar se enciende con la historia: los chorros se recogen, nacen y crecen en las frases clave y acaba en su diseño de siempre', () => {
  const m = ESCENA_CUASAR.marcas, c = s => ({ ...estadoCuasar(s, ESCENA_CUASAR) });
  for (const s of [0, ESCENA_CUASAR.duracion, ESCENA_CUASAR.duracion + 3]) { const e = c(s); for (const k in REPOSO_CUASAR) assert.equal(e[k], REPOSO_CUASAR[k], `${k}: reposo en ${s}`); assert.ok(e.nudos.every(x => x === -1) && e.nudosLuz.every(x => x === 0), `sin nudos en ${s}`); }
  // Justo antes de acabar ya es casi el de siempre (sin salto al terminar).
  const casi = c(ESCENA_CUASAR.duracion - 0.02);
  for (const k of ['alcance', 'disco', 'giro', 'gas', 'caida', 'fotones', 'destello', 'lobulo']) assert.ok(Math.abs(casi[k] - REPOSO_CUASAR[k]) < 0.03, `${k} al final: ${casi[k]}`);
  for (const k of ['otras', 'calido', 'foco', 'ondaK', 'frente']) assert.ok(casi[k] < 0.03, k);
  // Dormido: chorros recogidos y disco apagado hasta «la vi»; entonces asoman.
  assert.ok(c(m.recogido + 0.5).alcance < 0.01 && c(m.recogido + 0.5).enc < 100 && c(m.vi - 0.05).alcance < 0.01);
  assert.ok(c(m.vi + 0.3).alcance > 0.05 && c(m.vi + 0.2).frente > 0.3 && c(m.vi + 0.2).ondaK > 0.5, 'la primera chispa');
  // Los chorros solo crecen (nunca se encogen tras recogerse) y en las frases clave.
  let previo = 0;
  for (let s = m.recogido; s < ESCENA_CUASAR.duracion; s += 0.05) { const a = c(s).alcance; assert.ok(a >= previo - 1e-9, `crece en ${s.toFixed(2)}`); previo = a; }
  const salto = (a, b) => c(b).alcance - c(a).alcance;
  for (const k of ['salir', 'novios', 'wow', 'golpe1', 'golpe2', 'golpe3', 'cima']) assert.ok(salto(m[k] - 0.05, m[k] + 1) > 0.04, `estirón en ${k}`);
  assert.ok(salto(m.otras, m.pero) < 1e-6, 'las otras no hacen crecer los chorros');
  assert.ok(c(m.otras + 2).otras > 0.4 && c(m.bellas + 1.5).otras > 0.95 && c(m.pero + 0.85).otras < 0.01, 'las otras luces se apagan con «pero ella»');
  assert.ok(c(m.vi - 0.1).enc < 1 && c(m.vi + 1).enc > 800 && c(m.vi + 1).enc < 4000 && c(m.vi + 2.9).enc > 6500, 'el disco se enciende desde el centro con «la vi»');
  assert.ok(c(m.vi + 0.3).nudosK > 0.5 && c(m.golpe2 + 0.3).nudosK > 0.5 && c(16).nudosK === 0, 'nudos de plasma en los golpes, ninguno con las otras');
  assert.ok(c(m.cima + 0.5).olaK > 1 && c(m.cima + 0.5).olaR > 1500 && c(m.wow + 0.3).tono > 0.9, 'la ola por la galaxia en «ideal» y el disco calentado en «increíble»');
  assert.ok(c(m.reir + 0.3).ondaK > 0.9 && c(m.disfrutar + 1).ondaK < 0.01, 'la risa');
  assert.ok(c(m.disfrutar + 1.2).calido > 0.95);
  assert.ok(c(m.cima - 0.3).conv > 0.5 && c(m.cima + 0.1).conv === -1 && c(m.cima + 0.5).cima > 0, 'se recoge la luz y sale la onda');
  assert.ok(c(m.cima - 0.1).alcance < 0.92 && c(m.estalla).alcance > 1.03 && c(m.estalla + 0.2).lobulo > 1.5, 'los chorros llegan a la punta y florecen');
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

test('el clip del cuásar con el director real: sin primeros planos borrosos ni meterse en el disco o los chorros', async () => {
  const { muestrearCamara } = await import('../js/util/directorCamara.js');
  const g = Math.PI / 180;
  for (let t = 0; t <= ESCENA_CUASAR.duracion; t += 1 / 30) {
    const m = muestrearCamara(ESCENA_CUASAR.camara, t), [, el, d] = m.pos;
    // Lo que abarca la pantalla (alto) en radios: por debajo de ~0,5 la imagen horneada del remolino se amplía (borrosa).
    assert.ok(2 * d * Math.tan(m.fov * g / 2) > 0.48, `plano demasiado cerrado en ${t.toFixed(2)}: d ${d.toFixed(2)}, fov ${m.fov.toFixed(0)}`);
    assert.ok(Math.cos(el * g) * d > 0.22 && (Math.abs(Math.sin(el * g) * d) > 0.03 || Math.cos(el * g) * d > 0.95), `dentro del gigante en ${t.toFixed(2)}`);
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
  const p = crearDirector({ ...ESCENA_PULSAR, persiste: false }); p.iniciar(5, { alFin: v => { fin = v; } }); p.avanzar(9, 0); assert.equal(p.segundo, 4);
  p.avanzar(5 + ESCENA_PULSAR.duracion + 1, 0); assert.equal(fin, true); assert.equal(p.peso, 0);
  // Una escena que persiste al terminar se queda hasta que se cancela.
  const n = crearDirector({ ...ESCENA_PULSAR, persiste: true }); n.iniciar(0); n.avanzar(ESCENA_PULSAR.duracion + 1, 0);
  assert.ok(n.terminada && n.peso === 1 && n.visible); n.cancelar(); n.avanzar(0, 10); assert.equal(n.peso, 0);
});

test('escalar una escena mueve sus marcas en proporción', () => {
  const e = escalarEscena(ESCENA_PULSAR, 56);
  const k = 56 / ESCENA_PULSAR.duracion;
  assert.equal(e.duracion, 56); assert.ok(cerca(e.marcas.estribillo, 17.83 * k)); assert.equal(ESCENA_PULSAR.marcas.estribillo, 17.83); assert.ok(cerca(e.pulso, ESCENA_PULSAR.pulso * k));
  assert.ok(cerca(escalarEscena(ESCENA_DENEB, ESCENA_DENEB.duracion / 2).pulso, ESCENA_DENEB.pulso / 2));
});
