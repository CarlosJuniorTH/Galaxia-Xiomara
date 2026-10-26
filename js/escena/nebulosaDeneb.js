// La nebulosa que Deneb esculpe con su luz (como la Norteamérica/Pelícano, en el Cisne), HORNEADA en una textura durante la
// carga (como el remolino del cuásar, cuasar.js): muchas capas de ruido por píxel una sola vez; en cada cuadro solo se
// muestrea. En el plano del marco de Deneb (deneb.js), centrada en la estrella y de cara a casa (+z):
//  · una cavidad irregular abierta arriba a la derecha; su borde es un frente de ionización fino y nítido (azul del
//    oxígeno junto a la estrella, rosa-rojo del hidrógeno hacia fuera);
//  · la pared: gas con hebras finas, carriles de polvo oscuro recortado con el filo que mira a la estrella encendido;
//  · pilares (dedos de polvo con la punta hacia la estrella) de cuerpo oscuro y borde brillante finísimo;
//  · dentro de la cavidad, solo hebras tenues de oxígeno.
// Textura RGBA con el alfa premultiplicado (el polvo tapa lo de detrás). Tres láminas a distintas profundidades con la
// misma textura (girada y a otra escala) dan volumen y paralaje; la de delante solo lleva jirones y nunca tapa la estrella.
// El «tallado»: la luz llega con un frente (uFrente, en radios de la textura) que sale de la estrella; detrás de él la nube
// está iluminada y en su sitio; delante, oscura y apretada hacia el centro (la luz la empuja al pasar).
import * as THREE from 'three';
import { nivelSeguro, esMovil } from '../util/dispositivo.js';

