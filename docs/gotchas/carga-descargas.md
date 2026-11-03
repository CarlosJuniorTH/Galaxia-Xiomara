# Trampas: carga y descargas

## Presupuesto antes del toque
- Límite: ≤ 5 MB móvil, ≤ 7 MB PC por la red con gzip (`tests/navegador/redCarga.mjs:7`, comprobación en `:46`).
  Ya se pasa un poco (5,85 / 8,2 MB, `docs/rendimiento-resumen.md`, «Lo que queda»): cualquier archivo nuevo en la carga
  empeora esto. Lo nuevo va a la cola de reposo salvo que haga falta para el clip de la intro.
- El clip de la intro no empieza hasta tener TODO lo de la carga (`tests/navegador/introCarga.mjs:49`, «X de X MB»).
- Cada archivo se pide UNA sola vez (redCarga). three.js por el mapa de importación al minificado (`index.html:31`): si
  algo importa `three.module.js` legible se descarga dos veces (pasó con el obrero de la telaraña).

## Cola de descargas
- `js/util/descargas.js:1`: `descargarAhora` (lo pedido por quien mira), `enReposo` (de uno en uno, en momentos libres),
  `ocupado(motivo)` (carga, clip, vuelo, gesto: la cola no empieza nada) y `cuandoLibre` (decodificar/subir a la GPU).
- Cero descargas durante vuelos, clips y gestos. La rueda del ratón también ocupa la cola (9588f70).
- La lista de reposo sale de `paquetes.json` (lo escribe `scripts/preparar-pages.mjs:27`; `scripts/servir.py` lo sirve
  al vuelo). Excluye audios de prueba y escucha a ciegas (`js/util/precarga.js:13`).

## Horneado (clave = huella del código)
- `horneado(nombre, calcular, codigo)` busca `nombre#huella(String(codigo))` en `assets/horno/paquete.bin.gz`
  (`js/util/horno.js:48`). **Cambiar el código de una función de cálculo horneada cambia su clave**: deja de encontrarse y
  el teléfono lo calcula en la carga (~20 s en un iPhone, JS sin compilador). Tras tocar uno de esos cálculos, volver a
  hornear: `node scripts/hornear-calculos.mjs`. En diagnóstico, `window.__hornoCalculados` lista lo que no venía horneado.
- Los cálculos horneados no pueden usar `Math.random` (saltárselos cambiaría la secuencia de la semilla, `horno.js:47`).
- Texturas procedurales horneadas por huella de tipo+opciones (`js/escena/huellaTextura.js:1`,
  `scripts/hornear-texturas.mjs`); cambiar opciones exige re-hornear o se generan en el teléfono.
- Si el servidor entrega el `.gz` ya descomprimido, se usa tal cual (`js/util/horno.js:29`). Espera máxima 10 s.
- El tamaño del paquete va al índice de texturas: la barra conoce el total desde el principio.

## Robustez en el iPhone
- Obreros de texturas: si no avisan en 5 s se descartan y se calcula en el hilo principal (7529369); red de seguridad de
  45 s por obrero (9c10769). La carga nunca se cuelga por una textura (9021350).
- Texturas tardías: no bloquean la carga, se suben en momentos libres (af62efd).
