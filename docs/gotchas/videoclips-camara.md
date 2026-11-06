# Trampas: videoclips y cámara

## Qué debe contar un clip
- Cada videoclip cuenta lo que hace FÍSICAMENTE el objeto siguiendo la canción (TON 618: una estrella cae y la marea la
  estira; Sagitario A*: se traga un grumo de gas en cada palabra clave; cuásar: los chorros nacen con las frases…).
- Escenas en el reloj de su fragmento (`bandaSonora.tiempo(id)`), no se pueden saltar; mecanismo común
  `escenaEnCurso(id, s)` / `terminarEscena(id)` (ab63563). Durante el clip, `ocupado('clip')` (9228790).
- «Volver a sentirlo» repite canción, escena y cámara desde el 0 (9ff7b25).

## Director de cámara (`js/util/directorCamara.js`)
- Pistas de planos `{ t, pos: [az, el, dist], mira, fov, curva, giro }` en el sistema del gigante y en radios R
  (`directorCamara.js:3`). Pistas en `guionAgujeros.js` (CAMARA_AGUJEROS), `supernovaAmor.js`, `escenasGigantes.js`.
- Regla de Carlos: lenta, suave, centrada en el móvil y **siempre en un solo sentido** (nada de girar a un lado y luego
  al otro). Lo garantiza la capa global `SUAVIDAD` (`directorCamara.js:58`): cortes a menos de `CORTE_MIN` = 8 s se
  vuelven pasos suaves, tangentes monótonas (`:154`), filtro críticamente amortiguado con v/a máximas.
- Una pista nueva debe pasar `tests/director-camara-suavidad.test.js` (monotonía, velocidad, llegada a tiempo).
- Móvil vertical: la distancia se escala para que quepa a lo ancho como en el PC, tope ×2,5 (`directorCamara.js:74`).
- Entrada al clip desde donde dejó el viaje: filtro más blando 4 s (`ENTRADA_LARGA`, `:70`).
- Los cortes no encienden las estelas del salto (835f1d2).

## Qué se ve junto a los gigantes
- Nada de fugaces, cometas, corazones, infinitos ni la constelación de casa cerca de las seis grandes (b7751af, 9be4970,
  2c628e9).
- Durante el clip los gigantes vecinos no se recortan (parpadeaban, 20bf642). La ocultación por pocos píxeles se decide
  antes de las partes (e161777). El cuásar se ve desde el púlsar y TON 618 desde Sagitario A* (62b51a7).
- Tocar la pantalla durante un clip no saca besos ni frases (20bf642). El panel de abajo vuelve siempre al terminar
  (cbc1290).

## Clips de la primera vuelta al Sol (meses 11 y 12)
- Guion puro en `js/util/guionVuelta.js`, escena propia en `js/escena/teatroVuelta.js` (una geometría, un dibujo, todo en el
  vértice), interfaz en `js/ui/teatroVuelta.js`. La escena grande no se dibuja mientras dura; todo se prepara con la
  pantalla en negro y se libera al terminar. Canciones `mes-11.m4a` y `mes-12.m4a`: fuera de la cola de reposo (`precarga.js`),
  se piden solo cuando tocan.
- Se ven con `?fecha=2026-11-15` / `?fecha=2026-12-15` en el servidor de casa. Capturas: `tests/navegador/tiraVuelta.mjs`.
- `js/escena/anilloVuelta.js`: desde el mes 11, la tiara de trece estrellas sobre el nombre (hijo del grupo del corazón, siempre de cara a la cámara; un dibujo más). Avanza a diario.
- Estrenos (`clipDeEstreno` en `js/util/guionVuelta.js`, `estreno` en `js/main.js` y `js/ui/entrada.js`): la intro de siempre y, al pulsar, el clip en lugar del vuelo; una vez por dispositivo. `?estreno` lo repite (solo fuera de github.io); `?sinIntro` y `?sinEstreno` lo desactivan (el arnés siempre pone uno de los dos). Nada de negro antes de un clip: `teatro.anticipar` al llegar a su lugar. En vertical manda `camara.distV`.
- Cámara: `camara.abre(s)` reparte el alejamiento del vertical (0 = de cerca, 1 = cabe todo); las transiciones de `abre` no deben notarse como un salto.

## Viajes
- 10–15 s en un movimiento continuo, recorridos por distancia real (7b69846). Plan del vuelo en un obrero desde el clic
  (7715786). El paso al sistema solar cambia de escena con la pantalla ya negra (e4c0fd6).
- Superficie de los soles: `js/escena/estrellaSolida.js` (malla, no motas). En los clips las motas usan prueba de profundidad contra ella; los textos van en el plano a 30 unidades, delante del Sol.

## Luz de los clips (tejidoLuz.js)

- Formas principales como superficies por píxel, no Points: se dibujan directo a pantalla, en colores de pantalla, con alfa premultiplicado (el polvo tapa y la luz se suma).
- Las hebras han de correr a lo largo de la forma: en círculo, la galaxia parecía un túnel. Ver la `q` de cada plasma.
- Si sube la exposición, el centro se quema a blanco y se pierde el infinito: su forma se lee por contraste con lo de fuera, no por una línea encima.
- Colores llenos, los de cada sol (oro, fuego, carmín / rosa, fucsia, violeta), con negro de verdad alrededor y entre brazos: apagados dan caqui y malva sucio (Carlos lo rechazó). Plano inclinado, sin llegar a ponerse de frente.
- Los dos soles giran ALREDEDOR de la cinta, que pasa entre ellos como el eje de un tubo (`giroPareja`), nunca en el plano cruzándola.
- Hebras cortas y retorcidas: largas y rectas parecen pelo peinado. Nada de aros finos (se leen como un fallo).
- El cielo (`guion.cielo` ≈ 0,05): sus nebulosas de cerca se leen como rocas; las estrellas las pone `js/escena/mundoClip.js`.
- Coste: unas 8–10 lecturas de la tabla de ruido por píxel; se descarta lo enmascarado antes de calcular. Medir en teléfono real tras subir la exposición o el tamaño.
