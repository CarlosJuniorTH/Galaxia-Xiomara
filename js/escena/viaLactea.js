// La Vía Láctea: una galaxia vecina persistente, distinta de Xiomara (nuestra galaxia artística, en
// el origen). Su centro es Sagitario A*: bulbo dorado con barra, cuatro brazos con poblaciones
// jóvenes azuladas, nubes estelares cálidas, regiones de emisión rosadas (algún toque turquesa de
// oxígeno), cúmulos, filamentos que salen de los brazos, grandes grietas de polvo y un halo tenue.
// Desde fuera se ve como una galaxia con su tamaño y orientación; desde dentro de su disco (al
// visitar Sagitario A*), la propia distribución 3D de su luz dibuja la banda. El cielo de fondo no
// hornea ninguna banda (cielo.js): la banda no envuelve igual al observador desde cualquier lugar.
//
// El polvo: las grietas son AUSENCIA de luz (las nubes de luz y las estrellas que caen en un carril de
// polvo se apagan: el polvo tapa el disco que hay detrás), más nubes oscuras grandes y suaves en el
// plano medio para verlo de canto. Antes eran miles de puntitos oscuros dibujados después de todo:
// se veían como motas y bloques oscuros sobre la galaxia y el fondo.
//
// Su luz sigue la misma regla que las demás galaxias: los puntos tienen tamaño fijo en píxeles y,
// cuando la galaxia ocupa poco, cada uno lleva la parte de luz que le toca por área (sin suelo); por
// debajo de unos píxeles queda una luz no resuelta con el mismo presupuesto.
import * as THREE from 'three';
import { deUnTiron } from '../util/azarSemilla.js';
import { gauss, azar } from '../util/dibujo.js';
import { sitioDestino } from './cosmos.js';
import { vista } from '../util/vista.js';

export const RADIO_VIA_LACTEA = 1300;   // ≈ 66 000 años luz de radio con 51 al por unidad (licencia: algo mayor que la real para que el aparato de Sagitario A* no la domine)

const COLOR = {
  bulbo: new THREE.Color('#ffb85c'), bulboClaro: new THREE.Color('#ffd89a'), disco: new THREE.Color('#ffe0bc'),
  joven: new THREE.Color('#6f9dff'), jovenClaro: new THREE.Color('#bcd4ff'), nube: new THREE.Color('#ffe7c4'),
  hii: new THREE.Color('#ff2f86'), hiiClaro: new THREE.Color('#ff86c0'), oxigeno: new THREE.Color('#3fe0cc'),
  gigante: new THREE.Color('#ff8a5c'), halo: new THREE.Color('#c9a27a')
};

