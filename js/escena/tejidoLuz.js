// Los videoclips de la primera vuelta, tejidos en luz como el disco del cuásar: cada píxel se calcula con hebras continuas y color
// saturado, y las formas son enormes en pantalla. Sin nubes de puntos (se leían como «puntitos mal hechos») y sin posproceso:
// se dibuja directo a pantalla, en colores de pantalla. El ruido se lee de la tabla compartida con las nubes (poco coste).
import * as THREE from 'three';
import { RUIDO_TABLA, texturaRuido } from './nube.js';

const RUIDO = /* glsl */`${RUIDO_TABLA}
  float fbm3(vec3 p) { return rn3(p) * 0.55 + rn3(p * 2.03 + 7.1) * 0.3 + rn3(p * 4.1 + 3.7) * 0.15; }
  float hebra(float v, float n) { return pow(1.0 - abs(v * 2.0 - 1.0), n); }`;
const VERT_PLANO = 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// En el clip se dibuja directo a pantalla; en un lugar del universo pasa por el color de la escena (uLineal 1: lo espera en lineal).
const SALIDA = 'uniform float uLineal; vec3 salida(vec3 c) { return uLineal > 0.5 ? pow(max(c, vec3(0.0)), vec3(2.2)) : c; }';
// El polvo tapa lo de detrás y la luz se suma: alfa premultiplicado, como el remolino del cuásar.
const premultiplicado = { transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, toneMapped: false, premultipliedAlpha: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };

function plano(lado, uniforms, fragmentShader) {
  const g = new THREE.PlaneGeometry(lado, lado, 1, 1); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uRuido: { value: texturaRuido() }, uLineal: { value: 0 }, ...uniforms }, vertexShader: VERT_PLANO, fragmentShader, ...premultiplicado }));
  m.frustumCulled = false;
  return { malla: m, u: m.material.uniforms, liberar() { m.parent?.remove(m); g.dispose(); m.material.dispose(); } };
}

