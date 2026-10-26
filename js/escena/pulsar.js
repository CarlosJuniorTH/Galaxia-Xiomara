// El púlsar del Cangrejo («El corazón que late por ti»): una estrella de neutrones que GIRA y EMITE, como una joya. Todo
// nítido (nada de halos ni humo): la estrella, pequeña, opaca y cegadora; su magnetosfera, un toro de plasma de hebras finas
// (detalle horneado en una imagen en la carga y solo muestreado en cada cuadro, como el remolino del cuásar); el faro, dos
// haces finos que al barrer encienden el polvo que atraviesan. Ligero: ~6 mallas, ~5600 motas y ~200 hilos, 60 FPS en móvil.
//
// Física (y coherencia):
//  · `giro`: su eje de giro (y local). `rotor` gira alrededor de él y lleva `magnetico`, el eje magnético, inclinado
//    `inclinacion` grados; la estrella (con sus casquetes polares calientes) y los DOS haces opuestos van en `magnetico`,
//    así que giran juntos, como un faro: cada haz barre un cono alrededor del eje de giro. Nada quieto en los polos.
//  · El toro de plasma y las ondas que se alejan por el ecuador del giro (el anillo interior, el toro y los «wisps» de las
//    imágenes de rayos X del Cangrejo); el polvo de alrededor solo se ve cuando el faro lo barre.
//  · Dormido (su estado de siempre, fuera de su escena): estrella tibia, toro casi apagado, sin haces. En su escena despierta
//    con la canción (js/util/escenaPulsar.js) y queda despierto mientras se le mira.
// Ejes: `giro` coincide con el marco del director de cámara (js/util/directorCamara.js): y = eje Y del universo (el eje de
// giro), z = hacia casa (en horizontal), x = derecha; azimut 0 hacia casa, creciendo hacia la derecha (x = sen az,
// z = cos az). Fase: ψ es el azimut del haz de arriba. Al empezar la escena, mientras la estrella aún no se ve girar (sin
// casquetes ni haces, 1,4 s), la fase se lleva a la de la canción: desde ahí el haz de arriba está en el azimut
// 360°·vueltas(s) en cada visita, el mismo que usa la pista de cámara (ESCENA_PULSAR.camara).
import * as THREE from 'three';
import { EXPOSICION } from './exposicion.js';
import { nivelSeguro, esMovil } from '../util/dispositivo.js';
import { ESCENA_PULSAR, vueltasPulsar } from '../util/escenaPulsar.js';

export const PULSAR = Object.freeze({ estrella: 34, haz: 4400, toro: 880, nebulosa: [3000, 2300, 2400] });
const DORMIDO = ESCENA_PULSAR.giros[0][1];   // vueltas por pulso dormido

function azarCon(semilla) { let s = semilla >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; }

// Mota redonda con núcleo, nítida, sin cola difusa (sin discard: mejor para las GPU de teselas del móvil).
const FRAG_MOTA = /* glsl */`varying vec3 vC; varying float vA;
  void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(max(1.0 - d * 2.0, 0.0), 1.6) + (1.0 - smoothstep(0.0, 0.18, d)) * 0.8;
    gl_FragColor = vec4(vC * a * vA, 1.0); }`;
const FRAG_HILO = /* glsl */`varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC * vA, 1.0); }`;
const material = (uniforms, vertexShader, fragmentShader) => new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

// Tamaño en píxeles de una mota de `tam` unidades locales (las que quedan por debajo de 1,5 px se reparten en 1,5 px con
// menos luz) y cono de la silueta: delante de la estrella, en la línea de la cámara, no hay luz (la estrella se ve limpia).
const ESPACIO = /* glsl */`
  float tamMota(float tam, vec4 mv, float maximo){ float px = tam * length(modelViewMatrix[0].xyz) * uScale / max(1.0, -mv.z);
    gl_PointSize = clamp(px, 1.5, maximo * uPR); return min(1.0, px * px / 2.25); }
  float fueraSilueta(vec4 mv){ vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float dc = max(length(c), 1.0); vec3 eje = c / dc;
    float t = dot(mv.xyz, eje), r = uSilueta * length(modelViewMatrix[0].xyz) * t / dc;
    return 1.0 - step(t, dc) * step(0.0, t) * (1.0 - smoothstep(r * 0.8, r * 1.2, length(mv.xyz - eje * t))); }
  // Al alejarse, lo que mide «tam» unidades se junta en pocos píxeles: su luz se reparte (no se amontona en un borrón).
  float junto(float tam){ float c = -(modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z; return clamp(tam * length(modelViewMatrix[0].xyz) * uScale / max(1.0, c) / 420.0, 0.12, 1.0); }`;

