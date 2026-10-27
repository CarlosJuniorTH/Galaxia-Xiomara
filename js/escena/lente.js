// Lente gravitacional en pantalla: alrededor de un agujero negro, la luz de lo que hay detrás
// se curva. Cada píxel toma el color del punto del que viene la luz desviada, así que el
// fondo (estrellas, Vía Láctea, galaxias) se estira en arcos que se mueven al girar alrededor.
// El agujero y su propio disco (dentro de rDentro) no se tocan. Solo trabaja si hay alguno
// en pantalla (index.js la activa).
// Ya no es una pasada propia (una copia de la imagen entera en cada cuadro): la pasada final (salida.js) desvía sus
// coordenadas con GLSL_LENTE solo mientras está activa. Esto guarda su estado (uniformes y si está activa).
import { Vector2, Vector4 } from 'three';

export const MAX_LENTES = 2;

export const GLSL_LENTE = /* glsl */`
  uniform float uAspecto; uniform vec4 uL[${MAX_LENTES}]; uniform vec2 uF[${MAX_LENTES}];
  vec2 lente(vec2 uv) {
    for (int i = 0; i < ${MAX_LENTES}; i++) {
      vec4 L = uL[i];                       // xy: centro (uv), z: rDentro, w: fuerza (en unidades de alto)
      if (L.z <= 0.0) continue;
      vec2 d = (uv - L.xy) * vec2(uAspecto, 1.0); float r = length(d);
      if (r <= L.z || r > uF[i].x) continue;
      // Desde el borde del agujero hacia fuera: cerca, el fondo viene de mucho más dentro
      // (se ve estirado en arcos); lejos, la desviación se apaga sin costuras.
      float x = r - L.z, b = L.z + x * (x + L.w * 0.3) / (x + L.w);   // estira hasta ×3 junto al borde, no más
      b = mix(b, r, smoothstep(uF[i].y, uF[i].x, r));
      uv = L.xy + d / r * b / vec2(uAspecto, 1.0);
    }
    return clamp(uv, 0.0, 1.0);
  }`;

export function crearPasadaLente() {
  return { enabled: false, uniforms: { uAspecto: { value: 1 }, uL: { value: Array.from({ length: MAX_LENTES }, () => new Vector4()) }, uF: { value: Array.from({ length: MAX_LENTES }, () => new Vector2()) } } };
}