// ── «Dos soles»: el plasma de dos estrellas ──
// Con z = posición (compleja) y ±a las estrellas, w = log(z² − a²) da un flujo sin costuras: Re(w) = log(r₁·r₂) son sus líneas de
// nivel (óvalos de Cassini) e Im(w) corre a lo largo de ellas. La línea que pasa justo entre las dos, r₁·r₂ = a², es la lemniscata de
// Bernoulli: el infinito no se dibuja encima, lo traza el propio flujo cuando los dos discos se tocan.
export function crearPlasmaDosSoles() {
  return plano(420, { uT: { value: 0 }, uSep: { value: 24 }, uAng: { value: 0 }, uRd: { value: 7 }, uFlujo: { value: 0 }, uInfinito: { value: 0 }, uOnda: { value: -1 }, uR: { value: 3 }, uLuz: { value: 1 }, uAlcance: { value: 1 }, uPulso: { value: 0 }, uEspiral: { value: 0 } }, /* glsl */`
    precision highp float;
    uniform float uT, uSep, uAng, uRd, uFlujo, uInfinito, uOnda, uR, uLuz, uAlcance, uPulso, uEspiral; varying vec2 vP; ${RUIDO} ${SALIDA}
    vec3 rampa(float t, vec3 a, vec3 b, vec3 c, vec3 d) { vec3 k = mix(a, b, smoothstep(0.0, 0.22, t)); k = mix(k, c, smoothstep(0.22, 0.56, t)); return mix(k, d, smoothstep(0.56, 1.0, t)); }
    void main() {
      float co = cos(uAng), si = sin(uAng), a = uSep * 0.5;
      vec2 p = vec2(co * vP.x + si * vP.y, -si * vP.x + co * vP.y);
      float r1 = length(p - vec2(a, 0.0)), r2 = length(p + vec2(a, 0.0)), rmin = min(r1, r2);
      vec2 zz = vec2(p.x * p.x - p.y * p.y - a * a, 2.0 * p.x * p.y);
      float nivel = 0.5 * log(dot(zz, zz) + 0.001) - 2.0 * log(a);      // 0 en el infinito, negativo dentro de cada lóbulo
      // Cada disco crece hasta tocar al otro; fuera del infinito, la envoltura común se apaga enseguida.
      // (Al trazarse el infinito, lo de fuera baja mucho: la forma se lee por contraste, no por una línea blanca encima.)
      float mascara = (1.0 - smoothstep(uRd * 0.62, uRd, rmin)) * exp(-max(nivel, 0.0) * 1.05) * smoothstep(uR * 0.94, uR * 1.3, rmin) * mix(1.0, 0.26 + 0.74 * (1.0 - smoothstep(-0.06, 0.1, nivel)), uInfinito);
      float th = atan(zz.y, zz.x);
      // Las dos espirales por las que escapa su materia (las de una estrella doble de verdad), que llenan el cielo al final.
      float espiral = uEspiral * (1.0 - smoothstep(0.4, 3.4, nivel)) * smoothstep(-0.05, 0.3, nivel) * pow(0.5 + 0.5 * cos(th - nivel * 2.6 - uT * 0.22), 4.0);
      mascara = max(mascara, espiral * smoothstep(uR * 0.94, uR * 1.3, rmin) * 0.72);
      // El brazo que cada uno tiende hacia el otro, hasta encontrarse.
      float alcanceX = a * (1.0 - uAlcance * 0.998), hacia = smoothstep(alcanceX - 0.2, alcanceX + 1.4, abs(p.x)) * step(abs(p.x), a), punta = 1.0 - smoothstep(0.0, 1.0, 1.0 - (abs(p.x) - alcanceX) / max(0.5, a - alcanceX));
      // (Sin pisar la estrella, y más ancho en su raíz: de ella sale, y se afina hacia la punta.)
      float anchoB = 0.26 + 1.15 * pow(clamp((abs(p.x) - alcanceX) / max(1.0, a - alcanceX), 0.0, 1.0), 1.4), serpea = sin(abs(p.x) * 0.9 - uT * 1.1) * 0.32 * (1.0 - clamp((abs(p.x) - alcanceX) / max(1.0, a - alcanceX), 0.0, 1.0));
      float brazoD = uAlcance > 0.001 && uFlujo < 1.0 ? hacia * exp(-pow((p.y + serpea) / anchoB, 2.0)) * smoothstep(uR * 1.0, uR * 1.32, rmin) : 0.0;
      if (mascara < 0.004 && brazoD < 0.01) discard;
      float giro = th - uT * (0.1 + 0.2 * exp(-nivel * 0.45)) - nivel * 0.9;
      vec3 q = vec3(cos(giro) * 2.1, sin(giro) * 2.1, nivel * 2.5 + 3.0);
      q.z += (fbm3(q * 0.9 + 5.0) - 0.5) * 1.25;
      float masa = smoothstep(0.26, 0.64, fbm3(q));                     // huecos y paredes de polvo
      float h = hebra(fbm3(q * vec3(1.25, 1.25, 4.2)), 7.0);
      float nitido = 1.0 - smoothstep(0.3, 1.1, fwidth(nivel * 13.0)), fino = mix(0.0, hebra(rn3(q * vec3(2.4, 2.4, 13.0)), 9.0), nitido);
      // Color: cada lado, del de su estrella (blanco, oro, fuego, granate / blanco, rosa, fucsia, violeta); fuera, azul de nebulosa.
      float t = clamp(rmin / max(a * 1.05, uRd * 0.8), 0.0, 1.0), lado = smoothstep(-0.14, 0.14, (r2 - r1) / (r1 + r2));
      vec3 c = mix(rampa(t, vec3(1.0, 0.86, 0.95), vec3(1.0, 0.42, 0.72), vec3(0.86, 0.12, 0.54), vec3(0.42, 0.08, 0.58)),
                   rampa(t, vec3(1.0, 0.95, 0.74), vec3(1.0, 0.72, 0.22), vec3(0.98, 0.32, 0.06), vec3(0.6, 0.07, 0.12)), lado);
      c = mix(c, vec3(0.3, 0.34, 0.95), smoothstep(0.05, 1.5, nivel));
      c = mix(c, c * 0.72 + vec3(0.3, 0.32, 0.46), h * 0.42);
      float b = (0.16 + 0.82 * masa * masa + 0.78 * h + 0.36 * fino) * (0.72 + 0.34 * exp(-t * 3.0));
      if (brazoD > 0.01) {
        float tira = hebra(fbm3(vec3(p.x * 0.42 - uT * 0.75 * sign(p.x), p.y * 2.8, 2.0)), 4.0), k = brazoD * (1.0 - uFlujo);
        mascara = max(mascara, k); b += k * (0.55 + 1.7 * tira) / max(mascara, 0.2); c = mix(c, mix(vec3(1.0, 0.42, 0.72), vec3(1.0, 0.72, 0.26), lado), k * 0.8);
      }
      // El puente: la materia que cae de una a otra por el punto en que se tocan, con su propia hebra.
      if (uFlujo > 0.0 && abs(p.x) < a) {
        float ancho = (0.42 + 0.5 * (1.0 - abs(p.x) / a)) * (1.0 - 0.45 * uInfinito), hilo = exp(-pow((p.y + 0.4 * sin(p.x * 0.7 + uT * 0.8)) / ancho, 2.0));
        // Dos corrientes a la vista, una junto a la otra: la luz de ella hacia él y la de él hacia ella.
        float dir = sign(p.y + 0.001), tira = hebra(fbm3(vec3(p.x * 0.5 - uT * 0.9 * dir, p.y * 2.6, uT * 0.1)), 4.0);
        float grumo = pow(0.5 + 0.5 * cos(p.x * 1.15 - uT * 2.6 * dir + dir), 7.0);
        b += uFlujo * hilo * (0.22 + 0.85 * tira + 1.3 * grumo) * (1.0 - 0.5 * uInfinito);
        c = mix(c, dir > 0.0 ? vec3(1.0, 0.74, 0.3) : vec3(1.0, 0.42, 0.7), uFlujo * hilo * 0.72); c = mix(c, vec3(1.0, 0.95, 0.86), uFlujo * hilo * grumo * 0.7);
      }
      // Cada uno se queda con parte de la luz del otro: hebras del otro color en el borde de cada lóbulo.
      c = mix(c, mix(vec3(1.0, 0.78, 0.34), vec3(1.0, 0.42, 0.7), lado), h * smoothstep(0.34, 0.9, t) * uInfinito * 0.85);
      // El infinito: se enciende desde el punto de contacto y dos luces lo recorren sin parar.
      float vista = 1.0 - smoothstep(uInfinito * 1.5 * a - a * 0.12, uInfinito * 1.5 * a, length(p));
      if (vista > 0.0) {
        float w = max(0.034, fwidth(nivel) * 1.4), linea = exp(-pow(nivel / w, 2.0)) * vista, corre = pow(0.5 + 0.5 * cos(th - uT * 0.85), 10.0);
        b += linea * (0.75 + 1.2 * corre) + exp(-pow(nivel / (w * 4.0), 2.0)) * vista * 0.24;
        c = mix(c, mix(mix(vec3(1.0, 0.52, 0.76), vec3(1.0, 0.8, 0.42), lado), vec3(1.0, 0.96, 0.9), corre), min(1.0, linea * 1.3));
      }
      // La onda del primer contacto, que sale por la envoltura.
      if (uOnda >= 0.0) { float f = abs(nivel - uOnda * 0.55 + 0.2); b += exp(-f * f * 40.0) * exp(-uOnda * 0.55) * 1.6; }
      // Late con la canción.
      b *= mascara * uLuz * (1.0 + 0.34 * uPulso);
      gl_FragColor = vec4(salida(c * min(b, 1.5)), min(1.0, b * 1.15));
    }`);
}

