// Campo de galaxias con posición, orientación y tamaño físico fijos (no miran a la cámara ni
// cambian de tamaño). Dos niveles de detalle de la MISMA galaxia, en el mismo plano de su disco:
//  · de lejos, su imagen (instancias por tipo): una galaxia no resuelta es su luz integrada; por
//    debajo de ~1,5 px su brillo baja con el área que ocupa (no se apaga por un umbral);
//  · de cerca, sus estrellas en 3D (brazos, barra, bulbo, espesor del disco).
// El paso de una a otra es un fundido según su radio en pantalla (35–80 px), sin saltos. De
// cerca la imagen no se apaga del todo: la mayor parte de la luz de una galaxia es difusa (estrellas
// no resueltas); las estrellas 3D son las resueltas y se suman. Así la luz total no se desploma.
// Las estrellas 3D de cada galaxia se generan al acercarse (antes de que se vean: a ~24 px de radio,
// el fundido empieza a 35) con una semilla propia de su identificador, en coordenadas LOCALES (la
// GPU recibe posiciones relativas a la cámara: precisión de sobra a millones de unidades), y se
// liberan al alejarse. Siempre son las mismas estrellas: misma semilla, misma forma.
import * as THREE from 'three';
import { generador, semillaDe, deUnTiron } from '../util/azarSemilla.js';
import { PALETAS_GALAXIA } from './texturasPlaneta.js';
import { componentesGalaxia, componentesAndromeda, componentesColision, paso } from './formasGalaxia.js';
import { crearRuido } from '../util/ruido.js';
import { vista } from '../util/vista.js';

const gauss = (rnd = Math.random) => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
// Compresión perceptiva de la luz no resuelta (licencia declarada, como el tamaño de las estrellas en
// un planetario): por debajo de 1,5 px de radio el flujo baja como px^(2·GAMMA) en vez de px², así
// las galaxias lejanas se ven como luces diminutas en lugar de desaparecer. Por encima de 1,5 px no
// cambia nada (la luz es la de su imagen): la transición luz → imagen sigue siendo continua.
export const GAMMA_LUZ = 0.5;

