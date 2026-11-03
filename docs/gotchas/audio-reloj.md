# Trampas: audio y reloj maestro

## Un solo reloj
- Todo lo que se mueve con música (intro, viajes, supernova, escenas de los gigantes) lee `relojMaestro`
  (`js/util/relojMaestro.js:1`): sale del AudioContext con la latencia de salida compensada; sin audio, de
  `performance.now()`. Nunca va hacia atrás; con el contexto suspendido se queda quieto.
- Prohibido volver a seguir `audio.currentTime`, `playbackRate`, saltos o sondeo para "acompasar": era la causa de
  congelaciones de 3 s y cortes (`docs/PROMPT-ULTRA-FLUIDO.md`, causas A1–A3).
- Canciones con marcas = `AudioBufferSourceNode` con un ANCLA en el reloj (`js/ui/bandaSonora.js:10`). La de los viajes
  se ancla en (llegada − duración): acaba justo al aterrizar. Las estancias siguen siendo `<audio>` + MediaElementSource.

## iOS / Safari
- Antes del toque el contexto existe (para decodificar en la carga) pero sigue parado; `pageshow` no lo reanuda (ccbf3b9).
- En el toque: `desbloquear()` solo reanuda el contexto con una muestra de silencio (`js/ui/bandaSonora.js:420`). Nunca
  17 `play()` a la vez (causa A4). Las estancias `<audio>` se desbloquean en ese toque; un `<audio>` no tocado en un gesto
  no suena nunca en iOS (`js/ui/bandaSonora.js:424`).
- iOS deja el contexto «interrumpido» (llamada, Siri, otra app) y `resume()` fuera de un toque no hace nada: se reintenta
  y, si no, en el siguiente toque (`js/ui/bandaSonora.js:333`, `:370`).
- Un `ended` tardío ya no manda al reposo (cce9b7b: el viaje al sistema solar se quedaba sin canción).
- Al ocultar la página: bajar 0,1 s antes de suspender (sin chasquido, 58b6eeb).
- En memoria solo las canciones que hacen falta; el resto se libera (iOS).

## Calidad de la música (no bajarla)
- Fragmentos: AAC 128 kbps estéreo 44,1 kHz, −16 LUFS (`scripts/preparar-audio.mjs:3`). Estancias, 128 kbps
  (`scripts/preparar-estancias.py:56`), instrumental separada con BS-RoFormer (`docs/PROMPT-QUITAR-VOZ.md`).
- Duraciones y bytes en `assets/musica/indice.json` (los mide ffprobe; el AAC añade relleno de milisegundos).

## Letras
- Nunca imprimir letras de canciones (ni en docs, commits, prompts a agentes ni salidas): solo tiempos y 2–3 palabras
  clave. Las marcas van en `js/data/bandaSonora.js` y `js/data/introMaps.js`.
