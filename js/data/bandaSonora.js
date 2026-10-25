/* ════════════════════════════════════════════════════════════════
   🎵  BANDA SONORA
   Una canción (o un fragmento) para cada momento del viaje. Mientras un momento tenga archivo: null (o si su archivo no
   está, por ejemplo en GitHub Pages, donde los .m4a no se publican), suena lo de siempre: la música ambiental original que
   se genera en el dispositivo (js/ui/musica.js), y sin canción de portada no hay pantalla de toque. Para añadir una canción:
     1. Cortar el fragmento con   node scripts/preparar-audio.mjs canciones/mia.mp3 --inicio 0:41 --fin 1:52 --nombre inicio
        (lo deja en assets/musica/inicio.m4a con su volumen igualado y apunta sus bytes y su duración en
        assets/musica/indice.json, que es de donde la web los lee).
     2. Escribir aquí su archivo ('inicio.m4a') y, si hace falta, sus marcas: el segundo DENTRO DEL FRAGMENTO (no de la
        canción original) en el que pasa cada cosa.
   Cada momento:  archivo  nombre dentro de assets/musica/ (o null)
                  duracion segundos; null = la del índice (la mide el script)
                  volumen  0–1, sobre el volumen general de CONFIG.volumen
                  bucle    true = vuelve a empezar al terminar; false = al terminar se funde con lo siguiente
                  marcas   { nombre: segundo }: avisos para las animaciones (bandaSonora.alMarca); null = sin marca
                  estancia (opcional) { archivo, volumen }: versión instrumental tranquila de la misma canción (Demucs, a
                           −20 LUFS) que entra con un fundido de 3 s cuando acaba el fragmento, mientras se sigue mirando el
                           lugar; al acabar ella, el ambiente generativo (que nunca se repite). Nada va en bucle salvo el
                           ambiente. Se descarga en segundo plano después de su canción, no en la carga.
   ════════════════════════════════════════════════════════════════ */
import { TIEMPOS_AMOR } from '../util/supernovaAmor.js';
import { ESCENA_PULSAR, ESCENA_CUASAR, ESCENA_DENEB } from '../util/escenasGigantes.js';

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
const estancia = (archivo, volumen = 0.9) => ({ archivo, volumen });

