# Encargo de Carlos — Galaxia-Xiomara: calidad ultra, 60 FPS sin un solo tirón, música clavada a la imagen

Rama: `rendimiento/ultra-fluido` sobre `main`. Sin push ni publicación hasta que Carlos lo diga. Todo de una vez; solo se
para al final, con todos los criterios de aceptación medidos y cumplidos. Commits pequeños y claros.

## Lo que quiere
Como Fortnite / Call of Duty en ultra en su móvil: calidad visual máxima siempre; sin selector de calidad y sin que la web
baje la calidad por su cuenta en mitad de la experiencia; 60 FPS estables; girar con el dedo tan suave como en un juego; la
música siempre acompañando a lo que se ve, nunca cortada, arrastrada ni a saltos.
Aparatos de referencia: iPhone 14 Pro Max (Safari), Motorola Moto G54 5G (Chrome); PC con Chrome y Safari.

Ultra en un juego es técnica, no fuerza bruta: presupuesto fijo de ms por cuadro, shaders precompilados, nada se carga ni
compila mientras te mueves, LOD y culling, casi todo opaco, efectos a resolución reducida y reconstruidos, resolución 3D
interna acotada y reescalada con enfoque, y un solo reloj para audio y animación. La calidad se mantiene (o mejora)
aplicando esas técnicas, no quitando cosas.

## Causas encontradas (todas hay que resolverlas)
A. Audio y animación encadenados en los dos sentidos
1. El clip de la intro (js/ui/entrada.js, relojAhora) sigue a audio.currentTime de un <audio>, que avanza a saltos: el
   clip se congela hasta 3 s esperando, y el suavizado con recolocación (>0,3 s) produce saltos visibles.
2. Las escenas de los gigantes usan el mismo reloj (banda.tiempo() en js/ui/escenasGigantes.js, escenaAgujeros.js,
   supernovaAmor.js y sincronizar de la supernova): mismo problema.
3. En los viajes, acompasar() (js/ui/bandaSonora.js) fuerza la música a seguir al vuelo cada 120 ms (Chrome: playbackRate,
   suena arrastrada; Safari: corta y salta con fundido). Un tirón visual se convierte en corte de música.
4. El toque de inicio: desbloquear() hace play() a las ~17 pistas <audio> a la vez (cada una con MediaElementSource);
   mientras, inicio hace un seek a 0 con su play() pendiente: arranque a trompicones de los primeros segundos.
B. Carga excesiva y duplicada
5. js/util/precarga.js descarga todas las canciones (~12 MB, ~7 MB de estancias) y en PC el cielo en alta antes de empezar.
6. El importmap apunta a three.module.js sin minificar (1,27 MB) con three.module.min.js al lado; en la red aparece pedido
   4 veces (precarga + service worker + import), igual que otros módulos (texturasPlaneta.js).
C. GPU sin presupuesto
7. Sobrepintado masivo: 112 materiales aditivos, 134 transparentes, 75 Points, 31 Sprite.
8. Pasadas a pantalla completa en cada cuadro aunque no aporten: escena HDR, nebulosa volumétrica por raymarching a 24
   muestras (capaVolumen.js), galaxias de la telaraña, lente y salto (aun desactivadas siguen en la cadena), bloom,
   SalidaPass con enfoque al lienzo nativo (hasta DPR 2,5 en móvil).
9. Resolución interna por DPR (2× en móvil, ~3 MP) en lugar de por presupuesto de megapíxeles.
10. backdrop-filter encima del lienzo WebGL (~13 reglas en css/universo.css, interfaz.css, ventanas.css, viajes.css,
    entrada.css): en iOS obliga a desenfocar la galaxia entera cada cuadro.
D. Estrenos en frío y trabajo en mal momento
11. El calentamiento (js/escena/carga/preparacion.js) dibuja en 128×128; los búferes a tamaño real (bloom, volumétrica,
    salida) se estrenan en el primer cuadro del vuelo de entrada.
