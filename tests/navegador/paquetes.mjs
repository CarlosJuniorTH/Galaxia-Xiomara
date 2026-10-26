// Paquetes guardados (service worker de dist/, scripts/preparar-pages.mjs): desde la primera visita se guarda lo que se
// descarga, una recarga no vuelve a descargarlo y una versión nueva NUNCA recarga la página sola (se aplica en la próxima
// visita). Necesita dist/ servido aparte: PAQUETES_BASE=http://127.0.0.1:<puerto> (p. ej. python3 -m http.server -d dist).
// Sin PAQUETES_BASE se omite (el servidor de pruebas sirve el repositorio, sin sw.js).
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { lanzar } from './arnes.mjs';

export default async function ({ informe }) {
  const base = process.env.PAQUETES_BASE;
  if (!base) { informe.nota('sin PAQUETES_BASE (dist/ servido aparte): se omite'); return; }
  const { navegador, pagina, errores } = await lanzar('iphone');
  const navegaciones = []; pagina.on('framenavigated', f => { if (f === pagina.mainFrame()) navegaciones.push(f.url()); });
  let deRed = [], vigilar = false;
  // Lo que llega de verdad al servidor: lo que pide la página sin pasar por el service worker y lo que pide el propio
  // service worker a la red (Playwright lo informa en el contexto con request.serviceWorker()).
  const contar = r => { if (vigilar && new URL(r.url()).origin === new URL(base).origin && !r.url().endsWith('/sw.js')) deRed.push(r.url().slice(base.length)); };
  pagina.on('response', r => { if (!r.fromServiceWorker()) contar(r); });
  pagina.context().on('request', q => { if (q.serviceWorker()) contar(q); });
  const url = `${base}/?calidad=alta&sw=1&sinIntro#debug`;
  const listo = () => pagina.waitForFunction(() => document.getElementById('btn-entrar')?.classList.contains('preparado'), null, { timeout: 120000, polling: 250 });
  try {
    vigilar = true; await pagina.goto(url); await listo();
    const primera = deRed.length;
    const controlada = await pagina.evaluate(() => !!navigator.serviceWorker.controller);
    informe.comprobar(controlada, 'primera visita: el service worker ya controla la página (guarda mientras descarga)');
    await pagina.waitForTimeout(1500);
    deRed = []; navegaciones.length = 0; await pagina.reload(); await listo();
    informe.comprobar(deRed.length < primera * 0.15, 'una recarga no vuelve a descargar lo ya guardado', { primeraVisita: primera, recarga: deRed.length, ejemplos: deRed.slice(0, 5) });
    // Completar (lo que pide la página al terminar la intro) y otra recarga: nada de la red.
    informe.nota('completando…'); const t0 = Date.now();
    await pagina.evaluate(() => navigator.serviceWorker.controller.postMessage('completar'));
    await pagina.waitForFunction(async () => { const c = await caches.open((await caches.keys()).find(k => k.startsWith('universo-'))); return !!(await c.match('./__huellas.json')); }, null, { timeout: 120000, polling: 1000 });
    informe.nota(`completado en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    deRed = []; await pagina.reload(); await listo();
    informe.comprobar(deRed.length <= 2, 'completado: la recarga sale entera del dispositivo', { deRed: deRed.slice(0, 5) });
    // Versión nueva publicada mientras se está en la carga o la tarjeta: no se recarga sola.
    const sw = path.resolve('dist/sw.js'), original = readFileSync(sw, 'utf8');
    writeFileSync(sw, original.replace(/const VERSION = 'universo-([0-9a-f]+)'/, "const VERSION = 'universo-$1x'"));
    try {
      navegaciones.length = 0; await pagina.reload(); await listo();
      const antes = navegaciones.length; informe.nota('esperando la versión nueva…');
      await pagina.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
      await pagina.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => !!r.waiting), null, { timeout: 120000, polling: 500 });
      await pagina.waitForTimeout(8000);
      informe.comprobar(navegaciones.length === antes, 'versión nueva en la carga o la tarjeta: la página no se recarga sola', { navegaciones: navegaciones.length - antes });
      const aviso = await pagina.evaluate(() => !!document.querySelector('.aviso-actualizacion'));
      informe.comprobar(!aviso, 'fuera del universo no aparece el aviso «Actualizar»');
    } finally { writeFileSync(sw, original); }
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
