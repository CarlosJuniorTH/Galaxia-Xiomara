// El cuásar: el corazón de una galaxia espiral despierto. Todo en 3D y animado en la GPU:
//  · galaxia anfitriona de partículas (núcleo rosa melocotón, brazos azules con nudos rosas de
//    estrellas nacientes y nubes de gas suaves), con rotación diferencial;
//  · anillo de polvo y gas ardiente (naranja, rojo y magenta, con destellos azules);
//  · disco de acreción: blanco en el borde interior, anillo azul, oro, naranja y rojo hacia fuera,
//    con filamentos que giran más rápido cuanto más cerca (Kepler) y un lado más brillante (Doppler);
//  · la sombra del horizonte con su anillo de fotones;
//  · chorros relativistas: columna blanca, vaina azul con hélice y nudos que salen disparados,
//    partículas en espiral y lóbulos al final;
//  · rayos rojizos que brotan del núcleo (radiación).
// Unidades locales del grupo (el grupo se escala desde cosmos.js).
import * as THREE from 'three';
import { EXPOSICION } from './exposicion.js';
import { esMovil } from '../util/dispositivo.js';

export const CUASAR = Object.freeze({ sombra: 280, discoIn: 300, discoOut: 1100, toroR: 1500, toroTubo: 240, anfitriona: 4800, chorro: 7600 });

// Aleatorio con semilla (la galaxia es siempre la misma).
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const gauss = a => { let u = 0; while (!u) u = a(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * a()); };
const mezcla = (a, b, t) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));
const C = h => new THREE.Color(h);

const RUIDO = /* glsl */`
  float h3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }   // sin senos: estable en cualquier GPU
  float rn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm3(vec3 p){ return rn3(p) * 0.55 + rn3(p * 2.03 + 7.1) * 0.3 + rn3(p * 4.1 + 3.7) * 0.15; }`;

const aditivo = (uniforms, vertexShader, fragmentShader, extra = {}) => new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, ...extra });

