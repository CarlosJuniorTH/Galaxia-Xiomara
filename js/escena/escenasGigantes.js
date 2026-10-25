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
  // Filamentos como hilos: 80 caminos que serpentean por la cáscara exterior (r 0,5–0,97 del volumen), con las
  // motas a lo largo de cada uno (se leen como hebras de luz, no como estrellas sueltas); dentro, el gas azul de
  // sincrotrón, ralo. Cada mota guarda su radio (el frente de luz la enciende al pasar) y dos números al azar.
  const N = 10000, NI = 1400, pos = new Float32Array(N * 3), dato = new Float32Array(N * 3);
  const p = [0, 0, 0], dir = [0, 0, 0], guardar = (i, x, y, z) => { const r = Math.hypot(x, y, z); pos.set([x * 2300, y * 1750, z * 1800], i * 3); dato.set([r, azar(), azar()], i * 3); };
  for (let i = 0; i < NI;) { const x = azar() * 2 - 1, y = azar() * 2 - 1, z = azar() * 2 - 1, r = Math.hypot(x, y, z); if (r > 0.5 || r < 0.18) continue; guardar(i++, x, y, z); }
  const porHilo = Math.ceil((N - NI) / 80);
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
  const uN = { uScale, uPR, uExpo: EXPOSICION, uFrente: { value: 0 }, uLuz: { value: 0 }, uT: { value: 0 }, uSilueta: { value: 520 }, uTitileo: { value: 1 } };
  const nebulosa = new THREE.Points(gN, motas(uN, /* glsl */`attribute vec3 aDato; uniform float uScale, uPR, uExpo, uFrente, uLuz, uT, uSilueta, uTitileo; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
      // Se encienden del centro hacia fuera al pasar el frente de luz (una onda nítida, no un brillo).
      float r = aDato.x, encendida = smoothstep(r - 0.12, r, uFrente), onda = exp(-pow((uFrente - r) * 9.0, 2.0)) * step(r, uFrente + 0.12);
      // Filamentos rojo-anaranjados y rosados por fuera; dentro, el azul de sincrotrón.
      vec3 fuera = mix(vec3(1.0, 0.42, 0.26), vec3(1.0, 0.62, 0.72), aDato.y), dentro = vec3(0.6, 0.76, 1.0);
      vC = mix(dentro, fuera, smoothstep(0.42, 0.6, r)) * (1.0 + onda * 1.4);
      float titila = 1.0 - uTitileo * 0.35 * (0.5 + 0.5 * sin(uT * (0.8 + aDato.z * 1.6) + aDato.z * 40.0));
      vA = uLuz * encendida * titila * (0.6 + 0.4 * aDato.z) * tamMota(14.0 + aDato.z * 14.0, mv, 3.0) * fueraSilueta(mv) * uExpo; }`));
  nebulosa.frustumCulled = false; nebulosa.visible = false;

  const NH = 4000, pH = new Float32Array(NH * 3);
  for (let i = 0; i < NH; i++) pH.set([azar(), azar(), i % 2 ? 1 : -1], i * 3);
  const gH = new THREE.BufferGeometry(); gH.setAttribute('position', new THREE.BufferAttribute(pH, 3));
  const uH = { uScale, uPR, uExpo: EXPOSICION, uFlujo: { value: 0 }, uLuz: { value: 0 }, uApertura: { value: 1 }, uTibio: { value: 0 }, uSilueta: { value: 0 } };
  const haces = new THREE.Points(gH, motas(uH, /* glsl */`uniform float uScale, uPR, uExpo, uFlujo, uLuz, uApertura, uTibio, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){
      // La luz sale del polo y recorre el haz hacia fuera (despacio: el tiempo casi se ha parado).
      float f = fract(position.x + uFlujo * (0.7 + 0.6 * position.y)), y = 200.0 + f * 2000.0;
      float a = position.y * 6.2832 + position.x * 40.0, r = (y / 2200.0) * 150.0 * uApertura * sqrt(fract(position.x * 7.31 + position.y * 3.7));
      vec4 mv = modelViewMatrix * vec4(cos(a) * r, position.z * y, sin(a) * r, 1.0); gl_Position = projectionMatrix * mv;
      vC = mix(vec3(0.82, 0.9, 1.0), vec3(1.0, 0.86, 0.94), uTibio * position.y);
      vA = uLuz * smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.7, 1.0, f)) * (0.6 + 0.5 * position.y) * tamMota(13.0 + position.y * 11.0, mv, 2.8) * uExpo; }`));
  haces.frustumCulled = false; haces.visible = false;

  return {
    nebulosa, haces,
    // e: estado de js/util/escenasGigantes.js (estadoPulsar); peso: 1 en escena, → 0 al cancelarla.
    actualizar(e, peso, s, t, reducido) {
      const ver = peso > 0.0005;
      nebulosa.visible = ver && e.brillo > 0.002; haces.visible = ver && e.motasHaz > 0.002;
      if (!ver) return;
      uN.uFrente.value = e.nebulosa; uN.uLuz.value = e.brillo * peso * 1.3; uN.uT.value = t; uN.uTitileo.value = reducido ? 0 : 1;
      uH.uFlujo.value = s * (reducido ? 0.025 : 0.06); uH.uLuz.value = e.motasHaz * peso; uH.uApertura.value = e.apertura; uH.uTibio.value = e.brillo * 0.5;
    }
  };
}

