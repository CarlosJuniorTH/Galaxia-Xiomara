# Prompt para Claude: resolver el renderizado del iPhone con calidad de PC

Copia este documento en Claude, o pídele que lo lea desde este repositorio. Las rutas de las fotografías corresponden a este ordenador. Si Claude trabaja en otro entorno, adjunta también las dos fotografías; no debe afirmar que las ha visto si no puede abrirlas.

---

Trabaja como un ingeniero de gráficos Three.js/WebGL con experiencia en Safari y GPU móviles. Necesito que investigues e implementes una solución visual y técnica, no que me des otra lista de ajustes de calidad. Lleva el trabajo hasta un resultado revisable, con pruebas y límites honestos. Lee primero las instrucciones del repositorio y las capturas reales.

## 1. Proyecto, rama y límites de la intervención

- Repositorio local: `/home/carlos/proyectos/Galaxia-Xiomara`.
- Trabaja en la rama existente **`feature/universo-vivo`**. No crees una rama nueva salvo necesidad justificada y acordada. No hagas merge con `main`, no rebases ni borres trabajo ajeno, no hagas reset destructivo.
- Base de esta entrega: **`e4df174`**. Comprueba el estado actual de Git antes de modificar nada; puede haber cambios posteriores.
- La versión original está en `main`. La comparación visual principal debe hacerse con la versión actual de PC, no solo con la versión antigua de `main`.
- No publiques, no hagas push ni configures GitHub Pages. Actualmente no hay remoto configurado. El usuario quiere una app accesible desde GitHub más adelante, pero primero quiere aprobar la calidad de esta rama.
- Mantén el universo real en 3D. No lo sustituyas por una fotografía, un vídeo, un fondo plano o una versión 2D.
- Conserva los recuerdos, cartas, fechas, progreso, editor local, exportaciones y crecimiento mensual. No inventes datos de la relación ni alteres sus textos para ocultar problemas de diseño.

## 2. Objetivo visual que debe guiar las decisiones

En móvil debe sentirse el mismo universo bonito del PC: brazos de galaxia definidos, profundidad, color rosa y lila con matices, luces delicadas, un corazón reconocible y planetas cuidados. Al acercar la cámara debe aparecer detalle, no cuadrados gigantes, burbujas de colores o una mancha blanca. Al alejarla la galaxia debe conservar presencia; no quiero un objeto diminuto perdido entre la interfaz.

La fluidez también importa. El objetivo no se alcanza bajando silenciosamente la resolución o la densidad al detectar un teléfono, ni llevando todas las opciones al máximo sin medir el resultado. Optimiza el trabajo real y diseña el renderizado para las distintas escalas. No prometas una calidad o unos FPS que no hayas comprobado.

## 3. Evidencia principal: fotografías del móvil real

Abre y estudia ambas imágenes antes de editar:

1. `/home/carlos/Descargas/WhatsApp Image 2026-10-17 at 20.44.29 (1).jpeg`
2. `/home/carlos/Descargas/WhatsApp Image 2026-10-17 at 20.44.29.jpeg`

La primera muestra el universo alejado: la galaxia tiene poco protagonismo y su nombre y corazón se leen muy pequeños. La segunda muestra un acercamiento: saturación fuerte, muchos puntos cuadrados, un núcleo blanco que pierde detalle y una superficie rectangular gris detrás de parte de la descripción. La interfaz ocupa una parte considerable del espacio visible. Diferencia lo que muestran las imágenes de lo que deduzcas del código.

Las fotografías tienen interfaz de iPhone. No deduzcas el modelo, la memoria o el DPR nativo a partir de sus dimensiones: pueden haber sido redimensionadas por WhatsApp. Confirma modelo, iOS, navegador y datos gráficos reales si hacen falta.

La revisión anterior se hizo mayormente con el navegador del ordenador en un viewport estrecho. **Eso no demuestra la calidad ni el rendimiento de la GPU del iPhone.** No repitas esa conclusión.

La última prueba del núcleo acercado reproduce también la saturación y el rectángulo en el navegador integrado, con la GPU del PC: `.pruebas/nucleo-particulas-circulares.jpg`. Por tanto, no presupongas que todo es un defecto exclusivo de Safari o de una extensión de iOS.

