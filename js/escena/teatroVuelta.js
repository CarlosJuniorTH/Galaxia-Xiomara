// El escenario de los videoclips de la primera vuelta y su lugar. Los clips tienen su propia escena, tejida en luz (tejidoLuz.js) y
// gobernada por el guion (js/util/guionVuelta.js): pocos dibujos, repetible al cuadro, sin posproceso. Se construye antes de
// empezar y se libera al terminar. El lugar del año (crearLugarVuelta) usa la misma luz, dentro del universo.
import * as THREE from 'three';
import { guionVuelta, radioFrente, FASE_BRAZOS } from '../util/guionVuelta.js';
import { crearEstrella } from './estrellaSolida.js';
import { crearCieloClip } from './mundoClip.js';
import { crearPlasmaDosSoles, crearPlasmaVuelta, crearCorona, crearFuego, crearVelo, R_VUELTA } from './tejidoLuz.js';

const R_DOS_SOLES = 3.2, R_PAREJA = 1.0, R_SOLO = 1.15, GIRO_PAREJA = 0.9, DIST_PAREJA = 1.75;   // (de tamaño artístico: a escala no se verían)
const PROFUNDIDAD_TEXTO = 30;

// ── El teatro de los videoclips ──
const VERT_MARCAS = /* glsl */`
  uniform float uT, uFrente, uEspera, uOla, uOla2, uInicio, uPaso, uHay, uPx, uPR; uniform float uR; attribute float aI; varying float vB; varying vec3 vC;
  void main() {
    float angulo = aI / 12.0 * 6.2831853, edad = uFrente - angulo + 0.001, b = 0.0, t = 0.0;
    if (edad >= 0.0) { b = 1.0; t = 0.95 + 1.3 * exp(-edad * 9.0); }
    // La estrella del comienzo, que espera a que se cierre la vuelta.
    if (aI < 0.5 && uFrente < 6.28) { float late = 0.6 + 0.4 * sin(uT * 2.2); b = max(b, max(uEspera * late, 0.8)); t = max(t, 0.9 + uEspera * 0.5 * late); }
    // Cada una se enciende en su compás (mientras se dicen las frases del año).
    if (uHay > 0.5) { float tras = uT - uInicio - aI * uPaso; if (tras > 0.0) t += 1.5 * exp(-tras * 2.6); }
    if (uOla >= 0.0) t += 0.9 * (1.0 - smoothstep(0.0, 0.5, abs(mod(uOla - angulo + 3.14159, 6.2831853) - 3.14159)));
    if (uOla2 >= 0.0) t += 0.9 * (1.0 - smoothstep(0.0, 0.5, abs(mod(uOla2 - angulo + 3.14159, 6.2831853) - 3.14159)));
    vec4 v = modelViewMatrix * vec4(cos(angulo) * uR, 0.0, sin(angulo) * uR, 1.0); gl_Position = projectionMatrix * v;
    gl_PointSize = clamp(uPx * t * 2.1 / max(0.1, -v.z), 16.0 * uPR, 88.0 * uPR); vB = b; vC = aI < 0.5 ? vec3(1.0, 0.82, 0.5) : vec3(1.0, 0.95, 0.88);
    if (b <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; }
  }`;
const FRAG_MARCAS = /* glsl */`precision highp float; varying float vB; varying vec3 vC;
  void main() { vec2 p = gl_PointCoord * 2.0 - 1.0, q = abs(p); float r = length(p), rayo = max((1.0 - smoothstep(0.0, 0.05, q.y)) * (1.0 - q.x), (1.0 - smoothstep(0.0, 0.05, q.x)) * (1.0 - q.y)), a = max(1.0 - smoothstep(0.1, 0.16, r), rayo * rayo * rayo) * vB; if (a <= 0.004) discard; gl_FragColor = vec4(vC * a, a); }`;

