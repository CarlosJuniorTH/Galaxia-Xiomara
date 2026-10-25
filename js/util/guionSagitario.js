// Guion de Sagitario A* («Donde el cielo dice sí»), con «Say Yes to Heaven» (Lana Del Rey): sagitario.m4a = 145,241–183,345 s
// de la canción, 38,1 s a 103 BPM (un pulso cada 0,586 s, un compás cada 2,345 s desde el 0). Sin navegador ni three.js:
// lo usan js/escena/sagitario.js, js/util/guionAgujeros.js (que lo reexporta) y las pruebas. Todo es una función del
// segundo de la canción: si el reloj salta, la imagen es la de ese segundo.
//
// Lo que cuenta la canción en este fragmento (tiempos medidos con Whisper large-v3 sobre la voz aislada; resumen propio):
//   0–1,6     cola de la frase anterior (la entrega de la estrofa)
//   3,2–11,2  primera frase: pase lo que pase, nada importa más que tenerlo a él
//   12,7–15,9 lo repite, más corto: la certeza («lo tengo»)
//   18,0–20,6 estribillo: le pide que diga sí al cielo (el «sí» cae en 18,96, «cielo» en 20,06)
//   22,6–25,2 …y que le diga sí a ella («sí» en 23,58, «a mí» en 24,86)
//   27,6–30,4 otra vez sí al cielo («sí» en 28,64)
//   32,2–34,9 otra vez sí a ella («sí» en 33,22); desde 35,6 la canción se funde
// La idea (lo que hace un agujero negro: tragar lo que cae): Sgr A* es un agujero negro hambriento, casi apagado (el
// más tranquilo que conocemos). El clip empieza con él así —la «versión de inicio»: sombra, un anillo tenue y un flujo
// casi oscuro— y termina con su diseño final, el flujo encendido. Mientras ella dice que nada más importa, un grumo de gas
// se suelta de la minispiral y empieza a caer; con la certeza («lo tengo») la marea lo estira en un hilo (como la nube G2
// en 2014) y S2, la protagonista de las estrellas S, cae también hacia el agujero. En el primer «sí» el hilo entra en la
// sombra y el agujero lo acepta: una llamarada real (el anillo se enciende, una mancha caliente gira pegada a la sombra,
// como las que vio GRAVITY en 2018, y un eco de luz sale y enciende el gas, como los ecos de rayos X del centro
// galáctico); a la vez S2 lo roza (su pericentro), se sonroja (corrimiento al rojo gravitatorio) y sigue con su órbita
// girada (precesión de Schwarzschild: una roseta). Cada «sí» siguiente es otro grumo que cae y se traga, y con cada uno
// el flujo se aviva un poco más («alimento») hasta quedar encendido del todo con el último: el cielo ha dicho sí.
// (Distinto de TON 618: allí cae su propio disco en dos corrientes trenzadas; aquí caen grumos sueltos del gas de la
// galaxia y cada uno es un destello.)

