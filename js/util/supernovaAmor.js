// Geometría y tiempo compartidos por la escena y sus pruebas. Sin reloj de pared:
// la revelación espera al universo, también tras leer o cambiar de aplicación.
//
// La ceremonia dura lo que su canción («Sparks», Coldplay: supernova.m4a, 62,34 s, desde el segundo 114,962 del original) y
// empieza con ella. Todo va en segundos DEL FRAGMENTO, medidos al milisegundo sobre la voz y la instrumental separadas con
// BS-RoFormer (audios-originales/.separado/42c028880bed/bsrof1297): golpes de caja y bombo en la percusión (HPSS + flujo
// espectral), cambios de acorde de la guitarra (croma de la parte armónica), sílabas (arranques de la voz) y notas
// (pyin: las notas largas y las subidas de la melodía).
//  · Compás de 6/8 lento (≈2,604 s; corchea ≈0,434 s): la caja cae en la segunda mitad (CAJAS) y el tiempo fuerte al
//    principio (FUERTES). Es el «latido» de la canción.
//  · La letra, por su sentido (no se cita): 1,92 él le entrega su corazón · 7,13 ella es a quien se agarra · 14,74 eso es
//    lo que hace siempre · 17,5–22,3 la música respira, sin voz · 22,34 reconoce que se equivocó (y sostiene una nota de
//    3 s, 25,0–28,0) · 28,02 le promete no fallarle; lo repite (31,25) con la melodía bajando hasta lo más grave (la
//    última nota, 37,18–37,96) · 37,96–41,66 la voz calla (los graves se hunden en 41,25–41,6) · 41,665 entra el grito,
//    salta a lo más alto a los 42,46 y lo sostiene hasta 47,07; baja y se apaga hacia 49,8 · 52,06 la promesa vuelve y a
//    los 52,9 sube a la nota más alta del fragmento (hasta 56,8) · 58,26–61,7 la afirmación final, sostenida.
export const CAJAS_SUPERNOVA = Object.freeze([2.116, 4.734, 7.34, 9.932, 12.542, 15.157, 17.731, 20.346, 23.02, 25.6, 28.204, 30.81, 33.44, 36.023, 38.606, 41.213, 43.825, 46.216, 48.974, 51.598, 54.213, 56.799, 59.4, 62.006]);
export const FUERTES_SUPERNOVA = Object.freeze([0.821, 3.439, 6.04, 8.647, 11.256, 13.871, 16.419, 19.052, 21.687, 24.323, 26.95, 29.55, 32.128, 34.746, 37.312, 39.933, 42.498, 45.111, 47.54, 50.297, 52.898, 55.49, 58.067, 60.703]);
export const COMPAS_SUPERNOVA = Object.freeze({ corchea: 0.434, compas: 2.604, caja: CAJAS_SUPERNOVA[0], fuerte: FUERTES_SUPERNOVA[0] });
// Notas largas de la voz [inicio, duración, altura MIDI]: la luz y el movimiento las acompañan (crecen mientras se sostienen).
export const NOTAS_SUPERNOVA = Object.freeze([[2.57, 0.62, 60], [3.67, 0.6, 53], [4.95, 0.65, 53], [8.66, 1.03, 53], [10.08, 0.84, 49], [11.27, 0.79, 46],
  [16.51, 1.09, 53], [17.67, 0.77, 53], [23.3, 0.66, 60], [25.01, 3.01, 56], [30.35, 1.5, 56], [33.48, 0.64, 53], [37.18, 0.78, 44],
  [42.46, 4.61, 65], [47.75, 2.05, 61], [52.95, 3.84, 68], [58.26, 3.46, 65]].map(n => Object.freeze(n)));
export const LETRA_SUPERNOVA = Object.freeze({ entrega: 1.916, abrazo: 7.134, siempre: 14.736, respiro: 17.53, error: 22.335, promesa: 28.021, repite: 31.25,
  grave: 34.746, calla: 37.96, dos: 38.606, uno: 41.213, estallido: 41.665, grito: 42.46, baja: 47.07, alto: 52.9, final: 58.26, fin: 62.338 });
