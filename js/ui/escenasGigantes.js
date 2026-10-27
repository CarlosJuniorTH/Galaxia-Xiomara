// Escenas de llegada del púlsar, del cuásar y de Deneb: empiezan solas en cada visita (como la de la supernova), no se
// pueden saltar y se cancelan, suaves, solo si se va a otro destino (eso lo vigila la escena 3D en cada cuadro). Sin
// textos: las cuenta su canción. Duración, marcas y pista de cámara: js/util/escenasGigantes.js (la cámara la lleva el
// director de js/escena/index.js con el segundo de la escena: js/util/directorCamara.js).
//
// Mientras dura, body[data-escena-en-curso] = id y el aviso 'escena-en-curso' ({ id, activa }) en document: el gancho
// para que la interfaz oculte los controles de navegación (el mecanismo común `escenaEnCurso` de la banda sonora).
//
// Reloj: el maestro (js/util/relojMaestro.js) desde el ancla de su canción, que la banda programa al llegar: el segundo de
// la escena ES el de la canción (sin seguirla ni alcanzarla: es el mismo reloj). Si no hay canción programada (música
// apagada, sin archivo, fallo de descarga), la escena fija su propia ancla al empezar; si la canción entra más tarde (se
// enciende la música), entra en ese mismo compás.
import { ESCENAS_GIGANTES } from '../util/escenasGigantes.js';
import { relojMaestro } from '../util/relojMaestro.js';

export function crearEscenasGigantes({ escena, banda = null }) {
  const tiene = id => Object.hasOwn(ESCENAS_GIGANTES, id);
  let enCurso = null;
  function relojDe(id) {
    let ancla = null;
    return () => {
      if (ancla === null) { ancla = banda?.ancla?.(id) ?? null; if (ancla === null) { ancla = relojMaestro.ahora(); banda?.anclar?.(id, ancla); } }
      return Math.max(0, relojMaestro.ahora() - ancla);
    };
  }
  function avisar(id, activa) {
    if (activa) document.body.dataset.escenaEnCurso = id; else delete document.body.dataset.escenaEnCurso;
    document.dispatchEvent(new CustomEvent('escena-en-curso', { detail: { id, activa } }));
  }
  async function abrir(id, opciones = {}) {
    if (!tiene(id)) return false;
    enCurso = id; avisar(id, true);
    try { return await escena.escenaGigante(id, { reloj: relojDe(id), ...opciones }); }
    finally { if (enCurso === id) { enCurso = null; avisar(id, false); } }
  }
  return {
    tiene, abrir,
    get enCurso() { return enCurso; },
    cancelar: id => escena.cancelarEscenaGigante(id)
  };
}
