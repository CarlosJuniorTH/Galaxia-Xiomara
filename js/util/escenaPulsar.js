// El videoclip del púlsar («El corazón que late por ti») con «Neo Romeo» (Rusowsky): pulsar.m4a = 95,643–129,289 s de
// la canción (33,65 s). Solo números y curvas (sin three.js): las pruebas lo comprueban sin navegador.
//
// Lo que hace un púlsar es GIRAR y EMITIR: dos haces opuestos que salen de sus polos magnéticos (inclinados respecto al
// eje de giro) y barren el cielo como un faro; quien está en su camino lo ve latir. Esa es la historia: el púlsar está
// dormido (una estrella de neutrones tibia, sin haces, su toro de plasma casi apagado) y, con la canción, despierta por
// ella: se enciende su toro, nacen los haces, late en cada golpe, acelera con la música, en el estribillo su faro enciende
// todo lo que barre y al final queda latiendo sereno.
//
// La canción (análisis de audio: 107,7 BPM, un pulso cada 0,557 s y un compás cada 2,23 s desde el 0; estrofa y
// pre-estribillo con batería ligera —bombo medido en la instrumental separada— y, desde el 16,79, el estribillo con la
// batería callada y golpes de 808 sincopados: GOLPES_PULSAR). La letra, resumida con nuestras palabras:
//   1,38  «quererte…»        quererla hasta bailar       → se enciende el toro de plasma, del anillo interior afuera
//   2,19  (primer bombo)                                 → nacen los dos haces: el faro
//   4,86  «…caliente»        todo su corazón, caliente   → la estrella se calienta, late en cada bombo y acelera (×2)
//   8,91  pre-estribillo      «…sirve»                    → ondas finas salen del ecuador en cada golpe
//  10,20  «…fallado»         nunca le ha fallado         → el haz pasa por la cámara en cada compás: nunca falla
//  12,48  «…quererte»        siempre sirve para quererla → los haces se avivan
//  14,98  «de tu amor…»      su amor (gancho)            → el faro empieza a encender el polvo que barre
//  16,79  (808)                                          → el giro se dobla; cada golpe de 808 hace latir la estrella y el toro
//  17,83  estribillo          «…amor / no sé…»            → el faro enciende todo lo que barre, a compás
//  24,51  instrumental        golpes de grave             → plano abierto: el barrido entero
//  28,03  segunda vuelta      «…amor»                     → luz rosa y dorada
//  31,75  se apaga la música                              → queda su diseño final: despierto, latiendo sereno
//
// GIRO: siempre gira (nunca se para) y solo cambia con la música, en tramos de un compás: `giros` son [pulso, vueltas por
// pulso]; entre dos puntos la velocidad cambia en línea recta. Dormido da 1/8 de vuelta por pulso; con «caliente», 1/4
// (una vuelta por compás: el haz vuelve a la cámara en cada compás); con el grave, 1/2 (cada dos pulsos). Como todo está
// en pulsos de la canción, los haces cruzan los mismos puntos en los mismos golpes en cada visita (la pista de cámara
// los usa: planos en los que el haz atraviesa la cámara justo en el golpe).

