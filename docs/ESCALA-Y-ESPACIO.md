# Escala y espacio · especificación vigente

Rama `feature/universo-vivo`. Este documento describe **cómo está construido el universo ahora**. La historia de cómo se llegó aquí está en [REVISION.md](REVISION.md) y en los registros fechados (`VIAJES-Y-ESCALA-COSMICA.md`, `MOVIMIENTO-Y-SUPERNOVA-REVISION.md`, `SUPERNOVA-DE-AMOR.md`). Si un registro antiguo contradice este documento, este documento manda.

Fuente de los números: `js/data/escalaCosmica.js` (tabla y regiones) y `cosmos.medidas()` (cada límite sale de la geometría de su pieza con las escalas de todos sus padres). `tests/navegador/geometria.mjs` contrasta `medidas()` con los vértices transformados al mundo y la tabla con `medidas()`; el alcance de todas las pruebas está en la sección 12.

## 0. Gigantes enormes y viajes más rápidos que la luz (20 de octubre)

- **Los gigantes son enormes** (licencia declarada, `escalaCosmica.js`): `ESCALA_SUPERNOVA` 117, `ESCALA_CUASAR` 13, `ESCALA_TON` 30, `ESCALA_PULSAR` 1,2. Desde casa se ven en el cielo con su forma: el corazón de la supernova ≈ 8°, el cuásar ≈ 12°, TON 618 ≈ 7° (su disco de estrellas), el púlsar ≈ 12°. La supergigante, antes de estallar, es una estrella colosal (radio ≈ 5 650) y desde lejos brilla como un gran lucero rosado (faro de ≈ 3,5° que se recoge al acercarse). Las distancias no cambian: desde los gigantes, Xiomara es una galaxia pequeña más.
- **Viaje** (`js/util/vuelo.js`): recto y mirando siempre al destino (sin inclinar la mirada); más rápido que la luz (supernova ≈ 14 s en total, cuásar ≈ 11 s, TON 618 ≈ 15 s). La velocidad sigue la raíz de la distancia a lo más cercano: sin pararse en cada galaxia; al cruzar una nebulosa se frena lo justo para verla por dentro. La frenada final se apaga del todo (sin tirón al detenerse).
- **Paisaje de los viajes** (`catalogo.js`, `RUTAS`): en cada camino largo (supernova, TON 618, cuásar), decenas de galaxias a los lados y a distancia (≥ 2,3 radios + 5 000 del camino) que crecen y pasan por los bordes, grupitos, nebulosas junto al camino y nebulosas enormes que se atraviesan, con su interior en 3D (`interiorNebulosa.js`: gas, estrellas jóvenes y soles).
- **Universo de llegada** de cada gigante: galaxias de fondo lejos y alrededor, fuera de su silueta (`universosLlegada`, `SILUETA_GIGANTE`), y un cielo propio (`universoLocal.js`): estrellas nuevas en una cáscara alrededor del destino, un velo de color propio y constelaciones nuestras (corazón, infinito, estrella, flecha de Cupido, corona, luna) que se encienden al llegar. Desde casa no se ven; el cielo de casa se apaga lejos de Xiomara.
- **Telaraña cósmica** (`js/data/telarana.js`, `js/escena/telarana.js`): 150 nudos (cúmulos) y ~280 filamentos curvos en un volumen de radio 7 000 000 (≈ 360 Mal) alrededor de los destinos, con grandes vacíos. Se dibuja con ~120 000 galaxias lejanas como luces (≈ 48 000 en móvil), cúmulos en los nudos y gas tenue violeta y azul a lo largo de los filamentos: desde cualquier destino se ven sus siluetas en el cielo. La población del catálogo vive sobre ella (un cúmulo por nudo y galaxias a lo largo de los filamentos, ≈ 3 200 galaxias con imagen y estrellas): el universo entero está lleno, no solo los caminos.
- **Cielo del «más allá»** (`cieloProfundo.js`): un cubemap pintado una vez (2048 en PC, ≤ 1024 en móvil) con nubes turquesa, magenta, naranja y azul, hebras, polvo oscuro, regiones rosas, un campo denso de estrellas de colores (las brillantes con destello en cruz) y galaxias diminutas. Se dibuja detrás de todo (antes que lo opaco) y se enciende al alejarse de Xiomara (el mismo criterio que apaga el cielo de casa).
- **Maravillas** (`maravillas.js`): el Ojo y la nube de fuego son nebulosas volumétricas con imagen propia, a ambos lados del corazón y enteras en el encuadre de llegada; la nube de las burbujas (junto al cuásar) y la espiral de hebras (junto a TON 618, una galaxia menor que Xiomara). En casa se ven más discretas.
- **Xiomara es la galaxia más grande del universo**: ninguna otra galaxia del catálogo ni de las maravillas la iguala (prueba en `catalogo.test.js`). Los gigantes que no son galaxias (supernova, agujeros negros, púlsar, cuásar) sí son enormes.
- **Xiomara de lejos**: su luz no resuelta lleva la misma compresión perceptiva que las demás galaxias, un mínimo y un halo rosado estable de tamaño fijo en pantalla (para reconocerla desde cualquier gigante); se dibuja después del gas lejano. Las nebulosas que ocupan menos de ~3 px no se dibujan como volumen (su polvo oscurecía un recuadro, que parecía un parpadeo).
- **Espacio de cada destino**: la población no entra en su reserva (`RESERVA`: supernova 1 000 000, TON 618 900 000, cuásar 420 000).

## 1. Una sola regla espacial

- **Unidad**: la galaxia de Xiomara, radio 980 (diámetro ~1960 ≈ 100 000 años luz): **1 unidad ≈ 51 años luz**. Las distancias entre galaxias y la de la supernova (100 millones de años luz) siguen esa conversión. Las licencias de tamaño están declaradas (corazón, nebulosas, luz no resuelta, TON 618 comprimido).
- **Cada cuerpo tiene posición y tamaño fijos.** El tamaño aparente sale solo de la perspectiva. Nada se agranda, se oculta ni se vuelve visible por estar seleccionado, por la distancia o por un umbral.
- Se distinguen seis magnitudes que no deben mezclarse:

