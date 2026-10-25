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

// ── Deneb: corona de motas (su luz que crece) y el mundo nuevo (disco → corazón con un mundo que lo recorre) ──
// En el espacio de Deneb (su estrella mide 8,4 unidades; la cámara llega a ~450). `mundo` se orienta hacia la
// cámara al empezar (de frente, algo inclinado) y ya no se mueve: no persigue a la pantalla.
export const RADIO_DENEB = 30;      // radio de la supergigante en el espacio de Deneb (cosmos.js agranda su disco hasta aquí)
export const CORAZON_DENEB = 7.6;   // escala de la curva del corazón (unas 245 × 220 unidades de Deneb)
export function puntoCorazonDeneb(a, v = new THREE.Vector3()) {
  return v.set(16 * Math.sin(a) ** 3 * CORAZON_DENEB, (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a) + 3.5) * CORAZON_DENEB, 0);
}
export function crearEscenaDeneb({ uScale, uPR }) {
  const azar = azarCon(2512);
  // Tabla del corazón por distancia recorrida (como CurvaPorDistancia): el mundo lo recorre a ritmo parejo.
  const M = 1024, tabla = new Float32Array((M + 1) * 3), v = new THREE.Vector3(), w = new THREE.Vector3();
  {
    const F = 8192, acum = new Float64Array(F + 1); let prev = puntoCorazonDeneb(0, new THREE.Vector3());
    for (let i = 1; i <= F; i++) { puntoCorazonDeneb(i / F * Math.PI * 2, v); acum[i] = acum[i - 1] + v.distanceTo(prev); prev.copy(v); }
    for (let j = 0, i = 0; j <= M; j++) { const meta = acum[F] * j / M; while (i < F && acum[i + 1] < meta) i++; puntoCorazonDeneb(i / F * Math.PI * 2, v); tabla.set([v.x, v.y, v.z], j * 3); }
  }
  const enCorazon = (u, destino) => { const x = ((u % 1) + 1) % 1 * M, i = Math.floor(x), k = x - i;
    return destino.set(tabla[i * 3] + (tabla[i * 3 + 3] - tabla[i * 3]) * k, tabla[i * 3 + 1] + (tabla[i * 3 + 4] - tabla[i * 3 + 1]) * k, 0); };

  // Viento estelar: motas finas que salen de la superficie (radio RADIO_DENEB) y se alejan despacio, siempre; con la
  // canción, más luz; al «volver atrás el tiempo», vuelven hacia la estrella (uDeriva baja). Se apagan al alejarse.
  const NC = 5200, pC = new Float32Array(NC * 3), dC = new Float32Array(NC * 2);
  for (let i = 0; i < NC; i++) { const z = azar() * 2 - 1, f = azar() * Math.PI * 2, q = Math.sqrt(1 - z * z); pC.set([Math.cos(f) * q, z, Math.sin(f) * q], i * 3); dC.set([azar(), azar()], i * 2); }
  const gC = new THREE.BufferGeometry(); gC.setAttribute('position', new THREE.BufferAttribute(pC, 3)); gC.setAttribute('aDato', new THREE.BufferAttribute(dC, 2));
  const uC = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0.4 }, uDeriva: { value: 0 }, uPum: { value: 0 }, uT: { value: 0 }, uTitileo: { value: 1 }, uSilueta: { value: RADIO_DENEB * 1.1 } };
  const corona = new THREE.Points(gC, motas(uC, /* glsl */`attribute vec2 aDato; uniform float uScale, uPR, uExpo, uLuz, uDeriva, uPum, uT, uTitileo, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float f = fract(aDato.x + uDeriva * (0.6 + 0.8 * aDato.y)), r = ${RADIO_DENEB.toFixed(1)} * (1.04 + f * f * 3.4);
      vec4 mv = modelViewMatrix * vec4(position * r, 1.0); gl_Position = projectionMatrix * mv;
      vC = mix(vec3(0.8, 0.88, 1.0), vec3(1.0, 0.98, 0.95), aDato.y);
      float titila = 1.0 - uTitileo * 0.3 * (0.5 + 0.5 * sin(uT * (1.0 + aDato.y * 2.0) + aDato.x * 50.0));
      // Cada latido enciende un poco más las motas cercanas (la luz sale de la estrella al latir).
      vA = uLuz * smoothstep(0.0, 0.04, f) * (1.0 - smoothstep(0.45, 1.0, f)) * titila * (0.75 + 0.6 * uPum * (1.0 - f)) * tamMota(1.5 + aDato.y * 1.5, mv, 2.6) * fueraSilueta(mv) * uExpo; }`));
  corona.frustumCulled = false;

  // Nebulosa de emisión alrededor (como la de Norteamérica, en Cygnus, junto a la Deneb de verdad): una cáscara irregular
  // de 600 a 1500 unidades hecha de hilos y grumos de motas rojas de hidrógeno, rosas y algún toque azul, con una
  // «bahía» oscura. La cámara (a ~450) queda dentro: la nebulosa la rodea. Siempre visible; nada de gas difuso.
  const NN = 22000, pN = new Float32Array(NN * 3), dN = new Float32Array(NN * 2);
  {
    const p = [0, 0, 0], dir = [0, 0, 0], bahia = (x, y, z) => { const dx = x / Math.hypot(x, y, z), dy = y / Math.hypot(x, y, z); return Math.hypot(dx + 0.35, dy + 0.25) < 0.33; };
    for (let i = 0, h = 0; i < NN; h++) {
      const z0 = azar() * 2 - 1, f0 = azar() * Math.PI * 2, q0 = Math.sqrt(1 - z0 * z0), r0 = 650 + azar() * 800;
      p[0] = Math.cos(f0) * q0 * r0; p[1] = z0 * r0 * 0.75; p[2] = Math.sin(f0) * q0 * r0 - 250;   // algo más hacia atrás (lejos de casa)
      for (let k = 0; k < 3; k++) dir[k] = azar() * 2 - 1;
      const curva = 0.15 + azar() * 0.3, grosor = 6 + azar() * 22, grumo = azar() < 0.25, color = azar();
      for (let k = 0; k < 140 && i < NN; k++) {
        for (let e = 0; e < 3; e++) dir[e] += (azar() - 0.5) * curva;
        const L = Math.hypot(dir[0], dir[1], dir[2]) || 1;
        for (let e = 0; e < 3; e++) p[e] += dir[e] / L * (grumo ? 3 : 9);
        if (bahia(p[0], p[1], p[2]) && azar() < 0.9) continue;   // la bahía oscura casi vacía
        pN.set([p[0] + (azar() - 0.5) * grosor, p[1] + (azar() - 0.5) * grosor, p[2] + (azar() - 0.5) * grosor], i * 3); dN.set([color, azar()], i * 2); i++;
      }
    }
  }
  const gN = new THREE.BufferGeometry(); gN.setAttribute('position', new THREE.BufferAttribute(pN, 3)); gN.setAttribute('aDato', new THREE.BufferAttribute(dN, 2));
  const uN = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 1 }, uT: { value: 0 }, uTitileo: { value: 1 }, uSilueta: { value: RADIO_DENEB * 1.1 } };
  const nebulosa = new THREE.Points(gN, motas(uN, /* glsl */`attribute vec2 aDato; uniform float uScale, uPR, uExpo, uLuz, uT, uTitileo, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
      vC = aDato.x < 0.62 ? mix(vec3(1.0, 0.3, 0.36), vec3(1.0, 0.45, 0.4), aDato.y) : aDato.x < 0.85 ? vec3(1.0, 0.62, 0.74) : aDato.x < 0.94 ? vec3(1.0, 0.8, 0.55) : vec3(0.6, 0.72, 1.0);
      float titila = 1.0 - uTitileo * 0.25 * (0.5 + 0.5 * sin(uT * (0.6 + aDato.y * 1.4) + aDato.y * 70.0));
      vA = uLuz * (0.55 + 0.45 * aDato.y) * titila * tamMota(5.5 + aDato.y * 5.0, mv, 2.8) * fueraSilueta(mv) * uExpo; }`));
  nebulosa.frustumCulled = false;


  // El mundo nuevo: 5200 motas del corazón (su órbita) y 2400 del mundo pequeño (esfera y su anillo). Todas
  // nacen en un disco que gira alrededor de Deneb (más deprisa cerca, como un disco de verdad) y se ordenan:
  // primero el corazón, que se dibuja a lo largo de su contorno, y después el mundo, que se junta donde está.
  const NO = 5200, NP = 2400, N = NO + NP;
  const p = new Float32Array(N * 3), origen = new Float32Array(N * 3), d = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const planeta = i >= NO, u = azar();
    if (!planeta) {
      // Banda fina a lo largo del corazón: ±2,5 unidades a su lado y ±2 de espesor.
      enCorazon(u, v); enCorazon(u + 0.0015, w); w.sub(v).normalize();
      const lado = (azar() + azar() - 1) * 2.5; p.set([v.x - w.y * lado, v.y + w.x * lado, (azar() + azar() - 1) * 2], i * 3);
    } else if (i < NO + 1700) {
      // Esfera luminosa de radio 9 (repartida en espiral de Fibonacci, con algo de grosor).
      const k = i - NO, z = 1 - 2 * (k + 0.5) / 1700, q = Math.sqrt(1 - z * z), f = k * 2.39996, r = 9 * (0.93 + azar() * 0.07);
      p.set([Math.cos(f) * q * r, z * r, Math.sin(f) * q * r], i * 3);
    } else {
      // Su anillo: fino, de 14 a 19 unidades, inclinado.
      const f = azar() * Math.PI * 2, r = 14 + Math.pow(azar(), 0.7) * 5;
      p.set([Math.cos(f) * r, Math.sin(f) * r * 0.08 + (azar() - 0.5) * 0.5, Math.sin(f) * r], i * 3);
    }
    // En el disco, dos brazos espirales (con el giro diferencial se enroscan un poco más mientras se ordena).
    const r = 34 + 150 * Math.pow(azar(), 0.8), brazo = (i % 2) * Math.PI + Math.log(r / 34) * 2.4 + (azar() + azar() + azar() - 1.5) * 0.5;
    origen.set([r, brazo, (azar() - 0.5) * 6 * (r / 120)], i * 3);
    d.set([azar(), u, planeta ? (i < NO + 1700 ? 1 : 2) : 0, azar()], i * 4);   // z: 0 corazón, 1 el mundo, 2 su anillo
  }
  const gM = new THREE.BufferGeometry(); gM.setAttribute('position', new THREE.BufferAttribute(p, 3)); gM.setAttribute('aOrigen', new THREE.BufferAttribute(origen, 3)); gM.setAttribute('aDato', new THREE.BufferAttribute(d, 4));
  const uM = { uScale, uPR, uExpo: EXPOSICION, uNace: { value: 0 }, uForma: { value: 0 }, uMundo: { value: 0 }, uCalma: { value: 0 }, uGiro: { value: 0 }, uArco: { value: 0 }, uPlaneta: { value: new THREE.Vector3() }, uRota: { value: 0 }, uT: { value: 0 }, uLuz: { value: 0 }, uPum: { value: 0 }, uTitileo: { value: 1 }, uSilueta: { value: RADIO_DENEB * 1.1 }, uOnda: { value: 0 }, uOndaR: { value: 0 }, uCalido: { value: 0 } };
  const mundoMotas = new THREE.Points(gM, motas(uM, /* glsl */`attribute vec3 aOrigen; attribute vec4 aDato;
    uniform float uScale, uPR, uExpo, uNace, uForma, uMundo, uCalma, uGiro, uArco, uRota, uT, uLuz, uPum, uTitileo, uSilueta, uOnda, uOndaR, uCalido; uniform vec3 uPlaneta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){
      float planeta = step(0.5, aDato.z), anillo = step(1.5, aDato.z);
      // El disco que nace: cada mota en su órbita circular (Kepler: más rápida cerca de Deneb).
      float r = aOrigen.x, a = aOrigen.y + uGiro * pow(60.0 / r, 1.5);
      vec3 caos = vec3(cos(a) * r, sin(a) * r, aOrigen.z);
      // El corazón se dibuja a lo largo de su contorno; el mundo se junta después, donde ya está.
      float retraso = planeta < 0.5 ? aDato.y * 0.55 + aDato.x * 0.12 : 0.62 + aDato.x * 0.28;
      float k = smoothstep(retraso, retraso + 0.3, uForma * 1.22);
      float c = cos(uRota), s = sin(uRota);
      vec3 sitio = planeta < 0.5 ? position : uPlaneta + vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
      vec3 q = mix(caos, sitio, k * k * (3.0 - 2.0 * k));
      q.z += sin(k * 3.14159) * (aDato.w - 0.5) * 30.0;   // en el camino, cada una se levanta un poco del plano (volumen)
      vec4 mv = modelViewMatrix * vec4(q, 1.0); gl_Position = projectionMatrix * mv;
      // Colores: el disco, blanco azulado como Deneb; el corazón, rosa y dorado; el mundo, rosa luminoso con su anillo lila.
      vec3 orbita = mix(vec3(1.0, 0.55, 0.74), vec3(1.0, 0.8, 0.55), smoothstep(0.55, 1.0, aDato.w));
      vec3 mundo = mix(mix(vec3(1.0, 0.7, 0.82), vec3(1.0, 0.92, 0.84), aDato.w), vec3(0.82, 0.78, 1.0), anillo);
      vC = mix(vec3(0.8, 0.88, 1.0), planeta < 0.5 ? orbita : mundo, k);
      // La estela: el corazón brilla más justo detrás del mundo que lo recorre (como si lo fuera trazando).
      float detras = fract(uArco - aDato.y), estela = exp(-detras * 7.0) * uMundo;
      float trazo = planeta < 0.5 ? mix(1.0, 0.42 + 0.9 * estela, uMundo) * (1.0 - uCalma * 0.25) : mix(1.0, 0.75 + anillo * 0.35, uMundo);   // el mundo, luminoso pero nítido (sin quemarse)
      // El estribillo: una onda de luz sale de Deneb (en el centro) y enciende el corazón al pasar.
      float onda = exp(-pow((length(q) - uOndaR) / 18.0, 2.0)) * uOnda;
      vC = mix(vC, vec3(1.0, 0.82, 0.62), uCalido * 0.35 * (1.0 - planeta));
      float nace = smoothstep(aDato.x * 0.6, aDato.x * 0.6 + 0.4, uNace);
      float titila = 1.0 - uTitileo * 0.3 * (0.5 + 0.5 * sin(uT * (0.9 + aDato.w * 1.8) + aDato.x * 60.0));
      vA = uLuz * nace * trazo * titila * (1.0 + 0.25 * uPum * (1.0 - planeta) + 1.8 * onda) * tamMota(planeta > 0.5 ? 1.3 + aDato.w * 0.8 : 1.7 + aDato.w * 1.6, mv, 2.8) * fueraSilueta(mv) * uExpo; }`));
  mundoMotas.frustumCulled = false;
  const mundo = new THREE.Group(); mundo.add(mundoMotas); mundo.visible = false;

  const base = new THREE.Matrix4(), cero = new THREE.Vector3(), arriba = new THREE.Vector3(0, 1, 0), inclina = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.32);
  let arco = 0, rota = 0;
  return {
    corona, mundo, nebulosa,
    // De frente a la cámara (camLocal: la cámara en el espacio de Deneb) e inclinado ~18°: se lee el corazón
    // y se nota que es un mundo en el espacio, no un dibujo plano. Se fija al empezar.
    orientar(camLocal) { base.lookAt(camLocal, cero, arriba); mundo.quaternion.setFromRotationMatrix(base).multiply(inclina); arco = 0; rota = 0; uM.uGiro.value = 0; },
    actualizar(e, peso, dt, t, reducido) {
      // El viento y la nebulosa son de siempre; la escena les da más luz y, al volver atrás el tiempo, el viento retrocede.
      const ver = peso > 0.0005, w = ver ? peso : 0;
      mundo.visible = ver && e.nace > 0.002;
      uC.uLuz.value = 0.4 + 0.6 * e.luz * w; uC.uDeriva.value += dt * (reducido ? 0.004 : 0.012) * (1 + (e.viento - 1) * w); uC.uPum.value = e.pum * e.latido * w; uC.uT.value = t; uC.uTitileo.value = reducido ? 0 : 1;
      uN.uLuz.value = 1 + 0.25 * e.luz * w + 0.4 * e.onda * w; uN.uT.value = t; uN.uTitileo.value = reducido ? 0 : 1;
      if (!ver) return;
      if (!mundo.visible) return;
      // El mundo recorre el corazón (una vuelta en 40 s; con movimiento reducido, en 80) y gira sobre sí mismo.
      arco += dt * e.forma / (reducido ? 80 : 40); rota += dt * (reducido ? 0.15 : 0.35);
      enCorazon(arco, uM.uPlaneta.value); uM.uArco.value = arco % 1; uM.uRota.value = rota;
      uM.uNace.value = e.nace; uM.uForma.value = e.forma; uM.uMundo.value = e.mundo; uM.uCalma.value = e.calma; uM.uLuz.value = peso;
      uM.uGiro.value += dt * (reducido ? 0.25 : 0.8) * (1 - e.forma * 0.9); uM.uOnda.value = e.onda; uM.uOndaR.value = e.ondaR; uM.uCalido.value = e.calido; uM.uT.value = t; uM.uPum.value = e.pum * e.latido; uM.uTitileo.value = reducido ? 0 : 1;
    }
  };
}

