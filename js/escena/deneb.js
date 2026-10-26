// Deneb de cerca: una supergigante blanca azulada (tipo A2 Ia) y su mundo, y su videoclip: el nacimiento de la estrella
// (tiempos y curvas: js/util/escenaDeneb.js). En el espacio del grupo de Deneb (cosmos.js; la cámara llega a ~450).
//  · superficie: esfera opaca con granulación fina (unas 150 celdas a lo ancho del disco, contraste suave, que hierven
//    despacio y se funden en su media cuando miden menos de dos píxeles), supergranulación, fáculas, rotación
//    diferencial, oscurecimiento al limbo continuo del blanco cegador del centro al azul del borde (la luz se comprime:
//    el núcleo no quema la textura) y un ribete cromosférico rosado y fino en el borde; con la formación pasa de nada a
//    una chispa blanca azulada y, al encenderse, a la estrella entera.
//  · nebulosa: la nube que su luz esculpe, horneada en textura (nebulosaDeneb.js): cavidad con frente de ionización,
//    pared con hebras y polvo recortado, pilares con el filo encendido; tres láminas con paralaje. Su luz llega con un
//    frente que sale de la estrella (el «tallado»); delante de él, la nube está oscura y apretada hacia el centro.
//  · motas de acento: estrellas recién nacidas en el borde de la cavidad, el gas de delante que la luz se lleva y el
//    núcleo de la nube que cae para formarla (unas 2 600, con dos copias «fantasma» de estela mientras se mueven).
//  · viento y corona: motas que salen de la superficie (más en unos chorros, las serpentinas de la corona), un borde de
//    espículas finísimas y, al encenderse, el frente de motas que sale de ella.
//  · eyecciones: chorros de motas que la estrella lanza (en el drop, con el bombo; fuera de la escena, de vez en cuando).
// Toda la luz son motas nítidas de 1,5–3 px (nada de halos ni degradados); delante de la estrella no hay motas (se ve
// limpia). Geometrías y materiales se crean en la carga; en cada cuadro solo cambian uniformes.
import * as THREE from 'three';
import { EXPOSICION } from './exposicion.js';
import { RUIDO_TABLA, texturaRuido } from './nube.js';
import { crearNebulosaDeneb } from './nebulosaDeneb.js';

export const RADIO_DENEB = 100;   // radio de la supergigante en el espacio de Deneb (la cámara llega a 450: 0,22 del encuadre)
const R = RADIO_DENEB;

function azarCon(semilla) { let s = semilla >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; }

const motas = (uniforms, vertexShader) => new THREE.ShaderMaterial({
  uniforms, vertexShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  // Punto redondo con núcleo: nítido, sin cola difusa (sin discard: mejor para las GPU de teselas del móvil).
  fragmentShader: /* glsl */`varying vec3 vC; varying float vA;
    void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(max(1.0 - d * 2.0, 0.0), 1.6) + (1.0 - smoothstep(0.0, 0.18, d)) * 0.8;
      gl_FragColor = vec4(vC * a * vA, 1.0); }`
});
// Tamaño en píxeles de una mota de `tam` unidades y su luz (las que no llegan a 1,5 px se reparten con menos luz) y, delante
// de la estrella (dentro de su silueta, entre ella y la cámara), sin motas: la estrella se ve limpia.
const COMUN = /* glsl */`
  float tamMota(float tam, vec4 mv, float maximo){ float px = tam * length(modelViewMatrix[0].xyz) * uScale / max(1.0, -mv.z);
    gl_PointSize = clamp(px, 1.5, maximo * uPR); return min(1.0, px * px / 2.25); }
  float fueraSilueta(vec4 mv, float radio){ vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float dc = max(length(c), 1.0); vec3 eje = c / dc;
    float t = dot(mv.xyz, eje), r = radio * length(modelViewMatrix[0].xyz) * t / dc;
    return 1.0 - step(t, dc) * step(0.0, t) * (1.0 - smoothstep(r * 0.97, r * 1.03, length(mv.xyz - eje * t))); }`;

