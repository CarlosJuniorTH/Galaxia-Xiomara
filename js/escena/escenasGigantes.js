// Lo que se dibuja en las escenas del púlsar y de Deneb (sus tiempos y curvas: js/util/escenasGigantes.js).
// Toda la luz nueva son motas nítidas de 1,5–3 píxeles (nada de halos ni degradados) y nada tapa a los
// gigantes: las motas que caen delante de la estrella, en la línea de la cámara, se apagan. Las geometrías y
// los materiales se crean en la carga (preparacion.js los compila y calienta); en cada cuadro solo cambian
// uniformes y, en Deneb, la posición del mundo nuevo (sin memoria nueva). Ocultos mientras no hay escena.
import * as THREE from 'three';
import { EXPOSICION } from './exposicion.js';

// Azar con semilla: las mismas motas en cada carga y en cada aparato.
function azarCon(semilla) { let s = semilla >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; }

const motas = (uniforms, vertexShader, colorFinal = 'vC') => new THREE.ShaderMaterial({
  uniforms, vertexShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  // Punto redondo con núcleo: nítido, sin cola difusa (y sin discard: mejor para las GPU de teselas del móvil).
  fragmentShader: /* glsl */`varying vec3 vC; varying float vA;
    void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(max(1.0 - d * 2.0, 0.0), 1.6) + (1.0 - smoothstep(0.0, 0.18, d)) * 0.8;
      // Luz sumada tal cual (alfa 1 con mezcla aditiva): con (c·k, k) se sumaba c·k² y las motas se perdían.
      float k = a * vA; gl_FragColor = vec4(${colorFinal} * k, 1.0); }`
});

// Tamaño en píxeles de una mota de `tam` unidades locales (como las de la supernova) y su luz: las que
// quedan por debajo del mínimo se reparten en 1,5 px con menos luz (no parpadean al girar).
const TAMANO = /* glsl */`
  float tamMota(float tam, vec4 mv, float maximo){ float px = tam * length(modelViewMatrix[0].xyz) * uScale / max(1.0, -mv.z);
    gl_PointSize = clamp(px, 1.5, maximo * uPR); return min(1.0, px * px / 2.25); }
  // Delante de la estrella (en la línea de la cámara, dentro de un cono de radio uSilueta en el centro) no
  // hay motas: el gigante se ve limpio. Todo en el espacio de la vista (sin coordenadas enormes).
  float fueraSilueta(vec4 mv){ vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float dc = max(length(c), 1.0); vec3 eje = c / dc;
    float t = dot(mv.xyz, eje), r = uSilueta * length(modelViewMatrix[0].xyz) * t / dc;
    return 1.0 - step(t, dc) * step(0.0, t) * (1.0 - smoothstep(r * 0.8, r * 1.2, length(mv.xyz - eje * t))); }`;

