// Giro de pantalla o cambio de interfaz DURANTE un vuelo: el encuadre de llegada debe corregirse.
//
// El caso reproducido: salir de casa hacia el corazón ya descubierto en horizontal y girar a
// 430×775 durante la aproximación lo dejaba recortado LATERALMENTE, y no era transitorio: al
// aterrizar, `fijarEncuadre()` apuntaba la distancia ideal como si fuera la real y
// `reencuadrar()` ya no veía cambio. El recorte es lateral porque `encuadreCorazon` toma el
// máximo entre el límite por alto y el límite por ancho, y este último lleva `camera.aspect`.
// (Prueba escrita originalmente por Codex; ampliada con los cambios de interfaz.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { correccionAlLlegar, cambioInterfazApreciable } from '../js/util/encuadre.js';

const TAN_V = Math.tan(60 * Math.PI / 360), MARGEN = 1.12;
function encuadreCorazon(vw, vh, mx, my, mz = 0.3, fraccionZona = 1) {
  const aspecto = vw / vh, estrecha = vw <= 600 || aspecto < 0.8;
  const fraccion = estrecha ? Math.max(0.45, fraccionZona * 0.95) : 0.64;
  return Math.max(my * MARGEN / (TAN_V * fraccion), mx * MARGEN / (TAN_V * aspecto * 0.92)) + mz * 0.5;
}
const anchoVisible = (d, vw, vh) => 2 * d * TAN_V * (vw / vh);

test('el caso reproducido: girar a vertical durante el viaje al corazón deja de recortarlo', () => {
  for (const [mx, my] of [[1.2, 1], [1.16, 1], [1.1, 0.95]]) {
    const dSalida = encuadreCorazon(775, 430, mx, my), dIdeal = encuadreCorazon(430, 775, mx, my);
    assert.ok(anchoVisible(dSalida, 430, 775) < 2 * mx, 'el caso ya no reproduce el recorte');
    for (const idealSalida of [undefined, dSalida]) {
      const c = correccionAlLlegar({ vwVuelo: 775, vhVuelo: 430, vw: 430, vh: 775, distanciaActual: dSalida, distanciaIdeal: dIdeal, idealSalida });
      assert.ok(c, 'no se corrige el giro durante el vuelo');
      assert.ok(Math.abs(c.aD - dIdeal) < 1e-9);
      assert.ok(anchoVisible(c.aD, 430, 775) >= 2 * mx, 'sigue recortado tras corregir');
      assert.ok(c.aD > c.desdeD, 'se aleja, nunca se acerca: no atraviesa el objeto');
    }
  }
});

test('sin giro ni cambio de interfaz durante el vuelo no se toca la cámara recién llegada', () => {
  assert.equal(correccionAlLlegar({ vwVuelo: 430, vhVuelo: 775, vw: 430, vh: 775, distanciaActual: 100, distanciaIdeal: 180 }), null);
  assert.equal(correccionAlLlegar({ vwVuelo: 430, vhVuelo: 775, vw: 430, vh: 775, distanciaActual: 105, distanciaIdeal: 100, idealSalida: 100 }), null);
});

test('un cambio de interfaz durante el vuelo (sin girar) corrige con la razón de encuadres', () => {
  const c = correccionAlLlegar({ vwVuelo: 430, vhVuelo: 775, vw: 430, vh: 775, distanciaActual: 1056, distanciaIdeal: 1300, idealSalida: 1000 });
  assert.ok(c); assert.ok(Math.abs(c.aD - 1056 * 1.3) < 1e-9, 'conserva la relación propia del lugar con su ideal');
});

test('las barras del navegador (alto <20%) no reencuadran, igual que en reposo', () => {
  for (const vh of [775, 740, 700, 712, 600]) {
    const cambio = Math.abs(vh - 775) / 775, c = correccionAlLlegar({ vwVuelo: 430, vhVuelo: 775, vw: 430, vh, distanciaActual: 100, distanciaIdeal: 180 });
    if (cambio < 0.2) assert.equal(c, null, `alto ${vh}`); else assert.ok(c, `alto ${vh}`);
  }
});

test('un cambio inapreciable de distancia no mueve la cámara; datos incompletos no inventan correcciones', () => {
  assert.equal(correccionAlLlegar({ vwVuelo: 775, vhVuelo: 430, vw: 430, vh: 775, distanciaActual: 1000, distanciaIdeal: 1010 }), null);
  const base = { vwVuelo: 775, vhVuelo: 430, vw: 430, vh: 775, distanciaActual: 100, distanciaIdeal: 180 };
  for (const campo of Object.keys(base)) for (const malo of [0, -1, NaN, undefined, null]) assert.equal(correccionAlLlegar({ ...base, [campo]: malo }), null, `${campo}=${malo}`);
  assert.equal(correccionAlLlegar(), null);
});

test('en reposo, solo un cambio apreciable de la franja libre reencuadra', () => {
  assert.equal(cambioInterfazApreciable(1000, 1020), false);
  assert.equal(cambioInterfazApreciable(1000, 1300), true);
  assert.equal(cambioInterfazApreciable(0, 1300), false);
});
