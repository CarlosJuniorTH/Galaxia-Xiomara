// «Dos soles»: una estrella doble, el lugar nuevo del mes 11. Física que cuenta: dos estrellas lejos que la gravedad va
// acercando; al tocarse sus lóbulos de Roche, cada una le da materia a la otra, y juntas dibujan el contorno de un sistema
// en contacto, que tiene la forma de un infinito. El mismo sombreador sirve para su videoclip (teatroVuelta.js, gobernado por
// el guion) y para el lugar del universo (ya en su estado final, en su grupo de mundos.js). Un solo dibujo, motas nítidas.
import * as THREE from 'three';
import { SEP_FINAL } from '../util/guionVuelta.js';
import { crearEstrella, fuentesCorona, direccionCielo, GLSL_ARCO } from './estrellaSolida.js';

const L_INFINITO = 14;
export const RADIO = 2.9;

export const VERTICE_DOS_SOLES = /* glsl */`
  #define PI 3.14159265
  uniform float uT, uSep, uAng, uFlujo, uInfinito, uPx, uPR, uAtenua, uSoles, uDisco;
  attribute vec4 aA;   // x: parámetro · y: semilla · z: familia (0 estrellas, 1 corriente, 2 infinito, 3 fondo, 4 viento, 5 disco) · w: 0 oro, 1 rosa
  attribute vec3 aG;   // dirección sobre la estrella o en el cielo
  varying vec3 vColor;
  float maxPx = 3.2;
  const vec3 ORO = vec3(1.0, 0.76, 0.40), ROSA = vec3(1.0, 0.44, 0.66), PERLA = vec3(1.0, 0.93, 0.84);
  vec3 centro(float k) { float s = k < 0.5 ? 1.0 : -1.0; return vec3(cos(uAng), 0.0, sin(uAng)) * s * uSep * 0.5; }
  ${GLSL_ARCO}
  vec3 girar(vec3 p) { float c = cos(uAng), s = sin(uAng); return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z); }
  void main() {
    float fam = aA.z, a = aA.x, semilla = aA.y, k = aA.w; vec3 mundo; vec3 color = k < 0.5 ? ORO : ROSA; float brillo = 0.0, tam = 0.05;
    if (fam < 0.5) {                                  // La corona de cada estrella: arcos de plasma (la superficie es estrellaSolida.js)
      float g = uT * 0.1, c = cos(g), s = sin(g), vida;
      vec3 d = vec3(c * aG.x - s * aG.z, aG.y, s * aG.x + c * aG.z);
      vec3 haciaOtra = normalize(centro(1.0 - k) - centro(k));
      float marea = 1.0 + uFlujo * 0.62 * pow(max(0.0, dot(d, haciaOtra)), 5.0);
      mundo = centro(k) + arcoCorona(d, semilla, uT, vida) * ${RADIO} * marea;
      color = k < 0.5 ? mix(vec3(1.0, 0.5, 0.18), ORO, semilla) : mix(vec3(0.95, 0.24, 0.5), ROSA, semilla);
      brillo = 0.62 * sqrt(sin(vida * PI)) * uSoles; tam = 0.04;
    } else if (fam < 1.5) {                           // La corriente: de cada estrella a la otra, curvada por el giro
      float f = fract(semilla * 7.0 + uT * (0.12 + semilla * 0.1));
      vec3 de = centro(k), a2 = centro(1.0 - k), tang = girar(vec3(0.0, 0.0, 1.0)) * (k < 0.5 ? 1.0 : -1.0);
      // Materia que cae de una a otra y se enrosca un poco en su camino: un chorro, no una cuerda.
      vec3 arriba = vec3(0.0, 1.0, 0.0); float vuelta = f * 10.0 + uT * 1.6 + floor(semilla * 2.0) * PI;
      mundo = mix(de, a2, f) + tang * sin(f * PI) * uSep * 0.1 + (tang * cos(vuelta) + arriba * sin(vuelta)) * (0.1 + 0.2 * sin(f * PI)) + (fract(vec3(semilla * 13.7, semilla * 57.1, semilla * 91.3)) - 0.5) * (0.25 + 0.7 * sin(f * PI));
      brillo = uFlujo * sin(f * PI) * 0.5; tam = 0.05;
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
    } else if (fam > 4.5) {                           // El disco: el polvo que las dos arrastran, en dos brazos que giran con ellas
      float f = fract(semilla * 5.0 + uT * 0.011), r = 7.0 + f * f * 78.0, brazo = (fract(semilla * 37.0) - 0.5) * (0.5 + 1.1 * f);
      float ang = a * 0.16 + log(r / 7.0) * 2.1 + (k < 0.5 ? 0.0 : PI) + brazo + uAng * 0.42 + uT * 0.05;
      vec3 azar = fract(vec3(semilla * 13.7, semilla * 57.1, semilla * 91.3)) - 0.5;
      mundo = vec3(cos(ang) * r, azar.y * (0.8 + r * 0.05), sin(ang) * r) + azar * vec3(1.2 + r * 0.05, 0.0, 1.2 + r * 0.05);
      // Cerca, del color de su sol; lejos, los violetas y azules de las nebulosas; alguna estrella suelta, perla.
      vec3 lejos = mix(vec3(0.74, 0.46, 1.0), vec3(0.42, 0.62, 1.0), smoothstep(0.4, 1.0, f));
      color = mix(mix(k < 0.5 ? ORO : ROSA, lejos, smoothstep(0.12, 0.62, f)), PERLA, step(0.94, fract(semilla * 23.0)) * 0.8);
      float titilo = 0.82 + 0.18 * sin(uT * 1.3 + semilla * 70.0);
      brillo = uDisco * (0.26 + 0.42 * pow(fract(semilla * 71.0), 3.0)) * titilo * smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.62, 1.0, f)) * (1.0 - 0.45 * uInfinito); tam = 0.085 + 0.06 * f;
    } else if (fam > 3.5) {                           // El viento de las dos: dos brazos en espiral que se van quedando atrás del giro
      float f = fract(semilla * 7.0 + uT * 0.05), r = uSep * 0.5 + f * 34.0, ang = uAng - f * 4.6 + (k < 0.5 ? 0.0 : PI);
      vec3 azar = (fract(vec3(semilla * 13.7, semilla * 57.1, semilla * 91.3)) - 0.5) * (0.5 + f * 6.5);
      mundo = vec3(cos(ang) * r, 0.0, sin(ang) * r) + azar * vec3(1.0, 0.4, 1.0);
      brillo = uFlujo * pow(1.0 - f, 2.2) * 0.42 * (1.0 - 0.85 * uInfinito); tam = 0.05;
    } else {                                          // El fondo
      mundo = aG * 220.0; color = mix(vec3(0.62, 0.74, 1.0), PERLA, semilla);
      brillo = 0.1 + 0.6 * semilla * semilla * semilla; tam = 0.55 + semilla * semilla * 1.1;
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
  const nE = Math.round(5000 * factor), nC = Math.round(10000 * factor), nI = Math.round(60000 * factor), nF = conFondo ? 12000 : 0, nV = Math.round(9000 * factor), nO = conOceano ? 90000 : 0;
  const total = nE * 2 + nC * 2 + nI + nF + nV * 2 + nO, A = new Float32Array(total * 4), G = new Float32Array(total * 3); let k = 0;
  const poner = (a, sem, fam, w, d = [0, 0, 0]) => { A[k * 4] = a; A[k * 4 + 1] = sem; A[k * 4 + 2] = fam; A[k * 4 + 3] = w; G[k * 3] = d[0]; G[k * 3 + 1] = d[1]; G[k * 3 + 2] = d[2]; k++; };
  for (let h = 0; h < 2; h++) { const fuente = fuentesCorona(r); for (let i = 0; i < nE; i++) poner(0, r(), 0, h, fuente()); }
  for (let h = 0; h < 2; h++) for (let i = 0; i < nC; i++) poner(0, r(), 1, h);
  // Cada lóbulo del infinito, del color de su estrella (cos > 0: la primera).
  for (let i = 0; i < nI; i++) { const a = r() * Math.PI * 2; poner(a, r(), 2, Math.cos(a) > 0 ? 0 : 1); }
  for (let i = 0; i < nF; i++) poner(0, r(), 3, 0, direccionCielo(r));
  for (let h = 0; h < 2; h++) for (let i = 0; i < nV; i++) poner(0, r(), 4, h);
  for (let h = 0; h < 2; h++) for (let i = 0; i < nO / 2; i++) poner(r() * Math.PI * 2, r(), 5, h);   // (el disco; en el lugar del universo no va)
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(A, 4)); geo.setAttribute('aG', new THREE.BufferAttribute(G, 3));
  return geo;
}
// Las dos estrellas sólidas, gobernadas por los mismos valores que las motas: oro y rosa, como en todo el universo.
export function estrellasDosSoles(padre, brillo = 1) {
  const e = [crearEstrella({ radio: RADIO, color: [1, 0.72, 0.34], borde: [1, 0.34, 0.07], brillo }), crearEstrella({ radio: RADIO, color: [1, 0.48, 0.68], borde: [0.8, 0.13, 0.4], brillo })];
  for (const x of e) padre.add(x.malla);
  return { estrellas: e, fijar(t, sep, ang, marea) {
    const c = Math.cos(ang) * sep * 0.5, s = Math.sin(ang) * sep * 0.5;
    e[0].malla.position.set(c, 0, s); e[1].malla.position.set(-c, 0, -s);
    e[0].u.uDir.value.set(-Math.cos(ang), 0, -Math.sin(ang)); e[1].u.uDir.value.set(Math.cos(ang), 0, Math.sin(ang));
    for (const x of e) { x.u.uT.value = t; x.u.uMarea.value = marea; }
  }, liberar() { for (const x of e) x.liberar(); } };
}
export const materialDosSoles = (uniforms, { profundidad = false } = {}) => new THREE.ShaderMaterial({ vertexShader: VERTICE_DOS_SOLES, fragmentShader: FRAGMENTO_DOS_SOLES, uniforms, transparent: true, depthWrite: false, depthTest: profundidad, blending: THREE.AdditiveBlending, toneMapped: false });

// El lugar: el sistema ya en contacto, girando despacio dentro de su grupo. `ESCALA` unidades del universo por unidad del guion.
export function crearLugarDosSoles({ grupo, renderer, uPR, escala = 15 }) {
  const u = { uT: { value: 0 }, uSep: { value: SEP_FINAL }, uAng: { value: 0 }, uFlujo: { value: 1 }, uInfinito: { value: 1 }, uPx: { value: 1000 }, uPR, uAtenua: { value: 0.6 }, uSoles: { value: 1 }, uDisco: { value: 0 } };   // (atenuado: en el universo pasa por el bloom y no debe hacer halo)
  const puntos = new THREE.Points(geometriaDosSoles({ factor: 0.34, conFondo: false, conOceano: false }), materialDosSoles(u, { profundidad: true }));
  puntos.frustumCulled = false; puntos.scale.setScalar(escala); grupo.add(puntos);
  const estrellas = estrellasDosSoles(puntos, 0.56);
  // El infinito, de cara a casa: desde donde se llega se lee entero.
  puntos.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), grupo.position.clone().negate().normalize());
  const tam = new THREE.Vector2();
  return { puntos, actualizar(t, camara) {
    renderer.getDrawingBufferSize(tam);
    u.uT.value = t; u.uAng.value = t * 0.018; estrellas.fijar(t, SEP_FINAL, u.uAng.value, 0.7); u.uPx.value = tam.y / (2 * Math.tan(camara.fov * Math.PI / 360)) * escala;
  } };
}
