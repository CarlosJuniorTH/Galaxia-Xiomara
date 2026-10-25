// Sagitario A*: el corazón de la Vía Láctea. Un agujero negro discreto (sombra, anillo de fotones y un flujo de gas caliente
// que la lente curva en anillo, con su media luna brillante), las estrellas S en sus órbitas reales (elementos medidos por
// el VLT y GRAVITY: js/util/guionSagitario.js) dejando trazas de motas, y el gas del centro galáctico: la minispiral de gas
// ionizado y el anillo de polvo que la rodea. Todo con motas nítidas (sin halos ni degradados).
// Su escena («Say Yes to Heaven», js/util/guionSagitario.js): las elipses se dibujan mientras ella dice que nada más
// importa; S2 cae y roza el agujero en el primer «sí» (se sonroja y su órbita precesa: una roseta); cada «sí» es una
// llamarada real (el anillo se enciende, una mancha caliente gira junto a la sombra) cuyo eco de luz sale y enciende el
// gas. Mientras, el agujero, hambriento al principio, se traga cuatro grumos de gas que caen de la minispiral (uno por
// cada «sí») y su flujo se va encendiendo hasta el diseño final. Las órbitas se calculan en la GPU (Kepler); por cuadro
// solo cambian unos uniformes (15 estrellas).
import * as THREE from 'three';
import { GLSL_LENTE, GLSL_TAMANO, GLSL_OCULTA, geometriaMotas, materialMotas, crearAnilloFotones } from './curvaLuz.js';
import { materialSombra } from './materiales.js';
import { ESTRELLAS_S, reposoSagitario, segundosPorAno, marcasSagitario } from '../util/guionSagitario.js';
import { atenuarFondo } from '../util/fondoEscena.js';

const N_FLUJO = 9000, N_ESPIRAL = 16000, N_POLVO = 8000, N_GRUMO = 700;
// Motas de cada traza: S2 (la protagonista) más densa; el resto, en proporción a lo largo de su elipse.
const N_S2 = 1800, N_OTRA = 820;
// Compresión de las distancias (real en segundos de arco → radios de la sombra): R = K·r^0,4. S2 pasa a 1,75 radios de la
// sombra (rozando el flujo) y su apocentro queda a 5,3; la más abierta (S1) llega a 9,2. Ninguna atraviesa la sombra.
const K_COMP = 9.5, EXP_COMP = 0.4;
const PRECESION = 18 * Math.PI / 180;   // giro de la órbita de S2 en cada pericentro (el real es 0,2°: exagerado para verse)
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const muySuave = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * k * (k * (k * 6 - 15) + 10); };
const DOS_PI = 2 * Math.PI, grad = Math.PI / 180;

const cabecera = `attribute float aImagen, aTam; varying vec3 vC; varying float vA;
  uniform float uUnidad, uR;
  ${GLSL_LENTE}
  ${GLSL_TAMANO}`;
// Eco de luz de cada «sí»: un frente nítido que sale del centro a 2,8 radios por segundo (la luz de la llamarada llegando
// a cada mota) y se apaga en unos segundos.
const GLSL_ECO = /* glsl */`
  uniform vec4 uEcos, uEcosF;
  float eco(float r){
    float b = 0.0;
    for (int i = 0; i < 4; i++) { float e = uEcos[i]; if (e >= 0.0) { float d = (r - 1.2 - e * 2.8) / 0.45; b += uEcosF[i] * exp(-d * d - e / 5.0); } }
    return b;
  }`;

