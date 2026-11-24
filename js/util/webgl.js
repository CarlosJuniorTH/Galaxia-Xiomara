// No cambia ajustes ni protecciones del navegador: pide contextos admitidos por él.
// depth: el búfer de profundidad del propio lienzo. Con postprocesado no se usa (la escena se dibuja en búferes propios
// con su profundidad y el lienzo solo recibe la pasada final): sin él, ~10 MB menos en un iPhone.
export function crearContextoWebGL(canvas, { antialias = true, depth = true } = {}) {
  const motivos = [];
  const registrar = e => { if (e.statusMessage) motivos.push(String(e.statusMessage).slice(0, 1000)); };
  canvas.addEventListener('webglcontextcreationerror', registrar);
  const opciones = [
    { antialias, powerPreference: 'default' },
    { antialias: false, powerPreference: 'default' },
    { antialias: false, powerPreference: 'low-power' }
  ];
  const intentos = [];
  try {
    for (const api of ['webgl2', 'webgl']) {
      for (const opcion of opciones) {
        try {
          const contexto = canvas.getContext(api, { alpha: false, depth, stencil: false, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false, ...opcion });
          intentos.push({ api, ...opcion, disponible: !!contexto });
          if (contexto) return { contexto, api, intentos };
        } catch (e) { motivos.push(String(e.message || e).slice(0, 1000)); intentos.push({ api, ...opcion, disponible: false }); }
      }
    }
  } finally { canvas.removeEventListener('webglcontextcreationerror', registrar); }
  const error = new Error(motivos.at(-1) || 'El navegador no ha concedido un contexto WebGL 2 ni WebGL 1.');
  error.name = 'ContextoWebGLNoDisponible'; error.intentos = intentos; error.motivos = motivos;
  throw error;
}
export function describirFallo(error, etapa) {
  const esWebGL = error?.name === 'ContextoWebGLNoDisponible';
  return {
    etapa,
    tipo: error?.name || 'Error',
    mensaje: String(error?.message || error || 'Error desconocido').slice(0, 3000),
    texto: esWebGL
      ? 'Este navegador no permite ahora mismo los gráficos 3D. Ciérralo del todo y vuelve a abrirlo, o prueba con otro navegador. Tu progreso está guardado.'
      : 'El universo encontró un error al arrancar. El detalle de abajo indica la causa; no significa que la aceleración gráfica esté desactivada. Tu progreso está guardado.',
    intentos: error?.intentos || []
  };
}
// Tras una caída de la tarjeta gráfica el navegador niega el 3D unos segundos: se espera (hasta 8 s) antes de darlo por perdido.
export async function esperarWebGL(hasta = 8000) {
  const t0 = performance.now();
  for (;;) {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) { gl.getExtension('WEBGL_lose_context')?.loseContext(); return true; }
    if (performance.now() - t0 > hasta) return false;
    await new Promise(r => setTimeout(r, 800));
  }
}
