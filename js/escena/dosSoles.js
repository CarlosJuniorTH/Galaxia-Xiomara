// «Dos soles»: una estrella doble, el lugar nuevo del mes 11. Física que cuenta: dos estrellas lejos que la gravedad va
// acercando; al tocarse sus lóbulos de Roche, cada una le da materia a la otra, y juntas dibujan el contorno de un sistema
// en contacto, que tiene la forma de un infinito. El mismo sombreador sirve para su videoclip (teatroVuelta.js, gobernado por
// el guion) y para el lugar del universo (ya en su estado final, en su grupo de mundos.js). Un solo dibujo, motas nítidas.
import * as THREE from 'three';

const L_INFINITO = 14;

export const VERTICE_DOS_SOLES = /* glsl */`
  #define PI 3.14159265
  uniform float uT, uSep, uAng, uFlujo, uInfinito, uPx, uPR;
  attribute vec4 aA;   // x: parámetro · y: semilla · z: familia (0 estrellas, 1 corriente, 2 infinito, 3 fondo) · w: 0 oro, 1 rosa
  attribute vec3 aG;   // dirección sobre la estrella o en el cielo
  varying vec3 vColor;
  const vec3 ORO = vec3(1.0, 0.76, 0.40), ROSA = vec3(1.0, 0.44, 0.66), PERLA = vec3(1.0, 0.93, 0.84);
  vec3 centro(float k) { float s = k < 0.5 ? 1.0 : -1.0; return vec3(cos(uAng), 0.0, sin(uAng)) * s * uSep * 0.5; }
  vec3 girar(vec3 p) { float c = cos(uAng), s = sin(uAng); return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z); }
  void main() {
    float fam = aA.z, a = aA.x, semilla = aA.y, k = aA.w; vec3 mundo; vec3 color = k < 0.5 ? ORO : ROSA; float brillo = 0.0, tam = 0.05;
    if (fam < 0.5) {                                  // Las dos estrellas: gránulos, oscurecidos hacia el borde; sin reverso
      float g = uT * 0.14, c = cos(g), s = sin(g);
      vec3 d = vec3(c * aG.x - s * aG.z, aG.y, s * aG.x + c * aG.z);
      float granulo = sin(d.x * 8.0 + uT * 0.7) * sin(d.y * 10.0 - uT * 0.5) * sin(d.z * 9.0 + uT * 0.4);
      mundo = centro(k) + d * (1.55 + granulo * 0.04);
      float mu = dot(d, normalize(cameraPosition - mundo));
      if (mu > 0.0) { brillo = (0.24 + 0.76 * pow(mu, 0.7)) * (0.3 + 0.3 * semilla); tam = 0.07; color = mix(color, PERLA, smoothstep(0.0, 0.8, granulo + semilla * 0.4) * 0.5); }
    } else if (fam < 1.5) {                           // La corriente: de cada estrella a la otra, curvada por el giro
      float f = fract(semilla * 7.0 + uT * (0.12 + semilla * 0.1));
      vec3 de = centro(k), a2 = centro(1.0 - k), tang = girar(vec3(0.0, 0.0, 1.0)) * (k < 0.5 ? 1.0 : -1.0);
      mundo = mix(de, a2, f) + tang * sin(f * PI) * uSep * 0.16 + (fract(vec3(semilla * 13.7, semilla * 57.1, semilla * 91.3)) - 0.5) * (0.25 + 0.7 * sin(f * PI));
      brillo = uFlujo * sin(f * PI) * 0.42; tam = 0.05;
    } else if (fam < 2.5) {                           // El infinito: el contorno que comparten, se dibuja desde el centro hacia fuera
      float t = a + uT * 0.035 * (0.6 + semilla * 0.8), s = sin(t), c = cos(t), q = 1.0 + s * s;
      vec3 base = vec3(${L_INFINITO}.0 * c / q, 0.0, ${L_INFINITO}.0 * s * c / q);
      float lobulo = abs(c), hueco = (fract(semilla * 19.7) - 0.5) * (0.22 + lobulo * 3.6 * pow(fract(semilla * 5.3), 2.2));
      mundo = girar(base + vec3(0.0, (fract(semilla * 31.1) - 0.5) * 0.9 * lobulo, 0.0) + vec3(-s, 0.0, c) * hueco);
      float aparece = 1.0 - smoothstep(uInfinito * 1.08 - 0.08, uInfinito * 1.08, fract(a / (2.0 * PI)));
      color = mix(k < 0.5 ? ORO : ROSA, PERLA, step(0.88, semilla) * 0.8);
      brillo = aparece * (0.2 + 0.3 * semilla) * (0.8 + 0.2 * sin(uT * 1.4 + semilla * 60.0)); tam = 0.05;
    } else {                                          // El fondo
      mundo = aG * 220.0; color = mix(vec3(0.62, 0.74, 1.0), PERLA, semilla);
      brillo = 0.14 + 0.5 * semilla * semilla; tam = 1.0 + semilla * 0.5;
    }
    if (brillo <= 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vColor = vec3(0.0); return; }
    vec4 vista = modelViewMatrix * vec4(mundo, 1.0);
    gl_Position = projectionMatrix * vista;
    gl_PointSize = clamp(uPx * tam / max(0.1, -vista.z), 1.05 * uPR, 3.2 * uPR);
    vColor = color * min(brillo, 1.5);
  }`;
