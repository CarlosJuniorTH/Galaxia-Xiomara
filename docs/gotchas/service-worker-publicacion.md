# Trampas: service worker y publicación

## Publicación
- Cada push a `main` publica en GitHub Pages (`.github/workflows/pages.yml`): no corre pruebas. Nunca push sin que Carlos
  lo pida; pasar `npm test` y las pruebas de navegador tocadas antes.
- `scripts/preparar-pages.mjs` crea `dist/`: copia `assets`, `css`, `js` sin ocultos ni `assets/musica/prueba` ni
  `assets/escucha-ciegas` (`:9`), sin el taller (`editor.html`) ni three.js legible (`:13`), y escribe `paquetes.json` y
  `sw.js`. Probar en local: `npm run build:pages`.
- Si se añade una carpeta pública nueva fuera de `assets/css/js`, hay que añadirla en `preparar-pages.mjs:9` (y en `CARPETAS` de
  `scripts/servir.py:16`, que filtra lo que sirve).

## Service worker (generado, no editar `sw.js` a mano)
- Versión derivada del contenido; cada publicación usa una caché nueva y borra las viejas (`preparar-pages.mjs:16`).
- Guarda TODO lo que la página descarga desde la primera visita; una recarga no vuelve a descargar (`:37`).
- Versión nueva: baja en segundo plano solo los archivos cambiados y **espera**. Si está lista antes de que quien mira toque
  la pantalla, la página la aplica sola y recarga (`js/util/paquetes.js`; como mucho una vez por minuto); si ya ha tocado,
  solo con «Actualizar» (`skipWaiting` solo con `'aplicar'`). Con la copia vieja abierta en iPhone salía «Actualizar» y no
  el estreno. Al verificar un arreglo en un móvil, comprobar la versión.
- La página y sus paquetes salen siempre de la MISMA versión guardada (`:97`): no mezclar versiones.
- Solo en HTTPS. En la red local (http) no hay service worker; `?sw=1` lo prueba en localhost (`js/util/paquetes.js:9`).
- El giroscopio de iOS también necesita HTTPS.

## Servidor local
- `scripts/servir.py` (`npm run dev`, `npm run dev:movil` con `--lan`, puerto por defecto 8080) sirve con gzip como
  GitHub Pages (`:17`) y no expone Git, scripts ni pruebas.
- No tocar el servicio `galaxia-xiomara-movil.service` (puerto 3000), ni ufw, ni la red. Para pruebas, otro puerto.

## Rebases
- Un rebase dejó una importación duplicada en `cosmos.js` y el universo no arrancaba (99d53e5): tras un rebase, abrir la
  página y pasar `npm test` (`npm run check` está roto, ver `docs/ESTADO.md`).
