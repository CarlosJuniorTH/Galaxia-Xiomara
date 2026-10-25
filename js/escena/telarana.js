// La telaraña cósmica en la escena (datos: js/data/telarana.js), como en las simulaciones del universo:
// hebras finas y onduladas de gas azul y violeta (varias fibras trenzadas por filamento, con ramitas que se
// pierden en el vacío y un resplandor suave), filamentos menores que cierran celdas alrededor de grandes vacíos
// negros, galaxias doradas y blancas sobre las hebras y, en los nudos, cúmulos dorados densos con su resplandor.
// Todo con posición 3D fija: al viajar cambia la perspectiva de verdad. Las hebras son cintas con un ancho fijo en
// píxeles y bordes suaves (no líneas de 1 px): se ven finas y limpias de lejos, sin temblar ni pixelarse.
// Las galaxias del catálogo (con su imagen y sus estrellas) viven sobre ella; estas luces son el resto.
import * as THREE from 'three';
import { fijarZona, zonaDe, GLSL_ZONA } from './zona.js';
import { esMovil, nivelSeguro } from '../util/dispositivo.js';
import { generador, semillaDe, ceder } from '../util/azarSemilla.js';
import { crearTelarana, puntoFilamento } from '../data/telarana.js';
import { generarDatosTelarana } from './telaranaDatos.js';
import { vista } from '../util/vista.js';

// Lo que queda detrás de un gigante (en su silueta, más lejos que él) se apaga: la telaraña no tapa al cuásar, la
// supernova… (uGigA/uGigB, ver OCULTO).
// Lo que solo depende de la cámara (su posición en el espacio de la telaraña y, por gigante, su dirección, distancia
// y radio angular) se calcula UNA vez por cuadro en la CPU (actualizar): antes cada uno del millón de puntos invertía
// una matriz y calculaba un arcoseno y un arcocoseno por gigante. Mismo resultado, mucho menos trabajo para la GPU.
// uGigA: dirección desde la cámara (xyz) y coseno del borde exterior del fundido (w); uGigB: distancia, radio angular y activo.
const OCULTO = /* glsl */`uniform vec3 uCamL; uniform vec4 uGigA[6], uGigB[6];
float ocultoGig(vec3 p){ vec3 v = p - uCamL; float dp = length(v), k = 1.0; vec3 u = v / max(dp, 1e-6);
  for (int i = 0; i < 6; i++) { if (uGigB[i].z <= 0.0 || dp < uGigB[i].x) continue;
    float c = dot(u, uGigA[i].xyz); if (c <= uGigA[i].w) continue;   // fuera del fundido: no tapa (el factor sería 1)
    float r = uGigB[i].y; k *= smoothstep(r * 0.85, r * 1.5, acos(min(c, 1.0))); }
  return k; }`;
const gauss = a => { let u = 0; while (!u) u = a(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * a()); };
const col = c => new THREE.Color(c);
// Galaxias: sobre todo doradas y blancas (luz de estrellas viejas), algunas azuladas y alguna rosada.
const GAL_CALIDAS = ['#fff3dc', '#ffe3b0', '#ffd291', '#ffc174'].map(col), GAL_FRIAS = ['#e2eaff', '#bcd0ff'].map(col), GAL_ROSA = col('#ffbfe0');
const galaxiaColor = a => { const r = a(); return r < 0.72 ? GAL_CALIDAS[Math.floor(a() * 4)] : r < 0.95 ? GAL_FRIAS[Math.floor(a() * 2)] : GAL_ROSA; };
// Brazos de las galaxias de la telaraña: pow(0.5 + 0.5·cos(2θ − ln(máx(r, 0,04))·5,5), 2) en una rejilla de 256×256 sobre
// [−1, 1]² (se calcula una vez; el sombreador solo la lee).
let brazosTex = null;
function texturaBrazos() {
  if (brazosTex) return brazosTex;
  const N = 256, datos = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const rx = (x + 0.5) / N * 2 - 1, ry = (y + 0.5) / N * 2 - 1, rr = Math.hypot(rx, ry), th = Math.atan2(ry, rx);
    const v = Math.pow(0.5 + 0.5 * Math.cos(2 * th - Math.log(Math.max(rr, 0.04)) * 5.5), 2), k = (y * N + x) * 4;
    datos[k] = datos[k + 1] = datos[k + 2] = Math.round(v * 255); datos[k + 3] = 255;
  }
  brazosTex = new THREE.DataTexture(datos, N, N, THREE.RGBAFormat); brazosTex.minFilter = brazosTex.magFilter = THREE.LinearFilter; brazosTex.needsUpdate = true;
  return brazosTex;
}

