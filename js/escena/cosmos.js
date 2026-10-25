// El universo profundo, lejos de los lugares: nebulosas de emisión (en nuestra zona del cielo),
// estrellas supergigantes azules y rojas y enanas rojas, cometas, un púlsar, un cuásar y un
// agujero negro ultramasivo (como TON 618), cada uno con posición y tamaño fijos. Se atenúa bajo
// el velo al visitar un lugar (index.js). Las galaxias lejanas evitan estas zonas (ZONAS_OCUPADAS).
import * as THREE from 'three';
import { deUnTiron } from '../util/azarSemilla.js';
const ejeCometa = new THREE.Vector3(), frenteCometa = new THREE.Vector3(), auxCometa = new THREE.Vector3();   // reutilizados por los cometas en cada cuadro
import { texturasLigeras } from '../util/dispositivo.js';
import { texBrillo, texDestello, texEstrellaGigante, prepararTexNebulosa } from './texturas.js';
import { texturaPlaneta } from './fabricaTexturas.js';
import { crearVelo } from './cometa.js';
import { construirSupernova } from './supernova.js';
import { crearNube } from './nube.js';
import { construirTon618 } from './ton618.js';
import { construirSagitario } from './sagitario.js';
import { guionTon618, guionSagitario, guionReposo, marcasDe, finEscena } from '../util/guionAgujeros.js';
import { construirCuasar, CUASAR } from './cuasar.js';
import { ESCALA_SUPERNOVA, PROGENITORA_RELATIVA, ESCALA_CUASAR, ESCALA_TON, ESCALA_PULSAR, ESCALA_DENEB, ESCALA_SGR } from '../data/escalaCosmica.js';
import { SITIOS_DESTINO } from '../data/sitios.js';
import { materialSombra } from './materiales.js';
import { crearEscenaPulsar, crearEscenaDeneb, crearEscenaCuasar, RADIO_DENEB } from './escenasGigantes.js';
import { ESCENA_PULSAR, ESCENA_CUASAR, ESCENA_DENEB, estadoPulsar, estadoCuasar, estadoDeneb, crearDirector } from '../util/escenasGigantes.js';
const reducido = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Dirección en el cielo respecto a la vista inicial: acimut (grados, + a la derecha) y
// elevación (grados, + hacia arriba). En vertical se ve |acimut| < 15° y elevación −15…−7°;
// en horizontal, |acimut| < 45° y elevación −20…+5°.
const GIRO_INICIO = Math.atan2(0.2, 0.88);
// Escala común (js/data/escalaCosmica.js, docs/ESCALA-Y-ESPACIO.md): la unidad es la galaxia de
// Xiomara (radio 980). ESCALA_CIELO = 1 se conserva por compatibilidad: el cielo ya no se escala.
export const ESCALA_CIELO = 1;
// Fondo óptico remoto (cubemap, estrellas y soles de fondo): acompaña a la cámara a ×640 su
// tamaño de diseño, muy por fuera de cualquier viaje; no es un lugar al que se llegue.
export const ESCALA_FONDO = 640;
// Tamaño físico de cada cuerpo (escala de su grupo), separado de su distancia: estrellas y
// agujeros negros mucho menores que una galaxia; la anfitriona del cuásar, del orden de una
// galaxia. Las medidas resultantes se comprueban con medidas() y en las pruebas.
export function direccionCielo(acimut, elevacion, distancia) {
  const a = acimut * Math.PI / 180, e = elevacion * Math.PI / 180;
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)).applyAxisAngle(new THREE.Vector3(0, 1, 0), GIRO_INICIO).multiplyScalar(distancia);
}
// Objetos y su posición [acimut, elevación, distancia]. La vista inicial muestra una nebulosa y
// galaxias variadas; el cuásar, el púlsar y el agujero ultramasivo están en otras partes del
// cielo, para descubrirlos al girar. Las galaxias no se colocan encima de ninguno.
// Los destinos se ven sobre la galaxia al girar la cámara desde casa. La supernova está por
// debajo del plano del disco (−24°): desde casa se ve tras el disco translúcido de Xiomara y,
// desde ella, Xiomara se ve con 24° de apertura (su espiral se reconoce; de canto sería una
// línea). Ver docs/ESCALA-Y-ESPACIO.md. Las nebulosas se reparten por todo el cielo, de tamaños variados
// y sin amontonarse (distribución comprobada: nada se solapa con los destinos ni con los soles).
const SITIO = {
  // Las posiciones de los destinos tienen una sola fuente: js/data/sitios.js.
  agujero: SITIOS_DESTINO.ton618, sagitario: SITIOS_DESTINO.sagitario, supernova: SITIOS_DESTINO.supernova, cuasar: SITIOS_DESTINO.cuasar, pulsar: SITIOS_DESTINO.pulsar,
  // [acimut, elevación, distancia, tono, semilla, tamaño]
  nebulosas: [[-114, 10, 12000, 0, 2, 4300], [47, 32, 12000, 1, 7, 3350], [70, -26, 12000, 2, 12, 4900], [174, 49, 12000, 4, 17, 2450],
    [55, 17, 12000, 0, 22, 2450], [-123, -29, 12000, 1, 27, 2450], [-45, -35, 12000, 2, 32, 2750], [-169, 6, 12000, 4, 37, 2450],
    [-21, 37, 12000, 0, 42, 2750], [7, 19, 12000, 1, 47, 2450], [122, 25, 12000, 2, 52, 3650], [125, 0, 12000, 4, 57, 2450],
    [173, 1, 12000, 0, 62, 2450], [-154, 19, 12000, 1, 67, 2450]]
};
// Dónde está la supernova (coordenadas de la escena): alrededor se reparte su vecindario.
export const sitioSupernova = () => direccionCielo(...SITIO.supernova).multiplyScalar(ESCALA_CIELO);
// Posición en el mundo de cada destino del cosmos (para el catálogo y la Vía Láctea).
export const sitioDestino = id => direccionCielo(...SITIO[{ ton618: "agujero" }[id] ?? id]).multiplyScalar(ESCALA_CIELO);
export const NEBULOSAS = SITIO.nebulosas, LEJOS_NEB = 1.7, TAM_NEB = 1.3;
// Estrellas reales: color por temperatura y tamaño aparente según su radio (escala suave).
const ESTRELLAS_REALES = [
  ['Sirio A', '#d6e4ff', 700, -42, -3, 17000], ['Antares', '#ff6a40', 1500, 42, -3, 20000],
  ['Arturo', '#ffb070', 950, 76, 9, 18000], ['Pólux', '#ffc58a', 850, -76, 19, 17000],
  ['Aldebarán', '#ff9a5c', 1050, 106, -7, 20000], ['Elnath', '#bcd2ff', 800, -106, -5, 19000],
  ['Aludra', '#a3c2ff', 1100, 137, 4, 21000], ['Estrella Pistola', '#8fb4ff', 1300, -138, 23, 23000],
  ['Betelgeuse', '#ff7448', 1500, 160, -21, 21000], ['VY Canis Majoris', '#ff5a3a', 1800, -160, -20, 24000],
  ['UY Scuti', '#ff6242', 1800, 182, 19, 24000], ['Stephenson 2-18', '#ff4f32', 2000, 180, -24, 26000],
  ['Deneb', '#f2f5ff', 1400, -25, -22, 22000],
  // Supergigantes azules: las estrellas más luminosas del cielo son grandes y azules (como Rigel).
  ['Rigel', '#b4c8ff', 1500, -165, 32, 21000], ['Alnilam', '#a6bdff', 1350, 140, -30, 22000], ['Naos', '#9ab4ff', 1250, -95, -30, 22000]
];
// Todos los soles a la misma distancia (el cielo acompaña a la cámara): su tamaño en el cielo
// depende solo de su radio real.
const DIST_ESTRELLAS = 8400, ESCALA_NEBULOSAS = 1.3, LEJOS_NEBULOSAS = 1.7;
// Zonas ocupadas: [x, y, z, radio angular]. El radio es lo que ocupa de verdad cada objeto en el
// cielo (con su nebulosa o sus anillos), para que nada se solape.
const grados = (tam, d) => Math.atan(tam / d) * 180 / Math.PI;
const zona = ([acimut, elevacion], ang) => { const v = direccionCielo(acimut, elevacion, 1); return [v.x, v.y, v.z, ang * Math.PI / 180]; };
export const ZONAS_OCUPADAS = [zona(SITIO.supernova, 13), zona(SITIO.sagitario, 7.3), zona(SITIO.agujero, 8.8), zona(SITIO.cuasar, 13), zona(SITIO.pulsar, 14),
  ...SITIO.nebulosas.map(n => zona(n, grados(n[5] * ESCALA_NEBULOSAS * 0.45, n[2] * LEJOS_NEBULOSAS))),
  ...ESTRELLAS_REALES.map(e => zona([e[3], e[4]], grados(e[2] * 0.3, DIST_ESTRELLAS)))];

