// Nuestro sistema solar, dentro de un brazo de la galaxia de Xiomara: una escena aparte con el
// Sol en el centro (los planetas conservan sus coordenadas y reciben su luz de él). Desde aquí,
// muy lejos y en su dirección real, solo se ve el centro de la galaxia: su núcleo dorado hecho de
// motas nítidas y un leve rastro del disco. El resto del universo no se ve desde aquí.
import * as THREE from 'three';
import { deUnTiron } from '../util/azarSemilla.js';
import { texBrillo, texDestello, texEstrellaGigante } from './texturas.js';

const RUIDO = /* glsl */`
  float h3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }   // sin senos: con fract(sin(x)·43758) cada GPU redondea distinto el mismo punto de la rejilla y el ruido salía a bloques de bordes rectos
  float rn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm3(vec3 p){ return rn3(p) * 0.5 + rn3(p * 2.03 + 1.7) * 0.27 + rn3(p * 4.1 + 3.1) * 0.15 + rn3(p * 8.3 + 5.3) * 0.08; }`;

export const RADIO_SOL = 150;

// De un tirón; la carga usa construirSolar, el mismo código como generador (yield entre pasos: ver porTramos).
export const crearSolar = (...a) => deUnTiron(construirSolar(...a));
export function* construirSolar({ haciaCentroGalactico, uPR = { value: 1 } }) {
  const escena = new THREE.Scene();

  yield;
  // ── El centro de la galaxia de Xiomara, muy lejos ──
  // Desde el brazo solo se ve su núcleo, en la dirección real del centro galáctico (haciaCentroGalactico, la opuesta al
  // punto del brazo donde está el sistema solar: galaxia.puntoBrazo) y en el plano de la galaxia (el de las órbitas), con
  // un leve rastro del disco a los lados. Nada más: ni la banda difusa que rodeaba el cielo (era un degradado horneado en un
  // cubemap) ni sus estrellas una a una, ni el resto del universo (index.js ya no lo trae a esta escena).
  // Todo son motas nítidas de 1–2 px sumadas, sin halo: el núcleo brilla por acumulación de motas, y ninguna suma llega al
  // umbral del resplandor (0,78), así no se difumina en mancha. Unos 16 500 puntos en una sola llamada: nada en el móvil.
  const centro = haciaCentroGalactico.clone().setY(0).normalize();
  {
    const azar = (() => { let s = 20251215; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();   // mulberry32
    const gauss = () => Math.sqrt(-2 * Math.log(1 - azar())) * Math.cos(azar() * Math.PI * 2);
    const lado = new THREE.Vector3(-centro.z, 0, centro.x), arriba = new THREE.Vector3(0, 1, 0), GRADO = Math.PI / 180;
    const pos = [], col = [], tam = [], lb = [], v = new THREE.Vector3(), c = new THREE.Color();
    const oro = new THREE.Color(1.0, 0.82, 0.6), crema = new THREE.Color(1.0, 0.95, 0.86), rosa = new THREE.Color(1.0, 0.45, 0.75), violeta = new THREE.Color(0.75, 0.45, 1.0);
    // Dirección a (l, b) grados del centro galáctico (longitud en el plano, latitud hacia arriba).
    const mota = (l, b, color, luz, t) => {
      v.copy(centro).multiplyScalar(Math.cos(b * GRADO) * Math.cos(l * GRADO)).addScaledVector(lado, Math.cos(b * GRADO) * Math.sin(l * GRADO)).addScaledVector(arriba, Math.sin(b * GRADO));
      pos.push(v.x, v.y, v.z); col.push(color.r * luz, color.g * luz, color.b * luz); tam.push(t); lb.push(l, b);
    };
    // Bulbo: achatado (×0,55 en latitud), dorado y más blanco hacia dentro, rosado en su borde; ~1,6° de radio característico
    // (se ve lejos: unos 25 px en el PC). Sin tope duro de radio: los que pasarían de 9° se vuelven a sortear (con un tope se
    // amontonaban en el borde y dibujaban una elipse).
    for (let i = 0; i < 9000; i++) {
      if (i % 4000 === 0) yield;
      let r; do r = 1.6 * Math.pow(-Math.log(1 - azar() * 0.9999), 1.2); while (r > 9);
      const a = azar() * Math.PI * 2;
      c.copy(crema).lerp(oro, Math.min(1, r / 1.5)).lerp(rosa, THREE.MathUtils.smoothstep(r, 2.5, 8) * 0.7);
      mota(r * Math.cos(a), r * Math.sin(a) * 0.55, c, (0.06 + 0.12 * Math.exp(-r / 1.2)) * (0.6 + 0.4 * azar()), 1 + azar());
    }
    // Núcleo: el corazón brillante, apretado en ~0,3°.
    for (let i = 0; i < 1500; i++) { const r = Math.abs(gauss()) * 0.3, a = azar() * Math.PI * 2; mota(r * Math.cos(a), r * Math.sin(a) * 0.6, crema, 0.1 + 0.06 * azar(), 1.3 + azar() * 0.9); }
    yield;
    // Rastro del disco: una línea fina y tenue a ambos lados, cada vez más débil (hasta ±70°).
    for (let i = 0; i < 6000; i++) {
      const l = (azar() < 0.5 ? -1 : 1) * 70 * Math.pow(azar(), 1.6), f = Math.abs(l) / 70;
      c.copy(rosa).lerp(violeta, f).lerp(oro, (1 - f) * (1 - f) * 0.5);
      mota(l, gauss() * (0.25 + 0.8 * f), c, (0.03 + 0.045 * (1 - f) * (1 - f)) * (0.5 + 0.5 * azar()), 1 + azar() * 0.6);
    }
    // Tope de luz: donde las motas se apilan (el núcleo), cada celda de 1/15° (~1 px CSS) suma como mucho TOPE (luz × área de
    // cada mota en px). Así el núcleo es brillante pero ningún píxel pasa del umbral del resplandor (0,78) y no se difumina en
    // una mancha. Medido en el búfer de la escena (tests/navegador/solar.mjs): pico ≈ 0,55 en el PC y ≈ 0,65 en el perfil del
    // iPhone (allí, con 1/15° ≈ 0,86 px CSS, las motas se apilan algo más por píxel).
    {
      const TOPE = 0.3, celdas = new Map(), clave = k => Math.round(lb[k * 2] * 15) * 4096 + Math.round(lb[k * 2 + 1] * 15), luz = k => (col[k * 3] + col[k * 3 + 1] + col[k * 3 + 2]) / 3 * tam[k] * tam[k];
      for (let k = 0; k < tam.length; k++) celdas.set(clave(k), (celdas.get(clave(k)) ?? 0) + luz(k));
      for (let k = 0; k < tam.length; k++) { const suma = celdas.get(clave(k)); if (suma > TOPE) for (let j = 0; j < 3; j++) col[k * 3 + j] *= TOPE / suma; }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('aTam', new THREE.Float32BufferAttribute(tam, 1));
    const nucleoGalactico = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: { uPR },
      // A distancia infinita (solo la rotación de la cámara). Se dibujan los primeros, sin profundidad: todo lo demás se pinta
      // encima. Un poco por delante del plano lejano: justo en él, el recorte de la GPU descartaba por redondeo muchos puntos.
      // Las de 2,5 px o más se redondean (discard, sin degradado); las menores son un píxel o dos, nítidos.
      vertexShader: 'uniform float uPR; attribute vec3 color; attribute float aTam; varying vec3 vC; varying float vT; void main(){ vC = color; vec4 p = projectionMatrix * vec4(mat3(modelViewMatrix) * position, 1.0); gl_Position = vec4(p.xy, p.w * 0.9999, p.w); vT = aTam * uPR; gl_PointSize = vT; }',
      fragmentShader: 'varying vec3 vC; varying float vT; void main(){ vec2 q = gl_PointCoord - 0.5; if (vT >= 2.5 && dot(q, q) > 0.25) discard; gl_FragColor = vec4(vC, 1.0); }',
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    nucleoGalactico.frustumCulled = false; nucleoGalactico.renderOrder = -900; nucleoGalactico.name = 'Centro galáctico'; escena.add(nucleoGalactico);
  }

  yield;
  // ── El Sol: superficie hirviendo, corona y destellos; ilumina a los planetas ──
  const sol = new THREE.Group(); escena.add(sol);
  const superficie = new THREE.Mesh(new THREE.SphereGeometry(RADIO_SOL, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vN, vP; void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: RUIDO + /* glsl */`
      uniform float uT; varying vec3 vN, vP;
      void main(){
        vec3 q = normalize(vP);
        float gran = fbm3(q * 14.0 + uT * 0.04), manchas = smoothstep(0.7, 0.78, fbm3(q * 3.0 + 11.0));
        float fac = smoothstep(0.62, 0.8, fbm3(q * 6.0 - uT * 0.02));
        float mu = max(dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0), limbo = pow(mu, 0.5);
        vec3 col = mix(vec3(1.0, 0.55, 0.2), vec3(1.0, 0.92, 0.75), limbo) * (0.7 + 0.5 * gran) * (1.0 - manchas * 0.6) + vec3(1.0, 0.9, 0.7) * fac * 0.25;
        gl_FragColor = vec4(col * (0.5 + 0.9 * limbo) * 0.85, 1.0); }`
  }));
  sol.add(superficie);
  const brillo = texBrillo();
  const capa = (mapa, color, tam, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mapa, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(tam); sol.add(s); return s; };
  const halos = [[capa(brillo, '#ffd9a0', RADIO_SOL * 3.2, 0.32), 3.2], [capa(brillo, '#ffb070', RADIO_SOL * 9, 0.24), 9], [capa(brillo, '#ff9a5a', RADIO_SOL * 24, 0.07), 24]];
  const rayos = capa(texEstrellaGigante(), '#fff1d8', RADIO_SOL * 12, 0.35), destello = capa(texDestello(), '#ffffff', RADIO_SOL * 7, 0.5);
  yield;
  // Corona: filamentos que salen del borde y ondulan.
  const corona = new THREE.Mesh(new THREE.RingGeometry(RADIO_SOL * 0.98, RADIO_SOL * 2.6, 180, 4), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: RUIDO + /* glsl */`uniform float uT; varying vec2 vP;
      void main(){ float r = length(vP) / ${RADIO_SOL.toFixed(1)}, a = atan(vP.y, vP.x);
        float rayo = pow(fbm3(vec3(cos(a) * 6.0, sin(a) * 6.0, r * 0.8 - uT * 0.05)), 2.0);
        float k = exp(-(r - 1.0) * 2.2) * smoothstep(0.98, 1.03, r) * (0.35 + 1.4 * rayo);
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.6) * k, k); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  }));
  sol.add(corona);
  yield;
  // Protuberancias: arcos de plasma que salen de la superficie siguiendo el campo magnético.
  const materialArco = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: RUIDO + `uniform float uT; varying vec2 vUv;
      void main(){ float n = fbm3(vec3(vUv.x * 12.0, vUv.y * 3.0, uT * 0.3));
        float k = (0.45 + 0.9 * n) * (0.6 + 0.4 * sin(vUv.x * 3.14159)); vec3 c = mix(vec3(1.0, 0.35, 0.12), vec3(1.0, 0.75, 0.45), n);
        gl_FragColor = vec4(c * k * 1.6, k); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  });
  const arcos = [];
  for (const [lat, lon, tam] of [[0.3, 0.5, 0.32], [-0.5, 2.1, 0.26], [0.9, 3.6, 0.22], [-0.15, 4.6, 0.36], [0.55, 5.6, 0.2]]) {
    const base = new THREE.Group(), n = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
    base.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    const arco = new THREE.Mesh(new THREE.TorusGeometry(RADIO_SOL * tam, RADIO_SOL * 0.035, 10, 64, Math.PI), materialArco);
    arco.position.y = RADIO_SOL * 0.96; arco.rotation.y = lon * 2.3; base.add(arco); sol.add(base); arcos.push(arco);
  }

  return {
    escena, sol, radioSol: RADIO_SOL,
    actualizar(t, camera) {
      superficie.material.uniforms.uT.value = t; corona.material.uniforms.uT.value = t; materialArco.uniforms.uT.value = t;
      for (const [i, a] of arcos.entries()) a.scale.setScalar(1 + Math.sin(t * 0.3 + i * 1.7) * 0.12);
      superficie.rotation.y = t * 0.01; corona.lookAt(camera.position);
      // Los brillos ópticos conservan su tamaño en el cielo al alejarse o acercarse.
      const k = Math.min(1.6, Math.max(0.12, camera.position.length() / 2200));
      rayos.scale.setScalar(RADIO_SOL * 12 * k); destello.scale.setScalar(RADIO_SOL * 7 * k);
      for (const [h, base] of halos) h.scale.setScalar(RADIO_SOL * Math.max(base * k, base > 4 ? 3 : 2.6));
    }
  };
}