const FRAG_NEBULOSA = /* glsl */`varying vec2 vP;
  float perm(float x){ return mod((x * 34.0 + 1.0) * x, 289.0); }
  float hh(vec2 i){ i = mod(i, 289.0); return perm(perm(i.x) + i.y) / 289.0; }
  vec2 gr(vec2 i){ float a = hh(i) * 6.2831853 + hh(i + 101.0) * 3.0; return vec2(cos(a), sin(a)); }
  float gn(vec2 p){ vec2 i = floor(p), f = fract(p), w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(mix(dot(gr(i), f), dot(gr(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), w.x), mix(dot(gr(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(gr(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), w.x), w.y) * 1.4; }
  const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
  float fbm(vec2 p, int o){ float v = 0.0, a = 0.5; for (int i = 0; i < 8; i++){ if (i >= o) break; v += a * gn(p); p = ROT * p + vec2(3.1, 1.7); a *= 0.5; } return v; }
  float cresta(vec2 p, int o){ float v = 0.0, a = 0.5; for (int i = 0; i < 7; i++){ if (i >= o) break; float n = 1.0 - abs(gn(p)); v += a * n * n; p = ROT * p + vec2(5.3, 2.9); a *= 0.5; } return v; }
  float difAng(float a, float b){ float d = mod(a - b + 3.14159265, 6.2831853) - 3.14159265; return abs(d); }
  // Pilar: dedo radial con la punta hacia el centro (ángulo, radio de la punta y de la base, anchura); devuelve la distancia
  // con signo a su silueta (negativa dentro), algo ondulada.
  float pilar(vec2 p, float ang, float r0, float r1, float an){
    vec2 u = vec2(cos(ang), sin(ang)), v = vec2(-u.y, u.x);
    float s = dot(p, u), t = dot(p, v), k = clamp((s - r0) / (r1 - r0), 0.0, 1.0);
    float w = an * (0.35 + 0.65 * sqrt(k)) * (1.0 + 0.25 * gn(vec2(s * 40.0, ang * 7.0)));
    float lado = abs(t + 0.012 * gn(vec2(s * 25.0, ang))) - w;
    float punta = r0 - s, base = s - r1;
    return max(max(lado, punta + 0.004 * gn(vec2(t * 60.0, ang * 3.0))), base);
  }
  void main(){
    vec2 p = vP;
    // Plano retorcido: las formas son orgánicas, no círculos.
    vec2 pw = p + vec2(fbm(p * 2.4 + 3.0, 5), fbm(p * 2.4 + 9.0, 5)) * 0.07;
    float r = length(pw), th = atan(pw.y, pw.x);
    // Abertura arriba a la derecha (hacia ahí la luz ya se llevó el gas); la pared abraza por la izquierda y abajo.
    float pared = smoothstep(0.35, 1.45, difAng(th, 0.75) + 0.7 * fbm(pw * 2.5 + 21.0, 5));
    float rc = 0.29 + 0.05 * fbm(vec2(th * 1.6, 2.0), 4) + 0.025 * sin(th * 3.0 + 1.0);
    float d = r - rc;                                     // distancia hacia fuera desde el frente de ionización
    vec2 ex = normalize(pw + 1e-5);                       // hacia fuera (la estrella queda en la dirección contraria)
    float borde = 1.0 - smoothstep(0.4, 0.95, length(p) + 0.35 * fbm(p * 2.2 + 41.0, 5));   // se deshace en jirones antes del borde
    // Gas de la pared: más denso y brillante junto al frente; hebras finas y nubes con relieve.
    float detalle = fbm(pw * 6.0 + 11.0, 7) * 0.5 + 0.5, hebras = pow(cresta(pw * vec2(7.0, 10.0) + 4.0, 6), 5.0), finas = pow(cresta(pw * 22.0 + 17.0, 5), 7.0);
    float gas = smoothstep(-0.004, 0.012, d) * (0.2 + 1.0 * exp(-d * 6.0)) * smoothstep(0.25, 0.75, detalle) * pared * borde;
    // Frente de ionización: una línea fina y brillante, interrumpida y doble en algunos tramos.
    float corte = smoothstep(0.35, 0.65, fbm(vec2(th * 9.0, 3.0), 4) * 0.5 + 0.5);
    float frente = (exp(-pow(d / 0.006, 2.0)) + 0.5 * exp(-pow((d - 0.03 - 0.015 * gn(vec2(th * 12.0, 1.0))) / 0.005, 2.0))) * (0.35 + 0.65 * corte) * pared * borde;
    // Polvo oscuro en la pared: carriles recortados; su filo hacia la estrella, encendido.
    float pol = fbm(pw * 4.5 + 31.0, 6), polIn = fbm((pw - ex * 0.012) * 4.5 + 31.0, 6);
    float polvo = smoothstep(0.12, 0.2, pol) * smoothstep(0.03, 0.1, d) * pared * borde;
    float filoPolvo = clamp(smoothstep(0.12, 0.2, pol) - smoothstep(0.12, 0.2, polIn), 0.0, 1.0) * smoothstep(0.03, 0.1, d) * pared * borde;
    // Pilares: dedos oscuros que salen de la pared hacia la estrella, con el borde fino y brillante.
    float cuerpo = 0.0, aro = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i), ang = 2.4 + fi * 0.92 + 0.25 * sin(fi * 3.7), r0 = rc * (0.68 + 0.14 * fract(sin(fi * 12.9) * 43.7)), an = 0.028 + 0.016 * fract(sin(fi * 7.3) * 91.1);
      float sd = pilar(pw, ang, r0, rc + 0.22, an), sdLuz = pilar(pw - ex * 0.006, ang, r0, rc + 0.22, an);
      cuerpo = max(cuerpo, 1.0 - smoothstep(-0.003, 0.002, sd));
      // Solo el filo que mira a la estrella se enciende (la punta y la cara de dentro), fino y nítido.
      aro = max(aro, smoothstep(0.0, 0.004, sdLuz) * (1.0 - smoothstep(-0.0005, 0.0015, sd)) * (0.6 + 0.4 * (fbm(pw * 30.0 + fi, 3) * 0.5 + 0.5)));
    }
    cuerpo *= borde; aro *= borde;
    // Dentro de la cavidad: hebras tenues de oxígeno.
    float dentro = (1.0 - smoothstep(-0.03, 0.0, d)) * pow(cresta(pw * 8.0 + 51.0, 5), 6.0) * 0.5 * smoothstep(0.1, 0.2, r);
    // Color: azul del oxígeno en el frente, rosa del hidrógeno hacia fuera, rojo hondo lejos; manchas de otro tono.
    float u = clamp(d / 0.16 + (fbm(pw * 2.0 + 61.0, 4)) * 0.35, 0.0, 1.0);
    vec3 oxi = vec3(0.32, 0.78, 1.0), hid = vec3(1.0, 0.36, 0.52), hondo = vec3(0.62, 0.1, 0.22);
    vec3 col = u < 0.35 ? mix(oxi, hid, u / 0.35) : mix(hid, hondo, (u - 0.35) / 0.65);
    col = mix(col, vec3(1.0, 0.62, 0.78), smoothstep(0.55, 0.8, fbm(pw * 3.0 + 71.0, 4) * 0.5 + 0.5) * 0.35);
    vec3 luz = col * gas * (0.3 + 1.8 * hebras + 1.1 * finas);
    luz += mix(vec3(0.75, 0.95, 1.0), vec3(1.0, 0.85, 0.92), u) * frente * 1.6;
    luz += vec3(1.0, 0.5, 0.62) * filoPolvo * 0.45 + vec3(1.0, 0.9, 0.95) * aro * 1.6;
    luz += oxi * dentro;
    // Polvo y pilares: casi negros (pardo granate), opacos; el gas, translúcido según su densidad.
    float opaco = max(polvo * 0.92, cuerpo * 0.97);
    vec3 negro = vec3(0.03, 0.01, 0.015);
    luz = mix(luz, negro + vec3(1.0, 0.85, 0.9) * aro * 1.4, opaco);
    float alfa = clamp(max(opaco, gas * 0.85 + frente * 0.4 + dentro * 0.6), 0.0, 1.0);
    gl_FragColor = vec4(luz, alfa); }`;