export function crearDeneb({ uScale, uPR }) {
  const azar = azarCon(1907);
  // marco: los ejes del director de cámara (x derecha, y arriba = el eje Y del universo, z hacia casa); cosmos.js lo orienta.
  const marco = new THREE.Group(); marco.name = 'Deneb de cerca';

  // ── Superficie ──
  const uS = { uRuido: { value: texturaRuido() }, uT: { value: 0 }, uLuz: { value: 1 }, uTemp: { value: 1 }, uGloria: { value: 0.55 }, uPum: { value: 0 } };
  const superficie = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.ShaderMaterial({
    // Transparente (con alfa 1 y profundidad): se dibuja después del cielo profundo, que es «opaco» pero de un grupo
    // con un orden mayor y se sumaba ENCIMA de la estrella (la teñía con sus paredes de polvo).
    uniforms: uS, transparent: true, depthWrite: true, extensions: { derivatives: true },
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: /* glsl */`uniform float uT, uLuz, uTemp, uGloria, uPum; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      ${RUIDO_TABLA}
      vec3 hash3(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
      // Gránulos (Worley 2×2×2): distancia al centro del más cercano y su brillo propio; los centros se mueven despacio
      // dentro de su celda (la superficie hierve).
      vec2 granulo(vec3 p, float t){
        vec3 i = floor(p - 0.5), f = p - i; float d1 = 9.0, id = 0.0;
        for (int x = 0; x < 2; x++) for (int y = 0; y < 2; y++) for (int z = 0; z < 2; z++){ vec3 o = vec3(float(x), float(y), float(z));
          vec3 h = hash3(i + o); vec3 c = o + 0.5 + 0.3 * sin(t * (0.5 + h) + h * 6.2831) - f; float d = dot(c, c) * (0.8 + 0.4 * h.y);
          if (d < d1) { d1 = d; id = h.z; } }
        return vec2(sqrt(d1), id); }
      void main(){
        vec3 n0 = normalize(vP);
        // Rotación diferencial: el ecuador gira algo más deprisa que los polos (el dibujo se desliza por latitudes).
        float giro = uT * 0.012 * (1.0 - 0.35 * n0.y * n0.y), cg = cos(giro), sg = sin(giro);
        vec3 n = vec3(cg * n0.x + sg * n0.z, n0.y, -sg * n0.x + cg * n0.z);
        float mu = clamp(dot(normalize(vN), -normalize(vV)), 0.0, 1.0);
        // Granulación FINA: unas 150 celdas a lo ancho del disco (como en las fotos de la fotosfera del Sol), con contraste
        // suave. Cuando una celda mide menos de ~2 píxeles se funde en su media (sin parpadeo ni moiré).
        vec3 p5 = n * 9.0 + vec3(0.0, 0.0, uT * 0.02);
        vec3 q = n * 75.0 + (vec3(rn3(p5), rn3(p5 + 7.3), rn3(p5 + 13.1)) - 0.5) * 3.0;
        vec2 g = granulo(q, uT * 0.4);
        float px = length(fwidth(q));                                    // celdas por píxel
        float nitido = 1.0 - smoothstep(0.35, 0.7, px);
        float cupula = 1.0 - smoothstep(0.25, 0.8, g.x);
        float gran = mix(0.62, (0.55 + 0.45 * cupula) * (0.85 + 0.3 * g.y), nitido);
        // Encima, la supergranulación y la red de fáculas (manchas mayores, muy suaves) y, cerca del borde, fáculas claras.
        float w = rn3(n * 3.2 + vec3(0.0, uT * 0.015, 0.0)), red = rn3(n * 14.0 - vec3(uT * 0.01)), medio = rn3(n * 32.0 + vec3(uT * 0.04, 0.0, 0.0));
        float hierve = 0.75 + 0.45 * uGloria;
        float textura = 1.0 + ((gran - 0.62) * 0.4 + (w - 0.5) * 0.14 + (red - 0.5) * 0.1 + (medio - 0.5) * 0.14) * hierve;
        // Oscurecimiento al limbo continuo y su color: el centro, blanco cegador apenas azulado; hacia el borde, cada vez más
        // azul y más tenue (una estrella de 8 500 K), sin lila ni gris.
        // (Valores lineales: la salida los pasa a sRGB, que aclara mucho los medios: el borde ha de ir muy abajo.)
        // El oscurecimiento se hace sobre todo con el color (del blanco al azul saturado) y menos con la luz: oscurecer un
        // blanco azulado lo vuelve gris; un azul intenso sigue pareciendo luz.
        float limbo = 0.26 + 0.74 * pow(mu, 0.8);
        vec3 tono = mix(vec3(0.07, 0.34, 1.0), vec3(0.45, 0.74, 1.0), smoothstep(0.0, 0.45, mu));
        tono = mix(tono, vec3(0.97, 0.99, 1.0), smoothstep(0.4, 0.95, mu));
        vec3 col = tono * limbo * textura * 0.86;
        col += vec3(0.35, 0.55, 1.0) * smoothstep(0.6, 0.8, red) * pow(1.0 - mu, 2.0) * 0.12;   // fáculas
        // Núcleo muy brillante sin quemar la textura: por encima de ~0,7 la luz se comprime en vez de recortarse.
        col = mix(col, 0.72 + 0.3 * (1.0 - exp(-(col - 0.72) * 4.0)), step(0.72, col));
        // Ribete cromosférico: una franja finísima rosada y nítida justo en el borde (el anillo de las espículas).
        col += vec3(1.0, 0.45, 0.62) * (1.0 - smoothstep(0.0, 0.07, mu)) * 0.5;
        vec3 brasa = vec3(0.86, 0.93, 1.0) * (0.55 + 0.45 * limbo);   // la chispa de la que nace (y a la que vuelve): un punto blanco azulado
        gl_FragColor = vec4(mix(brasa, col, uTemp) * uLuz * (1.0 + 0.06 * uPum), 1.0); }`
  }));
  superficie.renderOrder = -2; marco.add(superficie);

  // ── La nube que esculpe: de nube oscura a cavidad iluminada (como Deneb con la nebulosa Norteamérica/Pelícano) ──
  // Una estrella tan luminosa barre con su luz el gas que la rodea: abre una cavidad, comprime su borde en un frente
  // brillante y deja pilares (grumos densos que resisten) con la punta hacia ella. La cavidad está abierta hacia casa (+z
  // del marco, de donde llega la cámara): se mira dentro, con la estrella en el centro y las paredes alrededor y detrás.
  // tipo (aLinea.w): 0 pared y filamentos (aLinea.x = radio final en R; nube.xyz = su sitio en la nube oscura, más
  // adentro: el gas que la luz empuja), 1 pilar (aLinea.x = radio; aLinea.y = 1 en la punta), 2 el gas de la abertura que
  // la luz se lleva hacia fuera, 3 el núcleo de la nube que cae y forma la estrella.
  const NF = 520, NPi = 0, NAb = 900, NC = 1200, N = NF + NPi + NAb + NC, F = 3;
  const nube = new Float32Array(N * 3), destino = new Float32Array(N * 3), linea = new Float32Array(N * 4), dato = new Float32Array(N * 4);
  // Radio interior de la cavidad según la dirección: irregular (no un círculo) y algo más profunda por un lado.
  const ruido3 = (x, y, z) => Math.sin(x * 2.1 + 1.3) * Math.sin(y * 2.7 + 0.4) * Math.sin(z * 1.9 + 2.2) + 0.5 * Math.sin(x * 4.3 - y * 3.1 + z * 2.3);
  const radioCavidad = (x, y, z) => 2.1 * (1 + 0.28 * ruido3(x, y, z) + 0.18 * x - 0.12 * y);
  // La abertura: hacia casa y, de lado, hacia la derecha y arriba: la pared es un acantilado curvo que la abraza por la
  // izquierda, abajo y detrás (como el Pelícano), no un anillo cerrado.
  const abierta = (x, y, z) => z > 0.42 || (x + 0.35 * y > 0.3 && z > -0.35);
  const dirAzar = (fuera = true) => { for (;;) { const z = azar() * 2 - 1, f = azar() * Math.PI * 2, q = Math.sqrt(1 - z * z), v = [Math.cos(f) * q, z, Math.sin(f) * q], j = (azar() - 0.5) * 0.15; if (!fuera || !abierta(v[0] + j, v[1], v[2] + j)) return v; } };
  let i = 0;
  const poner = (fin, ini, tipo, a, b, d0, d1, d2) => { destino.set(fin.map(c => c * R), i * 3); nube.set(ini.map(c => c * R), i * 3); linea.set([Math.hypot(...fin), a, b, tipo], i * 4); dato.set([d0, d1, d2, azar()], i * 4); i++; };
  // La estructura de la nube es la textura horneada (nebulosaDeneb.js); aquí solo los acentos: estrellas recién nacidas
  // en el borde de la cavidad y en las puntas de los pilares (se encienden cuando las alcanza la luz).
  while (i < NF) {
    const f = 2.0 + azar() * 3.6, r = (1.55 + Math.pow(azar(), 1.5) * 1.3) * (1 + 0.1 * Math.sin(f * 3)), fin = [Math.cos(f) * r, Math.sin(f) * r, -1.2 + azar() * 1.5];
    poner(fin, fin.map(c => c * 0.55), 0, 0, 0, (Math.hypot(...fin) - 1) / 4.5, azar(), 1);
  }
  // Pilares: 12 columnas de gas denso en el contorno de la abertura (vistas desde casa, alrededor de ella), con la punta
  // hacia la estrella: las talla la luz y se quedan; todas señalan al centro.
  for (let p = 0; p < 12; p++) {
    // En el borde del acantilado (de la izquierda, por abajo, hasta abajo a la derecha): visto desde casa, señalan a ella.
    const z = 0.05 + azar() * 0.32, f = Math.PI * (0.55 + 1.15 * (p + azar() * 0.7) / 12), q = Math.sqrt(1 - z * z), u = [Math.cos(f) * q, Math.sin(f) * q, z];
    const rc = radioCavidad(...u), base = rc + 1.0 + azar() * 0.6, punta = rc * (0.55 + azar() * 0.2), ancho = 0.1 + azar() * 0.1;
    const t1 = [u[1], -u[0], 0], L1 = Math.hypot(...t1) || 1, a = t1.map(c => c / L1), b = [u[1] * a[2] - u[2] * a[1], u[2] * a[0] - u[0] * a[2], u[0] * a[1] - u[1] * a[0]];
    for (let k = 0; k < NPi / 12; k++) {
      const s = Math.pow(azar(), 0.7), r = punta + (base - punta) * s, w = ancho * (0.25 + 0.75 * s) * Math.sqrt(azar()), f = azar() * Math.PI * 2;
      const fin = [0, 1, 2].map(e => u[e] * r + (a[e] * Math.cos(f) + b[e] * Math.sin(f)) * w);
      poner(fin, fin.map(c => c * 0.5), 1, s < 0.08 ? 1 : 0, s, (r - 1) / 4.5, azar(), 0);   // en la nube oscura, más adentro y sin forma
    }
  }
  // El gas de la abertura (delante de la estrella, hacia casa): en la nube oscura está ahí; la luz se lo lleva.
  while (i < NF + NPi + NAb) { const z = 0.45 + azar() * 0.55, f = azar() * Math.PI * 2, q = Math.sqrt(1 - z * z), r = 0.9 + azar() * 2.6, u = [Math.cos(f) * q, z, Math.sin(f) * q];
    poner(u.map(c => c * r * 2.8), u.map(c => c * r), 2, 0, 0, (r - 1) / 4.5, azar(), 0); }
  // El núcleo de la nube: cae girando hacia el centro y forma la estrella (se lo traga al encenderse).
  while (i < N) { const u = dirAzar(false), r = 0.4 + azar() * 1.6; poner([0, 0, 0], u.map(c => c * r), 3, 0, 0, r / 2, azar(), 0); }
  // Tres copias de cada mota (la de verdad y dos fantasmas de su estela), en bloques para un solo dibujo.
  const rep = (a, w) => { const b = new Float32Array(a.length * F); for (let f = 0; f < F; f++) b.set(a, f * a.length); return new THREE.BufferAttribute(b, w); };
  const fantasma = new Float32Array(N * F); for (let f = 0; f < F; f++) fantasma.fill(f, f * N, (f + 1) * N);
  const gM = new THREE.BufferGeometry();
  gM.setAttribute('position', rep(nube, 3)); gM.setAttribute('aDestino', rep(destino, 3)); gM.setAttribute('aLinea', rep(linea, 4)); gM.setAttribute('aDato', rep(dato, 4)); gM.setAttribute('aFantasma', new THREE.BufferAttribute(fantasma, 1));
  const uM = { uScale, uPR, uExpo: EXPOSICION, uTau: { value: 1 }, uRastro: { value: 0 }, uFlujo: { value: 0 }, uOrbita: { value: 0 }, uGloria: { value: 0.55 }, uEdad: { value: 1 }, uFuerza: { value: 0 }, uMedio: { value: 0 }, uMedioT: { value: -1 }, uCalido: { value: 0.25 }, uT: { value: 0 }, uTitileo: { value: 1 }, uEstrella: { value: 1 }, uRebobina: { value: 0 } };
  const materia = new THREE.Points(gM, motas(uM, /* glsl */`attribute vec3 aDestino; attribute vec4 aLinea, aDato; attribute float aFantasma;
    uniform float uScale, uPR, uExpo, uTau, uRastro, uFlujo, uOrbita, uGloria, uEdad, uFuerza, uMedio, uMedioT, uCalido, uT, uTitileo, uEstrella, uRebobina; varying vec3 vC; varying float vA;
    ${COMUN}
    const float R = ${R.toFixed(1)};
    float tipo;
    // Cuándo la talla la luz: el frente sale de la estrella al encenderse (τ 0,52) y llega a lo más hondo hacia τ 0,97.
    float tallado(float tau){ float dl = 0.52 + 0.36 * clamp(aDato.x, 0.0, 1.0); return smoothstep(dl, dl + 0.09, tau); }
    vec3 sitio(float tau){
      if (tipo > 2.5) {
        // Cae girando (cada vez más deprisa) hacia el centro entre τ 0,05 y 0,48.
        float c = smoothstep(0.05 + aDato.y * 0.1, 0.48, tau), a = c * c * (4.0 + 6.0 * aDato.y);
        vec3 p = position * (1.0 - c * 0.97); float ca = cos(a), sa = sin(a);
        return vec3(p.x * ca - p.z * sa, p.y * (1.0 - c * 0.6), p.x * sa + p.z * ca);
      }
      // La nube oscura respira muy despacio; al tallarse, cada mota va a su sitio (la pared, el pilar o fuera).
      float k = tallado(tau);
      vec3 q = mix(position, aDestino, k * k * (3.0 - 2.0 * k));
      // Los filamentos fluyen un poco a lo largo de la pared (vivos, sin dejar de ser los mismos).
      q += vec3(sin(uFlujo * 3.0 + aDato.y * 40.0), cos(uFlujo * 2.3 + aDato.w * 40.0), sin(uFlujo * 2.7 + aDato.z * 9.0)) * 1.4;
      return q;
    }
    void main(){
      tipo = floor(aLinea.w + 0.5);
      float tau = clamp(uTau - aFantasma * uRastro, 0.0, 1.0);
      vec3 q = sitio(tau);
      vec4 mv = modelViewMatrix * vec4(q, 1.0); gl_Position = projectionMatrix * mv;
      float rn = clamp(aDato.x, 0.0, 1.0), luzT = tipo > 2.5 ? 0.0 : tallado(tau);
      if (tipo > 0.5 && tipo < 1.5) luzT = luzT * luzT * luzT;   // los pilares se encienden al llegar a su sitio (no a medio camino)
      // La luz llega: el frente que pasa brilla un momento; lo tallado queda iluminado desde dentro (más cerca, más luz).
      float dl = 0.52 + 0.36 * rn, frente = exp(-pow((tau - dl - 0.05) / 0.035, 2.0)) * step(tipo, 2.5);
      float borde = aDato.z;   // 1: el mismo borde de la cavidad (el frente de ionización)
      float punta = tipo > 0.5 && tipo < 1.5 ? aLinea.y : 0.0;
      // En el drop, con cada golpe una onda de luz recorre la nube desde la estrella hacia fuera; «in the middle»: la luz
      // corre por la nube de fuera adentro hasta ella, en el centro.
      float onda = exp(-pow(uEdad / 0.55 * 1.1 - rn, 2.0) / 0.012) * exp(-uEdad / 0.6) * uFuerza;
      float haciaElla = step(0.0, uMedioT) * exp(-pow((1.0 - rn) - uMedioT / 1.1, 2.0) / 0.01);
      // Como en una región HII de verdad: lo que da a la estrella (el borde de la cavidad, las caras y puntas de los pilares)
      // brilla; detrás, el polvo de la pared queda oscuro y tenue: frentes de luz nítidos contra la nube.
      float cara = tipo > 0.5 && tipo < 1.5 ? 1.0 - smoothstep(0.0, 0.45, aLinea.z) : 0.0;
      float iluminada = (0.16 + 0.12 * (1.0 - rn)) + (2.1 * borde + 1.5 * cara + 1.0 * punta) * (0.75 + 0.35 * uGloria);
      float oscuro = tipo > 0.5 && tipo < 1.5 ? 0.2 : 0.6;
      float a = mix(oscuro, iluminada, luzT) * uEstrella + oscuro * (1.0 - uEstrella) + 1.4 * frente + luzT * (1.4 * onda + 1.6 * haciaElla + 0.3 * uMedio);
      if (tipo > 1.5 && tipo < 2.5) a *= 1.0 - smoothstep(0.55, 0.9, luzT);          // lo que se lleva la luz, se apaga lejos
      if (tipo > 2.5) a *= 1.0 - smoothstep(0.44, 0.5, tau);                         // el núcleo, tragado por la estrella
      // Colores: la nube oscura, azul violáceo tenue; iluminada, el rojo-rosa del hidrógeno, el azul verdoso del oxígeno
      // cerca de la estrella, y el borde y las puntas casi blancos.
      vec3 oscura = mix(vec3(0.22, 0.26, 0.62), vec3(0.36, 0.3, 0.7), aDato.y);
      vec3 hidrogeno = mix(vec3(1.0, 0.24, 0.42), vec3(1.0, 0.44, 0.58), aDato.w);
      vec3 oxigeno = mix(vec3(0.3, 0.72, 1.0), vec3(0.55, 0.85, 1.0), aDato.w);
      vec3 polvo = mix(vec3(0.42, 0.18, 0.4), vec3(0.3, 0.22, 0.55), aDato.y);
      vec3 frenteLuz = aDato.y < 0.35 ? oxigeno : hidrogeno;   // los frentes, rosas del hidrógeno con hebras azules del oxígeno
      vec3 luz = mix(polvo, frenteLuz, clamp(borde + cara, 0.0, 1.0));
      luz = mix(luz, vec3(1.0, 0.88, 0.92), punta * 0.6);
      luz = mix(luz, vec3(1.0, 0.82, 0.62), uCalido * 0.35 * aDato.y);
      vC = mix(oscura, luz, luzT);
      vC = mix(vC, vec3(1.0, 0.97, 0.95), clamp(frente, 0.0, 1.0) * 0.6);
      // Mientras el tiempo va hacia atrás, todo se tiñe de un azul helado (se nota que es un rebobinado, no otra cosa).
      vC = mix(vC, vec3(0.62, 0.86, 1.0), uRebobina * 0.55); a *= 1.0 + 0.35 * uRebobina;
      float estela = aFantasma < 0.5 ? 1.0 : (1.0 - aFantasma * 0.32) * smoothstep(0.003, 0.012, abs(uRastro));
      float titila = 1.0 - uTitileo * 0.25 * (0.5 + 0.5 * sin(uT * (0.8 + aDato.y * 1.7) + aDato.w * 60.0));
      float tam = (2.0 + aDato.w * 1.6) * (1.0 + 0.3 * borde + 0.4 * punta);
      vA = a * estela * titila * tamMota(tam, mv, 2.8) * fueraSilueta(mv, R * max(uEstrella, 0.09)) * sqrt(uExpo); }`));
  materia.frustumCulled = false; materia.renderOrder = 2; marco.add(materia);
  const nebulosa = crearNebulosaDeneb({ radio: R }); marco.add(nebulosa.grupo);

  // ── Viento, corona y espículas ──
  const NV = 3000, NE = 2400, NB = NV + NE, dirV = new Float32Array(NB * 3), datoV = new Float32Array(NB * 4);
  const serpentinas = Array.from({ length: 9 }, () => { const f = azar() * Math.PI * 2, y = (azar() - 0.5) * 0.7; const q = Math.sqrt(1 - y * y); return [Math.cos(f) * q, y, Math.sin(f) * q]; });
  const v = new THREE.Vector3();
  for (let k = 0; k < NB; k++) {
    const espicula = k >= NV;
    if (!espicula && azar() < 0.6) { const b = serpentinas[Math.floor(azar() * serpentinas.length)], g = () => (azar() + azar() + azar() - 1.5) * 0.18; v.set(b[0] + g(), b[1] + g(), b[2] + g()).normalize(); }
    else { const z = azar() * 2 - 1, f = azar() * Math.PI * 2, q = Math.sqrt(1 - z * z); v.set(Math.cos(f) * q, z, Math.sin(f) * q); }
    dirV.set([v.x, v.y, v.z], k * 3); datoV.set([azar(), 0.6 + azar() * 0.8, espicula ? 1 : 0, azar()], k * 4);
  }
  const gV = new THREE.BufferGeometry(); gV.setAttribute('position', new THREE.BufferAttribute(dirV, 3)); gV.setAttribute('aDato', new THREE.BufferAttribute(datoV, 4));
  const uV = { uScale, uPR, uExpo: EXPOSICION, uViento: { value: 0 }, uEstrella: { value: 1 }, uGloria: { value: 0.55 }, uPum: { value: 0 }, uEncendido: { value: -1 }, uT: { value: 0 }, uTitileo: { value: 1 }, uCam: { value: new THREE.Vector3(0, 0, 1) } };
  const viento = new THREE.Points(gV, motas(uV, /* glsl */`attribute vec4 aDato;
    uniform float uScale, uPR, uExpo, uViento, uEstrella, uGloria, uPum, uEncendido, uT, uTitileo; uniform vec3 uCam; varying vec3 vC; varying float vA;
    ${COMUN}
    const float R = ${R.toFixed(1)};
    void main(){
      float espicula = aDato.z, edad = fract(aDato.x + uViento * aDato.y * (espicula > 0.5 ? 6.0 : 1.0)), r, a;
      // Las espículas se ven en el borde (el limbo visto desde la cámara): se colocan siempre en ese anillo, con un poco
      // de profundidad; así forman un ribete de motas finísimas alrededor de la estrella, se mire desde donde se mire.
      vec3 dir = position;
      if (espicula > 0.5) { vec3 eje = normalize(uCam); vec3 d = position - eje * dot(position, eje); dir = normalize(normalize(d) + eje * (aDato.w - 0.5) * 0.25); }
      if (espicula > 0.5) { r = R * (1.0 + 0.085 * edad * (0.5 + aDato.w)); a = (1.0 - edad) * 2.2; }
      else { r = R * (1.02 + 2.7 * pow(edad, 1.7)); a = pow(1.0 - edad, 1.2) * smoothstep(0.0, 0.04, edad) * 1.9; }
      // Al encenderse, un frente de motas sale de la estrella y se deshace en el viento.
      if (uEncendido >= 0.0) { float k = smoothstep(0.9, 1.9, uEncendido), rf = R * (1.0 + uEncendido * 2.4 * (0.75 + 0.5 * aDato.w)); dir = position; r = mix(rf, r, k); a = mix(2.2 * (1.0 - smoothstep(1.1, 1.9, uEncendido)), a, k); }
      vec4 mv = modelViewMatrix * vec4(dir * r * mix(0.25, 1.0, uEstrella), 1.0); gl_Position = projectionMatrix * mv;
      vC = espicula > 0.5 ? mix(vec3(1.0, 0.96, 0.98), vec3(1.0, 0.62, 0.76), step(0.7, aDato.w)) : mix(vec3(0.76, 0.85, 1.0), vec3(1.0, 1.0, 1.0), aDato.w * 0.5);
      float titila = 1.0 - uTitileo * 0.3 * (0.5 + 0.5 * sin(uT * (1.0 + aDato.w * 2.0) + aDato.x * 50.0));
      vA = uEstrella * a * (0.6 + 0.8 * uGloria) * (1.0 + 0.7 * uPum) * titila * tamMota(espicula > 0.5 ? 1.5 : 1.8 + aDato.w * 1.4, mv, espicula > 0.5 ? 2.0 : 2.8) * fueraSilueta(mv, R * uEstrella) * uExpo; }`));
  viento.frustumCulled = false; viento.renderOrder = 2; marco.add(viento);

  // ── Eyecciones: como mucho 6 chorros a la vez, de 180 motas cada uno, que salen en un cono y se apagan al alejarse ──
  const NS = 6, PS = 260, dirE = new Float32Array(NS * PS * 3), datoE = new Float32Array(NS * PS * 3);
  for (let k = 0; k < NS * PS; k++) { const z = azar() * 2 - 1, f = azar() * Math.PI * 2, q = Math.sqrt(1 - z * z); dirE.set([Math.cos(f) * q, z, Math.sin(f) * q], k * 3); datoE.set([Math.floor(k / PS), 0.7 + azar() * 0.6, azar()], k * 3); }
  const gE = new THREE.BufferGeometry(); gE.setAttribute('position', new THREE.BufferAttribute(dirE, 3)); gE.setAttribute('aDato', new THREE.BufferAttribute(datoE, 3));
  const ejes = Array.from({ length: NS }, () => new THREE.Vector3(0, 1, 0)), edades = new Array(NS).fill(-1);
  const uE = { uScale, uPR, uExpo: EXPOSICION, uEje: { value: ejes }, uEdadE: { value: edades }, uEstrella: { value: 1 } };
  const eyecciones = new THREE.Points(gE, motas(uE, /* glsl */`attribute vec3 aDato;
    uniform float uScale, uPR, uExpo, uEstrella; uniform vec3 uEje[${NS}]; uniform float uEdadE[${NS}]; varying vec3 vC; varying float vA;
    ${COMUN}
    const float R = ${R.toFixed(1)};
    void main(){
      vec3 eje = uEje[0]; float edad = uEdadE[0];
      for (int k = 1; k < ${NS}; k++) if (abs(float(k) - aDato.x) < 0.5) { eje = uEje[k]; edad = uEdadE[k]; }
      // Una nube de motas que sale en un cono ancho, se abre y se enrosca al alejarse (como una eyección de verdad, no un
      // trazo recto); cada mota a su velocidad.
      float e = max(edad, 0.0);
      vec3 d = normalize(eje + position * (0.2 + 0.32 * aDato.z) * (1.0 + e) + cross(eje, position) * e * 0.7);
      float r = R * (1.0 + e * aDato.y * 1.25);
      vec4 mv = modelViewMatrix * vec4(d * r, 1.0); gl_Position = projectionMatrix * mv;
      vC = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.62, 0.78), step(0.6, aDato.z));
      float a = step(0.0, edad) * smoothstep(0.0, 0.06, edad) * (1.0 - smoothstep(0.6, 1.75, edad)) * 2.8;
      vA = uEstrella * a * tamMota(1.6 + aDato.z * 1.4, mv, 2.8) * fueraSilueta(mv, R * uEstrella) * uExpo; }`));
  eyecciones.frustumCulled = false; eyecciones.renderOrder = 2; marco.add(eyecciones);
  let siguiente = 0, cuentaEy = 0, ultimaEy = 0, edadAntes = 9, pulsos = 0, encendidaEy = false;
  const azarEy = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const lanzar = () => { const k = cuentaEy++, z = azarEy(k) * 1.6 - 0.8, f = azarEy(k + 0.37) * Math.PI * 2, q = Math.sqrt(1 - z * z);
    ejes[siguiente].set(Math.cos(f) * q, z, Math.sin(f) * q); edades[siguiente] = 0; siguiente = (siguiente + 1) % NS; };

  // Memoria mínima entre cuadros (sin objetos nuevos en cada cuadro).
  let tEstrella = 0, tauAntes = null;
  const inversa = new THREE.Matrix4();
  const mezcla = (n, e, w) => n + (e - n) * w;
  return {
    marco, superficie, materia, viento, eyecciones, nebulosa,
    hornear: renderer => nebulosa.hornear(renderer),
    // e: estado de la escena (estadoDeneb); n: el estado normal; w: peso de la escena (0–1); camMundo: la cámara.
    actualizar(e, n, w, dt, t, reducido, camMundo = null) {
      if (camMundo) uV.uCam.value.copy(camMundo).applyMatrix4(inversa.copy(marco.matrixWorld).invert());   // la cámara en el espacio del marco
      const tau = mezcla(n.tau, e.tau, w), estrella = mezcla(n.estrella, e.estrella, w), brasa = e.brasa * w, gloria = mezcla(n.gloria, e.gloria, w), reloj = mezcla(1, e.reloj, w);
      tEstrella += dt * reloj;
      const dtau = tauAntes === null || dt <= 0 ? 0 : (tau - tauAntes) / dt; tauAntes = tau;
      // Tamaño: nada → chispa (0,09 R) → estrella (con un pequeño rebote al encenderse); late con el bombo.
      const tam = Math.max(0.001, brasa * 0.09 * (1 + 0.3 * e.pum) + estrella * (1 + 0.05 * Math.sin(Math.min(1, Math.max(0, e.encendido) / 1.2) * Math.PI) * w));
      superficie.visible = tam > 0.01; superficie.scale.setScalar(tam * (1 + (reducido ? 0 : 0.012) * e.pum * w));
      const destello = w > 0.5 && e.encendido >= 0 ? Math.exp(-e.encendido / 0.35) * Math.min(1, e.encendido / 0.08) : 0;
      // «in the middle»: cuando la luz que corre por la nube llega al centro, la estrella responde.
      const respuesta = w > 0.5 && e.medioT >= 0 ? 0.12 * Math.exp(-Math.pow((e.medioT - 0.95) / 0.3, 2)) : 0;
      uS.uT.value = tEstrella; uS.uTemp.value = estrella; uS.uLuz.value = estrella + brasa * 0.9 + 0.4 * destello + respuesta; uS.uGloria.value = gloria; uS.uPum.value = e.pum * w;
      uM.uTau.value = tau; uM.uRastro.value = reducido ? 0 : Math.max(-0.08, Math.min(0.08, dtau * 0.08));
      // Las copias de la estela solo se dibujan mientras las motas se mueven deprisa (casi siempre, solo las de verdad).
      gM.setDrawRange(0, Math.abs(uM.uRastro.value) > 0.003 ? N * F : N);
      uM.uFlujo.value += dt * reloj * (reducido ? 0.03 : 0.08); uM.uOrbita.value += dt * reloj * 0.05;
      uM.uGloria.value = gloria; uM.uEdad.value = e.edad ?? 1; uM.uFuerza.value = (e.fuerza ?? 0) * w; uM.uMedio.value = e.medio * w; uM.uMedioT.value = w > 0.5 ? e.medioT : -1; uM.uCalido.value = mezcla(n.calido, e.calido, w);
      uM.uT.value = t; uM.uTitileo.value = reducido ? 0 : 1; uM.uRebobina.value = Math.min(1, Math.max(0, -reloj) / 2); uM.uEstrella.value = Math.max(estrella, 0.001);
      viento.visible = estrella > 0.002; uV.uViento.value += dt * reloj * (reducido ? 0.03 : 0.06 + 0.06 * gloria); uV.uEstrella.value = estrella; uV.uGloria.value = gloria; uV.uPum.value = e.pum * w;
      uV.uEncendido.value = w > 0.5 ? e.encendido : -1; uV.uT.value = t; uV.uTitileo.value = reducido ? 0 : 1;
      // Eyecciones: en la escena, una cada dos golpes del bombo donde suena fuerte (el drop) y tres a la vez al encenderse;
      // fuera de ella, una cada ~2,6 s. Con movimiento reducido, ninguna.
      for (let k = 0; k < NS; k++) if (edades[k] >= 0) { edades[k] += dt * Math.max(0, reloj); if (edades[k] > 1.8) edades[k] = -1; }
      if (!reducido && estrella > 0.9) {
        if (w > 0.5) {
          const edad = e.edad ?? 9, nuevo = edad < edadAntes; edadAntes = edad;
          if (nuevo && (e.fuerza ?? 0) > 0.6 && pulsos++ % 2 === 0) lanzar();
          if (e.encendido >= 0.3 && !encendidaEy) { encendidaEy = true; lanzar(); lanzar(); lanzar(); }
          if (e.encendido < 0) encendidaEy = false;
        } else if (t - ultimaEy > 2.6) { ultimaEy = t; lanzar(); }
      }
      eyecciones.visible = estrella > 0.002 && edades.some(x => x >= 0); uE.uEstrella.value = estrella;
      // La nebulosa: su frente de luz sale de la estrella al encenderse (τ 0,52) y llega al borde hacia τ 0,97 (en radios
      // de la lámina); las ondas del drop (una por golpe, hacia fuera) y la luz que corre hacia ella «en el medio».
      const x = Math.min(1, Math.max(0, (tau - 0.5) / 0.47)), fuerza = (e.fuerza ?? 0) * w;
      nebulosa.actualizar({ frente: tau >= 0.999 ? 1.3 : 0.04 + 1.16 * x * (2 - x) * (tau > 0.5 ? 1 : 0), onda: fuerza > 0.02 ? (e.edad ?? 9) / 0.55 * 1.1 : -1, ondaF: fuerza * Math.exp(-(e.edad ?? 9) / 0.6),
        medio: w > 0.5 && e.medioT >= 0 && e.medioT < 1.4 ? 1.15 - e.medioT / 1.1 : -1, luz: 0.85 + 0.25 * gloria, rebobina: uM.uRebobina.value, calido: uM.uCalido.value, estrella: tam, t });
    }
  };
}
