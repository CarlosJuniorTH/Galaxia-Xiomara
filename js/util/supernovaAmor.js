// Geometría y tiempo compartidos por la escena y sus pruebas. Sin reloj de pared:
// la revelación espera al universo, también tras leer o cambiar de aplicación.
//
// La ceremonia dura lo que su canción («Sparks», Coldplay: supernova.m4a, 62,3 s, desde el segundo 114,962 del original) y
// empieza con ella. Todo va en segundos DEL FRAGMENTO, medidos sobre la voz aislada (Demucs + faster-whisper large-v3,
// tono con pyin) y la instrumental (golpes de caja y platillos, graves por compás):
//  · Compás de 6/8 lento: un compás cada 2,604 s (seis corcheas de 0,434 s); el golpe de caja cae en la segunda mitad
//    (2,13 + k·2,604) y el tiempo fuerte en 0,83 + k·2,604. Es el «latido» de la canción.
//  · La letra, por su sentido (no se cita): 2,0–4,5 él le entrega su corazón · 7,0–11,8 ella es a quien se agarra ·
//    15,0–17,4 eso es lo que hace siempre · 17,5–22,5 la música respira, sin voz · 22,7–26,3 reconoce que se equivocó ·
//    28,0–37,7 le promete no fallarle y lo repite dos veces, con la melodía bajando hasta lo más grave · 38,0–41,6 la
//    voz calla (3,6 s de instrumental; los graves se hunden en 41,25–41,65) · 41,65 entra el grito, sube a lo más alto a
//    los 42,3 y lo sostiene hasta 47,0; baja y se apaga a los 49,3 · 52,2 la promesa vuelve, ahora en la nota más alta
//    del fragmento (hasta 58,0) · 58,0–62,3 la afirmación final, sostenida.
export const COMPAS_SUPERNOVA = Object.freeze({ corchea: 0.434, compas: 2.604, caja: 2.13, fuerte: 0.83 });
export const LETRA_SUPERNOVA = Object.freeze({ entrega: 2.0, abrazo: 7.0, siempre: 15.0, respiro: 17.5, error: 22.7, promesa: 28.0, repite: 31.3,
  grave: 34.7, calla: 38.0, dos: 38.62, uno: 41.24, estallido: 41.7, grito: 42.3, baja: 47.0, alto: 52.2, final: 58.0, fin: 62.3 });
// espera: del principio al estallido (el grito); silencio: los graves se hunden y solo queda un punto; formar: el grito
// baja y la materia empieza a volver; formado: la promesa en la nota más alta (el corazón entero); revelar: la afirmación
// final (recuerdo); reposo: el final del fragmento. formar, formado, revelar y reposo, desde el estallido.
const L = LETRA_SUPERNOVA;
export const TIEMPOS_AMOR = Object.freeze({ espera: L.estallido, silencio: +(L.estallido - L.uno).toFixed(2), formar: +(L.baja - L.estallido).toFixed(2),
  formado: +(L.alto - L.estallido).toFixed(2), revelar: +(L.final - L.estallido).toFixed(2), reposo: +(L.fin - L.estallido).toFixed(2) });