function sprite(mapa, color, tam, opacidad = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mapa, color, transparent: true, opacity: opacidad, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(tam); return s;
}
const aditivo = (uniforms, vertexShader, fragmentShader, extra = {}) => new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, ...extra });

// Haz o chorro: cono abierto que brilla en su eje y se desvanece hacia la punta y los bordes.
function crearHaz({ radio, largo, colorA, colorB, intensidad = 1, nudos = 0 }) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(radio, largo, 32, 1, true), aditivo(
    { uT: { value: 0 }, uA: { value: new THREE.Color(colorA) }, uB: { value: new THREE.Color(colorB) }, uI: { value: intensidad }, uN: { value: nudos } },
    'varying vec2 vU; varying float vCara; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vCara = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
    /* glsl */`uniform float uT, uI, uN; uniform vec3 uA, uB; varying vec2 vU; varying float vCara;
      void main(){ float l = vU.y; float f = pow(l, 1.4) * vCara * vCara * smoothstep(0.0, 0.08, 1.0 - l);
        float k = 1.0 + uN * pow(0.5 + 0.5 * sin(l * 40.0 + uT * 4.0), 6.0);
        gl_FragColor = vec4(mix(uB, uA, l) * f * uI * k, f * uI); }`));
  m.geometry.translate(0, -largo / 2, 0); m.geometry.rotateX(Math.PI);   // base en el origen, punta hacia +Y
  return m;
}

