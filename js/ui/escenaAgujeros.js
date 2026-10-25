// Escenas de TON 618 y Sagitario A* (como la de la supernova, pero sin pedir nada): empiezan en cuanto llega el viaje, a la
// vez que su canción, y la imagen sigue el reloj de la canción (bandaSonora.tiempo). Sin canción (música apagada, sin
// archivo, o si no carga), el reloj es el tiempo desde la llegada. Al terminar queda en calma, sin repetirse; si se sale a
// mitad, se funde con el reposo. Con movimiento reducido, una versión tranquila (sin destellos ni cámara que se mueve).
// Lo que se ve está en js/escena/ton618.js y js/escena/sagitario.js; el guion, en js/util/guionAgujeros.js.
import { finEscena } from '../util/guionAgujeros.js';

const GIGANTES = new Set(['ton618', 'sagitario']);
// Lo que se espera a que la canción empiece a sonar al llegar (descarga o arranque) antes de seguir con el reloj propio.
const ESPERA_CANCION = 3000;

export function crearEscenaAgujeros({ escena, banda = null, alRepetir = () => {} }) {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let actual = null, llegada = 0, t = 0, ultimo = 0, conReloj = false, vista = null, viajando = true, destino = null;

  // Segundo de la escena. Mientras suena su canción, el de la canción; si no suena (o deja de sonar), sigue contando el
  // tiempo real desde ahí (solo con la página a la vista: al volver de otra pestaña no salta).
  function reloj() {
    const ahora = performance.now(), dt = Math.min(0.1, (ahora - ultimo) / 1000); ultimo = ahora;
    if (!conReloj && banda?.activa && banda.tiene(actual)) {
      const s = (banda.suena ? banda.suena(actual) : banda.objetivo === actual) ? banda.tiempo(actual) : 0;
      if (s > 0) { t = s; return t; }
      if (ahora - llegada < ESPERA_CANCION) return t;   // la canción aún no suena: la escena espera en su primer segundo
    }
    conReloj = true; t += dt; return t;
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
    actual = id; llegada = ultimo = performance.now(); t = 0; conReloj = false;
    escena.escenaAgujero(id, { reloj, reducido });
    enCurso(id);
    clearTimeout(vista); vista = setTimeout(function mirar() { if (actual === id && t < finEscena(id)) vista = setTimeout(mirar, 250); else enCurso(null); }, 250);
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
