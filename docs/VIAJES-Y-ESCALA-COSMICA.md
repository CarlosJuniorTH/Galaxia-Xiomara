# Viajes, continuidad y profundidad · 19 de octubre de 2026

> Registro histórico. La especificación vigente de escala, espacio, niveles de detalle y viajes está en [ESCALA-Y-ESPACIO.md](ESCALA-Y-ESPACIO.md).

> La revisión posterior de movimiento y progenitora está en [MOVIMIENTO-Y-SUPERNOVA-REVISION.md](MOVIMIENTO-Y-SUPERNOVA-REVISION.md). El destello blanco de viaje descrito en este registro se sustituyó por estelas continuas que responden al gesto.

Se conserva `feature/universo-vivo`, sin fusionar ni publicar y manteniendo la supernova de amor.

## Cambios

- Viaje sin onda, aberración de pantalla, tinte Doppler ni desenfoque. Destellos ópticos puntuales al acelerar y aproximarse, sin ocultar el universo. Las estelas conservan trazos definidos más largos; el polvo cercano tiene menos grosor y no genera posiciones de pantalla inválidas al quedar detrás de la cámara. El modo de movimiento reducido desactiva las estelas del viaje.
- Aproximación con un perfil logarítmico de distancia: reserva tiempo para que el destino crezca y deja de concentrar toda la llegada en los últimos cuadros. Se llega al punto exacto de la curva; antes se cortaba al 99,99%, un error considerable en vuelos largos.
- Se elimina la imagen alternativa de la galaxia de Xiomara y su agrandamiento dependiente de la distancia. Se dibuja la misma estructura 3D desde lejos y desde cerca.
- Objetos visitables con coordenadas fijas. Los agujeros, el púlsar y la supernova dejan de acompañar a la cámara o de recogerse en el regreso. El fondo estelar muy lejano sigue siendo una aproximación óptica; las nebulosas volumétricas tienen posición fija.
- Supernova a 3.600.000 unidades de diseño del origen; remanente de radio de referencia 120.000. Es una escala de fantasía deliberada para leer el corazón desde casa (diámetro angular de unos 3,8°) y verlo inmenso al llegar; no equivale a las proporciones físicas de un remanente respecto de una galaxia. Se elimina por completo el campo local de 1.100 estrellas añadido en la primera versión. La cámara y el tamaño de sus puntos se ajustan a la nueva escala.
- Nebulosas con integración de densidad 3D, atlas precalculado, absorción y filamentos. Geometría con volumen, no varias tarjetas que giran para mirar a la cámara. 16 pasos por rayo en móvil y 24 en PC; atlas de 32³ muestras compartido por semilla. La supernova reutiliza el volumen con una máscara de corazón.
- Sagitario A*: anillo con espesor, orientación física estable y flujo de acreción animado. TON 618: nuevo flujo de materia sumado al disco y los chorros ya existentes. El movimiento lo aportan gas, estrellas orbitales y chorros; no se traslada arbitrariamente el centro para aparentar actividad.
- Halo del púlsar reducido para dejar ver el gas y los haces. Plano cercano de cámara adaptado a la distancia para mejorar la precisión de profundidad en objetos lejanos.

## Qué significa la escala

Es una representación romántica con distancias y tamaños comprimidos, no una simulación astronómica en metros o años luz. La perspectiva obedece a coordenadas constantes y los objetos no se agrandan para seguir siendo visibles desde cualquier lugar. Un objeto muy lejano puede resultar diminuto. Las animaciones están ralentizadas para poder observarlas y los desplazamientos de la cámara condensan distancias enormes en segundos.

