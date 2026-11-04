// La galaxia crece con el tiempo: cada mes juntos, sus brazos llegan un poco más lejos. Son motas nítidas que continúan
// exactamente la espiral (enBrazo, galaxia.js) desde donde acaba el disco horneado; sin tocar lo que ya había. Un dibujo.
import * as THREE from 'three';
import { enBrazo } from './galaxia.js';

const POR_MES = 1500, BRAZOS = 5, ALARGA_POR_MES = 0.021;   // (t del brazo por mes: unas 20 unidades de radio)

export function crearCrecimiento({ grupo, uPR, meses }) {
  const n = Math.max(0, Math.round(meses * POR_MES)); if (!n) return null;
  let s = 151225; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const P = new Float32Array(n * 3), C = new Float32Array(n * 3), rosa = new THREE.Color('#f39ac8'), lila = new THREE.Color('#c9a6ee'), oro = new THREE.Color('#f2c98e');
  for (let i = 0; i < n; i++) {
    const f = Math.pow(r(), 1.5), t = 0.97 + f * meses * ALARGA_POR_MES, d = (r() + r() - 1) * (0.05 + f * 0.07);
    const p = enBrazo(i % BRAZOS, t, d);
    P[i * 3] = p.x; P[i * 3 + 1] = (r() + r() - 1) * 14; P[i * 3 + 2] = p.z;
    const c = r() < 0.6 ? rosa : r() < 0.72 ? lila : oro, b = (0.55 + r() * 0.45) * (1 - f * 0.55);
    C[i * 3] = c.r * b; C[i * 3 + 1] = c.g * b; C[i * 3 + 2] = c.b * b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uPR }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `uniform float uPR; attribute vec3 color; varying vec3 vC; void main() { vec4 v = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * v; gl_PointSize = clamp(2300.0 / max(1.0, -v.z), 1.0, 2.6) * uPR; vC = color; }`,
    fragmentShader: `precision highp float; varying vec3 vC; void main() { if (length(gl_PointCoord - 0.5) > 0.5) discard; gl_FragColor = vec4(vC, 1.0); }`
  });
  const puntos = new THREE.Points(geo, mat); puntos.frustumCulled = false; grupo.add(puntos);
  return puntos;
}