| Magnitud | Qué es | Dónde se define |
|---|---|---|
| Radio del cuerpo | La estrella, la sombra del agujero, el núcleo | geometría × escala del grupo |
| Extensión del gas, disco o chorro | Disco de acreción, gas del Cangrejo, anfitriona del cuásar | geometría × escala del grupo |
| Halo óptico | Destello de lente/ojo alrededor de una fuente puntual (no es materia) | sprites de halo; se mide en pantalla |
| Distancia entre centros | Posición en el mundo | `SITIOS_DESTINO` (js/data/sitios.js, única fuente), catálogo |
| Distancia de observación | Dónde se detiene la cámara al visitar | `cosmos.objetivo()`, `encuadreCorazon()` |
| Tamaño proyectado | Píxeles en pantalla | `radioPxDisco` / `radioPxEsfera` |
| Radio de navegación | Lo que una ruta no cruza | `medidas()[cuerpo].navegacion` |

Qué mide cada límite en `medidas()` (valores medidos en la escena):

| Cuerpo | Cuerpo opaco | Disco / anillo / toro | Gas, chorro, haces, halo (se atraviesan) | Navegación |
|---|---|---|---|---|
| TON 618 | sombra ≈3 550 | disco 23 059, lente 9 224 | disco de estrellas ≈170 000, chorros ≈213 000, resplandor | 23 059 (disco) |
| Sagitario A* | sombra 33 | anillo ≈87, materia 210 | halo | 210 (materia) |
| Cuásar | sombra 910 (núcleo) | disco 14 300, toro de polvo 22 620 | anfitriona 62 400, chorros 98 800 | 22 620 (toro) |
| Púlsar | estrella de neutrones 41 | toro 864 | gas del Cangrejo (semieje de su volumen 3 600), haces 2 640, halo | 1 080 (toro y chorros) |
| Supernova (estrella) | progenitora ≈5 650 | envolturas ≈26 900 | faro (brillo de lejos, ≈3,5° de cielo) | ≈26 900 |
| Supernova (explosión) | — | eyecta: crece hasta ~68 000 | — | eyecta |
| Supernova (corazón) | — | semiejes 137 157 × 124 532 × 94 096 | — | 137 157 |
| Xiomara | — | disco 980 | — | 1 600 (salvo llegar a casa) |

Las nebulosas y los halos no son obstáculos: se pueden cruzar.

- **Proyección correcta** (`escalaCosmica.js`): esfera, diámetro angular `2·asin(r/d)` y radio en píxeles `f·r/√(d²−r²)`; disco perpendicular, `f·r/d` (exacto); dentro del volumen (`d ≤ r`) ocupa todo el campo. `f = alto / (2·tan(fov/2))`. Las pruebas contrastan estos valores con una `PerspectiveCamera` real de three (FOV, aspecto y desplazamiento de vista).

## 2. Escala cosmológica de referencia

**1 unidad ≈ 51 años luz** (`UNIDAD_ANOS_LUZ`, con `desdeMal()` y `aMal()` en `js/data/escalaCosmica.js`). Se define así porque el diámetro de Xiomara (~1 960 unidades) se asocia a unos 100 000 años luz. **La supernova está a 100 millones de años luz** de Xiomara, centro a centro: `DISTANCIA_SUPERNOVA = 1 960 784` unidades.

Es una conversión para razonar proporciones, no una simulación física: el corazón es una licencia y TON 618 está comprimido.

| Objeto | Tamaño de referencia | Representado (unidades) | Distancia a Xiomara | Licencias |
|---|---|---|---|---|
| Xiomara | ~100 000 al de diámetro | radio 980 | 0 | nuestra galaxia artística |
| Vía Láctea / Sagitario A* | ~100 000 al | radio 1 300 (≈ 66 000 al) | 26 000 (1,3 Mal) | vecina de Xiomara; el aparato de Sgr A* está exagerado |
| Andrómeda / Triángulo | 220 000 / 60 000 al | radio 1 100 / 450 | 49 000 / 56 000 (2,5 / 2,9 Mal) | como las reales |
| Galaxias del catálogo | 15 000–260 000 al | radios 70–2 400 (mediana < 980) | 4 500 – 3,4 millones | separadas ≥ 20 000 (≈ 1 Mal) salvo satélites y grupos |
| Supernova (corazón) | — | semiejes 8 206 × 7 451 × 5 630 (≈ 840 000 al) | **1 960 784 (100 Mal)** | **licencia**: mayor que una galaxia |
| Cuásar (anfitriona) | elíptica gigante | radio 3 510 | 588 235 (30 Mal) | el real está a miles de Mal |
| TON 618 (disco) | — | radio 4 000 | 2 745 098 (140 Mal) | real ~10 800 Mal: comprimido ×77 |
| Púlsar (Cangrejo) | ~11 al | semieje 1 500 | 16 000 | exagerado; fuera de la Vía Láctea por licencia |
| Nebulosas de galaxias | regiones H II de ~1 000 al | radios 170–560 | dentro de su anfitriona | **ampliadas ×~25** (toda la población) |
| Fondo óptico | — | — | ∞ (acompaña a la cámara) | solo contribuciones remotas, diminutas y tenues |

Distancias entre destinos (millones de años luz):

| | Xiomara | Supernova | TON 618 | Cuásar | Sagitario A* | Púlsar |
|---|---|---|---|---|---|---|
| Xiomara | 0 | 100,0 | 140,0 | 30,0 | 1,3 | 0,8 |
| Supernova | 100,0 | 0 | 214,2 | 126,7 | 99,2 | 100,1 |
| TON 618 | 140,0 | 214,2 | 0 | 130,2 | 139,7 | 140,5 |
| Cuásar | 30,0 | 126,7 | 130,2 | 0 | 31,1 | 29,7 |
| Sagitario A* | 1,3 | 99,2 | 139,7 | 31,1 | 0 | 2,1 |

