import test from 'node:test';
import assert from 'node:assert/strict';
import { nucleoGaussiano } from '../js/util/gaussiano.js';

// Incluye bordes, luces HDR y un fondo oscuro. Compara el filtro original
// texel por texel con las muestras bilineales agrupadas, no solo sus pesos.
for (const radio of [3, 5, 7, 9, 11]) {
  test(`brillo radio ${radio}: agrupación equivalente, incluidos los bordes`, () => {
    const { pesos, pares, total } = nucleoGaussiano(radio);
    const datos = Array.from({ length: 47 }, (_, i) => i % 7 === 0 ? 4.5 : (Math.sin(i * 13) + 1) * 0.03);
    const muestra = x => {
      const inferior = Math.floor(x), k = x - inferior;
      const valor = i => datos[Math.max(0, Math.min(datos.length - 1, i))];
      return valor(inferior) * (1 - k) + valor(inferior + 1) * k;
    };
    for (let x = 0; x < datos.length; x++) {
      let original = datos[x] * pesos[0], agrupado = original;
      for (let i = 1; i < radio; i++) original += (muestra(x - i) + muestra(x + i)) * pesos[i];
      for (const p of pares) agrupado += (muestra(x - p.distancia) + muestra(x + p.distancia)) * p.peso;
      assert.ok(Math.abs(original / total - agrupado / total) < 1e-12);
    }
    assert.ok(1 + 2 * pares.length < 2 * radio - 1);
  });
}
