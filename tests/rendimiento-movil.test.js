import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture } from 'three';
import { crearReguladorResolucion } from '../js/util/resolucion.js';
import { crearDestellos } from '../js/escena/materiales.js';

// Una ventana del regulador dura 1,5 s.
const ventana = (registrar, ms, segundos = 1.5) => { let r = null; for (let t = 0; t < segundos * 1000; t += ms) { const v = registrar(ms); if (v !== null) r = v; } return r; };

test('a 25 FPS (la tarjeta gráfica no llega) la resolución baja enseguida y a pasos grandes hasta el mínimo; después aligera efectos', () => {
  let agotado = 0, res = 2;
  const registrar = crearReguladorResolucion({ minimo: 1, maximo: 3, inicial: 2, alAgotar: () => agotado++ });
  // Cuadros que dependen de los píxeles: con menos resolución van más rápido.
  const paso = () => { const r = ventana(ms => registrar(ms), 20 + 19 * (res / 2) ** 2); if (r !== null) res = r; return r; };
  assert.equal(paso(), 1.5, 'menos de 38 FPS: baja medio punto en 1,5 s');
  assert.equal(paso(), 1, 'la bajada aceleró: sigue bajando');
  assert.equal(paso(), null, 'no baja del mínimo');
  assert.equal(agotado, 1, 'en el mínimo y aún lento: avisa para aligerar');
});

test('si lo que pesa no son los píxeles (vértices), deshace la bajada y prueba a aligerar, que sí acelera', () => {
  let escalon = 0, res = 2;
  const registrar = crearReguladorResolucion({ minimo: 1, maximo: 3, inicial: 2, alAgotar: () => { if (escalon >= 4) return false; escalon++; return true; }, alRecuperar: () => { if (!escalon) return false; escalon--; return true; } });
  const paso = () => { const r = ventana(ms => registrar(ms), 40 - escalon * 8); if (r !== null) res = r; return r; };
  assert.equal(paso(), 1.5); assert.equal(paso(), 2, 'la resolución no ayudó: vuelve');
  assert.equal(paso(), null); assert.equal(escalon, 1, 'prueba un escalón de aligerar');
  paso(); assert.equal(escalon, 2, 'ayudó (40 → 32 ms): se queda y sigue');
  assert.equal(res, 2, 'la nitidez se conserva');
});

test('si nada acelera (el procesador no llega), vuelve a la nitidez y a los efectos de antes y no insiste', () => {
  let escalon = 0, intentos = 0;
  const registrar = crearReguladorResolucion({ minimo: 1, maximo: 3, inicial: 2, alAgotar: () => { intentos++; escalon++; return true; }, alRecuperar: () => { if (!escalon) return false; escalon--; return true; } });
  assert.equal(ventana(registrar, 39), 1.5, 'lo intenta una vez');
  assert.equal(ventana(registrar, 39), 2, 'no sirvió: vuelve a la nitidez de antes');
  for (let i = 0; i < 10; i++) assert.equal(ventana(registrar, 39), null, 'la resolución no se reintenta enseguida');
  assert.equal(intentos, 1, 'prueba aligerar una sola vez');
  assert.equal(escalon, 0, 'y como tampoco sirvió, lo devuelve');
});

test('a 45 FPS baja un cuarto en una sola ventana (la mediana ignora un tirón aislado)', () => {
  const registrar = crearReguladorResolucion({ minimo: 1, maximo: 3, inicial: 2 });
  assert.equal(registrar.length, 1);
  let r = null; for (let k = 0; k < 89; k++) { const v = registrar(16.7); if (v !== null) r = v; } const v = registrar(300); if (v !== null) r = v;
  assert.equal(r, null, 'un tirón de 300 ms entre cuadros fluidos no cambia nada');
  assert.equal(ventana(registrar, 22), 1.75);
});

test('a 60 FPS estables sube, y si la subida no se sostiene fija ese techo', () => {
  const registrar = crearReguladorResolucion({ minimo: 1, maximo: 3, inicial: 2 });
  for (let i = 0; i < 5; i++) assert.equal(ventana(registrar, 16.7), null, 'espera seis ventanas estables (9 s)');
  assert.equal(ventana(registrar, 16.7), 2.25);
  assert.equal(ventana(registrar, 22), 2, 'la subida no se sostuvo');
  for (let i = 0; i < 8; i++) assert.equal(ventana(registrar, 16.7), null, 'no vuelve a probar por encima del techo');
});

test('los destellos agrupados son una sola llamada con los atributos de cada sprite', () => {
  const lista = Array.from({ length: 192 }, (_, i) => ({ pos: [i, 0, -i], color: 0xffd7a6, tam: 19, opacidad: 0.5, pulso: 0.1 }));
  const puntos = crearDestellos(lista, { map: new Texture(), uScale: { value: 1000 }, uPR: { value: 2 } });
  for (const [nombre, ancho] of [['position', 3], ['aColor', 3], ['aSize', 1], ['aOpacidad', 1], ['aPulso', 1], ['aPhase', 1]]) {
    const a = puntos.geometry.getAttribute(nombre); assert.equal(a.count, 192); assert.equal(a.itemSize, ancho);
  }
  assert.equal(puntos.isPoints, true);
  assert.match(puntos.material.vertexShader, /0\.57735/, 'mismo tamaño en pantalla que un sprite con fov 60');
  puntos.geometry.dispose(); puntos.material.dispose();
});