12. Ese primer cuadro llega tras 32 s de 3D dormido durante el clip.
13. En los primeros cuadros del vuelo coinciden: el fundido de 1,6 s de la portada HTML sobre el lienzo, el plan del vuelo a
    trozos (vuelo.plan.preparar), el arranque de la música de viajes y descargas de estancias en segundo plano.
14. El clip de la intro es un canvas 2D a pantalla completa (DPR hasta 2) que redibuja cientos de arc() y textos por
    cuadro, más un segundo lienzo WebGL para el mapa.
E. Parches que añaden tirones
15. Paso 60↔30 FPS por inactividad (js/util/planificador.js, ritmoAhorro, contemplacion: 30).
16. Resolución dinámica en plena experiencia (js/util/resolucion.js, js/escena/calidad/gestor.js) y escalones de calidad
    en caliente: cada cambio de modo es un tirón.

## Arquitectura nueva (todo)
### 1. Un solo reloj maestro: el del audio
1. js/util/relojMaestro.js: el tiempo de toda la experiencia sale de AudioContext.currentTime (continuo, monotónico,
   exacto); con la música apagada, de performance.now(). Se lee una vez por cuadro y se interpola con performance.now()
   (precisión de cuadro sin saltos). Compensa outputLatency/baseLatency (lo que se ve = lo que se oye).
2. Canciones con marcas visuales (inicio, viajes y las de cada destino/gigante): AudioBufferSourceNode programado a
   ctx.currentTime + 0.12; posición = ctx.currentTime − instanteDeInicio + desde. decodeAudioData justo a tiempo: inicio
   y viajes en la carga; la de un destino en cuanto se elige, antes de despegar, decodificada durante el vuelo. En memoria
   solo la que suena, la siguiente y viajes; las demás se liberan (memoria de iOS).
3. Estancias (sin marcas): siguen con <audio> + MediaElementSource, con el fundido actual.
4. Intro, vuelo, viajes, supernova y todas las escenas de gigantes leen este reloj. Eliminar: sondeo de currentTime,
   suavizado de reloj(p), espera de 3 s y recolocaciones de relojAhora, acompasar(), ritmo(), SIN_RITMO y todo cambio de
   playbackRate o salto de la música.
5. Los vuelos van con el reloj de la música: la de viajes arranca una vez en el segundo 15 − duraciónDelVuelo y la
   posición del vuelo es función de ese reloj. La música nunca se toca; un cuadro lento no descuadra nada. La llegada cae
   exactamente donde acaba la música.
6. desbloquear() en el toque: solo ctx.resume() y un AudioBufferSourceNode de silencio de 1 muestra. Estancias se
   desbloquean una a una más tarde (toque de «Empezar» y siguientes gestos). Nunca más de un play() por gesto.
7. Las marcas (alMarca) se disparan comparando el reloj maestro con las marcas en el bucle de dibujo (no setInterval).
8. Fundidos con rampas de GainNode programadas en el reloj de audio; sin chasquidos.
### 2. Carga ligera, nada a la red ni a la GPU durante la acción
1. Antes de la intro solo lo imprescindible: módulos minificados, texturas horneadas, paquete.bin.gz, el cielo (en PC el
   de alta cuando no compita), inicio y viajes.
2. Lo demás por prioridad: canción de un destino al elegirlo; su estancia al llegar; el resto en reposo
   (requestIdleCallback). Ninguna descarga ni decodificación de imagen durante un vuelo, clip o gesto (se encola). El
   service worker puede seguir guardando.
3. Importmap a three.module.min.js; ninguna petición duplicada (cada archivo una sola vez).
4. Objetivo: antes del toque ≤ 5 MB en móvil y ≤ 7 MB en PC. Actualizar LEEME.md.
### 3. Un único perfil ultra, con presupuesto de juego
1. Un solo perfil de calidad visual para todos (el actual «alto»). Quitar selectores visibles; ?calidad= solo como
   herramienta oculta de pruebas.
2. Eliminar el paso 60↔30, la resolución dinámica en caliente y los escalones en caliente (planificador.js,
   resolucion.js, calidad/gestor.js y su uso en index.js). Dentro: 60 FPS siempre en móvil; en PC, el ritmo de la
   pantalla con tope 120. Con la vista totalmente quieta, nada animado y sin tocar 15 s: no se dibuja (0 FPS); vuelve a
   60 en el mismo cuadro del toque o de cualquier animación. Nunca un ritmo intermedio.
