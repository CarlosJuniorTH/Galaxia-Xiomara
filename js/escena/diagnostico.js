// Diagnóstico de renderizado para ejecutar EN el dispositivo.
//  ?diag=render    ligero: ritmo real (con y sin tocar), motivo por el que se
//                  dibuja, resolución del lienzo y de la escena. No congela el teléfono.
//  ?diag=completo  además lee el búfer HDR de la escena antes del brillo y cuenta píxeles
//                  no válidos (NaN/infinito), negativos, muy altos y quemados, aislando cada
//                  capa. Se hace a resolución reducida y cediendo un cuadro entre lecturas.
// No envía nada a terceros: solo al servidor local de pruebas.
import * as THREE from 'three';

const VISTAS = {
  inicial: null,                                        // la cámara tras el vuelo de entrada
  corazon: [[0, 210, 360], [0, 150, 0]],                // como la foto de las 21:00
  nucleo: [[0, 120, 310], [0, 40, 0]]                   // como la foto de las 20:43
};

const CLASIFICAR = /* glsl */`
  precision highp float; precision highp int;
  uniform highp sampler2D tHDR; in vec2 vUv; out vec4 salida;
  // Se comprueban los bits: con optimizaciones agresivas isnan() puede devolver siempre false.
  bool invalido(float x) { return (floatBitsToUint(x) & 0x7f800000u) == 0x7f800000u; }
  void main() {
    vec4 c = texture(tHDR, vUv);
    bool raro = invalido(c.r) || invalido(c.g) || invalido(c.b) || invalido(c.a);
    salida = vec4(
      raro ? 1.0 : 0.0,
      !raro && (c.r < 0.0 || c.g < 0.0 || c.b < 0.0) ? 1.0 : 0.0,
      !raro && max(max(c.r, c.g), c.b) > 8.0 ? 1.0 : 0.0,
      !raro && min(min(c.r, c.g), c.b) > 1.0 ? 1.0 : 0.0);
  }`;

const esperarCuadros = (n = 2) => new Promise(r => { const paso = () => (--n <= 0 ? r() : requestAnimationFrame(paso)); requestAnimationFrame(paso); });

function entorno(renderer) {
  const gl = renderer.getContext(), c = renderer.domElement;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const p = t => gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, t)?.precision ?? 0;
  const area = document.createElement('div');
  area.style.cssText = 'position:fixed;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);visibility:hidden';
  document.body.appendChild(area); const r = area.getBoundingClientRect(); area.remove();
  return {
    ua: navigator.userAgent.slice(0, 160), dpr: devicePixelRatio,
    css: [innerWidth, innerHeight], vv: [Math.round(visualViewport?.width || 0), Math.round(visualViewport?.height || 0)],
    seguro: [Math.round(r.top), Math.round(innerHeight - r.bottom)], buf: [c.width, c.height],
    gl: renderer.capabilities.isWebGL2 ? 2 : 1, gpu: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    prec: [p(gl.HIGH_FLOAT), p(gl.MEDIUM_FLOAT)], punto: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1],
    ext: ['EXT_color_buffer_float', 'EXT_color_buffer_half_float', 'OES_texture_float_linear', 'EXT_float_blend'].map(e => (gl.getExtension(e) ? 1 : 0)).join(''),
    perfil: [c.dataset.perfil3d, c.dataset.brillo3d, c.dataset.resolucion3d].join('/'),
    // escala del lienzo (nativa) · escala interna de la escena · cambios desde que se abrió
    resolucion: { lienzo: Number(c.dataset.lienzo3d), escena: Number(c.dataset.resolucion3d), cambios: Number(c.dataset.cambiosResolucion || 0) }
  };
}

// Mide los fotogramas DIBUJADOS (no los rAF de la pantalla). Con `activo` se simula
// interacción; sin él, sin tocar (sigue a 60 mientras algo se anima; quieto 15 s, no dibuja).
async function medirFps(escena, segundos = 6, activo = true) {
  const lienzo = escena.interno.renderer.domElement;
  const tiempos = [], motivos = {}; let anterior = performance.now(), cuadros = escena.cuadrosDibujados;
  const fin = anterior + segundos * 1000;
  await new Promise(r => { const paso = t => {
    if (activo) escena.actividad();
    if (escena.cuadrosDibujados !== cuadros) {
      cuadros = escena.cuadrosDibujados; tiempos.push(t - anterior); anterior = t;
      const m = lienzo.dataset.motivo || lienzo.dataset.ritmo || '?'; motivos[m] = (motivos[m] || 0) + 1;
    }
    if (t < fin) requestAnimationFrame(paso); else r();
  }; requestAnimationFrame(paso); });
  tiempos.shift(); tiempos.sort((a, b) => a - b);
  const media = tiempos.reduce((a, b) => a + b, 0) / Math.max(1, tiempos.length);
  return { fps: +(1000 / media).toFixed(1), p95ms: +(tiempos[Math.floor(tiempos.length * 0.95)] ?? 0).toFixed(1), cuadros: tiempos.length, motivos };
}


