// Sagitario A*: el corazón de la Vía Láctea. Un agujero negro discreto (sombra, anillo de fotones y un flujo de gas caliente
// que la lente curva en anillo, con su media luna brillante), las estrellas S que lo rodean en elipses rápidas (como S2,
// que pasa junto a él cada 16 años) dejando trazas de motas, y el gas del centro galáctico: la minispiral de gas ionizado
// y el anillo de polvo que la rodea. Todo con motas nítidas (sin halos ni degradados).
// Su escena (js/util/guionAgujeros.js, guionSagitario), con «Say Yes to Heaven»: las órbitas, al principio en todas las
// direcciones, se van ordenando en un mismo plano de cara; en el estribillo cada una se convierte en un corazón alrededor
// del centro, y en la segunda frase las dos estrellas más brillantes orbitan juntas sobre el corazón mayor. Las órbitas
// se calculan en la GPU (ecuación de Kepler); por cuadro solo cambian unos uniformes (14 estrellas).
import * as THREE from 'three';
import { GLSL_LENTE, GLSL_TAMANO, GLSL_OCULTA, geometriaMotas, materialMotas, crearAnilloFotones } from './curvaLuz.js';
import { materialSombra } from './materiales.js';
import { guionReposo } from '../util/guionAgujeros.js';

const N_ESTRELLAS = 14, N_TRAZA = 1000, N_FLUJO = 6000, N_ESPIRAL = 16000, N_POLVO = 8000;
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const n0 = 2 * Math.PI / 5 * Math.pow(3, 1.5);   // movimiento medio: una vuelta cada 5 s con semieje 3 (Kepler: n ∝ a^-1,5)

const cabecera = `attribute float aImagen, aTam; varying vec3 vC; varying float vA;
  uniform float uUnidad, uR;
  ${GLSL_LENTE}
  ${GLSL_TAMANO}`;

