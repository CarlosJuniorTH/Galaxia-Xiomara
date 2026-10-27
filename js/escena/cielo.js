// Cielo de fondo de casa (a distancia infinita): polvo estelar fino sobre un fondo muy oscuro con un toque violeta.
// (La Vía Láctea es una galaxia 3D aparte, viaLactea.js, y las nebulosas están en el cielo profundo, cieloProfundo.js.)
//
// Antes se horneaba en el teléfono, en cada carga, un cubo de 6 × 1024² con un sombreador de nubes de 7 octavas… del que,
// con la banda y el velo apagados, solo quedaban las estrellas: cada una caía en un texel y en la pantalla de un iPhone
// salía como una mancha borrosa de ~4 px. Ahora son puntos reales, generados una vez con semilla fija: la misma densidad
// (más en las zonas de nebulosidad), el mismo color y la misma luz, nítidos a cualquier resolución; sin horneado en la
// carga y sin los ~33 MB del cubo en la tarjeta gráfica.
import * as THREE from 'three';
import { generador } from '../util/azarSemilla.js';
import { horneado } from '../util/horno.js';

// Ruido de valor 3D (el mismo hash que usaba el sombreador del cielo) para modular la densidad.
const fr = x => x - Math.floor(x);
function hash(x, y, z) {
  let a = fr(x * 0.3183099 + 0.1) * 17, b = fr(y * 0.3183099 + 0.1) * 17, c = fr(z * 0.3183099 + 0.1) * 17;
  return fr(a * b * c * (a + b + c));
}
function ruido(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  let u = x - i, v = y - j, w = z - k; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); w = w * w * (3 - 2 * w);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash(i, j, k), hash(i + 1, j, k), u), l(hash(i, j + 1, k), hash(i + 1, j + 1, k), u), v),
           l(l(hash(i, j, k + 1), hash(i + 1, j, k + 1), u), l(hash(i, j + 1, k + 1), hash(i + 1, j + 1, k + 1), u), v), w);
}
function fbm(x, y, z, octavas = 4) {
  let s = 0, a = 0.5;
  for (let o = 0; o < octavas; o++) { s += a * ruido(x, y, z); x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; z = z * 2.03 + 3.1; a *= 0.5; }
  return s;
}
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Las dos capas de antes: celdas de 1/1400 y 1/700 de radián; en cada una, una estrella con la probabilidad de entonces.
const CAPAS = [
  { celdas: 1400, prob: 0.0025, extraNebulosa: 0.002, color: [0.75, 0.7, 0.85], brillo: r => 0.35 + 0.9 * r },
  { celdas: 700, prob: 0.0007, extraNebulosa: 0, color: [1.0, 0.97, 0.95], brillo: () => 0.9 }
];
const PERFIL = 0.1678;   // ∫ del perfil del punto (pow(1 − 2d, 1,6) en el disco) sobre el cuadrado del punto

// (Horneadas: en un móvil sin compilador de JavaScript generarlas tardaba más de un segundo; vienen ya hechas.)
function crearEstrellas() {
  const { pos, col, luz } = horneado('estrellas del cielo de casa', calcularEstrellas);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aLuz', new THREE.BufferAttribute(luz, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  return g;
}
function calcularEstrellas() {
  const rnd = generador(37011), pos = [], col = [], luz = [], S = 3.7;
  for (const capa of CAPAS) {
    const omega = 1 / (capa.celdas * capa.celdas);   // ángulo sólido de una celda: la luz de cada estrella era su valor × esa área
    const total = Math.round(4 * Math.PI * capa.celdas * capa.celdas * (capa.prob + capa.extraNebulosa));
    for (let i = 0; i < total; i++) {
      // Dirección uniforme en la esfera.
      const z = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z), x = r * Math.cos(t), y = r * Math.sin(t);
      const azar = rnd(), azarBrillo = rnd();
      if (capa.extraNebulosa) {
        // Donde había nebulosidad caían más estrellas (densidad 0,9975 − neb·0,002): se aceptan en esa proporción.
        const n1 = fbm(x * 2.6 + S, y * 2.6 + S, z * 2.6 + S), n2 = fbm(x * 5 + 2 * S, y * 5 + 2 * S, z * 5 + 2 * S);
        const neb = suave(0.42, 0.88, n2) * suave(0.3, 0.65, n1);
        if (azar * (capa.prob + capa.extraNebulosa) > capa.prob + capa.extraNebulosa * neb) continue;
      }
      pos.push(x, y, z); col.push(...capa.color); luz.push(capa.brillo(azarBrillo) * omega);
    }
  }
  return { pos: new Float32Array(pos), col: new Float32Array(col), luz: new Float32Array(luz) };
}

export function crearCielo({ scene, camera, uScale }) {
  const uI = { value: 0.5 }, uPxRad = { value: 1000 };
  const material = new THREE.ShaderMaterial({
    uniforms: { uI, uPxRad },
    vertexShader: /* glsl */`
      attribute vec3 aColor; attribute float aLuz; uniform float uI, uPxRad; varying vec3 vC;
      void main(){
        // A distancia infinita: solo el giro de la cámara (en el plano lejano, detrás de todo).
        vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww;
        // Luz de la estrella en píxeles del búfer (valor × ángulo sólido × píxeles por radián²); se reparte en un punto de
        // 2 px, que solo crece si con el teleobjetivo sería más intensa de la cuenta.
        float e = aLuz * uPxRad * uPxRad, s = clamp(sqrt(e / (${PERFIL} * 2.5)), 2.0, 48.0);
        gl_PointSize = s; vC = aColor * uI * e / (s * s * ${PERFIL});
      }`,
    fragmentShader: 'precision mediump float; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC * pow(max(1.0 - d * 2.0, 0.0), 1.6), 1.0); }',
    // Con prueba de profundidad (están en el plano lejano, como el fondo de three.js): solo donde no hay nada delante. Se
    // dibujan con lo transparente, después de lo opaco: sin ella salían encima de planetas y sombras.
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending
  });
  const puntos = new THREE.Points(crearEstrellas(), material);
  puntos.frustumCulled = false; puntos.renderOrder = -1001; puntos.name = 'Cielo de casa (estrellas)'; scene.add(puntos);
  // El fondo de antes (sin estrellas): casi negro con un toque violeta (0,002/0,001/0,004) por la intensidad del fondo, que
  // three.js no aplica a un color: se escala aquí en cada cuadro (lejos de casa se oscurece, como el cubo de antes).
  const fondo = new THREE.Color(); scene.background = fondo;
  const fijarFondo = k => fondo.setRGB(0.002 * k, 0.001 * k, 0.004 * k, THREE.LinearSRGBColorSpace);
  fijarFondo(0.5);
  scene.backgroundIntensity = 0.5;   // cielo profundo y oscuro: así la galaxia resalta (index.js lo baja lejos de casa)
  return {
    puntos,
    actualizar() {
      // Sigue a la intensidad del fondo que index.js ajusta (lejos de casa, con el teleobjetivo) y al campo de visión.
      uI.value = scene.backgroundIntensity; puntos.visible = uI.value > 0.003; fijarFondo(uI.value);
      uPxRad.value = uScale.value / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    }
  };
}
