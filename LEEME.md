# Nuestro pequeño infinito · Carlos & Xiomara

Un universo 3D para Xiomara, con la galaxia original, lugares visitables y una historia que crece con el tiempo. Versión de trabajo **local**, sin publicación.

## Verlo en Chrome

Desde esta carpeta:

```bash
npm run dev
```

Abre **http://localhost:8080** en Chrome. No funciona abriendo `index.html` con doble clic, porque usa módulos JavaScript. No es necesario instalar Node para verlo: también sirve `python3 scripts/servir.py`.

El servidor escucha únicamente en este ordenador. Para compartirlo con Xiomara habrá que preparar y decidir después dónde alojarlo. Esta rama no publica nada.

## Versiones y ramas

- `main`: versión original, guardada antes de las mejoras.
- `feature/universo-vivo`: versión nueva para comparar y probar.
- No se han unificado las ramas.

Para comparar: `git diff main...feature/universo-vivo`. Para revisar la original sin tocar los archivos actuales: `git worktree add ../Galaxia-Xiomara-original main`, y servir esa carpeta en otro puerto.

## Qué puedes hacer

- **Deja que te lleve:** viaje por los ocho lugares y el cometa, con vuelos suaves, pausa, anterior, siguiente, salida y posibilidad de detenerse a explorar.
- **Explorar:** visitar el planeta del comienzo, la constelación, el correo de la luna, el jardín de sueños, las cápsulas, el planeta de las dos orillas y el refugio de calma.
- **Constelación:** elegir entre un corazón, una estrella del comienzo y un lazo infinito; tocar las luces en orden o dejar que el hilo se teja solo. Se guarda al completarla.
- **Mi álbum:** releer estrellas descubiertas, ver capítulos anuales y repetir la celebración al encontrar todos los recuerdos disponibles.
- **Cartas:** carta original y cuatro cartas para momentos distintos.
- **Una pista:** vuelo hacia una estrella pendiente y un destello temporal. El descubrimiento requiere tocarla.
- **Postal:** captura real del universo 3D con una dedicatoria, descargable como PNG.
- **Cometa:** aparece ocasionalmente con cuatro pequeñas sorpresas; también se puede visitar desde Explorar.
- **Sueños:** marcar un deseo como cumplido o devolverlo a pendiente; sus flores cambian de color.
- **Cápsulas:** fechas de apertura calculadas según Argentina. Las cartas son propuestas editables.

## Horarios y crecimiento

- Carlos: `Europe/Madrid`, con cambios de horario de verano automáticos.
- Xiomara: `America/Argentina/Buenos_Aires`.
- Los saludos, aniversarios, nuevos meses y cápsulas siguen la fecha de Xiomara.
- Hay una estrella para el comienzo y una por mes cumplido desde el 15 de diciembre de 2025.
- Ya no existe el límite anterior de 25 estrellas. Las fechas de las estrellas son sus identificadores estables; añadir meses no cambia los descubrimientos anteriores.
- Si llega un nuevo mes con la página abierta, el cielo se actualiza sin interrumpir la experiencia (comprobación cada minuto).
- Una estrella futura sin texto personalizado conserva su espacio y explica que su historia está pendiente de escribir; no se inventan hechos vividos.

## Preparar nuevo contenido sin editar código

Abre **http://localhost:8080/editor.html**.

1. Prepara nombres, foto, canción, recuerdos, cartas, cápsulas o sueños.
2. Guarda un borrador y usa **Ver mi borrador** para probarlo. Solo la dirección con `#borrador` usa ese borrador local.
3. Descarga `contenido.json` y sustituye **assets/contenido.json** por ese archivo para incorporarlo al proyecto.
4. Revisa el universo normal y guarda el cambio en Git.

El editor no escribe directamente en tus archivos ni publica nada. Los identificadores de cartas, sueños y cápsulas se conservan; los meses mantienen su orden. Para cambiar la foto, copia la imagen en `assets/fotos/` y escribe su ruta. Hasta disponer de vuestra foto, hay una ilustración orbital original en lugar del gato.

También se pueden editar los valores predeterminados en `js/config.js` y `js/data/universo.js`. El contenido del JSON tiene prioridad. Las ubicaciones y el diseño de los mundos siguen en el código.

### Música

La versión nueva usa una composición ambiental original sintetizada con Web Audio, sin descargar MP3 de terceros. Empieza tras tocar Entrar y se pausa al salir de la pestaña. Para usar vuestra canción, pon el audio en `assets/musica/` y escribe su ruta en el editor. Si ese archivo falla, se utiliza el ambiente original.

## Guardado, copias y reinicio

El progreso se guarda en `localStorage`, exclusivamente en este navegador y origen. `localhost:8080` y `127.0.0.1:8080` tienen guardados separados. No hay cuenta, servidor de datos ni sincronización entre dispositivos.

En el álbum puedes **guardar una copia del viaje** como JSON e importarla en otro navegador; se fusiona con los descubrimientos existentes. Reiniciar requiere una confirmación dentro de la experiencia y guarda una copia local del viaje anterior. Se puede recuperar desde la entrada. Borrar datos del navegador puede eliminar las copias locales; conserva la descarga si quieres mantenerla a largo plazo.

Las cápsulas son sorpresas narrativas, **no secretos cifrados**: sus textos forman parte de los archivos del sitio y su fecha depende del reloj del dispositivo. El editor tampoco es una zona de administración autenticada. Antes de publicar contenido privado habrá que decidir la protección y el alojamiento.

## Fiabilidad 3D

