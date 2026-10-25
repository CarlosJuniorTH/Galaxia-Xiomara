// Escenas de llegada del púlsar, del cuásar y de Deneb: empiezan solas al llegar (como la de la supernova) y se
// cancelan, suaves, al irse a otro destino (eso lo vigila la escena 3D en cada cuadro). Sin textos ni botones: las
// cuenta su canción. Duración y marcas: js/util/escenasGigantes.js (ESCENA_PULSAR, ESCENA_CUASAR, ESCENA_DENEB).
//
// Reloj: el de su canción (bandaSonora.tiempo(id)), que la banda empieza desde el 0 al llegar. Mientras la canción
// aún no suena (descargando, en su fundido de entrada) la escena espera un momento; si no va a sonar (música apagada,
// sin archivo, fallo de descarga o el teléfono la retiene), sigue con su tiempo propio desde donde esté. Si la canción
// empieza más tarde, la escena la alcanza poco a poco (sin saltos) y desde ahí la sigue.
import { ESCENAS_GIGANTES } from '../util/escenasGigantes.js';

const ESPERA_AUDIO = 1.6;   // segundos que la escena espera a que empiece su canción (el fundido de la banda)

export function crearEscenasGigantes({ escena, banda = null }) {
  const tiene = id => Object.hasOwn(ESCENAS_GIGANTES, id);
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
  return {
    tiene,
    abrir: (id, opciones = {}) => tiene(id) ? escena.escenaGigante(id, { reloj: relojDe(id), ...opciones }) : Promise.resolve(false),
    cancelar: id => escena.cancelarEscenaGigante(id)
  };
}
