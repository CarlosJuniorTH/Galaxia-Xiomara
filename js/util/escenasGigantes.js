// Escenas propias de tres gigantes al llegar (como la de la supernova): el púlsar del Cangrejo, el cuásar y Deneb (esta, en escenaDeneb.js).
// Cada una va con un fragmento de audio (js/data/bandaSonora.js) y se define solo por su DURACIÓN y unas MARCAS en
// segundos dentro del fragmento: si cambia el audio, basta con ajustar estos números (o escalarlos con
// `escalarEscena`). El reloj es el del audio (`bandaSonora.tiempo(id)`, js/ui/escenasGigantes.js); sin audio, el
// tiempo propio desde la llegada. Aquí solo hay números y curvas (sin three.js): las pruebas las comprueban sin navegador.

// Púlsar → js/util/escenaPulsar.js (su canción, su letra, su giro y su pista de cámara).
import { ESCENA_PULSAR, estadoPulsar } from './escenaPulsar.js';
export { ESCENA_PULSAR, estadoPulsar };

// Cuásar → cuasar.m4a (31 s): un hombre cuenta, en voz baja y con una música suave de fondo que va creciendo (≈93 BPM),
// cómo se enamoró de ella. Un cuásar es el corazón de una galaxia que se ENCIENDE: el gas que cae al agujero lo calienta y
// la energía sale disparada en dos chorros, arriba y abajo. El clip es eso, contado con la historia: al empezar el recuerdo
// el cuásar vuelve a estar dormido (los chorros se recogen en el núcleo, el disco y la galaxia se apagan) y, frase a frase,
// se va encendiendo: los dos chorros —los dos, a la vez, como ellos dos— nacen y crecen en las frases clave, hasta llegar a
// su diseño de siempre en «mi mujer ideal», que es como queda para explorarlo. (Segundos del fragmento; transcripción de
// Whisper large-v3 comprobada dos veces: 73 de 74 palabras iguales y con menos de 0,54 s de diferencia.)
//  0–1,3      empieza el recuerdo: los chorros se recogen en el núcleo y el disco se apaga de fuera hacia dentro (dormido);
//  vi 3,18    «la primera vez que la vi»: la chispa: el disco se ENCIENDE desde el centro, anillo a anillo (≈2 s), los chorros
//             salen disparados (a un tercio) con un nudo de plasma que los recorre, y una ola de luz cruza la galaxia;
//  pedi 4,36 / salir 4,9  el nervio de pedirle salir: titubeos de luz en el núcleo, un estirón pequeño y otro al «saliéramos»;
//  excusa 5,74 buscaba excusas para verla: la materia cae en espiral al disco, más y más deprisa (siempre acercándose);
//  novios 9,3 le pidió ser novios: los dos chorros se lanzan juntos (a dos tercios), con su nudo, una onda en el disco y otra
//             ola por la galaxia;
//  increible  «…es simplemente increíble» (10,58; «increíble» en 13,32): el disco se acelera y se CALIENTA (blanco azulado),
//             el anillo de luz del horizonte crece; en «increíble», otro estirón con su nudo y su ola;
//  otras 14,52 las otras mujeres (impresionantes; bellas 18,6, exitosas): 48 estrellas con su cruz de luz por la galaxia… y los
//             chorros quietos: ni un nudo (no los encienden);
//  pero 21,02 «pero ella…»: las estrellas se apagan de golpe; en los tres golpes de la música (21,85, 23,13, 24,43) un nudo
//             recorre los chorros y crecen otro poco;
//  reir 25,06 «…me hace reír»: el disco ríe: ondas de luz rápidas que salen del centro, con latidos en las sílabas;
//  disfrutar 25,98 disfrutar estar con ella: el disco se templa y todo se entibia, rosa y oro;
//  ideal 27,58 «es mi mujer…»: la luz de la galaxia se recoge en el núcleo; cima 28,64 «…ideal»: los chorros se disparan hasta
//             su punta con una ráfaga de nudos y una ola ENORME recorre toda la galaxia; estalla 29,4 (la música crece): en las
//             puntas florecen los lóbulos de radio y una onda de motas sale del disco. Queda el cuásar de siempre, entero.
// Los nudos de plasma caen en sílabas de la voz y en golpes de la música de fondo medidos en su pista separada (Demucs).
// camara: la pista del videoclip para el director de cámara (js/util/directorCamara.js): azimut 0 hacia casa (por donde se
// llega: [≈4°, 44°, 1,0]), elevación sobre el disco (+90 = el chorro del lado de casa), distancia en radios de encuadre
// (lejano.dist; el disco mide ~0,21, la galaxia ~0,92 y cada chorro ~1,46). Un solo travelling lento y continuo (Carlos: «lentos,
// suaves, siguiendo con suavidad; nada de girar a un lado y luego a otro»): el azimut avanza siempre hacia el mismo lado (≈3°/s),
// sin cortes, con tramos 'lineal' (Catmull-Rom: sin pararse en cada plano) y solo el último 'suave' para posarse. giro: el
// director pone «arriba» en el eje de los chorros; cada plano lleva el alabeo que deja la vertical del universo arriba (el
// mismo que al llegar, −135°, y el del encuadre en el que se devuelve el control), así la imagen no se ladea. Ningún plano
// más cerca de ~0,62 R con fov ≥ 44: más cerca la imagen horneada del remolino se amplía y se ve borrosa.
export const ESCENA_CUASAR = {
  id: 'cuasar', duracion: 31,
  marcas: { inicio: 0, recogido: 1.3, vi: 3.18, pedi: 4.36, salir: 4.9, excusa: 5.74, pedir: 8, novios: 9.3, increible: 10.58, simple: 12.1, wow: 13.32,
    otras: 14.52, bellas: 18.6, pero: 21.02, golpe1: 21.85, golpe2: 23.13, golpe3: 24.43, reir: 25.06, disfrutar: 25.98, ideal: 27.58, cima: 28.64,
    estalla: 29.4, fin: 31 },
  camara: [
    { t: 0, pos: [4, 44, 1.0], mira: [0, 0, 0], fov: 50, curva: 'suave', giro: -135 },     // el encuadre de llegada
    { t: 4.8, pos: [-2, 46, 0.9], fov: 49, curva: 'lineal', giro: -131 },                  // desde arriba: el disco se enciende por anillos
    { t: 8.5, pos: [-12, 22, 1.15], fov: 50, curva: 'lineal', giro: -123 },                // baja de lado: los chorros salen disparados
    { t: 11.5, pos: [-20, 12, 1.35], fov: 50, curva: 'lineal', giro: -119 },               // novios: los dos chorros enteros, con sus nudos
    { t: 14.5, pos: [-28, 30, 0.95], fov: 48, curva: 'lineal', giro: -116 },               // «increíble»: el disco se calienta
    { t: 19.0, pos: [-40, 52, 1.65], fov: 54, curva: 'lineal', giro: -103 },               // las otras: la galaxia entera, desde arriba
    { t: 21.5, pos: [-48, 44, 1.55], fov: 54, curva: 'lineal', giro: -101 },
    { t: 25.0, pos: [-58, 16, 1.3], fov: 50, curva: 'lineal', giro: -111 },                // «pero ella»: de lado, los nudos en los golpes
    { t: 27.5, pos: [-64, 30, 1.05], fov: 48, curva: 'lineal', giro: -101 },               // la risa y lo cálido
    { t: 28.6, pos: [-68, 34, 1.25], fov: 50, curva: 'lineal', giro: -96 },                // «es mi mujer…»: se abre para la ola
    { t: 31, pos: [-78, 24, 1.9], fov: 52, curva: 'suave', giro: -103 }                    // «…ideal»: la ola por la galaxia y los lóbulos
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

// Latido de corazón en cada pulso de la canción («pum-pum»: el golpe y otro menor 0,17 s después), con el primer
// pulso de cada compás más fuerte. Devuelve 0–1 y deja en `e.edad` los segundos desde el último pulso.
export function latidoPulso(s, { pulso, compas = 4, desfase = 0 }, e, reducido = false) {
  const b = (s - desfase) / pulso, k = Math.floor(b), edad = (b - k) * pulso;
  e.edad = edad;
  const golpe = Math.exp(-edad / (reducido ? 0.3 : 0.13)), eco = !reducido && edad > 0.17 ? 0.45 * Math.exp(-(edad - 0.17) / 0.09) : 0;
  return (golpe + eco) * ((((k % compas) + compas) % compas) === 0 ? 1 : 0.62);
}

// Una curva por tramos: [[segundo, valor, tipo]] con tipo 's' (suave, por defecto) o 'r' (rápida: sale de golpe y frena,
// para lo que pasa justo en una palabra). Antes del primero y después del último, su valor.
function curva(s, p) {
  if (s <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    // (Por índice, sin desestructurar: se llama decenas de veces por cuadro y cada [a, b] = … creaba memoria.)
    const q = p[i], b = q[0], vb = q[1], tipo = q[2];
    if (s < b) { const a = p[i - 1][0], va = p[i - 1][1], x = (s - a) / (b - a), k = tipo === 'r' ? 1 - (1 - x) * (1 - x) * (1 - x) : x * x * (3 - 2 * x); return va + (vb - va) * k; }
  }
  return p[p.length - 1][1];
}

// Reposo del cuásar (su diseño de siempre): fuera de la escena y al terminarla todo vale esto.
export const REPOSO_CUASAR = Object.freeze({ tiempo: 1, pulso: 0, enc: 9000, tono: 0, olaR: 0, olaK: 0, nudosK: 0, alcance: 1.05, frente: 0, chorro: 1, disco: 1, giro: 1, gas: 1, caida: 1, fotones: 1, destello: 1, ondaK: 0, ondaFase: 0,
  otras: 0, calido: 0, conv: -1, cima: -1, estallido: -1, lobulo: 1, acento: -1, foco: 0 });

// Curvas del cuásar (con las marcas de ESCENA_CUASAR; si se escala la escena, se recalculan).
function curvasCuasar(m) {
  const g = [m.golpe1, m.golpe2, m.golpe3];
  return {
    // Largo de los chorros (fracción de su largo; ≥ 1,03: enteros). Se recogen al empezar y crecen en las frases clave.
    alcance: [[0, 1.05], [m.recogido, 0], [m.vi, 0], [m.vi + 0.45, 0.3, 'r'], [m.pedi, 0.3], [m.pedi + 0.3, 0.34, 'r'], [m.salir, 0.34], [m.salir + 0.6, 0.48, 'r'], [m.novios, 0.48], [m.novios + 0.6, 0.66, 'r'],
      [m.wow, 0.66], [m.wow + 0.5, 0.75, 'r'], [g[0], 0.75], [g[0] + 0.4, 0.8, 'r'], [g[1], 0.8], [g[1] + 0.4, 0.85, 'r'], [g[2], 0.85], [g[2] + 0.4, 0.9, 'r'],
      [m.cima, 0.9], [m.estalla, 1.05, 'r']],
    // El disco y la galaxia se apagan de fuera hacia dentro al empezar el recuerdo y en «la vi» se ENCIENDEN desde el centro,
    // anillo a anillo, hasta el borde de la galaxia (enc: radio encendido en unidades del cuásar; el disco llega a 1100 y la
    // galaxia a ~6200; ≥ 7000, entero).
    enc: [[0, 9000], [0.05, 6800], [m.recogido, 0], [m.vi, 0], [m.vi + 2.8, 7000], [m.fin - 0.5, 7000], [m.fin, 9000]],
    // Con «simplemente increíble» el disco se calienta: blanco azulado; se templa con las otras y vuelve con «pero ella».
    tono: [[0, 0], [m.simple, 0], [m.wow + 0.3, 1], [m.otras + 1.5, 0.55], [m.pero, 0.45], [m.disfrutar, 0]],
    disco: [[0, 1], [m.recogido, 0.5], [m.vi, 0.5], [m.vi + 0.3, 0.75, 'r'], [m.salir, 0.6], [m.salir + 0.5, 0.65], [m.excusa, 0.65], [m.pedir - 0.3, 0.85], [m.novios, 0.85], [m.novios + 0.4, 0.95, 'r'],
      [m.wow, 0.95], [m.wow + 0.4, 1.05, 'r'], [m.cima, 1.05], [m.cima + 0.4, 1.3, 'r'], [m.estalla + 0.4, 1.3], [m.fin, 1]],
    giro: [[0, 1], [m.recogido, 0.4], [m.vi, 0.4], [m.vi + 0.6, 0.7], [m.novios, 0.8], [m.simple, 1.1], [m.wow, 2.2], [m.wow + 1.2, 1.4], [m.pero, 1.2], [m.reir, 1.7], [m.disfrutar + 0.5, 1.3],
      [m.ideal, 1.4], [m.cima, 2.4], [m.cima + 0.4, 3, 'r'], [m.estalla + 0.3, 3], [m.fin, 1]],
    gas: [[0, 1], [m.pedir, 1], [m.otras, 0.9], [m.otras + 1.5, 1], [m.pero, 1], [m.pero + 0.8, 0.8], [m.ideal, 0.85], [m.cima, 0.7], [m.estalla + 0.3, 1.1, 'r'], [m.fin, 1]],
    caida: [[0, 1], [m.recogido, 0.3], [m.excusa, 0.3], [m.excusa + 0.8, 1.8], [m.pedir - 0.3, 1.8], [m.pedir + 0.5, 1], [m.ideal, 1], [m.cima, 1.8], [m.estalla + 0.5, 1.4], [m.fin, 1]],
    fotones: [[0, 1], [m.recogido, 0.4], [m.vi, 0.4], [m.vi + 0.35, 1, 'r'], [m.simple, 1], [m.wow, 1.6], [m.otras + 0.5, 1.1], [m.pero, 1.1], [m.ideal, 1.2], [m.cima, 1.5], [m.cima + 0.3, 1.9, 'r'],
      [m.estalla + 0.5, 1.6], [m.fin, 1]],
    destello: [[0, 1], [m.recogido, 0.35], [m.vi, 0.35], [m.vi + 0.25, 0.8, 'r'], [m.ideal, 0.8], [m.cima, 0.6], [m.cima + 0.3, 1.1, 'r'], [m.fin, 1]],
    // Las ondas del disco: la chispa de «la vi» y la risa (un tren de ondas rápido mientras dice «me hace reír»).
    ondaK: [[0, 0], [m.vi, 0], [m.vi + 0.12, 0.8, 'r'], [m.vi + 1.0, 0], [m.novios - 0.05, 0], [m.novios + 0.1, 0.7, 'r'], [m.novios + 1.0, 0], [m.reir - 0.05, 0], [m.reir + 0.1, 1.6, 'r'], [m.disfrutar, 1.6], [m.disfrutar + 0.6, 0]],
    otras: [[0, 0], [m.otras, 0], [m.otras + 1.4, 0.5], [m.bellas - 0.7, 0.7], [m.bellas, 0.7], [m.bellas + 1.3, 1], [m.pero, 1], [m.pero + 0.8, 0, 'r']],
    calido: [[0, 0], [m.disfrutar - 0.2, 0], [m.disfrutar + 1, 1], [m.estalla, 1], [m.fin, 0]],
    foco: [[0, 0], [m.recogido, 0.5], [m.estalla, 0.5], [m.fin, 0]]
  };
}
const curvasGuardadas = new WeakMap();

// Nudos de plasma: en cada golpe (la chispa, las sílabas fuertes de la voz y los golpes de la música de fondo, medidos en su
// pista separada) sale del núcleo un nudo de luz que recorre los dos chorros a toda velocidad hasta su punta (o hasta donde
// hayan llegado). Con las otras mujeres (14,5–21) no hay ninguno: no encienden los chorros. [segundo, fuerza].
export const NUDOS_CUASAR = [[3.18, 1], [3.9, 0.6], [4.9, 0.8], [7.76, 0.7], [9.3, 1], [13.32, 1], [21.85, 0.8], [23.13, 0.8], [24.43, 0.8], [25.52, 0.7], [27.28, 0.7],
  [28.24, 0.7], [28.64, 1.2], [28.95, 1], [29.4, 1.2]];
const VIAJE_NUDO = 0.75, VIDA_NUDO = 1.15;   // segundos hasta la punta y de vida
// Olas de luz por la galaxia anfitriona: un destello del núcleo que la recorre del centro al borde (radio en unidades del
// cuásar: el remolino llega a ~6200). [segundo, fuerza, velocidad]. La de «ideal», enorme y más lenta: recorre toda la galaxia.
const OLAS_CUASAR = [[3.18, 0.8, 5200], [9.3, 0.9, 5200], [13.32, 1, 5200], [28.64, 1.6, 3800]];

// Latidos de luz del núcleo (el destello, el anillo del horizonte y el disco), cada uno en una sílaba o un golpe: la chispa
// de «la vi»; el nervio de pedirle salir (cuatro titubeos pequeños: «y le pedí que…»); «novios»; «increíble»; los tres golpes
// de la música tras «pero ella»; la risa (cuatro, con las sílabas de «me hace reír»); «ideal» y la subida final de la música.
// [segundo relativo a la marca, marca, fuerza]. Cada uno sube de golpe y se apaga en ~0,2 s (nítido, no un resplandor).
const PULSOS_CUASAR = [[0, 'vi', 1.2], [0, 'pedi', 0.35], [0.1, 'pedi', 0.3], [0.4, 'pedi', 0.35], [0, 'salir', 0.55], [0, 'novios', 0.8], [0, 'wow', 0.8],
  [0, 'golpe1', 0.6], [0, 'golpe2', 0.6], [0, 'golpe3', 0.6], [0, 'reir', 0.5], [0.18, 'reir', 0.5], [0.46, 'reir', 0.6], [0.7, 'reir', 0.5], [0, 'cima', 1.3], [0, 'estalla', 0.8]];
function pulsosCuasar(s, m) {
  let v = 0;
  for (let i = 0; i < PULSOS_CUASAR.length; i++) { const q = PULSOS_CUASAR[i], d = q[0], marca = q[1], k = q[2], x = s - m[marca] - d; if (x >= 0 && x < 1.2) v += k * Math.exp(-x / 0.18) * Math.min(1, x * 40); }
  return v;
}

// Estado del cuásar en el segundo `s` (escribe en `e`, sin memoria nueva en cada cuadro). En s = 0 y en s ≥ fin coincide
// con su diseño de siempre (REPOSO_CUASAR). Campos (1 = como siempre):
//  alcance   largo de los chorros (0 recogidos – 1,05 enteros);  frente  luz del frente que avanza mientras crecen (0–1);
//  acento    dónde está ese frente a lo largo del chorro (0–1; −1 sin frente);  chorro  intensidad de los chorros;
//  disco     luz del disco;  giro  velocidad de giro del disco y de lo que cae;  gas  luz de la galaxia anfitriona;
//  caida     materia que cae al disco (luz y prisa);  fotones  anillo de luz del horizonte;  destello  luz del núcleo;
//  ondaK / ondaFase  ondas de luz que salen del centro del disco (fuerza y fase);  otras  lucecitas de la galaxia (0–1);
//  calido    rosa y oro (0–1);  conv  la luz de la galaxia que se recoge en el núcleo (0–1; −1 nada);
//  cima      segundos desde «ideal» (−1 antes): la onda de motas;  estallido  segundos desde que florecen los lóbulos (−1);
//  lobulo    luz de los lóbulos de las puntas (0 sin chorros enteros, 1 normal, más al florecer);  foco  penumbra del resto;
//  pulso     latidos de luz del núcleo en las sílabas y golpes (0 en reposo; ~0–1,3);
//  enc       radio encendido del disco y la galaxia (unidades del cuásar; ≥ 7000 entero);  tono  disco calentado, blanco azulado (0–1);
//  nudos / nudosLuz  hasta 4 nudos de plasma que recorren los chorros (posición 0–1, −1 sin nudo) y su luz; nudosK su suma;
//  olaR / olaK  la ola de luz que recorre la galaxia anfitriona (radio en unidades del cuásar y fuerza).
export function estadoCuasar(s, config, e = {}, reducido = false) {
  const m = config.marcas;
  let c = curvasGuardadas.get(config); if (!c) { c = curvasCuasar(m); curvasGuardadas.set(config, c); }
  if (!(s > 0) || s >= m.fin) { Object.assign(e, REPOSO_CUASAR); e.nudos ??= [-1, -1, -1, -1]; e.nudosLuz ??= [0, 0, 0, 0]; e.nudos.fill(-1); e.nudosLuz.fill(0); return e; }
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
  e.pulso = pulsosCuasar(s, m) * (reducido ? 0.35 : 1);
  e.enc = curva(s, c.enc); e.tono = curva(s, c.tono);
  // Hasta cuatro nudos vivos (los más recientes): posición a lo largo del chorro (fracción de su largo) y su luz.
  e.nudos ??= [-1, -1, -1, -1]; e.nudosLuz ??= [0, 0, 0, 0];
  let n = 0;
  for (let i = NUDOS_CUASAR.length - 1; i >= 0 && n < 4; i--) {
    const t0 = NUDOS_CUASAR[i][0], k = NUDOS_CUASAR[i][1], x = s - t0;
    if (x < 0 || x >= VIDA_NUDO) continue;
    e.nudos[n] = Math.min(x / VIAJE_NUDO, Math.max(0, e.alcance - 0.01)); e.nudosLuz[n] = k * Math.min(1, x * 25) * (1 - suave(x, VIAJE_NUDO, VIDA_NUDO)) * (reducido ? 0.5 : 1); n++;
  }
  for (; n < 4; n++) { e.nudos[n] = -1; e.nudosLuz[n] = 0; }
  e.nudosK = e.nudosLuz[0] + e.nudosLuz[1] + e.nudosLuz[2] + e.nudosLuz[3];
  // La ola de la galaxia más reciente.
  e.olaR = 0; e.olaK = 0;
  for (let i = OLAS_CUASAR.length - 1; i >= 0; i--) {
    const t0 = OLAS_CUASAR[i][0], k = OLAS_CUASAR[i][1], vel = OLAS_CUASAR[i][2], x = s - t0;
    if (x < 0) continue;
    const r = 300 + x * vel; if (r < 7000) { e.olaR = r; e.olaK = k * Math.min(1, x * 8) * (1 - suave(r, 4500, 7000)) * (reducido ? 0.4 : 1); }
    break;
  }
  e.otras = curva(s, c.otras); e.calido = curva(s, c.calido); e.foco = curva(s, c.foco);
  e.conv = s >= m.ideal - 0.3 && s < m.cima ? (s - m.ideal + 0.3) / (m.cima - m.ideal + 0.3) : -1;
  e.cima = s >= m.cima ? s - m.cima : -1;
  e.estallido = s >= m.estalla ? s - m.estalla : -1;
  const florece = e.estallido >= 0 ? Math.min(1, e.estallido * 1.2) * (1 - suave(e.estallido, 0.4, m.fin - m.estalla)) : 0;
  // Las nubes de las puntas: se apagan (suaves) al recogerse los chorros y vuelven cuando llegan enteros, floreciendo.
  e.lobulo = (s < m.recogido ? 1 - suave(s, 0, m.recogido) : suave(s, m.cima + 0.2, m.estalla + 0.2)) * (1 + 2.2 * florece);
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