// La animación se diseñó con otro reloj (14 s de espera; formar 4, formado 16, revelar 19, reposo 25) y se conserva: estos
// tramos la llevan a la canción. Antes del estallido (lo que falta, real → animación):
//   0–22,7   latidos tranquilos (14 → 12,6): la agitación casi no sube mientras él declara y promete;
//   22,7–28  se equivoca: la estrella se vuelve inestable (12,6 → 10,6);
//   28–31,3  promete no fallarle: al máximo, hinchada (10,6 → 9,5);
//   31,3–38,0 lo repite y la melodía baja a lo más grave: el núcleo colapsa a golpes (uno por tiempo de la canción) mientras la
//            envoltura tiembla y suelta capas a compás; se apaga justo cuando calla la voz (9,5 → 4,8; ver colapsoCancion);
//   38,0–38,62 oscuridad, hasta el golpe de caja (4,8 → 3,8);
//   38,62–41,24 dos estrellitas giran y se acercan en espiral durante un compás entero (3,8 → 0,5);
//   41,24–41,7 silencio: ya son una sola mota, quieta y pequeña (0,5 → 0); y el grito: ¡pum!
const fa = s => +(L.estallido - s).toFixed(2);
const ANTES = [[0, 0], [fa(L.uno), 0.5], [fa(L.dos), 3.8], [fa(L.calla), 4.8], [fa(L.grave), 7.5], [fa(L.repite), 9.5], [fa(L.promesa), 10.6], [fa(L.error), 12.6], [L.estallido, 14]];
// Después del estallido: la bola de fuego crece mientras se sostiene el grito (0–5,3 → 0–4), las chispas forman el corazón
// mientras la voz baja y respira (5,3–10,5 → 4–16), la revelación en la nota más alta y el recuerdo con la afirmación final.
const DESPUES = [[0, 0], [TIEMPOS_AMOR.formar, 4], [TIEMPOS_AMOR.formado, 16], [TIEMPOS_AMOR.revelar, 19], [TIEMPOS_AMOR.reposo, 25]];
function tramos(x, nudos) {
  if (x <= nudos[0][0]) return nudos[0][1] + (x - nudos[0][0]);
  for (let i = 1; i < nudos.length; i++) if (x <= nudos[i][0]) { const [a0, b0] = nudos[i - 1], [a1, b1] = nudos[i]; return b0 + (x - a0) * (b1 - b0) / (a1 - a0); }
  const [a, b] = nudos[nudos.length - 1]; return b + (x - a);
}
// Las chispas no se juntan a velocidad constante: avanzan a golpes, uno por cada tiempo de la canción (el 6/8 se siente en
// dos tiempos por compás, cada 1,302 s), deprisa al principio de cada uno y frenando hasta el siguiente.
const PASOS_FORMACION = [L.baja, 47.72, 49.03, 50.33, 51.63, L.alto].map(s => +(s - L.estallido).toFixed(2));
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