// Velos de polvo por encima y por debajo del plasma: hacen de capas del remolino del cuásar. Pasan a otra velocidad y con paralaje:
// de ahí sale la profundidad. Baratos: tres lecturas, y solo donde hay algo.
export function crearVelo(altura, semilla) {
  const v = plano(420, { uT: { value: 0 }, uSep: { value: 24 }, uAng: { value: 0 }, uLuz: { value: 0 }, uSem: { value: semilla } }, /* glsl */`
    precision highp float; uniform float uT, uSep, uAng, uLuz, uSem; varying vec2 vP; ${RUIDO}
    void main() {
      float co = cos(uAng), si = sin(uAng), a = uSep * 0.5; vec2 p = vec2(co * vP.x + si * vP.y, -si * vP.x + co * vP.y);
      vec2 zz = vec2(p.x * p.x - p.y * p.y - a * a, 2.0 * p.x * p.y); float nivel = 0.5 * log(dot(zz, zz) + 0.001) - 2.0 * log(a), m = exp(-abs(nivel - 0.2) * 1.3) * uLuz;
      if (m < 0.01) discard;
      float th = atan(zz.y, zz.x) - uT * 0.07 - nivel * 1.3;
      float f = fbm3(vec3(cos(th) * 1.6 + uSem, sin(th) * 1.6, nivel * 3.0 + uSem));
      float b = smoothstep(0.5, 0.78, f) * m; if (b < 0.008) discard;
      vec3 c = mix(vec3(0.5, 0.28, 0.92), vec3(0.95, 0.45, 0.62), smoothstep(0.55, 0.8, f));
      gl_FragColor = vec4(c * b * 0.62, b * 0.5);
    }`);
  v.malla.position.y = altura; v.malla.renderOrder = altura > 0 ? 3 : -2;
  return v;
}

