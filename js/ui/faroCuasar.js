// La carta del cuásar («El faro que siempre te encuentra»): queda a la vista cuando su videoclip se ha visto entero (o si
// ya se leyó alguna vez) y se abre con una señal de luz breve que sube por los chorros. El videoclip y su cámara son los
// de su escena (js/util/escenasGigantes.js, ESCENA_CUASAR, con el director de js/escena/index.js). El texto está en
// js/data/universo.js (FARO_CUASAR).
import { FARO_CUASAR } from '../data/universo.js';

export function crearFaroCuasar({ escena, progreso, mostrarLectura, alCambiar = () => {} }) {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visto = false, acentoRaf = 0, abriendo = false;
  // La luz sube por cada chorro, de la base a la punta (duración en ms).
  function acento(ms) {
    cancelAnimationFrame(acentoRaf);
    const t0 = performance.now();
    return new Promise(r => {
      const paso = () => {
        const k = (performance.now() - t0) / ms;
        if (k >= 1) { escena.faroAcento(-1); return r(true); }
        escena.faroAcento(k * k * (3 - 2 * k)); acentoRaf = requestAnimationFrame(paso);
      };
      acentoRaf = requestAnimationFrame(paso);
    });
  }
  async function abrirCarta() {
    if (abriendo) return;
    abriendo = true;
    try {
      const { carta } = FARO_CUASAR;
      if (!reducido && escena.destino === 'cuasar') await acento(1400);
      progreso.anotar('cartas', carta.id);
      mostrarLectura(carta.titulo, carta.texto, carta.ceja, { sinFirma: true });
      alCambiar();
    } finally { abriendo = false; }
  }
  return {
    abrirCarta,
    // El videoclip del cuásar ya se ha visto entero: su carta queda a la vista.
    marcarVisto() { visto = true; },
    get cartaLista() { return visto || progreso.tiene('cartas', FARO_CUASAR.carta.id); },
    get accionCarta() { return FARO_CUASAR.accionCarta; }
  };
}
