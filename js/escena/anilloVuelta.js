// La huella que dejan los videoclips en el universo: rodeando el corazón de la galaxia de casa, siempre de cara a quien mira
// (va en su grupo, y así cabe entero también en vertical), la órbita de nuestro primer año hecha guirnalda: se lee como un
// reloj del año, con diciembre arriba y los meses en el sentido de las agujas. Dos hebras (oro y rosa) se cruzan en cada mes: doce eslabones, y en cada nudo la estrella de ese mes. El último eslabón
// avanza día a día; lo que falta es una línea de puntos con una estrella esperando. El 15/12 la cadena se cierra sobre su
// comienzo y una luz la recorre para siempre. Motas nítidas, un solo dibujo, y solo existe a partir del mes 11.
import * as THREE from 'three';

const RADIO = 150, MOTAS = 6000, AMPLITUD = 10;

export function crearAnilloVuelta({ padre, uPR, meses }) {
  const fin = Math.min(1, meses / 12) * Math.PI * 2, total = MOTAS + 13, a = new Float32Array(total * 4);
  let s = 12345;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < MOTAS; i++) {
    // Cuatro de cada cinco, las dos hebras; el resto, el encaje fino que rellena cada eslabón.
    const azar = r(), tipo = azar < 0.4 ? 0 : azar < 0.8 ? 1 : 2;
    a.set([(i + r()) / MOTAS * Math.PI * 2, r(), tipo, 0], i * 4);
  }
  for (let i = 0; i <= 12; i++) a.set([i / 12 * Math.PI * 2, r(), 3, i], (MOTAS + i) * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(a, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uFin: { value: fin }, uPR, uR: { value: RADIO }, uAmp: { value: AMPLITUD } },
    vertexShader: /* glsl */`
      #define PI 3.14159265
      uniform float uT, uFin, uPR, uR, uAmp; attribute vec4 aA; varying vec3 vC; varying float vForma;
      const vec3 ORO = vec3(1.0, 0.77, 0.42), ROSA = vec3(1.0, 0.46, 0.68), PERLA = vec3(1.0, 0.92, 0.82);
      void main() {
        float a = aA.x, sem = aA.y, tipo = aA.z, cerrada = step(6.28, uFin), brillo, tam = 2.2;
        vec3 color; vForma = 0.0;
        if (tipo > 2.5) {                                      // La estrella de cada mes, en su nudo
          float i = aA.w, llegada = step(a, uFin + 1e-3), espera = (1.0 - llegada) * step(11.5, i);
          vForma = 1.0;
          color = i < 0.5 || i > 11.5 ? ORO : PERLA;
          brillo = llegada * (i < 0.5 && cerrada < 0.5 ? 0.8 : 0.75) + espera * (0.45 + 0.4 * sin(uT * 1.5));
          // Cerrada, el primero y el último son la misma estrella: la mayor de todas.
          tam = (i < 0.5 || i > 11.5) ? 26.0 + cerrada * 6.0 : 19.0;
          brillo *= llegada + espera > 0.5 ? 1.0 : 0.0;
          if (i < 0.5 && cerrada > 0.5) brillo = 0.0;
        } else {
          float signo = tipo < 0.5 ? 1.0 : -1.0, recorrido = step(a, uFin);
          color = tipo < 0.5 ? ORO : ROSA;
          // Sigue a la cadena: fuera de los nudos un poco de holgura; el encaje vibra a tres veces por eslabón.
          float suelta = (fract(sem * 37.0) - 0.5) * 1.5;
          if (tipo > 1.5) { signo = (fract(sem * 11.0) - 0.5) * 2.0; color = mix(ORO, ROSA, fract(sem * 5.0)); }
          // Lo recorrido brilla y su punta más; lo que falta, una línea de puntos con pulsos que corren hacia la estrella.
          float punta = exp(-max(0.0, uFin - a) * 26.0) * (1.0 - cerrada);
          // Una luz recorre la cadena (dos, ya cerrada), sin prisa.
          float ola = 1.0 - smoothstep(0.0, 0.42, abs(mod(uT * 0.05 - a + PI, 2.0 * PI) - PI));
          float ola2 = cerrada * (1.0 - smoothstep(0.0, 0.42, abs(mod(uT * 0.05 + PI - a + PI, 2.0 * PI) - PI)));
          float base = (tipo > 1.5 ? 0.09 : 0.22) + (cerrada * 0.05);
          brillo = recorrido * (base + 0.5 * punta + (ola + ola2) * 0.3);
          if (recorrido < 0.5 && sem < 0.09) { brillo = 0.07 + 0.3 * pow(0.5 + 0.5 * sin(a * 42.0 - uT * 1.4), 10.0); color = PERLA; }
          tam = 2.2 + 1.1 * punta;
          float eslabon = sin(a * 6.0), giro = sin(a * 12.0);
          vec3 radial = vec3(cos(a), 0.0, sin(a));
          vec3 p = radial * (uR + signo * eslabon * uAmp + suelta * abs(eslabon)) + vec3(0.0, signo * giro * uAmp * 0.42 + suelta * 0.5 * abs(eslabon), 0.0);
          vec4 v0 = modelViewMatrix * vec4(p, 1.0);
          if (brillo <= 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vC = vec3(0.0); return; }
          gl_Position = projectionMatrix * v0;
          gl_PointSize = clamp(tam * 900.0 / max(1.0, -v0.z), 1.0, 3.2) * uPR;
          vC = color * brillo;
          return;
        }
        if (brillo <= 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vC = vec3(0.0); return; }
        vec4 v = modelViewMatrix * vec4(vec3(cos(a), 0.0, sin(a)) * uR, 1.0);
        gl_Position = projectionMatrix * v;
        gl_PointSize = clamp(tam * 900.0 / max(1.0, -v.z), 11.0, 30.0) * uPR;
        vC = color * brillo;
      }`,
    fragmentShader: /* glsl */`
      precision highp float; varying vec3 vC; varying float vForma;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0; float m;
        if (vForma > 0.5) {
          // Núcleo nítido y cuatro rayos finos, sin resplandor (como las estrellas de los clips).
          vec2 q = abs(p);
          float rayo = max((1.0 - smoothstep(0.0, 0.05, q.y)) * (1.0 - q.x), (1.0 - smoothstep(0.0, 0.05, q.x)) * (1.0 - q.y));
          m = max(1.0 - smoothstep(0.09, 0.14, length(p)), rayo * rayo);
        } else m = 1.0 - step(1.0, length(p));
        if (m <= 0.003) discard;
        gl_FragColor = vec4(vC * m, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const puntos = new THREE.Points(geo, mat); puntos.frustumCulled = false; puntos.rotation.set(Math.PI / 2, Math.PI / 2, 0); padre.add(puntos);   // (el ángulo 0, arriba; en el plano de la pantalla)
  return { actualizar(t) { mat.uniforms.uT.value = t; }, puntos };
}