TON 618 conserva la separación amplia que funcionaba: es el destino más remoto, aún más lejos que la supernova y en otra dirección del cielo.

Tamaño aparente de Xiomara (radio 980; PC, FOV 60°, focal 780 px):

| Desde | Distancia | Radio en pantalla | Representación |
|---|---|---|---|
| Andrómeda | 2,5 Mal | 16 px | imagen y estrellas |
| Cuásar | 30 Mal | 1,3 px | luz no resuelta |
| Supernova | 100 Mal | 0,4 px | luz no resuelta |
| TON 618 | 140 Mal | 0,3 px | luz no resuelta |

Desde tan lejos no se falsea su tamaño. **«Mirar hacia casa»** (botón lejos de Xiomara) gira la vista hacia ella y estrecha el campo de visión (hasta ~0,13° desde la supernova), de modo que ocupa ~22 % del alto, con un anillo y su distancia. Ni la cámara ni Xiomara se mueven ni cambian de tamaño, y al volver todo queda igual.

**Por qué Xiomara se reconocía menos** (medido en `.pruebas/pw/comparar.mjs`, al mismo radio en pantalla y la misma inclinación que una galaxia del catálogo de radio parecido):
- tenía ~60 % de la luz por área de las galaxias del catálogo;
- su versión lejana concentraba la luz en un bulbo diminuto (pico 2–3× el de las demás), con solo un 2–8 % del disco claramente iluminado.

Se corrigió así:
- la versión lejana tiene un bulbo más ancho y con menos puntos, y el disco algo más luminoso con la misma luz total;
- las imágenes del catálogo bajan su brillo superficial (`op` 0,9 → 0,62) en vez de inflar a Xiomara.

Ahora la luz por área queda en 0,051 frente a 0,061 y el pico se iguala. No se cambió su tamaño (una sola escala persistente).

## 2 bis. Catálogo y regiones (`js/data/catalogo.js`)

Cada galaxia tiene identificador, posición, radio, tipo y orientación fijos (determinista: el mismo universo en cada carga y en cualquier dispositivo). Cada nebulosa tiene su galaxia anfitriona. Se ve desde cualquier destino por la misma geometría, sin reglas por destino, y existe antes de verse.

**Hitos de composición** a 1, 10, 35, 65, 90 y 100 Mal (`HITOS_MAL`). Son referencias de ritmo, no paredes ni niveles. **Regiones**:
- salida (0–3 Mal): Xiomara, dos satélites, la Vía Láctea, Andrómeda (con M32 y M110) y el Triángulo;
- primeras regiones extragalácticas (3–20 Mal);
- regiones intermedias (20–80 Mal);
- universo profundo (80–93 Mal);
- región de llegada (93–110 Mal), alrededor de la supernova.

**Encuentros del viaje principal** (11, diseñados; `l` es el paso lateral respecto a la recta Xiomara → supernova):

| Mal | Encuentro | Qué se ve |
|---|---|---|
| 5 | La Floculenta del Adiós | espiral floculenta a 4 300 de lado, con una región de emisión |
| 11 | Grupo del Umbral | cuatro galaxias contempladas a ~25 000 |
| 22 | Las Danzantes | dos galaxias en fusión con colas de marea, y un satélite |
| 35 | La Nebulosa del Faro | barrada con una gran cavidad de hidrógeno, pilares y un velo azul de reflexión |
| 47 | La Gran Barrada | barrada enorme casi de cara |
| 57 | La Elíptica y su corte | elíptica gigante con satélites, de lejos |
| 62–70 | El Filamento de la Travesía | cinco galaxias en diagonal: se pasa entre ellas |
| 76 | Los Pilares Oscuros | irregular con columnas de polvo y gas brillante |
| 84 | El Cúmulo Profundo | 14 galaxias a 150 000 de lado |
| 88,5 | La Espiral de Canto | espiral de canto con su franja de polvo |
| 95 | El Velo del Reflejo | espiral con nebulosa de reflexión azul y filamentos de un remanente antiguo |

Más cuatro encuentros en el camino a TON 618 y dos en el del cuásar. Los encuentros pasan por arriba o por los lados: por debajo, la tarjeta del viaje los tapaba justo en su momento de máximo tamaño (en el móvil ocupa toda la franja inferior).

- **Región de llegada:** 11 galaxias, en varias direcciones y profundidades, fuera de la silueta del corazón desde la llegada:
  - 6 en el propio encuadre de llegada, entre el borde del corazón (≥ 24°) y el borde de la pantalla, pequeñas y lejanas (5–11 Mal, medidas desde la cámara de llegada);
  - 5 fuera del encuadre, que se descubren al girar. Ninguna galaxia independiente está a menos de 70 000 u (3,6 Mal) del corazón. Su gas propio pertenece a la supernova.
- **Población:** 46 grupos de 2–6 galaxias alrededor de 11 «semillas» de superestructura, más galaxias sueltas en filamentos entre grupos vecinos. Ocupa todo el volumen, también fuera de los caminos (el 75 % de las 303 galaxias), con grandes vacíos. Ninguna se acerca por accidente a un corredor entre destinos (≥ 3·r + 15 000).
- **Separaciones:** ≥ 20 000 u (≈ 1 Mal) entre galaxias independientes. Excepciones explícitas: satélites, miembros de un grupo (≥ 9 000 o 3× la suma de radios) y el cúmulo.
- **Nebulosas:** 32, dentro de sus galaxias.

Comprobado en `tests/catalogo.test.js`:
- escala;
- determinismo;
- radios;
- separaciones;
- encuentros en todas las regiones, sin huecos de más de 14 Mal entre ellos y ninguno pegado al corredor;
- nada de paredes en los hitos ni de tubos (más de la mitad fuera del camino, vacíos en más del 25 % del volumen, los ocho octantes);
- región de llegada;
- nebulosas dentro de sus anfitrionas y variadas.

