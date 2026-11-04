// El escenario de los videoclips de la primera vuelta al Sol: su propia escena, con una sola geometría de puntos y un solo
// dibujo. Todo el movimiento se calcula en el vértice a partir de pocas variables del guion (js/util/guionVuelta.js): sin
// trabajo por mota en la CPU, repetible al cuadro y, como la escena grande no se dibuja mientras tanto, más ligero que
// cualquier otro momento del universo. Se construye al empezar (con la pantalla en negro) y se libera al terminar.
// Luz solo con motas nítidas: nada de halos ni posproceso (sin bloom, sin tone mapping).
import * as THREE from 'three';
import { guionVuelta } from '../util/guionVuelta.js';
import { geometriaDosSoles, materialDosSoles } from './dosSoles.js';

const F_HEBRA = 0, F_SOL = 2, F_FONDO = 3, F_MARCA = 4, F_PAR = 5, F_CHISPA = 6, F_HILO = 7;
const N_HEBRA = 45000, N_SOL = 15000, N_FONDO = 3000, N_HILO = 5000, N_POR_CHISPA = 1500;
const PROFUNDIDAD_TEXTO = 30;

// Aleatorio con semilla: el mismo universo en cada dispositivo y en cada repetición.
function azar(semilla) { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Los nombres y el corazón, escritos en un lienzo y convertidos en sitios para las motas (coordenadas de −1 a 1).
async function sitiosDeNombres(cuantos, r) {
  try { await Promise.race([document.fonts.load('italic 500 150px "Cormorant Garamond"'), new Promise(f => setTimeout(f, 1500))]); } catch { /* con la de reserva también se lee */ }
  const L = 900, lienzo = document.createElement('canvas'); lienzo.width = lienzo.height = L;
  const c = lienzo.getContext('2d', { willReadFrequently: true });
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = 'italic 500 150px "Cormorant Garamond", Georgia, serif'; c.fillText('Carlos', L / 2, L * 0.46);
  c.font = 'italic 500 84px "Cormorant Garamond", Georgia, serif'; c.fillText('&', L / 2, L * 0.585);
  c.font = 'italic 500 150px "Cormorant Garamond", Georgia, serif'; c.fillText('Xiomara', L / 2, L * 0.71);
  // El corazón, encima de los nombres.
  const x0 = L / 2, y0 = L * 0.2, e = L * 0.0052; c.beginPath();
  for (let i = 0; i <= 90; i++) { const t = i / 90 * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); c[i ? 'lineTo' : 'moveTo'](x0 + x * e * 1.15, y0 - y * e * 1.15); }
  c.closePath(); c.fill();
  const d = c.getImageData(0, 0, L, L).data, llenos = [];
  for (let y = 0; y < L; y += 2) for (let x = 0; x < L; x += 2) if (d[(y * L + x) * 4 + 3] > 128) llenos.push(x, y);
  const total = llenos.length / 2, sitios = new Float32Array(cuantos * 2);
  for (let i = 0; i < cuantos; i++) {
    const k = Math.floor(r() * total);
    sitios[i * 2] = (llenos[k * 2] + r() * 2) / L * 2 - 1;
    sitios[i * 2 + 1] = 1 - (llenos[k * 2 + 1] + r() * 2) / L * 2;
  }
  return sitios;
}