// espera: del principio al estallido (el grito); silencio: los graves se hunden y solo queda un punto; formar: el grito
// baja y la materia empieza a volver; formado: la subida a la nota más alta (el corazón entero); revelar: la afirmación
// final (recuerdo); reposo: el final del fragmento. formar, formado, revelar y reposo, desde el estallido.
const L = LETRA_SUPERNOVA;
const r3 = x => Math.round(x * 1000) / 1000;
export const TIEMPOS_AMOR = Object.freeze({ espera: L.estallido, silencio: r3(L.estallido - L.uno), formar: r3(L.baja - L.estallido),
  formado: r3(L.alto - L.estallido), revelar: r3(L.final - L.estallido), reposo: r3(L.fin - L.estallido) });

// La animación se diseñó con otro reloj (14 s de espera; formar 4, formado 16, revelar 19, reposo 25) y se conserva: estos
// tramos la llevan a la canción. Antes del estallido (lo que falta, real → animación):
//   0–22,34  latidos tranquilos (14 → 12,6): la agitación casi no sube mientras él declara y promete;
//   22,34–28,02 se equivoca: la estrella se vuelve inestable (12,6 → 10,6);
//   28,02–31,25 promete no fallarle: al máximo, hinchada (10,6 → 9,5);
//   31,25–37,96 lo repite y la melodía baja a lo más grave: el núcleo colapsa a golpes (uno por tiempo de la canción) y la
//            envoltura suelta capas de motas a compás; se apaga justo cuando calla la voz (9,5 → 4,8; ver colapsoCancion);
//   37,96–38,606 oscuridad, hasta el golpe de caja (4,8 → 3,8);
//   38,606–41,213 dos estrellitas giran y se acercan en espiral durante un compás entero, de caja a caja (3,8 → 0,5);
//   41,213–41,665 silencio: ya son una sola mota, quieta y pequeña (0,5 → 0); y el grito: ¡pum!
const fa = s => r3(L.estallido - s);
const ANTES = [[0, 0], [fa(L.uno), 0.5], [fa(L.dos), 3.8], [fa(L.calla), 4.8], [fa(L.grave), 7.5], [fa(L.repite), 9.5], [fa(L.promesa), 10.6], [fa(L.error), 12.6], [L.estallido, 14]];
// Después del estallido: la bola de fuego crece mientras se sostiene el grito (→ 4), las chispas forman el corazón mientras
// la voz baja y respira (4 → 16), la revelación con la subida a la nota más alta y el recuerdo con la afirmación final.
const DESPUES = [[0, 0], [TIEMPOS_AMOR.formar, 4], [TIEMPOS_AMOR.formado, 16], [TIEMPOS_AMOR.revelar, 19], [TIEMPOS_AMOR.reposo, 25]];
function tramos(x, nudos) {
  if (x <= nudos[0][0]) return nudos[0][1] + (x - nudos[0][0]);
  for (let i = 1; i < nudos.length; i++) if (x <= nudos[i][0]) { const [a0, b0] = nudos[i - 1], [a1, b1] = nudos[i]; return b0 + (x - a0) * (b1 - b0) / (a1 - a0); }
  const [a, b] = nudos[nudos.length - 1]; return b + (x - a);
}
// Las chispas no se juntan a velocidad constante: avanzan a golpes, uno por cada tiempo de la canción (el fuerte de 47,54, la
// caja de 48,974, el fuerte de 50,297, la caja de 51,598), deprisa al principio de cada uno y frenando hasta el siguiente.
const PASOS_FORMACION = [L.baja, 47.54, 48.974, 50.297, 51.598, L.alto].map(s => r3(s - L.estallido));
function aGolpes(e) {
  const p = PASOS_FORMACION;
  if (e <= p[0] || e >= p[p.length - 1]) return e;
  let i = 1; while (e > p[i]) i++;
  const a = p[i - 1], b = p[i], f = (e - a) / (b - a);
  return a + (b - a) * (0.85 * (1 - (1 - f) ** 3) + 0.15 * f);   // (siempre crece: nunca se para ni vuelve atrás)
}
// Segundos que faltan para el estallido (reales) → los de la animación; y al revés.
export const faltaAnimacion = falta => tramos(falta, ANTES);
export const faltaReal = faltaAnim => tramos(faltaAnim, ANTES.map(([a, b]) => [b, a]));
// Segundos desde el estallido (reales) → los de la animación (los sombreadores de la explosión y del corazón).
export const desdeAnimacion = e => tramos(aGolpes(e), DESPUES);