export function crearTeatroVuelta(renderer, { cielo: cieloDe = () => null } = {}) {
  const escena = new THREE.Scene(), camara = new THREE.PerspectiveCamera(40, 1, 0.1, 900); escena.add(camara);
  let guion = null, cielo = null, plasma = null, estrellas = [], coronas = [], marcas = null, fuegos = [], velos = [], estallido = null;
  const tam = new THREE.Vector2(), mira = new THREE.Vector3(), p = new THREE.Vector3(), UM = { uT: { value: 0 }, uFrente: { value: 0 }, uEspera: { value: 0 }, uOla: { value: -1 }, uInicio: { value: 0 }, uPaso: { value: 1 }, uHay: { value: 0 }, uPx: { value: 1000 }, uPR: { value: 1 }, uR: { value: R_VUELTA }, uOla2: { value: -1 } };
  const ORO = { color: [1, 0.72, 0.3], borde: [1, 0.3, 0.05] }, ROSA = { color: [1, 0.46, 0.68], borde: [0.78, 0.1, 0.42] };
  const pareja = radio => [ORO, ROSA].map(c => {
    const e = crearEstrella({ radio, ...c }), k = crearCorona({ radio, color: c.color, hondo: c.borde }); escena.add(e.malla, k.malla); estrellas.push(e); coronas.push(k); return e;
  });

  async function preparar(meses) {
    liberar();
    guion = guionVuelta(meses); if (!guion) return false;
    const tex = cieloDe(); if (tex) { cielo = crearCieloClip(tex); escena.add(cielo.malla); }
    if (guion.binaria) {
      plasma = crearPlasmaDosSoles(); plasma.u.uR.value = R_DOS_SOLES; escena.add(plasma.malla); pareja(R_DOS_SOLES);
      velos = [crearVelo(4.2, 1.7), crearVelo(-4.2, 6.3)]; for (const v of velos) escena.add(v.malla);
      estallido = crearFuego(); camara.add(estallido.malla);
    }
    else {
      plasma = crearPlasmaVuelta(); plasma.u.uFase.value = FASE_BRAZOS; escena.add(plasma.malla); pareja(R_SOLO);
      estallido = crearFuego(); camara.add(estallido.malla);
      if (guion.corona) { velos = [crearVelo(1.6, 2.9), crearVelo(-1.6, 7.7)]; for (const v of velos) escena.add(v.malla); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(36), 3)); g.setAttribute('aI', new THREE.BufferAttribute(Float32Array.from({ length: 12 }, (_, i) => i), 1));
      marcas = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: UM, vertexShader: VERT_MARCAS, fragmentShader: FRAG_MARCAS, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, premultipliedAlpha: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
      marcas.frustumCulled = false; marcas.renderOrder = 40; escena.add(marcas);
      UM.uHay.value = guion.corona ? 1 : 0; if (guion.corona) { UM.uInicio.value = guion.corona.inicio; UM.uPaso.value = guion.corona.paso; }
      if (guion.chispas.length) for (let i = 0; i < 3; i++) { const f = crearFuego(); camara.add(f.malla); fuegos.push(f); }
    }
    fijar(0); renderer.compile(escena, camara);
    return true;
  }
  // Pone la escena en ese segundo de la canción (vida: lo que sigue vivo mientras espera a la canción en su primer cuadro).
  function fijar(s, vida = s) {
    if (!guion) return;
    renderer.getDrawingBufferSize(tam);
    const aspecto = tam.x / Math.max(1, tam.y);
    if (Math.abs(camara.aspect - aspecto) > 1e-3) { camara.aspect = aspecto; camara.updateProjectionMatrix(); }
    const c = guion.camara, az = c.az(s) * Math.PI / 180, el = c.el(s) * Math.PI / 180, vertical = aspecto < 1;
    // En horizontal, sus planos; en vertical, con su propia distancia, para que todo quepa a lo ancho.
    const d = vertical ? Math.max(c.dist(s), c.distV(s) * 0.46 / aspecto) : c.dist(s);
    // En «La primera vuelta», la cámara sigue a los dos soles y luego los suelta para mirar al centro.
    const lugarSoles = guion.soles?.(s) ?? null, suelta = c.abre(s);
    if (lugarSoles) mira.set(lugarSoles.centro[0] * (1 - suelta), 0, lugarSoles.centro[1] * (1 - suelta)); else mira.set(0, 0, 0);
    camara.position.set(mira.x + Math.cos(el) * Math.cos(az) * d, mira.y + Math.sin(el) * d, mira.z + Math.cos(el) * Math.sin(az) * d);
    camara.lookAt(mira); camara.updateMatrixWorld();
    cielo?.fijar(guion.cielo?.(s) ?? 0.4, vida * 0.006);
    const mediaAltura = Math.tan(camara.fov * Math.PI / 360);
    for (const e of estrellas) { e.u.uT.value = vida; e.u.uAlfa.value = 1; }
    for (const k of coronas) k.u.uT.value = vida;
    if (guion.binaria) {
      const sep = guion.sep(s), ang = guion.ang(s) * Math.PI / 180, x = Math.cos(ang) * sep * 0.5, z = Math.sin(ang) * sep * 0.5, flujo = guion.flujo(s);
      const pu = plasma.u; pu.uT.value = vida; pu.uSep.value = sep; pu.uAng.value = ang; pu.uRd.value = guion.disco(s); pu.uFlujo.value = flujo; pu.uInfinito.value = guion.infinito(s); pu.uOnda.value = guion.contacto(s); pu.uAlcance.value = guion.alcance(s); pu.uPulso.value = guion.pulso(s); pu.uEspiral.value = guion.espiral(s);
      estrellas[0].malla.position.set(x, 0, z); estrellas[1].malla.position.set(-x, 0, -z);
      estrellas[0].u.uDir.value.set(-Math.cos(ang), 0, -Math.sin(ang)); estrellas[1].u.uDir.value.set(Math.cos(ang), 0, Math.sin(ang));
      const inf = pu.uInfinito.value, radio = R_DOS_SOLES * (1 - 0.24 * inf);   // cada uno le da al otro parte de su luz: mengua, y el infinito respira
      pu.uR.value = radio;
      const late = pu.uPulso.value;
      estrellas.forEach((e, i) => { e.u.uMarea.value = flujo * 0.2; e.malla.scale.setScalar(radio); coronas[i].u.uEsc.value = radio * 2.5; coronas[i].u.uLuz.value = 1 + 0.5 * late; coronas[i].u.uArrebato.value = Math.max(late * 0.8, Math.min(1, Math.max(0, (s - 22) / 8)) * 0.7); });
      velos.forEach(v => { v.u.uT.value = vida; v.u.uSep.value = sep; v.u.uAng.value = ang; v.u.uLuz.value = 0.5 + 0.5 * Math.min(1, s / 12); });
    } else {
      const fr = guion.frente(s), abrir = guion.abrir(s), sol = lugarSoles;
      const pu = plasma.u; pu.uT.value = vida; pu.uFrente.value = fr; pu.uLlena.value = Math.min(1, fr / (Math.PI * 2)); pu.uAbrir.value = abrir; pu.uFrenteR.value = guion.corona ? radioFrente(s) : R_VUELTA; pu.uNucleo.value = guion.nucleo?.(s) ?? 0; pu.uEncuentro.value = guion.encuentro && s >= guion.encuentro ? s - guion.encuentro : -1; pu.uRSol.value = guion.rSol?.(s) ?? -1; pu.uOla.value = guion.ola(s); pu.uOla2.value = -1; pu.uEspera.value = guion.espera(s); pu.uOnda.value = guion.onda && s >= guion.onda ? s - guion.onda : -1; pu.uLuz.value = 1 - 0.42 * guion.nombres(s);   // (a media luz bajo los nombres: se leen sin caja detrás)
      // Los dos soles: juntos, giran despacio el uno alrededor del otro con su infinito; separados, cada uno en su camino.
      const j = sol.junta, ga = vida * GIRO_PAREJA, rx = Math.cos(ga) * DIST_PAREJA, rz = Math.sin(ga) * DIST_PAREJA, radio = R_SOLO + (R_PAREJA - R_SOLO) * j;
      estrellas[0].malla.position.set(sol.oro[0] + (sol.centro[0] - sol.oro[0]) * j + rx * j, 0, sol.oro[1] + (sol.centro[1] - sol.oro[1]) * j + rz * j);
      estrellas[1].malla.position.set(sol.rosa[0] + (sol.centro[0] - sol.rosa[0]) * j - rx * j, 0, sol.rosa[1] + (sol.centro[1] - sol.rosa[1]) * j - rz * j);
      estrellas.forEach((e, i) => { e.malla.scale.setScalar(radio); coronas[i].u.uEsc.value = radio * 2.5; });
      UM.uT.value = vida; UM.uFrente.value = fr; UM.uEspera.value = guion.espera(s); UM.uOla.value = guion.ola(s); UM.uOla2.value = -1;
      // Velos de polvo sobre la galaxia que nace: profundidad, y solo cuando ya la hay.
      velos.forEach(v => { v.u.uT.value = vida; v.u.uSep.value = 7; v.u.uAng.value = vida * 0.02; v.u.uLuz.value = abrir * 0.8; v.malla.visible = abrir > 0.01; });
      // Cada mes, su onda.
      if (guion.corona) { const tm = s - guion.corona.inicio, im = Math.floor(tm / guion.corona.paso), activa = tm >= 0 && im < 12; pu.uMesT.value = activa ? tm - im * guion.corona.paso : -1; pu.uMesA.value = im * Math.PI / 6; }
      // Ya en el anillo, cada sol enciende la cinta y las estrellas por donde pasa.
      if (guion.corona && (s >= 72 || (s >= 18 && s < 24))) { const dpi = Math.PI * 2, ao = (Math.atan2(sol.oro[1], sol.oro[0]) + dpi) % dpi, ar = (Math.atan2(sol.rosa[1], sol.rosa[0]) + dpi) % dpi; pu.uOla.value = UM.uOla.value = ao; pu.uOla2.value = UM.uOla2.value = ar; } UM.uPx.value = tam.y / (2 * mediaAltura); UM.uPR.value = renderer.getPixelRatio();
      // Los fuegos: cada uno en un sitio fuera del anillo, a su tiempo.
      if (fuegos.length) {
        for (const f of fuegos) f.malla.visible = false;
        const alto = PROFUNDIDAD_TEXTO * mediaAltura, ancho = alto * aspecto; let n = 0;
        guion.chispas.forEach((t, b) => {
          const tau = s - t; if (tau < 0 || tau >= 2.8 || n >= fuegos.length) return;
          const f = fuegos[n++], lado = b % 2 ? 1 : -1, arriba = b % 4 < 2 ? 1 : -1;
          f.malla.visible = true; f.u.uTau.value = tau; f.u.uSem.value = b + 1;
          f.malla.position.set(vertical ? lado * ancho * 0.44 : lado * ancho * 0.72, vertical ? alto * (0.66 + (arriba > 0 ? 0.08 : -0.04)) : arriba * alto * 0.42, -PROFUNDIDAD_TEXTO);
          f.malla.scale.setScalar(vertical ? ancho * 0.62 : alto * 0.62);
        });
      }
    }
    // El contacto (Dos soles) o el encuentro en el centro (el año): un estallido de hilos de luz.
    if (estallido) {
      const tau = guion.explota ? s - guion.explota : -1, ve = tau >= 0 && tau < 2.8; estallido.malla.visible = ve;
      if (ve) { const alto = PROFUNDIDAD_TEXTO * mediaAltura; estallido.u.uTau.value = tau; estallido.u.uSem.value = 4; estallido.malla.position.set(0, 0, -PROFUNDIDAD_TEXTO); estallido.malla.scale.setScalar(vertical ? alto * aspecto * 1.25 : alto * 1.05); }
    }
    for (let i = 0; i < coronas.length; i++) coronas[i].malla.position.copy(estrellas[i].malla.position);
  }
  function dibujar() {
    const r = renderer, tm = r.toneMapping; r.toneMapping = THREE.NoToneMapping;
    r.setRenderTarget(null); r.clear(); r.render(escena, camara); r.toneMapping = tm;
  }
  function liberar() {
    cielo?.liberar(); cielo = null; plasma?.liberar(); plasma = null; estallido?.liberar(); estallido = null;
    for (const x of [...estrellas, ...coronas, ...fuegos, ...velos]) x.liberar();
    estrellas = []; coronas = []; fuegos = []; velos = [];
    if (marcas) { escena.remove(marcas); marcas.geometry.dispose(); marcas.material.dispose(); marcas = null; }
    guion = null;
  }
  // Dónde caen en pantalla (0–1) los dos soles ahora mismo, para escribir sobre ellos sus nombres y sus ciudades.
  function ciudades() {
    if (!guion?.binaria || !estrellas.length) return null;
    return estrellas.map(e => { p.copy(e.malla.position).project(camara); return [p.x * 0.5 + 0.5, 0.5 - p.y * 0.5]; });
  }
  return { preparar, fijar, dibujar, liberar, ciudades, get guion() { return guion; } };
}

