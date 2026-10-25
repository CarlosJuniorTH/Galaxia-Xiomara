// Lente gravitacional en pantalla: alrededor de un agujero negro, la luz de lo que hay detrás
// se curva. Cada píxel toma el color del punto del que viene la luz desviada, así que el
// fondo (estrellas, Vía Láctea, galaxias) se estira en arcos que se mueven al girar alrededor.
// El agujero y su propio disco (dentro de rDentro) no se tocan. Solo trabaja si hay alguno
// en pantalla (index.js activa la pasada).
import { Vector2, Vector4 } from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { zonaDe, GLSL_ZONA } from './zona.js';

export const MAX_LENTES = 2;

export function crearPasadaLente() {
  const pasada = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uZona: { value: new Vector4(1, 1, 1, 1) }, uAspecto: { value: 1 }, uL: { value: Array.from({ length: MAX_LENTES }, () => new Vector4()) }, uF: { value: Array.from({ length: MAX_LENTES }, () => new Vector2()) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform vec4 uZona; uniform float uAspecto; uniform vec4 uL[${MAX_LENTES}]; uniform vec2 uF[${MAX_LENTES}]; varying vec2 vUv;
      ${GLSL_ZONA}
      void main(){
        vec2 uv = vUv;
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
        gl_FragColor = texture2D(tDiffuse, enZona(clamp(uv, 0.0, 1.0), uZona));
      }`
  });
  // Lee la escena dentro de su zona (resolución dinámica sin reasignar, zona.js).
  pasada.render = function (renderer, writeBuffer, readBuffer, ...resto) { zonaDe(readBuffer, this.uniforms.uZona.value); return ShaderPass.prototype.render.call(this, renderer, writeBuffer, readBuffer, ...resto); };
  pasada.enabled = false;
  return pasada;
}