// Láminas: [profundidad (en radios de la estrella, + hacia casa), escala, giro, tipo: 0 fondo entero · 1 media · 2 delante].
const LAMINAS = [[-2.2, 1.0, 0.0, 0], [-0.6, 0.86, 0.35, 1], [1.4, 0.74, -0.5, 2]];

export function crearNebulosaDeneb({ radio, semiLado = 5.4 }) {
  const S = radio * semiLado, LADO = nivelSeguro ? 1024 : esMovil ? 2048 : 3072;
  const rt = new THREE.WebGLRenderTarget(LADO, LADO, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  rt.texture.colorSpace = THREE.NoColorSpace; rt.texture.anisotropy = 8;
  const uFrente = { value: 1.2 }, uOnda = { value: -1 }, uOndaF = { value: 0 }, uMedio = { value: -1 }, uLuz = { value: 1 }, uRebobina = { value: 0 }, uCalido = { value: 0 }, uT = { value: 0 };
  const rEstrella = { value: 1 / semiLado };   // radio de la estrella en radios de la lámina (con su tamaño actual)
  const grupo = new THREE.Group(); grupo.name = 'Nebulosa de Deneb';
  for (const [z, escala, giro, tipo] of LAMINAS) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * S, 2 * S), new THREE.ShaderMaterial({
      uniforms: { uTex: { value: rt.texture }, uFrente, uOnda, uOndaF, uMedio, uLuz, uRebobina, uCalido, uT, rEstrella, uEscala: { value: escala }, uGiro: { value: giro }, uTipo: { value: tipo }, uProf: { value: z / semiLado } },
      vertexShader: 'varying vec2 vP; void main(){ vP = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`uniform sampler2D uTex; uniform float uFrente, uOnda, uOndaF, uMedio, uLuz, uRebobina, uCalido, uT, rEstrella, uEscala, uGiro, uTipo, uProf; varying vec2 vP;
        void main(){
          // El frente se mide desde la estrella en el espacio 3D (cada lámina a su profundidad): la luz llega a la vez a
          // todo lo que está a la misma distancia de ella.
          float r = length(vec2(length(vP), uProf));
          // El frente no es un círculo: avanza antes por donde el gas es tenue (ruido barato a partir de la posición).
          float irreg = 0.07 * (sin(vP.x * 9.0 + vP.y * 4.0) * sin(vP.y * 11.0 - vP.x * 3.0) + 0.5 * sin(length(vP) * 23.0 + atan(vP.y, vP.x) * 5.0));
          r += irreg;
          float k = smoothstep(uFrente, uFrente - 0.08, r);                           // 1: ya iluminado y en su sitio
          // Lo que la luz aún no ha empujado está más adentro (la nube oscura, apretada hacia el centro).
          float c = cos(uGiro), s = sin(uGiro);
          vec2 q = mat2(c, s, -s, c) * vP / uEscala * mix(1.75, 1.0, k);
          vec4 t = texture2D(uTex, q * 0.5 + 0.5);
          t *= step(abs(q.x), 1.0) * step(abs(q.y), 1.0);
          // Oscura: solo la densidad, en azul violáceo muy tenue; iluminada: su color, con el frente que brilla al pasar.
          vec3 oscura = vec3(0.07, 0.06, 0.16) * t.a * 0.5 + vec3(0.1, 0.08, 0.22) * dot(t.rgb, vec3(0.3, 0.4, 0.3)) * 0.8;
          float pasa = exp(-pow((r - uFrente + 0.02) / 0.018, 2.0)) * step(uFrente, 1.15) * smoothstep(0.3, 0.7, t.a);
          float ondas = 1.0;
          if (uOnda >= 0.0) ondas += 1.1 * uOndaF * exp(-pow((r - uOnda) / 0.04, 2.0));      // el drop: una onda hacia fuera
          if (uMedio >= 0.0) ondas += 1.5 * exp(-pow((r - uMedio) / 0.05, 2.0));             // «en el medio»: hacia ella
          vec3 lit = t.rgb * uLuz * ondas;
          lit = mix(lit, lit * vec3(1.15, 0.95, 0.8) + vec3(0.03, 0.015, 0.0) * t.a, uCalido * 0.4);
          vec3 col = mix(oscura, lit, k) + vec3(0.85, 0.95, 1.0) * pasa * t.a * 1.4;
          col = mix(col, col * vec3(0.6, 0.85, 1.3), uRebobina * 0.6);
          float a = t.a;
          if (uTipo > 0.5) { float denso = smoothstep(0.75, 0.95, t.a) * 0.8; col *= denso; a *= denso; }      // láminas de delante: solo lo denso
          if (uTipo > 1.5) { float m = smoothstep(rEstrella * 1.15, rEstrella * 1.8, length(vP)); col *= m * 0.7; a *= m * 0.6; }   // nunca tapa la estrella
          gl_FragColor = vec4(col, a); }`,
      transparent: true, depthWrite: false, premultipliedAlpha: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
    m.position.z = z * radio; m.renderOrder = tipo === 2 ? 3 : -4 + tipo; m.frustumCulled = false; grupo.add(m);
  }
  return {
    grupo,
    hornear(renderer) {
      const mat = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FRAG_NEBULOSA, depthTest: false, depthWrite: false });
      const sc = new THREE.Scene(), malla = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); sc.add(malla);
      const previo = renderer.getRenderTarget(), ac = renderer.autoClear, cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.autoClear = true; renderer.render(sc, new THREE.Camera());
      renderer.setRenderTarget(previo); renderer.autoClear = ac; renderer.setClearColor(cc, ca);
      malla.geometry.dispose(); mat.dispose();
    },
    // frente: radio del frente de luz (en radios de la lámina; ≥ 1,2: todo iluminado; 0: nada); onda / medio: radio de la
    // onda del drop (y su fuerza) y de la luz que va hacia ella (−1: no hay); estrella: tamaño de la estrella (0–1).
    actualizar({ frente, onda, ondaF, medio, luz, rebobina, calido, estrella, t }) {
      uFrente.value = frente; uOnda.value = onda; uOndaF.value = ondaF; uMedio.value = medio; uLuz.value = luz; uRebobina.value = rebobina; uCalido.value = calido; uT.value = t;
      rEstrella.value = Math.max(0.02, estrella) / semiLado;
    }
  };
}