// ── Deneb: corona de motas (su luz que crece) y el mundo nuevo (disco → corazón con un mundo que lo recorre) ──
// En el espacio de Deneb (su estrella mide 8,4 unidades; la cámara llega a ~450). `mundo` se orienta hacia la
// cámara al empezar (de frente, algo inclinado) y ya no se mueve: no persigue a la pantalla.
export const CORAZON_DENEB = 6.6;   // escala de la curva del corazón (unas 210 × 190 unidades de Deneb)
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

  // Corona: motas en una cáscara que se abre desde la superficie con la luz y se aleja muy despacio (viento).
  const NC = 2600, pC = new Float32Array(NC * 3), dC = new Float32Array(NC * 2);
  for (let i = 0; i < NC; i++) { const z = azar() * 2 - 1, f = azar() * Math.PI * 2, q = Math.sqrt(1 - z * z); pC.set([Math.cos(f) * q, z, Math.sin(f) * q], i * 3); dC.set([azar(), azar()], i * 2); }
  const gC = new THREE.BufferGeometry(); gC.setAttribute('position', new THREE.BufferAttribute(pC, 3)); gC.setAttribute('aDato', new THREE.BufferAttribute(dC, 2));
  const uC = { uScale, uPR, uExpo: EXPOSICION, uCorona: { value: 0 }, uLuz: { value: 0 }, uDeriva: { value: 0 }, uPum: { value: 0 }, uT: { value: 0 }, uTitileo: { value: 1 }, uSilueta: { value: 11 } };
  const corona = new THREE.Points(gC, motas(uC, /* glsl */`attribute vec2 aDato; uniform float uScale, uPR, uExpo, uCorona, uLuz, uDeriva, uPum, uT, uTitileo, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float f = fract(aDato.x + uDeriva * (0.6 + 0.8 * aDato.y)), r = 10.0 + f * f * 62.0;
      vec4 mv = modelViewMatrix * vec4(position * r, 1.0); gl_Position = projectionMatrix * mv;
      vC = mix(vec3(0.86, 0.92, 1.0), vec3(1.0, 0.97, 0.94), aDato.y);
      float abierta = smoothstep(f - 0.1, f, uCorona * 1.1), titila = 1.0 - uTitileo * 0.3 * (0.5 + 0.5 * sin(uT * (1.0 + aDato.y * 2.0) + aDato.x * 50.0));
      // Cada latido enciende un poco más las motas cercanas (la luz sale de la estrella al latir).
      vA = uLuz * abierta * (1.0 - smoothstep(0.55, 1.0, f)) * titila * (0.7 + 0.6 * uPum * (1.0 - f)) * tamMota(1.6 + aDato.y * 1.4, mv, 2.6) * fueraSilueta(mv) * uExpo; }`));
  corona.frustumCulled = false; corona.visible = false;

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
  const uM = { uScale, uPR, uExpo: EXPOSICION, uNace: { value: 0 }, uForma: { value: 0 }, uMundo: { value: 0 }, uCalma: { value: 0 }, uGiro: { value: 0 }, uArco: { value: 0 }, uPlaneta: { value: new THREE.Vector3() }, uRota: { value: 0 }, uT: { value: 0 }, uLuz: { value: 0 }, uPum: { value: 0 }, uTitileo: { value: 1 }, uSilueta: { value: 11 } };
  const mundoMotas = new THREE.Points(gM, motas(uM, /* glsl */`attribute vec3 aOrigen; attribute vec4 aDato;
    uniform float uScale, uPR, uExpo, uNace, uForma, uMundo, uCalma, uGiro, uArco, uRota, uT, uLuz, uPum, uTitileo, uSilueta; uniform vec3 uPlaneta; varying vec3 vC; varying float vA;
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
      float nace = smoothstep(aDato.x * 0.6, aDato.x * 0.6 + 0.4, uNace);
      float titila = 1.0 - uTitileo * 0.3 * (0.5 + 0.5 * sin(uT * (0.9 + aDato.w * 1.8) + aDato.x * 60.0));
      vA = uLuz * nace * trazo * titila * (1.0 + 0.25 * uPum * (1.0 - planeta)) * tamMota(planeta > 0.5 ? 1.3 + aDato.w * 0.8 : 1.7 + aDato.w * 1.6, mv, 2.8) * fueraSilueta(mv) * uExpo; }`));
  mundoMotas.frustumCulled = false;
  const mundo = new THREE.Group(); mundo.add(mundoMotas); mundo.visible = false;

  const base = new THREE.Matrix4(), cero = new THREE.Vector3(), arriba = new THREE.Vector3(0, 1, 0), inclina = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.32);
  let arco = 0, rota = 0;
  return {
    corona, mundo,
    // De frente a la cámara (camLocal: la cámara en el espacio de Deneb) e inclinado ~18°: se lee el corazón
    // y se nota que es un mundo en el espacio, no un dibujo plano. Se fija al empezar.
    orientar(camLocal) { base.lookAt(camLocal, cero, arriba); mundo.quaternion.setFromRotationMatrix(base).multiply(inclina); arco = 0; rota = 0; uM.uGiro.value = 0; },
    actualizar(e, peso, dt, t, reducido) {
      const ver = peso > 0.0005;
      corona.visible = ver && e.corona > 0.002; mundo.visible = ver && e.nace > 0.002;
      if (!ver) return;
      uC.uCorona.value = e.corona; uC.uLuz.value = (0.25 + 0.75 * e.luz) * peso; uC.uDeriva.value += dt * (reducido ? 0.004 : 0.012); uC.uPum.value = e.pum * e.latido; uC.uT.value = t; uC.uTitileo.value = reducido ? 0 : 1;
      if (!mundo.visible) return;
      // El mundo recorre el corazón (una vuelta en 40 s; con movimiento reducido, en 80) y gira sobre sí mismo.
      arco += dt * e.forma / (reducido ? 80 : 40); rota += dt * (reducido ? 0.15 : 0.35);
      enCorazon(arco, uM.uPlaneta.value); uM.uArco.value = arco % 1; uM.uRota.value = rota;
      uM.uNace.value = e.nace; uM.uForma.value = e.forma; uM.uMundo.value = e.mundo; uM.uCalma.value = e.calma; uM.uLuz.value = peso;
      uM.uGiro.value += dt * (reducido ? 0.25 : 0.8) * (1 - e.forma * 0.9); uM.uT.value = t; uM.uPum.value = e.pum * e.latido; uM.uTitileo.value = reducido ? 0 : 1;
    }
  };
}
