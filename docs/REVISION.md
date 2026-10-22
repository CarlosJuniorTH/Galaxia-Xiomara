# Revisión de la rama universo-vivo

Fecha de trabajo: 17 de octubre de 2026. Trabajo local, sin despliegue ni fusión con main.

## Diseño y alcance

Se conservan galaxia, agujero negro, corazón, nombre de partículas, estrellas y la paleta rosa/lila originales. La interfaz incorpora un mapa, una barra de exploración y paneles de lectura con el cielo visible detrás. Los lugares nuevos usan geometría, materiales y texturas procedurales de Three.js; no son fondos planos.

Ocho lugares y un cometa: hogar, planeta rosa, constelaciones, correo lunar, jardín, cápsulas, planeta azul y refugio. Tres constelaciones seleccionables: corazón, estrella e infinito. El recorrido visita todos los lugares y permite volver al control manual. Las frases de la galaxia aparecen por turnos.

Las cartas, deseos y cápsulas nuevas son propuestas editoriales, pendientes de que Carlos las ajuste a su voz. No se han creado fotografías, grabaciones ni recuerdos reales inventados. El aporte de Xiomara y la sincronización entre dispositivos quedan para una fase posterior, como pidió Carlos.

## Comprobaciones automáticas

- `npm test`: 14 pruebas de fechas, cambios de mes en Argentina, horario estacional de Madrid, cápsulas, identidad estable de estrellas, crecimiento más allá de 25 meses, guardado, corrupción, importación, reinicio y recuperación; validación del contenido editorial.
- `npm run check`: sintaxis de 40 archivos propios JavaScript; destinos de importaciones relativas, CSS, fuentes e imágenes locales.
- `git diff --check`: sin errores de espacios.
- Dependencias fijadas mediante package-lock (instalación comprobada sin avisos de vulnerabilidades conocidos por npm en esta ejecución); copias locales y licencias de Three.js, es-module-shims y las fuentes.

## Validación manual en navegador

Navegador Chromium integrado de Codex. La sesión no tiene Google Chrome conectado; se entrega una dirección local compatible para abrir en Chrome, sin afirmar que se haya controlado ese navegador.

Se comprueban entrada, vuelo a planeta, apertura de recuerdos, álbum, persistencia tras recargar, cartas, fechas futuras bloqueadas y generación de una postal con la escena real. La búsqueda completa se recorre con pistas y toques reales sobre las estrellas.

La búsqueda de las once estrellas se ha completado con toques reales, incluidas recargas intermedias para confirmar el guardado. Al cerrar el último recuerdo se realiza el viaje y aparece la carta del mes 10. Durante la revisión móvil se detectó que el sello animado tapaba el botón de cierre de la celebración; se elevó la capa del botón para evitar esa intercepción.

## Límites y siguientes decisiones

- WebGL es necesario. La recuperación evita recargas automáticas repetidas y conserva los descubrimientos. No puede garantizar la disponibilidad del hardware, controladores ni navegadores de terceros.
- No se ha probado en un teléfono físico, Safari, Android ni el Chrome personal del usuario.
- Las cápsulas son una sorpresa de interfaz: el contenido está en archivos públicos y se usa el reloj del dispositivo. No hay cifrado ni verificación de fecha desde servidor.
- El progreso local puede perderse si se borran datos del navegador. Hay exportación/importación de copias y copia del viaje anterior al reiniciar; no hay cuenta ni sincronización automática.
- El taller guarda borradores en el navegador y exporta JSON. Para incorporar contenido al proyecto se sustituye assets/contenido.json; no hay un servidor de administración.
- Recursos locales no equivale a un service worker: no se promete instalación sin conexión.

## Pasada final

- Diseño revisado en 390 × 844 y escritorio; portada orbital local, paneles, álbum, jardín, constelación y recorrido legibles en la vista estrecha.
- Cierre de celebración corregido y probado; repetición desde el álbum y salto directo a la carta comprobados.
- Reinicio confirmado en la interfaz y recuperación posterior de los once recuerdos comprobados.
- Exportación real de copia de viaje y archivo de contenido descargados y validados con el código de lectura.
- Taller: nombre de prueba mostrado solo en `#borrador`, y restaurado después a Xiomara; once meses presentes en el formulario.
- Jardín: sueño marcado y devuelto a pendiente. Horarios, refugio y salida, sorpresa del cometa comprobados.
- Recorrido: avance automático observado, pausa probada y navegación rápida por sus nueve pasos hasta terminar sin dejar la cámara bloqueada.
- Se observó una entrada de consola sobre MutationObserver sin archivo de origen durante las interacciones de prueba. No procede de una llamada en los módulos propios; no se atribuye con certeza a la aplicación ni se afirma ausencia total de errores del entorno. La comprobación final se hace también en una pestaña nueva.

Los archivos descargados de prueba están en Descargas (`contenido.json` y `nuestro-viaje-2026-10-17.json`). El progreso de prueba se mantiene en localhost; la presentación limpia usa 127.0.0.1, con un origen distinto.

