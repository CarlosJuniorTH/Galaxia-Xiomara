/* ════════════════════════════════════════════════════════════════
   ✏️  PERSONALIZA AQUÍ
   Todo lo que cambies en este archivo se refleja en la página.
   ════════════════════════════════════════════════════════════════ */
export const CONFIG = {
  nombre: 'Xiomara',
  firma: 'Con todo mi amor, Carlos',

  // Fecha en que empezamos (AAAA-MM-DD). Sirve para el contador en vivo
  // y para saber cuántas estrellas secretas hay (una por cada mes juntos).
  fechaInicio: '2025-12-15',

  // ── Música ──
  // La banda sonora por momentos (portada, viajes, destinos, canción del mes) va en js/data/bandaSonora.js.
  // Pon la canción en assets/musica/ con el nombre "cancion.mp3".
  // Escribe su ruta en cancion; vacía = música ambiental original generada en el dispositivo.
  cancion: '',
  inicioCancion: 0,              // segundo en que empieza tu canción
  cancionRespaldo: '',
  inicioRespaldo: 16,
  volumen: 0.85,

  // ── Tarjeta de entrada ──
  // Puedes poner una foto de ustedes en assets/fotos/ y escribir aquí 'assets/fotos/nosotros.jpg'
  foto: 'assets/fotos/portada.webp',
  fotoRespaldo: 'assets/fotos/portada.svg',
  cita: 'Contigo encontré el lugar donde quiero quedarme para siempre 🪐',

  titulo: 'Mi universo eres tú ♡',

  // Frases que flotan en los brazos de la galaxia
  frases: [
    'Te amo, Xiomara','Mi Xio','Eres mi todo','Siempre tú','Mi vida','Mi amor',
    'Contigo','Mi cielo','Mi reina','Por siempre','Eres mi paz','Mi corazón',
    'Eres luz','Mi ángel','Mi persona favorita','Solo tú','Mi felicidad','Eres perfecta',
    'Mi sueño','Gracias por existir','Mi universo','Locamente enamorado','Contigo es todo',
    'Tú y yo','Mi mundo eres tú','Eternamente tuyo','Eres mi razón','Cada día más',
    'Mi casualidad favorita','Tú eres mi hogar'
  ],

  // Mensajes que van apareciendo abajo, uno tras otro
  mensajes: [
    'Cada estrella de esta galaxia lleva tu nombre, Xiomara ✨',
    'Hay estrellas secretas escondidas… una por cada mes juntos 💫',
    'Si el universo es infinito, lo que siento por ti también',
    'Eres la gravedad que me mantiene en órbita 🪐',
    'De todos los universos posibles, te elegiría en todos',
    'Busca el planeta rosa… tiene nuestra fecha 🌸',
    'Toca cualquier parte: hay amor escondido en cada rincón 💖',
    'Hay una carta para ti en el sobre 💌'
  ],

  // Lo que aparece cuando ella toca la pantalla
  toques: ['Te amo 💖','Un beso 💋','Mi Xio ♡','Eres hermosa','Te adoro','Para siempre','Mi cielo ✨','Siempre tú','Mi vida 🌙','Te quiero 🌹'],

  // ── Estrellas secretas: un recuerdo por cada mes juntos ──
  // Cambia los textos por recuerdos reales. 'foto' es opcional
  // (por ejemplo 'assets/fotos/mes1.jpg').
  recuerdos: [
    { titulo: 'Donde todo empezó', texto: 'Un 15 de diciembre el universo decidió juntarnos. Desde ese día, todo tiene más brillo.' },
    { titulo: 'Nuestro primer mes', texto: 'Empezamos el año juntos y supe que quería empezar todos los demás contigo.' },
    { titulo: 'Dos meses', texto: 'Tu risa ya era mi sonido favorito del mundo.' },
    { titulo: 'Tres meses', texto: 'Aprendí que contigo hasta lo más simple se siente especial.' },
    { titulo: 'Cuatro meses', texto: 'Cada día descubro algo nuevo de ti, y cada cosa me enamora más.' },
    { titulo: 'Cinco meses', texto: 'Eres mi lugar seguro, mi calma y mi casa.' },
    { titulo: 'Medio año', texto: 'Seis meses contigo y siento que apenas estamos empezando lo más bonito.' },
    { titulo: 'Siete meses', texto: 'Gracias por quedarte, por entenderme y por elegirme cada día.' },
    { titulo: 'Ocho meses', texto: 'Mis planes favoritos son todos los que te incluyen.' },
    { titulo: 'Nueve meses', texto: 'No importa dónde esté: si estás tú, estoy en casa.' },
    { titulo: 'Diez meses', texto: 'Diez meses y te amo más que el primer día. Y mañana te amaré más que hoy.' },
    // BORRADOR: revisar Carlos
    { titulo: 'Once meses', texto: 'Once meses, y ya casi completamos nuestra primera vuelta al Sol. De todo lo que me ha regalado este año, lo más bonito sigues siendo tú.' }
  ],

  // ── Carta especial que aparece al encontrar TODAS las estrellas ──
  // {n} se reemplaza solo por los meses que llevamos juntos.
  // 'general' sirve para cualquier mes; un número (11: [...]) es la carta propia de ese mes y tiene prioridad.
  // (También vale una lista sola de párrafos, como antes: entonces es la carta de todos los meses.)
  celebracionTitulo: '¡Feliz mes {n}, mi amor!',
  cartaMeses: {
    general: [
      'Mi Xiomara:',
      'Encontraste todas nuestras estrellas, y cada una guarda un pedacito de lo que hemos vivido. {n} meses que, puestos uno junto al otro, forman el cielo más bonito que he visto en mi vida.',
      'Gracias por cada buenos días, por cada risa que me regalas, por tu paciencia en mis días difíciles y por esa forma tan tuya de mirarme, como si yo también fuera tu universo.',
      'Contigo aprendí que el amor no es encontrar a alguien perfecto, sino elegir cada día a la persona que hace que todo valga la pena. Y yo te elijo a ti: hoy, mañana y todos los días que vengan.',
      'Esto es solo el comienzo. Todavía nos quedan muchísimas estrellas por encender juntos.',
      'Feliz mes {n}, mi amor. Te amo con todo lo que soy. 💖'
    ],
    // BORRADOR: revisar Carlos
    11: [
      'Mi Xiomara:',
      'Encontraste todas nuestras estrellas. Once meses encendidos, uno al lado del otro, y solo falta una luz para que este cielo dé su primera vuelta entera al Sol.',
      'Once meses dan para mucho: para conocernos mejor, para echarnos de menos con un océano en medio y para descubrir que, aun así, siempre encontramos la forma de estar cerca.',
      'Gracias por tu paciencia, por tu risa y por cada momento en el que me haces sentir en casa, aunque estemos lejos.',
      'Ahora este universo se prepara para algo especial. Dentro de un mes, nuestras estrellas van a buscarse entre ellas… y yo quiero estar ahí contigo para verlo.',
      'Feliz mes once, mi amor. Te amo con todo lo que soy. 💖'
    ],
    // BORRADOR: revisar Carlos (nuestro primer año, el 15/12/2026: las trece estrellas ya forman su constelación)
    12: [
      'Mi Xiomara:',
      'Un año. Doce meses, trece estrellas, y mira lo que hacen esta noche: se buscan entre ellas y se dan la mano, como nosotros, hasta formar nuestra primera vuelta entera al Sol.',
      'Hace un año empezó todo con una sola luz. Hoy este cielo está lleno de días que vivimos juntos, de los buenos y de los difíciles, y en todos hay algo en común: tú.',
      'Gracias por este año, por quedarte, por reírte conmigo y por cuidar lo nuestro incluso con un océano en medio. Nada de lo que hay aquí existiría sin ti.',
      'No sé cuántas vueltas al Sol nos esperan, pero sé con quién quiero darlas todas.',
      'Feliz primer año, mi amor. Te amo con todo lo que soy. 💖'
    ]
  },
  // Título de la celebración de un mes concreto (si no, celebracionTitulo).
  celebracionTituloMes: { 12: '¡Feliz primer año, mi amor!' },

  // ── Carta (cada elemento es un párrafo) ──
  cartaTitulo: 'Para ti, Xiomara',
  carta: [
    'No sabía cómo decirte todo lo que siento, así que decidí construirte un universo. Cada estrella, cada luz y cada palabra que flota aquí existe porque tú existes.',
    'Contigo aprendí que el amor no es solo un sentimiento, es un lugar. Un lugar donde quiero quedarme para siempre.',
    'Gracias por tu risa, por tu paciencia, por tus abrazos y por hacer que hasta los días más grises brillen como esta galaxia.',
    'Si algún día dudas de lo mucho que te amo, vuelve aquí y mira a tu alrededor: este universo entero es tuyo.'
  ]
};
