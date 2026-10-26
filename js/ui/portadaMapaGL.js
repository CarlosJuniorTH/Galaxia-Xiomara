// El mapa de motas de la intro (js/ui/portada.js) dibujado con WebGL: todas las motas de tierra (en sus niveles de
// detalle) y las del océano se suben una vez a la GPU y en cada cuadro solo cambian unos pocos uniformes (la cámara, lo
// descubierto por las llamadas, las ondas, el camino, el ecuador, las zonas de los rótulos). El sombreador de vértices
// hace la perspectiva y el nivel de detalle, y el estado de cada mota —en penumbra, descubierta por él (violeta), por
// ella (rosa) o por el encuentro (blanco rosado), recién descubierta, en el camino ya recorrido, en el ecuador encendido;
// el océano, con destellos sueltos—, que se deduce de t: lo alcanzado no se apaga. Cada mota es un punto cuadrado nítido
// (sin suavizado ni halo), sumado en modo aditivo como el «lighter» del lienzo 2D. Así el hilo principal no pinta miles
// de rectángulos por cuadro (eso hacía perder cuadros sueltos en el móvil con la CPU ×4).
// Si WebGL no está (o se pierde el contexto), crearMapaGL devuelve null y portada.js pinta el mapa con el lienzo 2D.

const VERT = `
precision highp float;
attribute vec4 a_p;            // x, y (mundo), tono (0–2 tierra, 3 océano), A (brillo propio 0,55–1, también semilla)
attribute vec2 a_r;            // fracción del camino más cercano (−1 = lejos) y distancia a él (grados del mapa)
uniform vec3 u_cam;            // cX, cY, S
uniform vec4 u_giro;           // cos/sen del giro sobre la vertical, cos/sen de la inclinación
uniform vec2 u_alabeo;         // cos/sen del alabeo
uniform vec4 u_pant;           // ancho, alto (px CSS), ancla x, ancla y
uniform vec4 u_nivel;          // paso en px a escala 1 (esp), e0, e1, nivel>0 (0/1)
uniform vec4 u_varios;         // D, queda0 (aclarado del nivel 0), dpr, t (segundo del clip)
uniform vec4 u_rev;            // lo descubierto: revC, revX, revM (desde el encuentro), penumbra
uniform vec4 u_revAnt;         // lo mismo 0,5 s antes (para el frente recién descubierto) y revCalma
uniform vec4 u_orillas;        // CX, CY, XX, XY
uniform vec4 u_enc;            // MX, MY, alcance de la luz del ecuador a cada lado, —
uniform vec4 u_viaje;          // hasta dónde ha encendido el camino él (s), desde dónde ella, cuánto se ve, —
uniform vec3 u_ondas[8];
uniform int u_nOndas;
uniform vec4 u_zonas[4];       // centro x, y y semiejes (px)
uniform int u_nZonas;
uniform vec3 u_tonos[8];       // 0–2 tierra, 3 blanco, 4 violeta (él), 5 rosa (ella), 6 blanco rosado (los dos), 7 océano
uniform vec3 u_luz;            // mapaVis·atenua, destello, —
varying vec4 v_c;
void main() {
  gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 0.0, 1.0); v_c = vec4(0.0);
  float S = u_cam.z, D = u_varios.x, T = u_varios.w;
  float dx = (a_p.x - u_cam.x) * S, dy = (a_p.y - u_cam.y) * S;
  float u = dx * u_giro.x - dy * u_giro.y, v = dx * u_giro.y + dy * u_giro.x;
  float den = D - v * u_giro.w;
  if (den < D * 0.3) return;
  float f = D / den, ef = u_nivel.x * min(f, 1.0);
  if (u_nivel.w > 0.5 && ef < u_nivel.y) return;
  float px = u * f, py = v * u_giro.z * f;
  float qx = u_pant.z + px * u_alabeo.x - py * u_alabeo.y, qy = u_pant.w + px * u_alabeo.y + py * u_alabeo.x;
  if (qx < -4.0 || qx > u_pant.x + 4.0 || qy < -4.0 || qy > u_pant.y + 4.0) return;
  float A = a_p.w, a = A * clamp((f - 0.6) / 0.25, 0.0, 1.0);
  if (u_nivel.w > 0.5) a *= clamp((ef - u_nivel.y) / (u_nivel.z - u_nivel.y), 0.0, 1.0);
  if (u_varios.y < 1.0 && fract(A * 13.7) > u_varios.y) return;
  if (a < 0.08) return;
  bool mar = a_p.z > 2.5;
  float lado = clamp(2.15 * clamp(f, 0.7, 1.4), 1.5, 3.0);
  int tono = int(a_p.z + 0.5);
  vec3 col = tono == 0 ? u_tonos[0] : tono == 1 ? u_tonos[1] : u_tonos[2];
  // ¿Quién ha llegado ya aquí? (cada mota con su umbral: el borde de lo descubierto no es un círculo perfecto)
  float h = 0.86 + 0.28 * fract(A * 7.31);
  float dC = distance(a_p.xy, u_orillas.xy), dX = distance(a_p.xy, u_orillas.zw), dM = distance(a_p.xy, u_enc.xy);
  float kC = u_rev.x * h - dC, kX = u_rev.y * h - dX, kM = u_rev.z * h - dM;
  bool calma = u_revAnt.w > 0.0 && (dC < u_revAnt.w || dX < u_revAnt.w);
  bool visto = kC > 0.0 || kX > 0.0 || kM > 0.0 || calma;
  // Titileo propio, lento (cada mota a su ritmo): lo descubierto queda vivo.
  float vivo = 0.8 + 0.2 * sin(T * (1.1 + 1.7 * fract(A * 3.17)) + A * 40.0);
  float alfa;
  if (!visto) {
    if (mar || u_rev.w <= 0.01) return;
    col = u_tonos[1]; alfa = 0.13 * u_rev.w;
  } else {
    // El color de quien llegó (el más cercano de los que han llegado): violeta él, rosa ella, blanco rosado el encuentro.
    vec3 tinte = u_tonos[6];
    if (kC > 0.0 && (kX <= 0.0 || dC < dX)) tinte = u_tonos[4]; else if (kX > 0.0) tinte = u_tonos[5];
    if (mar) {
      // El océano: motas muy tenues que a ratos destellan un instante (nítidas, sin halo).
      float chispa = pow(max(0.0, sin(T * (0.9 + fract(A * 5.3)) + A * 91.0)), 24.0);
      col = mix(u_tonos[7], tinte, 0.4); alfa = 0.2 + 0.65 * chispa; lado = clamp(lado - 0.4, 1.5, 2.4);
    } else {
      col = mix(col, tinte, 0.55); alfa = (a > 0.72 ? 1.0 : 0.72) * vivo; lado += 0.25;
    }
    // Recién descubierto (su onda pasó hace menos de 0,5 s): blanco y algo mayor, y se asienta en su color.
    float rC = u_revAnt.x * h, rX = u_revAnt.y * h, rM = u_revAnt.z * h, fr = 0.0;
    if (kC > 0.0 && dC > rC) fr = max(fr, (dC - rC) / max(0.01, u_rev.x * h - rC));
    if (kX > 0.0 && dX > rX) fr = max(fr, (dX - rX) / max(0.01, u_rev.y * h - rX));
    if (kM > 0.0 && dM > rM) fr = max(fr, (dM - rM) / max(0.01, u_rev.z * h - rM));
    if (fr > 0.0) { col = mix(col, u_tonos[3], fr); alfa = max(alfa, mar ? 0.5 * fr : fr); lado += 0.5 * fr; }
  }
  // El camino: lo recorrido por cada uno se enciende detrás de su luz y se queda (una franja de ~2,6° a cada lado, en
  // la tierra y en el mar: una estela de motas que va de una orilla a la otra).
  // (sin ramas: con ifs anidados aquí, SwiftShader dejaba sin pintar motas que no entraban en ellos)
  float enCamino = step(0.0, a_r.x) * step(a_r.y, 2.6) * u_viaje.z;
  float deEl = step(a_r.x, u_viaje.x), deElla = step(u_viaje.y, a_r.x), kR = enCamino * max(deEl, deElla);
  float cerca = clamp(1.0 - a_r.y / 2.6, 0.0, 1.0);
  float fresco = kR * max(deEl * max(0.0, 1.0 - (u_viaje.x - a_r.x) / 0.03), deElla * max(0.0, 1.0 - (a_r.x - u_viaje.y) / 0.03));
  col = mix(col, mix(mix(u_tonos[5], u_tonos[4], deEl), u_tonos[3], 0.45 + 0.55 * fresco), 0.8 * cerca * kR);
  alfa = max(alfa, (0.75 + 0.25 * fresco) * cerca * kR * vivo); lado += 0.4 * fresco;
  // El ecuador: desde el encuentro, una franja que se enciende hacia los dos lados y se queda.
  if (u_enc.z > 0.0 && abs(a_p.y) < 1.4 && abs(a_p.x - u_enc.x) < u_enc.z) {
    float fresco = max(0.0, 1.0 - (u_enc.z - abs(a_p.x - u_enc.x)) / 12.0);
    col = mix(u_tonos[6], u_tonos[3], 0.4 + 0.6 * fresco); alfa = max(alfa, mar ? 0.45 + 0.5 * fresco : 0.9); lado += 0.4 * fresco;
  }
  bool enciende = false;
  if (visto) for (int i = 0; i < 8; i++) {
    if (i >= u_nOndas) break;
    float d = abs(distance(a_p.xy, u_ondas[i].xy) - u_ondas[i].z) * S * f;
    if (d < 2.4 + u_ondas[i].z * 0.02 * S) { enciende = true; break; }
  }
  bool enZona = false;
  for (int i = 0; i < 4; i++) {
    if (i >= u_nZonas) break;
    vec2 e = (vec2(qx, qy) - u_zonas[i].xy) / u_zonas[i].zw;
    if (dot(e, e) < 1.0) { enZona = true; break; }
  }
  if (enZona) { col = u_tonos[1]; alfa = mar ? 0.0 : 0.12; }
  else if (enciende) { col = u_tonos[3]; alfa = 1.0; lado += 0.4; }
  alfa *= u_luz.x;
  // El destello de los golpes: lo descubierto se enciende un instante, en blanco.
  vec3 c = col * alfa;
  if (visto && !enZona && !mar) c += u_tonos[3] * u_luz.y * 0.5 * u_luz.x;
  v_c = vec4(c, min(1.0, alfa + u_luz.y * 0.5));
  gl_PointSize = lado * u_varios.z;
  gl_Position = vec4(qx / u_pant.x * 2.0 - 1.0, 1.0 - qy / u_pant.y * 2.0, 0.0, 1.0);
}`;
const FRAG = `
precision mediump float;
varying vec4 v_c;
void main() { gl_FragColor = v_c; }`;

