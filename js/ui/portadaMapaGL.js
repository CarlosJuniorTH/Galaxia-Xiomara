// El mapa de motas de la intro (js/ui/portada.js) dibujado con WebGL: todas las motas de tierra (en sus niveles de
// detalle) se suben una vez a la GPU y en cada cuadro solo cambian unos pocos uniformes (la cámara, lo descubierto por las
// llamadas, las ondas, las zonas de los rótulos). El sombreador de vértices hace lo mismo que el bucle de portada.js
// —perspectiva, nivel de detalle, penumbra, frente de las ondas— y cada mota es un punto cuadrado nítido (sin
// suavizado ni halo), sumado en modo aditivo como el «lighter» del lienzo 2D. Así el hilo principal no pinta miles de
// rectángulos por cuadro (eso hacía perder cuadros sueltos en el móvil con la CPU ×4).
// Si WebGL no está (o se pierde el contexto), crearMapaGL devuelve null y portada.js pinta el mapa con el lienzo 2D.

const VERT = `
precision highp float;
attribute vec4 a_p;            // x, y (mundo), tono (0–2), A (brillo propio 0,55–1, también semilla)
uniform vec3 u_cam;            // cX, cY, S
uniform vec4 u_giro;           // cos/sen del giro sobre la vertical, cos/sen de la inclinación
uniform vec2 u_alabeo;         // cos/sen del alabeo
uniform vec4 u_pant;           // ancho, alto (px CSS), ancla x, ancla y
uniform vec4 u_nivel;          // paso en px a escala 1 (esp), e0, e1, nivel>0 (0/1)
uniform vec4 u_varios;         // D, queda0 (aclarado del nivel 0), dpr, todo (0/1)
uniform vec4 u_rev;            // revC, revX, revCalma, penumbra
uniform vec4 u_orillas;        // CX, CY, XX, XY
uniform vec3 u_ondas[8];
uniform int u_nOndas;
uniform vec4 u_zonas[4];       // centro x, y y semiejes (px)
uniform int u_nZonas;
uniform vec3 u_tonos[4];
uniform vec3 u_luz;            // mapaVis·atenua, destello, —
varying vec4 v_c;
void main() {
  gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 0.0, 1.0); v_c = vec4(0.0);
  float S = u_cam.z, D = u_varios.x;
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
  float lado = clamp(2.15 * clamp(f, 0.7, 1.4), 1.5, 3.0);
  int tono = int(a_p.z + 0.5);
  vec3 col = tono == 0 ? u_tonos[0] : tono == 1 ? u_tonos[1] : u_tonos[2];
  float alfa = a > 0.72 ? 0.95 : 0.55;
  bool oscura = false;
  if (u_varios.w < 0.5) {
    float h = 0.86 + 0.28 * fract(A * 7.31);
    float dC = distance(a_p.xy, u_orillas.xy) - u_rev.x * h, dX = distance(a_p.xy, u_orillas.zw) - u_rev.y * h;
    oscura = dC > 0.0 && dX > 0.0 && dC + u_rev.x * h > u_rev.z && dX + u_rev.y * h > u_rev.z;
    if (oscura && u_rev.w <= 0.01) return;   // (en la GPU, la penumbra con todas sus motas)
  }
  bool enciende = false;
  if (!oscura) for (int i = 0; i < 8; i++) {
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
  if (oscura || enZona) { col = u_tonos[1]; alfa = 0.17 * (u_varios.w > 0.5 ? 1.0 : u_rev.w); }
  else if (enciende) { col = u_tonos[3]; alfa = 1.0; lado += 0.4; }
  alfa *= u_luz.x;
  // El destello de los golpes: todo el mapa (lo descubierto) se enciende un instante, en blanco.
  vec3 c = col * alfa;
  if (!oscura && !enZona) c += u_tonos[3] * u_luz.y * 0.55 * u_luz.x;
  v_c = vec4(c, min(1.0, alfa + u_luz.y * 0.55));
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
    gl.bindAttribLocation(prog, 0, 'a_p'); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('Intro: mapa sin WebGL', e); return null; }
  const U = {};
  for (const n of ['u_cam', 'u_giro', 'u_alabeo', 'u_pant', 'u_nivel', 'u_varios', 'u_rev', 'u_orillas', 'u_ondas', 'u_nOndas', 'u_zonas', 'u_nZonas', 'u_tonos', 'u_luz']) U[n] = gl.getUniformLocation(prog, n);
  gl.useProgram(prog);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.uniform3fv(U.u_tonos, new Float32Array([242, 184, 222, 214, 186, 255, 255, 222, 240, 255, 246, 252].map(v => v / 255)));
  let buffers = [], perdido = false;
  lienzo.addEventListener('webglcontextlost', e => { e.preventDefault(); perdido = true; });
  const ondas = new Float32Array(24), zonas = new Float32Array(16);
  let limpio = false;
  return {
    get activo() { return !perdido && !gl.isContextLost(); },
    // Cada nivel: { n, X, Y, T, A } (Float32Array/Uint8Array) en un búfer propio.
    subir(niveles) {
      for (const b of buffers) gl.deleteBuffer(b.buf);
      buffers = niveles.map(N => {
        const d = new Float32Array(N.n * 4);
        for (let i = 0; i < N.n; i++) { d[i * 4] = N.X[i]; d[i * 4 + 1] = N.Y[i]; d[i * 4 + 2] = N.T[i]; d[i * 4 + 3] = N.A[i]; }
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
      gl.uniform4f(U.u_rev, Math.min(p.revC, 1e4), Math.min(p.revX, 1e4), Math.min(p.revCalma, 1e4), p.penumbra);
      gl.uniform4f(U.u_orillas, p.CX, p.CY, p.XX, p.XY);
      gl.uniform3f(U.u_luz, p.luz, p.destello, 0);
      for (let i = 0; i < 8; i++) { ondas[i * 3] = p.OX[i]; ondas[i * 3 + 1] = p.OY[i]; ondas[i * 3 + 2] = p.OR[i]; }
      gl.uniform3fv(U.u_ondas, ondas); gl.uniform1i(U.u_nOndas, Math.min(8, p.nO));
      for (let i = 0; i < 4; i++) { zonas[i * 4] = p.ZX0[i]; zonas[i * 4 + 1] = p.ZY0[i]; zonas[i * 4 + 2] = p.ZX1[i] || 1; zonas[i * 4 + 3] = p.ZY1[i] || 1; }
      gl.uniform4fv(U.u_zonas, zonas); gl.uniform1i(U.u_nZonas, p.nZ);
      gl.enableVertexAttribArray(0);
      for (let k = 0; k < n; k++) {
        const nv = activos[k], b = buffers[nv.i]; if (!b || !b.n) continue;
        gl.uniform4f(U.u_nivel, nv.esp, p.e0, p.e1, nv.l0 ? 0 : 1);
        gl.uniform4f(U.u_varios, p.D, nv.queda0, p.dpr, p.todo ? 1 : 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.POINTS, 0, b.n);
      }
    }
  };
}
