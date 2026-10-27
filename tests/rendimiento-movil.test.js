import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture } from 'three';
import { crearDestellos } from '../js/escena/materiales.js';

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