La pestaña final limpia (127.0.0.1, sin #debug) se abrió y entró correctamente en escritorio: 0 de 11 descubrimientos, sin avisos ni errores de consola en esa comprobación. Las 14 pruebas y la comprobación de sintaxis/recursos han pasado después de los últimos cambios.

## Prueba desde Chrome y móvil (17 de octubre)

La vista temporal previa se había detenido. Se añadió `scripts/servir.py`, con modo local y modo Wi-Fi, para servir únicamente los archivos de la aplicación. Se han verificado respuestas 200 en loopback y en la IP Wi-Fi actual (192.168.1.34); Git, configuración del proyecto y listados de carpetas responden 404. Dos pruebas de integración verifican recursos y denegaciones, tanto GET como HEAD. No se han modificado cortafuegos ni router.

El servidor de revisión se inicia en segundo plano; PID y log están en `.pruebas/servidor-wifi.pid` y `.pruebas/servidor-wifi.log`. No es un servicio de arranque automático ni alojamiento permanente.

`npm run build:pages` genera una carpeta `dist/` lista para un sitio estático bajo un subdirectorio de repositorio; manifiesto con scope/id relativos y `.nojekyll`. El taller se mantiene local y no se incluye en ese paquete. No hay remoto Git configurado, no se ha publicado y no se han fusionado ramas.

Chrome no está disponible en el inventario de navegadores de esta sesión. No se afirma haberlo abierto ni haber probado el teléfono físico; se entregan direcciones para abrir directamente en esos dispositivos. La pestaña que mostraba el error de conexión fue bloqueada por el control del navegador al intentar observarla; no se ha eludido ese bloqueo.

## Diagnóstico de arranque en Chrome (17 de octubre)

El aviso anterior atribuía cualquier fallo del bloque de arranque a la aceleración gráfica. Ahora muestra el error real y permite probar renderizado 3D directo, sin brillo HDR, con `?calidad=compatible`. La creación del contexto prueba WebGL 2 y WebGL 1 con opciones alternativas. El navegador de pruebas inició ambos perfiles con WebGL 2: normal con HDR y compatible con renderizado directo, sin avisos en la consola durante la comprobación.

El diagnóstico recibido del Chrome personal (154, Linux) rechazó los seis intentos de contexto: ANGLE/Mesa llvmpipe, `BindToCurrentSequence failed`. El sistema usa NVIDIA 615.78.08 para la RTX 5070; Flatpak solo tenía la extensión gráfica 615.71.09. Se instaló desde Flathub `org.freedesktop.Platform.GL.nvidia-615-78-08//1.4` y se verificó que una nueva instancia del entorno de Chrome monta esa extensión. Falta cerrar y reabrir el Chrome personal para verificar el resultado real; no se han cerrado sus ventanas automáticamente ni modificado flags o permisos.

## Optimización conservando el detalle (17 de octubre)

- Mismos puntos, resolución del cielo, cinco niveles HDR, fuerza y radio del brillo. No hay reducción automática de la resolución durante el recorrido.
- El filtro vertical agrupa pares de texeles contiguos mediante interpolación lineal y los mismos pesos gaussianos. Pasa de 5/9/13/17/21 lecturas a 3/5/7/9/11 por píxel según el nivel. El horizontal mantiene el filtro original porque su entrada cambia de resolución entre niveles; agruparlo de la misma forma alteraría el resultado.
- Se eliminan las once superficies de profundidad del brillo, innecesarias para sus pasadas de pantalla completa. Se conserva la profundidad de la escena principal.
- Los halos y destellos idénticos comparten texturas. El lienzo de efectos deja de solicitar fotogramas cuando está vacío y se pausa cuando el documento está oculto. Los movimientos de los efectos usan tiempo transcurrido para no acelerarse en pantallas de alta frecuencia.
- Cinco pruebas numéricas contrastan el desenfoque original y el agrupado, incluidos bordes y luces HDR. Otra prueba contrasta formatos, tamaños y parámetros de los cinco niveles al cambiar orientación y tamaño. Total: 25 pruebas JavaScript; cuatro de servidor; sintaxis y recursos locales comprobados.
- Vista estrecha de 390 × 844 revisada en el navegador integrado, renderizado HDR eficiente sin avisos de consola en la comprobación. Entrada y navegación del recorrido comprobadas. Captura: `.pruebas/movil-optimizado.jpg`.

No se ha medido una mejora de FPS en el teléfono físico: las métricas del navegador integrado usan la GPU del ordenador, aunque el viewport sea estrecho. El ahorro demostrado corresponde a lecturas del filtro, búferes y trabajo en reposo; no es una promesa de un porcentaje de FPS. En `#debug` el canvas expone FPS reales, coste CPU y número de texturas para futuras mediciones comparables. El paquete `dist/` se regenera localmente; no se publica ni se fusionan ramas.

## Corrección del aspecto al acercar en móvil

La optimización anterior no corregía el tamaño de las partículas ni el recorte de la cámara. El límite de 56 píxeles del shader podía dibujar discos grandes al acercarse; los multiplicadores móviles agrandaban además corazones y recuerdos. Ahora los puntos se limitan en píxeles CSS (6 para estrellas, límites específicos para polvo y corazones), independientemente del DPR, y se desvanecen junto a la cámara. Los recuerdos conservan su zona de toque ampliada con un límite visual de 26 px, 38 px al señalar una pista. El zoom mínimo pasa de 90 a 300 unidades para no atravesar el núcleo.

Se quitan los multiplicadores de tamaño móviles del corazón, los corazones pequeños, las estrellas de recuerdos y el nombre. La densidad sigue intacta. El perfil alto admite el DPR nativo hasta 3 para evitar reescalar un render 2× en teléfonos 3×; esto puede aumentar el coste GPU en esos dispositivos. La cámara inicial calcula la distancia según el aspecto para conservar la anchura visible del escritorio; no recorta automáticamente los brazos al usar orientación vertical.

Se corrigen cuatro llamadas de `smoothstep` con límites invertidos en los shaders de puntos, nombre y estrellas. La [especificación GLSL de Khronos](https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.1.50.pdf) declara indefinido ese caso; se usa `1 - smoothstep` con límites ascendentes. Es una corrección de portabilidad; no se afirma haber identificado qué cálculo ejecutó la GPU física del teléfono.

Se añaden pruebas de encuadre horizontal equivalente, tamaño proyectado de los recuerdos y regresión de los límites constantes de smoothstep. Revisión visual a 390 × 844 con acercamiento real mediante rueda, sin errores de consola observados. Capturas locales: `.pruebas/movil-encuadre-corregido.jpg` y `.pruebas/movil-zoom-corregido.jpg`. Sigue pendiente la validación en el móvil físico y conocer su modelo/navegador. No se fusionan ramas ni se publica.

## Pasada del recorrido, constelaciones y cartas en móvil

Se revisaron las llegadas de los nueve pasos a 390 × 844: galaxia, planeta rosa, constelación, correo lunar, jardín, cápsulas, planeta azul, refugio y cometa. Se comprobó pausa, siguiente, anterior y salida final. Capturas por destino: `.pruebas/recorrido-movil-02.jpg` a `09.jpg`.

Correcciones:

- Encuadre vertical de los destinos elevado para dejar la figura por encima de la tarjeta; constelación un 25 % más cercana. Las distancias de escritorio se conservan.
- Sobres lunares con textura cuadrada propia: el icono antes ocupaba una fracción de una textura de texto muy ancha y apenas se distinguía.
- Las figuras de constelación miran a la cámara; antes podían quedar de canto al orbitar y el infinito perdía su forma. Zona táctil de 44 px para los nodos, independiente del tamaño del destello.
- La acción de explorar queda desactivada durante la llegada, evitando que un toque anticipado termine el recorrido sin abrir el destino. La barra de progreso usa transform y deja de actualizarse fuera del recorrido.
- Panel de altura flexible: el texto desplazable ocupa el espacio real que deja la cabecera. Controles de al menos 44 px en móvil, tarjeta desplazable en pantallas cortas y disposición lateral en horizontal. Los avisos del recorrido se alejan de los botones.
- Cierres de lectura y carta original permanecen visibles al desplazar el texto en móvil. El render 3D de fondo se pausa mientras está abierto un panel o carta en móvil y continúa al cerrarlo, sin saltar el tiempo de animación. El PC conserva el fondo animado.

Se abrieron las cuatro cartas nuevas, sin desbordamiento horizontal, y se completó y desplazó la carta original a 360 × 740. Se verificó el estado de dibujo `lectura` al abrir y `activo` al cerrar. Se completaron las tres figuras mediante el tejido automático y se observó la actualización de su estado en el selector. Captura de lectura: `.pruebas/carta-movil-revisada.jpg`.

La comprobación manual de un nodo del infinito, tocando junto al destello, avanzó a «1 luz unida». La versión final del infinito se revisó de frente, manteniendo su figura al orbitar. En horizontal (844 × 390) se confirmó el cierre visible tras desplazar una carta y el planeta rosa a la izquierda de la tarjeta, sin solapamiento de marca y título. Captura: `.pruebas/recorrido-horizontal-revisado.jpg`. Las 28 pruebas JavaScript y las cuatro de servidor pasan; paquete local regenerado y recursos/sintaxis comprobados.

Contraste final de escritorio a 1280 × 720: planeta rosa completo con la tarjeta lateral, apertura de carta y fondo con estado de dibujo `activo`. No se observaron avisos ni errores en la consola en esa pasada. Captura: `.pruebas/recorrido-pc-revisado.jpg`. Los ajustes de posición y tamaño táctil del móvil quedan dentro de sus condiciones de pantalla; la orientación de las constelaciones y la textura legible de los sobres se comparten.

La revisión de pantallas estrechas usa el navegador integrado y la GPU del ordenador. No es una medición de FPS ni de temperatura en el teléfono físico. Siguen separados `main` y `feature/universo-vivo`; no se publica el paquete ni se toca el remoto.

## Fotografías reales del iPhone y entrega para Claude

El usuario aportó dos fotografías de WhatsApp de las 20:44 y 20:43: la vista alejada pierde protagonismo y el acercamiento muestra saturación intensa, puntos cuadrados y un rectángulo gris bajo la descripción. Estas imágenes contradicen cualquier conclusión de que el problema gráfico estuviera resuelto en el teléfono.

Se identificó una fuente de cuadrados que no usaba el material compartido: las 360 partículas orbitales del agujero negro conservaban `PointsMaterial` sin mapa y sin el límite de tamaño cercano. Se sustituyen por puntos circulares acotados a 3 píxeles CSS, con los atributos y la animación de color/tamaño correctos. Una regresión comprueba atributos completos, máscara circular, límite y posiciones finitas tras animar. Las 29 pruebas JavaScript pasan.

El acercamiento en el navegador integrado reproduce además la saturación y el rectángulo, por lo que no se atribuyen exclusivamente a Safari. La superficie radial de `.lugar` coincide con el rectángulo; en móvil se sustituye por un sombreado a todo el ancho, con final transparente, para conservar la lectura sobre el núcleo. Esto no corrige el rango dinámico del render 3D.

La calidad global **sigue pendiente**, especialmente la saturación del núcleo, la presencia de la galaxia alejada y su validación en el iPhone. Se prepara `docs/PROMPT-CLAUDE-GRAFICOS-MOVIL.md` como alternativa solicitada por el usuario: fotografías originales, rama, arquitectura, evidencia, hipótesis de salida de color/HDR, causas conocidas, validación física y restricciones. No se ha enviado a Claude ni ejecutado otro agente. No se fusiona ni publica.

## Renderizado móvil: diagnóstico e implementación (17 de octubre, Claude)

Base: `e6917cf`. Fotografías estudiadas: las tres de WhatsApp (20:43, 20:44 y 21:00). Herramientas: Chromium sin interfaz con la GPU real del PC (ANGLE/Vulkan, RTX 5070), SwiftShader como segunda implementación, perfil iPhone 13 de Playwright (390 × 664 CSS, DPR 3, agente de usuario de iPhone, táctil) y 1440 × 900 para PC. La versión anterior se sirvió aparte desde un worktree temporal de `e6917cf` para comparar. El navegador integrado no podía crear WebGL (`GL_VENDOR = Disabled`, el mismo fallo de controlador ya documentado). WebKit de Playwright no arranca sin bibliotecas del sistema que requieren `sudo`; no se instalaron. **Nada de esto es el iPhone.**

### Causas confirmadas (reproducidas y medidas)

1. **Saturación del núcleo.** El composer no tenía pasada de salida. La última pasada del brillo copiaba la escena con `MeshBasicMaterial` (que codifica en sRGB) y sumaba el brillo sin codificar; todo valor > 1 se recortaba. Medido en el búfer HDR, perfil iPhone, vista del núcleo: 38 135 píxeles con los tres canales > 1 y 553 > 8.
2. **Puntos sobre el agujero negro.** Las estrellas del bulbo (y del disco) situadas entre la cámara y el horizonte se dibujaban encima de la silueta: la profundidad es correcta, simplemente están delante.
3. **Columna rectangular sobre el núcleo.** Los chorros calculaban la intensidad con la coordenada alrededor del cono (`vU.x`); de lado se veía un rectángulo pálido.
4. **Galaxia pequeña y corazón/nombre diminutos.** En vertical la distancia se calculaba para mostrar toda la anchura con la galaxia casi de canto (≈ 25°): una franja estrecha. A esa distancia el corazón medía ≈ 20 px.
5. **Interfaz sobre la escena y destinos ocultos.** En 390 × 664 (el área real de Safari con sus barras, coherente con las fotos) la tarjeta del recorrido tapa el centro: ocurre igual en `e6917cf`. Las revisiones previas eran a 390 × 844.
6. **Defecto de portabilidad:** el anillo de fotones usaba `pow((r-44.5)*0.55, 2.0)` con base negativa (indefinido en GLSL). Inyectando NaN en ese anillo en el PC aparece un anillo negro que no se expande con el brillo, así que **no** explica las manchas de las fotos; se corrige igualmente.

### Hipótesis pendiente: manchas de colores (verde, azul oscuro, rojo, violeta)

No se reproducen con NVIDIA ni con SwiftShader, ni en las vistas equivalentes a las fotos. Son más oscuras que el fondo y su tono es el complementario de los colores de las estrellas (verde ↔ rosa, azul ↔ dorado del bulbo, rojo ↔ azules), con bordes muy suaves: es compatible con valores negativos o no válidos en el búfer HDR que el desenfoque expande, pero **no está confirmado**. Se añadieron defensas que impedirían ese mecanismo (limpieza de NaN/infinitos/negativos antes del brillo y en la salida; `max()` antes de `pow` en las partículas; límites de `smoothstep` positivos en la silueta) y un diagnóstico que lo mide en el teléfono, capa por capa (`?diag=render`, ver LEEME). Hasta tener ese informe del iPhone, la causa sigue abierta.

### Implementación

- `js/escena/salida.js` (nuevo): pasada final que reproduce la composición anterior (sRGB de la escena + brillo); por debajo del codo (0,8) la imagen es la misma. Por encima comprime las luces conservando el matiz y limpia valores no válidos. El brillo solo se calcula y su filtro de entrada también descarta valores no válidos.
- `materiales.js`: opción `silueta`: las estrellas dentro del cono cámara-horizonte (radio 58) se desvanecen; el resto del cielo no cambia. `uTam` para escalar puntos de símbolos.
- `agujeroNegro.js`: `x*x` en el anillo; chorros como haz que depende del ángulo de visión y nace desvanecido; disco interior menos blanco.
- `galaxia.js`: disco de **gas procedural** con la misma espiral que las estrellas (brazos, grumos de ruido, carril de polvo, degradado dorado → rosa → lila), que se desvanece de canto y cerca de la cámara. La capa de «resplandor» de puntos pasa de 55 000 a 28 000 y de 8 a 5 px; bulbo sin multiplicar por 1,25; resplandor central más pequeño.
- `util/encuadre.js` + `index.js`: inicio vertical inclinado ≈ 42° y a la distancia en que el disco llena el ancho; corazón y nombre crecen con la distancia (escala 1 a la distancia de escritorio, hasta 2,6); el centro de la proyección se desplaza (`setViewOffset`) a la franja que deja libre la interfaz en pantallas estrechas, en todos los destinos y durante el recorrido.
- CSS móvil: título y botón más arriba, tarjeta del lugar más compacta, sombreado de lectura de 45 % a 34 % de la altura; durante el recorrido en vertical el título se aparta y la tarjeta es más compacta. No se ha quitado ninguna función ni cambiado ningún texto.
- `diagnostico.js` (nuevo, solo con `?diag=render`) y etiquetas de capa en la escena.

### Comprobaciones

- Capturas comparables en `.pruebas/diagnostico/` (`antes-*` frente a `final-*`, `gas4-*`, `despues3-*`, `comp-*`, `hoja-ruta-*`), mismas posiciones de cámara. Las estrellas y galaxias lejanas son aleatorias en cada carga: se compara estructura.
- Recorrido de 9 pasos con los botones reales en iPhone vertical, horizontal (844 × 390) y PC: llegadas correctas, sin errores de consola, termina en el inicio con controles libres. En vertical los nueve destinos quedan ahora sobre la tarjeta (antes estaban tapados).
- Flujos con toques reales sobre el canvas y la proyección desplazada (iPhone y PC): estrella secreta → recuerdo; tres constelaciones tejidas y una unida a mano (3 luces); cinco cartas abiertas y cerradas (en móvil el render pasa a `lectura` y vuelve a `activo`); álbum; pista; postal.
- Coste del render de la escena, Chromium + RTX 5070: perfil iPhone 114 → 83 llamadas, 187 217 → 160 217 puntos, CPU 1,79 → 1,56 ms; PC 94 → 93 llamadas, CPU 1,38 → 1,35 ms (las llamadas dependen del encuadre). Se añaden dos pasadas a pantalla completa (gas y salida). FPS limitados a 60 por la sincronización vertical: **no indican el rendimiento del iPhone**.
- `npm test` (36: 7 nuevas sobre salida, NaN/negativos, matiz de las luces, `pow` del anillo, chorros, silueta, encuadre vertical y escala de símbolos), `npm run check`, `npm run test:servidor`, `npm run build:pages`, `git diff --check`.

### Pendiente en el teléfono físico

Abrir `http://192.168.1.34:3000/?calidad=alta&diag=render`, esperar el panel y enviar captura; el informe queda en `.pruebas/diagnostico-3d.json`. Hace falta saber modelo, versión de iOS y navegador. Con eso se confirma o descarta la hipótesis de las manchas, se mide el FPS real con gas y salida, y se valida el aspecto con la GPU del iPhone. No se ha fusionado ni publicado nada.

## Segunda pasada con el informe del iPhone (17 de octubre)

Informe recibido de `?diag=render`: Safari, iOS 18.7, CSS 430 × 775, DPR 3, búfer 1290 × 2325 (3 Mpx), «Apple GPU», precisión alta 23/23 bits, `EXT_color_buffer_float` sí, `OES_texture_float_linear` no. **0 NaN y 0 negativos** en las tres vistas: se descarta la hipótesis de valores no válidos en el búfer HDR. **25,7 FPS, p95 57 ms**, 388 llamadas de dibujo en la vista inicial.

### Puntitos de colores alrededor de los brillos

La usuaria observa que aparecen alrededor de todo lo luminoso con degradado, en todos los lugares. Esos brillos son texturas de canvas con degradados sobre fondo transparente. El canvas guarda el color premultiplicado en 8 bits; al subirlo a WebGL se divide por el alfa, y donde el alfa vale 1–2/255 cualquier tramado del degradado se convierte en rojo, verde, azul o magenta puros. Comprobado en el PC: Chromium no trama (0 de 4500 píxeles de alfa bajo con color falso); con un tramado de ±1 por canal, el 19 % de esos píxeles sale de color saturado. El diagnóstico incluye ahora esa prueba con la subida real a textura, para confirmarlo en el iPhone.

Corrección: las texturas de luz (brillo, destello, estrellas secretas, galaxias lejanas, etiquetas) se dibujan sobre negro opaco; la luz va en el color y, con mezcla aditiva, el negro no suma. Mismo aspecto, sin división. Las cápsulas de las frases se suben premultiplicadas con mezcla premultiplicada y fundido exacto.

### Fluidez

- Resolución: en móvil empieza en DPR 2 (más densidad que el PC, menos de la mitad de píxeles que DPR 3) y la resolución dinámica medida la ajusta entre 1,5 y el DPR del aparato (`util/resolucion.js`).
- Precalentado: todos los programas se compilan y todas las texturas se suben antes de entrar; antes ocurría al aparecer cada objeto y daba tirones al girar.
- 249 sprites (estrellas brillantes, pétalos y centros del jardín, cápsula, cola del cometa) pasan a cinco llamadas de puntos con el mismo aspecto. Vista amplia: 383 → 159 llamadas. Gas con tres octavas de ruido.
- Pruebas: 39 (tres nuevas: regulador a 25 y 60 FPS con techo, destellos agrupados).

Pendiente: repetir `?diag=render` en el iPhone para confirmar 0 píxeles de color falso con el método nuevo y medir los FPS con estos cambios.

## Tercera pasada: segundo informe del iPhone (17 de octubre, 22:16)

Informe con `552b5f3` (Safari, iOS 18.7, 430 × 775, DPR 3 → búfer 860 × 1550 a DPR 2): **prueba de canvas: 120 píxeles de color falso con fondo transparente, 0 con fondo opaco** — confirma en el dispositivo la causa de los puntitos de colores y su corrección. **59,8 FPS, p95 18 ms** (antes 25,7 FPS, p95 57 ms); 105 llamadas (antes 388). 0 NaN, 0 negativos.

La usuaria ve el móvil con «menos vida» que el PC. En vertical la cámara está ~2,7 veces más lejos para que quepa la galaxia: las estrellas quedan por debajo de un píxel y se desvanecen. Cambios:

- `compensacionPuntos` (util/encuadre.js): el tamaño de las estrellas de la galaxia, sus corazoncitos y el polvo se compensa con la distancia de la cámara (exponente 0,8, máximo 2,2; 1 a la distancia del PC, que no cambia).
- Inicio vertical algo más cercano: el disco llena el ancho y roza los brazos exteriores.
- Resolución dinámica en móvil sin subir por encima de la inicial (DPR 2): cada cambio rehace los búferes y daba un tirón.
- El diagnóstico registra la distancia de la cámara (en la foto del usuario la galaxia aparece más pequeña que en el perfil de 430 × 775; probablemente se alejó con el gesto).
- El panel del diagnóstico y su tirón al medir solo aparecen con `&diag=render`.

40 pruebas. Capturas: `comp-v3-movil.jpg`, `comp-v3-pc.jpg`, `hoja-ruta-iphoneMax.jpg`.

## Cuarta pasada: el móvil como el PC (17 de octubre, noche)

El tercer informe del iPhone confirmó: 0 píxeles de color falso, 59,8 FPS. La escena del móvil es idéntica a la del PC (mismas estrellas, gas, cielo y brillo; más densidad de píxeles). Lo que se percibía distinto era encuadre, color y coste de la interfaz:

- **Encuadre vertical como el del PC:** ≈ 34° de inclinación y más cerca; la galaxia desborda por los lados y el centro (corazón, nombre, núcleo, brazos interiores) tiene el protagonismo.
- **Color de gama amplia:** en pantallas Display P3 (iPhone, muchos Android, algunos monitores) el lienzo se presenta en P3 (`drawingBufferColorSpace`), rosas y lilas más intensos. En sRGB no cambia nada. Three.js no reescribe ese ajuste tras crear el renderizador.
- **Interfaz sin desenfoque de fondo en pantallas táctiles:** `backdrop-filter` se recalculaba en cada fotograma sobre la escena animada; fondo algo más opaco con el mismo tono.
- **Postal a la resolución máxima del aparato** (un solo fotograma) y vuelta a la resolución habitual: 1290 × 2515 en el tamaño del iPhone.
- Relojes: «CAS · BARCELONA» y «XIO · BUENOS AIRES» (misma zona horaria de Madrid para Barcelona).

Validado en perfiles iPhone (430 × 775, DPR 3), Android (Pixel 7) y PC: recorrido de 9 pasos y flujos (estrella, constelaciones, cinco cartas, álbum, pista, postal) sin errores de consola. 40 pruebas. Pendiente: confirmarlo en el iPhone físico.

## Quinta pasada: consumo, color y diseño (encargo `PROMPT-CLAUDE-CALIDAD-CONSUMO.md`)

Base `aa7db42`. Se revisaron los hallazgos de `AUDITORIA-CALIDAD-CONSUMO-2026-10-17.md`; los confirmados se corrigen por etapas.

### Etapa 1 · Consumo

- **Planificador de dibujo** (`util/planificador.js`): estados explícitos. Interacción (gestos, vuelos, efectos, entrada, actividad en los últimos 4 s) a 60 FPS como máximo, también en pantallas de 90/120/144 Hz. Contemplación también a 60 FPS en el móvil, igual que en PC (`?ritmo=ahorro` la baja a 30 en pantallas táctiles). Lectura sin dibujo en todos los dispositivos, conservando la última imagen. La pausa del recorrido congela tiempo y dibujo y solo redibuja cuando se pide. La página oculta no trabaja. Las animaciones usan tiempo real, así que no cambian de velocidad.
- Medido (Chromium sin interfaz, perfil 430 × 775): un minuto de contemplación dibuja 1801 cuadros de 3602 actualizaciones de pantalla (antes, todos). En lectura y pausa, 0 cuadros/s.
- **Gas horneado:** su campo no depende del tiempo; se calcula una vez en una textura de 1024² con mipmaps (media precisión si la GPU la admite) y en cada cuadro solo se lee. Antes: dos ruidos de tres octavas por píxel. Aspecto comparado: equivalente (`comp-v5-*`).
- **Regulador de resolución:** la estabilidad exige ventanas consecutivas (la secuencia 16,7/19 ms de la auditoría subía a 2,25; ahora no). Solo mide durante la interacción y descarta la ventana al cambiar de estado o de tamaño.
- **Postal blindada** (`util/captura.js`): resolución máxima con presupuesto de 8,3 Mpx, restaurada en éxito, error de copia 2D y tiempo agotado; una sola captura a la vez; obtiene su cuadro aunque haya un panel abierto.
- Precompilación con `compileAsync` cuando existe `KHR_parallel_shader_compile`; el botón de entrada espera a que terminen shaders y texturas.
- Diagnóstico: mide cuadros dibujados en interacción y en contemplación por separado.

### Etapa 2 · Color

- Se retira la presentación en Display P3: reinterpretaba valores codificados para sRGB (más saturación en unos móviles que en el PC). Cadena única: shaders y texturas → búfer lineal → pasada de salida (sRGB) → lienzo sRGB.
- Modo compatible/sin HDR: antes los materiales propios salían sin codificar y los de Three.js codificados. Ahora compone con la misma pasada de salida sobre un búfer de 8 bits (sin brillo), con vuelta al dibujo directo si falla. Posible leve bandeado en degradados muy oscuros en ese modo de respaldo.

### Etapa 3 · Diseño y accesibilidad

- **Modo contemplación** (`ui/contemplacion.js`): tras 9 s sin tocar se retiran barra, tarjeta del lugar, aviso del cometa, botón del recorrido y contador de estrellas; vuelven con cualquier toque o tecla. El toque que despierta abre lo que toca (estrella, lugar, nodo) pero no envía un beso al vacío. No actúa en el recorrido, la celebración ni con paneles abiertos.
- Ampliación de página permitida fuera del lienzo (cartas y paneles); el pellizco sobre el universo sigue moviendo la cámara.
- Textos auxiliares móviles más grandes (contador, relojes, barra, etiquetas).
- Movimiento reducido: la cámara no gira sola; el universo sigue en 3D.

### Validación

Perfiles iPhone 430 × 775 DPR 3, Android Pixel 7, horizontal 844 × 390 y PC 1440 × 900 (Chromium + RTX 5070; **no son teléfonos físicos**): recorrido de 9 pasos; estrella, tres constelaciones, nodos a mano, cinco cartas, álbum, pista y postal; estados de dibujo; sin errores de consola. 46 pruebas JS (seis nuevas de comportamiento: planificador a 60/120 Hz, contemplación, lectura y pausa, regulador no consecutivo, reinicio del regulador, postal con presupuesto y restauración ante error y doble captura), 4 de servidor, `check`, `build:pages`.

### Pendiente (no comprobado)

- Sesiones físicas de 15–20 minutos antes/después en iPhone y Android: FPS/p95 al principio y al final, batería, temperatura ambiente y percepción de calor. No se ha medido energía ni temperatura.
- Tiempo real de GPU (sin temporizadores fiables en Safari).
- Propuestas de diseño de mayor alcance de la auditoría (planetas, frases como escenas, constelaciones, álbum, postales compuestas, iconos SVG, consolidación de CSS, app instalable).

## Sexta pasada: todo lo del PC, también visible en el móvil (18 de octubre)

Verificación previa, visitando los nueve lugares en 430 × 775 y en 1440 × 900 (`hoja-visitas-movil.jpg`, `hoja-visitas-pc.jpg`):

- Galaxias del fondo: en el PC se veían varias detrás de cada lugar; en vertical casi ninguna (campo de visión horizontal ~3 veces menor y posiciones al azar).
- Lugares pequeños en el móvil: distancia base del PC × factor fijo (hasta 1,8), sin tener en cuenta la franja libre real.
- Sobres de la luna: un carácter ✉ de ~15 px; parecían puntos de luz.
- Etiqueta 3D del lugar duplicada justo encima de la tarjeta con el mismo nombre; aviso breve que tapaba la tarjeta.

Cambios:

- `distanciaDestino` (util/encuadre.js): en pantallas estrechas la figura ocupa ~75 % de la dimensión que limita (ancho o franja libre medida con la tarjeta del destino ya puesta); con la tarjeta del recorrido la cámara se aleja sola. PC y horizontal sin cambios. Factor propio para el planeta azul (mide la mitad).
- Galaxias lejanas repartidas con una espiral de Fibonacci (22) y la protagonista en el cielo libre sobre la galaxia de la vista de inicio.
- Inicio vertical: galaxia casi completa (86 % del diámetro a lo ancho, ≈ 37°).
- Sobres dibujados (papel, solapa, sello con corazón), alfa premultiplicado, por debajo del umbral del brillo.
- Etiqueta del lugar visitado atenuada en pantallas estrechas; avisos breves arriba en móvil vertical.

Validado en iPhone 430 × 775, Android Pixel 7, horizontal y PC (Chromium + GPU del PC, no teléfonos físicos): nueve visitas, recorrido, flujos y estados sin errores de consola. 47 pruebas.

## Séptima pasada: mejoras generales (18 de octubre)

- **Planetas:** textura de bandas con turbulencia calculada píxel a píxel (1024 × 512, lienzo opaco), tormentas ovaladas, terminador suave, atmósfera más intensa en el lado iluminado, brillo especular discreto, nubes que se desplazan y sombra del planeta sobre sus anillos (calculada con la luz del centro de la galaxia).
- **Constelaciones:** hilo de luz de pequeños destellos que se teje con la línea (la línea de 1 px casi no se veía en pantallas densas); al completarla se revela su frase propia durante 7 s y el aviso del álbum espera a que termine.
- **Frases:** una cada vez, elegida entre las que están a la vista; aparece, se queda ~6 s y se va. Crecen al alejar, como el corazón y el nombre (en vertical medían ~54 px CSS).
- **Barra inferior:** iconos SVG de trazo fino en lugar de símbolos tipográficos (✉ podía salir como emoji en iPhone).
- **Álbum:** tarjetas por mes agrupadas por capítulo, doradas las encontradas, sin desvelar las pendientes.
- **Postal:** tipografía y pie proporcionales al ancho de la captura, línea dorada con corazón.
- **Vibración** breve al encontrar una estrella y al completar una constelación (Android; Safari no la ofrece).
- **App sin conexión:** `build:pages` genera `dist/sw.js` con la lista de archivos y una versión por contenido; página y `contenido.json` primero por red, el resto desde la caché; la versión nueva se activa en la siguiente apertura; solo se registra en HTTPS (o `?sw=1` en localhost). Probado: con la red cortada la app abre, entra y dibuja con HDR, sin errores (91 recursos en caché).
- Avisos breves y mensaje rotatorio ya no se superponen.

Pendiente de decisión o de otra fase: recorrido corto/completo, consolidación de reglas CSS acumuladas, celebración con lo descubierto, contribución de Xiomara.

## Octava pasada: más vida (18 de octubre)

- **Agujero negro:** 900 partículas caen en espiral hacia el horizonte, giran más rápido y se calientan (rosa → blanco) al acercarse y se desvanecen al cruzarlo. Movimiento calculado en la GPU (antes, 360 partículas en círculo con búfer actualizado por la CPU en cada cuadro).
- **Planeta rosa:** cinturón de 1400 partículas dentro de los anillos, con velocidad ∝ r^-1,5 y sombra del planeta.
- **Planeta azul:** lunita propia en órbita inclinada y halo de atmósfera.
- **Jardín:** los pétalos se mecen cada uno a su ritmo; destellos de la cápsula que laten.
- **Resolución en móvil:** puede subir hasta DPR 2,5 tras cuatro ventanas consecutivas estables a 60 FPS (perfil 430 × 775 con la GPU del PC: 2 → 2,25 en 16 s). No probado en el teléfono físico.

## Novena pasada: resolución nativa en móvil sin forzar la GPU (18 de octubre)

- **Dos resoluciones, como en las consolas.** El lienzo trabaja siempre a la resolución nativa de la pantalla (iPhone 430 × 775 CSS a DPR 3: 1290 × 2325; Pixel 7: 1081 × 2202). La escena 3D se dibuja a una resolución interna (DPR 2 al empezar, entre 1,5 y 2,5) y la pasada de salida la amplía a la nativa. Antes, el lienzo entero iba a DPR 2 y Safari lo ampliaba al presentar, con un filtro que suaviza.
- **Enfoque adaptativo al ampliar** (`salida.js`): cuatro vecinos y un límite al mínimo y máximo locales, así que las estrellas y los bordes se afinan sin halos, sin brillos nuevos y sin negros negativos (comprobado en pruebas). La intensidad depende de cuánto se amplía; en PC (sin ampliar) no se aplica y la imagen es idéntica a la anterior.
- **Coste:** dibujar la escena entera a DPR 3 medía 25,7 FPS en el iPhone. Ahora solo la pasada final (cinco lecturas de textura por píxel) va a la resolución nativa. El lienzo en móvil ya no tiene multimuestreo, que a 3 Mpx solo gastaba memoria (la escena se dibuja en búferes propios).
- **Resolución estable:** el regulador ya no reacciona a un tirón aislado. Baja solo con lentitud sostenida 6 s (dos ventanas seguidas por debajo de 50 FPS) o con un tirón claro (mediana por encima de 28 ms). Sube solo tras 18 s seguidos a 60 FPS. Si una subida no se sostiene, vuelve atrás y fija ese techo. Solo cambia la resolución interna, nunca el tamaño del lienzo.
- **Medido en Chromium headless con la GPU del PC:**
  - Perfiles iPhone 430 × 775 y Pixel 7: lienzo nativo desde el inicio; escena 2 → 2,25 una sola vez en 30 s de interacción; 60 FPS; sin errores.
  - PC: sin cambios.
  - Recorridos, flujos, postal y estados correctos.
- **Diagnóstico:** `?diag=render` informa de `resolucion: { lienzo, escena, cambios }`.
- **No comprobado:** ni en el teléfono físico ni su temperatura. Hace falta una sesión de 15–20 min en el iPhone y en Android con `?diag=render`.

## Décima pasada: diagnóstico sin bloqueos y navegación por toque (18 de octubre)

- **Bloqueo y calor al abrir `?diag=render` en el iPhone:**
  - Causa: el análisis por capas dibujaba la escena unas 42 veces a la resolución del lienzo. Desde la novena pasada eso son 3 Mpx (el informe recibido dice `px: 2999250`), y cada imagen se leía entera con JavaScript.
  - Arreglo: `?diag=render` es ahora ligero (ritmo, motivo del dibujo, resoluciones) y no hace ninguna lectura pesada.
  - El análisis por capas pasa a `?diag=completo`, a ≤ 0,6 Mpx y cediendo un cuadro entre lecturas.
  - Medido en headless con perfil iPhone: bloqueo máximo del hilo principal de 40 ms (ligero) y 29 ms (completo).
- **Contemplación:** el informe del iPhone midió 58,5 FPS cuando debía ir a 30. El diagnóstico ahora espera a que el planificador entre en contemplación e informa del motivo de cada cuadro (`vuelo`, `gesto`, `reciente`, `encuadre`…). Así el próximo informe dirá la causa. Probablemente fueron toques durante la medición, pero no está confirmado.
- **Volver al centro:**
  - Pastilla «← Volver al centro» encima del nombre de cada lugar, ignorando el clic fantasma del mismo toque que llevó al planeta.
  - Cada viaje despierta la interfaz, así que al llegar se ve.
  - Tocar el agujero negro también vuelve, cuando está a la vista.
- **Toque con margen de dedo:** si no se acierta exactamente en el objeto, se elige el destino más cercano dentro de su tamaño en pantalla (mínimo 44 px). Comprobado en los perfiles iPhone y Android girando la cámara hasta ver cada destino: se llega por toque a los 8 lugares y al cometa, y desde los 7 lugares se vuelve con el botón.
- **Toques más robustos:** se siguen los dedos por identificador y se escucha el soltar en toda la ventana. Antes, un dedo levantado sobre un elemento recién aparecido podía dejar el contador «atascado».

## Undécima pasada: identidad de cada lugar, portada, viajes con intención (18 de octubre)

### Mundos
- **Planetas:**
  - Las texturas se calculan en un Web Worker (`texturasPlaneta.js` y `obreroTexturas.js`, con alternativa en el hilo principal).
  - Rosa: bandas con turbulencia fbm, halo discreto (0,11 en lugar de 0,35), anillos finos con división de Cassini y luna con cráteres.
  - «Dos orillas»: planeta océano con continentes rosados, nubes en capa propia que desaparecen de noche, Barcelona y Buenos Aires encendidas y unidas por un arco de luz con dos pulsos, luna con cráteres y dos estrellas, rosa y azul, con estela.
- **El hilo invisible:** corazón con la curva clásica (15 estrellas). Su contorno tenue se intuye antes de tejerlo y, al completarlo, se llena de polvo de luz. Tiene estrellas de campo propias.
- **Correo de la luna:** luna con cráteres y ruta postal inclinada de polvo de luz. Los sobres viajan sobre ella (antes flotaban sin relación con el anillo).
- **Jardín:** flores de luz de seis pétalos con tallo y hojas, suelo de musgo y luciérnagas. Florecen en ola con su acción.
- **Órbita del mañana:** cristal con brillo de borde, corazón de luz que late, astrolabio de tres aros con marcas y un relicario por cápsula (dorado si ya puede abrirse).
- **Aquí, contigo:** telón de aurora detrás del lugar, laguna de luz con ondas lentas, dos luces con estela y luciérnagas.
- **Cometa:**
  - Núcleo, coma y dos colas de partículas animadas en la GPU: polvo curvado y iones rectos, apuntando lejos del centro.
  - Cruza el cielo durante 42 s de cada 130 s y se detiene cuando se le visita.
  - En cada pasada deja una frase distinta. Las de `FRASES_COMETA` son provisionales: Carlos dará las definitivas.

### Jerarquía y encuadres
- La cámara llega por el lado iluminado de cada lugar, en tres cuartos, con un punto de mira y una altura propios.
- Un velo oscuro atenúa el fondo según el lugar (constelación 0,62; planetas ~0,3). El lugar se dibuja después con todo su brillo.
- Distancias mínimas propias para no entrar en superficies (`CERCA` en `index.js`).

### Viajes
Trayectorias con puntos de paso:
- rozar el anillo del planeta rosa;
- pasar tras la luna de «Dos orillas» (posición predicha);
- recorrer la ruta postal entre los sobres;
- espiral hacia la cápsula;
- llegar al cometa siguiendo su cola.

Una corriente de estrellas acompaña a la cámara en los vuelos.

### Acciones propias
Cada lugar tiene la suya, y la interfaz se aparta mientras dura:
- **Correo:** abrir un sobre (animación).
- **«Dos orillas»:** rodar con su luna (media órbita).
- **Constelación:** seguir la corriente de luz (tejer y acercarse).
- **Cápsula:** acercarse a ella.
- **Jardín:** hacer florecer el jardín.
- **Planeta rosa:** acercarse antes de leer.
- **«Aquí contigo»:** una deriva lenta hacia la laguna.

### Experiencia
- **Portada:**
  - Dos luces con estela se buscan, se encuentran en un destello y de su encuentro nace una galaxia, con tres frases breves y la opción «Saltar».
  - Al formarse, la galaxia se aparta para dejar sitio a la tarjeta.
  - En visitas siguientes aparece ya formada.
  - El 3D no se dibuja mientras se ve la portada.
- **Continuar el viaje:** se guardan el último lugar y el paso del recorrido, y la entrada ofrece continuar. «Descubrirlo todo de nuevo» reinicia el progreso (guardando una copia, como antes) y vuelve a mostrar la presentación.
- **Pista progresiva:** frase que sugiere la región, zona iluminada, acercamiento a la zona y, por último, la estrella señalada.
- **Mapa:** botón de brújula que despliega una vista cenital. El lugar actual tiene un anillo, los visitados muestran su nombre y los pendientes aparecen como «Por descubrir». Tocar un lugar lleva a él.
- **Celebración personal:** se nombran uno a uno los recuerdos encontrados, sus estrellas vuelan a formar un corazón unido por un hilo de luz y termina con «N meses de nosotros» antes de la carta.

### Medido
En Chromium headless con la GPU del PC:
- Perfiles iPhone 430 × 775 y Pixel 7 a 60 FPS.
- Con la CPU 4× más lenta, la carga queda en ~2,6 s (antes de esta pasada, 2,8 s).
- Recorrido, flujos, estados, navegación por toque y acciones de cada lugar, sin errores.

**No comprobado:** en el teléfono físico.

## Duodécima pasada: correcciones de la revisión en el teléfono (18 de octubre)

- **Pistas:** la segunda y la tercera estaban desplazadas a propósito (para no revelar el sitio exacto) y confundían. Ahora el resplandor se centra en la estrella, con una onda que se cierra sobre ella, y la tercera pista la deja en el centro de la pantalla.
- **Viajes sin atravesar planetas:** cada trayectoria se muestrea y se aparta de los cuerpos (agujero negro, planeta rosa con anillos, la Tierra, la luna del correo, la cápsula) en varias pasadas. Comprobado en los 56 viajes posibles entre lugares. La llegada termina girando alrededor del lugar en lugar de entrar de frente.
- **Agujero negro visto desde los planetas:**
  - El «escudo» rosa era el halo grueso alrededor de la sombra: ahora es un borde fino.
  - El anillo torcido era el disco interior inclinado 0,13 rad: ahora está en el mismo plano.
  - Visto de canto, la imagen curvada del disco aparece por encima (y, más tenue, por debajo) de la sombra, como en las imágenes científicas.
- **«Dos orillas, un cielo» es la Tierra** (`geografia.js`):
  - Contornos simplificados de los continentes, biomas por latitud, desiertos reales, plataforma continental y hielo polar.
  - España y Argentina con una luz suave, y Barcelona y Buenos Aires en sus coordenadas, unidas por el arco.
  - Al visitarla gira para mostrar el Atlántico.
- **Cometa** (`cometa.js`):
  - Coma en capas, velo de polvo curvado con estrías, cola de iones azul con nudos y fundidos al aparecer y al irse.
  - Ya no se detiene al visitarlo: la cámara viaja con él mientras se lee su carta (el 3D sigue dibujándose con la carta abierta, sin desenfoque de fondo) y al dejarlo está donde le corresponde.
  - Pasa por la parte alta de la vista inicial.
- **Planeta rosa:** la fecha está escrita en luz en un anillo propio que gira (legible en la parte cercana), además de la etiqueta. Los anillos tienen tono más rosado.
- **El hilo invisible:** contorno rosa a la izquierda y azul a la derecha. Al completarlo se llena de una nebulosa con la forma exacta del corazón, con chispas que recorren el trazo y un latido suave.
- **Aquí, contigo:** farolillos cálidos que suben desde la laguna y nenúfares de luz.
- **Portada:**
  - La galaxia ya no se deforma: antes cada partícula giraba a su propia velocidad y los brazos se enrollaban; ahora gira el conjunto.
  - La presentación se ve en cada visita y se puede saltar.
- **Mensajes:** el rotatorio queda centrado con espacio a ambos lados y sin tirón (antes su desplazamiento no tenía transición). Los avisos se funden con un desplazamiento mínimo.

## Decimotercera pasada: órbitas, hiperespacio y más vida en cada lugar (18 de octubre)

- **Viajes que bordean el destino** (`llegadaEnOrbita` en `index.js`): la cámara se acerca hasta una esfera amplia del lado por el que llega, gira alrededor del destino hasta el ángulo final y entonces se acerca.
  - Obstáculos con lunas y con los demás lugares.
  - Comprobado en los 56 viajes en PC y en el perfil móvil, midiendo las lunas en movimiento: ninguno atraviesa un cuerpo.
- **Salto a la velocidad de la luz:** estelas de estrellas alrededor de la cámara que se alargan con la velocidad y un campo de visión que se abre hasta 12° en el tramo más rápido.
- **Agujero negro:** el horizonte se dibuja después de la galaxia y escribe profundidad, así que la sombra es siempre redonda y solo la parte cercana del disco pasa por delante.
- **Cometa:** la cola de iones, que salía recta y brillante hacia arriba, ahora es tenue y va junto a la de polvo.
- **La Tierra:** atmósfera exterior que dispersa la luz azul en el borde, terminador nítido, luces de ciudades dispersas en el lado de noche y más resolución en PC.
- **Lunas:** grises con «mares» oscuros (la del correo conserva su tono lila).
- **Planeta rosa:**
  - Rotación diferencial de las bandas y auroras en los polos.
  - Segunda luna en otra órbita.
- **El hilo invisible:** «Xio» y «Cas» en los lóbulos, marco de filigrana, corazón interior que late, halo de fondo y corazoncitos que suben.
- **Aquí, contigo:** refugio cósmico en lugar de flores y farolillos.
  - Estrella joven con disco protoplanetario (giro kepleriano, huecos y dos protoplanetas).
  - Nubes de nebulosa deshilachadas.
  - Polvo de estrellas.
- **Órbita del mañana:**
  - Reloj de arena de luz con arena que cae dentro del cristal.
  - Números romanos girando en el aro exterior.
  - La fecha de cada cápsula junto a su relicario.
  - Dos corrientes de luz en espiral.
- **Jardín:** hierba luminosa que se mece y mariposas de luz que aletean entre las flores.
- **Correo:** luna con mares y una estela de chispas detrás de cada sobre, que se mece.
- **Rendimiento** (headless con la GPU del PC):
  - 60 FPS en los perfiles iPhone y Android.
  - Carga con CPU 4× más lenta: 3,1 s. Las lunas pequeñas usan texturas de 512 px y los cráteres se evalúan solo cerca de cada píxel.

## Decimocuarta pasada: agujero negro opaco, viaje natural, cometa real (18 de octubre)

- **Agujero negro opaco:** con la prueba de profundidad desactivada, WebGL tampoco escribía la profundidad del horizonte, y por eso se veían a través los planetas que había detrás. Ahora usa `depthFunc: AlwaysDepth` (siempre se dibuja) y escribe profundidad. Comprobado con el planeta rosa y la Tierra justo detrás: no se ven.
- **Viaje:**
  - Espiral continua desde donde se está hasta el encuadre, en lugar de aproximación más giro con quiebros. La distancia al destino solo disminuye (medido: retroceso 0 en todos los viajes probados).
  - Perfil de velocidad integrado: arranque en el 18 % inicial y frenada larga hasta velocidad cero.
  - Se mira hacia delante en el tramo rápido y se gira hacia el destino al frenar.
  - Sin cambio de campo de visión: el zoom al frenar parecía un impacto.
  - Las estelas nacen del punto hacia el que se viaja de verdad (velocidad en el espacio de la cámara).
  - Sigue sin atravesar ningún cuerpo en los 56 viajes (PC y móvil).
- **Cometa:**
  - Sin cola azul ni chorros: nada sale disparado.
  - Coma verde azulada (el carbono de los cometas reales) con núcleo blanco.
  - Cola de polvo de blanco a dorado y rosa, con franja central.
- **El hilo invisible:** el corazón se traza con su curva exacta (antes, una curva suave entre las 15 estrellas lo deformaba). La filigrana sigue esa curva y las estrellas de fondo quedan fuera.
- **Jardín:** sin mariposas.
- **Órbita del mañana:** marco dorado del reloj de arena, ruedas dentadas que giran detrás del cristal y un «tic» de luz por segundo en los números romanos.
- **Correo:** luna gris realista con mares. Cada pocos segundos un sobre despega de la superficie en arco, con rastro de chispas, hasta la ruta.
- **Aquí, contigo:** chorros de gas de la estrella joven, ondas espirales en el disco y estrellas fugaces que cruzan el refugio.

## Decimoquinta pasada: el cielo profundo y correcciones (18 de octubre)

- **Tierra:** España y Barcelona en azul (Cas), Argentina y Buenos Aires en rosa (Xio), como en el corazón. Estaban al revés.
- **Correo de la luna:** fuera los despegues (los sobres atravesaban la luna). Ahora tiene:
  - una segunda ruta inclinada al revés con sobres en sentido contrario;
  - corazoncitos que se desprenden de los sobres;
  - un destello en los sobres al pasar por delante.
- **Viajes:**
  - La mirada pasa al destino en el primer tercio y lo mantiene centrado (antes miraba hacia delante y giraba de forma brusca).
  - El rodeo alrededor del destino está limitado a ~57°.
- **El hilo invisible:** estrellas, curva y corazones en un mismo plano (antes la profundidad de las estrellas las descuadraba al girar). Sin balanceo del marco.
- **Cometa visitado:** la cámara lo acompaña 14 s y después lo ve alejarse. Al desaparecer (22 s más), vuelve sola al centro. Comprobado: ya no deja la cámara lejos.
- **Jardín:** dos formas de flor, savia de luz que sube por los tallos y rocío.
- **Aquí, contigo:** una estrella binaria. Xio (rosa) y Cas (azul) orbitan juntas con su estela, unidas por un puente de gas, dentro de un disco de polvo común. Desaparecen los degradados amarillo y morado (estrella joven y nubes).
- **Órbita del mañana:** facetas de gema en el cristal, un rayo de luz en las cápsulas que pueden abrirse, un anillo de estrellas-horas dentro del cristal y destellos en la arena que cae.
- **Cielo profundo** (`cosmos.js`, texturas en el worker):
  - Galaxias de fondo como en las fotografías: bulbo amarillento, brazos azulados con cúmulos, regiones HII rosadas y franjas de polvo. Tipos espiral, barrada, floculenta, elíptica, de canto con franja de polvo e irregular.
  - Cuatro nebulosas de emisión (hidrógeno, oxígeno, azufre, polvo y estrellas).
  - 30 estrellas gigantes: supergigantes azules, gigantes rojas y amarillas, con destellos de difracción.
  - Dos cometas lejanos (verde azulado y blanco-rosado).
  - Un púlsar: estrella de neutrones con haces que barren como un faro y destellan al pasar cerca de la línea de visión, líneas de campo magnético dipolar y nebulosa de viento.
  - Un cuásar: núcleo deslumbrante, disco de acreción con brillo Doppler, chorros relativistas con nudos y galaxia anfitriona.
  - Un agujero negro ultramasivo como TON 618: sombra, disco gigante casi de canto y la imagen curvada del disco encima y debajo.
  - Todo es fondo: se atenúa bajo el velo al visitar un lugar.

## Decimosexta pasada: viaje alineado, cometa hasta el final y cielo profundo equilibrado (18 de octubre)

- **Viaje:**
  - Primero gira la mirada hacia el destino casi sin moverse y después acelera en línea recta hacia él. El punto de fuga de las estelas coincide con lo que se mira: desvío de 2–5° en el tramo rápido.
  - El pequeño giro final (≤ 26°) se hace frenando y, mientras no se avanza de frente, las estelas se apagan.
  - Medido: desvío máximo con estelas visibles de ~20°, solo durante su desvanecimiento. Sigue sin atravesar ningún cuerpo.
- **Cometa:** se le acompaña hasta el final de su recorrido (sin salirse de él) y entonces se vuelve al centro.
- **Correo:** la segunda ruta tiene la misma banda de polvo de luz y la misma estela de chispas que la primera.
- **Galaxias de fondo:**
  - Paletas propias: clásica, rosa, dorada, violeta, turquesa y azul.
  - Entre 26 000 y 44 000 unidades y más pequeñas (antes parecían cercanas), más un campo profundo de galaxias diminutas a 48 000–62 000.
  - Nunca se colocan encima de nebulosas ni de objetos del cielo profundo (`ZONAS_OCUPADAS`).
- **Cielo profundo** (posiciones según lo que se ve desde la vista inicial, `direccionCielo`):
  - Nebulosas a ~10 000 (en nuestra zona del cielo).
  - Supergigantes azules (tipo Rigel) y rojas (tipo Betelgeuse) grandes y luminosas, estrellas amarillas y enanas rojas pequeñas e intensas.
  - Púlsar más cerca y enorme (haces de 2 200, líneas de campo y doble nebulosa de viento).
  - Cuásar más cerca (chorros de 6 200, disco grande y galaxia anfitriona).
  - Agujero negro ultramasivo más lejos (34 000) pero enorme (sombra de 1 150, disco de 7 500 de radio). Su sombra se dibuja tras el disco con `AlwaysDepth`: negra del todo, sin nada dentro ni detrás.
  - Todo el cielo profundo se dibuja antes que las galaxias y la galaxia central: la sombra no tapa lo que queda delante.

## Decimoséptima pasada: cielo repartido, estrellas reales y púlsar tipo Cangrejo (18 de octubre)

- **Reparto:**
  - La vista inicial muestra una nebulosa y siete galaxias de tipos y colores distintos a su alrededor (sin tocarla).
  - El cuásar (acimut 96°), el púlsar (−92°) y el agujero ultramasivo (178°, a 40 000) están en otras partes del cielo, para descubrirlos al girar.
  - Ocho nebulosas repartidas (roja con turquesa, violeta, planetaria verde azulada).
- **Estrellas reales con nombre**, cada una con su color de temperatura y un tamaño según su radio:
  - Sirio A, Elnath, Aludra, Estrella Pistola, Pólux, Arturo, Aldebarán, Antares, Betelgeuse, VY Canis Majoris, UY Scuti y Stephenson 2-18.
  - Son esferas con granulación animada, manchas y oscurecimiento hacia el borde, con corona, destellos y nombre.
  - La Estrella Pistola y VY Canis Majoris llevan su nebulosa.
  - Siguen las enanas rojas.
- **Púlsar como la Nebulosa del Cangrejo:** interior azul de sincrotrón y filamentos rojo-anaranjados, toro ecuatorial de viento con grumos, chorros por los polos, haces de faro y líneas de campo.
- **Agujero ultramasivo sin parpadeo:** a 40 000 unidades la precisión de profundidad no bastaba y sus partes se alternaban. Ahora se dibujan en orden fijo sin prueba de profundidad (resplandor, disco, sombra negra, lente).
- **Lente:** visto de frente, la imagen del disco forma un anillo completo; de canto, los arcos de arriba y de abajo.

## Decimoctava pasada: gigantes lejanas, Sagitario A* y TON 618 con anillos que giran (18 de octubre)

- Estrellas gigantes (rojas y azules): ahora son discos grandes y lejanos (a unos 8200 de distancia, más allá de casi todo) con granulación propia, un halo mucho más suave y rayos discretos. Se quitaron los nombres.
- Nebulosas: el doble de lejos aproximadamente (×1,7), con el tamaño ajustado para que se vean como nubes enormes y distantes.
- Púlsar: más lejos (16000) y a escala 1,35, para que siga viéndose bien. Mantiene la nebulosa del Cangrejo, el toro ecuatorial, los chorros con nudos, los haces que barren y las líneas de campo.
- Cuásar con más vida: gas que cae en espiral hacia el disco (de naranja a blanco), partículas que salen disparadas por los chorros, núcleo que titila y una precesión lenta del eje.
- TON 618: el disco se divide en una mitad trasera y otra delantera. La delantera pasa por encima de la sombra, así que los anillos ya no se ven «comidos». La espiral del disco gira y se aprecia el giro. Lo acerqué a 7500 (con el radio a escala) para que las estrellas del fondo no se vean a través y deje de parecer transparente.
- Sagitario A* (nuevo, abajo en el cielo): sombra negra con el anillo naranja del estilo de la foto del EHT, una media luna brillante y un destello que lo orbita. Las estrellas de alrededor se deforman en arcos cerca del radio de Einstein.

## Decimonovena pasada: el cielo profundo, de verdad lejos (18 de octubre)

- Causa: la cámara de inicio está a unos 6700 del centro y los soles gigantes y TON 618 estaban a 7500–8200. Al moverse la cámara cambiaban de sitio entre sí (paralaje) y se veían cerca. Por la misma razón, una nebulosa y una galaxia acababan casi tocándose.
- Ahora las estrellas, las galaxias lejanas y el cosmos acompañan a la cámara (index.js, `cieloLejano`), como el cielo real: nada se acerca ni se solapa al moverse. Los cálculos que dependen de la cámara (haces del púlsar, cometas lejanos, mitades del disco de TON) usan su posición relativa a la raíz.
- Zonas ocupadas con su radio angular real (con nebulosa o anillos incluidos), y galaxias colocadas con su propio radio y un margen de 3°, sin tocarse entre ellas. Una nebulosa y una galaxia de la vista inicial se recolocaron.
- Soles colosales, todos a la misma distancia, con un tamaño en el cielo según su radio real:
  - Disco con pocas células de convección enormes (las rojas), centro deslumbrante y borde fundido en su propia luz.
  - Destellos de difracción y estrellas cercanas que pasan por delante del disco.
  - Las rojas laten despacio.
  - Las hipergigantes rojas tienen polvo expulsado en arcos rotos; las azules muy luminosas, una burbuja de gas con filamentos.
- TON 618 a un tamaño prudente (×0,55), con arcos de galaxias de detrás deformados por su gravedad. Sagitario A* a ×0,7, con menos densidad de estrellas curvadas.

## Vigésima pasada: un universo como en las fotos (18 de octubre)

- **Vía Láctea real** (cielo.js, horneada una sola vez en el cubemap, sin coste por cuadro):
  - Rodea todo el cielo y su núcleo dorado está en Sagitario A*, que es el centro galáctico.
  - Tiene nubes estelares estiradas a lo largo de la banda, la Gran Grieta de polvo, filamentos oscuros y nudos rosados de hidrógeno.
  - Las estrellas finas son mucho más densas dentro de la banda.
- **Polvo cercano** (polvo.js): motas que acompañan a la cámara en un cubo que se repite sin costuras. En reposo titilan; al viajar se estiran en contra del movimiento, así se nota la velocidad aunque el cielo lejano esté fijo.
- **Supernova** (cosmos.js): cada 3 a 6 minutos (la primera hacia el primer minuto) una estrella estalla en una zona libre del cielo. Pasa del blanco azulado al amarillo y al rojo en algo más de un minuto y deja un eco de luz que se expande.
- **Estrella fugaz y deseo**:
  - Los meteoros son realistas: finos, con cabeza blanca y tono verde, azul o anaranjado, y aparecen cada 6 a 16 segundos.
  - Al tocar el cielo vacío, la primera vez y luego una de cada tres, cae una estrella fugaz grande y aparecen «Pide un deseo ✨» y «Tu deseo ya viaja entre las estrellas».
- **Andrómeda y una colisión** (galaxiasLejanas.js, nuevo tipo `colision` en texturasPlaneta.js): Andrómeda grande y casi de canto con sus satélites M32 y M110, y dos galaxias fusionándose con colas de marea, como las Antenas.
- **Planeta rosa**:
  - Los anillos proyectan su sombra sobre el planeta, con la división incluida.
  - Tiene nubes altas que corren más rápido que las bandas.
  - Los anillos se iluminan a contraluz.
- **Tierra con la hora real** (util/sol.js): el Sol de la Tierra está en el punto subsolar real, calculado con la declinación y la ecuación del tiempo.
  - Día, noche, luces de las ciudades y crepúsculo anaranjado en la atmósfera son los de ahora mismo.
  - Su luna se ilumina con el mismo Sol.
  - El panel de horarios dice si en Barcelona y en Buenos Aires es de día, de noche, amanece o atardece.
- **Lunas con relieve**: los cráteres sobresalen gracias al gradiente de la textura. El lado de noche recibe un poco de luz del planeta (luz cenicienta): azulada en la luna de la Tierra, rosada en las del planeta rosa.
- **Gigante gaseoso** (CENTRO_GIGANTE, también en OBSTACULOS):
  - Bandas como las de Júpiter y una tormenta con forma de corazón que gira sobre sí misma.
  - Un cinturón de asteroides con rocas 3D facetadas: órbitas keplerianas y giro propio en la GPU, en una sola llamada de dibujo.
  - Un anillo de polvo tenue.
- **Cámara que respira**: el giro automático arranca suave y, quieta en un lugar, la cámara se acerca y se aleja un poco (desplazamiento temporal solo durante el dibujo).
- **Giroscopio**: inclinar el móvil mueve el cielo unos grados. Se activa con el toque de entrada; en iOS pide permiso y necesita HTTPS (GitHub Pages).
- **Contemplar**: un paseo lento por todos los lugares, sin interfaz y con la música; cualquier toque lo termina. Está en Explorar.
- **El cielo de aquella noche** (ui/cieloNoche.js):
  - Dos planisferios del 15/12/2025, uno sobre Barcelona y otro sobre Buenos Aires.
  - Unas 90 estrellas reales (J2000), 15 constelaciones, la Vía Láctea, Júpiter en Géminis, Saturno en Piscis y la Luna calculada con su fase.
  - Un control mueve la hora de 19:00 a 05:00.
  - Se abre desde Explorar y desde el panel de «Dos orillas».

## Vigesimoprimera pasada: viajar a lo lejano y más realismo (18 de octubre)

- **Viajes al cielo profundo sin acercarlo** (index.js `viajarLejos`, datos en `LEJANOS`):
  - Destinos: gigante del corazón, Deneb, púlsar del Cangrejo, cuásar, TON 618, Sagitario A* y la supernova mientras dura.
  - El cielo deja de acompañar a la cámara (`cielo.modo = 'fijo'`), la cámara vuela hasta la posición real del objeto y se puede orbitar alrededor.
  - Al volver, el cielo se recoge en el tramo final del vuelo ('regreso'), sin saltos.
  - Los destinos están en Explorar, en «Más allá de nuestra galaxia», y cada uno tiene su vuelta lenta como acción.
- **Deneb**: supergigante blanca y deslumbrante, con burbuja de gas. El halo y los destellos de todas las estrellas conservan su tamaño en el cielo al acercarse (son ópticos), mientras el disco crece.
- **Supernova**: la primera llega antes de un minuto y luego cada 2 a 4 minutos. Dura unos 2,5 minutos con una curva de luz real (pico rápido y caída lenta, del blanco al rojo). Sale un aviso con botón para viajar a verla.
- **Polvo al viajar**: las estelas son tiras con grosor en píxeles de pantalla; antes eran líneas de 1 px, invisibles en pantallas 3×. Las motas en reposo son más visibles.
- **Meteoros**:
  - Rastro de gas ionizado que sigue brillando después de pasar, con tinte de color.
  - Chispas que se desprenden, parpadeo de la cabeza y, a veces, un estallido final (siempre en las estrellas de deseo).
  - Mezcla aditiva, para que brillen.
- **Luna**:
  - La altura real va en el canal alfa, con cientos de cráteres (ley de potencias), picos centrales, eyecciones, rayos rectos en los cráteres jóvenes y mares.
  - Iluminación de cuerpo sin aire (Lommel–Seeliger) y textura en sRGB.
  - Estas texturas no retrasan la carga.
- **Tierra**:
  - Relieve con las cordilleras reales (Andes, Himalaya y meseta del Tíbet, Alpes, Pirineos, Rocosas, Atlas, Urales, Cáucaso…) y nieve solo en las crestas altas.
  - Textura en sRGB: antes los colores se lavaban y el océano salía celeste.
  - Reflejo del Sol en el mar, nítido y con un brillo amplio y suave.
- **Asteroides**: forma irregular, cráteres y rugosidad por píxel, y tres tipos (carbonáceos, silíceos y metálicos). Además, 26 a 44 rocas grandes con más detalle.
- **Andrómeda y la colisión**: generadores propios a 768–1024 px.
  - Andrómeda: bulbo de De Vaucouleurs, brazos cerrados y floculentos, filamentos de polvo, anillo azul con nudos rosados y halo.
  - La colisión: discos deformados, zona central con cúmulos azules y estrellas nacientes, polvo y colas de marea anchas y tenues.
- **El cielo de aquella noche**, como una foto real:
  - Un mismo instante para las dos ciudades, que en diciembre estaban separadas 4 horas (UTC+1 y UTC−3).
  - Unas 2600 estrellas débiles estadísticamente realistas más las brillantes reales, con su color y extinción cerca del horizonte.
  - Vía Láctea en coordenadas galácticas con la Gran Grieta, color del cielo según la altura del Sol (día, crepúsculos y noche), Sol, Luna con halo, silueta del horizonte y resplandor de la ciudad.
  - Constelaciones y nombres se pueden ocultar.

## Vigesimosegunda pasada: el sistema solar dentro de la galaxia, distancias reales y la supernova (19 de octubre)

- **Sistema solar dentro de un brazo de la galaxia** (solar.js, escena aparte):
  - La Tierra, el planeta rosa, la luna del correo y el gigante viven en su propia escena, con un Sol en el centro. Conservan sus coordenadas, así que la luz y los viajes entre ellos funcionan igual.
  - Para entrar o salir hay que lanzarse a la velocidad de la luz hacia su punto del brazo (`galaxia.puntoBrazo`). Hay un destello y se aparece al otro lado (`entrarOSalir`, `cambiarEscena`).
  - El cielo lejano y la cámara (con sus estelas) pasan a la escena activa; nucleo `fijarEscena` cambia lo que se dibuja.
  - Desde dentro se ve la galaxia de Xiomara como una banda, horneada una vez en un cubemap. Así no cuesta nada por cuadro y no hay bloques de brillo.
  - En la vista principal, una lucecita dorada con su nombre marca el sistema solar y se puede tocar.
  - El mapa coloca esos lugares junto a su brazo.
  - La Tierra gira de forma que el Sol de la escena ilumine lo que es de día ahora mismo, y se llega mirando al Atlántico.
- **Carga y calor**:
  - Las texturas y los shaders del sistema solar no retrasan la entrada: se preparan en un momento tranquilo tras ella, y solo se dibuja la escena activa.
  - En móvil, la resolución interna máxima baja a 2.
  - Carga simulada con la CPU 4 veces más lenta: 1,4 s (antes, unos 3 s).
- **Cielo profundo a escala real** (`ESCALA_CIELO = 10`):
  - Desde la cámara se ve igual (escalar alrededor de quien mira no cambia nada), pero viajar al cuásar o al púlsar son 160 000 unidades, unos 12 a 15 s a la velocidad de la luz.
  - Desde allí nuestra galaxia es un puntito.
  - Hay un cúmulo de galaxias tras el cuásar y unas 300 galaxias de fondo con instancias.
- **Lente gravitacional de verdad** (lente.js): una pasada de pantalla curva el fondo real alrededor de Sagitario A* y TON 618 según su posición en el espacio.
  - Desaparecen las estrellitas pintadas.
  - Los anillos miran a la posición de la cámara: ya no siguen a la pantalla.
- **Supernova** (supernova.js): una hipergigante inestable (como Eta Carinae), con lóbulos bipolares, que late cada vez más rápido.
  - Al estallar: destello en pantalla (bloom), onda de choque, miles de fragmentos con colores de emisión reales, cáscara con filamentos, ecos de luz y estrella de neutrones.
  - Al visitarla: cuenta atrás, estallido, la cámara retrocede para verlo entero y vuelve sola a casa.
  - Sin visitas, también estalla de vez en cuando.
- **Deneb**: disco puntual (desde los otros lugares parecía una luna) y visita más cercana.
- **Velocidad de la luz al hacer zoom**: avanzar o retroceder con la rueda o el pellizco activa las estelas (al retroceder se alejan hacia el centro). El polvo usa la velocidad de la escena, así que girar alrededor de algo lejano ya no parece un viaje.
- **El cielo de aquella noche**: la línea de tiempo va del 14 de diciembre a las 19:00 al 16 a las 06:00 (hora de Barcelona), con dos momentos marcados (00:00 Xio / 04:00 Cas y 19:00 Xio / 23:00 Cas) y la fecha local de cada ciudad.
- **Púlsar**: nebulosa con volumen (tres capas cruzadas), ondas que salen del anillo ecuatorial y partículas por los haces.
- **Cuásar**: galaxia anfitriona elíptica, toro de polvo (translúcido de frente, denso de canto) y chorros en hélice.
- **Nubes de la Tierra**: franja de tormentas ecuatorial, desiertos subtropicales despejados y borrascas en espiral que giran según el hemisferio.

## Vigesimotercera pasada: un universo con proporciones coherentes (19 de octubre)

- **El problema**: las galaxias del fondo eran de 7 a 17 veces más grandes que la de Xiomara, y todo lo cercano (nebulosas, soles, Deneb, Sagitario A*) seguía viéndose desde el cuásar, amontonado y plano. Por eso, desde allí, todo parecía cerca y la galaxia de Xiomara un puntito.
- **Distancias en tres niveles**:
  - Las estrellas de fondo y las galaxias pasan a `ESCALA_FONDO` (×40), desde el cuásar siguen igual de lejanas.
  - El cuásar (×3) y TON 618 (×4) son extragalácticos: más lejos y más grandes, con el mismo aspecto desde casa. La galaxia anfitriona del cuásar es más pequeña.
  - Se quita el cúmulo de galaxias que rodeaba al cuásar.
- **Lo cercano se desvanece al alejarse**: nebulosas, soles gigantes, Deneb, Sagitario A*, el púlsar, la supernova y los cometas (salvo lo que se visita). Las nebulosas miran siempre a la cámara: ya no se ven planas de canto.
- **La galaxia de Xiomara desde lejos**: sus puntos se sustituyen poco a poco por su imagen (espiral rosa de cinco brazos), que conserva un tamaño visible a la distancia en vez de un punto brillante verdoso.
- **Supernova**:
  - Cuando le llega la hora, la escena viaja sola hasta ella desde donde se esté, también desde el sistema solar. Si hay una carta o un panel abierto, espera.
  - Cuenta atrás de 8 s: se hincha, los lóbulos se encienden, expulsa tres anillos de gas y, en el último medio segundo, se colapsa y se apaga.
  - Luego estalla, con un temblor de cámara, fragmentos en dedos de Rayleigh–Taylor más visibles y una nebulosa con más color. Al final vuelve a casa.

## Vigesimocuarta pasada: un universo lleno desde cualquier punto (19 de octubre)

- **Desde el cuásar ya no está vacío**: lo cercano no se desvanece. El púlsar, los soles, Deneb y Sagitario A* se ven a su distancia, más pequeños.
- **Nebulosas en 3D**:
  - Pasan a la capa más lejana (`ESCALA_FONDO`), con el mismo tamaño aparente desde casa.
  - Cada una es una nube de siete capas a distintas profundidades, estiradas en direcciones distintas y mirando siempre a la cámara (instancias, una llamada de dibujo por nebulosa). Así se ven enormes y lejanas desde cualquier sitio y nunca planas.
  - Hay entre 8 y 12 nebulosas nuevas repartidas por todo el cielo.
- **Más galaxias**: 34 medianas y entre 170 y 280 de campo profundo, todas a ×40.
- **Salto a la velocidad de la luz** (salto.js): desenfoque radial hacia el destino, centro azulado y bordes rojizos (Doppler) y un ligero túnel, solo durante los viajes y con la fuerza de la velocidad real.
- **Púlsar**: estrella de neutrones visible, con puntos calientes en los polos magnéticos. La nebulosa se aviva cada vez que un haz barre hacia la cámara.
- **Cuásar**: lóbulos de radio violeta al final de los chorros, con su punto caliente (como Cygnus A).
- **Sistema solar completo**:
  - Mercurio, Venus, Marte, Saturno (anillos con la división de Cassini y la sombra del planeta), Urano (inclinado) y Neptuno, con colores en sRGB.
  - Órbitas tenues de todos alrededor del Sol, que también cuentan como obstáculos en los vuelos.
- **Sol**: protuberancias en arco que laten, disco con granulación visible (menos quemado) y resplandores que conservan su tamaño en el cielo al acercarse.

## Vigesimoquinta pasada: la lógica de las distancias (19 de octubre)

- **El problema**: las nebulosas, al pasar a la capa lejana, conservaban su distancia real a casa (unos 200 000). Desde el cuásar quedaban junto a la galaxia de Xiomara mientras desde casa parecían lejísimos. Además, los soles y las enanas rojas (a unos 80 000) se veían «al lado» desde el púlsar o el cuásar.
- **Tres niveles coherentes**:
  1. La galaxia de Xiomara en el centro.
  2. Lo que se visita, en el cosmos (`ESCALA_CIELO` = 40): Deneb, el púlsar, Sagitario A*, la supernova, TON 618 y el cuásar. Se queda quieto en los viajes lejanos y se ve más pequeño desde lejos.
  3. El fondo: nebulosas 3D, galaxias, estrellas lejanas y el decor (soles gigantes, enanas rojas y cometas). Está a ×160 y acompaña siempre a la cámara, también en los viajes lejanos: es infinitamente lejano y se ve igual desde cualquier punto, como el cielo real.
- **Viajes**: más largos, de unos 8 s a Sagitario A* a unos 18 s al cuásar.
- **Lente gravitacional**: solo deforma cuando se visita ese agujero (mirándolo desde él). Ya no deforma la galaxia u otras cosas cuando el agujero solo pasa por la pantalla.
- **La galaxia de Xiomara desde muy lejos**: su imagen crece algo más con la distancia, para que se note sin ser un punto.

## Vigesimosexta pasada: todo desde el principio, saltos más reales y gigantes inmensos (19 de octubre)

- **Nada aparece tarde**:
  - Las texturas se calculan con varios workers en paralelo (uno por núcleo libre, hasta 4).
  - Las nebulosas y galaxias forman parte de la carga, que ocurre durante la presentación: al entrar ya están.
  - Carga simulada con la CPU 4 veces más lenta: unos 2,6–2,8 s.
- **Nebulosas como en las fotos** (nuevo `nebulosaFondo`):
  - Gas con doble deformación del ruido y frentes de ionización suaves.
  - Columnas y vetas de polvo, filamentos y un cúmulo de estrellas jóvenes dentro.
  - Colores por zonas (oxígeno junto a las estrellas, hidrógeno en el cuerpo, azufre en los bordes) y una paleta del Hubble.
- **Salto a la velocidad de la luz**:
  - Sin desenfoque: aberración (el cielo se agolpa delante), Doppler y túnel suave.
  - Al romper la velocidad, una onda de luz se abre desde el destino con un destello.
  - La duración de todos los viajes depende de la distancia, también al volver a casa desde lejos, con estelas a fondo.
- **La galaxia de Xiomara siempre crece al acercarse**: su tamaño en el cielo es monótono con la distancia (antes la imagen lejana encogía al acercarse).
- **TON 618 inmenso**:
  - Está a ×16 (millones de unidades) y es enorme en proporción.
  - Alrededor tiene un disco de miles de estrellas que giran a su alrededor y dos chorros relativistas.
- **Sagitario A***: está a ×4, con las estrellas S en órbitas keplerianas muy alargadas y sus órbitas tenues.
- **Deneb**: ×3 más lejos y más sutil.
- **El fondo**: pasa a ×640, siempre detrás de todo.
- **Cuásar**: en el corazón de una galaxia espiral (mismo plano que su disco). Se quitan los lóbulos de los extremos.
- **Púlsar**: la nebulosa del Cangrejo en 3D (nueve capas, nube.js), que se aviva con el barrido de los haces.

## Vigesimoséptima pasada: velocidad de la luz recuperada, corazón visible y cielo más fino (19 de octubre)

Esta pasada parte del trabajo de Codex sin confirmar (supernova de amor, volumen de nebulosas, perfiles de viaje). Hay una copia de ese estado en `git stash` («Copia del estado de Codex (19 oct)…»).

- **Velocidad de la luz** (`velocidad.js`): vuelven las estelas 3D alrededor de la cámara. Salen del punto hacia el que se viaja de verdad (la velocidad real de la cámara) y se curvan cuando cambia el rumbo. Se activan en los viajes y en los acercamientos fuertes, y al girar rápido se arrastran de lado (`uGiro`, el contrato de la prueba de Codex). Tienen un túnel libre en el centro para que el destino se vea. Su velocidad aparente ya no se congela con el `near` adaptativo de los saltos enormes. Todo cuelga de un único objeto de la cámara.
- **Viajes lejanos**: primero la cámara se gira hacia el centro del destino casi sin moverse. Luego sale disparada en línea recta, con puntos de paso sobre la recta, y solo al final se curva alrededor del destino.
- **Supernova de amor desde casa**: el remanente pasa de 90 000 a 60 000 unidades (×40) y de ×2 a ×2,6, sigue cumpliendo la prueba de Codex y se coloca en (−1°, −20°). En vertical queda entre el título y la tarjeta. En PC queda junto a la galaxia, y su luz atraviesa el disco, que es casi transparente.
- **Sagitario A***: Codex cambió su anillo por un toro con un shader pensado para un plano, y eso dibujaba un círculo grueso. Vuelve el anillo plano que mira a la posición de la cámara, ahora con un anillo de fotones finísimo, una media luna, gas en espiral, un destello que orbita y un halo. Es periódico en el ángulo, así que no tiene costura.
- **Vía Láctea** (`cielo.js`): nubes estelares a varias escalas con grano de estrellas sin resolver, grandes nubes junto al centro, polvo en cintas suaves y nebulosas oscuras como el Saco de Carbón. Junto al polvo la luz se enrojece y hay nudos rosados como la Laguna con un halo azul. Más contraste, sin aspecto de mármol.
- **Nebulosas** (`nube.js`): la imagen se lee donde el rayo cruza el plano central, con un paralaje leve. Antes se estiraba en rayas desde el centro. Las del cielo se orientan hacia casa, tienen colores intensos con bordes cálidos y núcleos fríos, y el polvo oscuro solo aparece dentro del gas.

## Vigesimoctava pasada: encuadre del corazón y una supernova como las de verdad (19 de octubre)

- **Encuadre del corazón** (`index.js`, `encuadreCorazon`): antes la cámara apuntaba 0,6 radios por debajo del centro, así que en PC el corazón quedaba cortado por arriba. Ahora se mide la caja real de la figura y la franja de pantalla que dejan libres la cabecera y el texto, reservando el texto más largo. El centro del corazón queda en el centro de esa franja, entero y con margen, en vertical y en horizontal. Se elige el lado de vista sin nebulosas del fondo detrás (`vistaLibre`) y el corazón se gira hacia ese punto (`mirarA`).
- **La explosión**, basada en una supernova de colapso del núcleo (tipo II, como la SN 1987A):
  1. Supergigante roja con pocas celdas de convección gigantes que laten cada vez más fuerte.
  2. Colapso: la estrella deja de latir y se apaga un instante.
  3. Ruptura del choque: un destello breve y azul blanquecino.
  4. Bola de fuego: plasma que hierve y se enfría de azul blanco a amarillo, naranja y rojo, y que al volverse transparente se rompe en grumos y dedos de Rayleigh-Taylor.
  5. La eyecta sale en grumos con su color de temperatura.
  6. El anillo circunestelar se enciende como un collar de perlas irregulares.
  7. Ecos de luz finos en el polvo y un frente de choque azulado, que solo se dibuja si la cámara está fuera.
  8. Remanente con filamentos verdes de oxígeno y dorados, que forman el corazón.
- La cámara empieza a alejarse en el colapso, para no quedar dentro de la bola de fuego.
- **Penumbra de la ceremonia**: pasa a ser un degradado CSS sobre el lienzo. Se descartó la pasada de posproceso.

## Vigesimonovena pasada: la supernova, lejísimos e inmensa (19 de octubre)

- Antes estaba a 2,4 millones de unidades con un corazón de unos 0,3 millones. Las nebulosas están a unos 13 millones y miden unos 4. Por eso, desde el cuásar, el púlsar o TON 618, se movía mucho sobre el fondo y parecía cercana y pequeña.
- Ahora está a **16 millones** (`DISTANCIA_SUPERNOVA` 400 000 ×40), más allá de las nebulosas, y es **×40** (`ESCALA_SUPERNOVA`). Ocupa unos 17° de cielo, del orden de una nebulosa, y apenas se desplaza entre casa, el cuásar o el púlsar (8,4–8,5° de radio aparente; 7,2° desde TON 618).
- Está en (12°, −30°), en una zona libre, separada de las demás nebulosas (zona ocupada de 10°). De lejos su gas brilla más, como el de las demás nebulosas.
- La prueba de Codex se ajusta a la petición: la supernova está más allá de los 14 millones y ocupa entre 0,2 y 0,35 radianes.
- Como todo es proporcional, la visita, la explosión y el encuadre del corazón se comportan igual que antes.

## Trigésima pasada: corazón fijo, viajes rectos, tarjeta como los demás lugares (19 de octubre)

- **Luces que se acercaban y giraban**: eran las «dos luces» de Codex, en órbitas que salían hacia la cámara, dentro del corazón y alrededor de la estrella. Ahora hay una binaria real en el plano del corazón: una gigante azul (más masiva, órbita menor) y una enana roja. Las luces de alrededor de la estrella se quitan.
- **Gigantes azules en el cielo**: se añaden Rigel, Alnilam y Naos. Las burbujas de gas quedan solo para las hipergigantes rojas y la estrella Pistola.
- **El corazón mira a casa** (`orientarHacia`), fijo: ya no se gira hacia la cámara. La cámara se coloca delante de él.
- **Viajes lejanos**: primero un giro lento de unos 2,4 s hacia el destino sin moverse. Después una recta hacia él con puntos sobre la recta, que ya no rodea el destino, y la cámara se detiene delante a buena distancia, lista para girar y acercarse. La vuelta a casa desde lejos hace lo mismo.
- **Brillo de los soles**: se dibuja después de las nebulosas y galaxias lejanas, así que la luz de Deneb pasa por delante de ellas. Se baja su destello grande, que formaba un disco con el umbral del brillo.
- **La supernova como lugar**: al llegar al corazón ya nacido, la tarjeta es la de siempre («Donde nuestra luz se encontró», con su texto, «Volver a sentirlo» y «Volver al centro» a la izquierda). La ceremonia solo ocurre al volver a sentirlo o en la primera explosión: sin botones arriba, solo el texto. Al terminar se cierra sola y la interfaz despierta, aunque nadie haya tocado la pantalla.
- **Antes del estallido**: las ondas de pulsación salen de la superficie cada vez más seguidas. La corona, el brillo y las prominencias crecen con la estrella.
- **Después**: el frente de choque y los ecos de luz se desvanecen suavemente, sin aparecer ni desaparecer de golpe.
- **Velocidad al girar de lado**: las estelas recorren el eje a ambos lados de la cámara y el giro marca su velocidad aparente, así que el barrido lateral es nítido y llena la pantalla. Ya no cambia de sentido a cada cuadro.

## Trigésima primera pasada: nebulosas lejanísimas, cielo quieto y estelas sutiles (19 de octubre)

- **Nebulosas al lado del corazón** (vídeo del 19 de octubre): Codex las fijó a unos 13 millones de unidades, en la misma zona que la supernova (16 millones), así que en 3D eran sus vecinas. Ahora acompañan a la cámara como el resto del fondo: están infinitamente lejos y se ven en el mismo sitio y del mismo tamaño desde casa, desde el corazón o desde el cuásar. Siguen siendo volúmenes 3D, son más masivas (×1,75 en vez de ×1,36) y el corazón se queda tal cual.
- **Soles que daban vueltas**: era el giro automático alrededor del destino, que hacía rodar todo el cielo. En los destinos lejanos ya no hay giro automático (en el gigante gaseoso sí).
- **Estelas al girar o acercarse**: son un apunte sutil, la mitad de estelas, solo hacia los bordes y más cortas, con el centro limpio. En los viajes siguen llenando la vista.

## Trigésima segunda pasada: el cielo no se mueve solo, la supernova inmensa y la galaxia de Xiomara visible de lejos (19 de octubre)

- **Soles, estrellas y cometas que se movían solos** (desde el corazón, el cuásar…): la cámara «respira» cuando está quieta, acercándose y alejándose un 1,4 %. Cerca del corazón eso son unas 100 000 unidades. El cielo lejano se colocaba antes de esa respiración, así que parecía acercarse, alejarse y desplazarse de lado. Ahora se coloca con la posición final de la cámara en cada cuadro. Medido en 6 s: 0° de variación en los soles (antes hasta 12°). Solo Deneb, que es un objeto real, se mueve unas décimas de grado por paralaje.
- **La supernova del tamaño de las nebulosas**: ×56, unos 24° de cielo desde casa, en el mismo sitio.
- **La galaxia de Xiomara desde lejos**: desde el cuásar, TON 618 o el corazón medía menos de una décima de grado. Ahora tiene una imagen lejana en el plano de su disco, que gira con ella y conserva unos 5° de radio. Al acercarse se funde con la galaxia real, nunca encoge, y vista de canto se inclina lo justo para que se reconozca la espiral.
- **Arranque de los viajes**: el punto de fuga de las estelas nace ya en la dirección del viaje, en el centro, y no viene desde un lado.

## Trigésima tercera pasada: la galaxia no desaparece al salir, destinos sobre la galaxia y nebulosas repartidas (19 de octubre)

- **La galaxia se volvía transparente al salir hacia la supernova** (o hacia cualquier destino lejano): el plano cercano de la cámara se calculaba con la distancia al objetivo. Al girar hacia un destino a millones de unidades subía a 5000 y recortaba la galaxia, que estaba a unas 1000. Ahora se mide con lo que de verdad está cerca: el objetivo o la galaxia. Igual con el tamaño de los puntos y símbolos de la galaxia, que se hinchaban.
- **Destinos sobre la galaxia**: desde casa, la cámara mira desde arriba y el cielo visible sobre el disco es la franja de unos −14° a +3°. Todo lo que se visita está en esa franja: la supernova al frente (0°, −1°), el púlsar a −80°, Sagitario A* a 72° (el centro de la Vía Láctea se mueve con él), TON 618 a 150° y el cuásar a −145°. Al girar la cámara alrededor, aparecen uno a uno sobre la galaxia. Se apartan algunos soles que estorbaban: Pólux, la estrella Pistola, Betelgeuse y VY CMa.
- **Nebulosas**: 14 repartidas por todo el cielo, de 4° a 8° de radio (×1,3), sin solaparse con los destinos, los soles ni entre sí. La distribución está comprobada con un script. Las extra aleatorias pasan a 4 en móvil y 6 en PC.
- **Móvil (vertical)**: en casa la galaxia queda algo más abajo y la cámara algo más baja (unos 34°), para que asome la franja de cielo con los destinos.

## Trigésima cuarta pasada: un universo con distancias reales (19 de octubre)

- **La línea junto al púlsar**: la nebulosa del Cangrejo, igual que todas, tomaba la imagen de un solo plano. Vista de lado se aplanaba en un panel con un borde recto y sus estrellas se estiraban en rayitas. Ahora se lee en tres planos (de frente, de lado y desde arriba), mezclados según desde dónde se mira (`nube.js`). Es un volumen desde cualquier ángulo.
- **Distancias reales**: el plano lejano de la cámara pasa de 8·10⁷ a 10¹². El cercano se adapta con más margen (hasta 2·10⁷), así que la precisión no depende del lejano. El fondo infinito (estrellas, soles, campo profundo) se aleja con el plano cercano: mismo tamaño en el cielo, nunca recortado. El polvo cercano se calcula respecto a la cámara (era impreciso a miles de millones de unidades).
- **La supernova**: a 3000 millones de unidades (DISTANCIA 7,5·10⁷ ×40, unas 190 veces más lejos) y ×10 600. Desde casa ocupa el mismo cielo (unos 24°).
- **Nebulosas**: en coordenadas reales, de 300 a 3000 millones de unidades, algunas más allá de la supernova. Las extra, de 1500 a 6000 millones. Desde casa ocupan el mismo ángulo que antes; al viajar crecen y se pasa a su lado.
- **Galaxias con nombre** (Andrómeda y sus satélites, la colisión y las de alrededor): estaban calculadas pero no se dibujaban. Ahora están a su distancia real, de 6000 a 40 000 millones. El campo profundo sigue siendo fondo infinito.
- **La galaxia de Xiomara de lejos** pasa a ser 3D: miles de estrellas en sus mismos brazos con el grosor del disco, el bulbo dorado y el resplandor difuso. Gira con ella, conserva unos 5° de radio como mínimo, se inclina si se ve de canto y se funde con la real al acercarse.

## Trigésima quinta pasada: un modelo coherente del universo (19 de octubre)

Una sola regla en vez de parches: **se ve lo que tiene tamaño para verse desde donde estás**.

- **La galaxia «desaparecía» al salir**: el perfil del viaje recorría distancias de miles de millones en línea casi recta, así que la cámara estaba a 744 000 unidades de casa en 1 s (la galaxia mide ~2000). Ahora el viaje es logarítmico, como «Potencias de diez» (`avanceLogaritmico`): cada factor 10 de distancia dura lo mismo, los tramos cercanos un poco más rápido (peso 0,3 hasta 2·10⁶) y los del universo con más calma. Al salir se ve la galaxia alejarse y encoger; al llegar, el destino crece con calma. La vuelta a casa llega de frente por el eje del encuadre, sin cruzar la galaxia.
- **Visibilidad por tamaño aparente**: nebulosas (por encima de unos 1,4–3,4° de caja), galaxias con nombre (0,2–0,7°), destinos (0,5° de su cuerpo) y nuestra galaxia, que ahora tiene **su tamaño real** (se quita el mínimo artificial que la hacía más grande que las nebulosas vista desde la supernova). Desde la supernova no se ven el púlsar, los agujeros negros, el cuásar ni nuestra galaxia; al volver aparecen cada uno en su sitio, separados, no «en fila».
- **Lo nuestro se queda en casa**: soles, enanas rojas y estrellas fugaces solo se ven a menos de 1,5·10⁸ de casa.
- **Destinos 10 veces más separados** (ESCALA_CIELO 40 → 400): el púlsar a ~6·10⁶, Sagitario A* a ~10⁷, el cuásar a ~2·10⁷, Deneb a ~2,6·10⁷, TON 618 a ~5·10⁷ y la supernova a 3·10¹⁰. Nebulosas de 3·10⁹ a 3·10¹⁰ (algunas más allá) y galaxias con nombre de 6·10¹⁰ a 4·10¹¹. Desde casa todo ocupa el mismo cielo.
- **El universo que se descubre**: por el camino hasta la supernova (en todos los órdenes de magnitud) y a su alrededor hay entre 110 y 190 galaxias, entre 9000 y 18 000 estrellas y entre 3 y 5 nebulosas. Cada una es demasiado pequeña o tenue para verse desde casa (su tamaño o brillo es proporcional a su distancia a casa) y aparece al acercarse: en el viaje pasan a los lados y llegan más galaxias.
- El plano cercano se adapta hasta 10⁸ y el fondo infinito se aleja con él.

## Trigésima sexta pasada: todo medido con nuestra galaxia, otro sistema detrás de la supernova y entrada más rápida (19 de octubre)

- **La vara de medir es nuestra galaxia** (radio ~1000), con ESCALA_CIELO = 1:
  - Destinos: el púlsar a 16 000, Sagitario A* a 26 000, el cuásar a 48 000, Deneb a 66 000 y TON 618 a 120 000.
  - La supernova a 200 000, el destino más lejano, con ×28: unos 24° desde casa.
  - Nebulosas más allá, de 300 000 a 730 000 y un 20 % más grandes.
  - Galaxias con nombre con tamaño físico de galaxia (radio 700–3000): Andrómeda a unas 25 veces nuestro radio, como en la realidad.
  - Desde la supernova, nuestra galaxia se ve pequeña igual que las demás. Ya no hay galaxias enormes junto a una nuestra invisible.
- **Otro sistema detrás de la supernova**: una galaxia entera en 3D (`galaxia3d.js`, radio 20 000, azul y dorada), con nebulosas y galaxias alrededor. No se ve desde casa; aparece y crece al acercarse.
- **Visibilidad**: los destinos necesitan ~1° de su cuerpo para verse (Deneb, una estrella, ~0,35°). Desde muy lejos no aparecen sus haces ni sus discos.
- **El punto de fuga de las estelas no se escapa hacia un lado**: al corazón se llega en la recta hacia el punto que se mira.
- **Entrada**: las nebulosas comparten 12 imágenes y 6 densidades 3D (antes, una por nebulosa: ~25 texturas y ~27 densidades). Las que no se ven desde casa y la galaxia lejana se generan en segundo plano. El botón de entrar está listo antes: 3,1 s frente a 4,3 s en PC y 3,7 s frente a 4,9 s en el móvil simulado. Además se compila todo durante la carga, también lo que aún no se ve (vecindario, la otra galaxia, la explosión), así que nada se compila por primera vez durante un viaje.

> A partir de aquí la especificación vigente (escala, regiones, LOD, lente, nebulosas, supernova, viajes y encuadre) está en [ESCALA-Y-ESPACIO.md](ESCALA-Y-ESPACIO.md). Las cifras de pasadas anteriores (supernova a 200 000, ×28, Deneb a 66 000, galaxia hermana de radio 20 000) quedaron superadas: hoy la supernova está a 50 000 (×7), Deneb a 25 200 y la galaxia hermana tiene radio 4 000.

## Trigésima séptima pasada: una regla espacial auditada (19 de octubre)

- **Jerarquía**: la progenitora pasa de radio ≈770 (casi como Xiomara) a ≈46. Tabla y geometría coinciden (`cosmos.medidas()` y pruebas). Se elimina el escalado vestigial por «alfa» de cosmos.js.
- **Proyección**: helpers de esfera (`2·asin`, `f·r/√(d²−r²)`) y disco (`f·r/d`), contrastados con la cámara real de three.
- **Lente gravitacional por geometría**: ya no depende del destino. Se suspende si un cuerpo más cercano se solapa con su zona.
- **Profundidad**: el horizonte del agujero de casa deja `AlwaysDepth` y pasa a `LessEqual`.
- **Estrellas S de Sagitario A***: siempre visibles; las guías de órbita, solo al visitarlo.
- **Supernova**:
  - pulsaciones como plasma fragmentado;
  - eco de luz más rápido que la onda de material (con prueba);
  - la cámara ya no queda dentro del corazón al terminar la explosión (límites del zoom del remanente).
- **Encuadre adaptable** al girar o redimensionar. Corrige el corte del corazón al pasar de horizontal a 430×775.
- **Xiomara**:
  - LOD por tamaño en pantalla, con fundido común y sin suelo de opacidad;
  - los símbolos de casa se desvanecen al alejarse.
- **Galaxias del campo**:
  - descriptor compartido imagen/estrellas 3D (con prueba);
  - lotes espaciales con recorte y activación;
  - la luz difusa se conserva de cerca.
- **Nebulosas**: dibujo anclado a la nube, lámina con grosor propio y sin estrellas pintadas en el gas.
- **Rutas**: los cuerpos del cosmos son obstáculos. Las cuatro rutas pedidas, sin atravesar nada y con tamaños monótonos.

## Trigésima octava pasada: coherencia espacial y visual, móviles y consumo medido (19 de octubre)

Parte de e5d62b6. Codex había dejado sin commit una corrección del encuadre tras girar durante un vuelo; esos cambios se perdieron (se restauraron los archivos) y se reaplicaron aquí con su prueba, ampliados.

- **Encuadre**:
  - corrección al llegar si la pantalla gira o la interfaz cambia durante un vuelo;
  - ajuste con tiempo real en pausa (el universo sigue congelado);
  - reencuadre por cambios de interfaz sin redimensionar (umbral del 4 %);
  - durante el colapso y la explosión, el encuadre ya es el del corazón.
- **Identidad imagen/estrellas** (`formasGalaxia.js`): una sola descripción de forma para la imagen y las estrellas, incluidas Andrómeda (enrollamiento 7,2, anillo, polvo) y la colisión (núcleos, colas). Las imágenes son idénticas byte a byte; las estrellas eran el reflejo vertical de su imagen (flipY) y ya no.
- **Profundidad**: TON 618 y Sagitario A* hacen la prueba de profundidad frente al resto (antes, hasta un 15 % de su luz se pintaba encima de un cuerpo opaco delante). La lente se atenúa sin saltos.
- **Luz continua**: medida antes del brillo.
  - Galaxias del campo: ±2 % de 25 a 120 px, de frente, inclinadas y fuera del eje; sin la doble atenuación a².
  - Xiomara: 0,96–1,07 (antes ×3,7 y con partes cercanas que no se fundían).
- **Medidas y rutas**:
  - límites desde la geometría, con radio de navegación;
  - rutas desviadas por un lado y comprobadas por segmentos sobre la curva final;
  - la supernova navega según su estado.
- **Nebulosas**: detalle 3D multiescala y deformación por capas (vetas laterales 0,49 → 0,35), muestras según el recorrido del rayo; documentado qué es cálculo y qué interpretación.
- **Jerarquía en destinos lejanos**: las nebulosas que no son parte del destino bajan al 78 % de brillo con suavidad.
- **Pruebas**: `npm run test:navegador` con criterios de aceptación y código de salida (encuadre, profundidad, brillo, xiomara, geometria, nebulosas, rendimiento).
- **El Cangrejo** se orienta hacia casa como las demás nebulosas: al llegar al púlsar ya no se ve de canto, en vetas.

### Rendimiento

Condiciones: Chromium sin ventana con la GPU real de este PC (Vulkan), calidad alta. El «móvil» es una emulación de 430×775 con DPR 3 (uPR 2): mide la CPU y el trabajo enviado, no un teléfono.

| Fase | Cuadros/s | Intervalo p50 / p95 / p99 (ms) | CPU p50 / p95 (ms) | Llamadas | Puntos |
|---|---|---|---|---|---|
| PC · casa | 60 | 16,6 / 18,1 / 19,1 | 3,8 / 5,2 | 221 | 225 000 |
| PC · casa sin transparencias | 60 | 16,7 / 17,7 / 18,5 | 2,6 / 3,6 | 100 | 230 000 |
| PC · viaje a TON 618 | 60 | 16,7 / 17,7 / 18,3 | 3,0 / 3,9 | 141 | 42 000 |
| PC · supernova | 60 | 16,7 / 17,9 / 19,1 | 3,0 / 4,0 | 130 | 71 000 |
| PC · lectura (panel abierto) | 0 (no dibuja) | — | — | 0 | 0 |
| PC · casa, minutos 1, 2 y 3 | 60 | p99 19,1 / 18,8 / 18,6 | 3,6 / 3,4 / 2,9 | 212–223 | — |
| Móvil emulado · casa (contemplación) | 30 | 33,3 / 34,5 / 35,6 | 3,4 / 4,8 | 213 | 220 000 |
| Móvil emulado · TON 618 | 30 | 33,3 / 34,4 / 34,9 | 2,8 / 3,8 | 119 | 37 000 |

- **Memoria estimada**:
  - PC: texturas 79 MB y destinos de dibujo 32 MB;
  - móvil emulado: texturas 69 MB y destinos de dibujo 33 MB (a 1290×2325);
  - unos 400 000 vértices en total.
- **Coste por capa** (en casa): quitar las transparencias que no son puntos ni nebulosas baja la CPU un 30 % y las llamadas de 221 a 100. Las nebulosas, el postprocesado y los lotes de galaxias apenas cambian la CPU.
- **Lotes de galaxias**: desde casa hay 13 de 32 activos (41 100 de 81 400 puntos). Cada lote activo tiene alguna galaxia por encima de 35 px y ningún inactivo la tiene.
- **GPU**: la consulta de tiempo envuelve el cuadro completo y devuelve 0,2–0,5 ms, pero no baja al quitar capas. Sin ventana no es fiable y no se usa como dato.
- **Pendiente**: la sesión de 15–20 minutos en un **teléfono físico** (dispositivo, navegador, brillo, batería, temperatura percibida, principio frente a final). No hay acceso a uno desde este entorno. Tampoco se ha probado en Safari real.

## Trigésima novena pasada: un paisaje con espacio alrededor de la supernova (20 de octubre)

- **Causa de la concentración**, medida en la escena:
  - 120 galaxias procedurales del «vecindario», de radio ~760, la mitad en una cáscara de 15 000–34 000 alrededor del corazón y el resto en un cono a lo largo del camino;
  - 4 800 estrellas en esa misma cáscara;
  - 5 nebulosas en anillo a ~32 000 del corazón;
  - la galaxia hermana pegada detrás (24 500);
  - galaxias con nombre de radio pequeño, que por eso quedaban a 40 000–80 000 y rodeaban la región;
  - el fondo remoto (nebulosas colosales y campo profundo) justo detrás del corazón desde la llegada.

  En total, 135 objetos a menos de 40 000 del corazón y 30 sobre su silueta desde la llegada.
- **Rediseño** (`js/data/paisaje.js`): 18 galaxias y 6 nebulosas en lugares elegidos, en tres regiones (camino, más allá y otras direcciones). Grandes (r 1 600–13 000), ninguna a menos de 30 000 del corazón ni sobre su silueta desde la llegada.
  - Galaxias con nombre: el mismo tamaño en el cielo de casa, pero físicamente grandes y lejanas; los satélites de Andrómeda, a su distancia.
  - 30° de cielo libre alrededor de la dirección de la supernova para el fondo remoto y las galaxias con nombre.
  - Estrellas del volumen: nunca a menos de 32 000 del corazón.
- **Medido**:
  - 0 objetos a menos de 30 000 del corazón (antes 32 a menos de 20 000);
  - en 36 órbitas, 5,3 objetos de media sobre la silueta (antes 21,3);
  - separación mediana entre galaxias de 45 000 (antes 6 900);
  - crecimiento por perspectiva hasta 1,7× en el tramo final, ~1,1× en lo lejano y 0,5× en lo que se deja atrás.
- **Pruebas**: `tests/paisaje.test.js` y `tests/navegador/paisaje.mjs`. Capturas comparables en `.pruebas/paisaje/` (ruta Xiomara → supernova → Xiomara al 0/25/50/75/100 % del espacio recorrido, órbitas, vista hacia Xiomara y mapa 3D), en PC y móvil **simulado**.
- **Corregido en las pruebas de navegador**: `evaluate(() => visitar())` esperaba al final del viaje y `querySelector('canvas')` leía otro lienzo. Por eso «giro durante el viaje», la cancelación de rutas y la medición del viaje no ocurrían en vuelo. Ahora sí, y siguen pasando.

## Cuadragésima pasada: vuelo por fases y universo por catálogo (20 de octubre)

- **Vuelo por fases** (`js/util/vuelo.js`): adquirir, salir a un punto despejado, alinear, romper, cruzar en línea recta y frenar. Todo se planifica antes de despegar y el corredor se comprueba con los radios de navegación.
- **Catálogo persistente** (`js/data/catalogo.js`): galaxias con identificador, posición, radio y orientación fijos, separadas por distancias intergalácticas. Sustituyó al paisaje de la supernova, a las nebulosas colosales y a las galaxias colocadas por su tamaño en el cielo de casa.
- **Luz no resuelta**: un punto por galaxia con el flujo de su imagen, fundido con ella.
- **Vía Láctea**: galaxia 3D con centro en Sagitario A*; el cubemap ya no hornea la banda.
- Detalle en `docs/ESCALA-Y-ESPACIO.md` (secciones 2, 2 bis, 5 y 9 de entonces).

## Cuadragésima primera pasada: un universo de 100 millones de años luz (20 de octubre)

El encargo era un viaje intergaláctico de 100 millones de años luz desde Xiomara hasta el corazón, no despejar el entorno de la supernova.

- **Escala**:
  - 1 u ≈ 51 años luz;
  - la supernova a 100 Mal (1 960 784 u), TON 618 a 140 Mal, el cuásar a 30 Mal;
  - una sola fuente para las posiciones de los destinos (`js/data/sitios.js`).
- **Universo** (`js/data/catalogo.js`, 303 galaxias y 32 nebulosas, determinista):
  - región de salida;
  - 11 encuentros diseñados en el camino principal entre los hitos de 1, 10, 35, 65, 90 y 100 Mal (más 6 en los caminos a TON 618 y al cuásar);
  - región de llegada a 3,9–10,5 Mal del corazón;
  - población en 46 grupos y filamentos por todo el volumen, con vacíos (el 75 % fuera del camino);
  - ninguna galaxia independiente a menos de 3,6 Mal del corazón.
- **Viaje** (fases A–G):
  - velocidad proporcional a la distancia a lo más cercano y hasta 7 veces más despacio con un encuentro a la vista;
  - mirada que se inclina hasta 20° hacia lo que se cruza;
  - velocidad suavizada en el tiempo;
  - ruptura con doble frente de luz y golpe de brillo;
  - estelas más tenues y con el centro despejado en el crucero;
  - **Saltar ⏭** y **Viaje breve**;
  - región, encuentro y distancia en la interfaz.

  Viaje completo: 56–57 s, de los que 38 s son encuentros; cada galaxia supera 40 px durante 2–2,8 s.
- **Nebulosas recuperadas**: habían desaparecido porque las regiones H II que quedaban medían 90–150 u (pocos píxeles). Ahora:
  - están ampliadas ×25 (declarado) dentro de galaxias;
  - tienen seis formas (emisión, cavidad, pilares, filamentos, reflexión, oscura);
  - se orientan para no verse de canto al pasar;
  - se crean al acercarse (a ~1 px).

  Se probó un volumen sin imagen (32³) y se descartó: de cerca eran burbujas borrosas con bordes de caja.
- **Luz de galaxias lejanas**:
  - compresión perceptiva declarada por debajo de 1,5 px (flujo ∝ px en vez de px²);
  - estrellas 3D generadas al acercarse con semilla por identificador, en coordenadas locales, y liberadas al alejarse;
  - el catálogo igualado al brillo superficial de Xiomara.
- **Xiomara**:
  - se reconocía menos porque tenía un 60 % de la luz por área del catálogo y un bulbo con pico 3×. Se corrigió con un bulbo más suave y el catálogo a su brillo superficial, sin cambiar su tamaño;
  - **«Mirar hacia casa»**: acercamiento óptico (campo de visión estrecho) sin mover ni agrandar nada.
- **Vía Láctea**: poblaciones de color, regiones H II, cúmulos, plumas, grietas de polvo como ausencia de luz y polvo grande y suave.
- **Artefactos oscuros**: la causa aislada por capas fue el polvo de la Vía Láctea, miles de motas oscuras dibujadas después de todo. Desde dentro (Sagitario A*) formaba manchas y fragmentación oscuras sobre el fondo; con la capa oculta desaparecían. En la versión nueva no aparecen.
  - Comparación en `.pruebas/capas/antes` y `.pruebas/capas/c1` (móvil emulado).
  - El cubemap solo no muestra bloques.
  - La imagen original del encargo no estaba disponible: es la causa más probable, no la única posible.
- **Precisión**: con geometría local, el error float32 a 100–140 Mal es de 2·10⁻⁵ px (`tests/precision.test.js`). No hizo falta un origen flotante.
- **Plano cercano**: ahora se calcula con lo más cercano del universo, para no recortar las galaxias que se cruzan a mitad de viaje.
- **Estrellas locales**: se apagan en el espacio intergaláctico.
- **Corazón**: tiene luz no resuelta desde lejos.

## Cuadragésima segunda pasada: gigantes visibles desde casa, viaje más rápido que la luz y un universo nuevo en cada destino (20 de octubre)

Pedido de Carlos: los gigantes (supernova, cuásar, púlsar, TON 618…) son enormes y deben verse desde Xiomara; desde ellos, Xiomara es una galaxia más. El viaje, recto hacia el destino y sin movimientos de cámara, rapidísimo, con galaxias y nebulosas que crecen y pasan por los bordes, atravesando alguna nebulosa por dentro. Al llegar, un universo nuevo detrás: galaxias lejanas, otro cielo y constelaciones nuevas.

- Escalas nuevas de los gigantes y faro de la supergigante; tabla y medidas actualizadas (ver ESCALA-Y-ESPACIO §0).
- Cuásar rehecho (galaxia espiral de partículas, anillo de fuego, disco azul y naranja, sombra, chorros en hélice, rayos).
- Viaje: sin encuentros que frenan ni inclinación de la mirada; ~14 s a la supernova; llegada de frente (también al cuásar y a TON 618).
- Paisaje de los viajes y universo de llegada en el catálogo; cielo propio de cada gigante (estrellas, velo, constelaciones).
- Arreglos medidos: al pulsar «Saltar» la cámara se quedaba quieta un cuadro (corregido); la frenada final daba un tirón (ahora se apaga); en galaxias grandes el paso imagen → estrellas daba hasta +15 % de luz (el número de estrellas se limita al calibrado).
- Pruebas actualizadas al nuevo diseño (catálogo, vuelo, escala, paisaje, universo, brillo). Móvil comprobado solo con emulación (iPhone 430 px); no en un teléfono físico.

## Cuadragésima tercera pasada: Xiomara visible desde lejos y la telaraña cósmica (20 de octubre)

Pedido de Carlos: desde la supernova Xiomara parpadeaba y casi no se veía; el universo solo tenía cosas en los caminos; quería la telaraña cósmica, con siluetas enormes visibles desde cada destino.

- Xiomara desde lejos: compresión perceptiva, brillo mínimo y halo rosado estable; la tapaba la caja de una nebulosa lejana del camino (que además dibujaba un recuadro oscuro): las nebulosas de menos de ~3 px ya no se dibujan como volumen.
- Telaraña cósmica (nudos, filamentos, galaxias lejanas y gas) y población del catálogo sobre ella (≈ 3 200 galaxias).
- Rendimiento medido (GPU de este equipo): PC 60 fps en casa, viaje y destinos; iPhone emulado igual que antes (60 en el viaje, 30 en reposo por el ritmo de contemplación). No probado en un teléfono físico.
- Pruebas: npm test (incluye la telaraña), pruebas de navegador por grupos; una comprobación de «mirar hacia casa» desde TON 618 falló una vez en una ejecución larga y pasó al repetirla (intermitente).

## Cuadragésima cuarta pasada: el cielo del «más allá», una telaraña viva y maravillas (20 de octubre)

Pedido de Carlos (con seis imágenes de referencia): la telaraña más colorida y brillante, un ecosistema; el fondo lejano, que se veía oscuro y borroso, debe parecer más universo, colorido y con vida; y rincones impresionantes como los de las fotos.

- Cielo profundo pintado una vez en un cubemap; se enciende lejos de casa.
- Telaraña: gas de colores por filamento, cúmulos cálidos, nebulosas dentro de los filamentos y galaxias más brillantes.
- Maravillas: el Ojo con su galaxia de canto, la enana de las burbujas, la espiral de hebras y la nube de fuego.
- Arreglo medido: el cielo profundo y el velo de cada destino se sumaban encima de los cuerpos opacos (sombras de agujeros negros); ahora se dibujan antes.
- Rendimiento (GPU de este equipo): PC 60 fps; iPhone emulado igual que antes. Sin teléfono físico.

## Cuadragésima quinta pasada: Xiomara, la galaxia más grande; maravillas rehechas (20 de octubre)

Pedido de Carlos: el Ojo con la galaxia de canto que lo partía se veía mal y «salido» desde el corazón; la enana y la nube de fuego no se parecían a las fotos; había una galaxia muchísimo mayor que Xiomara.

- Ninguna galaxia mayor que Xiomara (catálogo, paisaje, universos de llegada y maravillas); prueba nueva.
- El Ojo: nebulosa volumétrica con imagen pintada (anillo de nudos con fibras, interior azul), sin la galaxia de canto, entera a un lado del corazón. La nube de fuego, igual, al otro lado. La nube de las burbujas, rehecha (lóbulos, carriles de polvo, cúmulos azules, burbujas rosas filamentosas, velo turquesa). La espiral de hebras, galaxia pequeña junto a TON 618.
- El cielo profundo tenía demasiadas «galaxias diminutas» que parecían rayitas: reducidas.
- Las galaxias del catálogo usan todas el número de estrellas con el que se calibró el paso imagen → estrellas (se crean solo al acercarse).
