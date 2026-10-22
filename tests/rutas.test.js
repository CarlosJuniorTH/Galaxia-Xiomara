// Trayectorias: la curva FINAL no corta ningún cuerpo, comprobado por segmentos sobre una muestra densa.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { esquivar, holgura, cercanoSegmento } from '../js/util/ruta.js';
import { generador } from '../js/util/azarSemilla.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const recta = (a, b) => new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.5), b], false, 'centripetal');

test('distancia de un punto a un segmento (no solo a sus extremos)', () => {
  assert.equal(cercanoSegmento(v(-10, 0, 0), v(10, 0, 0), v(0, 3, 0)), 3);
  assert.equal(cercanoSegmento(v(-10, 0, 0), v(10, 0, 0), v(13, 4, 0)), 5);
});

test('un cuerpo pequeño entre dos muestras: la comprobación por segmentos lo ve y la curva lo esquiva', () => {
  // Trayecto de 100 000 con 160 muestras (~625 entre ellas) y un cuerpo de radio 200 en medio.
  const desde = v(0, 0, 0), hasta = v(100000, 0, 0), o = [{ c: v(50000 + 312, 0, 0), r: 200 }];
  const antes = recta(desde, hasta);
  // Muestreando solo puntos (como antes) podía no verse: los dos vecinos quedan a ~312 del centro.
  const pts = antes.getSpacedPoints(160), soloPuntos = Math.min(...pts.map(p => p.distanceTo(o[0].c))) / 200;
  assert.ok(holgura(antes, desde, hasta, o).minimo < 0.05, 'la recta corta el cuerpo');
  assert.ok(soloPuntos > 1, `con solo puntos no se detectaba (holgura aparente ${soloPuntos.toFixed(2)})`);
  const final = esquivar(antes, desde, hasta, o);
  assert.ok(holgura(final, desde, hasta, o).minimo >= 1, 'la curva final lo libra');
});

test('rutas al azar entre varios cuerpos: la curva final los libra todos (200 casos reproducibles)', () => {
  const azar = generador(11);
  let peores = [];
  for (let k = 0; k < 200; k++) {
    const desde = v(azar() * 2e5 - 1e5, azar() * 4e4 - 2e4, azar() * 2e5 - 1e5), hasta = v(azar() * 2e5 - 1e5, azar() * 4e4 - 2e4, azar() * 2e5 - 1e5);
    const obs = Array.from({ length: 6 }, () => ({ c: desde.clone().lerp(hasta, 0.15 + azar() * 0.7).add(v(azar() - 0.5, azar() - 0.5, azar() - 0.5).multiplyScalar(6000)), r: 500 + azar() * 4000 }))
      .filter(o => o.c.distanceTo(desde) > o.r * 1.5 && o.c.distanceTo(hasta) > o.r * 1.5);
    const h = holgura(esquivar(recta(desde, hasta), desde, hasta, obs), desde, hasta, obs).minimo;
    peores.push(h);
  }
  const fallan = peores.filter(h => h < 1).length;
  assert.equal(fallan, 0, `${fallan} rutas tocan un cuerpo (peor holgura ${Math.min(...peores).toFixed(3)})`);
});

test('salir de dentro (casa) y llegar a casa: solo se libra el tramo propio, no todo el trayecto', () => {
  const galaxia = { c: v(0, 0, 0), r: 1600, llegada: true };
  const casa = v(0, 500, 950), lejos = v(60000, -2000, 20000), otro = { c: v(30000, -1000, 10000), r: 3000 };
  for (const [a, b] of [[casa, lejos], [lejos, casa]]) {
    const final = esquivar(recta(a, b), a, b, [galaxia, otro]);
    assert.ok(holgura(final, a, b, [galaxia, otro]).minimo >= 1, 'libra ambos con sus excepciones');
    assert.ok(final.getPoint(0).distanceTo(a) < 1 && final.getPoint(1).distanceTo(b) < 1, 'empieza y termina donde debe');
  }
  // Desde casa hacia el otro lado de la galaxia: no puede cruzar su centro.
  const otroLado = v(0, -20000, -60000), ruta = esquivar(recta(casa, otroLado), casa, otroLado, [galaxia]);
  const minimo = Math.min(...ruta.getSpacedPoints(3000).map(p => p.length()));
  assert.ok(minimo >= casa.length() * 0.95, `al salir de casa no se adentra en la galaxia (mínimo ${minimo.toFixed(0)} frente a ${casa.length().toFixed(0)})`);
});