// De un tirón; la carga usa construirCosmos, el mismo código como generador (yield entre pasos: ver porTramos).
export const crearCosmos = (...a) => deUnTiron(construirCosmos(...a));
export function* construirCosmos({ uScale, uPR }) {
  // decor: soles, enanas rojas y cometas de decoración. Van con el fondo (acompañan a la
  // cámara, infinitamente lejos): desde el cuásar o el púlsar no aparecen «al lado».
  const raiz = new THREE.Group(), decor = new THREE.Group(), animar = [];
  const brillo = texBrillo(), destello = texDestello(), gigante = texEstrellaGigante();

  yield;
  // Las nebulosas viven en la capa más lejana, en 3D (galaxiasLejanas.js).
  const L = texturasLigeras ? 320 : 400;

  yield;
  // ── Estrellas reales: soles colosales muy lejos. Pequeños en el cielo, pero se nota que son
  // enormes: disco resuelto (no un punto) con pocas células de convección gigantes, centro
  // deslumbrante, brillo ceñido, destellos de difracción como en un telescopio, estrellas más
  // cercanas que pasan por delante y, las hipergigantes, la nebulosa que expulsan ──
  const estrellas = [], superficies = [], envolturas = [], cercanas = [], gruposEstrella = {};
  let escenaDeneb = null, superficieDeneb = null, suavesDeneb = null;
  const ESCALA_DISCO_DENEB = RADIO_DENEB / (1400 * 0.006);   // su disco, de 8,4 a 30 unidades (los halos de lejos, como antes)
  for (const [nombre, color, tam, acimut, elevacion] of ESTRELLAS_REALES) {
    yield;
    const g = new THREE.Group(); g.position.copy(direccionCielo(acimut, elevacion, DIST_ESTRELLAS)); g.lookAt(0, 0, 0); (nombre === 'Deneb' ? raiz : decor).add(g); gruposEstrella[nombre] = g;
    // Deneb se ve como lo que es desde aquí: un punto deslumbrante (su disco no se resuelve);
    // con un disco grande parecía una luna desde los otros lugares.
    const c = new THREE.Color(color), roja = c.r > c.b, r = tam * (nombre === 'Deneb' ? 0.006 : 0.07);
    const superficie = new THREE.Mesh(new THREE.SphereGeometry(r, 96, 64), new THREE.ShaderMaterial({
      // Las supergigantes rojas tienen unas pocas células enormes (como Betelgeuse); las azules, más finas.
      // uOpacidad: los soles del cielo de casa son estrellas locales y se apagan lejos de Xiomara.
      uniforms: { uT: { value: 0 }, uC: { value: c }, uCel: { value: roja ? 2.4 : 4.6 }, uOpacidad: { value: 1 }, uLuz: { value: 1 } }, transparent: true,
      vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`uniform float uT, uCel, uOpacidad, uLuz; uniform vec3 uC; varying vec3 vN; varying vec3 vP;
        float h(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
        float rn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
        void main(){
          vec3 q = normalize(vP) * uCel;
          float gran = rn(q + uT * 0.03) * 0.65 + rn(q * 2.7 - uT * 0.05) * 0.35;
          float celdas = smoothstep(0.2, 0.85, gran);
          float mu = max(dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0);
          vec3 col = uC * (0.55 + 0.75 * celdas) * (0.3 + 0.85 * pow(mu, 0.55));      // oscurecimiento al borde
          col = mix(col, vec3(1.0, 0.97, 0.92), pow(mu, 2.5) * 0.55);                    // centro deslumbrante
          gl_FragColor = vec4(col * 2.0 * uLuz, uOpacidad); }`   // uLuz: la luz que crece en la escena de Deneb
    }));
    // Brillo ceñido al disco y un halo amplio apenas perceptible (poco degradado).
    // El borde del disco se funde en su propia luz (no es una bola sólida como un planeta).
    const corona = c.clone().lerp(new THREE.Color('#ffffff'), 0.45);
    const halos = [sprite(brillo, color, r * 4, 0.22), sprite(brillo, color, tam * 0.5, 0.025)];
    g.add(...halos, superficie, sprite(brillo, corona, r * 2.3, 0.75));
    // Sin destellos de seis rayos: a esta distancia un sol es un punto de luz con su brillo, no una imagen enorme.
    const rayos = sprite(brillo, corona, r * 3.2, roja ? 0.25 : 0.35); g.add(rayos);
    if (nombre !== 'Deneb') g.userData.base = 0.4;   // mucho más pequeños: lejanos, fuera de nuestra galaxia
    // Hipergigantes rojas: capas de polvo expulsadas en arcos (como VY Canis Majoris);
    // azules muy luminosas: burbuja de gas ionizado (como la nebulosa de la Pistola).
    if ((roja && tam >= 1500) || nombre === 'Estrella Pistola') {
      const S = tam * 0.6, env = new THREE.Mesh(new THREE.PlaneGeometry(S, S), aditivo(
        { uT: { value: 0 }, uC: { value: new THREE.Color(roja ? '#ff7448' : '#8fa6ff') }, uC2: { value: new THREE.Color(roja ? '#ffb27a' : '#d68cff') }, uTipo: { value: roja ? 0 : 1 }, uSemilla: { value: acimut * 0.13 } },
        'varying vec2 vP; void main(){ vP = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        /* glsl */`uniform float uT, uTipo, uSemilla; uniform vec3 uC, uC2; varying vec2 vP;
          float h(vec2 p){ vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
          float rn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
          float fbm(vec2 p){ return rn(p) * 0.5 + rn(p * 2.1 + 3.1) * 0.3 + rn(p * 4.3 + 7.7) * 0.2; }
          void main(){
            float r = length(vP), a = atan(vP.y, vP.x);
            float n = fbm(vP * 3.2 + uSemilla + uT * 0.004);
            float l; vec3 col;
            if (uTipo < 0.5) {
              float arcos = 0.0;
              for (int k = 0; k < 5; k++) { float fk = float(k);
                float rk = 0.24 + fk * 0.13 + 0.035 * sin(a * 3.0 + fk + uSemilla);
                arcos += exp(-pow((r - rk) / 0.05, 2.0)) * pow(fbm(vec2(a * 2.2 + fk * 1.7 + uSemilla, r * 6.0 + fk)), 2.5);
              }
              // Polvo en grumos y arcos rotos, más denso hacia un lado (como VY Canis Majoris).
              float grumos = pow(fbm(vP * 7.0 - uSemilla), 2.0);
              l = (arcos * 0.9 + n * n * exp(-r * 2.6) * 1.2) * (0.35 + 0.65 * grumos) * (0.45 + 0.55 * sin(a + uSemilla));
              col = mix(uC, uC2, n);
            } else {
              // Burbuja de gas irregular con filamentos (como la nebulosa de la Pistola).
              float capa = exp(-pow((r - 0.58 - (n - 0.5) * 0.32) / 0.08, 2.0));
              float fil = pow(fbm(vec2(a * 5.0, r * 9.0) + uSemilla), 3.0);
              l = capa * (0.25 + 1.1 * fil) + exp(-r * 4.0) * 0.25 * n;
              col = mix(uC, uC2, smoothstep(0.4, 0.8, n));
            }
            l *= (1.0 - smoothstep(0.75, 1.0, r)) * smoothstep(0.1, 0.2, r) * 0.55;
            gl_FragColor = vec4(col * l, l); }`));
      env.renderOrder = -1; g.add(env); envolturas.push(env);
    }
    // Estrellas de nuestra zona que pasan por delante del disco: se nota que el sol está detrás, lejísimos.
    for (let k = 0, n = 2 + (tam % 4); k < n; k++) {
      const ang = k * 2.399 + acimut, dist = r * (0.3 + ((k * 0.618 + tam * 0.001) % 1) * 2.2);
      cercanas.push(new THREE.Vector3(Math.cos(ang) * dist, Math.sin(ang) * dist, 0).applyQuaternion(g.quaternion).add(g.position).multiplyScalar(0.92));
    }
    // Deneb, una de las estrellas más luminosas que se conocen: blanca, deslumbrante, con
    // un gran halo y destellos largos, como en las fotografías de larga exposición.
    if (nombre === 'Deneb') {
      const extra = [sprite(brillo, '#e6eeff', tam * 0.9, 0.012), sprite(destello, '#ffffff', tam * 0.35, 0.1), sprite(brillo, '#ffffff', r * 4, 0.3)];
      // Mucho más lejos (y más grande en proporción): se ve igual de luminosa, pero lejana.
      g.position.copy(direccionCielo(...SITIOS_DESTINO.deneb)); g.lookAt(0, 0, 0); g.userData.base = ESCALA_DENEB;   // tan lejos como la supernova: una estrella colosal
      g.add(...extra); halos.push(...extra);
      rayos.material.opacity = 0.12; rayos.scale.setScalar(tam * 0.5);
      // Su escena (escenasGigantes.js): la corona de motas y el mundo nuevo, alrededor de la estrella.
      yield; escenaDeneb = crearEscenaDeneb({ uScale, uPR }); g.add(escenaDeneb.nebulosa, escenaDeneb.corona, escenaDeneb.mundo); superficieDeneb = superficie; superficie.material.uniforms.uC.value = new THREE.Color('#cddcff'); superficie.material.uniforms.uCel.value = 8; yield;   // blanco azulada, con sus células visibles
      // De cerca, una supergigante enorme (radio RADIO_DENEB) con su viento y su nebulosa de motas: su brillo difuso de lejos
      // (los destellos y halos) se apaga al acercarse (actualizar), y lo que se ve es la estrella.
    }
    // El brillo y los destellos son un efecto óptico: al acercarse conservan su tamaño en el
    // cielo (encogen en el espacio) mientras el disco de la estrella sí se ve más grande.
    g.userData.halos = halos.map(h => [h, h.scale.x]); g.userData.k = 1;
    estrellas.push({ nucleo: rayos, base: rayos.scale.x, fase: acimut * 0.3, grupo: g }); superficies.push({ superficie, late: roja && tam >= 1500, fase: acimut });
  }
  const delante = new THREE.Points(new THREE.BufferGeometry().setFromPoints(cercanas), aditivo({ uT: { value: 0 }, uPR },
    'uniform float uT, uPR; varying float vA; void main(){ float f = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5); vA = 0.7 + 0.3 * sin(uT * (1.0 + f * 2.0) + f * 6.28); gl_PointSize = (1.6 + f * 1.8) * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(max(0.0, 1.0 - d * 2.0), 2.0) * vA; gl_FragColor = vec4(vec3(1.0, 0.97, 0.95) * a, a); }'));
  delante.renderOrder = 5; decor.add(delante);
  yield;
  // Enanas rojas: diminutas pero intensas, repartidas por todo el cielo.
  for (let i = 0; i < 34; i++) {
    const s = sprite(brillo, '#ff7a60', 45 + (i % 4) * 9, 0.7); s.position.copy(direccionCielo((i * 137.5) % 360 - 180, -18 + (i * 23) % 36, 6500 + (i * 613) % 1500));
    decor.add(s); estrellas.push({ nucleo: s, base: s.scale.x, fase: i * 1.7 });
  }

  yield;
  // ── Cometas lejanos de otros colores ──
  const cometas = [
    { coma: '#8ff2d4', cola: '#c9fff0', fin: '#6fd8ff', recorrido: [direccionCielo(-70, 20, 9000), direccionCielo(-5, 28, 9500), direccionCielo(60, 18, 9000)], periodo: 120, fase: 0.2 },
    { coma: '#c8d8ff', cola: '#ffffff', fin: '#ffc6e4', recorrido: [direccionCielo(120, 5, 8500), direccionCielo(180, 12, 9000), direccionCielo(240, 4, 8500)], periodo: 150, fase: 0.6 }
  ].map(c => {
    // Cometas de nuestro entorno: posición real (a ~9000 de Xiomara), con paralaje; no acompañan a la cámara.
    const g = new THREE.Group(); raiz.add(g);
    const curva = new THREE.QuadraticBezierCurve3(...c.recorrido);
    g.add(sprite(brillo, c.coma, 420, 0.35), sprite(brillo, '#ffffff', 90, 0.9), sprite(destello, '#ffffff', 140, 0.8));
    const velo = crearVelo({ largo: 1800, ancho: 420, colorA: c.cola, colorB: c.fin, curva: 0.3, intensidad: 0.75 }); g.add(velo);
    return { g, curva, velo, ...c };
  });

  yield;
  // ── Púlsar: estrella de neutrones con dos haces enormes que barren el cielo como un faro ──
  const pulsar = new THREE.Group(); pulsar.position.copy(direccionCielo(SITIO.pulsar[0], SITIO.pulsar[1], SITIO.pulsar[2])); pulsar.scale.setScalar(ESCALA_PULSAR); raiz.add(pulsar);
  yield;
  // Nebulosa del Cangrejo: interior azul de sincrotrón y red de filamentos rojo-anaranjados.
  const tCangrejo = texturaPlaneta('nebulosaFondo', { semilla: 44, tono: 3, ancho: L, alto: L }, { relleno: [0, 0, 0], bloquea: false }); tCangrejo.wrapS = THREE.ClampToEdgeWrapping;
  yield;
  // En 3D: nueve capas de gas y filamentos a distintas profundidades alrededor del púlsar.
  const cangrejo = crearNube(tCangrejo, new THREE.Vector3(), 4000, 44, ESCALA_CIELO * ESCALA_PULSAR, 9, { variante: 'cavidad' }); pulsar.add(cangrejo); cangrejo.userData.brilloPropio = true;   // anima su brillo con el haz; variante con grosor: volumen desde cualquier lado
  yield;
  // Como las demás nebulosas, de frente hacia casa (de donde se llega): visto de canto, su lámina
  // de gas se ve estirada en vetas.
  cangrejo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pulsar.position.clone().negate().normalize()); cangrejo.rotateZ(0.5);
  // Sin halos difusos alrededor: el azul de sincrotrón lo ponen las motas de dentro de la nebulosa (escenasGigantes.js).
  yield;
  // Eje de giro perpendicular a la línea de visión desde el centro: los haces se ven barrer de lado.
  const vistaPulsar = pulsar.position.clone().normalize().negate();
  const ejeGiro = new THREE.Vector3(0, 1, 0).addScaledVector(vistaPulsar, -vistaPulsar.y).normalize().applyAxisAngle(vistaPulsar, 0.45);
  const giroPulsar = new THREE.Group(); giroPulsar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ejeGiro); pulsar.add(giroPulsar);
  const giroInterno = new THREE.Group(); giroPulsar.add(giroInterno);
  const magnetico = new THREE.Group(); magnetico.rotation.z = 0.75; giroInterno.add(magnetico);
  yield;
  // Toro ecuatorial (anillos de viento con grumos, como en las imágenes de rayos X del Cangrejo)
  // y chorros por los polos del eje de giro.
  const toro = new THREE.Mesh(new THREE.RingGeometry(180, 720, 160, 6), aditivo({ uT: { value: 0 } },
    'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    /* glsl */`uniform float uT; varying vec2 vP;
      float h(vec2 p){ vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      void main(){ float r = length(vP), ang = atan(vP.y, vP.x);
        float anillos = exp(-pow((r - 300.0) / 40.0, 2.0)) + 0.7 * exp(-pow((r - 520.0) / 70.0, 2.0)) + 0.35 * exp(-pow((r - 660.0) / 50.0, 2.0));
        float grumos = 0.55 + 0.45 * sin(ang * 14.0 + uT * 0.8 + sin(ang * 5.0) * 2.0) * sin(r * 0.03 - uT * 1.5);
        anillos += 0.5 * pow(0.5 + 0.5 * sin(r * 0.045 - uT * 2.2), 12.0) * smoothstep(200.0, 300.0, r) * (1.0 - smoothstep(600.0, 720.0, r));   // ondas que se alejan
        float a = anillos * grumos * 0.75; gl_FragColor = vec4(vec3(0.7, 0.82, 1.0) * a, a); }`));
  toro.rotation.x = Math.PI / 2; giroPulsar.add(toro);
  let chorroPulsar = null, hazPulsar = null;
  // Lo del púlsar que lleva su propio tiempo (en su escena casi se para): chorros, haces y flujo.
  const tiempoPulsar = [], hacesPulsar = [];
  for (const s of [1, -1]) { const ch = crearHaz({ radio: 60, largo: 900, colorA: '#e8f0ff', colorB: '#9cb8ff', intensidad: 0.9, nudos: 2 }); if (s < 0) ch.rotation.x = Math.PI; giroPulsar.add(ch); tiempoPulsar.push(ch); chorroPulsar = ch; }
  for (const s of [1, -1]) { const h = crearHaz({ radio: 90, largo: 2200, colorA: '#f4f8ff', colorB: '#6f9bff', intensidad: 1.2 }); if (s < 0) h.rotation.x = Math.PI; magnetico.add(h); tiempoPulsar.push(h); hacesPulsar.push(h); hazPulsar = h; }
  yield;
  // Líneas de campo magnético (dipolo): r = L · sen²θ, en varios planos alrededor del eje.
  for (let k = 0; k < 10; k++) for (const Lc of [260, 460]) {
    const pts = Array.from({ length: 64 }, (_, i) => { const th = 0.15 + i / 63 * (Math.PI - 0.3), r = Lc * Math.sin(th) ** 2; return new THREE.Vector3(Math.sin(th) * r, Math.cos(th) * r, 0); });
    const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#9cc2ff', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
    linea.rotation.y = k / 10 * Math.PI * 2; magnetico.add(linea);
  }
  {
    const n = 520, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([Math.random() * Math.PI * 2, Math.random(), Math.random()], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flujo = new THREE.Points(g, aditivo({ uT: { value: 0 }, uScale, uPR },
      `uniform float uT, uScale, uPR; varying float vA;
       void main(){ float f = fract(position.y + uT * 0.35), lado = position.z < 0.5 ? 1.0 : -1.0, r = f * 120.0 * fract(position.x * 3.7);
         vec3 p = vec3(cos(position.x) * r, lado * f * 2100.0, sin(position.x) * r);
         vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vA = (1.0 - f) * smoothstep(0.0, 0.05, f);
         gl_PointSize = clamp(9.0 * ${ESCALA_CIELO.toFixed(1)} * uScale / max(1.0, -mv.z), 1.0, 3.5 * uPR); }`,
      'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float k = pow(max(1.0 - d * 2.0, 0.0), 2.0) * vA; gl_FragColor = vec4(vec3(0.8, 0.9, 1.0) * k, k); }'));
    flujo.frustumCulled = false; magnetico.add(flujo); tiempoPulsar.push(flujo);
  }
  yield;
  // La estrella de neutrones: una esfera diminuta y ardiente con dos puntos calientes en los
  // polos magnéticos (de ahí salen los haces), girando con ellos.
  const estrellaNeutrones = new THREE.Mesh(new THREE.SphereGeometry(110, 128, 96),   // diminuta y ardiente (antes 260: parecía un planeta); su luz la da el destello
 new THREE.ShaderMaterial({
    uniforms: { uEje: { value: new THREE.Vector3(0, 1, 0) } },
    vertexShader: 'varying vec3 vN, vP; void main(){ vP = normalize(position); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uEje; varying vec3 vN, vP;
      void main(){ float mu = max(dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0), polo = pow(abs(dot(vP, normalize(uEje))), 18.0);
        vec3 c = mix(vec3(0.55, 0.7, 1.0), vec3(1.0), pow(mu, 2.0)) * (0.6 + 0.6 * mu) + vec3(1.0, 0.95, 1.0) * polo * 2.5;
        gl_FragColor = vec4(c * 2.0, 1.0); }`
  }));
  magnetico.add(estrellaNeutrones);
  const nucleoPulsar = sprite(gigante, '#eef6ff', 520); pulsar.add(nucleoPulsar);
  const halo = sprite(brillo, '#a9c8ff', 800, 0.5); halo.visible = false; pulsar.add(halo);   // sin halo difuso (se conserva para las medidas)
  const ejeHaz = new THREE.Vector3(), haciaCam = new THREE.Vector3();
  // Su escena (escenasGigantes.js): motas de la nebulosa (alrededor) y de los haces (giran con ellos).
  yield;
  const escenaPulsar = crearEscenaPulsar({ uScale, uPR }); pulsar.add(escenaPulsar.nebulosa); magnetico.add(escenaPulsar.haces);
  let fasePulsar = 0, tPulsar = 0;

  yield;
  // ── Cuásar: galaxia anfitriona, anillo de fuego, disco de acreción, sombra y chorros (js/escena/cuasar.js) ──
  const cuasar = new THREE.Group(); cuasar.position.copy(direccionCielo(SITIO.cuasar[0], SITIO.cuasar[1], SITIO.cuasar[2])); cuasar.rotation.set(0.5, 0.3, 0.9); cuasar.scale.setScalar(ESCALA_CUASAR); raiz.add(cuasar);
  const piezasCuasar = yield* construirCuasar({ uScale, uPR, texGigante: gigante, texBrillo: brillo, texNebulosa: yield* prepararTexNebulosa(23) });
  cuasar.add(piezasCuasar.grupo);
  // Su escena al llegar (escenasGigantes.js): anillo de motas, luz que sube por los chorros, lucecitas y la onda final.
  yield;
  const escenaCuasar = crearEscenaCuasar({ uScale, uPR, largo: CUASAR.chorro }); piezasCuasar.grupo.add(escenaCuasar.grupo);
  let tCuasar = 0, acentoEscena = false;
  const rotacionCuasar = cuasar.quaternion.clone();

  yield;
  // ── TON 618 (js/escena/ton618.js): lejos, pero enorme. Su enormidad se nota en lo que deforma: el disco de motas se
  // curva sobre la sombra (lente en cada mota) y la lente de pantalla (lente.js) curva lo que hay detrás ──
  const gigantesco = new THREE.Group(); gigantesco.position.copy(direccionCielo(SITIO.agujero[0], SITIO.agujero[1], SITIO.agujero[2])); raiz.add(gigantesco);
  const R = 215; gigantesco.scale.setScalar(0.55 * ESCALA_TON);
  const piezasTon = yield* construirTon618({ uScale, uPR, R, grupo: gigantesco });
  // Disco casi de canto visto desde casa (contiene la dirección de casa, inclinado 9°).
  piezasTon.orientar(gigantesco.position.clone().multiplyScalar(-1), 0.16);

  yield;
  // ── Sagitario A* (js/escena/sagitario.js): abajo, en el centro de la Vía Láctea; sus estrellas S, su gas y su flujo ──
  const sagitario = new THREE.Group(); sagitario.position.copy(direccionCielo(...SITIO.sagitario)); sagitario.scale.setScalar(0.7 * ESCALA_SGR); raiz.add(sagitario);
  const RS = 170;
  const piezasSgr = yield* construirSagitario({ uScale, uPR, RS, grupo: sagitario });
  yield;
  // ── La estrella que va a estallar (supernova.js), en una zona libre del cielo ──
  const sn = yield* construirSupernova({ uScale, uPR, escala: ESCALA_CIELO * ESCALA_SUPERNOVA });
  sn.radioFinal *= ESCALA_SUPERNOVA; sn.grupo.scale.setScalar(ESCALA_SUPERNOVA);
  sn.grupo.position.copy(direccionCielo(...SITIO.supernova)); raiz.add(sn.grupo);
  sn.orientarHacia(sn.grupo.position.clone().negate().normalize());   // el corazón mira a casa, siempre

  yield;
  // Todo el cielo profundo se dibuja antes que las galaxias lejanas y la galaxia central: la
  // sombra tapa su propio disco y lo que hay detrás, pero no lo que queda delante.
  raiz.traverse(o => { o.renderOrder -= 20; }); decor.traverse(o => { o.renderOrder -= 20; });
  const camLocal = new THREE.Vector3(), base = new THREE.Matrix4();
  let listaGrupos = null;   // lista fija para el cuadro (se crea una vez)
  // Escena de TON 618 o de Sagitario A* en curso: { id, reloj, marcas, reducido, viva, presencia, t, guion }.
  let escenaG = null;

  // ── Escenas de llegada del púlsar y de Deneb (js/util/escenasGigantes.js: duración, marcas y curvas) ──
  // Cada una con su director: su segundo (del reloj que se le pase: el del audio, o el tiempo propio desde la
  // llegada) y su peso (al cancelarla baja suave a 0 y el gigante vuelve a su estado normal).
  const directores = { pulsar: crearDirector(ESCENA_PULSAR, { salida: reducido ? 2.5 : 1.5 }), cuasar: crearDirector(ESCENA_CUASAR, { salida: reducido ? 2.5 : 1.5 }), deneb: crearDirector(ESCENA_DENEB, { salida: reducido ? 3 : 2 }) };
  const estadoP = estadoPulsar(0, ESCENA_PULSAR, {}), estadoC = estadoCuasar(0, ESCENA_CUASAR, {}), estadoD = estadoDeneb(0, ESCENA_DENEB, {});
  // El púlsar se para con los haces de lado a la cámara (barriendo la pantalla, ni de frente ni de canto): al
  // empezar se elige cuánto girar hasta «quieto» y la fase se calcula por el segundo de la escena (también con
  // el reloj del audio). Tablas de ∫giro y ∫giro·u (u: fracción hasta «quieto»), una vez por escena.
  const PASOS = 64, integral = new Float32Array(PASOS + 1), integralU = new Float32Array(PASOS + 1), aux = {};
  const ejeLocal = new THREE.Vector3(), qInversa = new THREE.Quaternion(), camaraDeneb = new THREE.Vector3();
  let paradaPulsar = null, camaraMundo = null, tActual = 0;
  const OMEGA = 2.2, INCLINACION = 0.75;   // giro del púlsar (rad/s) y ángulo del eje magnético (magnetico.rotation.z)
  function planearParada() {
    const c = directores.pulsar.config, q = c.marcas[c.parada || 'bailar'] - c.marcas.inicio;
    integral[0] = integralU[0] = 0;
    for (let k = 1; k <= PASOS; k++) {
      const s = (k - 0.5) / PASOS * q, g = estadoPulsar(s, directores.pulsar.config, aux, reducido).giro;
      integral[k] = integral[k - 1] + g * q / PASOS; integralU[k] = integralU[k - 1] + g * (s / q) * q / PASOS;
    }
    // Dirección de la cámara en el espacio del giro (el púlsar no rota; su grupo de giro sí).
    ejeLocal.copy(camLocal).sub(pulsar.position).normalize().applyQuaternion(qInversa.copy(giroPulsar.quaternion).invert());
    const natural = fasePulsar + OMEGA * integral[PASOS], B = OMEGA * integralU[PASOS], si = Math.sin(INCLINACION), co = Math.cos(INCLINACION);
    let mejor = 0, menor = Infinity;
    // c ∈ [−0,85; 2,4]: la velocidad (OMEGA·giro·(1 + c·u)) nunca se invierte ni da un acelerón al empezar (u = 0).
    for (let i = 0; i <= 48; i++) { const c = -0.85 + i / 48 * 3.25, f = natural + c * B; const d = Math.abs(-si * Math.cos(f) * ejeLocal.x + co * ejeLocal.y + si * Math.sin(f) * ejeLocal.z); if (d < menor - 1e-3) { menor = d; mejor = c; } }
    paradaPulsar = { fase0: fasePulsar, c: mejor, q };
  }
  const tabla = (t, s, q) => { const x = Math.min(PASOS, Math.max(0, s / q * PASOS)), i = Math.min(PASOS - 1, Math.floor(x)); return t[i] + (t[i + 1] - t[i]) * (x - i); };
  const escenas = {
    // Empieza la escena de `id` (reloj: función que da los segundos desde el inicio del audio; config: otra
    // duración o marcas). Devuelve una promesa: true al terminar, false si se cancela.
    iniciar(id, { reloj = null, config = null } = {}) {
      const d = directores[id]; if (!d) return Promise.resolve(false);
      return new Promise(resolve => {
        d.iniciar(tActual, { reloj, config, alFin: resolve });
        if (id === 'pulsar') planearParada();
        if (id === 'deneb' && camaraMundo) escenaDeneb.orientar(gruposEstrella.Deneb.worldToLocal(camaraDeneb.copy(camaraMundo)));
      });
    },
    cancelar(id = null) { for (const k in directores) if (!id || k === id) directores[k].cancelar(); },
    // La escena que está en marcha (o null) y si algo de ellas se mueve (para dibujar a 60: planificador).
    segundo: id => directores[id]?.segundo ?? 0,
    get enCurso() { for (const k in directores) if (directores[k].activa) return k; return null; },
    // Penumbra del resto del cielo mientras dura una escena (index.js la aplica a la telaraña).
    get foco() { return Math.max(estadoP.foco * directores.pulsar.peso, estadoC.foco * directores.cuasar.peso, estadoD.foco * directores.deneb.peso); },
    get animando() { for (const k in directores) { const d = directores[k]; if (d.activa || (d.visible && !d.terminada)) return true; } return false; },
    // Para las pruebas y el diagnóstico: segundo, peso y estado de cada una.
    estado(id) { const d = directores[id]; return d ? { activa: d.activa, terminada: d.terminada, segundo: d.segundo, peso: d.peso, ...(id === 'pulsar' ? estadoP : id === 'cuasar' ? estadoC : estadoD) } : null; }
  };
  return {
    escenas,
    // Motas de la escena del púlsar: dentro del gas del Cangrejo, se dibujan después de su capa (index.js).
    sobreGas: [escenaPulsar.nebulosa, escenaPulsar.haces],
    raiz, decor,
    acentoCuasar: v => piezasCuasar.acento(v),
    hornear: renderer => piezasCuasar.hornearRemolino(renderer),
    ejeCuasar: () => new THREE.Vector3(0, 1, 0).applyQuaternion(rotacionCuasar),   // eje de sus chorros (orientación fija)
    soles: Object.values(gruposEstrella),
    supernova: sn,
    get supernovaActiva() { const e = sn.desdeEstallido; return e !== null && e < 130; },
    // Agujeros con lente: centro (espacio de la raíz), radio que no se deforma, fuerza y alcance.
    lentes() {
      const k = raiz.scale.x;
      // (La de Sagitario A* se atenúa mientras sus órbitas dibujan corazones: no los deforma. La de TON 618 empieza por
      // fuera de su disco de motas, que ya se curva por sí mismo.)
      return [[sagitario, RS * sagitario.scale.x * 1.95, RS * sagitario.scale.x * 2.4 * piezasSgr.atenuacionLente, 6], [gigantesco, R * gigantesco.scale.x * 7, R * gigantesco.scale.x * 3.2, 3.2]].filter(([o]) => o.visible)
        .map(([o, dentro, fuerza, alcance]) => ({ id: o === sagitario ? 'sagitario' : 'ton618', centro: o.position.clone().multiplyScalar(k).add(raiz.position), dentro: dentro * k, fuerza: fuerza * k, alcance }));
    },
    // Medidas reales (geometría × escalas de todos los padres), para contrastar la tabla de
    // escalas con lo que se dibuja (diagnóstico y pruebas).
    // Medidas reales: cada límite sale de la GEOMETRÍA de su pieza (parámetros de su geometría o
    // uniforme × escala del mundo con todos los padres), no de constantes sueltas. Para cada cuerpo:
    //  · cuerpo: lo opaco (sombra, estrella); · disco / anillo / materia: lo luminoso denso;
    //  · gas, estrellas, chorro, haces, halo: extensiones visibles que se pueden atravesar;
    //  · navegacion: el radio que una ruta no debe cruzar (lo denso: disco, toro, anillo; no halos,
    //    nebulosas ni chorros finos). La supernova depende de su estado (estrella, explosión, corazón).
    medidas() {
      raiz.updateMatrixWorld(true);
      const V = new THREE.Vector3(), e = o => o.getWorldScale(V).x, d = o => Math.round(o.getWorldPosition(V).length());
      const anillo = m => m.geometry.parameters.outerRadius * e(m), esfera = m => m.geometry.parameters.radius * e(m), cono = m => m.geometry.parameters.height * e(m);
      const toroExt = m => (m.geometry.parameters.radius + m.geometry.parameters.tube) * e(m), spriteR = s => s.scale.x * 0.5 * e(s.parent);
      const maxAtributo = (pts, k) => { const a = pts.geometry.attributes.position; let m = 0; for (let i = 0; i < a.count; i++) m = Math.max(m, a.array[i * 3 + k]); return m; };
      const r = x => Math.round(x);
      const tam = sn.cajaCorazon.getSize(new THREE.Vector3()).multiplyScalar(0.5 * e(sn.corazon));
      const progenitora = 110 * e(sn.superficie), eyecta = sn.radioEyecta * e(sn.grupo);
      const ton = { distancia: d(gigantesco), cuerpo: r(esfera(piezasTon.sombra)), disco: r(anillo(piezasTon.base)), lente: r(anillo(piezasTon.anillo)), materia: r(R * piezasTon.rFuera * e(piezasTon.planoDisco)),
        estrellas: r(maxAtributo(piezasTon.discoEstrellas, 1) * e(piezasTon.discoEstrellas)), chorro: 0, halo: 0 };
      ton.navegacion = Math.max(ton.disco, ton.lente);
      // materia: la zona luminosa de Sagitario A* (flujo, minispiral y el corazón de las órbitas de las estrellas S), 6,3 RS
      // como antes del rediseño: es su radio de navegación y su extensión visible (las elipses que se alejan más son trazas
      // finas que se pueden atravesar, no algo denso).
      const sgr = { distancia: d(sagitario), cuerpo: r(esfera(piezasSgr.sombra)), anillo: r(anillo(piezasSgr.anillo)), materia: r(RS * 6.3 * e(sagitario)), halo: 0 };
      sgr.navegacion = Math.max(sgr.anillo, sgr.materia);
      const cua = { distancia: d(cuasar), disco: r(anillo(piezasCuasar.disco)), toro: r(toroExt(piezasCuasar.toro)), chorro: r(cono(piezasCuasar.haz)), anfitriona: r(piezasCuasar.medidas.anfitriona * e(cuasar)) };
      cua.navegacion = Math.max(cua.disco, cua.toro);
      const pul = { distancia: d(pulsar), cuerpo: r(esfera(estrellaNeutrones)), toro: r(anillo(toro)), chorro: r(cono(chorroPulsar)), haces: r(cono(hazPulsar)), gas: r(Math.max(cangrejo.scale.x, cangrejo.scale.y, cangrejo.scale.z) * 0.5 * e(pulsar)),   // semieje mayor de su volumen (no depende de su giro)
         halo: r(spriteR(halo)) };
      pul.navegacion = Math.max(pul.toro, pul.chorro);
      const estado = sn.estado, enExplosion = estado === 'estallido';
      const sup = { distancia: d(sn.grupo), estado, progenitora: r(progenitora), envolturas: r(progenitora * 4.75), eyecta: r(eyecta), semiancho: r(tam.x), semialto: r(tam.y), semiespesor: r(tam.z) };
      sup.navegacion = estado === 'remanente' ? sup.semiancho : enExplosion ? Math.max(sup.envolturas, sup.eyecta) : sup.envolturas;
      return {
        xiomara: { distancia: 0, disco: 980, navegacion: 1600 },
        ton618: ton, sagitario: sgr, cuasar: cua, pulsar: pul, supernova: sup,
        deneb: { distancia: d(gruposEstrella.Deneb), estrella: r(1400 * 0.016 * e(gruposEstrella.Deneb)) },
        // Compatibilidad con la tabla (js/data/escalaCosmica.js).
        progenitora: { distancia: d(sn.grupo), radio: r(progenitora) },
        corazon: { distancia: d(sn.grupo), semiancho: r(tam.x), semialto: r(tam.y), semiespesor: r(tam.z) }
      };
    },
    // Cuerpos con su centro, su radio de NAVEGACIÓN (rutas) y su extensión visible densa (lo que
    // tapa la lente: lo que hay delante en pantalla).
    cuerpos() {
      const m = this.medidas(), c = o => o.getWorldPosition(new THREE.Vector3());
      return [{ centro: new THREE.Vector3(), radio: m.xiomara.navegacion, visible: m.xiomara.disco, id: 'xiomara' },
        { centro: c(gigantesco), radio: m.ton618.navegacion, visible: m.ton618.disco, id: 'ton618' },
        { centro: c(sagitario), radio: m.sagitario.navegacion, visible: m.sagitario.materia, id: 'sagitario' },
        { centro: c(cuasar), radio: m.cuasar.navegacion, visible: m.cuasar.anfitriona * 0.6, id: 'cuasar' },
        { centro: c(pulsar), radio: m.pulsar.navegacion, visible: m.pulsar.toro, id: 'pulsar' },
        { centro: c(sn.grupo), radio: m.supernova.navegacion, visible: m.supernova.estado === 'remanente' ? m.supernova.semiancho : Math.max(m.supernova.progenitora, m.supernova.eyecta), id: 'supernova' }];
    },
    objetivo(id) {
      const tabla = { ton618: [gigantesco, 1100 * ESCALA_TON, 0.18], sagitario: [sagitario, 1500 * ESCALA_SGR, 0.12], pulsar: [pulsar, 3850 * ESCALA_PULSAR, 0.15], cuasar: [cuasar, 5200 * ESCALA_CUASAR, 0.2], deneb: [gruposEstrella.Deneb, 450 * ESCALA_DENEB, 0.08], supernova: [sn.grupo, 1150 * ESCALA_SUPERNOVA * (sn.estado === 'remanente' ? 1 : PROGENITORA_RELATIVA), 0.12] };   // la estrella intacta se encuadra a su tamaño
      const [objeto, distancia, alto] = tabla[id] || [];
      return objeto ? { centro: objeto.position.clone(), distancia, alto } : null;
    },
    // Empieza (con reloj) o termina (sin él: se funde con el reposo) la escena de un gigante. reloj(): segundo de su canción.
    escenaAgujero(id, opciones) {
      const reloj = opciones?.reloj, reducido = !!opciones?.reducido;
      if (reloj) escenaG = { id, reloj, marcas: marcasDe(id), reducido, viva: true, presencia: escenaG?.id === id ? escenaG.presencia : 0, t: 0, guion: guionReposo(id) };
      else if (escenaG && (!id || escenaG.id === id)) escenaG.viva = false;
    },
    // Hay animación de escena (el planificador dibuja a 60): mientras suena y mientras se funde al salir. En calma, no.
    get enEscenaAgujero() { return !!escenaG && (!escenaG.viva || escenaG.t < finEscena(escenaG.id)); },
    agujeros: { ton618: piezasTon, sagitario: piezasSgr },   // (diagnóstico y pruebas)
    get escenaAgujeroEstado() { return escenaG ? { id: escenaG.id, t: escenaG.t, presencia: escenaG.presencia, viva: escenaG.viva, guion: { ...escenaG.guion } } : null; },
    // Deriva de la cámara durante la escena de TON 618 (index.js la llama si nadie toca la cámara: tocando = gesto o inercia).
    derivar(camera, objetivo, dt, tocando) { return escenaG?.id === 'ton618' && piezasTon.derivar(camera, objetivo, dt, escenaG, tocando); },
    actualizar(t, dt, { camera }) {
      // El cielo acompaña a la cámara (index.js): en el espacio de la raíz, la cámara está aquí.
      const camara = camLocal.copy(camera.position).sub(raiz.position).divideScalar(raiz.scale.x);
      sn.actualizar(t, camara, camera.position);
      // Nada se oculta ni se agranda por estar seleccionado, por la distancia o por umbrales:
      // cada cuerpo tiene su posición y su tamaño fijos y lo lejano es pequeño por perspectiva
      // (docs/ESCALA-Y-ESPACIO.md).
      const grupos = listaGrupos ??= Object.values(gruposEstrella);   // la misma lista siempre (sin memoria nueva por cuadro)
      for (const g of grupos) g.scale.setScalar(g.userData.base || 1);
      sagitario.scale.setScalar(0.7 * ESCALA_SGR); pulsar.scale.setScalar(ESCALA_PULSAR); sn.grupo.scale.setScalar(ESCALA_SUPERNOVA);
      // El halo óptico de las estrellas (el destello de la lente/ojo, no la estrella) se mide en
      // pantalla: se reduce cuando la estrella está muy cerca para no tapar la escena.
      for (const g of grupos) {
        g.userData.k = Math.min(1, Math.max(0.12, (g.parent === decor ? g.position.length() : camara.distanceTo(g.position)) / DIST_ESTRELLAS));
        for (const hb of g.userData.halos) hb[0].scale.setScalar(hb[1] * g.userData.k);
      }
      for (const s of estrellas) s.nucleo.scale.setScalar(s.base * (0.92 + 0.08 * Math.sin(t * 1.3 + s.fase)) * (s.grupo ? s.grupo.userData.k : 1));
      for (const c of cometas) {
        const f = ((t / c.periodo) + c.fase) % 1, avance = f * 1.2 - 0.1;
        c.g.visible = avance > 0 && avance < 1;
        if (!c.g.visible) continue;
        c.curva.getPoint(avance, c.g.position);
        // Con vectores reutilizados (sin memoria nueva en cada cuadro: el recolector ya no frena a los cometas).
        // Tangente como la de three.js (dos puntos muy cercanos), sin los dos vectores nuevos que crea getTangent.
        c.curva.getPoint(Math.max(0, avance - 1e-4), ejeCometa); c.curva.getPoint(Math.min(1, avance + 1e-4), auxCometa);
        const eje = ejeCometa.sub(auxCometa).normalize().lerp(auxCometa.copy(c.g.position).normalize(), 0.5).normalize();
        const frente = frenteCometa.copy(c.g.position).negate().normalize(); frente.addScaledVector(eje, -frente.dot(eje)).normalize();   // la cola, en el plano que mira a Xiomara
        c.velo.quaternion.setFromRotationMatrix(base.makeBasis(eje, auxCometa.crossVectors(frente, eje), frente));
        c.velo.material.uniforms.uTime.value = t; c.velo.material.uniforms.uI.value = 0.75 * Math.min(1, avance * 8, (1 - avance) * 8);
      }
      // Púlsar: gira rápido; cuando un haz se acerca a la línea de visión, el núcleo destella. En su escena
      // el giro y el ritmo de su gas casi se paran (fase y tiempo propios, acumulados: sin saltos al volver).
      tActual = t; camaraMundo = camera.position;
      const dP = directores.pulsar, sP = dP.avanzar(t, dt), wP = dP.peso; estadoPulsar(sP, dP.config, estadoP, reducido);
      const velGiro = 1 + (estadoP.giro - 1) * wP;
      if (dP.activa && paradaPulsar && sP <= paradaPulsar.q) fasePulsar = paradaPulsar.fase0 + OMEGA * (tabla(integral, sP, paradaPulsar.q) + paradaPulsar.c * tabla(integralU, sP, paradaPulsar.q));
      else fasePulsar += dt * OMEGA * velGiro;
      tPulsar += dt * (1 + (estadoP.tiempo - 1) * wP);
      giroInterno.rotation.y = fasePulsar; toro.material.uniforms.uT.value = tPulsar;
      magnetico.updateMatrixWorld(); ejeHaz.set(0, 1, 0).transformDirection(magnetico.matrixWorld);
      haciaCam.copy(camara).sub(pulsar.position).normalize();
      const alineado = Math.pow(Math.abs(ejeHaz.dot(haciaCam)), 6);
      // Un punto diminuto y deslumbrante que destella cuando un haz mira hacia aquí (y, en su escena, con cada pulso de la canción).
      nucleoPulsar.scale.setScalar(90 + alineado * 300 + 220 * estadoP.pulso * wP);
      // Cada vez que un haz barre hacia aquí, la nebulosa entera se aviva un instante.
      // El gas del Cangrejo, tenue: su forma la dibujan los hilos de motas (escenasGigantes.js).
      cangrejo.material.uniforms.uBrillo.value = 0.3 + alineado * 0.08 + 0.12 * estadoP.brillo * wP;
      // El Cangrejo es casi esférico: su volumen mira siempre hacia la cámara (de canto se veía como vetas paralelas).
      cangrejo.lookAt(camera.position); cangrejo.rotateZ(0.5);
      for (const h of animar) h.material.uniforms.uT.value = t;
      for (const h of tiempoPulsar) h.material.uniforms.uT.value = tPulsar;
      // Los haces se abren y se encienden con la frase («hermosa»: del todo).
      const luzHaz = 1.2 * (1 + (estadoP.haces - 1) * wP), abre = 1 + (estadoP.apertura - 1) * wP;
      for (const h of hacesPulsar) { h.material.uniforms.uI.value = luzHaz; h.scale.set(abre, 1, abre); }
      escenaPulsar.actualizar(estadoP, wP, sP, t, reducido);
      // Deneb: late suave, su luz crece (corona de motas) y nace el mundo nuevo a su alrededor.
      const dD = directores.deneb, sD = dD.avanzar(t, dt), wD = dD.peso; estadoDeneb(sD, dD.config, estadoD, reducido);
      const late = estadoD.pum * estadoD.latido * wD;
      superficieDeneb.scale.setScalar(ESCALA_DISCO_DENEB * (1 + (reducido ? 0 : 0.04) * late + 0.06 * estadoD.luz * wD));
      // Su brillo de lejos (sprites suaves) se apaga al acercarse: a menos de ~12 veces la distancia de llegada no hay halos.
      suavesDeneb ??= gruposEstrella.Deneb.children.filter(o => o.isSprite).map(o => [o, o.material.opacity]);
      const lejosDeneb = THREE.MathUtils.smoothstep(camara.distanceTo(gruposEstrella.Deneb.position) / (450 * ESCALA_DENEB), 4, 14);
      for (const [o, base] of suavesDeneb) { o.material.opacity = base * lejosDeneb; o.visible = lejosDeneb > 0.001; }
      // Sin quemarse en blanco: se ven sus células de convección y el borde más oscuro (crece con la canción y late).
      superficieDeneb.material.uniforms.uLuz.value = 0.72 + 0.14 * estadoD.luz * wD + 0.08 * late;
      escenaDeneb.actualizar(estadoD, wD, dt, t, reducido);
      // Cuásar: en su escena su gas se calma (tiempo propio, acumulado) y se va encendiendo con la historia.
      const dC = directores.cuasar, sC = dC.avanzar(t, dt), wC = dC.peso; estadoCuasar(sC, dC.config, estadoC, reducido);
      tCuasar += dt * (1 + (estadoC.tiempo - 1) * wC);
      piezasCuasar.actualizar(tCuasar, camera);
      escenaCuasar.actualizar(estadoC, wC, dt, t, reducido);
      piezasCuasar.luzGas(0.82 - 0.4 * (estadoC.foco / 0.55) * wC);   // la galaxia se apaga un poco: la historia la cuentan el disco y los chorros
      // La luz del faro sube por los chorros en «es mi mujer ideal» (y se apaga después, sin tocar la del faro).
      if (dC.activa && (estadoC.acento >= 0 || acentoEscena)) { piezasCuasar.acento(estadoC.acento); acentoEscena = estadoC.acento >= 0; }
      else if (!dC.activa && acentoEscena) { piezasCuasar.acento(-1); acentoEscena = false; }
      // El cuásar no cambia de orientación (antes precesaba y al volver se veía distinto).
      cuasar.quaternion.copy(rotacionCuasar);   // orientación fija: se ve igual siempre (lo que gira es su gas, en los shaders)
      for (const { superficie, late, fase } of superficies) { superficie.material.uniforms.uT.value = t; if (late) superficie.scale.setScalar(1 + 0.03 * Math.sin(t * 0.25 + fase)); }   // las rojas laten despacio
      for (const e of envolturas) e.material.uniforms.uT.value = t;
      delante.material.uniforms.uT.value = t;
      // TON 618 y Sagitario A*, con su escena si la hay (js/ui/escenaAgujeros.js da el reloj de la canción). Al salir a
      // mitad, el reloj se queda quieto y la escena se funde con el reposo en 1,8 s (sin cortes).
      if (escenaG) {
        if (escenaG.viva) { escenaG.t = escenaG.reloj(); escenaG.presencia = Math.min(1, escenaG.presencia + dt / 0.8); }
        else escenaG.presencia = Math.max(0, escenaG.presencia - dt / 1.8);
        (escenaG.id === 'ton618' ? guionTon618 : guionSagitario)(escenaG.t, escenaG.marcas, escenaG, escenaG.guion);
        if (!escenaG.viva && escenaG.presencia <= 0) escenaG = null;
      }
      piezasTon.actualizar(t, dt, camera, escenaG?.id === 'ton618' ? escenaG : null);
      piezasSgr.actualizar(t, dt, camera, escenaG?.id === 'sagitario' ? escenaG : null);
    }
  };
}
