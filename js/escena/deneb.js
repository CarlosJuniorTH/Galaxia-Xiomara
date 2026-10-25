// Deneb de cerca: una supergigante blanca azulada (tipo A2 Ia) y su mundo, y su videoclip: el nacimiento de la estrella
// (tiempos y curvas: js/util/escenaDeneb.js). En el espacio del grupo de Deneb (cosmos.js; la cámara llega a ~450).
//  · superficie: esfera opaca con granulación que hierve (células claras con calles oscuras, deformadas y en dos
//    escalas), supergranulación, fáculas junto al borde y oscurecimiento al limbo; con la formación pasa de nada a una
//    brasa roja y, al encenderse, a blanca azulada. Un solo programa barato: tres lecturas de la tabla de ruido.
//  · materia: las motas que cuentan la historia. Cada una tiene su sitio en la nube oscura del principio, en el disco y
//    en un hilo del mundo (líneas del campo magnético de la estrella, r = L·sen²θ: las grandes, su «mundo»; las bajas,
//    pegadas a la superficie, sus protuberancias). Su posición es función de la formación `tau`: al rebobinar recorren el
//    mismo camino hacia atrás, con dos copias «fantasma» detrás que dibujan su estela mientras se mueven.
//  · viento y corona: motas que salen de la superficie (más en unos chorros, las serpentinas de la corona), un borde de
//    espículas finísimas y, al encenderse, el frente de motas que sale de ella.
// Toda la luz son motas nítidas de 1,5–3 px (nada de halos ni degradados); delante de la estrella no hay motas (se ve
// limpia). Geometrías y materiales se crean en la carga; en cada cuadro solo cambian uniformes.
import * as THREE from 'three';
import { EXPOSICION } from './exposicion.js';
import { RUIDO_TABLA, texturaRuido } from './nube.js';

export const RADIO_DENEB = 100;   // radio de la supergigante en el espacio de Deneb (la cámara llega a 450: 0,22 del encuadre)
const R = RADIO_DENEB;

function azarCon(semilla) { let s = semilla >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; }

const motas = (uniforms, vertexShader) => new THREE.ShaderMaterial({
  uniforms, vertexShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  // Punto redondo con núcleo: nítido, sin cola difusa (sin discard: mejor para las GPU de teselas del móvil).
  fragmentShader: /* glsl */`varying vec3 vC; varying float vA;
    void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(max(1.0 - d * 2.0, 0.0), 1.6) + (1.0 - smoothstep(0.0, 0.18, d)) * 0.8;
      gl_FragColor = vec4(vC * a * vA, 1.0); }`
});
// Tamaño en píxeles de una mota de `tam` unidades y su luz (las que no llegan a 1,5 px se reparten con menos luz) y, delante
// de la estrella (dentro de su silueta, entre ella y la cámara), sin motas: la estrella se ve limpia.
const COMUN = /* glsl */`
  float tamMota(float tam, vec4 mv, float maximo){ float px = tam * length(modelViewMatrix[0].xyz) * uScale / max(1.0, -mv.z);
    gl_PointSize = clamp(px, 1.5, maximo * uPR); return min(1.0, px * px / 2.25); }
  float fueraSilueta(vec4 mv, float radio){ vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float dc = max(length(c), 1.0); vec3 eje = c / dc;
    float t = dot(mv.xyz, eje), r = radio * length(modelViewMatrix[0].xyz) * t / dc;
    return 1.0 - step(t, dc) * step(0.0, t) * (1.0 - smoothstep(r * 0.97, r * 1.03, length(mv.xyz - eje * t))); }`;