// El último golpe de una lista que ya ha pasado (o -1): búsqueda binaria, sin memoria nueva (se llama en cada cuadro).
function ultimoAntes(lista, s) { let a = 0, b = lista.length - 1, r = -1; while (a <= b) { const m = (a + b) >> 1; if (lista[m] <= s) { r = m; a = m + 1; } else b = m - 1; } return r; }
const g07 = x => Math.exp(-((x / 0.07) ** 2));
// Latido de la estrella con la canción (s: segundo del fragmento): «pum-pum» con cada golpe de caja medido y su corchea
// siguiente; desde que él reconoce su error, también en cada tiempo fuerte (el doble de seguido). ~1 en el golpe.
export function latidoCancion(s) {
  if (!Number.isFinite(s)) return 0;
  let v = 0;
  const latir = lista => { const i = ultimoAntes(lista, s + 0.25); for (let k = Math.max(0, i - 1); k <= i; k++) { const d = s - lista[k]; v = Math.max(v, g07(d) + 0.6 * g07(d - COMPAS_SUPERNOVA.corchea)); } };
  latir(CAJAS_SUPERNOVA);
  if (s >= L.error - 0.6) latir(FUERTES_SUPERNOVA);
  return v;
}
// La melodía: 0 sin nota larga; mientras se sostiene una, crece (antes deprisa, luego despacio) y es mayor cuanto más
// aguda; se suelta en medio segundo al acabar. Mueve la luz de la estrella y la de las chispas y los hilos del corazón.
export function cantoCancion(s) {
  if (!Number.isFinite(s)) return 0;
  let v = 0;
  for (const [t0, dur, nota] of NOTAS_SUPERNOVA) {
    if (s < t0 - 0.05 || s > t0 + dur + 0.6) continue;
    const dentro = Math.min(1, Math.max(0, (s - t0) / Math.max(0.3, dur))), sube = 1 - (1 - dentro) ** 2;
    const suelta = s > t0 + dur ? Math.max(0, 1 - (s - t0 - dur) / 0.6) : 1, altura = Math.min(1, Math.max(0.25, (nota - 42) / 26));
    v = Math.max(v, sube * suelta * altura * Math.min(1, dur / 1.5 + 0.35));
  }
  return v;
}
// El colapso (31,25–37,96): en cada tiempo de la canción el núcleo da un tirón hacia dentro (rápido al principio del
// tiempo, quieto hasta el siguiente) y la envoltura suelta una capa de motas que se aleja. contraccion: 0 antes, 1 tras el
// último tirón; apagado: la estrella se apaga en el medio segundo antes de que calle la voz.
export const GOLPES_COLAPSO = Object.freeze([32.128, 33.44, 34.746, 36.023, 37.312]);
export function colapsoCancion(s) {
  const g = GOLPES_COLAPSO; let k = 0, ultimo = -1;
  for (let i = 0; i < g.length; i++) if (s >= g[i]) { ultimo = i; k = i + Math.min(1, 1 - (1 - Math.min(1, (s - g[i]) / 0.28)) ** 3); }
  const apagado = Math.min(1, Math.max(0, (s - (L.calla - 0.45)) / 0.45));
  return { contraccion: ultimo < 0 ? 0 : k / g.length, apagado: apagado * apagado * (3 - 2 * apagado), ultimo };
}
// Edad (s) de la capa que soltó la envoltura en el último golpe cuyo número da `resto` al dividir entre `capas` (o null).
export function edadCapa(s, resto, capas = 3) {
  for (let i = GOLPES_COLAPSO.length - 1; i >= 0; i--) if (i % capas === resto && s >= GOLPES_COLAPSO[i]) return s - GOLPES_COLAPSO[i];
  return null;
}
// Respiración de las ondas de gas: una por compás; desde el error, una por medio compás (continua: sin saltos).
export const respiracionCancion = s => { const c = COMPAS_SUPERNOVA.compas, e = L.error - 0.6; return s < e ? s / c : e / c + (s - e) / (c / 2); };

