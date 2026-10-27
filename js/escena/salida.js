// Pasada final de color. Reproduce la composición anterior (escena codificada en
// sRGB + brillo lineal) para que todo lo que está por debajo del codo se vea igual,
// y añade dos cosas que faltaban:
//  1. Limpieza: NaN, infinitos y negativos no llegan a la pantalla ni al brillo.
//  2. Hombro de altas luces: lo que antes se recortaba a blanco se comprime con
//     suavidad conservando el matiz, así el núcleo mantiene textura y color.
//  3. Reescalado con enfoque: la escena se dibuja a una resolución interna fija por presupuesto de píxeles (nucleo.js);
//     se amplía al lienzo (bicúbica) y se recupera nitidez con un enfoque adaptativo (RCAS, como FSR 1) limitado al mínimo y
//     máximo de los vecinos: afina estrellas y bordes sin halos ni brillos nuevos. Sin ampliación (PC a la nativa), nada.
//  4. Lente gravitacional y penumbra del salto (antes dos pasadas con su copia de la imagen), solo si están activas.
import { ShaderMaterial, Vector2, Vector4 } from 'three';
import { zonaDe, GLSL_ZONA } from './zona.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { GLSL_LENTE, crearPasadaLente as crearEstadoLente } from './lente.js';

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

// Fuerza del enfoque adaptativo (RCAS, como en FSR 1) según cuánto se amplía la escena hasta la pantalla FÍSICA (escena →
// lienzo en esta pasada y lienzo → pantalla en el navegador, que en el móvil va a DPR 2 como mucho): 1 = sin ampliar, sin
// enfoque (PC a la nativa).
export const nitidezPara = ampliacion => Math.min(1, Math.max(0, (ampliacion - 1.02) * 2.5));
export const LIMITE_RCAS = 0.25 - 1 / 16;

// Réplica en JavaScript del enfoque (por canal): se usa en las pruebas. Como RCAS, el lóbulo negativo se adapta al contraste
// para no pasar del pico y se escala con k; sin el límite de RCAS junto al negro (dejaba sin enfocar las estrellas sobre el
// cielo oscuro: se veían más blandas que antes), porque después nunca sale del rango del centro y sus cuatro vecinos (sin
// halos ni negativos).
export function enfocar(centro, vecinos, k) {
  const mn = Math.min(...vecinos), mx = Math.max(...vecinos), pico = Math.max(1, 1.25 * mx);   // (con margen: en HDR no hay tope que respetar)
  const hitMax = (1 - mx / pico) / (4 * (mn / pico) - 4 - 1e-5);
  const lobulo = Math.max(-LIMITE_RCAS, Math.min(hitMax, 0)) * k;
  const v = (lobulo * vecinos.reduce((a, b) => a + b, 0) + centro) / (4 * lobulo + 1);
  return Math.min(Math.max(mx, centro), Math.max(Math.min(mn, centro), v));
}

// Píxel no válido (NaN o infinito). isnan/isinf existen desde GLSL ES 3.00; en WebGL 1, la comparación consigo mismo y el
// tope (un infinito en media precisión pasa de 65 504). Se comprueba de forma explícita: max(NaN, 0) da 0 en unas GPU y NaN
// en otras, así que «limpiar» por sí solo dejaba el píxel NEGRO (o lo propagaba por el resplandor).
export const GLSL_VALIDO = /* glsl */`
  #if __VERSION__ >= 300
  bool noValido(vec3 c) { return any(isnan(c)) || any(isinf(c)); }
  #else
  bool noValido(vec3 c) { return any(notEqual(c, c)) || any(greaterThan(abs(c), vec3(1e30))); }
  #endif`;

