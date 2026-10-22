const VERSION = 2;
export const CLAVE = 'xiomara:universo:v2';
export function estadoVacio() {
  return { version: VERSION, estrellas: [], cartas: [], constelaciones: [], suenos: [], capsulas: [], cometas: [], visitas: [], celebraciones: [], iniciado: new Date().toISOString() };
}
export function sanearEstado(valor) {
  const limpio = estadoVacio();
  if (!valor || valor.version !== VERSION) return limpio;
  for (const clave of Object.keys(limpio)) {
    if (Array.isArray(limpio[clave]) && Array.isArray(valor[clave])) limpio[clave] = [...new Set(valor[clave].filter(x => typeof x === 'string' && x.length < 100))];
  }
  if (typeof valor.iniciado === 'string') limpio.iniciado = valor.iniciado;
  return limpio;
}
export function crearProgreso(almacen = globalThis.localStorage, avisar = () => {}) {
  let estado = estadoVacio(), disponible = true;
  try { estado = sanearEstado(JSON.parse(almacen.getItem(CLAVE))); } catch { disponible = false; }
  function guardar() {
    try { almacen.setItem(CLAVE, JSON.stringify(estado)); disponible = true; }
    catch { disponible = false; avisar('Este navegador no permite guardar. Tu viaje seguirá durante esta visita.'); }
    return disponible;
  }
  return {
    get estado() { return structuredClone(estado); },
    get disponible() { return disponible; },
    tiene(tipo, id) { return estado[tipo]?.includes(String(id)) || false; },
    anotar(tipo, id) {
      if (!Array.isArray(estado[tipo]) || estado[tipo].includes(String(id))) return false;
      estado[tipo].push(String(id)); guardar(); return true;
    },
    retirar(tipo, id) {
      if (!Array.isArray(estado[tipo])) return false;
      const antes = estado[tipo].length; estado[tipo] = estado[tipo].filter(x => x !== String(id)); guardar();
      return estado[tipo].length !== antes;
    },
    importar(valor) {
      if (valor?.version !== VERSION || !Object.keys(estadoVacio()).filter(k => Array.isArray(estadoVacio()[k])).every(k => Array.isArray(valor[k]))) throw Error('La copia del viaje no tiene un formato válido.');
      const datos = sanearEstado(valor);
      for (const clave of Object.keys(datos)) if (Array.isArray(datos[clave])) estado[clave] = [...new Set([...estado[clave], ...datos[clave]])];
      guardar(); return true;
    },
    reiniciar() {
      const antes = structuredClone(estado);
      try { almacen.setItem(`${CLAVE}:viaje-anterior`, JSON.stringify(antes)); }
      catch { avisar('No se pudo guardar la copia del viaje anterior. Conservamos tus descubrimientos y no reiniciamos.'); return false; }
      estado = estadoVacio(); guardar(); return estado;
    },
    restaurar() {
      try {
        const previo = almacen.getItem(`${CLAVE}:viaje-anterior`);
        if (!previo) return false;
        estado = sanearEstado(JSON.parse(previo)); guardar(); return true;
      } catch { return false; }
    }
  };
}
