// Paquetes del universo (como un videojuego): el service worker (sw.js, generado por scripts/preparar-pages.mjs) guarda en
// el dispositivo todo lo que la página descarga desde la PRIMERA visita (se registra al abrir la página y empieza a guardar
// en cuanto se activa): lo imprescindible de la carga y, después, lo que la cola de descargas baja en los momentos libres
// (js/util/descargas.js y precarga.js). Así, si la página se recarga (o iOS la cierra y la vuelve a abrir) no se vuelve a
// descargar lo que ya está guardado.
// Versiones nuevas: se descargan en segundo plano y se aplican en la PRÓXIMA visita (cuando no queda ninguna pestaña con la
// versión vieja), sola si llega antes de que quien mira toque nada (aún no ha empezado nada: no corta nada), o cuando pulsa
// «Actualizar» ya dentro. Una vez tocada la pantalla, nunca se recarga sola (antes lo hacía también en la portada: recargas
// por sorpresa con varias publicaciones al día).
// Solo en HTTPS (los navegadores no permiten service workers en http de la red local); ?sw=1 lo prueba en localhost.
// Devuelve una promesa «versión al día» que la carga espera antes de dejar empezar (js/main.js, antes de entrada.listo()):
// mientras la página carga desde la copia guardada se pregunta al servidor si hay versión nueva (en paralelo con la carga:
// una visita sin novedades no espera nada más). Si la hay, la pantalla de carga dice que la descarga (solo los archivos que
// cambiaron), se aplica y la página se recarga ya nueva, antes del «toca para empezar»: un estreno nunca se pierde por abrir
// la copia vieja. Sin red, o si tarda más de 45 s, se entra con lo guardado y queda el aviso de siempre.
export function vigilarPaquetes({ dentro = () => document.body.classList.contains('dentro'), alDescargar = () => {} } = {}) {
  const permitido = location.protocol === 'https:' || new URLSearchParams(location.search).get('sw') === '1';
  if (!('serviceWorker' in navigator) || !permitido) return Promise.resolve();
  let recargar = false, aviso = null, tocado = false, alDia;
  let enCarga = true;   // hasta resolver «versión al día» la página aún no deja empezar: un toque ahí no corta nada
  const versionAlDia = new Promise(r => { alDia = () => { enCarga = false; r(); }; });
  setTimeout(alDia, 45000);
  // Antes de que quien mira toque nada (cargando o en la pantalla de «toca para empezar»), una versión nueva ya descargada se
  // aplica sola: recargar ahí no corta nada y así se abre directamente la versión nueva (un estreno no se pierde por estar
  // abierta la copia vieja en el teléfono). Una vez tocado, solo con «Actualizar». Una sola recarga así por minuto.
  for (const t of ['pointerdown', 'keydown']) addEventListener(t, () => { tocado = true; }, { capture: true, once: true });
  const recargadaHace = () => { try { return Date.now() - Number(sessionStorage.getItem('xiomara:recarga-version') || 0); } catch { return 0; } };
  const sola = () => (enCarga || !tocado) && recargadaHace() > 60000;
  // Una versión nueva pregunta si esta página funciona: con respuesta espera su turno; sin ella (copia rota) la releva.
  navigator.serviceWorker.addEventListener('message', e => { if (e.data === 'sana?' && document.getElementById('problema-3d')?.hidden) e.ports[0]?.postMessage(1); });
  navigator.serviceWorker.startMessages?.();
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (recargar) location.reload(); });
  navigator.serviceWorker.register('./sw.js').then(async reg => {
    const aplicar = () => { if (!reg.waiting) return; recargar = true; reg.waiting.postMessage('aplicar'); };
    const ofrecer = () => {
      // La primera instalación no tiene nada que aplicar: la página ya es esa versión.
      if (!reg.waiting || !navigator.serviceWorker.controller || aviso) return;
      if (sola()) { try { sessionStorage.setItem('xiomara:recarga-version', String(Date.now())); } catch {} aplicar(); return; }
      // Fuera del universo (carga, intro, tarjeta) no se dice nada: se ofrecerá al entrar (o se aplicará en la próxima visita).
      if (!dentro()) { setTimeout(ofrecer, 5000); return; }
      aviso = document.createElement('button'); aviso.type = 'button'; aviso.className = 'aviso-actualizacion';
      aviso.textContent = '✦ El universo tiene mejoras · Actualizar';
      aviso.addEventListener('click', aplicar); document.body.append(aviso);
    };
    const vigilar = w => w?.addEventListener('statechange', () => { if (w.state === 'installed') ofrecer(); if (w.state === 'redundant') alDia(); });
    reg.addEventListener('updatefound', () => vigilar(reg.installing));
    ofrecer();
    // Primera visita (sin copia guardada): la página ya es la versión publicada.
    if (!navigator.serviceWorker.controller) { alDia(); return; }
    // ¿Hay versión nueva? (6 s como mucho para saberlo; con mala red se entra con lo guardado.)
    await Promise.race([reg.update().catch(() => {}), new Promise(r => setTimeout(r, 6000))]);
    if ((reg.installing || reg.waiting) && sola()) {
      if (reg.installing) { alDescargar(); vigilar(reg.installing); }   // ofrecer() aplicará al terminar de instalarse
      if (reg.waiting) ofrecer();
    } else alDia();
    // También si se queda abierto mucho tiempo.
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(e => { console.warn('Sin paquetes guardados:', e.message); alDia(); });
  return versionAlDia;
}
