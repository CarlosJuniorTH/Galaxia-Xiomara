// «Dos soles»: una estrella doble, el lugar nuevo del mes 11. Física que cuenta: dos estrellas lejos que la gravedad va
// acercando; al tocarse sus lóbulos de Roche, cada una le da materia a la otra, y juntas dibujan el contorno de un sistema
// en contacto, que tiene la forma de un infinito. El mismo sombreador sirve para su videoclip (teatroVuelta.js, gobernado por
// el guion) y para el lugar del universo (ya en su estado final, en su grupo de mundos.js). Un solo dibujo, motas nítidas.
import * as THREE from 'three';
import { SEP_FINAL } from '../util/guionVuelta.js';

const L_INFINITO = 14, RADIO = 2.35;

export const VERTICE_DOS_SOLES = /* glsl */`
  #define PI 3.14159265
  uniform float uT, uSep, uAng, uFlujo, uInfinito, uPx, uPR, uAtenua;
  attribute vec4 aA;   // x: parámetro · y: semilla · z: familia (0 estrellas, 1 corriente, 2 infinito, 3 fondo, 4 viento, 5 océano) · w: 0 oro, 1 rosa
  attribute vec3 aG;   // dirección sobre la estrella o en el cielo
  varying vec3 vColor;
  float maxPx = 3.2;
  const vec3 ORO = vec3(1.0, 0.76, 0.40), ROSA = vec3(1.0, 0.44, 0.66), PERLA = vec3(1.0, 0.93, 0.84);
  vec3 centro(float k) { float s = k < 0.5 ? 1.0 : -1.0; return vec3(cos(uAng), 0.0, sin(uAng)) * s * uSep * 0.5; }
  vec3 girar(vec3 p) { float c = cos(uAng), s = sin(uAng); return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z); }
  void main() {
    float fam = aA.z, a = aA.x, semilla = aA.y, k = aA.w; vec3 mundo; vec3 color = k < 0.5 ? ORO : ROSA; float brillo = 0.0, tam = 0.05;
    if (fam < 0.5) {                                  // Las dos estrellas: gránulos, oscurecidos hacia el borde; sin reverso
      float g = uT * 0.14, c = cos(g), s = sin(g);
      vec3 d = vec3(c * aG.x - s * aG.z, aG.y, s * aG.x + c * aG.z);
      float granulo = sin(d.x * 8.0 + uT * 0.7) * sin(d.y * 10.0 - uT * 0.5) * sin(d.z * 9.0 + uT * 0.4) * 0.6 + sin(d.x * 18.0 - uT * 0.5) * sin(d.y * 20.0 + uT * 0.4) * sin(d.z * 22.0) * 0.4;
      // La marea: cuanto más les afecta la otra, más se estiran hacia ella (la forma de lágrima de una estrella doble).
      vec3 haciaOtra = normalize(centro(1.0 - k) - centro(k));
      float marea = 1.0 + uFlujo * 0.62 * pow(max(0.0, dot(d, haciaOtra)), 5.0);
      mundo = centro(k) + d * ${RADIO} * marea * (1.0 + granulo * 0.03);
      float mu = dot(normalize(normalMatrix * d), normalize(-(modelViewMatrix * vec4(mundo, 1.0)).xyz));   // (en la vista: también vale con el objeto a escala)
      // Centro casi blanco, borde hondo del color de cada una.
      vec3 borde = k < 0.5 ? vec3(1.0, 0.36, 0.08) : vec3(0.82, 0.14, 0.42);
      if (mu > 0.0) { brillo = (0.017 + 0.05 * pow(mu, 0.6)) * (1.0 + 0.32 * granulo); tam = 0.2; maxPx = 40.0; color = mix(borde, mix(color, PERLA, 0.2 + 0.6 * smoothstep(-0.4, 0.6, granulo)), smoothstep(0.02, 0.72, mu)); }   // (se solapan: superficie continua)
    } else if (fam < 1.5) {                           // La corriente: de cada estrella a la otra, curvada por el giro
      float f = fract(semilla * 7.0 + uT * (0.12 + semilla * 0.1));
      vec3 de = centro(k), a2 = centro(1.0 - k), tang = girar(vec3(0.0, 0.0, 1.0)) * (k < 0.5 ? 1.0 : -1.0);
      // Una hebra torcida, no una nube: se enrosca alrededor de su camino.
      vec3 arriba = vec3(0.0, 1.0, 0.0); float vuelta = f * 16.0 + uT * 1.6 + floor(semilla * 2.0) * PI;
      mundo = mix(de, a2, f) + tang * sin(f * PI) * uSep * 0.1 + (tang * cos(vuelta) + arriba * sin(vuelta)) * (0.22 + 0.5 * sin(f * PI)) + (fract(vec3(semilla * 13.7, semilla * 57.1, semilla * 91.3)) - 0.5) * 0.28;
      brillo = uFlujo * sin(f * PI) * 0.62; tam = 0.05;
    } else if (fam < 2.5) {                           // El infinito: el contorno que comparten, se dibuja desde el centro hacia fuera
      float t = a + uT * 0.035 * (0.6 + semilla * 0.8), s = sin(t), c = cos(t), q = 1.0 + s * s;
      vec3 base = vec3(${L_INFINITO}.0 * c / q, 0.0, ${L_INFINITO}.0 * s * c / q);
      float lobulo = abs(c), hueco = (fract(semilla * 19.7) - 0.5) * (0.22 + lobulo * 3.6 * pow(fract(semilla * 5.3), 2.2));
      mundo = girar(base + vec3(0.0, (fract(semilla * 31.1) - 0.5) * 0.9 * lobulo, 0.0) + vec3(-s, 0.0, c) * hueco);
      float aparece = 1.0 - smoothstep(uInfinito * 1.08 - 0.08, uInfinito * 1.08, fract(a / (2.0 * PI)));
      color = mix(k < 0.5 ? ORO : ROSA, PERLA, step(0.88, semilla) * 0.8);
      // Una luz de cada color lo recorre sin parar, como la materia que se pasan.
      float g1 = fract(a / (2.0 * PI) - uT * 0.055), luz = exp(-g1 * 26.0);
      brillo = aparece * ((0.2 + 0.3 * semilla) * (0.8 + 0.2 * sin(uT * 1.4 + semilla * 60.0)) + luz * 0.9); tam = 0.05;
    } else if (fam > 4.5) {                           // El océano entre las dos: una lámina de motas que ondula con la gravedad
      float r = 8.0 + sqrt(fract(semilla * 3.7)) * 52.0, f = a;
      vec3 sitio = vec3(cos(f) * r, -6.5, sin(f) * r);
      float d1 = length(sitio.xz - centro(0.0).xz), d2 = length(sitio.xz - centro(1.0).xz);
      float o1 = sin(d1 * 0.62 - uT * 1.1), o2 = sin(d2 * 0.62 - uT * 1.1);
      float suma = o1 / (1.0 + d1 * 0.04) + o2 / (1.0 + d2 * 0.04);
      mundo = sitio + vec3(0.0, suma * 0.65, 0.0);
      color = mix(mix(ORO, ROSA, smoothstep(-0.25, 0.25, (d1 - d2) / max(1.0, d1 + d2))), vec3(0.62, 0.74, 1.0), 0.32);
      brillo = (0.22 + 0.6 * smoothstep(0.1, 1.5, suma)) * (1.0 - smoothstep(32.0, 60.0, r)) * (1.0 - 0.55 * uInfinito); tam = 0.05;
    } else if (fam > 3.5) {                           // El viento de las dos: dos brazos en espiral que se van quedando atrás del giro
      float f = fract(semilla * 7.0 + uT * 0.05), r = uSep * 0.5 + f * 34.0, ang = uAng - f * 4.6 + (k < 0.5 ? 0.0 : PI);
      vec3 azar = (fract(vec3(semilla * 13.7, semilla * 57.1, semilla * 91.3)) - 0.5) * (0.35 + f * 3.2);
      mundo = vec3(cos(ang) * r, 0.0, sin(ang) * r) + azar * vec3(1.0, 0.4, 1.0);
      brillo = uFlujo * pow(1.0 - f, 1.7) * 0.5 * (1.0 - 0.6 * uInfinito); tam = 0.05;
    } else {                                          // El fondo
      mundo = aG * 220.0; color = mix(vec3(0.62, 0.74, 1.0), PERLA, semilla);
      brillo = 0.14 + 0.5 * semilla * semilla; tam = 1.0 + semilla * 0.5;
    }
    if (brillo <= 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vColor = vec3(0.0); return; }
    vec4 vista = modelViewMatrix * vec4(mundo, 1.0);
    gl_Position = projectionMatrix * vista;
    gl_PointSize = clamp(uPx * tam / max(0.1, -vista.z), 1.05 * uPR, maxPx * uPR);
    vColor = color * min(brillo, 1.5) * uAtenua;
  }`;