export const MOMENTOS = {
  // Canción de la intro: «Maps» (Maroon 5), el estribillo: 32 s a ~117,5 BPM, un compás cada ~2,0 s desde el 0. Suena al
  // terminar la carga, a la vez que el videoclip (js/ui/portada.js), que sigue su reloj. Las marcas son los segundos del
  // fragmento en los que deben caer los hitos del clip (HITOS de portada.js, que explica cada uno: las dos luces con las
  // primeras llamadas de la voz, los dos golpes de la letra a 10,9 y 15,7, el encuentro en el compás de 20,0, el salto en
  // el de 28,0 y la tarjeta en el de 30,0); con este fragmento coinciden y el clip va a 1:1. Sin archivo (o si no carga),
  // el clip va con su propio reloj de 32 s.
  inicio: momento({ archivo: 'inicio.m4a', duracion: 32, marcas: { luzCarlos: 1.17, luzXiomara: 3.25, mapa: 5.11, ruta: 7.13, espera: 10.91, respuesta: 15.73, encuentro: 19.99, nombres: 22.01, cielo: 24.03, salto: 27.98, tarjeta: 30 } }),
  // Instrumental de los viajes («Duvet», bôa): 15 s, lo que dura el viaje más largo, sin bucle. hastaLlegar: al despegar
  // empieza en el segundo 15 − duración del viaje, para que su final caiga justo en la llegada (allí se funde con la canción
  // del destino o con el ambiente).
  viajes: momento({ archivo: 'viajes.m4a', duracion: 15, volumen: 0.75, hastaLlegar: true }),
  // Destinos (ids de js/data/universo.js): su canción entra al llegar, desde el principio y a la vez que la animación del
  // lugar (en el mismo cuadro en que termina el viaje). Casa («hogar»): al volver a ella tras un viaje (no al entrar).
  // La supernova («Sparks», Coldplay, 62,3 s desde «My heart is yours»): su ceremonia dura lo mismo y empieza con ella;
  // las marcas son sus fases (js/util/supernovaAmor.js, TIEMPOS_AMOR).
  supernova: momento({ archivo: 'supernova.m4a', duracion: 62.3, marcas: { ...FASES_SUPERNOVA }, estancia: estancia('supernova-estancia.m4a') }),
  // Púlsar, cuásar y Deneb: su escena al llegar sigue el reloj de su canción (js/ui/escenasGigantes.js); sus marcas son
  // las de la escena (js/util/escenasGigantes.js): se ajustan allí y valen para las dos cosas.
  pulsar: momento({ archivo: 'pulsar.m4a', marcas: { ...ESCENA_PULSAR.marcas }, estancia: estancia('pulsar-estancia.m4a') }),
  deneb: momento({ archivo: 'deneb.m4a', marcas: { ...ESCENA_DENEB.marcas }, estancia: estancia('deneb-estancia.m4a') }),                    // «Middle»
  // (La voz del cuásar es un mensaje; su estancia es la instrumental de «I Saw Your Face Today».)
  cuasar: momento({ archivo: 'cuasar.m4a', marcas: { ...ESCENA_CUASAR.marcas }, estancia: estancia('cuasar-estancia.m4a') }),
  // TON 618 («I Wanna Be Yours», 136 BPM) y Sagitario A* («Say Yes to Heaven», 103 BPM): su escena (js/escena/ton618.js,
  // js/escena/sagitario.js, js/util/guionAgujeros.js) empieza al llegar, con la canción, y cae en estas marcas.
  //   ton618     secretos 1.ª frase · esconder 2.ª frase · serTuyo «quiero ser tuyo» (las dos corrientes aparecen) ·
  //              estribillo (latidos del disco) · tuyo1/tuyo2 latidos grandes · estribillo2 · ultimoTuyo (las corrientes se
  //              funden) · fundido (queda en calma)
  //   sagitario  estribillo (las órbitas dibujan corazones) · segundaFrase (dos estrellas orbitan juntas) · fundido
  ton618: momento({ archivo: 'ton618.m4a', marcas: { secretos: 1.4, esconder: 4.6, serTuyo: 8.0, estribillo: 10.7, tuyo1: 16.4, tuyo2: 20.4, estribillo2: 23.1, ultimoTuyo: 32.5, fundido: 35 }, estancia: estancia('ton618-estancia.m4a') }),
  sagitario: momento({ archivo: 'sagitario.m4a', marcas: { estribillo: 18.4, segundaFrase: 23.6, fundido: 35.6 }, estancia: estancia('sagitario-estancia.m4a') }),
  gigante: momento(),
  hogar: momento({ archivo: 'hogar.m4a', estancia: estancia('hogar-estancia.m4a') }),                    // «I Saw Your Face Today»
  // Una canción por mes (1 = enero … 12 = diciembre, en la hora de Argentina): suena en casa durante ese mes en lugar
  // del ambiente. Basta con añadir más meses con la misma forma.
  mes: {
    10: momento({ volumen: 0.8 })
  }
};

// Solo para las pruebas (?pruebaAudio): tonos y ruido rosa generados con ffmpeg en assets/musica/prueba/ (no se
// publican ni se guardan en git; los crea tests/navegador/banda.mjs con scripts/preparar-audio.mjs).
export const PRUEBA = {
  carpeta: 'assets/musica/prueba/',
  momentos: {
    inicio: momento({ archivo: 'inicio.m4a', marcas: { ...MOMENTOS.inicio.marcas } }),
    viajes: momento({ archivo: 'viajes.m4a', duracion: 15, volumen: 0.75, hastaLlegar: true }),
    hogar: momento({ archivo: 'hogar.m4a', estancia: estancia('hogar-estancia.m4a') })
  }
};

// Momentos en uso, aplanados: { inicio, viajes, supernova, …, 'mes-10' }, con la carpeta de sus archivos.
export function configuracionActiva(busqueda = typeof location === 'undefined' ? '' : location.search) {
  const prueba = new URLSearchParams(busqueda).has('pruebaAudio');
  const { mes, ...resto } = MOMENTOS, momentos = { ...resto };
  for (const [n, m] of Object.entries(mes)) momentos[`mes-${n}`] = m;
  if (prueba) Object.assign(momentos, PRUEBA.momentos);
  // Cada estancia es un momento más («deneb-estancia»), sin marcas, al que su canción pasa al acabar.
  for (const [n, m] of Object.entries(momentos)) if (m.estancia?.archivo) momentos[`${n}-estancia`] = momento({ ...m.estancia, esEstancia: true });
  return { carpeta: prueba ? PRUEBA.carpeta : CARPETA, momentos };
}
