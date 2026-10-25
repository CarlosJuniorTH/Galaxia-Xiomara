/* ════════════════════════════════════════════════════════════════
   🎵  BANDA SONORA
   Una canción (o un fragmento) para cada momento del viaje. Mientras un momento tenga archivo: null, suena lo de
   siempre: la música ambiental original que se genera en el dispositivo (js/ui/musica.js). Para añadir una canción:
     1. Cortar el fragmento con   node scripts/preparar-audio.mjs canciones/mia.mp3 --inicio 0:41 --fin 1:52 --nombre inicio
        (lo deja en assets/musica/inicio.m4a con su volumen igualado y apunta sus bytes y su duración en
        assets/musica/indice.json, que es de donde la web los lee).
     2. Escribir aquí su archivo ('inicio.m4a') y, si hace falta, sus marcas: el segundo DENTRO DEL FRAGMENTO (no de la
        canción original) en el que pasa cada cosa.
   Cada momento:  archivo  nombre dentro de assets/musica/ (o null)
                  duracion segundos; null = la del índice (la mide el script)
                  volumen  0–1, sobre el volumen general de CONFIG.volumen
                  bucle    true = vuelve a empezar al terminar; false = al terminar se funde con el ambiente
                  marcas   { nombre: segundo }: avisos para las animaciones (bandaSonora.alMarca); null = sin marca
   ════════════════════════════════════════════════════════════════ */
import { TIEMPOS_AMOR } from '../util/supernovaAmor.js';

export const CARPETA = 'assets/musica/';
export const FUNDIDO = 1.6;   // segundos del fundido entre dos momentos (1–2 s: ni corte ni espera)

// Fases de la ceremonia de la supernova (js/ui/supernovaAmor.js y js/escena/supernova.js), en segundos desde que empieza:
// la estrella late 14 s (encuentro), calla justo antes de estallar (silencio), estalla (expansión), forma el corazón
// (formación) y se revela (revelación); después queda el recuerdo. La canción de la supernova empieza con la ceremonia
// (no al llegar), así que, si se corta el fragmento para que cambie en estos segundos, música y estallido van juntos.
export const FASES_SUPERNOVA = Object.freeze({
  encuentro: 0,
  silencio: +(TIEMPOS_AMOR.espera - TIEMPOS_AMOR.silencio).toFixed(2),
  expansion: TIEMPOS_AMOR.espera,
  formacion: TIEMPOS_AMOR.espera + TIEMPOS_AMOR.formar,
  revelacion: TIEMPOS_AMOR.espera + TIEMPOS_AMOR.formado,
  recuerdo: TIEMPOS_AMOR.espera + TIEMPOS_AMOR.revelar
});

const momento = (otros = {}) => ({ archivo: null, duracion: null, volumen: 0.9, bucle: false, marcas: {}, ...otros });

export const MOMENTOS = {
  // Canción de la portada: suena desde el toque «Toca para empezar ♡» y la animación sigue su reloj. Las marcas son los
  // segundos del fragmento en los que deben caer los hitos de la portada (js/ui/portada.js, HITOS):
  //   encuentro  las dos luces se encuentran          corazon  el corazón de luz late
  //   galaxia    la galaxia empieza a desplegarse      tarjeta  aparece la tarjeta con el botón para entrar
  // (sin marcas, la animación va a su ritmo de siempre: encuentro a los 4,6 s, tarjeta a los 8,9 s).
  inicio: momento({ marcas: { encuentro: null, corazon: null, galaxia: null, tarjeta: null } }),
  // Instrumental de los viajes: entra al despegar y sale al llegar (se retoma donde se dejó).
  viajes: momento({ volumen: 0.75, bucle: true }),
  // Destinos gigantes (ids de js/data/universo.js): su canción entra al llegar, desde el principio.
  supernova: momento({ marcas: { ...FASES_SUPERNOVA } }),
  pulsar: momento(),
  deneb: momento(),
  cuasar: momento(),
  ton618: momento(),
  sagitario: momento(),
  gigante: momento(),
  // Una canción por mes (1 = enero … 12 = diciembre, en la hora de Argentina): suena en casa durante ese mes en lugar
  // del ambiente. Basta con añadir más meses con la misma forma.
  mes: {
    10: momento({ volumen: 0.8, bucle: true })
  }
};

// Solo para las pruebas (?pruebaAudio): tonos y ruido rosa generados con ffmpeg en assets/musica/prueba/ (no se
// publican ni se guardan en git; los crea tests/navegador/banda.mjs con scripts/preparar-audio.mjs).
export const PRUEBA = {
  carpeta: 'assets/musica/prueba/',
  momentos: {
    inicio: momento({ archivo: 'inicio.m4a', marcas: { encuentro: 6, corazon: 7.5, galaxia: 10, tarjeta: 18 } }),
    viajes: momento({ archivo: 'viajes.m4a', volumen: 0.75, bucle: true })
  }
};

// Momentos en uso, aplanados: { inicio, viajes, supernova, …, 'mes-10' }, con la carpeta de sus archivos.
export function configuracionActiva(busqueda = typeof location === 'undefined' ? '' : location.search) {
  const prueba = new URLSearchParams(busqueda).has('pruebaAudio');
  const { mes, ...resto } = MOMENTOS, momentos = { ...resto };
  for (const [n, m] of Object.entries(mes)) momentos[`mes-${n}`] = m;
  if (prueba) Object.assign(momentos, PRUEBA.momentos);
  return { carpeta: prueba ? PRUEBA.carpeta : CARPETA, momentos };
}
