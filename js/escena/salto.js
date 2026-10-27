// Se conserva la interfaz de la antigua pasada del salto. El movimiento se dibuja con estelas geométricas en velocidad.js;
// esto solo guarda la penumbra de la periferia de la ceremonia, que aplica la pasada final (salida.js) mientras está activa
// (sin pasada propia ni copia de la imagen).
import { Vector2 } from 'three';
export function crearPasadaSalto() {
  return { enabled: false, uniforms: { uFuerza: { value: 0 }, uFlash: { value: 0 }, uPenumbra: { value: 0 }, uCentro: { value: new Vector2(0.5, 0.5) }, uAspecto: { value: 1 }, uOnda: { value: 2 } } };
}
