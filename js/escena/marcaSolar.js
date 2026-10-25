// El punto dorado del sistema solar en su brazo de la galaxia (escena principal) ES el sistema solar en miniatura: el Sol
// como un disco nítido, sus planetas como motas de su color y sus órbitas como trazos finos, todo a la escala ESCALA_MARCA
// y con la misma orientación que la escena del sistema solar (girada lo que ha girado el brazo). Así, al viajar hacia él,
// el punto crece, aparecen sus órbitas y, en el corte a la escena del sistema solar (index.js, entrarOSalir), la imagen es
// la misma: la cámara se coloca a la distancia equivalente (÷ ESCALA_MARCA) y sigue hacia el Sol, ya dentro.
// Sin halos ni degradados (antes eran dos sprites de brillo difuso): discos con borde nítido y trazos de 1 px.
import * as THREE from 'three';
import { DESTINOS } from '../data/universo.js';
import { OTROS_PLANETAS, CENTRO_GIGANTE, RADIO_GIGANTE } from './planetas.js';
import { RADIO_SOL } from './solar.js';

// Unidades de la escena principal por unidad del sistema solar: Neptuno (órbita de 8400) queda a 60 u del punto
// (el sistema solar mide ~60 u en la tabla de escala: js/data/escalaCosmica.js, ESCALA_UNIVERSO).
export const ESCALA_MARCA = 60 / 8400;

// Los cuerpos del sistema solar: posición (coordenadas de la escena del sistema solar), radio y color.
const posDe = id => new THREE.Vector3(...DESTINOS.find(d => d.id === id).posicion);
export const CUERPOS_SOLARES = [
  { pos: posDe('rosa'), radio: 62, color: '#ffa6d0' },
  { pos: posDe('cartas'), radio: 40, color: '#dbc5ff' },
  { pos: posDe('azul'), radio: 30, color: '#9fc2ff' },
  { pos: CENTRO_GIGANTE.clone(), radio: RADIO_GIGANTE, color: '#e9c9a0' },
  ...OTROS_PLANETAS.map(p => ({ pos: p.centro.clone(), radio: p.radio, color: { Mercurio: '#b8ada3', Venus: '#f3e2b8', Marte: '#e08a5a', Saturno: '#efe0bd', Urano: '#c9f1f2', Neptuno: '#6f8fe8' }[p.nombre] ?? '#ffffff' }))
];
export const RADIOS_ORBITA = CUERPOS_SOLARES.map(c => Math.hypot(c.pos.x, c.pos.z));

export function crearMarcaSolar({ uScale, uPR, etiqueta }) {
  const grupo = new THREE.Group(), mini = new THREE.Group(); grupo.add(mini); mini.scale.setScalar(ESCALA_MARCA);
  // Discos nítidos con el tamaño real en pantalla (2·r·focal/z) y un mínimo en píxeles para verse de lejos.
  const uLatido = { value: 1 }, uOpPlanetas = { value: 1 };
  const discos = (puntos, minimo, op) => {
    const pos = [], col = [], rad = [], c = new THREE.Color();
    for (const p of puntos) { pos.push(p.pos.x, p.pos.y, p.pos.z); c.set(p.color).multiplyScalar(p.luz ?? 1); col.push(c.r, c.g, c.b); rad.push(p.radio); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aRadio', new THREE.Float32BufferAttribute(rad, 1));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uScale, uPR, uMin: { value: minimo }, uOp: op, uLatido },
      vertexShader: /* glsl */`attribute vec3 color; attribute float aRadio; uniform float uScale, uPR, uMin, uLatido; varying vec3 vC; varying float vT;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; vC = color;
          float escala = length(modelMatrix[0].xyz);   // el grupo está escalado: el radio también
          vT = clamp(max(uMin * uPR * uLatido, 2.0 * aRadio * escala * uScale * 1.732 / max(1e-3, -mv.z)), 1.0, 90.0 * uPR); gl_PointSize = vT; }`,
      fragmentShader: /* glsl */`uniform float uOp; varying vec3 vC; varying float vT;
        void main(){ vec2 q = gl_PointCoord - 0.5; if (vT >= 2.5 && dot(q, q) > 0.25) discard; gl_FragColor = vec4(vC * uOp, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.frustumCulled = false; return m;
  };
  // El Sol: crema dorado, por debajo del umbral del resplandor (sin halo).
  const sol = discos([{ pos: new THREE.Vector3(), radio: RADIO_SOL, color: '#ffd9a0', luz: 0.74 }], 5, { value: 1 });
  const planetas = discos(CUERPOS_SOLARES.map(c => ({ ...c, luz: 0.7 })), 1.5, uOpPlanetas);
  mini.add(sol, planetas);
  // Órbitas: los mismos círculos que en la escena del sistema solar (planetas.js), igual de tenues.
  const materialOrbita = new THREE.LineBasicMaterial({ color: '#d9c6ff', transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const r of RADIOS_ORBITA) {
    const pts = Array.from({ length: 160 }, (_, i) => { const t = i / 160 * Math.PI * 2; return new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r); });
    mini.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), materialOrbita));
  }
  // El nombre, encima: se lee de lejos y se aparta al acercarse (antes crecía hasta cubrir la pantalla).
  const nombre = new THREE.Sprite(new THREE.SpriteMaterial({ map: etiqueta, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  nombre.scale.set(190, 30, 1); nombre.position.y = 70; grupo.add(nombre);
  return {
    grupo,
    // Cada cuadro: posición en el brazo, giro del marco del sistema solar y lo que se ve según la distancia.
    actualizar(camera, punto, giro, tiempo) {
      grupo.position.copy(punto); mini.rotation.y = giro;
      const d = camera.position.distanceTo(punto);
      uLatido.value = 1 + Math.sin(tiempo * 2.2) * 0.18 * THREE.MathUtils.smoothstep(d, 300, 900);   // late de lejos; de cerca, quieto
      const cerca = 1 - THREE.MathUtils.smoothstep(d, 260, 1100);
      materialOrbita.opacity = 0.13 * cerca; uOpPlanetas.value = 0.35 + 0.65 * cerca;
      nombre.material.opacity = 0.7 * THREE.MathUtils.smoothstep(d, 170, 520);
    }
  };
}