## 3. Persistencia y semillas

- `SEMILLA_UNIVERSO = 20251215` (`js/util/azarSemilla.js`): toda la generación procedural de la escena usa un generador con semilla; cada capa tiene la suya (`semillaDe(nombre)`), de modo que generar más en un dispositivo no mueve las demás. El mismo mapa en cada carga, en PC y en móvil (mismo número de objetos).
- El azar en tiempo de ejecución (forma de cada nuevo pulso de la progenitora, titileo) no cambia posiciones.

## 4. Precisión y profundidad

- Plano cercano adaptativo: `min(distancia al objetivo, |cámara|, lo más cercano del universo)·0,002`, plano lejano 1e8. «Lo más cercano» son las galaxias y nebulosas del catálogo y los cuerpos del cosmos (`distanciaCercana`). A mitad de un viaje de 100 Mal el objetivo y Xiomara están a millones de unidades, pero una galaxia puede pasar a 3 000: sin esto, el plano cercano subía a miles de unidades y la recortaba.
- Fondo óptico: sigue a la cámara y se escala con el plano cercano (`escalaFondo`).
- **Precisión a 100–140 Mal** (`tests/precision.test.js`, reproduciendo el redondeo float32 de la GPU):
  - three.js calcula la matriz modelo-vista en doble precisión en la CPU. Toda geometría con coordenadas locales (galaxias del catálogo, cuyas estrellas se generan centradas en cada galaxia, nebulosas, destinos) solo recibe posiciones relativas a la cámara.
  - Error medido en los casos más exigentes (corazón de cerca, disco de TON 618, cuásar): 2·10⁻⁵ px. Con coordenadas de mundo en float32 sería ~0,007 px: tampoco visible a estas distancias, pero cientos de veces mayor.
  - No hizo falta un origen flotante.
  - Las imágenes y las luces no resueltas del catálogo usan matrices de instancia en coordenadas de mundo. Se ven desde más de 10 radios: error < 0,03 px.
- Lo más lejano del catálogo (≈ 3,4 millones desde casa) cabe de sobra en el plano lejano (1e8). El búfer de profundidad es el normal de 24 bits, no logarítmico. Con el plano cercano adaptativo (≈ 16 en la llegada a TON 618), la resolución de profundidad a 600 000 es del orden de 10³ unidades, menos que el radio de cualquier galaxia. Basta porque las galaxias lejanas son imágenes o puntos transparentes que no escriben profundidad y nunca se cruzan con otra (separaciones ≥ 20 000). Sí lo sería para dos superficies opacas a menos de esa distancia, que el catálogo no tiene.
- Profundidad antes que órdenes de dibujo: el horizonte del agujero negro de casa usa prueba de profundidad normal (`LessEqual`) y escribe profundidad. Ya no usa `AlwaysDepth`, que lo pintaba encima de cuerpos más cercanos.
- **TON 618 y Sagitario A\***: se separa su composición interna de su relación con el resto.
  - Por dentro, orden fijo: resplandor, mitad lejana del disco, sombra, lente y mitad cercana.
  - Frente al resto, todas sus partes hacen la prueba de profundidad y solo la sombra la escribe.
  - Antes resplandor, discos, lente y anillo usaban `depthTest=false` y se pintaban encima del cuerpo opaco que tuvieran delante (hasta un 15 % de los píxeles). Ahora no: comprobado con lectura de píxeles sin postprocesado en tres inclinaciones (`tests/navegador/profundidad.mjs`).
- Excepciones con `depthTest: false` que quedan, todas pasadas de pantalla: estelas de velocidad, velo, pasada de salida, brillo (bloom), horneado del gas de la galaxia y diagnóstico.
- **Transparentes**: no escriben profundidad. Entre ellos manda `renderOrder` y la ordenación de three por distancia; frente a lo opaco, la prueba de profundidad. No se activó `depthWrite` en los transparentes como arreglo global.
- **Límites conocidos**:
  - un cuerpo opaco *dentro* de una nebulosa no se mezcla bien con el gas: el rayo no se detiene en él. Afecta a la estrella de neutrones (17) dentro del Cangrejo y es apenas visible;
  - dos nebulosas cuyas cajas se cruzan se ordenan por su centro, no por fragmento.

## 5. Niveles de detalle

Una misma galaxia pasa por cuatro representaciones con el mismo identificador, centro, orientación, forma y presupuesto de luz:
1. **muy lejos**, una luz no resuelta con el color medio de su imagen y su flujo (∝ área);
2. **a media distancia**, su imagen, con silueta, núcleo y orientación;
3. **más cerca**, sus estrellas 3D (brazos, polvo, regiones emisoras);
4. **en una visita cercana**, sus estrellas con su luz difusa.

Medido: la luz por área se mantiene en 0,955–1,006 de 1 a 120 px, de frente, inclinada y fuera del eje (`tests/navegador/brillo.mjs`).