// Nube de partículas en coordenadas polares que giran (posición = ángulo, radio, altura).
// suave: perfil del punto (0 nítido, 1 algodón para el gas); tamMax en píxeles CSS.
function crearNubePolar({ datos, uScale, uPR, vel, suave = 0, tamMax = 48, cerca = 0 }) {
  const n = datos.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tam = new Float32Array(n), fase = new Float32Array(n);
  datos.forEach((d, i) => { pos.set([d.ang, d.r, d.h], i * 3); col.set([d.c.r, d.c.g, d.c.b], i * 3); tam[i] = d.tam; fase[i] = d.fase; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aTam', new THREE.BufferAttribute(tam, 1)); g.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
  const p = new THREE.Points(g, aditivo({ uT: { value: 0 }, uScale, uPR, uV: { value: vel }, uMax: { value: tamMax }, uSuave: { value: suave }, uCerca: { value: cerca } },
    /* glsl */`uniform float uT, uScale, uPR, uV, uMax, uCerca; attribute vec3 aCol; attribute float aTam, aFase; varying vec3 vC; varying float vA;
      void main(){
        float r = position.y, ang = position.x + uT * uV * (r < 1600.0 ? 0.5 : 0.0);   // el anillo interior gira; la galaxia, como un todo y muy despacio (su espiral no cambia de forma)
        vec4 mv = modelViewMatrix * vec4(cos(ang) * r, position.z, sin(ang) * r, 1.0); gl_Position = projectionMatrix * mv;
        float s = aTam * length(modelViewMatrix[0].xyz) * uScale / max(1e-3, -mv.z), lim = uMax * uPR;
        gl_PointSize = clamp(s, 1.0, lim);
        // Pequeñas: su luz baja con su tamaño; enormes (cámara encima): se apartan suavemente.
        vA = min(1.0, s) * (0.85 + 0.15 * sin(uT * 1.7 + aFase * 6.2832)) * (1.0 - smoothstep(lim * 0.6, lim, s) * uCerca);
        vC = aCol; }`,
    /* glsl */`uniform float uSuave; varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
        float a = mix(exp(-d * d * 5.0) + exp(-d * 18.0) * 0.6, exp(-d * d * 2.2) * (1.0 - d), uSuave) * vA;
        gl_FragColor = vec4(vC * a, a); }`));
  p.frustumCulled = false;
  return p;
}

const esMovilCuasar = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
export function crearCuasar({ uScale, uPR, texGigante, texBrillo, texNebulosa }) {
  const grupo = new THREE.Group(), animados = [], a = azar(4101), K = 1;   // el mismo contenido en móvil y en PC
  const { sombra: RS, discoIn, discoOut, toroR, toroTubo, anfitriona: RG, chorro: LARGO } = CUASAR;

  // ── Galaxia anfitriona: UNA sola descripción de sus dos brazos, compartida por estrellas y gas ──
  // Espiral logarítmica: ángulo del brazo k a radio r = ln(r / RA) / paso + DESFASE[k]. El segundo brazo va algo
  // desfasado (no es un reflejo exacto). Ancho que crece hacia fuera; plumas finas junto al brazo (no otras espirales).
  const brazos = 2, paso = 0.36, R0 = 1750, RA = 700, DESFASE = [0, Math.PI + 0.22];
  const anchoBrazo = x => 0.34 + 0.3 * x;   // radianes de semiancho a la altura relativa x (0 dentro, 1 fuera)
  const estrellas = [], rosa = C('#ff9cc0'), lila = C('#c9a6ff'), azul = C('#86b4ff'), hielo = C('#d6e6ff'), nudo = C('#ff5d9e');
  for (let i = 0, n = Math.round(30000 * K); i < n; i++) {
    const r = R0 * 0.9 + (RG - R0 * 0.9) * Math.pow(a(), 1.25), brazo = Math.floor(a() * brazos), x = Math.max(0, (r - R0) / (RG - R0));
    const enBrazo = a() < 0.8, pluma = enBrazo && x > 0.25 && a() < 0.22 ? (a() < 0.5 ? 1 : -1) * (0.42 + a() * 0.12) : 0;
    const disp = enBrazo ? gauss(a) * anchoBrazo(x) * (pluma ? 0.35 : 0.6) : (a() - 0.5) * Math.PI * 2;
    const th = Math.log(r / RA) / paso + DESFASE[brazo] + pluma + disp, esNudo = enBrazo && !pluma && a() < 0.05;
    // Rosa en el corazón denso del brazo; azul en su borde y hacia fuera.
    const borde = Math.min(1, Math.abs(disp) / anchoBrazo(x));
    let c = mezcla(mezcla(rosa, lila, x * 1.6), mezcla(lila, azul, 0.4 + x), borde * 0.8 + x * 0.4);
    if (enBrazo && a() < 0.2) c = mezcla(c, hielo, 0.6);
    if (esNudo) c = nudo.clone();
    const brillo = (enBrazo ? (pluma ? 0.6 : 1.1) : 0.18) * (0.75 + 0.35 * Math.min(1, x * 4) - x * 0.3);
    estrellas.push({ ang: th, r, h: gauss(a) * (30 + x * 90), c: c.multiplyScalar(brillo), tam: esNudo ? 70 + a() * 60 : enBrazo ? 24 + a() * 22 : 12 + a() * 8, fase: a() });
  }
  const galaxia = crearNubePolar({ datos: estrellas, uScale, uPR, vel: 0.02, tamMax: 3.5, cerca: 1 });   // estrellas finas (sin bolitas de color)
  // Gas de los brazos (sin partículas): capas a distintas alturas con LA MISMA espiral que las estrellas; cada brazo,
  // un perfil gaussiano alrededor de su línea, con anchura y densidad que varían (zonas densas y huecos), plumas
  // tenues y más espesor donde el brazo es denso. Quieto: la forma no cambia con el tiempo.
  const capasBrazo = [];
  for (let k = 0; k < 7; k++) {
    const h = (k - 3) / 3, capa = new THREE.Mesh(new THREE.RingGeometry(R0 * 0.5, RG, 192, 24), aditivo({ uT: { value: 0 }, uR: { value: RG }, uPaso: { value: paso }, uH: { value: h }, uR0: { value: R0 }, uRA: { value: RA }, uD1: { value: DESFASE[1] } },
      'varying vec2 vP; varying float vD, vC; void main(){ vP = position.xy; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = length(mv.xyz) / length(modelMatrix[0].xyz); vC = abs(dot(normalize(mv.xyz), normalize(normalMatrix * vec3(0.0, 0.0, 1.0)))); gl_Position = projectionMatrix * mv; }',
      /* glsl */`uniform float uT, uR, uPaso, uH, uR0, uRA, uD1; varying vec2 vP; varying float vD, vC; ${RUIDO}
        float envuelve(float a){ return a - 6.2831853 * floor(a / 6.2831853 + 0.5); }
        void main(){ float r = length(vP), x = clamp((r - uR0) / (uR - uR0), 0.0, 1.0), ang = atan(vP.y, vP.x);
          float base = log(max(r, uRA) / uRA) / uPaso, ancho = 0.34 + 0.3 * x;
          mat3 gira = mat3(0.8, 0.36, -0.48, -0.6, 0.48, -0.64, 0.0, 0.8, 0.6);   // ejes girados: sin cuadrícula del ruido
          vec3 q = vec3(vP * 0.0016, uH * 0.8);
          float brazoT = 0.0, lado = 0.0;
          for (int b = 0; b < 2; b++) {
            float fi = ang - base - (b == 0 ? 0.0 : uD1), d = envuelve(fi);
            // Densidad a lo largo del brazo: zonas densas y huecos (ruido según el radio), algo distinta en cada brazo.
            float aLo = 0.45 + 0.75 * smoothstep(0.25, 0.75, fbm3(vec3(r * 0.0009 + float(b) * 7.3, float(b) * 3.1, 0.5)));
            float w = ancho * (0.8 + 0.5 * fbm3(vec3(r * 0.0012, float(b) * 5.0, 2.0)));
            float nucleo = exp(-pow(d / w, 2.0)) + 0.3 * exp(-pow(d / (w * 1.7), 2.0));
            float plumas = 0.22 * smoothstep(0.25, 0.6, x) * (exp(-pow((abs(d) - 0.48) / (w * 0.35), 2.0)));
            // Hebras a lo largo del brazo (siguen su curva) y un carril de polvo en su borde interior.
            float hebra = 0.7 + 0.55 * fbm3(vec3(cos(fi) * 4.0 + float(b) * 4.0, sin(fi) * 4.0, r * 0.0035 + uH * 0.6));   // continuo al dar la vuelta
            float polvo = 1.0 - 0.55 * exp(-pow((d + w * 0.45) / (w * 0.2), 2.0)) * smoothstep(0.05, 0.4, x);
            float v = (nucleo + plumas) * aLo * hebra * polvo;
            brazoT += v; lado += v * abs(d) / w;   // suma suave de los dos brazos (sin costuras donde se cruzan sus zonas)
          }
          lado /= max(brazoT, 1e-4);
          // ── Nubes turbulentas de muchos colores (como las paredes del cielo profundo): todo el disco está lleno de
          // gas; los brazos son donde se acumula más. Vetas que giran con la espiral, polvo oscuro en filamentos y
          // crestas brillantes. Color de dentro afuera: oro → naranja → rojo → rosa/magenta → violeta → azul. ──
          float aaB = 1.0 - smoothstep(0.6, 2.4, fwidth(base * 2.0));
          float s1 = ang - base * (0.75 - 0.4 * x);                                     // fase de la espiral (vetas que giran)
          vec2 sp = vec2(cos(s1), sin(s1)) * r * 0.0011;                    // el plano retorcido por el remolino
          vec3 w = vec3(sp, uH * 0.4);
          w += (vec3(fbm3(w * 1.3 + 1.0), fbm3(w * 1.3 + 4.0), fbm3(w * 1.3 + 7.0)) - 0.5) * 1.1;
          float turb = fbm3(gira * w * 1.4) * 0.5 + fbm3(gira * w * 3.1 + 5.0) * 0.27 + fbm3(gira * gira * w * 7.0 + 9.0) * 0.15 + fbm3(gira * w * 16.0 + 3.0) * 0.08;
          float vetas = fbm3(gira * w * 2.2 + 31.0);
          float polvoF = max(1.0 - abs(fbm3(gira * w * 2.6 + 13.0) * 2.0 - 1.0), (1.0 - abs(fbm3(gira * w * 7.0 + 17.0) * 2.0 - 1.0)) * 0.96);
          float dust = smoothstep(0.7, 0.9, polvoF) * smoothstep(0.05, 0.35, x + 0.15);   // filamentos de polvo oscuro
          float cresta = pow(max(0.0, 1.0 - abs(turb * 2.0 - 1.1) * 2.2), 3.0);       // bordes brillantes de las nubes
          float dens = (0.12 + 1.3 * mix(0.5, brazoT, aaB)) * smoothstep(0.34, 0.68, turb + (vetas - 0.5) * 0.4);   // huecos negros entre las nubes
          float grosor = exp(-uH * uH * max(0.8, 2.4 - dens * 1.2));
          float zona = smoothstep(uR0 * 0.5, uR0 * 0.95, r) * (1.0 - smoothstep(0.78, 1.0, x + (turb - 0.5) * 0.35));
          float hue = clamp(x * 1.35 - 0.05 + (fbm3(w * 0.8 + 21.0) - 0.5) * 0.5 + lado * 0.1, 0.0, 1.0);
          vec3 c = hue < 0.18 ? mix(vec3(1.0, 0.8, 0.42), vec3(1.0, 0.48, 0.14), hue / 0.18)
                 : hue < 0.38 ? mix(vec3(1.0, 0.48, 0.14), vec3(0.95, 0.22, 0.32), (hue - 0.18) / 0.2)
                 : hue < 0.58 ? mix(vec3(0.95, 0.22, 0.32), vec3(1.0, 0.5, 0.82), (hue - 0.38) / 0.2)
                 : hue < 0.78 ? mix(vec3(1.0, 0.5, 0.82), vec3(0.62, 0.45, 1.0), (hue - 0.58) / 0.2)
                 : mix(vec3(0.62, 0.45, 1.0), vec3(0.35, 0.62, 1.0), (hue - 0.78) / 0.22);
          c = pow(c, vec3(1.5));                                            // colores más profundos (al sumarse las capas no se lavan)
          c = mix(c, vec3(1.0, 0.92, 0.88), cresta * 0.15);                 // crestas que brillan casi blancas
          float b = dens * (0.6 + 0.8 * vetas) * (1.0 - dust * 0.92) * grosor * zona * (1.0 + cresta * 1.2) * exp(-x * 0.6) * 1.0
                  * smoothstep(500.0, 2600.0, vD) * clamp(vC * 3.0, 0.3, 1.0);
          b = 1.0 - exp(-b * 1.3);
          gl_FragColor = vec4(c * b, b); }`));
    capa.rotation.x = -Math.PI / 2; capa.scale.y = -1; capa.position.y = h * 160; capasBrazo.push(capa);
  }
  grupo.add(...capasBrazo, galaxia); animados.push(...capasBrazo, galaxia);
  capasBrazo.forEach(c => c.visible = false);   // sustituidas por el remolino

  // ── Remolino (como en la imagen de referencia): un único gas pintado con color y polvo OPACOS (no solo luz que se
  // suma): vetas finas doradas y blancas que giran junto al agujero, naranja y rojo, rosa luminoso con bordes
  // blancos, zarcillos de polvo negro muy condensado dentro del rojo y el rosa, muchas espirales seguidas que por fuera pasan a
  // violeta y azul, e hilachas naranjas que se escapan al vacío. Tres láminas a distinta altura dan cuerpo. La forma es
  // fija: gira entera, muy despacio, sin enroscarse. ──
  const R_IN = discoIn * 1.02, R_OUT = RG * 1.3;
  const remolino = [];
  // El remolino es muy rico (muchas capas de ruido por píxel): se HORNEA una vez durante la carga en una imagen
  // (hornearRemolino, desde index.js) y en cada cuadro solo se muestrea, girando entero. Misma calidad, mucho menos
  // trabajo para la GPU (antes costaba ≈ 25 ms por cuadro en PC).
  const FRAG_REMOLINO = /* glsl */`uniform float uT, uIn, uOut, uH; varying vec2 vP; varying float vC;
        float perm(float x){ return mod((x * 34.0 + 1.0) * x, 289.0); }
        float hh(vec2 i){ i = mod(i, 289.0); return perm(perm(i.x) + i.y) / 289.0; }
        vec2 gr(vec2 i){ float a = hh(i) * 6.2831853 + hh(i + 101.0) * 3.0; return vec2(cos(a), sin(a)); }
        float gn(vec2 p){ vec2 i = floor(p), f = fract(p), w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
          return mix(mix(dot(gr(i), f), dot(gr(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), w.x), mix(dot(gr(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(gr(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), w.x), w.y) * 1.4; }
        const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
        float fbm(vec2 p, int o){ float v = 0.0, a = 0.5; for (int i = 0; i < 8; i++){ if (i >= o) break; v += a * gn(p); p = ROT * p + vec2(3.1, 1.7); a *= 0.5; } return v; }
        float cresta(vec2 p, int o){ float v = 0.0, a = 0.5; for (int i = 0; i < 7; i++){ if (i >= o) break; float n = 1.0 - abs(gn(p)); v += a * n * n; p = ROT * p + vec2(5.3, 2.9); a *= 0.5; } return v; }
        vec3 rampa(float u){   // 0 junto al agujero → 1 fuera
          vec3 c0 = vec3(1.0, 0.95, 0.8), c1 = vec3(1.0, 0.68, 0.22), c2 = vec3(1.0, 0.42, 0.1), c3 = vec3(0.88, 0.13, 0.17), c4 = vec3(1.0, 0.45, 0.68), c5 = vec3(1.0, 0.72, 0.9), c6 = vec3(0.55, 0.5, 1.0), c7 = vec3(0.3, 0.55, 1.0);
          return u < 0.04 ? mix(c0, c1, u / 0.04) : u < 0.2 ? mix(c1, c2, (u - 0.04) / 0.16) : u < 0.34 ? mix(c2, c3, (u - 0.2) / 0.14) : u < 0.48 ? mix(c3, c4, (u - 0.34) / 0.14)
               : u < 0.6 ? mix(c4, c5, (u - 0.48) / 0.12) : u < 0.78 ? mix(c5, c6, (u - 0.6) / 0.18) : mix(c6, c7, clamp((u - 0.78) / 0.22, 0.0, 1.0)); }
        void main(){
          // Elipse alargada (como en la imagen): el plano se comprime en un eje (cerca del agujero, apenas).
          vec2 vE = vP * vec2(1.0, mix(1.0, 1.55, smoothstep(uIn * 2.0, uIn * 6.0, length(vP))));
          float r = length(vE), x = clamp((r - uIn) / (uOut - uIn), 0.0, 1.0), lr = log(r / uIn);
          float th = atan(vE.y, vE.x) + uT * 0.03;   // gira entero (siempre en movimiento, sin deformarse)
          // Muchas espirales seguidas (no dos brazos): bandas apretadas que giran alrededor del agujero, una tras otra,
          // de anchura y brillo distintos; entre ellas, carriles más oscuros. El remolino está lleno.
          float tw = th - lr * 1.55;
          float twB = th - lr * 2.6;                                         // bandas más enroscadas
          float ph = 1.4 * gn(vec2(lr * 3.0, 3.0)) + 0.8 * gn(vec2(twB * 0.8, lr * 5.0));
          float bandas = 0.5 + 0.5 * cos(7.0 * twB + ph);
          bandas = mix(bandas, 0.5 + 0.5 * cos(11.0 * twB + ph * 1.7 + 2.0), 0.35);
          float brazos = smoothstep(0.15, 0.9, bandas);
          // Silueta elíptica llena, con el borde irregular; sin brazos sueltos.
          float forma = 0.55 + 0.6 * brazos;
          // La materia fluye a lo largo de la espiral (la textura se desliza por los brazos; la forma no cambia).
          float twF = tw + uT * 0.05;
          vec2 s = vec2(cos(twF), sin(twF)) * r * 0.00085 + uH * vec2(3.7, 1.9);   // cada capa de gas es distinta
          s += vec2(fbm(s * 0.9 + 7.0, 3), fbm(s * 0.9 + 13.0, 3)) * 0.55;
          vec2 v = vec2(twF * 6.0 / (1.0 + 2.5 * x), lr * 14.0);
          float vetas = fbm(v * vec2(1.0, 2.0) + s * 0.6, 7) * 0.7 + (cresta(v * vec2(1.6, 3.0) + 4.0, 5) - 0.45) * 0.6;
          float nube = fbm(s * 1.5, 7) + 0.35 * cresta(s * 3.5 + 9.0, 6) - 0.1;
          float D = mix(vetas, nube, smoothstep(0.12, 0.45, x)) * 0.5 + 0.5;
          float borde = (1.0 - smoothstep(0.42, 0.92, x + (fbm(s * 1.2 + 31.0, 5)) * 0.45 + (fbm(s * 4.0 + 37.0, 4)) * 0.12)) * (1.0 - smoothstep(0.7, 0.97, x));   // borde deshilachado que se pierde en el vacío (nunca el corte de la malla)
          float cuerpo = smoothstep(0.2, 0.5, D * forma + 0.25 * (1.0 - smoothstep(0.0, 0.5, x))) * borde;   // lleno: casi sin huecos
          // Hilachas que salen al vacío (naranjas y rojas).
          vec2 sh = vE * 0.0012 + vec2(fbm(vE * 0.0009 + 3.0, 4), fbm(vE * 0.0009 + 9.0, 4)) * 0.8;   // plano sin estirar: nubes, no pinceladas
          float hil = 1.3 * smoothstep(0.25, 0.6, fbm(sh * 1.4 + 17.0, 6) + 0.35 * cresta(sh * 3.0 + 5.0, 5) - 0.2) * borde * 2.5 * smoothstep(0.35, 0.6, x) * (1.0 - smoothstep(0.7, 1.0, x + fbm(s * 1.1 + 47.0, 4) * 0.4)) * (0.3 + brazos);
          // ── Polvo negro como en las paredes del fondo: estrías que siguen la espiral (ruido muy estirado a lo largo
          // del giro), con el borde que mira al agujero encendido; franjas anchas oscuras y zarcillos fractales. ──
          vec2 e = vec2(twF * 2.0 + 1.2 * gn(vec2(twF * 1.5, lr * 2.0)), lr * 8.0);
          float e1 = abs(gn(e)), e2 = abs(gn(e * vec2(1.7, 2.3) + 11.0));
          float estria = (1.0 - smoothstep(0.02, 0.055, e1)) * smoothstep(0.45, 0.6, fbm(s * 1.4 + 91.0, 4) * 0.5 + 0.5) + (1.0 - smoothstep(0.012, 0.032, e2)) * 0.7 * smoothstep(0.5, 0.65, fbm(s * 1.9 + 93.0, 4) * 0.5 + 0.5);   // interrumpidas, no anillos
          float eL = abs(gn(e - vec2(0.0, 0.18)));                                      // un poco hacia el agujero
          float filo = clamp((1.0 - smoothstep(0.05, 0.13, eL)) - (1.0 - smoothstep(0.05, 0.13, e1)), 0.0, 1.0);
          float franjas = 1.0 - smoothstep(-0.25, 0.1, fbm(vec2(twF * 4.0, lr * 7.0) + 3.0, 4));   // bandas anchas de polvo
          float zarc = cresta(s * 3.2 + 5.0, 7), zarc2 = cresta(s * 7.5 + 11.0, 6);
          // Encaje de polvo: líneas finas que se ramifican (crestas de ruido en un espacio retorcido), agrupadas en
          // zonas; dentro de ellas, núcleos más densos. Así el negro se ve como zarcillos, no como arañazos.
          vec2 sw = s * 3.0 + vec2(fbm(s * 2.0 + 101.0, 4), fbm(s * 2.0 + 107.0, 4)) * 0.9;
          float encaje = (1.0 - smoothstep(0.02, 0.07, abs(gn(sw * 2.6)))) + (1.0 - smoothstep(0.015, 0.05, abs(gn(sw * 5.5 + 9.0)))) * 0.85 + (1.0 - smoothstep(0.012, 0.04, abs(gn(sw * 11.0 + 3.0)))) * 0.6;
          float zonaP = smoothstep(0.34, 0.52, fbm(s * 0.9 + 113.0, 5) * 0.5 + 0.5);
          float nucleoP = smoothstep(0.86, 0.9, zarc * 0.7 + zarc2 * 0.4);
          float fract1 = clamp(encaje * zonaP + nucleoP, 0.0, 1.0);
          float polvo = clamp(estria * 0.55 * zonaP + fract1, 0.0, 1.0);
          polvo *= smoothstep(0.08, 0.22, x) * (1.0 - smoothstep(0.5, 0.78, x)) * (0.75 + 0.25 * smoothstep(0.3, 0.6, fbm(s * 0.8 + 77.0, 4) * 0.5 + 0.5));
          // ── Color: muchos colores a la vez. Oro y blanco junto al agujero, naranja, rojo, rosa luminoso y, en los bordes
          // de los brazos y entre ellos, violeta y azul; manchas de otro tono por todas partes. ──
          float u = clamp(x * 0.95 + (fbm(s * 0.7 + 51.0, 4)) * 0.25 + smoothstep(0.55, 0.9, x) * 0.12, 0.0, 1.0);
          vec3 col = rampa(u);
          float entre = smoothstep(0.55, 0.92, x + (fbm(s * 0.8 + 66.0, 4)) * 0.25);   // por fuera: violeta y azul
          col = mix(col, mix(vec3(0.55, 0.45, 1.0), vec3(0.35, 0.6, 1.0), fbm(s * 1.3 + 61.0, 4) * 0.5 + 0.5), clamp(entre * 0.55 + smoothstep(0.45, 0.75, fbm(s * 0.9 + 71.0, 4) * 0.5 + 0.5) * 0.3 * smoothstep(0.5, 0.75, x), 0.0, 1.0));
          col = mix(col, vec3(1.0, 0.45, 0.7), smoothstep(0.55, 0.75, fbm(s * 1.1 + 81.0, 4) * 0.5 + 0.5) * 0.45 * smoothstep(0.15, 0.4, x) * (1.0 - entre));   // rosas
          col = pow(col, vec3(1.6));   // colores profundos y saturados
          col *= 1.0 + 0.6 * smoothstep(0.3, 0.6, x) * (1.0 - smoothstep(0.75, 0.95, x));   // el rosa, luminoso
          float luz = 0.2 + 1.6 * smoothstep(0.38, 0.85, D);   // mucho contraste: nubes brillantes, valles oscuros
          col *= luz * (0.55 + 0.9 * (fbm(s * 5.0 + 3.0, 6) * 0.5 + 0.5));
          col *= 0.4 + 0.75 * brazos;   // carriles oscuros entre las espirales
          // Fibras luminosas finas que siguen el giro (como en la imagen: hebras de gas encendido) y bocanadas con borde claro.
          float fib = pow(cresta(vec2(twF * 9.0, lr * 22.0) + s * 1.5, 5), 4.0);
          col += mix(col, vec3(1.0, 0.9, 0.75), 0.45) * fib * 0.9 * smoothstep(0.03, 0.15, x);
          col += vec3(1.0, 0.82, 0.45) * (0.5 + 1.2 * fib) * exp(-x * 9.0) * 0.7;   // hebras doradas y blancas que arden junto al agujero
          // Bocanadas esponjosas con el borde iluminado (coliflor): billow con relieve; la cara que mira al agujero, clara.
          vec2 sb = s * 4.5 + 21.0;
          float B0 = 0.0, B1 = 0.0, am = 0.5; vec2 pb = sb, pb1 = sb - normalize(s + 1e-4) * 0.06;
          for (int k = 0; k < 6; k++) { B0 += am * abs(gn(pb)); B1 += am * abs(gn(pb1)); pb = ROT * pb + vec2(5.1, 2.3); pb1 = ROT * pb1 + vec2(5.1, 2.3); am *= 0.5; }
          float relieve = clamp(0.5 + (B1 - B0) * 5.0, 0.0, 1.0);
          col *= 0.55 + 0.9 * smoothstep(0.05, 0.45, B0) * (0.5 + relieve);
          col = mix(col, vec3(1.0, 0.92, 0.95), pow(relieve, 4.0) * smoothstep(0.25, 0.5, x) * 0.55 * smoothstep(0.1, 0.4, B0));
          float coli = smoothstep(0.6, 0.85, fbm(s * 3.2 + 41.0, 6) * 0.5 + 0.5) * smoothstep(0.25, 0.55, x);
          col = mix(col, vec3(1.0, 0.88, 0.96), coli * 0.15);
          col = mix(col, vec3(1.0, 0.92, 0.96), smoothstep(0.85, 1.0, D) * 0.2 * smoothstep(0.3, 0.6, x));
          // Polvo: casi negro (pardo-granate), con su filo encendido del color de alrededor.
          vec3 negro = vec3(0.035, 0.012, 0.012);
          polvo = smoothstep(0.25, 0.65, polvo);   // polvo condensado: negro de verdad
          col *= 1.0 - franjas * 0.45 * smoothstep(0.1, 0.3, x);   // franjas de sombra (no manchas negras)
          col = mix(col, negro, polvo * 0.96);
          col += mix(col, vec3(1.0, 0.85, 0.7), 0.3) * filo * 0.15 * (1.0 - polvo) * smoothstep(0.08, 0.22, x);
          vec3 cHil = mix(vec3(1.0, 0.5, 0.18), vec3(0.95, 0.25, 0.3), gn(sh * 3.0) * 0.5 + 0.5) * (0.4 + 0.9 * pow(cresta(sh * 6.0 + 2.0, 5), 2.0));
          cHil = mix(cHil, vec3(0.5, 0.5, 1.0), smoothstep(0.3, 0.7, fbm(sh * 1.5 + 99.0, 4) * 0.5 + 0.5) * 0.6);   // naranjas y violetas
          float a = clamp(cuerpo * 1.3, 0.0, 1.0);
          float aH = clamp(hil * 1.4, 0.0, 1.0) * (1.0 - a);
          vec3 fin = col * a + cHil * aH;
          float alfa = clamp(a + aH * 0.85, 0.0, 1.0);
          // Láminas de arriba y abajo: más tenues (cuerpo); de canto, translúcidas.
          // Volumen: la capa central es densa; las de arriba y abajo son gas translúcido en jirones (solo donde el gas
          // se acumula), más finas cerca del agujero. Se ven unas a través de otras y se mueven con paralaje.
          float capa = uH == 0.0 ? 1.0 : 0.6 * smoothstep(0.5, 0.85, D) * smoothstep(0.08, 0.3, x) * (1.0 - abs(uH) * 0.35);
          if (uH != 0.0) { fin = mix(fin, fin * vec3(0.85, 0.9, 1.25), 0.4); alfa *= 0.75; }   // capas exteriores: algo más frías y translúcidas
          alfa *= capa * mix(0.55, 1.0, smoothstep(0.08, 0.35, vC));
          gl_FragColor = vec4(fin * capa, alfa); }`;
  const LADO_REM = esMovilCuasar ? 2048 : 4096;
  const rtRemolino = new THREE.WebGLRenderTarget(LADO_REM, LADO_REM, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const texRemolino = rtRemolino.texture; texRemolino.colorSpace = THREE.NoColorSpace; texRemolino.anisotropy = 8;
  function hornearRemolino(renderer) {
    const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uIn: { value: R_IN }, uOut: { value: R_OUT }, uH: { value: 0 } },
      vertexShader: 'varying vec2 vP; varying float vC; void main(){ vP = position.xy; vC = 1.0; gl_Position = vec4(position.xy / ' + R_OUT.toFixed(1) + ', 0.0, 1.0); }',
      fragmentShader: FRAG_REMOLINO, depthTest: false, depthWrite: false });
    const sc = new THREE.Scene(), malla = new THREE.Mesh(new THREE.PlaneGeometry(R_OUT * 2, R_OUT * 2), m); sc.add(malla);
    const previo = renderer.getRenderTarget(), ac = renderer.autoClear;
    renderer.setRenderTarget(rtRemolino); renderer.setClearColor(0x000000, 0); renderer.autoClear = true; renderer.render(sc, new THREE.Camera());
    renderer.setRenderTarget(previo); renderer.autoClear = ac;
    malla.geometry.dispose(); m.dispose();
  }
  for (let k = 0; k < 5; k++) {
    const h = (k - 2) / 2, lam = new THREE.Mesh(new THREE.RingGeometry(R_IN, R_OUT, 256, 48), new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uIn: { value: R_IN }, uOut: { value: R_OUT }, uH: { value: h }, uTex: { value: texRemolino } },
      vertexShader: 'varying vec2 vP; varying float vC; void main(){ vP = position.xy; vec4 mv = modelViewMatrix * vec4(position, 1.0); vC = abs(dot(normalize(mv.xyz), normalize(normalMatrix * vec3(0.0, 0.0, 1.0)))); gl_Position = projectionMatrix * mv; }',
      fragmentShader: /* glsl */`uniform sampler2D uTex; uniform float uT, uIn, uOut, uH; varying vec2 vP; varying float vC;
        void main(){
          // Gira entero (en el plano de la elipse) y cada capa exterior es la misma nube girada y algo mayor.
          float L = length(vP), k = mix(1.0, 1.55, smoothstep(uIn * 2.0, uIn * 6.0, L));
          vec2 e = vP * vec2(1.0, k); float a = uT * 0.03 + uH * 1.3, c = cos(a), s = sin(a);
          e = mat2(c, s, -s, c) * e * (1.0 + abs(uH) * 0.06);
          vec4 t = texture2D(uTex, (e / vec2(1.0, k)) / (2.0 * uOut) + 0.5);
          if (uH == 0.0) { gl_FragColor = vec4(t.rgb, t.a) * mix(0.55, 1.0, smoothstep(0.08, 0.35, vC)); return; }
          // Capas de arriba y abajo: solo jirones donde el gas es denso, más fríos y translúcidos.
          float al = smoothstep(0.7, 0.98, t.a) * 0.22 * (1.0 - abs(uH) * 0.35) * mix(0.55, 1.0, smoothstep(0.08, 0.35, vC));
          vec3 col = t.rgb / max(t.a, 1e-3); col = mix(col, col * vec3(0.85, 0.9, 1.25), 0.4);
          gl_FragColor = vec4(col * al, al); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, premultipliedAlpha: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
    lam.rotation.x = -Math.PI / 2; lam.scale.y = -1; lam.position.y = h * 320; lam.renderOrder = 10 + (k === 2 ? 3 : k < 2 ? k : 6 - k); remolino.push(lam);
  }
  grupo.add(...remolino); animados.push(...remolino);
  // Polvo estelar de colores en 3D dentro del remolino: miles de motas finas que siguen las espirales y giran con él
  // (dan volumen: al mover la cámara se ve que el gas tiene espesor).
  {
    const n = Math.round(60000 * K), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tam = new Float32Array(n);
    const rampaJS = u => { const P = [[0, [1, 0.95, 0.8]], [0.04, [1, 0.68, 0.22]], [0.2, [1, 0.42, 0.1]], [0.34, [0.88, 0.13, 0.17]], [0.48, [1, 0.45, 0.68]], [0.6, [1, 0.72, 0.9]], [0.78, [0.55, 0.5, 1]], [1, [0.3, 0.55, 1]]];
      for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const t = (u - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return P[i - 1][1].map((v, j) => v + (P[i][1][j] - v) * t); } return P[P.length - 1][1]; };
    for (let i = 0, j = 0; j < n && i < n * 20; i++) {
      const x = Math.pow(a(), 0.8), r = R_IN + (R_OUT * 0.9 - R_IN) * x, th = a() * Math.PI * 2, lr = Math.log(r / R_IN);
      const bandas = 0.5 + 0.5 * Math.cos(7 * (th - lr * 2.6));
      if (a() > 0.25 + 0.75 * bandas) continue;
      const k = 1 / (1 + (1.55 - 1) * Math.min(1, Math.max(0, (r - R_IN * 2) / (R_IN * 4))));   // misma elipse que el gas
      const c = rampaJS(Math.min(1, x + (a() - 0.5) * 0.15)), b = 0.5 + a() * 0.8;
      pos.set([Math.cos(th) * r, Math.sin(th) * r * k, gauss(a) * (60 + 260 * x)], j * 3);
      col.set([c[0] * b, c[1] * b, c[2] * b], j * 3); tam[j] = a() < 0.03 ? 2.6 : 1.0 + a() * 0.9; j++;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
    const polvoEst = new THREE.Points(g, aditivo({ uT: { value: 0 }, uPR, uExpo: EXPOSICION },
      /* glsl */`uniform float uT, uPR, uExpo; attribute vec3 aCol; attribute float aTam; varying vec3 vC; varying float vA;
        void main(){ float ga = uT * 0.03, c = cos(ga), s = sin(ga);
          float k = position.y / max(1.0, length(position.xy)); vec2 p = position.xy; p.y *= 1.55; p = mat2(c, s, -s, c) * p; p.y /= 1.55;   // gira con el remolino
          vec4 mv = modelViewMatrix * vec4(p, position.z, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = aTam * uPR; vA = 0.9 * uExpo * step(0.0, -mv.z); vC = aCol; }`,   // exposición automática: de lejos no se amontona en una mancha
      /* glsl */`varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = (1.0 - smoothstep(0.4, 1.0, d)) * vA; gl_FragColor = vec4(vC * a, a); }`));
    polvoEst.rotation.x = -Math.PI / 2; polvoEst.scale.y = -1; polvoEst.frustumCulled = false; polvoEst.renderOrder = 16;
    grupo.add(polvoEst); animados.push(polvoEst);
  }
  galaxia.renderOrder = 15;   // el polvo estelar brilla por encima del remolino
  // Polvo estelar: puntitos finos y brillantes (no una bruma rosa que tape el polvo negro).
  { const c = galaxia.geometry.attributes.aCol, t = galaxia.geometry.attributes.aTam;
    for (let i = 0; i < t.count; i++) { t.setX(i, t.getX(i) * 0.35); const k = 0.55; c.setXYZ(i, Math.min(1, c.getX(i) * k + 0.35), Math.min(1, c.getY(i) * k + 0.3), Math.min(1, c.getZ(i) * k + 0.3)); }
    t.needsUpdate = c.needsUpdate = true; galaxia.material.uniforms.uMax.value = 1.8; }
  const resplandor = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo, color: '#ffb7a6', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
  resplandor.scale.setScalar(3600);   // sin resplandor difuso (degradado): no se añade

  // ── Anillo de gas ardiente alrededor del disco: continuo (capas con ruido), sin puntos ──
  const capasFuego = [];
  for (let k = 0; k < 5; k++) {
    const h = (k - 2) / 2, capa = new THREE.Mesh(new THREE.RingGeometry(discoOut * 0.98, discoOut + 1100, 200, 8), aditivo({ uT: { value: 0 }, uIn: { value: discoOut }, uH: { value: h } },
      'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      /* glsl */`uniform float uT, uIn, uH; varying vec2 vP; ${RUIDO}
        void main(){ float r = length(vP), x = (r - uIn) / 1100.0, ang = atan(vP.y, vP.x) - 36000.0 / (r + 400.0) - uT * 0.2;   // remolino fijo y giro entero (sin enroscarse con el tiempo)
          vec3 q = vec3(cos(ang) * r * 0.003, sin(ang) * r * 0.003, uH * 0.7);
          float n = smoothstep(0.3, 0.85, fbm3(q) * 0.7 + fbm3(q * 2.6 + 3.0) * 0.4);
          float perfil = exp(-x * 3.2) * smoothstep(0.0, 0.03, x) * exp(-uH * uH * 2.0);
          vec3 c = mix(vec3(1.0, 0.75, 0.35), vec3(1.0, 0.35, 0.18), smoothstep(0.05, 0.35, x)); c = mix(c, vec3(0.75, 0.18, 0.4), smoothstep(0.35, 0.8, x));
          float b = perfil * n * 1.1; gl_FragColor = vec4(c * b, b); }`));
    capa.rotation.x = Math.PI / 2; capa.position.y = h * 90; capasFuego.push(capa);
  }
  grupo.add(...capasFuego); animados.push(...capasFuego);
  capasFuego.forEach(c => c.visible = false);   // el remolino ya pinta el anillo de fuego
  // Toro de polvo: casi invisible de frente; de canto tapa un poco el disco y su borde se templa.
  const toro = new THREE.Mesh(new THREE.TorusGeometry(toroR, toroTubo, 32, 128), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vN, vV, vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float uT; varying vec3 vN, vV, vP; ${RUIDO}
      void main(){ float cara = abs(dot(normalize(vN), vV)), g = fbm3(vP * 0.004 + uT * 0.01);
        vec3 c = vec3(0.05, 0.02, 0.03) + vec3(1.0, 0.4, 0.25) * pow(1.0 - cara, 4.0) * 0.25;
        gl_FragColor = vec4(c, (0.01 + 0.22 * pow(1.0 - cara, 3.0)) * (0.3 + 0.9 * g)); }`,
    transparent: true, depthWrite: false
  }));
  toro.rotation.x = Math.PI / 2; grupo.add(toro); animados.push(toro); toro.visible = false;

  // ── Disco de acreción ──
  const disco = new THREE.Mesh(new THREE.RingGeometry(discoIn, discoOut, 320, 12), aditivo(
    { uT: { value: 0 }, uIn: { value: discoIn }, uOut: { value: discoOut } },
    'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    /* glsl */`uniform float uT, uIn, uOut; varying vec2 vP; ${RUIDO}
      void main(){
        float r = length(vP), t = clamp((r - uIn) / (uOut - uIn), 0.0, 1.0), ang = atan(vP.y, vP.x);
        float giro = ang - 90.0 * pow(uIn / r, 1.5) - uT * 0.35 - log(r / uIn) * 2.6;   // espirales finas con su enroscado fijo (el de la primera imagen); gira entera sin enroscarse más   // Kepler: dentro gira más rápido
        vec3 q = vec3(cos(giro) * 3.0, sin(giro) * 3.0, log(r) * 6.0);
        // De lejos, el detalle más fino que un píxel parpadea (moiré): se apaga según el tamaño en pantalla.
        float px = fwidth(log(r) * 40.0), nitido = 1.0 - smoothstep(0.25, 1.0, px), medio = 1.0 - smoothstep(0.3, 1.2, fwidth(log(r) * 6.0));
        float fil = mix(0.55, fbm3(q + vec3(0.0, 0.0, uT * 0.05)), medio), fino = mix(0.5, rn3(vec3(cos(giro) * 9.0, sin(giro) * 9.0, log(r) * 40.0)), nitido);
        // Colores: blanco, anillo azul, oro, naranja de fuego, rojo y magenta.
        vec3 c = mix(vec3(1.0), vec3(0.3, 0.58, 1.0), smoothstep(0.0, 0.09, t));
        c = mix(c, vec3(1.0, 0.72, 0.3), smoothstep(0.2, 0.32, t));
        c = mix(c, vec3(1.0, 0.36, 0.06), smoothstep(0.32, 0.52, t));
        c = mix(c, vec3(0.92, 0.08, 0.26), smoothstep(0.55, 0.85, t));
        float dop = 0.5 + 0.5 * sin(ang + 0.6);   // el lado que se acerca brilla más y azulea
        c = mix(c, c * vec3(0.8, 0.95, 1.25), dop * 0.4);
        float perfil = smoothstep(0.0, 0.02, t) * pow(1.0 - t, 1.1) * mix(1.5, 0.85, smoothstep(0.0, 0.35, t));
        float isco = exp(-pow((t - 0.012) / 0.01, 2.0)) * 1.6;
        float b = (perfil * (0.25 + 1.2 * fil * fil + 0.3 * fino) + isco) * (0.5 + 0.6 * dop);
        gl_FragColor = vec4(c * b * 1.35, min(1.0, b)); }`));
  disco.rotation.x = Math.PI / 2; grupo.add(disco); animados.push(disco);

  // ── Horizonte: la sombra y su anillo de fotones (mira siempre a la cámara) ──
  const sombraMalla = new THREE.Mesh(new THREE.SphereGeometry(RS, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  grupo.add(sombraMalla);
  // La sombra se ve siempre limpia (como en las imágenes de agujeros negros: la luz se curva a su alrededor): un
  // disco negro que mira a la cámara, dibujado encima del gas; el anillo de fotones y el destello, encima de ella.
  const sombraDisco = new THREE.Mesh(new THREE.CircleGeometry(RS * 1.02, 96), new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uR; varying vec2 vP; void main(){ float r = length(vP) / uR; gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - smoothstep(0.92, 1.0, r)); }',
    uniforms: { uR: { value: RS * 1.02 } }, transparent: true, depthTest: false, depthWrite: false }));
  sombraDisco.renderOrder = 50; grupo.add(sombraDisco);
  const fotones = new THREE.Mesh(new THREE.RingGeometry(RS * 0.95, RS * 2.6, 160, 4), aditivo({ uT: { value: 0 }, uR: { value: RS } },
    'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    /* glsl */`uniform float uT, uR; varying vec2 vP;
      void main(){ float r = length(vP) / uR, ang = atan(vP.y, vP.x);
        float anillo = exp(-pow((r - 1.08) * 16.0, 2.0)) * (1.6 + 0.4 * sin(ang * 2.0 + uT));
        float halo = exp(-pow((r - 1.25) * 3.0, 2.0)) * 0.35;
        vec3 c = vec3(0.85, 0.93, 1.0) * anillo + vec3(1.0, 0.75, 0.6) * halo;
        gl_FragColor = vec4(c, min(1.0, anillo + halo)); }`));
  fotones.material.depthTest = false; fotones.renderOrder = 51;
  grupo.add(fotones); animados.push(fotones);

  // ── Chorros relativistas ──
  const chorros = new THREE.Group(); grupo.add(chorros);
  // Acento de luz (el faro): un brillo rosado y dorado que sube por cada chorro. uAc: su posición a lo largo
  // del chorro (0 base, 1 punta; negativo: apagado). Compartido por todas las capas.
  const uAc = { value: -1 };
  const capaChorro = ({ rBase, rPunta, colorA, colorB, intensidad, helice }) => {
    const geo = new THREE.CylinderGeometry(rPunta, rBase, LARGO, 48, 24, true); geo.translate(0, LARGO / 2, 0);
    return new THREE.Mesh(geo, aditivo({ uT: { value: 0 }, uA: { value: C(colorA) }, uB: { value: C(colorB) }, uI: { value: intensidad }, uH: { value: helice }, uAc },
      'varying vec2 vU; varying float vCara; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vCara = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
      /* glsl */`uniform float uT, uI, uH, uAc; uniform vec3 uA, uB; varying vec2 vU; varying float vCara;
        void main(){ float l = vU.y;
          float hel = mix(1.0, 0.55 + 0.45 * pow(0.5 + 0.5 * sin(vU.x * 6.2832 * 3.0 + l * 38.0 - uT * 5.0), 3.0), uH);
          float nudos = 1.0 + 1.4 * pow(0.5 + 0.5 * sin(l * 26.0 - uT * 3.2), 10.0) + 3.0 * exp(-pow((l - fract(uT * 0.12)) / 0.025, 2.0));   // el latido del faro: un pulso de luz sube cada ≈ 8 s
          float f = pow(vCara, 1.6) * pow(1.0 - l, 1.3) * smoothstep(0.0, 0.015, l) * hel * nudos;
          float ac = uAc < 0.0 ? 0.0 : exp(-pow((l - uAc) / 0.035, 2.0)) * pow(vCara, 1.2) * smoothstep(0.0, 0.03, l) * (1.0 - smoothstep(0.85, 1.0, uAc));
          gl_FragColor = vec4(mix(uA, uB, pow(l, 0.6)) * f * uI + vec3(1.0, 0.72, 0.82) * ac * uI * mix(0.12, 1.1, step(uH, 0.5)), min(1.0, f * uI + ac * uI * mix(0.12, 1.0, step(uH, 0.5)))); }`));   // sobre todo en la columna fina: un hilo de luz, no una mancha
  };
  chorros.renderOrder = 20;
  let hazMedida = null;
  for (const s of [1, -1]) {
    const lado = new THREE.Group(); if (s < 0) lado.rotation.x = Math.PI; chorros.add(lado);
    const vaina = capaChorro({ rBase: 40, rPunta: 620, colorA: '#bcd4ff', colorB: '#5f6dff', intensidad: 0.55, helice: 1 });
    // Nubes de plasma alrededor del chorro (como en la imagen: hebras azules y blancas retorcidas, con toques naranjas
    // donde el chorro atraviesa el gas): ruido con estructura (no un resplandor liso), más ancho hacia la punta.
    const geoN = new THREE.CylinderGeometry(1300, 140, LARGO * 0.95, 96, 48, true); geoN.translate(0, LARGO * 0.475, 0);
    const nubeChorro = new THREE.Mesh(geoN, aditivo({ uT: { value: 0 }, uS: { value: s > 0 ? 1.7 : 5.3 } },
      'varying vec2 vU; varying float vCara; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vCara = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
      /* glsl */`uniform float uT, uS; varying vec2 vU; varying float vCara; ${RUIDO}
        void main(){ float l = vU.y, a = vU.x * 6.2831853;
          vec3 q = vec3(cos(a) * 1.2, sin(a) * 1.2, l * 9.0 - uT * 0.08) + uS;
          vec3 w = q + (vec3(fbm3(q * 1.3), fbm3(q * 1.3 + 4.0), fbm3(q * 1.3 + 8.0)) - 0.5) * 1.6;
          float hebra = pow(1.0 - abs(fbm3(w * 2.2) * 2.0 - 1.0), 6.0) + pow(1.0 - abs(fbm3(w * 5.0 + 3.0) * 2.0 - 1.0), 9.0) * 0.6;
          float nube = smoothstep(0.45, 0.8, fbm3(w * 1.4 + 11.0));
          float f = (hebra * 0.9 + nube * 0.2) * smoothstep(0.35, 0.65, fbm3(w * 0.7 + 31.0)) * pow(vCara, 2.0) * smoothstep(0.02, 0.12, l) * (1.0 - smoothstep(0.6, 1.0, l));
          vec3 c = mix(vec3(0.25, 0.45, 1.0), vec3(0.8, 0.9, 1.0), hebra * 0.45);
          c = mix(c, vec3(1.0, 0.55, 0.25), smoothstep(0.55, 0.8, fbm3(w * 0.9 + 21.0)) * (1.0 - smoothstep(0.1, 0.35, l)) * 0.7);
          gl_FragColor = vec4(c * f * 1.1, f * 1.1); }`));
    nubeChorro.renderOrder = 20; lado.add(nubeChorro); animados.push(nubeChorro);
    const columna = capaChorro({ rBase: 14, rPunta: 120, colorA: '#ffffff', colorB: '#a9c6ff', intensidad: 1.5, helice: 0.35 });
    vaina.renderOrder = columna.renderOrder = 20; lado.add(vaina, columna); animados.push(vaina, columna); hazMedida = vaina;   // por encima del remolino
    // Lóbulo: donde el chorro se frena y se abre en una nube azul violeta.
    const lobulo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo, color: '#8d8cff', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
    lobulo.position.y = LARGO * 0.97; lobulo.scale.setScalar(2200); lobulo.visible = false;   // sin resplandor difuso: se sustituye por la nube de abajo
    // Nube de plasma al final del chorro (donde se frena y se abre): hebras azules y violetas con estructura.
    const nubeFin = new THREE.Mesh(new THREE.SphereGeometry(1700, 48, 32), aditivo({ uT: { value: 0 }, uS: { value: s > 0 ? 2.3 : 7.1 } },
      'varying vec3 vP; varying float vCara; void main(){ vP = position / 1700.0; vec4 mv = modelViewMatrix * vec4(position, 1.0); vCara = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
      /* glsl */`uniform float uT, uS; varying vec3 vP; varying float vCara; ${RUIDO}
        void main(){ vec3 q = vP * 1.6 + uS + vec3(0.0, uT * 0.02, 0.0);
          vec3 w = q + (vec3(fbm3(q * 1.2), fbm3(q * 1.2 + 4.0), fbm3(q * 1.2 + 8.0)) - 0.5) * 1.4;
          float hebra = pow(1.0 - abs(fbm3(w * 2.4) * 2.0 - 1.0), 7.0), nube = smoothstep(0.5, 0.8, fbm3(w * 1.5 + 9.0));
          float f = (hebra + nube * 0.35) * pow(vCara, 1.5) * 0.45;
          vec3 c = mix(vec3(0.45, 0.5, 1.0), vec3(0.85, 0.9, 1.0), hebra); c = mix(c, vec3(0.75, 0.45, 1.0), smoothstep(0.5, 0.8, fbm3(w + 3.0)) * 0.5);
          gl_FragColor = vec4(c * f, f); }`));
    nubeFin.position.y = LARGO * 0.97; nubeFin.scale.set(1.0, 1.3, 1.0); nubeFin.renderOrder = 20; lado.add(nubeFin); animados.push(nubeFin);
    // Hebras de plasma en espiral alrededor del haz (tres, enroscadas), con pulsos que suben.
    const geoH = new THREE.CylinderGeometry(420, 70, LARGO * 0.9, 64, 64, true); geoH.translate(0, LARGO * 0.45, 0);
    const helices = new THREE.Mesh(geoH, aditivo({ uT: { value: 0 } },
      'varying vec2 vU; varying float vCara; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vCara = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
      /* glsl */`uniform float uT; varying vec2 vU; varying float vCara; ${RUIDO}
        void main(){ float l = vU.y, a = vU.x;
          float h = fract(a * 3.0 + l * 7.0 - uT * 0.25), linea = exp(-pow((h - 0.5) / 0.035, 2.0));
          float rota = smoothstep(0.3, 0.6, fbm3(vec3(a * 6.0, l * 30.0 - uT * 0.5, 1.0)));   // la hebra se rompe a trozos
          float pulso = 0.6 + 1.6 * exp(-pow((l - fract(uT * 0.12)) / 0.03, 2.0));
          float f = linea * rota * pulso * smoothstep(0.02, 0.1, l) * (1.0 - smoothstep(0.75, 1.0, l)) * (0.4 + 0.6 * vCara) * 0.7;
          gl_FragColor = vec4(mix(vec3(0.55, 0.7, 1.0), vec3(1.0), 0.4) * f, f); }`));
    helices.renderOrder = 21; lado.add(helices); animados.push(helices);
  }
  // Partículas que suben en hélice por los chorros.
  const nCh = Math.round(1600 * K), pCh = new Float32Array(nCh * 3);
  for (let i = 0; i < nCh; i++) pCh.set([a() * Math.PI * 2, a(), a()], i * 3);
  const gCh = new THREE.BufferGeometry(); gCh.setAttribute('position', new THREE.BufferAttribute(pCh, 3));
  const particulasChorro = new THREE.Points(gCh, aditivo({ uT: { value: 0 }, uScale, uPR, uL: { value: LARGO } },
    /* glsl */`uniform float uT, uScale, uPR, uL; varying vec3 vC; varying float vA;
      void main(){ float f = fract(position.y + uT * 0.09), lado = position.z < 0.5 ? 1.0 : -1.0;
        float r = 18.0 + f * 520.0 * pow(fract(position.x * 7.3), 2.0), giro = position.x + f * 22.0 + uT * 1.4;
        vec4 mv = modelViewMatrix * vec4(cos(giro) * r, lado * f * uL, sin(giro) * r, 1.0); gl_Position = projectionMatrix * mv;
        vC = mix(vec3(1.0), vec3(0.45, 0.55, 1.0), f);
        float s = (34.0 - f * 18.0) * length(modelViewMatrix[0].xyz) * uScale / max(1e-3, -mv.z);
        gl_PointSize = clamp(s, 1.0, 10.0 * uPR);
        vA = min(1.0, s) * (1.0 - f) * smoothstep(0.0, 0.03, f) * (0.6 + 0.4 * sin(f * 70.0 - uT * 6.0)); }`,
    'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float k = exp(-d * d * 4.0) * vA; gl_FragColor = vec4(vC * k, k); }'));
  particulasChorro.frustumCulled = false; chorros.add(particulasChorro); animados.push(particulasChorro);

  // ── Materia que cae en espiral al disco: se calienta de rojo a blanco azulado ──
  const nCa = Math.round(2200 * K), pCa = new Float32Array(nCa * 3);
  for (let i = 0; i < nCa; i++) pCa.set([a() * Math.PI * 2, a(), a()], i * 3);
  const gCa = new THREE.BufferGeometry(); gCa.setAttribute('position', new THREE.BufferAttribute(pCa, 3));
  const caida = new THREE.Points(gCa, aditivo({ uT: { value: 0 }, uScale, uPR, uIn: { value: discoIn }, uOut: { value: discoOut * 1.5 } },
    /* glsl */`uniform float uT, uScale, uPR, uIn, uOut; varying vec3 vC; varying float vA;
      void main(){ float f = fract(position.y + uT * (0.04 + position.z * 0.035));
        float r = mix(uOut, uIn * 1.2, pow(f, 0.75)), ang = position.x + f * f * 12.0 + uT * 0.3;
        vec4 mv = modelViewMatrix * vec4(cos(ang) * r, (position.z - 0.5) * 50.0 * (1.0 - f), sin(ang) * r, 1.0); gl_Position = projectionMatrix * mv;
        vC = f < 0.6 ? mix(vec3(1.0, 0.3, 0.2), vec3(1.0, 0.75, 0.35), f / 0.6) : mix(vec3(1.0, 0.75, 0.35), vec3(0.75, 0.9, 1.0), (f - 0.6) / 0.4);
        float s = (14.0 + f * 10.0) * length(modelViewMatrix[0].xyz) * uScale / max(1e-3, -mv.z);
        gl_PointSize = clamp(s, 1.0, 6.0 * uPR);
        vA = min(1.0, s) * smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.9, 1.0, f)); }`,
    'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float k = exp(-d * d * 4.0) * vA; gl_FragColor = vec4(vC * k, k); }'));
  caida.frustumCulled = false; grupo.add(caida); animados.push(caida);

  // ── Rayos rojizos que brotan del núcleo, por encima y por debajo del disco ──
  const nR = Math.round(420 * K), pR = new Float32Array(nR * 6), fR = new Float32Array(nR * 2), faseR = new Float32Array(nR * 2);
  for (let i = 0; i < nR; i++) {
    const lado = a() < 0.5 ? 1 : -1, th = a() * Math.PI * 2, inc = (0.25 + a() * 0.5) * Math.PI / 2;   // entre el chorro y el disco
    const d = new THREE.Vector3(Math.cos(th) * Math.sin(inc), lado * Math.cos(inc), Math.sin(th) * Math.sin(inc));
    const r0 = RS * (1.2 + a() * 0.8), r1 = r0 + 250 + Math.pow(a(), 1.5) * 900, ph = a();
    pR.set([d.x * r0, d.y * r0, d.z * r0, d.x * r1, d.y * r1, d.z * r1], i * 6); fR.set([0, 1], i * 2); faseR.set([ph, ph], i * 2);
  }
  const gR = new THREE.BufferGeometry(); gR.setAttribute('position', new THREE.BufferAttribute(pR, 3)); gR.setAttribute('aF', new THREE.BufferAttribute(fR, 1)); gR.setAttribute('aFase', new THREE.BufferAttribute(faseR, 1));
  const rayos = new THREE.LineSegments(gR, aditivo({ uT: { value: 0 } },
    'uniform float uT; attribute float aF, aFase; varying float vA; varying float vF; void main(){ vF = aF; vA = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uT * 1.8 + aFase * 6.2832), 2.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    'varying float vA; varying float vF; void main(){ float k = pow(1.0 - vF, 1.6) * vA * 0.9; gl_FragColor = vec4(mix(vec3(1.0, 0.85, 0.8), vec3(1.0, 0.22, 0.35), smoothstep(0.0, 0.5, vF)) * k, k); }'));
  rayos.frustumCulled = false; grupo.add(rayos); animados.push(rayos);

  // ── Núcleo: deslumbrante de lejos; de cerca se aparta y deja ver la sombra ──
  const destello = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGigante, color: '#ffffff', transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo, color: '#dbe8ff', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  destello.scale.setScalar(1050); aura.scale.setScalar(700); destello.renderOrder = 52; grupo.add(destello);   // sin aura difusa: se ve la sombra negra

  const centro = new THREE.Vector3(), escala = new THREE.Vector3();
  return {
    grupo, disco, toro, haz: hazMedida, hornearRemolino,
    // El faro: posición del acento de luz en los chorros (0–1) o apagado (negativo).
    acento(v) { uAc.value = v; },
    medidas: { disco: discoOut, toro: toroR + toroTubo, chorro: LARGO, anfitriona: RG },
    actualizar(t, camera) {
      for (const m of animados) m.material.uniforms.uT.value = t;
      fotones.lookAt(camera.position); sombraDisco.lookAt(camera.position);
      grupo.getWorldPosition(centro); grupo.getWorldScale(escala);
      // A qué distancia está la cámara, en radios del disco: el destello cede al acercarse.
      const d = camera.position.distanceTo(centro) / (discoOut * escala.x), lejos = THREE.MathUtils.smoothstep(d, 1.2, 6);
      destello.material.opacity = 0.35 + 0.45 * lejos;
      destello.scale.setScalar(620 * (0.45 + 0.55 * lejos) * (1 + Math.sin(t * 0.7) * 0.06 + Math.sin(t * 3.1) * 0.03));
    }
  };
}