// ── El videoclip: la pista de cámara (formato y ejes: js/util/directorCamara.js) ──
// Segundos de «Sparks» desde el principio de la ceremonia; distancias en radios R del encuadre del corazón ya nacido
// (la estrella cabe en ~0,14 R: su encuadre de llegada). Azimut 0 = delante del corazón (mira a casa), crece hacia la
// derecha. La pista acaba en la afirmación final (58,26, cuando la ceremonia pasa a «recuerdo»); desde ahí el director
// funde en 2,5 s al encuadre normal del corazón: el corazón se ve grande en la revelación y se aleja al devolver el control.
//   t      pos [az°, el°, R]        mira                fov  curva     qué cuenta
export const CAMARA_SUPERNOVA = Object.freeze([
  { t: 0,      pos: [-28, 10, 0.207], mira: [0, 0, 0],          fov: 52, curva: 'suave' },    // la estrella sola, de lejos
  { t: 2.116,  pos: [-22, 8, 0.186],  mira: [0, 0, 0],          fov: 50, curva: 'suave' },    // primera caja = primer latido: le da su corazón
  { t: 4.734,  pos: [-12, 5, 0.143],  mira: [0, 0, 0],          fov: 48, curva: 'suave' },    // nos acercamos al latido
  { t: 7.134,  pos: [-6, 4, 0.136],   mira: [0, 0, 0],          fov: 46, curva: 'suave' },    // ella es a quien se agarra
  { t: 11.256, pos: [28, 11, 0.128],  mira: [0, -0.004, 0],     fov: 44, curva: 'lineal' },   // travelling lento con la nota larga
  { t: 12.542, pos: [34, 12, 0.124],  mira: [0, -0.004, 0],     fov: 44, curva: 'lineal' },
  { t: 15.157, pos: [48, 16, 0.114],  mira: [0.007, -0.003, 0], fov: 40, curva: 'suave' },    // primer plano del borde vivo (caja)
  { t: 17.731, pos: [56, 18, 0.12],   mira: [0.007, -0.003, 0], fov: 40, curva: 'lineal' },   // sus dos notas largas
  { t: 21.687, pos: [62, 24, 0.186],  mira: [0, 0, 0],          fov: 48, curva: 'suave' },    // la música respira: subimos y miramos
  { t: 23.02,  pos: [44, 6, 0.164],   mira: [0, -0.006, 0],     fov: 46, curva: 'rapida', giro: -4 },  // se equivoca: la estrella se agita (caja)
  { t: 27.95,  pos: [22, -6, 0.15],   mira: [0, -0.006, 0],     fov: 44, curva: 'suave', giro: 3 },    // la nota de 3 s: se acerca despacio
  { t: 28.204, pos: [0, 2, 0.179],    mira: [0, -0.007, 0],     fov: 46, curva: 'corte', giro: 0 },    // promete: de frente, firme (en la caja)
  { t: 31.25,  pos: [0, 4, 0.157],    mira: [0, -0.007, 0],     fov: 44, curva: 'lineal' },   // la nota sostenida; empieza el colapso
  { t: 34.746, pos: [-6, 14, 0.172],  mira: [0, -0.007, 0],     fov: 46, curva: 'suave' },    // la envoltura suelta capas a compás
  { t: 37.96,  pos: [4, 8, 0.114],    mira: [0, -0.004, 0],     fov: 42, curva: 'suave' },    // se apaga al callar la voz: entramos
  { t: 38.606, pos: [0, 14, 0.2],     mira: [0, 0, 0],          fov: 46, curva: 'corte' },    // las dos estrellitas, en la caja
  { t: 41.213, pos: [0, 10, 0.18],    mira: [0, 0, 0],          fov: 44, curva: 'lineal', giro: 6 },  // espiral: más cerca a cada vuelta (caja)
  { t: 41.665, pos: [0, 9, 0.175],    mira: [0, 0, 0],          fov: 44, curva: 'lineal', giro: 6 },  // silencio: quieta sobre la mota
  { t: 41.665, pos: [0, 9, 0.175],    mira: [0, 0, 0],          fov: 44, curva: 'lineal', giro: 6 },  // (el mismo plano otra vez: rompe la curva y el golpe no se nota antes)
  { t: 42.46,  pos: [6, 12, 0.26],    mira: [0, 0, 0],          fov: 50, curva: 'rapida', giro: -2 }, // ¡pum! salimos despedidos hasta el salto de la voz
  { t: 44.74,  pos: [16, 8, 0.42],    mira: [0, 0, 0],          fov: 56, curva: 'suave', giro: 0 },   // el grito sostenido: vuelan las chispas
  { t: 47.07,  pos: [12, 5, 0.56],    mira: [0, 0.014, 0],      fov: 54, curva: 'suave' },    // la voz baja: las chispas vuelven
  { t: 48.974, pos: [-4, 6, 0.78],    mira: [0, 0.021, 0],      fov: 54, curva: 'suave' },    // a golpes, el corazón se dibuja
  { t: 52.06,  pos: [-10, 4, 0.92],   mira: [0, -0.04, 0],      fov: 60, curva: 'suave' },    // la promesa vuelve: el corazón entero
  { t: 56.8,   pos: [-2, 1, 0.8],     mira: [0, -0.04, 0],      fov: 60, curva: 'lineal' },   // la nota más alta, sostenida: nos acercamos
  { t: 58.26,  pos: [0, 0, 0.77],     mira: [0, -0.04, 0],      fov: 60, curva: 'suave' }     // la afirmación final, de frente y grande
]);

