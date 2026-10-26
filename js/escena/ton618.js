// TON 618: uno de los agujeros negros más grandes que se conocen, y el cuásar más luminoso. Limpio y majestuoso: una
// sombra nítida, el anillo de fotones y un disco de acreción ardiente y denso (gas en hebras que gira como un disco de
// verdad: más rápido y más caliente cerca del centro, blanco → oro → naranja → rojo, más brillante por el lado que viene
// hacia nosotros) con su imagen curvada por encima y por debajo de la sombra, como en Interstellar (superficie, con la
// ecuación de la lente de curvaLuz.js al revés). Nada de relleno alrededor.
// Su videoclip (js/util/guionTon618.js), con «I Wanna Be Yours», cuenta lo que hace un agujero negro: tragar lo que cae.
// Al llegar duerme (un disco frío y tenue); una estrella cae hacia él, la marea la estira en un hilo, pasa rozando el
// horizonte en el primer «yours» y su materia se enrosca en anillos que encienden el disco, uno en cada «yours», hasta el
// disco completo que se queda. La cabeza del hilo cruza el horizonte y desaparece. La cámara la lleva el director común
// con la pista del guion (CAMARA_TON618). Todo se crea en la carga (la preparación lo compila y lo calienta); por cuadro solo cambian uniformes.
import * as THREE from 'three';
import { GLSL_LENTE, GLSL_TAMANO, GLSL_OCULTA, geometriaMotas, materialMotas, crearAnilloFotones } from './curvaLuz.js';
import { materialSombra } from './materiales.js';
import { REPOSO_TON618, CAIDA, MARCAS_TON618, estiramiento } from '../util/guionTon618.js';

// Medidas en radios de sombra (R): borde interior del disco (la última órbita estable, algo por fuera de la sombra),
// borde exterior y las motas de cada parte (las mismas en el móvil y en el PC).
const R_DENTRO = 1.3, R_FUERA = 6.5, N_CAIDA = 6000;
// Azar con semilla (la misma forma en cada carga).
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const f = x => x.toFixed(4);