const P = 60 / 107.7;
export const ESCENA_PULSAR = {
  id: 'pulsar', duracion: 33.6, pulso: P, compas: 4, desfase: 0, persiste: true,
  // Inclinación del eje magnético (los haces) respecto al de giro, en grados: los haces barren dos conos a ±(90 − 60)°
  // de elevación sobre el ecuador del giro.
  inclinacion: 60,
  giros: [[0, 0.125], [8, 0.125], [12, 0.25], [28, 0.25], [30, 0.5]],
  marcas: { inicio: 0, quererte: 1.38, caliente: 4.86, previa: 8.91, fallado: 10.2, siempre: 12.48, amor: 14.98, grave: 16.71, estribillo: 17.83, se: 22.28, instrumental: 24.51, segunda: 28.03, fundido: 31.75, fin: 33.6 },
  // Pista de cámara (formato común, js/util/directorCamara.js): pos [azimut°, elevación°, distancia en radios de
  // encuadre]; azimut 0 hacia casa, creciendo a la derecha; elevación sobre el plano horizontal del universo, que es el
  // ecuador del giro (el eje de giro es el Y del universo: js/escena/pulsar.js). El haz de arriba está en el azimut
  // 360°·vueltas (azimutHaz). Los planos «en el haz» están a +30° de elevación (o −30° y 180° más para
  // el haz de abajo) y el haz los atraviesa en el golpe: 270° en los compases del pre-estribillo, 180° cada dos pulsos
  // del estribillo (el primero, justo en el grave del 16,71).
  // Cámara LENTA y suave (Carlos): sin cortes ni giros bruscos; un solo arco que rodea al púlsar hacia la izquierda (~9°/s)
  // mientras se acerca, y que pasa por el camino del haz justo en los golpes (270° en el pre-estribillo, 180° en el grave).
  // Planos a ~0,39 radios: en el móvil vertical el toro ocupa ~90 % del ancho, entero y centrado.
  camara: [
    { t: 0, pos: [0, 8, 1.0], mira: [0, 0, 0], fov: 50, curva: 'suave' },             // llegada: dormido, sin haces
    { t: 4.86, pos: [-35, 18, 0.62], mira: [0, 0, 0], fov: 50, curva: 'suave' },      // «quererte»: nacen los haces; se acerca
    { t: 8.6, pos: [-75, 27, 0.44], mira: [0, 0, 0], fov: 48, curva: 'suave' },       // «caliente»: late y acelera
    { t: 12.4, pos: [-95, 30, 0.39], mira: [0, 0, 0], fov: 48, curva: 'lineal' },     // en el camino del haz (11,14): «nunca falla»
    { t: 14.5, pos: [-137, 30, 0.39], mira: [0, 0, 0], fov: 48, curva: 'lineal' },    // «de tu amor»: sigue el arco, sin prisa
    { t: 16.7, pos: [-180, 30, 0.39], mira: [0, 0, 0], fov: 48, curva: 'lineal' },    // el haz la atraviesa en el grave
    { t: 22.3, pos: [-212, 28, 0.38], mira: [0, 0, 0], fov: 48, curva: 'lineal' },    // estribillo: el faro barre una y otra vez
    { t: 27.9, pos: [-245, 18, 0.6], mira: [0, 0, 0], fov: 52, curva: 'suave' },     // instrumental: se abre despacio
    { t: 31.2, pos: [-268, 24, 0.42], mira: [0, 0, 0], fov: 50, curva: 'suave' },     // segunda vuelta: vuelve a acercarse
    { t: 33.6, pos: [-285, 14, 0.62], mira: [0, 0, 0], fov: 52, curva: 'suave' }      // queda despierto: encuadre final
  ]
};

// Latido de corazón en cada pulso («pum-pum»: el golpe y otro menor 0,17 s después), el primero del compás más fuerte. Igual
// que latidoPulso de escenasGigantes.js (copiado: ese módulo reexporta este y no deben importarse en círculo).
function latido(s, { pulso, compas = 4, desfase = 0 }, e, reducido) {
  const b = (s - desfase) / pulso, k = Math.floor(b), edad = (b - k) * pulso;
  e.edad = edad;
  const golpe = Math.exp(-edad / (reducido ? 0.3 : 0.13)), eco = !reducido && edad > 0.17 ? 0.45 * Math.exp(-(edad - 0.17) / 0.09) : 0;
  return (golpe + eco) * ((((k % compas) + compas) % compas) === 0 ? 1 : 0.62);
}

const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;
const suave = (s, a, b) => { const x = sat((s - a) / Math.max(1e-6, b - a)); return x * x * (3 - 2 * x); };

