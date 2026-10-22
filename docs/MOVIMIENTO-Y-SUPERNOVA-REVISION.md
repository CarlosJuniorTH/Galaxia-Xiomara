# Movimiento y supernova · revisión del 19 de octubre de 2026

> Registro histórico. La especificación vigente de escala, espacio, niveles de detalle y viajes está en [ESCALA-Y-ESPACIO.md](ESCALA-Y-ESPACIO.md).

Rama `feature/universo-vivo`. Cambios locales, sin fusionar ni publicar. Se conservan el fondo, las nebulosas y las galaxias aprobadas.

## Movimiento

- `js/escena/velocidad.js`: un lote de cintas instanciadas, 260 en móvil y 380 en PC. Grosor y bordes suaves en píxeles CSS; sin desenfoque, aberración de pantalla ni velo blanco.
- El avance produce flujo radial sostenido durante el trayecto; los giros producen flujo lateral según el cambio real de orientación de la cámara. El pellizco/rueda activa avance o retroceso. Al parar, la respuesta decae suavemente.
- `js/util/impulsoVisual.js` mantiene separados vuelo, giro y zoom. El giro automático lento no activa estelas. Se respeta movimiento reducido, lectura, pausa y ceremonia.
- La sensación de velocidad en un giro es una elección cinematográfica. No se atribuye una velocidad física de traslación a la rotación de la cámara.
- El compositor ya no genera los dos fogonazos blancos de salida/llegada. Las transiciones solares impulsan el campo de luces, no iluminan la pantalla. El estallido de la estrella conserva su luz propia.
- Cámara adjunta a la escena tanto en la galaxia como en el sistema solar, para que las cintas se dibujen en ambas escenas.

## Supernova

- Se retiran los dos lóbulos esféricos amarillos y la falda circular de la progenitora. La estrella tiene superficie cálida granular, relieve suave, prominencias de plasma irregulares ancladas a la superficie y actividad creciente antes de contraerse.
- Se conserva la coreografía de contracción, frente ecuatorial, segundo frente retrasado, expansión esférica y transformación en corazón. La visita previa encuadra más cerca la estrella sin agrandar artificialmente sus destellos.
- `puntoCorazonVolumen` produce secciones que se estrechan hacia las caras anterior y posterior. Profundidad de hasta unos 760 puntos de diseño por lado, deformaciones distintas en tres ejes y filamentos curvados a varias latitudes.
- El gas usa un campo implícito de corazón tridimensional, con turbulencia y muestreo de color en tres planos. La máscara de corazón ya no repite una silueta XY a lo largo de Z. Las nebulosas que no son el corazón mantienen su tratamiento anterior.
- El universo vuelve a mostrarse tras la breve penumbra. Se conservan la postal, la repetición, el recuerdo persistente y la opción de aislar el corazón. Se puede girar alrededor del remanente y la respuesta al gesto se mantiene al terminar la ceremonia.

## Verificación

Pruebas automatizadas en `tests/impulso-visual.test.js`, `tests/supernova-amor.test.js` y el resto del conjunto: respuesta a giro rápido/lento, sentido del giro, parada, impulso sostenido de vuelo, movimiento reducido, zoom, secciones del corazón en profundidad, integridad geométrica, repetición y persistencia.

Las pruebas visuales de escritorio y de viewport vertical usan la GPU del equipo. No equivalen a una prueba térmica o de rendimiento en un teléfono físico. La escala de los objetos y las distancias sigue siendo artística, con posiciones fijas y perspectiva continua.

Resultado local: 65 pruebas JS y 4 de servidor superadas; `check` valida 79 módulos y recursos; compilación de Pages con 119 recursos, sin publicación. En navegador se comprobaron giro rápido en escritorio y en 430×820, vuelo sostenido al 65% del trayecto, aproximación, repetición del estallido, progenitora sin lóbulos y remanente observado desde varias orientaciones. Sin nuevos errores de consola tras las reparaciones de desarrollo.

Evidencia: `.pruebas/giro-rapido-estelas-movil.jpg`, `.pruebas/viaje-continuo-movil.jpg` y `.pruebas/supernova-volumen-movil.jpg`.
