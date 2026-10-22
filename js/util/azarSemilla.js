// Azar con semilla para construir el universo: el mapa (galaxias, estrellas, nebulosas, el
// vecindario de la supernova) es el mismo en cada carga y en cualquier dispositivo. Durante la
// construcción, Math.random queda sustituido por un generador determinista; después se devuelve
// el original (los destellos y titileos en vivo pueden seguir siendo libres).
export const SEMILLA_UNIVERSO = 20251215;   // nuestra primera estrella

export function generador(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Cede el control al navegador un instante (para no congelar la pantalla mientras se construye el universo).
// Durante la pausa, Math.random vuelve a ser el nativo; al volver se retoma el generador con semilla exactamente
// donde estaba: lo que se construye sigue siendo idéntico en cada carga.
const azarNativo = Math.random;
export async function ceder() { const sembrado = Math.random; Math.random = azarNativo; await new Promise(r => setTimeout(r, 0)); Math.random = sembrado; }

export function sembrarAzar(semilla = SEMILLA_UNIVERSO) {
  const original = Math.random;
  Math.random = generador(semilla);
  return () => { Math.random = original; };
}

// Semilla propia de una parte del universo (por su nombre).
export function semillaDe(nombre, base = SEMILLA_UNIVERSO) {
  let h = base >>> 0;
  for (let i = 0; i < nombre.length; i++) h = Math.imul(h ^ nombre.charCodeAt(i), 2654435761) >>> 0;
  return h;
}
