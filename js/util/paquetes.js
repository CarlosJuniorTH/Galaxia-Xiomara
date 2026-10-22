// Paquetes del universo (como un videojuego): el service worker (sw.js, generado por
// scripts/preparar-pages.mjs) guarda todo en el dispositivo la primera vez. Si hay una versión nueva,
// descarga en segundo plano solo lo que cambió y aquí se aplica: sola si aún se está en la carga o en
// la portada; dentro del universo, con un aviso «Actualizar» (nunca se recarga en mitad de un viaje).
// Solo en HTTPS (los navegadores no permiten service workers en http de la red local); ?sw=1 lo prueba en localhost.
export function vigilarPaquetes({ dentro = () => document.body.classList.contains('dentro') } = {}) {
  const permitido = location.protocol === 'https:' || new URLSearchParams(location.search).get('sw') === '1';
  if (!('serviceWorker' in navigator) || !permitido) return;
  let recargar = false, aviso = null;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (recargar) location.reload(); });
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const aplicar = () => {
      if (!reg.waiting) return;
      recargar = true;
      const texto = document.getElementById('carga-texto'); if (texto && !dentro()) texto.textContent = 'Actualizando el universo…';
      reg.waiting.postMessage('aplicar');
    };
    const decidir = () => {
      // La primera instalación no tiene nada que aplicar: la página ya es esa versión.
      if (!reg.waiting || !navigator.serviceWorker.controller) return;
      if (!dentro()) { aplicar(); return; }
      if (aviso) return;
      aviso = document.createElement('button'); aviso.type = 'button'; aviso.className = 'aviso-actualizacion';
      aviso.textContent = '✦ El universo tiene mejoras · Actualizar';
      aviso.addEventListener('click', aplicar); document.body.append(aviso);
    };
    decidir();
    reg.addEventListener('updatefound', () => { const w = reg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed') decidir(); }); });
    // También si se queda abierto mucho tiempo.
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(e => console.warn('Sin paquetes guardados:', e.message));
}
