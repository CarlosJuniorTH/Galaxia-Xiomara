// Estrellas cercanas que titilan + estrellas brillantes con destellos en cruz
import * as THREE from 'three';
import { Q } from '../util/dispositivo.js';
import { texDestello } from './texturas.js';
import { azar, elegir } from '../util/dibujo.js';
import { crearDestellos } from './materiales.js';
import { ESCALA_FONDO } from './cosmos.js';

function puntoEnEsfera(rMin, rMax) {
  const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = azar(rMin, rMax);
  return new THREE.Vector3(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
}

export function crearEstrellas({ scene, uScale, uPR }) {
  const col = new THREE.Color();
  const prU = uPR;   // compartido: sigue a la resolución dinámica

  // ── Campo de estrellas titilantes (tamaño en píxeles, no dependen de la distancia) ──
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: prU, uOpacidad: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      uniform float uTime, uPR; varying vec3 vC; varying float vTw;
      void main(){
        vC = aColor;
        vTw = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aPhase * 7.31) * 2.2) + aPhase * 6.2831);
        gl_PointSize = aSize * uPR * (0.7 + 0.5 * vTw);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uOpacidad; varying vec3 vC; varying float vTw;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = 1.0 - smoothstep(0.0, 0.5, d); a *= a;
        gl_FragColor = vec4(vC, a * vTw * uOpacidad);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });

  const n = Math.round(4500 * Q.k);
  const pos = new Float32Array(n * 3), color = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = puntoEnEsfera(12000, 60000);
    pos.set([v.x, v.y, v.z], i * 3);
    const t = Math.random();
    if (t < 0.45) col.setHSL(0.08, 0.15, 0.9 + Math.random() * 0.1);       // blanco cálido
    else if (t < 0.7) col.setHSL(0.93, 0.6, 0.84);                         // rosado
    else if (t < 0.88) col.setHSL(0.6, 0.55, 0.85);                        // azulado
    else col.setHSL(0.12, 0.7, 0.8);                                       // dorado
    color.set([col.r, col.g, col.b], i * 3);
    size[i] = Math.random() < 0.06 ? azar(4.5, 7.5) : azar(1.2, 3.4);
    ph[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const campo = new THREE.Points(g, mat);
  campo.renderOrder = -2;             // se dibuja antes que la sombra de la galaxia
  scene.add(campo);

  // ── Estrellas brillantes con destellos: una sola llamada de dibujo para las 28 ──
  const tonos = [0xffffff, 0xffd6ea, 0xcfe0ff, 0xfff0d0, 0xffb3d4];
  const destellos = crearDestellos(Array.from({ length: 28 }, () => ({
    pos: puntoEnEsfera(9000, 16000).toArray(), color: elegir(tonos), opacidad: azar(0.6, 1),
    tam: azar(260, 620) * 0.85 * ESCALA_FONDO, pulso: 0.176   // el grupo está escalado (ESCALA_FONDO)
  })), { map: texDestello(), uScale, uPR });
  destellos.renderOrder = -2;
  scene.add(destellos);

  return {
    prU,
    // Estrellas LOCALES (de Xiomara y su vecindad): en el espacio intergaláctico casi no se ven
    // (index.js, estrellasLocales). Las luces de las galaxias lejanas son otra cosa (catálogo).
    intensidad(v) { mat.uniforms.uOpacidad.value = v; destellos.material.uniforms.uOpacidad.value = v; },
    actualizar(t) {
      mat.uniforms.uTime.value = t;
      destellos.material.uniforms.uTime.value = t;
    }
  };
}
