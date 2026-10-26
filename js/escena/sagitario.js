// Sagitario A*: el agujero negro del centro de la Vía Láctea, como en la imagen del Telescopio del Horizonte de Sucesos
// (EHT, 2022): una sombra negra perfecta rodeada por un anillo de plasma naranja y dorado, con tres zonas más brillantes,
// el anillo de fotones finísimo pegado a la sombra y, alrededor, unas pocas estrellas S en sus órbitas reales.
//  · El anillo de plasma: un cuadrado frente a la cámara, centrado en el agujero; en cada píxel, la distancia al centro
//    (el parámetro de impacto, en radios de la sombra) y el ángulo. La emisión de Sgr A* es ópticamente fina y casi
//    esférica: desde cualquier lado se ve como un anillo (la lente concentra su luz en torno a la sombra). Su textura son
//    hebras finas de plasma horneadas en la carga en una textura polar (ángulo × radio) que giran más deprisa cuanto más
//    cerca (dos fases que se relevan para que el giro diferencial no las enrosque sin fin): detalle nítido al moverse sin
//    una sola partícula. El lado que viene hacia nosotros, más brillante (Doppler).
//  · Las estrellas S (js/util/guionSagitario.js): cuatro órbitas reales, distancias comprimidas, calculadas en la GPU.
//  · Los grumos que caen: cuatro nubecillas de gas, una por cada «sí», que bajan en espiral estiradas por la marea.
// Su videoclip: el agujero hambriento, casi invisible; cada «sí» es un grumo que llega al anillo, una llamarada (una mancha
// caliente que da la vuelta) y el plasma que se enciende desde el punto donde cayó; con el último, la imagen del EHT
// entera. Por cuadro solo cambian uniformes.
import * as THREE from 'three';
import { GLSL_LENTE, GLSL_TAMANO, GLSL_OCULTA, geometriaMotas, materialMotas, crearAnilloFotones } from './curvaLuz.js';
import { materialSombra } from './materiales.js';
import { ESTRELLAS_S, reposoSagitario, segundosPorAno, marcasSagitario } from '../util/guionSagitario.js';
import { atenuarFondo } from '../util/fondoEscena.js';

const N_GRUMO = 700, N_S2 = 2200, N_OTRA = 1500;
// Anillo de plasma: el cuadrado llega a 2,6 radios de la sombra; la textura polar cubre del borde de la sombra (1) a 2,6.
const R_CUADRO = 2.6, TEX_ANCHO = 2048, TEX_ALTO = 256;
// Compresión de las distancias de las estrellas S (real en ″ → radios de la sombra): R = K·r^0,4 (S2 pasa a 1,75).
const K_COMP = 9.5, EXP_COMP = 0.4;
const PRECESION = 18 * Math.PI / 180;   // giro de la órbita de S2 en cada pericentro (el real es 0,2°: exagerado para verse)
// Cuánto del anillo enciende cada «sí» (medio ángulo, rad) desde donde cae su grumo: el último lo completa.
const ABARCA = [0.9, 1.6, 2.4, 3.3];
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const muySuave = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * k * (k * (k * 6 - 15) + 10); };
const DOS_PI = 2 * Math.PI, grad = Math.PI / 180;

const cabecera = `attribute float aImagen, aTam; varying vec3 vC; varying float vA;
  uniform float uUnidad, uR;
  ${GLSL_LENTE}
  ${GLSL_TAMANO}`;

