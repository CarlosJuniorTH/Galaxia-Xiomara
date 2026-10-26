// Precarga: durante la pantalla de carga (antes del clip de la intro) se descarga TODO lo que la web puede pedir después
// (las canciones de los destinos y sus estancias, las fuentes que solo se usan con ciertos caracteres, los módulos que se
// cargan más tarde…), y cuenta en los MB de la barra. Así, ya dentro, nada sale a la red: viajar, entrar en un gigante o
// en el sistema solar sale todo del dispositivo, al instante.
// · Con service worker (HTTPS, o ?sw=1): él lo descarga y lo guarda en su caché (paquetes.js); la página solo recibe el
//   avance. Nada pasa por la memoria de la página: ni se decodifica ni se crean elementos de audio.
// · Sin él (la red local por http): se pide con fetch y se tira (la caché HTTP del navegador lo guarda); luego, como
//   mucho, una revalidación sin cuerpo.
// La lista sale de ./paquetes.json (todos los archivos públicos con sus bytes: lo escribe scripts/preparar-pages.mjs y lo
// sirve al vuelo scripts/servir.py). Se quitan las cosas que ya cuenta y descarga la propia carga (texturas horneadas,
// cielo, horno y las canciones de la intro y de los viajes) y lo que este aparato nunca pide.
import { descargas } from './descargas.js';

// Lo que ya descarga (y cuenta) la carga por su cuenta, o que no se pide nunca desde la página.
const PROPIO = /^(assets\/texturas\/|assets\/horno\/|assets\/musica\/(inicio|viajes)\.m4a$|assets\/musica\/prueba\/|assets\/escucha-ciegas\/|editor\.html$|js\/editor\.js$|css\/editor\.css$|sw\.js$|paquetes\.json$)|\.min\.js$|\.txt$|LICENSE$/;

export function filtrarLista(archivos, { movil = false, pedidos = new Set() } = {}) {
  const lista = [];
  for (const [ruta, bytes] of Object.entries(archivos || {})) {
    if (PROPIO.test(ruta) || pedidos.has(ruta)) continue;
    // El cielo de fondo: el grande solo en el PC (en el teléfono ni se pide ni se guarda); las caras las cuenta la carga.
    if (/^assets\/cielo\//.test(ruta) && (movil ? /-alta\./.test(ruta) : false)) continue;
    lista.push([ruta, bytes]);
  }
  return lista;
}

// Rutas (relativas a la página) que la página ya ha pedido: no hace falta pedirlas otra vez (sin service worker).
function yaPedidos() {
  const base = new URL('./', location.href).href, s = new Set();
  for (const e of performance.getEntriesByType?.('resource') || []) if (e.name.startsWith(base)) s.add(e.name.slice(base.length).split(/[?#]/)[0]);
  return s;
}

// tras: promesa que se cumple cuando la página ya ha pedido sus módulos (la escena creada): lo que no son canciones se
// pide después, para no pedir dos veces lo que la carga está pidiendo en ese momento.
export function precargarTodo({ movil = false, servicio = Promise.resolve(null), tras = Promise.resolve() } = {}) {
  if (typeof fetch !== 'function') return Promise.resolve({ archivos: 0, bytes: 0 });
  // Mientras no se sabe cuánto es, un byte «pendiente»: la carga no puede darse por descargada antes de saberlo.
  descargas.previsto(1);
  let reservado = 1;
  const soltar = () => { if (reservado) { descargas.previsto(-reservado); reservado = 0; } };
  return (async () => {
    let total = { archivos: 0, bytes: 0 };
    try {
      const r = await fetch('./paquetes.json', { cache: 'no-cache' });
      if (!r.ok) throw Error(`HTTP ${r.status}`);
      const archivos = await r.json(), sw = await servicio;
      const tanda = async (filtro, ultima) => {
        const lista = filtrarLista(archivos, { movil, pedidos: sw ? new Set() : yaPedidos() }).filter(filtro);
        const hecho = sw ? await conServicio(sw, lista, ultima) : await sinServicio(lista, ultima);
        total = { archivos: total.archivos + hecho.archivos, bytes: total.bytes + hecho.bytes };
      };
      const cancion = ([ruta]) => /^assets\/musica\//.test(ruta);
      await Promise.all([tanda(cancion, false), tras.then(() => tanda(x => !cancion(x), true))]);
    } catch (e) {
      console.warn('Precarga: sin lista de paquetes (' + e.message + ')');
    } finally { soltar(); }
    return total;
  })();

  // El service worker dice primero cuánto le falta (lo ya guardado no cuenta) y luego avisa de cada archivo.
  function conServicio(sw, lista, ultima) {
    return new Promise(fin => {
      const canal = new MessageChannel(); let previsto = 0, hechos = 0, archivos = 0, plazo = 0;
      const vigilar = () => { clearTimeout(plazo); plazo = setTimeout(() => terminar(), 30000); };   // si el service worker se calla
      const terminar = () => { clearTimeout(plazo); if (hechos < previsto) descargas.hecho(previsto - hechos); canal.port1.close(); fin({ archivos, bytes: previsto }); };
      canal.port1.onmessage = ({ data }) => {
        vigilar();
        if (data.tipo === 'plan') { previsto = data.bytes; archivos = data.archivos; descargas.previsto(previsto); if (ultima) soltar(); }
        else if (data.tipo === 'hecho') { const k = Math.min(data.bytes, previsto - hechos); if (k > 0) { hechos += k; if (data.ok === false) { previsto -= k; hechos -= k; descargas.previsto(-k); } else descargas.hecho(k); } }
        else if (data.tipo === 'fin') terminar();
      };
      vigilar();
      sw.postMessage({ tipo: 'precargar', lista }, [canal.port2]);
    });
  }
  // Sin service worker: de tres en tres, con prioridad baja (lo imprescindible de la carga va antes).
  async function sinServicio(lista, ultima) {
    const bytes = lista.reduce((a, [, b]) => a + b, 0);
    descargas.previsto(bytes); if (ultima) soltar();
    const cola = lista.slice();
    const uno = async ([ruta, b]) => {
      let ok = false;
      try { const r = await fetch(ruta, { priority: 'low' }); if (r.ok) { await r.blob(); ok = true; } } catch {}
      // (Lo que no está —un 404— sale del total: el contador no promete MB que no existen.)
      if (ok) descargas.hecho(b); else descargas.previsto(-b);
    };
    await Promise.all(Array.from({ length: 3 }, async () => { while (cola.length) await uno(cola.shift()); }));
    return { archivos: lista.length, bytes };
  }
}
