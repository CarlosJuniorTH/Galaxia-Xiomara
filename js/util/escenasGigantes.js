// Escenas propias de tres gigantes al llegar (como la de la supernova): el púlsar del Cangrejo, el cuásar y Deneb (esta, en escenaDeneb.js).
// Cada una va con un fragmento de audio (js/data/bandaSonora.js) y se define solo por su DURACIÓN y unas MARCAS en
// segundos dentro del fragmento: si cambia el audio, basta con ajustar estos números (o escalarlos con
// `escalarEscena`). El reloj es el del audio (`bandaSonora.tiempo(id)`, js/ui/escenasGigantes.js); sin audio, el
// tiempo propio desde la llegada. Aquí solo hay números y curvas (sin three.js): las pruebas las comprueban sin navegador.

// Púlsar → pulsar.m4a (33,65 s): la parte de amor de «Neo Romeo» (Rusowsky), a 108 BPM: un pulso cada 0,556 s y un
// compás (4 pulsos) cada 2,25 s desde el 0. El púlsar casi se para, con los haces de lado, y LATE con la canción
// como un corazón: haces y destellos a pulsos, cada vez más fuertes, y del todo en el estribillo.
//  bailar      «Quererte hasta que bailar»: ya está quieto y empieza a latir, suave;
//  corazon     «Todo este corazón caliente»: los latidos se notan y los haces se abren un poco;
//  quererte    «Siempre sirvo pa' quererte»: sube (los haces se van abriendo y encendiendo);
//  estribillo  «De tu amor yo no sé…»: el momento grande: haces del todo, la nebulosa se ilumina con hilos de motas
//              del centro hacia fuera y todo late al compás;
//  segunda     segunda vuelta del estribillo: aún más fuerte y con luz rosa y dorada;
//  fin         en los dos últimos segundos vuelve a girar normal.
// camara: el videoclip (formato: js/util/directorCamara.js; segundos del fragmento, distancias en radios de encuadre).
// Pista de ejemplo, sencilla, a la espera de la del agente del púlsar: se acerca mientras se para, rodea el corazón
// mientras late, un golpe de cámara en el estribillo y una vuelta lenta y abierta en la segunda.
export const ESCENA_PULSAR = { id: 'pulsar', duracion: 33.6, pulso: 60 / 108, compas: 4, desfase: 0, parada: 'bailar', marcas: { inicio: 0, bailar: 1.4, corazon: 4.9, quererte: 12.5, estribillo: 15, segunda: 28, fin: 33.6 },
  camara: [
    { t: 0, pos: [0, 12, 1], curva: 'suave' },
    { t: 4.9, pos: [-18, 16, 0.78], fov: 54, curva: 'suave' },
    { t: 12.5, pos: [-62, 22, 0.66], fov: 50, curva: 'lineal' },
    { t: 14.6, pos: [-74, 20, 0.62], fov: 48, curva: 'lineal' },
    { t: 15, pos: [-80, 10, 0.5], fov: 44, curva: 'rapida' },
    { t: 27.5, pos: [-150, 14, 0.62], fov: 50, curva: 'suave' },
    { t: 33.6, pos: [-190, 18, 0.95], fov: 60, curva: 'suave' }
  ] };