const fragmentShader = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tBrillo;
  uniform float uBrillo;
  uniform vec2 uTexel;
  uniform float uNitidez, uEscalar, uLente, uPenumbra;
  uniform vec2 uCentro;
  uniform vec4 uZona, uZonaBrillo;   // zonas activas de la escena y del resplandor (zona.js)
  varying vec2 vUv;
  ${GLSL_ZONA}
  ${GLSL_LENTE}
  float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }   // hash de Hoskins
  // max/min devuelven el operando válido ante un NaN en las GPU habituales (Metal, NVIDIA, Mali).
  vec3 limpiar(vec3 c) { return min(max(c, vec3(0.0)), vec3(${LIMITE_HDR.toFixed(1)})); }
  vec3 aSrgb(vec3 c) { return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
  ${GLSL_VALIDO}
  vec3 cruda(vec2 uv) { return texture2D(tDiffuse, min(uv, uZona.zw)).rgb; }
  // Un NaN o un infinito suelto en la escena (p. ej. un pow de un negativo en el borde de un triángulo con MSAA) no se pinta
  // negro: se rellena con la media de sus vecinos válidos. Con el reescalado (bicúbica + enfoque, 9 lecturas) un solo
  // píxel así ennegrecía un bloque de 4×4 en la pantalla. La rama solo se toma en esos píxeles: no cuesta nada.
  vec3 muestra(vec2 uv) {
    vec3 c = cruda(uv);
    if (noValido(c)) {
      vec3 suma = vec3(0.0); float n = 0.0;
      // A 1 y 2 píxeles en cruz: cubre también las rayitas de 3 píxeles que dejaban las estelas.
      for (int i = 0; i < 8; i++) {
        float r = i < 4 ? 1.0 : 2.0; int j = i - (i / 4) * 4;
        vec2 d = (j == 0 ? vec2(1.0, 0.0) : j == 1 ? vec2(-1.0, 0.0) : j == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0)) * uTexel * r;
        vec3 v = cruda(uv + d); if (!noValido(v)) { suma += v; n += 1.0; }
      }
      c = n > 0.0 ? suma / n : vec3(0.0);
    }
    return aSrgb(limpiar(c));
  }
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
    // Lente gravitacional (lente.js), solo mientras está activa: desvía de dónde se lee la escena y su resplandor.
    vec2 uvPantalla = uLente > 0.5 ? lente(vUv) : vUv;
    vec2 uv = uvPantalla * uZona.xy;
    vec3 c = uEscalar > 0.5 ? max(bicubica(uv), vec3(0.0)) : muestra(uv);
    // Enfoque adaptativo en el mismo pase (estilo FSR 1, RCAS): el lóbulo se adapta al contraste local, y nunca fuera del
    // mínimo/máximo de los vecinos (sin halos ni brillos nuevos en estrellas y bordes).
    if (uNitidez > 0.0) {
      vec3 n = muestra(uv + vec2(0.0, uTexel.y)), s = muestra(uv - vec2(0.0, uTexel.y));
      vec3 e = muestra(uv + vec2(uTexel.x, 0.0)), o = muestra(uv - vec2(uTexel.x, 0.0));
      vec3 mn4 = min(min(n, s), min(e, o)), mx4 = max(max(n, s), max(e, o));
      float pico = max(1.0, 1.25 * max(max(mx4.r, mx4.g), mx4.b));   // (con margen: en HDR no hay tope que respetar)
      vec3 a = mn4 / pico, z = mx4 / pico;
      vec3 l3 = (1.0 - z) / (4.0 * a - 4.0 - 1e-5);   // (sin el límite junto al negro: ver enfocar)
      float lobulo = clamp(max(max(l3.r, l3.g), l3.b), -${LIMITE_RCAS.toFixed(4)}, 0.0) * uNitidez;
      vec3 r = (lobulo * (n + s + e + o) + c) / (4.0 * lobulo + 1.0);
      c = clamp(r, min(mn4, c), max(mx4, c));
    }
    // Penumbra de la ceremonia (salto.js), solo mientras está activa.
    if (uPenumbra > 0.0) c *= 1.0 - uPenumbra * smoothstep(0.12, 0.65, length((vUv - uCentro) * vec2(uAspecto, 1.0)));
    vec3 brillo = texture2D(tBrillo, enZona(uvPantalla, uZonaBrillo)).rgb;
    c += (noValido(brillo) ? vec3(0.0) : limpiar(brillo)) * uBrillo;
    float m = max(max(c.r, c.g), c.b);
    if (m > ${CODO.toFixed(3)}) {
      float s = ${CODO.toFixed(3)} + ${(1 - CODO).toFixed(3)} * (1.0 - exp(-(m - ${CODO.toFixed(3)}) / ${(1 - CODO).toFixed(3)}));
      float w = clamp((m - 1.0) / 4.0, 0.0, 1.0) * ${BLANQUEO.toFixed(2)};
      c = mix(c * (s / m), vec3(s), w);
    }
    // Tramado (±0,5/255, ruido triangular por píxel): sin él, los degradados oscuros del gas y del cielo salían en
    // bandas al pasar a los 8 bits de la pantalla. Invisible como ruido; las bandas desaparecen.
    float t = h12(gl_FragCoord.xy) + h12(gl_FragCoord.xy + 71.37) - 1.0;
    gl_FragColor = vec4(c + t / 255.0, 1.0);
  }`;

// Pasada final única: lente + penumbra del salto + composición del resplandor + reescalado con enfoque + color de salida.
// La lente y el salto (lente.js, salto.js) ya no son pasadas: si no están activos no cuestan nada (ni una copia de la imagen).
export class SalidaPass extends Pass {
  constructor(brillo, { lente = null, salto = null } = {}) {
    super();
    this.brillo = brillo;                 // resplandor que deja su resultado sin mezclar (o null: sin brillo)
    this.lente = lente; this.salto = salto;
    this.needsSwap = false;
    const ul = (lente ?? crearEstadoLente()).uniforms;
    this.material = new ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tBrillo: { value: null }, uBrillo: { value: 1 }, uTexel: { value: new Vector2() }, uNitidez: { value: 0 }, uEscalar: { value: 0 }, uZona: { value: new Vector4(1, 1, 1, 1) }, uZonaBrillo: { value: new Vector4(1, 1, 1, 1) },
        uLente: { value: 0 }, uAspecto: ul.uAspecto, uL: ul.uL, uF: ul.uF, uPenumbra: { value: 0 }, uCentro: { value: new Vector2(0.5, 0.5) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader, depthTest: false, depthWrite: false
    });
    this.quad = new FullScreenQuad(this.material);
    this.pantalla = new Vector2();
    // Ampliación del lienzo a la pantalla física que hace después el navegador (DPR del lienzo < DPR de la pantalla).
    this.ampliacionNavegador = 1;
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    const rtBrillo = this.brillo ? this.brillo.salida ?? this.brillo.renderTargetsHorizontal[0] : null;
    u.tBrillo.value = rtBrillo ? rtBrillo.texture : null;
    zonaDe(readBuffer, u.uZona.value); if (rtBrillo) zonaDe(rtBrillo, u.uZonaBrillo.value);
    u.uBrillo.value = this.brillo?.enabled ? 1 : 0;
    u.uLente.value = this.lente?.enabled ? 1 : 0;
    u.uPenumbra.value = this.salto?.enabled ? this.salto.uniforms.uPenumbra.value : 0;
    if (this.salto?.enabled) u.uCentro.value.copy(this.salto.uniforms.uCentro.value);
    u.uTexel.value.set(1 / readBuffer.width, 1 / readBuffer.height);
    // Ampliación en esta pasada: lienzo / zona dibujada; el enfoque, según la ampliación total hasta la pantalla.
    const escala = this.renderToScreen ? renderer.getDrawingBufferSize(this.pantalla).x / readBuffer.viewport.z : 1;
    u.uEscalar.value = escala > 1.001 ? 1 : 0;
    u.uNitidez.value = this.renderToScreen ? nitidezPara(escala * this.ampliacionNavegador) : 0;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() { this.material.dispose(); this.quad.dispose(); }
}
