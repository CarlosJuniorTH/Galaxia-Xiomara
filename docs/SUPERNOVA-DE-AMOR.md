# De tanta luz, nacimos nosotros

Implementación centrada en la supernova, en `feature/universo-vivo`. Sin merge ni publicación. Los cambios de fondo, planetas y salto de Claude se conservan; no se incluyen ni se revierten como parte de esta entrega.

## Experiencia

- Encuentro de dos luces, breve silencio, expansión contenida y transformación gradual en corazón tridimensional de polvo, gas y seis filamentos.
- Dos estrellas dorada y rosa orbitan dentro del corazón. El remanente no desaparece ni obliga a volver a casa.
- Una frase: «De toda esta luz, mi lugar favorito sigue siendo contigo».
- Contemplar sin dedicatoria, repetir desde la estrella, guardar una postal dedicada o volver a casa. Escape y Salir disponibles durante toda la escena; sonido silenciable.
- El recuerdo se guarda con el progreso existente y se puede visitar desde el álbum después de recargar.
- La cámara y las fases usan el tiempo de la escena. El dibujo del fondo se aísla únicamente durante este momento y se restaura en el mismo cuadro.

## Organización

`js/escena/supernova.js`: estrella, transformación en GPU y remanente. `js/util/supernovaAmor.js`: tiempos y geometría compartidos. `js/escena/focoSupernova.js`: aislamiento reversible del dibujo. `js/ui/supernovaAmor.js` y `css/supernova.css`: presentación y controles. `js/ui/sonidoSupernova.js`: pasaje original conectado al volumen existente. Integraciones puntuales en escena, interfaz, música, toques y datos del destino.

## Validación

Pruebas de geometría, secuencia, persistencia, repetición y restauración ante errores en `tests/supernova-amor.test.js`. Las comprobaciones de navegador se hacen en el equipo de desarrollo, incluidas dimensiones verticales; no equivalen a Safari/Android físicos ni certifican el consumo térmico.

Para verlo: entrar al universo → Explorar → «De tanta luz, nacimos nosotros». Tras descubrirlo, también aparece en el álbum. «Volver a sentirlo» permite repetir la secuencia sin borrar ningún descubrimiento.

Verificado: 54 pruebas JS, 4 del servidor, comprobación de 72 archivos JS y empaquetado de 111 recursos. En navegador de escritorio y viewport vertical 430×820: revelación, recuerdo tras recargar, repetición, contemplación, silencio, postal, salida durante la secuencia y acceso desde álbum; sin errores de consola observados. Capturas en `.pruebas/supernova-amor-pc.jpg` y `.pruebas/supernova-amor-movil.jpg`. La audición y el comportamiento térmico en un teléfono físico siguen pendientes.