- **Estrellas generadas al acercarse**: las estrellas 3D de cada galaxia se crean a ~24 px de radio (el fundido empieza a 35) y se liberan por debajo de 12. Usan una semilla propia de su identificador y coordenadas locales, así que siempre son las mismas. En cada momento solo unas pocas galaxias tienen estrellas 3D; el resto del universo es imagen o luz.
- **Compresión perceptiva de la luz no resuelta** (licencia declarada, `GAMMA_LUZ = 0,5`): por debajo de 1,5 px de radio, el flujo baja como px en vez de px². Las galaxias lejanas se ven como luces diminutas (blancas, rosadas o cálidas, con el color medio de su imagen) en vez de desaparecer. Por encima de 1,5 px no cambia nada, así que el paso luz → imagen sigue siendo continuo. La luz del corazón desde casa usa la misma regla.
- **Luz no resuelta** (`campoGalaxias.js`): un punto por galaxia en su centro. Lleva el flujo de su imagen (color medio real × área proyectada, con el estiramiento fuera del eje) y baja como 1/d² sin umbral. Se funde con la imagen entre 1,5 y 3,5 px de radio. Es la misma galaxia desde el principio, no una estrella.
- **La luz de un disco no depende de su inclinación**: inclinado ocupa menos área, pero su brillo superficial sube. La imagen compensa el coseno (con un tope de canto) y la versión lejana de Xiomara también: de canto se ve estrecha, pero no se apaga.
- **Las estrellas resueltas nunca superan el 60 % de la luz de su galaxia** a 80 px. Antes, en las galaxias grandes con muchos puntos, el total subía un 10 %.
- **Galaxias del campo** (`campoGalaxias.js`, `formasGalaxia.js`).
  - **Forma común**: una sola descripción da, para cada punto del disco, la intensidad de bulbo, barra, brazos (con su perturbación), anillo, núcleos, colas de marea, cúmulos, nudos y polvo. La imagen (lejos) pinta esas intensidades; las estrellas 3D (cerca) se muestrean de ellas, con el color, el viñeteado y el polvo de la imagen.
  - Andrómeda usa su enrollamiento real (7,2) en los dos niveles.
  - Tras el refactor, las imágenes son idénticas byte a byte a las anteriores.
  - Las texturas se suben con `flipY`, así que la estrella va en −v. Antes las estrellas eran el reflejo de su imagen, con los brazos girando al revés.
  - **Detalle por tamaño en pantalla** con la *profundidad en la vista* (radio / −z_vista × focal), no con la distancia euclídea: fuera del eje una galaxia se proyecta más grande.
  - Fundido entre 35 y 80 px.
  - **Luz conservada**: la imagen cede a las estrellas exactamente la luz que ellas aportan. Las estrellas tienen tamaño fijo en píxeles y su luz no crece al acercarse; la imagen crece con el área. La razón estrellas/imagen a 80 px se calcula con la luminosidad media real de cada textura y la de sus puntos; con la galaxia inclinada se divide por el coseno.
  - Los puntos usan alfa premultiplicado: antes la atenuación se aplicaba dos veces (a²).
  - **Medido** antes del brillo, con la galaxia aislada: L/radio² se mantiene en 0,98–1,00 de 25 a 120 px, de frente, inclinada 55° y fuera del eje, sin histéresis. Orientación imagen/estrellas: correlación 0,92–0,94 tal cual frente a 0,60–0,92 reflejada.
  - Las estrellas 3D van en lotes espaciales (acimut × elevación × capa logarítmica de distancia) con esfera envolvente y recorte por frustum. Cada lote se activa solo si alguna de sus galaxias pasa de 35 px (también con la profundidad en la vista).
- **Xiomara** (`galaxia.js`): el paso entre la versión cercana y la lejana depende de su **tamaño en pantalla** (85 → 30 px de radio), no de la distancia.
  - Versión lejana con bulbo esferoidal, halo tenue y disco con espesor: de canto sigue siendo una galaxia (línea del disco con su bulbo y su halo). Por debajo de ~4 px, luz no resuelta con el mismo flujo.
  - **Toda** la galaxia cercana se funde a la vez. Antes el gas, el resplandor del centro y el disco de absorción se quedaban y sumaban un 52 % de luz de más.
  - La versión lejana tiene la misma luz por área que la real (`LUZ_LEJOS`; antes ×3,7). Medido: 0,96–1,07 a lo largo del fundido.
  - No hay suelo de opacidad y la galaxia no se inclina hacia quien mira.
  - Límite: la orientación entre el disco lejano y sus puntos coincide poco (0,80 tal cual frente a 0,77 reflejada), porque su imagen y la espiral de puntos no salen de la misma descripción, como sí ocurre en el campo.
- **Vía Láctea** (`viaLactea.js`): galaxia 3D persistente con centro en Sagitario A*. Tiene:
  - bulbo dorado y compacto con barra;
  - brazos con poblaciones jóvenes azuladas;
  - nubes estelares cálidas, regiones de emisión rosadas (alguna turquesa), cúmulos y plumas que salen de los brazos;
  - grietas de polvo, que son **ausencia de luz** (las nubes y estrellas del carril se apagan), más nubes oscuras grandes y suaves para verla de canto;
  - halo.

  Antes el polvo eran miles de puntitos oscuros dibujados después de todo: se veían como motas y bloques oscuros sobre la galaxia y el fondo.
  - La luz difusa (nubes de luz con tamaño en el mundo y brillo superficial constante) lleva la mayor parte y las estrellas resueltas como mucho un 20 %. Por debajo de ~4 px queda una luz no resuelta con la suma de ambas. Medido: luz por área 0,10–0,12 de 1 a 400 px.
  - Desde dentro de su disco (al visitar Sagitario A*) su propia distribución dibuja la banda alrededor. El cubemap ya no hornea ninguna banda.
- **Estrellas locales** (campo titilante, soles y cometas del cielo de casa): son de Xiomara y su vecindad. Se apagan al alejarse de Xiomara y de la Vía Láctea (hasta un 8 %), y el fondo del cubemap baja al 30 %. En el espacio intergaláctico el cielo es oscuro y lo que brilla son galaxias.
- **Fondo óptico**: 130 contribuciones remotas, diminutas (≤ ~4 px) y tenues, que acompañan a la cámara. Nada de lo que debe descubrirse está ahí: todo lo que crece al acercarse tiene posición persistente en el catálogo, y ningún objeto se representa en los dos.
- **Símbolos de casa** (nombre de partículas, corazón, emojis): son dedicatoria, no cuerpos. Se leen desde casa (crecen hasta ×2,6 para seguir legibles al alejarse un poco) y se desvanecen entre 4 500 y 9 000.

## 6. Lente gravitacional

