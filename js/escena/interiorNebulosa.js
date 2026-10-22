// El interior de las nebulosas que el viaje atraviesa: nubes de gas suaves, estrellas jóvenes y
// algún sol caliente con su brillo, repartidos en 3D dentro de la nebulosa. Desde fuera apenas se
// notan (los cubre el volumen de gas); al cruzarla pasan alrededor de la cámara, a distintas
// profundidades: se ve que dentro hay espacio, no una lámina pintada.
import * as THREE from 'three';

// Colores de cada tono (los mismos que la imagen de la nebulosa: Hα, O III, S II; texturasPlaneta.js).
const TONOS = [
  [[1.0, 0.3, 0.42], [0.3, 0.92, 0.88], [1.0, 0.62, 0.4]], [[0.92, 0.4, 0.82], [0.45, 0.62, 1.0], [0.75, 0.55, 1.0]],
  [[0.35, 0.95, 0.72], [0.55, 0.8, 1.0], [0.9, 0.5, 0.6]], [[0.55, 0.65, 1.0], [0.8, 0.88, 1.0], [1.0, 0.45, 0.22]],
  [[0.95, 0.72, 0.35], [0.35, 0.85, 0.95], [1.0, 0.48, 0.3]]
];

function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const gauss = a => { let u = 0; while (!u) u = a(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * a()); };

export function crearInteriorNebulosa({ r, tono = 0, semilla = 1, uScale, uPR }) {
  const a = azar(semilla * 7919 + 13), paleta = TONOS[tono] || TONOS[0], K = 1;   // el mismo contenido en móvil y en PC
  const datos = [];
  // Nubes de gas: grandes, muy tenues, en grumos (alrededor de unos pocos centros).
  const centros = Array.from({ length: 9 }, () => [gauss(a) * r * 0.5, gauss(a) * r * 0.4, gauss(a) * r * 0.22]);
  for (let i = 0, n = Math.round(700 * K); i < n; i++) {
    const c = centros[i % centros.length], col = paleta[Math.floor(a() * 3)], k = 0.022 + a() * 0.03;
    datos.push([c[0] + gauss(a) * r * 0.28, c[1] + gauss(a) * r * 0.24, c[2] + gauss(a) * r * 0.16, col[0] * k, col[1] * k, col[2] * k, r * (0.16 + a() * 0.22), 1]);
  }
  // Estrellas jóvenes: azuladas y blancas, más densas en los grumos.
  for (let i = 0, n = Math.round(2600 * K); i < n; i++) {
    const c = a() < 0.6 ? centros[i % centros.length] : [0, 0, 0], esp = a() < 0.6 ? 0.22 : 0.55;
    const t = a(), col = t < 0.5 ? [0.75, 0.85, 1.0] : t < 0.85 ? [1.0, 0.97, 0.95] : [1.0, 0.75, 0.6], k = 0.6 + a() * 0.7;
    datos.push([c[0] + gauss(a) * r * esp, c[1] + gauss(a) * r * esp * 0.85, c[2] + gauss(a) * r * esp * 0.5, col[0] * k, col[1] * k, col[2] * k, r * (0.0035 + a() * 0.004), 0]);
  }
  // Algunos soles calientes con su brillo (los que iluminan la nebulosa).
  for (let i = 0; i < 14; i++) { const c = centros[i % centros.length]; datos.push([c[0] + gauss(a) * r * 0.06, c[1] + gauss(a) * r * 0.06, c[2] + gauss(a) * r * 0.04, 0.9, 0.95, 1.0, r * (0.018 + a() * 0.014), 0.5]); }

  const n = datos.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tam = new Float32Array(n), tipo = new Float32Array(n);
  datos.forEach((d, i) => { pos.set(d.slice(0, 3), i * 3); col.set(d.slice(3, 6), i * 3); tam[i] = d[6]; tipo[i] = d[7]; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aTam', new THREE.BufferAttribute(tam, 1)); g.setAttribute('aTipo', new THREE.BufferAttribute(tipo, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uScale, uPR, uOpacidad: { value: 0 }, uR: { value: r } },
    vertexShader: /* glsl */`uniform float uScale, uPR, uOpacidad, uR; attribute vec3 aCol; attribute float aTam, aTipo; varying vec3 vC; varying float vA, vTipo;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float z = max(1e-3, -mv.z), s = aTam * length(modelViewMatrix[0].xyz) * uScale / z;
        // Gas: hasta 380 px y se aparta al tenerlo encima; estrellas: puntos nítidos; soles: con halo.
        float lim = (aTipo > 0.75 ? 380.0 : aTipo > 0.25 ? 90.0 : 7.0) * uPR;
        gl_PointSize = clamp(s, 1.0, lim);
        // Solo de cerca (dentro o al lado): desde lejos la nebulosa la dibuja su volumen.
        float dentro = 1.0 - smoothstep(uR * 1.4, uR * 3.0, z);
        vA = uOpacidad * dentro * min(1.0, s) * (aTipo > 0.75 ? 1.0 - smoothstep(lim * 0.55, lim, s) : 1.0);
        vC = aCol; vTipo = aTipo; }`,
    fragmentShader: /* glsl */`varying vec3 vC; varying float vA, vTipo;
      void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
        float k = vTipo > 0.75 ? exp(-d * d * 2.4) * (1.0 - d) : vTipo > 0.25 ? exp(-d * d * 10.0) + exp(-d * 3.5) * 0.35 : exp(-d * d * 5.0);
        gl_FragColor = vec4(vC * k * vA, k * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const puntos = new THREE.Points(g, material); puntos.frustumCulled = false; puntos.renderOrder = -2.5;
  return puntos;
}