const VERTICE = /* glsl */`
  #define PI 3.14159265
  uniform float uT, uFrente, uAbrir, uNombres, uOla, uEspera, uPx, uTexto, uPR, uCoronaInicio, uCoronaPaso, uHayCorona, uChispaX, uChispaY, uChispaAbajo;
  attribute vec4 aA;   // x: ángulo en la órbita · y: semilla · z: familia · w: hebra, índice o instante de la chispa
  attribute vec3 aG;   // destino en la galaxia, dirección en el Sol o velocidad de la chispa
  attribute vec3 aN;   // xy: sitio en los nombres (de −1 a 1) · z: 1 si va a los nombres
  varying vec3 vColor; varying float vForma;
  const vec3 ORO = vec3(1.0, 0.76, 0.40), ROSA = vec3(1.0, 0.44, 0.66), PERLA = vec3(1.0, 0.93, 0.84), AZUL = vec3(0.62, 0.74, 1.0);

  vec3 orbita(float a) { return vec3(10.0 * cos(a), 0.0, 9.7 * sin(a)); }
  // Las dos hebras giran una alrededor de la otra mientras recorren la órbita.
  vec3 trenza(float a, float hebra) {
    float f = a * 14.0 + hebra * PI + uT * 0.25;
    return vec3(cos(a), 0.0, sin(a)) * cos(f) * 0.42 + vec3(0.0, sin(f) * 0.42, 0.0);
  }
  float subida(float i) { return uHayCorona * smoothstep(0.0, 2.6, uT - uCoronaInicio - i * uCoronaPaso); }
  vec3 enCorona(float i) { float a = i / 13.0 * 2.0 * PI - 1.4; return vec3(cos(a) * 7.2, 5.4, sin(a) * 7.2); }
  vec3 marca(float i) { return mix(orbita(i / 12.0 * 2.0 * PI), enCorona(i), subida(i)); }
  // La corona rodea los nombres: su círculo ya en el plano de la pantalla.
  vec3 marcaFinal(float i) { float a = i / 13.0 * 2.0 * PI + 1.5708; return vec3(cos(a) * uTexto * 1.02, sin(a) * uTexto * 1.02, -${PROFUNDIDAD_TEXTO}.0); }

  void main() {
    float fam = aA.z, a = aA.x, semilla = aA.y;
    vec3 mundo = vec3(0.0); vec3 color = PERLA; float brillo = 0.0, tam = 0.05; vForma = 0.0;
    vec4 vista; bool enVista = false;

    if (fam < 1.5) {                                                     // ── Las dos hebras
      float edad = uFrente - a;
      // Cuatro de cada diez motas son el hilo; las demás, el polvo que va soltando y que deriva despacio a su alrededor.
      vec3 azarM = fract(vec3(semilla * 13.7, semilla * 57.1, semilla * 91.3)) - 0.5;
      float polvo = step(0.4, fract(semilla * 7.31));
      vec3 deriva = vec3(sin(uT * 0.11 + semilla * 30.0), sin(uT * 0.09 + semilla * 70.0), cos(uT * 0.1 + semilla * 50.0)) * 0.07;
      vec3 sobreOrbita = orbita(a) + trenza(a, aA.w) + azarM * mix(0.09, 1.25 * azarM.x * azarM.x * 4.0 + 0.4, polvo) + deriva * polvo;
      color = aA.w < 0.5 ? ORO : ROSA;
      if (edad >= 0.0) { brillo = mix(0.46, 0.2, polvo) + 0.95 * exp(-edad * 9.0); tam = mix(0.05, 0.042, polvo) + 0.02 * exp(-edad * 9.0); }
      else if (semilla < 0.035) { brillo = 0.085; color = PERLA; tam = 0.04; }   // lo que falta: una línea de puntos apenas visible
      if (uOla >= 0.0) { float d = abs(mod(uOla - a + PI, 2.0 * PI) - PI); brillo += 1.6 * (1.0 - smoothstep(0.0, 0.75, d)); }
      brillo *= 0.82 + 0.18 * sin(uT * (1.0 + semilla * 3.0) + semilla * 40.0);
      // La órbita se abre: cada mota se va a su brazo girando, unas antes que otras.
      float m = smoothstep(semilla * 0.45, semilla * 0.45 + 0.55, uAbrir);
      float giro = (1.0 - m) * m * 2.6 + uAbrir * uT * 0.018, c = cos(giro), s = sin(giro);
      vec3 enGalaxia = mix(sobreOrbita, aG, m);
      mundo = vec3(c * enGalaxia.x - s * enGalaxia.z, enGalaxia.y + sin(m * PI) * (semilla - 0.5) * 3.0, s * enGalaxia.x + c * enGalaxia.z);
      if (uAbrir > 0.0) { brillo = mix(brillo, 0.42 + semilla * 0.3, m); tam = mix(tam, 0.066, m); }
      vista = modelViewMatrix * vec4(mundo, 1.0);
      if (aN.z > 0.5 && uNombres > 0.0) {                                // … y una parte escribe los nombres, de cara a la pantalla
        float k = smoothstep(semilla * 0.5, semilla * 0.5 + 0.5, uNombres);
        vec3 sitio = vec3(aN.xy * uTexto, -${PROFUNDIDAD_TEXTO}.0);
        vista.xyz = mix(vista.xyz, sitio, k) + vec3(sin(k * PI) * (aG.z * 0.12), sin(k * PI) * (aG.x * 0.12), 0.0);
        // Se leen como luz, no como letra: granos sueltos, un destello que los recorre y el corazón en rosa.
        float destello = pow(0.5 + 0.5 * sin(aN.x * 3.2 + aN.y * 2.0 - uT * 1.15), 6.0);
        brillo = mix(brillo, (aN.y > 0.36 ? 0.62 : 1.0) * (0.34 + 0.2 * sin(uT * 1.7 + semilla * 50.0) * sin(uT * 0.9 + semilla * 23.0) + destello * 0.55), k); tam = mix(tam, 0.0235, k);
        color = mix(color, aN.y > 0.36 ? ROSA : mix(ORO, PERLA, 0.25 + 0.35 * smoothstep(-0.6, 0.3, aN.y)), k);
      } else if (uNombres > 0.0) brillo *= 1.0 - 0.72 * uNombres;        // las demás se quedan detrás, a media luz
      enVista = true;
    } else if (fam < 2.5) {                                              // ── El Sol: gránulos sobre su superficie
      float g = uT * 0.09, c = cos(g), s = sin(g);
      vec3 d = vec3(c * aG.x - s * aG.z, aG.y, s * aG.x + c * aG.z);
      float granulo = sin(d.x * 9.0 + uT * 0.8) * sin(d.y * 11.0 - uT * 0.6) * sin(d.z * 10.0 + uT * 0.4);
      // Las de la superficie se oscurecen hacia el borde, como en el Sol de verdad; el reverso no se dibuja. Una de cada cinco
      // es una protuberancia: un arco fino que sale y vuelve.
      bool arco = aA.w > 0.5;
      float vidaArco = fract(uT * (0.05 + semilla * 0.06) + semilla * 17.0), alto = arco ? sin(vidaArco * PI) * (0.14 + semilla * semilla * 0.8) : 0.0;
      mundo = d * (1.25 + granulo * 0.03 + alto);
      float mu = dot(d, normalize(cameraPosition - mundo));
      color = arco ? mix(vec3(1.0, 0.46, 0.2), ORO, semilla) : mix(vec3(1.0, 0.48, 0.14), mix(ORO, PERLA, 0.5), smoothstep(-0.35, 0.65, granulo + semilla * 0.45));
      if (arco) { brillo = 0.55 * sin(vidaArco * PI); tam = 0.04; }
      else if (mu > 0.0) { brillo = (0.22 + 0.78 * pow(mu, 0.7)) * (0.42 + 0.38 * semilla); tam = 0.072; }
      brillo *= 1.0 - 0.8 * uNombres;
    } else if (fam < 3.5) {                                              // ── El fondo
      mundo = aG * 220.0; color = mix(AZUL, PERLA, semilla);
      brillo = (0.16 + 0.5 * semilla * semilla) * (0.8 + 0.2 * sin(uT * 1.3 + semilla * 90.0)) * (1.0 - 0.5 * uNombres); tam = 1.0 + semilla * 0.5;
    } else if (fam < 4.5) {                                              // ── Las trece estrellas de los meses
      float i = aA.w, angulo = i / 12.0 * 2.0 * PI, edad = uFrente - angulo + 0.001;
      vForma = 1.0; mundo = marca(i);
      color = i < 0.5 || i > 11.5 ? ORO : PERLA;
      if (edad >= 0.0) { brillo = 1.0; tam = 0.95 + 1.1 * exp(-edad * 9.0); }
      if (i > 11.5) { float late = 0.55 + 0.45 * sin(uT * 2.2); brillo = max(brillo, uEspera * late); tam = max(tam, uEspera * (1.1 + 0.35 * late)); }
      if (uOla >= 0.0) tam += 0.35 * (1.0 - smoothstep(0.0, 0.5, abs(mod(uOla - angulo + PI, 2.0 * PI) - PI)));
      tam += subida(i) * 0.12;
      vista = modelViewMatrix * vec4(mundo, 1.0);
      vista.xyz = mix(vista.xyz, marcaFinal(i), uNombres);
      enVista = true;
    } else if (fam < 5.5) {                                              // ── Los dos astros, a la cabeza de sus hebras
      mundo = orbita(uFrente) + trenza(uFrente, aA.w) * 1.1;
      color = aA.w < 0.5 ? ORO : ROSA; vForma = 1.0;
      brillo = 1.0 - uAbrir; tam = 1.15 * (1.0 - uAbrir);
    } else if (fam < 6.5) {                                              // ── Chispas nítidas en cada golpe del estribillo final
      float tau = uT - aA.w;
      if (tau >= 0.0 && tau < 2.6) {
        // Cada mota sale un instante después que la anterior de su rayo: estelas finas, no una nube.
        float tauM = max(0.0, tau - fract(semilla * 9.7) * 0.32);
        vec3 sitio = vec3(aN.x * uChispaX, (uChispaAbajo > 0.5 ? aN.y : abs(aN.y)) * uChispaY, -${PROFUNDIDAD_TEXTO}.0) + aG * (1.0 - exp(-tauM * 2.3)) * uTexto * 0.4 + vec3(0.0, -0.09 * tau * tau * uTexto, 0.0);
        vista = vec4(sitio, 1.0); enVista = true;
        color = semilla < 0.33 ? ORO : semilla < 0.66 ? ROSA : PERLA;
        brillo = pow(1.0 - tau / 2.6, 1.6) * 1.15; tam = 0.062;
      }
    } else {                                                             // ── El hilo que une la corona: un arco de motas de estrella a estrella
      float i = floor(aA.w), j = mod(i + 1.0, 13.0);
      float visible = step(0.99, subida(i)) * step(0.99, subida(j));
      vec3 suelta = (fract(vec3(semilla * 17.3, semilla * 41.9, semilla * 73.1)) - 0.5) * 0.09;
      vista = vec4(mix((modelViewMatrix * vec4(enCorona(aA.w) + suelta, 1.0)).xyz, marcaFinal(aA.w) + suelta * uTexto * 0.1, uNombres), 1.0);
      enVista = true; color = mix(ORO, PERLA, 0.3); brillo = visible * (0.3 + 0.25 * sin(uT * 1.1 + semilla * 60.0)); tam = 0.03;
    }

    if (brillo <= 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vColor = vec3(0.0); return; }
    if (!enVista) vista = modelViewMatrix * vec4(mundo, 1.0);
    gl_Position = projectionMatrix * vista;
    gl_PointSize = clamp(uPx * tam / max(0.1, -vista.z), 1.05 * uPR, vForma > 0.5 ? 68.0 * uPR : 3.2 * uPR);
    vColor = color * min(brillo, 1.6);
  }`;