// ── Púlsar: motas de la nebulosa del Cangrejo y motas que llenan los dos haces ──
// nebulosa: en el espacio del púlsar (caja de su gas 6000 × 4600 × 4800); haces: en el grupo magnético
// (giran con ellos), a lo largo de ±Y hasta 2200, dentro del cono de cada haz.
export function crearEscenaPulsar({ uScale, uPR }) {
  const azar = azarCon(1054);
  // Filamentos como hilos: 120 caminos que serpentean por la cáscara exterior (r 0,5–0,97 del volumen), con las
  // motas a lo largo de cada uno (se leen como hebras de luz, no como estrellas sueltas); dentro, el gas azul de
  // sincrotrón, ralo. Cada mota guarda su radio (el frente de luz la enciende al pasar) y dos números al azar.
  const N = 16000, NI = 2400, pos = new Float32Array(N * 3), dato = new Float32Array(N * 3);
  const p = [0, 0, 0], dir = [0, 0, 0], guardar = (i, x, y, z) => { const r = Math.hypot(x, y, z); pos.set([x * 2300, y * 1750, z * 1800], i * 3); dato.set([r, azar(), azar()], i * 3); };
  for (let i = 0; i < NI;) { const x = azar() * 2 - 1, y = azar() * 2 - 1, z = azar() * 2 - 1, r = Math.hypot(x, y, z); if (r > 0.5 || r < 0.18) continue; guardar(i++, x, y, z); }
  const porHilo = Math.ceil((N - NI) / 120);   // 120 hilos
  for (let i = NI, h = 0; i < N; h++) {
    const z0 = azar() * 2 - 1, f0 = azar() * Math.PI * 2, q0 = Math.sqrt(1 - z0 * z0), r0 = 0.55 + azar() * 0.38;
    p[0] = Math.cos(f0) * q0 * r0; p[1] = z0 * r0; p[2] = Math.sin(f0) * q0 * r0;
    for (let k = 0; k < 3; k++) dir[k] = azar() * 2 - 1;
    const curva = 0.12 + azar() * 0.22, grosor = 0.006 + azar() * 0.01;
    for (let k = 0; k < porHilo && i < N; k++) {
      // Avanza girando poco a poco; si se sale de la cáscara, vuelve hacia ella.
      for (let e = 0; e < 3; e++) dir[e] += (azar() - 0.5) * curva;
      const r = Math.hypot(p[0], p[1], p[2]), hacia = r > 0.97 ? -0.4 : r < 0.5 ? 0.4 : 0;
      for (let e = 0; e < 3; e++) dir[e] += p[e] / r * hacia;
      const L = Math.hypot(dir[0], dir[1], dir[2]) || 1;
      for (let e = 0; e < 3; e++) { dir[e] /= L; p[e] += dir[e] * 0.009; }
      guardar(i++, p[0] + (azar() - 0.5) * grosor, p[1] + (azar() - 0.5) * grosor, p[2] + (azar() - 0.5) * grosor);
    }
  }
  const gN = new THREE.BufferGeometry(); gN.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gN.setAttribute('aDato', new THREE.BufferAttribute(dato, 3));
  const uN = { uScale, uPR, uExpo: EXPOSICION, uFrente: { value: 0 }, uLuz: { value: 0 }, uT: { value: 0 }, uSilueta: { value: 200 }, uTitileo: { value: 1 }, uPulso: { value: 0 }, uTibio: { value: 0 }, uBase: { value: 0.8 } };
  const nebulosa = new THREE.Points(gN, motas(uN, /* glsl */`attribute vec3 aDato; uniform float uScale, uPR, uExpo, uFrente, uLuz, uT, uSilueta, uTitileo, uPulso, uTibio, uBase; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
      // Se encienden del centro hacia fuera al pasar el frente de luz (una onda nítida, no un brillo).
      float r = aDato.x, encendida = smoothstep(r - 0.12, r, uFrente), onda = exp(-pow((uFrente - r) * 9.0, 2.0)) * step(r, uFrente + 0.12);
      // Filamentos rojo-anaranjados y rosados por fuera; dentro, el azul de sincrotrón.
      vec3 fuera = mix(vec3(1.0, 0.42, 0.26), vec3(1.0, 0.62, 0.72), aDato.y), dentro = vec3(0.6, 0.76, 1.0);
      vC = mix(dentro, fuera, smoothstep(0.42, 0.6, r)) * (1.0 + onda * 1.4);
      vC = mix(vC, mix(vec3(1.0, 0.6, 0.78), vec3(1.0, 0.82, 0.5), aDato.y), uTibio * 0.6);   // segunda vuelta: rosa y oro
      // Late con la canción: cada pulso la aviva (los hilos de fuera algo después: la luz sale del púlsar).
      float late = 0.7 + 0.5 * uPulso * (1.0 - 0.35 * r);
      float titila = 1.0 - uTitileo * 0.35 * (0.5 + 0.5 * sin(uT * (0.8 + aDato.z * 1.6) + aDato.z * 40.0));
      vA = (uBase + uLuz * encendida * late) * titila * (0.6 + 0.4 * aDato.z) * tamMota(14.0 + aDato.z * 14.0, mv, 3.0) * fueraSilueta(mv) * uExpo; }`));
  nebulosa.frustumCulled = false; nebulosa.visible = false;

  const NH = 4000, pH = new Float32Array(NH * 3);
  for (let i = 0; i < NH; i++) pH.set([azar(), azar(), i % 2 ? 1 : -1], i * 3);
  const gH = new THREE.BufferGeometry(); gH.setAttribute('position', new THREE.BufferAttribute(pH, 3));
  const uH = { uScale, uPR, uExpo: EXPOSICION, uFlujo: { value: 0 }, uLuz: { value: 0 }, uApertura: { value: 1 }, uTibio: { value: 0 }, uSilueta: { value: 0 }, uEdad: { value: 9 }, uOnda: { value: 0 }, uBase: { value: 0.35 } };
  const haces = new THREE.Points(gH, motas(uH, /* glsl */`uniform float uScale, uPR, uExpo, uFlujo, uLuz, uApertura, uTibio, uSilueta, uEdad, uOnda, uBase; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){
      // La luz sale del polo y recorre el haz hacia fuera (despacio: el tiempo casi se ha parado).
      float f = fract(position.x + uFlujo * (0.7 + 0.6 * position.y)), y = 200.0 + f * 2000.0;
      float a = position.y * 6.2832 + position.x * 40.0, r = (y / 2200.0) * 150.0 * uApertura * sqrt(fract(position.x * 7.31 + position.y * 3.7));
      vec4 mv = modelViewMatrix * vec4(cos(a) * r, position.z * y, sin(a) * r, 1.0); gl_Position = projectionMatrix * mv;
      vC = mix(vec3(0.82, 0.9, 1.0), vec3(1.0, 0.8, 0.9), uTibio * (0.4 + 0.6 * position.y));
      // Cada pulso de la canción lanza una onda de luz que recorre el haz hacia fuera (en ~0,7 s).
      float onda = exp(-pow((f - uEdad * 1.4) * 7.0, 2.0)) * uOnda;
      vA = (uBase + uLuz) * smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.7, 1.0, f)) * (0.6 + 0.5 * position.y) * (1.0 + 2.2 * onda) * tamMota(13.0 + position.y * 11.0, mv, 2.8) * uExpo; }`));
  haces.frustumCulled = false; haces.visible = false;

  let flujo = 0, tPrevio = null;
  nebulosa.visible = haces.visible = true;
  return {
    nebulosa, haces,
    // e: estado de js/util/escenasGigantes.js (estadoPulsar); peso: 1 en escena, → 0 al cancelarla.
    // Siempre visibles: la nebulosa y los haces SON de motas (su luz de siempre, uBase); la escena las enciende más.
    actualizar(e, peso, s, t, reducido) {
      const dt = tPrevio === null ? 0 : Math.min(0.1, Math.max(0, t - tPrevio)); tPrevio = t;
      const ver = peso > 0.0005, w = ver ? peso : 0;
      flujo += dt * (reducido ? 0.025 : 0.06) * (1 + (e.tiempo - 1) * w * 0.8);   // en la escena la luz del haz va más despacio
      uH.uFlujo.value = flujo; uN.uT.value = t; uN.uTitileo.value = reducido ? 0 : 1;
      uN.uFrente.value = ver ? e.nebulosa : 0; uN.uLuz.value = e.brillo * w * 1.3; uN.uPulso.value = e.pulso * w; uN.uTibio.value = e.tibio * w;
      uH.uLuz.value = e.motasHaz * w; uH.uApertura.value = 1 + (e.apertura - 1) * w; uH.uTibio.value = Math.max(e.brillo * 0.4, e.tibio) * w; uH.uEdad.value = e.edad; uH.uOnda.value = reducido ? 0 : e.fuerza * w;
    }
  };
}

