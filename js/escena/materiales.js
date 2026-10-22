// Material de partículas compartido: puntos redondos, tamaño por estrella y titileo
import * as THREE from 'three';

// Forma de corazón dibujada en el shader (cada estrella es un corazoncito)
const FORMA_CORAZON = /* glsl */`
  vec2 p = (gl_PointCoord - 0.5) * 2.7;
  p.y = -p.y + 0.2;
  float q = p.x * p.x + p.y * p.y - 1.0;
  float f = q * q * q - p.x * p.x * p.y * p.y * p.y;
  float a = 1.0 - smoothstep(-0.06, 0.02, f);
  float d = length(gl_PointCoord - 0.5);
  float nucleo = (1.0 - smoothstep(0.0, 0.3, d)) * a;
  gl_FragColor = vec4(vC * (a * 1.15 + nucleo * 0.6), a * uOp * vF);`;

const FORMA_REDONDA = /* glsl */`
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = pow(max(1.0 - d * 2.0, 0.0), 1.6);
  float nucleo = 1.0 - smoothstep(0.0, 0.18, d);
  gl_FragColor = vec4(vC * (a + nucleo * 0.8), a * uOp * vF);`;

// Radio visual del horizonte y su halo: las estrellas que caen dentro de ese cono,
// entre la cámara y el agujero negro, se desvanecen para que la silueta quede limpia.
export const RADIO_SILUETA = 58;

export function materialPuntos({ uScale, uPR, maximo = 6, aditivo = true, opacidad = 1, titileo = 0.15, corazon = false, silueta = false, tam = { value: 1 } }) {
  return new THREE.ShaderMaterial({
    defines: silueta ? { SILUETA: '' } : {},
    uniforms: {
      uTime: { value: 0 },
      uScale,
      uPR,
      uMaximo: { value: maximo },
      uOp: { value: opacidad },
      uTw: { value: titileo },
      uTam: tam                   // multiplicador de tamaño (compartido: compensación por distancia)
    },
    vertexShader: /* glsl */`
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime, uScale, uTw, uPR, uMaximo, uTam;
      varying vec3 vC;
      varying float vF;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 1.0 - uTw + uTw * sin(uTime * (1.0 + aPhase * 2.0) + aPhase * 40.0);
        float profundidad = max(0.1, -mv.z);
        float s = aSize * uTam * tw * uScale / profundidad;
        // Límite en píxeles CSS: los DPI del teléfono no agrandan el halo.
        gl_PointSize = clamp(s, 1.0, uMaximo * uPR);
        vF = min(s * s, 1.0) * smoothstep(18.0, 85.0, profundidad);
        #ifdef SILUETA
          // El agujero negro está en el origen. Se mide la distancia del punto al eje
          // cámara-horizonte y se compara con el radio del cono de la silueta a esa profundidad.
          vec3 haciaP = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
          float dH = length(cameraPosition);
          vec3 eje = -cameraPosition / max(dH, 1.0);
          float t = dot(haciaP, eje);
          float radio = max(${RADIO_SILUETA.toFixed(1)} * t / max(dH, 1.0), 0.01);   // positivo: smoothstep con límites ascendentes
          float delante = step(0.0, t) * (1.0 - step(dH, t));
          vF *= 1.0 - delante * (1.0 - smoothstep(radio * 0.8, radio * 1.1, length(haciaP - eje * t)));
        #endif
        vC = aColor;
      }`,
    fragmentShader: /* glsl */`
      uniform float uOp;
      varying vec3 vC;
      varying float vF;
      void main(){
        ${corazon ? FORMA_CORAZON : FORMA_REDONDA}
      }`,
    transparent: true,
    depthWrite: false,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending
  });
}

// Crea una geometría de puntos a partir de una función generadora
// gen(i, p) debe rellenar p.x p.y p.z p.r p.g p.b p.s
export function geometriaPuntos(n, gen) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const tam = new Float32Array(n), fase = new Float32Array(n);
  const p = { x: 0, y: 0, z: 0, r: 1, g: 1, b: 1, s: 1 };
  for (let i = 0; i < n; i++) {
    gen(i, p);
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    col[i * 3] = p.r; col[i * 3 + 1] = p.g; col[i * 3 + 2] = p.b;
    tam[i] = p.s; fase[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(tam, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(fase, 1));
  return g;
}

// Muchos destellos pequeños en UNA llamada de dibujo, con el mismo aspecto que un
// THREE.Sprite del mismo tamaño en el mundo (antes: un sprite y una llamada por destello).
// lista: [{ pos: [x,y,z], color: THREE.Color|hex, tam, opacidad = 1, pulso = 0 }]
export function crearDestellos(lista, { map, uScale, uPR, maximoCss = 170, ondula = 0 }) {
  const n = lista.length, color = new THREE.Color();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tam = new Float32Array(n), op = new Float32Array(n), pulso = new Float32Array(n), fase = new Float32Array(n);
  lista.forEach((d, i) => {
    pos.set(d.pos, i * 3); color.set(d.color); col.set([color.r, color.g, color.b], i * 3);
    tam[i] = d.tam; op[i] = d.opacidad ?? 1; pulso[i] = d.pulso ?? 0; fase[i] = Math.random() * 10;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(tam, 1));
  g.setAttribute('aOpacidad', new THREE.BufferAttribute(op, 1));
  g.setAttribute('aPulso', new THREE.BufferAttribute(pulso, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(fase, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uScale, uPR, uTime: { value: 0 }, uMaximo: { value: maximoCss }, uOndula: { value: ondula }, uOpacidad: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec3 aColor; attribute float aSize, aOpacidad, aPulso, aPhase;
      uniform float uScale, uPR, uTime, uMaximo, uOndula;
      varying vec3 vC; varying float vO;
      void main(){
        // Ondulación opcional (pétalos que se mecen), cada punto con su propio ritmo.
        vec3 p = position + vec3(sin(uTime * 1.3 + aPhase * 20.0), 0.0, cos(uTime * 1.1 + aPhase * 17.0) * 0.6) * uOndula;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float k = aSize * (1.0 + aPulso * sin(uTime * (0.6 + fract(aPhase) ) + aPhase));
        // Tamaño de un sprite de k unidades: k · (alto/2) / (profundidad · tan(fov/2)), fov = 60°.
        float px = k * uScale / (max(0.1, -mv.z) * 0.57735);
        gl_PointSize = clamp(px, 1.0, uMaximo * uPR);
        vC = aColor; vO = aOpacidad * min(1.0, px * px);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float uOpacidad; varying vec3 vC; varying float vO;
      void main(){ gl_FragColor = vec4(texture2D(map, gl_PointCoord).rgb * vC * vO * uOpacidad, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const puntos = new THREE.Points(g, material);
  puntos.frustumCulled = false;
  return puntos;
}
