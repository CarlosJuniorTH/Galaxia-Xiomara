# Revisión de calidad, consumo y experiencia

Fecha: 17 de octubre de 2026. Rama: `feature/universo-vivo`. Base: `aa7db421f0540f940bbfaf751d914e0cd718c953`.

Esta auditoría no modifica la implementación, no fusiona ramas y no publica. El encargo de implementación está en `PROMPT-CLAUDE-CALIDAD-CONSUMO.md`.

## Qué he comprobado

- Código actual de render, postprocesado, resolución, galaxia, planetas, mundos, navegación, lectura, entrada, gestos, contenido, guardado, exportación y empaquetado.
- Historial reciente y diagnóstico JSON real guardado del iPhone, separándolo de las afirmaciones de documentación antigua.
- Vista de PC 1280×720 y composición vertical 430×775 en navegador de escritorio; navegación del recorrido y paneles. Esto no reproduce la GPU, temperatura ni navegador del teléfono.
- `npm test`: 40/40. `npm run check`: 48 archivos JS y recursos comprobados. `npm run test:servidor`: 4/4.
- Reproducción aislada del comportamiento del regulador alternando ventanas de 16,7 y 19 ms.

No se ha realizado en esta auditoría un ensayo físico prolongado ni se han medido vatios, batería o temperatura. No se certifica el recorrido completo en dispositivos físicos. El empaquetado/publicación tampoco se ha ejecutado en esta revisión.

## Lo que ha mejorado de verdad

El informe `.pruebas/diagnostico-3d.json`, fechado `2026-10-17T20:16:01Z`, registra 59,8 FPS, p95 18 ms y 359 cuadros en Safari iPhone, con búfer 860×1550 y 105 llamadas. El diagnóstico de texturas registra 120 píxeles espurios con transparencia y 0 sobre fondo opaco. Respalda las correcciones de textura y el agrupamiento de destellos. No prueba el comportamiento térmico del último commit durante veinte minutos.

La escena actual conserva detalle, gas continuo y un núcleo mucho más controlado que las primeras capturas proporcionadas por el usuario. El encuadre vertical utiliza la zona libre de la interfaz. Hay pausa de dibujo durante lectura en móvil y suspensión al ocultar la página. Existe un editor local de contenido, progreso recuperable y exportación/importación: conviene aprovecharlos antes de inventar sistemas duplicados.

## Hallazgos priorizados

1. **Alta: falta un presupuesto de trabajo sostenido.** `js/escena/index.js:148-182` actualiza todas las partes y dibuja con el compositor en cada rAF visible. No limita la frecuencia de dibujo a un objetivo propio. `pausar()` en la misma clase solo detiene vuelo/cámara; siguen objetos y bloom. Es trabajo continuo confirmado, compatible con el calentamiento comunicado, pero no una medición de su contribución térmica. Prioridad: planificar estados, frecuencia y reposo real.

2. **Alta: la medición actual no valida el consumo.** Los contadores del bucle publican FPS y tiempo CPU, no energía ni tiempo GPU completado. El diagnóstico guardado cubre unos seis segundos. La experiencia debe verificarse antes/después en sesiones físicas prolongadas y con condiciones comparables.

3. **Media: P3 no mantiene una salida coherente.** `js/escena/nucleo.js:20-26` asigna directamente P3 al contexto, sin actualizar el espacio de salida del renderer ni convertir las primarias en `js/escena/salida.js:34-43`. La salida sigue calculando valores para sRGB. Los mismos números RGB pasan a representar otros colores en P3. Puede explicar diferencias de saturación entre pantallas, no se ha cuantificado aquí su magnitud. Referencia: [MDN drawingBufferColorSpace](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawingBufferColorSpace); también el setter local de Three en `node_modules/three/src/renderers/WebGLRenderer.js:2565` coordina ambos estados.

4. **Media: estabilidad no consecutiva del regulador.** `js/util/resolucion.js` no reinicia el contador cuando la mediana no supera 20 ms pero p90 falla el criterio de 18,5 ms. Alternar siete ventanas 16,7/19/16,7/19/16,7/19/16,7 produce una subida de DPR 2 a 2,25. Las pruebas actuales no cubren esa interrupción. Afecta las recuperaciones y PC; no supone que el iPhone ya esté subiendo a DPR 3, pues actualmente su techo automático es la resolución inicial.

5. **Media: brillo y gas ofrecen margen de optimización por medir.** `js/escena/brillo.js` conserva cinco niveles y once superficies auxiliares. Se procesan cada cuadro. `js/escena/galaxia.js:48-94` evalúa dos campos de ruido de tres octavas para gas cuyo campo espacial no cambia con el tiempo. Separar resolución de bloom y precalcular el campo de gas son candidatos concretos; necesitan comparación visual y medición, no un beneficio inventado de antemano.

6. **Media: captura con recuperación incompleta ante excepción.** `capturar()` restaura resolución en éxito y timeout, pero el resolver cancela primero el timeout en el bucle y después copia con `getContext('2d').drawImage()`, sin `try/finally`. Si la copia lanza una excepción, puede quedar pendiente la promesa y no restaurarse la resolución. No se ha provocado pérdida de contexto ni falta de memoria para reproducir el fallo en un teléfono. Conviene blindar la operación y limitar su presupuesto.

