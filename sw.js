// Universo apagado: borra todo lo que la versión anterior guardó en el dispositivo y se da de baja.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));
