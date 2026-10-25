// Nuestro sistema solar, dentro de un brazo de la galaxia de Xiomara: una escena aparte con el
// Sol en el centro (los planetas conservan sus coordenadas y reciben su luz de él). Desde aquí
// la galaxia se ve por dentro: una gran banda rosa que rodea todo el cielo, con su núcleo
// dorado hacia el centro galáctico, nubes de estrellas, polvo oscuro y nudos rosados.
// El universo lejano (cielo, galaxias, cosmos) sigue detrás, a su distancia.
import * as THREE from 'three';
import { deUnTiron } from '../util/azarSemilla.js';
import { texBrillo, texDestello, texEstrellaGigante } from './texturas.js';
import { Q } from '../util/dispositivo.js';

const RUIDO = /* glsl */`
  float h3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }   // sin senos: con fract(sin(x)·43758) cada GPU redondea distinto el mismo punto de la rejilla y el ruido salía a bloques de bordes rectos
  float rn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm3(vec3 p){ return rn3(p) * 0.5 + rn3(p * 2.03 + 1.7) * 0.27 + rn3(p * 4.1 + 3.1) * 0.15 + rn3(p * 8.3 + 5.3) * 0.08; }`;

export const RADIO_SOL = 150;

// De un tirón; la carga usa construirSolar, el mismo código como generador (yield entre pasos: ver porTramos).
export const crearSolar = (...a) => deUnTiron(construirSolar(...a));
export function* construirSolar({ haciaCentroGalactico, renderer, uPR = { value: 1 } }) {
  const escena = new THREE.Scene();

  yield;
  // ── La galaxia de Xiomara vista desde dentro: se «hornea» una sola vez en un cubemap que es
  // el fondo de esta escena (sin coste por cuadro, como el cielo principal) ──
  const centro = haciaCentroGalactico.clone().setY(0).normalize();
  const banda = new THREE.Mesh(new THREE.SphereGeometry(100, 64, 32), new THREE.ShaderMaterial({
    uniforms: { uCentro: { value: centro } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: RUIDO + /* glsl */`
      uniform vec3 uCentro; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float lat = d.y, lon = acos(clamp(dot(normalize(vec3(d.x, 0.0, d.z)), uCentro), -1.0, 1.0));
        float bulbo = exp(-lon * lon * 1.3);
        vec3 gal = vec3(d.x * 3.0, lat * 14.0, d.z * 3.0);
        float ancho = 0.075 + 0.11 * bulbo + (fbm3(d * 3.0) - 0.5) * 0.03;
        float l2 = (lat + (fbm3(d * 2.5 + 9.0) - 0.5) * 0.04) / ancho;
        float bandaV = exp(-l2 * l2);
        float nubes = pow(smoothstep(0.3, 0.85, fbm3(gal * 1.4) * 0.6 + fbm3(d * 10.0) * 0.4), 1.3) * 0.85 + smoothstep(0.5, 0.9, fbm3(d * 26.0)) * 0.4;
        float polvo = smoothstep(0.42, 0.66, fbm3(gal * 1.8 + 3.0) * 0.6 + fbm3(d * 9.0) * 0.4) * exp(-pow((lat + 0.01) / (ancho * 0.32), 2.0));
        polvo = clamp(polvo * (0.55 + 0.4 * bulbo), 0.0, 0.8);
        // Colores de la galaxia de Xiomara: núcleo dorado, brazos rosa intenso, bordes violeta.
        vec3 col = mix(mix(vec3(0.75, 0.45, 1.0), vec3(1.0, 0.45, 0.75), smoothstep(0.0, 0.6, bulbo + nubes * 0.3)), vec3(1.0, 0.82, 0.6), bulbo * 0.8);
        float luz = bandaV * (0.25 + 0.75 * nubes) * (0.4 + 0.55 * bulbo) + exp(-lon * lon * 10.0 - lat * lat * 160.0) * 0.5 + exp(-pow(lat / (ancho * 2.8), 2.0)) * 0.05;
        vec3 c = col * luz * (1.0 - polvo);
        c += vec3(1.0, 0.4, 0.62) * pow(smoothstep(0.72, 0.92, fbm3(d * 24.0 + 5.0)), 2.0) * bandaV * (1.0 - polvo) * 0.6;
        // (Las estrellas de la galaxia ya no se hornean aquí: son puntos nítidos, ver estrellasBanda.)
        float a = max(max(c.r, c.g), c.b);
        // Sin pasar del umbral del brillo: una zona grande y brillante haría bloques al difuminarse.
        c = min(c * 0.7, vec3(0.55)) + vec3(0.006, 0.002, 0.012);
        c += (h3(d * 4000.0) - 0.5) / 255.0;   // tramado contra bandas de color
        gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false
  }));
  const horno = new THREE.Scene(); horno.add(banda);
  yield;
  // En sRGB (como una foto): con 8 bits lineales los tonos oscuros de la banda tenían escalones gruesos que, ampliados,
  // se veían como rectángulos de bordes rectos en el cielo de Rosa, Azul y las cartas. Misma memoria, ~3 veces más niveles en lo oscuro.
  const cubo = new THREE.WebGLCubeRenderTarget(Q.cielo, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, colorSpace: THREE.SRGBColorSpace });
  new THREE.CubeCamera(1, 1000, cubo).update(renderer, horno);
  banda.geometry.dispose(); banda.material.dispose();
  escena.background = cubo.texture;

  yield;
  // Estrellas de la galaxia de Xiomara, mucho más densas en la banda: antes iban horneadas en el cielo (1024 por cara) y
  // al ampliarse en un móvil se veían como manchitas borrosas. Ahora son puntos nítidos a cualquier resolución, con la
  // misma densidad (≈0,35 % de los píxeles del cielo horneado, hasta 4,4 veces más en la banda), colores y brillos que las horneadas.
  {
    const azar = (() => { let s = 20251215; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();   // mulberry32
    const pos = [], col = [], v = new THREE.Vector3(), base = centro, lado = new THREE.Vector3(-base.z, 0, base.x);
    const c1 = new THREE.Color(0.75, 0.45, 1.0), c2 = new THREE.Color(1.0, 0.45, 0.75), c3 = new THREE.Color(1.0, 0.82, 0.6), c = new THREE.Color();
    const CELDAS = 6 * 1024 * 1024;   // el cielo horneado decidía una estrella por cada píxel de sus 6 caras de 1024
    let intentos = Math.round(CELDAS * 0.0155);
    while (intentos-- > 0) {
      if (intentos % 4000 === 0) yield;
      const z = azar() * 2 - 1, a = azar() * Math.PI * 2, r = Math.sqrt(1 - z * z); v.set(r * Math.cos(a), z, r * Math.sin(a));
      const lat = v.y, lon = Math.acos(Math.min(1, Math.max(-1, (v.x * base.x + v.z * base.z) / Math.max(1e-6, Math.hypot(v.x, v.z)))));
      const bulbo = Math.exp(-lon * lon * 1.3), ancho = 0.075 + 0.11 * bulbo, l2 = lat / ancho, bandaV = Math.exp(-l2 * l2);
      if (azar() * 0.0155 > 0.0035 + 0.012 * bandaV) continue;
      c.copy(c1).lerp(c2, THREE.MathUtils.smoothstep(bulbo + 0.15, 0, 0.6)).lerp(c3, bulbo * 0.8);
      const k = 0.4 + 0.8 * azar(), luz = (x) => Math.min(0.55, x * 0.7 * k);   // el mismo brillo que las horneadas
      const r0 = 1 + (c.r - 1) * 0.4, g0 = 1 + (c.g - 1) * 0.4, b0 = 1 + (c.b - 1) * 0.4;
      pos.push(v.x, v.y, v.z); col.push(luz(r0), luz(g0), luz(b0));
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const estrellasBanda = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: { uPR },
      // A distancia infinita (solo la rotación de la cámara). Se dibujan las primeras, justo después del cielo y sin
      // profundidad: todo lo demás se pinta encima. Un poco por delante del plano lejano: justo en él, el recorte de la GPU
      // descartaba por redondeo la mayoría de los puntos.
      vertexShader: 'uniform float uPR; attribute vec3 color; varying vec3 vC; void main(){ vC = color; vec4 p = projectionMatrix * vec4(mat3(modelViewMatrix) * position, 1.0); gl_Position = vec4(p.xy, p.w * 0.9999, p.w); gl_PointSize = 2.0 * uPR; }',
      fragmentShader: 'varying vec3 vC; void main(){ vec2 q = gl_PointCoord - 0.5; if (dot(q, q) > 0.25) discard; gl_FragColor = vec4(vC, 1.0); }',
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    estrellasBanda.frustumCulled = false; estrellasBanda.renderOrder = -900; estrellasBanda.name = 'Estrellas de la banda'; escena.add(estrellasBanda);
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