export const FRASE_SUPERNOVA = 'De toda esta luz, mi lugar favorito sigue siendo contigo.';
export const RECUERDO_SUPERNOVA = 'supernova-amor';
export function puntoCorazon(a, radio = 1, profundidad = 0) {
  return [70 * 16 * Math.sin(a) ** 3 * radio,
    70 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a) + 2.5) * radio,
    profundidad];
}
export function faseSupernova(estado, segundos, falta = TIEMPOS_AMOR.espera) {
  if (estado === 'inestable') return falta <= TIEMPOS_AMOR.silencio ? 'silencio' : 'encuentro';
  if (estado === 'remanente') return 'recuerdo';
  if (estado !== 'estallido') return 'estrella';
  if (segundos < TIEMPOS_AMOR.formar) return 'expansion';
  if (segundos < TIEMPOS_AMOR.formado) return 'formacion';
  if (segundos < TIEMPOS_AMOR.revelar) return 'revelacion';
  return 'recuerdo';
}

// Secciones curvas, más estrechas hacia delante y detrás: no se extruye una
// silueta plana entre dos tapas. La turbulencia cambia en los tres ejes.
export function puntoCorazonVolumen(a, latitud = 0, radio = 1, fase = 0) {
  const z=Math.max(-1,Math.min(1,latitud));
  const seccion=Math.sqrt(Math.max(0,1-z*z));
  const relieve=1+0.045*Math.sin(a*5+z*4+fase)+0.025*Math.cos(a*9-z*3+fase);
  const p=puntoCorazon(a,seccion*radio*relieve,z*760*radio);
  p[0]+=Math.sin(a*3+z*5+fase)*45*seccion*radio;
  p[1]+=Math.cos(a*4-z*4+fase)*35*seccion*radio;
  p[2]+=Math.sin(a*3+fase)*95*seccion*radio;
  return p;
}
