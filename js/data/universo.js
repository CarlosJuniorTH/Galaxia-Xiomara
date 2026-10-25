// Contenido editorial: propuestas de Carlos, sin inventar recuerdos vividos.
// Las cartas y cápsulas son editables aquí. Las cápsulas son una sorpresa narrativa,
// no un almacén secreto: su texto forma parte de estos archivos públicos.
// Cas en Barcelona (misma zona que Madrid) y Xio en Buenos Aires.
export const ZONAS = { carlos: 'Europe/Madrid', xiomara: 'America/Argentina/Buenos_Aires' };
export const DESTINOS = [
  { id: 'hogar', icono: '✧', nombre: 'Nuestra galaxia', tipo: 'El comienzo de todo', posicion: [0, 70, 0], distancia: 1350, color: '#ff93c7', texto: 'Un universo hecho para ti. Gira despacio, sigue los destellos rosas y encuentra una estrella por cada mes de nuestra historia.', detalle: 'Cada estrella dorada es un recuerdo que ya encontraste.', accion: 'Buscar una estrella' },
  { id: 'rosa', mapa: [-330, -640], icono: '◉', nombre: 'Donde empezó todo', tipo: 'Planeta de nuestro comienzo', posicion: [1550, 160, -400], giro: -0.9, altura: 0.34, distancia: 510, color: '#ffa6d0', texto: 'Hay fechas que dejan de ser números y se convierten en un lugar al que siempre quieres volver. La nuestra tiene un planeta entero.', detalle: '15 de diciembre de 2025 · nuestra primera estrella.', accion: 'Leer la primera página' },
  { id: 'constelacion', icono: '⌁', nombre: 'El hilo invisible', tipo: 'Una constelación para nosotros', posicion: [900, 700, -1850], distancia: 600, color: '#ffd595', texto: 'Dos luces pueden estar lejos y pertenecer al mismo cielo. Une estos pequeños puntos: al final, descubrirás lo que dibujan juntos.', detalle: 'Toca las luces en orden o deja que el universo las una por ti.', accion: 'Seguir la corriente de luz' },
  { id: 'cartas', mapa: [-520, -900], icono: '✉', nombre: 'El correo de la luna', tipo: 'Cartas para encontrarte', posicion: [-1250, 330, -1550], distancia: 550, color: '#dbc5ff', texto: 'Aquí las palabras no tienen prisa. He dejado algunas para esos momentos en los que un abrazo necesita viajar un poquito más lejos.', detalle: 'Elige un sobre y quédate el tiempo que quieras.', accion: 'Abrir un sobre' },
  { id: 'suenos', icono: '❋', nombre: 'El jardín de lo que viene', tipo: 'Nuestros sueños pendientes', posicion: [-2250, -80, 250], distancia: 620, color: '#aee9e1', texto: 'Todavía hay días que no hemos vivido. Aquí les guardamos un lugar: cada luz es algo que me gustaría compartir contigo.', detalle: 'Son deseos para el futuro. Tú decides cuándo uno se ha convertido en recuerdo.', accion: 'Hacer florecer el jardín' },
  { id: 'capsulas', icono: '◷', nombre: 'La órbita del mañana', tipo: 'Cápsulas del tiempo', posicion: [-650, 800, 1950], distancia: 570, color: '#ffdaaa', texto: 'Algunas palabras esperan su día. Las dejamos girando aquí, a salvo de las prisas, hasta que llegue el momento de abrirlas.', detalle: 'Las fechas se abren a medianoche en Argentina, donde está Xiomara.', accion: 'Acercarme a la cápsula' },
  { id: 'azul', mapa: [-640, -430], icono: '☾', nombre: 'Dos orillas, un cielo', tipo: 'España y Argentina', posicion: [1650, -100, 1600], foco: [0, 22, 0], distancia: 225, color: '#adc8ff', texto: 'Puede que mi tarde y tu mañana no empiecen a la vez. Pero hay algo que compartimos a cualquier hora: estas ganas de encontrarnos.', detalle: 'Dos pequeñas luces se buscan y vuelven a encontrarse, una y otra vez.', accion: 'Rodar con su luna' },
  { id: 'calma', icono: '༄', nombre: 'Aquí, contigo', tipo: 'Un refugio sin prisa', posicion: [120, 1450, -3200], distancia: 540, color: '#c9c2f5', texto: 'No tienes que encontrar nada. No tienes que terminar nada. Quédate un ratito: este pedacito de universo también sabe acompañarte en silencio.', detalle: 'El cielo gira despacio. Lo demás puede esperar.', accion: 'Quedarme aquí contigo' }
];
// Más allá de nuestra galaxia: objetos lejanos que se visitan sin acercarlos. La cámara viaja
// hasta donde están de verdad en el cielo (el cielo deja de acompañarla durante el viaje).
export const LEJANOS = [
  { id: 'gigante', icono: '◍', nombre: 'El gigante del corazón', tipo: 'Un mundo de tormentas', color: '#e9c9a0', texto: 'Un planeta tan grande que dentro cabrían mil Tierras. Sus vientos dibujan bandas que giran a distinta velocidad y, en medio, una tormenta con forma de corazón que lleva siglos sin apagarse.', accion: 'Rodear el gigante' },
  { id: 'deneb', icono: '✦', nombre: 'Un mundo nuevo, contigo en el medio', tipo: 'Deneb, una supergigante blanca', color: '#eef2ff', texto: 'Brilla como cien mil soles juntos, envuelta en su viento y en una nebulosa de luz roja. Si pudiera volver atrás el tiempo, lo haría todo bien para los dos. Aquí te prometo un mundo nuevo, y en el medio, tú.', accion: 'Dar una vuelta a nuestro mundo' },
  { id: 'pulsar', icono: '✺', nombre: 'El corazón que late por ti', tipo: 'El púlsar del Cangrejo', color: '#a9c8ff', texto: 'Lo que queda de una estrella que estalló hace casi mil años: un corazón del tamaño de una ciudad que gira treinta veces por segundo y barre el cielo con dos haces de luz. Para ti, se detiene y late.', accion: 'Sentir su latido' },
  { id: 'cuasar', icono: '✹', nombre: 'Desde la primera vez que te vi', tipo: 'Un cuásar: el faro que siempre te encuentra', color: '#ffd9b0', texto: 'La luz más intensa del universo empezó con una sola mirada. Desde entonces atraviesa distancias inmensas y siempre encuentra una forma de llegar a ti.', accion: 'Déjame llevarte esta luz' },
  // TON 618 («I Wanna Be Yours») y Sagitario A* («Say Yes to Heaven»): nombre propio y, como subtítulo, el científico.
  { id: 'ton618', icono: '◎', nombre: 'Todo cae hacia ti', tipo: 'TON 618 · uno de los agujeros negros más grandes', color: '#ffcf8f', texto: 'Su sombra es tan grande que dentro cabría nuestro sistema solar muchas veces. Nada se le resiste: la luz, el gas y las estrellas caen despacio hacia él, como yo hacia ti.', accion: 'Dejarme caer otra vez' },
  { id: 'sagitario', icono: '◉', nombre: 'Donde el cielo dice sí', tipo: 'Sagitario A* · el corazón de la Vía Láctea', color: '#ff9a4a', texto: 'El agujero negro alrededor del que gira toda nuestra galaxia, también el Sol y la Tierra. Sus estrellas más cercanas lo rodean una y otra vez, como quien no se cansa de volver.', accion: 'Volver a decir que sí' },
  { id: 'supernova', icono: '♡', nombre: 'De tanta luz, nacimos nosotros', tipo: 'Nuestra supernova de amor', color: '#f5b7ca', texto: 'Dos luces empiezan a latir juntas. Acércate: esta estrella guarda algo que todavía no has visto. Cuando se abra, su luz encontrará una forma de quedarse contigo.', accion: 'Ver nacer nuestra luz' }
];
// El faro del cuásar: las frases de su recorrido (una cada vez) y la carta que espera al final.
export const FARO_CUASAR = {
  frases: [
    'Hay una luz que cruza la distancia.',
    'Sale de donde estoy…',
    '…y lleva un poquito de mí hasta donde estás tú.',
    'Aunque nuestros días tengan horas distintas, siempre encuentro una forma de llegar a ti.'
  ],
  accionCarta: 'Hay algo para ti',
  carta: {
    id: 'faro', ceja: 'UNA LUZ QUE TE ESPERABA', titulo: 'El faro que siempre te encuentra',
    texto: [
      'Mi Xio:',
      'A veces me gustaría que la distancia fuera tan fácil de cruzar como lo es encontrarte en mis pensamientos.',
      'Por eso quise dejarte esta luz. Para que, cuando vuelvas aquí, encuentres un poquito de mí esperándote en este rincón del universo.',
      'De toda la luz que hay ahí fuera, la que más espero sigue siendo la tuya.',
      'Con amor,\nCarlos.'
    ]
  }
};
export const CARTAS = [
  { id: 'extranar', icono: '☾', titulo: 'Para cuando me extrañes', subtitulo: 'Un abrazo que cruza el océano', texto: ['Mi Xio:', 'Ojalá pudiera acortar la distancia con la misma facilidad con la que acerco estos planetas. Mientras tanto, te dejo estas palabras para que tengas un lugar al que volver.', 'Imagíname cerquita, escuchándote sin mirar el reloj. No hace falta que hoy tengas algo extraordinario que contarme: también quiero tus días normales.', 'Te quiero aquí, en mi vida, incluso cuando aquí nos queda lejos.'] },
  { id: 'dificil', icono: '✧', titulo: 'Para un día difícil', subtitulo: 'Hoy puedes ir despacito', texto: ['Mi amor:', 'No tienes que poder con todo hoy. Puedes parar, respirar y dejar algunas cosas para mañana.', 'No necesito que sonrías para quererte. También quiero acompañarte cuando estés cansada, cuando no sepas qué decir o cuando lo único que necesites sea un poco de compañía.', 'Este universo no te pide nada. Yo te mando un abrazo y me quedo contigo.'] },
  { id: 'sonreir', icono: '❋', titulo: 'Para robarte una sonrisa', subtitulo: 'Una pequeña confesión', texto: ['Xiomara:', 'Entre todas las cosas que podía hacer para decirte que te amo, terminé poniendo un agujero negro, planetas y un buzón en una galaxia.', 'Quizás me pasé un poquito con el tamaño de la dedicatoria. Pero es que tú no me inspiras cosas pequeñas.', 'Si esto te sacó aunque sea una sonrisita, ya encontré mi estrella favorita de hoy.'] },
  { id: 'porque', icono: '♡', titulo: 'Por si alguna vez lo dudas', subtitulo: 'Te elijo, también en lo cotidiano', texto: ['Mi Xiomara:', 'No hace falta una fecha especial para recordártelo: me gusta que seas tú.', 'Quiero seguir conociéndote, escucharte y aprender a quererte de las formas que te hagan bien. Con tiempo, con cuidado y con ganas.', 'Este lugar es una manera de decirlo. Lo importante es seguir demostrándotelo fuera de él.'] }
];
export const CAPSULAS = [
  { id: 'primer-ano', fecha: '2026-12-15', titulo: 'Nuestra primera vuelta al Sol', texto: 'Mi Xio, cuando preparé estas palabras todavía faltaba para este día. Quería dejarte algo esperando: gracias por cada momento que hemos compartido desde aquel 15 de diciembre. Hoy quiero volver a elegir los pequeños gestos, las conversaciones y las ganas de cuidarnos. Feliz primer año, mi amor.' },
  { id: 'nuevo-ano', fecha: '2027-01-01', titulo: 'Un cielo por estrenar', texto: 'Hoy empieza un año que, cuando escribí esta carta, todavía era futuro. No sé todo lo que traerá. Sí sé lo que deseaba al dejarla aquí: que encontremos maneras de escucharnos, reírnos y hacer espacio para lo bonito. Te mando mi primer abrazo escrito de este año.' },
  { id: 'segunda-vuelta', fecha: '2027-12-15', titulo: 'Una carta para más adelante', texto: 'Esta carta viajó despacio para llegar hasta hoy. No quise llenar el futuro de promesas imposibles; preferí dejar un deseo sencillo: que sigamos encontrando motivos para cuidarnos y elegirnos. Si estás leyendo esto, qué bonito que estas palabras hayan llegado hasta ti.' }
];
export const SUENOS = [
  { id: 'mar', titulo: 'Ver el mar juntos', texto: 'Una orilla, tiempo de sobra y ninguna prisa por volver.' },
  { id: 'abrazo', titulo: 'Un abrazo sin cuenta atrás', texto: 'De esos que no necesitan pantalla ni mirar la hora.' },
  { id: 'cielo', titulo: 'Mirar el mismo cielo', texto: 'Elegir una noche, buscar estrellas y quedarnos hablando.' },
  { id: 'cotidiano', titulo: 'Un día de lo más normal', texto: 'Cocinar algo, pasear y descubrir que lo simple también puede ser un plan enorme.' }
];
export const SORPRESAS = [
  'Si llegaste hasta este cometa, aquí va un beso que se escapó de su órbita. Era para ti. ♡',
  'Pequeño recordatorio del universo: me gusta muchísimo que existas, mi Xio.',
  'Vale por una conversación sin prisas. El tema lo eliges tú; las ganas de escucharte ya las pongo yo.',
  'Hay millones de luces aquí, pero ninguna sabe iluminarme el día como tú.'
];

