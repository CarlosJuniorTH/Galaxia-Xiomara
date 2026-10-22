// La telaraña cósmica en la escena (datos: js/data/telarana.js), como en las simulaciones del universo:
// hebras finas y onduladas de gas azul y violeta (varias fibras trenzadas por filamento, con ramitas que se
// pierden en el vacío y un resplandor suave), filamentos menores que cierran celdas alrededor de grandes vacíos
// negros, galaxias doradas y blancas sobre las hebras y, en los nudos, cúmulos dorados densos con su resplandor.
// Todo con posición 3D fija: al viajar cambia la perspectiva de verdad. Las hebras son cintas con un ancho fijo en
// píxeles y bordes suaves (no líneas de 1 px): se ven finas y limpias de lejos, sin temblar ni pixelarse.
// Las galaxias del catálogo (con su imagen y sus estrellas) viven sobre ella; estas luces son el resto.
import * as THREE from 'three';
import { generador, semillaDe, ceder } from '../util/azarSemilla.js';
import { crearTelarana, puntoFilamento } from '../data/telarana.js';
import { generarDatosTelarana } from './telaranaDatos.js';

// Lo que queda detrás de un gigante (en su silueta, más lejos que él) se apaga: la telaraña no tapa al cuásar, la
// supernova… (uGigA/uGigB, ver OCULTO).
// Lo que solo depende de la cámara (su posición en el espacio de la telaraña y, por gigante, su dirección, distancia
// y radio angular) se calcula UNA vez por cuadro en la CPU (actualizar): antes cada uno del millón de puntos invertía
// una matriz y calculaba un arcoseno y un arcocoseno por gigante. Mismo resultado, mucho menos trabajo para la GPU.
// uGigA: dirección desde la cámara (xyz) y coseno del borde exterior del fundido (w); uGigB: distancia, radio angular y activo.
const OCULTO = /* glsl */`uniform vec3 uCamL; uniform vec4 uGigA[6], uGigB[6];
float ocultoGig(vec3 p){ vec3 v = p - uCamL; float dp = length(v), k = 1.0; vec3 u = v / max(dp, 1e-6);
  for (int i = 0; i < 6; i++) { if (uGigB[i].z <= 0.0 || dp < uGigB[i].x) continue;
    float c = dot(u, uGigA[i].xyz); if (c <= uGigA[i].w) continue;   // fuera del fundido: no tapa (el factor sería 1)
    float r = uGigB[i].y; k *= smoothstep(r * 0.85, r * 1.5, acos(min(c, 1.0))); }
  return k; }`;
const gauss = a => { let u = 0; while (!u) u = a(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * a()); };
const col = c => new THREE.Color(c);
// Galaxias: sobre todo doradas y blancas (luz de estrellas viejas), algunas azuladas y alguna rosada.
const GAL_CALIDAS = ['#fff3dc', '#ffe3b0', '#ffd291', '#ffc174'].map(col), GAL_FRIAS = ['#e2eaff', '#bcd0ff'].map(col), GAL_ROSA = col('#ffbfe0');
const galaxiaColor = a => { const r = a(); return r < 0.72 ? GAL_CALIDAS[Math.floor(a() * 4)] : r < 0.95 ? GAL_FRIAS[Math.floor(a() * 2)] : GAL_ROSA; };
// Pide los datos (posiciones, colores, brillos ya troceados en bloques) al obrero, que los calcula en otro núcleo
// mientras se prepara el resto del universo; si el navegador no puede, se calculan aquí cediendo el control a menudo.
export function pedirDatosTelarana() {
  const aqui = () => generarDatosTelarana(THREE, ceder);
  try {
    const obrero = new Worker(new URL('./telaranaObrero.js', import.meta.url), { type: 'module' });
    return new Promise(resolver => {
      let hecho = false;
      const fin = d => { if (hecho) return; hecho = true; clearTimeout(vigia); obrero.terminate(); resolver(d); };
      const respaldo = () => { window.__respaldoTelarana = true; if (hecho) return; hecho = true; clearTimeout(vigia); obrero.terminate(); aqui().then(resolver); };
      // Si el sistema cierra el obrero sin avisar (iOS lo hace cuando falta memoria), no se espera para siempre: el obrero
      // da un latido en cada pausa; si pasan 10 s sin ninguno (o 25 s sin el primero, mientras carga), se calcula aquí.
      let vigia = setTimeout(respaldo, 25000);
      obrero.onmessage = ({ data }) => { if (data.latido) { window.__latidosTelarana = (window.__latidosTelarana || 0) + 1; clearTimeout(vigia); vigia = setTimeout(respaldo, 10000); return; } data.datos ? fin(data.datos) : respaldo(); };
      obrero.onerror = e => { e.preventDefault?.(); respaldo(); };
      obrero.postMessage(null);
    });
  } catch { return aqui(); }
}

