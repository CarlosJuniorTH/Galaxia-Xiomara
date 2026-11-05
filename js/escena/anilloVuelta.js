// La huella de nuestro primer año en la galaxia de casa: una tiara de estrellas sobre el nombre de Xiomara. Va en el grupo del
// corazón, siempre de cara a quien mira, y es un arco que deja libres el nombre y el corazón: no los rodea ni los cruza. Trece
// estrellas (el comienzo y cada mes, de izquierda a derecha) unidas por un hilo fino que cuelga de una a otra, de oro a rosa. El
// último tramo avanza día a día; lo que falta es una línea de puntos con su estrella esperando. El 15/12 se completa y una luz la
// recorre. Es el mismo lenguaje que la corona del videoclip del año. Motas nítidas, un solo dibujo, solo desde el mes 11.
import * as THREE from 'three';

const RADIO = 132, CENTRO_Y = 66, EXTREMO = 0.3, CAIDA = 3.5, MOTAS = 1900;

export function crearAnilloVuelta({ padre, uPR, meses }) {
  const fin = Math.min(1, meses / 12), total = MOTAS + 13, a = new Float32Array(total * 3);
  let s = 12345;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < MOTAS; i++) a.set([(i + r()) / MOTAS, r(), 0], i * 3);
  for (let i = 0; i <= 12; i++) a.set([i / 12, r(), 1], (MOTAS + i) * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(a, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uFin: { value: fin }, uPR, uR: { value: RADIO }, uCy: { value: CENTRO_Y }, uExt: { value: EXTREMO }, uCaida: { value: CAIDA } },
    vertexShader: /* glsl */`
      #define PI 3.14159265
      uniform float uT, uFin, uPR, uR, uCy, uExt, uCaida; attribute vec3 aA; varying vec3 vC; varying float vForma;
      const vec3 ORO = vec3(1.0, 0.77, 0.42), ROSA = vec3(1.0, 0.5, 0.7), PERLA = vec3(1.0, 0.93, 0.85);
      vec3 arco(float u, float radio) { float f = mix(PI - uExt, uExt, u); return vec3(cos(f) * radio, uCy + sin(f) * radio, 0.0); }
      void main() {
        float u = aA.x, sem = aA.y, completa = step(0.999, uFin), brillo = 0.0, centro = 1.0 - abs(2.0 * u - 1.0);
        vec3 color = mix(ORO, ROSA, smoothstep(0.1, 0.9, u)); vec3 p; float px; vForma = aA.z;
        if (aA.z > 0.5) {                                      // Las estrellas; la del centro, la mayor
          float llegada = step(u, uFin + 1e-3), espera = (1.0 - llegada) * step(0.99, u) ;
          float pasa = completa * exp(-pow((fract(uT * 0.045) * 1.3 - 0.15 - u) * 9.0, 2.0));
          brillo = llegada * (0.72 + 0.28 * sin(uT * 1.1 + sem * 40.0) * 0.5 + pasa * 0.5) + espera * (0.42 + 0.34 * sin(uT * 1.5));
          color = mix(color, PERLA, 0.45); p = arco(u, uR);
          px = 15.0 + 11.0 * centro * centro + 3.0 * llegada + pasa * 6.0;
        } else {                                               // El hilo, que cuelga de estrella a estrella
          float hecho = step(u, uFin), k = abs(sin(u * 12.0 * PI));
          float punta = exp(-max(0.0, uFin - u) * 60.0) * (1.0 - completa);
          float pasa = completa * exp(-pow((fract(uT * 0.045) * 1.3 - 0.15 - u) * 12.0, 2.0));
          brillo = hecho * (0.13 + 0.06 * sin(uT * (0.8 + sem * 2.0) + sem * 50.0) + 0.45 * punta + 0.45 * pasa);
          // Lo que falta: una línea de puntos con un pulso que corre hacia la estrella que espera.
          if (hecho < 0.5 && sem < 0.14) { brillo = 0.1 + 0.32 * pow(0.5 + 0.5 * sin(u * 260.0 - uT * 1.6), 10.0); color = PERLA; }
          p = arco(u, uR - uCaida * k + (fract(sem * 37.0) - 0.5) * 1.3);
          px = 1.35 + 0.9 * punta;
        }
        if (brillo <= 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vC = vec3(0.0); return; }
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = px * uPR;
        vC = color * brillo;
      }`,
    fragmentShader: /* glsl */`
      precision highp float; varying vec3 vC; varying float vForma;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0; float m;
        if (vForma > 0.5) {
          // Núcleo nítido y cuatro rayos finos, sin resplandor (como las estrellas de los clips).
          vec2 q = abs(p);
          float rayo = max((1.0 - smoothstep(0.0, 0.06, q.y)) * (1.0 - q.x), (1.0 - smoothstep(0.0, 0.06, q.x)) * (1.0 - q.y));
          m = max(1.0 - smoothstep(0.1, 0.16, length(p)), rayo * rayo);
        } else m = 1.0 - step(1.0, length(p));
        if (m <= 0.003) discard;
        gl_FragColor = vec4(vC * m, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const puntos = new THREE.Points(geo, mat); puntos.frustumCulled = false; padre.add(puntos);
  return { actualizar(t) { mat.uniforms.uT.value = t; }, puntos };
}