// Color por temperatura (x: 0 borde interior → 1 exterior): blanco, oro, naranja, rosa y magenta oscuro. Doppler: el lado
// que se acerca, más blanco y brillante (g > 1); el que se aleja, más rojo y apagado.
const GLSL_DISCO = /* glsl */`
  uniform float uR, uUnidad, uGiro, uEnc, uRevelar, uOla, uOlaR0, uOlaF, uBombo, uAvivar;
  uniform vec3 uCamLocal;
  vec3 temperatura(float x){
    x = clamp(x, 0.0, 1.0);
    vec3 c = mix(vec3(1.0, 0.95, 0.86), vec3(1.0, 0.72, 0.3), smoothstep(0.0, 0.14, x));
    c = mix(c, vec3(1.0, 0.36, 0.06), smoothstep(0.12, 0.42, x));
    return mix(c, vec3(0.7, 0.07, 0.03), smoothstep(0.42, 1.0, x));
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
    float d = dormido(r), rw = mix(uOlaR0, ${R_DENTRO.toFixed(2)}, uOla * uOla), x = (r - rw) / mix(0.4, 0.14, clamp(uOla, 0.0, 1.0));
    float ola = (uOla >= 0.0 ? exp(-x * x) : 0.0) * uOlaF * (0.6 + 1.1 * clamp(uOla, 0.0, 1.0)) * (1.0 - smoothstep(0.95, 1.15, uOla));
    // (El de dentro ya está a tope: el bombo y la onda avivan sobre todo el de fuera; no se quema sobre la sombra.)
    return mix(1.0, 0.13, d) * mix(1.0, uAvivar, smoothstep(1.6, 3.5, r)) * (1.0 + uBombo * smoothstep(1.8, 5.0, r)) * (1.0 + 2.4 * ola * (1.0 - d) * (0.45 + 0.55 * smoothstep(1.4, 2.2, r)));
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
export function* construirTon618({ uScale, uPR, R, grupo }) {
  const planoDisco = new THREE.Group(); grupo.add(planoDisco);
  const comunes = { uScale, uPR, uMaximo: { value: 3 }, uSombra: { value: R }, uR: { value: R }, uUnidad: { value: R }, uGiro: { value: 0 },
    uEnc: { value: 1 }, uRevelar: { value: 1 }, uOla: { value: -1 }, uOlaR0: { value: 6.8 }, uOlaF: { value: 0 }, uBombo: { value: 0 }, uAvivar: { value: 1 }, uFlujo: { value: 0 }, uCamLocal: { value: new THREE.Vector3(0, 0, 1e6) } };
  const al = azar(618);

  // ── Sombra: negra, con el borde suavizado en su último píxel; escribe su profundidad (tapa lo que hay detrás). ──
  const sombra = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), materialSombra({ depthTest: true, depthWrite: true }));
  grupo.add(sombra);

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
        // Compacta hasta que la marea la estira; ya en hilo, un grosor fino que se ensancha al enroscarse. (Por detrás del
        // agujero, su imagen ya se ve estirada a lo ancho: la lente la alarga alrededor de la sombra.)
        float estira = clamp(uE / 0.3, 0.0, 1.0);
        pl += aOff * (0.08 * (1.0 - estira) + 0.018 + 0.06 * smoothstep(0.0, 4.0, tau)) * vec3(1.0, mix(1.0, 0.25, 1.0 - plano), 1.0);
        r = length(pl.xz);
        // Color: la estrella, blanca y cálida; al bajar se calienta (blanco azulado en el pericentro) y, ya en el disco,
        // el color de su anillo.
        // La estrella, dorada; ya en hilo, la cabeza caliente (blanca) y la cola más fría (naranja → roja).
        vec3 c = mix(vec3(1.0, 0.82, 0.5), mix(vec3(1.0, 0.42, 0.22), vec3(1.0, 0.92, 0.78), smoothstep(-0.9, 0.5, aK.x)), estira);
        c = mix(c, vec3(0.9, 0.93, 1.0), (1.0 - smoothstep(2.6, 5.0, r)) * plano * 0.6);
        c = mix(c, temperatura((r - ${R_DENTRO.toFixed(2)}) / ${(R_FUERA - R_DENTRO).toFixed(2)}), 1.0 - plano);
        float th = atan(pl.z, pl.x), g = doppler(r, th, pl, c);
        float nucleo = 1.0 + (1.0 - estira) * 0.8 * uLatidoE + 1.2 * smoothstep(0.75, 0.97, aK.x) * estira;   // la cabeza del hilo, nítida
        float brillo = mix(0.2, 0.42, estira) * nucleo * (1.0 - 0.35 * abs(aK.x)) * mix(1.0, clamp(pow(g, 0.75), 0.35, 1.35) * inclinacion(pl * uR), 1.0 - plano)
          * mix(1.0, luzEscena(r), 0.4 * (1.0 - plano)) * smoothstep(1.02, 1.3, length(pl)) * uCaida;
        ${GLSL_FINAL}
      }`));
  }

  yield;
  // ── Superficie del disco: el gas ardiente y continuo bajo las motas, con su imagen curvada (como en Interstellar). Un
  // cuadrado frente a la cámara que cubre el disco; en cada píxel, el rayo de vista: si toca el disco por delante del
  // agujero, ese punto; si no, la ecuación de la lente (la misma de las motas, GLSL_LENTE, pero al revés: del píxel a la
  // fuente) da el punto del disco de DETRÁS que se ve ahí, por encima y por debajo de la sombra (la imagen secundaria,
  // pegada a la sombra, sale sola: θ < θE manda al lado opuesto). La lente conserva el brillo de superficie: no hay que
  // corregirlo. El gas: hebras finas a lo largo de las órbitas (ruido estirado en el ángulo), que giran con su velocidad
  // de Kepler (dos fases que se relevan, para que el giro diferencial no las enrosque sin fin), blanco en el borde interior
  // → oro → naranja → rojo, y el lado que viene hacia nosotros más brillante y blanco (Doppler). Nítido: sin halos. ──
  const superficie = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { ...comunes, uC: { value: new THREE.Vector3() }, uN: { value: new THREE.Vector3() }, uX: { value: new THREE.Vector3() }, uZ: { value: new THREE.Vector3() }, uLuzSup: { value: 1 } },
    vertexShader: 'varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: /* glsl */`
      ${GLSL_DISCO}
      uniform vec3 uC, uN, uX, uZ; uniform float uSombra, uLuzSup, uFlujo; varying vec3 vV;
      float hash(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
      // Ruido de valor periódico en y (periodo K: el ángulo da la vuelta sin costura).
      float ruido(vec2 p, float K){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        float y0 = mod(i.y, K), y1 = mod(i.y + 1.0, K);
        return mix(mix(hash(vec2(i.x, y0)), hash(vec2(i.x + 1.0, y0)), f.x), mix(hash(vec2(i.x, y1)), hash(vec2(i.x + 1.0, y1)), f.x), f.y); }
      // Hebras del gas en el radio r y el ángulo a (ya girado por su órbita); semilla s para cada fase.
      float hebras(float r, float a, float s){
        // Hebras finas a lo largo de la órbita, torcidas en espiral (la materia baja mientras gira), con remolinos (el
        // ángulo se deforma con un ruido grande) y rotas en grumos.
        float u = log(r) * 24.0 + s + uFlujo, v = a * ${f(8 / (2 * Math.PI))} + log(r) * 1.6;
        v += 1.4 * ruido(vec2(u * 0.22 + 3.0, v * 0.5), 4.0);
        u += 1.2 * ruido(vec2(u * 0.3, v * 1.0 + 9.0), 8.0);
        float n = ruido(vec2(u, v + s), 8.0) * 0.6 + ruido(vec2(u * 2.7 + 7.0, v * 2.0 + u * 0.15), 16.0) * 0.4;
        return smoothstep(0.42, 0.86, n);
      }
      // Luz del disco en el punto P (vista, en radios de sombra, centro c): color y brillo (0 fuera del disco).
      vec3 disco(vec3 P, vec3 c, vec3 haciaCam){
        vec3 q = P - c; float x = dot(q, uX), z = dot(q, uZ), r = length(vec2(x, z));
        if (r < ${R_DENTRO.toFixed(2)} || r > ${R_FUERA.toFixed(2)}) return vec3(0.0);
        float a = atan(z, x), w = giroKepler(r), T = 9.0, f1 = fract(uGiro / T), f2 = fract(uGiro / T + 0.5), k1 = 1.0 - abs(2.0 * f1 - 1.0);
        float h = hebras(r, a - w * f1 * T, 0.0) * k1 + hebras(r, a - w * f2 * T, 17.0) * (1.0 - k1);
        float xr = (r - ${R_DENTRO.toFixed(2)}) / ${(R_FUERA - R_DENTRO).toFixed(2)}, d = dormido(r);
        // Fuego: blanco en el borde interior → oro → naranja → rojo profundo; dormido, más frío y oscuro.
        vec3 col = temperatura(xr + 0.35 * d);
        // Doppler: velocidad de la órbita (el mismo sentido de giro que las motas).
        vec3 vel = -sin(a) * uX + cos(a) * uZ;
        float b = 0.48 * sqrt(${R_DENTRO.toFixed(2)} / r), g = sqrt(1.0 - b * b) / (1.0 - b * dot(vel, haciaCam));
        col = mix(col, vec3(0.9, 0.93, 1.0), clamp(g - 1.0, 0.0, 1.0) * 0.4);
        col = mix(col, col * vec3(1.0, 0.55, 0.45), clamp(1.0 - g, 0.0, 1.0) * 0.6);
        float borde = smoothstep(${R_DENTRO.toFixed(2)}, ${(R_DENTRO + 0.06).toFixed(2)}, r) * pow(1.0 - smoothstep(2.6, ${(R_FUERA - 0.1).toFixed(2)}, r), 1.6);
        float I = pow(${R_DENTRO.toFixed(2)} / r, 1.15) * (0.03 + 1.25 * h) * clamp(g * g * g, 0.2, 2.6) * luzEscena(r) * mix(1.0, 0.2, d) * borde * 0.75;
        return col * I;
      }
      void main(){
        float R = uSombra; vec3 dd = normalize(vV), c = uC / R; float D = length(c); vec3 e = c / D;
        vec3 luz = vec3(0.0);
        // Imagen directa: el rayo toca el disco por delante del plano del agujero.
        float dn = dot(dd, uN), tc = dot(c, uN) / (abs(dn) > 1e-5 ? dn : 1e-5);
        bool delante = false;
        if (tc > 0.0) { vec3 P = dd * tc; if (dot(P, e) - D <= 0.0) { luz += disco(P, c, -dd); delante = true; } }
        // Imagen curvada: θ (en el plano del agujero) → β = θ (1 − θE²/θ²) → el punto del disco de detrás (z > 0).
        vec3 L = dd * (D / dot(dd, e)) - c; float th2 = max(dot(L, L), 1e-6), th = sqrt(th2);
        float fuera = smoothstep(1.0, 1.0 + 2.0 * fwidth(th), th);
        if (fuera > 0.0) {
          // La profundidad z de la fuente (detrás del plano del agujero) por bisección: el rayo desviado, β(z) = θ (1 −
          // θE(z)²/θ²), debe caer en el plano del disco. Con punto fijo oscilaba sin converger (salían paredes falsas).
          // (Se busca el primer cambio de signo en pasos de 0,75 R —con la lente F puede cambiar de signo dos veces— y
          // después se afina.)
          float nc = dot(uN, c), a0 = 0.0, F0 = dot(uN, c + L) - nc, a1 = -1.0;
          for (int k = 1; k <= 10; k++) {
            float zk = float(k) * 0.75; vec3 Bk = L * (1.0 - 2.0 * ${f(1 / 2.6)} * zk * D / (D + zk) / th2);
            float Fk = dot(uN, (c + Bk) * ((D + zk) / D)) - nc;
            if (Fk * F0 < 0.0) { a1 = zk; break; }
            a0 = zk; F0 = Fk;
          }
          if (a1 > 0.0) {
            for (int k = 0; k < 8; k++) {
              float zm = 0.5 * (a0 + a1); vec3 Bm = L * (1.0 - 2.0 * ${f(1 / 2.6)} * zm * D / (D + zm) / th2);
              float Fm = dot(uN, (c + Bm) * ((D + zm) / D)) - nc;
              if (Fm * F0 < 0.0) a1 = zm; else { a0 = zm; F0 = Fm; }
            }
            float z = 0.5 * (a0 + a1); vec3 B = L * (1.0 - 2.0 * ${f(1 / 2.6)} * z * D / (D + z) / th2), S = (c + B) * ((D + z) / D);
            luz += disco(S, c, -normalize(S)) * fuera;
          }
        }
        luz *= uLuzSup;
        gl_FragColor = vec4(luz, 1.0);
      }`,
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  }));
  superficie.frustumCulled = false;
  // Cada vez que se dibuja (con la cámara de ese dibujo): el cuadrado delante del disco, del tamaño justo, y el agujero en
  // los ejes de la vista.
  {
    const m = new THREE.Matrix4(), cw = new THREE.Vector3(), pw = new THREE.Vector3(), qd = new THREE.Quaternion(), qg = new THREE.Quaternion(), sg = new THREE.Vector3(), u = superficie.material.uniforms;
    superficie.onBeforeRender = (renderer, scene, cam) => {
      grupo.getWorldPosition(cw); planoDisco.getWorldQuaternion(qd);
      const Rw = comunes.uSombra.value, rx = Rw * (R_FUERA + 0.6), D = cw.distanceTo(cam.position);
      const ds = Math.max(D - rx, D * 0.15, cam.near * 4), tanA = D > rx * 1.05 ? rx / Math.sqrt(D * D - rx * rx) : 3, mitad = ds * Math.min(3, tanA * 1.08);
      pw.copy(cw).sub(cam.position).normalize().multiplyScalar(ds).add(cam.position);
      // Del mundo al grupo (el cuadrado vive en el grupo del agujero).
      grupo.updateMatrixWorld(); m.copy(grupo.matrixWorld).invert();
      superficie.position.copy(pw).applyMatrix4(m);
      grupo.matrixWorld.decompose(sg, qg, sg); grupo.getWorldScale(sg);
      superficie.quaternion.copy(qg).invert().multiply(cam.quaternion);
      superficie.scale.set(mitad / sg.x, mitad / sg.x, 1);
      superficie.updateMatrixWorld(); superficie.modelViewMatrix.multiplyMatrices(cam.matrixWorldInverse, superficie.matrixWorld);
      u.uC.value.copy(cw).applyMatrix4(cam.matrixWorldInverse);
      u.uN.value.set(0, 1, 0).applyQuaternion(qd).transformDirection(cam.matrixWorldInverse);
      u.uX.value.set(1, 0, 0).applyQuaternion(qd).transformDirection(cam.matrixWorldInverse);
      u.uZ.value.set(0, 0, 1).applyQuaternion(qd).transformDirection(cam.matrixWorldInverse);
    };
  }
  // (La malla en anillo queda solo como medida del disco: cosmos.medidas lee su radio exterior.)
  const base = new THREE.Mesh(new THREE.RingGeometry(R * 1.25, R * R_FUERA, 8, 1), new THREE.MeshBasicMaterial());
  base.rotation.x = Math.PI / 2; base.visible = false;
  planoDisco.add(base, motasCaida); grupo.add(superficie);

  // ── Anillo de fotones (mira a la cámara) ──
  const anillo = crearAnilloFotones(R, ['#fff4e2', '#ffb38a']);
  grupo.add(anillo);

  // Orden interno fijo: la sombra primero (escribe profundidad), después lo luminoso (la prueba de profundidad decide qué
  // tapa la sombra: lo de detrás; lo de delante pasa por encima), y el anillo de fotones al final.
  for (const [o, orden] of [[sombra, 1], [superficie, 2], [motasCaida, 3], [anillo, 4]]) o.renderOrder = orden;

  // ── Por cuadro ──
  const tmp = new THREE.Vector3(), centro = new THREE.Vector3(), q = new THREE.Quaternion(), qa = new THREE.Quaternion();
  const mCaida = motasCaida.material.uniforms, v = {};
  let giro = 0, flujo = 0;
  // Mezcla del guion de la escena con el reposo según su presencia (al entrar y al salir, sin saltos).
  const mezclar = (s, w) => { for (const k in REPOSO_TON618) v[k] = REPOSO_TON618[k] + ((s ? s[k] : REPOSO_TON618[k]) - REPOSO_TON618[k]) * w; return v; };
  return {
    planoDisco, sombra, base, superficie, anillo, motasCaida, R, rFuera: R_FUERA,
    // El disco contiene la dirección «hacia» y se inclina un poco sobre ella.
    orientar(hacia, inclinacion) { planoDisco.lookAt(hacia); planoDisco.rotateX(inclinacion); },
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
      motasCaida.geometry.instanceCount = px > 5 ? 3 : 1;
      giro += dt; flujo += dt * 0.5 * s.flujo;   // la materia baja en espiral (más deprisa mientras come)
      comunes.uGiro.value = giro; comunes.uFlujo.value = flujo;
      comunes.uEnc.value = s.encendido; comunes.uRevelar.value = s.revelar; comunes.uBombo.value = s.bombo; comunes.uAvivar.value = s.avivar; superficie.material.uniforms.uLuzSup.value = 1 + 0.8 * s.cumbre;
      comunes.uOla.value = escena && w > 0 ? escena.guion.ola : -1; comunes.uOlaR0.value = escena ? escena.guion.olaR0 : 6.8; comunes.uOlaF.value = s.olaF;
      // La estrella: su reloj es el de la canción; estiramiento de la marea (guionTon618.estiramiento).
      const tE = escena ? escena.guion.t : 0;
      mCaida.uT.value = tE; mCaida.uE.value = estiramiento(tE);
      mCaida.uCaida.value = s.caida; mCaida.uLatidoE.value = s.latidoEstrella; motasCaida.visible = s.caida > 0.001;
      // Anillo de fotones: mira a la cámara; su lado brillante es el del disco que se acerca. Dormido, más tenue; en cada
      // «yours», más vivo (sigue siendo una línea de 1–1,5 px).
      anillo.lookAt(camera.position);
      const c = comunes.uCamLocal.value; tmp.set(c.z, 0, -c.x).normalize();          // dirección (en el disco) del lado que se acerca
      tmp.applyQuaternion(planoDisco.getWorldQuaternion(q)).applyQuaternion(anillo.getWorldQuaternion(qa).invert());
      anillo.material.uniforms.uLado.value.set(tmp.x, tmp.y).normalize();
      anillo.material.uniforms.uLuz.value = 0.8 * (0.55 + 0.45 * Math.min(1.2, s.revelar)) + 0.5 * s.destello;
    }
  };
}