// Estrellas 3D de una galaxia a partir de su DESCRIPTOR: se muestrean de las MISMAS intensidades
// con las que se pinta su imagen (formasGalaxia.js), en una rejilla del plano del disco. Bulbo,
// barra, brazos (con su perturbación), anillo, núcleos, colas de marea, cúmulos y nudos quedan en
// el mismo sitio y con la misma orientación; el polvo resta estrellas donde oscurece la imagen.
// Componente de cada estrella: 0 población vieja (bulbo, disco, núcleos), 1 joven (brazos, anillo,
// cúmulos, colas), 2 regiones HII.
const N_REJILLA = 72, mapas = new Map();
export function mapaGalaxia(d) { return deUnTiron(prepararMapaGalaxia(d)); }
// El mismo mapa por tramos (un generador, con yield cada 6 filas de la rejilla): la carga los prepara todos cediendo.
export function* prepararMapaGalaxia(d) {
  const clave = `${d.tipo}/${d.especial || ''}/${d.semilla}/${d.brazos}/${d.enrollado}`;
  if (mapas.has(clave)) return mapas.get(clave);
  const luz = (PALETAS_GALAXIA[d.paleta] || PALETAS_GALAXIA.clasica).map(c => (c[0] + c[1] + c[2]) / 3);
  const R = crearRuido(d.semilla), n = N_REJILLA, peso = new Float32Array(n * n * 3), acumulado = new Float64Array(n * n);
  let total = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (x === 0 && y % 6 === 5) yield;
    const u = (x + 0.5) / n * 2 - 1, v = (y + 0.5) / n * 2 - 1, j = y * n + x;
    if (Math.hypot(u, v) < 0.98) {
      let c0, c1, c2, polvo;
      // Cada componente pesa lo que aporta a la LUZ de la imagen: su intensidad por la luminosidad
      // media del color con que la pinta el generador (texturasPlaneta.js).
      if (d.especial === 'andromeda') { const k = componentesAndromeda(u, v, R, d.semilla); c0 = Math.min(2.4, k.bulbo) * 0.84 + k.discoViejo * 0.88 + Math.exp(-k.r / 0.55) * 0.06 * 0.89; c1 = k.jovenes * 0.77; c2 = k.nudo * 0.9 * 0.68; polvo = k.polvo; }
      else if (d.especial === 'colision') { const k = componentesColision(u, v, R, d.semilla); c0 = k.nucleos * 0.71 + k.cuerpo * 0.55 * (0.65 + k.grano * 0.7) * 0.84; c1 = (k.centro * 1.1 + k.cuerpo * 0.4) * k.cumulos * 1.5 * 0.76 + k.colas * (0.12 + k.grano * 0.3 + k.cumulos * 0.6) * 0.81; c2 = (k.nudos * 2 * 0.66 + k.colas * k.nudos * 0.6 * 0.73); polvo = k.polvo; }
      else { const k = componentesGalaxia(d.tipo, u, v, R, d.semilla, d.brazos, d.enrollado), [lb, lj, lh] = luz; c0 = k.bulbo * lb + k.disco * 0.1 * 0.89; c1 = (k.jovenes * (d.tipo === 'irregular' ? 1 : 1.15) + k.cumulos) * lj; c2 = k.nudo * (d.tipo === 'irregular' ? 1 : 2.2) * lh; polvo = k.polvo; }
      // El mismo viñeteado del borde que la imagen (nunca se ve un borde recto).
      const r = Math.hypot(u, v), borde = d.especial === 'andromeda' ? 1 - paso(0.86, 0.995, r) : d.especial === 'colision' ? 1 - paso(0.85, 0.995, r) : 1 - paso(0.5, 0.97, r);
      const claro = (1 - polvo) * borde;
      peso[j * 3] = c0 * claro; peso[j * 3 + 1] = c1 * claro; peso[j * 3 + 2] = c2 * claro;
      total += (c0 + c1 + c2) * claro;
    }
    acumulado[j] = total;
  }
  const mapa = { n, peso, acumulado, total };
  mapas.set(clave, mapa); return mapa;
}
export function estrellaGalaxia(d, rnd = Math.random) { const o = new Float64Array(4); estrellaEn(mapaGalaxia(d), d, rnd, o); return Array.from(o); }
// La misma estrella escribiendo en `o` (sin crear objetos: se llama miles de veces al acercarse a una galaxia).
function estrellaEn(m, d, rnd, o) {
  const objetivo = rnd() * m.total;
  let lo = 0, hi = m.n * m.n - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (m.acumulado[mid] < objetivo) lo = mid + 1; else hi = mid; }
  const x = lo % m.n, y = (lo / m.n) | 0, u = (x + rnd()) / m.n * 2 - 1, v = (y + rnd()) / m.n * 2 - 1;
  const w0 = m.peso[lo * 3], w1 = m.peso[lo * 3 + 1], w2 = m.peso[lo * 3 + 2], e = rnd() * (w0 + w1 + w2);
  const comp = e < w0 ? 0 : e < w0 + w1 ? 1 : 2, r = Math.hypot(u, v);
  const espesor = d.tipo === 'eliptica' ? 0.45 * Math.exp(-r * 2) : comp === 0 ? 0.05 * (1 - r) + 0.01 : 0.015 * (1 - r * 0.5);
  o[0] = u; o[1] = v; o[2] = gauss(rnd) * espesor; o[3] = comp;
}

// Tamaño aparente (px) de una galaxia según su DISTANCIA a la cámara (sin cierres por cuadro: nada de memoria nueva).
const pxDe = (g, cx, cy, cz, f) => { const p = g.pos, dx = p.x - cx, dy = p.y - cy, dz = p.z - cz; return g.radio * f / Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz)); };

