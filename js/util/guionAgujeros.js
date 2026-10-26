// Guion de las escenas de TON 618 y Sagitario A* (sin navegador ni three.js: lo usan js/escena/ton618.js,
// js/escena/sagitario.js, js/ui/escenaAgujeros.js y sus pruebas). Todo es una función del segundo de la canción: si el
// reloj salta (la canción llega tarde, se apaga la música, se vuelve de otra pestaña) la imagen es la de ese segundo, sin
// estados que se queden a medias. Cada función rellena un objeto propio (sin memoria nueva en cada cuadro).
import { MOMENTOS } from '../data/bandaSonora.js';
import { MARCAS_TON618, REPOSO_TON618, DURACION_TON618, CAMARA_TON618 } from './guionTon618.js';
// El guion de TON 618 vive en su propio archivo (js/util/guionTon618.js): la estrella que cae, el disco que se enciende y
// su pista de cámara. El de Sagitario A*, en js/util/guionSagitario.js.
export { guionTon618 } from './guionTon618.js';
import { reposoSagitario, MARCAS_SAGITARIO, CAMARA_SAGITARIO } from './guionSagitario.js';

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
// null: sin pista (la cámara se queda en la llegada con los controles bloqueados). La de TON 618: js/util/guionTon618.js;
// la de Sagitario A*: js/util/guionSagitario.js.
export const CAMARA_AGUJEROS = { ton618: CAMARA_TON618, sagitario: CAMARA_SAGITARIO };
// Marcas por defecto (las mismas que js/data/bandaSonora.js; si allí faltan, la escena conserva su guion).
const POR_DEFECTO = {
  ton618: { ...MARCAS_TON618 },
  sagitario: { ...MARCAS_SAGITARIO }
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

// ── Sagitario A* ── su guion está en js/util/guionSagitario.js (aquí solo se reexporta).
export { guionSagitario } from './guionSagitario.js';

// Guion en reposo (fuera de la escena): lo de siempre.
export function guionReposo(id, o = {}) {
  if (id === 'ton618') Object.assign(o, REPOSO_TON618);
  else reposoSagitario(o);
  return o;
}