export const FRAGMENTO_DOS_SOLES = /* glsl */`
  precision highp float; varying vec3 vColor;
  void main() { float a = 1.0 - smoothstep(0.72, 1.0, length(gl_PointCoord * 2.0 - 1.0)); if (a <= 0.003) discard; gl_FragColor = vec4(vColor * a, 1.0); }`;

// La geometría: `factor` reduce el número de motas (el lugar del universo se ve de más lejos que el videoclip).
export function geometriaDosSoles({ factor = 1, conFondo = true, conOceano = true } = {}) {
  let s = 271828; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const nE = Math.round(20000 * factor), nC = Math.round(10000 * factor), nI = Math.round(60000 * factor), nF = conFondo ? 4000 : 0, nV = Math.round(14000 * factor), nO = conOceano ? 34000 : 0;
  const total = nE * 2 + nC * 2 + nI + nF + nV * 2 + nO, A = new Float32Array(total * 4), G = new Float32Array(total * 3); let k = 0;
  const poner = (a, sem, fam, w, d = [0, 0, 0]) => { A[k * 4] = a; A[k * 4 + 1] = sem; A[k * 4 + 2] = fam; A[k * 4 + 3] = w; G[k * 3] = d[0]; G[k * 3 + 1] = d[1]; G[k * 3 + 2] = d[2]; k++; };
  const esfera = () => { const y = r() * 2 - 1, f = r() * Math.PI * 2, q = Math.sqrt(1 - y * y); return [q * Math.cos(f), y, q * Math.sin(f)]; };
  // Repartidas casi por igual sobre la esfera (Fibonacci con un poco de azar, para que no se vea trama): sin grumos ni calvas.
  for (let h = 0; h < 2; h++) for (let i = 0; i < nE; i++) { const y = 1 - 2 * (i + r()) / nE, q = Math.sqrt(Math.max(0, 1 - y * y)), f = i * 2.399963 + h + r() * 0.9; poner(0, r(), 0, h, [q * Math.cos(f), y, q * Math.sin(f)]); }
  for (let h = 0; h < 2; h++) for (let i = 0; i < nC; i++) poner(0, r(), 1, h);
  // Cada lóbulo del infinito, del color de su estrella (cos > 0: la primera).
  for (let i = 0; i < nI; i++) { const a = r() * Math.PI * 2; poner(a, r(), 2, Math.cos(a) > 0 ? 0 : 1); }
  for (let i = 0; i < nF; i++) poner(0, r(), 3, 0, esfera());
  for (let h = 0; h < 2; h++) for (let i = 0; i < nV; i++) poner(0, r(), 4, h);
  for (let i = 0; i < nO; i++) poner(r() * Math.PI * 2, r(), 5, 0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(A, 4)); geo.setAttribute('aG', new THREE.BufferAttribute(G, 3));
  return geo;
}
export const materialDosSoles = (uniforms, { profundidad = false } = {}) => new THREE.ShaderMaterial({ vertexShader: VERTICE_DOS_SOLES, fragmentShader: FRAGMENTO_DOS_SOLES, uniforms, transparent: true, depthWrite: false, depthTest: profundidad, blending: THREE.AdditiveBlending, toneMapped: false });

