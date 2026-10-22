// Maravillas del universo: rincones pensados para impresionar, inspirados en fotografías.
//  · el Ojo (como la nebulosa de la Hélice): una NEBULOSA volumétrica (nube.js) con su imagen propia
//    pintada aquí: anillo de nudos dorados, naranjas y rojos con fibras radiales, interior azul
//    turquesa y el centro oscuro con su estrella blanca. Junto al corazón de la supernova, entero en el
//    encuadre de llegada (a un lado);
//  · la nube de fuego: nube de polvo y gas naranja con un núcleo amarillo encendido, polvo oscuro por
//    delante y bruma roja alrededor (también volumétrica), al otro lado del corazón;
//  · la nube de las burbujas (una gran región de estrellas nacientes, en 3D): miles de estrellas
//    doradas, cúmulos azules, burbujas rosas y un velo turquesa; junto al cuásar;
//  · la espiral de hebras: brazos hechos de filamentos de polvo cobrizo con estrellas azules y un
//    núcleo azul; cerca de TON 618.
// Las galaxias son MENORES que Xiomara (ella es la mayor del universo); las nebulosas, de tamaño
// moderado. Licencias artísticas declaradas.
import * as THREE from 'three';
import { esMovil } from '../util/dispositivo.js';
import { LLEGADA_GIGANTE, LEJANIA } from '../data/escalaCosmica.js';
import { crearNube } from './nube.js';