// ── La primera vuelta: una cinta de plasma alrededor de un corazón que se va llenando ──
// La cinta es lo recorrido en el año. Dentro, el polvo se enciende mes a mes (uLlena) y, al cerrarse la vuelta, esa materia cae en
// espiral desde la cinta (uAbrir, un frente que avanza hacia el centro) hasta encenderlo: la galaxia nace de lo recorrido.
export const R_VUELTA = 10;
export function crearPlasmaVuelta() {
  return plano(260, { uT: { value: 0 }, uFrente: { value: 0 }, uLlena: { value: 0 }, uAbrir: { value: 0 }, uOla: { value: -1 }, uOnda: { value: -1 }, uSegunda: { value: 0 }, uLuz: { value: 1 }, uEspera: { value: 0 }, uFrenteR: { value: R_VUELTA }, uFase: { value: 0 }, uNucleo: { value: 0 }, uEncuentro: { value: -1 }, uRSol: { value: -1 }, uOla2: { value: -1 } }, /* glsl */`
    precision highp float;
    uniform float uT, uFrente, uLlena, uAbrir, uOla, uOnda, uSegunda, uLuz, uEspera, uFrenteR, uFase, uNucleo, uEncuentro, uRSol, uOla2; varying vec2 vP; ${RUIDO} ${SALIDA}
    const float R = ${R_VUELTA}.0, DPI = 6.2831853;
    void main() {
      float r = length(vP); if (r > 42.0) discard;
      float ang = atan(vP.y, vP.x), a = mod(ang, DPI), x = r / R;
      vec3 col = vec3(0.0); float bT = 0.0, alfa = 0.0;
      // La galaxia: dos brazos en espiral separados por vacío, con las hebras A LO LARGO del brazo (corriendo en círculo era un túnel).
      // Encendida de los soles hacia fuera: lo que ya han recorrido al bajar por cada brazo.
      float encendido = 0.025 * uLlena + (0.2 + 0.96 * smoothstep(0.0, 0.25, uAbrir)) * smoothstep(uFrenteR - 0.1, uFrenteR + 1.5, r) * step(0.001, uAbrir);
      float afuera = 1.0 - smoothstep(R * 0.99, R * (1.03 + 0.34 * uAbrir), r);
      float mascara = max(encendido * afuera, 0.0) * smoothstep(0.1, 0.6, r);
      if (mascara > 0.004) {
        float lr = log(max(r, 0.3) / R), s = ang - lr * 3.3 - uT * 0.035 - uFase;   // (la misma espiral que recorren los soles: js/util/guionVuelta.js)
        vec3 q = vec3(cos(s) * 5.2, sin(s) * 5.2, lr * 1.5 + 4.0 + uT * 0.035);   // (la materia corre despacio hacia el centro por el brazo)
        float dobla = (fbm3(q * 0.42 + 4.0) - 0.5) * 1.5;
        float brazo = pow(0.5 + 0.5 * cos(2.0 * s + dobla), 1.5);
        float masa = smoothstep(0.38, 0.62, fbm3(q * vec3(1.6, 1.6, 2.6) + vec3(0.0, 0.0, dobla))), h = hebra(fbm3(q * vec3(2.2, 2.2, 1.4) + 2.0), 7.0), polvo = smoothstep(0.42, 0.6, fbm3(q * vec3(3.4, 3.4, 5.0) + 11.0));
        float nitido = 1.0 - smoothstep(0.3, 1.1, fwidth(s * 22.0)), fino = mix(0.0, hebra(rn3(vec3(cos(s) * 34.0, sin(s) * 34.0, lr * 7.0)), 7.0), nitido);
        vec3 c = mix(vec3(1.0, 0.92, 0.74), vec3(1.0, 0.66, 0.2), smoothstep(0.05, 0.26, x));
        c = mix(c, vec3(0.98, 0.3, 0.3), smoothstep(0.26, 0.5, x)); c = mix(c, vec3(0.94, 0.2, 0.62), smoothstep(0.46, 0.76, x)); c = mix(c, vec3(0.56, 0.36, 1.0), smoothstep(0.76, 1.1, x));
        c = mix(c, c * 0.62 + vec3(0.4, 0.38, 0.46), h * 0.5);
        // (El polvo muerde el brazo: jirones oscuros, como las franjas del cuásar.)
        float b = (0.05 + brazo * (0.12 + 0.95 * masa * masa + 0.95 * h + 0.75 * fino) * mix(0.38, 1.0, polvo)) * mascara;
        // Nudos de estrellas nacientes a lo largo de los brazos, nítidos, rosas y blancos.
        float nudo = smoothstep(0.82, 0.9, rn3(vec3(cos(s) * 30.0, sin(s) * 30.0, lr * 22.0))) * brazo * nitido * mascara;
        b += nudo * 1.1; c = mix(c, mix(vec3(1.0, 0.62, 0.82), vec3(1.0, 0.96, 0.92), fract(lr * 9.0)), min(1.0, nudo * 1.6));
        // El trazo de cada sol: junto a él la materia está incandescente, y se enfría brazo arriba. Se ve que la va pintando.
        if (uRSol > 0.0) { float tras = abs(log(max(r, 0.3) / uRSol)), trazo = exp(-tras * 3.4) * pow(0.5 + 0.5 * cos(2.0 * s + dobla * 0.4), 9.0); b += trazo * (0.75 + 0.9 * h); c = mix(c, vec3(1.0, 0.94, 0.8), min(1.0, trazo * 1.1)); }
        col += c * b; bT += b; alfa = max(alfa, min(1.0, b * 1.25));
      }
      // El corazón de la galaxia, que se enciende cuando los dos soles se encuentran, y la onda que eso manda hacia fuera.
      if (uNucleo > 0.0) { float nucleo = exp(-pow(r / 1.25, 2.0)) * uNucleo; col += vec3(1.0, 0.82, 0.54) * nucleo * 1.05; alfa = max(alfa, min(1.0, nucleo * 1.4)); }
      if (uEncuentro >= 0.0 && uEncuentro < 5.0) {
        float Ro = (1.0 - exp(-uEncuentro * 0.75)) * 15.0, f = exp(-pow((r - Ro) / (0.2 + uEncuentro * 0.16), 2.0)) * pow(1.0 - uEncuentro / 5.0, 1.4) * (0.72 + 0.5 * hebra(rn3(vec3(cos(ang) * 26.0, sin(ang) * 26.0, 1.0)), 2.0));
        col += vec3(1.0, 0.82, 0.64) * f; alfa = max(alfa, min(1.0, f));
      }
      // La cinta: dos hebras gruesas, oro por fuera y rosa por dentro, donde ya se ha pasado.
      float dr = r - R;
      if (abs(dr) < 2.6) {
        float recorrido = smoothstep(0.0, 0.015, uFrente - a) + step(DPI, uFrente);
        vec3 q = vec3(cos(ang) * 7.0, sin(ang) * 7.0, dr * 3.0 - uT * 0.12);
        float h = hebra(fbm3(q * vec3(1.0, 1.0, 1.0)), 5.0), masa = smoothstep(0.32, 0.62, fbm3(q * 0.6 + 9.0));
        float perfil = exp(-pow(dr / (0.2 + 0.26 * masa), 2.0));
        float calor = exp(-max(0.0, uFrente - a) * 3.6) * step(a, uFrente);
        float ola = uOla >= 0.0 ? exp(-pow(abs(mod(uOla - a + 3.14159265, DPI) - 3.14159265) / 0.45, 2.0)) : 0.0;
        if (uOla2 >= 0.0) ola += exp(-pow(abs(mod(uOla2 - a + 3.14159265, DPI) - 3.14159265) / 0.45, 2.0));
        float seg = uSegunda > 0.0 ? smoothstep(0.0, 0.5, uSegunda - a) : 0.0;
        float b = min(1.0, recorrido) * perfil * (0.3 + 0.56 * masa + 0.72 * h) * (1.0 + 0.3 * calor + 1.2 * ola + 0.42 * seg);
        vec3 c = mix(vec3(1.0, 0.36, 0.68), vec3(1.0, 0.72, 0.28), smoothstep(-0.16, 0.16, dr + (h - 0.5) * 0.14));
        c = mix(c, vec3(1.0, 0.95, 0.86), min(1.0, calor * 0.16 + ola * 0.6 + h * 0.2 + seg * 0.14));
        // Lo que aún falta: una sola línea finísima que late hacia la estrella que espera.
        if (uFrente < DPI && a > uFrente) { float l = exp(-pow(dr / max(0.035, fwidth(r)), 2.0)) * uEspera * (0.2 + 0.5 * pow(0.5 + 0.5 * sin(a * 18.0 - uT * 2.4), 6.0)); col += vec3(1.0, 0.92, 0.82) * l; alfa = max(alfa, l); }
        col += c * b * uLuz; alfa = max(alfa, min(1.0, b * 1.1));
      }
      // La onda de luz que sale de la órbita al cerrarse.
      if (uOnda >= 0.0 && uOnda < 6.0) {
        float Ro = R + (1.0 - exp(-uOnda * 0.62)) * 30.0, ancho = 0.25 + uOnda * 0.2, f = exp(-pow((r - Ro) / ancho, 2.0)) * pow(1.0 - uOnda / 6.0, 1.5);
        f *= 0.72 + 0.5 * hebra(rn3(vec3(cos(ang) * 26.0, sin(ang) * 26.0, 2.0)), 2.0);
        col += vec3(1.0, 0.86, 0.68) * f; alfa = max(alfa, min(1.0, f));
      }
      if (alfa <= 0.003) discard;
      gl_FragColor = vec4(salida(min(col * uLuz, vec3(1.3))), alfa);
    }`);
}