// Pide los datos (posiciones, colores, brillos ya troceados en bloques) al obrero, que los calcula en otro núcleo
// mientras se prepara el resto del universo; si el navegador no puede, se calculan aquí cediendo el control a menudo.
export function pedirDatosTelarana() {
  const aqui = () => generarDatosTelarana(THREE, ceder);
  try {
    const obrero = new Worker(new URL('./telaranaObrero.js', import.meta.url), { type: 'module' });
    return new Promise(resolver => {
      let hecho = false;
      const fin = d => { if (hecho) return; hecho = true; clearTimeout(vigia); obrero.terminate(); resolver(d); };
      const respaldo = () => { window.__respaldoTelarana = true; if (hecho) return; hecho = true; clearTimeout(vigia); obrero.terminate(); aqui().then(resolver); };
      // Si el sistema cierra el obrero sin avisar (iOS lo hace cuando falta memoria), no se espera para siempre: el obrero
      // da un latido en cada pausa; si pasan 10 s sin ninguno (o 25 s sin el primero, mientras carga), se calcula aquí.
      let vigia = setTimeout(respaldo, 25000);
      obrero.onmessage = ({ data }) => { if (data.latido) { window.__latidosTelarana = (window.__latidosTelarana || 0) + 1; clearTimeout(vigia); vigia = setTimeout(respaldo, 10000); return; } data.datos ? fin(data.datos) : respaldo(); };
      obrero.onerror = e => { e.preventDefault?.(); respaldo(); };
      obrero.postMessage(null);
    });
  } catch { return aqui(); }
}

// Una nube de puntos en bloques: cada bloque es un Points con su esfera envolvente que comparte los MISMOS atributos
// (se suben una vez a la GPU) con su tramo de dibujo: lo que queda fuera de la vista no se dibuja.
function enBloques({ atributos, bloques }, material, O, fraccion = 1) {
  // Una vez en la tarjeta gráfica, la copia en memoria ya no hace falta (son decenas de MB: en un iPhone cuenta mucho).
  const liberar = function () { this.array = null; };
  const attr = Object.fromEntries(Object.entries(atributos).map(([n, { datos, k }]) => [n, new THREE.BufferAttribute(datos, k).onUpload(liberar)]));
  const grupo = new THREE.Group(); grupo.position.copy(O); grupo.renderOrder = -1.5;
  for (const b of bloques) {
    const g = new THREE.BufferGeometry(); for (const [n, a] of Object.entries(attr)) g.setAttribute(n, a);
    g.setDrawRange(b.a, Math.max(1, Math.ceil(b.n * fraccion)));   // una muestra repartida (los puntos de cada bloque están barajados)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(...b.centro), b.radio);
    const t = new THREE.Points(g, material); t.renderOrder = -1.5; t.userData.bloque = b;
    grupo.add(t);
  }
  return grupo;
}

