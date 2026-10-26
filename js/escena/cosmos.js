// El universo profundo, lejos de los lugares: nebulosas de emisión (en nuestra zona del cielo),
// estrellas supergigantes azules y rojas y enanas rojas, cometas, un púlsar, un cuásar y un
// agujero negro ultramasivo (como TON 618), cada uno con posición y tamaño fijos. Se atenúa bajo
// el velo al visitar un lugar (index.js). Las galaxias lejanas evitan estas zonas (ZONAS_OCUPADAS).
import * as THREE from 'three';
import { deUnTiron } from '../util/azarSemilla.js';
const ejeCometa = new THREE.Vector3(), frenteCometa = new THREE.Vector3(), auxCometa = new THREE.Vector3();   // reutilizados por los cometas en cada cuadro
import { texturasLigeras } from '../util/dispositivo.js';
import { texBrillo, texDestello, texEstrellaGigante, prepararTexNebulosa } from './texturas.js';
import { crearVelo } from './cometa.js';
import { construirSupernova } from './supernova.js';
import { construirTon618 } from './ton618.js';
import { construirSagitario } from './sagitario.js';
import { guionTon618, guionSagitario, guionReposo, marcasDe, finEscena } from '../util/guionAgujeros.js';
import { construirCuasar, CUASAR } from './cuasar.js';
import { atenuarFondo } from '../util/fondoEscena.js';
import { ESCALA_SUPERNOVA, PROGENITORA_RELATIVA, ESCALA_CUASAR, ESCALA_TON, ESCALA_PULSAR, ESCALA_DENEB, ESCALA_SGR } from '../data/escalaCosmica.js';
import { SITIOS_DESTINO } from '../data/sitios.js';
import { materialSombra } from './materiales.js';
import { crearEscenaCuasar } from './escenasGigantes.js';
import { construirPulsar } from './pulsar.js';
import { crearDeneb, RADIO_DENEB } from './deneb.js';
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
  let denebCerca = null, suavesDeneb = null, cercaDeneb = 0;   // Deneb de cerca: la estrella, su mundo y su videoclip (deneb.js)
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
      // De cerca, la supergigante (radio RADIO_DENEB) y su mundo, con su videoclip (deneb.js): sustituye al disco genérico;
      // su brillo de lejos (los destellos y halos) se apaga al acercarse (actualizar), y lo que se ve es la estrella.
      yield; denebCerca = crearDeneb({ uScale, uPR }); g.add(denebCerca.marco); superficie.visible = false;
      // Su marco, en los ejes del director de cámara (index.js, marcoClip): y = el eje Y del universo del lado de casa (Deneb
      // está por encima: hacia abajo), z = hacia casa en el plano perpendicular, x = y × z (el grupo mira a casa con su
      // elevación: se compensa).
      { const casa = g.position.clone().negate().normalize(), y = new THREE.Vector3(0, casa.y < 0 ? -1 : 1, 0), z = casa.clone().projectOnPlane(y).normalize(), x = new THREE.Vector3().crossVectors(y, z);
        denebCerca.marco.quaternion.copy(g.quaternion).invert().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))); }
      yield;
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
  // ── Púlsar (js/escena/pulsar.js): estrella de neutrones que gira con sus dos haces opuestos (un faro), su viento
  // ecuatorial y la nebulosa de filamentos. Dormido fuera de su escena; con su canción despierta (js/util/escenaPulsar.js) ──
  const pulsar = new THREE.Group(); pulsar.position.copy(direccionCielo(SITIO.pulsar[0], SITIO.pulsar[1], SITIO.pulsar[2])); pulsar.scale.setScalar(ESCALA_PULSAR); raiz.add(pulsar);
  const piezasPulsar = yield* construirPulsar({ uScale, uPR });
  pulsar.add(piezasPulsar.grupo);
  // Ejes del giro = los del marco de su videoclip (index.js, marcoClip): eje de giro el Y del universo (del lado de casa),
  // z hacia casa en horizontal y x a la derecha. Así la pista de cámara y los haces hablan el mismo idioma.
  {
    const casa = pulsar.position.clone().negate().normalize(), y = new THREE.Vector3(0, 1, 0); if (y.dot(casa) < 0) y.negate();
    const z = casa.clone().projectOnPlane(y).normalize(), x = new THREE.Vector3().crossVectors(y, z).normalize();
    piezasPulsar.orientar(x, y, z);
  }

  yield;
  // ── Cuásar: galaxia anfitriona, anillo de fuego, disco de acreción, sombra y chorros (js/escena/cuasar.js) ──
  const cuasar = new THREE.Group(); cuasar.position.copy(direccionCielo(SITIO.cuasar[0], SITIO.cuasar[1], SITIO.cuasar[2])); cuasar.rotation.set(0.5, 0.3, 0.9); cuasar.scale.setScalar(ESCALA_CUASAR); raiz.add(cuasar);
  const piezasCuasar = yield* construirCuasar({ uScale, uPR, texGigante: gigante, texBrillo: brillo, texNebulosa: yield* prepararTexNebulosa(23) });
  cuasar.add(piezasCuasar.grupo);
  // Su escena al llegar (escenasGigantes.js): anillo de motas, luz que sube por los chorros, lucecitas y la onda final.
  yield;
  const escenaCuasar = crearEscenaCuasar({ uScale, uPR, largo: CUASAR.chorro }); piezasCuasar.grupo.add(escenaCuasar.grupo);
  let tCuasar = 0, acentoEscena = false, atenuandoCuasar = false;
  const centroCuasar = new THREE.Vector3();
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
  const tmpSgr = new THREE.Vector3(), tmpTon = new THREE.Vector3();
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
  const estadoP = estadoPulsar(0, ESCENA_PULSAR, {}), estadoC = estadoCuasar(0, ESCENA_CUASAR, {}), estadoD = estadoDeneb(0, ESCENA_DENEB, {}), normalD = estadoDeneb(ESCENA_DENEB.duracion, ESCENA_DENEB, {});   // normalD: Deneb fuera de su escena
  const camPulsar = new THREE.Vector3(), centroPulsar = new THREE.Vector3();
  let camaraMundo = null, tActual = 0, atenuandoPulsar = false;
  const pulsarDormido = estadoPulsar(0, ESCENA_PULSAR, {});
  // La cámara en el espacio del grupo del púlsar, relativa a su centro.
  const camaraEnPulsar = () => camPulsar.copy(camLocal).sub(pulsar.position).divideScalar(pulsar.scale.x);
  const escenas = {
    // Empieza la escena de `id` (reloj: función que da los segundos desde el inicio del audio; config: otra
    // duración o marcas). Devuelve una promesa: true al terminar, false si se cancela.
    iniciar(id, { reloj = null, config = null } = {}) {
      const d = directores[id]; if (!d) return Promise.resolve(false);
      return new Promise(resolve => {
        d.iniciar(tActual, { reloj, config, alFin: resolve });
        if (id === 'pulsar') piezasPulsar.iniciarEscena();
      });
    },
    cancelar(id = null) { for (const k in directores) if (!id || k === id) directores[k].cancelar(); },
    // La escena que está en marcha (o null) y si algo de ellas se mueve (para dibujar a 60: planificador).
    segundo: id => directores[id]?.segundo ?? 0,
    get enCurso() { for (const k in directores) if (directores[k].activa) return k; return null; },
    // Penumbra del resto del cielo mientras dura una escena (index.js la aplica a la telaraña).
    // Deneb: también fuera de su escena, cerca de ella, el resto del cielo queda en penumbra (la escena acaba limpia).
    get foco() { return Math.max(estadoP.foco * directores.pulsar.peso, estadoC.foco * directores.cuasar.peso, estadoD.foco * directores.deneb.peso, 0.85 * cercaDeneb); },
    // Las nebulosas lejanas se apagan en la escena de Deneb (nace de la nada: delante de un cielo casi negro).
    get focoNubes() { return Math.max(estadoD.nubes * directores.deneb.peso, 0.85 * cercaDeneb); },
    get animando() { for (const k in directores) { const d = directores[k]; if (d.activa || (d.visible && !d.terminada)) return true; } return false; },
    // Para las pruebas y el diagnóstico: segundo, peso y estado de cada una.
    estado(id) { const d = directores[id]; return d ? { activa: d.activa, terminada: d.terminada, segundo: d.segundo, peso: d.peso, ...(id === 'pulsar' ? estadoP : id === 'cuasar' ? estadoC : estadoD) } : null; }
  };
  return {
    escenas,
    sobreGas: [],
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
      const r = x => Math.round(x);
      const tam = sn.cajaCorazon.getSize(new THREE.Vector3()).multiplyScalar(0.5 * e(sn.corazon));
      const progenitora = 110 * e(sn.superficie), eyecta = sn.radioEyecta * e(sn.grupo);
      const ton = { distancia: d(gigantesco), cuerpo: r(esfera(piezasTon.sombra)), disco: r(anillo(piezasTon.base)), lente: r(anillo(piezasTon.anillo)), materia: r(R * piezasTon.rFuera * e(piezasTon.planoDisco)),
        estrellas: 0, chorro: 0, halo: 0 };
      ton.navegacion = Math.max(ton.disco, ton.lente);
      // materia: la zona luminosa de Sagitario A* (flujo, minispiral y el corazón de las órbitas de las estrellas S), 6,3 RS
      // como antes del rediseño: es su radio de navegación y su extensión visible (las elipses que se alejan más son trazas
      // finas que se pueden atravesar, no algo denso).
      const sgr = { distancia: d(sagitario), cuerpo: r(esfera(piezasSgr.sombra)), anillo: r(anillo(piezasSgr.anillo)), materia: r(RS * 6.3 * e(sagitario)), halo: 0 };
      sgr.navegacion = Math.max(sgr.anillo, sgr.materia);
      const cua = { distancia: d(cuasar), disco: r(anillo(piezasCuasar.disco)), toro: r(toroExt(piezasCuasar.toro)), chorro: r(cono(piezasCuasar.haz)), anfitriona: r(piezasCuasar.medidas.anfitriona * e(cuasar)) };
      cua.navegacion = Math.max(cua.disco, cua.toro);
      // Púlsar: la estrella (esfera), el viento ecuatorial (lo denso: navegación), los haces y la nebulosa de filamentos.
      const ep = e(piezasPulsar.grupo), mp = piezasPulsar.medidas;
      const pul = { distancia: d(pulsar), cuerpo: r(esfera(piezasPulsar.estrella)), toro: r(mp.viento * ep), chorro: 0, haces: r(mp.haz * ep), gas: r(mp.nebulosa * ep), halo: 0 };
      pul.navegacion = pul.toro;
      const estado = sn.estado, enExplosion = estado === 'estallido';
      const sup = { distancia: d(sn.grupo), estado, progenitora: r(progenitora), envolturas: r(progenitora * 4.75), eyecta: r(eyecta), semiancho: r(tam.x), semialto: r(tam.y), semiespesor: r(tam.z) };
      sup.navegacion = estado === 'remanente' ? sup.semiancho : enExplosion ? Math.max(sup.envolturas, sup.eyecta) : sup.envolturas;
      return {
        xiomara: { distancia: 0, disco: 980, navegacion: 1600 },
        ton618: ton, sagitario: sgr, cuasar: cua, pulsar: pul, supernova: sup,
        deneb: { distancia: d(gruposEstrella.Deneb), estrella: r(RADIO_DENEB * e(gruposEstrella.Deneb)) },
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
    // (Con las marcas ya leídas al empezar: finEscena las volvía a montar —objetos nuevos— dos veces por cuadro.)
    get enEscenaAgujero() { return !!escenaG && (!escenaG.viva || escenaG.t < escenaG.marcas.fundido + 2.5); },
    // Segundo de la escena del agujero que suena (null si no hay ninguna viva): el reloj del director de cámara (index.js).
    segundoAgujero: id => escenaG && escenaG.viva && escenaG.id === id ? escenaG.t : null,
    agujeros: { ton618: piezasTon, sagitario: piezasSgr },   // (diagnóstico y pruebas)
    get escenaAgujeroEstado() { return escenaG ? { id: escenaG.id, t: escenaG.t, presencia: escenaG.presencia, viva: escenaG.viva, guion: { ...escenaG.guion } } : null; },
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
      // Púlsar: siempre gira; en su escena despierta con la canción y queda despierto mientras se le mira (persiste).
      tActual = t; camaraMundo = camera.position;
      const dP = directores.pulsar, sP = dP.avanzar(t, dt), wP = dP.peso; estadoPulsar(sP, dP.config, estadoP, reducido);
      piezasPulsar.actualizar({ e: estadoP, e0: pulsarDormido, w: wP, activa: dP.activa, s: sP, t, dt, camara: camaraEnPulsar(), reducido });
      // Las paredes de polvo del cielo profundo y las nebulosas cercanas (nubes moradas y naranjas de bordes blancos) se apagan
      // mientras se le mira: su nebulosa es la suya, de filamentos (js/util/fondoEscena.js). Al irse, vuelven.
      if (wP > 0.0005) { pulsar.getWorldPosition(centroPulsar); atenuandoPulsar = true; atenuarFondo(centroPulsar.x, centroPulsar.y, centroPulsar.z, 12 * 3850 * pulsar.getWorldScale(camPulsar).x, wP * Math.min(0.9, 1.06 * Math.max(0, estadoP.foco))); }
      else if (atenuandoPulsar) { atenuandoPulsar = false; atenuarFondo(0, 0, 0, 0, 0); }
      for (const h of animar) h.material.uniforms.uT.value = t;
      // Deneb: su videoclip (nace de la nada con «Middle») sobre su estado de siempre (deneb.js, js/util/escenaDeneb.js).
      const dD = directores.deneb, sD = dD.avanzar(t, dt), wD = dD.peso; estadoDeneb(sD, dD.config, estadoD, reducido);
      // Su brillo de lejos (sprites suaves) se apaga al acercarse: a menos de ~12 veces la distancia de llegada no hay halos.
      suavesDeneb ??= gruposEstrella.Deneb.children.filter(o => o.isSprite).map(o => [o, o.material.opacity]);
      const lejosDeneb = THREE.MathUtils.smoothstep(camara.distanceTo(gruposEstrella.Deneb.position) / (450 * ESCALA_DENEB), 4, 14);
      for (const [o, base] of suavesDeneb) { o.material.opacity = base * lejosDeneb; o.visible = lejosDeneb > 0.001; }
      // De lejos (desde casa está a unas 8 veces su distancia de llegada) se ve como antes: un punto deslumbrante con su
      // disco pequeño (radio 30), no una luna; al acercarse (de 6 a 2,5 veces la llegada) crece hasta su tamaño de verdad.
      const lejosLlegada = camara.distanceTo(gruposEstrella.Deneb.position) / (450 * ESCALA_DENEB);
      cercaDeneb = 1 - THREE.MathUtils.smoothstep(lejosLlegada, 3, 6);
      denebCerca.marco.scale.setScalar(Math.max(wD > 0 ? 1 : 0, 0.3 + 0.7 * (1 - THREE.MathUtils.smoothstep(lejosLlegada, 2.5, 6))));
      denebCerca.actualizar(estadoD, normalD, wD, dt, t, reducido, camera.position);
      // Cuásar: en su escena se enciende con la historia: empieza dormido (chorros recogidos, disco y galaxia apagados) y
      // los chorros nacen y crecen con las frases hasta su diseño de siempre (js/util/escenasGigantes.js, estadoCuasar).
      const dC = directores.cuasar, sC = dC.avanzar(t, dt), wC = dC.peso; estadoCuasar(sC, dC.config, estadoC, reducido);
      tCuasar += dt * (1 + (estadoC.tiempo - 1) * wC);
      piezasCuasar.escena(estadoC, wC);
      piezasCuasar.actualizar(tCuasar, camera);
      escenaCuasar.actualizar(estadoC, wC, dt, t, reducido);
      piezasCuasar.luzGas(0.82 * (1 + (estadoC.gas - 1) * wC));
      // Las paredes de polvo y las nebulosas de alrededor se apagan mientras dura su clip (le robaban el encuadre) y vuelven
      // al terminar, con el cuásar ya entero (js/util/fondoEscena.js; foco: 0 → 0,5 al empezar y de vuelta a 0 al final).
      if (wC > 0.0005 && estadoC.foco > 0) { atenuandoCuasar = true; cuasar.getWorldPosition(centroCuasar); atenuarFondo(centroCuasar.x, centroCuasar.y, centroCuasar.z, CUASAR.anfitriona * cuasar.matrixWorld.getMaxScaleOnAxis() * 20, 0.88 * Math.min(1, estadoC.foco / 0.5) * wC); }
      else if (atenuandoCuasar) { atenuandoCuasar = false; atenuarFondo(0, 0, 0, 0, 0); }
      // El frente de los chorros que crecen (la luz del faro, que sube por ellos); se apaga después, sin tocar la del faro.
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
      // Junto a Sagitario A* (a menos de 3 encuadres: el zoom llega a 2,5, y mucho más cerca de él que de TON 618), TON 618
      // no se dibuja: allí se veía como una galaxia diminuta pero muy brillante que quemaba el brillo (un «cuadrito»
      // incómodo al alejar la cámara) y costaba dibujarla.
      sagitario.getWorldPosition(tmpSgr); gigantesco.getWorldPosition(tmpTon);
      const rSgr = RS * sagitario.matrixWorld.getMaxScaleOnAxis() * (1500 / 119), dSgr = camera.position.distanceTo(tmpSgr);
      gigantesco.visible = !(dSgr < 3 * rSgr && dSgr < 0.6 * camera.position.distanceTo(tmpTon));
      piezasTon.actualizar(t, dt, camera, escenaG?.id === 'ton618' ? escenaG : null);
      piezasSgr.actualizar(t, dt, camera, escenaG?.id === 'sagitario' ? escenaG : null);
    }
  };
}