## 4. Qué existe y qué debes preservar

La app es JavaScript modular, HTML y CSS con Three.js **0.160.0** servido desde `assets/vendor/three/`, sin framework de aplicación ni CDN necesario para la escena. Las dependencias se fijan en `package.json` y el import map está en `index.html`.

Incluye galaxia de partículas, cielo procedural horneado a cubemap, agujero negro, corazón y nombre formados por estrellas, frases, ocho destinos y cometa. Hay recorrido guiado de nueve pasos, tres constelaciones, cinco cartas, sueños, cápsulas, álbum, pistas y postal. El guardado es local al navegador y al origen. No borres `localStorage` para hacer pruebas salvo en un entorno de prueba claramente separado y con copia.

## 5. Archivos que debes inspeccionar

- `js/escena/nucleo.js`: renderer, creación del contexto, cámara, controles, composer y brillo.
- `js/escena/index.js`: vuelos, encuadre de destinos, bucle de animación, pausa de lectura y métricas.
- `js/escena/materiales.js`: shaders de puntos, forma, alpha, tamaños y atenuación próxima.
- `js/escena/agujeroNegro.js`: horizonte, anillos, discos, chorros y partículas orbitales.
- `js/escena/galaxia.js`, `corazon.js`, `nombre.js`, `amor.js`, `estrellas.js`: densidad, colores y escalas.
- `js/escena/brillo.js`, `js/util/gaussiano.js`: optimización actual del bloom.
- `js/escena/cielo.js`, `galaxiasLejanas.js`, `texturas.js`: fondo, texturas, degradados y filtrado.
- `js/escena/mundos.js`, `planetas.js`: otros destinos y constelaciones.
- `js/util/dispositivo.js`, `encuadre.js`, `webgl.js`: perfiles, DPR, perspectiva y diagnóstico de arranque.
- `css/base.css`, `interfaz.css`, `universo.css`, `ventanas.css`: lienzos, capas, composición, superficies de lectura y tamaños móviles.
- `js/ui/universo.js`, `efectos.js`: recorrido, paneles, cartas y efectos.
- `LEEME.md`, `docs/REVISION.md`, `tests/`: funcionamiento y evidencia anterior. Úsalos como contexto, no como sustituto de verificar el estado actual.

## 6. Cambios recientes: no los confundas con una solución completa

- El móvil ya no selecciona automáticamente menos partículas: el perfil alto usa `k: 1`, cielo de 1024 y DPR nativo hasta 3. No hay reducción automática durante el recorrido. `?calidad=alta` lo selecciona explícitamente; `compatible`, `media` y `baja` son alternativas explícitas.
- Se limitaron tamaños de partículas en píxeles CSS y se quitaron varios multiplicadores visuales específicos de móvil. No se ha demostrado que eso resuelva por completo las fotografías.
- Se corrigieron llamadas de `smoothstep` con límites invertidos, cuyo resultado no era portable.
- El encuadre de la galaxia intenta conservar su anchura de escritorio. Es revisable: la fotografía alejada indica que no basta conservar una fórmula de perspectiva; hay que cuidar presencia y composición.
- Las constelaciones miran hacia la cámara para evitar verse de canto; sus nodos tienen zona táctil de 44 px sin ampliar el destello.
- El bloom conserva cinco niveles y tamaños. Agrupa muestras bilineales solo en el desenfoque vertical. El horizontal sigue el filtro original porque cambia la resolución de entrada entre niveles. Hay pruebas numéricas de equivalencia. No extiendas ese agrupamiento a la pasada horizontal sin demostrar que sus muestras corresponden a texeles contiguos.
- Se eliminaron once búferes de profundidad innecesarios del bloom. Se conserva la profundidad de la escena.
- Los destellos comparten texturas, los efectos vacíos dejan de animarse y la escena de móvil deja de dibujarse detrás de cartas/paneles. En PC se conserva el fondo animado.
- **Última corrección, commit `e4df174`:** las 360 partículas orbitales del agujero negro usaban `PointsMaterial` sin mapa y podían ser cuadrados grandes al acercarse. Ahora usan el shader circular con descarte fuera del disco, límite de 3 px CSS y atenuación próxima. Pasan sus pruebas estructurales y de animación. Esto corrige una fuente identificada de cuadrados; todavía no está validado en el iPhone real y no resuelve por sí solo la saturación ni el encuadre.
- Después se cambia el fondo radial acotado de `.lugar` en móvil por un sombreado de lectura a todo el ancho y con final de alfa cero. El rectángulo coincide con los límites de esa tarjeta en el acercamiento. Comprueba el resultado visual y que el sombreado no reste protagonismo a la galaxia.

