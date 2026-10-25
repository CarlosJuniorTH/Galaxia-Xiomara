// TON 618: uno de los agujeros negros más grandes que se conocen. Una sombra nítida, el anillo de fotones y un disco de
// acreción enorme hecho de motas (sin halos ni degradados) que gira como un disco de verdad: más rápido y más caliente
// cerca del centro (blanco → oro → rosa), más brillante por el lado que viene hacia nosotros (efecto Doppler) y curvado
// por su propia gravedad: la parte de detrás asoma por encima y por debajo de la sombra (curvaLuz.js, GLSL_LENTE).
// Su videoclip (js/util/guionTon618.js), con «I Wanna Be Yours», cuenta lo que hace un agujero negro: tragar lo que cae.
// Al llegar duerme (un disco frío y tenue); una estrella cae hacia él, la marea la estira en un hilo, pasa rozando el
// horizonte en el primer «yours» y su materia se enrosca en anillos que encienden el disco, uno en cada «yours», hasta el
// disco completo que se queda. La cabeza del hilo cruza el horizonte y desaparece. La cámara sigue la pista del guion
// (CAMARA_TON618). Todo se crea en la carga (la preparación lo compila y lo calienta); por cuadro solo cambian uniformes.
import * as THREE from 'three';
import { GLSL_LENTE, GLSL_TAMANO, GLSL_OCULTA, geometriaMotas, materialMotas, crearAnilloFotones } from './curvaLuz.js';
import { materialSombra } from './materiales.js';
import { REPOSO_TON618, CAMARA_TON618, CAIDA, MARCAS_TON618, muestrearPista } from '../util/guionTon618.js';

// Medidas en radios de sombra (R): borde interior del disco (la última órbita estable, algo por fuera de la sombra),
// borde exterior y las motas de cada parte (las mismas en el móvil y en el PC).
const R_DENTRO = 1.3, R_FUERA = 6.5, N_DISCO = 42000, N_CAIDA = 6000;
// Azar con semilla (la misma forma en cada carga).
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const f = x => x.toFixed(4);

// Color por temperatura (x: 0 borde interior → 1 exterior): blanco, oro, naranja, rosa y magenta oscuro. Doppler: el lado
// que se acerca, más blanco y brillante (g > 1); el que se aleja, más rojo y apagado.
const GLSL_DISCO = /* glsl */`
  uniform float uR, uUnidad, uGiro, uEnc, uRevelar, uOla, uOlaR0, uOlaF, uBombo;
  uniform vec3 uCamLocal;
  vec3 temperatura(float x){
    x = clamp(x, 0.0, 1.0);
    vec3 c = mix(vec3(1.0, 0.93, 0.82), vec3(1.0, 0.8, 0.52), smoothstep(0.0, 0.1, x));
    c = mix(c, vec3(1.0, 0.6, 0.34), smoothstep(0.12, 0.38, x));
    c = mix(c, vec3(0.98, 0.4, 0.46), smoothstep(0.34, 0.7, x));
    return mix(c, vec3(0.66, 0.2, 0.42), smoothstep(0.66, 1.0, x));
  }
  float giroKepler(float r){ return 1.0472 * pow(r / ${R_DENTRO.toFixed(2)}, -1.5); }   // rad/s: una vuelta cada 6 s en el borde interior
  // Doppler relativista de una mota en órbita (radio r, ángulo th, posición local p): factor g y color desplazado.
  float doppler(float r, float th, vec3 p, inout vec3 c){
    vec3 vel = vec3(-sin(th), 0.0, cos(th)), haciaCam = normalize(uCamLocal - p);
    float b = 0.48 * sqrt(${R_DENTRO.toFixed(2)} / max(r, 1.0)), g = sqrt(1.0 - b * b) / (1.0 - b * dot(vel, haciaCam));
    c = mix(c, vec3(0.86, 0.9, 1.0), clamp(g - 1.0, 0.0, 1.0) * 0.45);
    c = mix(c, c * vec3(1.0, 0.5, 0.45), clamp(1.0 - g, 0.0, 1.0) * 0.7);
    return g * g * g;
  }
  // Luz de la escena en el radio r: el disco encendido hasta rEnc (más allá, dormido: tenue y más frío), el bombo en el
  // disco de fuera y la onda que cae hacia el horizonte en cada «yours» (más estrecha y caliente cuanto más baja).
  // Sin pow() de negativos (puntos negros con MSAA): los cuadrados, a mano.
  float dormido(float r){ float rEnc = ${R_DENTRO.toFixed(2)} + 5.6 * uEnc; return smoothstep(rEnc - 0.22, rEnc + 0.22, r); }
  float luzEscena(float r){
    float d = dormido(r), rw = mix(uOlaR0, ${R_DENTRO.toFixed(2)}, uOla * uOla), x = (r - rw) / mix(0.34, 0.1, clamp(uOla, 0.0, 1.0));
    float ola = (uOla >= 0.0 ? exp(-x * x) : 0.0) * uOlaF * (0.6 + 1.1 * clamp(uOla, 0.0, 1.0)) * (1.0 - smoothstep(0.95, 1.15, uOla));
    // (El de dentro ya está a tope: el bombo y la onda avivan sobre todo el de fuera; no se quema sobre la sombra.)
    return mix(1.0, 0.13, d) * (1.0 + uBombo * smoothstep(1.8, 5.0, r)) * (1.0 + 1.6 * ola * (1.0 - d) * (0.45 + 0.55 * smoothstep(1.4, 2.2, r)));
  }
  // De canto se ve mucho más disco en la misma línea de visión: la luz se compensa con la inclinación (brillo de
  // superficie constante), así el disco no se quema en blanco ni enciende el resplandor sobre la sombra.
  float inclinacion(vec3 p){ return mix(0.42, 1.0, sqrt(abs(normalize(uCamLocal - p).y))); }`;