3. Única excepción: la protección actual contra el cierre por memoria de iOS (nivelSeguro en js/util/dispositivo.js), solo
   en la visita siguiente a un cierre real, nunca en caliente.
4. Resolución interna por presupuesto de píxeles, fija toda la visita: móvil ≈ 1,3 MP; PC ≈ 3,5 MP; lienzo de salida en
   móvil a DPR 2 como mucho; la SalidaPass reescala con enfoque adaptativo (estilo FSR1 EASU+RCAS o CAS, un solo pase).
   Validar con capturas a la nativa (texto 3D, bordes de planetas, estrellas no blandos ni pixelados); si hace falta,
   subir algo la resolución interna y compensar en las pasadas.
### 4. Pasadas de GPU eficientes con el mismo aspecto
5. Bloom tipo motor de juego: cadena de mips (downsample 13-tap, upsample tent) de 1/2 a 1/32. Mismo aspecto. Conservar
   la protección de profundidad para que no se derrame sobre los agujeros negros. Comparar capturas en casa, supernova,
   TON 618 y Sagitario A*.
6. Nebulosa volumétrica (capaVolumen.js): a 1/4 de la resolución interna en móvil y 1/2 en PC, con ruido azul +
   reproyección temporal + reconstrucción bilateral a resolución completa (igual o mejor que ahora); muestras adaptativas
   (salto en vacío, salida temprana). Si no hay nebulosa volumétrica en el frustum, la pasada no se ejecuta.
7. Lente y salto solo en la cadena mientras están activos (si no, no existen, ni copia de imagen). Fusionar en una pasada
   final lo posible: lente + salto + composición del bloom + salida.
8. Sobrepintado, en todos los Points y Sprite: gl_PointSize acotado según la resolución interna; discard de alfa < 0,01;
   fade y ocultación real de lo demasiado cercano o fuera de rango; sprites recortados al contenido.
9. LOD y culling por destino: completo (cerca), simplificado (media), impostor horneado (lejos), con fundido. Lo que está
   fuera de vista no se dibuja (cajas de contorno correctas, frustumCulled activo).
10. Agrupar capas que comparten material y mezcla. Objetivo de draw calls en móvil: < 150 en casa, < 250 en el peor gigante.
11. Revisar shaders (galaxia, nucleo, telarana, cuasar, pulsar, supernova, deneb, ton618, sagitario, solar, planetas,
    cieloProfundo*, polvo, nube): mediump donde no haga falta highp; lo que pueda ir por vértice, por vértice; ruido 3D en
    textura si se usa mucho; sin bucles largos por fragmento.
### 5. Todo estrenado antes de que se vea
12. Calentamiento a tamaño real con todas las pasadas activas (lente, salto, bloom, volumétrica, telaraña, sistema solar),
    recorriendo cada destino con la cámara en su pose de llegada. KHR_parallel_shader_compile / compileAsync y esperar.
13. En los últimos ~4 s del clip de la intro (tarjeta final, portada opaca), dibujar el 3D completo detrás con la cámara
    en la pose inicial del vuelo de entrada: al pulsar «Empezar» el 3D ya lleva cuadros calientes.
14. El plan del vuelo de entrada y de cada viaje se calculan antes de despegar (obrero o en reposo), nunca en sus cuadros.
15. Registrar en el medidor cualquier initTexture, compilación, subida de geometría o render target: durante vuelos,
    clips y gestos debe ser cero.
### 6. Interfaz que no le cuesta a la GPU
16. En las capas encima del 3D mientras se mueve, sustituir backdrop-filter por fondos semitransparentes con degradado y
    ruido sutil que imiten el cristal. backdrop-filter solo en cartas y paneles que ya pausan el 3D.
17. El fundido de la portada al entrar en su propia capa compuesta (will-change: opacity solo durante el fundido; solo
    opacity y transform).
