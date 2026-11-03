# Trampas: rendimiento y GPU

Regla: 60 FPS en móvil de gama media con el MISMO contenido que en PC. Sin selector de calidad, sin resolución dinámica,
sin escalones ni paso a 30 FPS (todo eso se quitó en 18cafba: cada cambio de modo era un tirón). Medir antes y después.

## Perfil único
- Resolución interna por **presupuesto de píxeles**, no por DPR: ≈ 1,65 Mpx móvil, ≈ 3,5 Mpx PC (`js/escena/nucleo.js:35`).
  Con 1,3 Mpx el móvil salía blando en las capturas (5772d3e). Girar el móvil recalcula el mismo presupuesto: no es un
  cambio de calidad (`js/escena/nucleo.js:187`).
- Dentro del universo nunca se duerme: `esperaMs: Infinity` (`js/escena/index.js:404`). `tests/consumo.test.js` prueba
  el planificador con `esperaMs: 15000`, no la configuración real.
- Pasada final única: lente + salto + resplandor + reescalado con enfoque (0b56c6a). La salida limpia NaN/negativos
  (`tests/render-movil.test.js`).

## Nada nuevo durante vuelos, clips y gestos
- Cero compilaciones, texturas, subidas, `bufferData` o renderbuffers en vuelo/clip/gesto: cada uno es un tirón en el
  móvil. Se vigila con `js/util/estrenos.js` (`#debug`, `?diag`, `?fps`, `?hud`).
- Todo se estrena en la carga: `js/escena/carga/preparacion.js:1` (calentamiento a tamaño real en cada pose de llegada).
- Cambiar el **número de luces** recompila los programas de three.js (ce8a998: 14 recompilaciones al llegar). No añadir
  ni quitar luces en caliente.
- Geometría de pool/reserva para estrellas de galaxias y campo cercano de la telaraña (b7781cf, ce5e9d2). Lo pesado se
  genera a trozos de ≈ 1,5 ms por cuadro (bf8ac68, a253510).
- Sin memoria nueva por cuadro (vectores y listas reutilizados): d1d4dc3, f2ababb.
- Subidas grandes a la GPU por franjas y solo en momentos libres (`cuandoLibre`, 56b9cd6).

## Sombreadores
- Nada de `fract(sin(x)·43758)` como azar: cada GPU redondea distinto y salen bloques de bordes rectos (a2850d1).
- Puntos sin `discard` (más rápido en GPU de teselas, e0e9aed) y fragmento en `mediump` (6c14759).
- iPhone: HDR también con búferes de media precisión; sin ello cae a 8 bits y satura en blanco (f640525).

## Imagen (reglas de Carlos)
- Nada de halos ni brillos difusos: luz con motas nítidas, rayos de 1 px, sin tapar a los gigantes (bdb9435, 4b5d774).
- Interfaz sin `backdrop-filter` sobre el 3D en movimiento (62bfe63): en iOS desenfoca la galaxia entera cada cuadro.

## Memoria del iPhone
- iOS cierra y recarga la página si la memoria se dispara (edc85c8): pico de carga a la mitad, paquete horneado se
  suelta al terminar (`js/util/horno.js:44`), copias de texturas liberadas tras subirlas.

## Medir
- Medidor `?fps` (`js/util/medidorFps.js`). Recorrido completo `tests/navegador/recorrido.mjs` (media hora, solo a
  petición) y capturas en poses fijas `capturasRendimiento.mjs` + `scripts/comparar-capturas.py`.
- Criterios de aceptación: `docs/PROMPT-ULTRA-FLUIDO.md` («Medición y criterios», punto 4). Resultados y lo que no
  cumple del todo: `docs/rendimiento-resumen.md` (grep «Lo que queda»).
- La máquina de pruebas se comparte: `recorrido` guarda su carga media (7c30b00); con la máquina saturada, repetir.