// Cuásar → cuasar.m4a (31 s): un hombre cuenta, en voz baja y con una música suave de fondo que va creciendo (≈93 BPM),
// cómo se enamoró de ella. Un cuásar es el corazón de una galaxia que se ENCIENDE: el gas que cae al agujero lo calienta y
// la energía sale disparada en dos chorros, arriba y abajo. El clip es eso, contado con la historia: al empezar el recuerdo
// el cuásar vuelve a estar dormido (los chorros se recogen en el núcleo, el disco y la galaxia se apagan) y, frase a frase,
// se va encendiendo: los dos chorros —los dos, a la vez, como ellos dos— nacen y crecen en las frases clave, hasta llegar a
// su diseño de siempre en «mi mujer ideal», que es como queda para explorarlo. (Segundos del fragmento; transcripción de
// Whisper large-v3 comprobada dos veces: 73 de 74 palabras iguales y con menos de 0,54 s de diferencia.)
//  0–1,3      empieza el recuerdo: los chorros se recogen en el núcleo y todo se apaga (el cuásar dormido);
//  vi 3,18    «la primera vez que la vi»: la primera chispa: el disco se enciende con un anillo de luz y asoman los chorros;
//  salir 4,9  le pidió salir: los chorros dan su primer estirón;
//  excusa 5,74 buscaba excusas para verla: la materia cae en espiral al disco, más y más deprisa (siempre acercándose), y lo aviva;
//  novios 9,3 le pidió ser novios: los dos chorros se lanzan juntos hasta la mitad;
//  increible  «…es simplemente increíble» (10,58; «increíble» en 13,32): el disco se acelera y el anillo de luz del
//             horizonte crece con la palabra alargada; en «increíble», otro estirón;
//  otras 14,52 las otras mujeres (impresionantes; bellas 18,6, exitosas): la galaxia se llena de lucecitas… pero los chorros
//             NO crecen con ellas;
//  pero 21,02 «pero ella…»: las lucecitas se apagan de golpe; los chorros vuelven a crecer en tres golpes de la música (21,85,
//             23,13, 24,43) mientras dice que es la primera que…
//  reir 25,06 «…me hace reír»: el disco ríe: ondas de luz rápidas que salen del centro;
//  disfrutar 25,98 disfrutar estar con ella: todo se entibia, rosa y oro;
//  ideal 27,58 «es mi mujer…»: la luz de la galaxia se recoge en el núcleo; cima 28,64 «…ideal»: los chorros se disparan
//             hasta su punta; estalla 29,4 (la música crece): en las puntas florecen los lóbulos y una onda de motas sale del
//             disco. Queda el cuásar de siempre, entero, para explorarlo.
// camara: la pista del videoclip para el director de cámara (js/util/directorCamara.js), en el sistema del cuásar (Y: eje de
// los chorros; el disco en XZ): pos [azimut°, elevación° sobre el disco, distancia en radios de encuadre (5200 unidades del
// cuásar: el disco mide 0,21, la galaxia 0,92 y cada chorro 1,46)], mira [x, y, z] en radios, fov y curva de llegada.
export const ESCENA_CUASAR = {
  id: 'cuasar', duracion: 31,
  marcas: { inicio: 0, recogido: 1.3, vi: 3.18, salir: 4.9, excusa: 5.74, pedir: 8, novios: 9.3, increible: 10.58, simple: 12.1, wow: 13.32,
    otras: 14.52, bellas: 18.6, pero: 21.02, golpe1: 21.85, golpe2: 23.13, golpe3: 24.43, reir: 25.06, disfrutar: 25.98, ideal: 27.58, cima: 28.64,
    estalla: 29.4, fin: 31 },
  camara: [
    { t: 0, pos: [30, 25, 1.0], mira: [0, 0, 0], fov: 50, curva: 'suave' },             // el encuadre de llegada
    { t: 1.3, pos: [40, 24, 0.85], mira: [0, 0, 0], fov: 48, curva: 'suave' },           // los chorros se recogen
    { t: 3.0, pos: [55, 20, 0.62], mira: [0, 0, 0], fov: 44, curva: 'suave' },          // «desde la primera vez…»: hacia el núcleo dormido
    { t: 3.18, pos: [70, 6, 0.7], mira: [0, 0.04, 0], fov: 46, curva: 'corte' },       // «…la vi»: corte a ras del disco: la chispa
    { t: 4.8, pos: [82, 9, 0.72], mira: [0, 0.05, 0], fov: 46, curva: 'lineal' },
    { t: 5.8, pos: [95, 15, 0.85], mira: [0, 0.1, 0], fov: 46, curva: 'rapida' },      // salir: sigue el estirón de los chorros
    { t: 7.7, pos: [150, 40, 0.68], mira: [0, 0, 0], fov: 44, curva: 'suave' },         // las excusas: desde arriba, la caída en espiral
    { t: 8.0, pos: [200, 4, 1.15], mira: [0, 0, 0], fov: 48, curva: 'corte' },          // «y le pedí…» (golpe de la música): de lado, los dos chorros
    { t: 10.2, pos: [212, 6, 1.28], mira: [0, 0, 0], fov: 48, curva: 'suave' },         // novios: se lanzan juntos
    { t: 13.32, pos: [235, 28, 0.6], mira: [0, 0, 0], fov: 40, curva: 'suave' },       // «simplemente increíble»: acercamiento al núcleo
    { t: 14.3, pos: [240, 30, 0.62], mira: [0, 0, 0], fov: 40, curva: 'lineal' },
    { t: 17.9, pos: [270, 58, 1.7], mira: [0, 0, 0], fov: 55, curva: 'suave' },         // las otras: la galaxia entera, desde arriba
    { t: 20.9, pos: [300, 52, 1.65], mira: [0, 0, 0], fov: 55, curva: 'lineal' },
    { t: 22.0, pos: [320, 18, 0.8], mira: [0, 0.05, 0], fov: 46, curva: 'rapida' },    // «pero ella»: de vuelta al centro, rápido
    { t: 24.9, pos: [345, 10, 0.9], mira: [0, 0.15, 0], fov: 46, curva: 'lineal' },    // los tres golpes: travelling junto a los chorros
    { t: 25.5, pos: [352, 22, 0.7], mira: [0, 0, 0], fov: 44, curva: 'rapida', giro: 5 },   // «me hace reír»: un vaivén
    { t: 26.0, pos: [356, 24, 0.68], mira: [0, 0, 0], fov: 43, curva: 'suave', giro: -3 },
    { t: 27.4, pos: [370, 26, 0.64], mira: [0, 0, 0], fov: 42, curva: 'suave' },        // disfrutar con ella: órbita lenta y cálida
    { t: 28.6, pos: [380, 20, 0.55], mira: [0, 0, 0], fov: 42, curva: 'suave' },        // «es mi mujer…»: muy cerca del núcleo
    { t: 29.9, pos: [395, 12, 1.6], mira: [0, 0, 0], fov: 52, curva: 'rapida' },       // «…ideal»: hacia atrás con los chorros disparados
    { t: 31, pos: [400, 22, 1.1], mira: [0, 0, 0], fov: 50, curva: 'suave' }            // se queda: el cuásar entero
  ]
};