// El lugar: el sistema ya en contacto, girando despacio dentro de su grupo. `ESCALA` unidades del universo por unidad del guion.
export function crearLugarDosSoles({ grupo, renderer, uPR, escala = 15 }) {
  const u = { uT: { value: 0 }, uSep: { value: SEP_FINAL }, uAng: { value: 0 }, uFlujo: { value: 1 }, uInfinito: { value: 1 }, uPx: { value: 1000 }, uPR, uAtenua: { value: 0.6 } };   // (atenuado: en el universo pasa por el bloom y no debe hacer halo)
  const puntos = new THREE.Points(geometriaDosSoles({ factor: 0.34, conFondo: false, conOceano: false }), materialDosSoles(u, { profundidad: true }));
  puntos.frustumCulled = false; puntos.scale.setScalar(escala); grupo.add(puntos);
  // El infinito, de cara a casa: desde donde se llega se lee entero.
  puntos.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), grupo.position.clone().negate().normalize());
  const tam = new THREE.Vector2();
  return { puntos, actualizar(t, camara) {
    renderer.getDrawingBufferSize(tam);
    u.uT.value = t; u.uAng.value = t * 0.018; u.uPx.value = tam.y / (2 * Math.tan(camara.fov * Math.PI / 360)) * escala;
  } };
}