// «Nuestra primera vuelta», el lugar del año: la galaxia ya encendida dentro de su cinta y sus doce estrellas, con los dos soles
// recorriéndola sin parar. La misma luz tejida que su videoclip (atenuada: aquí pasa por el bloom del universo y no debe hacer halo).
export function crearLugarVuelta({ grupo, renderer, uPR, escala = 11 }) {
  const raiz = new THREE.Group(); raiz.scale.setScalar(escala);
  raiz.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), grupo.position.clone().negate().normalize());   // de cara a casa
  grupo.add(raiz);
  const plasma = crearPlasmaVuelta(), pu = plasma.u; pu.uLineal.value = 1; pu.uFrente.value = Math.PI * 2 + 0.01; pu.uLlena.value = 1; pu.uAbrir.value = 1; pu.uFrenteR.value = 0; pu.uNucleo.value = 1; pu.uLuz.value = 0.7; raiz.add(plasma.malla);
  const estrellas = [[1, 0.72, 0.3, 1, 0.3, 0.05], [1, 0.46, 0.68, 0.78, 0.1, 0.42]].map(c => { const e = crearEstrella({ radio: R_PAREJA, color: c.slice(0, 3), borde: c.slice(3), brillo: 0.56 }); raiz.add(e.malla); return e; });
  const um = { uT: { value: 0 }, uFrente: { value: 7 }, uEspera: { value: 0 }, uOla: { value: -1 }, uOla2: { value: -1 }, uInicio: { value: 0 }, uPaso: { value: 1 }, uHay: { value: 0 }, uPx: { value: 1000 }, uPR, uR: { value: R_VUELTA } };
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(36), 3)); g.setAttribute('aI', new THREE.BufferAttribute(Float32Array.from({ length: 12 }, (_, i) => i), 1));
  const marcas = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: um, vertexShader: VERT_MARCAS, fragmentShader: FRAG_MARCAS, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })); marcas.frustumCulled = false; raiz.add(marcas);
  const tam = new THREE.Vector2();
  return { puntos: raiz, actualizar(t, camara) {
    renderer.getDrawingBufferSize(tam); pu.uT.value = t; um.uT.value = t; um.uPx.value = tam.y / (2 * Math.tan(camara.fov * Math.PI / 360)) * escala;
    const a = (t * 0.09) % (Math.PI * 2), x = R_VUELTA * Math.cos(a), z = R_VUELTA * Math.sin(a), gi = t * 1.1, rx = Math.cos(gi) * R_PAREJA * 1.55, rz = Math.sin(gi) * R_PAREJA * 1.55;
    pu.uOla.value = a; estrellas[0].malla.position.set(x + rx, 0, z + rz); estrellas[1].malla.position.set(x - rx, 0, z - rz); for (const e of estrellas) e.u.uT.value = t;
  } };
}
