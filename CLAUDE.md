# Galaxia Xiomara · «Nuestro pequeño infinito»

Universo 3D que Carlos regala a Xiomara (juntos desde el 15/12/2025): su galaxia con corazón, lugares visitables, seis
gigantes (cuásar, púlsar, Deneb, TON 618, Sagitario A*, supernova) con su videoclip y su canción, sistema solar y viajes.
También es pieza de portfolio: la calidad visual y la fluidez son el producto.

Este archivo se inyecta en cada mensaje: mantenerlo corto. El detalle va en `docs/` (índice al final). Corrige, no
acumules: lo que deja de ser cierto se reescribe aquí y la historia va a `docs/ESTADO.md`.

## Stack y despliegue

- Three.js r160 sin bundler: ES modules + `importmap` en `index.html` (apunta a `three.module.min.js`;
  `es-module-shims` solo donde falta). Copia local en `assets/vendor/` (`npm run vendor`).
- Código: `js/escena/` (3D), `js/ui/` (interfaz, banda sonora, clips), `js/util/` (reloj, descargas, cámara, horno),
  `js/data/` (contenido, canciones y marcas). Taller local: `editor.html` (no se publica).
- Publicación: cada push a `main` → `.github/workflows/pages.yml` → `scripts/preparar-pages.mjs` crea `dist/` con
  `paquetes.json` y el service worker generado `sw.js`. El workflow no corre pruebas.
- Red local: `scripts/servir.py` (`npm run dev`; `npm run dev:movil` = `--lan`, puerto 8080 por defecto), con gzip como
  Pages y sin exponer Git ni scripts.
- Cálculos y texturas pesados se hornean en el PC (`scripts/hornear-*.mjs`) y el móvil solo los descarga.

## Reglas no negociables

- **60 FPS en móvil de gama media con el MISMO contenido que el PC.** Sin selector de calidad, sin resolución dinámica,
  sin bajadas automáticas ni paso a 30 FPS. Medir antes y después de cada cambio de rendimiento y comparar capturas.
- Nada de halos ni brillos difusos: luz con motas nítidas, rayos finos, sin tapar a los gigantes.
- Clips: superficies continuas y ricas como el cuásar (`js/escena/tejidoLuz.js`), nunca nubes de puntos; cada cambio con causa visible.
- Todo debe verse bien en el móvil (referencia 430×932, vertical) además del PC.
- Videoclips: cámara lenta, suave, centrada en el móvil y siempre en un solo sentido; cada clip cuenta lo que hace
  físicamente el objeto siguiendo la canción.
- Nunca imprimir letras de canciones (docs, commits, salidas, prompts a agentes): solo tiempos y 2–3 palabras clave.
- No bajar la calidad de la música (AAC 128 kbps estéreo, −16 LUFS).
- No tocar `galaxia-xiomara-movil.service` (puerto 3000), ni ufw, ni la red. Servidores de prueba en otro puerto.
- Nunca push (= publicar) sin que Carlos lo pida. Commits en español, pequeños, estilo del repo.
- Comentarios del código en español, densos, como el código vecino.

## Trampas que pueden romper producción

- **Horno**: la clave de cada cálculo horneado es `nombre#huella(código fuente de la función)` (`js/util/horno.js:48`).
  Cambiar ese código invalida la clave en silencio y el iPhone recalcula en la carga (~20 s). Tras tocarlo:
  `node scripts/hornear-calculos.mjs`. Nada de `Math.random` en esos cálculos. Las texturas, igual por sus opciones.
- **Service worker**: los móviles guardan una copia de todo; una versión nueva espera a la próxima visita o a
  «Actualizar» (nunca recarga sola). Al verificar un arreglo en un teléfono, comprobar que no es la copia vieja. No
  editar `sw.js` a mano. Solo en HTTPS (`?sw=1` en localhost).
- **Presupuesto de descarga antes del toque**: ≤ 5 MB móvil, ≤ 7 MB PC (`tests/navegador/redCarga.mjs:7`), y ya va
  justo. Lo nuevo va a la cola de reposo; cada archivo se pide una sola vez; cero descargas en vuelos, clips y gestos.
- **Nada se estrena en la GPU** durante vuelos, clips o gestos (compilaciones, texturas, búferes): es un tirón en el
  móvil. Cambiar el número de luces recompila programas.
- **Un solo reloj**: todo lo sincronizado con música lee `js/util/relojMaestro.js`; nunca `audio.currentTime` ni
  `playbackRate`.

## Comandos habituales

```bash
npm test                                                     # unitarias (node --test tests/*.test.js)
npm run check                                                # sintaxis y recursos (hoy roto: docs/ESTADO.md)
flock /tmp/claude-1000/gpu.lock node tests/navegador/ejecutar.mjs <caso…>   # navegador real; SIEMPRE con flock (GPU compartida)
npm run build:pages                                          # dist/ local, no publica
```

- Arnés de navegador: `tests/navegador/arnes.mjs`; `playwright-core` se busca en `node_modules`, `PLAYWRIGHT_CORE` o
  `.pruebas/pw/node_modules` (`.pruebas/` está en `.gitignore`; capturas en `.pruebas/capturas/`).
- `recorrido` y `capturasRendimiento` duran ~media hora: solo si se piden por su nombre.
- Medidor en la página: `?fps` (y `#debug`, `?diag`, `?hud`). Sin bucles `until ! pgrep -f …`: esperar con `timeout`.

## Documentación (`docs/`, leer con grep, por rangos)

- `docs/ESTADO.md` — estado actual y changelog por fechas y temas (lo nuevo arriba).
- `docs/gotchas/rendimiento-gpu.md` — perfil único, estrenos en la GPU, sombreadores, memoria del iPhone, cómo medir.
- `docs/gotchas/audio-reloj.md` — reloj maestro, desbloqueo de audio en iOS/Safari, calidad de la música.
- `docs/gotchas/carga-descargas.md` — presupuesto antes del toque, cola de descargas, horneado y su huella.
- `docs/gotchas/videoclips-camara.md` — qué cuenta cada clip, director de cámara y su suavidad, qué se ve junto a los gigantes.
- `docs/gotchas/service-worker-publicacion.md` — Pages, `preparar-pages.mjs`, service worker, servidor local.
- `docs/ESCALA-Y-ESPACIO.md` — especificación vigente de escala, regiones, niveles de detalle y viajes (la cita el código).
- `docs/PROMPT-ULTRA-FLUIDO.md` — encargo «ultra fluido»: causas de tirones y criterios de aceptación (los citan las pruebas).
- `docs/rendimiento-resumen.md` — resultados antes/después de ultra fluido y lo que aún no cumple.
- `docs/rendimiento-antes.json`, `docs/rendimiento-despues.json`, `docs/capturas-rendimiento/` — datos y capturas de esas medidas.
- `docs/PROMPT-QUITAR-VOZ.md` — plan para sacar las instrumentales de las estancias (lo citan los scripts de audio).
- `docs/archive/` — registros históricos de la rama `feature/universo-vivo` (17–19 oct.): revisión, auditoría, encargos viejos.
- `LEEME.md` — guía para personas (verlo, contenido sin código, móvil en la Wi-Fi). Parte de su texto está desactualizado.
