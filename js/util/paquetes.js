// Paquetes del universo (como un videojuego): el service worker (sw.js, generado por scripts/preparar-pages.mjs) guarda en
// el dispositivo todo lo que la página descarga desde la PRIMERA visita (se registra al abrir la página y empieza a guardar
// en cuanto se activa) y, durante la pantalla de carga, descarga y guarda todo lo demás que la web pueda pedir después
// (js/util/precarga.js): ya dentro, nada sale a la red. Así, si la página se recarga (o iOS la cierra y la vuelve a abrir)
// no se vuelve a descargar lo que ya está guardado.
// Versiones nuevas: se descargan en segundo plano y se aplican en la PRÓXIMA visita (cuando no queda ninguna pestaña con la
// versión vieja), o antes si quien mira pulsa «Actualizar» ya dentro del universo. Nunca se recarga sola (antes lo hacía si
// llegaba una versión nueva durante la carga o la portada: con varias publicaciones al día, recargas por sorpresa).
// Solo en HTTPS (los navegadores no permiten service workers en http de la red local); ?sw=1 lo prueba en localhost.
export function vigilarPaquetes({ dentro = () => document.body.classList.contains('dentro') } = {}) {
  const permitido = location.protocol === 'https:' || new URLSearchParams(location.search).get('sw') === '1';
  if (!('serviceWorker' in navigator) || !permitido) return { completar() {}, servicio: Promise.resolve(null) };
  // servicio: el service worker activo (para la precarga), o null si no llega a activarse en unos segundos.
  let darServicio; const servicio = new Promise(r => { darServicio = r; });
  setTimeout(() => darServicio(null), 6000);
  let recargar = false, aviso = null, registro = null, completarPedido = false;
  // Solo tras pulsar «Actualizar» (un gesto de quien mira); nunca por sí sola.
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (recargar) location.reload(); });
  const pedirCompletar = () => {
    const sw = navigator.serviceWorker.controller || registro?.active;
    if (completarPedido && sw) sw.postMessage('completar');
  };
  navigator.serviceWorker.register('./sw.js').then(reg => {
    registro = reg;
    const aplicar = () => { if (!reg.waiting) return; recargar = true; reg.waiting.postMessage('aplicar'); };
    const ofrecer = () => {
      // La primera instalación no tiene nada que aplicar: la página ya es esa versión.
      if (!reg.waiting || !navigator.serviceWorker.controller || aviso) return;
      // Fuera del universo (carga, intro, tarjeta) no se dice nada: se ofrecerá al entrar (o se aplicará en la próxima visita).
      if (!dentro()) { setTimeout(ofrecer, 5000); return; }
      aviso = document.createElement('button'); aviso.type = 'button'; aviso.className = 'aviso-actualizacion';
      aviso.textContent = '✦ El universo tiene mejoras · Actualizar';
      aviso.addEventListener('click', aplicar); document.body.append(aviso);
    };
    ofrecer();
    reg.addEventListener('updatefound', () => { const w = reg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed') ofrecer(); }); });
    navigator.serviceWorker.ready.then(r => { darServicio(r.active); pedirCompletar(); });
    // También si se queda abierto mucho tiempo.
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(e => { console.warn('Sin paquetes guardados:', e.message); darServicio(null); });
  return {
    servicio,
    // Tras entrar: que el service worker guarde lo que aún no tenga (en segundo plano, sin prisa).
    completar() { completarPedido = true; pedirCompletar(); }
  };
}