function azarSemilla(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const gauss = a => { let u = 0; while (!u) u = a(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * a()); };
const C = h => new THREE.Color(h);
const K = 1;   // el mismo contenido en móvil y en PC
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── Ruido 2D para pintar las imágenes de las nebulosas ──
function ruido2D(semilla) {
  const P = new Uint8Array(512), a = azarSemilla(semilla); for (let i = 0; i < 256; i++) P[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(a() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; } for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const h = (x, y) => P[(P[x & 255] + y) & 511] / 255;
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
  return (x, y, oct = 5) => { let s = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += amp * vn(x * f, y * f); f *= 2.03; amp *= 0.5; } return s; };
}
function textura(lado, pintar) {
  const datos = new Uint8Array(lado * lado * 4);
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    const [r, g, b] = pintar(x / lado * 2 - 1, y / lado * 2 - 1), i = (y * lado + x) * 4;
    datos[i] = Math.min(255, r * 255); datos[i + 1] = Math.min(255, g * 255); datos[i + 2] = Math.min(255, b * 255); datos[i + 3] = 255;
  }
  const t = new THREE.DataTexture(datos, lado, lado, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}
const mezcla = (p, q, t) => p.map((v, k) => v + (q[k] - v) * Math.min(1, Math.max(0, t)));

// Imagen del Ojo: anillo de nudos con fibras radiales (dorado por dentro, rojo por fuera), interior azul.
function imagenOjo(lado) {
  const n = ruido2D(616);
  return textura(lado, (x, y) => {
    const r = Math.hypot(x, y), a = Math.atan2(y, x), u = (a / Math.PI + 1) * 0.5;
    // Fibras: ruido muy estirado en el ángulo (muchas vetas radiales) y nudos.
    const fibras = n(u * 140, r * 3, 3), nudos = n(u * 60 + 7, r * 14, 4), borde = n(u * 12 + 3, 1.5, 3);
    const rIn = 0.42 + (borde - 0.5) * 0.08, rOut = 0.8 + (borde - 0.5) * 0.12;
    const anillo = suave(rIn - 0.05, rIn + 0.06, r) * (1 - suave(rOut - 0.12, rOut + 0.1, r));
    const x0 = (r - rIn) / (rOut - rIn);
    const cr = x0 < 0.35 ? mezcla([1.0, 0.78, 0.38], [1.0, 0.45, 0.12], x0 / 0.35) : mezcla([1.0, 0.45, 0.12], [0.7, 0.12, 0.08], (x0 - 0.35) / 0.65);
    const kAnillo = anillo * (0.35 + 0.9 * Math.pow(fibras, 2.2) + 0.8 * Math.pow(nudos, 3));
    // Interior azul turquesa, más oscuro en el centro, con fibras finas azuladas.
    const interior = Math.exp(-Math.pow(r / 0.42, 4)) * (1 - Math.exp(-Math.pow(r / 0.16, 2)) * 0.75) * (0.55 + 0.6 * n(x * 3 + 9, y * 3, 4));
    const azul = mezcla([0.12, 0.3, 0.95], [0.15, 0.75, 0.8], n(x * 2 + 4, y * 2 + 1, 3));
    const vetas = interior * Math.pow(n(u * 200 + 1, r * 2, 2), 6) * 1.2;
    // Halo rojo exterior, tenue.
    const halo = suave(0.75, 0.9, r) * (1 - suave(0.92, 1.0, r)) * n(u * 30, r * 5, 4) * 0.35;
    return [cr[0] * kAnillo + azul[0] * interior * 0.55 + 0.6 * vetas + 0.6 * halo,
            cr[1] * kAnillo + azul[1] * interior * 0.55 + 0.75 * vetas + 0.12 * halo,
            cr[2] * kAnillo + azul[2] * interior * 0.55 + 1.0 * vetas + 0.08 * halo];
  });
}

// Imagen de la nube de fuego (como una nebulosa de polvo iluminada desde dentro): nube alargada y
// desgarrada, con jirones en los bordes, carriles de polvo (tonos rojizos, no puntos negros) y un núcleo
// amarillo blanco del que salen rayos de luz entre el polvo.
function imagenFuego(lado) {
  const n = ruido2D(1607), m = ruido2D(1611);
  return textura(lado, (x, y) => {
    const c = Math.cos(-0.55), s = Math.sin(-0.55), u = x * c - y * s, v = x * s + y * c;   // eje inclinado
    // Borde desgarrado: la forma se deforma con ruido (jirones), sin bordes redondos.
    const wu = u + (n(x * 2.5, y * 2.5, 4) - 0.5) * 0.5, wv = v + (n(x * 2.5 + 9, y * 2.5, 4) - 0.5) * 0.4;
    const forma = Math.exp(-Math.pow(wu / 0.7, 2) - Math.pow(wv / 0.34, 2));
    const turb = n(x * 4 + 2, y * 4, 5), fino = n(x * 14, y * 14 + 5, 4), jirones = Math.pow(m(x * 6 + 3, y * 6, 5), 2);
    const nube = Math.max(0, forma * (0.45 + turb * 0.9 + jirones * 0.6) - 0.3);
    // Carriles de polvo: oscurecen la nube y la vuelven roja oscura (no negra).
    const carril = Math.pow(Math.max(0, n(x * 3 + 20, y * 5 + 4, 4) - 0.45) * 2.4, 1.5) * forma;
    // Núcleo encendido con rayos de luz.
    const nx = x - 0.06, ny = y + 0.03, rn = Math.hypot(nx, ny), rayos = Math.pow(m(Math.atan2(ny, nx) * 5 + 10, rn * 1.2, 3), 2.5);
    const nucleo = Math.exp(-Math.pow(rn / 0.09, 2)) * 2.2 + Math.exp(-rn / 0.22) * 0.9 + Math.exp(-rn / 0.4) * rayos * 0.9 * forma;
    const calor = Math.min(1, nucleo * 0.6 + nube * 0.4);
    let col = [1.0, 0.32 + 0.55 * calor, 0.08 + 0.6 * Math.max(0, calor - 0.45)];
    col = mezcla(col, [0.55, 0.12, 0.08], Math.min(1, carril * 1.2));   // polvo rojizo
    const k = (nube * (0.8 + 0.5 * fino) * (1 - Math.min(0.75, carril)) + nucleo) * 1.5;
    return [col[0] * k, col[1] * k, col[2] * k];
  });
}

// Partículas con tamaño real en el mundo. modo: 'luz' (aditivo) o 'polvo' (oscurece lo de detrás).
function particulas(datos, { uScale, uPR, limite = 12, modo = 'luz', suaves = false }) {
  const n = datos.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tam = new Float32Array(n);
  datos.forEach((d, i) => { pos.set([d[0], d[1], d[2]], i * 3); col.set([d[3].r, d[3].g, d[3].b], i * 3); tam[i] = d[4]; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
  const polvo = modo === 'polvo';
  const m = new THREE.ShaderMaterial({
    uniforms: { uScale, uPR, uLim: { value: limite }, uVis: { value: 1 } },
    vertexShader: /* glsl */`uniform float uScale, uPR, uLim, uVis; attribute vec3 aCol; attribute float aTam; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float s = aTam * length(modelViewMatrix[0].xyz) * uScale / max(1e-3, -mv.z), lim = uLim * uPR;
        gl_PointSize = clamp(s, 1.0, lim);
        vA = uVis * min(1.0, s) * (1.0 - smoothstep(lim * 0.6, lim, s)); vC = aCol; }`,
    fragmentShader: /* glsl */`varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
        float k = ${suaves ? 'exp(-d * d * 2.4) * (1.0 - d)' : 'exp(-d * d * 5.0) + exp(-d * 14.0) * 0.4'} * vA;
        ${polvo ? 'gl_FragColor = vec4(vC, k * 0.3);' : 'gl_FragColor = vec4(vC * k, k);'} }`,
    transparent: true, depthWrite: false, blending: polvo ? THREE.NormalBlending : THREE.AdditiveBlending
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = polvo ? -1.5 : -2; return p;
}

// ── El Ojo: nebulosa volumétrica con su imagen, la estrella central y unas estrellas azules cerca ──
function crearOjo(R, o) {
  const g = new THREE.Group(), lado = esMovil ? 384 : 512;
  const nube = crearNube(imagenOjo(lado), new THREE.Vector3(), R, 77, 1, 7);
  nube.position.set(0, 0, 0); nube.scale.set(R * 2.1, R * 2.1, R * 0.5); nube.userData.brilloPropio = true; g.add(nube);
  const a = azarSemilla(61), estrellas = [[0, 0, 0, C('#f4f8ff').multiplyScalar(3), R * 0.01]];
  for (let i = 0; i < 9; i++) { const th = a() * Math.PI * 2, r = R * (0.9 + a() * 0.8); estrellas.push([Math.cos(th) * r, Math.sin(th) * r, gauss(a) * R * 0.3, C('#8fc0ff').multiplyScalar(2.2), R * (0.012 + a() * 0.01)]); }
  g.add(particulas(estrellas, { ...o, limite: 40 }));
  return { grupo: g, nube };
}

// ── La nube de fuego: volumen con su imagen, polvo oscuro por delante, bruma roja y estrellas ──
function crearFuego(R, o) {
  const g = new THREE.Group(), lado = esMovil ? 384 : 512, a = azarSemilla(1609);
  const nube = crearNube(imagenFuego(lado), new THREE.Vector3(), R, 91, 1, 7);
  nube.position.set(0, 0, 0); nube.scale.set(R * 2.4, R * 2.4, R * 0.9); nube.userData.brilloPropio = true; g.add(nube);
  const bruma = [], polvo = [], estrellas = [];
  for (let i = 0; i < 700 * K; i++) { const v = new THREE.Vector3(gauss(a) * 1.3, gauss(a) * 0.9, gauss(a) * 0.6).multiplyScalar(R); bruma.push([v.x, v.y, v.z, C('#b8284a').lerp(C('#e0603a'), a()).multiplyScalar(0.03 + a() * 0.02), R * (0.3 + a() * 0.3)]); }
  for (let i = 0; i < 500 * K; i++) { const t = gauss(a), v = new THREE.Vector3(t * R * 0.8, -t * R * 0.45 + gauss(a) * R * 0.12 - R * 0.18, R * 0.35 + gauss(a) * R * 0.1); polvo.push([v.x, v.y, v.z, C('#1e0c06'), R * (0.1 + a() * 0.12)]); }
  for (let i = 0; i < 260; i++) { const v = new THREE.Vector3(gauss(a), gauss(a), gauss(a)).multiplyScalar(R * 1.4); estrellas.push([v.x, v.y, v.z, C('#ffffff').multiplyScalar(1.2 + a()), R * 0.008]); }
  // Sin partículas de polvo ni de bruma (se veían como puntos negros y rojos): el volumen ya tiene su gas y su polvo.
  g.add(particulas(estrellas, { ...o, limite: 6 }));
  return { grupo: g, nube };
}

// ── La nube de las burbujas (región de estrellas nacientes, como la foto de una irregular enana):
// forma irregular y alargada, estrellas doradas finísimas con carriles de polvo, cúmulos azules que
// centellean, burbujas rosas hechas de filamentos y un velo turquesa con zonas oscuras. ──
function crearEnana(R, o) {
  // Una nebulosa con volumen (como el Ojo): una nube irregular turquesa y dorada con burbujas rosas, sin
  // puntos sueltos.
  const n = ruido2D(921), m = ruido2D(923), lado = esMovil ? 384 : 512;
  const burbujas = Array.from({ length: 9 }, (_, k) => { const a = azarSemilla(930 + k); return [(a() - 0.5) * 0.9, (a() - 0.5) * 0.9, 0.06 + a() * 0.1]; });
  const img = textura(lado, (x, y) => {
    const wx = x + (n(x * 2 + 3, y * 2, 4) - 0.5) * 0.5, wy = y + (n(x * 2, y * 2 + 7, 4) - 0.5) * 0.5;
    const forma = Math.exp(-Math.pow(wx / 0.62, 2) - Math.pow(wy / 0.72, 2)), turb = n(x * 4, y * 4, 5), fino = m(x * 12, y * 12, 4);
    const cuerpo = Math.max(0, forma * (0.4 + turb) - 0.25);
    let col = mezcla([0.15, 0.6, 0.6], [1.0, 0.78, 0.45], smoothsiempre(turb));
    let k = cuerpo * (0.6 + 0.6 * fino);
    // Burbujas rosas: cáscaras brillantes con fibras.
    let rosa = 0; for (const [bx, by, br] of burbujas) { const d = Math.hypot(x - bx, y - by); rosa += Math.exp(-Math.pow((d - br) / (br * 0.18), 2)) * (0.6 + 0.6 * m(Math.atan2(y - by, x - bx) * 3, d * 20, 3)); }
    rosa *= forma;
    return [col[0] * k + 0.45 * rosa, col[1] * k + 0.18 * rosa, col[2] * k + 0.3 * rosa].map(v => v * 1.5);   // burbujas sutiles
  });
  const g = new THREE.Group(), nube = crearNube(img, new THREE.Vector3(), R, 33, 1, 7);
  nube.position.set(0, 0, 0); nube.scale.set(R * 2.2, R * 2.4, R * 0.7); nube.userData.brilloPropio = true; g.add(nube);
  return { grupo: g, nube };
}
const smoothsiempre = t => { const x = Math.min(1, Math.max(0, (t - 0.35) / 0.35)); return x * x * (3 - 2 * x); };

// ── La espiral de hebras (radio R < Xiomara) ──
function crearEspiralHebras(R, o) {
  const a = azarSemilla(1213), hebras = [], estrellas = [];
  // Hebras: muchas cadenas finas a lo largo de los brazos, cada una una curva propia (no una nube).
  for (let k = 0, nh = Math.round(900 * K); k < nh; k++) {
    const brazo = Math.floor(a() * 3), r0 = R * (0.08 + a() * 0.85), largo = R * (0.08 + a() * 0.2), giro = gauss(a) * 0.25, tono = a();
    for (let i = 0; i < 40; i++) {
      const r = r0 + largo * i / 40, th = Math.log(r / (R * 0.05)) / 0.3 + brazo * Math.PI * 2 / 3 + giro + Math.sin(i * 0.3 + k) * 0.03;
      hebras.push([Math.cos(th) * r, Math.sin(th) * r, gauss(a) * R * 0.01, C('#8a4a22').lerp(C('#e0a060'), tono).multiplyScalar(0.55 + a() * 0.3), R * 0.035]);
    }
  }
  // Estrellas azules y nudos rosas a lo largo de los brazos; núcleo azul brillante.
  for (let i = 0, n = Math.round(9000 * K); i < n; i++) { const r = R * (0.06 + Math.pow(a(), 0.8) * 0.9), brazo = Math.floor(a() * 3), th = Math.log(r / (R * 0.05)) / 0.3 + brazo * Math.PI * 2 / 3 + gauss(a) * 0.22;
    estrellas.push([Math.cos(th) * r, Math.sin(th) * r, gauss(a) * R * 0.015, (a() < 0.88 ? C('#a8d4ff') : C('#ff7aa0')).multiplyScalar(1 + a()), R * (0.03 + a() * 0.03)]); }
  for (let i = 0; i < 2500 * K; i++) { const r = Math.abs(gauss(a)) * R * 0.07, th = a() * Math.PI * 2; estrellas.push([Math.cos(th) * r, Math.sin(th) * r, gauss(a) * R * 0.02, C('#5ab8ff').multiplyScalar(1.6), R * 0.04]); }
  const g = new THREE.Group(); g.add(particulas(hebras, { ...o, limite: 8 }), particulas(estrellas, { ...o, limite: 6 }));
  return { grupo: g };
}

// Dónde está cada maravilla: respecto a la cámara de llegada de un gigante (ángulo desde la mirada de
// llegada, giro alrededor de ella: 90 y 270 son los lados, y distancia), y su radio. La única galaxia
// (la espiral de hebras) es menor que Xiomara (980).
export const MARAVILLAS = Object.freeze([
  // Muy por detrás de la supernova (vista desde la llegada), grandes: al alejarse y girar no quedan al lado.
  { id: 'ojo', destino: 'supernova', ang: 30, giro: 90, distancia: 9000000 * LEJANIA, radio: 930000 * LEJANIA },
  { id: 'fuego', destino: 'supernova', ang: 29, giro: 270, distancia: 8500000 * LEJANIA, radio: 1080000 * LEJANIA },
  { id: 'hebras', destino: 'ton618', ang: 24, giro: 90, distancia: 22000 * LEJANIA, radio: 900 }
]);

export function crearMaravillas({ scene, uScale, uPR, centros }) {
  const raiz = new THREE.Group(); raiz.name = 'Maravillas'; raiz.userData.profundo = true; scene.add(raiz);
  const o = { uScale, uPR }, creadas = [];
  for (const m of MARAVILLAS) {
    const C0 = centros[m.destino], eje = C0.clone().normalize(), camara = C0.clone().addScaledVector(eje, -LLEGADA_GIGANTE[m.destino]);
    const u1 = new THREE.Vector3().crossVectors(eje, new THREE.Vector3(0, 1, 0)).normalize();
    const dir = eje.clone().applyAxisAngle(u1, THREE.MathUtils.degToRad(m.ang)).applyAxisAngle(eje, THREE.MathUtils.degToRad(m.giro)).normalize();
    const pos = camara.clone().addScaledVector(dir, m.distancia);
    const hecho = m.id === 'ojo' ? crearOjo(m.radio, o) : m.id === 'fuego' ? crearFuego(m.radio, o) : m.id === 'enana' ? crearEnana(m.radio, o) : crearEspiralHebras(m.radio, o);
    const g = hecho.grupo; g.position.copy(pos);
    // De cara a la llegada; las galaxias algo inclinadas (con volumen), las nebulosas de frente.
    g.lookAt(camara);
    if (hecho.nube) { hecho.nube.quaternion.identity(); if (m.id === 'fuego') hecho.nube.rotateZ(0.3); }
    else g.rotateX(m.id === 'hebras' ? 0.45 : 0.2);
    g.userData.id = m.id; raiz.add(g); creadas.push({ ...m, pos, grupo: g });
  }
  const materiales = []; raiz.traverse(x => { if (x.material?.uniforms?.uVis) materiales.push([x.material, x.material.uniforms.uVis.value]); });
  let anterior = -1;
  return { raiz, maravillas: creadas,
    // En casa, más discretas (la protagonista es Xiomara); lejos de ella, con todo su brillo.
    // Lejísimos de casa: desde Xiomara no se ven; aparecen poco a poco al alejarse de ella.
    // Cada maravilla solo se ve desde la zona de su gigante (nunca desde casa): aparece diminuta a lo lejos y
    // crece poco a poco al acercarse (por perspectiva), sin encenderse de golpe.
    actualizar(t, dt, { camera }) {
      let vis = false;
      for (const m of creadas) { const L = centros[m.destino].length(), d = camera.position.distanceTo(centros[m.destino]);
        const k = 1 - THREE.MathUtils.smoothstep(d, L * 0.55, L * 0.8); m.grupo.visible = k > 0.002; vis ||= m.grupo.visible;
        m.grupo.traverse(x => { const u = x.material?.uniforms; if (u?.uVis) u.uVis.value = (x.userData.visBase ??= u.uVis.value) * k; if (u?.uBrillo && x.userData.volumen3D) u.uOpacidad.value = k; }); }
      // Las nebulosas (el Ojo, el fuego) miran siempre a la cámara: desde cualquier camino se ven de frente, sin voltearse.
      for (const m of creadas) if (m.grupo.visible && (m.id === 'ojo' || m.id === 'fuego')) { m.grupo.lookAt(camera.position); if (m.id === 'fuego') m.grupo.rotateZ(0.3); }
      raiz.visible = vis; return; if (Math.abs(k - anterior) < 0.002) return; anterior = k; for (const [m, b] of materiales) m.uniforms.uVis.value = b * k; } };
}