// Una nube de puntos en bloques: cada bloque es un Points con su esfera envolvente que comparte los MISMOS atributos
// (se suben una vez a la GPU) con su tramo de dibujo: lo que queda fuera de la vista no se dibuja.
function enBloques({ atributos, bloques }, material, O) {
  // Una vez en la tarjeta gráfica, la copia en memoria ya no hace falta (son decenas de MB: en un iPhone cuenta mucho).
  const liberar = function () { this.array = null; };
  const attr = Object.fromEntries(Object.entries(atributos).map(([n, { datos, k }]) => [n, new THREE.BufferAttribute(datos, k).onUpload(liberar)]));
  const grupo = new THREE.Group(); grupo.position.copy(O); grupo.renderOrder = -1.5;
  for (const b of bloques) {
    const g = new THREE.BufferGeometry(); for (const [n, a] of Object.entries(attr)) g.setAttribute(n, a);
    g.setDrawRange(b.a, b.n); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(...b.centro), b.radio);
    const t = new THREE.Points(g, material); t.renderOrder = -1.5; grupo.add(t);
  }
  return grupo;
}

export async function crearTelaranaCosmica({ scene, uPR, uScale }, datos) {
  datos ??= await generarDatosTelarana(THREE, ceder);
  const V = THREE.Vector3, web = crearTelarana(V);
  const raiz = new THREE.Group(); raiz.name = 'Telaraña cósmica'; raiz.userData.profundo = true; scene.add(raiz);
  const K = 1;   // el mismo contenido en móvil y en PC
  const O = web.centro;   // las coordenadas se guardan respecto al centro (precisión de float en la GPU)

  const empaquetar = (lista, tamPorPunto) => {
    const n = lista.length / 3, pos = new Float32Array(n * 3), c = new Float32Array(n * 3), tam = new Float32Array(n);
    for (let i = 0; i < n; i++) { const p = lista[i * 3], k = lista[i * 3 + 1]; pos.set([p.x - O.x, p.y - O.y, p.z - O.z], i * 3); c.set([k.r, k.g, k.b], i * 3); tam[i] = lista[i * 3 + 2]; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(c, 3)); g.setAttribute(tamPorPunto, new THREE.BufferAttribute(tam, 1));
    return g;
  };
  const uniformes = { uPR, uScale, uCamL: { value: new THREE.Vector3() }, uGigA: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 1, 2)) }, uGigB: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uCasa: { value: 1 }, uRes: { value: new THREE.Vector2(1, 1) }, uF: { value: 800 } };
  const matGalaxias = new THREE.ShaderMaterial({ uniforms: uniformes,
    vertexShader: /* glsl */`uniform float uPR, uScale, uCasa; ${OCULTO} attribute vec3 aCol; attribute float aBrillo; varying vec3 vC; varying float vA, vRes, vAng, vInc, vBrazos, vTipo;
      float h(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = length(mv.xyz);
        float R = 300.0 + aBrillo * 450.0, px = R * uScale / max(1.0, -mv.z);
        // Luz de una galaxia no resuelta: baja con la distancia, pero con compresión (se ven muy lejos).
        float k = clamp(pow(2500000.0 / d, 0.6), 0.45, 1.8);
        vRes = smoothstep(1.5, 6.0, px);                    // 0: un punto de luz · 1: se ve su forma
        // Licencia artística (como en las imágenes de la red cósmica): una de cada quince galaxias se ve siempre con
        // su forma, a un tamaño legible (6–15 px), aunque esté lejos; las demás, puntos de luz.
        // Licencia artística (como en las imágenes de la red cósmica): todas se ven con su forma (elípticas doradas,
        // espirales, de canto), con tamaños muy variados: muchas diminutas (3–5 px), algunas medianas y pocas grandes.
        float rt = h(position * 0.0021 + 1.3), minimo = 2.6 + pow(rt, 5.0) * 46.0 + pow(rt, 2.5) * 8.0;   // más grandes: se ve su forma
        vRes = 1.0;
        float tam = max(px * 2.4, minimo), lim = 90.0 * uPR;
        vTipo = h(position * 0.0017 + 5.5);
        gl_PointSize = min(tam * uPR, lim);
        vA = ocultoGig(position) * k * (0.35 + 0.65 * aBrillo) * uCasa * (0.03 + 0.7 * smoothstep(6.0, 24.0, tam)) * (1.0 - smoothstep(lim * 0.7, lim, tam * uPR)) * step(0.0, -mv.z);
        vAng = h(position * 0.001) * 6.2832; vInc = 0.25 + 0.75 * h(position * 0.0013 + 3.1); vBrazos = step(0.45, h(position * 0.0007 + 7.7));
        vC = aCol; }`,
    fragmentShader: /* glsl */`varying vec3 vC; varying float vA, vRes, vAng, vInc, vBrazos, vTipo;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; if (d > 1.0) discard;
        float punto = exp(-d * d * 4.0);
        // Forma: disco elíptico girado e inclinado, núcleo brillante y, en unas, dos brazos.
        float c = cos(vAng), s = sin(vAng); vec2 r = vec2(c * q.x - s * q.y, s * q.x + c * q.y) * 2.0; r.y /= vInc;
        float rr = length(r), th = atan(r.y, r.x);
        // Tipos: espiral (núcleo dorado, brazos azulados o rosados), elíptica (dorada, suave) y de canto.
        float espiral = step(vTipo, 0.55), eliptica = step(0.7, vTipo);
        float brazos = pow(0.5 + 0.5 * cos(2.0 * th - log(max(rr, 0.04)) * 5.5), 2.0);
        float disco = exp(-rr * 2.6) * mix(0.35, 1.3, brazos * espiral + (1.0 - espiral) * 0.5) * (1.0 - smoothstep(0.8, 1.0, rr));
        float elip = exp(-rr * rr * 5.0) * eliptica;
        float forma = mix(disco * 0.9, elip * 1.3, eliptica) + exp(-rr * rr * 70.0) * 1.3;
        vec3 brazo = mix(vec3(0.55, 0.72, 1.0), vec3(1.0, 0.62, 0.85), step(0.45, fract(vTipo * 7.3)));
        vec3 oro = mix(vec3(1.0, 0.72, 0.38), vec3(1.0, 0.86, 0.6), fract(vTipo * 13.0));
        vec3 colForma = mix(mix(brazo, oro, eliptica), mix(oro, vec3(1.0, 0.93, 0.8), 0.5), exp(-rr * 5.0));
        vec3 col = mix(vC, colForma, vRes);
        float a = mix(punto, forma, vRes) * vA; gl_FragColor = vec4(col * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  // Polvo luminoso de los cúmulos (1–2 px).
  const matNubes = new THREE.ShaderMaterial({ uniforms: uniformes,
    vertexShader: /* glsl */`uniform float uPR, uCasa; attribute vec3 aCol; attribute float aBrillo; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = length(mv.xyz);
        vA = aBrillo * clamp(pow(3000000.0 / d, 0.5), 0.4, 1.5) * uCasa * step(0.0, -mv.z); vC = aCol; gl_PointSize = (1.0 + aBrillo) * uPR; }`,
    fragmentShader: /* glsl */`varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = exp(-d * d * 3.0) * vA; gl_FragColor = vec4(vC * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  // Polvo de los filamentos: motas finas (1–2,5 px), con un leve titileo.
  const matPolvo = new THREE.ShaderMaterial({ uniforms: uniformes,
    vertexShader: /* glsl */`uniform float uPR, uCasa; ${OCULTO} attribute vec3 aCol; attribute float aBrillo; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = length(mv.xyz);
        float h = fract(sin(dot(position.xy, vec2(12.9898, 78.233)) * 0.0001) * 43758.5);
        vA = aBrillo * 3.2 * clamp(pow(4500000.0 / d, 0.5), 0.6, 2.0) * uCasa * step(0.0, -mv.z) * smoothstep(60000.0, 250000.0, d) * ocultoGig(position); vC = aCol;
        gl_PointSize = (1.2 + aBrillo * 1.0 + h * 0.5) * uPR; }`,
    fragmentShader: /* glsl */`varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = (1.0 - smoothstep(0.35, 1.0, d)) * vA; gl_FragColor = vec4(vC * a, a); }`,   // motas nítidas, sin halo
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  // Las tres nubes grandes de puntos (más de un millón en total), en bloques: solo se dibuja lo que está a la vista.
  // (Las cintas, los resplandores y la niebla de gas ya no se construyen: estaban ocultos para siempre —sin líneas ni
  // degradados—; sus datos se siguen calculando para que el azar, y por tanto el universo, no cambie.)
  const bloquesGalaxias = enBloques(datos.galaxias, matGalaxias, O), bloquesNubes = enBloques(datos.nubes, matNubes, O), bloquesPolvo = enBloques(datos.polvo, matPolvo, O);
  raiz.add(bloquesGalaxias, bloquesNubes, bloquesPolvo);
  // ── Campo cercano: dentro de un filamento o de un cúmulo, cientos de galaxias diminutas alrededor de la cámara
  // (las mismas siempre en cada lugar: semilla por celda). Así, al meterse en la telaraña, se ve que está hecha
  // de galaxias de verdad. Se rehace solo al cambiar de celda. ──
  const C = 60000, muestras = [];
  for (const f of web.filamentos) for (let k = 0; k <= 24; k++) muestras.push({ p: puntoFilamento(k / 24, web.nudos, f, V), g: f.grosor * 0.45, n: 1 });
  for (const nudo of web.nudos) muestras.push({ p: nudo.pos, g: nudo.r * 0.6, n: 3 });
  const cercano = new THREE.Points(new THREE.BufferGeometry(), matGalaxias); cercano.frustumCulled = false; cercano.renderOrder = -1.5; cercano.position.copy(web.centro); raiz.add(cercano);
  let celdaActual = '';
  function rehacerCercano(cam) {
    const ci = Math.floor(cam.x / C), cj = Math.floor(cam.y / C), ck = Math.floor(cam.z / C), clave = `${ci},${cj},${ck}`;
    if (clave === celdaActual) return; celdaActual = clave;
    const lista = [], centroZona = new V((ci + 0.5) * C, (cj + 0.5) * C, (ck + 0.5) * C);
    const cerca = muestras.filter(m => m.p.distanceTo(centroZona) < C * 2.2 + m.g * 2);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const x0 = (ci + a) * C, y0 = (cj + b) * C, z0 = (ck + c) * C, rnd = generador(semillaDe(`celda-${ci + a},${cj + b},${ck + c}`));
      for (const m of cerca) {
        // Cuántas caen en esta celda alrededor de esta muestra (más en los cúmulos).
        for (let i = 0, n = Math.round(240 * m.n * K); i < n; i++) {
          const p = m.p.clone().add(new V(gauss(rnd), gauss(rnd), gauss(rnd)).multiplyScalar(m.g * 0.55));
          if (p.x < x0 || p.x >= x0 + C || p.y < y0 || p.y >= y0 + C || p.z < z0 || p.z >= z0 + C) continue;
          lista.push(p, galaxiaColor(rnd), 0.35 + rnd() * 0.75);
        }
      }
    }
    cercano.geometry.dispose(); cercano.geometry = empaquetar(lista, 'aBrillo');
  }
  // Toda la telaraña es fija: sus matrices se calculan una vez y no se recorren en cada cuadro (menos CPU en el móvil).
  raiz.updateMatrixWorld(true); raiz.matrixWorldAutoUpdate = false;
  const tam = new THREE.Vector2(), aux = new V(); let gigantes = [];
  return {
    raiz, web, galaxias: bloquesGalaxias, nubes: bloquesNubes, cercano, polvoFil: bloquesPolvo,
    // Gigantes que tapan la telaraña: [{ centro, radio }] (coordenadas del mundo).
    fijarGigantes(lista) { gigantes = lista.slice(0, 6).map(g => ({ c: new V(g.centro.x - O.x, g.centro.y - O.y, g.centro.z - O.z), r: g.radio })); },
    actualizar(t, dt, ctx) { const { camera } = ctx;
      // En casa, más discreta: el cielo de Xiomara ya es rico; lejos de ella, la telaraña es el cielo.
      uniformes.uCasa.value = (0.22 + 0.78 * THREE.MathUtils.smoothstep(camera.position.length(), 20000, 400000)) * (ctx.exposicion ?? 1);   // exposición automática (index.js)
      const pr = uPR.value; uniformes.uRes.value.set(innerWidth * pr * 0.5, innerHeight * pr * 0.5);
      uniformes.uF.value = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
      rehacerCercano(camera.position);
      // Ocultación por los gigantes: lo que solo depende de la cámara, una vez por cuadro (ver OCULTO).
      bloquesGalaxias.updateWorldMatrix(true, false); const cam = bloquesGalaxias.worldToLocal(uniformes.uCamL.value.copy(camera.position));
      for (let i = 0; i < 6; i++) {
        const g = gigantes[i], A = uniformes.uGigA.value[i], B = uniformes.uGigB.value[i];
        if (!g || g.r <= 0) { B.set(0, 0, 0, 0); continue; }
        aux.copy(g.c).sub(cam); const dg = aux.length(), r = Math.asin(Math.min(0.99, g.r / dg));
        aux.divideScalar(dg); A.set(aux.x, aux.y, aux.z, Math.cos(Math.min(Math.PI, r * 1.5))); B.set(dg, r, 1, 0);
      }
    }
  };
}
