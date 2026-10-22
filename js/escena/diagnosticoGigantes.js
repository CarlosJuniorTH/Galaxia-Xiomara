// Diagnóstico en el aparato real (?diag=gigantes, solo desde la red local): viaja a cada gigante, gira la cámara a
// su alrededor como un dedo durante unos segundos y mide cada cuadro (ritmo, tirones, resolución). El informe se
// guarda en el servidor local de pruebas (.pruebas/diagnostico-3d.json) para ajustar el rendimiento con datos de
// verdad. No envía nada a terceros.
const GIGANTES = ['supernova', 'cuasar', 'pulsar', 'ton618', 'sagitario', 'deneb', 'hogar'];

export async function diagnosticarGigantes(escena, interfaz) {
  const { camera, controls, renderer, THREE } = escena.interno, lienzo = renderer.domElement;
  const gl = renderer.getContext(), info = gl.getExtension('WEBGL_debug_renderer_info');
  const informe = { v: 1, gpu: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '', dpr: devicePixelRatio, css: [innerWidth, innerHeight], gigantes: {} };
  const breve = escena.viajeBreve; escena.viajeBreve = true;
  const aviso = document.createElement('div');
  aviso.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:400;padding:8px 14px;border-radius:20px;background:#140a1ccc;color:#ffe9f4;font:600 12px Quicksand,sans-serif';
  document.body.append(aviso);
  for (const id of GIGANTES) {
    aviso.textContent = `Midiendo ${id}… (no toques la pantalla)`;
    interfaz.visitar(id);
    await new Promise(r => setTimeout(r, 400));
    while (escena.viajando) await new Promise(r => setTimeout(r, 300));
    await new Promise(r => setTimeout(r, 1500));
    // Giro como un dedo: 70° por segundo alrededor del centro durante 6 s.
    const tiempos = [], eje = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
    await new Promise(fin => {
      let antes = performance.now(); const t0 = antes;
      const paso = ahora => {
        const dt = ahora - antes; antes = ahora; tiempos.push(dt);
        escena.actividad();
        v.copy(camera.position).sub(controls.target).applyAxisAngle(eje, THREE.MathUtils.degToRad(70) * dt / 1000);
        camera.position.copy(controls.target).add(v); controls.update();
        if (ahora - t0 < 6000) requestAnimationFrame(paso); else fin();
      };
      requestAnimationFrame(paso);
    });
    const t = tiempos.slice(3).sort((a, b) => a - b), q = p => +t[Math.min(t.length - 1, Math.floor(t.length * p))].toFixed(1);
    informe.gigantes[id] = { fps: +(1000 / (t.reduce((a, b) => a + b, 0) / t.length)).toFixed(1), med: q(0.5), p95: q(0.95), max: q(1), tirones25: t.filter(x => x > 25).length, tirones50: t.filter(x => x > 50).length, res: lienzo.dataset.resolucion3d, cambios: lienzo.dataset.cambiosResolucion || '0', aligerado: lienzo.dataset.aligerado || '0' };
  }
  escena.viajeBreve = breve;
  aviso.textContent = 'Diagnóstico terminado. ¡Gracias!'; setTimeout(() => aviso.remove(), 4000);
  if (location.protocol === 'http:' && /^(localhost$|127\.|192\.168\.|10\.)/.test(location.hostname)) {
    await fetch('./__diagnostico3d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ etapa: 'diagnostico-gigantes', tipo: 'informe-gigantes', mensaje: JSON.stringify(informe), navegador: navigator.userAgent }) }).catch(() => {});
  }
  return informe;
}
