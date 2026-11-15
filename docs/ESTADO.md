# Estado y changelog

Lo nuevo arriba. Se consulta con `grep`; no se lee entero. Resumen por temas de `git log --oneline` (los hashes
permiten ver el detalle con `git show <hash>`).

## 2026-11-15 · La versión nueva llega en la carga, nunca con «Actualizar»

- Al abrir con una copia vieja guardada, la pantalla de carga comprueba la versión y, si hay nueva, la descarga y recarga
  antes de dejar empezar (`js/util/paquetes.js`, `js/main.js`). Probado en local con dos versiones: recarga a los 2–3 s,
  también tocando la carga; sin botón. No probado en un teléfono.

## 2026-11-06 · Los clips, tejidos en luz como el cuásar; los estrenos son eventos

- Motivo: el adelanto no gustó, y la primera versión con Tierra tampoco: «puntitos mal hechos», Tierra de dibujos, un sol que se volvía galaxia sin sentido.
- `js/escena/tejidoLuz.js`: superficies por píxel con hebras, sin nubes de puntos. `crearPlasmaDosSoles` usa w = log(z² − a²): sus líneas de nivel son óvalos de Cassini y la que pasa entre las estrellas es la lemniscata, así que el flujo traza el infinito. `crearPlasmaVuelta`: cinta, galaxia que cae en espiral desde ella. `crearCorona`, `crearFuego`.
- Versión nueva aplicada sola si llega antes del primer toque (`js/util/paquetes.js`): con la copia vieja abierta en el móvil salía «Actualizar» en vez del estreno. Probado con dos versiones construidas (A → B): sin tocar, recarga a los 3,8 s y abre B; tras tocar, no recarga.
- Estrenos con marca propia (`marcaEstreno`, `estreno-<clave>[-vN]`): subir `vuelta` en ESTRENOS lo reinicia una vez en cada dispositivo. Dos soles va en la 2 (para que se viera con su carta).
- Tras el videoclip de Dos soles (solo en su estreno), una carta: negro, sobre cerrado con corazón; al tocarlo se abre y sube la carta (`js/ui/cartaEstreno.js`, texto en `CARTAS_ESTRENO` de `js/data/universo.js`, borrador para Carlos). Su botón lleva a la galaxia.
- Pista para encontrar estrellas: una sola (Carlos quitó las demás): un anillo nítido y pequeño que se cierra cinco veces sobre la estrella que falta y se apaga; la cámara no se mueve (las de acercar parecían un viaje y quitaban la galaxia de la vista); la estrella sigue rosa. `tests/navegador/pistasEstrella.mjs`.
- Música: las pistas de los clips (mes-11, mes-12, mes-dossoles) llevan `clip: true` y nunca son la «canción del mes» en casa. Antes, en noviembre, mes-11 (un tramo de «Middle») sonaba en casa y antes del estreno. `tests/navegador/musicaEstreno.mjs` registra qué suena en cada momento.
- Dos soles con «Si te interesa» (39,27–104,05 s del original, 64,78 s): el estribillo entra a los 31,21 s, al tocarse; el guion se estira por tramos y late al compás de 2,3915 s. Puente más bajo (se quemaba en una X blanca) y cámara algo más abierta a los 34 s.
- Año, tras revisarlo Carlos: los soles giran alrededor de la cinta (`giroPareja`), también en su lugar; se recuperan los colores llenos (la paleta apagada del cambio anterior quedó fea), hebras retorcidas y ramales; fuera las ondas de cada mes (aros grises).
- Cambio de dirección tras revisar los clips enteros junto a casa y el cuásar: parecían de otra obra. Paleta de casa, negro y estrellas nítidas en vez de nebulosas como rocas; año con cámara inclinada y final «la misma galaxia que abres cada día»; cinta fina; nombres en una línea arriba; fuera fuegos y estallidos de líneas; la galaxia late en el estribillo final; infinito con cruce más fino.
- Dos soles: discos que crecen hasta tocarse a los 30,93 s, puente de materia, soles que menguan; nombres sobre cada sol. Año: dos soles recorren la cinta, el interior se llena mes a mes y al cerrarse la materia cae hasta encenderse; nombres y corazón en DOM dentro del anillo, frases de `config.recuerdos`.
- Año: los soles son la causa. Junto a la cinta van con su infinito en pequeño y la cámara los sigue; al cerrarse se separan y bajan por la cresta de cada brazo (`solesAnio`, misma espiral que el sombreador), lo que queda encendido es lo recorrido; al encontrarse a los 60 s encienden el centro, suben al anillo y se reúnen arriba.
- Dos soles: brazos que se tienden hasta tocarse (`alcance`), estallido de hilos, velos de polvo con paralaje, latido al compás de 2,58 s (deducido de sus marcas, sin comprobar de oído), espirales de materia al final.
- Tras revisarlo Carlos: en el año y «Falta una luz» los soles van solos, sin el plasma ni el infinito del mes 11 (era un universo dentro de otro). Trazo incandescente tras cada sol (`rSol`), nudos en los brazos, estallido al encontrarse, cinta y estrellas que se encienden a su paso. Dos soles: fuera el contador de km y las hebras del otro color (se comían el clip); dos corrientes continuas en el puente (la versión con `sign(p.y)` partía la imagen en dos a lo largo del eje), oro y rosa mezclados hebra a hebra, exposición suave `1 − exp(−c·b)` y superficies solares más limpias.
- Año, más rico: cada brazo del color del sol que lo pintó, galaxia más allá del anillo (azules, solo tras cerrarse la vuelta), velos, onda por cada mes (`uMesT`), cinta de cometa que desaparece al cerrarse (si no, corte recto en el ángulo 0) y exposición suave.
- Lugares `dossoles` y `vuelta`: la misma luz (`uLineal`, atenuada por el bloom). Fuera todo el código de motas de los clips y la Tierra. `js/escena/mundoClip.js` solo da el cielo de casa.
- Evento: pastilla pequeña «Se abrió…» encima del muelle, sin tapar nada (`anunciarEvento`).
- `js/util/horaReal.js`: HEAD a la propia web y cabecera Date; corrige Date si el reloj difiere más de 2 min (solo en github.io). Sin IP: Pages no tiene servidor propio y la marca de visto es por dispositivo.
- Intro: botón «Saltar intro» durante el clip; la canción salta al compás de la tarjeta (`tests/navegador/saltarIntro.mjs`).
- `tests/navegador/fpsClip.mjs`: fluidez de un clip en móvil emulado con CPU a un cuarto. El coste real está en los píxeles: falta medir en teléfono.