// Deneb: su escena, su pista de cámara y su estado viven aparte (js/util/escenaDeneb.js).
import { ESCENA_DENEB, estadoDeneb } from './escenaDeneb.js';
export { ESCENA_DENEB, estadoDeneb };

export const ESCENAS_GIGANTES = { pulsar: ESCENA_PULSAR, cuasar: ESCENA_CUASAR, deneb: ESCENA_DENEB };

// La misma escena para un audio de otra duración: todas las marcas (y el latido y el pulso) en proporción.
export function escalarEscena(config, duracion) {
  const k = duracion / config.duracion, por = v => v ? v * k : v;
  return { ...config, duracion, latido: por(config.latido), pulso: por(config.pulso), desfase: por(config.desfase), marcas: Object.fromEntries(Object.entries(config.marcas).map(([m, s]) => [m, s * k])) };
}

const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;
const suave = (s, a, b) => { const x = sat((s - a) / Math.max(1e-6, b - a)); return x * x * (3 - 2 * x); };
const mezcla = (a, b, k) => a + (b - a) * k;

// Velocidad de giro del púlsar en reposo dentro de la escena (fracción de la normal): casi quieto, pero vivo.
export const GIRO_QUIETO = 0.006;

// Latido de corazón en cada pulso de la canción («pum-pum»: el golpe y otro menor 0,17 s después), con el primer
// pulso de cada compás más fuerte. Devuelve 0–1 y deja en `e.edad` los segundos desde el último pulso.
export function latidoPulso(s, { pulso, compas = 4, desfase = 0 }, e, reducido = false) {
  const b = (s - desfase) / pulso, k = Math.floor(b), edad = (b - k) * pulso;
  e.edad = edad;
  const golpe = Math.exp(-edad / (reducido ? 0.3 : 0.13)), eco = !reducido && edad > 0.17 ? 0.45 * Math.exp(-(edad - 0.17) / 0.09) : 0;
  return (golpe + eco) * ((((k % compas) + compas) % compas) === 0 ? 1 : 0.62);
}

