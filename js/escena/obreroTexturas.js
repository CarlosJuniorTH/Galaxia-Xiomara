// Web Worker: calcula las texturas de los planetas fuera del hilo principal.
import { GENERADORES } from './texturasPlaneta.js';

self.onmessage = ({ data: { id, tipo, opciones } }) => {
  try {
    const r = GENERADORES[tipo](opciones);
    const datos = r instanceof Uint8ClampedArray ? { pixeles: r } : r;
    self.postMessage({ id, datos }, Object.values(datos).map(d => d.buffer));
  } catch (error) { self.postMessage({ id, error: String(error) }); }
};
