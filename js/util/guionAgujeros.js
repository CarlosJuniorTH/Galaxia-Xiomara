// Guion de las escenas de TON 618 y Sagitario A* (sin navegador ni three.js: lo usan js/escena/ton618.js,
// js/escena/sagitario.js, js/ui/escenaAgujeros.js y sus pruebas). Todo es una función del segundo de la canción: si el
// reloj salta (la canción llega tarde, se apaga la música, se vuelve de otra pestaña) la imagen es la de ese segundo, sin
// estados que se queden a medias. Cada función rellena un objeto propio (sin memoria nueva en cada cuadro).
import { MOMENTOS } from '../data/bandaSonora.js';
import { MARCAS_TON618, REPOSO_TON618, DURACION_TON618 } from './guionTon618.js';
// El guion de TON 618 vive en su propio archivo (js/util/guionTon618.js): la estrella que cae, el disco que se enciende y
// su pista de cámara.
export { guionTon618 } from './guionTon618.js';

const suave = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const muySuave = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * k * (k * (k * 6 - 15) + 10); };
// Inicio del último compás (o tiempo, o ciclo de «periodo» segundos) de la rejilla del pulso antes de t.
const rejilla = (t, periodo, inicio = 0) => Math.floor((t - inicio) / periodo) * periodo + inicio;
// Avance a compases: entre a y b, cada compás da un paso que se asienta en su primera mitad (se mueve a tiempo con la música).
function aCompases(t, a, b, compas) {
  const n = Math.max(1, Math.round((b - a) / compas)), k = Math.min(n, Math.max(0, (t - a) / compas)), i = Math.floor(k), f = Math.min(1, (k - i) / 0.6);
  return Math.min(1, (i + f * f * (3 - 2 * f)) / n);
}

// Pulso medido de cada fragmento (audios-originales/*.analisis.json: el fragmento empieza en un primer tiempo de compás).
// «I Wanna Be Yours» va a 136 BPM con aire de 68: un latido cada dos tiempos es un corazón en reposo.
export const PULSO = Object.freeze({ ton618: { periodo: 0.4445, inicio: 0 }, sagitario: { periodo: 0.5862, inicio: 0 } });
export const DURACION = Object.freeze({ ton618: DURACION_TON618, sagitario: 38.1 });
// Pistas de cámara de sus videoclips (formato: js/util/directorCamara.js; segundos del fragmento, radios de encuadre).
// null: sin pista (la cámara se queda en la llegada con los controles bloqueados; TON 618 deriva despacio).
export const CAMARA_AGUJEROS = { ton618: null, sagitario: null };
// Marcas por defecto (las mismas que js/data/bandaSonora.js; si allí faltan, la escena conserva su guion).
const POR_DEFECTO = {
  ton618: { ...MARCAS_TON618 },
  sagitario: { estribillo: 18.4, segundaFrase: 23.6, fundido: 35.6 }
};
export function marcasDe(id) {
  const propias = MOMENTOS[id]?.marcas || {}, m = { ...POR_DEFECTO[id] };
  for (const [k, v] of Object.entries(propias)) if (Number.isFinite(v)) m[k] = v;
  return m;
}
// Segundo en el que la escena ya ha terminado: el fundido de la canción y su cola. Después queda en calma (sin repetirse).
export const COMPAS = Object.freeze({ ton618: 4 * PULSO.ton618.periodo, sagitario: 4 * PULSO.sagitario.periodo });
export const finEscena = id => marcasDe(id).fundido + 2.5;

// Un latido: sube en 25 ms y se apaga en «caida» segundos (sin parpadeo de un cuadro).
const golpe = (dt, caida) => dt < 0 ? 0 : (1 - Math.exp(-dt / 0.025)) * Math.exp(-dt / caida);

// ── Sagitario A* ── el corazón de la Vía Láctea: las estrellas S se ordenan y dibujan corazones.
//  orden     sus órbitas, al principio en todas las direcciones (como las reales), giran hasta un mismo plano de cara
//  corazon   en el estribillo cada órbita se convierte en un corazón alrededor del centro
//  chispa / chispaFuerza   segundos desde el estribillo: un brillo recorre los corazones al formarse
//  pareja    en la segunda frase las dos estrellas más brillantes orbitan juntas sobre el corazón mayor
//  latido    un brillo suave en cada compás del estribillo (sin destellos: la canción es celestial)
//  traza     largo de la estela de cada estrella (fracción de su vuelta)
//  ritmo     velocidad de las órbitas (1 = la de siempre)
//  calma     0 → 1 en el fundido
export function guionSagitario(t, M = marcasDe('sagitario'), { reducido = false } = {}, o = {}) {
  const { periodo: P, inicio } = PULSO.sagitario, compas = 4 * P;
  o.t = t;
  // Las órbitas se ordenan a compases (2,34 s): cada uno, un paso que se asienta con la música.
  o.orden = aCompases(t, rejilla(1.5, compas, inicio) + compas, M.estribillo - 0.4, compas);
  o.corazon = muySuave(t, M.estribillo - 0.9, M.estribillo + (reducido ? 3.5 : 2));
  o.chispa = t - M.estribillo; o.chispaFuerza = t >= M.estribillo - 0.5 && !reducido ? 1 : 0;
  o.pareja = muySuave(t, M.segundaFrase - 0.6, M.segundaFrase + 2.4);
  o.calma = muySuave(t, M.fundido, M.fundido + 2.5);
  // Un brillo suave en cada primer tiempo de compás: tenue antes del estribillo, pleno en él.
  o.latido = golpe(t - rejilla(t, compas, inicio), 0.6) * (t >= M.estribillo - 0.5 ? 0.45 : 0.16) * (reducido ? 0.35 : 1) * (1 - o.calma);
  o.traza = 0.32 + 0.6 * o.orden + 0.08 * o.corazon;
  o.ritmo = 1 - 0.45 * o.orden - 0.15 * o.corazon - 0.15 * o.calma;
  return o;
}

// Guion en reposo (fuera de la escena): lo de siempre.
export function guionReposo(id, o = {}) {
  if (id === 'ton618') Object.assign(o, REPOSO_TON618);
  else Object.assign(o, { t: 0, orden: 0, corazon: 0, chispa: -99, chispaFuerza: 0, pareja: 0, calma: 0, latido: 0, traza: 0.32, ritmo: 1 });
  return o;
}
