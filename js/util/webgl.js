// No cambia ajustes ni protecciones del navegador: pide contextos admitidos por él.
export function crearContextoWebGL(canvas, { antialias = true } = {}) {
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
          const contexto = canvas.getContext(api, { alpha: false, depth: true, stencil: false, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false, ...opcion });
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
      ? 'Chrome no ha permitido crear el contexto 3D. Esto puede ocurrir aunque el ajuste de aceleración esté activado. Tu progreso está guardado.'
      : 'El universo encontró un error al arrancar. El detalle de abajo indica la causa; no significa que la aceleración gráfica esté desactivada. Tu progreso está guardado.',
    intentos: error?.intentos || []
  };
}
