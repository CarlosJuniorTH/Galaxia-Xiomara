// Azar con semilla para construir el universo: el mapa (galaxias, estrellas, nebulosas, el
// vecindario de la supernova) es el mismo en cada carga y en cualquier dispositivo. Durante la
// construcción, Math.random queda sustituido por un generador determinista; después se devuelve
// el original (los destellos y titileos en vivo pueden seguir siendo libres).
export const SEMILLA_UNIVERSO = 20251215;   // nuestra primera estrella

export function generador(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// El mismo generador por tandas: escribe en salida[desde..hasta) los números siguientes de la serie que parte de «estado»
// (al principio, la semilla) y devuelve el estado para seguir. Mismo cálculo y mismos números que generador(), sin una
// llamada por número: para los bucles de millones de motas (sin compilador, en el iPhone, cada llamada cuenta).
export function rellenarAzar(estado, salida, desde = 0, hasta = salida.length) {
  let a = estado >>> 0;
  for (let i = desde; i < hasta; i++) { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); salida[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  return a;
}

// Cede el control al navegador un instante (para no congelar la pantalla mientras se construye el universo).
// Durante la pausa, Math.random vuelve a ser el nativo; al volver se retoma el generador con semilla exactamente
// donde estaba: lo que se construye sigue siendo idéntico en cada carga.
const azarNativo = Math.random;
let desdeCeder = performance.now();   // cuándo volvió el control de la última pausa (el reloj de los tramos)
export async function ceder() { const sembrado = Math.random; Math.random = azarNativo; await new Promise(r => setTimeout(r, 0)); desdeCeder = performance.now(); Math.random = sembrado; }

// Construcciones por tramos: la parte pesada se escribe como generador (function*) con «yield» entre pasos cortos.
// porTramos la recorre y, en cada yield, mira el reloj: si lleva más de «ms» trabajando desde la última pausa, cede
// (con ceder: el azar con semilla sigue donde estaba). El reloj es uno para todos: varias construcciones seguidas, cada
// una más corta que un tramo, no se suman en una tarea larga. deUnTiron la recorre entera sin pausas, para quien la
// necesita al momento (pruebas, el editor). Es el mismo código en el mismo orden: el resultado es idéntico de las dos
// maneras. Con la CPU ×4 ninguna tarea de la construcción pasa de ~60 ms y la portada sigue animándose. (Cada pausa
// cuesta unos ms: con tramos más cortos la carga sin compilador se alarga sin que la portada vaya más suelta.)
export const TRAMO_MS = 30;
export async function porTramos(it, ms = TRAMO_MS) {
  let r;
  while (!(r = it.next()).done) if (performance.now() - desdeCeder > ms) await ceder();
  return r.value;
}
// Para los bucles que no son generadores: cede solo si ya toca.
export async function cederSiToca(ms = TRAMO_MS) { if (performance.now() - desdeCeder > ms) await ceder(); }
export function deUnTiron(it) { let r; while (!(r = it.next()).done); return r.value; }

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
