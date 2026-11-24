// Empaquetado local de archivos públicos; no hace push ni publica en GitHub.
import { cp, mkdir, rm, writeFile, readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { transform } from 'esbuild';
const destino = path.resolve('dist');
await rm(destino, {recursive:true,force:true});
await mkdir(destino,{recursive:true});
for (const archivo of ['index.html','manifest.webmanifest','favicon.ico']) await cp(archivo,path.join(destino,archivo));
for (const carpeta of ['assets','css','js']) await cp(carpeta,path.join(destino,carpeta),{recursive:true,filter:src=>!path.basename(src).startsWith('.')&&!/assets[\\/](musica[\\/]prueba|escucha-ciegas)/.test(src)});   // (los audios de prueba y la escucha a ciegas no se publican)
// El taller es una herramienta local, separada de la experiencia publicada.
for (const archivo of ['js/editor.js','css/editor.css']) await rm(path.join(destino,archivo),{force:true});
await writeFile(path.join(destino,'.nojekyll'),'');
// Publicación más ligera: el JS y el CSS sin comentarios ni espacios (esbuild, archivo a archivo: mismas rutas y mismos
// módulos, sin renombrar nada; three.module.min.js ya viene minificado). Los archivos que llaman a horneado()
// (js/util/horno.js) se publican TAL CUAL: la clave del horno lleva la huella del texto de su función de cálculo y,
// minificada, ninguna coincidiría con assets/horno/ (el iPhone lo recalcularía todo, ~20 s). Se comprueba abajo.
{
  const conHorno = t => /\bhorneado\(/.test(t.replace(/export function horneado\(/, ''));
  let antes = 0, despues = 0; const intactos = [];
  const recorrer = async dir => { for (const e of await readdir(dir, { withFileTypes: true })) { const r = path.join(dir, e.name); if (e.isDirectory()) await recorrer(r); else if (/\.(js|css)$/.test(e.name) && !e.name.endsWith('.min.js')) await uno(r); } };
  const uno = async r => {
    const texto = await readFile(r, 'utf8'), rel = path.relative(destino, r).split(path.sep).join('/');
    antes += Buffer.byteLength(texto);
    if (r.endsWith('.js') && conHorno(texto)) { intactos.push(rel); despues += Buffer.byteLength(texto); return; }
    const { code } = await transform(texto, { loader: r.endsWith('.css') ? 'css' : 'js', minifyWhitespace: true, minifySyntax: true, legalComments: 'none', charset: 'utf8', sourcefile: rel });
    await writeFile(r, code); despues += Buffer.byteLength(code);
  };
  for (const d of ['js', 'css', 'assets/vendor/three/addons']) await recorrer(path.join(destino, d));
  // Los del horno, idénticos al original (si no, las claves no coincidirían).
  for (const rel of intactos) if (!(await readFile(path.join(destino, rel))).equals(await readFile(rel))) throw new Error('El archivo del horno cambió al publicar: ' + rel);
  console.log(`JS y CSS minificados: ${(antes / 1024).toFixed(0)} KB → ${(despues / 1024).toFixed(0)} KB (tal cual, por el horno: ${intactos.join(', ')}).`);
}
// three.js: la página usa el minificado (la versión oficial de la misma r160, ~45 % menos; mapa de importación de
// index.html); el legible no se publica.
await rm(path.join(destino, 'assets/vendor/three/three.module.js'), { force: true });
// App sin conexión (solo se registra en HTTPS): lista exacta de archivos y versión
// derivada de su contenido. Cada publicación usa una caché nueva y borra las viejas.
async function listar(dir) {
  const salida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) salida.push(...await listar(ruta)); else salida.push(ruta);
  }
  return salida;
}
// Lista de todos los archivos públicos con sus bytes: la precarga (js/util/precarga.js) pone en la cola de reposo lo que la
// web pueda pedir después de la carga.
{ const todos = {}; for (const r of await listar(destino)) { const rel = path.relative(destino, r).split(path.sep).join('/'); todos[rel] = (await stat(r)).size; } await writeFile(path.join(destino, 'paquetes.json'), JSON.stringify(todos)); }
const archivos = (await listar(destino)).map(r => path.relative(destino, r).split(path.sep).join('/')).filter(r => r !== 'sw.js' && !/^assets\/cielo\/.*-alta\.webp$/.test(r)).sort();   // el cielo grande (solo PC) no se guarda en el teléfono
// Huella de cada archivo: una actualización solo descarga los paquetes que han cambiado.
const huellas = {}, huella = createHash('sha256');
for (const r of archivos) { const datos = await readFile(path.join(destino, r)); huellas['./' + r] = createHash('sha256').update(datos).digest('hex').slice(0, 16); huella.update(r); huella.update(datos); }
huellas['./'] = huellas['./index.html'];
const version = huella.digest('hex').slice(0, 12);
await writeFile(path.join(destino, 'sw.js'), `// Generado por scripts/preparar-pages.mjs. No editar a mano.
// Paquetes como en un videojuego: lo que la página descarga se guarda en el dispositivo desde la PRIMERA visita (la primera
// instalación se activa en el acto y guarda cada archivo según pasa; tras entrar, la página pide «completar» lo que
// falte). Después el universo se abre desde ahí (también sin conexión) y una recarga no vuelve a descargar nada.
// Una versión nueva descarga en segundo plano SOLO los archivos que cambiaron (el resto se copia de la versión guardada) y
// espera si hay una página sana abierta (contesta a «sana?»); si ninguna contesta (copia vieja o rota: no llega a arrancar)
// la releva en el acto y la recarga. Nada se guarda ni se reutiliza sin comprobar su huella: mezclar archivos de dos
// versiones dejaba la página en «Volvamos a encender el cielo» para siempre (25/11/2026).
const VERSION = 'universo-${version}';
const HUELLAS = ${JSON.stringify(huellas)};
const MANIFIESTO = './__huellas.json';
const BASE = new URL('./', self.location).href;
const claveDe = url => { const u = new URL(url); u.search = ''; u.hash = ''; return u.href.startsWith(BASE) ? './' + u.href.slice(BASE.length) : null; };
const huellaDe = async r => { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', await r.clone().arrayBuffer())); return [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join(''); };
// Descarga comprobada: si la red da otra versión (una copia intermedia atrasada), se pide otra vez sin copias; si sigue sin
// coincidir, falla: mejor seguir con la versión entera de antes que guardar una mezcla.
const bajar = async (url, h) => {
  for (const dir of [url, url + '?v=' + h]) { const r = await fetch(dir, { cache: 'reload' }); if (r.ok && await huellaDe(r) === h) return r; }
  throw new Error('No coincide con su versión: ' + url);
};
// ¿Alguna página abierta funciona? (Las rotas y las de antes de este cambio no contestan.)
let sinRespuesta = [];
const haySana = async () => {
  const paginas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const sanas = await Promise.all(paginas.map(p => new Promise(ok => { const c = new MessageChannel(); c.port1.onmessage = () => ok(true); setTimeout(() => ok(false), 1500); p.postMessage('sana?', [c.port2]); })));
  sinRespuesta = paginas.filter((_, i) => !sanas[i]).map(p => p.id);
  return sanas.includes(true);
};
self.addEventListener('install', e => { e.waitUntil((async () => {
  // Primera instalación (ninguna versión activa): sin descargas propias; se activa ya y guarda lo que la página pida.
  if (!self.registration.active) { await self.skipWaiting(); return; }
  const nueva = await caches.open(VERSION), viejas = [];
  for (const k of await caches.keys()) if (k.startsWith('universo-') && k !== VERSION) { const c = await caches.open(k), m = await c.match(MANIFIESTO); viejas.push({ c, h: m ? await m.json() : null }); }
  const pendientes = Object.entries(HUELLAS);
  const uno = async ([url, h]) => {
    const ya = await nueva.match(url); if (ya && await huellaDe(ya) === h) return;
    for (const v of viejas) { const r = await v.c.match(url); if (r && (!v.h || v.h[url] === h) && await huellaDe(r) === h) { await nueva.put(url, r); return; } }
    await nueva.put(url, await bajar(url, h));
  };
  // Cuatro descargas a la vez: sin saturar la conexión del teléfono.
  await Promise.all(Array.from({ length: 4 }, async () => { while (pendientes.length) await uno(pendientes.shift()); }));
  await nueva.put(MANIFIESTO, new Response(JSON.stringify(HUELLAS), { headers: { 'Content-Type': 'application/json' } }));
  if (await haySana()) sinRespuesta = []; else await self.skipWaiting();
})()); });
self.addEventListener('activate', e => { e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('universo-') && k !== VERSION) await caches.delete(k);
  await self.clients.claim();
  // Las páginas viejas o rotas relevadas se abren de nuevo, ya enteras (sin esperarlas: su carga espera a esta activación).
  for (const p of await self.clients.matchAll({ type: 'window' })) if (sinRespuesta.includes(p.id)) p.navigate(p.url).catch(() => {});
})()); });
// Completar (tras entrar, sin prisa): lo que aún no esté guardado se descarga de dos en dos y se comprueba con su huella
// (un archivo de otra versión no se queda guardado como de esta). Lo ya guardado no se vuelve a leer: comprobar las
// huellas de todo eran decenas de MB en memoria a la vez en el teléfono.
let completando = null;
async function completar() {
  const c = await caches.open(VERSION), pendientes = Object.entries(HUELLAS); let faltan = 0;
  const uno = async ([url, h]) => {
    if (await c.match(url)) return;
    const r = await bajar(url, h).catch(() => null);
    if (r) await c.put(url, r); else faltan++;
  };
  await Promise.all(Array.from({ length: 2 }, async () => { while (pendientes.length) { try { await uno(pendientes.shift()); } catch { faltan++; } } }));
  if (!faltan) await c.put(MANIFIESTO, new Response(JSON.stringify(HUELLAS), { headers: { 'Content-Type': 'application/json' } }));
}
// Una petición de la página a un archivo que el service worker está guardando en ese momento espera a ese guardado en
// lugar de pedirlo otra vez (enCurso): cada archivo, una sola descarga.
const enCurso = new Map();
self.addEventListener('message', e => {
  if (e.data === 'aplicar') self.skipWaiting();   // solo cuando quien mira pulsa «Actualizar»
  if (e.data === 'completar') e.waitUntil(completando ||= completar().finally(() => { completando = null; }));
});
self.addEventListener('fetch', e => {
  const peticion = e.request, url = new URL(peticion.url);
  if (peticion.method !== 'GET' || url.origin !== location.origin || peticion.headers.has('range')) return;
  // El contenido editable: primero la red (novedades) y la copia guardada como respaldo sin conexión.
  if (url.pathname.endsWith('/contenido.json')) {
    e.respondWith(fetch(peticion).then(r => { const copia = r.clone(); if (r.ok) caches.open(VERSION).then(c => c.put(peticion, copia)); return r; }).catch(() => caches.match(peticion, { ignoreSearch: true })));
    return;
  }
  // La página y sus paquetes salen siempre de la MISMA versión guardada (nunca se mezclan dos versiones).
  const clave = peticion.mode === 'navigate' ? './' : claveDe(peticion.url);
  const listado = clave && HUELLAS[clave] !== undefined;
  // (Si se está guardando ahora mismo, se espera a ese guardado: una sola descarga.)
  e.respondWith(servir(peticion, clave, listado));
});
// Si lo publicado ya es otra versión y aquí falta algo, esta copia incompleta se descarta ENTERA: desde ahí todo sale de la
// red (una sola versión) hasta que el service worker nuevo la releve.
const CADUCA = './__caduca';
async function caducar(c) { for (const k of await c.keys()) await c.delete(k); await c.put(CADUCA, new Response('1')); self.registration.update().catch(() => {}); }
async function servir(peticion, clave, listado) {
  const c = await caches.open(VERSION);
  const directa = () => fetch(!listado ? peticion : peticion.mode === 'navigate' ? new Request(peticion.url, { cache: 'no-cache' }) : new Request(peticion, { cache: 'no-cache' }));
  if (await c.match(CADUCA)) return directa();
  let r = await c.match(clave || peticion, { ignoreSearch: true });
  // (Si se está guardando ahora mismo, se espera a ese guardado: una sola descarga.)
  if (!r && clave && enCurso.has(clave)) { await enCurso.get(clave); r = await c.match(clave); }
  if (r) return r;
  const red = await directa();
  if (!red.ok || red.status !== 200) return red;
  // Se guarda según llega, solo si es de esta versión (lo que no está en la lista —el cielo grande, solo en el PC— tal cual).
  const copia = red.clone();
  const guardar = async () => {
    if (!listado) { if (peticion.mode !== 'navigate') await c.put(clave || peticion, copia); return; }
    if (await huellaDe(copia) === HUELLAS[clave]) await c.put(clave, copia); else await caducar(c);
  };
  const g = guardar().catch(() => {});
  if (clave && !enCurso.has(clave)) { enCurso.set(clave, g); g.finally(() => enCurso.delete(clave)); }
  // La página espera la comprobación antes de pedir sus módulos: si ya es otra versión, la copia se ha descartado.
  if (peticion.mode === 'navigate') await g;
  return red;
}
`);
console.log(`App sin conexión: ${archivos.length} archivos en la caché ${version}.`);
console.log('dist/ preparado para GitHub Pages. No se ha publicado ni enviado ningún archivo.');
