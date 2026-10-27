// Descargas por prioridad (js/util/descargas.js y precarga.js): la pantalla de carga baja solo lo imprescindible y todo lo
// demás (canciones de los destinos, estancias, el cielo grande, fuentes, módulos tardíos) lo baja una cola en los momentos
// libres. Comprueba, recorriendo todo el universo:
//  · que los MB de la carga ya no incluyen las canciones de los destinos ni sus estancias;
//  · que durante los vuelos no se descarga nada: ni la cola (se para y corta lo que bajaba) ni la página (módulos, fuentes,
//    imágenes); como mucho, la canción del destino recién elegido, pedida antes de despegar (descargarAhora);
//  · que las canciones de los gigantes llegaron y sonaron, y que la cola acaba vacía (todo descargado una sola vez).
//  · Con PAQUETES_BASE (dist/ servido aparte, con su sw.js; ?sw=1): lo mismo, controlada por el service worker.
import { readFileSync } from 'fs';
import { abrir, esperarLlegada } from './arnes.mjs';

const RECORRIDO = ['cuasar', 'supernova', 'pulsar', 'ton618', 'deneb', 'sagitario', 'gigante', 'hogar', 'rosa', 'azul', 'cometa', 'capsulas', 'hogar'];

async function recorrer(base, informe, { perfil, consulta, conServicio }) {
  const indice = JSON.parse(readFileSync('assets/musica/indice.json', 'utf8'));
  const bytesDestinos = Object.entries(indice).filter(([n]) => n.endsWith('.m4a') && !/^(inicio|viajes)\.m4a$/.test(n)).reduce((a, [, v]) => a + v.bytes, 0);
  const { navegador, pagina, errores } = await abrir(base, perfil, { espera: 300, musica: true, consulta });
  const etiqueta = conServicio ? 'con service worker' : 'sin service worker';
  try {
    const carga = await pagina.evaluate(() => ({ total: window.__descargas.total, hechos: window.__descargas.hechos, controlada: !!navigator.serviceWorker?.controller }));
    // Lo que debe contar la barra: texturas horneadas de este aparato, cielo mediano, horno y las canciones de la intro y de
    // los viajes, más la página y sus módulos, estilos y fuentes (lo que pesen comprimidos); nada de los destinos.
    const tex = JSON.parse(readFileSync('assets/texturas/indice.json', 'utf8')), grupo = perfil === 'pc' ? 'pc-0' : 'movil-0';
    const esperado = tex.grupos[grupo].reduce((a, n) => a + tex.archivos[n], 0) + tex.cielo.media + tex.horno + indice['inicio.m4a'].bytes + indice['viajes.m4a'].bytes;
    informe.comprobar(carga.total > esperado - 200000 && carga.total < esperado + 3.5 * 1048576 /* (sin gzip, los módulos pesan ~3 MB) */, `${etiqueta}: la carga cuenta solo lo imprescindible (${(carga.total / 1048576).toFixed(1)} MB; sin los ${(bytesDestinos / 1048576).toFixed(1)} MB de canciones de destinos y estancias)`, { total: carga.total, esperado });
    if (conServicio) informe.comprobar(carga.controlada, `${etiqueta}: la página está controlada por el service worker`, carga);
    // En la página: los intervalos de vuelo (cada cuadro) y todo lo que pide (PerformanceObserver: módulos, fuentes, imágenes…).
    await pagina.evaluate(() => {
      const M = window.__vigiaRed = { vuelos: [], recursos: [] }; let desde = null;
      const f = () => { const v = window.__galaxia.escena.viajando; const t = performance.now(); if (v && desde === null) desde = t; if (!v && desde !== null) { M.vuelos.push([desde, t]); desde = null; } M.abierto = desde; requestAnimationFrame(f); };
      requestAnimationFrame(f);
      new PerformanceObserver(l => { for (const e of l.getEntries()) M.recursos.push({ ruta: e.name.replace(location.origin, ''), inicio: e.startTime, fin: e.responseEnd, cuerpo: e.encodedBodySize, sw: !!e.workerStart }); }).observe({ type: 'resource' });
    });
    // Lo que sale de verdad a la red (también lo que pide el service worker).
    const red = [], origen = new URL(base).origin;
    pagina.context().on('request', q => { if (q.serviceWorker() && q.url().startsWith(origen)) red.push('sw ' + q.url().slice(origen.length)); });
    for (const id of RECORRIDO) {
      await pagina.evaluate(async id => { const i = window.__galaxia.interfaz; i.terminarEscena(); await i.visitar(id); }, id);
      await pagina.waitForFunction(() => window.__galaxia.escena.viajando, null, { timeout: 5000, polling: 30 }).catch(() => {});
      await esperarLlegada(pagina);
      await pagina.waitForTimeout(2500);
    }
    // Y un rato en casa, sin tocar nada: la cola termina.
    await pagina.waitForFunction(() => { const e = window.__red.estado(); return !e.pendientes.length && !e.enCurso; }, null, { timeout: 120000, polling: 500 }).catch(() => {});
    const r = await pagina.evaluate(() => ({ ...window.__vigiaRed, registro: window.__red.registro, estado: window.__red.estado() }));
    const dentro = (t, margen = 0) => r.vuelos.some(([a, b]) => t > a + margen && t < b);
    // La cola: nada empieza durante un vuelo, y lo que bajaba se corta al despegar (300 ms de margen: el aviso del vuelo).
    const colaEnVuelo = r.registro.filter(x => x.como === 'reposo' && r.vuelos.some(([a, b]) => (x.inicio > a && x.inicio < b) || (x.inicio <= a && (x.fin ?? x.cortada ?? Infinity) > a + 300)));
    informe.comprobar(colaEnVuelo.length === 0, `${etiqueta}: la cola no descarga nada durante los vuelos (lo que bajaba se corta al despegar)`, colaEnVuelo.slice(0, 6));
    const ahoraEnVuelo = r.registro.filter(x => x.como === 'ahora' && !x.deCache && dentro(x.inicio, 100));
    informe.comprobar(ahoraEnVuelo.length === 0, `${etiqueta}: lo urgente (la canción del destino) se pide al elegirlo, no en pleno vuelo (lo ya bajado sale de la caché)`, ahoraEnVuelo.slice(0, 6));
    const deLaCola = new Set(r.registro.map(x => x.ruta));
    const paginaEnVuelo = r.recursos.filter(x => x.cuerpo > 0 && !x.sw && dentro(x.inicio, 100) && !deLaCola.has(x.ruta.split(/[?#]/)[0].replace(/^\//, '')));
    informe.comprobar(paginaEnVuelo.length === 0, `${etiqueta}: durante los vuelos la página no descarga nada más (módulos, fuentes, imágenes)`, paginaEnVuelo.slice(0, 6));
    informe.comprobar(!r.estado.pendientes.length && !r.estado.enCurso, `${etiqueta}: en reposo la cola termina (todo descargado)`, r.estado);
    const veces = new Map(); for (const x of r.registro.filter(x => x.fin && x.como === 'reposo')) veces.set(x.ruta, (veces.get(x.ruta) || 0) + 1);
    informe.comprobar([...veces.values()].every(n => n === 1), `${etiqueta}: la cola baja cada archivo una sola vez`, [...veces].filter(([, n]) => n > 1).slice(0, 6));
    informe.nota(`${etiqueta}: ${r.vuelos.length} vuelos · cola: ${r.registro.filter(x => x.como === 'reposo' && x.fin).length} descargas en reposo, ${r.registro.filter(x => x.cortada).length} cortadas al despegar, ${r.registro.filter(x => x.como === 'ahora').length} urgentes`);
    const banda = await pagina.evaluate(() => Object.fromEntries(Object.entries(window.__bandaSonora.estado().pistas).map(([n, p]) => [n, p.estado])));
    // («guardada»: descargada y ya sonada; su búfer decodificado se libera al irse del lugar —memoria del iPhone—.)
    const listas = Object.entries(banda).filter(([, e]) => e === 'lista' || e === 'guardada').map(([n]) => n);
    informe.comprobar(['cuasar', 'supernova', 'pulsar', 'ton618', 'deneb', 'sagitario'].every(n => listas.includes(n)), `${etiqueta}: las canciones de los gigantes estaban (y sonaron)`, banda);
    if (conServicio) informe.comprobar(red.length === 0 || r.vuelos.length > 0, `${etiqueta}: el service worker guarda lo que pasa (${red.length} peticiones propias)`, red.slice(0, 8));
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