// grupo: el del agujero en el cosmos (su posición y su escala); aquí se le añaden las piezas.
export function* construirSagitario({ uScale, uPR, RS, grupo }) {
  const al = azar(2026);
  const comunes = { uScale, uPR, uMaximo: { value: 3 }, uSombra: { value: RS }, uR: { value: RS }, uUnidad: { value: RS }, uGiro: { value: 0 },
    uEcos: { value: new THREE.Vector4(-1, -1, -1, -1) }, uEcosF: { value: new THREE.Vector4() } };

  const sombra = new THREE.Mesh(new THREE.SphereGeometry(RS, 128, 96), materialSombra({ depthTest: true, depthWrite: true }));
  const anillo = crearAnilloFotones(RS, ['#fff1dc', '#ff9a4a']);
  grupo.add(sombra, anillo);

  yield;
  // ── Flujo de acreción: gas caliente y tenue, grueso, muy cerca de la sombra. Gira deprisa y el Doppler concentra su luz
  // en una media luna; la lente dobla su parte de detrás en un anillo (como en la imagen del Telescopio del Horizonte).
  // En cada «sí», la llamarada: todo el flujo se aviva y una mancha caliente gira con él pegada a la sombra. ──
  const planoFlujo = new THREE.Group(); planoFlujo.rotation.set(1.05, 0.4, 0.2); grupo.add(planoFlujo);
  let flujo;
  {
    const d = new Float32Array(N_FLUJO * 3), tam = new Float32Array(N_FLUJO);
    for (let i = 0; i < N_FLUJO; i++) { const r = 1.18 + Math.pow(al(), 1.4) * 1.7; d.set([r, al() * Math.PI * 2, (al() - 0.5) * 0.45], i * 3); tam[i] = 0.03 + al() * 0.03; }
    flujo = new THREE.Points(geometriaMotas({ aFlujo: [d, 3], aTam: [tam, 1], position: [new Float32Array(N_FLUJO * 3), 3] }, RS * 3.5), materialMotas({
      ...comunes, uCamLocal: { value: new THREE.Vector3(0, 0, 1e6) }, uDestello: { value: 0 }, uMancha: { value: 0 }, uManchaAng: { value: 0 }, uAlimento: { value: 1 }
    }, /* glsl */`
      attribute vec3 aFlujo; uniform float uGiro, uDestello, uMancha, uManchaAng, uAlimento; uniform vec3 uCamLocal;
      ${cabecera}
      void main(){
        float r = aFlujo.x, th = aFlujo.y + uGiro * 2.1 * pow(r / 1.18, -1.5);
        vec3 pl = vec3(cos(th) * r, aFlujo.z * r, sin(th) * r);
        vec3 vel = vec3(-sin(th), 0.0, cos(th)), haciaCam = normalize(uCamLocal - pl * uR);
        float b = 0.55 * sqrt(1.18 / r), g = sqrt(1.0 - b * b) / (1.0 - b * dot(vel, haciaCam)), dop = g * g * g;
        vec3 c = mix(vec3(1.0, 0.86, 0.62), vec3(1.0, 0.45, 0.18), smoothstep(1.2, 2.8, r));
        c = mix(c, vec3(1.0, 0.95, 0.88), clamp(g - 1.0, 0.0, 1.0) * 0.5);
        // La mancha caliente: un grumo del flujo a 1,35 radios que se enciende y gira con él.
        float da = mod(th - uManchaAng + 3.14159265, 6.2831853) - 3.14159265, dr = (r - 1.35) / 0.2;
        float mancha = uMancha * exp(-da * da / 0.09 - dr * dr);
        c = mix(c, vec3(1.0, 0.97, 0.92), clamp(uDestello * 0.4 + mancha, 0.0, 1.0));
        // Hambriento (uAlimento bajo) el flujo es casi oscuro y rojizo; con cada grumo tragado se aviva.
        c = mix(vec3(0.85, 0.32, 0.2), c, uAlimento);
        float brillo = clamp(dop, 0.2, 2.0) * (1.18 / r) * (uAlimento + uDestello * 1.8) * 1.35 + mancha * 3.2;
        vec4 im = imagenLente((modelViewMatrix * vec4(pl * uR, 1.0)).xyz, aImagen);
        if (im.w <= 0.001) { ${GLSL_OCULTA} }
        gl_Position = projectionMatrix * vec4(im.xyz, 1.0);
        float luz; gl_PointSize = tamanoMota(aTam * uUnidad, -im.z, luz);
        vC = c; vA = brillo * luz * im.w;
      }`));
    planoFlujo.add(flujo);
  }

  // ── Los grumos que caen: cuatro nubecillas de gas que se sueltan de la minispiral y caen en espiral hasta el agujero,
  // una por cada «sí». La marea las estira en un hilo al acercarse (como la nube G2) y se calientan (rosa → blanco); la
  // cabeza del hilo entra en la sombra un poco antes del «sí» y la cola un poco después. Solo existen durante la escena. ──
  let grumos;
  {
    const n = N_GRUMO * 4, g = new Float32Array(n * 4), tam = new Float32Array(n);
    for (let j = 0; j < n; j++) {
      const i = Math.floor(j / N_GRUMO), r = Math.sqrt(al()), a = al() * DOS_PI;
      // a lo largo (−1 delante … 1 detrás; más motas detrás: la cola larga) y a lo ancho (disco de radio 1)
      g.set([i, Math.pow(al(), 0.8) * 2 - 1, Math.cos(a) * r, Math.sin(a) * r], j * 4); tam[j] = 0.045 + al() * 0.03;
    }
    grumos = new THREE.Points(geometriaMotas({ aG: [g, 4], aTam: [tam, 1], position: [new Float32Array(n * 3), 3] }, RS * 9), materialMotas({
      ...comunes, uTs: { value: 0 }, uGrumos: { value: 0 }, uIni: { value: new THREE.Vector4(-9, -9, -9, -9) }, uFin: { value: new THREE.Vector4(-8, -8, -8, -8) }
    }, /* glsl */`
      attribute vec4 aG; uniform float uTs, uGrumos; uniform vec4 uIni, uFin;
      ${cabecera}
      void main(){
        int i = int(aG.x + 0.5); float ini = uIni[i], fin = uFin[i], T = max(fin - ini, 1.0);
        float p = clamp((uTs - ini) / T, 0.0, 1.0);
        // Segundos que le faltan a esta mota para entrar en la sombra (la marea separa cabeza y cola).
        float tau = fin - uTs + aG.y * (0.15 + 1.7 * p * p);
        if (uGrumos <= 0.001 || tau <= 0.0 || uTs < ini) { ${GLSL_OCULTA} }
        float q = clamp(tau / T, 0.0, 1.2), R0 = 7.6 - float(i) * 0.5;
        float r = 1.0 + (R0 - 1.0) * pow(q, 0.667);                       // caída libre: r ∝ τ^⅔
        float th = float(i) * 1.9 + 0.8 + 2.6 * log(R0 / r);              // la espiral se cierra al bajar
        float ancho = 0.32 * (1.0 - 0.8 * p) * (0.4 + 0.6 * (r - 1.0) / (R0 - 1.0));
        vec3 pl = vec3(cos(th) * r, 0.9 * (r - 1.0) / (R0 - 1.0) * (i == 1 || i == 3 ? -1.0 : 1.0), sin(th) * r) + vec3(aG.z, aG.w * 0.5, aG.w) * ancho;
        float calor = 1.0 - smoothstep(1.4, 4.5, r);
        vec3 c = mix(i == 0 || i == 3 ? vec3(1.0, 0.5, 0.66) : vec3(1.0, 0.72, 0.5), vec3(1.0, 0.96, 0.9), calor);
        // Aparece al soltarse, brilla más al calentarse y se apaga al cruzar el horizonte (corrimiento al rojo).
        float brillo = smoothstep(0.0, 1.6, uTs - ini) * (1.4 + 2.4 * calor) * smoothstep(1.0, 1.3, r) * uGrumos;
        vec4 im = imagenLente((modelViewMatrix * vec4(pl * uR, 1.0)).xyz, aImagen);
        if (im.w <= 0.001) { ${GLSL_OCULTA} }
        gl_Position = projectionMatrix * vec4(im.xyz, 1.0);
        float luz; gl_PointSize = tamanoMota(aTam * uUnidad, -im.z, luz);
        vC = c; vA = brillo * luz * im.w;
      }`));
    planoFlujo.add(grumos);
  }

  yield;
  // ── Gas del centro galáctico: la minispiral (tres brazos de gas ionizado, rosa) y el anillo circumnuclear de polvo
  // (grumos anaranjados, inclinado). Motas pequeñas y tenues: acompañan sin tapar al agujero. No gira (en la realidad
  // tarda miles de años): solo se enciende cuando le llega el eco de una llamarada, y queda algo iluminado. ──
  let gas;
  {
    const n = N_ESPIRAL + N_POLVO, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tam = new Float32Array(n), fase = new Float32Array(n);
    const brazos = [[2.0, 8.5, 0.3, 2.7], [2.4, 7.6, 2.9, 4.9], [1.6, 4.2, 5.0, 6.5]], v = new THREE.Vector3(), eje = new THREE.Euler(0.5, 0, 0.25);
    const grumos = Array.from({ length: 46 }, () => [al() * Math.PI * 2, 9.4 + al() * 2.2, (al() - 0.5) * 0.7]), ejePolvo = new THREE.Euler(1.25, 0.3, 0);
    for (let i = 0; i < n; i++) {
      if ((i & 4095) === 4095) yield;
      let c;
      if (i < N_ESPIRAL) {
        if (al() < 0.78) {
          const [r0, r1, a0, a1] = brazos[Math.floor(al() * 3)], s = al(), r = r0 + (r1 - r0) * s, a = a0 + (a1 - a0) * s, grosor = 0.18 + 0.25 * s;
          v.set(Math.cos(a) * r + (al() - 0.5) * grosor * 2, (al() - 0.5) * grosor, Math.sin(a) * r + (al() - 0.5) * grosor * 2);
        } else { const r = 2 + al() * 7, a = al() * Math.PI * 2; v.set(Math.cos(a) * r, (al() - 0.5) * 1.6, Math.sin(a) * r); }
        v.applyEuler(eje); c = al() < 0.75 ? [1.0, 0.42, 0.55] : [1.0, 0.66, 0.5];
      } else {
        const [a0, r0, y0] = grumos[Math.floor(al() * grumos.length)], a = a0 + (al() - 0.5) * 0.28, r = r0 + (al() - 0.5) * 0.7;
        v.set(Math.cos(a) * r, y0 + (al() - 0.5) * 0.35, Math.sin(a) * r).applyEuler(ejePolvo); c = [0.9, 0.38, 0.24];
      }
      pos.set([v.x * RS, v.y * RS, v.z * RS], i * 3); col.set(c, i * 3); tam[i] = 0.022 + al() * 0.02; fase[i] = al();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1)); geo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), RS * 13);
    gas = new THREE.Points(geo, materialMotas({ ...comunes, uT: { value: 0 }, uEncendido: { value: 0 } }, /* glsl */`
      attribute vec3 aColor; attribute float aTam, aFase; uniform float uUnidad, uT, uR, uEncendido; varying vec3 vC; varying float vA;
      ${GLSL_TAMANO}
      ${GLSL_ECO}
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float luz; gl_PointSize = tamanoMota(aTam * uUnidad, -mv.z, luz);
        // Cerca de la cámara (el anillo de polvo puede rodearla) se apaga: nada grande ni borroso delante.
        float cerca = smoothstep(1.5, 4.0, -mv.z / uUnidad);
        float e = eco(length(position) / uR), luzEco = e * 5.0 + uEncendido * 1.5;
        vC = mix(aColor, vec3(1.0, 0.86, 0.74), clamp(e * 0.6, 0.0, 0.7));
        vA = luz * 0.45 * cerca * (0.8 + 0.2 * sin(uT * (0.5 + aFase * 0.5) + aFase * 30.0)) * (1.0 + luzEco);
      }`));
    grupo.add(gas);
  }

  yield;
  // ── Estrellas S y sus trazas: cada estrella deja detrás su elipse de motas (la parte reciente más viva). Base de cada
  // órbita en el cielo (Thiele–Innes): norte = +Y, este = −X, hacia la Tierra = +Z (desde +Z se ven como en las medidas). ──
  const estrellas = ESTRELLAS_S.map(({ a, e, i, nodo, peri, anos }) => {
    const O = nodo * grad, w = peri * grad, I = i * grad, base = (wa) => {
      // Vector unitario en el plano de la órbita a un ángulo wa desde el nodo ascendente (norte, este, línea de visión).
      const n = Math.cos(O) * Math.cos(wa) - Math.sin(O) * Math.sin(wa) * Math.cos(I), es = Math.sin(O) * Math.cos(wa) + Math.cos(O) * Math.sin(wa) * Math.cos(I), z = Math.sin(wa) * Math.sin(I);
      return new THREE.Vector3(-es, n, z);
    };
    return { a, e, anos, P: base(w), Q: base(w + Math.PI / 2), M: al() * DOS_PI };
  });
  const N_EST = estrellas.length;
  let trazas;
  {
    const cuantas = estrellas.map((_, i) => i === 0 ? N_S2 : N_OTRA), n = cuantas.reduce((a, b) => a + b, 0);
    const est = new Float32Array(n * 2), tam = new Float32Array(n), col = new Float32Array(n * 3);
    // S2 rosa (la protagonista); las demás, blancas azuladas (son estrellas jóvenes y calientes), alguna dorada.
    const color = i => i === 0 ? [1.0, 0.7, 0.82] : i % 5 === 3 ? [1.0, 0.84, 0.62] : [0.78, 0.86, 1.0];
    let j = 0;
    for (let i = 0; i < N_EST; i++) for (let k = 0; k < cuantas[i]; k++, j++) {
      est.set([i, k / cuantas[i]], j * 2); col.set(color(i), j * 3);
      tam[j] = k === 0 ? (i === 0 ? 0.16 : 0.1) : i === 0 ? 0.06 : 0.042;
    }
    trazas = new THREE.Points(geometriaMotas({ aEst: [est, 2], aTam: [tam, 1], aColor: [col, 3], position: [new Float32Array(n * 3), 3] }, RS * 13), materialMotas({
      ...comunes,
      uP: { value: estrellas.map(s => s.P.clone()) }, uQ: { value: estrellas.map(s => s.Q.clone()) },
      uEl: { value: estrellas.map(s => new THREE.Vector3(s.a, s.e, 0)) },   // semieje (″), excentricidad, anomalía excéntrica ahora
      uTraza: { value: 1 }, uFoco: { value: 0 }, uVueltasS2: { value: 0 }
    }, /* glsl */`
      attribute vec2 aEst; attribute vec3 aColor;
      uniform vec3 uP[${N_EST}], uQ[${N_EST}], uEl[${N_EST}]; uniform float uTraza, uFoco, uVueltasS2;
      ${cabecera}
      ${GLSL_ECO}
      void main(){
        int i = int(aEst.x + 0.5); float k = aEst.y;
        vec3 el = uEl[i];
        // Cada mota de la traza, un punto de la elipse por detrás de la estrella (en anomalía excéntrica: reparto parejo).
        float E = el.z - k * 6.2831853, ex = el.y;
        vec3 P = uP[i], Q = uQ[i];
        if (i == 0) {
          // S2: su órbita gira ${PRECESION.toFixed(3)} rad en cada pericentro (la roseta): cada mota, con las vueltas que
          // llevaba la estrella cuando pasó por ella.
          float x = (E - ex * sin(E)) / 6.2831853, f = fract(x + 0.5);
          float vueltas = mod(uVueltasS2 + floor(x + 0.5) + smoothstep(0.47, 0.53, f), 20.0), w = vueltas * ${PRECESION.toFixed(5)};
          vec3 P2 = P * cos(w) + Q * sin(w); Q = Q * cos(w) - P * sin(w); P = P2;
        }
        float rReal = el.x * (1.0 - ex * cos(E));
        vec3 dir = (P * (cos(E) - ex) + Q * (sqrt(1.0 - ex * ex) * sin(E))) * (el.x / rReal);
        float R = ${K_COMP.toFixed(2)} * pow(rReal, ${EXP_COMP.toFixed(2)});
        vec3 pl = dir * R;
        float cabeza = step(k, 0.0001);
        // La traza: viva cerca de la estrella, tenue en el resto de la elipse; crece con la escena (uTraza).
        float largo = max(uTraza, 0.05), estela = mix(0.16, 1.0, pow(1.0 - min(k / largo, 1.0), 1.3)) * (1.0 - smoothstep(largo - 0.06, largo, k));
        float foco = i == 0 ? 1.5 + 0.5 * uFoco : 1.0 - 0.6 * uFoco;   // S2, la protagonista, siempre más viva
        float brillo = mix(estela * 0.75, i == 0 ? 2.4 : 1.6, cabeza) * foco * (1.0 + eco(R) * 1.6);
        // S2 se sonroja al rozar el agujero (corrimiento al rojo gravitatorio).
        float roce = i == 0 ? 1.0 - smoothstep(1.8, 3.2, R) : 0.0;
        vec3 c = mix(mix(aColor, vec3(1.0), cabeza * 0.6), vec3(1.0, 0.5, 0.58), roce * cabeza);
        vec4 im = imagenLente((modelViewMatrix * vec4(pl * uR, 1.0)).xyz, aImagen);
        if (im.w <= 0.001) { ${GLSL_OCULTA} }
        gl_Position = projectionMatrix * vec4(im.xyz, 1.0);
        float luz; gl_PointSize = tamanoMota(aTam * uUnidad, -im.z, luz);
        // La cabeza de S2, un poco mayor que el resto de motas (hasta 4 px CSS): se distingue entre las demás estrellas.
        if (i == 0 && cabeza > 0.5) gl_PointSize = min(gl_PointSize * 1.35, 4.0 * uPR);
        vC = c; vA = brillo * luz * im.w * (1.0 + roce * cabeza * 0.5);
      }`));
    grupo.add(trazas);
  }

  for (const [o, orden] of [[gas, 0], [sombra, 1], [flujo, 2], [grumos, 2], [trazas, 3], [anillo, 4]]) o.renderOrder = orden;

  // ── Por cuadro (sin memoria nueva) ──
  const g = reposoSagitario(), u = trazas.material.uniforms, uf = flujo.material.uniforms;
  const tmp = new THREE.Vector3(), centro = new THREE.Vector3(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  // Anomalía media de cada estrella. S2 sin envolver (las vueltas cuentan para la roseta).
  const marcas = marcasSagitario(), spa = segundosPorAno(marcas), ritmo = estrellas.map(s => DOS_PI / (s.anos * spa));
  let giro = 0, escenaVista = null, baseS2 = 0, atenuando = false;
  const kepler = (M, e) => { let E = M; for (let n = 0; n < 6; n++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; };
  return {
    sombra, anillo, flujo, gas, trazas, grumos, RS,
    atenuacionLente: 1,   // (cosmos.lentes: la lente de pantalla con toda su fuerza)
    actualizar(t, dt, camera, escena) {
      const w = escena ? escena.presencia : 0, s = escena ? escena.guion : g, viva = !!escena?.viva;
      grupo.updateMatrixWorld();
      const unidad = RS * grupo.matrixWorld.getMaxScaleOnAxis(); comunes.uUnidad.value = unidad; comunes.uSombra.value = unidad;
      const d = camera.position.distanceTo(grupo.getWorldPosition(centro)), px = unidad / Math.max(1, d) * 900;
      for (const m of [flujo, trazas, grumos]) m.geometry.instanceCount = px > 5 ? 3 : 1;
      planoFlujo.updateMatrixWorld(); planoFlujo.worldToLocal(uf.uCamLocal.value.copy(camera.position));
      giro += dt; comunes.uGiro.value = giro; gas.material.uniforms.uT.value = t;
      // Órbitas: todas a su ritmo real. S2, en la escena, sigue el reloj de la canción (pericentro en el primer «sí»); al
      // empezar se pone al día por delante en los primeros 14 s (sin saltos ni marcha atrás).
      for (let i = 1; i < N_EST; i++) estrellas[i].M += dt * ritmo[i];
      const s2 = estrellas[0];
      if (escena && viva) {
        if (escenaVista !== escena) {
          escenaVista = escena;
          const adelanto = ((s2.M - s.s2) % DOS_PI + DOS_PI) % DOS_PI;   // [0, 2π): lo que la escena debe recuperar
          baseS2 = s2.M - s.s2 - adelanto;
        }
        const objetivo = baseS2 + s.s2, desfase = ((objetivo - s2.M) % DOS_PI + DOS_PI) % DOS_PI;
        // Recupera el desfase (siempre hacia delante) y, pasados 14 s, sigue exactamente el reloj.
        const k = muySuave(s.t, 0, 14);
        s2.M = k >= 1 ? objetivo : s2.M + Math.min(desfase, Math.max(dt * ritmo[0], desfase * Math.min(1, dt * (0.4 + 3 * k))));
      } else { s2.M += dt * ritmo[0]; if (!escena) escenaVista = null; }
      for (let i = 0; i < N_EST; i++) {
        const e = estrellas[i], Mw = ((e.M % DOS_PI) + DOS_PI) % DOS_PI;
        u.uEl.value[i].z = kepler(Mw, e.e);
      }
      u.uVueltasS2.value = Math.floor(s2.M / DOS_PI) % 20;
      // Lo que manda el guion (fundido con el reposo por la presencia de la escena).
      u.uTraza.value = 1 + (s.revela - 1) * w; u.uFoco.value = s.foco * w;
      uf.uDestello.value = s.destello * w; uf.uMancha.value = s.mancha * w; uf.uManchaAng.value = s.manchaAng;
      for (let i = 0; i < 4; i++) { comunes.uEcos.value.setComponent(i, s.ecos[i]); comunes.uEcosF.value.setComponent(i, s.ecosF[i] * w); }
      gas.material.uniforms.uEncendido.value = s.encendido * w;
      // Las nebulosas del fondo (nubes rojas y moradas que llenaban el encuadre) se apagan mientras dura el clip: el
      // protagonista es el agujero. En la calma vuelven a medias; al irse, del todo.
      if (escena) { atenuando = true; atenuarFondo(centro.x, centro.y, centro.z, unidad * 60, w * (0.88 - 0.4 * s.calma)); }
      else if (atenuando) { atenuando = false; atenuarFondo(0, 0, 0, 0, 0); }
      const alimento = 1 + (s.alimento - 1) * w, ug = grumos.material.uniforms;
      uf.uAlimento.value = alimento; ug.uTs.value = s.t; ug.uGrumos.value = w;
      ug.uIni.value.fromArray(s.grumosIni); ug.uFin.value.fromArray(s.grumosFin);
      // Anillo de fotones: su lado brillante es el de la media luna del flujo; se enciende en cada «sí».
      anillo.lookAt(camera.position);
      const c = uf.uCamLocal.value; tmp.set(c.z, 0, -c.x).normalize().applyQuaternion(planoFlujo.getWorldQuaternion(qa)).applyQuaternion(anillo.getWorldQuaternion(qb).invert());
      anillo.material.uniforms.uLado.value.set(tmp.x, tmp.y).normalize();
      anillo.material.uniforms.uLuz.value = 1.6 * (0.3 + 0.7 * alimento) + (s.inspira + s.destello * 1.3) * w;
    }
  };
}