export function crearCampoGalaxias({ lista, texturas, descriptores, uPR }) {
  // Carga completa: el mapa de estrellas de cada tipo de galaxia se calcula ya (no la primera vez que una crece en pantalla).
  for (const d of Object.values(descriptores)) if (d) mapaGalaxia(d);
  const grupo = new THREE.Group();
  const uFocal = { value: 780 };
  // ── De lejos: imágenes en el plano del disco, por tipo ──
  const porTipo = new Map();
  for (const g of lista) { const t = g.textura ?? g.tipo; if (!porTipo.has(t)) porTipo.set(t, []); porTipo.get(t).push(g); }
  const m = new THREE.Matrix4(), esc = new THREE.Vector3(), color = new THREE.Color(), imagenes = [];
  for (const [t, gs] of porTipo) {
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: { uMapa: { value: texturas[t] }, uFocal },
      vertexShader: `uniform float uFocal; attribute float aBeta; varying vec2 vUv; varying vec3 vC; varying float vF;
        void main(){ vUv = uv; vC = vec3(1.0);
          #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
          #endif
          vec4 c = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          // Radio en pantalla con la profundidad en la vista (no la distancia euclídea): fuera del
          // eje una galaxia se proyecta más grande y el detalle debe llegar antes.
          float px = length(instanceMatrix[0].xyz) * 0.5 / max(1.0, -(viewMatrix * c).z) * uFocal;
          // Conservación de la luz: la imagen cede a las estrellas 3D exactamente la luz que ellas
          // aportan. Las estrellas tienen tamaño fijo en píxeles (su luz no crece al acercarse) y la
          // imagen crece con el área (∝ px²); aBeta es la razón estrellas/imagen a 80 px.
          // La luz total de un disco transparente no depende de su inclinación: inclinado ocupa menos
          // área (× coseno) pero su brillo superficial sube en la misma proporción. La imagen compensa
          // el coseno (con un tope de canto) y así su flujo es el de la galaxia de frente.
          float coseno = max(0.2, abs(dot(normalize(mat3(modelMatrix) * instanceMatrix[2].xyz), normalize(cameraPosition - c.xyz))));
          // Fuera del eje la imagen se proyecta más grande (∝ distancia/profundidad) y las estrellas no.
          vec4 cv = viewMatrix * c; float estira = length(cv.xyz) / max(1.0, -cv.z);
          float estrellas = smoothstep(35.0, 80.0, px) * aBeta * (80.0 / px) * (80.0 / px) / estira;
          // Por debajo de ~3 px la galaxia es una luz no resuelta (luzNoResuelta): la imagen entra al crecer.
          vF = smoothstep(1.5, 3.5, px) * max(0.0, 1.0 - estrellas) / coseno;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: 'precision mediump float; uniform sampler2D uMapa; varying vec2 vUv; varying vec3 vC; varying float vF; void main(){ if (vF < 0.004) discard; gl_FragColor = vec4(texture2D(uMapa, vUv).rgb * vC * vF, 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), gs.length);
    gs.forEach((g, i) => { m.compose(g.pos, g.quaternion, esc.set(g.radio * 2, g.radio * 2, g.radio * 2)); im.setMatrixAt(i, m); im.setColorAt(i, color.setScalar(g.op)); g.instancia = { im, i, textura: texturas[t] }; });
    im.geometry.setAttribute('aBeta', new THREE.InstancedBufferAttribute(new Float32Array(gs.length).fill(0.45), 1));   // provisional hasta medir la textura
    im.frustumCulled = false; im.renderOrder = -2; grupo.add(im); imagenes.push(im);
  }
  // ── De cerca: estrellas en 3D de cada galaxia, generadas al acercarse (ver cabecera) ──
  const mat = new THREE.ShaderMaterial({ uniforms: { uFocal, uPR },
    vertexShader: `attribute vec3 aColor; attribute float aRadio, aTam; uniform float uFocal, uPR; varying vec3 vC; varying float vA;
      void main(){ float px = aRadio / max(1.0, -(modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z) * uFocal;   // como la imagen: profundidad en la vista
        vA = smoothstep(35.0, 80.0, px); vC = aColor;
        gl_PointSize = vA > 0.004 ? aTam * uPR : 0.0;
        gl_Position = vA > 0.004 ? projectionMatrix * modelViewMatrix * vec4(position, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`,
    fragmentShader: 'precision mediump float; varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = pow(1.0 - d * 2.0, 1.6) * vA; gl_FragColor = vec4(vC * a, a); }',
    // premultipliedAlpha: el color ya lleva el alfa (vC·a); sin esto WebGL lo multiplicaba otra vez
    // por a y el fundido de las estrellas era a² (más apagado y más brusco que el de la imagen).
    transparent: true, premultipliedAlpha: true, depthWrite: false, blending: THREE.AdditiveBlending });
  // Muestra oculta con este material: la carga (que compila todo lo que hay en la escena) prepara ya su programa de GPU,
  // y la primera galaxia cercana de un viaje no lo compila en pleno vuelo.
  const geoMuestra = new THREE.BufferGeometry();
  for (const [n, k] of [['position', 3], ['aColor', 3], ['aRadio', 1], ['aTam', 1]]) geoMuestra.setAttribute(n, new THREE.BufferAttribute(new Float32Array(k), k));
  const muestra = new THREE.Points(geoMuestra, mat); muestra.visible = false; muestra.frustumCulled = false; muestra.renderOrder = -2; grupo.add(muestra);
  const v = new THREE.Vector3(), c = new THREE.Color(), activas = new Set(), p = new Float64Array(4); let turno = 0;
  const BETA_MAX = 0.6, luzTextura = new Map();
  // Luminancia media REAL de una imagen (cuando el generador la ha rellenado).
  const mediaLuz = t => { if (luzTextura.has(t)) return luzTextura.get(t); const datos = t.image?.data; if (!datos) return null; let suma = 0; for (let j = 0; j < datos.length; j += 4) suma += 0.2126 * datos[j] + 0.7152 * datos[j + 1] + 0.0722 * datos[j + 2]; const media = suma / (datos.length / 4) / 255; if (media < 1e-4) return null; luzTextura.set(t, media); return media; };
  // Las estrellas ya creadas se guardan (las ~60 últimas galaxias): si se vuelve a acercar, reaparecen sin recalcular ni
  // crear memoria nueva (antes, girando cerca de un gigante se creaban y borraban miles de estrellas en cada cuadro).
  const guardadas = new Map(), GUARDAR = 60, pendientes = new Map();
  // Reserva de geometrías para las estrellas de cerca (GUARDAR guardadas + las que se ven a la vez): se crean aquí y se
  // suben a la GPU en la carga (están en la escena, ocultas, y la carga lo dibuja todo una vez). Al acercarse a una galaxia
  // se rellena un hueco (bufferSubData) en vez de crear búferes nuevos durante el vuelo.
  const N_ESTRELLAS = lista.reduce((m, g) => Math.max(m, g.puntos || 0), 0), RESERVA = N_ESTRELLAS ? GUARDAR + 24 : 0;
  const nuevaGeometria = (n, pos, col, radio, tam, r) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aRadio', new THREE.BufferAttribute(radio, 1)); geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), r * 1.2);
    const pts = new THREE.Points(geo, mat); pts.renderOrder = -2; pts.matrixAutoUpdate = false; return pts;
  };
  const libres = [];
  for (let k = 0; k < RESERVA; k++) {
    const n = N_ESTRELLAS, pts = nuevaGeometria(n, new Float32Array(n * 3), new Float32Array(n * 3), new Float32Array(n), new Float32Array(n), 1);
    for (const at of Object.values(pts.geometry.attributes)) at.setUsage(THREE.DynamicDrawUsage);
    pts.userData.reserva = true; pts.visible = false; pts.frustumCulled = false; grupo.add(pts); libres.push(pts);
  }
  const hueco = n => { if (n > N_ESTRELLAS) return null; const pts = libres.pop() ?? null; if (pts) pts.frustumCulled = true; return pts; };
  // Generar las 1950 estrellas de una galaxia cuesta varios ms con la CPU de un móvil (decenas la primera vez, con el
  // código aún sin optimizar): en pleno viaje era un tirón cada vez que una galaxia cruzaba los 24 px. Ahora se generan a
  // trozos (un generador que cede cada 128 estrellas) repartidos en varios cuadros con un presupuesto fijo (actualizar);
  // crearEstrellas las genera de una vez (diagnóstico). Mismas estrellas: misma semilla, mismo orden.
  function crearEstrellas(g) { return deUnTiron(generarEstrellas(g)); }
  function* generarEstrellas(g) {
    const vieja = guardadas.get(g.id);
    if (vieja) { guardadas.delete(g.id); if (vieja.parent !== grupo) grupo.add(vieja); vieja.visible = true; g.estrellas = vieja; activas.add(g); g.flujoEstrellas = vieja.userData.flujo; const ab = g.instancia.im.geometry.attributes.aBeta; ab.array[g.instancia.i] = vieja.userData.beta; ab.needsUpdate = true; return vieja; }
    const rnd = generador(semillaDe(`estrellas-${g.id}`)), n = g.puntos;
    const d = descriptores[g.textura ?? g.tipo] ?? descriptores[0], cols = (PALETAS_GALAXIA[d.paleta] || PALETAS_GALAXIA.clasica).map(x => new THREE.Color(...x));
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), radio = new Float32Array(n).fill(g.radio), tam = new Float32Array(n);
    let flujo = 0;
    const m = mapaGalaxia(d);
    for (let i = 0; i < n; i++) {
      if ((i & 127) === 127) yield;
      estrellaEn(m, d, rnd, p); v.set(p[0], -p[1], p[2]).multiplyScalar(g.radio).applyQuaternion(g.quaternion);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      c.copy(cols[p[3]]).lerp(cols[1], p[3] === 0 ? rnd() * 0.15 : 0).multiplyScalar(g.op); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      tam[i] = 1.0 + rnd() * 1.4;
      // (La imagen se sube con flipY: su fila 0, v = −1, queda ARRIBA del plano; por eso la estrella
      // va en −v. Sin esto las estrellas eran el reflejo de la imagen: brazos con el giro invertido.)
      // Luz de la estrella en el búfer: luminancia × ∫ perfil del punto (0,1678·tamaño²).
      flujo += (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) * 0.1678 * tam[i] * tam[i];
    }
    // Las estrellas resueltas no pueden dar más luz que la galaxia: como mucho el 60 % de su imagen a
    // 80 px; la imagen cede a las estrellas exactamente la luz que ellas aportan (aBeta).
    const media = mediaLuz(g.instancia.textura) ?? 0.12;
    let beta = flujo / (media * g.op * 160 * 160);
    if (beta > BETA_MAX) { const k = BETA_MAX / beta; for (let j = 0; j < col.length; j++) col[j] *= k; flujo *= k; beta = BETA_MAX; }
    const a = g.instancia.im.geometry.attributes.aBeta; a.array[g.instancia.i] = beta; a.needsUpdate = true;
    g.flujoEstrellas = flujo;
    // En un hueco de la reserva (búferes ya en la GPU desde la carga): solo se actualizan sus datos, sin crear geometría en
    // pleno viaje (antes, cuatro bufferData por galaxia que crecía en pantalla). Sin hueco libre, una nueva (como antes).
    const pts = hueco(n);
    if (pts) { const at = pts.geometry.attributes; at.position.array.set(pos); at.aColor.array.set(col); at.aRadio.array.set(radio); at.aTam.array.set(tam);
      for (const k of ['position', 'aColor', 'aRadio', 'aTam']) at[k].needsUpdate = true; pts.geometry.setDrawRange(0, n); pts.geometry.boundingSphere.radius = g.radio * 1.2; }
    const usar = pts ?? nuevaGeometria(n, pos, col, radio, tam, g.radio);
    usar.position.copy(g.pos); usar.userData.galaxia = g.id; usar.updateMatrix(); usar.visible = true;
    if (usar.parent !== grupo) grupo.add(usar);
    g.estrellas = usar; activas.add(g);
    return usar;
  }
  function liberarEstrellas(g) {
    if (!g.estrellas) return; const pts = g.estrellas; g.estrellas = null; activas.delete(g);
    if (pts.userData.reserva) pts.visible = false; else grupo.remove(pts);
    pts.userData.flujo = g.flujoEstrellas; pts.userData.beta = g.instancia.im.geometry.attributes.aBeta.array[g.instancia.i];
    guardadas.set(g.id, pts);
    if (guardadas.size > GUARDAR) { const [id, viejo] = guardadas.entries().next().value; guardadas.delete(id); if (viejo.userData.reserva) libres.push(viejo); else viejo.geometry.dispose(); }
  }
  // ── Muy lejos: luz no resuelta. Un punto por galaxia, en su centro, con el FLUJO de su propia
  // imagen (color medio × área proyectada, que crece con px² y con el coseno de su inclinación):
  // al alejarse baja como 1/d², sin umbral; entre 1,5 y 3,5 px de radio se funde con la imagen y
  // la luz total no cambia. Es la misma galaxia desde el principio: no una estrella distinta. ──
  const nLuz = lista.length, pLuz = new Float32Array(nLuz * 3), rLuz = new Float32Array(nLuz), nrmLuz = new Float32Array(nLuz * 3), cLuz = new Float32Array(nLuz * 3);
  lista.forEach((g, k) => { pLuz.set(g.pos.toArray(), k * 3); rLuz[k] = g.radio; nrmLuz.set(new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion).toArray(), k * 3); });
  const gLuz = new THREE.BufferGeometry(); gLuz.setAttribute('position', new THREE.BufferAttribute(pLuz, 3)); gLuz.setAttribute('aRadio', new THREE.BufferAttribute(rLuz, 1));
  gLuz.setAttribute('aNormal', new THREE.BufferAttribute(nrmLuz, 3)); gLuz.setAttribute('aColor', new THREE.BufferAttribute(cLuz, 3));
  const TAM_LUZ = 3.0;
  const puntosLuz = new THREE.Points(gLuz, new THREE.ShaderMaterial({ uniforms: { uFocal, uPR },
    vertexShader: `attribute float aRadio; attribute vec3 aNormal, aColor; uniform float uFocal, uPR; varying vec3 vC;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float z = max(1.0, -mv.z), px = aRadio / z * uFocal;
        float fundido = 1.0 - smoothstep(1.5, 3.5, px);
        // flujo de la imagen (2px)²·color medio (independiente de la inclinación), en el perfil del punto (0,1678·tamaño²)
        // Área proyectada real: fuera del eje, la imagen se estira (∝ distancia/profundidad).
        float estira = length(mv.xyz) / z;
        // Compresión perceptiva por debajo de 1,5 px (GAMMA_LUZ, licencia declarada): igual a 1 por encima.
        float comprime = pow(max(1.0, 1.5 / max(px, 0.02)), ${(2 * (1 - 0.5)).toFixed(1)});
        vC = aColor * (4.0 * px * px * estira / (0.1678 * ${(TAM_LUZ * TAM_LUZ).toFixed(1)})) * fundido * comprime;
        gl_PointSize = fundido > 0.001 ? ${TAM_LUZ.toFixed(1)} * uPR : 0.0;
        gl_Position = fundido > 0.001 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0); }`,
    fragmentShader: 'precision mediump float; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = pow(1.0 - d * 2.0, 1.6); gl_FragColor = vec4(vC * a, a); }',
    transparent: true, premultipliedAlpha: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  puntosLuz.frustumCulled = false; puntosLuz.renderOrder = -2; puntosLuz.userData.luzNoResuelta = true; grupo.add(puntosLuz);
  // Color medio REAL de cada imagen para su luz no resuelta (la misma galaxia, el mismo color).
  // Se calcula en la carga (prepararLuz, por tramos, cediendo entre imágenes): antes se hacía en el primer cuadro dentro del
  // universo y recorría de golpe los píxeles de todas las imágenes (~25 ms en un móvil, ~100 con la CPU ×4): el primer
  // tirón de la entrada tras la intro. Si en la carga aún faltaba alguna imagen, se completa como antes en actualizar().
  let calibrado = false;
  const colorMedio = (t, colores) => {
    const d = t.image?.data; if (!d || mediaLuz(t) === null) return false;
    let r = 0, gg = 0, b = 0; for (let j = 0; j < d.length; j += 4) { r += d[j]; gg += d[j + 1]; b += d[j + 2]; } const n = d.length / 4 * 255; colores.set(t, [r / n, gg / n, b / n]);
    return true;
  };
  const aplicarColores = colores => {
    const ac = puntosLuz.geometry.attributes.aColor;
    lista.forEach((g, k) => { const m = colores.get(g.instancia.textura); ac.array.set([m[0] * g.op, m[1] * g.op, m[2] * g.op], k * 3); }); ac.needsUpdate = true;
    calibrado = true;
  };
  function calibrar() {
    const colores = new Map();
    for (const g of lista) { const t = g.instancia.textura; if (!colores.has(t) && !colorMedio(t, colores)) return; }
    aplicarColores(colores);
  }
  async function prepararLuz() {
    if (calibrado) return true;
    const colores = new Map(); let t0 = performance.now();
    for (const g of lista) {
      const t = g.instancia.textura; if (colores.has(t)) continue;
      if (performance.now() - t0 > 20) { await new Promise(r => setTimeout(r, 0)); t0 = performance.now(); }
      if (!colorMedio(t, colores)) return false;
    }
    // Calibradas (su luz media queda guardada en luzTextura): nadie vuelve a leer sus píxeles y la carga suelta su copia
    // en memoria en cuanto están en la GPU (~15 MB en un móvil).
    for (const t of colores.keys()) t.userData.liberable = true;
    aplicarColores(colores); return true;
  }
  // Diagnóstico (pruebas de luz): un grupo con SOLO esa galaxia, con los mismos materiales.
  function soloGalaxia(g) {
    const solo = new THREE.Group(), { im, i } = g.instancia;
    const geo = im.geometry.clone(); geo.setAttribute('aBeta', new THREE.InstancedBufferAttribute(new Float32Array([im.geometry.attributes.aBeta.array[i]]), 1));
    const una = new THREE.InstancedMesh(geo, im.material, 1); const mm = new THREE.Matrix4(); im.getMatrixAt(i, mm); una.setMatrixAt(0, mm); una.setColorAt(0, new THREE.Color().setScalar(g.op)); una.frustumCulled = false; una.userData.imagen = true;
    const propias = g.estrellas ?? crearEstrellas(g), pts = new THREE.Points(propias.geometry, mat); pts.position.copy(g.pos); pts.frustumCulled = false; pts.userData.estrellas = true;
    // Y su luz no resuelta (el mismo punto, con los mismos atributos).
    const k = lista.indexOf(g), gl = new THREE.BufferGeometry();
    for (const [nombre, at] of Object.entries(puntosLuz.geometry.attributes)) gl.setAttribute(nombre, new THREE.BufferAttribute(at.array.slice(k * at.itemSize, (k + 1) * at.itemSize), at.itemSize));
    const luz = new THREE.Points(gl, puntosLuz.material); luz.frustumCulled = false; luz.userData.imagen = true;
    solo.add(una, pts, luz); return solo;
  }
  grupo.userData.campo = { lista, soloGalaxia, activas, focal: uFocal };
  return {
    grupo,
    razonLuz: () => lista.map(g => g.instancia.im.geometry.attributes.aBeta.array[g.instancia.i]),
    crearEstrellas,
    prepararLuz,
    activas: () => [...activas].map(g => g.estrellas),
    actualizar(camera) {
      if (!calibrado) calibrar();
      uFocal.value = vista.alto / (2 * Math.tan(camera.fov * Math.PI / 360));
      // Estrellas por galaxia: se preparan a 24 px (antes del fundido, que empieza a 35) y se liberan
      // por debajo de 12. Con la profundidad en la vista, como los sombreadores; por la distancia
      // también, para tenerlas listas antes de girar hacia ellas. Como mucho dos nuevas por cuadro.
      // Cada cuadro se revisa solo una parte de las galaxias, por turnos (todas en 4 cuadros, ~67 ms): el umbral de
      // creación (24 px) va muy por delante del fundido (35 px), así que llegan a tiempo, y la CPU del móvil no recorre
      // las 7.379 en cada cuadro. Las que tienen estrellas se actualizan siempre (visibilidad y liberación).
      camera.updateMatrixWorld(); const e = camera.matrixWorldInverse.elements, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, f = uFocal.value;
      // Sin memoria temporal por cuadro (nada de arrays por galaxia): menos pausas del recolector en el móvil.
      // Sin cierres ni variables capturadas que cambian en cada llamada (cada número guardado así era memoria nueva: ~0,7 MB/s
      // en un viaje, que alimentaba al recolector): la distancia y la profundidad se calculan en línea.
      let nuevas = 0;
      const n = lista.length, tramo = Math.ceil(n / 4), fin = Math.min(n, turno + tramo);
      for (let i = turno; i < fin && nuevas < 2; i++) { const g = lista[i]; if (!g.estrellas && !pendientes.has(g) && pxDe(g, cx, cy, cz, f) > 24) { pendientes.set(g, generarEstrellas(g)); nuevas++; } }   // crear/soltar según la DISTANCIA (girar no las crea ni las borra); la profundidad solo decide si se ven
      turno = fin >= n ? 0 : fin;
      // Las pendientes avanzan con ~1,5 ms por cuadro entre todas; la que ya va a verse (34 px: el fundido empieza a 35) se
      // termina en el acto, y la que se ha alejado otra vez se abandona.
      // (Sin recorrer el Map con [g, it] = …: cada entrada era un par nuevo en cada cuadro.)
      if (pendientes.size) { const t0 = performance.now();
        pendientes.forEach((it, g) => {
          const px = pxDe(g, cx, cy, cz, f);
          if (px < 12) { pendientes.delete(g); return; }
          const urge = px > 34;
          if (!urge && performance.now() - t0 > 1.5) return;
          let r; while (!(r = it.next()).done) if (!urge && performance.now() - t0 > 1.5) break;
          if (r.done) pendientes.delete(g);
        }); }
      for (const g of activas) {   // borrar de un Set mientras se recorre es seguro
        const p = g.pos, dx = p.x - cx, dy = p.y - cy, dz = p.z - cz, z = -(e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14]);
        if (g.radio * f / Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz)) < 12) { liberarEstrellas(g); continue; }
        g.estrellas.visible = z > 0 && g.radio * f / Math.max(1, z) > 34;
      }
    }
  };
}