- Se activa por geometría, no por destino: cuando el agujero (Sagitario A* o TON 618) está en pantalla y su zona curvada tiene tamaño. Entra con suavidad entre 0,4 % y 0,9 % del alto de la vista.
- **Límite**: la lente deforma la imagen ya dibujada; no tiene profundidad.
  - Para no curvar el primer plano, su fuerza se **atenúa con suavidad** según cuánto se solape con su zona la extensión visible de un cuerpo más cercano.
  - Antes se apagaba de golpe: el mayor salto entre cuadros en un barrido era del 100 % de su fuerza; con la atenuación, del 28 %.
  - Con las distancias actuales (100–140 Mal), ningún cuerpo puede cruzar delante de una lente a un tamaño visible: la lente de Sagitario A* solo se ve a menos de ~14 000 y la de TON 618 desde cerca de él. La prueba comprueba ahora que la lente **entra y sale de la pantalla** sin saltos.
  - Al salir de la pantalla también se cortaba de golpe en el límite de su zona; ahora se desvanece (mayor salto 0,004 frente a 0,014; `tests/navegador/profundidad.mjs`).
  - Una estrella o nebulosa pequeña delante sí puede curvarse un poco.
  - Una máscara con profundidad exigiría leer el búfer de profundidad en la pasada de la lente; no se ha hecho.
- **Sagitario A*:** desde dentro de la Vía Láctea, la luz de la galaxia que queda DELANTE de su sombra se ve (es correcto). Lo de detrás queda tapado (comprobado con una esfera detrás que no cambia el píxel). El bulbo difuso deja un hueco alrededor del agujero para que su silueta se lea.

## 7. Nebulosas

**Dónde están y por qué habían desaparecido.** Las dos pasadas anteriores retiraron las 14 «nebulosas colosales» (mayores que cualquier galaxia) y las del paisaje de la supernova. Las sustituyeron por cuatro regiones H II de radio 90–150 dentro de galaxias: correctas en contexto, pero de pocos píxeles, de modo que en la experiencia ya no se veían. El problema era su tamaño, no la opacidad, la iluminación ni el material.

Ahora hay 32 nebulosas, todas dentro de galaxias anfitrionas (`js/data/catalogo.js`):
- **amplificación declarada:** regiones de formación estelar ×~25, radios 170–560, igual para toda la población;
- **dónde están:** nueve están cerca del camino principal (el Faro, los Pilares Oscuros, el Velo del Reflejo, el Adiós y la Gran Barrada) para contemplarlas al pasar, y el crucero va más despacio mientras se ven (sección 9);
- **formas** (la imagen la dibuja `nebulosaFondo` con la misma forma; la densidad 3D la acompaña): emisión, cavidad (anillo con hueco, como la Roseta), pilares (columnas de polvo con bordes encendidos), filamentos (velos finos de un remanente antiguo), reflexión (luz azul con vetas de polvo) y oscura (nube de polvo recortada contra gas brillante);
- **orientación:** su cara apunta a medio camino entre quien llega y el propio camino, así que al acercarse se ven en diagonal y al cruzarlas casi de frente. La técnica (imagen nítida con espesor 3D) se ve como rayas exactamente de canto, y esa vista coincidía con el paso más cercano;
- **cuándo se crean:** al acercarse, a ~1 px de radio, y se funden de 1 a 4 px. Su posición, forma e imagen están fijadas desde el inicio y las imágenes se generan en segundo plano al empezar.
- Se probó una variante con volumen propio sin imagen (densidad 32³). De cerca se veía como burbujas borrosas con bordes de caja y se descartó.

**Lo que calcula el material** (`nube.js`): un ray-march por una caja (24 muestras de base en PC y 16 en móvil, ajustadas a la longitud del rayo entre ×0,6 y ×1,6). En cada muestra:
- **densidad**: un atlas 3D de 32³, una de seis formas compartidas (el Cangrejo y el corazón tienen la suya);
- **lámina**: la densidad se modula por una lámina deformada con grosor propio y por ruido de valor 3D de dos octavas, anclados a la nube;
- **color**: se lee de una imagen 2D proyectada sobre el eje de la nube, con cizalla y deformaciones que solo dependen de la posición;
- **acumulación**: emisión con absorción (Beer-Lambert discreto), de delante atrás.

Nada depende de la dirección de la mirada: al orbitar cambia la perspectiva, no el dibujo.

**Interpretación artística** (no es una simulación química ni de transferencia radiativa):
- Las imágenes (`nebulosaFondo` en `texturasPlaneta.js`) reparten tres colores por zonas con reglas de ruido: rosa-rojo en el cuerpo del gas (evoca Hα), turquesa cerca del cúmulo que la ilumina (evoca [OIII]) y dorado en filamentos y bordes (evoca [SII]). Las paletas por tono están en `TONOS`.
- El sombreador intensifica la saturación y tiñe los bordes de cálido y los núcleos de frío.
- El «polvo oscuro» es un factor de absorción. No hay modelo de reflexión (las nubes azuladas solo lo sugieren por color) ni de emisión térmica del polvo.
- Ninguna línea de emisión se calcula: son colores asignados.

**Medido** (`tests/navegador/nebulosas.mjs`, una nebulosa intermedia, sin postprocesado):

| Vista | Error con 16 muestras | Error con 24 muestras |
|---|---|---|
| Frente | 50 % | 33 % |
| Oblicua | 64 % | 33 % |
| Lateral | 67 % | 40 % |
| Rasante cercana | 32 % | 19 % |

- El error se mide frente a una referencia de 128 muestras fijas.
- El error viene sobre todo de la lámina fina, que las muestras no siempre atraviesan. En móvil (16 muestras) es mayor.
- **Estriado lateral** (anisotropía de gradientes): de 0,49–0,54 a 0,30–0,35. También es alto en la referencia de 128 muestras, así que venía del contenido (la imagen extruida), no del muestreo.
- Sin las estrellas pintadas en el gas (se estiraban con el paralaje).
- **Composición**: un cuerpo opaco delante tapa la nube y uno detrás se ve a través de su gas. Uno *dentro* no se mezcla bien (sección 4).