// ── Textura del plasma, horneada en la carga (por tramos): R = hebras finas a lo largo del anillo (ruido de valor con el
// ángulo periódico, deformado por remolinos), G = turbulencia grande (zonas más y menos densas). ──
function* hornearPlasma() {
  const al = azar(2022), H = new Float32Array(64 * 64);
  for (let i = 0; i < H.length; i++) H[i] = al();
  // Ruido de valor periódico (periodo P en x, que es el ángulo; 64 en y).
  const ruido = (x, y, P) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const x0 = ((ix % P) + P) % P, x1 = (x0 + 1) % P, y0 = ((iy % 64) + 64) % 64, y1 = (y0 + 1) % 64, h = (a, b) => H[(b * 64 + (a % 64)) % H.length];
    return (h(x0, y0) * (1 - sx) + h(x1, y0) * sx) * (1 - sy) + (h(x0, y1) * (1 - sx) + h(x1, y1) * sx) * sy;
  };
  const datos = new Uint8Array(TEX_ANCHO * TEX_ALTO * 2);
  for (let j = 0; j < TEX_ALTO; j++) {
    if ((j & 15) === 15) yield;
    const r = j / (TEX_ALTO - 1);
    for (let i = 0; i < TEX_ANCHO; i++) {
      const a = i / TEX_ANCHO;
      // Remolinos: el radio de cada hebra ondula con el ángulo (dos escalas).
      const remolino = ruido(a * 6, r * 2.2 + 11, 6) * 1.3 + ruido(a * 17 + 3, r * 5 + 4, 17) * 0.45;
      const u = r * 46 + remolino * 3.6, v = a * 12;
      const n = 0.55 * ruido(v, u, 12) + 0.3 * ruido(v * 2 + 7, u * 2.3, 24) + 0.15 * ruido(v * 4 + 2, u * 5.1, 48);
      const hebra = Math.min(1, Math.max(0, (n - 0.42) / 0.3)), sh = hebra * hebra * (3 - 2 * hebra);
      const grande = ruido(a * 5, r * 2.5 + 30, 5) * 0.65 + ruido(a * 11 + 9, r * 4 + 40, 11) * 0.35;
      const k = (j * TEX_ANCHO + i) * 2; datos[k] = Math.round(sh * 255); datos[k + 1] = Math.round(grande * 255);
    }
  }
  const tex = new THREE.DataTexture(datos, TEX_ANCHO, TEX_ALTO, THREE.RGFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// grupo: el del agujero en el cosmos (su posición y su escala); aquí se le añaden las piezas.
export function* construirSagitario({ uScale, uPR, RS, grupo }) {
  const al = azar(2026);
  const comunes = { uScale, uPR, uMaximo: { value: 3 }, uSombra: { value: RS }, uR: { value: RS }, uUnidad: { value: RS } };

  const sombra = new THREE.Mesh(new THREE.SphereGeometry(RS, 128, 96), materialSombra({ depthTest: true, depthWrite: true }));
  const anillo = crearAnilloFotones(RS, ['#fff1dc', '#ffb070']);
  grupo.add(sombra, anillo);
  // Todo lo que tiene orientación cuelga de «cielo», el marco del videoclip (el del director de cámara): z hacia casa en
  // horizontal, y el eje Y del universo. Se orienta en el primer cuadro (hace falta la posición del grupo en el mundo).
  const cielo = new THREE.Group(); grupo.add(cielo);
  // Plano del flujo (su eje es el de giro: decide el lado brillante del anillo y el plano por el que caen los grumos).
  const planoFlujo = new THREE.Group(); planoFlujo.rotation.set(1.05, 0.4, 0.2); cielo.add(planoFlujo);

  yield;
  const texPlasma = yield* hornearPlasma();
  // ── Anillo de plasma (la imagen del EHT) ──
  const plasma = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { uTex: { value: texPlasma }, uGiro: { value: 0 }, uLuz: { value: 1 }, uDest: { value: 0 }, uManchaF: { value: 0 }, uManchaAng: { value: 0 },
      uSiEdad: { value: new THREE.Vector4(-1, -1, -1, -1) }, uSiAng: { value: new THREE.Vector4() }, uSiF: { value: new THREE.Vector4() }, uCompleto: { value: 1 },
      uDopAng: { value: 0 }, uDopF: { value: 0.4 } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy * ${R_CUADRO.toFixed(2)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uTex; uniform float uGiro, uLuz, uDest, uManchaF, uManchaAng, uCompleto, uDopAng, uDopF;
      uniform vec4 uSiEdad, uSiAng, uSiF; varying vec2 vP;
      const float PI2 = 6.2831853;
      float dAng(float a, float b){ return abs(mod(a - b + 3.14159265, PI2) - 3.14159265); }
      float muySuave(float x){ x = clamp(x, 0.0, 1.0); return x * x * x * (x * (x * 6.0 - 15.0) + 10.0); }
      // Hebras giradas: dos fases que se relevan (cada una gira con la velocidad de su radio; a los 10 s vuelve a empezar).
      vec2 plasma(float b, float a){
        float w = 0.95 * pow(b / 1.12, -1.5), T = 10.0, f1 = fract(uGiro / T), f2 = fract(uGiro / T + 0.5), k1 = 1.0 - abs(2.0 * f1 - 1.0);
        float v = (b - 1.0) / ${(R_CUADRO - 1).toFixed(2)};
        vec2 s1 = texture2D(uTex, vec2((a - w * f1 * T) / PI2, v)).rg, s2 = texture2D(uTex, vec2((a - w * f2 * T) / PI2 + 0.37, v)).rg;
        return s1 * k1 + s2 * (1.0 - k1);
      }
      void main(){
        float b = length(vP);
        if (b < 0.99 || b > ${(R_CUADRO - 0.02).toFixed(2)}) { gl_FragColor = vec4(0.0); return; }
        float a = atan(vP.y, vP.x);
        // Perfil: el borde interior nítido (la sombra), el máximo justo fuera y una caída hacia fuera.
        float px = fwidth(b);
        float perfil = smoothstep(1.0, 1.0 + max(0.03, 1.5 * px), b) * exp(-max(b - 1.1, 0.0) / 0.2) * (1.0 - smoothstep(1.7, 2.1, b));
        vec2 s = plasma(b, a);
        // Las tres zonas brillantes de la imagen del EHT (se desplazan muy despacio con el flujo) y el Doppler.
        float z = 0.0;
        for (int k = 0; k < 3; k++) { float d = dAng(a, float(k) * 2.094 + 0.6 + uGiro * 0.18); z += exp(-d * d / 0.2); }
        float dop = 1.0 + uDopF * cos(a - uDopAng);
        // Lo encendido: cada «sí» enciende el anillo a partir del punto donde cae su grumo; el resto queda en rescoldo.
        float enc = 0.0;
        for (int i = 0; i < 4; i++) {
          float e = uSiEdad[i]; if (e < 0.0) continue;
          float abarca = uSiF[i] * muySuave(e / 2.6), d = dAng(a, uSiAng[i]);
          enc = max(enc, 1.0 - smoothstep(abarca - 0.35, abarca + 0.05, d));
        }
        enc = max(enc, uCompleto);
        float I = perfil * (0.12 + 1.25 * s.r) * (0.45 + 0.4 * s.g + 0.85 * z) * dop * mix(0.16, 1.0, enc) * uLuz;
        // La llamarada: la mancha caliente que da la vuelta pegada a la sombra, y un fogonazo de todo el anillo.
        float dm = dAng(a, uManchaAng), rm = (b - 1.12) / 0.09;
        I += uManchaF * exp(-dm * dm / 0.05 - rm * rm) * 2.2 + uDest * perfil * (0.35 + 0.65 * s.r) * 0.9;
        // Color del plasma por su intensidad: rojo oscuro → naranja → oro → blanco cálido (como la imagen del EHT).
        vec3 c = mix(vec3(0.45, 0.07, 0.02), vec3(1.0, 0.4, 0.07), smoothstep(0.0, 0.45, I));
        c = mix(c, vec3(1.0, 0.74, 0.32), smoothstep(0.45, 1.05, I));
        c = mix(c, vec3(1.0, 0.94, 0.8), smoothstep(1.05, 1.9, I));
        gl_FragColor = vec4(c * min(I, 2.2) * 0.85, 1.0);
      }`,
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  }));
  plasma.frustumCulled = false; grupo.add(plasma);

  yield;
  // ── Los grumos que caen: cuatro nubecillas de gas que bajan en espiral por el plano del flujo hasta el anillo, una por
  // cada «sí». La marea las estira en un hilo al acercarse y se calientan (rosa → blanco); la cabeza llega un poco antes del
  // «sí» y la cola un poco después. Solo existen durante la escena. ──
  let grumos;
  {
    const n = N_GRUMO * 4, g = new Float32Array(n * 4), tam = new Float32Array(n);
    for (let j = 0; j < n; j++) {
      const i = Math.floor(j / N_GRUMO), r = Math.sqrt(al()), a = al() * DOS_PI;
      g.set([i, Math.pow(al(), 0.8) * 2 - 1, Math.cos(a) * r, Math.sin(a) * r], j * 4); tam[j] = 0.035 + al() * 0.025;
    }
    grumos = new THREE.Points(geometriaMotas({ aG: [g, 4], aTam: [tam, 1], position: [new Float32Array(n * 3), 3] }, RS * 9), materialMotas({
      ...comunes, uTs: { value: 0 }, uGrumos: { value: 0 }, uIni: { value: new THREE.Vector4(-9, -9, -9, -9) }, uFin: { value: new THREE.Vector4(-8, -8, -8, -8) }
    }, /* glsl */`
      attribute vec4 aG; uniform float uTs, uGrumos; uniform vec4 uIni, uFin;
      ${cabecera}
      void main(){
        int i = int(aG.x + 0.5); float ini = uIni[i], fin = uFin[i], T = max(fin - ini, 1.0);
        float p = clamp((uTs - ini) / T, 0.0, 1.0);
        float tau = fin - uTs + aG.y * (0.12 + 1.3 * p * p);
        if (uGrumos <= 0.001 || tau <= 0.0 || uTs < ini) { ${GLSL_OCULTA} }
        float q = clamp(tau / T, 0.0, 1.2), R0 = 7.6 - float(i) * 0.5;
        float r = 1.15 + (R0 - 1.15) * pow(q, 0.667);                      // caída libre hasta el anillo: r ∝ τ^⅔
        float th = float(i) * 1.9 + 0.8 + 2.6 * log(R0 / r);
        float ancho = 0.26 * (1.0 - 0.85 * p) * (0.35 + 0.65 * (r - 1.15) / (R0 - 1.15));
        vec3 pl = vec3(cos(th) * r, 0.9 * (r - 1.15) / (R0 - 1.15) * (i == 1 || i == 3 ? -1.0 : 1.0), sin(th) * r) + vec3(aG.z, aG.w * 0.5, aG.w) * ancho;
        float calor = 1.0 - smoothstep(1.4, 4.5, r);
        vec3 c = mix(vec3(1.0, 0.5, 0.42), vec3(1.0, 0.93, 0.8), calor);
        float brillo = smoothstep(0.0, 1.6, uTs - ini) * (0.9 + 1.8 * calor) * uGrumos * (1.0 - 0.3 * abs(aG.y));
        vec4 im = imagenLente((modelViewMatrix * vec4(pl * uR, 1.0)).xyz, aImagen);
        if (im.w <= 0.001) { ${GLSL_OCULTA} }
        gl_Position = projectionMatrix * vec4(im.xyz, 1.0);
        float luz; gl_PointSize = tamanoMota(aTam * uUnidad, -im.z, luz);
        vC = c; vA = brillo * luz * im.w;
      }`));
    planoFlujo.add(grumos);
  }

  yield;
  // ── Estrellas S y sus órbitas: trazos finos y continuos (la parte reciente más viva). Base de cada órbita en el cielo
  // (Thiele–Innes): norte = +Y, este = −X, hacia la Tierra = +Z. ──
  const estrellas = ESTRELLAS_S.map(({ a, e, i, nodo, peri, anos }) => {
    const O = nodo * grad, w = peri * grad, I = i * grad, base = (wa) => {
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
    // S2 rosada (la protagonista); las demás, blancas azuladas (estrellas jóvenes y calientes).
    const color = i => i === 0 ? [1.0, 0.72, 0.84] : [0.8, 0.87, 1.0];
    let j = 0;
    for (let i = 0; i < N_EST; i++) for (let k = 0; k < cuantas[i]; k++, j++) {
      est.set([i, k / cuantas[i]], j * 2); col.set(color(i), j * 3);
      tam[j] = k === 0 ? (i === 0 ? 0.16 : 0.11) : 0.03;
    }
    trazas = new THREE.Points(geometriaMotas({ aEst: [est, 2], aTam: [tam, 1], aColor: [col, 3], position: [new Float32Array(n * 3), 3] }, RS * 10), materialMotas({
      ...comunes,
      uP: { value: estrellas.map(s => s.P.clone()) }, uQ: { value: estrellas.map(s => s.Q.clone()) },
      uEl: { value: estrellas.map(s => new THREE.Vector3(s.a, s.e, 0)) },   // semieje (″), excentricidad, anomalía excéntrica ahora
      uTraza: { value: 1 }, uFoco: { value: 0 }, uVueltasS2: { value: 0 }
    }, /* glsl */`
      attribute vec2 aEst; attribute vec3 aColor;
      uniform vec3 uP[${N_EST}], uQ[${N_EST}], uEl[${N_EST}]; uniform float uTraza, uFoco, uVueltasS2;
      ${cabecera}
      void main(){
        int i = int(aEst.x + 0.5); float k = aEst.y;
        vec3 el = uEl[i];
        float E = el.z - k * 6.2831853, ex = el.y;
        vec3 P = uP[i], Q = uQ[i];
        if (i == 0) {
          // S2: su órbita gira en cada pericentro (la roseta): cada mota, con las vueltas que llevaba cuando pasó por ella.
          float x = (E - ex * sin(E)) / 6.2831853, f = fract(x + 0.5);
          float vueltas = mod(uVueltasS2 + floor(x + 0.5) + smoothstep(0.47, 0.53, f), 20.0), w = vueltas * ${PRECESION.toFixed(5)};
          vec3 P2 = P * cos(w) + Q * sin(w); Q = Q * cos(w) - P * sin(w); P = P2;
        }
        float rReal = el.x * (1.0 - ex * cos(E));
        vec3 dir = (P * (cos(E) - ex) + Q * (sqrt(1.0 - ex * ex) * sin(E))) * (el.x / rReal);
        float R = ${K_COMP.toFixed(2)} * pow(rReal, ${EXP_COMP.toFixed(2)});
        vec3 pl = dir * R;
        float cabeza = step(k, 0.0001);
        float largo = max(uTraza, 0.05), estela = mix(0.1, 1.0, pow(1.0 - min(k / largo, 1.0), 1.6)) * (1.0 - smoothstep(largo - 0.06, largo, k));
        float foco = i == 0 ? 1.3 + 0.5 * uFoco : 0.75 - 0.4 * uFoco;
        float brillo = mix(estela * 0.55, i == 0 ? 2.4 : 1.4, cabeza) * foco;
        float roce = i == 0 ? 1.0 - smoothstep(1.8, 3.2, R) : 0.0;
        vec3 c = mix(mix(aColor, vec3(1.0), cabeza * 0.6), vec3(1.0, 0.5, 0.58), roce * cabeza);
        vec4 im = imagenLente((modelViewMatrix * vec4(pl * uR, 1.0)).xyz, aImagen);
        if (im.w <= 0.001) { ${GLSL_OCULTA} }
        gl_Position = projectionMatrix * vec4(im.xyz, 1.0);
        float luz; gl_PointSize = tamanoMota(aTam * uUnidad, -im.z, luz);
        if (i == 0 && cabeza > 0.5) gl_PointSize = min(gl_PointSize * 1.35, 4.0 * uPR);
        vC = c; vA = brillo * luz * im.w * (1.0 + roce * cabeza * 0.5);
      }`));
    cielo.add(trazas);
  }

  for (const [o, orden] of [[sombra, 1], [plasma, 2], [grumos, 3], [trazas, 3], [anillo, 4]]) o.renderOrder = orden;

  // ── Por cuadro (sin memoria nueva) ──
  const g = reposoSagitario(), u = trazas.material.uniforms, up = plasma.material.uniforms, ug = grumos.material.uniforms, conLente = [trazas, grumos];
  const tmp = new THREE.Vector3(), centro = new THREE.Vector3(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const camDer = new THREE.Vector3(), camArr = new THREE.Vector3(), eje = new THREE.Vector3();
  const marcas = marcasSagitario(), spa = segundosPorAno(marcas), ritmo = estrellas.map(s => DOS_PI / (s.anos * spa));
  // Dónde llega cada grumo al anillo (en el plano del flujo): su ángulo final.
  const llegada = [0, 1, 2, 3].map(i => { const R0 = 7.6 - i * 0.5, th = i * 1.9 + 0.8 + 2.6 * Math.log(R0 / 1.15); return new THREE.Vector3(Math.cos(th) * 1.15 * RS, 0, Math.sin(th) * 1.15 * RS); });
  let giro = 0, escenaVista = null, baseS2 = 0, atenuando = false, orientado = false;
  const ejeX = new THREE.Vector3(), ejeY = new THREE.Vector3(0, 1, 0), ejeZ = new THREE.Vector3(), base = new THREE.Matrix4();
  const kepler = (M, e) => { let E = M; for (let n = 0; n < 6; n++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; };
  return {
    sombra, anillo, plasma, trazas, grumos, RS,
    atenuacionLente: 1,   // (cosmos.lentes: la lente de pantalla con toda su fuerza)
    actualizar(t, dt, camera, escena) {
      const w = escena ? escena.presencia : 0, s = escena ? escena.guion : g, viva = !!escena?.viva;
      grupo.updateMatrixWorld();
      if (!orientado) {
        orientado = true;
        grupo.getWorldPosition(ejeZ).negate().projectOnPlane(ejeY).normalize();
        ejeX.crossVectors(ejeY, ejeZ).normalize();
        cielo.quaternion.setFromRotationMatrix(base.makeBasis(ejeX, ejeY, ejeZ)).premultiply(grupo.getWorldQuaternion(qa).invert());
        cielo.updateMatrixWorld(true);
      }
      const unidad = RS * grupo.matrixWorld.getMaxScaleOnAxis(); comunes.uUnidad.value = unidad; comunes.uSombra.value = unidad;
      const d = camera.position.distanceTo(grupo.getWorldPosition(centro)), px = unidad / Math.max(1, d) * 900;
      for (const m of conLente) m.geometry.instanceCount = px > 5 ? 3 : 1;
      giro += dt;
      // El anillo de plasma: el cuadrado, frente a la cámara y centrado en el agujero (en el grupo).
      plasma.quaternion.copy(grupo.getWorldQuaternion(qa)).invert().multiply(camera.quaternion);
      plasma.scale.setScalar(RS * R_CUADRO);
      camDer.set(1, 0, 0).applyQuaternion(camera.quaternion); camArr.set(0, 1, 0).applyQuaternion(camera.quaternion);
      // Lado brillante (Doppler): el del gas que viene hacia nosotros, perpendicular al eje de giro proyectado.
      planoFlujo.updateMatrixWorld(); eje.set(0, 1, 0).transformDirection(planoFlujo.matrixWorld);
      const ex = eje.dot(camDer), ey = eje.dot(camArr), ep = Math.hypot(ex, ey);
      up.uDopAng.value = Math.atan2(ey, ex) - Math.PI / 2; up.uDopF.value = 0.1 + 0.3 * Math.min(1, ep);
      // Órbitas: todas a su ritmo real. S2, en la escena, sigue el reloj de la canción (pericentro en el primer «sí»); al
      // empezar se pone al día por delante en los primeros 14 s (sin saltos ni marcha atrás).
      for (let i = 1; i < N_EST; i++) estrellas[i].M += dt * ritmo[i];
      const s2 = estrellas[0];
      if (escena && viva) {
        if (escenaVista !== escena) {
          escenaVista = escena;
          const adelanto = ((s2.M - s.s2) % DOS_PI + DOS_PI) % DOS_PI;
          baseS2 = s2.M - s.s2 - adelanto;
        }
        const objetivo = baseS2 + s.s2, desfase = ((objetivo - s2.M) % DOS_PI + DOS_PI) % DOS_PI;
        const k = muySuave(s.t, 0, 14);
        s2.M = k >= 1 ? objetivo : s2.M + Math.min(desfase, Math.max(dt * ritmo[0], desfase * Math.min(1, dt * (0.4 + 3 * k))));
      } else { s2.M += dt * ritmo[0]; if (!escena) escenaVista = null; }
      for (let i = 0; i < N_EST; i++) { const e = estrellas[i], Mw = ((e.M % DOS_PI) + DOS_PI) % DOS_PI; u.uEl.value[i].z = kepler(Mw, e.e); }
      u.uVueltasS2.value = Math.floor(s2.M / DOS_PI) % 20;
      u.uTraza.value = 1 + (s.revela - 1) * w; u.uFoco.value = s.foco * w;
      // El plasma: brillo (hambriento → la imagen del EHT), lo encendido por cada «sí» y la llamarada.
      up.uGiro.value = giro;
      up.uLuz.value = 1 + (s.alimento - 1) * w; up.uDest.value = s.destello * w; up.uManchaF.value = s.mancha * w;
      up.uCompleto.value = 1 - w * (1 - (s.calma ?? 0));
      for (let i = 0; i < 4; i++) {
        // Ángulo (en la pantalla, alrededor del agujero) del punto del anillo donde cae el grumo i.
        tmp.copy(llegada[i]).applyMatrix4(planoFlujo.matrixWorld).sub(centro);
        const ang = Math.atan2(tmp.dot(camArr), tmp.dot(camDer));
        up.uSiAng.value.setComponent(i, ang); up.uSiEdad.value.setComponent(i, s.ecos[i]); up.uSiF.value.setComponent(i, ABARCA[i]);
        if (i === 0) up.uManchaAng.value = ang + s.manchaAng;
      }
      // Los grumos.
      ug.uTs.value = s.t; ug.uGrumos.value = w; ug.uIni.value.fromArray(s.grumosIni); ug.uFin.value.fromArray(s.grumosFin);
      // Las nebulosas y las paredes de polvo del fondo se apagan mientras dura el clip (el protagonista es el agujero).
      if (escena) { atenuando = true; atenuarFondo(centro.x, centro.y, centro.z, unidad * 60, w * 0.88); }
      else if (atenuando) { atenuando = false; atenuarFondo(0, 0, 0, 0, 0); }
      // Anillo de fotones: su lado brillante, el mismo del plasma; respira en cada «say» y se enciende en cada «sí».
      anillo.lookAt(camera.position);
      tmp.copy(camDer).multiplyScalar(Math.cos(up.uDopAng.value)).addScaledVector(camArr, Math.sin(up.uDopAng.value)).applyQuaternion(anillo.getWorldQuaternion(qb).invert());
      anillo.material.uniforms.uLado.value.set(tmp.x, tmp.y).normalize();
      anillo.material.uniforms.uLuz.value = 1.1 * (0.35 + 0.65 * up.uLuz.value) + (s.inspira + s.destello * 0.9) * w;
    }
  };
}
