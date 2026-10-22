// Toques de amor discretos: corazoncitos estelares en los brazos y algunos
// corazones que suben flotando desde el disco. Pensados para acompañar, no para tapar.
import * as THREE from 'three';
import { Q } from '../util/dispositivo.js';
import { gauss, azar } from '../util/dibujo.js';
import { materialPuntos, geometriaPuntos } from './materiales.js';

const BRAZOS = 5, GIRO = 4.5;
const TONOS = [
  [0.9, 0.2, 0.45],    // rosa
  [0.85, 0.12, 0.32],  // rojo suave
  [0.95, 0.5, 0.72],   // rosa claro
  [0.75, 0.35, 0.9]    // lila
];

export function crearAmor({ scene, uScale, uPR, uTamGalaxia }) {
  const mats = [];
  const n = k => Math.round(k * Math.max(Q.k, 0.5));
  const escala = 1;

  // ── Corazoncitos estelares a lo largo de los brazos ──
  const brazos = new THREE.Group();
  scene.add(brazos);
  const matBrazos = materialPuntos({ uScale, uPR, tam: uTamGalaxia, maximo: 10, titileo: 0.35, opacidad: 0.6, corazon: true, silueta: true });
  mats.push(matBrazos);
  brazos.add(new THREE.Points(geometriaPuntos(n(900), (i, p) => {
    const t = azar(0.15, 1);
    const rad = 90 + t * 950;
    const ang = (i % BRAZOS) / BRAZOS * Math.PI * 2 + t * GIRO + gauss() * 0.1;
    p.x = Math.cos(ang) * rad; p.z = Math.sin(ang) * rad; p.y = gauss() * 6;
    const c = TONOS[i % TONOS.length];
    p.r = c[0]; p.g = c[1]; p.b = c[2];
    p.s = azar(6, 10) * escala;
  }), matBrazos));

  // ── Algunos corazones que suben desde el disco y se desvanecen ──
  const matSuben = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale, uPR },
    vertexShader: /* glsl */`
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime, uScale, uPR;
      varying vec3 vC; varying float vA;
      void main(){
        float vida = fract(uTime * (0.04 + aPhase * 0.04) + aPhase * 13.0);
        vec3 pos = position;
        pos.y += vida * 280.0;
        pos.x += sin(uTime * 0.8 + aPhase * 30.0) * 12.0 * vida;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        float profundidad = max(0.1, -mv.z);
        float px=aSize*uScale/profundidad;
        gl_PointSize = clamp(px, 1.0, 12.0 * uPR);
        vC = aColor;
        vA = min(1.0,px*px) * smoothstep(0.0, 0.2, vida) * (1.0 - smoothstep(0.55, 1.0, vida)) * 0.55 * smoothstep(18.0, 85.0, profundidad);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying float vA;
      void main(){
        vec2 p = (gl_PointCoord - 0.5) * 2.7;
        p.y = -p.y + 0.2;
        float q = p.x * p.x + p.y * p.y - 1.0;
        float a = 1.0 - smoothstep(-0.06, 0.02, q * q * q - p.x * p.x * p.y * p.y * p.y);
        gl_FragColor = vec4(vC, a * vA);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  mats.push(matSuben);
  const suben = new THREE.Points(geometriaPuntos(n(70), (i, p) => {
    const ang = Math.random() * Math.PI * 2, r = azar(250, 950);   // lejos del centro para no tapar el corazón
    p.x = Math.cos(ang) * r; p.z = Math.sin(ang) * r; p.y = azar(-20, 20);
    const c = TONOS[i % TONOS.length];
    p.r = c[0]; p.g = c[1]; p.b = c[2];
    p.s = azar(12, 20) * escala;
  }), matSuben);
  suben.frustumCulled = false;
  scene.add(suben);

  return {
    actualizar(t) {
      for (const m of mats) m.uniforms.uTime.value = t;
      brazos.rotation.y = t * 0.022;          // gira junto con la galaxia
    }
  };
}