## 2026-11-05 · Revisión de los clips: soles sólidos, océano y galaxia

- Soles (clips y lugares): esfera con plasma por píxel (`js/escena/estrellaSolida.js`), corona en chorros finos de motas; fuera las decenas de miles de motas de superficie.
- Dos soles: el océano son ondas que nacen de cada sol y se encienden al cruzarse; corriente menos «cuerda»; viento más difuso; PC un poco más lejos al empezar (el sol cercano se cortaba).
- Clip del año: galaxia con brazos más anchos que ya no se queman; corazón rosa; fuegos sin la mancha inicial (las motas sin salir estaban encendidas en el origen) y mayores.
- Fondo con banda de estrellas (`direccionCielo`). Lugar del año visto de lejos: estrellas con tamaño mínimo 5 px (`uEstrellaMin`), sin rejilla de destellos. `CERCA`: dossoles 420, vuelta 300.
- `hogar.m4a` ya no se pide en el vuelo de entrada (acaba en el reposo). Aviso «Preparando…» si un clip se abre sin estar preparado.
- `encuadre` falla igual en `main` (mismos 11 fallos): no viene de estos cambios.

## 2026-11-05 · Estrenos tras la intro, sin negro, y tiara

- Estrenos (`clipDeEstreno`): la intro sale como siempre con su música y, al pulsar para entrar, el clip sustituye al vuelo; al acabar, a casa. Una vez por dispositivo, anotada al verlo entero. Dos soles desde el 15/11 (hasta el 14/12) y el año desde el 15/12 (hasta el 14/01), esperando a la primera visita si no se entró ese día. Sustituye a la versión de abajo, que quitaba la intro.
- «Falta una luz» se ve una vez, al encontrar la estrella del mes 11; se repite desde el álbum a partir del 15/12 (`clipEnAlbum`). Dos soles y el año solo arrancan solos al llegar a su lugar si no se han visto.
- Sin negro antes del clip: corte directo a su primer cuadro; se deja preparado en la carga (estreno) o al llegar a su lugar (`teatro.anticipar`). Desde el álbum, si no está preparado, se prepara con la escena a la vista.
- En vertical (`camara.distV`) todo se ve desde el primer cuadro, sin el plano cerrado.
- La guirnalda sale de la galaxia: tiara de trece estrellas sobre «Xiomara» (`anilloVuelta.js`). El lugar del año pasa a órbita fina con los dos astros recorriéndola (`uTrenza 0`).
- Soles de Dos soles repartidos casi por igual (Fibonacci con azar), con menos contraste de granos.

