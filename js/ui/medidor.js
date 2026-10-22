// Medidor en pantalla (?hud): cuadros por segundo reales, el cuadro más lento, resolución y tarjeta gráfica. Sirve para
// ver en el propio teléfono cómo va (y mandar una captura). No envía nada a ningún sitio.
export function crearMedidor() {
  if (!new URLSearchParams(location.search).has('hud')) return;
  const caja = document.createElement('div');
  caja.style.cssText = 'position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom));z-index:500;padding:6px 9px;border-radius:10px;background:#000c;color:#9f9;font:600 11px/1.35 ui-monospace,monospace;pointer-events:none;white-space:pre';
  document.body.append(caja);
  const lienzo = document.getElementById('galaxia'), gl = lienzo.getContext('webgl2') || lienzo.getContext('webgl');
  const info = gl?.getExtension('WEBGL_debug_renderer_info'), gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).slice(0, 34) : '';
  let antes = performance.now(), tiempos = [], ultimo = antes;
  const paso = ahora => {
    tiempos.push(ahora - antes); antes = ahora;
    if (ahora - ultimo > 1000) {
      const t = tiempos.slice().sort((a, b) => a - b), media = t.reduce((a, b) => a + b, 0) / t.length;
      const d = lienzo.dataset;
      caja.textContent = `${(1000 / media).toFixed(0)} FPS · peor ${t.at(-1).toFixed(0)} ms · >25ms: ${t.filter(x => x > 25).length}\nres ${d.resolucion3d} · lienzo ${d.lienzo3d} · aligerado ${d.aligerado || 0} · cambios ${d.cambiosResolucion || 0}\n${d.ritmo || ''} ${d.motivo || ''} · ${gpu}`;
      tiempos = []; ultimo = ahora;
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