const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;
const suave = (x, a, b) => { const k = sat((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const muySuave = (x, a, b) => { const k = sat((x - a) / (b - a)); return k * k * k * (k * (k * 6 - 15) + 10); };
// Un destello: sube en «sube» segundos y se apaga en «caida» (sin parpadeo de un cuadro).
const golpe = (dt, caida, sube = 0.04) => dt < 0 ? 0 : (1 - Math.exp(-dt / sube)) * Math.exp(-dt / caida);
// Avance a compases: entre a y b, cada compás da un paso que se asienta en su primera mitad.
function aCompases(t, a, b, compas) {
  const n = Math.max(1, Math.round((b - a) / compas)), k = Math.min(n, Math.max(0, (t - a) / compas)), i = Math.floor(k), f = Math.min(1, (k - i) / 0.6);
  return Math.min(1, (i + f * f * (3 - 2 * f)) / n);
}

export const PULSO_SAGITARIO = Object.freeze({ periodo: 60 / 102.35, inicio: 0 });   // 0,5862 s (medido: 103 BPM)
export const COMPAS_SAGITARIO = 4 * PULSO_SAGITARIO.periodo;
// Marcas (segundos del fragmento). Las mismas que js/data/bandaSonora.js (allí mandan si cambian).
//  primera  1.ª frase · tengo  la certeza · si1…si4  cada «sí» · cielo / mi  las palabras que cierran cada frase · fundido
export const MARCAS_SAGITARIO = Object.freeze({ primera: 3.16, tengo: 12.68, si1: 18.96, cielo: 20.06, si2: 23.58, mi: 24.86, si3: 28.64, si4: 33.22, fundido: 35.6 });
const SIES = ['si1', 'si2', 'si3', 'si4'], FUERZA_SI = [1, 1.25, 1, 1.45], ALIMENTO_SI = [0.3, 0.18, 0.11, 0.11];

// Estrellas S (Gillessen et al. 2017, GRAVITY 2020): semieje (″), excentricidad, inclinación, nodo y argumento del
// pericentro (°), periodo (años). S2 la primera. Las distancias se comprimen en la escena (sagitario.js) para que todas
// quepan junto al agujero sin que nadie lo atraviese; formas, orientaciones y periodos relativos son los reales.
export const ESTRELLAS_S = Object.freeze([
  ['S2', 0.1255, 0.8839, 134.18, 226.94, 65.51, 16.05], ['S38', 0.1416, 0.8201, 171.1, 101.06, 17.99, 19.2], ['S55', 0.1078, 0.7209, 150.1, 325.5, 331.5, 12.8],
  ['S1', 0.595, 0.556, 119.14, 342.04, 122.3, 166], ['S4', 0.357, 0.3905, 80.33, 258.84, 290.8, 77], ['S8', 0.404, 0.8031, 74.37, 315.43, 346.7, 92.9],
  ['S9', 0.2934, 0.644, 82.41, 156.6, 150.6, 51.3], ['S12', 0.2987, 0.8883, 33.56, 230.1, 317.9, 58.9], ['S13', 0.2641, 0.425, 24.7, 74.5, 245.2, 49],
  ['S17', 0.3551, 0.397, 96.83, 191.62, 326.0, 76.6], ['S18', 0.2387, 0.471, 110.67, 49.11, 349.46, 41.9], ['S19', 0.52, 0.75, 71.96, 344.6, 155.2, 135],
  ['S21', 0.219, 0.764, 58.8, 259.64, 166.4, 37], ['S29', 0.428, 0.728, 105.8, 161.96, 346, 101], ['S31', 0.449, 0.5497, 109.03, 137.16, 308, 108]
].map(([nombre, a, e, i, nodo, peri, anos]) => Object.freeze({ nombre, a, e, i, nodo, peri, anos })));

export function marcasSagitario(M = {}) {
  const m = { ...MARCAS_SAGITARIO };
  for (const [k, v] of Object.entries(M || {})) if (k in m && Number.isFinite(v)) m[k] = v;
  return m;
}
// S2 da una vuelta entera en la escena: sale del apocentro en el 0, roza el agujero en el primer «sí» y vuelve al final.
export const periodoS2 = M => 2 * M.si1;
// Segundos de escena por año de órbita (S2 tarda 16,05 años): el resto de estrellas, en proporción.
export const segundosPorAno = M => periodoS2(M) / ESTRELLAS_S[0].anos;

// Estado de la escena en el segundo t (rellena o, sin memoria nueva):
//  revela     largo de la traza de cada estrella (fracción de su vuelta): crece a compases desde la 1.ª frase hasta
//             que todas las elipses quedan dibujadas antes del estribillo
//  foco       mientras S2 cae («lo tengo»), las demás se apagan un poco (0 → 1 → 0 tras el primer «sí»)
//  s2         anomalía media de S2 (0 = pericentro, en el primer «sí»)
//  inspira    el agujero toma aire en cada «say» (el segundo antes del «sí»): el anillo sube un poco
//  destello   la llamarada de cada «sí» (anillo de fotones y flujo)
//  mancha / manchaAng   la mancha caliente que gira pegada a la sombra tras cada «sí» y su ángulo
//  ecos[4] / ecosF[4]   segundos desde cada «sí» (−1: aún no) y su fuerza: el eco de luz que sale y enciende el gas
//  encendido  el gas que queda iluminado tras los ecos (se queda en la calma)
//  calma      0 → 1 en el fundido
//  alimento   cuánto se ha encendido el flujo (0,3 hambriento → 1 el diseño final), un escalón con cada grumo tragado
//  grumosIni[4] / grumosFin[4]   cuándo se suelta cada grumo de la minispiral y cuándo lo traga el agujero (su «sí»)
export function guionSagitario(t, Mm, { reducido = false } = {}, o = {}) {
  const M = Mm && Mm.si1 !== undefined && Mm.fundido !== undefined && Mm.primera !== undefined ? Mm : marcasSagitario(Mm), k = reducido ? 0.35 : 1;
  o.t = t;
  o.revela = 0.12 + 0.88 * aCompases(t, M.primera - 0.4, M.si1 - 2.3, COMPAS_SAGITARIO);
  o.foco = muySuave(t, M.tengo - 0.5, M.si1 - 1.2) * (1 - muySuave(t, M.si1 + 1.2, M.si2 - 0.5));
  o.s2 = 2 * Math.PI * (t - M.si1) / periodoS2(M);
  o.calma = muySuave(t, M.fundido, M.fundido + 2.5);
  o.inspira = 0; o.destello = 0; o.mancha = 0; o.manchaAng = 0; o.encendido = 0;
  if (!o.ecos) { o.ecos = [-1, -1, -1, -1]; o.ecosF = [0, 0, 0, 0]; o.grumosIni = [0, 0, 0, 0]; o.grumosFin = [0, 0, 0, 0]; }
  o.alimento = 0.3;
  for (let i = 0; i < 4; i++) {
    const s = M[SIES[i]], f = FUERZA_SI[i], dt = t - s;
    o.inspira += 0.35 * suave(t, s - 1.0, s - 0.05) * (dt < 0 ? 1 : Math.exp(-dt / 0.2)) * k;
    o.destello += f * golpe(dt, 0.9) * k;
    o.mancha += f * golpe(dt, 3.2, 0.15) * (reducido ? 0.5 : 1);
    o.ecos[i] = dt >= 0 ? dt : -1; o.ecosF[i] = f * (reducido ? 0.4 : 1);
    o.encendido += 0.17 * f * suave(t, s + 0.5, s + 3.5);
    o.alimento += ALIMENTO_SI[i] * muySuave(t, s - 0.1, s + 1.4);
    o.grumosIni[i] = i === 0 ? M.primera : i === 1 ? M.tengo : M[SIES[i - 2]]; o.grumosFin[i] = s;
  }
  // La mancha es siempre la misma (una vuelta cada 3,66 s, la del gas a 1,35 radios junto a la sombra, en el sentido del flujo): cada «sí» la reaviva.
  o.manchaAng = 2 * Math.PI * Math.max(0, t - M.si1 + 1) / 3.66;
  o.encendido = Math.min(0.6, o.encendido);
  return o;
}

export function reposoSagitario(o = {}) {
  Object.assign(o, { t: 0, revela: 1, foco: 0, s2: 0, calma: 1, inspira: 0, destello: 0, mancha: 0, manchaAng: 0, encendido: 0, alimento: 1 });
  o.ecos = [-1, -1, -1, -1]; o.ecosF = [0, 0, 0, 0]; o.grumosIni = [-9, -9, -9, -9]; o.grumosFin = [-8, -8, -8, -8];
  return o;
}

// ── Pista de cámara (contrato del director, js/util/directorCamara.js) ──
// Coordenadas del grupo de Sagitario (sin giro: los mismos ejes que el cosmos), en unidades del radio de encuadre
// (cosmos.objetivo('sagitario').distancia = 12,6 radios de la sombra). pos: [azimut°, elevación°, distancia] con
// azimut 0 = eje +Z (desde donde las órbitas se ven como en el cielo de la Tierra), azimut 90 = +X, elevación 90 = +Y
// (convención de posicionPista, abajo). Medidas de lo que se ve, en esas unidades: sombra 0,08 · flujo hasta 0,23 (más cerca de 0,45 todo se ve
// disperso: la cámara no baja de 0,5) ·
// pericentro de S2 0,14 · su apocentro 0,42 · la minispiral hasta 0,7.
export const RS_POR_RADIO = 1500 / 119;   // 12,6 (objetivo 1500·ESCALA_SGR; sombra 170·0,7·ESCALA_SGR)
export function posicionPista([az, el, d]) {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  return [Math.sin(a) * Math.cos(e) * d, Math.sin(e) * d, Math.cos(a) * Math.cos(e) * d];
}
const M0 = MARCAS_SAGITARIO;
export const CAMARA_SAGITARIO = Object.freeze([
  // Llegada: el centro de la galaxia de frente, entero; el agujero aún hambriento (las elipses cortas).
  { t: 0, pos: [8, 12, 1.05], mira: [0, 0, 0], fov: 50, curva: 'suave' },
  // 1.ª frase («nada importa más»): se suelta el primer grumo; un travelling lento y constante rodea el cúmulo y enseña
  // las órbitas en 3D mientras se dibujan.
  { t: M0.primera, pos: [-6, 16, 1.0], mira: [0, 0, 0], fov: 50, curva: 'suave' },
  { t: 7.03, pos: [-30, 22, 0.92], mira: [0, 0, 0], fov: 48, curva: 'lineal' },
  { t: 11.2, pos: [-55, 16, 0.82], mira: [0, 0, 0], fov: 47, curva: 'lineal' },
  // «Lo tengo»: el grumo, ya un hilo, y S2 caen hacia el agujero; la cámara baja y se acerca con ellos.
  { t: 14.07, pos: [-45, 8, 0.68], mira: [0, 0, 0], fov: 44, curva: 'suave' },
  { t: 16.41, pos: [-28, 4, 0.58], mira: [0, 0, 0], fov: 41, curva: 'suave' },
  // «Say…»: contiene el aliento, casi quieta, pegada al agujero (el hilo se enrosca en la sombra).
  { t: M0.si1 - 1.0, pos: [-18, 2, 0.54], mira: [0, 0, 0], fov: 40, curva: 'suave' },
  // «…yes»: el agujero se lo traga y estalla la llamarada; S2 lo roza. Un barrido rápido, con un leve alabeo.
  { t: M0.si1 + 0.35, pos: [4, 6, 0.5], mira: [0, 0, 0], fov: 38, curva: 'rapida', giro: 5 },
  // «…to heaven»: se calma; la mancha caliente gira junto a la sombra.
  { t: M0.cielo + 1.0, pos: [20, 12, 0.56], mira: [0, 0, 0], fov: 40, curva: 'suave', giro: 0 },
  { t: M0.si2 - 1.0, pos: [28, 15, 0.6], mira: [0, 0, 0], fov: 42, curva: 'suave' },
  // «…yes to me»: el segundo grumo, la llamarada mayor: la cámara se aparta deprisa para ver salir el eco por el gas.
  { t: M0.si2 + 0.5, pos: [38, 22, 0.78], mira: [0, 0, 0], fov: 46, curva: 'rapida' },
  { t: 26.5, pos: [56, 28, 0.9], mira: [0, 0, 0], fov: 48, curva: 'suave' },
  // Estribillo otra vez: corte seco en el compás al otro lado, a contraluz (la lente curva el flujo por detrás).
  { t: 28.14, pos: [150, 18, 0.62], mira: [0, 0, 0], fov: 44, curva: 'corte' },
  { t: 31.9, pos: [176, 26, 0.66], mira: [0, 0, 0], fov: 45, curva: 'lineal' },
  // El último «sí» (a ella), el mayor: se eleva y abre para ver el centro entero encendido y la roseta de S2.
  { t: M0.si4 + 0.6, pos: [196, 46, 0.92], mira: [0, 0, 0], fov: 48, curva: 'rapida' },
  // Fundido: se posa en un encuadre tranquilo, de frente al cúmulo, donde se devuelve el control.
  { t: 38.1, pos: [210, 32, 1.0], mira: [0, 0, 0], fov: 50, curva: 'suave' }
]);

export const ESCENA_SAGITARIO = Object.freeze({ id: 'sagitario', duracion: 38.1, pulso: PULSO_SAGITARIO.periodo, compas: 4, marcas: MARCAS_SAGITARIO, camara: CAMARA_SAGITARIO });