// ── Cuásar: las motas de su escena (el resto lo hace el propio cuásar: chorros que crecen, disco, núcleo; cuasar.js) ──
// En el espacio del cuásar (CUASAR de cuasar.js: disco 300–1100, chorros de 7600 por ±Y, galaxia de radio 4800). El disco
// está en el plano XZ. Se dibujan por encima del remolino (como su polvo estelar) y la sombra del horizonte, que va encima
// de todo, las tapa si caen delante. (Sin anillo de motas girando alrededor del disco: Carlos no lo quería.)
//  · chorros: un hilo de motas que sube por cada chorro, siempre; en la escena, solo hasta donde ha llegado el chorro, con
//    su frente brillante mientras crece;
//  · otras: lucecitas de colores por toda la galaxia (las otras mujeres), que se apagan con «pero ella»;
//  · onda: en «es mi mujer…» la luz de la galaxia se recoge en el núcleo y en «…ideal» sale del disco hacia fuera;
//  · lóbulos: en las puntas de los chorros, cuando llegan enteros, la luz florece (motas que se abren y se apagan).
export function crearEscenaCuasar({ uScale, uPR, largo = 7600 }) {
  const azar = azarCon(3107), grupo = new THREE.Group();

  const NC = 5000, pC = new Float32Array(NC * 3);
  for (let i = 0; i < NC; i++) pC.set([azar(), azar(), i % 2 ? 1 : -1], i * 3);
  const gC = new THREE.BufferGeometry(); gC.setAttribute('position', new THREE.BufferAttribute(pC, 3));
  const uC = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uBase: { value: 0.4 }, uSubida: { value: 1.05 }, uFrente: { value: 0 }, uFlujo: { value: 0 }, uCalido: { value: 0 }, uSilueta: { value: 0 } };
  const chorros = new THREE.Points(gC, motas(uC, /* glsl */`uniform float uScale, uPR, uExpo, uLuz, uBase, uSubida, uFrente, uFlujo, uCalido, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float f = fract(position.x + uFlujo * (0.4 + 0.6 * position.y)), y = 300.0 + f * ${(largo * 0.93).toFixed(1)}, yf = y / ${largo.toFixed(1)};
      float a = position.y * 6.2832 + position.x * 31.0 + f * 9.0, r = (30.0 + 300.0 * f) * sqrt(fract(position.x * 7.13 + position.y * 3.1));
      vec4 mv = modelViewMatrix * vec4(cos(a) * r, position.z * y, sin(a) * r, 1.0); gl_Position = projectionMatrix * mv;
      // Hasta donde ha llegado el chorro (en reposo, 1,05: entero) y su frente, que brilla mientras crece.
      float dentro = 1.0 - smoothstep(uSubida - 0.03, uSubida, yf), frente = exp(-pow((yf - uSubida + 0.015) / 0.02, 2.0)) * uFrente;
      vC = mix(mix(vec3(1.0), vec3(0.7, 0.8, 1.0), f), mix(vec3(1.0, 0.66, 0.8), vec3(1.0, 0.85, 0.55), position.y), uCalido);
      float base = uBase * (0.4 + 0.6 * position.y) * (1.0 - smoothstep(0.75, 1.0, f));
      vA = ((base + uLuz * (0.5 + 0.5 * position.y)) * dentro + frente * 2.4) * tamMota(20.0 + position.y * 16.0, mv, 2.8) * uExpo; }`));
  chorros.renderOrder = 22;

  // Las otras (impresionantes, bellas, exitosas… pero no ella): 48 estrellas brillantes repartidas por la galaxia, cada una
  // con su cruz de luz fina (nítida: un punto y dos trazos de 1 px, sin halo), que se encienden una tras otra con la frase y
  // titilan; con «pero ella» se apagan todas. Tamaño fijo en pantalla: se leen igual de cerca que de lejos.
  const NO = 48, pO = new Float32Array(NO * 3), dO = new Float32Array(NO * 2);
  for (let i = 0; i < NO; i++) { const r = 1500 + 3000 * Math.sqrt(azar()), a = azar() * Math.PI * 2; pO.set([Math.cos(a) * r, (azar() - 0.5) * 160, Math.sin(a) * r], i * 3); dO.set([(i + azar() * 0.8) / NO, azar()], i * 2); }
  const gO = new THREE.BufferGeometry(); gO.setAttribute('position', new THREE.BufferAttribute(pO, 3)); gO.setAttribute('aDato', new THREE.BufferAttribute(dO, 2));
  const uO = { uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uT: { value: 0 }, uTitileo: { value: 1 } };
  const otras = new THREE.Points(gO, new THREE.ShaderMaterial({
    uniforms: uO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`attribute vec2 aDato; uniform float uPR, uExpo, uLuz, uT, uTitileo; varying vec3 vC; varying float vA, vBrazo;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float h = aDato.x, h2 = aDato.y;
        vC = h2 < 0.3 ? vec3(1.0, 0.85, 0.6) : h2 < 0.55 ? vec3(0.75, 0.85, 1.0) : h2 < 0.8 ? vec3(1.0, 0.72, 0.86) : vec3(1.0);
        // Cada una se enciende a su turno (h: su orden) con un destello breve y luego titila.
        float x = (uLuz - h * 0.85) / 0.15, aparece = clamp(x, 0.0, 1.0), destello = exp(-pow(x - 1.0, 2.0) * 2.0) * step(0.0, x);
        float titila = 1.0 - uTitileo * 0.35 * (0.5 + 0.5 * sin(uT * (1.4 + h2 * 2.2) + h * 40.0));
        vBrazo = 0.55 + 0.45 * titila + 0.6 * destello;
        gl_PointSize = 19.0 * uPR; vA = 1.8 * aparece * min(1.0, uLuz * 3.0) * titila * (1.0 + destello) * uExpo * step(0.0, -mv.z); }`,
    fragmentShader: /* glsl */`varying vec3 vC; varying float vA, vBrazo;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q);
        float nucleo = 1.0 - smoothstep(0.05, 0.09, d);
        float largo = 0.5 * vBrazo, brazos = (1.0 - smoothstep(0.012, 0.04, abs(q.x))) * max(0.0, 1.0 - abs(q.y) / largo) + (1.0 - smoothstep(0.012, 0.04, abs(q.y))) * max(0.0, 1.0 - abs(q.x) / largo);
        float k = (nucleo + brazos * 0.75) * vA; gl_FragColor = vec4(vC * k, 1.0); }`
  }));
  otras.renderOrder = 16;

  // La onda: primero (uConv 0 → 1) motas de toda la galaxia caen en espiral al núcleo; luego (uCima ≥ 0, segundos) sale una
  // onda de motas del disco hacia fuera, nítida, que se apaga al alejarse.
  const NE = 3600, pE = new Float32Array(NE * 3);
  for (let i = 0; i < NE; i++) pE.set([azar() * Math.PI * 2, azar(), azar()], i * 3);
  const gE = new THREE.BufferGeometry(); gE.setAttribute('position', new THREE.BufferAttribute(pE, 3));
  const uE = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uCima: { value: -1 }, uConv: { value: -1 }, uSilueta: { value: 330 } };
  const onda = new THREE.Points(gE, motas(uE, /* glsl */`uniform float uScale, uPR, uExpo, uLuz, uCima, uConv, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float r, a, h, luz;
      if (uConv >= 0.0) {
        float c = uConv * uConv * (3.0 - 2.0 * uConv), r0 = 1500.0 + 3200.0 * position.y;
        r = mix(r0, 330.0, c); a = position.x + c * (2.5 + 2.0 * position.z); h = (position.z - 0.5) * 120.0 * (1.0 - c);
        luz = smoothstep(0.0, 0.25, uConv) * (1.0 - smoothstep(0.85, 1.0, uConv) * 0.6);
      } else {
        float t = max(uCima, 0.0); r = 1100.0 + t * 2300.0 * (0.75 + 0.5 * position.y); a = position.x + t * 0.1; h = (position.z - 0.5) * 90.0 * (0.3 + t);
        luz = step(0.0, uCima) * smoothstep(0.0, 0.15, uCima) * (1.0 - smoothstep(0.8, 2.3, t));
      }
      vec4 mv = modelViewMatrix * vec4(cos(a) * r, h, sin(a) * r, 1.0); gl_Position = projectionMatrix * mv;
      vC = mix(vec3(1.0, 0.7, 0.84), vec3(1.0, 0.9, 0.62), position.z);
      vA = uLuz * luz * tamMota(22.0 + position.z * 16.0, mv, 3.0) * fueraSilueta(mv) * uExpo; }`));
  onda.renderOrder = 16;

  // Lóbulos que florecen: en cada punta, motas que se abren desde el final del chorro (uEst: segundos desde que llegan).
  const NL = 1200, pL = new Float32Array(NL * 3);
  for (let i = 0; i < NL; i++) pL.set([azar(), azar(), i % 2 ? 1 : -1], i * 3);
  const gL = new THREE.BufferGeometry(); gL.setAttribute('position', new THREE.BufferAttribute(pL, 3));
  const uL = { uScale, uPR, uExpo: EXPOSICION, uEst: { value: -1 }, uLuz: { value: 0 }, uSilueta: { value: 0 } };
  const lobulos = new THREE.Points(gL, motas(uL, /* glsl */`uniform float uScale, uPR, uExpo, uEst, uLuz, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float t = max(uEst, 0.0), z = position.x * 2.0 - 1.0, ph = position.y * 6.2832, q = sqrt(max(0.0, 1.0 - z * z));
      vec3 d = vec3(q * cos(ph), z * 0.8 + 0.35, q * sin(ph));   // hacia fuera (un poco más en la dirección del chorro)
      float k = fract(position.x * 13.7 + position.y * 7.1), R = 2100.0 * (1.0 - exp(-t * 2.2)) * (0.45 + 0.55 * k);
      vec3 p = vec3(0.0, ${(largo * 0.97).toFixed(1)}, 0.0) + d * R; p.y *= position.z;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
      vC = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.75, 0.88), k);
      vA = uLuz * step(0.0, uEst) * smoothstep(0.0, 0.12, uEst) * (1.0 - smoothstep(0.5, 1.5, t)) * tamMota(60.0 + k * 40.0, mv, 3.0) * uExpo; }`));
  lobulos.renderOrder = 22;

  for (const o of [chorros, otras, onda, lobulos]) { o.frustumCulled = false; o.visible = false; grupo.add(o); }
  let flujo = 0;
  return {
    grupo,
    // e: estado de js/util/escenasGigantes.js (estadoCuasar); peso: 1 en escena, → 0 al cancelarla.
    actualizar(e, peso, dt, t, reducido) {
      const ver = peso > 0.0005;
      flujo += dt * (reducido ? 0.006 : 0.015) * (ver ? 1 : 2); uC.uFlujo.value = flujo;   // el hilo de los chorros, siempre
      chorros.visible = true; otras.visible = ver && e.otras > 0.002; onda.visible = ver && (e.conv >= 0 || (e.cima >= 0 && e.cima < 2.4)); lobulos.visible = ver && e.estallido >= 0 && e.estallido < 1.6;
      uC.uSubida.value = ver ? 1.05 + (e.alcance - 1.05) * peso : 1.05;
      if (!ver) { uC.uLuz.value = 0; uC.uFrente.value = 0; uC.uCalido.value = 0; return; }
      uC.uLuz.value = 0.35 * e.frente * peso; uC.uFrente.value = e.frente * peso; uC.uCalido.value = e.calido * peso;
      uO.uLuz.value = e.otras * peso; uO.uT.value = t; uO.uTitileo.value = reducido ? 0 : 1;
      uE.uLuz.value = peso; uE.uCima.value = e.cima; uE.uConv.value = e.conv;
      uL.uLuz.value = peso * (reducido ? 0.5 : 1); uL.uEst.value = e.estallido;
    }
  };
}