// Vueltas por pulso en el pulso (fraccionario) b.
export function ritmoGiro(b, { giros }) {
  if (b <= giros[0][0]) return giros[0][1];
  for (let i = 1; i < giros.length; i++) { const [b1, r1] = giros[i]; if (b <= b1) { const [b0, r0] = giros[i - 1]; return r0 + (r1 - r0) * (b - b0) / (b1 - b0); } }
  return giros.at(-1)[1];
}
// Vueltas dadas desde el segundo 0 hasta el segundo s (exacto: trapecios de los tramos rectos; antes del 0, al ritmo del
// primero; después del último punto, al del último).
export function vueltasPulsar(s, config) {
  const { giros, pulso, desfase = 0 } = config, b = (s - desfase) / pulso;
  if (b <= giros[0][0]) return (b - giros[0][0]) * giros[0][1] + vueltasEn(giros[0][0], giros);
  return vueltasEn(b, giros);
}
function vueltasEn(b, giros) {
  let v = 0;
  for (let i = 1; i < giros.length; i++) {
    const [b0, r0] = giros[i - 1], [b1, r1] = giros[i];
    if (b <= b0) return v;
    const h = Math.min(b, b1) - b0, r = r0 + (r1 - r0) * h / (b1 - b0);
    v += h * (r0 + r) / 2;
    if (b <= b1) return v;
  }
  return v + (b - giros.at(-1)[0]) * giros.at(-1)[1];
}
// Azimut (grados, 0–360) del haz de arriba en el marco del púlsar en el segundo s; el de abajo, 180° más.
export const azimutHaz = (s, config) => ((vueltasPulsar(s, config) % 1) + 1) % 1 * 360;
// Elevación (grados) del cono que barre el haz de arriba.
export const elevacionHaz = config => 90 - config.inclinacion;

// GOLPES de la canción medidos sobre el audio (segundos del fragmento, fuerza 0–1): el bombo de la estrofa y del
// pre-estribillo (sobre la instrumental separada con MelBand-RoFormer) y, desde el 16,79, los golpes de 808 del estribillo
// (sobre la mezcla, banda 25–90 Hz; la batería calla y queda el grave sincopado). Con ellos late la estrella, destella el toro
// de plasma y salen las ondas del ecuador: el corazón late con la canción de verdad, no con un metrónomo.
export const GOLPES_PULSAR = Object.freeze([
  ...[2.19, 2.51, 2.76, 3.34, 4.14, 4.99, 5.57, 6.42, 7.23, 7.81, 8.63, 8.95, 9.51, 10.04, 10.87, 11.19, 11.74, 12.28, 13.11, 13.41, 14.0, 14.55, 15.38, 15.67, 16.25].map(t => [t, 0.55]),
  [16.79, 0.8], [17.57, 0.65], [17.86, 0.5], [18.43, 1], [19.01, 0.8], [19.85, 0.45], [20.17, 0.65], [20.69, 0.87], [21.27, 0.86], [22.06, 0.93], [22.93, 0.6],
  [23.5, 0.76], [24.33, 0.78], [25.16, 0.81], [25.74, 0.5], [26.55, 0.77], [26.88, 0.67], [27.43, 0.7], [28.79, 0.75], [29.13, 0.76], [29.66, 0.79], [30.21, 0.55],
  [31.03, 0.55], [31.34, 0.58], [31.92, 0.57], [32.47, 0.4]
]);
// Último golpe en el segundo s: escribe en e golpeEdad (s desde él; 99 si no hay), golpeFuerza y golpeN (cuántos van).
function ultimoGolpe(s, golpes, e) {
  let lo = 0, hi = golpes.length;   // búsqueda binaria: el primer golpe posterior a s
  while (lo < hi) { const m = (lo + hi) >> 1; if (golpes[m][0] <= s) lo = m + 1; else hi = m; }
  e.golpeN = lo;
  if (lo === 0) { e.golpeEdad = 99; e.golpeFuerza = 0; } else { e.golpeEdad = s - golpes[lo - 1][0]; e.golpeFuerza = golpes[lo - 1][1]; }
}