Móvil y PC parten del mismo perfil alto: partículas completas, cielo de 1024 y resolución nativa de hasta 3 píxeles por píxel CSS. La resolución se mantiene durante el recorrido; no se baja automáticamente para ocultar problemas de rendimiento. `?calidad=alta` selecciona explícitamente ese perfil. Para equipos que lo necesiten se pueden elegir `?calidad=media`, `?calidad=baja` o el modo compatible. La calidad alta exige más GPU y batería; no garantiza la misma fluidez en todos los teléfonos.

El encuadre vertical conserva la anchura de la galaxia. Los puntos tienen un límite de tamaño CSS y se desvanecen junto a la cámara para evitar discos de colores al acercarse. El tamaño visual de los recuerdos se limita por separado de su zona de toque. El zoom se detiene antes de atravesar el núcleo.

En el recorrido vertical los destinos se encuadran por encima de la tarjeta y la constelación se muestra más cerca. Las figuras miran hacia la cámara para no perderse al orbitarlas; cada nodo admite una zona táctil de 44 px sin agrandar su destello. Los paneles ajustan el desplazamiento a la altura real del título. En móvil, abrir una carta o un panel pausa el dibujo de la escena visible detrás y cerrar la lectura lo reanuda; el PC conserva su fondo animado.

Si falla el arranque, «Ver el error de arranque» muestra la etapa y el motivo real. «Probar 3D compatible» abre `?calidad=compatible`: mantiene los mundos y el recorrido en 3D, reduce partículas y resolución y evita el brillo HDR. Se prueban WebGL 2 y WebGL 1 con opciones alternativas, sin modificar ajustes del navegador.

Durante las pruebas HTTP locales, el servidor guarda el último fallo de arranque en `.pruebas/diagnostico-3d.json` (etapa, error, intentos y versión del navegador). No se sirve ese archivo y el diagnóstico no se envía desde GitHub Pages por HTTPS.

Three.js y las fuentes se sirven desde la propia carpeta, con sus licencias. Las texturas, la portada y los elementos nuevos se generan localmente; la escena no necesita CDNs. El brillo conserva sus cinco niveles HDR y resolución, agrupando muestras contiguas en el filtro vertical; sus superficies no reservan profundidad innecesaria. Los destellos comparten texturas y el lienzo de efectos solo anima cuando tiene contenido visible. Se detienen los efectos al ocultar la pestaña. Una pérdida del contexto gráfico muestra recuperación explícita y conserva el progreso, sin bucles de recarga.

La experiencia mantiene el 3D; no se sustituye por una imagen 2D. Eso requiere un navegador con WebGL disponible. Ninguna aplicación puede garantizar que el hardware o el navegador nunca fallen. Añadir a inicio funciona mediante el manifiesto; **no hay service worker ni se promete carga sin conexión tras cerrar el navegador**.

## Desarrollo y pruebas

```bash
npm ci
npm run vendor       # regenera la copia local de Three.js 0.160.0
npm test
npm run check
```

`#debug` expone `window.__galaxia` para inspección manual durante desarrollo y métricas cada cuatro segundos en los atributos `data-fps`, `data-cpu-ms` y `data-texturas` del canvas. Los FPS usan tiempo real; el coste CPU no mide el tiempo GPU. `?comparar=original#debug` permite revisar el filtro de brillo anterior. No es necesario para usar el universo.

Consulta `docs/REVISION.md` para el alcance de la validación y límites pendientes.


## Probar desde el móvil en la misma Wi-Fi

```bash
npm run dev:movil
```

Conecta el teléfono a la misma red que este PC y abre `http://IP-DEL-PC:8080/`.
En la sesión del 17 de octubre, la dirección es `http://192.168.1.34:8080/`.
La IP puede cambiar al reconectar la red. En el PC sigue funcionando `http://127.0.0.1:8080/`.
El servidor filtra los archivos permitidos: no publica Git, scripts, pruebas, configuración del proyecto ni listados de carpetas. Se detiene con Ctrl+C.
La prueba por Wi-Fi depende de que el PC y el servidor sigan encendidos. No necesita cambiar ni fusionar ramas.

### Diagnóstico de renderizado en el propio teléfono

Abre `http://192.168.1.34:3000/?calidad=alta&diag=render` (puerto con regla local de cortafuegos), entra al universo y espera unos 25 segundos sin tocar. Aparece un panel con GPU, DPR, tamaño del búfer, precisión, FPS reales y, para tres vistas (inicial, corazón y núcleo), cuántos píxeles del búfer HDR son NaN/infinitos, negativos, mayores que 8 o quemados, también por capa. El informe se envía solo al servidor local y se guarda en `.pruebas/diagnostico-3d.json`. Los botones del panel encienden y apagan cada capa y el brillo para comparar a simple vista.

## Preparar la app para GitHub Pages

```bash
npm run build:pages
```

El resultado está en `dist/`, con rutas relativas compatibles con el subdirectorio de un repositorio, manifiesto con ámbito relativo y `.nojekyll`. No incluye el taller local, Git ni archivos de desarrollo. Este comando no publica, no hace push y no une ramas.

Para tener un enlace HTTPS disponible sin mantener el PC encendido, falta conectar el repositorio y configurar GitHub Pages. Se puede elegir una rama distinta de `main`. La prueba HTTP de la Wi-Fi permite ver el recorrido, pero no ofrece las mismas condiciones de instalación de app que el futuro enlace HTTPS. El manifiesto permite presentarla como app; no se promete funcionamiento sin conexión ni disponibilidad perpetua del alojamiento.