// La corona de una estrella: filamentos continuos que salen del borde y se curvan, de cara a la cámara. No un halo: hebras nítidas.
export function crearCorona({ radio, color, hondo }) {
  const u = { uRuido: { value: texturaRuido() }, uT: { value: 0 }, uColor: { value: new THREE.Color(...color) }, uHondo: { value: new THREE.Color(...hondo) }, uLuz: { value: 1 }, uEsc: { value: radio * 2.5 }, uArrebato: { value: 0 } };
  const g = new THREE.PlaneGeometry(2, 2);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, depthTest: true, toneMapped: false, blending: THREE.AdditiveBlending,
    vertexShader: 'uniform float uEsc; varying vec2 vP; void main(){ vP = position.xy * 2.5; vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); c.xy += position.xy * uEsc; gl_Position = projectionMatrix * c; }',
    fragmentShader: /* glsl */`precision highp float; uniform float uT, uLuz, uArrebato; uniform vec3 uColor, uHondo; varying vec2 vP; ${RUIDO}
      void main() {
        float r = length(vP); if (r < 0.92 || r > 2.5) discard;
        float a = atan(vP.y, vP.x), alto = (r - 1.0) / 1.5;
        vec3 q = vec3(cos(a + alto * 0.5) * 4.0, sin(a + alto * 0.5) * 4.0, r * 1.6 - uT * 0.16);
        q.z += (fbm3(vec3(cos(a) * 3.0, sin(a) * 3.0, uT * 0.06)) - 0.5) * 1.5;
        float h = hebra(fbm3(q), 8.0) + 0.65 * hebra(fbm3(q * vec3(2.2, 2.2, 1.0) + 3.0), 11.0);
        float cae = pow(max(0.0, 1.0 - alto), 3.0 - 1.4 * uArrebato), borde = exp(-pow((r - 1.0) / 0.035, 2.0));
        vec3 c = mix(uHondo, uColor, cae) ; float b = (h * cae * 1.2 + borde * 0.9) * smoothstep(0.92, 1.0, r);
        gl_FragColor = vec4(c * b * uLuz, 1.0);
      }` }));
  m.frustumCulled = false;
  return { malla: m, u, liberar() { m.parent?.remove(m); g.dispose(); m.material.dispose(); } };
}