// Sube a WebGL un degradado de brillo dibujado en canvas y lo lee de vuelta desde la GPU.
// Cuenta píxeles con color falso: con fondo transparente (método anterior) el navegador
// divide por alfas casi nulos; con fondo negro opaco (método actual) no hay división.
function pruebaCanvas(renderer) {
  const gl = renderer.getContext(), S = 128, resultado = {};
  for (const opaco of [false, true]) {
    const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    if (opaco) { x.fillStyle = '#000'; x.fillRect(0, 0, S, S); }
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    const tex = gl.createTexture(), fb = gl.createFramebuffer(), px = new Uint8Array(S * S * 4);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.readPixels(0, 0, S, S, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); gl.deleteTexture(tex);
    let falsos = 0;
    for (let i = 0; i < px.length; i += 4) {
      const [r, g2, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
      const croma = Math.max(r, g2, b) - Math.min(r, g2, b);
      // Transparente: color sin premultiplicar en alfas bajos. Opaco: la luz ya va en el color.
      if (opaco ? croma > 12 : a > 0 && a < 24 && croma > 48) falsos++;
    }
    resultado[opaco ? 'opaco' : 'transparente'] = falsos;
  }
  renderer.state.reset();
  return resultado;
}

export async function diagnosticarRender(escena, { enviar = true, completo = false } = {}) {
  const { scene, camera, controls, renderer } = escena.interno;
  const informe = { v: 2, ...entorno(renderer) };
  informe.medida = await medirFps(escena, 6, true);
  informe.contemplacion = await medirFps(escena, 6, false);
  informe.canvas = pruebaCanvas(renderer);
  informe.camara = Math.round(camera.position.distanceTo(controls.target));   // distancia al centro: detecta si se alejó con el gesto
  if (completo) await analizarCapas(escena, informe);
  if (enviar && location.protocol === 'http:' && /^(localhost$|127\.|192\.168\.|10\.)/.test(location.hostname)) {
    await fetch('./__diagnostico3d', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: 'diagnostico-render', tipo: 'informe-render', mensaje: JSON.stringify(informe), navegador: navigator.userAgent })
    }).catch(() => {});
  }
  return informe;
}

async function analizarCapas(escena, informe) {
  const { scene, camera, controls, renderer } = escena.interno;
  // Resolución reducida (≤ 0,6 Mpx): suficiente para contar anomalías sin bloquear el móvil.
  const lw = renderer.domElement.width, lh = renderer.domElement.height, k = Math.min(1, Math.sqrt(600000 / (lw * lh)));
  const w = Math.max(1, Math.round(lw * k)), h = Math.max(1, Math.round(lh * k));
  const tipo = renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const hdr = new THREE.WebGLRenderTarget(w, h, { type: tipo, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const mascara = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: { tHDR: { value: hdr.texture } },
    vertexShader: 'in vec3 position; in vec2 uv; out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: CLASIFICAR, depthTest: false, depthWrite: false
  }));
  const escenaMascara = new THREE.Scene(); escenaMascara.add(pantalla);
  const camaraOrto = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bytes = new Uint8Array(w * h * 4);

  function contar() {
    renderer.info.reset();
    renderer.setRenderTarget(hdr); renderer.clear(); renderer.render(scene, camera);
    const r = renderer.info.render;
    informe.info ??= { llamadas: r.calls, triangulos: r.triangles, puntos: r.points, tex: renderer.info.memory.textures, geo: renderer.info.memory.geometries, prog: renderer.info.programs?.length };
    renderer.setRenderTarget(mascara); renderer.render(escenaMascara, camaraOrto);
    renderer.readRenderTargetPixels(mascara, 0, 0, w, h, bytes);
    renderer.setRenderTarget(null);
    const n = [0, 0, 0, 0];
    for (let i = 0; i < bytes.length; i += 4) for (let k = 0; k < 4; k++) if (bytes[i + k] > 127) n[k]++;
    return n;   // [no válidos, negativos, > 8, quemados]
  }

  const capas = [...new Set(scene.children.map(o => o.userData.capa).filter(Boolean))];
  const visible = new Map(scene.children.map(o => [o, o.visible]));
  const fondo = scene.background, giro = controls.autoRotate, autoReset = renderer.info.autoReset;
  renderer.info.autoReset = false;
  const camaraInicial = [camera.position.clone(), controls.target.clone()];
  escena.pausar(true);
  informe.vistas = {};
  try {
    for (const [nombre, vista] of Object.entries(VISTAS)) {
      const [pos, obj] = vista ? vista.map(v => new THREE.Vector3(...v)) : camaraInicial;
      controls.target.copy(obj); camera.position.copy(pos); camera.lookAt(obj); controls.update();
      escena.pedirCuadro(); await esperarCuadros(3);   // los objetos que miran a la cámara se reorientan
      const resultado = { todo: contar(), capas: {} };
      scene.background = null;
      for (const c of capas) {
        for (const o of scene.children) o.visible = o.userData.capa === c && visible.get(o);
        const n = contar();
        if (n[0] || n[1] || n[2]) resultado.capas[c] = n;
        await esperarCuadros(1);   // cede un cuadro: la página sigue respondiendo
      }
      for (const o of scene.children) o.visible = visible.get(o);
      scene.background = fondo;
      informe.vistas[nombre] = resultado;
    }
  } finally {
    for (const o of scene.children) o.visible = visible.get(o);
    scene.background = fondo;
    camera.position.copy(camaraInicial[0]); controls.target.copy(camaraInicial[1]); controls.update();
    escena.pausar(false); controls.autoRotate = giro; renderer.info.autoReset = autoReset;
    hdr.dispose(); mascara.dispose(); pantalla.geometry.dispose(); pantalla.material.dispose();
  }
  informe.px = w * h;
}

