// Empaquetado local de archivos públicos; no hace push ni publica en GitHub.
import { cp, mkdir, rm, writeFile, readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const destino = path.resolve('dist');
await rm(destino, {recursive:true,force:true});
await mkdir(destino,{recursive:true});
for (const archivo of ['index.html','manifest.webmanifest','favicon.ico']) await cp(archivo,path.join(destino,archivo));
for (const carpeta of ['assets','css','js']) await cp(carpeta,path.join(destino,carpeta),{recursive:true,filter:src=>!path.basename(src).startsWith('.')});
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
// Paquetes como en un videojuego: la primera vez se descarga todo y se guarda en el dispositivo; después
// el universo se abre desde ahí (también sin conexión). Si hay una versión nueva se descargan en segundo
// plano SOLO los archivos que cambiaron (el resto se copia de la versión guardada) y la página la aplica.
const VERSION = 'universo-${version}';
const HUELLAS = ${JSON.stringify(huellas)};
const MANIFIESTO = './__huellas.json';
const avisar = datos => self.clients.matchAll({ includeUncontrolled: true }).then(cs => cs.forEach(c => c.postMessage(datos)));
self.addEventListener('install', e => { e.waitUntil((async () => {
  const nueva = await caches.open(VERSION), viejas = [];
  for (const k of await caches.keys()) if (k.startsWith('universo-') && k !== VERSION) { const c = await caches.open(k), m = await c.match(MANIFIESTO); if (m) viejas.push({ c, h: await m.json() }); }
  const pendientes = Object.entries(HUELLAS); let hechos = 0, descargados = 0;
  const uno = async ([url, h]) => {
    for (const v of viejas) if (v.h[url] === h) { const r = await v.c.match(url); if (r) { await nueva.put(url, r); return; } }
    const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error('No se pudo descargar ' + url);
    await nueva.put(url, r); descargados++;
  };
  // Seis descargas a la vez (como un navegador): rápido sin saturar la conexión del teléfono.
  await Promise.all(Array.from({ length: 6 }, async () => { while (pendientes.length) { await uno(pendientes.shift()); hechos++; if (hechos % 20 === 0) avisar({ tipo: 'paquetes', hechos, total: Object.keys(HUELLAS).length }); } }));
  await nueva.put(MANIFIESTO, new Response(JSON.stringify(HUELLAS), { headers: { 'Content-Type': 'application/json' } }));
  avisar({ tipo: 'paquetes-listos', version: VERSION, descargados });
})()); });
self.addEventListener('activate', e => { e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('universo-') && k !== VERSION) await caches.delete(k);
  await self.clients.claim();
})()); });
// La página pide aplicar la versión nueva cuando no molesta (en la carga, o si lo pide quien la ve).
self.addEventListener('message', e => { if (e.data === 'aplicar') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const peticion = e.request, url = new URL(peticion.url);
  if (peticion.method !== 'GET' || url.origin !== location.origin) return;
  // El contenido editable: primero la red (novedades) y la copia guardada como respaldo sin conexión.
  if (url.pathname.endsWith('/contenido.json')) {
    e.respondWith(fetch(peticion).then(r => { const copia = r.clone(); if (r.ok) caches.open(VERSION).then(c => c.put(peticion, copia)); return r; }).catch(() => caches.match(peticion, { ignoreSearch: true })));
    return;
  }
  // La página y sus paquetes salen siempre de la MISMA versión guardada (nunca se mezclan dos versiones).
  const clave = peticion.mode === 'navigate' ? './' : peticion;
  e.respondWith(caches.open(VERSION).then(c => c.match(clave, { ignoreSearch: true }).then(r => r || fetch(peticion).then(red => {
    // Lo que no está en la lista (el cielo grande, solo en PC) se guarda la primera vez que se usa.
    if (red.ok && peticion.mode !== 'navigate') c.put(peticion, red.clone());
    return red;
  }))));
});
`);
console.log(`App sin conexión: ${archivos.length} archivos en la caché ${version}.`);
console.log('dist/ preparado para GitHub Pages. No se ha publicado ni enviado ningún archivo.');
