// «Tras la carga, 0 descargas»: la pantalla de carga baja TODO lo que la web puede pedir después (js/util/precarga.js:
// las canciones de todos los destinos y sus estancias, fuentes, módulos…) y lo cuenta en sus MB; ya dentro, recorrer el
// universo entero (gigantes, supernova, sistema solar, cometa, casa) no saca ni un byte de la red.
//  · Con el servidor de pruebas (sin service worker): el total de la barra incluye todas las canciones y, ya dentro, ninguna
//    descarga con cuerpo (como mucho, revalidaciones 304 de la caché del navegador, sin datos).
//  · Con PAQUETES_BASE (dist/ servido aparte, con su sw.js; ?sw=1): ni una sola petición a la red tras la carga, ni de la
//    página ni del service worker.
import { readFileSync } from 'fs';
import { abrir } from './arnes.mjs';

const RECORRIDO = ['cuasar', 'supernova', 'pulsar', 'ton618', 'deneb', 'sagitario', 'gigante', 'hogar', 'rosa', 'azul', 'cometa', 'capsulas', 'hogar'];

async function recorrer(base, informe, { perfil, consulta, conServicio }) {
  const indice = JSON.parse(readFileSync('assets/musica/indice.json', 'utf8'));
  const bytesCanciones = Object.entries(indice).filter(([n]) => n.endsWith('.m4a')).reduce((a, [, v]) => a + v.bytes, 0);
  const { navegador, pagina, errores } = await abrir(base, perfil, { espera: 1500, musica: true, consulta });
  const etiqueta = conServicio ? 'con service worker' : 'sin service worker';
  try {
    const carga = await pagina.evaluate(() => ({ total: window.__descargas.total, hechos: window.__descargas.hechos, texto: document.getElementById('carga-texto').textContent, controlada: !!navigator.serviceWorker?.controller }));
    if (!conServicio) informe.comprobar(carga.total >= bytesCanciones, `${etiqueta}: los MB de la carga incluyen todas las canciones y estancias (${(bytesCanciones / 1048576).toFixed(1)} MB)`, carga);
    else informe.comprobar(carga.controlada, `${etiqueta}: la página está controlada por el service worker`, carga);
    informe.comprobar(carga.hechos >= carga.total, `${etiqueta}: la carga terminó con todo descargado («X de X MB»)`, carga);
    // Desde aquí, todo lo que salga a la red.
    const red = [], revalidadas = [];
    const origen = new URL(base).origin;
    // (CDP: los bytes que llegan de verdad por la red. Una revalidación de la caché del navegador —304, sin cuerpo— la
    // página la ve como un 200 con el archivo entero.)
    const cdp = await pagina.context().newCDPSession(pagina), urls = new Map();
    await cdp.send('Network.enable');
    cdp.on('Network.responseReceived', ({ requestId, response }) => urls.set(requestId, { url: response.url, sw: response.fromServiceWorker }));
    cdp.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
      const q = urls.get(requestId); if (!q || !q.url.startsWith(origen) || q.sw) return;
      const ruta = q.url.slice(origen.length);
      if (encodedDataLength > 1500) red.push(`${ruta} (${encodedDataLength} B)`); else revalidadas.push(ruta);
    });
    pagina.context().on('request', q => { if (q.serviceWorker() && q.url().startsWith(origen)) red.push('sw ' + q.url().slice(origen.length)); });
    for (const id of RECORRIDO) {
      await pagina.evaluate(async id => { const i = window.__galaxia.interfaz; i.terminarEscena(); await i.visitar(id); }, id);
      await pagina.waitForTimeout(2500);
    }
    // Las canciones de los destinos sonaron (salieron de lo descargado).
    const banda = await pagina.evaluate(() => Object.fromEntries(Object.entries(window.__bandaSonora.estado().pistas).map(([n, p]) => [n, p.estado])));
    const listas = Object.entries(banda).filter(([, e]) => e === 'lista').map(([n]) => n);
    informe.comprobar(['cuasar', 'supernova', 'pulsar', 'ton618', 'deneb', 'sagitario'].every(n => listas.includes(n)), `${etiqueta}: las canciones de los gigantes estaban (y sonaron)`, banda);
    if (conServicio) informe.comprobar(red.length === 0 && revalidadas.length === 0, `${etiqueta}: tras la carga, 0 peticiones a la red recorriendo todo el universo`, { red: red.slice(0, 8), revalidadas: revalidadas.slice(0, 8) });
    else {
      informe.comprobar(red.length === 0, `${etiqueta}: tras la carga, 0 descargas recorriendo todo el universo`, { red: red.slice(0, 8) });
      informe.nota(`revalidaciones sin cuerpo (304, caché del navegador): ${revalidadas.length}`);
    }
    informe.comprobar(errores.length === 0, `${etiqueta}: sin errores en la consola`, errores.slice(0, 5));
  } finally { await navegador.close(); }
}

export default async function ({ base, informe }) {
  const perfil = process.env.PERFIL || 'iphone';
  await recorrer(base, informe, { perfil, consulta: '', conServicio: false });
  const dist = process.env.PAQUETES_BASE;
  if (!dist) { informe.nota('sin PAQUETES_BASE (dist/ servido aparte): se omite la parte con service worker'); return; }
  await recorrer(dist, informe, { perfil, consulta: '&sw=1', conServicio: true });
}