// De un tirón; la carga usa construirViaLactea, el mismo código como generador (yield entre pasos: ver porTramos).
export const crearViaLactea = (...a) => deUnTiron(construirViaLactea(...a));
export function* construirViaLactea({ scene, uPR }) {
  const centro = sitioDestino('sagitario'), R = RADIO_VIA_LACTEA;
  const grupo = new THREE.Group(); grupo.position.copy(centro); grupo.name = 'Vía Láctea (centro en Sagitario A*)';
  grupo.userData.profundo = true;   // posición fija en el universo: no acompaña a la cámara como el fondo óptico
  yield;
  // Orientación fija: el disco inclinado ~55° respecto a la línea de visión desde Xiomara.
  const haciaCasa = centro.clone().negate().normalize(), lado = new THREE.Vector3().crossVectors(haciaCasa, new THREE.Vector3(0, 1, 0)).normalize();
  const normal = haciaCasa.clone().applyAxisAngle(lado, 55 * Math.PI / 180);
  grupo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal); grupo.rotateY(0.6);
  scene.add(grupo);
  const BRAZOS = 4, ENROLLADO = 4.6;
  const enBrazo = (k, r, ruido) => { const t = (2 * Math.PI * k + Math.log(Math.max(r, 0.05)) * ENROLLADO) / BRAZOS + ruido; return [Math.cos(t) * r, Math.sin(t) * r]; };
  yield;
  // Carril de polvo de cada brazo: en su borde interior (como en las espirales reales).
  const anguloBrazo = (k, r) => (2 * Math.PI * k + Math.log(Math.max(r, 0.05)) * ENROLLADO) / BRAZOS;
  const enPolvo = (x, z) => {
    const r = Math.hypot(x, z); if (r < 0.12 || r > 1.0) return 0;
    const a = Math.atan2(z, x); let m = 0;
    for (let k = 0; k < BRAZOS; k++) { let d = a - (anguloBrazo(k, r) - 0.09); d = Math.atan2(Math.sin(d), Math.cos(d)); m = Math.max(m, Math.exp(-Math.pow(d * r / 0.022, 2))); }
    // Grietas grandes que cortan el disco interior (como la Gran Grieta vista desde dentro).
    const grieta = Math.exp(-Math.pow((r - 0.34) / 0.04, 2)) * (0.5 + 0.5 * Math.sin(a * 3 + 1.2));
    return Math.min(1, m * (0.7 + 0.3 * Math.sin(a * 7 + r * 23)) + grieta * 0.6);
  };
  yield;
  // Nubes estelares (grumos brillantes) y regiones H II: centros sobre los brazos.
  const nubes = Array.from({ length: 80 }, () => { const r = azar(0.22, 0.92); return [...enBrazo(Math.floor(Math.random() * BRAZOS), r, gauss() * 0.06), azar(0.02, 0.05)]; });
  const regionesHII = Array.from({ length: 52 }, () => { const r = azar(0.25, 0.9); return [...enBrazo(Math.floor(Math.random() * BRAZOS), r, gauss() * 0.03 + 0.02), azar(0.016, 0.034), Math.random() < 0.16]; });
  const cumulos = Array.from({ length: 34 }, () => { const r = azar(0.18, 0.9); return [...enBrazo(Math.floor(Math.random() * BRAZOS), r, gauss() * 0.05), azar(0.004, 0.01)]; });

  yield;
  // ── Estrellas resueltas ──
  const N = 30000;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), tam = new Float32Array(N), c = new THREE.Color();
  let luzTotal = 0;
  for (let i = 0; i < N; i++) {
    if (i % 2000 === 1999) yield;
    const u = Math.random(); let x, y, z, k = 1;
    if (u < 0.15) {   // bulbo triaxial con barra: población vieja dorada, alguna gigante roja
      const barra = Math.random() < 0.45; const a = barra ? gauss() * 0.2 : gauss() * 0.1;
      x = a; z = gauss() * (barra ? 0.045 : 0.09); y = gauss() * 0.07; c.copy(COLOR.bulbo).lerp(COLOR.bulboClaro, Math.random() * 0.5); k = 1.15;
      if (Math.random() < 0.08) c.copy(COLOR.gigante);
      const rr = Math.hypot(x, z, y); if (rr < 0.035) { const s = 0.035 / Math.max(rr, 1e-3); x *= s; y *= s; z *= s; }   // hueco para Sagitario A*
    } else if (u < 0.58) {   // disco con brazos: jóvenes azuladas en los brazos, cálidas entre ellos
      const r = 0.12 + Math.pow(Math.random(), 0.75) * 0.9, enB = Math.random() < 0.86;
      [x, z] = enB ? enBrazo(i % BRAZOS, r, gauss() * (0.05 + r * 0.04)) : [Math.cos(Math.random() * 6.283) * r, Math.sin(Math.random() * 6.283) * r];
      y = gauss() * (0.012 + r * 0.012); c.copy(enB ? COLOR.joven : COLOR.jovenClaro).lerp(enB ? COLOR.jovenClaro : COLOR.disco, Math.random() * 0.5); k = enB ? 1.1 : 0.5;
    } else if (u < 0.76) {   // nubes estelares cálidas
      const n = nubes[i % nubes.length]; x = n[0] + gauss() * n[2]; z = n[1] + gauss() * n[2]; y = gauss() * 0.01; c.copy(COLOR.nube).lerp(COLOR.jovenClaro, Math.random() * 0.4); k = 1.15;
    } else if (u < 0.83) {   // cúmulos jóvenes: grupos compactos muy brillantes
      const n = cumulos[i % cumulos.length]; x = n[0] + gauss() * n[2]; z = n[1] + gauss() * n[2]; y = gauss() * 0.004; c.copy(COLOR.jovenClaro); k = 1.5;
    } else if (u < 0.9) {   // estrellas de las regiones H II (rosadas)
      const n = regionesHII[(i * 7) % regionesHII.length]; x = n[0] + gauss() * n[2]; z = n[1] + gauss() * n[2]; y = gauss() * 0.006; c.copy(n[3] ? COLOR.oxigeno : COLOR.hii).lerp(COLOR.hiiClaro, Math.random() * 0.4); k = 1.3;
    } else {   // halo
      const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.pow(Math.random(), 0.5) * 1.15); x = v.x; y = v.y * 0.7; z = v.z; c.copy(COLOR.halo).multiplyScalar(0.6); k = 0.6;
    }
    // El polvo tapa lo que está en el plano dentro de su carril: grieta oscura (no motas).
    if (Math.abs(y) < 0.03) k *= 1 - 0.85 * enPolvo(x, z);
    pos.set([x * R, y * R, z * R], i * 3); col.set([c.r * k, c.g * k, c.b * k], i * 3); tam[i] = 1 + Math.random() * 1.5;
    luzTotal += (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) * k * 0.1678 * tam[i] * tam[i];
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); g.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
  const uLuz = { value: 1 };
  const estrellas = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uLuz, uPR },
    vertexShader: 'attribute vec3 aColor; attribute float aTam; uniform float uLuz, uPR; varying vec3 vC; void main(){ vC = aColor * uLuz; gl_PointSize = aTam * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = pow(1.0 - d * 2.0, 1.6); gl_FragColor = vec4(vC * a, a); }',
    transparent: true, premultipliedAlpha: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  estrellas.frustumCulled = false; estrellas.renderOrder = 2; grupo.add(estrellas);

  yield;
  // ── Luz difusa (estrellas no resueltas y gas): nubes de luz con tamaño en el MUNDO y brillo
  // superficial constante. De lejos se funden en un disco continuo con sus brazos, su bulbo, sus
  // regiones rosadas y sus grietas; desde dentro de su disco forman la banda. ──
  // Perfil de cada nube (exp(−3,5·d²)·(1−d²) en un disco): su integral, en unidades de tamaño².
  let PERFIL_DIFUSA = 0; for (let k = 0; k < 400; k++) { const sq = (k + 0.5) / 400; PERFIL_DIFUSA += Math.exp(-3.5 * sq) * (1 - sq) * (Math.PI / 4) / 400; }
  const K_DIFUSA = 0.016; let flujoDifusa = 0;
  const NL = 5200, pl = new Float32Array(NL * 3), cl = new Float32Array(NL * 3), rl = new Float32Array(NL);
  for (let i = 0; i < NL; i++) {
    if (i % 1000 === 999) yield;
    const u = Math.random(); let x, y, z, r, k = 1;
    if (u < 0.07) {   // bulbo compacto (sin quemar el centro); hueco alrededor de Sagitario A*: su sombra se ve
      x = gauss() * 0.1; z = gauss() * 0.05; y = gauss() * 0.04; r = azar(0.03, 0.06); c.copy(COLOR.bulbo).lerp(COLOR.bulboClaro, Math.random() * 0.4); k = 0.55;
      const rr = Math.hypot(x, y, z), minimo = 0.12 + r; if (rr < minimo) { const s = minimo / Math.max(rr, 1e-3); x *= s; y *= s; z *= s; }
    }
    else if (u < 0.6) { const rr = 0.1 + Math.pow(Math.random(), 0.8) * 0.85; [x, z] = enBrazo(i % BRAZOS, rr, gauss() * (0.045 + rr * 0.035)); y = gauss() * 0.012; r = azar(0.03, 0.07); c.copy(COLOR.joven).lerp(COLOR.disco, 0.15 + Math.random() * 0.35); k = 1.05; }   // brazos azulados
    else if (u < 0.7) { const n = nubes[i % nubes.length]; x = n[0] + gauss() * n[2] * 0.6; z = n[1] + gauss() * n[2] * 0.6; y = gauss() * 0.008; r = azar(0.02, 0.04); c.copy(COLOR.nube); k = 1.25; }   // nubes estelares cálidas
    else if (u < 0.86) { const n = regionesHII[i % regionesHII.length]; x = n[0] + gauss() * n[2] * 0.8; z = n[1] + gauss() * n[2] * 0.8; y = gauss() * 0.005; r = azar(0.014, 0.032); c.copy(n[3] ? COLOR.oxigeno : COLOR.hii).lerp(COLOR.hiiClaro, Math.random() * 0.25); k = 2.3; }   // emisión rosada (y algún toque de oxígeno)
    else if (u < 0.92) {   // filamentos: plumas que salen del borde exterior de los brazos
      const brazo = i % BRAZOS, r0 = azar(0.3, 0.85), t = Math.random(), [bx, bz] = enBrazo(brazo, r0, 0.05);
      const pluma = anguloBrazo(brazo, r0) + 0.05 + 0.9, dx = Math.cos(pluma), dz = Math.sin(pluma);
      x = bx + dx * t * 0.12 + gauss() * 0.006; z = bz + dz * t * 0.12 + gauss() * 0.006; y = gauss() * 0.006; r = azar(0.012, 0.022); c.copy(COLOR.joven).lerp(COLOR.hii, Math.random() < 0.3 ? 0.6 : 0.1); k = 0.8 * (1 - t * 0.6);
    } else { const rr = 0.1 + Math.pow(Math.random(), 0.7) * 0.9, a = Math.random() * 6.283; x = Math.cos(a) * rr; z = Math.sin(a) * rr; y = gauss() * 0.02; r = azar(0.06, 0.11); c.copy(COLOR.disco).lerp(COLOR.joven, 0.25); k = 0.32; }   // disco viejo entre brazos: velo muy tenue (zonas tranquilas y oscuras)
    k *= 1 - 0.92 * enPolvo(x, z);   // grietas de polvo: ahí no llega la luz del disco
    pl.set([x * R, y * R, z * R], i * 3); cl.set([c.r * k, c.g * k, c.b * k], i * 3); rl[i] = r * R;
    flujoDifusa += (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) * k * K_DIFUSA * PERFIL_DIFUSA * 4 * rl[i] * rl[i];   // flujo a (f/z) = 1
  }
  const gL = new THREE.BufferGeometry(); gL.setAttribute('position', new THREE.BufferAttribute(pl, 3)); gL.setAttribute('aColor', new THREE.BufferAttribute(cl, 3)); gL.setAttribute('aR', new THREE.BufferAttribute(rl, 1));
  const uFocal = { value: 780 }, uDifusa = { value: 1 };
  const difusa = new THREE.Points(gL, new THREE.ShaderMaterial({ uniforms: { uFocal, uPR, uDifusa },
    // Las nubes que quedan pegadas a la cámara (dentro de la galaxia) se apagan con suavidad: si no,
    // una sola nube cercana llenaba la pantalla con un velo uniforme.
    vertexShader: `attribute vec3 aColor; attribute float aR; uniform float uFocal, uPR, uDifusa; varying vec3 vC;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float z = -mv.z, px = 2.0 * aR * uFocal / max(1.0, z);
        float tam = clamp(px, 1.0, 320.0), cerca = smoothstep(aR * 1.5, aR * 4.0, z);
        vC = aColor * ${K_DIFUSA} * uDifusa * min(1.0, (px * px) / (tam * tam)) * cerca;
        gl_PointSize = z > 0.0 && cerca > 0.001 ? tam * uPR : 0.0; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'varying vec3 vC; void main(){ vec2 q = gl_PointCoord - 0.5; float d2 = dot(q, q) * 4.0; if (d2 > 1.0) discard; float a = exp(-d2 * 3.5) * (1.0 - d2); gl_FragColor = vec4(vC * a, a); }',
    transparent: true, premultipliedAlpha: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  difusa.frustumCulled = false; difusa.renderOrder = 0; grupo.add(difusa);

  yield;
  // ── Polvo de canto: nubes oscuras GRANDES y suaves en el plano medio, a lo largo de los carriles y
  // de la grieta interior (se dibujan entre la luz difusa y las estrellas). Se apagan cuando ocuparían
  // menos de unos píxeles: nunca son motas. De cara apenas se notan (las grietas ya son ausencia de luz). ──
  const ND = 1100, pd = new Float32Array(ND * 3), rd = new Float32Array(ND);
  for (let i = 0, n = 0; n < ND && i < ND * 30; i++) {
    if (i % 2000 === 1999) yield;
    const r = 0.14 + Math.pow(Math.random(), 0.8) * 0.8, a = Math.random() * 6.283, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.random() > enPolvo(x, z)) continue;
    pd.set([x * R, gauss() * 0.004 * R, z * R], n * 3); rd[n] = azar(0.018, 0.04) * R; n++;
  }
  const gd = new THREE.BufferGeometry(); gd.setAttribute('position', new THREE.BufferAttribute(pd, 3)); gd.setAttribute('aR', new THREE.BufferAttribute(rd, 1));
  const uPolvo = { value: 1 };
  const polvo = new THREE.Points(gd, new THREE.ShaderMaterial({ uniforms: { uPolvo, uFocal, uPR },
    vertexShader: `attribute float aR; uniform float uFocal, uPR; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float z = -mv.z, px = 2.0 * aR * uFocal / max(1.0, z);
        vA = smoothstep(4.0, 14.0, px) * smoothstep(aR * 1.5, aR * 4.0, z);
        gl_PointSize = z > 0.0 && vA > 0.001 ? clamp(px, 1.0, 360.0) * uPR : 0.0; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform float uPolvo; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float d2 = dot(q, q) * 4.0; if (d2 > 1.0) discard; gl_FragColor = vec4(0.02, 0.008, 0.012, exp(-d2 * 3.0) * (1.0 - d2) * 0.22 * uPolvo * vA); }',
    transparent: true, depthWrite: false }));
  polvo.frustumCulled = false; polvo.renderOrder = 1; grupo.add(polvo);

  yield;
  // Luz no resuelta (cuando ocupa unos pocos píxeles): un punto con el mismo presupuesto de luz.
  const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const uPunto = { value: 0 }, uTamPunto = { value: 3 };
  const punto = new THREE.Points(gl, new THREE.ShaderMaterial({ uniforms: { uPunto, uTamPunto, uPR },
    vertexShader: 'uniform float uTamPunto, uPR; void main(){ gl_PointSize = uTamPunto * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uPunto; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = pow(1.0 - d * 2.0, 1.6) * uPunto; gl_FragColor = vec4(vec3(1.0, 0.9, 0.82) * a, a); }',
    transparent: true, premultipliedAlpha: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  punto.frustumCulled = false; grupo.add(punto);
  const v = new THREE.Vector3();
  return {
    grupo, centro, radio: R, normal,
    actualizar(camera) {
      const f = vista.alto / (2 * Math.tan(camera.fov * Math.PI / 360));
      uFocal.value = f;
      const z = Math.max(1, -v.copy(centro).applyMatrix4(camera.matrixWorldInverse).z), radioPx = R * f / Math.max(z, 1);
      // Brillo superficial constante: con N puntos de tamaño fijo, la luz total debe crecer con el área.
      // La luz difusa (brillo superficial constante) lleva la mayor parte; las estrellas resueltas,
      // de tamaño fijo, aportan como mucho ~20 % de esa luz.
      const flujoDif = flujoDifusa * radioPx * radioPx / (R * R);
      const luz = Math.min(1, 0.2 * flujoDif / luzTotal);   // fracción de la luz plena de los puntos
      uPolvo.value = THREE.MathUtils.smoothstep(radioPx, 15, 60);
      // Luz no resuelta: hasta ~3 px de radio la galaxia es un punto con el MISMO flujo que tendrían
      // sus estrellas y su luz difusa, que se funde con ellas sin cambiar la luz total.
      const fundido = 1 - THREE.MathUtils.smoothstep(radioPx, 1.5, 4);
      uLuz.value = luz * (1 - fundido);
      uDifusa.value = 1 - fundido; difusa.visible = polvo.visible = fundido < 0.999;
      uPunto.value = fundido * (luzTotal * luz + flujoDif) / (0.1678 * uTamPunto.value * uTamPunto.value);
      estrellas.visible = fundido < 0.999;
    }
  };
}