// Estado del púlsar en el segundo `s` (escribe en `e`, sin memoria nueva en cada cuadro). Fuera de la escena
// (s ≤ inicio o s ≥ fin) coincide con el estado normal: giro 1, tiempo 1, haces 1, apertura 1, motas 0.
//  giro      fracción de la velocidad de giro;  tiempo  fracción del ritmo de su gas (ondas, nudos, flujo);
//  pulso     el latido en este instante (0–~1,2: ya multiplicado por su fuerza), `edad` (s desde el último pulso)
//            y `fuerza` (0–1,15: cuánto late en esta parte de la canción);
//  haces     intensidad de los haces (1 la normal, con el latido);  apertura  anchura de los haces (1 la normal);
//  motasHaz  luz de las motas que llenan los haces (0–1);  nebulosa  frente de luz de la nebulosa (0 → 1,15:
//            hasta dónde, del centro hacia fuera, se han encendido sus motas);  brillo  luz de esas motas (0–1);
//  tibio     luz rosa y dorada de la segunda vuelta (0–1);  foco  cuánto se atenúa el resto del cielo (0–0,6).
export function estadoPulsar(s, config, e = {}, reducido = false) {
  const m = config.marcas, para = suave(s, m.inicio, m[config.parada || 'bailar']), vuelve = suave(s, m.fin - 2, m.fin);
  e.giro = mezcla(mezcla(1, GIRO_QUIETO, para), 1, vuelve);
  e.tiempo = mezcla(mezcla(1, 0.15, para), 1, vuelve);
  // La fuerza del latido crece con la canción: suave al empezar, se nota en «corazón», sube hacia el estribillo,
  // plena en él y algo más en la segunda vuelta.
  const fuerza = (suave(s, m.bailar - 0.4, m.bailar + 0.6) * 0.3 + suave(s, m.corazon - 0.3, m.corazon + 0.8) * 0.25 + suave(s, m.quererte, m.estribillo - 0.2) * 0.2
    + suave(s, m.estribillo - 0.2, m.estribillo + 0.2) * 0.25 + suave(s, m.segunda - 0.3, m.segunda + 0.6) * 0.15) * (1 - vuelve);
  e.pulso = latidoPulso(s, config, e, reducido) * fuerza * (reducido ? 0.4 : 1);
  e.fuerza = fuerza;
  // Los haces se van abriendo y encendiendo con la canción; en el estribillo, del todo (en un cuarto de segundo).
  const encendido = sat(suave(s, m.corazon - 0.5, m.corazon + 2) * 0.3 + suave(s, m.quererte, m.estribillo - 0.3) * 0.3 + suave(s, m.estribillo - 0.3, m.estribillo + (reducido ? 1.5 : 0.25)) * 0.4);
  e.haces = mezcla(mezcla(mezcla(1, 0.55, para), 2, encendido), 1, vuelve) * (1 + 0.9 * e.pulso);
  e.apertura = mezcla(mezcla(1, 1.9, encendido), 1, vuelve) * (1 + 0.1 * e.pulso);
  e.motasHaz = sat(suave(s, m.bailar - 0.4, m.corazon) * (0.35 + 0.65 * encendido)) * (1 - vuelve);
  // La nebulosa se enciende en el estribillo, del centro hacia fuera, y se apaga al volver a girar.
  e.nebulosa = 1.15 * suave(s, m.estribillo - 0.2, m.estribillo + (reducido ? 3 : 1.3));
  e.brillo = suave(s, m.estribillo - 0.2, m.estribillo + 0.6) * (1 - vuelve);
  e.tibio = suave(s, m.segunda - 0.5, m.segunda + 1.2) * (1 - vuelve);
  e.foco = 0.6 * para * (1 - vuelve);
  return e;
}