// Latido de la estrella con la canción (s: segundo del fragmento): «pum-pum» con el golpe de caja y su corchea siguiente;
// desde que él reconoce su error, también en el tiempo fuerte (el doble de seguido). 0 entre latidos, ~1 en el golpe.
export function latidoCancion(s) {
  const { corchea, compas, fuerte } = COMPAS_SUPERNOVA, medio = compas / 2;
  if (!Number.isFinite(s) || s < fuerte) return 0;
  const doble = s >= L.error - 0.6;
  const periodo = doble ? medio : compas, origen = doble ? fuerte : COMPAS_SUPERNOVA.caja;
  const d = ((s - origen) % periodo + periodo) % periodo, g = x => Math.exp(-((x / 0.07) ** 2));
  return g(d) + g(d - periodo) + 0.6 * g(d - corchea);
}
// El colapso (31,3–38,0): en cada tiempo de la canción (el 6/8 sentido, cada 1,302 s) el núcleo da un tirón hacia dentro
// (rápido al principio del tiempo, quieto hasta el siguiente) y la envoltura suelta una capa que se aleja. contraccion: 0
// antes, 1 tras el último tirón; apagado: la estrella se apaga en el medio segundo antes de que calle la voz (38,0).
export const GOLPES_COLAPSO = Object.freeze([32.08, 33.38, 34.69, 35.99, 37.29]);
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
// derecha. La pista acaba en la afirmación final (58,0, cuando la ceremonia pasa a «recuerdo»); desde ahí el director
// funde en 2,5 s al encuadre normal del corazón: el corazón se ve grande en la revelación y se aleja al devolver el control.
//   t      pos [az°, el°, R]        mira                fov  curva     qué cuenta
export const CAMARA_SUPERNOVA = Object.freeze([
  { t: 0,     pos: [-28, 10, 0.207], mira: [0, 0, 0],          fov: 52, curva: 'suave' },    // la estrella sola, de lejos
  { t: 2.13,  pos: [-22, 8, 0.186],  mira: [0, 0, 0],          fov: 50, curva: 'suave' },    // primer latido: le da su corazón
  { t: 4.75,  pos: [-12, 5, 0.143],  mira: [0, 0, 0],          fov: 48, curva: 'suave' },    // nos acercamos al latido
  { t: 7.0,   pos: [-6, 4, 0.136],   mira: [0, 0, 0],          fov: 46, curva: 'suave' },
  { t: 11.8,  pos: [32, 12, 0.126],  mira: [0, -0.004, 0],     fov: 44, curva: 'lineal' },   // travelling lento: se agarra a ella
  { t: 15.17, pos: [48, 16, 0.114],  mira: [0.007, -0.003, 0], fov: 40, curva: 'suave' },    // primer plano del borde vivo
  { t: 17.4,  pos: [56, 18, 0.12],   mira: [0.007, -0.003, 0], fov: 40, curva: 'lineal' },
  { t: 22.6,  pos: [62, 24, 0.186],  mira: [0, 0, 0],          fov: 48, curva: 'suave' },    // la música respira: subimos y miramos
  { t: 23.4,  pos: [44, 6, 0.164],   mira: [0, -0.006, 0],     fov: 46, curva: 'rapida', giro: -4 },  // se equivoca: la estrella se agita
  { t: 26.3,  pos: [22, -6, 0.157],  mira: [0, -0.006, 0],     fov: 44, curva: 'suave', giro: 3 },
  { t: 28.17, pos: [0, 2, 0.179],    mira: [0, -0.007, 0],     fov: 46, curva: 'corte', giro: 0 },    // promete: de frente, firme (en el golpe)
  { t: 31.3,  pos: [0, 4, 0.157],    mira: [0, -0.007, 0],     fov: 44, curva: 'lineal' },   // el núcleo empieza a colapsar a golpes
  { t: 34.7,  pos: [-6, 14, 0.172],  mira: [0, -0.007, 0],     fov: 46, curva: 'suave' },    // la envoltura suelta capas a compás
  { t: 38.0,  pos: [4, 8, 0.114],    mira: [0, -0.004, 0],     fov: 42, curva: 'suave' },    // se apaga al callar la voz: entramos
  { t: 38.62, pos: [0, 14, 0.143],   mira: [0, 0, 0],          fov: 46, curva: 'corte' },    // las dos estrellitas, casi de frente
  { t: 41.24, pos: [0, 10, 0.071],   mira: [0, 0, 0],          fov: 38, curva: 'lineal', giro: 8 },  // espiral: más cerca a cada vuelta
  { t: 41.7,  pos: [0, 9, 0.067],    mira: [0, 0, 0],          fov: 38, curva: 'lineal', giro: 9 },  // silencio: quieta sobre la mota
  { t: 41.7,  pos: [0, 9, 0.067],    mira: [0, 0, 0],          fov: 38, curva: 'lineal', giro: 9 },  // (el mismo plano otra vez: rompe la curva y el golpe no se nota antes)
  { t: 42.3,  pos: [6, 12, 0.343],   mira: [0, 0, 0],          fov: 56, curva: 'rapida', giro: -2 }, // ¡pum! salimos despedidos
  { t: 44.74, pos: [16, 8, 0.4],     mira: [0, 0, 0],          fov: 56, curva: 'suave', giro: 0 },   // el grito sostenido: vuelan las chispas
  { t: 47.0,  pos: [12, 5, 0.529],   mira: [0, 0.014, 0],      fov: 54, curva: 'suave' },    // la voz baja: las chispas vuelven
  { t: 49.03, pos: [-4, 6, 0.772],   mira: [0, 0.021, 0],      fov: 54, curva: 'suave' },    // a golpes, el corazón se dibuja
  { t: 52.2,  pos: [-10, 4, 0.82],   mira: [0, -0.04, 0],      fov: 60, curva: 'suave' },    // la nota más alta: el corazón, cerca
  { t: 58.0,  pos: [0, 0, 0.7],      mira: [0, -0.04, 0],      fov: 60, curva: 'suave' }     // la afirmación final, de frente y grande
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
