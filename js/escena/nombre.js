// Su nombre escrito con estrellas que vuelan desde el espacio y se juntan
import * as THREE from 'three';
import { esMovil } from '../util/dispositivo.js';
import { lienzo } from '../util/dibujo.js';
import { ALTURA_CORAZON } from './corazon.js';

const ALTURA = ALTURA_CORAZON + (esMovil ? 128 : 118);

export function crearNombre({ scene, uScale, uPR }, texto) {
  const grupo = new THREE.Group();
  grupo.position.y = ALTURA;
  scene.add(grupo);
  const col = new THREE.Color();

  const mat = new THREE.ShaderMaterial({
    uniforms: { uProg: { value: 0 }, uTime: { value: 0 }, uScale, uPR, uSize: { value: 3.9 }, uVis: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec3 aStart; attribute float aDelay; attribute vec3 aColor;
      uniform float uProg, uTime, uScale, uSize, uPR;
      varying vec3 vC; varying float vA;
      void main(){
        float p = smoothstep(aDelay, aDelay + 0.5, uProg);
        vec3 pos = mix(aStart, position, p);
        pos.x += sin(uTime * 1.3 + aDelay * 40.0) * 1.1 * p;
        pos.y += cos(uTime * 1.1 + aDelay * 33.0) * 1.1 * p;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.75 + 0.25 * sin(uTime * 3.0 + aDelay * 90.0);
        float profundidad = max(0.1, -mv.z);
        float px=uSize * tw * (1.0 + (1.0 - p) * 1.5) * uScale / profundidad;
        gl_PointSize = clamp(px, 1.0, 4.0 * uPR);
        vC = aColor;
        vA = min(1.0,px*px) * mix(0.3, 1.0, p) * smoothstep(0.0, 0.04, uProg) * smoothstep(18.0, 85.0, profundidad);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying float vA; uniform float uVis;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = 1.0 - smoothstep(0.05, 0.5, d);
        gl_FragColor = vec4(vC * (1.0 + (0.5 - d) * 1.2), a * vA * 0.85) * uVis;
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });

  // Se dibuja el nombre en un canvas y se toman los píxeles como posiciones de estrellas
  const cw = 1400, ch = 380, [, x] = lienzo(cw, ch);
  let fs = 280;
  x.font = `${fs}px 'Great Vibes', cursive`;
  while (x.measureText(texto).width > cw - 90 && fs > 80) { fs -= 10; x.font = `${fs}px 'Great Vibes', cursive`; }
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(texto, cw / 2, ch / 2 + 10);
  const data = x.getImageData(0, 0, cw, ch).data, paso = 5, obj = [];
  for (let yy = 0; yy < ch; yy += paso) for (let xx = 0; xx < cw; xx += paso) if (data[(yy * cw + xx) * 4 + 3] > 128) obj.push(xx, yy);

  const n = obj.length / 2, k = 0.24;
  const pos = new Float32Array(n * 3), ini = new Float32Array(n * 3), ret = new Float32Array(n), cl = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const px = (obj[i * 2] - cw / 2 + (Math.random() - 0.5) * paso) * k;
    const py = -(obj[i * 2 + 1] - ch / 2 + (Math.random() - 0.5) * paso) * k;
    pos[i * 3] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = 500 + Math.random() * 900;
    ini[i * 3] = r * Math.sin(ph) * Math.cos(th); ini[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); ini[i * 3 + 2] = r * Math.cos(ph);
    const u = px / (cw * k) + 0.5;
    ret[i] = u * 0.35 + Math.random() * 0.15;          // se arma de izquierda a derecha
    col.setHSL(0.95 - u * 0.13, 1.0, 0.7 + Math.random() * 0.18);
    cl[i * 3] = col.r; cl[i * 3 + 1] = col.g; cl[i * 3 + 2] = col.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aStart', new THREE.BufferAttribute(ini, 3));
  g.setAttribute('aDelay', new THREE.BufferAttribute(ret, 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(cl, 3));
  const puntos = new THREE.Points(g, mat);
  puntos.frustumCulled = false;
  grupo.add(puntos);

  return {
    actualizar(t, dt, { camera, tiempoDentro, escala = 1, simbolos = 1 }) {
      mat.uniforms.uTime.value = t; mat.uniforms.uVis.value = simbolos; grupo.visible = simbolos > 0.003;
      mat.uniforms.uProg.value = tiempoDentro === null ? 0 : Math.min(1, Math.max(0, (tiempoDentro - 3) / 5.5));
      grupo.quaternion.copy(camera.quaternion);     // siempre de frente a ella
      grupo.scale.setScalar(escala);
      mat.uniforms.uSize.value = 3.9 * escala;
      grupo.position.y = ALTURA * (1 + (escala - 1) * 0.6) + Math.sin(t * 1.7 + 0.6) * 4 * escala;
    }
  };
}
