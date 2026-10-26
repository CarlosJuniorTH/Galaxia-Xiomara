// Nuestro sistema solar, dentro de un brazo de la galaxia de Xiomara: una escena aparte con el
// Sol en el centro (los planetas conservan sus coordenadas y reciben su luz de él). Desde aquí,
// muy lejos y en su dirección real, solo se ve el centro de la galaxia: su núcleo dorado hecho de
// motas nítidas y un leve rastro del disco. El resto del universo no se ve desde aquí.
import * as THREE from 'three';
import { deUnTiron } from '../util/azarSemilla.js';
import { texTexto } from './texturas.js';
import { enBrazo } from './galaxia.js';

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
  // umbral del resplandor (0,78), así no se difumina en mancha. Con la banda de la galaxia y las vecinas, unos 27 000 puntos en una sola llamada: nada en el móvil.
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
    // La galaxia de Xiomara vista desde dentro: sus estrellas, muestreadas como las de la galaxia 3D (galaxia.js: cinco
    // brazos con la misma espiral, el disco entre ellos) y vistas desde donde está el Sol de verdad (el punto del brazo,
    // enBrazo(1, 0,62)). Cada una se dibuja en su dirección, más brillante cuanto más cerca: forman la banda que cruza
    // todo el cielo, con su estructura real (los brazos que se superponen, los huecos entre ellos, más luz hacia el centro
    // y casi nada hacia el borde), y las vecinas del brazo del Sol salpican también lo alto del cielo. Motas de 1–2 px.
    {
      const sol = enBrazo(1, 0.62, 0), P = new THREE.Vector3(), rel = new THREE.Vector3();
      const cB = new THREE.Color();
      for (let i = 0; i < 15000; i++) {
        if (i % 4000 === 0) yield;
        let x, z, rad;
        if (azar() < 0.14) { rad = 60 + Math.pow(azar(), 0.8) * 980 * 1.05; const a = azar() * Math.PI * 2; x = Math.cos(a) * rad; z = Math.sin(a) * rad; }
        else ({ x, z, rad } = enBrazo(i % 5, Math.pow(azar(), 0.55), gauss() * 0.12 * (1 + 0.9 * azar())));
        P.set(x, gauss() * (10 + 26 * Math.exp(-Math.abs(rad - 668) / 260)), z);   // el disco, algo más grueso cerca del Sol
        rel.set(P.x - sol.x, P.y, P.z - sol.z); const d = rel.length(); if (d < 6) continue;
        const l = Math.atan2(rel.dot(lado), rel.dot(centro)) / GRADO, b = Math.asin(THREE.MathUtils.clamp(rel.y / d, -1, 1)) / GRADO;
        const nt = rad / 1050, joven = azar() < 0.07;
        // Los colores de la galaxia 3D: centro dorado, brazos rosas que se vuelven magenta y lila hacia fuera, algunas jóvenes
        // azules. Con el color fuerte: a 1–2 px y tan tenues, los tonos suaves se veían grises.
        let realce = 1;
        if (joven) cB.setHSL(0.6 + azar() * 0.05, 0.85, 0.66);
        else if (nt < 0.14) cB.copy(crema).lerp(oro, azar());
        else if (nt < 0.4) { cB.setHSL(0.92 + azar() * 0.05, 1.0, 0.62); realce = 1.25; }
        else if (nt < 0.7) { cB.setHSL(0.94 + azar() * 0.05, 1.0, 0.56); realce = 1.3; }
        else { cB.copy(violeta).lerp(rosa, azar() * 0.5); realce = 1.3; }
        const luz = THREE.MathUtils.clamp(0.07 * Math.pow(420 / d, 1.15), 0.03, 0.34) * (0.55 + 0.45 * azar()) * realce;
        mota(l, b, cB, luz, d < 140 ? 1.6 + azar() * 0.6 : 1 + azar() * 0.7);
      }
    }
    // Estrellas vecinas por todo el cielo (fuera de la banda también): pocas, nítidas y de colores reales.
    const vecina = new THREE.Color();
    for (let i = 0; i < 1600; i++) {
      const l = azar() * 360 - 180, b = Math.asin(azar() * 2 - 1) / GRADO, k = azar();
      vecina.setHSL(k < 0.15 ? 0.6 : k < 0.3 ? 0.1 : 0.95, k < 0.3 ? 0.7 : 0.25, 0.85);
      mota(l, b, vecina, 0.05 + 0.2 * Math.pow(azar(), 4), 1 + azar() * (azar() < 0.1 ? 1.2 : 0.5));
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
    // El polvo oscuro de sus brazos, como en la galaxia 3D (galaxia.js: filamentos finos en el borde interior de cada brazo),
    // visto desde el Sol: motas oscuras nítidas que se dibujan encima de la banda y la parten en grietas, como la Gran Grieta
    // de nuestro cielo. Opacas (sin degradado): tapan las motas de luz que quedan detrás.
    {
      const sol = enBrazo(1, 0.62, 0), pos = [], tam = [], v = new THREE.Vector3();
      for (let i = 0; i < 9000; i++) {
        const b = i % 5, t = 0.12 + azar() * 0.83, c = enBrazo(b, t, -0.13 + gauss() * 0.035);
        v.set(c.x - sol.x, gauss() * 5, c.z - sol.z); const d = v.length(); if (d < 160) continue;
        v.normalize(); pos.push(v.x, v.y, v.z); tam.push(d < 450 ? 2.6 + azar() : 1.6 + azar() * 0.8);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aTam', new THREE.Float32BufferAttribute(tam, 1));
      const polvo = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uPR },
        vertexShader: 'uniform float uPR; attribute float aTam; varying float vT; void main(){ vec4 p = projectionMatrix * vec4(mat3(modelViewMatrix) * position, 1.0); gl_Position = vec4(p.xy, p.w * 0.9999, p.w); vT = aTam * uPR; gl_PointSize = vT; }',
        fragmentShader: 'varying float vT; void main(){ vec2 q = gl_PointCoord - 0.5; if (vT >= 2.5 && dot(q, q) > 0.25) discard; gl_FragColor = vec4(0.012, 0.004, 0.014, 1.0); }',
        depthTest: false, depthWrite: false }));
      polvo.frustumCulled = false; polvo.renderOrder = -899.5; polvo.name = 'Polvo de la galaxia'; escena.add(polvo);
    }
  }

  yield;
  // ── Los cinturones: el de asteroides (entre Marte, a 2900, y el gigante del corazón, a 4157) y el de Kuiper, más allá de
  // Neptuno (8400). Motas nítidas de 1–2 px que giran despacio alrededor del Sol, las de dentro más deprisa (Kepler,
  // calculado en la GPU: en cada cuadro solo cambia un uniforme). Unas 5000 en dos llamadas. ──
  const uT = { value: 0 };
  const cinturon = (n, rIn, rOut, espesor, colores, luz, semilla) => {
    let k = semilla; const az = () => (k = (k * 16807) % 2147483647) / 2147483647;
    const orb = new Float32Array(n * 4), col = new Float32Array(n * 3), tam = new Float32Array(n), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      // Más apretado hacia el centro del cinturón y con algunos huecos (como los de Kirkwood): no es un anillo liso.
      let r; do r = rIn + (rOut - rIn) * (0.5 + (az() + az() + az() - 1.5) / 1.5 * 0.5); while (Math.abs(Math.sin(r / (rOut - rIn) * 9.0)) < 0.12 && az() < 0.7);
      orb.set([r, az() * Math.PI * 2, (az() + az() - 1) * espesor, 0.016 * Math.pow(3000 / r, 1.5)], i * 4);
      c.set(colores[Math.floor(az() * colores.length)]).multiplyScalar(luz * (0.45 + 0.55 * az())); col.set([c.r, c.g, c.b], i * 3);
      tam[i] = 1 + az() * (az() < 0.08 ? 1.2 : 0.6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aOrb', new THREE.BufferAttribute(orb, 4)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uT, uPR },
      vertexShader: /* glsl */`attribute vec4 aOrb; attribute vec3 color; attribute float aTam; uniform float uT, uPR; varying vec3 vC; varying float vT;
        void main(){ float a = aOrb.y + uT * aOrb.w; vec4 mv = modelViewMatrix * vec4(cos(a) * aOrb.x, aOrb.z, sin(a) * aOrb.x, 1.0);
          gl_Position = projectionMatrix * mv; vT = aTam * uPR; gl_PointSize = vT;
          vC = color * clamp(-mv.z / 60.0, 0.0, 1.0); }`,   // la que pasa rozando la cámara se apaga (no un parpadeo enorme)
      fragmentShader: 'varying vec3 vC; varying float vT; void main(){ vec2 q = gl_PointCoord - 0.5; if (vT >= 2.5 && dot(q, q) > 0.25) discard; gl_FragColor = vec4(vC, 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.frustumCulled = false; escena.add(m); return m;
  };
  cinturon(2600, 3050, 3620, 45, ['#c9b8a4', '#a89a8c', '#e0c9a8', '#9d8f86'], 0.42, 4157);
  cinturon(2600, 9000, 11600, 320, ['#c8d6ff', '#e4dcff', '#b9c9f0', '#f2e6ff'], 0.3, 1215);
  // Un rótulo tenue en el cielo, junto al centro de la galaxia y siguiendo su banda: lo que se ve desde aquí es ella. Vivimos
  // dentro de Xiomara. Letras nítidas (sin sombra difusa), a distancia infinita y de tamaño fijo en pantalla.
  const rotulo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texTexto('la galaxia de Xiomara', { fuente: "italic 500 60px 'Cormorant Garamond', Georgia, serif", color: '#f6d9e8', sombra: 'rgba(0,0,0,0)' }), transparent: true, opacity: 0.5, depthTest: false, depthWrite: false, sizeAttenuation: false }));
  rotulo.scale.set(0.2, 0.031, 1); rotulo.renderOrder = -899; rotulo.frustumCulled = false; escena.add(rotulo);
  const dirRotulo = centro.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0).add(new THREE.Vector3(0, -0.06, 0)).normalize();   // un poco por debajo del núcleo

  yield;
  // ── El Sol: superficie hirviendo, corona de filamentos y motas, rayos cortos; ilumina a los planetas ──
  // Todo nítido, sin halos ni brillos difusos (antes: tres sprites de brillo de hasta 24 radios y una cruz de rayos que
  // cruzaba la pantalla). La superficie no pasa del umbral del resplandor (0,78) para que el compositor no la difumine:
  // brilla por su detalle (granulación en celdas, manchas con penumbra, fáculas y limbo oscurecido).
  const sol = new THREE.Group(); escena.add(sol);
  const superficie = new THREE.Mesh(new THREE.SphereGeometry(RADIO_SOL, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vN, vP; void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: RUIDO + /* glsl */`
      uniform float uT; varying vec3 vN, vP;
      // Granulación: celdas de convección (Voronoi): centros brillantes y bordes oscuros finos.
      float celdas(vec3 p){ vec3 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 g = vec3(x, y, z), o = vec3(h3(i + g), h3(i + g + 7.1), h3(i + g + 13.7));
          o = 0.5 + 0.4 * sin(uT * 0.25 + 6.2831 * o); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
        return d2 - d1; }
      void main(){
        vec3 q = normalize(vP);
        float g = smoothstep(0.0, 0.5, celdas(q * 75.0)), fina = rn3(q * 220.0 + uT * 0.05);
        float mancha = fbm3(q * 3.2 + 11.0), umbra = smoothstep(0.73, 0.76, mancha), penumbra = smoothstep(0.69, 0.72, mancha) - umbra;
        float fac = smoothstep(0.64, 0.7, fbm3(q * 7.0 - uT * 0.01));
        float mu = max(dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0), limbo = 0.42 + 0.58 * pow(mu, 0.55);
        // Dorado intenso en el centro y naranja rojizo en el borde: luminancia ≤ ~0,65 (bajo el umbral) con el color saturado.
        vec3 col = mix(vec3(0.95, 0.3, 0.05), vec3(1.0, 0.6, 0.18), pow(mu, 0.45)) * (0.68 + 0.32 * g) * (0.9 + 0.1 * fina);
        col *= 1.0 - penumbra * 0.45 - umbra * 0.85; col += vec3(1.0, 0.75, 0.4) * fac * (1.0 - mu) * 0.3;
        gl_FragColor = vec4(min(col * limbo * 0.95, vec3(0.98, 0.66, 0.3)), 1.0); }`
  }));
  sol.add(superficie);
  yield;
  // Corona: filamentos finos que salen del borde (líneas de campo), nítidos, con un poco de movimiento.
  const corona = new THREE.Mesh(new THREE.RingGeometry(RADIO_SOL * 0.99, RADIO_SOL * 1.9, 360, 6), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: RUIDO + /* glsl */`uniform float uT; varying vec2 vP;
      void main(){ float r = length(vP) / ${RADIO_SOL.toFixed(1)}, a = atan(vP.y, vP.x);
        // Cada filamento es una franja angular estrecha (borde nítido) que se curva un poco con la altura y se corta a su largo.
        float u = a * 34.0 + sin(a * 5.0 + r * 3.0 + uT * 0.1) * 1.2, id = floor(u), f = fract(u);
        float largo = 1.05 + 0.42 * h3(vec3(id, 3.0, 1.0)), ancho = 0.04 + 0.05 * h3(vec3(id, 5.0, 2.0));
        float hilo = step(abs(f - 0.5), ancho) * step(r, largo) * step(1.0, r) * step(0.55, h3(vec3(id, 9.0, 4.0)));
        float k = hilo * (0.5 - 0.35 * (r - 1.0) / (largo - 1.0 + 1e-3));
        gl_FragColor = vec4(vec3(1.0, 0.8, 0.55) * k, k); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  }));
  sol.add(corona);
  // Motas de la corona: chispas de 1–2 px que suben despacio desde la superficie y se apagan al alejarse.
  const motasCorona = (() => {
    const n = 600, pos = new Float32Array(n * 3), dat = new Float32Array(n * 2); let k = 31337; const az = () => (k = (k * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3(az() - 0.5, az() - 0.5, az() - 0.5); if (v.lengthSq() > 0.25 || v.lengthSq() < 1e-4) { i--; continue; } v.normalize(); pos.set([v.x, v.y, v.z], i * 3); dat.set([az(), 0.4 + az() * 0.8], i * 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aDat', new THREE.BufferAttribute(dat, 2));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uT: superficie.material.uniforms.uT, uPR },
      vertexShader: /* glsl */`attribute vec2 aDat; uniform float uT, uPR; varying float vA;
        void main(){ float f = fract(aDat.x + uT * 0.03 * aDat.y); vec3 p = position * ${RADIO_SOL.toFixed(1)} * (1.02 + f * 0.6);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); gl_PointSize = (1.0 + aDat.y) * uPR; vA = (1.0 - f) * 0.4; }`,
      fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * vA, 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.frustumCulled = false; sol.add(m); return m;
  })();
  // Rayos cortos y finos (1 px), de cara a la cámara: ocho, del borde a ~1,6 radios. Una pista de lucero, no una cruz.
  const rayos = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2 + 0.2, l = i % 2 ? 1.45 : 1.75; return [new THREE.Vector3(Math.cos(a) * 1.12, Math.sin(a) * 1.12, 0), new THREE.Vector3(Math.cos(a) * l, Math.sin(a) * l, 0)]; }).flat().map(v => v.multiplyScalar(RADIO_SOL))),
    new THREE.LineBasicMaterial({ color: '#ffe2b8', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  rayos.frustumCulled = false; sol.add(rayos);
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
      superficie.material.uniforms.uT.value = t; corona.material.uniforms.uT.value = t; materialArco.uniforms.uT.value = t; uT.value = t;
      rotulo.position.copy(camera.position).addScaledVector(dirRotulo, 4000);
      for (const [i, a] of arcos.entries()) a.scale.setScalar(1 + Math.sin(t * 0.3 + i * 1.7) * 0.12);
      superficie.rotation.y = t * 0.01; corona.lookAt(camera.position); rayos.quaternion.copy(camera.quaternion);
      // De lejos el Sol no puede quedarse en un punto de 1 px: la corona y los rayos crecen lo justo para que se reconozca.
      const k = Math.max(1, camera.position.length() / 5200); rayos.scale.setScalar(k); motasCorona.scale.setScalar(Math.min(1.6, k));
    }
  };
}