const FRAGMENTO = /* glsl */`
  precision highp float;
  varying vec3 vColor; varying float vForma;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0; float a;
    if (vForma > 0.5) {
      // Una estrella: núcleo nítido y cuatro rayos finos, sin resplandor.
      vec2 q = abs(p); float r = length(p);
      float rayo = max((1.0 - smoothstep(0.0, 0.03, q.y)) * (1.0 - q.x), (1.0 - smoothstep(0.0, 0.03, q.x)) * (1.0 - q.y));
      a = max((1.0 - smoothstep(0.07, 0.1, r)), rayo * rayo * rayo);
    } else {
      a = (1.0 - smoothstep(0.72, 1.0, length(p)));
    }
    if (a <= 0.003) discard;
    gl_FragColor = vec4(vColor * a, 1.0);
  }`;

// «Nuestra primera vuelta», el lugar del año: la órbita ya cerrada, con su Sol y sus trece estrellas, en su grupo del universo.
export function crearLugarVuelta({ grupo, renderer, uPR, escala = 11 }) {
  const N = 11000, nSol = 4500, total = N * 2 + nSol + 13, A = new Float32Array(total * 4); let k = 0;
  const r = azar(1512); const poner = (a, s, f, w) => { A.set([a, s, f, w], k * 4); k++; };
  const G = new Float32Array(total * 3), esfera = () => { const y = r() * 2 - 1, f = r() * Math.PI * 2, q = Math.sqrt(1 - y * y); return [q * Math.cos(f), y, q * Math.sin(f)]; };
  for (let h = 0; h < 2; h++) for (let i = 0; i < N; i++) poner((i + r()) / N * Math.PI * 2, r(), F_HEBRA, h);
  for (let i = 0; i < nSol; i++) { G.set(esfera(), k * 3); poner(0, r(), F_SOL, r() < 0.2 ? 1 : 0); }
  for (let i = 0; i < 13; i++) poner(0, r(), F_MARCA, i);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(A, 4)); geo.setAttribute('aG', new THREE.BufferAttribute(G, 3)); geo.setAttribute('aN', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  const v = { value: 0 }, u = { uT: v, uFrente: { value: Math.PI * 2 + 0.01 }, uAbrir: { value: 0 }, uNombres: { value: 0 }, uOla: { value: -1 }, uEspera: { value: 0 }, uPx: { value: 1000 }, uTexto: { value: 1 }, uPR, uCoronaInicio: { value: 0 }, uCoronaPaso: { value: 1 }, uHayCorona: { value: 0 }, uChispaX: { value: 1 }, uChispaY: { value: 1 }, uChispaAbajo: { value: 0 } };
  const puntos = new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: VERTICE, fragmentShader: FRAGMENTO, uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  puntos.frustumCulled = false; puntos.scale.setScalar(escala); puntos.rotation.x = 0.28; grupo.add(puntos);
  const tam = new THREE.Vector2();
  return { puntos, actualizar(t, camara) { renderer.getDrawingBufferSize(tam); v.value = t; u.uPx.value = tam.y / (2 * Math.tan(camara.fov * Math.PI / 360)) * escala; } };
}

