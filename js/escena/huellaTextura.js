// Huella de una textura procedural (tipo + opciones): el nombre de su imagen horneada (scripts/hornear-texturas.mjs).
// FNV-1a de 32 bits sobre el JSON de las opciones: la misma en el navegador y al hornear.
export function huellaTextura(tipo, opciones) {
  const s = JSON.stringify([tipo, opciones]); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