// Panel visible en el teléfono: resultado legible y conmutadores de capas para comparar a ojo.
export function mostrarPanel(escena, informe) {
  const { scene, bloom } = escena.interno;
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;z-index:9999;left:8px;right:8px;top:calc(env(safe-area-inset-top) + 8px);max-height:45vh;overflow:auto;padding:10px;border-radius:12px;background:rgba(10,0,14,.88);color:#fde;font:11px/1.4 ui-monospace,monospace;-webkit-user-select:text;user-select:text';
  const lineas = [`GPU ${informe.gpu} · WebGL${informe.gl} · DPR ${informe.dpr} · búfer ${informe.buf.join('×')}`,
    `FPS interacción ${informe.medida.fps} (p95 ${informe.medida.p95ms} ms) · sin tocar ${informe.contemplacion.fps}`,
    `resolución lienzo ${informe.resolucion.lienzo} · escena ${informe.resolucion.escena} · cambios ${informe.resolucion.cambios}`,
    `motivos sin tocar: ${Object.entries(informe.contemplacion.motivos).map(([m, n]) => `${m} ${n}`).join(' · ')}`,
    `precisión ${informe.prec.join('/')} · punto máx ${informe.punto} · ext ${informe.ext} · ${informe.perfil}`,
    `canvas con color falso: antes ${informe.canvas.transparente} px · ahora ${informe.canvas.opaco} px`];
  for (const [v, r] of Object.entries(informe.vistas || {})) {
    lineas.push(`${v}: NaN ${r.todo[0]} · neg ${r.todo[1]} · >8 ${r.todo[2]} · quemados ${r.todo[3]}`);
    for (const [c, n] of Object.entries(r.capas)) lineas.push(`   ${c}: NaN ${n[0]} · neg ${n[1]} · >8 ${n[2]}`);
  }
  const pre = document.createElement('pre'); pre.style.cssText = 'margin:0 0 8px;white-space:pre-wrap'; pre.textContent = lineas.join('\n');
  panel.appendChild(pre);
  const capas = [...new Set(scene.children.map(o => o.userData.capa).filter(Boolean))];
  const boton = (texto, fn) => { const b = document.createElement('button'); b.textContent = texto; b.style.cssText = 'margin:2px;padding:6px 8px;border-radius:8px;border:1px solid #a68;background:#2a0f2a;color:#fde;font:inherit'; b.onclick = fn; panel.appendChild(b); return b; };
  for (const c of capas) {
    const b = boton(`◉ ${c}`, () => { const ver = b.textContent.startsWith('○'); for (const o of scene.children) if (o.userData.capa === c) o.visible = ver; b.textContent = `${ver ? '◉' : '○'} ${c}`; });
  }
  const bb = boton('◉ brillo', () => { bloom.enabled = !bloom.enabled; bb.textContent = `${bloom.enabled ? '◉' : '○'} brillo`; });
  boton('Ocultar panel', () => panel.remove());
  document.body.appendChild(panel);
}