// lienzo: un <canvas> del mismo tamaño que el de la intro, detrás de él. Devuelve { subir(niveles), medir(ancho, alto,
// dpr), dibujar(params, nivelesActivos), limpiar(), activo } o null.
export function crearMapaGL(lienzo) {
  let gl = null;
  try { gl = lienzo.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' }); } catch { gl = null; }
  if (!gl) return null;
  const sombra = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram(); gl.attachShader(prog, sombra(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sombra(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'a_p'); gl.bindAttribLocation(prog, 1, 'a_r'); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('Intro: mapa sin WebGL', e); return null; }
  const U = {};
  for (const n of ['u_cam', 'u_giro', 'u_alabeo', 'u_pant', 'u_nivel', 'u_varios', 'u_rev', 'u_revAnt', 'u_orillas', 'u_enc', 'u_viaje', 'u_ondas', 'u_nOndas', 'u_zonas', 'u_nZonas', 'u_tonos', 'u_luz']) U[n] = gl.getUniformLocation(prog, n);
  gl.useProgram(prog);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.uniform3fv(U.u_tonos, new Float32Array([242, 184, 222, 214, 186, 255, 255, 222, 240, 255, 248, 252, 190, 150, 255, 255, 135, 196, 255, 214, 236, 170, 190, 255].map(v => v / 255)));
  let buffers = [], perdido = false;
  lienzo.addEventListener('webglcontextlost', e => { e.preventDefault(); perdido = true; });
  const ondas = new Float32Array(24), zonas = new Float32Array(16);
  let limpio = false;
  return {
    get activo() { return !perdido && !gl.isContextLost(); },
    // Cada nivel: { n, X, Y, T, A, RS, RD } (Float32Array/Uint8Array) en un búfer propio: 6 flotantes por mota.
    subir(niveles) {
      for (const b of buffers) gl.deleteBuffer(b.buf);
      buffers = niveles.map(N => {
        const d = new Float32Array(N.n * 6);
        for (let i = 0; i < N.n; i++) { const k = i * 6; d[k] = N.X[i]; d[k + 1] = N.Y[i]; d[k + 2] = N.T[i]; d[k + 3] = N.A[i]; d[k + 4] = N.RS[i]; d[k + 5] = N.RD[i]; }
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
        return { buf, n: N.n };
      });
    },
    medir(ancho, alto, dpr) { lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr); gl.viewport(0, 0, lienzo.width, lienzo.height); limpio = false; },
    limpiar() { if (limpio) return; gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); limpio = true; },
    // p: cámara y estado del cuadro; niveles: [{ i (índice del búfer), esp, l0 (es el nivel 0), queda0 }].
    dibujar(p, activos, n = activos.length) {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); limpio = false;
      gl.useProgram(prog);
      gl.uniform3f(U.u_cam, p.cX, p.cY, p.S);
      gl.uniform4f(U.u_giro, p.cg, p.sg, p.ci, p.si);
      gl.uniform2f(U.u_alabeo, p.ca, p.sa);
      gl.uniform4f(U.u_pant, p.ancho, p.alto, p.ax, p.ay);
      gl.uniform4f(U.u_rev, Math.min(p.revC, 1e4), Math.min(p.revX, 1e4), Math.min(p.revM, 1e4), p.penumbra);
      gl.uniform4f(U.u_revAnt, Math.min(p.revC0, 1e4), Math.min(p.revX0, 1e4), Math.min(p.revM0, 1e4), Math.min(p.revCalma, 1e4));
      gl.uniform4f(U.u_orillas, p.CX, p.CY, p.XX, p.XY);
      gl.uniform4f(U.u_enc, p.MX, p.MY, p.ecuador, 0);
      gl.uniform4f(U.u_viaje, p.tC, p.tX, p.camino, 0);
      gl.uniform3f(U.u_luz, p.luz, p.destello, 0);
      for (let i = 0; i < 8; i++) { ondas[i * 3] = p.OX[i]; ondas[i * 3 + 1] = p.OY[i]; ondas[i * 3 + 2] = p.OR[i]; }
      gl.uniform3fv(U.u_ondas, ondas); gl.uniform1i(U.u_nOndas, Math.min(8, p.nO));
      for (let i = 0; i < 4; i++) { zonas[i * 4] = p.ZX0[i]; zonas[i * 4 + 1] = p.ZY0[i]; zonas[i * 4 + 2] = p.ZX1[i] || 1; zonas[i * 4 + 3] = p.ZY1[i] || 1; }
      gl.uniform4fv(U.u_zonas, zonas); gl.uniform1i(U.u_nZonas, p.nZ);
      gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
      for (let k = 0; k < n; k++) {
        const nv = activos[k], b = buffers[nv.i]; if (!b || !b.n) continue;
        gl.uniform4f(U.u_nivel, nv.esp, p.e0, p.e1, nv.l0 ? 0 : 1);
        gl.uniform4f(U.u_varios, p.D, nv.queda0, p.dpr, p.t);
        gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16);
        gl.drawArrays(gl.POINTS, 0, b.n);
      }
    }
  };
}
