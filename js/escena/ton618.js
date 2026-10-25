// TON 618: uno de los agujeros negros más grandes que se conocen. Una sombra nítida, el anillo de fotones y un disco de
// acreción enorme hecho de motas (sin halos ni degradados) que gira como un disco de verdad: más rápido y más caliente
// cerca del centro (blanco → oro → rosa), más brillante por el lado que viene hacia nosotros (efecto Doppler) y curvado
// por su propia gravedad: la parte de detrás asoma por encima y por debajo de la sombra (curvaLuz.js, GLSL_LENTE).
// Su escena (js/util/guionAgujeros.js, guionTon618), con «I Wanna Be Yours»: la materia de alrededor cae en espiral hacia
// el disco, el anillo se enciende, dos corrientes de motas (rosa y oro) entran trenzadas y bajan juntas hasta fundirse en
// un solo anillo, y en los estribillos el disco late como un corazón. Todo se crea en la carga (la preparación lo compila
// y lo calienta); por cuadro solo cambian uniformes.
import * as THREE from 'three';
import { GLSL_LENTE, GLSL_TAMANO, GLSL_OCULTA, geometriaMotas, materialMotas, crearAnilloFotones } from './curvaLuz.js';
import { materialSombra } from './materiales.js';
import { guionReposo, COMPAS } from '../util/guionAgujeros.js';

// Medidas en radios de sombra (R): borde interior del disco (la última órbita estable, algo por fuera de la sombra),
// borde exterior y las motas de cada parte (las mismas en el móvil y en el PC).
const R_DENTRO = 1.3, R_FUERA = 6.5, N_DISCO = 42000, N_CAIDA = 7000, N_HEBRA = 3200;
// Azar con semilla (la misma forma en cada carga).
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Color por temperatura (x: 0 borde interior → 1 exterior): blanco, oro, naranja, rosa y magenta oscuro. Doppler: el lado
// que se acerca, más blanco y brillante (g > 1); el que se aleja, más rojo y apagado.
const GLSL_DISCO = /* glsl */`
  uniform float uR, uUnidad, uGiro, uLatido, uOnda, uOndaF, uAcento, uAcentoF;
  uniform vec3 uCamLocal;
  vec3 temperatura(float x){
    x = clamp(x, 0.0, 1.0);
    vec3 c = mix(vec3(1.0, 0.97, 0.93), vec3(1.0, 0.84, 0.58), smoothstep(0.0, 0.14, x));
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
  // Latido: todo el disco se aviva y un anillo de luz lo recorre hacia fuera (y otro mayor en los «tuyo» largos).
  float latido(float r){
    float rw = ${R_DENTRO.toFixed(2)} + uOnda * 3.2, ra = ${R_DENTRO.toFixed(2)} + uAcento * 2.1;
    float onda = exp(-pow((r - rw) / 0.2, 2.0)) * uOndaF * exp(-uOnda * 0.7);
    float acento = exp(-pow((r - ra) / 0.32, 2.0)) * uAcentoF * 1.5 * exp(-uAcento * 0.4);
    return (1.0 + uLatido * (0.2 + 0.4 * (1.0 - smoothstep(1.3, 5.0, r)))) * (1.0 + 1.1 * (onda + acento));
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
    vC = c; vA = brillo * luz * im.w;`;

