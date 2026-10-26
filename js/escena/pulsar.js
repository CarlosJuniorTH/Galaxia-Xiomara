// El púlsar del Cangrejo («El corazón que late por ti»): una estrella de neutrones que GIRA y EMITE. Todo nítido (nada de
// halos, humo ni degradados que tapen): la estrella es una esfera pequeña y opaca; los haces, líneas finas de 1 px y motas
// de 1,5–2,8 px; el viento ecuatorial, anillos de motas finas. Presupuesto pequeño (≈ 100 hilos, ≈ 7000 motas) para ir a 60 FPS en un móvil de gama media; geometrías y materiales se crean en la carga y en cada cuadro solo cambian
// uniformes.
//
// Física (y coherencia, que antes fallaba: había un haz quieto y otro que giraba):
//  · `giro`: su eje de giro (y local). `rotor` gira alrededor de él y lleva `magnetico`, el eje magnético, inclinado
//    `inclinacion` grados; la estrella (con sus casquetes polares calientes) y los DOS haces opuestos van en `magnetico`,
//    así que giran juntos, como un faro: cada haz barre un cono alrededor del eje de giro.
//  · El viento del púlsar sale por el ecuador del giro (anillos de motas y ondas que se alejan, como los «wisps» del
//    Cangrejo). Sin nebulosa de filamentos ni motas sueltas alrededor (Carlos: «ya tenemos la telaraña»): lo bello es la
//    estrella cegadora y el barrido de su faro.
//  · Dormido (su estado de siempre, fuera de su escena): estrella tibia, sin haces ni viento. En su escena despierta con
//    la canción (js/util/escenaPulsar.js) y queda despierto mientras se le mira.
// Ejes: `giro` coincide con el marco del director de cámara (js/util/directorCamara.js): y = eje Y del universo (el eje de
// giro), z = hacia casa (en horizontal), x = derecha; azimut 0 hacia casa, creciendo hacia la derecha (x = sen az,
// z = cos az). Fase: ψ es el azimut del haz de arriba. Al empezar la escena, mientras la estrella aún no se ve girar (sin
// casquetes ni haces, 1,4 s), la fase se lleva a la de la canción: desde ahí el haz de arriba está en el azimut
// 360°·vueltas(s) en cada visita, el mismo que usa la pista de cámara (ESCENA_PULSAR.camara).
import * as THREE from 'three';
import { EXPOSICION } from './exposicion.js';
import { ESCENA_PULSAR, vueltasPulsar } from '../util/escenaPulsar.js';

export const PULSAR = Object.freeze({ estrella: 34, haz: 4400, viento: 650, nebulosa: [3000, 2300, 2400] });
const DORMIDO = ESCENA_PULSAR.giros[0][1];   // vueltas por pulso dormido

function azarCon(semilla) { let s = semilla >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; }

// Mota redonda con núcleo, nítida, sin cola difusa (sin discard: mejor para las GPU de teselas del móvil).
const FRAG_MOTA = /* glsl */`varying vec3 vC; varying float vA;
  void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(max(1.0 - d * 2.0, 0.0), 1.6) + (1.0 - smoothstep(0.0, 0.18, d)) * 0.8;
    gl_FragColor = vec4(vC * a * vA, 1.0); }`;
const FRAG_HILO = /* glsl */`varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC * vA, 1.0); }`;
const material = (uniforms, vertexShader, fragmentShader) => new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

