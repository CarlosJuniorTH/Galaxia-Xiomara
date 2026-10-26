import test from 'node:test';
import assert from 'node:assert/strict';
import { guionTon618, MARCAS_TON618 as M, TUYOS, REPOSO_TON618, CAMARA_TON618, caminoCaida, estrella, DURACION_TON618 } from '../js/util/guionTon618.js';
import { muestrearCamara, pistaDe, crearMuestra } from '../js/util/directorCamara.js';
const muestrearPista = (pista, t) => muestrearCamara(pista, t, crearMuestra());
import { MOMENTOS } from '../js/data/bandaSonora.js';
import { marcasDe, finEscena } from '../js/util/guionAgujeros.js';

test('TON 618: las marcas de la banda sonora son las del clip y la escena acaba con la canción', () => {
  for (const [k, v] of Object.entries(M)) { assert.equal(MOMENTOS.ton618.marcas[k], v, k); assert.equal(marcasDe('ton618')[k], v, k); }
  assert.ok(finEscena('ton618') <= DURACION_TON618 + 0.5 && finEscena('ton618') > DURACION_TON618 - 2);
  assert.equal(TUYOS[0], M.tuyo); assert.ok(TUYOS.includes(M.cumbre));
});

test('TON 618: la estrella viene de lejos, pasa rozando en el primer «yours» y su materia acaba en el disco', () => {
  const r = t => Math.hypot(...estrella(t));
  assert.ok(r(0) > 12, `llega de lejos (${r(0).toFixed(1)} R)`);
  assert.ok(Math.abs(r(M.tuyo) - 2.4) < 1e-6, 'pericentro a 2,4 R justo en el primer «yours»');
  for (let t = 0; t + 0.5 <= M.tuyo; t += 0.5) assert.ok(r(t + 0.5) < r(t), `se acerca sin parar (${t} s)`);
  // Continuidad del camino en el pericentro y, después, cada parte acaba en su anillo (en el plano del disco).
  const a = caminoCaida(-1e-4, 4), b = caminoCaida(1e-4, 4);
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-3, 'sin salto en el pericentro');
  const fin = caminoCaida(20, 4.5); assert.ok(Math.abs(Math.hypot(fin[0], fin[2]) - 4.5) < 0.05 && Math.abs(fin[1]) < 0.01, 'en su anillo del disco');
  assert.ok(Math.hypot(...caminoCaida(8, 0.9)) < 1, 'la cabeza del hilo cruza el horizonte');
});

test('TON 618: el disco empieza dormido, se enciende a saltos en cada «yours» y queda como en reposo', () => {
  const g = t => ({ ...guionTon618(t) });
  assert.ok(g(1).encendido < 0.15, 'al llegar, dormido');
  for (let i = 1; i < TUYOS.length - 1; i++) assert.ok(g(TUYOS[i] + 1).encendido > g(TUYOS[i] - 0.3).encendido + 0.05, `enciende en el «yours» ${i + 1}`);
  assert.ok(g(M.cumbre + 1).encendido > 0.99, 'entero en la cumbre');
  const fin = g(finEscena('ton618') + 1);
  for (const k of ['encendido', 'avivar', 'revelar', 'flujo', 'caida', 'bombo', 'olaF']) assert.ok(Math.abs(fin[k] - REPOSO_TON618[k]) < 0.02, `${k} acaba como en reposo (${fin[k]})`);
  assert.deepEqual(Object.keys(REPOSO_TON618).sort(), Object.keys(g(3)).sort(), 'el reposo tiene los mismos campos');
  // Sin saltos en lo que se mueve despacio (el reloj puede ir a trompicones: la imagen no).
  for (const k of ['encendido', 'revelar', 'caida', 'flujo', 'calma']) { let a = g(0)[k]; for (let t = 0; t < 45; t += 0.02) { const b = g(t)[k]; assert.ok(Math.abs(b - a) < 0.06, `${k} a ${t.toFixed(2)} s`); a = b; } }
  // La onda cae hacia dentro: arranca en el borde encendido y llega al horizonte.
  const o1 = g(TUYOS[4] - 0.1), o2 = g(TUYOS[4] + 1.2); assert.ok(o1.ola >= 0 && o2.ola > o1.ola && o1.olaF > 0);
  // Movimiento reducido: sin destellos fuertes.
  let max = 0, maxR = 0; for (let t = 0; t < 40; t += 0.01) { max = Math.max(max, guionTon618(t).destello); maxR = Math.max(maxR, guionTon618(t, M, { reducido: true }).destello); }
  assert.ok(maxR < max * 0.4);
});

test('TON 618: la pista de cámara sigue la canción y devuelve el control en el encuadre de llegada', () => {
  for (let i = 1; i < CAMARA_TON618.length; i++) assert.ok(CAMARA_TON618[i].t > CAMARA_TON618[i - 1].t, 'en orden');
  assert.equal(pistaDe('ton618').length, CAMARA_TON618.length, 'el director la usa entera');
  assert.notEqual(CAMARA_TON618[0].curva, 'corte', 'el director entra en la pista desde donde esté la cámara');
  assert.ok(Math.abs(CAMARA_TON618.at(-1).t - DURACION_TON618) < 0.01, 'dura lo que la canción');
  const fin = muestrearPista(CAMARA_TON618, 50), ini = muestrearPista(CAMARA_TON618, 0);
  assert.ok(fin.pos[2] > 0.8 && fin.pos[2] < 1.2 && fin.fov === 60 && fin.mira.every(v => v === 0), 'acaba cerca del encuadre normal, mirando al centro');
  assert.ok(ini.pos[2] === 1 && ini.fov === 60);
  // En la cumbre, casi en el plano (la imagen curvada entera); nunca se acerca más que el tope de zoom (0,3).
  assert.ok(Math.abs(muestrearPista(CAMARA_TON618, M.cumbre).pos[1]) < 8, 'la cumbre, casi de canto');
  let ant = muestrearPista(CAMARA_TON618, 0).pos.slice();
  for (let t = 0; t <= DURACION_TON618; t += 0.02) {
    const m = muestrearPista(CAMARA_TON618, t);
    assert.ok(m.pos[2] >= 0.29, `distancia ${m.pos[2].toFixed(3)} a ${t.toFixed(2)} s`);
    assert.ok(m.pos.every(Number.isFinite) && m.mira.every(Number.isFinite));
    // Lenta y sin vaivenes: como mucho 20°/s alrededor del agujero, ~10°/s arriba o abajo (las tangentes monótonas del
    // director se posan en cada extremo de la elevación y el centro del tramo va algo más deprisa), y siempre hacia el mismo lado.
    assert.ok(m.pos[0] - ant[0] <= 1e-6, `sin volver atrás a ${t.toFixed(2)} s`);
    assert.ok(Math.abs(m.pos[0] - ant[0]) < 0.4 && Math.abs(m.pos[1] - ant[1]) < 0.21 && Math.abs(m.pos[2] - ant[2]) < 0.01, `suave a ${t.toFixed(2)} s`);
    ant = m.pos.slice();
  }
});
