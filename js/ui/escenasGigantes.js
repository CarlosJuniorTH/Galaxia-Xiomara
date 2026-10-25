// Escenas de llegada del púlsar y de Deneb: empiezan solas al llegar (como la de la supernova) y se cancelan,
// suaves, al irse a otro destino (eso lo vigila la escena 3D en cada cuadro). Sin textos ni botones: las
// cuenta su audio. Duración y marcas: js/util/escenasGigantes.js (ESCENA_PULSAR, ESCENA_DENEB).
// relojDe(id): la función que da los segundos del audio de esa escena, para sincronizarla con él; p. ej.
// `id => () => bandaSonora.tiempo(id)` (js/data/bandaSonora.js). Sin reloj, el tiempo propio desde la llegada.
import { ESCENAS_GIGANTES } from '../util/escenasGigantes.js';

export function crearEscenasGigantes({ escena, relojDe = () => null }) {
  const tiene = id => Object.hasOwn(ESCENAS_GIGANTES, id);
  return {
    tiene,
    abrir: (id, opciones = {}) => tiene(id) ? escena.escenaGigante(id, { reloj: relojDe(id), ...opciones }) : Promise.resolve(false),
    cancelar: id => escena.cancelarEscenaGigante(id)
  };
}