// grupo: el del agujero en el cosmos (su posición y su escala); aquí se le añaden las piezas.
export function* construirTon618({ uScale, uPR, R, grupo }) {
  const planoDisco = new THREE.Group(), galaxia = new THREE.Group(); grupo.add(planoDisco, galaxia);
  const comunes = { uScale, uPR, uMaximo: { value: 4 }, uSombra: { value: R }, uR: { value: R }, uUnidad: { value: R }, uGiro: { value: 0 },
    uLatido: { value: 0 }, uOnda: { value: 99 }, uOndaF: { value: 0 }, uAcento: { value: 99 }, uAcentoF: { value: 0 }, uCamLocal: { value: new THREE.Vector3(0, 0, 1e6) } };
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
        vec3 c = temperatura((r - ${R_DENTRO.toFixed(2)}) / ${(R_FUERA - R_DENTRO).toFixed(2)});
        float g = doppler(r, th, pl, c);
        float brillo = pow(${R_DENTRO.toFixed(2)} / r, 0.5) * clamp(pow(g, 0.75), 0.3, 1.35) * latido(r) * inclinacion(pl * uR) * smoothstep(0.0, 0.05, x) * (1.0 - smoothstep(0.88, 1.0, x)) * 0.8;
        ${GLSL_FINAL}
      }`));
  }

  yield;
  // ── Materia capturada (escena): motas dispersas alrededor que caen en espiral hasta el disco calentándose (de rosa frío a
  // oro blanco) y se quedan girando en él. Caen por grupos, cada uno en un primer tiempo de compás (desde el segundo
  // compás, 12 compases: hasta el segundo estribillo). uT: segundo de la escena; uCaptura: 0 fuera. ──
  {
    const ini = new Float32Array(N_CAIDA * 3), cap = new Float32Array(N_CAIDA * 3), tam = new Float32Array(N_CAIDA), fase = new Float32Array(N_CAIDA);
    for (let i = 0; i < N_CAIDA; i++) {
      ini.set([8 + Math.pow(al(), 0.7) * 13, al() * Math.PI * 2, (al() - 0.5) * 0.9], i * 3);
      cap.set([Math.pow(al(), 0.85), 4.5 + al() * 4, 1.5 + Math.pow(al(), 0.8) * 4.2], i * 3);
      tam[i] = 0.02 + al() * 0.022; fase[i] = al();
    }
    var motasCaida = new THREE.Points(geometriaMotas({ aIni: [ini, 3], aCap: [cap, 3], aTam: [tam, 1], aFase: [fase, 1], position: [new Float32Array(N_CAIDA * 3), 3] }, R * 24), materialMotas({ ...comunes, uT: { value: 0 }, uCap0: { value: 1.78 }, uNCompases: { value: 12 }, uCompas: { value: COMPAS.ton618 }, uCaptura: { value: 0 } }, /* glsl */`
      attribute vec3 aIni, aCap; uniform float uT, uCap0, uNCompases, uCompas, uCaptura;
      ${cabecera}
      void main(){
        if (uCaptura <= 0.0) { ${GLSL_OCULTA} }
        float tc = uCap0 + floor(aCap.x * uNCompases) * uCompas + aFase * 0.12, f = clamp((uT - tc) / aCap.y, 0.0, 1.0), e = f * f * (3.0 - 2.0 * f);
        float r = mix(aIni.x, aCap.z, e * (0.35 + 0.65 * e));   // acelera al caer
        float th = aIni.y + 3.4 * e + giroKepler(aCap.z) * max(0.0, uT - tc - aCap.y) + uGiro * 0.012;
        vec3 pl = vec3(cos(th) * r, aIni.z * aIni.x * (1.0 - e) * (1.0 - e), sin(th) * r);
        vec3 c = mix(vec3(0.85, 0.32, 0.46), temperatura((r - ${R_DENTRO.toFixed(2)}) / ${(R_FUERA - R_DENTRO).toFixed(2)}), smoothstep(0.2, 0.9, e));
        float g = mix(1.0, clamp(pow(doppler(r, th, pl, c), 0.75), 0.3, 1.35) * inclinacion(pl * uR), e);
        float brillo = (0.3 + 0.9 * e) * pow(${R_DENTRO.toFixed(2)} / r, 0.6) * g * latido(r) * smoothstep(tc - 2.5, tc, uT) * uCaptura * 0.7;
        ${GLSL_FINAL}
      }`));
  }

  yield;
  // ── Dos corrientes (escena): dos hebras de motas, rosa y oro, trenzadas una alrededor de la otra, entran por el borde del
  // disco y bajan en espiral; se van juntando y en el último «tuyo» se funden en un solo anillo cerrado junto a la sombra
  // (la lente lo curva también por encima y por debajo). uCabeza: ángulo de la cabeza (gira a su velocidad de Kepler). ──
  {
    const hebra = new Float32Array(N_HEBRA * 2 * 3), tam = new Float32Array(N_HEBRA * 2), fase = new Float32Array(N_HEBRA * 2);
    for (let i = 0; i < N_HEBRA * 2; i++) { hebra.set([Math.pow(al(), 1.15), i < N_HEBRA ? 1 : -1, al() - 0.5], i * 3); tam[i] = 0.03 + al() * 0.028; fase[i] = al(); }
    var motasHebras = new THREE.Points(geometriaMotas({ aHebra: [hebra, 3], aTam: [tam, 1], aFase: [fase, 1], position: [new Float32Array(N_HEBRA * 6), 3] }, R * R_FUERA * 1.3), materialMotas({ ...comunes, uT: { value: 0 }, uCabeza: { value: 0 }, uAvance: { value: 0 }, uFusion: { value: 0 }, uCorrientes: { value: 0 }, uCalma: { value: 0 } }, /* glsl */`
      attribute vec3 aHebra; uniform float uT, uCabeza, uAvance, uFusion, uCorrientes, uCalma;
      ${cabecera}
      void main(){
        if (uCorrientes <= 0.0) { ${GLSL_OCULTA} }
        float u = aHebra.x, rh = mix(5.4, 1.8, uAvance), ext = (1.0 - uFusion) * mix(0.9, 0.35, uAvance);
        float th = uCabeza - u * mix(2.7, 6.2832, uFusion);
        float phi = u * 22.0 - uT * 2.3, sep = 0.09 * (1.0 - uFusion) * (1.0 - 0.45 * uAvance);
        float r = rh + u * ext + aHebra.y * sep * cos(phi) + aHebra.z * 0.035 * (1.0 - 0.6 * uFusion);
        vec3 pl = vec3(cos(th) * r, aHebra.y * sep * 0.12 * sin(phi) + aHebra.z * 0.006, sin(th) * r);
        vec3 c = mix(aHebra.y > 0.0 ? vec3(1.0, 0.56, 0.74) : vec3(1.0, 0.8, 0.46), vec3(1.0, 0.87, 0.82), uFusion * 0.75);
        float g = doppler(r, th, pl, c);
        float cola = mix((1.0 - 0.8 * u) * (1.0 + 0.6 * (1.0 - smoothstep(0.0, 0.04, u))), 0.8 + 0.2 * sin(u * 60.0 + uT * 2.0 + aFase * 6.0), uFusion);
        float brillo = cola * clamp(pow(g, 0.75), 0.4, 1.35) * latido(r) * mix(0.35, 1.0, abs(normalize(uCamLocal - pl * uR).y)) * uCorrientes * (1.0 - 0.2 * uCalma) * 0.9;
        ${GLSL_FINAL}
      }`));
  }

  yield;
  // ── Base del disco: anillos finos y nítidos (cada banda con su brillo y bordes de un píxel), muy tenues bajo las motas.
  // Solo la mitad que queda delante del agujero: la de detrás la dibujan las imágenes curvadas de las motas. ──
  const base = new THREE.Mesh(new THREE.RingGeometry(R * 1.25, R * R_FUERA, 256, 48), new THREE.ShaderMaterial({
    uniforms: { uR: { value: R }, uCamLocal: comunes.uCamLocal, uLatido: comunes.uLatido, uLuz: { value: 1 } },
    vertexShader: /* glsl */`uniform vec3 uCamLocal; uniform float uR; varying vec2 vP; varying float vDelante, vDoppler;
      void main(){ vP = position.xy / uR;
        vec3 pl = vec3(position.x, 0.0, position.y);   // en el plano del disco (el anillo está girado 90° en X)
        vec3 haciaCam = normalize(uCamLocal), vel = normalize(vec3(-position.y, 0.0, position.x));
        vDelante = dot(pl, haciaCam) / uR;
        float r = length(vP), b = 0.48 * sqrt(1.3 / max(r, 1.0));
        vDoppler = pow(sqrt(1.0 - b * b) / (1.0 - b * dot(vel, normalize(uCamLocal - pl))), 3.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform float uLatido, uLuz; varying vec2 vP; varying float vDelante, vDoppler;
      float h(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }   // azar de Hoskins (sin costuras entre GPU)
      void main(){
        float r = length(vP), x = (r - 1.25) / 5.25;
        // Bandas de 1/14 de radio, cada una con su brillo; el borde entre bandas es de un píxel (nítido, sin moaré de lejos).
        float n = r * 14.0, i = floor(n), w = fwidth(n), borde = smoothstep(0.0, w, fract(n)) * smoothstep(0.0, w, 1.0 - fract(n));
        float banda = mix(0.25, 1.0, h(i)) * mix(1.0, borde, 1.0 - smoothstep(0.3, 0.9, w));
        vec3 c = mix(vec3(1.0, 0.9, 0.7), vec3(1.0, 0.55, 0.42), smoothstep(0.0, 0.45, x)); c = mix(c, vec3(0.7, 0.2, 0.4), smoothstep(0.45, 1.0, x));
        float a = banda * pow(1.0 - x, 1.6) * smoothstep(0.0, 0.03, x) * smoothstep(0.0, 0.6, vDelante) * clamp(pow(vDoppler, 0.75), 0.3, 1.35) * (1.0 + uLatido * 0.4) * 0.34 * uLuz;
        gl_FragColor = vec4(c * a, a); }`,
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  }));
  base.rotation.x = Math.PI / 2;
  planoDisco.add(base, motasDisco, motasCaida, motasHebras);

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
       void main(){ float r = position.y, ang = position.x + uT * 0.6 * pow(${(R * 8).toFixed(1)} / r, 1.5);
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
  for (const [o, orden] of [[discoEstrellas, 0], [sombra, 1], [base, 2], [motasDisco, 3], [motasCaida, 3], [motasHebras, 3], [anillo, 4]]) o.renderOrder = orden;

  // ── Por cuadro ──
  const g = guionReposo('ton618'), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), centro = new THREE.Vector3(), q = new THREE.Quaternion(), qa = new THREE.Quaternion();
  const mDisco = motasDisco.material.uniforms, mCaida = motasCaida.material.uniforms, mHebras = motasHebras.material.uniforms;
  let giro = 0, flujo = 0, cabeza = 0, tocado = false, distanciaInicio = 0;
  const giroKepler = r => 1.0472 * Math.pow(r / R_DENTRO, -1.5);
  return {
    planoDisco, sombra, base, anillo, discoEstrellas, motasDisco, motasCaida, motasHebras, R, rFuera: R_FUERA,
    // El disco (y su galaxia de estrellas) contiene la dirección «hacia» y se inclina un poco sobre ella.
    orientar(hacia, inclinacion) { for (const o of [planoDisco, galaxia]) { o.lookAt(hacia); o.rotateX(inclinacion); } },
    // escena: null (reposo) o { guion, presencia } (js/escena/cosmos.js la mezcla con el reposo al entrar y al salir).
    actualizar(t, dt, camera, escena) {
      const w = escena ? escena.presencia : 0, s = escena ? escena.guion : g;
      grupo.updateMatrixWorld();
      // Unidad del mundo (escala de todos los padres) y cámara en el espacio del disco.
      const unidad = R * planoDisco.matrixWorld.getMaxScaleOnAxis(); comunes.uUnidad.value = unidad;
      comunes.uSombra.value = unidad;
      planoDisco.worldToLocal(comunes.uCamLocal.value.copy(camera.position));
      // De lejos (la sombra mide menos de 5 px) la lente no se distingue: solo la imagen directa.
      const d = camera.position.distanceTo(grupo.getWorldPosition(centro)), px = unidad / Math.max(1, d) * 900;
      for (const m of [motasDisco, motasCaida, motasHebras]) m.geometry.instanceCount = px > 5 ? 3 : 1;
      giro += dt; flujo += dt * 0.012 * (1 + (s.flujo - 1) * w);
      const rh = 6.6 + (1.8 - 6.6) * s.avance; cabeza += dt * giroKepler(rh);
      comunes.uGiro.value = giro; mDisco.uFlujo.value = flujo;
      comunes.uLatido.value = s.latido * w; comunes.uOnda.value = s.onda; comunes.uOndaF.value = s.ondaFuerza * w; comunes.uAcento.value = s.acento; comunes.uAcentoF.value = s.acentoFuerza * w;
      mCaida.uT.value = s.t; mCaida.uCaptura.value = w; motasCaida.visible = w > 0;
      mHebras.uT.value = s.t; mHebras.uCabeza.value = cabeza; mHebras.uAvance.value = s.avance; mHebras.uFusion.value = s.fusion; mHebras.uCorrientes.value = s.corrientes * w; mHebras.uCalma.value = s.calma;
      motasHebras.visible = s.corrientes * w > 0;
      discoEstrellas.material.uniforms.uT.value = t;
      // Anillo de fotones: mira a la cámara; su lado brillante es el del disco que se acerca. Se enciende con la escena.
      anillo.lookAt(camera.position);
      const c = comunes.uCamLocal.value; tmp.set(c.z, 0, -c.x).normalize();          // dirección (en el disco) del lado que se acerca
      tmp.applyQuaternion(planoDisco.getWorldQuaternion(q)).applyQuaternion(anillo.getWorldQuaternion(qa).invert());
      anillo.material.uniforms.uLado.value.set(tmp.x, tmp.y).normalize();
      anillo.material.uniforms.uLuz.value = (0.85 + 0.6 * s.revelar * w + 0.5 * comunes.uLatido.value) * (1 + 0.5 * s.fusion * w);
      if (!escena) { tocado = false; distanciaInicio = 0; }
    },
    // Deriva de la cámara durante la escena: rodea el agujero muy despacio alrededor del eje del disco, baja hasta mirar el
    // disco casi de canto (7,5°: la sombra con la imagen curvada encima y debajo) y se acerca un poco (más en vertical). Si la persona toca
    // la cámara, se deja de mover sola hasta la próxima escena. Sin memoria nueva por cuadro.
    derivar(camera, objetivo, dt, escena, tocando) {
      if (tocando) tocado = true;
      const w = escena ? escena.presencia * escena.guion.deriva : 0;
      if (tocado || w <= 0.001 || dt <= 0) return false;
      grupo.getWorldPosition(centro);
      const n = tmp2.set(0, 1, 0).applyQuaternion(planoDisco.getWorldQuaternion(q));
      const rel = tmp.copy(camera.position).sub(centro), d = rel.length();
      if (!distanciaInicio) distanciaInicio = d;
      rel.applyAxisAngle(n, 0.0157 * w * dt);
      const e = Math.asin(THREE.MathUtils.clamp(rel.dot(n) / d, -1, 1)), meta = (Math.sign(e) || 1) * 0.13;
      const eje = qa; eje.setFromAxisAngle(tmp2.crossVectors(rel, n).normalize(), (meta - e) * Math.min(1, dt * 0.22) * w);
      rel.applyQuaternion(eje);
      rel.multiplyScalar(1 + (distanciaInicio * (camera.aspect < 0.95 ? 0.72 : 0.88) / d - 1) * Math.min(1, dt * 0.06) * w);   // en vertical se llega más lejos: se acerca más
      camera.position.copy(centro).add(rel); camera.lookAt(objetivo);
      return true;
    }
  };
}