// grupo: el del agujero en el cosmos (su posición y su escala); aquí se le añaden las piezas.
export function* construirSagitario({ uScale, uPR, RS, grupo }) {
  const al = azar(2026);
  const comunes = { uScale, uPR, uMaximo: { value: 6 }, uSombra: { value: RS }, uR: { value: RS }, uUnidad: { value: RS }, uGiro: { value: 0 }, uLatido: { value: 0 } };

  const sombra = new THREE.Mesh(new THREE.SphereGeometry(RS, 128, 96), materialSombra({ depthTest: true, depthWrite: true }));
  const anillo = crearAnilloFotones(RS, ['#fff1dc', '#ff9a4a']);
  grupo.add(sombra, anillo);

  yield;
  // ── Flujo de acreción: gas caliente y tenue, grueso, muy cerca de la sombra. Gira deprisa y el Doppler concentra su luz
  // en una media luna; la lente dobla su parte de detrás en un anillo (como en la imagen del Telescopio del Horizonte). ──
  const planoFlujo = new THREE.Group(); planoFlujo.rotation.set(1.05, 0.4, 0.2); grupo.add(planoFlujo);
  let flujo;
  {
    const d = new Float32Array(N_FLUJO * 3), tam = new Float32Array(N_FLUJO);
    for (let i = 0; i < N_FLUJO; i++) { const r = 1.18 + Math.pow(al(), 1.4) * 1.7; d.set([r, al() * Math.PI * 2, (al() - 0.5) * 0.45], i * 3); tam[i] = 0.025 + al() * 0.025; }
    flujo = new THREE.Points(geometriaMotas({ aFlujo: [d, 3], aTam: [tam, 1], position: [new Float32Array(N_FLUJO * 3), 3] }, RS * 3.5), materialMotas({ ...comunes, uCamLocal: { value: new THREE.Vector3(0, 0, 1e6) } }, /* glsl */`
      attribute vec3 aFlujo; uniform float uGiro, uLatido; uniform vec3 uCamLocal;
      ${cabecera}
      void main(){
        float r = aFlujo.x, th = aFlujo.y + uGiro * 2.1 * pow(r / 1.18, -1.5);
        vec3 pl = vec3(cos(th) * r, aFlujo.z * r, sin(th) * r);
        vec3 vel = vec3(-sin(th), 0.0, cos(th)), haciaCam = normalize(uCamLocal - pl * uR);
        float b = 0.55 * sqrt(1.18 / r), g = sqrt(1.0 - b * b) / (1.0 - b * dot(vel, haciaCam)), dop = g * g * g;
        vec3 c = mix(vec3(1.0, 0.86, 0.62), vec3(1.0, 0.45, 0.18), smoothstep(1.2, 2.8, r));
        c = mix(c, vec3(1.0, 0.95, 0.88), clamp(g - 1.0, 0.0, 1.0) * 0.5);
        float brillo = clamp(dop, 0.2, 2.0) * pow(1.18 / r, 1.0) * (1.0 + uLatido * 0.8) * 0.9;
        vec4 im = imagenLente((modelViewMatrix * vec4(pl * uR, 1.0)).xyz, aImagen);
        if (im.w <= 0.001) { ${GLSL_OCULTA} }
        gl_Position = projectionMatrix * vec4(im.xyz, 1.0);
        float luz; gl_PointSize = tamanoMota(aTam * uUnidad, -im.z, luz);
        vC = c; vA = brillo * luz * im.w;
      }`));
    planoFlujo.add(flujo);
  }

  yield;
  // ── Gas del centro galáctico: la minispiral (tres brazos de gas ionizado, rosa) y el anillo circumnuclear de polvo
  // (grumos anaranjados, inclinado). Motas pequeñas y tenues: acompañan sin tapar al agujero. ──
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
    gas = new THREE.Points(geo, materialMotas({ ...comunes, uT: { value: 0 } }, /* glsl */`
      attribute vec3 aColor; attribute float aTam, aFase; uniform float uUnidad, uT, uR; varying vec3 vC; varying float vA;
      ${GLSL_TAMANO}
      void main(){
        float a = uT * 0.012 * (1.0 + aFase * 0.3), ca = cos(a), sa = sin(a);   // gira muy despacio
        vec3 p = vec3(position.x * ca - position.z * sa, position.y, position.x * sa + position.z * ca);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float luz; gl_PointSize = tamanoMota(aTam * uUnidad, -mv.z, luz);
        // Cerca de la cámara (el anillo de polvo puede rodearla) se apaga: nada grande ni borroso delante.
        float cerca = smoothstep(1.5, 4.0, -mv.z / uUnidad);
        vC = aColor; vA = luz * 0.3 * cerca * (0.75 + 0.25 * sin(uT * (0.6 + aFase) + aFase * 30.0));
      }`));
    grupo.add(gas);
  }

  yield;
  // ── Estrellas S y sus trazas: cada estrella deja detrás una estela de motas por donde acaba de pasar. Elementos de cada
  // órbita (semieje, excentricidad, orientación) con el pericentro siempre por fuera de la sombra. ──
  const estrellas = [];
  for (let i = 0; i < N_ESTRELLAS; i++) {
    const a = 3 + al() * 4, e = Math.min(0.88, 0.35 + al() * 0.55, 1 - 1.7 / a);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(al() * Math.PI * 2, al() * Math.PI * 2, al() * Math.PI * 2));
    // En el estribillo cada una recorre un corazón (de 4 a 5,5 radios de sombra) girado un poco alrededor del eje vertical:
    // juntos forman un solo corazón con volumen, una jaula de luz alrededor del centro.
    estrellas.push({ a, e, q, fase: al() * Math.PI * 2, corazon: 4 + (i % 5) / 4 * 1.5, giro: i * 2.399963, vuelta: ((i * 0.618034) % 1 - 0.5) * 1.1 });
  }
  // Las dos primeras (las más brillantes: una rosada, como la protagonista, y otra blanca azulada) forman la pareja.
  const colores = [[1.0, 0.78, 0.86], [0.8, 0.88, 1.0]];
  // El resto, en tres tonos que se alternan por el corazón: rosa, oro y blanco azulado (las estrellas S son azules y
  // calientes; sus estelas toman el color del amanecer).
  for (let i = 2; i < N_ESTRELLAS; i++) colores.push([[1.0, 0.6, 0.76], [1.0, 0.82, 0.58], [0.8, 0.87, 1.0]][i % 3]);
  let trazas;
  {
    const n = N_ESTRELLAS * N_TRAZA, est = new Float32Array(n * 2), tam = new Float32Array(n), col = new Float32Array(n * 3);
    for (let i = 0; i < N_ESTRELLAS; i++) for (let k = 0; k < N_TRAZA; k++) {
      const j = i * N_TRAZA + k; est.set([i, k / N_TRAZA], j * 2); col.set(colores[i], j * 3);
      tam[j] = k === 0 ? (i < 2 ? 0.12 : 0.085) : 0.04;
    }
    const v3 = () => Array.from({ length: N_ESTRELLAS }, () => new THREE.Vector3());
    trazas = new THREE.Points(geometriaMotas({ aEst: [est, 2], aTam: [tam, 1], aColor: [col, 3], position: [new Float32Array(n * 3), 3] }, RS * 13), materialMotas({
      ...comunes, uP: { value: v3() }, uQ: { value: v3() }, uEl: { value: Array.from({ length: N_ESTRELLAS }, () => new THREE.Vector4()) }, uFase: { value: new Array(N_ESTRELLAS).fill(0) },
      uXh: { value: new THREE.Vector3(1, 0, 0) }, uYh: { value: new THREE.Vector3(0, 1, 0) }, uZh: { value: new THREE.Vector3(0, 0, 1) },
      uCorazon: { value: 0 }, uTraza: { value: 0.32 }, uPareja: { value: 0 }, uPsi: { value: 0 }, uChispa: { value: -99 }, uChispaF: { value: 0 }, uCalma: { value: 0 }
    }, /* glsl */`
      attribute vec2 aEst; attribute vec3 aColor;
      uniform vec3 uP[${N_ESTRELLAS}], uQ[${N_ESTRELLAS}], uXh, uYh, uZh; uniform vec4 uEl[${N_ESTRELLAS}]; uniform float uFase[${N_ESTRELLAS}];
      uniform float uCorazon, uTraza, uPareja, uPsi, uChispa, uChispaF, uCalma, uLatido;
      ${cabecera}
      void main(){
        int i = int(aEst.x + 0.5); float k = aEst.y;
        vec4 el = uEl[i];                                   // semieje, excentricidad, tamaño del corazón, su giro
        float M = uFase[i] - k * uTraza * 6.2831853;
        // Kepler: anomalía media → excéntrica (Newton).
        float E = M; for (int n = 0; n < 5; n++) E -= (E - el.y * sin(E) - M) / (1.0 - el.y * cos(E));
        vec3 elipse = uP[i] * (el.x * (cos(E) - el.y)) + uQ[i] * (el.x * sqrt(1.0 - el.y * el.y) * sin(E));
        // Corazón clásico (16 sen³ t, 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t), con el agujero en su centro.
        float s = sin(M);
        vec2 h = vec2(16.0 * s * s * s, 13.0 * cos(M) - 5.0 * cos(2.0 * M) - 2.0 * cos(3.0 * M) - cos(4.0 * M) + 3.0) / 17.0;
        vec3 corazon = ((uXh * cos(el.w) + uZh * sin(el.w)) * h.x + uYh * h.y) * el.z;   // w: giro alrededor del eje vertical
        vec3 pl = mix(elipse, corazon, uCorazon);
        // La pareja: las dos estrellas giran una alrededor de la otra mientras recorren juntas el corazón mayor.
        if (i < 2) { float psi = uPsi - k * uTraza * 18.85, lado = i == 0 ? 1.0 : -1.0; pl += (uXh * cos(psi) + uYh * sin(psi) + uZh * 0.3 * sin(psi * 0.5)) * lado * 0.2 * uPareja; }
        float cabeza = step(k, 0.0001);
        float estela = pow(1.0 - k, mix(1.4, 0.3, uCorazon)) * mix(0.8, 1.6, uCorazon) * (1.0 - 0.2 * uCalma);
        float chispa = uChispaF * 2.2 * exp(-pow((k - uChispa * 0.42) / 0.035, 2.0)) * step(uChispa * 0.42, 1.15);
        float brillo = mix(estela * (1.0 + chispa + uLatido), (i < 2 ? 2.2 : 1.5) * (1.0 + uLatido * 0.5), cabeza);
        vec4 im = imagenLente((modelViewMatrix * vec4(pl * uR, 1.0)).xyz, aImagen);
        if (im.w <= 0.001) { ${GLSL_OCULTA} }
        gl_Position = projectionMatrix * vec4(im.xyz, 1.0);
        float luz; gl_PointSize = tamanoMota(aTam * uUnidad, -im.z, luz);
        vC = mix(aColor, vec3(1.0), cabeza * 0.55); vA = brillo * luz * im.w * 0.75;
      }`));
    grupo.add(trazas);
  }

  for (const [o, orden] of [[gas, 0], [sombra, 1], [flujo, 2], [trazas, 3], [anillo, 4]]) o.renderOrder = orden;

  // ── Por cuadro (sin memoria nueva) ──
  const g = guionReposo('sagitario'), u = trazas.material.uniforms, X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  const qCorazon = new THREE.Quaternion(), qRot = new THREE.Quaternion(), qObj = new THREE.Quaternion(), qAhora = new THREE.Quaternion(), m4 = new THREE.Matrix4(), tmp = new THREE.Vector3(), centro = new THREE.Vector3(), qa = new THREE.Quaternion();
  const fases = estrellas.map(s => s.fase), Z = new THREE.Vector3(0, 0, 1);
  let giro = 0, psi = 0, corazonFijado = false;
  return {
    sombra, anillo, flujo, gas, trazas, RS,
    // Cuánto se atenúa la lente de pantalla (cosmos.lentes): con las órbitas ordenadas, los corazones no se deforman.
    atenuacionLente: 1,
    actualizar(t, dt, camera, escena) {
      const w = escena ? escena.presencia : 0, s = escena ? escena.guion : g;
      grupo.updateMatrixWorld();
      const unidad = RS * grupo.matrixWorld.getMaxScaleOnAxis(); comunes.uUnidad.value = unidad; comunes.uSombra.value = unidad;
      const d = camera.position.distanceTo(grupo.getWorldPosition(centro)), px = unidad / Math.max(1, d) * 900;
      for (const m of [flujo, trazas]) m.geometry.instanceCount = px > 5 ? 3 : 1;
      planoFlujo.updateMatrixWorld(); planoFlujo.worldToLocal(flujo.material.uniforms.uCamLocal.value.copy(camera.position));
      giro += dt; comunes.uGiro.value = giro; gas.material.uniforms.uT.value = t;
      // El plano de los corazones: de cara a la cámara al empezar la escena (se fija una vez por escena).
      if (escena && !corazonFijado) {
        corazonFijado = true;
        camera.updateMatrixWorld(); m4.extractRotation(camera.matrixWorld);
        qCorazon.setFromRotationMatrix(m4).premultiply(grupo.getWorldQuaternion(qa).invert());
        u.uXh.value.set(1, 0, 0).applyQuaternion(qCorazon); u.uYh.value.set(0, 1, 0).applyQuaternion(qCorazon); u.uZh.value.set(0, 0, 1).applyQuaternion(qCorazon);
      }
      if (!escena) corazonFijado = false;
      const orden = s.orden * w, cor = s.corazon * w, par = s.pareja * w, ritmo = 1 + (s.ritmo - 1) * w;
      for (let i = 0; i < N_ESTRELLAS; i++) {
        const e = estrellas[i];
        // Ordenarse: la órbita gira (sin atajos raros: interpolación de cuaterniones) hasta el plano del corazón, cada una
        // con su pericentro en otra dirección (una flor de elipses), y se va pareciendo al tamaño de su corazón.
        qObj.copy(qCorazon).multiply(qRot.setFromAxisAngle(Z, e.giro));
        qAhora.slerpQuaternions(e.q, qObj, orden);
        u.uP.value[i].copy(X).applyQuaternion(qAhora); u.uQ.value[i].copy(Y).applyQuaternion(qAhora);
        const a = e.a + (e.corazon * 0.95 - e.a) * orden, ex = e.e + (0.6 - e.e) * orden;
        fases[i] += dt * n0 * Math.pow(a, -1.5) * ritmo;
        u.uEl.value[i].set(a, ex, e.corazon, e.vuelta);
      }
      // La pareja: la segunda estrella alcanza a la primera (por el camino más corto) y comparten el corazón mayor.
      let dif = (fases[0] - fases[1]) % (2 * Math.PI); if (dif > Math.PI) dif -= 2 * Math.PI; if (dif < -Math.PI) dif += 2 * Math.PI;
      for (let i = 0; i < N_ESTRELLAS; i++) u.uFase.value[i] = fases[i];
      u.uFase.value[1] = fases[1] + dif * par;
      u.uEl.value[0].z = estrellas[0].corazon + (5.9 - estrellas[0].corazon) * par; u.uEl.value[1].z = estrellas[1].corazon + (5.9 - estrellas[1].corazon) * par;
      u.uEl.value[0].w = estrellas[0].vuelta * (1 - par); u.uEl.value[1].w = estrellas[1].vuelta * (1 - par);   // la pareja, en el corazón de frente
      psi += dt * 2.4; u.uPsi.value = psi; u.uPareja.value = par;
      u.uCorazon.value = cor; u.uTraza.value = 0.32 + (s.traza - 0.32) * w; u.uCalma.value = s.calma * w;
      u.uChispa.value = s.chispa; u.uChispaF.value = s.chispaFuerza * w; comunes.uLatido.value = s.latido * w;
      // Anillo de fotones: su lado brillante es el de la media luna del flujo.
      anillo.lookAt(camera.position);
      const c = flujo.material.uniforms.uCamLocal.value; tmp.set(c.z, 0, -c.x).normalize().applyQuaternion(planoFlujo.getWorldQuaternion(qa)).applyQuaternion(anillo.getWorldQuaternion(qRot).invert());
      anillo.material.uniforms.uLado.value.set(tmp.x, tmp.y).normalize();
      anillo.material.uniforms.uLuz.value = 0.9 + comunes.uLatido.value;
      this.atenuacionLente = 1 - Math.max(orden, cor);
    }
  };
}