// Una curva por tramos: [[segundo, valor, tipo]] con tipo 's' (suave, por defecto) o 'r' (rápida: sale de golpe y frena,
// para lo que pasa justo en una palabra). Antes del primero y después del último, su valor.
function curva(s, p) {
  if (s <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    const [b, vb, tipo] = p[i];
    if (s < b) { const [a, va] = p[i - 1], x = (s - a) / (b - a), k = tipo === 'r' ? 1 - (1 - x) * (1 - x) * (1 - x) : x * x * (3 - 2 * x); return va + (vb - va) * k; }
  }
  return p[p.length - 1][1];
}

// Reposo del cuásar (su diseño de siempre): fuera de la escena y al terminarla todo vale esto.
export const REPOSO_CUASAR = Object.freeze({ tiempo: 1, alcance: 1.05, frente: 0, chorro: 1, disco: 1, giro: 1, gas: 1, caida: 1, fotones: 1, destello: 1, ondaK: 0, ondaFase: 0,
  otras: 0, calido: 0, conv: -1, cima: -1, estallido: -1, lobulo: 1, acento: -1, foco: 0 });

// Curvas del cuásar (con las marcas de ESCENA_CUASAR; si se escala la escena, se recalculan).
function curvasCuasar(m) {
  const g = [m.golpe1, m.golpe2, m.golpe3];
  return {
    // Largo de los chorros (fracción de su largo; ≥ 1,03: enteros). Se recogen al empezar y crecen en las frases clave.
    alcance: [[0, 1.05], [m.recogido, 0], [m.vi, 0], [m.vi + 0.55, 0.1, 'r'], [m.salir, 0.1], [m.salir + 0.7, 0.25, 'r'], [m.novios, 0.25], [m.novios + 0.75, 0.5, 'r'],
      [m.wow, 0.5], [m.wow + 0.65, 0.62, 'r'], [g[0], 0.62], [g[0] + 0.5, 0.68, 'r'], [g[1], 0.68], [g[1] + 0.5, 0.74, 'r'], [g[2], 0.74], [g[2] + 0.5, 0.8, 'r'],
      [m.reir + 0.46, 0.8], [m.reir + 0.95, 0.85, 'r'], [m.cima, 0.85], [m.estalla, 1.05, 'r']],
    disco: [[0, 1], [m.recogido, 0.2], [m.vi, 0.26], [m.vi + 0.3, 0.6, 'r'], [m.salir, 0.6], [m.salir + 0.5, 0.65], [m.excusa, 0.65], [m.pedir - 0.3, 0.85], [m.novios, 0.85], [m.novios + 0.4, 0.95, 'r'],
      [m.wow, 0.95], [m.wow + 0.4, 1.05, 'r'], [m.cima, 1.05], [m.cima + 0.4, 1.3, 'r'], [m.estalla + 0.4, 1.3], [m.fin, 1]],
    giro: [[0, 1], [m.recogido, 0.4], [m.vi, 0.4], [m.vi + 0.6, 0.7], [m.novios, 0.8], [m.simple, 1.1], [m.wow, 2.2], [m.wow + 1.2, 1.4], [m.pero, 1.2], [m.reir, 1.7], [m.disfrutar + 0.5, 1.3],
      [m.ideal, 1.4], [m.cima, 2.4], [m.cima + 0.4, 3, 'r'], [m.estalla + 0.3, 3], [m.fin, 1]],
    gas: [[0, 1], [m.recogido, 0.3], [m.vi, 0.3], [m.vi + 0.5, 0.5], [m.pedir, 0.6], [m.otras, 0.65], [m.otras + 1.5, 0.8], [m.pero, 0.8], [m.pero + 0.8, 0.62], [m.ideal, 0.7],
      [m.cima, 0.5], [m.estalla + 0.3, 1.1, 'r'], [m.fin, 1]],
    caida: [[0, 1], [m.recogido, 0.3], [m.excusa, 0.3], [m.excusa + 0.8, 1.8], [m.pedir - 0.3, 1.8], [m.pedir + 0.5, 1], [m.ideal, 1], [m.cima, 1.8], [m.estalla + 0.5, 1.4], [m.fin, 1]],
    fotones: [[0, 1], [m.recogido, 0.4], [m.vi, 0.4], [m.vi + 0.35, 1, 'r'], [m.simple, 1], [m.wow, 1.6], [m.otras + 0.5, 1.1], [m.pero, 1.1], [m.ideal, 1.2], [m.cima, 1.5], [m.cima + 0.3, 1.9, 'r'],
      [m.estalla + 0.5, 1.6], [m.fin, 1]],
    destello: [[0, 1], [m.recogido, 0.35], [m.vi, 0.35], [m.vi + 0.25, 0.8, 'r'], [m.ideal, 0.8], [m.cima, 0.6], [m.cima + 0.3, 1.1, 'r'], [m.fin, 1]],
    // Las ondas del disco: la chispa de «la vi» y la risa (un tren de ondas rápido mientras dice «me hace reír»).
    ondaK: [[0, 0], [m.vi, 0], [m.vi + 0.12, 0.8, 'r'], [m.vi + 1.0, 0], [m.reir - 0.05, 0], [m.reir + 0.1, 1, 'r'], [m.disfrutar, 1], [m.disfrutar + 0.6, 0]],
    otras: [[0, 0], [m.otras, 0], [m.otras + 1.4, 0.5], [m.bellas - 0.7, 0.7], [m.bellas, 0.7], [m.bellas + 1.3, 1], [m.pero, 1], [m.pero + 0.8, 0, 'r']],
    calido: [[0, 0], [m.disfrutar - 0.2, 0], [m.disfrutar + 1, 1], [m.estalla, 1], [m.fin, 0]],
    foco: [[0, 0], [m.recogido, 0.5], [m.estalla, 0.5], [m.fin, 0]]
  };
}
const curvasGuardadas = new WeakMap();