## 8. Supernova

Secuencia: estrella → inestable (pulsaciones) → encuentro → silencio (colapso) → expansión → formación → revelación → recuerdo.

- **Pulsaciones previas**: pérdida de masa como eyecta de plasma rota en grumos y jirones con huecos, que se fragmenta y enfría (naranja → rojo oscuro) al expandirse; cada pulso tiene otra forma y orientación. Ya no son cáscaras amarillas lisas.
- **Tres propagaciones distintas** (`radioOnda`, `radioEco` en `supernova.js`, comprobadas en pruebas):
  - el **destello** (ruptura del choque) es instantáneo y breve;
  - el **eco de luz** viaja a velocidad constante (~900 u/s) y siempre por delante;
  - la **onda de material** nace a ~790 u/s y se frena.
  - El eco se dibuja en el plano del cielo porque es un fenómeno aparente.
- **Navegación**: la supernova expone el radio actual de su eyecta (`radioEyecta`); las rutas la respetan durante la explosión.
- **Desde casa**, a 100 Mal, el corazón mide ~0,24° de radio (3 px): su luz no resuelta (rosada, con la misma compresión perceptiva que las galaxias) lo hace visible como una luz diminuta y se funde con el volumen al crecer. En la vista inicial queda tras el disco de Xiomara (−24° bajo su plano), como antes.
- **El corazón** mira a casa (orientación fija); la cámara se coloca delante, en su eje. Al terminar la explosión, la cámara queda a la distancia del remanente (~25 400 en PC) y los límites del zoom pasan a ser los del remanente. Antes se quedaba a 1 772, dentro del corazón.

## 9. Viajes por fases (`js/util/vuelo.js`)

Convención cinematográfica: el salto y la compresión del tiempo no son física, y el sonido que pueda acompañarlo no es una «barrera del sonido» en el vacío. Los viajes largos (más de 12 000) y la vuelta a casa desde lejos se planifican enteros **antes** de despegar:

| Fase | Qué ocurre | Duración típica |
|---|---|---|
| A · selección | señal discreta anclada al destino (anillo fino o flecha en el borde si está fuera de pantalla) | 0,55 s (solapada con B) |
| B · maniobra | si el corredor recto no está libre (la galaxia, anillos, discos), se va a un punto despejado cercano; si ya lo está, no hay rodeo | 0–2,6 s |
| C · alineación | la mirada gira de forma continua hasta el corredor; el anillo se cierra al quedar alineado | 0,5–2 s |
| D · ruptura | destello con núcleo, doble frente de luz (azulado y rosado), estelas que se estiran, brillo +0,55 y campo de visión +9° | 0,7 s |
| E · crucero | recto por el universo real; ver abajo | ~48 s (100 Mal) |
| F · aproximación | la velocidad baja al llegar a la región del destino (últimos ~3 radios de aproximación) | ~5 s |
| G · llegada | arco deliberado hasta el encuadre final; se recuperan los controles | ~1 s |

**Perfil de velocidad del crucero:**
- La velocidad es proporcional a la distancia a lo más cercano: galaxias y nebulosas del catálogo, el punto de partida y el destino. Así cada objeto cercano dura un tiempo perceptible y el paisaje cambia por el desplazamiento real.
- Mientras un encuentro reconocible está delante, se va hasta siete veces más despacio.
- Los vacíos se cruzan algo más deprisa (∝ d^1,3 por encima de 20 000).
- La velocidad se suaviza en el tiempo (±0,45 s) y la constante se ajusta para la duración objetivo:
  - unos 55 s para los 100 Mal hasta la supernova (8 + 23,5·log10(L/20 000) s, máximo 60);
  - unos 10 s para un viaje de 1 Mal;
  - ajustable tras verlo con `?duracionViaje=0.8` en la dirección (entre 0,3 y 2; `DURACION.escala`).
- Medido en el viaje a la supernova: 38 de los 55 s se pasan con un encuentro a la vista, 10 s en vacíos y unos 7 s en la salida y la llegada.
- Cada galaxia de un encuentro supera los 40 px durante 2–2,8 s y llega a 130–190 px antes de quedar atrás.

**Mirada al pasar:** durante el crucero la vista se inclina con suavidad, como mucho 20°, hacia lo que se cruza, para verlo pasar de lado. El avance sigue la recta, y las estelas mantienen su punto de fuga en la dirección real del movimiento.

**Estelas:**
- En la ruptura salen todas y con fuerza.
- En el crucero acompañan sin tapar: un 42 % de ellas, un 60 % de intensidad y una zona despejada alrededor del centro y del punto de fuga.
- En la aproximación se apagan.

**Interfaz durante el viaje:**
- región («Regiones intermedias»…), encuentro a la vista («La Nebulosa del Faro») y distancia a casa en millones de años luz;
- **Saltar ⏭**: el resto del crucero se recorre en 2,5 s, con una curva de Hermite de pendiente 1 en los dos extremos para que no haya tirones, y se llega con la aproximación normal;
- **Viaje breve**: preferencia guardada; los viajes largos duran un 40 %;
- los desplazamientos locales no cambian.

Todas las fases admiten cancelación, cambio de destino, pausa, movimiento reducido (sin ruptura ni estelas, más corto) y giro de pantalla.

Comprobado:
- en Node (`tests/vuelo.test.js`, con el catálogo real):
  - trayectoria libre de obstáculos y galaxias;
  - orden de fases A–G;
  - alineación al saltar;
  - crucero recto y mirada a menos de 20,5° del avance;
  - velocidad continua (razón entre muestras < 1,6) y llegada exacta;
  - duración de 45–60 s;
  - al menos 8 encuentros que superan 60 px y quedan atrás, cada uno más de 1,2 s por encima de 40 px;
  - saltar, modalidad breve y movimiento reducido;
