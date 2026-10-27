// Precarga en reposo: lo que la web puede pedir ya dentro (las canciones de los destinos y sus estancias, el cielo grande,
// las fuentes que solo se usan con ciertos caracteres, los módulos que se cargan más tarde…) NO se baja en la pantalla de
// carga: va a la cola de descargas (descargas.js, enReposo) y se descarga después de la intro, de uno en uno y solo en los
// momentos libres (nunca durante un vuelo, un clip o un gesto). Primero las canciones de los destinos (pequeñas: suenan
// nada más llegar), luego sus estancias y al final lo demás. Si quien mira elige un destino cuya canción aún no ha
// llegado, la banda sonora la pide en el acto (descargarAhora): la cola nunca la retrasa.
// La lista sale de ./paquetes.json (todos los archivos públicos con sus bytes: lo escribe scripts/preparar-pages.mjs y lo
// sirve al vuelo scripts/servir.py). Se quita lo que ya descarga la propia carga (texturas horneadas, cielo, horno, three.js,
// las canciones de la intro y de los viajes), lo que este aparato nunca pide y lo que la página ya ha pedido.
// Con service worker (HTTPS) cada descarga queda guardada en su caché al pasar (paquetes.js).
import { enReposo } from './descargas.js';

// Lo que ya descarga la carga por su cuenta, o que la página no pide nunca (o solo con herramientas de diagnóstico).
const PROPIO = /^(assets\/texturas\/|assets\/horno\/|assets\/musica\/(inicio|viajes)\.m4a$|assets\/musica\/prueba\/|assets\/escucha-ciegas\/|assets\/vendor\/|editor\.html$|js\/editor\.js$|css\/editor\.css$|js\/escena\/diagnostico\w*\.js$|sw\.js$|paquetes\.json$)|\.txt$|LICENSE$/;

// Prioridad en la cola (menor = antes).
export function prioridad(ruta) {
  if (/^assets\/musica\/[^/]+-estancia\.m4a$/.test(ruta)) return 3;
  if (/^assets\/musica\/[^/]+\.m4a$/.test(ruta)) return 1;
  if (/^assets\/cielo\//.test(ruta)) return 4;
  return 6;
}

export function filtrarLista(archivos, { cieloAlto = true, pedidos = new Set() } = {}) {
  const lista = [];
  for (const [ruta, bytes] of Object.entries(archivos || {})) {
    if (PROPIO.test(ruta) || pedidos.has(ruta)) continue;
    // El cielo de fondo: la carga trae el mediano; el grande lo pide cieloProfundo.js en reposo (salvo en el modo seguro).
    if (/^assets\/cielo\//.test(ruta) && (!cieloAlto || !/-alta\./.test(ruta))) continue;
    lista.push([ruta, bytes]);
  }
  return lista.sort((a, b) => prioridad(a[0]) - prioridad(b[0]));
}

// Rutas (relativas a la página) que la página ya ha pedido: no hace falta pedirlas otra vez.
function yaPedidos() {
  const base = new URL('./', location.href).href, s = new Set();
  for (const e of performance.getEntriesByType?.('resource') || []) if (e.name.startsWith(base)) s.add(e.name.slice(base.length).split(/[?#]/)[0]);
  return s;
}

// Pone en la cola de reposo todo lo que falta. La cola no empieza hasta que la carga la suelta (al terminar la intro).
// Devuelve { archivos, bytes } de lo encolado.
// cuando: promesa tras la que se encola (la intro terminada: así se sabe todo lo que la carga ya pidió).
export async function precargarEnReposo({ cieloAlto = true, cuando = Promise.resolve() } = {}) {
  if (typeof fetch !== 'function') return { archivos: 0, bytes: 0 };
  try {
    const r = await fetch('./paquetes.json', { cache: 'no-cache' });
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    const archivos = await r.json(); await cuando;
    const lista = filtrarLista(archivos, { cieloAlto, pedidos: yaPedidos() });
    for (const [ruta] of lista) enReposo(ruta, prioridad(ruta));
    return { archivos: lista.length, bytes: lista.reduce((a, [, b]) => a + b, 0) };
  } catch (e) {
    console.warn('Precarga: sin lista de paquetes (' + e.message + ')');
    return { archivos: 0, bytes: 0 };
  }
}