## 7. Investiga las causas antes de seguir tocando números

Realiza una auditoría concreta del pipeline gráfico. Prioriza:

1. Forma y cobertura de todas las partículas. Busca puntos sin máscara, tamaños físicos frente a tamaños CSS, límites del hardware y puntos muy cercanos a la cámara. Una nube densa no debe convertirse en confeti cuadrado al ampliar.
2. Brillo y rango dinámico. Revisa acumulación aditiva, exposición, espacios de color, tipos de render target, filtrado y salida final. El composer actual usa RenderPass y bloom, sin OutputPass explícito. **Investiga** si el tratamiento de salida contribuye al problema; no añadas tone mapping a ciegas ni des por probada esa hipótesis. Algunas texturas se autoraron para la salida anterior y podrían necesitar recalibración.
3. Compatibilidad real de HDR y filtrado en WebGL del iPhone. Revisa extensiones, precisión y formatos efectivamente utilizables. Detectar una extensión no debe confundirse con validar todo el pipeline.
4. Profundidad y orden de transparencias: horizonte negro, partículas orbitales, discos y fondos. Determina por qué el núcleo pierde forma y detalle en el acercamiento.
5. El rectángulo gris de la fotografía. Identifica si procede de un elemento DOM, un degradado CSS, una superficie de la escena o un artefacto de composición del navegador. Aísla capas una por una en una vista de diagnóstico; no lo tapes con otro rectángulo sin entenderlo.
6. Perspectiva, distancia inicial, inclinación, rango de zoom y área realmente visible entre las barras del navegador y la interfaz. Mantén una composición bonita sin empequeñecer todo ni resolverlo simplemente prohibiendo acercarse.
7. Densidad aparente y aliasing al cambiar de escala. Si el modelo actual solo de partículas no produce una galaxia continua y bonita en una pantalla pequeña, evalúa una solución híbrida dentro de la escena 3D: gas suave/procedural, filamentos y estrellas nítidas con detalle por escala. Explica su coste y compara visualmente antes de adoptarla.

## 8. Diagnóstico del dispositivo y privacidad

Si hace falta, prepara un diagnóstico de desarrollo que permita confirmar desde el propio iPhone: versión cargada, dimensiones CSS y del drawing buffer, DPR, perfil, WebGL, renderer permitido por el navegador, límites de puntos/texturas, formatos y FPS medidos con tiempo real. Añade contadores de draw calls y superficies si ayudan.

No uses telemetría de terceros ni publiques datos del dispositivo. El servidor ya dispone de un POST local `/__diagnostico3d` para errores de arranque, limitado en tamaño, que guarda `.pruebas/diagnostico-3d.json`. Si lo amplías, mantén la separación entre diagnóstico local y sitio estático público, preserva los límites y no expongas archivos privados.

## 9. Cómo ejecutar y revisar sin cambiar el cortafuegos

Actualmente el PC sirve la app en `http://127.0.0.1:8080/`. El teléfono accede por la misma Wi-Fi a `http://192.168.1.34:3000/?calidad=alta`. Comprueba las IP y procesos antes de asumir que siguen iguales.

El puerto 8080 no estaba permitido para conexiones de la LAN. El 3000 ya tenía una regla local y se usa sin modificar el cortafuegos. No abras puertos del router ni desactives protecciones.

Si hace falta iniciar otra vista, usa el servidor restringido existente:

```bash
python3 scripts/servir.py --lan --port 3000
```

