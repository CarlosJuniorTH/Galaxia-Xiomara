// Resolución dinámica sin reasignar, como en las consolas: cada búfer se reserva UNA vez al tamaño máximo y la
// resolución del cuadro solo cambia la zona (viewport) en la que se dibuja, siempre en la esquina inferior izquierda.
// Quien lee el búfer escala sus coordenadas a esa zona (uZona.xy) y no pasa de su borde (uZona.zw: medio texel antes,
// para que el filtrado no mezcle restos de cuadros anteriores dibujados con otra zona). Antes, cambiar de resolución
// destruía y rehacía el compositor, los once búferes del resplandor y las capas: un cuadro de 30–100 ms en un móvil,
// que caía justo al final de la inercia del giro.
import { Vector4 } from 'three';

// Fija la zona activa de un búfer (en píxeles del búfer, sin pasar de su tamaño).
export function fijarZona(rt, w, h) {
  const zw = Math.max(1, Math.min(rt.width, Math.round(w))), zh = Math.max(1, Math.min(rt.height, Math.round(h)));
  if (rt.viewport.z !== zw || rt.viewport.w !== zh || rt.viewport.x || rt.viewport.y) { rt.viewport.set(0, 0, zw, zh); rt.scissor.set(0, 0, zw, zh); }
  rt.scissorTest = false;
}

// Zona de otro búfer en la misma proporción que la de `de` (los niveles del resplandor siguen a la escena).
export function zonaProporcional(rt, de) {
  fijarZona(rt, Math.ceil(rt.width * de.viewport.z / de.width), Math.ceil(rt.height * de.viewport.w / de.height));
}

// uZona para leer `rt`: xy escala de las coordenadas (0–1 de pantalla → zona), zw límite (medio texel antes del borde).
export function zonaDe(rt, out = new Vector4()) {
  return out.set(rt.viewport.z / rt.width, rt.viewport.w / rt.height, (rt.viewport.z - 0.5) / rt.width, (rt.viewport.w - 0.5) / rt.height);
}

export const GLSL_ZONA = 'vec2 enZona(vec2 uv, vec4 z) { return min(uv * z.xy, z.zw); }';