7. **Media: lectura ampliada bloqueada globalmente.** `index.html:5` desactiva zoom y `js/ui/toques.js` cancela gestos a nivel documento. Afecta a cartas y paneles, además del canvas. Acotar gestos al espacio 3D permite conservar control de cámara y ampliar texto.

8. **Diseño: falta una jerarquía más clara.** La vista vertical conserva la galaxia con presencia, pero las etiquetas auxiliares son muy pequeñas. En visitas a objetos secundarios, galaxias, emojis y etiquetas del fondo siguen compitiendo por atención. El panel del recorrido y el muelle mantienen mucho peso. Mejorar jerarquía, foco visual y presentación por destino aportará más que aumentar partículas.

9. **Mantenimiento: estilos acumulados.** `css/universo.css` contiene varias rondas de reglas móviles que se sobrescriben. Conviene consolidarlas después de fijar referencias visuales, para evitar que una mejora de orientación rompa otra.

10. **App a largo plazo: base preparada, experiencia offline pendiente.** Hay manifest y empaquetado local para Pages; no he encontrado registro de service worker ni remoto Git configurado. No hay evidencia de publicación actual desde este checkout. La instalación, actualizaciones, offline y copias entre dispositivos requieren una fase propia. La copia del viaje ya existe; la sincronización automática compartida no forma parte de este encargo.

`requestAnimationFrame` suele seguir la frecuencia de la pantalla, que puede superar 60 Hz: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). No se afirma que el iPhone del informe esté ejecutándose a 120 Hz: registró unos 60 FPS.

## Propuestas para elevar todo el proyecto

Orden recomendado: consumo, coherencia de color, referencias visuales, diseño y nuevas experiencias.

1. **Universo sostenible.** Una gestión automática de actividad que mantenga respuesta fluida al tocar, reduzca trabajo al contemplar y descanse durante lectura. La escena conserva su detalle; cambia cuánto trabajo se repite.
2. **Dirección de luz común.** Definir negros, rosas, oro y exposición de referencia. Núcleo luminoso con textura y halos suaves, sin forzar saturación ni borrar los oscuros que dan profundidad.
3. **Modo contemplación.** Retirar suavemente controles secundarios después de unos segundos; devolverlos con un toque y mantener siempre una salida clara. Aplicarlo también a PC.
4. **Cada destino con su encuadre.** Cámara, distancia y espacio para texto propios, dentro de una gramática común. Atenuar progresivamente distracciones del fondo al llegar, conservando el contexto del universo.
5. **Planetas con identidad.** Mejor terminador, atmósfera fina, bandas o nubes con detalle y anillos legibles. Reservar textura de mayor resolución para cuando el planeta ocupa pantalla, sin cargar todos los mundos al máximo desde el principio.
6. **Constelaciones con intención.** Guiar la siguiente luz, dibujar un hilo fino y revelar al completar una frase breve. Priorizar gesto preciso, profundidad y luz controlada frente a una explosión genérica.
7. **Frases como escenas.** Elegir una frase principal por momento; aparecer, permanecer el tiempo suficiente y retirarse. Evitar varias frases y emojis compitiendo simultáneamente.
8. **Cartas con mejor lectura.** Sobres con identidad discreta, papel oscuro o cálido, buena anchura de párrafo y opción de mostrar todo el texto al instante. Ampliación, foco y scroll cómodos en móviles pequeños.
9. **Recorrido con ritmo.** Duración acorde al texto, señal clara de llegada y posibilidad de continuar manualmente. Añadir versiones corta y completa, reutilizando la ruta existente.
10. **Álbum como línea del tiempo.** Portadas por año y una tarjeta por mes, con lo encontrado y lo pendiente sin revelar sorpresas. Mejorar la herramienta de edición existente para completar futuros meses.
11. **Celebración que recuerde el viaje.** Reunir solo descubrimientos reales mediante una secuencia breve y personal. Botón para omitir y repetir; reutilizar materiales y efectos para limitar el pico de trabajo.
12. **Postal mejor compuesta.** Diseños vertical y horizontal, vista seleccionable y textos ajustados a la imagen. Captura con presupuesto propio y restauración segura del render.
13. **Identidad gráfica consistente.** Iconos SVG de un mismo lenguaje para explorar, cartas, pistas y postal. Mantener tipografías románticas en titulares y una lectura clara para información práctica.
14. **Continuidad del viaje.** Facilitar la copia y recuperación ya existentes, mostrar dónde se guarda el progreso y avisar si falla el almacenamiento. Mantener pendiente para otra fase la contribución compartida de Xiomara.
15. **App instalable y actualizable.** Tras aprobar la rama, preparar Pages, HTTPS, rutas relativas, caché versionada y recuperación sin conexión. Separar contenido de aplicación para no servir versiones incompatibles ni perder progreso al actualizar.
16. **Galería de referencia y pruebas de duración.** Capturas reproducibles por destino, matriz de equipos reales y registro de fluidez tras una sesión larga. Así cada nueva mejora debe demostrar que aporta belleza sin reintroducir calor o artefactos.

No es realista garantizar píxeles idénticos ni ausencia de calor en cualquier móvil. El objetivo verificable es conservar la dirección artística, legibilidad y riqueza de detalle, adaptando frecuencia y coste según el dispositivo y mostrando las limitaciones comprobadas.