// ── Cuásar: anillo de motas alrededor del disco, la luz que sube por los chorros, las lucecitas de la galaxia y la
// onda del clímax. En el espacio del cuásar (CUASAR de cuasar.js: disco 300–1100, chorros de 7600 por ±Y, galaxia de
// radio 4800; la cámara llega a ~5200). El disco está en el plano XZ. Se dibujan por encima del remolino (como su
// polvo estelar) y la sombra del horizonte, que va encima de todo, las tapa si caen delante.
export function crearEscenaCuasar({ uScale, uPR, largo = 7600 }) {
  const azar = azarCon(3107), grupo = new THREE.Group();
  // Anillo: motas en órbita (Kepler), más densas entre 550 y 1250.
  const NA = 6000, pA = new Float32Array(NA * 3);
  for (let i = 0; i < NA; i++) { const r = 340 + 1050 * Math.pow(azar(), 0.9) * (0.75 + 0.25 * azar()); pA.set([r, azar() * Math.PI * 2, azar()], i * 3); }
  const gA = new THREE.BufferGeometry(); gA.setAttribute('position', new THREE.BufferAttribute(pA, 3));
  const uA = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uGiro: { value: 0 }, uRisa: { value: 0 }, uFaseRisa: { value: 0 }, uCalido: { value: 0 }, uT: { value: 0 }, uTitileo: { value: 1 }, uSilueta: { value: 330 } };
  const anillo = new THREE.Points(gA, motas(uA, /* glsl */`uniform float uScale, uPR, uExpo, uLuz, uGiro, uRisa, uFaseRisa, uCalido, uT, uTitileo, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float r = position.x, a = position.y + uGiro * pow(600.0 / r, 1.5), h = (position.z - 0.5) * 30.0 * (r / 900.0);
      vec4 mv = modelViewMatrix * vec4(cos(a) * r, h, sin(a) * r, 1.0); gl_Position = projectionMatrix * mv;
      // Al reír, ondas de luz que salen del disco hacia fuera, una tras otra.
      float onda = pow(0.5 + 0.5 * sin(r * 0.011 - uFaseRisa), 10.0) * uRisa;
      vC = mix(mix(vec3(0.95, 0.93, 1.0), vec3(1.0, 0.86, 0.6), smoothstep(700.0, 1300.0, r)), mix(vec3(1.0, 0.62, 0.78), vec3(1.0, 0.8, 0.5), position.z), uCalido);
      float titila = 1.0 - uTitileo * 0.3 * (0.5 + 0.5 * sin(uT * (1.0 + position.z * 2.0) + position.y * 30.0));
      vA = uLuz * titila * (0.55 + 0.45 * position.z) * (1.0 + 1.8 * onda) * (1.0 - smoothstep(1250.0, 1400.0, r)) * tamMota(30.0 + position.z * 22.0, mv, 3.2) * fueraSilueta(mv) * uExpo * 1.5; }`));
  anillo.renderOrder = 16;

  // La luz que sube por los chorros: dentro de la vaina (radio 40 → 620), subiendo despacio; solo hasta donde ha
  // llegado la historia (uSubida), con su frente más brillante.
  const NC = 5000, pC = new Float32Array(NC * 3);
  for (let i = 0; i < NC; i++) pC.set([azar(), azar(), i % 2 ? 1 : -1], i * 3);
  const gC = new THREE.BufferGeometry(); gC.setAttribute('position', new THREE.BufferAttribute(pC, 3));
  const uC = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uBase: { value: 0.4 }, uSubida: { value: 0 }, uFlujo: { value: 0 }, uCalido: { value: 0 }, uSilueta: { value: 0 } };
  const chorros = new THREE.Points(gC, motas(uC, /* glsl */`uniform float uScale, uPR, uExpo, uLuz, uBase, uSubida, uFlujo, uCalido, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float f = fract(position.x + uFlujo * (0.4 + 0.6 * position.y)), y = 300.0 + f * ${(largo * 0.93).toFixed(1)};
      float a = position.y * 6.2832 + position.x * 31.0 + f * 9.0, r = (30.0 + 300.0 * f) * sqrt(fract(position.x * 7.13 + position.y * 3.1));
      vec4 mv = modelViewMatrix * vec4(cos(a) * r, position.z * y, sin(a) * r, 1.0); gl_Position = projectionMatrix * mv;
      float dentro = 1.0 - smoothstep(uSubida - 0.04, uSubida, f), frente = exp(-pow((f - uSubida + 0.02) / 0.025, 2.0)) * step(0.01, uSubida);
      vC = mix(mix(vec3(1.0), vec3(0.7, 0.8, 1.0), f), mix(vec3(1.0, 0.66, 0.8), vec3(1.0, 0.85, 0.55), position.y), uCalido);
      // Siempre: un hilo de motas que sube por cada chorro (lo hace nítido); en la escena, la luz de la historia encima.
      float base = uBase * (0.4 + 0.6 * position.y) * (1.0 - smoothstep(0.75, 1.0, f));
      vA = (base + uLuz * (dentro * (0.5 + 0.5 * position.y) + frente * 1.6)) * tamMota(20.0 + position.y * 16.0, mv, 2.8) * uExpo; }`));
  chorros.renderOrder = 22;

  // Las lucecitas de la galaxia (otras luces, bellas… pero no ella): repartidas por su disco, cada una se enciende a
  // su tiempo y titila; con «pero ella» se apagan.
  const NO = 800, pO = new Float32Array(NO * 3), dO = new Float32Array(NO * 2);
  for (let i = 0; i < NO; i++) { const r = 1700 + 2900 * Math.sqrt(azar()), a = azar() * Math.PI * 2; pO.set([Math.cos(a) * r, (azar() - 0.5) * 160, Math.sin(a) * r], i * 3); dO.set([azar(), azar()], i * 2); }
  const gO = new THREE.BufferGeometry(); gO.setAttribute('position', new THREE.BufferAttribute(pO, 3)); gO.setAttribute('aDato', new THREE.BufferAttribute(dO, 2));
  const uO = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uT: { value: 0 }, uTitileo: { value: 1 }, uSilueta: { value: 330 } };
  const otras = new THREE.Points(gO, motas(uO, /* glsl */`attribute vec2 aDato; uniform float uScale, uPR, uExpo, uLuz, uT, uTitileo, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
      float h = aDato.x, h2 = aDato.y;
      vC = h2 < 0.3 ? vec3(1.0, 0.85, 0.6) : h2 < 0.55 ? vec3(0.75, 0.85, 1.0) : h2 < 0.8 ? vec3(1.0, 0.75, 0.88) : vec3(1.0);
      float aparece = smoothstep(h * 0.7, h * 0.7 + 0.3, uLuz), titila = 1.0 - uTitileo * 0.45 * (0.5 + 0.5 * sin(uT * (1.5 + h2 * 2.5) + h * 40.0));
      vA = aparece * min(1.0, uLuz * 1.4) * titila * tamMota(40.0 + h2 * 22.0, mv, 3.2) * fueraSilueta(mv) * uExpo; }`));
  otras.renderOrder = 16;

  // El clímax: una onda de motas que sale del disco hacia fuera, nítida, y se apaga al alejarse.
  const NE = 3600, pE = new Float32Array(NE * 3);
  for (let i = 0; i < NE; i++) pE.set([azar() * Math.PI * 2, azar(), azar()], i * 3);
  const gE = new THREE.BufferGeometry(); gE.setAttribute('position', new THREE.BufferAttribute(pE, 3));
  const uE = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uCima: { value: -1 }, uSilueta: { value: 330 } };
  const onda = new THREE.Points(gE, motas(uE, /* glsl */`uniform float uScale, uPR, uExpo, uLuz, uCima, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float t = max(uCima, 0.0), r = 1100.0 + t * 2300.0 * (0.75 + 0.5 * position.y), a = position.x + t * 0.1;
      vec4 mv = modelViewMatrix * vec4(cos(a) * r, (position.z - 0.5) * 90.0 * (0.3 + t), sin(a) * r, 1.0); gl_Position = projectionMatrix * mv;
      vC = mix(vec3(1.0, 0.7, 0.84), vec3(1.0, 0.9, 0.62), position.z);
      vA = uLuz * step(0.0, uCima) * smoothstep(0.0, 0.15, uCima) * (1.0 - smoothstep(0.8, 2.6, t)) * tamMota(22.0 + position.z * 16.0, mv, 3.0) * fueraSilueta(mv) * uExpo; }`));
  onda.renderOrder = 16;

  for (const o of [anillo, chorros, otras, onda]) { o.frustumCulled = false; o.visible = false; grupo.add(o); }
  let giro = 0, risa = 0, flujo = 0;
  return {
    grupo,
    // e: estado de js/util/escenasGigantes.js (estadoCuasar); peso: 1 en escena, → 0 al cancelarla.
    actualizar(e, peso, dt, t, reducido) {
      const ver = peso > 0.0005;
      flujo += dt * (reducido ? 0.006 : 0.015) * (ver ? 1 : 2); uC.uFlujo.value = flujo;   // el hilo de los chorros, siempre
      anillo.visible = ver && e.anillo > 0.002; chorros.visible = true; otras.visible = ver && e.otras > 0.002; onda.visible = ver && e.cima >= 0 && e.cima < 2.7;
      if (!ver) { uC.uLuz.value = 0; uC.uCalido.value = 0; return; }
      giro += dt * (reducido ? 0.15 : 0.4); risa += dt * (reducido ? 2 : 5);
      uA.uLuz.value = e.anillo * peso; uA.uGiro.value = giro; uA.uRisa.value = e.risa; uA.uFaseRisa.value = risa; uA.uCalido.value = e.calido; uA.uT.value = t; uA.uTitileo.value = reducido ? 0 : 1;
      uC.uLuz.value = e.luzChorro * peso; uC.uSubida.value = e.subida; uC.uCalido.value = e.calido * peso;
      uO.uLuz.value = e.otras * peso; uO.uT.value = t; uO.uTitileo.value = reducido ? 0 : 1;
      uE.uLuz.value = peso; uE.uCima.value = e.cima;
    }
  };
}