export function crearDeneb({ uScale, uPR }) {
  const azar = azarCon(1907);
  const marco = new THREE.Group(); marco.name = 'Deneb de cerca';   // orientado hacia la cámara al empezar cada escena

  // ── Superficie ──
  const uS = { uRuido: { value: texturaRuido() }, uT: { value: 0 }, uLuz: { value: 1 }, uTemp: { value: 1 }, uGloria: { value: 0.55 }, uPum: { value: 0 } };
  const superficie = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.ShaderMaterial({
    // Transparente (con alfa 1 y profundidad): se dibuja después del cielo profundo, que es «opaco» pero de un grupo
    // con un orden mayor y se sumaba ENCIMA de la estrella (la teñía con sus paredes de polvo).
    uniforms: uS, transparent: true, depthWrite: true,
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: /* glsl */`uniform float uT, uLuz, uTemp, uGloria, uPum; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      ${RUIDO_TABLA}
      void main(){
        vec3 n = normalize(vP);
        float mu = clamp(dot(normalize(vN), -normalize(vV)), 0.0, 1.0);
        // Granulación fina (gránulos claros entre calles algo más oscuras y azules, en dos escalas) torcida por un campo
        // lento, y encima la supergranulación; hierve con el tiempo propio de la estrella (al rebobinar, hacia atrás). De lejos
        // se lee como el moteado de una superficie de gas; de cerca, como gránulos que cambian de forma.
        float w = rn3(n * 2.4 + vec3(0.0, uT * 0.02, 0.0));
        float g1 = rn3(n * 21.0 + w * 2.2 + vec3(uT * 0.2, 0.0, -uT * 0.13));
        float g2 = rn3(n * 47.0 - w * 1.4 + vec3(0.0, -uT * 0.32, uT * 0.24));
        // Plasma: crestas finas y brillantes del ruido (hilos de gas más caliente entre las células), sobre un fondo que
        // va del blanco del centro al azul del borde (oscurecimiento al limbo de una estrella caliente).
        float cresta = pow(1.0 - abs(2.0 * g1 - 1.0), 7.0), cresta2 = pow(1.0 - abs(2.0 * g2 - 1.0), 9.0);
        float hierve = 0.7 + 0.5 * uGloria;
        float limbo = 0.14 + 0.86 * pow(mu, 0.8);
        vec3 fondo = mix(vec3(0.14, 0.27, 0.92), vec3(0.8, 0.86, 1.0), smoothstep(0.05, 1.0, mu)) * (0.6 + 0.3 * w) * limbo;
        vec3 caliente = vec3(1.0, 0.97, 0.94) * (cresta * 0.55 + cresta2 * 0.3) * hierve * (0.35 + 0.65 * limbo);
        // Fáculas: manchas claras junto al borde.
        caliente += vec3(0.75, 0.85, 1.0) * smoothstep(0.6, 0.78, w) * pow(1.0 - mu, 2.0) * 0.35;
        vec3 brasa = (mix(vec3(0.45, 0.04, 0.01), vec3(1.0, 0.32, 0.08), cresta) * (0.5 + 0.5 * limbo));
        vec3 col = mix(brasa, fondo + caliente, uTemp);
        gl_FragColor = vec4(col * uLuz * (1.0 + 0.1 * uPum), 1.0); }`
  }));
  superficie.renderOrder = -2; marco.add(superficie);

  // ── Materia: nube → disco → mundo (y lo que cae a la estrella) ──
  // Hilos: dos capas de 14 líneas del campo (L 1,85 y 2,6 radios) y 9 protuberancias bajas (L 1,12–1,4).
  const hilos = [];
  for (let capa = 0; capa < 2; capa++) for (let k = 0; k < 14; k++) hilos.push({ L: capa ? 2.6 : 1.85, fi: (k + capa * 0.5) / 14 * Math.PI * 2 + 0.2, retraso: (k / 14) * 0.8 + capa * 0.12, tipo: 0, rosa: (k + capa * 3) % 4 === 0 });
  for (let k = 0; k < 11; k++) hilos.push({ L: 1.15 + azar() * 0.4, fi: azar() * Math.PI * 2, retraso: azar() * 0.25, tipo: 1, rosa: true });
  const largo = h => { const t0 = Math.asin(Math.sqrt(1 / h.L)); let s = 0, a = null; for (let i = 0; i <= 40; i++) { const t = t0 + (Math.PI - 2 * t0) * i / 40, r = h.L * Math.sin(t) ** 2, p = [r * Math.sin(t), r * Math.cos(t)]; if (a) s += Math.hypot(p[0] - a[0], p[1] - a[1]); a = p; } return s; };
  const pesos = hilos.map(h => largo(h) * (h.tipo ? 2.6 : 1)), total = pesos.reduce((a, b) => a + b, 0);
  const NL = 13000, NA = 1200, N = NL + NA, F = 3;   // en hilos, las que caen a la estrella, y copias (1 + 2 fantasmas)
  const nube = new Float32Array(N * 3), linea = new Float32Array(N * 4), dato = new Float32Array(N * 4);
  // Nube oscura: hilos de polvo serpenteantes en una cáscara achatada de 1,9 a 4,4 radios.
  const caminantes = [];
  for (let c = 0; c < 70; c++) {
    const p = [0, 0, 0], d = [azar() - 0.5, azar() - 0.5, azar() - 0.5], z0 = azar() * 2 - 1, f0 = azar() * Math.PI * 2, q0 = Math.sqrt(1 - z0 * z0), r0 = 2.0 + azar() * 2.4;
    p[0] = Math.cos(f0) * q0 * r0; p[1] = z0 * r0 * 0.55; p[2] = Math.sin(f0) * q0 * r0;
    const pts = [];
    for (let k = 0; k < 90; k++) {
      for (let e = 0; e < 3; e++) d[e] += (azar() - 0.5) * 0.5;
      const r = Math.hypot(p[0], p[1] / 0.55, p[2]), vuelve = r > 4.4 ? -0.5 : r < 1.9 ? 0.5 : 0;
      for (let e = 0; e < 3; e++) d[e] += p[e] / Math.max(r, 1e-3) * vuelve;
      const L = Math.hypot(...d) || 1; for (let e = 0; e < 3; e++) p[e] += d[e] / L * 0.07;
      pts.push([...p]);
    }
    caminantes.push(pts);
  }
  let i = 0;
  hilos.forEach((h, j) => {
    const n = j === hilos.length - 1 ? NL - i : Math.round(NL * pesos[j] / total);
    for (let k = 0; k < n && i < NL; k++, i++) {
      const s = (k + azar() * 0.8) / n;
      linea.set([h.L, h.fi + (azar() - 0.5) * (h.tipo ? 0.05 : 0.018), s, h.tipo + (h.rosa ? 0.5 : 0)], i * 4);
      dato.set([h.retraso, azar(), azar(), 1.25 + Math.pow(azar(), 1.4) * 3.0], i * 4);
    }
  });
  for (; i < N; i++) { linea.set([2, 0, azar(), 2], i * 4); dato.set([azar() * 0.6, azar(), azar(), 0.15 + azar() * 0.8], i * 4); }
  for (let k = 0; k < N; k++) { const c = caminantes[Math.floor(azar() * caminantes.length)], p = c[Math.floor(azar() * c.length)], j = 0.06; nube.set([(p[0] + (azar() - 0.5) * j) * R, (p[1] + (azar() - 0.5) * j) * R, (p[2] + (azar() - 0.5) * j) * R], k * 3); }
  // Tres copias de cada mota (la de verdad y dos fantasmas de su estela), en bloques para un solo dibujo.
  const rep = (a, w) => { const b = new Float32Array(a.length * F); for (let f = 0; f < F; f++) b.set(a, f * a.length); return new THREE.BufferAttribute(b, w); };
  const fantasma = new Float32Array(N * F); for (let f = 0; f < F; f++) fantasma.fill(f, f * N, (f + 1) * N);
  const gM = new THREE.BufferGeometry();
  gM.setAttribute('position', rep(nube, 3)); gM.setAttribute('aLinea', rep(linea, 4)); gM.setAttribute('aDato', rep(dato, 4)); gM.setAttribute('aFantasma', new THREE.BufferAttribute(fantasma, 1));
  const uM = { uScale, uPR, uExpo: EXPOSICION, uTau: { value: 1 }, uRastro: { value: 0 }, uFlujo: { value: 0 }, uGloria: { value: 0.55 }, uPum: { value: 0 }, uEdad: { value: 1 }, uMedio: { value: 0 }, uCalido: { value: 0.25 }, uLuz: { value: 1 }, uT: { value: 0 }, uTitileo: { value: 1 }, uEstrella: { value: 1 } };
  const materia = new THREE.Points(gM, motas(uM, /* glsl */`attribute vec4 aLinea, aDato; attribute float aFantasma;
    uniform float uScale, uPR, uExpo, uTau, uRastro, uFlujo, uGloria, uPum, uEdad, uMedio, uCalido, uLuz, uT, uTitileo, uEstrella; varying vec3 vC; varying float vA;
    ${COMUN}
    const float R = ${R.toFixed(1)}, PI = 3.14159265;
    float tipo; float s;
    vec3 sitio(float tau){
      // Caída: de su sitio en la nube a su órbita en el disco, girando cada vez más deprisa al acercarse (con algo de
      // retraso propio: no caen todas a la vez).
      float rC = length(position.xz), fC = atan(position.z, position.x);
      float u = clamp((tau - aDato.x * 0.08) / 0.42, 0.0, 1.0), e = u * u * (3.0 - 2.0 * u);
      float rd = aDato.w * R, r = mix(rC, rd, e);
      float f = fC + 2.4 * e * e + 3.2 * smoothstep(0.42, 0.64, tau) * pow(1.3 * R / max(rd, 1.0), 1.5);
      vec3 D = vec3(cos(f) * r, position.y * (1.0 - smoothstep(0.0, 0.85, e)), sin(f) * r);
      if (tipo > 1.5) return D;
      // Su hilo del mundo: r = L·sen²θ entre sus dos pies en la superficie; se dibuja de un pie al otro.
      float L = aLinea.x, t0 = asin(sqrt(1.0 / L)), th = mix(t0, PI - t0, s), rr = L * R * sin(th) * sin(th);
      vec3 W = vec3(rr * sin(th) * cos(aLinea.y), rr * cos(th), rr * sin(th) * sin(aLinea.y));
      float dl = 0.62 + aDato.x * (tipo > 0.5 ? 0.12 : 0.26) + aLinea.z * 0.07, v = smoothstep(dl, dl + 0.1, tau);
      vec3 q = mix(D, W, v); q.y += sin(v * PI) * (aDato.y - 0.5) * 40.0;   // sube del disco a su hilo en un arco
      return q;
    }
    void main(){
      tipo = floor(aLinea.w); float rosa = fract(aLinea.w) * 2.0;
      float vel = tipo > 0.5 ? 1.6 : 2.0 / aLinea.x;
      s = fract(aLinea.z + uFlujo * vel);
      float tau = clamp(uTau - aFantasma * uRastro, 0.0, 1.0);
      vec3 q = sitio(tau);
      vec4 mv = modelViewMatrix * vec4(q, 1.0); gl_Position = projectionMatrix * mv;
      // Etapas: la nube, apenas visible (fría, violeta); el disco, más claro; los hilos, con la actividad de la estrella.
      float hilo = tipo > 1.5 ? 0.0 : smoothstep(0.62 + aDato.x * (tipo > 0.5 ? 0.12 : 0.26) + aLinea.z * 0.07, 0.72 + aDato.x * (tipo > 0.5 ? 0.12 : 0.26) + aLinea.z * 0.07, tau);
      float disco = smoothstep(0.25, 0.5, tau);
      // En los hilos: un pulso de luz con cada golpe, de un pie al otro; el «in the middle» enciende su punto medio.
      float frente = uEdad / 0.55, pulso = exp(-pow((s - frente) * 7.0, 2.0)) * uPum;
      float medio = exp(-pow((s - 0.5) * 12.0, 2.0)) * uMedio;
      float luzHilo = (tipo > 0.5 ? 1.5 : 0.55) + 0.9 * uGloria + 2.0 * pulso + 2.4 * medio + 0.6 * uMedio;
      float a = mix(mix(1.5, 1.0, disco), luzHilo, hilo);
      if (tipo > 1.5) a *= 1.0 - smoothstep(0.47, 0.53, tau);   // lo que cae, se lo traga la estrella al encenderse
      vec3 frio = vec3(0.55, 0.6, 1.0), caliente = mix(vec3(1.0, 0.86, 0.78), vec3(0.85, 0.9, 1.0), uEstrella);
      vec3 cHilo = tipo > 0.5 ? mix(vec3(1.0, 0.5, 0.66), vec3(1.0, 0.78, 0.86), aDato.z) : mix(vec3(0.74, 0.84, 1.0), vec3(1.0, 0.98, 0.98), aDato.z * 0.6);
      cHilo = mix(cHilo, vec3(1.0, 0.7, 0.84), rosa * 0.55 * (1.0 - tipo));
      cHilo = mix(cHilo, mix(vec3(1.0, 0.68, 0.8), vec3(1.0, 0.85, 0.6), aDato.z), uCalido * 0.45);
      vC = mix(mix(frio, caliente, disco), cHilo, hilo);
      // Estela: los fantasmas solo se ven mientras la mota se mueve deprisa (rebobinado, caída), más tenues cuanto más atrás.
      float estela = aFantasma < 0.5 ? 1.0 : (1.0 - aFantasma * 0.32) * smoothstep(0.003, 0.012, abs(uRastro));
      float titila = 1.0 - uTitileo * 0.25 * (0.5 + 0.5 * sin(uT * (0.8 + aDato.z * 1.7) + aDato.y * 60.0));
      vA = uLuz * a * estela * titila * tamMota(1.6 + aDato.y * 1.3, mv, 2.6) * fueraSilueta(mv, R * uEstrella) * sqrt(uExpo); }`));
  materia.frustumCulled = false; materia.renderOrder = 2; marco.add(materia);

  // ── Viento, corona y espículas ──
  const NV = 3000, NE = 2200, NB = NV + NE, dir = new Float32Array(NB * 3), datoV = new Float32Array(NB * 4);
  const serpentinas = Array.from({ length: 9 }, () => { const f = azar() * Math.PI * 2, y = (azar() - 0.5) * 0.7; const q = Math.sqrt(1 - y * y); return [Math.cos(f) * q, y, Math.sin(f) * q]; });
  const v = new THREE.Vector3();
  for (let k = 0; k < NB; k++) {
    const espicula = k >= NV;
    if (!espicula && azar() < 0.6) { const b = serpentinas[Math.floor(azar() * serpentinas.length)], g = () => (azar() + azar() + azar() - 1.5) * 0.18; v.set(b[0] + g(), b[1] + g(), b[2] + g()).normalize(); }
    else { const z = azar() * 2 - 1, f = azar() * Math.PI * 2, q = Math.sqrt(1 - z * z); v.set(Math.cos(f) * q, z, Math.sin(f) * q); }
    dir.set([v.x, v.y, v.z], k * 3); datoV.set([azar(), 0.6 + azar() * 0.8, espicula ? 1 : 0, azar()], k * 4);
  }
  const gV = new THREE.BufferGeometry(); gV.setAttribute('position', new THREE.BufferAttribute(dir, 3)); gV.setAttribute('aDato', new THREE.BufferAttribute(datoV, 4));
  const uV = { uScale, uPR, uExpo: EXPOSICION, uViento: { value: 0 }, uEstrella: { value: 1 }, uGloria: { value: 0.55 }, uPum: { value: 0 }, uEncendido: { value: -1 }, uT: { value: 0 }, uTitileo: { value: 1 }, uLuz: { value: 1 }, uCam: { value: new THREE.Vector3(0, 0, 1) } };
  const viento = new THREE.Points(gV, motas(uV, /* glsl */`attribute vec4 aDato;
    uniform float uScale, uPR, uExpo, uViento, uEstrella, uGloria, uPum, uEncendido, uT, uTitileo, uLuz; uniform vec3 uCam; varying vec3 vC; varying float vA;
    ${COMUN}
    const float R = ${R.toFixed(1)};
    void main(){
      float espicula = aDato.z, edad = fract(aDato.x + uViento * aDato.y * (espicula > 0.5 ? 6.0 : 1.0)), r, a;
      // Las espículas se ven en el borde (el limbo visto desde la cámara): se colocan siempre en ese anillo, con un poco
      // de profundidad; así forman un ribete de motas finísimas alrededor de la estrella, se mire desde donde se mire.
      vec3 dir = position;
      if (espicula > 0.5) { vec3 eje = normalize(uCam); vec3 d = position - eje * dot(position, eje); dir = normalize(normalize(d) + eje * (aDato.w - 0.5) * 0.25); }
      if (espicula > 0.5) { r = R * (1.0 + 0.07 * edad * (0.6 + 0.8 * aDato.w)); a = (1.0 - edad) * 2.0; }
      else { r = R * (1.02 + 2.7 * pow(edad, 1.7)); a = pow(1.0 - edad, 1.2) * smoothstep(0.0, 0.04, edad) * 1.3; }
      // Al encenderse, un frente de motas sale de la estrella y se deshace en el viento.
      if (uEncendido >= 0.0) { float k = smoothstep(0.8, 1.7, uEncendido), rf = R * (1.0 + uEncendido * 2.6 * (0.8 + 0.4 * aDato.w)); r = mix(rf, r, k); a = mix(1.4 * (1.0 - smoothstep(1.0, 1.7, uEncendido)), a, k); }
      vec4 mv = modelViewMatrix * vec4(dir * r * mix(0.25, 1.0, uEstrella), 1.0); gl_Position = projectionMatrix * mv;
      vC = espicula > 0.5 ? mix(vec3(1.0, 0.96, 0.98), vec3(1.0, 0.62, 0.76), step(0.7, aDato.w)) : mix(vec3(0.76, 0.85, 1.0), vec3(1.0, 1.0, 1.0), aDato.w * 0.5);
      float titila = 1.0 - uTitileo * 0.3 * (0.5 + 0.5 * sin(uT * (1.0 + aDato.w * 2.0) + aDato.x * 50.0));
      vA = uLuz * uEstrella * a * (0.6 + 0.8 * uGloria) * (1.0 + 0.7 * uPum) * titila * tamMota(espicula > 0.5 ? 1.5 : 1.8 + aDato.w * 1.4, mv, espicula > 0.5 ? 2.0 : 2.8) * fueraSilueta(mv, R * uEstrella) * uExpo; }`));
  viento.frustumCulled = false; viento.renderOrder = 2; marco.add(viento);

  // Estado normal (fuera de escena) y memoria mínima entre cuadros (sin objetos nuevos en cada cuadro).
  let tEstrella = 0, tauAntes = null;
  const base = new THREE.Matrix4(), cero = new THREE.Vector3(), arriba = new THREE.Vector3(), q = new THREE.Quaternion(), inclina = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.18), inversa = new THREE.Matrix4();
  const mezcla = (n, e, w) => n + (e - n) * w;
  return {
    marco, superficie, materia, viento,
    // Al empezar la escena: el marco mira hacia la cámara (camLocal: la cámara en el espacio del grupo de Deneb) con su
    // eje hacia el «arriba» del mundo (arribaLocal): el azimut 0 de la pista de cámara es desde donde se llegó.
    orientar(camLocal, arribaLocal) {
      arriba.copy(arribaLocal).normalize(); base.lookAt(camLocal, cero, arriba); q.setFromRotationMatrix(base);
      // Matrix4.lookAt deja el +Z hacia la cámara (azimut 0); el eje del mundo, algo inclinado (se lee su forma).
      marco.quaternion.copy(q).multiply(inclina);
      tauAntes = null;
    },
    // e: estado de la escena (estadoDeneb); n: el estado normal; w: peso de la escena (0–1).
    actualizar(e, n, w, dt, t, reducido, camMundo = null) {
      if (camMundo) uV.uCam.value.copy(camMundo).applyMatrix4(inversa.copy(marco.matrixWorld).invert());   // la cámara en el espacio del marco
      const tau = mezcla(n.tau, e.tau, w), estrella = mezcla(n.estrella, e.estrella, w), brasa = e.brasa * w, gloria = mezcla(n.gloria, e.gloria, w), reloj = mezcla(1, e.reloj, w);
      tEstrella += dt * reloj;
      const dtau = tauAntes === null || dt <= 0 ? 0 : (tau - tauAntes) / dt; tauAntes = tau;
      // Tamaño: nada → brasa (0,24 R) → estrella (con un pequeño rebote al encenderse); late con el bombo.
      const tam = Math.max(0.001, brasa * 0.24 * (1 + 0.25 * e.pum) + estrella * (1 + 0.05 * Math.sin(Math.min(1, Math.max(0, e.encendido) / 1.2) * Math.PI) * w));
      superficie.visible = tam > 0.01; superficie.scale.setScalar(tam * (1 + (reducido ? 0 : 0.012) * e.pum * w));
      uS.uT.value = tEstrella; uS.uTemp.value = estrella; uS.uLuz.value = estrella + brasa * 0.9; uS.uGloria.value = gloria; uS.uPum.value = e.pum * w;
      uM.uTau.value = tau; uM.uRastro.value = reducido ? 0 : Math.max(-0.08, Math.min(0.08, dtau * 0.08)); uM.uFlujo.value += dt * reloj * (reducido ? 0.01 : 0.025);
      uM.uGloria.value = gloria; uM.uPum.value = e.pum * w; uM.uEdad.value = e.edad ?? 1; uM.uMedio.value = e.medio * w; uM.uCalido.value = mezcla(n.calido, e.calido, w);
      uM.uT.value = t; uM.uTitileo.value = reducido ? 0 : 1; uM.uEstrella.value = Math.max(estrella, 0.001);
      uV.uViento.value += dt * reloj * (reducido ? 0.03 : 0.06 + 0.06 * gloria); uV.uEstrella.value = estrella; uV.uGloria.value = gloria; uV.uPum.value = e.pum * w;
      uV.uEncendido.value = w > 0.5 ? e.encendido : -1; uV.uT.value = t; uV.uTitileo.value = reducido ? 0 : 1;
    }
  };
}
