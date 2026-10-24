// Pasada final de color. Reproduce la composición anterior (escena codificada en
// sRGB + brillo lineal) para que todo lo que está por debajo del codo se vea igual,
// y añade dos cosas que faltaban:
//  1. Limpieza: NaN, infinitos y negativos no llegan a la pantalla ni al brillo.
//  2. Hombro de altas luces: lo que antes se recortaba a blanco se comprime con
//     suavidad conservando el matiz, así el núcleo mantiene textura y color.
//  3. Reescalado con enfoque: cuando la escena se dibuja a menos resolución que la
//     pantalla (móvil), se amplía a la nativa y se recupera nitidez con un enfoque
//     adaptativo limitado al mínimo y máximo de los vecinos: afina estrellas y bordes
//     sin halos ni brillos nuevos. Con la misma resolución (PC) no se aplica.
import { ShaderMaterial, Vector2 } from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const CODO = 0.8;           // a partir de este valor (espacio de pantalla) empieza el hombro
export const LIMITE_HDR = 64;      // tope de seguridad del búfer HDR
const BLANQUEO = 0.35;             // las luces extremas tienden un poco al blanco, como en una foto

const linealASrgb = x => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const limpiar = x => (Number.isFinite(x) ? Math.min(Math.max(x, 0), LIMITE_HDR) : 0);

// Réplica exacta en JavaScript del shader: se usa en las pruebas.
export function curvaSalida([r, g, b], brillo = [0, 0, 0]) {
  const c = [r, g, b].map((v, i) => linealASrgb(limpiar(v)) + limpiar(brillo[i]));
  const m = Math.max(...c);
  if (m <= CODO) return c;
  const s = CODO + (1 - CODO) * (1 - Math.exp(-(m - CODO) / (1 - CODO)));
  const w = Math.min(Math.max((m - 1) / 4, 0), 1) * BLANQUEO;
  return c.map(v => v * (s / m) * (1 - w) + s * w);
}

// Intensidad del enfoque según cuánto se amplía la escena (1 = sin ampliar).
export const nitidezPara = escala => Math.min(0.35, Math.max(0, (escala - 1) * 0.6));

// Réplica en JavaScript del enfoque (por canal): se usa en las pruebas.
export function enfocar(centro, vecinos, k) {
  const mn = Math.min(centro, ...vecinos), mx = Math.max(centro, ...vecinos);
  const v = centro + (4 * centro - vecinos.reduce((a, b) => a + b, 0)) * k;
  return Math.min(mx, Math.max(mn, v));
}

const fragmentShader = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tBrillo;
  uniform float uBrillo;
  uniform vec2 uTexel;
  uniform float uNitidez;
  varying vec2 vUv;
  // max/min devuelven el operando válido ante un NaN en las GPU habituales (Metal, NVIDIA, Mali).
  vec3 limpiar(vec3 c) { return min(max(c, vec3(0.0)), vec3(${LIMITE_HDR.toFixed(1)})); }
  vec3 aSrgb(vec3 c) { return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
  vec3 muestra(vec2 uv) { return aSrgb(limpiar(texture2D(tDiffuse, uv).rgb)); }
  // Ampliación bicúbica Catmull-Rom con 5 lecturas filtradas (la bilineal emborronaba bordes y estrellas al ampliar):
  // conserva la nitidez de lo que se dibujó a menos resolución que la pantalla.
  vec3 bicubica(vec2 uv) {
    vec2 res = 1.0 / uTexel, p = uv * res - 0.5, f = fract(p), b = floor(p) + 0.5;
    vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f), w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
    vec2 w12 = w1 + w2, t0 = (b - 1.0) * uTexel, t3 = (b + 2.0) * uTexel, t12 = (b + w2 / w12) * uTexel;
    vec3 c = muestra(vec2(t12.x, t0.y)) * w12.x * w0.y + muestra(vec2(t0.x, t12.y)) * w0.x * w12.y + muestra(t12) * w12.x * w12.y
           + muestra(vec2(t3.x, t12.y)) * w3.x * w12.y + muestra(vec2(t12.x, t3.y)) * w12.x * w3.y;
    return c / (w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y);
  }
  void main() {
    vec3 c = uNitidez > 0.0 ? max(bicubica(vUv), vec3(0.0)) : muestra(vUv);
    if (uNitidez > 0.0) {
      vec3 n = muestra(vUv + vec2(0.0, uTexel.y)), s = muestra(vUv - vec2(0.0, uTexel.y));
      vec3 e = muestra(vUv + vec2(uTexel.x, 0.0)), o = muestra(vUv - vec2(uTexel.x, 0.0));
      vec3 mn = min(c, min(min(n, s), min(e, o))), mx = max(c, max(max(n, s), max(e, o)));
      c = clamp(c + (4.0 * c - (n + s + e + o)) * uNitidez, mn, mx);
    }
    c += limpiar(texture2D(tBrillo, vUv).rgb) * uBrillo;
    float m = max(max(c.r, c.g), c.b);
    if (m > ${CODO.toFixed(3)}) {
      float s = ${CODO.toFixed(3)} + ${(1 - CODO).toFixed(3)} * (1.0 - exp(-(m - ${CODO.toFixed(3)}) / ${(1 - CODO).toFixed(3)}));
      float w = clamp((m - 1.0) / 4.0, 0.0, 1.0) * ${BLANQUEO.toFixed(2)};
      c = mix(c * (s / m), vec3(s), w);
    }
    gl_FragColor = vec4(c, 1.0);
  }`;

export class SalidaPass extends Pass {
  constructor(brillo) {
    super();
    this.brillo = brillo;                 // UnrealBloomPass que deja su resultado sin mezclar (o null: sin brillo)
    this.needsSwap = false;
    this.material = new ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tBrillo: { value: null }, uBrillo: { value: 1 }, uTexel: { value: new Vector2() }, uNitidez: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader, depthTest: false, depthWrite: false
    });
    this.quad = new FullScreenQuad(this.material);
    this.pantalla = new Vector2();
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tBrillo.value = this.brillo ? this.brillo.renderTargetsHorizontal[0].texture : null;
    u.uBrillo.value = this.brillo?.enabled ? 1 : 0;
    // Enfoque solo al presentar en pantalla y si la escena es más pequeña que el lienzo.
    u.uTexel.value.set(1 / readBuffer.width, 1 / readBuffer.height);
    u.uNitidez.value = this.renderToScreen ? nitidezPara(renderer.getDrawingBufferSize(this.pantalla).x / readBuffer.width) : 0;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() { this.material.dispose(); this.quad.dispose(); }
}