## 2026-11-05 · Los días del clip y la guirnalda

- El 15/11/2026 y el 15/12/2026 (fecha de Argentina) la visita abre con su videoclip, sin intro ni tarjeta (`clipDelDia`): se baja su canción en lugar de la de la intro y el clip se prepara durante la carga. Solo sigue haciendo falta el toque (audio). Al acabar, llegada corta a casa.
- Sin negro de espera: el clip se destapa con su primer cuadro aunque la canción tarde (plazo 2,5 s). `banda.preparada` ahora pide decodificar (agotaba el plazo de 8 s). Las canciones de clips ya abiertos van a la cola de reposo.
- Galaxia: crece por escala del grupo entero (`escalaGalaxia`, 3 %/mes desde el mes 10); fuera las motas añadidas.
- Anillo → guirnalda de doce eslabones alrededor del corazón, de cara a la cámara y avanzando a diario (`mesesConFraccion`). Los clips dibujan la misma cadena. Constelación del año, mucho más tenue.
- Clips: cámara que empieza cerca y se abre; soles de superficie continua; onda al cerrarse la órbita, colores de galaxia, corazón que late, vuelta siguiente al final. Dos soles: marea, hebra enroscada, viento en espiral y océano.
- Arreglado: `crearLugarVuelta` no añadía su objeto (el `grupo.add` estaba en un comentario).

## 2026-11-04 · La primera vuelta al Sol

Videoclips «Falta una luz» (mes 11) y «La primera vuelta» (mes 12), anillo de la órbita alrededor de casa, dial de doce marcas y tema dorado del día del año. Textos de los clips: borrador para Carlos (`js/util/guionVuelta.js`). También: lugares por fecha «Dos soles» (15/11, con videoclip) y «Nuestra primera vuelta» (15/12), crecimiento mensual de la galaxia (`js/escena/crecimiento.js`), pulido de CSS de toda la interfaz.

## Estado (2026-11-03)

- `main` = 9c52a7b (cada push a `main` se publica en GitHub Pages). Trabajo en curso en la rama `mejoras/noviembre`.
- Perfil ultra único (60 FPS fijos, resolución por presupuesto de píxeles, sin escalones). Dentro nunca se duerme.
- Pendiente conocido (`docs/rendimiento-resumen.md`, «Lo que queda»): carga antes del toque algo por encima del objetivo
  (5,85 MB móvil / 8,2 MB PC frente a 5 / 7), tirones si se toca antes del 100 %, un cuadro de 33 ms en «Empezar» en el
  móvil. Pruebas de navegador que ya fallaban antes de la rama ultra fluido: `encuadre`, `geometria`, `nebulosas`,
  `paisaje`, `rendimiento`, `universo`, `vuelo`.
- Prueba sostenida de 15–20 min en un teléfono físico: pendiente.
- `npm run check` falla en `main`: toma la data URI SVG de `--grano` (css, 62bfe63) por la ruta de un archivo.

## 2026-10-28 · Cierre de «ultra fluido» y retoques
- Medidas finales en `docs/rendimiento-despues.json` y capturas DESPUÉS comparadas (9d7c4a3).
- Videoclips: los gigantes vecinos no se recortan (parpadeaban); tocar no saca besos ni frases (20bf642). Ocultación de
  gigantes lejanos decidida antes de las partes (e161777); cuásar visible desde el púlsar y TON 618 desde Sagitario A*
  (62b51a7).
- Dentro del universo nunca se duerme: sin tocar sigue a 60 (antes, imagen fija a los 15 s) (52eb289).
- «Mirar hacia casa» sin Vía Láctea ni estrellas del cielo delante y bien encuadrada (130efb6).
- Portada: la foto de la tarjeta es un collage de las seis grandes (9c52a7b).

