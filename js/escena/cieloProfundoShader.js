// El cielo profundo, como programa de GPU: se usa SOLO para hornear sus imágenes (scripts/hornear-cielo.mjs) y en el
// laboratorio; el juego carga las imágenes ya hechas (cieloProfundo.js): nada se calcula en el dispositivo.
// Composición como en las fotografías de espacio profundo: vacíos negros con estrellas y, a sus lados, paredes de gas
// y polvo pintadas como cordilleras vistas de lado. Cada pared tiene tres capas de crestas, una delante de otra (la de
// delante, más oscura; las de detrás, más encendidas). Cada capa: filo que arde a contraluz, roca esculpida iluminada
// desde arriba, y estrías de polvo negro que bajan desde la cresta siguiendo la ola. Encima, gas luminoso en hilos.

const nz = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Vacíos (dirección, radio en radianes) y sus paredes: ángulo alrededor del vacío, tipo (0 cálida, 1 fría), semiancho.
const VACIOS = [
  { v: [0.0, 0.08, -1], r: 0.42, paredes: [[3.5, 0, 1.25], [5.95, 1, 1.1]] },
  { v: [0.95, 0.3, 0.4], r: 0.36, paredes: [[1.7, 1, 1.05], [4.4, 0, 1.05]] },
  { v: [-0.8, -0.2, 0.6], r: 0.34, paredes: [[0.6, 0, 1.0], [3.2, 1, 1.0]] },
  { v: [0.15, -0.92, -0.3], r: 0.3, paredes: [[2.2, 1, 0.95], [5.2, 0, 0.95]] }
];
const PAREDES = [];
for (const V of VACIOS) {
  const v = nz(V.v), base = Math.abs(v[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], U = nz(cruz(base, v)), W = cruz(v, U);
  for (const [ang, fria, ancho] of V.paredes) {
    const t = U.map((x, i) => Math.cos(ang) * x + Math.sin(ang) * W[i]);
    const c = nz(v.map((x, i) => Math.cos(V.r) * x + Math.sin(V.r) * t[i]));
    const g = nz(v.map((x, i) => -Math.sin(V.r) * x + Math.cos(V.r) * t[i]));
    PAREDES.push({ c, g, ancho, curva: V.r * 3.0, fria });
  }
}
const NP = PAREDES.length, f4 = v => v.map(x => x.toFixed(4)).join(', ');
const glslParedes = `
  const vec3 PC[${NP}] = vec3[${NP}](${PAREDES.map(p => `vec3(${f4(p.c)})`).join(', ')});
  const vec3 PG[${NP}] = vec3[${NP}](${PAREDES.map(p => `vec3(${f4(p.g)})`).join(', ')});
  const vec3 PP[${NP}] = vec3[${NP}](${PAREDES.map(p => `vec3(${p.ancho.toFixed(3)}, ${p.curva.toFixed(3)}, ${p.fria.toFixed(1)})`).join(', ')});`;

// Se pinta en sRGB (como se guardan las imágenes). El segundo parámetro se conserva por compatibilidad.
export const fragmentoCielo = (capas, pasos = 0) => /* glsl */`
  precision highp float;
  varying vec3 vDir;
  uniform float uS;
  uniform highp sampler3D uRuido;
  ${glslParedes}
  float h13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  vec3 h33(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
  // Ruido de gradiente 2D con hash de enteros exacto (sin costuras) y sus sumas.
  float perm(float x){ return mod((x * 34.0 + 1.0) * x, 289.0); }
  float hh(vec2 i){ i = mod(i, 289.0); return perm(perm(i.x) + i.y) / 289.0; }
  vec2 gr(vec2 i){ float a = hh(i) * 6.2831853 + hh(i + 101.0) * 3.0; return vec2(cos(a), sin(a)); }
  float gn(vec2 p){ vec2 i = floor(p), f = fract(p), w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(mix(dot(gr(i), f), dot(gr(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), w.x),
               mix(dot(gr(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(gr(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), w.x), w.y) * 1.4; }
  const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
  float fbm(vec2 p, int o){ float v = 0.0, a = 0.5; for (int i = 0; i < 8; i++){ if (i >= o) break; v += a * gn(p); p = ROT * p + vec2(3.1, 1.7); a *= 0.5; } return v; }
  float crestas(vec2 p, int o){ float v = 0.0, a = 0.5; for (int i = 0; i < 8; i++){ if (i >= o) break; float n = 1.0 - abs(gn(p)); v += a * n * n; p = ROT * p + vec2(5.3, 2.9); a *= 0.5; } return v; }
  // Estrellas: una por celda (en 3D, sobre la esfera), con brillo y color propios; las más brillantes con
  // un destello en cruz fino.
  vec3 estrellas(vec3 d, float escala, float prob, float tam, float brillo, bool cruces){
    vec3 c = vec3(0.0), base = floor(d * escala);
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 celda = base + vec3(float(x), float(y), float(z)), h = h33(celda + uS);
      if (h.x > prob) continue;
      vec3 p = normalize(celda + 0.15 + h * 0.7);
      vec3 v = (d - p) * escala;
      float r = length(v), b = pow(h.y, 4.0) * brillo;
      float t = h.z;
      vec3 col = t < 0.2 ? vec3(1.0, 0.7, 0.5) : t < 0.45 ? vec3(1.0, 0.88, 0.7) : t < 0.8 ? vec3(0.95, 0.96, 1.0) : vec3(0.7, 0.8, 1.0);
      float k = exp(-r * r / (tam * tam));
      if (cruces && h.y > 0.9) {
        vec3 arriba = normalize(cross(p, vec3(0.0, 0.0, 1.0) + vec3(0.0001))), lado = cross(p, arriba);
        float a = dot(v, arriba), l = dot(v, lado);
        k += (exp(-abs(a) * 14.0 / tam) * exp(-abs(l) / (tam * 4.5)) + exp(-abs(l) * 14.0 / tam) * exp(-abs(a) / (tam * 4.5))) * 0.6 + exp(-r / (tam * 1.1)) * 0.25;
      }
      c += col * k * b;
    }
    return c;
  }
  // Galaxias diminutas: manchitas elípticas y, alguna, una espiral pequeña con su núcleo dorado.
  vec3 galaxias(vec3 d, float escala, float prob, float brillo){
    vec3 b = floor(d * escala), h = h33(b + 7.0), c = vec3(0.0);
    if (h.x < prob) { vec3 p = normalize(b + 0.5 + (h - 0.5) * 0.5), v = (d - p) * escala;
      vec3 e1 = normalize(cross(p, vec3(h.y - 0.5, 1.0, h.z - 0.5))), e2 = cross(p, e1);
      float inc = 0.3 + 0.7 * fract(h.y * 7.3), a = dot(v, e1), l = dot(v, e2) / inc, r = length(vec2(a, l)) / 0.32, th = atan(l, a);
      float brazos = 0.5 + 0.5 * cos(2.0 * th - log(max(r, 0.05)) * 4.5), espiral = step(0.45, h.z);
      float disco = exp(-r * 2.6) * mix(1.0, brazos * 1.4, espiral) * (1.0 - smoothstep(0.8, 1.0, r));
      vec3 col = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.8, 0.6), fract(h.z * 3.1));
      c = (col * disco * 0.5 + vec3(1.0, 0.85, 0.65) * exp(-r * r * 40.0)) * brillo * (0.4 + 0.6 * fract(h.x * 31.0)); }
    return c;
  }


  // Perfil de una cordillera (altura de la cresta hacia el vacío) a lo largo de la pared: colinas, picos y columnas.
  float perfil(float x, float s){
    float p = 0.13 * gn(vec2(x * 1.6 + s, 0.5)) + 0.09 * (crestas(vec2(x * 3.5 + s, 1.5), 3) - 0.45) + 0.025 * gn(vec2(x * 12.0 + s, 2.5)) + 0.008 * gn(vec2(x * 40.0 + s, 3.5));
    float col = pow(max(0.0, gn(vec2(x * 3.0 + s * 1.7, 7.0))), 4.0) * 0.3;   // columnas sueltas que se levantan
    return p + col;
  }
  // Paleta de una pared: 0 en el filo (claro) → 1 en lo hondo (oscuro). h: variación a lo largo (manchas de otro tono).
  vec3 paleta(float k, float fria, float h){
    vec3 a, b, c, e;
    if (fria < 0.5) { a = vec3(1.0, 0.88, 0.62); b = mix(vec3(1.0, 0.55, 0.18), vec3(1.0, 0.4, 0.45), h); c = mix(vec3(0.75, 0.2, 0.12), vec3(0.75, 0.15, 0.4), h); e = vec3(0.16, 0.05, 0.035); }
    else { a = vec3(0.82, 0.93, 1.0); b = mix(vec3(0.3, 0.58, 1.0), vec3(0.55, 0.45, 1.0), h); c = mix(vec3(0.3, 0.25, 0.75), vec3(0.6, 0.25, 0.7), h); e = vec3(0.07, 0.06, 0.11); }
    return k < 0.33 ? mix(a, b, k / 0.33) : k < 0.66 ? mix(b, c, (k - 0.33) / 0.33) : mix(c, e, (k - 0.66) / 0.34);
  }

  // Una pared: devuelve el color (premultiplicado) y su opacidad; «gas» es el brillo translúcido que se suma encima.
  void pared(vec3 d, int k, inout vec3 col, inout float opac, inout vec3 gas){
    vec3 c = PC[k], g = PG[k], a = cross(c, g);
    float z = dot(d, c); if (z < 0.25) return;
    float x = dot(d, a) / z, y = dot(d, g) / z;
    float W = PP[k].x, fria = PP[k].z, s = float(k) * 17.3 + 4.0;
    if (abs(x) > W * 1.7) return;
    // Coordenada hacia dentro de la pared (v > 0: hacia lo hondo), curvada alrededor del vacío y ondulada.
    float v = y - x * x / (2.0 * PP[k].y) + 0.05 * gn(vec2(x * 1.1 + s, 9.0));
    float extremo = 1.0 - smoothstep(W * 0.7, W * 1.1, abs(x) + 0.18 * gn(vec2(y * 3.0, s)));   // los extremos se deshacen
    if (extremo <= 0.0) return;
    // Borde de coliflor: el plano se arruga antes de medir.
    vec2 pw = vec2(x, v);
    pw += vec2(gn(pw * 11.0 + s), gn(pw * 11.0 + s + 7.0)) * 0.016 + vec2(gn(pw * 38.0 + s), gn(pw * 38.0 + s + 3.0)) * 0.007 + vec2(gn(pw * 120.0 + s), gn(pw * 120.0 + s + 5.0)) * 0.0025;
    // Luz: más fuerte en uno de los extremos de la pared (la fuente brilla detrás) y nunca nula.
    float luzX = 0.45 + 0.75 * smoothstep(-W, W * 0.6, x * (fria < 0.5 ? -1.0 : 1.0)) + 0.25 * gn(vec2(x * 2.0 + s, 4.0));
    float h = smoothstep(-0.3, 0.3, gn(vec2(x * 1.5 + s, 6.0)));
    // Capas de delante (0) a detrás (2): la primera que cubre el punto lo pinta.
    float cima = 1e3;   // la cresta más alta (la más cercana al vacío)
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float vc = 0.14 - fi * (0.09 + 0.06 * gn(vec2(pw.x * 1.3 + fi * 5.0, s))) - perfil(pw.x, s + fi * 31.0) * (1.0 + 0.3 * fi);
      float t = pw.y - vc;
      cima = min(cima, vc);
      if (t < 0.0) {
        // Resplandor de gas a contraluz justo por encima de esta cresta (se ve sobre la capa de detrás).
        gas += paleta(0.1, fria, h) * exp(t / 0.012) * 0.55 * luzX * extremo;
        continue;
      }
      // Grosor de la pared: lo hondo se deshace en polvo con estrellas.
      float grosor = 0.55 - fi * 0.05;
      float aT = 1.0 - smoothstep(grosor * 0.6, grosor, t + 0.08 * fbm(vec2(x, t) * 6.0 + s, 3));
      if (aT <= 0.0) break;
      // Relieve: campo de alturas de roca erosionada, iluminado desde arriba (desde el vacío).
      vec2 q = vec2(pw.x * 16.0, t * 9.0) + s + fi * 7.0;
      float H = fbm(q, 6) + 0.6 * fbm(vec2(pw.x * 34.0, t * 6.0) + s * 2.0, 4);
      float Hu = fbm(q - vec2(0.0, 0.09), 6) + 0.6 * fbm(vec2(pw.x * 34.0, (t - 0.01) * 6.0) + s * 2.0, 4);
      float lit = clamp(0.5 + (Hu - H) * 3.2, 0.0, 1.0);
      float rim = exp(-t / 0.01);
      float caida = exp(-t / (0.2 + 0.06 * fi));
      float I = luzX * (rim * 1.2 + (0.25 + 0.95 * lit) * caida * 1.05 + lit * 0.15 + 0.05) * (0.75 + 0.15 * fi);
      // Estrías: polvo que baja desde la cresta (ruido muy estirado a lo largo de la caída, con meandros).
      vec2 e = vec2(pw.x * 55.0 + 2.0 * gn(vec2(pw.x * 8.0, t * 5.0) + s), t * 5.0) + s;
      float e1 = abs(gn(e)), e2 = abs(gn(e * vec2(2.3, 1.7) + 11.0));
      float estria = (1.0 - smoothstep(0.04, 0.12, e1)) * smoothstep(0.015, 0.06, t) + (1.0 - smoothstep(0.03, 0.08, e2)) * 0.7 * smoothstep(0.03, 0.09, t);
      float bandas = smoothstep(-0.15, 0.35, fbm(vec2(pw.x * 22.0, t * 2.5) + s * 3.0, 4));   // franjas anchas de polvo
      I *= (0.35 + 0.65 * bandas) * (1.0 - 0.9 * clamp(estria, 0.0, 1.0));
      float h2 = clamp(h + 0.6 * fbm(vec2(pw.x * 4.0, t * 3.0) + s * 1.3, 3), 0.0, 1.0);   // manchas de otro tono
      vec3 cc = paleta(clamp(1.0 - I * 0.9, 0.0, 1.0), fria, h2) * min(I * 1.25, 1.6);
      cc = mix(cc, paleta(0.0, fria, h) * 1.3, rim * luzX * 0.7);
      // Brasas: puntos que arden dentro del polvo (rojos en la cálida, magenta-violeta en la fría).
      float brasa = smoothstep(0.5, 0.75, fbm(vec2(pw.x, t) * 30.0 + s * 5.0, 5)) * smoothstep(0.03, 0.1, t) * exp(-t / 0.3);
      cc += (fria < 0.5 ? vec3(1.0, 0.12, 0.1) : vec3(0.7, 0.3, 1.0)) * brasa * 0.8 * luzX;
      aT *= extremo;
      col = mix(col, cc, aT); opac = max(opac, aT);
      return;
    }
    // Por encima de las crestas: gas luminoso en hilos que se pierde en el vacío (translúcido).
    float sobre = cima - pw.y;
    if (sobre > 0.0 && sobre < 0.35) {
      vec2 f = vec2(pw.x, pw.y) * 24.0 + s;
      f += vec2(fbm(f * 0.3, 3), fbm(f * 0.3 + 5.0, 3)) * 2.0;
      float hilos = pow(1.0 - abs(gn(f)), 6.0) + pow(1.0 - abs(gn(f * 2.2 + 3.0)), 8.0) * 0.6;
      float niebla = 0.5 + 0.5 * fbm(vec2(pw.x, pw.y) * 8.0 + s, 4);
      float k2 = exp(-sobre / 0.07) * (0.25 * niebla + 0.9 * hilos * exp(-sobre / 0.12)) * luzX * extremo;
      gas += paleta(0.25 + 0.3 * h, fria, h) * k2;
    }
  }

  void main(){
    vec3 d = normalize(vDir), s = vec3(uS);
    vec3 c = vec3(0.0), gas = vec3(0.0); float opac = 0.0;
    for (int k = 0; k < ${NP}; k++) pared(d, k, c, opac, gas);
    c += gas * (1.0 - opac * 0.5);
    // Estrellas: muchas finas; las de detrás de la roca, tapadas; algunas brillantes con destello por encima de todo.
    float vis = 1.0 - opac;
    c += (estrellas(d, ${capas[0].toFixed(1)}, 0.035, 0.16, 0.6, false) + estrellas(d, ${capas[1].toFixed(1)}, 0.025, 0.12, 0.95, false)) * (vis + 0.25 * opac);
    c += estrellas(d, ${capas[2].toFixed(1)}, 0.03, 0.08, 2.6, true) * (1.0 - opac * 0.4);
    c += (galaxias(d, 150.0, 0.03, 0.45) + galaxias(d, 60.0, 0.012, 0.6)) * vis;
    c += (h13(d * 4000.0 + 7.0) - 0.5) / 255.0;
    gl_FragColor = vec4(max(c, 0.0), 1.0);
  }`;
