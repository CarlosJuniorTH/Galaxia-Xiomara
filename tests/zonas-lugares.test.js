// Los tres niveles del mapa y del panel Explorar: cada lugar en uno solo y donde está de verdad.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESTINOS, LEJANOS, ZONAS_LUGARES, lugaresDeZona } from '../js/data/universo.js';
import { SITIOS_DESTINO, posicionDestino } from '../js/data/sitios.js';
import { RADIO_XIOMARA } from '../js/data/escalaCosmica.js';

class V { constructor(x, y, z) { Object.assign(this, { x, y, z }); } multiplyScalar(k) { this.x *= k; this.y *= k; this.z *= k; return this; } }

test('cada lugar está en un solo nivel y no falta ninguno', () => {
  const todos = [...ZONAS_LUGARES.solar, ...ZONAS_LUGARES.galaxia, ...ZONAS_LUGARES.fuera];
  assert.equal(new Set(todos).size, todos.length);
  assert.deepEqual([...todos].sort(), [...DESTINOS, ...LEJANOS].map(d => d.id).sort());
  for (const z of Object.keys(ZONAS_LUGARES)) assert.ok(lugaresDeZona(z).every(Boolean));
});

test('el gigante del corazón vive en el sistema solar, no más allá de la galaxia', () => {
  assert.ok(ZONAS_LUGARES.solar.includes('gigante'));
  assert.ok(!ZONAS_LUGARES.fuera.includes('gigante'));
});

test('los seis grandes están fuera de la galaxia de Xiomara (según su posición en la escena)', () => {
  assert.deepEqual([...ZONAS_LUGARES.fuera].sort(), Object.keys(SITIOS_DESTINO).sort());
  for (const id of ZONAS_LUGARES.fuera) { const p = posicionDestino(id, V); assert.ok(Math.hypot(p.x, p.y, p.z) > RADIO_XIOMARA * 100, id); }
});