## 2026-10-27 · Encargo «ultra fluido» (`docs/PROMPT-ULTRA-FLUIDO.md`)
- Medidor `?fps`, recorrido de rendimiento y capturas en poses fijas; línea base ANTES (fdec87e, c507d6e, 88e8942).
- Un solo reloj maestro, el del audio (47d1baa); música de viajes con un solo fundido cruzado (31cb39a); contexto parado
  antes del toque (ccbf3b9).
- Carga por prioridad: cola de descargas (56f033c), precarga en reposo tras la intro (ad62728), three.js minificado por el
  mapa de importación (f592a74), servir.py con gzip (8bb87bd).
- Perfil ultra único: fuera 60↔30, resolución dinámica y escalones (18cafba); pasada final única con RCAS (0b56c6a);
  resolución fija por presupuesto (ad31317); gas volumétrico a ¼/½ con reproyección (559dc49).
- Nada nuevo en la GPU ni memoria por cuadro en vuelos, clips y gestos (d1d4dc3, b7781cf, ce5e9d2, 56b9cd6); calentamiento
  a tamaño real (46203f9); plan del vuelo en un obrero (7715786); recorte por grupos (7e688f7); menos órdenes de dibujo.
- Interfaz sin `backdrop-filter` sobre el 3D (62bfe63). Presupuesto móvil 1,65 Mpx (5772d3e).

## 2026-10-26 · Videoclips de los gigantes y director de cámara
- Director de cámara común con capa global de suavidad (c12abd3), móvil centrado y cabiendo a lo ancho (b72e492).
- Videoclips nuevos: TON 618 (15fe4b1), Deneb (8c6f723, 486e9ba), Sagitario A* (f1af2c7, 44209fc imagen del EHT), cuásar
  (b97244a, 43bb163), supernova al milisegundo (4abfb1e, 02129d5 sin bola de fuego), púlsar rehecho (f7bfb7c, c42f0e3).
- «Volver a sentirlo» (9ff7b25). Nada de corazones, infinitos ni constelación de casa junto a los gigantes (2c628e9).
- Sistema solar: Sol vivo sin halo, lunas y anillos, salida por su marca (7d1f0f9, 335f67f, 1dd5baf).
- Intro con «Maps» rodada sobre un mapa de motas en WebGL (7b945b5, 4032714); clip solo con todo descargado (d5db131).
- Estancias: solo la canción sin la voz (BS-RoFormer), separación ganadora por estancia (5011ec6, 0a12b51).
- Memoria del iPhone a la mitad (edc85c8); paquetes del service worker sin recargas solas (10a48f3).
- Cometa rediseñado (42358cb, 48521db). Pruebas `tironesViajes` y `entrada` con CPU ×4 (f22b1b4, 494b49a).

## 2026-10-25 · Carga del iPhone, banda sonora y escenas
- Texturas horneadas en el PC (f4bff4a) y cálculos horneados en un paquete (daebeb0, bc30e99); obreros de texturas con
  red de seguridad (7529369, 9c10769, 9021350).
- Fuentes WOFF2 recortadas, service worker tras la carga (4227690); es-module-shims solo donde falta (e9eaa6e).
- Banda sonora sincronizada por momentos (cfdad96, 3ecdee2); analizador de canciones (f5c4be2, 104bb9d).
- Escenas al llegar que no se saltan, con mecanismo común (41159a6, ab63563); mapa en tres zonas (073931d, f43805a).
- Resolución dinámica sin reasignar búferes (b61ed80; retirada después el 27).

## 2026-10-22 a 2026-10-24 · Primer universo y móvil
- Primer commit: «Nuestro pequeño infinito» (315f76e).
- Móvil: misma luz que el PC, telaraña con exposición automática real (41b9f25, a34cc24), HDR en media precisión
  (f640525), sin cierres en el iPhone (0380930).
- Giro y zoom como en los juegos (767a4ed, 9552f30); sin giroscopio (7972275); viajes en un solo movimiento (b6eb24c,
  7b69846); salto al sistema solar a la velocidad de la luz (f70d575).
- Sin recompilaciones al llegar (ce8a998); ruido sin `fract(sin)` (a2850d1); ampliación bicúbica (ed33294).

Historia anterior al repositorio (rama `feature/universo-vivo`, 17–19 de octubre): `docs/archive/`.