// Un fuego artificial tejido: filamentos finos que se abren desde su centro, cada uno con su largo y su color; se apagan por la cola.
export function crearFuego() {
  const u = { uTau: { value: -1 }, uSem: { value: 0 }, uTam: { value: 1 } };
  const g = new THREE.PlaneGeometry(2, 2);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`precision highp float; uniform float uTau, uSem; varying vec2 vP;
      float az(float x) { return fract(sin(x * 91.17 + uSem * 7.3) * 43758.5453); }
      void main() {
        float r = length(vP); if (r > 1.0 || uTau < 0.0) discard;
        float N = 72.0, a = atan(vP.y, vP.x) / 6.2831853 + 0.5, i = floor(a * N), f = abs(fract(a * N) - 0.5);
        float largo = 0.5 + 0.5 * az(i), vel = 1.0 - exp(-uTau * 2.0), cabeza = vel * largo * 0.96, cola = max(0.0, cabeza - (0.16 + 0.2 * az(i + 3.0)) * (1.0 - uTau * 0.14) - uTau * 0.1);
        cabeza += sin(i) * 0.0; 
        if (r > cabeza || r < cola) discard;
        float ancho = fwidth(a * N) * 0.9 + 0.012, hilo = 1.0 - smoothstep(ancho * 0.4, ancho, f);
        float s = (r - cola) / max(0.001, cabeza - cola), tono = az(i + 7.0);
        vec3 c = tono < 0.44 ? vec3(1.0, 0.72, 0.28) : tono < 0.88 ? vec3(1.0, 0.38, 0.66) : vec3(1.0, 0.94, 0.86);
        float b = hilo * s * s * pow(max(0.0, 1.0 - uTau / 2.8), 1.5) * 1.7;
        if (b <= 0.003) discard;
        gl_FragColor = vec4(mix(c, vec3(1.0), s * s * s * s * 0.35) * b, 1.0);
      }` }));
  m.frustumCulled = false; m.visible = false; m.renderOrder = 50;
  return { malla: m, u, liberar() { m.parent?.remove(m); g.dispose(); m.material.dispose(); } };
}