export const FRAGMENTO_DOS_SOLES = /* glsl */`
  precision highp float; varying vec3 vColor;
  void main() { float a = 1.0 - smoothstep(0.72, 1.0, length(gl_PointCoord * 2.0 - 1.0)); if (a <= 0.003) discard; gl_FragColor = vec4(vColor * a, 1.0); }`;

// La geometría: `factor` reduce el número de motas (el lugar del universo se ve de más lejos que el videoclip).
export function geometriaDosSoles({ factor = 1, conFondo = true } = {}) {
  let s = 271828; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const nE = Math.round(13000 * factor), nC = Math.round(10000 * factor), nI = Math.round(60000 * factor), nF = conFondo ? 3000 : 0;
  const total = nE * 2 + nC * 2 + nI + nF, A = new Float32Array(total * 4), G = new Float32Array(total * 3); let k = 0;
  const poner = (a, sem, fam, w, d = [0, 0, 0]) => { A[k * 4] = a; A[k * 4 + 1] = sem; A[k * 4 + 2] = fam; A[k * 4 + 3] = w; G[k * 3] = d[0]; G[k * 3 + 1] = d[1]; G[k * 3 + 2] = d[2]; k++; };
  const esfera = () => { const y = r() * 2 - 1, f = r() * Math.PI * 2, q = Math.sqrt(1 - y * y); return [q * Math.cos(f), y, q * Math.sin(f)]; };
  for (let h = 0; h < 2; h++) for (let i = 0; i < nE; i++) poner(0, r(), 0, h, esfera());
  for (let h = 0; h < 2; h++) for (let i = 0; i < nC; i++) poner(0, r(), 1, h);
  // Cada lóbulo del infinito, del color de su estrella (cos > 0: la primera).
  for (let i = 0; i < nI; i++) { const a = r() * Math.PI * 2; poner(a, r(), 2, Math.cos(a) > 0 ? 0 : 1); }
  for (let i = 0; i < nF; i++) poner(0, r(), 3, 0, esfera());
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(A, 4)); geo.setAttribute('aG', new THREE.BufferAttribute(G, 3));
  return geo;
}
export const materialDosSoles = uniforms => new THREE.ShaderMaterial({ vertexShader: VERTICE_DOS_SOLES, fragmentShader: FRAGMENTO_DOS_SOLES, uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false });

// El lugar: el sistema ya en contacto, girando despacio dentro de su grupo. `ESCALA` unidades del universo por unidad del guion.
export function crearLugarDosSoles({ grupo, renderer, uPR, escala = 15 }) {
  const u = { uT: { value: 0 }, uSep: { value: 14 * Math.SQRT1_2 }, uAng: { value: 0 }, uFlujo: { value: 1 }, uInfinito: { value: 1 }, uPx: { value: 1000 }, uPR };
  const puntos = new THREE.Points(geometriaDosSoles({ factor: 0.34, conFondo: false }), materialDosSoles(u));
  puntos.frustumCulled = false; puntos.scale.setScalar(escala); grupo.add(puntos);
  const tam = new THREE.Vector2();
  return { puntos, actualizar(t, camara) {
    renderer.getDrawingBufferSize(tam);
    u.uT.value = t; u.uAng.value = t * 0.018; u.uPx.value = tam.y / (2 * Math.tan(camara.fov * Math.PI / 360)) * escala;
  } };
}