// Frases que deja el cometa cada vez que cruza el cielo (una distinta en cada paso).
// PROVISIONALES: Carlos enviará las definitivas; basta con sustituir este texto.
export const FRASES_COMETA = [
  'Pasaba por aquí solo para recordarte que eres mi lugar favorito del universo.',
  'Hay distancias que no se miden en kilómetros, sino en ganas de abrazarte.',
  'Si pides un deseo al verme pasar, que sea uno que podamos cumplir juntos.',
  'Cada vuelta que doy al cielo me trae de nuevo hacia ti.',
  'Entre todas las estrellas, sigo eligiendo la misma: tú.'
];

export const CONSTELACIONES = [
  // Corazón con la curva clásica (x = 16 sen³t, y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t):
  // 15 estrellas desde la hendidura superior (sin las que quedarían pegadas a la hendidura
  // y a la punta, difíciles de tocar); la última repite la primera para cerrarlo.
  { id: 'hilo', nombre: 'El hilo invisible', icono: '♡', texto: 'Dos orillas, un corazón. La distancia también puede dibujar algo bonito.', indices: [0, 2, 3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 16, 18], puntos: [0, 2, 3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 16, 18].map(i => { const t = i / 18 * Math.PI * 2; return [+(7.4 * 16 * Math.sin(t) ** 3).toFixed(1), +(7.4 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) + 22).toFixed(1), 0]; }) },
  { id: 'encuentro', nombre: 'Una luz nos encontró', icono: '✧', texto: 'Una estrella para aquel comienzo: el día en que dos caminos encontraron un mismo cielo.', puntos: [[0,140,0],[27,43,8],[132,43,0],[49,-15,-8],[80,-111,0],[0,-52,8],[-80,-111,0],[-49,-15,-8],[-132,43,0],[-27,43,8],[0,140,0]] },
  { id: 'infinito', nombre: 'Lo que seguimos escribiendo', icono: '∞', texto: 'Un lazo abierto al futuro, hecho de pequeños momentos que todavía queremos compartir.', puntos: Array.from({length:13},(_,i)=>{const a=i/12*Math.PI*2;return [145*Math.cos(a)/(1+Math.sin(a)**2),145*Math.sin(a)*Math.cos(a)/(1+Math.sin(a)**2),Math.sin(a)*12];}) }
];
