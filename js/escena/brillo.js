// Resplandor (bloom) como en los motores de juego: una cadena de mips de 1/2 a 1/32 de la escena. Bajada con el filtro de
// 13 lecturas (Jimenez, CoD: Advanced Warfare) y subida acumulando cada nivel con una tienda (tent) de 3×3 sobre el nivel
// de abajo. Mismo aspecto que el UnrealBloomPass de three.js que había (umbral, cinco niveles, sus pesos y la anchura de
// cada uno): la anchura de cada nivel se iguala a la del original sumando varianzas (bajadas + tiendas + un núcleo propio
// por nivel, ver anchuras()). Primer nivel a ½ de la escena: así no se derrama más sobre lo que tapa a los agujeros negros.
// Antes: filtro de brillo + 10 pasadas de desenfoque (dos a ½) + composición a ½; ahora 10 pasadas, solo dos a ½, y la
// composición con la escena la hace la pasada final (salida.js), que lee el resultado (this.salida) una vez.
// Cada búfer se dibuja en la zona que corresponde a la de la escena (zona.js: la postal a más resolución no reasigna).
import { ShaderMaterial, Vector2, Vector4, WebGLRenderTarget, HalfFloatType, LinearFilter } from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { nucleoGaussiano } from '../util/gaussiano.js';
import { zonaProporcional, zonaDe, GLSL_ZONA } from './zona.js';
import { LIMITE_HDR, GLSL_VALIDO } from './salida.js';

export const NIVELES = 5;
const RADIOS_ORIGINAL = [3, 5, 7, 9, 11];   // UnrealBloomPass r160: radio (= sigma, truncado en 1 sigma) de cada nivel
const FACTORES = [1.0, 0.8, 0.6, 0.4, 0.2]; // y sus pesos, mezclados con el radio (lerpBloomFactor)
const VAR_13 = 1.5 + 0.25;                  // varianza por eje del filtro de 13 lecturas (+ la caja 2×2 de cada lectura), en texeles de origen²
const VAR_TIENDA = 0.5 + 0.1875;            // tienda 3×3 de radio 1 (+ la interpolación al ampliar ×2), en texeles de origen²
const N = n => n.toPrecision(10);

// Varianza por eje (px² de la escena) de cada nivel del original: núcleo gaussiano truncado de cada nivel, sumado a los de
// los niveles anteriores (cada nivel parte del anterior ya difuminado).
function varianzasOriginal() {
  const out = []; let acumulada = 0.25;   // (el filtro de brillo lee una caja de 2×2)
  RADIOS_ORIGINAL.forEach((r, k) => {
    const { pesos } = nucleoGaussiano(r); let s = pesos[0], v = 0;
    for (let i = 1; i < pesos.length; i++) { s += 2 * pesos[i]; v += 2 * pesos[i] * i * i; }
    acumulada += (v / s) * 4 ** (k + 1); out.push(acumulada);
  });
  return out;
}

// Núcleo propio de cada nivel (texeles del nivel): lo que falta para igualar la anchura del original tras la bajada y las
// tiendas de la subida. Rejilla de n×n lecturas bilineales cada 2 texeles (cada una es una caja 2×2 exacta), pesos
// gaussianos de sigma s elegido para dar esa varianza.
export function anchuras() {
  const original = varianzasOriginal(), out = [];
  let bajada = 0;
  for (let k = 0; k < NIVELES; k++) {
    bajada += VAR_13 * 4 ** k;   // bajada al nivel k (texeles de origen de 2^k px)
    let tiendas = 0; for (let i = 0; i < k; i++) tiendas += VAR_TIENDA * 4 ** (i + 2);
    const falta = Math.max(0, (original[k] - bajada - tiendas) / 4 ** (k + 1));   // en texeles del nivel²
    let n = 2; while ((n * n - 1) / 3 + 0.25 < falta * 1.3 && n < 16) n += 2;   // la rejilla más pequeña que llega con pesos que caen
    const varRejilla = s => { let a = 0, b = 0; for (let i = 0; i < n; i++) { const o = 2 * i - n + 1, w = Math.exp(-o * o / (2 * s * s)); a += w * o * o; b += w; } return a / b + 0.25; };
    let lo = 0.05, hi = 50; for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (varRejilla(m) < falta) lo = m; else hi = m; }
    out.push({ n, s: (lo + hi) / 2, varianza: falta, conseguida: varRejilla((lo + hi) / 2) });
  }
  return out;
}

