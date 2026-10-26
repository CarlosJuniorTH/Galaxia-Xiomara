// El videoclip del púlsar («El corazón que late por ti») con «Neo Romeo» (Rusowsky): pulsar.m4a = 95,643–129,289 s de
// la canción (33,65 s). Solo números y curvas (sin three.js): las pruebas lo comprueban sin navegador.
//
// Lo que hace un púlsar es GIRAR y EMITIR: dos haces opuestos que salen de sus polos magnéticos (inclinados respecto al
// eje de giro) y barren el cielo como un faro; quien está en su camino lo ve latir. Esa es la historia: el púlsar está
// dormido (una estrella de neutrones tibia, sin haces) y, con la canción, despierta por ella: se le encienden los haces,
// late, acelera con la música y al final queda latiendo a su ritmo, con la nebulosa iluminada por su faro.
//
// La canción (análisis de audio: 107,7 BPM, un pulso cada 0,557 s y un compás cada 2,23 s desde el 0; el grave entra en
// el 16,71 y el estribillo pleno en el compás del 17,83). La letra, resumida con nuestras palabras:
//   1,38  «quererte…»        quererla hasta bailar       → se encienden los haces (el faro nace)
//   4,86  «…caliente»        todo su corazón, caliente   → la estrella se calienta, empieza a latir y acelera (×2)
//   8,06  «…sirve»           (pre-estribillo, 8,91)      → nace el viento del púlsar: anillos y ondas en cada compás
//  10,20  «…fallado»         nunca le ha fallado         → el haz pasa por la cámara en cada compás: nunca falla
//  12,48  «…quererte»        siempre sirve para quererla → los haces se avivan
//  14,98  «de tu amor…»      su amor (gancho)            → el faro empieza a iluminar los filamentos de la nebulosa
//  16,71  (entra el grave)                               → el giro se dobla: un haz por la cámara cada dos pulsos
//  17,83  estribillo          «…amor / no sé…»            → la nebulosa se enciende del centro hacia fuera y late
//  24,51  instrumental        golpes de grave             → la nebulosa entera, iluminada por los haces
//  28,03  segunda vuelta      «…amor»                     → luz rosa y dorada
//  31,75  se apaga la música                              → queda su diseño final: despierto, latiendo a su ritmo
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
  camara: [
    { t: 0, pos: [0, 8, 1.0], mira: [0, 0, 0], fov: 50, curva: 'suave' },                 // llegada (fundido desde donde esté): dormido
    { t: 1.38, pos: [-6, 9, 0.93], mira: [0, 0, 0], fov: 50, curva: 'lineal' },           // «quererte»: nacen los haces
    { t: 4.3, pos: [-25, 14, 0.6], mira: [0, 0, 0], fov: 46, curva: 'suave' },            // se acerca mientras crecen
    { t: 6.7, pos: [-40, 16, 0.33], mira: [0, 0, 0], fov: 36, curva: 'suave' },           // «caliente»: el corazón, de cerca
    { t: 8.6, pos: [-52, 19, 0.32], mira: [0, 0, 0], fov: 36, curva: 'lineal' },          // acelera y late, muy cerca
    { t: 10.5, pos: [-90, 30, 0.44], mira: [0, 0, 0], fov: 44, curva: 'suave' },          // al camino del haz (compás 11,14)
    { t: 12.4, pos: [-92, 31, 0.4], mira: [0, 0, 0], fov: 44, curva: 'lineal' },          // «nunca ha fallado»: lo atraviesa
    { t: 14.9, pos: [-125, 68, 0.56], mira: [0, 0, 0], fov: 46, curva: 'suave' },         // «siempre»: desde arriba, el faro
    { t: 16.6, pos: [-160, 40, 0.7], mira: [0, 0, 0], fov: 52, curva: 'suave' },          // «de tu amor»: tensión, se aleja
    { t: 16.71, pos: [180, 30, 0.36], mira: [0, 0, 0], fov: 44, curva: 'corte' },         // GRAVE: el haz por la cámara
    { t: 19.9, pos: [174, 32, 0.33], mira: [0, 0, 0], fov: 42, curva: 'lineal', giro: 6 },
    { t: 20.9, pos: [0, -30, 0.38], mira: [0, 0, 0], fov: 44, curva: 'rapida' },          // al haz de abajo (21,17 · 22,28)
    { t: 22.2, pos: [6, -28, 0.37], mira: [0, 0, 0], fov: 42, curva: 'lineal', giro: -4 },
    { t: 23.6, pos: [40, 12, 1.05], mira: [0, 0, 0], fov: 52, curva: 'rapida' },          // «no sé»: la nebulosa entera
    { t: 27.9, pos: [110, 18, 0.95], mira: [0, 0, 0], fov: 50, curva: 'lineal' },         // instrumental: travelling
    { t: 28.9, pos: [170, 28, 0.42], mira: [0, 0, 0], fov: 40, curva: 'rapida' },          // segunda vuelta: al haz (28,97)
    { t: 30.9, pos: [184, 30, 0.38], mira: [0, 0, 0], fov: 40, curva: 'lineal' },
    { t: 33.6, pos: [215, 14, 0.85], mira: [0, 0, 0], fov: 50, curva: 'suave' }           // queda despierto: encuadre final
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

// Estado del púlsar en el segundo `s` de su canción (escribe en `e`, sin memoria nueva). En s = 0 es el púlsar dormido (su
// estado de siempre fuera de la escena); en s ≥ fin, su diseño final (se queda así mientras se mira: persiste).
//  ritmo      vueltas por pulso (el giro);  vueltas  vueltas desde el 0 (la fase la lleva cosmos con esto)
//  largo      hasta dónde han nacido los haces (0–1);  luzHaz  su luz (0 dormido, ~1 estribillo)
//  casquetes  los polos magnéticos encendidos (0–1);  calor  la luz de la estrella (0,45 dormida → 1)
//  fuerza     cuánto late (0–1,1);  pulso  el latido en este instante (ya por su fuerza);  edad  s desde el último pulso
//  viento     los anillos del viento del púlsar formados (0–1);  ondas  luz de las ondas que salen del ecuador (0–1);
//             ondaEdad / ondaPeriodo: segundos desde la última onda y cada cuánto sale una (un compás; un pulso con el grave)
//  barrido    cuánto iluminan los haces los filamentos que barren (0–1);  frente  luz de la nebulosa del centro hacia fuera
//             (0 → 1,15);  brillo  luz de la nebulosa encendida (0–1);  tibio  rosa y oro de la segunda vuelta (0–1)
//  foco       penumbra del resto del cielo (0–0,6)
export function estadoPulsar(s, config, e = {}, reducido = false) {
  const m = config.marcas, P = config.pulso, f = Math.min(Math.max(s, 0), m.fin);
  e.ritmo = ritmoGiro(f / P, config); e.vueltas = vueltasPulsar(s, config);
  e.largo = suave(f, m.quererte - 0.1, m.quererte + 1.8);
  e.casquetes = suave(f, m.quererte - 0.3, m.quererte + 0.6);
  e.luzHaz = 0.45 * e.largo + 0.2 * suave(f, m.previa - 0.4, m.siempre) + 0.15 * suave(f, m.siempre, m.amor) + 0.25 * suave(f, m.grave - 0.15, m.grave + 0.15) + 0.1 * suave(f, m.segunda - 0.2, m.segunda + 0.6) - 0.1 * suave(f, m.fundido, m.fin);
  e.calor = 0.45 + 0.35 * suave(f, m.caliente - 0.3, m.caliente + 1.6) + 0.2 * suave(f, m.grave - 0.15, m.grave + 0.3);
  // Late desde «caliente»; más con el pre-estribillo y del todo con el grave; al final, un latido tranquilo que se queda.
  e.fuerza = 0.4 * suave(f, m.caliente - 0.2, m.caliente + 0.8) + 0.2 * suave(f, m.previa - 0.3, m.previa + 0.6) + 0.4 * suave(f, m.grave - 0.15, m.grave + 0.15)
    + 0.1 * suave(f, m.segunda - 0.3, m.segunda + 0.6) - 0.55 * suave(f, m.fundido, m.fin);
  e.pulso = latido(f, config, e, reducido) * e.fuerza * (reducido ? 0.4 : 1);
  e.viento = suave(f, m.previa - 0.2, m.previa + 2.2);
  e.ondas = (0.6 * suave(f, m.previa, m.previa + 1) + 0.4 * suave(f, m.grave - 0.15, m.grave + 0.15) - 0.45 * suave(f, m.fundido, m.fin)) * (reducido ? 0.4 : 1);
  // Una onda por compás en el pre-estribillo; con el grave, una por pulso (desde los golpes de la canción).
  e.ondaPeriodo = f >= m.grave ? P : 4 * P;
  e.ondaEdad = (((f - config.desfase) % e.ondaPeriodo) + e.ondaPeriodo) % e.ondaPeriodo;
  e.barrido = 0.45 * suave(f, m.amor - 0.3, m.amor + 1.2) + 0.55 * suave(f, m.grave - 0.15, m.grave + 0.4);
  e.frente = 1.15 * suave(f, m.grave, m.grave + (reducido ? 4 : 2.8));
  e.brillo = suave(f, m.grave - 0.2, m.grave + 0.8) * (1 - 0.3 * suave(f, m.fundido, m.fin));
  e.tibio = suave(f, m.segunda - 0.4, m.segunda + 1.2) * (1 - 0.5 * suave(f, m.fundido, m.fin));
  e.foco = 0.6 * suave(f, 0, m.quererte) - 0.25 * suave(f, m.fundido, m.fin);
  return e;
}