const cabecera = `attribute float aImagen, aTam, aFase; varying vec3 vC; varying float vA;
  ${GLSL_LENTE}
  ${GLSL_TAMANO}
  ${GLSL_DISCO}`;
// Final común: lente, tamaño y luz de la mota (pl: posición local en radios de sombra).
const GLSL_FINAL = /* glsl */`
    vec3 p = pl * uR;
    vec4 im = imagenLente((modelViewMatrix * vec4(p, 1.0)).xyz, aImagen);
    if (im.w <= 0.001 || brillo <= 0.0005) { ${GLSL_OCULTA} }
    gl_Position = projectionMatrix * vec4(im.xyz, 1.0);
    float luz; gl_PointSize = tamanoMota(aTam * uUnidad, -im.z, luz);
    vC = c; vA = brillo * luz * im.w * (aImagen > 0.5 ? 1.5 * uRevelar : 1.0);   // las imágenes curvadas, algo más vivas (se reparten en un arco fino); la escena las despierta`;

// grupo: el del agujero en el cosmos (su posición y su escala); aquí se le añaden las piezas.
// encuadre: la distancia de llegada (cosmos.objetivo) en unidades del grupo: la unidad de la pista de cámara.
export function* construirTon618({ uScale, uPR, R, grupo, encuadre = R * 9.3 }) {
  const planoDisco = new THREE.Group(), galaxia = new THREE.Group(); grupo.add(planoDisco, galaxia);
  const comunes = { uScale, uPR, uMaximo: { value: 3 }, uSombra: { value: R }, uR: { value: R }, uUnidad: { value: R }, uGiro: { value: 0 },
    uEnc: { value: 1 }, uRevelar: { value: 1 }, uOla: { value: -1 }, uOlaR0: { value: 6.8 }, uOlaF: { value: 0 }, uBombo: { value: 0 }, uCamLocal: { value: new THREE.Vector3(0, 0, 1e6) } };
  const al = azar(618);

  // ── Sombra: negra, con el borde suavizado en su último píxel; escribe su profundidad (tapa lo que hay detrás). ──
  const sombra = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), materialSombra({ depthTest: true, depthWrite: true }));
  grupo.add(sombra);

  yield;
  // ── Disco de motas: órbitas circulares con algo de grosor, más densas hacia dentro y con huecos finos (anillos). La
  // materia baja despacio en espiral (uFlujo, en escala logarítmica: entra por fuera, cae al borde interior y se apaga). ──
  {
    const disco = new Float32Array(N_DISCO * 3), tam = new Float32Array(N_DISCO), fase = new Float32Array(N_DISCO);
    for (let i = 0; i < N_DISCO; i++) {
      if ((i & 4095) === 4095) yield;
      let r = R_DENTRO + (R_FUERA - R_DENTRO) * Math.pow(al(), 1.45);
      // Huecos: algunos anillos finos quedan casi vacíos (estructura nítida, no un degradado).
      const banda = Math.floor(r * 14); if (((banda * 2654435761) >>> 0) % 7 === 0 && al() < 0.8) r = R_DENTRO + (R_FUERA - R_DENTRO) * Math.pow(al(), 1.45);
      disco.set([r, al() * Math.PI * 2, (al() - 0.5) * 0.024], i * 3);
      tam[i] = 0.02 + al() * 0.026; fase[i] = al();
    }
    var motasDisco = new THREE.Points(geometriaMotas({ aDisco: [disco, 3], aTam: [tam, 1], aFase: [fase, 1], position: [new Float32Array(N_DISCO * 3), 3] }, R * R_FUERA * 1.1), materialMotas({ ...comunes, uFlujo: { value: 0 } }, /* glsl */`
      attribute vec3 aDisco; uniform float uFlujo;
      ${cabecera}
      void main(){
        float lin = log(${R_DENTRO.toFixed(2)}), tramo = log(${(R_FUERA / R_DENTRO).toFixed(4)});
        float x = fract((log(aDisco.x) - lin - uFlujo * (0.6 + aFase * 0.8)) / tramo), r = exp(lin + x * tramo);
        float th = aDisco.y + uGiro * giroKepler(aDisco.x);
        vec3 pl = vec3(cos(th) * r, aDisco.z * r, sin(th) * r);
        vec3 c = temperatura((r - ${R_DENTRO.toFixed(2)}) / ${(R_FUERA - R_DENTRO).toFixed(2)} + 0.3 * dormido(r));
        float g = doppler(r, th, pl, c);
        float brillo = pow(${R_DENTRO.toFixed(2)} / r, 0.5) * clamp(pow(g, 0.75), 0.3, 1.35) * luzEscena(r) * inclinacion(pl * uR) * smoothstep(0.0, 0.05, x) * (1.0 - smoothstep(0.88, 1.0, x)) * 0.8;
        ${GLSL_FINAL}
      }`));
  }

  yield;
  // ── La estrella que cae (escena): una bola compacta de motas que viene por su órbita parabólica (caminoCaida en
  // js/util/guionTon618.js: el mismo cálculo), se estira en un hilo con la marea, pasa rozando el horizonte y se enrosca
  // en anillos que caen al disco; la cabeza del hilo (aK → 1) baja por dentro de la última órbita y cruza el horizonte.
  // aK: lugar en el hilo (−1 cola … 1 cabeza); aRc: radio del anillo en el que acaba; aOff: lugar dentro de la estrella. ──
  {
    const k = new Float32Array(N_CAIDA * 3), off = new Float32Array(N_CAIDA * 3), tam = new Float32Array(N_CAIDA), fase = new Float32Array(N_CAIDA);
    for (let i = 0; i < N_CAIDA; i++) {
      // Densa en el centro de la estrella (y del hilo): la luz se concentra en el núcleo.
      const u = al() * 2 - 1, kk = Math.sign(u) * Math.pow(Math.abs(u), 1.6), j = al() - 0.5;
      const rc = Math.min(6.4, Math.max(0.85, 6.0 - 5.0 * (kk + 1) / 2 + j * 0.9));
      k.set([kk, rc, al()], i * 3);
      let x, y, z; do { x = al() * 2 - 1; y = al() * 2 - 1; z = al() * 2 - 1; } while (x * x + y * y + z * z > 1);
      const rr = Math.pow(x * x + y * y + z * z, 1.1); off.set([x * rr, y * rr, z * rr], i * 3);
      tam[i] = 0.02 + al() * 0.024; fase[i] = al();
    }
    const { Q, S0, PSI, INCL, T1, T2 } = CAIDA;
    var motasCaida = new THREE.Points(geometriaMotas({ aK: [k, 3], aOff: [off, 3], aTam: [tam, 1], aFase: [fase, 1], position: [new Float32Array(N_CAIDA * 3), 3] }, R * 18), materialMotas({ ...comunes, uT: { value: 0 }, uE: { value: 0 }, uCaida: { value: 0 }, uLatidoE: { value: 0 } }, /* glsl */`
      attribute vec3 aK, aOff; uniform float uT, uE, uCaida, uLatidoE;
      ${cabecera}
      float raiz3(float x){ return sign(x) * pow(abs(x), 1.0 / 3.0); }
      // caminoCaida (js/util/guionTon618.js): parábola de Barker hasta el pericentro; después, se enrosca en su anillo.
      vec3 camino(float tau, float rc, out float r, out float plano){
        float fa;
        if (tau <= 0.0) { float T = tau / ${f(S0)}, w = sqrt(2.25 * T * T + 1.0), D = raiz3(1.5 * T + w) + raiz3(1.5 * T - w); r = ${f(Q)} * (1.0 + D * D); fa = 2.0 * atan(D); plano = 1.0; }
        else { float wp = 2.0 / ${f(S0)}, wc = giroKepler(max(rc, 1.0)); r = rc + (${f(Q)} - rc) * (1.0 + tau / ${f(T2)}) * exp(-tau / ${f(T2)}); fa = wc * tau + (wp - wc) * ${f(T1)} * (1.0 - exp(-tau / ${f(T1)})); plano = exp(-tau / 1.5); }
        float x = r * cos(fa), y = r * sin(fa), ci = 1.0 - ${f(1 - Math.cos(INCL))} * plano;
        return vec3(x * ${f(Math.cos(PSI))} - y * ${f(Math.sin(PSI))} * ci, y * ${f(Math.sin(INCL))} * plano, x * ${f(Math.sin(PSI))} + y * ${f(Math.cos(PSI))} * ci);
      }
      void main(){
        if (uCaida <= 0.0) { ${GLSL_OCULTA} }
        float tau = uT - ${f(MARCAS_TON618.tuyo)} + aK.x * uE, r, plano;
        vec3 pl = camino(tau, aK.y, r, plano);
        // Compacta hasta que la marea la estira; ya en hilo, un grosor fino que se ensancha al enroscarse.
        float estira = clamp(uE / 0.3, 0.0, 1.0);
        pl += aOff * (0.16 * (1.0 - estira) + 0.03 + 0.07 * smoothstep(0.0, 4.0, tau)) * vec3(1.0, mix(1.0, 0.25, 1.0 - plano), 1.0);
        r = length(pl.xz);
        // Color: la estrella, blanca y cálida; al bajar se calienta (blanco azulado en el pericentro) y, ya en el disco,
        // el color de su anillo.
        vec3 c = mix(vec3(1.0, 0.9, 0.78), vec3(0.92, 0.94, 1.0), (1.0 - smoothstep(2.6, 5.0, r)) * plano);
        c = mix(c, temperatura((r - ${R_DENTRO.toFixed(2)}) / ${(R_FUERA - R_DENTRO).toFixed(2)}), 1.0 - plano);
        float th = atan(pl.z, pl.x), g = doppler(r, th, pl, c);
        float nucleo = 1.0 + (1.0 - estira) * (0.8 * uLatidoE + 0.6 * (1.0 - length(aOff)));
        float brillo = mix(0.42, 0.5, estira) * nucleo * (1.0 - 0.35 * abs(aK.x)) * mix(1.0, clamp(pow(g, 0.75), 0.35, 1.35) * inclinacion(pl * uR), 1.0 - plano)
          * mix(1.0, luzEscena(r), 0.4 * (1.0 - plano)) * smoothstep(1.02, 1.3, length(pl)) * uCaida;
        ${GLSL_FINAL}
      }`));
  }

  yield;
  // ── Base del disco: anillos finos y nítidos (cada banda con su brillo y bordes de un píxel), muy tenues bajo las motas.
  // Solo la mitad que queda delante del agujero: la de detrás la dibujan las imágenes curvadas de las motas. ──
  const base = new THREE.Mesh(new THREE.RingGeometry(R * 1.25, R * R_FUERA, 256, 48), new THREE.ShaderMaterial({
    uniforms: { uR: { value: R }, uCamLocal: comunes.uCamLocal, uEnc: comunes.uEnc, uBombo: comunes.uBombo, uLuz: { value: 1 } },
    vertexShader: /* glsl */`uniform vec3 uCamLocal; uniform float uR; varying vec2 vP; varying float vDelante, vDoppler;
      void main(){ vP = position.xy / uR;
        vec3 pl = vec3(position.x, 0.0, position.y);   // en el plano del disco (el anillo está girado 90° en X)
        vec3 haciaCam = normalize(uCamLocal), vel = normalize(vec3(-position.y, 0.0, position.x));
        vDelante = dot(pl, haciaCam) / uR;
        float r = length(vP), b = 0.48 * sqrt(1.3 / max(r, 1.0));
        vDoppler = pow(sqrt(1.0 - b * b) / (1.0 - b * dot(vel, normalize(uCamLocal - pl))), 3.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform float uEnc, uBombo, uLuz; varying vec2 vP; varying float vDelante, vDoppler;
      float h(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }   // azar de Hoskins (sin costuras entre GPU)
      void main(){
        float r = length(vP), x = (r - 1.25) / 5.25;
        // Bandas de 1/14 de radio, cada una con su brillo; el borde entre bandas es de un píxel (nítido, sin moaré de lejos).
        float n = r * 14.0, i = floor(n), w = fwidth(n), borde = smoothstep(0.0, w, fract(n)) * smoothstep(0.0, w, 1.0 - fract(n));
        float banda = mix(0.25, 1.0, h(i)) * mix(1.0, borde, 1.0 - smoothstep(0.3, 0.9, w));
        vec3 c = mix(vec3(1.0, 0.9, 0.7), vec3(1.0, 0.55, 0.42), smoothstep(0.0, 0.45, x)); c = mix(c, vec3(0.7, 0.2, 0.4), smoothstep(0.45, 1.0, x));
        float a = banda * pow(1.0 - x, 1.6) * smoothstep(0.0, 0.03, x) * smoothstep(0.0, 0.6, vDelante) * clamp(pow(vDoppler, 0.75), 0.3, 1.35) * mix(1.0, 0.03, smoothstep(uEnc * 5.6 + 1.08, uEnc * 5.6 + 1.52, r)) * (1.0 + uBombo * 0.4) * 0.34 * uLuz;
        gl_FragColor = vec4(c * a, a); }`,
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  }));
  base.rotation.x = Math.PI / 2;
  planoDisco.add(base, motasDisco, motasCaida);

  // ── Anillo de fotones (mira a la cámara) ──
  const anillo = crearAnilloFotones(R, ['#fff4e2', '#ffb38a']);
  grupo.add(anillo);

  yield;
  // ── Su galaxia: un disco enorme de estrellas que giran a su alrededor (puntos nítidos). ──
  let discoEstrellas;
  {
    const n = 4500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const r = R * (8 + Math.pow(al(), 0.6) * 40), a = al() * Math.PI * 2; pos.set([a, r, (al() - 0.5) * R * 3 * (r / (R * 48))], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 50);
    discoEstrellas = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uScale, uPR, uUnidad: comunes.uUnidad },
      vertexShader: `uniform float uT, uScale, uPR, uUnidad; varying vec3 vC; varying float vA;
       void main(){ float r = position.y, ang = position.x + uT * 0.012 * pow(${(R * 8).toFixed(1)} / r, 1.5);
         vec3 p = vec3(cos(ang) * r, position.z, sin(ang) * r);
         vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
         float t = clamp((r - ${(R * 8).toFixed(1)}) / ${(R * 40).toFixed(1)}, 0.0, 1.0);
         vC = mix(vec3(1.0, 0.85, 0.6), vec3(0.7, 0.8, 1.0), t); vA = (1.0 - t * 0.6) * 0.75;
         gl_PointSize = clamp(uUnidad * 0.074 * uScale / max(1.0, -mv.z), 1.0, 2.5 * uPR); }`,
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float k = pow(max(1.0 - d * 2.0, 0.0), 1.6) * vA; gl_FragColor = vec4(vC * k, k); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    galaxia.add(discoEstrellas);
  }

  // Orden interno fijo: la sombra primero (escribe profundidad), después lo luminoso (la prueba de profundidad decide qué
  // tapa la sombra: lo de detrás; lo de delante pasa por encima), y el anillo de fotones al final.
  for (const [o, orden] of [[discoEstrellas, 0], [sombra, 1], [base, 2], [motasDisco, 3], [motasCaida, 3], [anillo, 4]]) o.renderOrder = orden;

  // ── Por cuadro ──
  const tmp = new THREE.Vector3(), centro = new THREE.Vector3(), q = new THREE.Quaternion(), qa = new THREE.Quaternion();
  const mDisco = motasDisco.material.uniforms, mCaida = motasCaida.material.uniforms, v = {};
  let giro = 0, flujo = 0;
  // Mezcla del guion de la escena con el reposo según su presencia (al entrar y al salir, sin saltos).
  const mezclar = (s, w) => { for (const k in REPOSO_TON618) v[k] = REPOSO_TON618[k] + ((s ? s[k] : REPOSO_TON618[k]) - REPOSO_TON618[k]) * w; return v; };
  // Cámara: muestra de la pista, pose de partida (para entrar en la pista sin salto) y vectores de trabajo.
  const muestra = { pos: [0, 0, 0], mira: [0, 0, 0], fov: 60, giro: 0 }, inicio = { activo: false, pos: new THREE.Vector3(), mira: new THREE.Vector3(), fov: 60 };
  const pPista = new THREE.Vector3(), mPista = new THREE.Vector3();
  const suave = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  return {
    planoDisco, sombra, base, anillo, discoEstrellas, motasDisco, motasCaida, R, rFuera: R_FUERA,
    // Marco de la pista de cámara (el del disco: azimut 0 hacia casa, elevación sobre el disco) y su unidad (la distancia
    // de llegada, con el mismo factor de aspecto que index.js).
    marco: planoDisco, pista: CAMARA_TON618,
    unidadPista(aspecto) { return encuadre * grupo.matrixWorld.getMaxScaleOnAxis() * Math.max(1, Math.min(1.6, 0.95 / aspecto)); },
    // El disco (y su galaxia de estrellas) contiene la dirección «hacia» y se inclina un poco sobre ella.
    orientar(hacia, inclinacion) { for (const o of [planoDisco, galaxia]) { o.lookAt(hacia); o.rotateX(inclinacion); } },
    // escena: null (reposo) o { guion, presencia } (js/escena/cosmos.js la mezcla con el reposo al entrar y al salir).
    actualizar(t, dt, camera, escena) {
      const w = escena ? escena.presencia : 0, s = mezclar(escena?.guion, w);
      grupo.updateMatrixWorld();
      // Unidad del mundo (escala de todos los padres) y cámara en el espacio del disco.
      const unidad = R * planoDisco.matrixWorld.getMaxScaleOnAxis(); comunes.uUnidad.value = unidad;
      comunes.uSombra.value = unidad;
      planoDisco.worldToLocal(comunes.uCamLocal.value.copy(camera.position));
      // De lejos (la sombra mide menos de 5 px) la lente no se distingue: solo la imagen directa.
      const d = camera.position.distanceTo(grupo.getWorldPosition(centro)), px = unidad / Math.max(1, d) * 900;
      for (const m of [motasDisco, motasCaida]) m.geometry.instanceCount = px > 5 ? 3 : 1;
      giro += dt; flujo += dt * 0.012 * s.flujo;
      comunes.uGiro.value = giro; mDisco.uFlujo.value = flujo;
      comunes.uEnc.value = s.encendido; comunes.uRevelar.value = s.revelar; comunes.uBombo.value = s.bombo;
      comunes.uOla.value = escena && w > 0 ? escena.guion.ola : -1; comunes.uOlaR0.value = escena ? escena.guion.olaR0 : 6.8; comunes.uOlaF.value = s.olaF;
      // La estrella: su reloj es el de la canción; estiramiento de la marea (guionTon618.estiramiento).
      const tE = escena ? escena.guion.t : 0;
      mCaida.uT.value = tE; mCaida.uE.value = 0.012 + 0.35 * suave(tE, MARCAS_TON618.esconder, 10.2) + 0.5 * Math.max(0, tE - 10.2);
      mCaida.uCaida.value = s.caida; mCaida.uLatidoE.value = s.latidoEstrella; motasCaida.visible = s.caida > 0.001;
      discoEstrellas.material.uniforms.uT.value = t;
      // Anillo de fotones: mira a la cámara; su lado brillante es el del disco que se acerca. Dormido, más tenue; en cada
      // «yours», más vivo (sigue siendo una línea de 1–1,5 px).
      anillo.lookAt(camera.position);
      const c = comunes.uCamLocal.value; tmp.set(c.z, 0, -c.x).normalize();          // dirección (en el disco) del lado que se acerca
      tmp.applyQuaternion(planoDisco.getWorldQuaternion(q)).applyQuaternion(anillo.getWorldQuaternion(qa).invert());
      anillo.material.uniforms.uLado.value.set(tmp.x, tmp.y).normalize();
      anillo.material.uniforms.uLuz.value = 0.8 * (0.55 + 0.45 * Math.min(1.2, s.revelar)) + 0.5 * s.destello;
      if (!escena) inicio.activo = false;
    },
    // Cámara del videoclip: sigue la pista del guion (CAMARA_TON618) en el reloj de la canción. Entra desde donde esté la
    // cámara (en los dos primeros segundos, sin salto) y, al final, la pista vuelve al encuadre de llegada y devuelve el
    // control. Mientras dura, la escena no se puede saltar: la cámara la lleva el clip (aunque se toque). Si se sale a
    // mitad, la cámara se queda donde está. Sin memoria nueva por cuadro.
    derivar(camera, objetivo, dt, escena) {
      const g = escena?.guion;
      if (!escena || !escena.viva || g.deriva <= 0.001) {
        // Al soltar la cámara, el campo de visión vuelve al de siempre (la pista termina en él; si se sale a mitad, no).
        if (inicio.activo && camera.fov !== 60) { camera.fov = 60; camera.updateProjectionMatrix(); }
        inicio.activo = false; return false;
      }
      grupo.getWorldPosition(centro); planoDisco.getWorldQuaternion(q);
      const U = this.unidadPista(camera.aspect), m = muestrearPista(CAMARA_TON618, g.t, muestra), rad = Math.PI / 180;
      const az = m.pos[0] * rad, el = m.pos[1] * rad;
      pPista.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(m.pos[2] * U).applyQuaternion(q).add(centro);
      mPista.set(m.mira[0], m.mira[1], m.mira[2]).multiplyScalar(U).applyQuaternion(q).add(centro);
      if (!inicio.activo) { inicio.activo = true; inicio.pos.copy(camera.position); inicio.mira.copy(objetivo); inicio.fov = camera.fov; }
      // Entrada en la pista: de la pose de llegada a la de la pista en 2 s.
      const k = suave(g.t, 0, 2);
      camera.position.lerpVectors(inicio.pos, pPista, k); objetivo.lerpVectors(inicio.mira, mPista, k);
      const fov = inicio.fov + (m.fov - inicio.fov) * k;
      if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
      camera.lookAt(objetivo);
      return true;
    }
  };
}