const VERTICE = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

// Filtro de 13 lecturas: cinco cajas 2×2 solapadas (pesos 0,5 la central y 0,125 cada esquina).
const TRECE = [[0, 0, 0.125], [-2, 2, 0.03125], [2, 2, 0.03125], [-2, -2, 0.03125], [2, -2, 0.03125], [0, 2, 0.0625], [-2, 0, 0.0625], [2, 0, 0.0625], [0, -2, 0.0625], [-1, 1, 0.125], [1, 1, 0.125], [-1, -1, 0.125], [1, -1, 0.125]];

function materialBajada(prefiltro) {
  return new ShaderMaterial({
    uniforms: { tFuente: { value: null }, uTexel: { value: new Vector2() }, uZona: { value: new Vector4(1, 1, 1, 1) }, uUmbral: { value: 0.78 } },
    vertexShader: VERTICE, depthTest: false, depthWrite: false,
    fragmentShader: /* glsl */`
      uniform sampler2D tFuente; uniform vec2 uTexel; uniform vec4 uZona; uniform float uUmbral; varying vec2 vUv;
      ${GLSL_ZONA} ${GLSL_VALIDO}
      vec3 lee(vec2 d) {
        vec3 c = texture2D(tFuente, enZona(vUv * uZona.xy + d * uTexel, uZona)).rgb;
        ${prefiltro ? `// Filtro de brillo del original en cada lectura (sin NaN, infinitos ni negativos y con el tope del HDR): una
        // estrella de un píxel conserva su resplandor como antes.
        c = noValido(c) ? vec3(0.0) : min(max(c, vec3(0.0)), vec3(${LIMITE_HDR.toFixed(1)}));
        return c * smoothstep(uUmbral, uUmbral + 0.01, dot(c, vec3(0.299, 0.587, 0.114)));` : 'return c;'}
      }
      void main() {
        vec3 s = ${TRECE.map(([x, y, w]) => `lee(vec2(${N(x)}, ${N(y)})) * ${N(w)}`).join(' + ')};
        gl_FragColor = vec4(s, 1.0);
      }`
  });
}

function materialSubida({ n, s }, ultimo) {
  const taps = [], o = i => 2 * i - n + 1; let total = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const w = Math.exp(-(o(i) ** 2 + o(j) ** 2) / (2 * s * s)); taps.push([o(i), o(j), w]); total += w; }
  return new ShaderMaterial({
    uniforms: { tNivel: { value: null }, uTexel: { value: new Vector2() }, uZona: { value: new Vector4(1, 1, 1, 1) }, uFactor: { value: 1 },
      tSuperior: { value: null }, uTexelSup: { value: new Vector2() }, uZonaSup: { value: new Vector4(1, 1, 1, 1) }, uFuerza: { value: 1 } },
    vertexShader: VERTICE, depthTest: false, depthWrite: false,
    fragmentShader: /* glsl */`
      uniform sampler2D tNivel, tSuperior; uniform vec2 uTexel, uTexelSup; uniform vec4 uZona, uZonaSup; uniform float uFactor, uFuerza; varying vec2 vUv;
      ${GLSL_ZONA}
      vec3 nivel(vec2 d) { return texture2D(tNivel, enZona(vUv * uZona.xy + d * uTexel, uZona)).rgb; }
      vec3 sup(vec2 d) { return texture2D(tSuperior, enZona(vUv * uZonaSup.xy + d * uTexelSup, uZonaSup)).rgb; }
      void main() {
        vec3 propio = ${taps.map(([x, y, w]) => `nivel(vec2(${N(x)}, ${N(y)})) * ${N(w / total)}`).join(' + ')};
        vec3 c = propio * uFactor;
        ${ultimo ? '' : `// Tienda 3×3 sobre el nivel de abajo (ya acumulado).
        c += (sup(vec2(0.0)) * 4.0 + (sup(vec2(1.0, 0.0)) + sup(vec2(-1.0, 0.0)) + sup(vec2(0.0, 1.0)) + sup(vec2(0.0, -1.0))) * 2.0
            + sup(vec2(1.0, 1.0)) + sup(vec2(-1.0, 1.0)) + sup(vec2(1.0, -1.0)) + sup(vec2(-1.0, -1.0))) * 0.0625;`}
        gl_FragColor = vec4(c * uFuerza, 1.0);
      }`
  });
}

