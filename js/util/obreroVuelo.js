// Obrero (módulo) del perfil de los vuelos (js/util/perfilVuelo.js): se calcula aquí, fuera del hilo principal, mientras
// la cámara aún gira hacia el destino. Ningún cuadro del viaje lo paga (antes, hasta 15 ms de golpe en un PC y ~60 en un
// móvil, el tirón del arranque de cada viaje largo).
import { calcularPerfil } from './perfilVuelo.js';
self.onmessage = ({ data: { id, args } }) => {
  try { const r = calcularPerfil(args); self.postMessage({ id, r }, [r.tabla.buffer, r.sm.buffer]); }
  catch (e) { self.postMessage({ id, error: String(e?.message || e) }); }
};