// Estado del cuásar en el segundo `s` (escribe en `e`, sin memoria nueva en cada cuadro). En s = 0 y en s ≥ fin coincide
// con su diseño de siempre (REPOSO_CUASAR). Campos (1 = como siempre):
//  alcance   largo de los chorros (0 recogidos – 1,05 enteros);  frente  luz del frente que avanza mientras crecen (0–1);
//  acento    dónde está ese frente a lo largo del chorro (0–1; −1 sin frente);  chorro  intensidad de los chorros;
//  disco     luz del disco;  giro  velocidad de giro del disco y de lo que cae;  gas  luz de la galaxia anfitriona;
//  caida     materia que cae al disco (luz y prisa);  fotones  anillo de luz del horizonte;  destello  luz del núcleo;
//  ondaK / ondaFase  ondas de luz que salen del centro del disco (fuerza y fase);  otras  lucecitas de la galaxia (0–1);
//  calido    rosa y oro (0–1);  conv  la luz de la galaxia que se recoge en el núcleo (0–1; −1 nada);
//  cima      segundos desde «ideal» (−1 antes): la onda de motas;  estallido  segundos desde que florecen los lóbulos (−1);
//  lobulo    luz de los lóbulos de las puntas (0 sin chorros enteros, 1 normal, más al florecer);  foco  penumbra del resto.
export function estadoCuasar(s, config, e = {}, reducido = false) {
  const m = config.marcas;
  let c = curvasGuardadas.get(config); if (!c) { c = curvasCuasar(m); curvasGuardadas.set(config, c); }
  if (!(s > 0) || s >= m.fin) { Object.assign(e, REPOSO_CUASAR); return e; }
  e.tiempo = 1;
  e.alcance = curva(s, c.alcance);
  // El frente brilla mientras los chorros crecen (más cuanto más deprisa), nunca al recogerse.
  const v = (curva(s + 0.02, c.alcance) - curva(s - 0.02, c.alcance)) / 0.04;
  e.frente = Math.min(1, Math.max(0, v * 3)) * (reducido ? 0.5 : 1);
  e.acento = e.frente > 0.01 && e.alcance < 1.02 ? Math.max(0, e.alcance - 0.012) : -1;
  e.chorro = 1 + 0.45 * e.frente;
  e.disco = curva(s, c.disco); e.giro = reducido ? 1 + (curva(s, c.giro) - 1) * 0.5 : curva(s, c.giro);
  e.gas = curva(s, c.gas); e.caida = curva(s, c.caida); e.fotones = curva(s, c.fotones); e.destello = curva(s, c.destello);
  e.ondaK = curva(s, c.ondaK) * (reducido ? 0.4 : 1); e.ondaFase = s * (reducido ? 1.5 : 3.2);
  e.otras = curva(s, c.otras); e.calido = curva(s, c.calido); e.foco = curva(s, c.foco);
  e.conv = s >= m.ideal - 0.3 && s < m.cima ? (s - m.ideal + 0.3) / (m.cima - m.ideal + 0.3) : -1;
  e.cima = s >= m.cima ? s - m.cima : -1;
  e.estallido = s >= m.estalla ? s - m.estalla : -1;
  const florece = e.estallido >= 0 ? Math.min(1, e.estallido * 2.2) * (1 - suave(e.estallido, 0.4, m.fin - m.estalla)) : 0;
  // Las nubes de las puntas: se apagan (suaves) al recogerse los chorros y vuelven cuando llegan enteros, floreciendo.
  e.lobulo = (s < m.recogido ? 1 - suave(s, 0, m.recogido) : suave(s, m.cima + 0.2, m.estalla + 0.2)) * (1 + 1.3 * florece);
  return e;
}

