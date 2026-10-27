// Escenas de TON 618 y Sagitario A* (como la de la supernova, pero sin pedir nada): empiezan en cuanto llega el viaje, a la
// vez que su canción, y la imagen lee el reloj maestro desde el ancla de la canción (js/util/relojMaestro.js: el segundo de
// la escena es el de la canción, sin seguirla). Sin canción (música apagada, sin archivo, o si no carga), el mismo reloj
// desde la llegada (y si la canción entra después, entra en ese compás). Al terminar queda en calma, sin repetirse; si se sale a
// mitad, se funde con el reposo. Con movimiento reducido, una versión tranquila (sin destellos ni cámara que se mueve).
// Lo que se ve está en js/escena/ton618.js y js/escena/sagitario.js; el guion, en js/util/guionAgujeros.js.
import { finEscena } from '../util/guionAgujeros.js';
import { relojMaestro } from '../util/relojMaestro.js';

const GIGANTES = new Set(['ton618', 'sagitario']);

export function crearEscenaAgujeros({ escena, banda = null, alRepetir = () => {} }) {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let actual = null, ancla = null, vista = null, viajando = true, destino = null;

  // Segundo de la escena: reloj maestro − ancla de su canción (o la propia, fijada al empezar si no hay canción programada).
  function reloj() {
    if (ancla === null) { ancla = banda?.ancla?.(actual) ?? null; if (ancla === null) { ancla = relojMaestro.ahora(); banda?.anclar?.(actual, ancla); } }
    return Math.max(0, relojMaestro.ahora() - ancla);
  }
  // La escena no se puede saltar: el bloqueo de la navegación es el común de la interfaz (universo.js, escenaEnCurso: la
  // llegada lo abre con la duración de la canción; al volver a vivirla, alRepetir). Aquí solo el mismo gancho que las
  // escenas del púlsar, el cuásar y Deneb: body[data-escena-en-curso] = id y el aviso «escena-en-curso» ({ id, activa }).
  let avisada = null;
  function enCurso(id) {
    if (avisada === id) return;
    const antes = avisada; avisada = id;
    if (id) document.body.dataset.escenaEnCurso = id; else if (document.body.dataset.escenaEnCurso === antes) delete document.body.dataset.escenaEnCurso;
    document.dispatchEvent(new CustomEvent('escena-en-curso', { detail: { id: id || antes, activa: !!id } }));
  }
  function abrir(id) {
    actual = id; ancla = null;
    escena.escenaAgujero(id, { reloj, reducido });
    enCurso(id);
    clearTimeout(vista); vista = setTimeout(function mirar() { if (actual === id && reloj() < finEscena(id)) vista = setTimeout(mirar, 250); else enCurso(null); }, 250);
  }
  function cancelar() {
    if (!actual) return;
    escena.escenaAgujero(actual, null);
    actual = null; clearTimeout(vista); enCurso(null);
  }
  // Volver a vivirla (el gesto del lugar, ya en calma): la escena se funde y empieza otra vez con la canción desde el principio.
  async function repetir(id) {
    if (escena.destino !== id || escena.viajando || (actual === id && avisada)) return;   // mientras suena, no se interrumpe
    cancelar();
    await new Promise(r => setTimeout(r, reducido ? 300 : 1400));
    if (escena.destino !== id || escena.viajando) return;
    banda?.ceremonia(id); alRepetir(id, banda?.duracion?.(id) || finEscena(id)); abrir(id);
  }
  // Llegadas y salidas (como la banda sonora: cada 120 ms). Se sale al viajar o al cambiar de destino.
  setInterval(() => {
    const v = escena.viajando, d = escena.destino;
    if (actual && (v || d !== actual)) cancelar();
    if (!actual && !v && GIGANTES.has(d) && (viajando || destino !== d)) abrir(d);
    viajando = v; destino = d;
  }, 120);
  // Cada marca de la canción queda anotada (diagnóstico y pruebas: el compás de la escena se puede comprobar).
  banda?.alMarca?.(({ momento, marca }) => { if (momento === actual) document.body.dataset.marcaAgujero = marca; });
  return { repetir, cancelar, propia: id => GIGANTES.has(id), get actual() { return actual; } };
}
