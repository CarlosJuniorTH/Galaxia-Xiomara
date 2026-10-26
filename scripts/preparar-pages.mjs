// Empaquetado local de archivos públicos; no hace push ni publica en GitHub.
import { cp, mkdir, rm, writeFile, readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const destino = path.resolve('dist');
await rm(destino, {recursive:true,force:true});
await mkdir(destino,{recursive:true});
for (const archivo of ['index.html','manifest.webmanifest','favicon.ico']) await cp(archivo,path.join(destino,archivo));
for (const carpeta of ['assets','css','js']) await cp(carpeta,path.join(destino,carpeta),{recursive:true,filter:src=>!path.basename(src).startsWith('.')&&!/assets[\\/](musica[\\/]prueba|escucha-ciegas)/.test(src)});   // (los audios de prueba y la escucha a ciegas no se publican)
// El taller es una herramienta local, separada de la experiencia publicada.
for (const archivo of ['js/editor.js','css/editor.css']) await rm(path.join(destino,archivo),{force:true});
await writeFile(path.join(destino,'.nojekyll'),'');
// three.js minificado (la versión oficial de la misma r160, ~45 % menos): se publica en lugar del legible.
{ const v = path.join(destino, 'assets/vendor/three'); await cp(path.join(v, 'three.module.min.js'), path.join(v, 'three.module.js')); await rm(path.join(v, 'three.module.min.js'), { force: true }); }
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
// espera: se aplica en la próxima visita o cuando quien mira pulsa «Actualizar» (nunca recarga la página por sí sola).
const VERSION = 'universo-${version}';
const HUELLAS = ${JSON.stringify(huellas)};
const MANIFIESTO = './__huellas.json';
const BASE = new URL('./', self.location).href;
const claveDe = url => { const u = new URL(url); u.search = ''; u.hash = ''; return u.href.startsWith(BASE) ? './' + u.href.slice(BASE.length) : null; };
const huellaDe = async r => { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', await r.clone().arrayBuffer())); return [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join(''); };
self.addEventListener('install', e => { e.waitUntil((async () => {
  // Primera instalación (ninguna versión activa): sin descargas propias; se activa ya y guarda lo que la página pida.
  if (!self.registration.active) { await self.skipWaiting(); return; }
  const nueva = await caches.open(VERSION), viejas = [];
  for (const k of await caches.keys()) if (k.startsWith('universo-') && k !== VERSION) { const c = await caches.open(k), m = await c.match(MANIFIESTO); viejas.push({ c, h: m ? await m.json() : null }); }
  const pendientes = Object.entries(HUELLAS);
  const uno = async ([url, h]) => {
    if (await nueva.match(url)) return;
    for (const v of viejas) { const r = await v.c.match(url); if (r && (v.h ? v.h[url] === h : await huellaDe(r) === h)) { await nueva.put(url, r); return; } }
    const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error('No se pudo descargar ' + url);
    await nueva.put(url, r);
  };
  // Cuatro descargas a la vez: sin saturar la conexión del teléfono.
  await Promise.all(Array.from({ length: 4 }, async () => { while (pendientes.length) await uno(pendientes.shift()); }));
  await nueva.put(MANIFIESTO, new Response(JSON.stringify(HUELLAS), { headers: { 'Content-Type': 'application/json' } }));
})()); });
self.addEventListener('activate', e => { e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('universo-') && k !== VERSION) await caches.delete(k);
  await self.clients.claim();
})()); });
// Completar (tras entrar, sin prisa): lo que aún no esté guardado se descarga de dos en dos y se comprueba con su huella
// (un archivo de otra versión no se queda guardado como de esta). Lo ya guardado no se vuelve a leer: comprobar las
// huellas de todo eran decenas de MB en memoria a la vez en el teléfono.
let completando = null;
async function completar() {
  const c = await caches.open(VERSION), pendientes = Object.entries(HUELLAS);
  const uno = async ([url, h]) => {
    if (await c.match(url)) return;
    const r = await fetch(url, { cache: 'no-cache' }).catch(() => null);
    if (r && r.ok && await huellaDe(r) === h) await c.put(url, r); else await c.delete(url);
  };
  await Promise.all(Array.from({ length: 2 }, async () => { while (pendientes.length) { try { await uno(pendientes.shift()); } catch {} } }));
  await c.put(MANIFIESTO, new Response(JSON.stringify(HUELLAS), { headers: { 'Content-Type': 'application/json' } }));
}
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
  e.respondWith(caches.open(VERSION).then(c => c.match(clave || peticion, { ignoreSearch: true }).then(r => r || fetch(listado ? new Request(peticion, { cache: 'no-cache' }) : peticion).then(red => {
    // Se guarda según llega (lo listado, revalidado con el servidor; lo que no está en la lista —el cielo grande, solo en
    // el PC— la primera vez que se usa). La página de entrada se guarda al completar.
    if (red.ok && red.status === 200 && peticion.mode !== 'navigate') c.put(clave || peticion, red.clone()).catch(() => {});
    return red;
  }))));
});
`);
console.log(`App sin conexión: ${archivos.length} archivos en la caché ${version}.`);
console.log('dist/ preparado para GitHub Pages. No se ha publicado ni enviado ningún archivo.');
