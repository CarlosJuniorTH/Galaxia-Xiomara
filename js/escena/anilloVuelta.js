// La huella que dejan los videoclips en el universo: alrededor de la galaxia de casa, el trozo de órbita ya recorrido. El
// 15/11 son once meses y un hueco con una estrella esperando; desde el 15/12, la vuelta entera. Motas nítidas, un solo dibujo,
// y solo existe a partir del mes 11 (antes no cuesta nada).
import * as THREE from 'three';

const RADIO = 1420, MOTAS = 9000;

export function crearAnilloVuelta({ scene, uPR, meses }) {
  const fraccion = Math.min(1, meses / 12), a = new Float32Array(MOTAS * 2);
  let s = 12345;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < MOTAS; i++) { a[i * 2] = (i + r()) / MOTAS * Math.PI * 2; a[i * 2 + 1] = r(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTAS * 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(a, 2));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uFin: { value: fraccion * Math.PI * 2 }, uPR, uR: { value: RADIO } },
    vertexShader: /* glsl */`
      uniform float uT, uFin, uPR, uR; attribute vec2 aA; varying vec3 vC;
      void main() {
        float a = aA.x, s = aA.y, ok = step(a, uFin);
        // Dos hebras que se trenzan, como en los clips; lo que falta, una línea de puntos.
        float h = step(0.5, fract(s * 9.1)), f = a * 36.0 + h * 3.14159 + uT * 0.05;
        vec3 p = vec3(cos(a), 0.0, sin(a)) * (uR + cos(f) * 9.0 + (s - 0.5) * 7.0) + vec3(0.0, sin(f) * 9.0 + (fract(s * 37.0) - 0.5) * 7.0, 0.0);
        vec4 v = modelViewMatrix * vec4(p, 1.0);
        float visible = ok > 0.5 ? 0.26 : step(s, 0.03) * 0.08;
        // Cada mes, una mota mayor; y la que espera en el hueco late despacio.
        float mes = abs(fract(a / 0.5235988 + 0.5) - 0.5), marca = (1.0 - smoothstep(0.0, 0.012, mes));
        if (uFin < 6.28 && a < 0.015) visible = 0.45 + 0.4 * sin(uT * 1.6);
        gl_Position = visible < 0.004 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * v;
        gl_PointSize = visible < 0.004 ? 0.0 : clamp((2.2 + marca * 7.0 * ok) * 900.0 / max(1.0, -v.z), 1.0, 3.2) * uPR;
        vC = (h > 0.5 ? vec3(1.0, 0.46, 0.68) : vec3(1.0, 0.77, 0.42)) * visible * (1.0 + marca * ok);
      }`,
    fragmentShader: /* glsl */`
      precision highp float; varying vec3 vC;
      void main() { if (length(gl_PointCoord - 0.5) > 0.5) discard; gl_FragColor = vec4(vC, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const puntos = new THREE.Points(geo, mat); puntos.frustumCulled = false; puntos.userData.capa = 'galaxia'; scene.add(puntos);
  return { actualizar(t) { mat.uniforms.uT.value = t; }, puntos };
}