export async function crearTelaranaCosmica({ scene, uPR, uScale, renderer }, datos) {
  datos ??= await generarDatosTelarana(THREE, ceder);
  const V = THREE.Vector3, web = crearTelarana(V);
  const raiz = new THREE.Group(); raiz.name = 'Telaraña cósmica'; raiz.userData.profundo = true; scene.add(raiz);
  const K = 1;   // el mismo contenido en móvil y en PC
  const O = web.centro;   // las coordenadas se guardan respecto al centro (precisión de float en la GPU)

  const empaquetar = (lista, tamPorPunto) => {
    const n = lista.length / 3, pos = new Float32Array(n * 3), c = new Float32Array(n * 3), tam = new Float32Array(n);
    for (let i = 0; i < n; i++) { const p = lista[i * 3], k = lista[i * 3 + 1]; pos.set([p.x - O.x, p.y - O.y, p.z - O.z], i * 3); c.set([k.r, k.g, k.b], i * 3); tam[i] = lista[i * 3 + 2]; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(c, 3)); g.setAttribute(tamPorPunto, new THREE.BufferAttribute(tam, 1));
    return g;
  };
  const uniformes = { uPR, uScale, uCamL: { value: new THREE.Vector3() }, uGigA: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 1, 2)) }, uGigB: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uCasa: { value: 1 }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uF: { value: 800 } };
  // En el móvil se dibuja el 45 % de los puntos de la telaraña y cada uno lleva la luz de los que no se dibujan (uComp): la
  // misma luz total con menos de la mitad de trabajo para la GPU (en un iPhone la telaraña completa bajaba a ~10 FPS).
  // La compensación es suave (1/√f, no 1/f): con todo concentrado en menos puntos, cada uno se pasaba del umbral del
  // resplandor y la telaraña se volvía una niebla blanca. La exposición automática equilibra la luz total.
  // En el móvil, el polvo y las nubes de los filamentos al 70 % (al 45 % los filamentos eran cadenitas de puntos sueltos) y
  // las galaxias en su proporción de antes (45 %): son lo que más cuesta dibujar (su capa).
  const MUESTRA = esMovil ? (nivelSeguro ? 0.45 : 0.7) : (nivelSeguro ? 0.6 : 1), uComp = { value: 1 / Math.sqrt(MUESTRA) }; let muestraActual = MUESTRA;
  const PROP_GAL = esMovil ? 0.45 / 0.7 : 1;   // fracción de galaxias respecto a la del polvo
  // En un PC con pantalla 4K o Retina (DPR 2), la capa de galaxias a la resolución real de la pantalla (a la CSS salía a la mitad).
  const CAPA_PC = Math.min(2, Math.max(1, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1));
  const uPRgal = { value: esMovil ? 0.8 : CAPA_PC };   // las galaxias se pintan en su propia capa a resolución CSS (1 píxel de capa = 1 px CSS)
  const matGalaxias = new THREE.ShaderMaterial({ uniforms: { ...uniformes, uPR: uPRgal, uComp, uBrazos: { value: texturaBrazos() } },
    vertexShader: /* glsl */`uniform float uPR, uScale, uCasa, uComp; ${OCULTO} attribute vec3 aCol; attribute float aBrillo; varying vec3 vC; varying float vA, vRes, vAng, vInc, vBrazos, vTipo;
      float h(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = length(mv.xyz);
        float R = 300.0 + aBrillo * 450.0, px = R * uScale / max(1.0, -mv.z);
        // Luz de una galaxia no resuelta: baja con la distancia, pero con compresión (se ven muy lejos).
        float k = clamp(pow(2500000.0 / d, 0.6), 0.45, 1.8);
        vRes = smoothstep(1.5, 6.0, px);                    // 0: un punto de luz · 1: se ve su forma
        // Licencia artística (como en las imágenes de la red cósmica): una de cada quince galaxias se ve siempre con
        // su forma, a un tamaño legible (6–15 px), aunque esté lejos; las demás, puntos de luz.
        // Licencia artística (como en las imágenes de la red cósmica): todas se ven con su forma (elípticas doradas,
        // espirales, de canto), con tamaños muy variados: muchas diminutas (3–5 px), algunas medianas y pocas grandes.
        float rt = h(position * 0.0021 + 1.3), minimo = 2.6 + pow(rt, 5.0) * 46.0 + pow(rt, 2.5) * 8.0;   // más grandes: se ve su forma
        vRes = 1.0;
        float tam = max(px * 2.4, minimo), lim = 90.0 * uPR;
        vTipo = h(position * 0.0017 + 5.5);
        gl_PointSize = min(tam * uPR, lim);
        vA = ocultoGig(position) * k * (0.35 + 0.65 * aBrillo) * uCasa * (0.03 + 0.7 * smoothstep(6.0, 24.0, tam)) * (1.0 - smoothstep(lim * 0.7, lim, tam * uPR)) * step(0.0, -mv.z);
        // Sin compensar por dibujar menos (en el móvil): cada galaxia con su brillo de siempre. Compensada, cada una brillaba
        // un 49 % más y en el móvil se veían manchas amarillas que deslumbraban y tapaban la zona.
        vAng = h(position * 0.001) * 6.2832; vInc = 0.25 + 0.75 * h(position * 0.0013 + 3.1); vBrazos = step(0.45, h(position * 0.0007 + 7.7));
        vC = aCol; }`,
    fragmentShader: /* glsl */`uniform sampler2D uBrazos; varying vec3 vC; varying float vA, vRes, vAng, vInc, vBrazos, vTipo;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; if (d > 1.0) discard;
        float punto = exp(-d * d * 4.0);
        // Forma: disco elíptico girado e inclinado, núcleo brillante y, en unas, dos brazos.
        float c = cos(vAng), s = sin(vAng); vec2 r = vec2(c * q.x - s * q.y, s * q.x + c * q.y) * 2.0; r.y /= vInc;
        float rr = length(r);
        // Tipos: espiral (núcleo dorado, brazos azulados o rosados), elíptica (dorada, suave) y de canto.
        float espiral = step(vTipo, 0.55), eliptica = step(0.7, vTipo);
        // Brazos espirales precalculados en una textura (la misma fórmula; ver texturaBrazos): sin atan, log, cos ni pow por
        // píxel. Era lo más caro de toda la telaraña mirando hacia el centro del universo, donde se amontonan las galaxias.
        float brazos = texture2D(uBrazos, clamp(r * 0.5 + 0.5, 0.0, 1.0)).r;
        float disco = exp(-rr * 2.6) * mix(0.35, 1.3, brazos * espiral + (1.0 - espiral) * 0.5) * (1.0 - smoothstep(0.8, 1.0, rr));
        float elip = exp(-rr * rr * 5.0) * eliptica;
        float forma = mix(disco * 0.9, elip * 1.3, eliptica) + exp(-rr * rr * 70.0) * 1.3;
        vec3 brazo = mix(vec3(0.55, 0.72, 1.0), vec3(1.0, 0.62, 0.85), step(0.45, fract(vTipo * 7.3)));
        vec3 oro = mix(vec3(1.0, 0.72, 0.38), vec3(1.0, 0.86, 0.6), fract(vTipo * 13.0));
        vec3 colForma = mix(mix(brazo, oro, eliptica), mix(oro, vec3(1.0, 0.93, 0.8), 0.5), exp(-rr * 5.0));
        vec3 col = mix(vC, colForma, vRes);
        float a = mix(punto, forma, vRes) * vA; gl_FragColor = vec4(col * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  // Polvo luminoso de los cúmulos (1–2 px).
  const matNubes = new THREE.ShaderMaterial({ uniforms: { ...uniformes, uComp },
    vertexShader: /* glsl */`uniform float uPR, uCasa, uComp, uT; attribute vec3 aCol; attribute float aBrillo; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = length(mv.xyz);
        float h = fract(sin(dot(position.xy, vec2(12.9898, 78.233)) * 0.0001) * 43758.5);
        vA = aBrillo * clamp(pow(3000000.0 / d, 0.5), 0.4, 1.5) * uCasa * uComp * step(0.0, -mv.z); vC = aCol; gl_PointSize = (1.0 + aBrillo) * uPR;
        // Vida: cada mota titila despacio a su ritmo y unas ondas de luz lentas recorren la red (como pulsos que viajan por
        // los filamentos y los cúmulos). Sin brillos difusos: solo cambia la luz de cada mota.
        float h2 = fract(h * 91.7 + 0.37), titileo = 0.78 + 0.22 * sin(uT * (0.6 + h2 * 1.6) + h * 40.0);
        float onda = pow(0.5 + 0.5 * sin(dot(position, vec3(2.1e-6, 1.3e-6, -1.7e-6)) - uT * 0.35), 8.0) + pow(0.5 + 0.5 * sin(dot(position, vec3(-1.2e-6, 1.9e-6, 1.5e-6)) - uT * 0.27 + 2.0), 8.0);
        vA *= titileo * (0.75 + 0.9 * onda);
      }`,
    fragmentShader: /* glsl */`varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = exp(-d * d * 3.0) * vA; gl_FragColor = vec4(vC * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  // Polvo de los filamentos: motas finas (1–2,5 px), con un leve titileo.
  const matPolvo = new THREE.ShaderMaterial({ uniforms: { ...uniformes, uComp },
    vertexShader: /* glsl */`uniform float uPR, uCasa, uComp, uT; ${OCULTO} attribute vec3 aCol; attribute float aBrillo; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = length(mv.xyz);
        float h = fract(sin(dot(position.xy, vec2(12.9898, 78.233)) * 0.0001) * 43758.5);
        vA = aBrillo * 3.2 * clamp(pow(4500000.0 / d, 0.5), 0.6, 2.0) * uCasa * step(0.0, -mv.z) * smoothstep(60000.0, 250000.0, d) * ocultoGig(position) * uComp; vC = aCol;
        // Vida: cada mota titila despacio a su ritmo y unas ondas de luz lentas recorren la red (como pulsos que viajan por
        // los filamentos y los cúmulos). Sin brillos difusos: solo cambia la luz de cada mota.
        float h2 = fract(h * 91.7 + 0.37), titileo = 0.78 + 0.22 * sin(uT * (0.6 + h2 * 1.6) + h * 40.0);
        float onda = pow(0.5 + 0.5 * sin(dot(position, vec3(2.1e-6, 1.3e-6, -1.7e-6)) - uT * 0.35), 8.0) + pow(0.5 + 0.5 * sin(dot(position, vec3(-1.2e-6, 1.9e-6, 1.5e-6)) - uT * 0.27 + 2.0), 8.0);
        vA *= titileo * (0.75 + 0.9 * onda);
        gl_PointSize = (1.2 + aBrillo * 1.0 + h * 0.5) * uPR; }`,
    fragmentShader: /* glsl */`varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = (1.0 - smoothstep(0.35, 1.0, d)) * vA; gl_FragColor = vec4(vC * a, a); }`,   // motas nítidas, sin halo
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  // Las tres nubes grandes de puntos (más de un millón en total), en bloques: solo se dibuja lo que está a la vista.
  // (Las cintas, los resplandores y la niebla de gas ya no se construyen: estaban ocultos para siempre —sin líneas ni
  // degradados—; sus datos se siguen calculando para que el azar, y por tanto el universo, no cambie.)
  const bloquesGalaxias = enBloques(datos.galaxias, matGalaxias, O, MUESTRA * PROP_GAL), bloquesNubes = enBloques(datos.nubes, matNubes, O, MUESTRA), bloquesPolvo = enBloques(datos.polvo, matPolvo, O, MUESTRA);
  raiz.add(bloquesNubes, bloquesPolvo);
  // Partículas a baja resolución, como en los juegos: las galaxias de la telaraña (manchas suaves de luz, cientos de miles)
  // se pintan en una capa aparte a la resolución CSS de la pantalla y se suman a la escena. En el móvil (retina) son 4
  // veces menos píxeles para la misma imagen; en el PC es la misma resolución que antes. Su luz es aditiva (el orden da
  // igual) y la ocultación por los gigantes ya la hace su sombreador (ocultoGig): no necesitan la profundidad.
  const capaGalaxias = new THREE.Scene(); capaGalaxias.add(bloquesGalaxias); bloquesGalaxias.updateMatrixWorld(true); bloquesGalaxias.matrixWorldAutoUpdate = false;
  const tipoCapa = renderer && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float')) ? THREE.HalfFloatType : THREE.UnsignedByteType;   // la luz sumada puede pasar de 1
  const rtGalaxias = new THREE.WebGLRenderTarget(1, 1, { type: tipoCapa, depthBuffer: false, stencilBuffer: false });
  const uZonaCapa = { value: new THREE.Vector4(1, 1, 1, 1) };
  const compuesto = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { uCapa: { value: rtGalaxias.texture }, uZona: uZonaCapa },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D uCapa; uniform vec4 uZona; varying vec2 vUv; ${GLSL_ZONA} void main(){ gl_FragColor = vec4(texture2D(uCapa, enZona(vUv, uZona)).rgb, 1.0); }`,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation }));
  // Alternativa con una sola orden de dibujo por nube de puntos (sin trocear): en Safari para iPhone cada orden cuesta;
  // se elige la que vaya mejor en el aparato (unirBloques, medidor ?hud).
  const unidos = [[bloquesGalaxias, matGalaxias], [bloquesNubes, matNubes], [bloquesPolvo, matPolvo]].map(([grupo, mat]) => {
    const g0 = grupo.children[0].geometry, g = new THREE.BufferGeometry(); for (const [n, a] of Object.entries(g0.attributes)) g.setAttribute(n, a);
    const total = grupo.children.reduce((m, t) => Math.max(m, t.geometry.drawRange.start + t.geometry.attributes.position.count), 0);
    g.setDrawRange(0, total); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e12);
    const p = new THREE.Points(g, mat); p.position.copy(grupo.position); p.renderOrder = -1.5; p.frustumCulled = false; p.visible = false; grupo.parent.add(p); p.updateMatrixWorld(true);
    return [grupo, p];
  });
  compuesto.frustumCulled = false; compuesto.renderOrder = -1.5; raiz.add(compuesto);
  const colorPrevio = new THREE.Color();
  let escalaCapa = esMovil ? 0.8 : CAPA_PC, escalaMax = escalaCapa;   // en el móvil, la capa de galaxias al 80 % (al 60 % se veían pixeladas); si el teléfono se calienta, la calidad automática la baja
  function dibujarGalaxias(renderer, camera) {
    if (!raiz.visible) return;   // oculta (p. ej. «Mirar hacia casa»): su capa no se ve, no se dibuja
    // Reservada al tamaño de su escala más alta; bajar la escala (calidad automática) solo cambia la zona (zona.js).
    const rw = Math.max(1, Math.round(vista.ancho * escalaMax)), rh = Math.max(1, Math.round(vista.alto * escalaMax));
    if (rtGalaxias.width < rw || rtGalaxias.height < rh || rtGalaxias.width * rtGalaxias.height > rw * rh * 2.2) rtGalaxias.setSize(rw, rh);
    fijarZona(rtGalaxias, vista.ancho * escalaCapa, vista.alto * escalaCapa); zonaDe(rtGalaxias, uZonaCapa.value);
    const previo = renderer.getRenderTarget(), alfa = renderer.getClearAlpha(); renderer.getClearColor(colorPrevio);
    renderer.setRenderTarget(rtGalaxias); renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false);
    renderer.render(capaGalaxias, camera);
    renderer.setClearColor(colorPrevio, alfa); renderer.setRenderTarget(previo);
  }
  // ── Campo cercano: dentro de un filamento o de un cúmulo, cientos de galaxias diminutas alrededor de la cámara
  // (las mismas siempre en cada lugar: semilla por celda). Así, al meterse en la telaraña, se ve que está hecha
  // de galaxias de verdad. Se rehace solo al cambiar de celda. ──
  const C = 60000, muestras = [];
  for (const f of web.filamentos) for (let k = 0; k <= 24; k++) muestras.push({ p: puntoFilamento(k / 24, web.nudos, f, V), g: f.grosor * 0.45, n: 1 });
  for (const nudo of web.nudos) muestras.push({ p: nudo.pos, g: nudo.r * 0.6, n: 3 });
  const cercano = new THREE.Points(new THREE.BufferGeometry(), matGalaxias); cercano.frustumCulled = false; cercano.renderOrder = -1.5; cercano.position.copy(web.centro); capaGalaxias.add(cercano);
  const celda = [NaN, NaN, NaN], pendiente = [NaN, NaN, NaN]; let desdePendiente = 0;
  function rehacerCercano(cam) {
    const ci = Math.floor(cam.x / C), cj = Math.floor(cam.y / C), ck = Math.floor(cam.z / C);
    if (ci === celda[0] && cj === celda[1] && ck === celda[2]) return;
    // Solo cuando la cámara se queda ~0,3 s en la misma celda: al girar alrededor de un gigante cambia de celda en cada
    // cuadro y antes se rehacía (y se volvía a subir a la GPU) todo el campo en cada cuadro, con tirones al girar.
    const ahora = performance.now();
    if (ci !== pendiente[0] || cj !== pendiente[1] || ck !== pendiente[2]) { pendiente[0] = ci; pendiente[1] = cj; pendiente[2] = ck; desdePendiente = ahora; return; }
    if (ahora - desdePendiente < 300) return;
    celda[0] = ci; celda[1] = cj; celda[2] = ck;
    // Lejos de la telaraña (lo normal en los gigantes, donde al girar se cambia de celda en cada cuadro) no hay nada que
    // rehacer: se comprueba sin crear memoria nueva.
    const zx = (ci + 0.5) * C, zy = (cj + 0.5) * C, zz = (ck + 0.5) * C;
    let alguna = false; for (const m of muestras) { const dx = m.p.x - zx, dy = m.p.y - zy, dz = m.p.z - zz, lim = C * 2.2 + m.g * 2; if (dx * dx + dy * dy + dz * dz < lim * lim) { alguna = true; break; } }
    if (!alguna && !cercano.geometry.attributes.position?.count) return;
    const lista = [], centroZona = new V(zx, zy, zz);
    const cerca = muestras.filter(m => m.p.distanceTo(centroZona) < C * 2.2 + m.g * 2);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const x0 = (ci + a) * C, y0 = (cj + b) * C, z0 = (ck + c) * C, rnd = generador(semillaDe(`celda-${ci + a},${cj + b},${ck + c}`));
      for (const m of cerca) {
        // Cuántas caen en esta celda alrededor de esta muestra (más en los cúmulos).
        for (let i = 0, n = Math.round(240 * m.n * K); i < n; i++) {
          const p = m.p.clone().add(new V(gauss(rnd), gauss(rnd), gauss(rnd)).multiplyScalar(m.g * 0.55));
          if (p.x < x0 || p.x >= x0 + C || p.y < y0 || p.y >= y0 + C || p.z < z0 || p.z >= z0 + C) continue;
          lista.push(p, galaxiaColor(rnd), 0.35 + rnd() * 0.75);
        }
      }
    }
    // Lejos de la telaraña (en los gigantes, al girar la cámara cambia de celda en cada cuadro) la lista sale vacía: no se
    // rehace la geometría vacía una y otra vez (creaba y borraba búferes de la GPU en cada cuadro).
    if (!lista.length && !cercano.geometry.attributes.position?.count) return;
    cercano.geometry.dispose(); cercano.geometry = empaquetar(lista, 'aBrillo');
  }
  // Toda la telaraña es fija: sus matrices se calculan una vez y no se recorren en cada cuadro (menos CPU en el móvil).
  raiz.updateMatrixWorld(true); raiz.matrixWorldAutoUpdate = false;
  const tam = new THREE.Vector2(), aux = new V(); let gigantes = [];
  const frustum = new THREE.Frustum(), mProy = new THREE.Matrix4(), esfera = new THREE.Sphere();
  let cuadroExpo = 0, densidadWeb = 0, expoAuto = 1;
  const AREA_REF = 1440 * 900, TAN_REF = Math.tan(Math.PI / 6), CAL = 5.2, DENSIDAD_COMODA = 0.85;   // luz de telaraña por píxel CSS con la que se ve bien (la del PC en los gigantes: 0,7–1,1)
  return {
    raiz, web, galaxias: bloquesGalaxias, nubes: bloquesNubes, cercano, polvoFil: bloquesPolvo, capaGalaxias, dibujarGalaxias,
    escalarCapaGalaxias(k) { escalaCapa = k; escalaMax = Math.max(escalaMax, k); uPRgal.value = k; },
    escalaCapaInicial: esMovil ? 0.8 : CAPA_PC, muestraInicial: MUESTRA,
    // Fracción de puntos que se dibuja en cada bloque (barajados), con la luz compensada.
    fijarMuestra(f) { muestraActual = f; for (const grupo of [bloquesGalaxias, bloquesNubes, bloquesPolvo]) for (const t of grupo.children) { const b = t.userData.bloque; t.geometry.setDrawRange(b.a, Math.max(1, Math.ceil(b.n * f * (grupo === bloquesGalaxias ? PROP_GAL : 1)))); } uComp.value = 1 / Math.sqrt(f); },
    get escalaCapaGalaxias() { return escalaCapa; },
    // Unidos dibujan todos los puntos (no la muestra): la luz de cada uno vuelve a ser la normal.
    get densidadWeb() { return densidadWeb; }, get expoAuto() { return expoAuto; },
    unirBloques(si) { for (const [grupo, p] of unidos) { grupo.visible = !si; p.visible = si; } uComp.value = si ? 1 : 1 / Math.sqrt(muestraActual); },
    // Gigantes que tapan la telaraña: [{ centro, radio }] (coordenadas del mundo).
    fijarGigantes(lista) { gigantes = lista.slice(0, 6).map(g => ({ c: new V(g.centro.x - O.x, g.centro.y - O.y, g.centro.z - O.z), r: g.radio })); },
    actualizar(t, dt, ctx) { const { camera } = ctx; uniformes.uT.value = t;
      // En casa, más discreta: el cielo de Xiomara ya es rico; lejos de ella, la telaraña es el cielo.
      // Exposición automática de la telaraña (como el ojo o una cámara): se estima cuánta luz de la telaraña cae en la
      // pantalla —puntos dentro de la vista por su brillo a esa distancia, por píxel CSS— y si se amontona demasiado (mirar
      // hacia el centro del universo, alejarse, viajar, una pantalla pequeña) se baja lo justo; si hay poca, se deja.
      // Funciona igual en cualquier dirección, gigante, viaje o aparato.
      if (++cuadroExpo % 3 === 0) {
        camera.updateMatrixWorld(); frustum.setFromProjectionMatrix(mProy.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        let luz = 0;
        for (const [grupo, peso, ref] of [[bloquesPolvo, 1, 4500000], [bloquesNubes, 0.6, 3000000], [bloquesGalaxias, 5, 2500000]]) for (const t of grupo.children) {
          const b = t.userData.bloque; esfera.center.set(b.centro[0] + O.x, b.centro[1] + O.y, b.centro[2] + O.z); esfera.radius = b.radio;
          if (!frustum.intersectsSphere(esfera)) continue;
          const d = Math.max(1, esfera.center.distanceTo(camera.position) - b.radio * 0.5);
          const l = t.geometry.drawRange.count * (grupo === bloquesGalaxias ? 1 : uComp.value) * peso * Math.min(2, Math.max(0.5, Math.sqrt(ref / d)));
          // Solo la parte del bloque que cae dentro de la vista (por cada plano del encuadre, la fracción de su esfera
          // que queda dentro): contando el bloque entero, una pantalla estrecha (el móvil) medía casi la misma luz que una ancha.
          let dentro = 1; for (let i = 0; i < 4; i++) dentro *= Math.min(1, Math.max(0, (frustum.planes[i].distanceToPoint(esfera.center) + b.radio) / (2 * b.radio)));
          luz += l * dentro;
        }
        // Por grado de vista (no por píxel): la telaraña tiene el mismo tamaño en el cielo en cualquier aparato, así que
        // con la misma luz por grado el móvil se ve como un recorte exacto del PC. (Antes, por píxel CSS y contando los
        // bloques enteros, el móvil quedaba unas tres veces más apagado.) CAL deja el PC con la exposición de siempre.
        const t = Math.tan(camera.fov * Math.PI / 360);
        densidadWeb = luz * CAL / AREA_REF * (1.6 * TAN_REF * TAN_REF) / (camera.aspect * t * t);
      }
      const metaAuto = Math.min(1, Math.pow(DENSIDAD_COMODA / Math.max(1e-9, densidadWeb), 0.85));
      expoAuto += (Math.max(0.12, metaAuto) - expoAuto) * Math.min(1, dt * 3);
      uniformes.uCasa.value = (0.22 + 0.78 * THREE.MathUtils.smoothstep(camera.position.length(), 20000, 400000)) * expoAuto;
      const pr = uPR.value; uniformes.uRes.value.set(vista.ancho * pr * 0.5, vista.alto * pr * 0.5);
      uniformes.uF.value = vista.alto / (2 * Math.tan(camera.fov * Math.PI / 360));
      rehacerCercano(camera.position);
      // Ocultación por los gigantes: lo que solo depende de la cámara, una vez por cuadro (ver OCULTO).
      bloquesGalaxias.updateWorldMatrix(true, false); const cam = bloquesGalaxias.worldToLocal(uniformes.uCamL.value.copy(camera.position));
      for (let i = 0; i < 6; i++) {
        const g = gigantes[i], A = uniformes.uGigA.value[i], B = uniformes.uGigB.value[i];
        if (!g || g.r <= 0) { B.set(0, 0, 0, 0); continue; }
        aux.copy(g.c).sub(cam); const dg = aux.length(), r = Math.asin(Math.min(0.99, g.r / dg));
        aux.divideScalar(dg); A.set(aux.x, aux.y, aux.z, Math.cos(Math.min(Math.PI, r * 1.5))); B.set(dg, r, 1, 0);
      }
    }
  };
}
