// La galaxia principal: núcleo, brazos espirales, cúmulos, gas rosado y polvo oscuro
import * as THREE from 'three';
import { radioPxDisco } from '../data/escalaCosmica.js';
import { Q } from '../util/dispositivo.js';
import { gauss, azar } from '../util/dibujo.js';
import { materialPuntos, puntosPorPasos } from './materiales.js';
import { deUnTiron } from '../util/azarSemilla.js';
import { texBrillo } from './texturas.js';
import { texturaPlaneta } from './fabricaTexturas.js';
import { vista } from '../util/vista.js';

const BRAZOS = 5, GIRO = 4.5, RADIO = 980;
const lerpH = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));

// Posición sobre un brazo: t de 0 (centro) a 1 (borde)
export function enBrazo(brazo, t, dispersion) {
  const rad = 60 + t * RADIO;
  const ang = (brazo / BRAZOS) * Math.PI * 2 + t * GIRO + dispersion;
  return { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad, rad };
}

// Se construye por tramos (construirGalaxia es un generador: index.js lo recorre cediendo entre tramos).
export const crearGalaxia = o => deUnTiron(construirGalaxia(o));
export function* construirGalaxia({ scene, renderer, uScale, uPR, uTamGalaxia }) {
  const grupo = new THREE.Group();
  scene.add(grupo);
  const col = new THREE.Color();
  const mats = []; let cercanos = null;
  const n = k => Math.round(k * Q.k);
  const INTENSIDAD = 1.3;

  // ── Absorción del disco: el polvo y el gas de la galaxia oscurecen lo que hay detrás, mucho en el
  // núcleo y cada vez menos hacia los brazos (una galaxia es translúcida: tras ella se adivina,
  // atenuado, lo que esté lejos, como el corazón de la supernova visto desde casa) ──
  const sombra = new THREE.Mesh(
    new THREE.CircleGeometry(1300, 128),
    new THREE.ShaderMaterial({
      uniforms: { uVis: { value: 1 } },
      vertexShader: `varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float uVis; varying vec2 vP;void main(){
        float r=length(vP)/1300.0;
        float a=0.78*(1.0-smoothstep(0.12,0.95,r))*uVis;
        gl_FragColor=vec4(vec3(0.03,0.0,0.025)*(1.0-r),a);
      }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    })
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.renderOrder = -1;
  grupo.add(sombra);

  // ── Gas: luz continua de los brazos ──
  // Sigue exactamente la misma espiral que las estrellas (BRAZOS, GIRO, RADIO), con
  // filamentos de ruido, carril de polvo en el borde interior y el degradado de color
  // de una galaxia real. El campo no cambia con el tiempo: se calcula UNA vez en una
  // textura con mipmaps y en cada cuadro solo se lee (antes: dos ruidos de tres octavas
  // por píxel y por cuadro). Lo que depende de la vista se sigue calculando en vivo.
  const LADO_GAS = 1150;
  const campoGas = /* glsl */`
    float h(vec2 p){ vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float rn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ v += a * rn(p); p = p * 2.07 + vec2(3.1, 1.7); a *= 0.5; } return v; }
    vec3 campoGas(vec2 vP){
      float r = length(vP);
      float t = clamp((r - 60.0) / ${RADIO.toFixed(1)}, 0.0, 1.2);
      // Fase respecto a la espiral; fract() elimina el salto de atan en ±π.
      float fase = atan(vP.y, vP.x) - t * ${GIRO.toFixed(2)};
      float u = fract(fase * ${BRAZOS.toFixed(1)} / 6.2831853), d = min(u, 1.0 - u);
      float ancho = 0.075 * (1.0 + t * 0.9);
      float brazo = exp(-d * d / (2.0 * ancho * ancho));
      float up = fract((fase + 0.13) * ${BRAZOS.toFixed(1)} / 6.2831853), dp = min(up, 1.0 - up);
      float polvo = exp(-dp * dp / 0.00097) * smoothstep(0.15, 0.3, t) * (1.0 - smoothstep(0.95, 1.1, t));
      float n1 = fbm(vP * 0.0045), n2 = fbm(vP * 0.017 + 7.0);
      float disco = exp(-r / 560.0) * (1.0 - smoothstep(900.0, ${LADO_GAS.toFixed(1)}, r));
      vec3 col = mix(vec3(1.0, 0.76, 0.58), vec3(1.0, 0.3, 0.62), smoothstep(0.05, 0.35, t));
      col = mix(col, vec3(0.6, 0.42, 1.0), smoothstep(0.55, 1.0, t));
      // Grumos y filamentos: el ruido se eleva al cuadrado para que haya zonas densas y huecos.
      float grumo = n1 * n1 * 2.2;
      float densidad = disco * (0.045 + brazo * (0.25 + grumo) * (0.65 + 0.7 * n2)) * (1.0 - polvo * 0.9);
      return col * densidad * 0.4 + vec3(1.0, 0.78, 0.66) * exp(-r / 150.0) * 0.22;
    }`;
  const texturaGas = new THREE.WebGLRenderTarget(1024, 1024, {
    type: renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
    generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false
  });
  {
    const horno = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `${campoGas}\n varying vec2 vUv; void main(){ gl_FragColor = vec4(campoGas((vUv * 2.0 - 1.0) * ${LADO_GAS.toFixed(1)}), 1.0); }`,
      depthTest: false, depthWrite: false
    }));
    const escenaHorno = new THREE.Scene(); escenaHorno.add(horno);
    const anterior = renderer.getRenderTarget();
    renderer.setRenderTarget(texturaGas); renderer.render(escenaHorno, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
    renderer.setRenderTarget(anterior);
    horno.geometry.dispose(); horno.material.dispose();
  }
  const gas = new THREE.Mesh(
    new THREE.CircleGeometry(LADO_GAS, 160),
    new THREE.ShaderMaterial({
      uniforms: { tGas: { value: texturaGas.texture }, uVis: { value: 1 } },
      vertexShader: /* glsl */`
        varying vec2 vP; varying float vCara, vDist;
        void main(){
          vP = position.xy;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vCara = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tGas; uniform float uVis;
        varying vec2 vP; varying float vCara, vDist;
        void main(){
          vec3 c = texture2D(tGas, vP / ${(2 * LADO_GAS).toFixed(1)} + 0.5).rgb;
          // Visto de canto el disco desaparece con suavidad; el volumen lo dan las estrellas.
          // Y de cerca se aparta: el gas es el brillo de lo lejano, cerca se distinguen las estrellas.
          gl_FragColor = vec4(c * smoothstep(0.04, 0.3, vCara) * smoothstep(120.0, 900.0, vDist) * uVis, 1.0);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
    })
  );
  gas.rotation.x = Math.PI / 2;      // plano XZ con z = y local: misma orientación que enBrazo()
  grupo.add(gas);

  // ── Estrellas del disco ──
  const matEstrellas = materialPuntos({ uScale, uPR, tam: uTamGalaxia, titileo: 0.12, silueta: true });
  mats.push(matEstrellas);
  const estrellas = yield* puntosPorPasos(n(72000), (i, p) => {
    const enDisco = Math.random() < 0.12;    // pocas estrellas entre brazos, para que se noten los espacios oscuros
    const t = Math.pow(Math.random(), 0.55);
    let x, z, rad;
    if (enDisco) {
      rad = 60 + Math.pow(Math.random(), 0.8) * RADIO * 1.05;
      const a = Math.random() * Math.PI * 2;
      x = Math.cos(a) * rad; z = Math.sin(a) * rad;
    } else {
      ({ x, z, rad } = enBrazo(i % BRAZOS, t, gauss() * 0.12 * (1 + t * 0.9)));
    }
    p.x = x; p.z = z;
    p.y = gauss() * 16 * Math.exp(-rad / 420);
    const nt = rad / 1050, joven = !enDisco && Math.random() < 0.07;
    if (joven) col.setHSL(0.6 + Math.random() * 0.05, 0.7, 0.82);                       // estrellas jóvenes azuladas
    else if (nt < 0.12) col.setHSL(0.07, 0.45, 0.82 + Math.random() * 0.12);              // centro cálido
    else if (nt < 0.32) col.setHSL(0.93 + Math.random() * 0.04, 0.95, 0.7 + Math.random() * 0.14);
    else if (nt < 0.62) col.setHSL(0.95 + Math.random() * 0.04, 1.0, 0.58 + Math.random() * 0.15);
    else col.setHSL(0.88 + Math.random() * 0.08, 1.0, 0.52 + Math.random() * 0.16);
    const atenuar = enDisco ? 0.4 : INTENSIDAD;
    p.r = col.r * atenuar; p.g = col.g * atenuar; p.b = col.b * atenuar;
    p.s = Math.random() < 0.012 ? azar(5, 7) : azar(2.4, 4.4);
  });
  grupo.add(new THREE.Points(estrellas, matEstrellas));

  // ── Bulbo central dorado-rosado ──
  const matBulbo = materialPuntos({ uScale, uPR, tam: uTamGalaxia, titileo: 0.1, opacidad: 0.9, silueta: true });
  mats.push(matBulbo);
  grupo.add(new THREE.Points(yield* puntosPorPasos(n(14000), (i, p) => {
    const r = 75 + Math.pow(Math.random(), 1.5) * 230;
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    p.x = r * Math.sin(ph) * Math.cos(th);
    p.y = r * Math.cos(ph) * 0.42;
    p.z = r * Math.sin(ph) * Math.sin(th);
    col.setHSL(azar(0.03, 0.1), 0.7, azar(0.66, 0.86));
    p.r = col.r; p.g = col.g; p.b = col.b;
    p.s = azar(2.6, 4.8);
  }), matBulbo));

  // ── Rieles brillantes de los brazos (el trazo característico del original, ahora más suave) ──
  const matRieles = materialPuntos({ uScale, uPR, tam: uTamGalaxia, titileo: 0.25, opacidad: 0.85, silueta: true });
  mats.push(matRieles);
  const nR = n(11000);
  grupo.add(new THREE.Points(yield* puntosPorPasos(nR, (i, p) => {
    // Columna brillante de cada brazo: sigue exactamente la misma espiral que las estrellas
    const t = 0.04 + (i / nR) * 0.96, c = enBrazo(i % BRAZOS, t, gauss() * 0.018);
    p.x = c.x; p.y = gauss() * 2.5; p.z = c.z;
    col.setHSL(0.94 + Math.random() * 0.04, 0.7, 0.8 + Math.random() * 0.12);
    p.r = col.r; p.g = col.g; p.b = col.b;
    p.s = azar(2.6, 4.2);
  }), matRieles));

  yield;
  // Ruido a lo largo del brazo: crea filamentos y grumos naturales en vez de una franja uniforme
  const ruido = (t, b, d) =>
    0.5 + 0.25 * Math.sin(t * 37 + b * 2.1 + d * 9) + 0.25 * Math.sin(t * 91 + b * 5.3 - d * 13);
  function puntoFilamento(b, dispersionBase, tMin = 0) {
    for (let intento = 0; intento < 5; intento++) {
      const t = tMin + Math.pow(Math.random(), 0.6) * (1 - tMin);
      const d = gauss() * dispersionBase * (1 + t * 1.2);
      const r = ruido(t, b, d);
      if (Math.random() < r * r || intento === 4) return { ...enBrazo(b, t, d), t, r };
    }
  }

  // ── Resplandor de los brazos: decenas de miles de estrellas diminutas y tenues ──
  // Juntas forman la luz suave y continua de una galaxia real (sin manchas ni burbujas)
  const matResplandor = materialPuntos({ uScale, uPR, tam: uTamGalaxia, maximo: 5, titileo: 0, opacidad: 1, silueta: true });
  mats.push(matResplandor);
  grupo.add(new THREE.Points(yield* puntosPorPasos(n(28000), (i, p) => {
    const b = i % BRAZOS, c = puntoFilamento(b, 0.11);
    p.x = c.x; p.z = c.z;
    p.y = gauss() * 9 * Math.exp(-c.rad / 500);
    // Degradado de color como en las galaxias reales: centro dorado, brazos rosa intenso, bordes violeta-azul
    const nt = c.rad / 1050;
    if (nt < 0.18) col.setHSL(0.06 + nt * 0.3, 0.75, 0.6);
    else if (nt < 0.6) col.setHSL(azar(0.93, 0.98), 0.95, 0.56);
    else col.setHSL(lerpH(0.92, 0.76, (nt - 0.6) / 0.4) + azar(-0.02, 0.02), 0.9, 0.58);
    const k = 0.2 + 0.22 * c.r;
    p.r = col.r * k; p.g = col.g * k; p.b = col.b * k;
    p.s = azar(3, 5);
  }), matResplandor));

  // ── Regiones de estrellas nuevas: puntitos rosados finos a lo largo de los brazos ──
  const matCumulos = materialPuntos({ uScale, uPR, tam: uTamGalaxia, titileo: 0.2, opacidad: 0.85, silueta: true });
  mats.push(matCumulos);
  const cumulos = [];
  for (let c = 0; c < 220; c++) {
    const centro = puntoFilamento(c % BRAZOS, 0.045, 0.12);
    cumulos.push({ ...centro, azul: Math.random() < 0.3 });
  }
  const porCumulo = Math.max(8, Math.round(14 * Q.k));
  grupo.add(new THREE.Points(yield* puntosPorPasos(cumulos.length * porCumulo, (i, p) => {
    const c = cumulos[Math.floor(i / porCumulo)];
    p.x = c.x + gauss() * 5; p.y = gauss() * 2.5; p.z = c.z + gauss() * 5;
    if (c.azul) col.setHSL(0.6, 0.7, azar(0.78, 0.92));
    else col.setHSL(azar(0.93, 0.97), 1, azar(0.68, 0.82));
    p.r = col.r; p.g = col.g; p.b = col.b;
    p.s = azar(1.8, 3.2);
  }), matCumulos));

  yield;
  // Resplandor suave del centro (degradado limpio, sin forma de nube)
  const brilloCentro = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texBrillo(), color: 0xffa0c8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2
  }));
  brilloCentro.scale.set(520, 520, 1);
  grupo.add(brilloCentro);

  // ── Polvo oscuro: filamentos finos en el borde interior de cada brazo ──
  const matPolvo = materialPuntos({ uScale, uPR, tam: uTamGalaxia, maximo: 9, aditivo: false, opacidad: 0.55, titileo: 0 });
  mats.push(matPolvo);
  const polvo = new THREE.Points(yield* puntosPorPasos(n(16000), (i, p) => {
    const b = i % BRAZOS, t = azar(0.18, 0.95), d = -0.13 + gauss() * 0.03;
    const r = ruido(t, b, d * 3);
    const c = enBrazo(b, t, d);
    p.x = c.x; p.y = gauss() * 3; p.z = c.z;
    p.r = 0.03; p.g = 0.0; p.b = 0.025;
    p.s = azar(4, 8) * (0.6 + r * 0.6);
  }), matPolvo);
  polvo.renderOrder = 2;
  grupo.add(polvo);

  // ── Vista de lejos: desde el cuásar, el corazón o cualquier destino lejano la galaxia sigue
  // ahí, en 3D: miles de estrellas en sus mismos brazos (con el grosor del disco), un bulbo dorado
  // y su resplandor difuso. Sus estrellas de verdad no llegarían ni a un píxel; esta versión
  // conserva su forma y sus colores, gira con ella y al acercarse se funde con la de verdad.
  const lejos = new THREE.Group(); lejos.visible = false; grupo.add(lejos);
  const N_LEJOS = 6500, LUZ_LEJOS = 0.334, DISCO_LEJOS = 0.48, BULBO_LEJOS = 0.25;
  let flujoPuntosLejos = 0;   // igual en PC y móvil: la misma galaxia
  const uLejos = { uOp: { value: 0 }, uPR };
  {
    const N = N_LEJOS, pos = new Float32Array(N * 3), colr = new Float32Array(N * 3), tam = new Float32Array(N);
    const rosa = new THREE.Color('#ff7fb8'), lila = new THREE.Color('#b78cff'), azul = new THREE.Color('#9fc4ff'), oro = new THREE.Color('#ffd9a0'), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      if (i % 1000 === 999) yield;
      // Bulbo esferoidal (no aplanado), halo tenue y disco con espesor: de canto sigue siendo una
      // galaxia (línea brillante del disco con su bulbo y su halo), no un trazo que desaparece.
      // Bulbo con menos puntos y más ancho: antes concentraba el 18 % en un núcleo diminuto (pico de luz 3×).
      const bulbo = i < N * 0.1, halo = !bulbo && i < N * 0.16;
      let x, y, z;
      if (bulbo) { const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.abs(gauss()) * 200); x = v.x; z = v.z; y = v.y * 0.75; c.copy(oro).lerp(new THREE.Color('#fff4e0'), Math.random() * 0.6); }
      else if (halo) { const v = new THREE.Vector3().randomDirection().multiplyScalar(RADIO * Math.pow(Math.random(), 0.6) * 1.15); x = v.x; z = v.z; y = v.y * 0.6; c.copy(oro).lerp(lila, 0.4).multiplyScalar(0.45); }
      else { const t = Math.pow(Math.random(), 0.8), p = enBrazo(i % BRAZOS, t, gauss() * (0.12 + t * 0.1)); x = p.x; z = p.z; y = gauss() * 30 * (1 - t * 0.4);
        c.copy(rosa).lerp(lila, Math.random()).lerp(azul, Math.random() < 0.15 ? 0.7 : 0); if (Math.random() < 0.08) c.copy(oro); }
      pos.set([x, y, z], i * 3); colr.set([c.r, c.g, c.b], i * 3); tam[i] = (bulbo ? 1.6 : 1.1) + Math.random() * 1.4;
      flujoPuntosLejos += (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) * 0.0719 * tam[i] * tam[i];   // perfil al cuadrado (sin premultiplicar): 0,0719·tamaño²
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(colr, 3)); g.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
    const puntosLejos = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: uLejos,
      vertexShader: 'attribute vec3 aColor; attribute float aTam; uniform float uOp, uPR; varying vec3 vC; void main(){ vC = aColor * uOp; gl_PointSize = aTam * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(max(1.0 - d * 2.0, 0.0), 1.6); gl_FragColor = vec4(vC * a, a); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    puntosLejos.frustumCulled = false; puntosLejos.renderOrder = 2; lejos.add(puntosLejos);
  }
  const texLejos = texturaPlaneta('galaxia', { tipo: 'espiral', semilla: 8, brazos: BRAZOS, enrollado: GIRO, paleta: 'rosa', ancho: 512, alto: 512 }, { relleno: [0, 0, 0], bloquea: false });   // solo se ve de lejos: sin hacer esperar la entrada
  const discoLejos = new THREE.Mesh(new THREE.PlaneGeometry(RADIO * 2.5, RADIO * 2.5), new THREE.MeshBasicMaterial({ map: texLejos, color: new THREE.Color(1.3, 0.9, 1.15), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  discoLejos.rotation.x = -Math.PI / 2; discoLejos.renderOrder = 1; lejos.add(discoLejos);
  const bulboLejos = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo(), color: '#ffe2b8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  bulboLejos.scale.setScalar(RADIO * 0.7); lejos.add(bulboLejos);
  const opBase = [];
  yield;
  // Luz no resuelta de Xiomara: cuando ocupa unos pocos píxeles es un punto con el MISMO flujo que su
  // versión lejana (disco + bulbo + puntos, calculado con sus texturas reales) y se funde con ella.
  const gPunto = new THREE.BufferGeometry(); gPunto.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const uPunto = { uI: { value: 0 }, uPR }, TAM_PUNTO = 3.0;
  const puntoLuz = new THREE.Points(gPunto, new THREE.ShaderMaterial({ uniforms: uPunto,
    vertexShader: `uniform float uPR; void main(){ gl_PointSize = ${TAM_PUNTO.toFixed(1)} * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: 'uniform float uI; void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(max(1.0 - d * 2.0, 0.0), 1.6) * uI; gl_FragColor = vec4(vec3(1.0, 0.78, 0.92) * a, a); }',
    transparent: true, premultipliedAlpha: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  puntoLuz.frustumCulled = false; puntoLuz.visible = false; grupo.add(puntoLuz);
  yield;
  // Su halo rosado de lejos (licencia, para reconocerla entre las demás): un brillo suave y estable de
  // tamaño fijo en pantalla alrededor de su luz no resuelta; desde cualquier gigante se la encuentra.
  const uHalo = { uI: { value: 0 }, uPR };
  const haloLuz = new THREE.Points(gPunto, new THREE.ShaderMaterial({ uniforms: uHalo,
    vertexShader: 'uniform float uPR; void main(){ gl_PointSize = 34.0 * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uI; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = (exp(-d * d * 9.0) * 0.8 + exp(-d * 3.0) * 0.2) * max(1.0 - d, 0.0) * uI; gl_FragColor = vec4(vec3(1.0, 0.55, 0.8) * a, a); }',
    transparent: true, premultipliedAlpha: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  haloLuz.frustumCulled = false; haloLuz.visible = false; grupo.add(haloLuz);
  const mediaTextura = (t, porDefecto) => { try { const d = t.image?.data || t.image?.getContext?.('2d')?.getImageData(0, 0, t.image.width, t.image.height).data; if (!d) return porDefecto; let s = 0; for (let j = 0; j < d.length; j += 4) s += (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) * d[j + 3] / 255; const m = s / (d.length / 4) / 255; return m > 1e-4 ? m : porDefecto; } catch { return porDefecto; } };
  let mDisco = null, mBulbo = null; const ejeGalaxia = new THREE.Vector3(), haciaCam = new THREE.Vector3();

  const titileos = mats.map(m => m.uniforms.uTw.value);
  return {
    grupo,
    partesLejos: { puntos: lejos.children.find(o => o.isPoints), disco: discoLejos, bulbo: bulboLejos, grupo: lejos },   // diagnóstico (pruebas de identidad y luz)
    // Punto de un brazo (en el mundo, girando con la galaxia): ahí está nuestro sistema solar.
    puntoBrazo(brazo = 1, t = 0.62) { const { x, z } = enBrazo(brazo, t, 0); grupo.updateMatrixWorld(); return grupo.localToWorld(new THREE.Vector3(x, 0, z)); },
    actualizar(t, dt, { camera }) {
      grupo.rotation.y = t * 0.022;
      // Una galaxia no resuelta integra la luz de sus estrellas: no titila entera.
      const resuelto=1-THREE.MathUtils.smoothstep(camera.position.length(),6000,60000);
      mats.forEach((m,i)=>{m.uniforms.uTime.value=t;m.uniforms.uTw.value=titileos[i]*resuelto;});
      // La misma galaxia, con su tamaño y su orientación reales (gira con ella; nunca se inclina
      // hacia quien mira). El paso de la versión cercana a la lejana depende de su TAMAÑO EN
      // PANTALLA (radio proyectado 85 → 30 px, el mismo criterio que las demás galaxias), no de
      // la distancia: en un móvil y en un PC el cambio ocurre cuando se ve igual de grande. Todo
      // lo lejano (puntos, disco, bulbo) comparte ese fundido. Disco y bulbo son superficies: su
      // luz total ya crece con el área que ocupan. Los puntos tienen tamaño fijo en píxeles, así
      // que cada uno lleva la parte de luz que le toca por área (sin suelo: si la galaxia ocupa
      // poco, da poca luz, como debe).
      const d = camera.position.length(), focal = vista.alto / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      const radioPx = radioPxDisco(RADIO, Math.max(1, d), focal), paso = 1 - THREE.MathUtils.smoothstep(radioPx, 30, 85);
      for (let i = 0; i < mats.length; i++) { const u = mats[i].uniforms?.uOp; if (u) { opBase[i] ??= u.value; u.value = opBase[i] * (1 - paso); } }
      // TODA la galaxia cercana se funde a la vez (antes el gas, el resplandor del centro y el disco
      // de absorción se quedaban y sumaban luz a la versión lejana: un 52 % de más).
      gas.material.uniforms.uVis.value = sombra.material.uniforms.uVis.value = 1 - paso; brilloCentro.material.opacity = 0.2 * (1 - paso);
      gas.visible = sombra.visible = brilloCentro.visible = paso < 0.995;
      // Las estrellas de la galaxia cercana (150 000 puntos) también dejan de dibujarse ya fundidas: antes seguían en la
      // GPU con opacidad 0 desde cualquier gigante (en un iPhone, una parte grande de cada cuadro sin que se viera nada).
      cercanos ??= (() => { const l = []; grupo.traverse(o => { if (o.material && mats.includes(o.material)) l.push(o); }); return l; })();
      for (const o of cercanos) o.visible = paso < 0.995;
      lejos.visible = paso > 0.005;
      // LUZ_LEJOS: ganancia medida para que la versión lejana tenga la misma luz por área que la
      // galaxia de verdad (tests/navegador/xiomara.mjs); antes sumaba 3,2 veces más.
      // Por debajo de ~4 px de radio, la versión lejana pasa a ser una luz no resuelta con su mismo flujo.
      const noResuelta = 1 - THREE.MathUtils.smoothstep(radioPx, 1.5, 4);
      const area = Math.min(1, Math.PI * radioPx * radioPx / (N_LEJOS * 1.2));
      uLejos.uOp.value = paso * LUZ_LEJOS * area * (1 - noResuelta);
      // El disco compensa su inclinación (la luz total de un disco transparente no depende de ella):
      // de canto se ve estrecho pero no se apaga.
      ejeGalaxia.set(0, 1, 0).applyQuaternion(grupo.getWorldQuaternion(new THREE.Quaternion()));
      const coseno = Math.max(0.12, Math.abs(ejeGalaxia.dot(haciaCam.copy(camera.position).normalize())));
      // Bulbo más suave y disco algo más luminoso (misma luz total): de lejos se leía como un punto muy
      // brillante con un disco tenue (pico 3× el de las demás galaxias), no como una espiral.
      discoLejos.material.opacity = Math.min(1, paso * DISCO_LEJOS * LUZ_LEJOS * (1 - noResuelta) / coseno); bulboLejos.material.opacity = paso * BULBO_LEJOS * LUZ_LEJOS * (1 - noResuelta);
      puntoLuz.visible = noResuelta > 0.001;
      if (puntoLuz.visible) {
        mDisco ??= mediaTextura(texLejos, null); mBulbo ??= mediaTextura(bulboLejos.material.map, null);
        const flujo = (mDisco ?? 0.06) * 0.997 * DISCO_LEJOS * LUZ_LEJOS * Math.pow(2.5 * radioPx, 2)
          + (mBulbo ?? 0.12) * 0.91 * BULBO_LEJOS * LUZ_LEJOS * Math.pow(0.7 * radioPx, 2)
          + flujoPuntosLejos * LUZ_LEJOS * Math.min(1, Math.PI * radioPx * radioPx / (N_LEJOS * 1.2));
        // Por debajo de 1,5 px, la misma compresión perceptiva que las demás galaxias lejanas
        // (campoGalaxias.js, GAMMA_LUZ 0,5) y un mínimo: nunca se pierde en el cielo.
        const comprime = Math.max(1, 1.5 / Math.max(radioPx, 0.02));
        uPunto.uI.value = paso * noResuelta * Math.max(0.9, flujo * comprime / (0.1678 * TAM_PUNTO * TAM_PUNTO));
      }
      const kHalo = 1 - THREE.MathUtils.smoothstep(radioPx, 1, 3);
      haloLuz.visible = kHalo > 0.001; uHalo.uI.value = 1.1 * kHalo;
      // Su luz se dibuja después del gas lejano (nebulosas): ninguna caja de volumen la oculta.
      puntoLuz.renderOrder = haloLuz.renderOrder = 4;
    }
  };
}