// Tamaño en píxeles de una mota de `tam` unidades locales (las que quedan por debajo de 1,5 px se reparten en 1,5 px con
// menos luz) y cono de la silueta: delante de la estrella, en la línea de la cámara, no hay luz (la estrella se ve limpia).
const ESPACIO = /* glsl */`
  float tamMota(float tam, vec4 mv, float maximo){ float px = tam * length(modelViewMatrix[0].xyz) * uScale / max(1.0, -mv.z);
    gl_PointSize = clamp(px, 1.5, maximo * uPR); return min(1.0, px * px / 2.25); }
  float fueraSilueta(vec4 mv){ vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float dc = max(length(c), 1.0); vec3 eje = c / dc;
    float t = dot(mv.xyz, eje), r = uSilueta * length(modelViewMatrix[0].xyz) * t / dc;
    return 1.0 - step(t, dc) * step(0.0, t) * (1.0 - smoothstep(r * 0.8, r * 1.2, length(mv.xyz - eje * t))); }
  // Al alejarse, lo que mide «tam» unidades se junta en pocos píxeles: su luz se reparte (no se amontona en un borrón).
  float junto(float tam){ float c = -(modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z; return clamp(tam * length(modelViewMatrix[0].xyz) * uScale / max(1.0, c) / 420.0, 0.12, 1.0); }`;