// Estado del púlsar en el segundo `s` de su canción (escribe en `e`, sin memoria nueva). En s = 0 es el púlsar dormido (su
// estado de siempre fuera de la escena); en s ≥ fin, su diseño final (se queda así mientras se mira: persiste).
//  ritmo      vueltas por pulso (el giro);  vueltas  vueltas desde el 0 (la fase la lleva cosmos con esto)
//  largo      hasta dónde han nacido los haces (0–1);  luzHaz  su luz (0 dormido, ~1 estribillo)
//  casquetes  los polos magnéticos encendidos (0–1);  calor  la luz de la estrella (0,45 dormida → 1)
//  fuerza     cuánto late (0–1,1);  pulso  el latido en este instante (golpe de la canción × fuerza);  edad  s desde el
//             último pulso (paquetes de luz por los haces);  golpeEdad / golpeFuerza / golpeN: el último golpe (GOLPES_PULSAR)
//  toro       hasta dónde se ha encendido el toro de plasma, de dentro afuera (0 → 1,15);  luzToro  su luz (0,3 dormido → 1)
//  ondas      luz de las ondas que salen del ecuador en los golpes (0–1)
//  barrido    luz del barrido del faro en el polvo que atraviesa (0–1);  tibio  rosa y oro de la segunda vuelta (0–1)
//  foco       penumbra del resto del cielo (0–0,85: la telaraña; también apaga el polvo del fondo, cosmos.js)
export function estadoPulsar(s, config, e = {}, reducido = false) {
  const m = config.marcas, P = config.pulso, f = Math.min(Math.max(s, 0), m.fin);
  e.ritmo = ritmoGiro(f / P, config); e.vueltas = vueltasPulsar(s, config);
  // Los haces nacen con el primer bombo (2,19), justo después de la primera palabra.
  e.largo = suave(f, 2.1, 3.6);
  e.casquetes = suave(f, 1.9, 2.6);   // los polos calientes, con los haces (antes la fase se ajusta sin verse)
  e.luzHaz = 0.45 * e.largo + 0.2 * suave(f, m.previa - 0.4, m.siempre) + 0.15 * suave(f, m.siempre, m.amor) + 0.25 * suave(f, m.grave - 0.15, m.grave + 0.15) + 0.1 * suave(f, m.segunda - 0.2, m.segunda + 0.6) - 0.1 * suave(f, m.fundido, m.fin);
  e.calor = 0.45 + 0.35 * suave(f, m.caliente - 0.3, m.caliente + 1.6) + 0.2 * suave(f, m.grave - 0.15, m.grave + 0.3);
  // Late desde «caliente»; más con el pre-estribillo y del todo con el grave; al final, sereno.
  e.fuerza = 0.4 * suave(f, m.caliente - 0.2, m.caliente + 0.8) + 0.2 * suave(f, m.previa - 0.3, m.previa + 0.6) + 0.4 * suave(f, m.grave - 0.15, m.grave + 0.15)
    + 0.1 * suave(f, m.segunda - 0.3, m.segunda + 0.6) - 0.55 * suave(f, m.fundido, m.fin);
  latido(f, config, e, reducido);   // e.edad: s desde el último pulso de la rejilla (paquetes de luz por los haces)
  ultimoGolpe(f, config.golpes || GOLPES_PULSAR, e);
  const g = e.golpeEdad, golpe = (Math.exp(-g / (reducido ? 0.3 : 0.12)) + (!reducido && g > 0.16 ? 0.4 * Math.exp(-(g - 0.16) / 0.09) : 0)) * e.golpeFuerza;
  e.pulso = golpe * e.fuerza * (reducido ? 0.4 : 1);
  // El toro de plasma se enciende con la voz («quererte»), del anillo interior hacia fuera, y crece con la canción.
  e.toro = 1.15 * suave(f, m.quererte - 0.2, m.caliente + 1);
  e.luzToro = 0.3 + 0.3 * suave(f, m.quererte, m.caliente) + 0.2 * suave(f, m.previa - 0.3, m.previa + 1) + 0.2 * suave(f, m.grave - 0.15, m.grave + 0.3) - 0.15 * suave(f, m.fundido, m.fin);
  e.ondas = (0.55 * suave(f, m.previa - 0.3, m.previa + 0.6) + 0.45 * suave(f, m.grave - 0.15, m.grave + 0.15) - 0.5 * suave(f, m.fundido, m.fin)) * (reducido ? 0.4 : 1);
  // El faro empieza a encender lo que barre con «de tu amor» y del todo con el grave.
  e.barrido = 0.4 * suave(f, m.amor - 0.3, m.amor + 1.2) + 0.6 * suave(f, m.grave - 0.15, m.grave + 0.4) - 0.3 * suave(f, m.fundido, m.fin);
  e.tibio = suave(f, m.segunda - 0.4, m.segunda + 1.2) * (1 - 0.5 * suave(f, m.fundido, m.fin));
  e.foco = 0.85;   // la telaraña, apagada desde el primer cuadro del clip y mientras se le mira
  return e;
}