export class BrilloMips extends Pass {
  constructor(resolucion = new Vector2(256, 256), strength = 1, radius = 0, threshold = 0) {
    super();
    this.strength = strength; this.radius = radius; this.threshold = threshold;
    this.nMips = NIVELES; this.needsSwap = false;
    const rt = () => { const t = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false }); t.texture.minFilter = t.texture.magFilter = LinearFilter; t.texture.generateMipmaps = false; return t; };
    this.bajadas = Array.from({ length: NIVELES }, rt);
    this.subidas = Array.from({ length: NIVELES }, rt);
    this.salida = this.subidas[0];   // lo que compone la pasada final (ya multiplicado por la fuerza)
    this.anchuras = anchuras();
    this.prefiltro = materialBajada(true); this.bajada = materialBajada(false);
    this.materialesSubida = this.anchuras.map((a, k) => materialSubida(a, k === NIVELES - 1));
    this.fsQuad = new FullScreenQuad(null);
    this.setSize(resolucion.x, resolucion.y);
  }
  setSize(width, height) {
    let w = Math.max(1, Math.round(width / 2)), h = Math.max(1, Math.round(height / 2));
    for (let k = 0; k < NIVELES; k++) { this.bajadas[k].setSize(w, h); this.subidas[k].setSize(w, h); w = Math.max(1, Math.round(w / 2)); h = Math.max(1, Math.round(h / 2)); }
  }
  dibujar(renderer, material, destino) { this.fsQuad.material = material; renderer.setRenderTarget(destino); this.fsQuad.render(renderer); }
  render(renderer, writeBuffer, readBuffer) {
    const autoClear = renderer.autoClear; renderer.autoClear = false;
    // Bajada: escena (con el filtro de brillo) → ½ → … → 1/32.
    let fuente = readBuffer;
    for (let k = 0; k < NIVELES; k++) {
      const m = k === 0 ? this.prefiltro : this.bajada, u = m.uniforms, d = this.bajadas[k];
      zonaProporcional(d, readBuffer);
      u.tFuente.value = fuente.texture; u.uTexel.value.set(1 / fuente.width, 1 / fuente.height); zonaDe(fuente, u.uZona.value);
      if (k === 0) u.uUmbral.value = this.threshold;
      this.dibujar(renderer, m, d); fuente = d;
    }
    // Subida: del nivel más pequeño al de ½, cada uno con su núcleo, su peso y la tienda del de abajo.
    for (let k = NIVELES - 1; k >= 0; k--) {
      const m = this.materialesSubida[k], u = m.uniforms, d = this.bajadas[k], s = this.subidas[k], sup = this.subidas[k + 1];
      zonaProporcional(s, readBuffer);
      u.tNivel.value = d.texture; u.uTexel.value.set(1 / d.width, 1 / d.height); zonaDe(d, u.uZona.value);
      if (sup) { u.tSuperior.value = sup.texture; u.uTexelSup.value.set(1 / sup.width, 1 / sup.height); zonaDe(sup, u.uZonaSup.value); }
      const f = FACTORES[k]; u.uFactor.value = f + (1.2 - 2 * f) * this.radius;   // lerpBloomFactor del original
      u.uFuerza.value = k === 0 ? this.strength : 1;
      this.dibujar(renderer, m, s);
    }
    renderer.autoClear = autoClear;
  }
  dispose() {
    for (const t of [...this.bajadas, ...this.subidas]) t.dispose();
    for (const m of [this.prefiltro, this.bajada, ...this.materialesSubida]) m.dispose();
    this.fsQuad.dispose();
  }
}