export function* construirPulsar({ uScale, uPR, config = ESCENA_PULSAR }) {
  const azar = azarCon(1054), R = PULSAR.estrella, L = PULSAR.haz, [NX, NY, NZ] = PULSAR.nebulosa;
  const alfa = THREE.MathUtils.degToRad(config.inclinacion);
  const grupo = new THREE.Group(); grupo.name = 'Púlsar';
  const giro = new THREE.Group(), rotor = new THREE.Group(), magnetico = new THREE.Group();
  magnetico.rotation.z = -alfa;   // el eje magnético (y de `magnetico`) se inclina hacia +x; rotor.rotation.y = ψ − 90°: haz de arriba en (sen α sen ψ, cos α, sen α cos ψ)
  grupo.add(giro); giro.add(rotor); rotor.add(magnetico);

  // ── La estrella de neutrones: opaca y pequeña. Superficie con grano (se le ve girar) y dos casquetes calientes en los
  // polos magnéticos, de borde nítido, con un anillo fino alrededor. Dormida, tibia y lisa. ──
  const uE = { uCalor: { value: 0.45 }, uCasquetes: { value: 0 }, uPulso: { value: 0 }, uTibio: { value: 0 }, uDestello: { value: 0 } };
  const estrella = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), new THREE.ShaderMaterial({
    uniforms: uE,
    vertexShader: /* glsl */`varying vec3 vN, vP, vV; void main(){ vP = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform float uCalor, uCasquetes, uPulso, uTibio, uDestello; varying vec3 vN, vP, vV;
      float h3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      float rn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){ float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float grano = mix(0.5, rn3(vP * 9.0) * 0.6 + rn3(vP * 23.0) * 0.4, uCasquetes);
        vec3 base = mix(vec3(0.22, 0.36, 1.0), vec3(0.72, 0.84, 1.0), mu) * (0.45 + 0.65 * mu) * (0.8 + 0.4 * grano);
        float y = abs(vP.y), polo = smoothstep(0.86, 0.88, y), anillo = smoothstep(0.78, 0.795, y) * (1.0 - smoothstep(0.81, 0.825, y));
        vec3 caliente = mix(vec3(1.0, 0.98, 1.0), vec3(1.0, 0.82, 0.9), uTibio * 0.6);
        float borde = smoothstep(0.08, 0.16, mu) * (1.0 - smoothstep(0.2, 0.3, mu));
        vec3 c = base * uCalor * (1.0 + 0.7 * uPulso) + vec3(0.7, 0.8, 1.0) * borde * 0.5 * uCalor + caliente * (polo * 4.0 + anillo * 1.4) * uCasquetes * (1.0 + 0.8 * uPulso) + vec3(0.9, 0.95, 1.0) * uDestello * (0.4 + 0.6 * mu);
        gl_FragColor = vec4(c * 1.15, 1.0); }`
  }));
  magnetico.add(estrella);

  // ── Destello: cuatro rayos finos (1 px) en la pantalla cuando un haz apunta a la cámara y con cada latido ──
  const uD = { uLargo: { value: 0 }, uLuz: { value: 0 } };
  {
    const dirs = [], t = [];
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.2; for (const v of [0, 1]) { dirs.push(Math.cos(a), Math.sin(a)); t.push(v); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(8 * 3).fill(0), 3));
    g.setAttribute('aDir', new THREE.Float32BufferAttribute(dirs, 2)); g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
    var destello = new THREE.LineSegments(g, material(uD, /* glsl */`uniform float uLargo, uLuz; attribute vec2 aDir; attribute float aT; varying vec3 vC; varying float vA;
      void main(){ vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); float k = length(modelViewMatrix[0].xyz);
        gl_Position = projectionMatrix * (c + vec4(aDir * aT * uLargo * k, 0.0, 0.0)); vC = vec3(0.9, 0.95, 1.0); vA = pow(1.0 - aT, 1.5) * uLuz; }`, FRAG_HILO));
    destello.frustumCulled = false; grupo.add(destello);
  }
  yield;

  // ── Los dos haces (en `magnetico`, a lo largo de ±y): un hilo fino por haz en su eje, que nace en el polo, y 1500 motas
  // por haz en un cono de 1,1° (más juntas cerca de la estrella) que salen por él. Cada pulso de la canción lanza un paquete de luz que recorre el haz hacia fuera. ──
  const uH = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uLargo: { value: 0 }, uPaquete: { value: 0 }, uEdad: { value: 9 }, uPulsoDur: { value: config.pulso }, uFlujo: { value: 0 }, uTibio: { value: 0 } };
  const HAZ_VS = /* glsl */`uniform float uScale, uPR, uExpo, uLuz, uLargo, uPaquete, uEdad, uPulsoDur, uFlujo, uTibio;`;
  const luzHaz = /* glsl */`
    float luzEn(float u){ float nace = 1.0 - smoothstep(uLargo - 0.02, uLargo, u);
      float paquete = exp(-pow((u - uEdad / uPulsoDur * 0.95) * 11.0, 2.0)) * uPaquete;
      return (uLuz * pow(1.0 - u, 1.25) + paquete * 1.8 * (1.0 - 0.6 * u)) * smoothstep(0.0, 0.015, u) * nace; }
    vec3 colorHaz(float u){ return mix(vec3(0.78, 0.88, 1.0), vec3(1.0, 0.8, 0.9), uTibio * (0.3 + 0.5 * u)); }`;
  {
    const SEG = 48, dirs = [[0, 0, 1]];
    const pos = [], dato = [];
    for (const lado of [1, -1]) for (const [a, th, luz] of dirs) {
      const d = new THREE.Vector3(Math.sin(th) * Math.cos(a), Math.cos(th) * lado, Math.sin(th) * Math.sin(a));
      for (let i = 0; i < SEG; i++) for (const u of [i / SEG, (i + 1) / SEG]) { const r = R * 1.02 + (L - R) * u; pos.push(d.x * r, d.y * r, d.z * r); dato.push(u, luz); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aDato', new THREE.Float32BufferAttribute(dato, 2));
    var hilosHaz = new THREE.LineSegments(g, material(uH, /* glsl */`${HAZ_VS} attribute vec2 aDato; varying vec3 vC; varying float vA; ${luzHaz}
      void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vC = colorHaz(aDato.x); vA = luzEn(aDato.x) * aDato.y * 1.5 * uExpo; }`, FRAG_HILO));
    hilosHaz.frustumCulled = false; hilosHaz.name = 'hacesPulsar'; magnetico.add(hilosHaz);
  }
  {
    const N = 1400, dato = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) dato.set([azar(), azar(), i % 2 ? 1 : -1], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dato, 3));
    var motasHaz = new THREE.Points(g, material({ ...uH, uSilueta: { value: 0 } }, /* glsl */`${HAZ_VS} uniform float uSilueta; varying vec3 vC; varying float vA; ${ESPACIO} ${luzHaz}
      void main(){ float f = fract(position.x + uFlujo * (0.8 + 0.4 * position.y)), u = f * f, r = ${(R * 1.1).toFixed(1)} + u * ${(L - R * 1.1).toFixed(1)};
        float a = position.y * 6.2832 + position.x * 40.0, th = 0.02 * sqrt(fract(position.x * 7.31 + position.y * 3.7));
        vec4 mv = modelViewMatrix * vec4(cos(a) * sin(th) * r, position.z * cos(th) * r, sin(a) * sin(th) * r, 1.0); gl_Position = projectionMatrix * mv;
        vC = colorHaz(u); vA = luzEn(u) * 1.1 * tamMota(10.0 + position.y * 10.0, mv, 2.8) * uExpo; }`, FRAG_MOTA));
    motasHaz.frustumCulled = false; magnetico.add(motasHaz);
  }
  yield;

  // ── Magnetosfera: el toro de plasma del ecuador (como en las imágenes de Chandra del Cangrejo y de Vela): un anillo interior
  // fino y brillante y un toro de HEBRAS finas (circunferencias onduladas, con nudos) que giran. El detalle
  // se HORNEA una vez en la carga en una imagen (hornear, desde cosmos.js → index.js, como el remolino del cuásar) y en cada
  // cuadro solo se muestrea: tres láminas (la central y dos tenues, solo con el núcleo del toro) dan el grosor del toro (las de fuera, solo su núcleo) con
  // paralaje. En los golpes de la canción una onda de luz recorre el toro de dentro afuera y salen ondas finas del ecuador
  // (los «wisps» del Cangrejo, que de verdad se alejan del púlsar). Nada de humo: hebras de un píxel con huecos oscuros. ──
  const RT = PULSAR.toro, LADO = nivelSeguro ? 1024 : esMovil ? 1536 : 2048;
  const rtToro = new THREE.WebGLRenderTarget(LADO, LADO, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const texToro = rtToro.texture; texToro.colorSpace = THREE.NoColorSpace; texToro.anisotropy = 8;
  const RUIDO = /* glsl */`
    float h3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float rn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm3(vec3 p){ return rn3(p) * 0.55 + rn3(p * 2.03 + 7.1) * 0.3 + rn3(p * 4.1 + 3.7) * 0.15; }`;
  // La imagen horneada, en coordenadas polares dentro del cuadrado: rgb = color × luz de las hebras, a = densidad (0–1).
  const FRAG_TORO = /* glsl */`varying vec2 vP; ${RUIDO}
    void main(){ float r = length(vP), a = atan(vP.y, vP.x); vec2 c = vec2(cos(a), sin(a));
      // Las hebras: muchas circunferencias finas, onduladas por un ruido suave (sin costura: el ángulo entra como cos/sin).
      // Forma ORGÁNICA, como el toro de rayos X del Cangrejo: su radio y su grosor cambian con el ángulo (bultos, un lado más
      // gordo), y sus hebras no son aros: dos familias de espirales suaves que se cruzan (una sube y otra baja en ángulo),
      // onduladas, rotas en arcos irregulares, con nudos blancos donde se cruzan.
      float bulto = fbm3(vec3(c * 1.6, 0.5)), grueso = fbm3(vec3(c * 2.3 + 4.0, 1.5));
      float r0 = 0.47 + 0.09 * (bulto - 0.5) * 2.0, anchoT = 0.11 + 0.1 * grueso;
      float w = fbm3(vec3(c * 2.0, r * 2.5)), w2 = fbm3(vec3(c * 5.0 + 9.0, r * 6.0));
      float fA = r * 26.0 + a * 0.477 + w * 2.4 + w2 * 0.35, fB = r * 21.0 - a * 0.318 + w * 1.9 - w2 * 0.3;   // 3 y −2 vueltas por giro
      float hA = pow(0.5 + 0.5 * cos(fA * 6.2832), 9.0), hB = pow(0.5 + 0.5 * cos(fB * 6.2832), 11.0);
      float arcosA = smoothstep(0.42, 0.7, fbm3(vec3(c * 3.4, r * 5.0 + 1.0))), arcosB = smoothstep(0.42, 0.7, fbm3(vec3(c * 2.7 + 2.0, r * 4.0 + 7.0)));
      float hebras = hA * arcosA + hB * arcosB * 0.85, cruce = hA * hB * arcosA * arcosB;
      float toro = exp(-pow((r - r0) / anchoT, 2.0));
      // Anillo interior: fino pero roto en arcos, algo excéntrico y con nudos (no un aro limpio).
      float rI = 0.2 + 0.012 * sin(a * 2.0 + 1.3) + 0.008 * (w - 0.5);
      float arcI = smoothstep(0.3, 0.62, fbm3(vec3(c * 4.0, 3.0)));
      float interior = exp(-pow((r - rI) / 0.01, 2.0)) * (0.25 + 1.3 * arcI) + exp(-pow((r - rI - 0.03) / 0.008, 2.0)) * 0.5 * arcI * hA;
      float nudos = pow(smoothstep(0.55, 0.95, fbm3(vec3(c * 9.0, r * 14.0 + 5.0))), 2.0);
      float luz = interior + toro * (hebras * 1.25 + cruce * 1.6 + nudos * 0.9 * (arcosA + arcosB) * 0.5);
      luz *= (1.0 - smoothstep(0.86, 0.96, r)) * smoothstep(0.17, 0.19, r);
      vec3 col = mix(vec3(0.85, 0.95, 1.0), mix(vec3(0.32, 0.64, 1.0), vec3(0.62, 0.46, 1.0), smoothstep(r0 - 0.05, r0 + 0.2, r)), smoothstep(0.22, 0.3, r));
      col = mix(col, vec3(1.0), clamp(nudos * 0.6 + cruce, 0.0, 1.0));
      gl_FragColor = vec4(col * luz, clamp(toro + interior * 0.3, 0.0, 1.0)); }`;
  function hornear(renderer) {
    const m = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FRAG_TORO, depthTest: false, depthWrite: false });
    const sc = new THREE.Scene(), malla = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); sc.add(malla);
    const previo = renderer.getRenderTarget(), ac = renderer.autoClear;
    renderer.setRenderTarget(rtToro); renderer.setClearColor(0x000000, 0); renderer.autoClear = true; renderer.render(sc, new THREE.Camera());
    renderer.setRenderTarget(previo); renderer.autoClear = ac;
    malla.geometry.dispose(); m.dispose();
  }
  const uT = { uTex: { value: texToro }, uT: { value: 0 }, uEnc: { value: 0 }, uLuz: { value: 0.3 }, uGolpe: { value: 9 }, uGolpeF: { value: 0 }, uTibio: { value: 0 }, uExpo: EXPOSICION,
    uOndaR: { value: new THREE.Vector3(9, 9, 9) }, uOndaA: { value: new THREE.Vector3() } };
  const laminas = [];
  for (let k = 0; k < 3; k++) {
    const h = k - 1, lam = new THREE.Mesh(new THREE.RingGeometry(RT * 0.16, RT, 192, 6), new THREE.ShaderMaterial({
      uniforms: { ...uT, uH: { value: h } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`uniform sampler2D uTex; uniform float uT, uEnc, uLuz, uGolpe, uGolpeF, uTibio, uExpo, uH; uniform vec3 uOndaR, uOndaA; varying vec2 vP;
        void main(){ float r = length(vP) / ${RT.toFixed(1)};
          // Gira entero (un giro que dependiera del radio enrosca la imagen con el tiempo y se rompe en granos); cada lámina,
          // a su paso y algo girada: entre ellas se ve el plasma moverse.
          float a = atan(vP.y, vP.x) - uT * (0.35 + 0.08 * uH) - uH * 0.9;
          vec4 t = texture2D(uTex, vec2(cos(a), sin(a)) * r * 0.5 + 0.5);
          // Grosor del toro: las láminas de arriba y abajo solo tienen el núcleo del toro (sección redonda).
          float grosor = uH == 0.0 ? 1.0 : smoothstep(0.7, 1.0, t.a) * 0.45;
          // Se enciende de dentro afuera; dormido, solo un susurro del anillo interior.
          float enc = mix(0.12, 1.0, smoothstep(r - 0.12, r, uEnc));
          // Cada golpe de la canción: una onda de luz que sale del anillo interior y recorre el toro.
          float onda = exp(-pow((r - 0.2 - uGolpe * 1.1) / 0.07, 2.0)) * uGolpeF;
          vec3 c = t.rgb * grosor * enc * uLuz * (1.0 + 1.6 * onda);
          // Ondas finas del ecuador («wisps»): hebras que se alejan, moduladas por los nudos de la imagen.
          if (uH == 0.0) {
            // Ondas del ecuador: arcos irregulares y breves (su radio ondula con el ángulo y solo brillan donde hay plasma).
            float ond = 0.02 * sin(a * 3.0 + uOndaR.x * 9.0) + 0.012 * sin(a * 7.0 - 2.0);
            vec3 d = abs(vec3(r + ond) - uOndaR); vec3 w = exp(-d * d / 0.00006) * uOndaA;
            c += vec3(0.75, 0.88, 1.0) * (w.x + w.y + w.z) * smoothstep(0.15, 0.6, t.a) * (0.4 + 0.8 * fract(sin(floor(a * 3.0) * 12.9898) * 437.585));
          }
          c = mix(c, c * vec3(1.25, 0.86, 0.95), uTibio * 0.6);
          gl_FragColor = vec4(c * uExpo, 1.0); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    lam.rotation.x = -Math.PI / 2; lam.position.y = h * RT * 0.07; lam.rotation.y = h * 0.6; lam.renderOrder = 1; giro.add(lam); laminas.push(lam);
  }
  const anilloToro = laminas[1];
  yield;

  // ── Polvo que el faro enciende al barrerlo: motas finas, invisibles salvo cuando un haz las atraviesa; quedan un instante
  // encendidas detrás del haz (un barrido de luz, como un faro en la niebla). Repartidas cerca de los dos conos que barren los
  // haces (±30° sobre el ecuador del giro), entre 1,3 y 9 radios del toro. ──
  const uB = { uScale, uPR, uExpo: EXPOSICION, uPsi: { value: 0 }, uLuz: { value: 0 }, uTibio: { value: 0 }, uGolpeF: { value: 0 }, uSilueta: { value: R * 2 } };
  let barrido;
  {
    const N = esMovil ? 4500 : 6000, pos = new Float32Array(N * 3), dato = new Float32Array(N * 2), el = Math.PI / 2 - alfa;
    for (let i = 0; i < N; i++) {
      const lado = i % 2 ? 1 : -1, e = lado * el + (azar() + azar() + azar() - 1.5) * 0.13, az = azar() * Math.PI * 2, r = RT * (1.3 + Math.pow(azar(), 0.8) * 7.7);
      pos.set([Math.cos(e) * Math.sin(az) * r, Math.sin(e) * r, Math.cos(e) * Math.cos(az) * r], i * 3); dato.set([azar(), lado], i * 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aDato', new THREE.BufferAttribute(dato, 2));
    barrido = new THREE.Points(g, material(uB, /* glsl */`uniform float uScale, uPR, uExpo, uPsi, uLuz, uTibio, uGolpeF, uSilueta; attribute vec2 aDato; varying vec3 vC; varying float vA; ${ESPACIO}
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        vec3 d = normalize(position); float e = asin(clamp(d.y, -1.0, 1.0)), az = atan(d.x, d.z);
        // El haz de este lado: azimut ψ (arriba) o ψ + π (abajo), elevación ±(90° − α). Cuánto ha pasado ya el haz por la mota
        // (en el sentido del giro) y lo lejos que queda de su cono.
        float azHaz = uPsi + (aDato.y > 0.0 ? 0.0 : 3.14159265), paso = mod(azHaz - az, 6.2831853);
        float lejos = abs(e - aDato.y * ${(Math.PI / 2 - alfa).toFixed(5)});
        float estela = exp(-paso / 0.9) + exp(-pow((6.2831853 - paso) / 0.02, 2.0));
        float luz = estela * (1.0 - smoothstep(0.03, 0.14, lejos)) * (1.0 + 0.8 * uGolpeF);
        vC = mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 0.8, 0.88), uTibio * aDato.x);
        vA = luz * uLuz * (0.5 + 0.5 * aDato.x) * tamMota(22.0 + aDato.x * 20.0, mv, 2.8) * fueraSilueta(mv) * uExpo; }`, FRAG_MOTA));
    barrido.frustumCulled = false; barrido.name = 'barridoPulsar'; giro.add(barrido);
  }
  yield;

  // ── Fase ──
  const P = config.pulso, DOS_PI = Math.PI * 2, vista = new THREE.Vector3(), haz = new THREE.Vector3();
  let psi = 0, psi0 = 0, delta = 0, flujo = 0, tToro = 0, ondaN = -1, ondaK = 0;
  const ondaT = [9, 9, 9], ondaF = [0, 0, 0];
  const ajuste = 1.9;   // la fase se lleva a la de la canción antes de que se le vea girar (casquetes y haces nacen en el 1,9–2,2)
  return {
    grupo, giro, magnetico, estrella, toro: anilloToro, barrido, hilosHaz, hornear,
    medidas: { estrella: R, haz: L, viento: RT, nebulosa: Math.max(NX, NY, NZ) },   // nebulosa: la extensión de su región (tabla de escalas)
    // Ejes del giro en el espacio del grupo (los del marco de la cámara: x derecha, y arriba = eje de giro, z hacia casa).
    orientar(x, y, z) { giro.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); },
    // Al empezar su escena: la fase que falta para ir con la canción (se recorre en `ajuste` segundos, sin verse).
    iniciarEscena() { psi0 = psi; delta = Math.atan2(Math.sin(psi), Math.cos(psi)); },
    // e: estado de la canción (estadoPulsar) en su segundo s; e0: el estado dormido; w: peso de la escena (1 en ella y
    // después, mientras persiste; baja a 0 al irse); activa: suena su canción. camara: la cámara en el espacio del grupo,
    // relativa a su centro.
    actualizar({ e, e0, w, activa, s, t, dt, camara, reducido }) {
      if (activa) { const k = Math.min(1, Math.max(0, s / ajuste)); psi = psi0 + DOS_PI * vueltasPulsar(s, config) - delta * k * k * (3 - 2 * k); }
      else psi += dt * DOS_PI / P * (DORMIDO + (e.ritmo - DORMIDO) * w);
      rotor.rotation.y = psi - Math.PI / 2;
      const v = k => e0[k] + (e[k] - e0[k]) * w;
      // Haz de arriba en el espacio del grupo y cuánto mira a la cámara (un faro: destella al pasar).
      haz.set(Math.sin(alfa) * Math.sin(psi), Math.cos(alfa), Math.sin(alfa) * Math.cos(psi)).applyQuaternion(giro.quaternion);
      vista.copy(camara).normalize();
      const largo = v('largo'), alineado = largo > 0.98 ? Math.pow(Math.abs(haz.dot(vista)), 200) : 0, pulso = e.pulso * w;
      uE.uCalor.value = v('calor'); uE.uCasquetes.value = v('casquetes'); uE.uPulso.value = pulso; uE.uTibio.value = v('tibio');
      uE.uDestello.value = alineado * v('luzHaz') * 1.4;
      uD.uLuz.value = Math.min(1, (alineado * 0.9 + pulso * 0.55) * v('casquetes')) * (reducido ? 0.5 : 1);
      uD.uLargo.value = R * (2.5 + 14 * alineado + 6 * pulso);
      flujo += dt * (0.05 + 0.12 * v('luzHaz'));
      uH.uLuz.value = v('luzHaz'); uH.uLargo.value = largo; uH.uPaquete.value = reducido ? 0 : 0.9 * v('fuerza'); uH.uEdad.value = e.edad; uH.uFlujo.value = flujo; uH.uTibio.value = v('tibio');
      motasHaz.material.uniforms.uFlujo.value = flujo;
      // Toro de plasma: gira (más deprisa cuanto más despierto), se enciende de dentro afuera y destella con cada golpe.
      tToro += dt * (0.25 + 0.75 * v('luzToro'));
      const golpe = e.golpeEdad < 5 ? e.golpeEdad : 9, fG = w * e.golpeFuerza * Math.min(1, e.fuerza * 1.6) * (reducido ? 0.4 : 1);
      uT.uT.value = tToro; uT.uEnc.value = v('toro'); uT.uLuz.value = v('luzToro'); uT.uGolpe.value = golpe; uT.uGolpeF.value = fG; uT.uTibio.value = v('tibio');
      // Ondas del ecuador: en cada golpe fuerte (≥ 0,5) sale una nueva (hasta tres a la vez) que se aleja en 1,8 s.
      if (e.golpeN !== ondaN) { if (ondaN >= 0 && e.golpeN === ondaN + 1 && e.golpeFuerza >= 0.5 && v('ondas') > 0.05) { ondaT[ondaK] = 0; ondaF[ondaK] = e.golpeFuerza * v('ondas'); ondaK = (ondaK + 1) % 3; } ondaN = e.golpeN; }
      for (let i = 0; i < 3; i++) { ondaT[i] += dt; const q = Math.min(1, ondaT[i] / 1.1); uT.uOndaR.value.setComponent(i, 0.25 + 0.45 * Math.sqrt(q)); uT.uOndaA.value.setComponent(i, ondaT[i] < 1.1 ? ondaF[i] * (1 - q) * (1 - q) * 1.2 : 0); }
      // El barrido del faro en el polvo.
      uB.uPsi.value = psi; uB.uLuz.value = v('barrido') * 2.2; uB.uTibio.value = v('tibio'); uB.uGolpeF.value = fG;
      return alineado;
    }
  };
}