No mates un proceso ajeno si el puerto está ocupado. No uses un servidor genérico que exponga `.git`, la configuración o las fotografías de Descargas. No publiques las capturas del usuario en `assets/` ni en `dist/`.

## 10. Rendimiento que debe medirse

Separa CPU, GPU, compilación inicial y carga. No llames «29 FPS» a una medición calculada con delta time recortado para la simulación. No uses los FPS del PC con viewport estrecho como rendimiento del teléfono. Prueba una sesión sostenida, el recorrido entero, interacción y cambios de orientación. Si no puedes acceder al dispositivo físico, deja esa validación expresamente pendiente.

Prioriza menos overdraw, menos trabajo duplicado, texturas compartidas, geometría estática, instancing cuando preserve el aspecto y resolución de cada pasada adecuada a su función. El texto y los objetos nítidos no deben pagar por el desenfoque de un halo. No modifiques ni actualices Three.js o todas las dependencias sin una razón concreta y una comparación reproducible.

## 11. Composición y controles

Mantén el aspecto íntimo, elegante y espacial. El título, el contexto, el cometa y la navegación no deben competir todo el tiempo con el objeto principal. Valora jerarquía y visibilidad durante el zoom, sin esconder funcionalidades ni cambiar los textos de Carlos. Contempla `safe-area`, viewport dinámico y orientación horizontal.

Conserva zonas táctiles cómodas y cierres accesibles tras desplazar las cartas. No agrandes las luces para simular zonas de toque. El recorrido debe permitir pausar, seguir, volver y salir sin dejar bloqueada la cámara.

## 12. Validación mínima del resultado

- Comparación antes/después, mismo destino, cámara y nivel de zoom cuando sea posible. Usa capturas reales y registra diferencias de entorno. Evita comparar una galaxia aleatoria de frente con otra de canto y atribuir el cambio al renderizador.
- Galaxia inicial, vista media y máximo acercamiento: sin cuadrados gigantes, manchas planas ni saturación que borre los detalles.
- Los nueve pasos del recorrido, con pausa, anterior, siguiente, salida y visita libre.
- Planetas rosa y azul, sobres de la luna, jardín, cápsulas, refugio y cometa.
- Corazón, estrella e infinito: forma reconocible, orientación correcta y tejido automático y manual.
- Cinco cartas completas, scroll, cierre, retorno de foco y reanudación del universo.
- Progreso conservado, pistas, álbum y exportación de postal.
- PC en calidad alta: conservar su belleza y comprobar las modificaciones compartidas. No basta una captura de la portada.
- Revisión real de iPhone si está disponible. Usa 390 × 844, 360 × 740 y 844 × 390 como revisión de layout adicional, no como sustituto del dispositivo.

## 13. Pruebas del repositorio

```bash
npm test
npm run check
npm run test:servidor
npm run build:pages
git diff --check
```

La base de la entrega tiene 29 pruebas JavaScript pasando; las cuatro de servidor pasaron en la revisión precedente. Comprueba los resultados actuales. Añade regresiones para los defectos reales que corrijas, no pruebas que solo reescriban tu implementación. `build:pages` prepara `dist/`; no publica ni une ramas.

## 14. Forma de trabajar y entrega

Empieza con un diagnóstico breve basado en las dos fotografías y el código actual. Enumera hipótesis y cómo distinguirlas. Implementa por etapas pequeñas y compara. Si la solución necesita un cambio de técnica de renderizado, hazlo de forma reversible en esta rama y conserva una referencia de comparación.

No declares «solucionado en móvil» solo por aumentar DPR, limitar zoom, bajar densidad, pasar tests o cambiar el ancho del navegador de escritorio. No presentes como causa confirmada una hipótesis no probada en el teléfono. Si no puedes validar una parte, explica exactamente cuál y qué evidencia falta.

Entrega los cambios guardados en Git en esta rama, capturas comparables, pruebas realizadas y métricas con el dispositivo que las produjo. Actualiza `docs/REVISION.md` y las instrucciones si corresponde. Resume lo que ve mejor el usuario, qué coste se redujo y qué queda pendiente. No hagas merge ni publiques: Carlos quiere revisar primero.