- en el navegador (`tests/navegador/vuelo.mjs`):
  - viaje de referencia en tiempo real (duración, regiones y encuentros);
  - siete trayectos más a ×3;
  - saltar y modalidad breve;
  - maniobra desde tres órbitas;
  - cancelación y giro de pantalla en cada fase.

## 10. Encuadre adaptable

- Al llegar se guarda la distancia ideal del encuadre para la ventana y la interfaz actuales.
- **Giro o redimensionado en reposo**: se recalcula y se ajusta en 0,8 s.
  - Se conserva la dirección de la cámara (la órbita) y se escala su distancia por la razón entre encuadres (el zoom relativo).
  - Se actualizan los límites del zoom.
  - Los cambios de alto menores del 20 % sin cambio de ancho (barras del navegador) no reencuadran.
- **Giro o cambio de interfaz durante un vuelo**: la curva ya está trazada. Al aterrizar, `correccionAlLlegar` compara con la situación de salida y aplica el mismo ajuste suave, que solo cambia la distancia. Idea y primera versión de Codex; ampliada aquí a cambios de interfaz.
  - Solo se corrigen los vuelos cuya llegada coincide (±25 %) con el encuadre del destino.
  - Durante el colapso y la explosión, el encuadre ideal ya es el del corazón.
- **En pausa**: el ajuste avanza con tiempo real y pide sus propios cuadros; la animación del universo sigue congelada.
- **Cambios de interfaz sin redimensionar** (una tarjeta, otro tamaño de texto): se observan las cajas que delimitan la franja libre y se reencuadra si el encuadre ideal cambia un 4 % o más. Nunca durante un gesto ni encima de otro ajuste; sin cambios no hay recentrado.
- **Un gesto cancela el ajuste en curso** y la cámara no salta.
- Comprobado en Chromium (`tests/navegador/encuadre.mjs`):
  - giro durante el viaje al corazón, en pausa, mientras se forma el corazón y con el panel de cartas abierto;
  - texto al 130 %, tarjeta oculta y visible, barras (alto −10 %) y gesto durante la corrección.
  - Las barras de Safari se han emulado con un cambio de alto en Chromium; **no se ha probado en Safari real**.

## 11. Rendimiento

Ver la sección «Rendimiento» de `REVISION.md` (trigésima octava pasada) para las cifras con sus condiciones. **La prueba sostenida de 15–20 minutos en un teléfono físico está pendiente**: no hay acceso a un móvil en este entorno, y una emulación o una captura a 60 FPS no la sustituye.

## 12. Alcance de las pruebas

- `npm test` (Node):
  - escalas, proyección contra una cámara real de three y semillas;
  - identidad imagen/estrellas contra las imágenes reales de cada generador: correlación, ejes por zonas, barra, brazos, anillo y polvo de Andrómeda, núcleos, colas y polvo de la colisión;
  - rutas (`rutas.test.js`);
  - escala (`escala-espacio.test.js`): 100 Mal, conversión, tamaño de Xiomara desde la supernova y con «Mirar hacia casa», el corazón desde casa;
  - catálogo (`catalogo.test.js`): ver sección 2 bis;
  - vuelo por fases (`vuelo.test.js`): ver sección 9;
  - precisión (`precision.test.js`): error float32 con geometría local frente a coordenadas de mundo, y resolución de profundidad;
  - corrección de encuadre tras un vuelo;
  - supernova (eco frente a onda) y lo ya existente.
- `npm run test:navegador [caso…]`: Chromium sin ventana con la GPU real del equipo y un servidor propio en 127.0.0.1. Sale con código ≠ 0 si una comprobación falla. Necesita `playwright-core` (en `node_modules`, `PLAYWRIGHT_CORE` o `.pruebas/pw`) y Chromium (`CHROME`).
  - `encuadre`: giros, pausa, interfaz, gesto y barras;
  - `profundidad`: TON 618 y Sagitario A* frente a cuerpos opacos y continuidad de la lente;
  - `brillo`: luz y orientación en el paso imagen → estrellas;
  - `xiomara`: orientación y luz en su fundido;
  - `geometria`: medidas, tabla y rutas;
  - `nebulosas`: muestreo, estriado y composición;
  - `rendimiento`: mediciones por fases y capas, con pocas aceptaciones;
  - `paisaje`: inventario real alrededor del corazón, silueta desde la llegada y en 36 órbitas, y estabilidad al visitar la supernova;
  - `vuelo`: ver sección 9;
  - `universo`: descubrimiento de luz no resuelta a estructura sin saltos de luz, la galaxia que queda atrás, nebulosas que existen antes de verse y se ven con luz, estrellas locales que se apagan, región de llegada, «Mirar hacia casa» desde la supernova, TON 618 y el cuásar, regreso por el mismo universo y continuidad de la Vía Láctea.
- **No cubren**: teléfonos físicos, temperatura, Safari ni Firefox reales, ni la percepción final tras el brillo (las medidas de luz son antes del bloom). La belleza de las nebulosas y de la Vía Láctea se juzga con capturas, no con un número.

## 13. Referencias

Referencias de consulta (citadas de memoria; conviene contrastar volumen y página antes de citarlas fuera de este proyecto).


- Supernovas, ecos de luz y onda de choque:
  - Rest et al. 2005, *Nature* 438, 1132 (ecos de luz de supernovas en la LMC);
  - Chevalier 1982, *ApJ* 258, 790 (deceleración de la onda de material).
- Pérdida de masa por pulsaciones: Woosley 2017, *ApJ* 836, 244 (supernovas por inestabilidad de pares pulsante).
- Nebulosas de emisión, reflexión y absorción: Osterbrock & Ferland, *Astrophysics of Gaseous Nebulae and Active Galactic Nuclei* (2006).
- Sombra y anillo de fotones: Event Horizon Telescope Collaboration 2022, *ApJL* 930, L12 (Sagitario A*).
- Espirales logarítmicas en galaxias: Seigar & James 1998, *MNRAS* 299, 672.