El movimiento de discos, gas y órbitas es coherente con la descripción física general de un agujero negro: [NASA, Anatomy](https://science.nasa.gov/universe/black-holes/anatomy/). Sagitario A* es el objeto del centro de la Vía Láctea, no el centro de la galaxia ficticia de Xiomara: [ESO](https://www.eso.org/public/science/EHT-MilkyWay/).

## Validación

Pruebas de continuidad, extremos de llegada, duración, reanudación, densidad tridimensional, transformación de cámara y escala en `tests/viajes-cosmos.test.js`. Las pruebas en viewport móvil usan la GPU de escritorio y no certifican temperatura ni velocidad en un teléfono real.

Resultado: 60 pruebas JS y 4 del servidor pasan; `check` verifica 77 archivos JS; empaquetado local con 117 recursos. En Chromium del equipo: visita al púlsar, Sagitario A*, cuásar, TON 618 y supernova; regreso desde cuásar y TON 618; cambio de destino durante el vuelo; composición vertical 430×820; sin nuevos errores observados tras reparar el conflicto inicial de nombre con `util/viaje.js` (el módulo original de guardado se conserva, el perfil vive en `util/aproximacion.js`). El indicador registró 60 FPS en visitas de PC a DPR interno 1,5; ese dato no mide energía ni anticipa resultados de un teléfono.

La presentación del vuelo deja solo una indicación del destino, progreso y cambio de rumbo; los paneles grandes reaparecen al llegar. Captura del regreso: `.pruebas/viaje-limpio-regreso.jpg`.


## Revisión del destello y del estallido

- El paso de viaje vuelve a emitir luz al acelerar y llegar: foco blanco azulado con rayo fino. No hay deformación, onda de pantalla ni lectura de píxeles desplazados. Se respeta movimiento reducido. El cambio entre sistema solar y galaxia recupera un destello de entrada/salida.
- El estallido tiene contracción de superficie, elongación, frente ecuatorial 3D, segundo frente retrasado 1,35 s y envolvente esférica. Después la materia forma el corazón; los frentes transitorios desaparecen. Es coreografía cinematográfica, no evolución astrofísica literal. Inspiración del cascarón: [NASA, animación de supernova](https://science.nasa.gov/asset/hubble/supernova-explosion-animation/).
- El universo ya no se oculta automáticamente durante toda la visita. La penumbra periférica de la ceremonia decae hasta cero a los 12 segundos del estallido. Al acabar se puede elegir «Ver solo el corazón» / «Ver con el universo» para contemplar y guardar la postal. Salir restaura el entorno.
- Partículas subpíxel compensadas por área: se evita acumular miles de puntos obligatorios de un píxel en un cuadrado brillante a distancia. Se reduce el titileo del recuerdo y se suprimen los detalles del agujero central cuando no son resolubles.
- La densidad de nebulosas conserva las texturas de color anteriores y añade nudos deformados, columnas, cavidades y absorción de polvo. El corazón sustituye las manchas radiales por una textura de filamentos con ruido coherente. Morfología inspirada en [la visualización 3D Hubble/Webb de NASA](https://science.nasa.gov/missions/hubble/new-hubble-webb-pillars-of-creation-visualization/), sin afirmar que sean reconstrucciones de datos observacionales.
- Las pruebas de supernova verifican expansión de ambos frentes, retraso y retirada, además de repetición y persistencia. La temperatura y el resultado final en iPhone/Android requieren prueba física; no se infieren de emulación de viewport.

Evidencia de esta revisión: `.pruebas/destello-viaje-revisado.jpg` muestra el pulso de aceleración al 16% del trayecto, sin deformación lateral. `.pruebas/supernova-entorno-movil-revisada.jpg` muestra el corazón con el cielo restaurado en 430×820. Se probaron repetición y cambio de composición aislada/con entorno en el navegador. Se mantienen 60 pruebas JS, 4 de servidor, comprobación de 77 módulos y empaquetado de 117 recursos; no se ha publicado. Los detalles pequeños del nombre, símbolos y mundos también compensan el área subpíxel. El titileo estelar de la galaxia decae a distancia para no hacer parpadear su luz integrada.