// Director de una escena: lleva su segundo (del reloj que se le pase o, si no, del tiempo propio desde que
// empezó) y su peso (1 en escena; al cancelarla, baja suave a 0 con el último estado quieto, y el gigante
// vuelve a su estado normal). `reloj()` devuelve segundos desde el inicio del fragmento; si aún no sabe
// (null, NaN: el audio no ha empezado), la escena espera en el segundo en que está.
export function crearDirector(config, { salida = 1.5 } = {}) {
  let activa = false, terminada = false, t0 = 0, reloj = null, s = 0, peso = 0, cancelada = false, alTerminar = null, cfg = config;
  const cerrar = valor => { const f = alTerminar; alTerminar = null; f?.(valor); };
  return {
    get config() { return cfg; },
    get activa() { return activa; },
    get terminada() { return terminada; },
    get segundo() { return s; },
    get peso() { return peso; },
    // Algo que dibujar: en escena, saliendo de ella o (Deneb) con el mundo nuevo ya creado.
    get visible() { return peso > 0.0005; },
    iniciar(t, { reloj: r = null, config: c = null, alFin = null } = {}) {
      if (activa) cerrar(false);
      cfg = c || config; reloj = r; t0 = t; s = 0; activa = true; terminada = false; cancelada = false; peso = 1; alTerminar = alFin;
    },
    cancelar() {
      if (!activa && !terminada) return;
      const enCurso = activa; activa = false; terminada = false; cancelada = true;
      if (enCurso) cerrar(false);
    },
    avanzar(t, dt) {
      if (activa) {
        const r = reloj ? reloj() : t - t0;
        if (Number.isFinite(r)) s = Math.max(0, r);
        if (s >= cfg.duracion) {
          s = cfg.duracion; activa = false;
          // Lo que persiste (el mundo de Deneb) se queda hasta que se cancele al irse; lo demás ya está normal.
          if (cfg.persiste) terminada = true; else peso = 0;
          cerrar(true);
        }
      } else if (cancelada) {
        peso = Math.max(0, peso - dt / salida);
        if (peso === 0) cancelada = false;
      }
      return s;
    }
  };
}
