// Dónde se dejó el viaje: último lugar visitado y paso del recorrido, más si la portada
// ya se ha visto (para entrar directamente en visitas siguientes). Aparte del progreso de
// descubrimientos: perderlo nunca borra estrellas ni cartas.
export const CLAVE_VIAJE = 'xiomara:universo:v2:lugar';
export const CLAVE_PORTADA = 'xiomara:portada-vista';

export function crearViaje(almacen) {
  const leer = () => { try { return JSON.parse(almacen.getItem(CLAVE_VIAJE)) || {}; } catch { return {}; } };
  let estado = leer();
  const guardar = () => { try { almacen.setItem(CLAVE_VIAJE, JSON.stringify(estado)); } catch {} };
  return {
    get destino() { return typeof estado.destino === 'string' ? estado.destino : null; },
    get paso() { return Number.isInteger(estado.paso) ? estado.paso : null; },
    anotarDestino(id) { if (id === 'cometa') return; estado.destino = id; estado.fecha = Date.now(); guardar(); },
    anotarPaso(paso) { if (paso === null) delete estado.paso; else estado.paso = paso; guardar(); },
    get portadaVista() { try { return almacen.getItem(CLAVE_PORTADA) === '1'; } catch { return false; } },
    marcarPortada() { try { almacen.setItem(CLAVE_PORTADA, '1'); } catch {} },
    // «Volver a descubrirlo todo»: también vuelve la presentación completa.
    olvidar() { estado = {}; try { almacen.removeItem?.(CLAVE_VIAJE); almacen.removeItem?.(CLAVE_PORTADA); } catch {} }
  };
}
