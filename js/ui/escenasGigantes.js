// Escenas de llegada del púlsar, del cuásar y de Deneb: empiezan solas en cada visita (como la de la supernova), no se
// pueden saltar y se cancelan, suaves, solo si se va a otro destino (eso lo vigila la escena 3D en cada cuadro). Sin
// textos: las cuenta su canción. Duración, marcas y recorrido de cámara: js/util/escenasGigantes.js.
//
// Mientras dura, body[data-escena-en-curso] = id y el aviso 'escena-en-curso' ({ id, activa }) en document: el gancho
// para que la interfaz oculte los controles de navegación (el mecanismo común `escenaEnCurso` de la banda sonora).
//
// Reloj: el de su canción (bandaSonora.tiempo(id)), que la banda empieza desde el 0 al llegar. Mientras la canción
// aún no suena (descargando, en su fundido de entrada) la escena espera un momento; si no va a sonar (música apagada,
// sin archivo, fallo de descarga o el teléfono la retiene), sigue con su tiempo propio desde donde esté. Si la canción
// empieza más tarde, la escena la alcanza poco a poco (sin saltos) y desde ahí la sigue.
import { ESCENAS_GIGANTES } from '../util/escenasGigantes.js';

const ESPERA_AUDIO = 1.6;   // segundos que la escena espera a que empiece su canción (el fundido de la banda)

export function crearEscenasGigantes({ escena, banda = null }) {
  const tiene = id => Object.hasOwn(ESCENAS_GIGANTES, id);
  let enCurso = null;
  function relojDe(id) {
    if (!banda?.tiene(id)) return null;   // sin canción: el tiempo propio de la escena
    let propio = 0, previo = null;
    const t0 = performance.now();
    return () => {
      const ahora = performance.now(), dt = previo === null ? 0 : Math.min(0.1, (ahora - previo) / 1000); previo = ahora;
      if (banda.suena(id)) {
        const a = banda.tiempo(id);
        // Alcanza el audio en ~0,5 s si iba por detrás o por delante (al empezar tarde); luego lo sigue tal cual.
        if (Math.abs(a - propio) < 0.05) propio = a; else propio += (a - propio) * Math.min(1, dt * 4) + dt;
        return propio;
      }
      if (document.hidden) return propio;   // con la página oculta no avanza (como la canción, que se pausa)
      if (propio === 0 && (ahora - t0) / 1000 < ESPERA_AUDIO && banda.activa) return null;   // espera a que empiece
      propio += dt; return propio;
    };
  }
  function avisar(id, activa) {
    if (activa) document.body.dataset.escenaEnCurso = id; else delete document.body.dataset.escenaEnCurso;
    document.dispatchEvent(new CustomEvent('escena-en-curso', { detail: { id, activa } }));
  }
  // El videoclip: cada tramo de cámara de la escena al pasar su marca (se mira 10 veces por segundo; un tramo que
  // llega con más de 1,5 s de retraso, por ejemplo con la página oculta, se salta).
  function coreografia(id) {
    const c = ESCENAS_GIGANTES[id], tramos = (c.camara || []).map(([marca, desfase, fase]) => [c.marcas[marca] + desfase, fase]);
    if (!tramos.length) return () => {};
    let siguiente = 0;
    const vigia = setInterval(() => {
      const s = escena.segundoEscena(id);
      while (siguiente < tramos.length && s >= tramos[siguiente][0]) { const [cuando, fase] = tramos[siguiente++]; if (s - cuando < 1.5) escena.faro(fase); }
    }, 100);
    return () => clearInterval(vigia);
  }
  async function abrir(id, opciones = {}) {
    if (!tiene(id)) return false;
    enCurso = id; avisar(id, true);
    const parar = coreografia(id);
    try { return await escena.escenaGigante(id, { reloj: relojDe(id), ...opciones }); }
    finally { parar(); if (enCurso === id) { enCurso = null; avisar(id, false); } }
  }
  return {
    tiene, abrir,
    get enCurso() { return enCurso; },
    cancelar: id => escena.cancelarEscenaGigante(id)
  };
}