export function crearTeatroVuelta(renderer) {
  const escena = new THREE.Scene(), camara = new THREE.PerspectiveCamera(40, 1, 0.1, 900);
  let puntos = null, guion = null;
  const u = {
    uT: { value: 0 }, uFrente: { value: 0 }, uAbrir: { value: 0 }, uNombres: { value: 0 }, uOla: { value: -1 }, uEspera: { value: 0 },
    uPx: { value: 1000 }, uTexto: { value: 10 }, uPR: { value: 1 }, uCoronaInicio: { value: 0 }, uCoronaPaso: { value: 1 }, uHayCorona: { value: 0 }, uChispaX: { value: 1 }, uChispaY: { value: 1 }, uChispaAbajo: { value: 1 },
    uSep: { value: 1 }, uAng: { value: 0 }, uFlujo: { value: 0 }, uInfinito: { value: 0 }
  };
  const tam = new THREE.Vector2(), mira = new THREE.Vector3();

  async function preparar(meses) {
    liberar();
    guion = guionVuelta(meses); if (!guion) return false;
    if (guion.binaria) {
      puntos = new THREE.Points(geometriaDosSoles(), materialDosSoles(u)); puntos.frustumCulled = false; escena.add(puntos);
      fijar(0); renderer.compile(escena, camara);
      return true;
    }
    const r = azar(20251215 + meses), conNombres = !!guion.corona;
    const nChispas = guion.chispas.length * N_POR_CHISPA, nHilo = conNombres ? N_HILO : 0;
    const total = N_HEBRA * 2 + N_SOL + N_FONDO + 13 + 2 + nChispas + nHilo;
    const A = new Float32Array(total * 4), G = new Float32Array(total * 3), N = new Float32Array(total * 3);
    const sitios = conNombres ? await sitiosDeNombres(Math.round(N_HEBRA * 2 * 0.72), r) : null;
    let k = 0, s = 0;
    const poner = (a, semilla, fam, w, gx = 0, gy = 0, gz = 0, nx = 0, ny = 0, nz = 0) => { A.set([a, semilla, fam, w], k * 4); G[k * 3] = gx; G[k * 3 + 1] = gy; G[k * 3 + 2] = gz; N[k * 3] = nx; N[k * 3 + 1] = ny; N[k * 3 + 2] = nz; k++; };
    const esfera = () => { const y = r() * 2 - 1, f = r() * Math.PI * 2, q = Math.sqrt(1 - y * y); return [q * Math.cos(f), y, q * Math.sin(f)]; };
    // Las hebras (cada una, un brazo de la galaxia que nacerá de la órbita).
    for (let h = 0; h < 2; h++) for (let i = 0; i < N_HEBRA; i++) {
      const a = (i + r()) / N_HEBRA * Math.PI * 2, semilla = r();
      let gx = 0, gy = 0, gz = 0, nx = 0, ny = 0, nz = 0;
      if (conNombres) {
        // Dos brazos que se abren y se deshilachan, con nudos de estrellas; una de cada cuatro motas es disco, entre los brazos.
        const u1 = r(), radio = 1.8 + Math.pow(u1, 0.8) * 14.5, enDisco = r() < 0.25;
        const nudo = Math.round(radio * 1.3) / 1.3, junto = r() < 0.3 ? nudo + (r() - 0.5) * 0.35 : radio;
        const disp = (0.32 + junto * 0.12) * (r() + r() + r() - 1.5);
        const f = enDisco ? r() * Math.PI * 2 : Math.log(junto / 1.8) * 2.5 + h * Math.PI + disp * 0.14;
        gx = Math.cos(f) * (junto + disp); gz = Math.sin(f) * (junto + disp); gy = (r() + r() - 1) * (0.14 + 0.7 / (0.5 + junto * 0.4));
        if (r() < 0.72 && s < sitios.length / 2) { nx = sitios[s * 2]; ny = sitios[s * 2 + 1]; nz = 1; s++; }
      }
      poner(a, semilla, F_HEBRA, h, gx, gy, gz, nx, ny, nz);
    }
    for (let i = 0; i < N_SOL; i++) { const d = esfera(); poner(0, r(), F_SOL, r() < 0.2 ? 1 : 0, d[0], d[1], d[2]); }
    for (let i = 0; i < N_FONDO; i++) { const d = esfera(); poner(0, r(), F_FONDO, 0, d[0], d[1], d[2]); }
    for (let i = 0; i < 13; i++) poner(0, r(), F_MARCA, i);
    poner(0, 0.5, F_PAR, 0); poner(0, 0.5, F_PAR, 1);
    // Las chispas salen por 48 rayos, no por toda la esfera.
    const esferaRayos = () => { const a = Math.floor(r() * 48) / 48 * Math.PI * 2, v = 0.8 + 0.2 * Math.abs(Math.sin(a * 23.7)); return [Math.cos(a) * v, Math.sin(a) * v]; };
    guion.chispas.forEach((t, b) => {
      const ox = (b % 2 ? 1 : -1) * (b % 4 < 2 ? 0.95 : 0.5), oy = b % 4 < 2 ? 1 : -1;
      for (let i = 0; i < N_POR_CHISPA; i++) { const d = esferaRayos(); poner(0, r(), F_CHISPA, t, d[0], d[1], 0, ox, oy, 0); }
    });
    for (let i = 0; i < nHilo; i++) poner(0, r(), F_HILO, (i + r()) / nHilo * 13);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    geo.setAttribute('aA', new THREE.BufferAttribute(A, 4)); geo.setAttribute('aG', new THREE.BufferAttribute(G, 3)); geo.setAttribute('aN', new THREE.BufferAttribute(N, 3));
    const mat = new THREE.ShaderMaterial({ vertexShader: VERTICE, fragmentShader: FRAGMENTO, uniforms: u, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    puntos = new THREE.Points(geo, mat); puntos.frustumCulled = false; escena.add(puntos);
    u.uHayCorona.value = conNombres ? 1 : 0;
    if (guion.corona) { u.uCoronaInicio.value = guion.corona.inicio; u.uCoronaPaso.value = guion.corona.paso; }
    fijar(0); renderer.compile(escena, camara);
    return true;
  }
  // Pone la escena en ese segundo de la canción.
  function fijar(s) {
    if (!guion) return;
    renderer.getDrawingBufferSize(tam);
    const aspecto = tam.x / Math.max(1, tam.y);
    if (Math.abs(camara.aspect - aspecto) > 1e-3) { camara.aspect = aspecto; camara.updateProjectionMatrix(); }
    // En vertical la órbita ha de caber a lo ancho: la cámara se aleja lo justo.
    const lejos = Math.min(2.3, Math.max(1, 1.12 / aspecto));
    const c = guion.camara, az = c.az(s) * Math.PI / 180, el = c.el(s) * Math.PI / 180, d = c.dist(s) * lejos;
    mira.set(c.mira[0](s), c.mira[1](s), c.mira[2](s));
    camara.position.set(mira.x + Math.cos(el) * Math.cos(az) * d, mira.y + Math.sin(el) * d, mira.z + Math.cos(el) * Math.sin(az) * d);
    camara.lookAt(mira);
    const mediaAltura = Math.tan(camara.fov * Math.PI / 360);
    u.uT.value = s; u.uFrente.value = guion.frente(s); u.uAbrir.value = guion.abrir(s); u.uNombres.value = guion.nombres(s); u.uOla.value = guion.ola(s); u.uEspera.value = guion.espera(s);
    if (guion.binaria) { u.uSep.value = guion.sep(s); u.uAng.value = guion.ang(s) * Math.PI / 180; u.uFlujo.value = guion.flujo(s); u.uInfinito.value = guion.infinito(s); }
    u.uPx.value = tam.y / (2 * mediaAltura); u.uPR.value = renderer.getPixelRatio();
    u.uTexto.value = Math.min(0.66, 0.86 * aspecto) * PROFUNDIDAD_TEXTO * mediaAltura;
    // Las chispas estallan fuera del círculo de los nombres: en vertical solo arriba (abajo está su texto), en horizontal a los lados.
    u.uChispaAbajo.value = aspecto < 1 ? 0 : 1;
    const altoV = PROFUNDIDAD_TEXTO * mediaAltura, anchoV = altoV * aspecto;
    u.uChispaX.value = aspecto < 1 ? anchoV * 0.62 : anchoV * 0.8; u.uChispaY.value = aspecto < 1 ? altoV * 0.72 : altoV * 0.5;
  }
  function dibujar() {
    const r = renderer, tm = r.toneMapping; r.toneMapping = THREE.NoToneMapping;
    r.setRenderTarget(null); r.clear(); r.render(escena, camara); r.toneMapping = tm;
  }
  function liberar() {
    if (puntos) { escena.remove(puntos); puntos.geometry.dispose(); puntos.material.dispose(); puntos = null; }
    guion = null;
  }
  return { preparar, fijar, dibujar, liberar, get guion() { return guion; } };
}