export function* construirPulsar({ uScale, uPR, config = ESCENA_PULSAR }) {
  const azar = azarCon(1054), R = PULSAR.estrella, L = PULSAR.haz, RV = PULSAR.viento, [NX, NY, NZ] = PULSAR.nebulosa;
  const alfa = THREE.MathUtils.degToRad(config.inclinacion);
  const grupo = new THREE.Group(); grupo.name = 'Púlsar';
  const giro = new THREE.Group(), rotor = new THREE.Group(), magnetico = new THREE.Group();
  magnetico.rotation.z = -alfa;   // el eje magnético (y de `magnetico`) se inclina hacia +x; rotor.rotation.y = ψ − 90°: haz de arriba en (sen α sen ψ, cos α, sen α cos ψ)
  grupo.add(giro); giro.add(rotor); rotor.add(magnetico);

  // ── La estrella de neutrones: opaca y pequeña. Superficie con grano (se le ve girar) y dos casquetes calientes en los
  // polos magnéticos, de borde nítido, con un anillo fino alrededor. Dormida, tibia y lisa. ──
  const uE = { uCalor: { value: 0.45 }, uCasquetes: { value: 0 }, uPulso: { value: 0 }, uTibio: { value: 0 }, uDestello: { value: 0 } };
  const estrella = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), new THREE.ShaderMaterial({
    uniforms: uE,
    vertexShader: /* glsl */`varying vec3 vN, vP, vV; void main(){ vP = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform float uCalor, uCasquetes, uPulso, uTibio, uDestello; varying vec3 vN, vP, vV;
      float h3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      float rn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){ float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float grano = mix(0.5, rn3(vP * 9.0) * 0.6 + rn3(vP * 23.0) * 0.4, uCasquetes);
        vec3 base = mix(vec3(0.22, 0.36, 1.0), vec3(0.72, 0.84, 1.0), mu) * (0.45 + 0.65 * mu) * (0.8 + 0.4 * grano);
        float y = abs(vP.y), polo = smoothstep(0.86, 0.88, y), anillo = smoothstep(0.78, 0.795, y) * (1.0 - smoothstep(0.81, 0.825, y));
        vec3 caliente = mix(vec3(1.0, 0.98, 1.0), vec3(1.0, 0.82, 0.9), uTibio * 0.6);
        float borde = smoothstep(0.08, 0.16, mu) * (1.0 - smoothstep(0.2, 0.3, mu));
        vec3 c = base * uCalor * (1.0 + 0.7 * uPulso) + vec3(0.7, 0.8, 1.0) * borde * 0.5 * uCalor + caliente * (polo * 4.0 + anillo * 1.4) * uCasquetes * (1.0 + 0.8 * uPulso) + vec3(0.9, 0.95, 1.0) * uDestello * (0.4 + 0.6 * mu);
        gl_FragColor = vec4(c * 1.15, 1.0); }`
  }));
  magnetico.add(estrella);

  // ── Destello: cuatro rayos finos (1 px) en la pantalla cuando un haz apunta a la cámara y con cada latido ──
  const uD = { uLargo: { value: 0 }, uLuz: { value: 0 } };
  {
    const dirs = [], t = [];
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.2; for (const v of [0, 1]) { dirs.push(Math.cos(a), Math.sin(a)); t.push(v); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(8 * 3).fill(0), 3));
    g.setAttribute('aDir', new THREE.Float32BufferAttribute(dirs, 2)); g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
    var destello = new THREE.LineSegments(g, material(uD, /* glsl */`uniform float uLargo, uLuz; attribute vec2 aDir; attribute float aT; varying vec3 vC; varying float vA;
      void main(){ vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); float k = length(modelViewMatrix[0].xyz);
        gl_Position = projectionMatrix * (c + vec4(aDir * aT * uLargo * k, 0.0, 0.0)); vC = vec3(0.9, 0.95, 1.0); vA = pow(1.0 - aT, 1.5) * uLuz; }`, FRAG_HILO));
    destello.frustumCulled = false; grupo.add(destello);
  }
  yield;

  // ── Los dos haces (en `magnetico`, a lo largo de ±y): un hilo fino por haz en su eje, que nace en el polo, y 1500 motas
  // por haz en un cono de 1,1° (más juntas cerca de la estrella) que salen por él. Cada pulso de la canción lanza un paquete de luz que recorre el haz hacia fuera. ──
  const uH = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uLargo: { value: 0 }, uPaquete: { value: 0 }, uEdad: { value: 9 }, uPulsoDur: { value: config.pulso }, uFlujo: { value: 0 }, uTibio: { value: 0 } };
  const HAZ_VS = /* glsl */`uniform float uScale, uPR, uExpo, uLuz, uLargo, uPaquete, uEdad, uPulsoDur, uFlujo, uTibio;`;
  const luzHaz = /* glsl */`
    float luzEn(float u){ float nace = 1.0 - smoothstep(uLargo - 0.02, uLargo, u);
      float paquete = exp(-pow((u - uEdad / uPulsoDur * 0.95) * 11.0, 2.0)) * uPaquete;
      return (uLuz * pow(1.0 - u, 1.25) + paquete * 1.8 * (1.0 - 0.6 * u)) * smoothstep(0.0, 0.015, u) * nace; }
    vec3 colorHaz(float u){ return mix(vec3(0.78, 0.88, 1.0), vec3(1.0, 0.8, 0.9), uTibio * (0.3 + 0.5 * u)); }`;
  {
    const SEG = 48, dirs = [[0, 0, 1]];
    const pos = [], dato = [];
    for (const lado of [1, -1]) for (const [a, th, luz] of dirs) {
      const d = new THREE.Vector3(Math.sin(th) * Math.cos(a), Math.cos(th) * lado, Math.sin(th) * Math.sin(a));
      for (let i = 0; i < SEG; i++) for (const u of [i / SEG, (i + 1) / SEG]) { const r = R * 1.02 + (L - R) * u; pos.push(d.x * r, d.y * r, d.z * r); dato.push(u, luz); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aDato', new THREE.Float32BufferAttribute(dato, 2));
    var hilosHaz = new THREE.LineSegments(g, material(uH, /* glsl */`${HAZ_VS} attribute vec2 aDato; varying vec3 vC; varying float vA; ${luzHaz}
      void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vC = colorHaz(aDato.x); vA = luzEn(aDato.x) * aDato.y * 1.5 * uExpo; }`, FRAG_HILO));
    hilosHaz.frustumCulled = false; hilosHaz.name = 'hacesPulsar'; magnetico.add(hilosHaz);
  }
  {
    const N = 3000, dato = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) dato.set([azar(), azar(), i % 2 ? 1 : -1], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dato, 3));
    var motasHaz = new THREE.Points(g, material({ ...uH, uSilueta: { value: 0 } }, /* glsl */`${HAZ_VS} uniform float uSilueta; varying vec3 vC; varying float vA; ${ESPACIO} ${luzHaz}
      void main(){ float f = fract(position.x + uFlujo * (0.8 + 0.4 * position.y)), u = f * f, r = ${(R * 1.1).toFixed(1)} + u * ${(L - R * 1.1).toFixed(1)};
        float a = position.y * 6.2832 + position.x * 40.0, th = 0.02 * sqrt(fract(position.x * 7.31 + position.y * 3.7));
        vec4 mv = modelViewMatrix * vec4(cos(a) * sin(th) * r, position.z * cos(th) * r, sin(a) * sin(th) * r, 1.0); gl_Position = projectionMatrix * mv;
        vC = colorHaz(u); vA = luzEn(u) * 1.1 * tamMota(10.0 + position.y * 10.0, mv, 2.8) * uExpo; }`, FRAG_MOTA));
    motasHaz.frustumCulled = false; magnetico.add(motasHaz);
  }
  yield;

  // ── Viento del púlsar, en el ecuador del giro: seis anillos de motas (≈ 3900) con grumos que giran despacio (más rápido dentro)
  // y nacen de dentro afuera; y ondas de motas que se alejan en cada compás (en cada pulso con el grave). ──
  const uV = { uScale, uPR, uExpo: EXPOSICION, uT: { value: 0 }, uViento: { value: 0 }, uOnda: { value: 0 }, uOndas: { value: 0 }, uPulso: { value: 0 }, uTibio: { value: 0 }, uSilueta: { value: R * 1.6 } };
  let viento, radioViento = 0;
  {
    const anillos = [[200, 420, 6], [270, 700, 9], [350, 520, 12], [440, 900, 14], [530, 620, 16], [620, 700, 20]], NO = 700, N = anillos.reduce((s, a) => s + a[1], 0) + NO;
    const dato = new Float32Array(N * 3), extra = new Float32Array(N * 2); let i = 0;
    for (const [r, n, grosor] of anillos) for (let k = 0; k < n; k++, i++) {
      // Grumos: más motas en unos ángulos que en otros (como los nudos del anillo del Cangrejo).
      let a; do { a = azar() * Math.PI * 2; } while (azar() > 0.55 + 0.45 * Math.sin(a * 7 + r) * Math.sin(a * 3 - r * 0.01));
      const rr = r + (azar() - 0.5) * grosor * 2; radioViento = Math.max(radioViento, rr);
      dato.set([rr, a, (azar() - 0.5) * grosor], i * 3); extra.set([0, azar()], i * 2);
    }
    for (let k = 0; k < NO; k++, i++) { dato.set([1, azar() * Math.PI * 2, (azar() - 0.5) * 14], i * 3); extra.set([1, azar()], i * 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dato, 3)); g.setAttribute('aExtra', new THREE.BufferAttribute(extra, 2));
    viento = new THREE.Points(g, material(uV, /* glsl */`uniform float uScale, uPR, uExpo, uT, uViento, uOnda, uOndas, uPulso, uTibio, uSilueta; attribute vec2 aExtra; varying vec3 vC; varying float vA; ${ESPACIO}
      void main(){ float onda = aExtra.x, r = mix(position.x, mix(${(R * 2.2).toFixed(1)}, ${(RV * 1.5).toFixed(1)}, sqrt(uOnda)), onda);
        float a = position.y + uT * 0.22 * (260.0 / r) * (1.0 - onda);
        vec4 mv = modelViewMatrix * vec4(cos(a) * r, position.z, sin(a) * r, 1.0); gl_Position = projectionMatrix * mv;
        float nace = smoothstep(r - 60.0, r, uViento * ${(RV * 1.08).toFixed(1)});
        float luz = mix(nace * (0.75 + 0.55 * aExtra.y) * (1.0 + 0.6 * uPulso), pow(1.0 - uOnda, 1.6) * uOndas * 1.3, onda);
        vC = mix(mix(vec3(0.62, 0.8, 1.0), vec3(0.85, 0.92, 1.0), aExtra.y), vec3(1.0, 0.78, 0.88), uTibio * 0.5);
        vA = luz * tamMota(7.0 + aExtra.y * 5.0, mv, 2.0) * fueraSilueta(mv) * uExpo; }`, FRAG_MOTA));
    viento.frustumCulled = false; viento.name = 'vientoPulsar'; giro.add(viento);
  }
  yield;

  // ── Fase ──
  const P = config.pulso, DOS_PI = Math.PI * 2, vista = new THREE.Vector3(), haz = new THREE.Vector3();
  let psi = 0, psi0 = 0, delta = 0, flujo = 0, tViento = 0;
  const ajuste = config.marcas.quererte;   // la fase se lleva a la de la canción antes de que se le vea girar
  return {
    grupo, giro, magnetico, estrella, viento, hilosHaz,
    medidas: { estrella: R, haz: L, viento: radioViento, nebulosa: Math.max(NX, NY, NZ) },   // nebulosa: la extensión de su región (tabla de escalas)
    // Ejes del giro en el espacio del grupo (los del marco de la cámara: x derecha, y arriba = eje de giro, z hacia casa).
    orientar(x, y, z) { giro.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); },
    // Al empezar su escena: la fase que falta para ir con la canción (se recorre en `ajuste` segundos, sin verse).
    iniciarEscena() { psi0 = psi; delta = Math.atan2(Math.sin(psi), Math.cos(psi)); },
    // e: estado de la canción (estadoPulsar) en su segundo s; e0: el estado dormido; w: peso de la escena (1 en ella y
    // después, mientras persiste; baja a 0 al irse); activa: suena su canción. camara: la cámara en el espacio del grupo,
    // relativa a su centro.
    actualizar({ e, e0, w, activa, s, t, dt, camara, reducido }) {
      if (activa) { const k = Math.min(1, Math.max(0, s / ajuste)); psi = psi0 + DOS_PI * vueltasPulsar(s, config) - delta * k * k * (3 - 2 * k); }
      else psi += dt * DOS_PI / P * (DORMIDO + (e.ritmo - DORMIDO) * w);
      rotor.rotation.y = psi - Math.PI / 2;
      const v = k => e0[k] + (e[k] - e0[k]) * w;
      // Haz de arriba en el espacio del grupo y cuánto mira a la cámara (un faro: destella al pasar).
      haz.set(Math.sin(alfa) * Math.sin(psi), Math.cos(alfa), Math.sin(alfa) * Math.cos(psi)).applyQuaternion(giro.quaternion);
      vista.copy(camara).normalize();
      const largo = v('largo'), alineado = largo > 0.98 ? Math.pow(Math.abs(haz.dot(vista)), 200) : 0, pulso = e.pulso * w;
      uE.uCalor.value = v('calor'); uE.uCasquetes.value = v('casquetes'); uE.uPulso.value = pulso; uE.uTibio.value = v('tibio');
      uE.uDestello.value = alineado * v('luzHaz') * 1.4;
      uD.uLuz.value = Math.min(1, (alineado * 0.9 + pulso * 0.55) * v('casquetes')) * (reducido ? 0.5 : 1);
      uD.uLargo.value = R * (2.5 + 14 * alineado + 6 * pulso);
      flujo += dt * (0.05 + 0.12 * v('luzHaz'));
      uH.uLuz.value = v('luzHaz'); uH.uLargo.value = largo; uH.uPaquete.value = reducido ? 0 : 0.9 * v('fuerza'); uH.uEdad.value = e.edad; uH.uFlujo.value = flujo; uH.uTibio.value = v('tibio');
      motasHaz.material.uniforms.uFlujo.value = flujo;
      tViento += dt * (0.4 + 0.6 * v('viento'));
      uV.uT.value = tViento; uV.uViento.value = v('viento'); uV.uOnda.value = Math.min(1, e.ondaEdad / Math.min(e.ondaPeriodo, 1.3)); uV.uOndas.value = v('ondas'); uV.uPulso.value = pulso; uV.uTibio.value = v('tibio');
      return alineado;
    }
  };
}