18. Nada de box-shadow, filter o mix-blend-mode animados sobre el lienzo en movimiento.
### 7. Clip de la intro tan fluido como el 3D
19. Lienzo 2D del clip a DPR 1,5 como mucho en móvil (textos en HTML).
20. Cachear en lienzos fuera de pantalla lo que no cambia (cielo, motas del mapa por nivel de zoom, el corazón como
    sprites) y componer con drawImage. Si el clip y el mapa WebGL pueden ir en un solo lienzo WebGL, unirlos.
21. El clip lee el reloj maestro: música e imagen arrancan en el mismo instante programado y no se separan nunca.
### 8. Hilo principal limpio y gestos de juego
22. Ningún trabajo > 4 ms en un cuadro durante vuelos, clips o gestos (obreros existentes o reparto en reposo).
23. Cero asignaciones por cuadro en animar() y los actualizar() de cada capa; sin dientes de sierra de GC en vuelos/gestos.
24. Ninguna lectura de layout (getBoundingClientRect, getComputedStyle) en el bucle de dibujo; medirZonaLibre solo con
    ResizeObserver y cambios de interfaz.
25. Gestos (js/util/giro.js, zoom.js, OrbitControls): aplicar en el mismo cuadro del evento con getCoalescedEvents();
    inercia integrada con el reloj real; latencia dedo→imagen ≤ 1 cuadro.
26. Quitar del código normal los diagnósticos permanentes (fetch('./__diagnostico3d'), dataset que cambian cada cuadro,
    window.__*): solo con #debug o ?diag.
### 9. Limpieza
27. Eliminar el código de compensación que ya no haga falta y los comentarios de parches retirados.
28. Actualizar LEEME.md («Fiabilidad 3D» y «Música»): perfil ultra único, reloj maestro de audio, presupuesto por cuadro,
    carga por prioridad.

## Medición y criterios de aceptación (obligatorios)
1. ANTES de cambiar nada: medidor ?fps con FPS, p50/p95/p99 de tiempo de cuadro, cuadros > 25 y > 50 ms, long animation
   frames, draw calls y triángulos, resolución interna, tiempo de GPU por pasada (EXT_disjoint_timer_query_webgl2),
   subidas y compilaciones, y desfase audio↔imagen.
2. Script Playwright (ampliar tests/, ya hay entrada.mjs con CPU=) que recorra todo el flujo y guarde un JSON por tramo:
   carga, toque, clip completo, «Empezar», vuelo de entrada, un viaje a cada destino y gigante con su escena completa,
   sistema solar, un giro con arrastre e inercia, un zoom, vuelta a casa. Configuraciones: móvil emulado (430×932, DPR 3,
   CPU ×4) y PC.
3. Línea base en docs/rendimiento-antes.json; resultado en docs/rendimiento-despues.json.
4. Criterios con móvil emulado a CPU ×4 (todos): en cada tramo p95 < 16,7 ms, p99 < 20 ms, cero cuadros > 50 ms; vuelos y
   gestos como mucho 1 cuadro > 25 ms por tramo; música: cero cambios de playbackRate, cero saltos, cero cortes, desfase
   audio↔imagen < 20 ms en todo el clip y escenas; cada viaje aterriza al acabar su música (±20 ms); cero descargas,
   decodificaciones de imagen, subidas a GPU o compilaciones durante vuelos, clips y gestos; carga antes del toque ≤ 5 MB
   móvil, ≤ 7 MB PC; cada archivo pedido una sola vez.
5. Calidad: capturas antes/después en las mismas poses (casa, cada gigante en su momento más espectacular, sistema solar,
   supernova, el clip en 5 instantes) en docs/capturas-rendimiento/. Diferencias solo si son imperceptibles o mejora; si
   algo se ve peor, corregirlo antes de terminar.
6. Pasan todos los tests existentes.

## Al terminar
En español y breve: tabla antes/después por tramo, capturas comparadas, lista corta de qué causaba cada tirón y cómo quedó
resuelto, y cómo probarlo en el iPhone y en el Moto (servidor local de casa) y qué mirar en ?fps.
