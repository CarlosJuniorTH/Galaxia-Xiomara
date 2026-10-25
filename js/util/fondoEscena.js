// Atenuación del fondo durante el videoclip de un gigante: las nebulosas del catálogo que quedan cerca de él (sus nubes
// rojas y moradas llenan el encuadre y tapan la historia) bajan su opacidad mientras dura la escena. La escena escribe
// aquí su centro (coordenadas del mundo), el radio y cuánto se apagan (0 nada, 1 del todo); js/escena/galaxiasLejanas.js
// lo lee en cada cuadro. Sin three.js ni memoria nueva por cuadro.
export const FONDO_ESCENA = { x: 0, y: 0, z: 0, radio: 0, k: 0 };
export function atenuarFondo(x, y, z, radio, k) { const f = FONDO_ESCENA; f.x = x; f.y = y; f.z = z; f.radio = radio; f.k = k; }
// Factor de opacidad (0–1) para una nebulosa en (x, y, z).
export function factorFondo(x, y, z) {
  const f = FONDO_ESCENA; if (!(f.k > 0) || !(f.radio > 0)) return 1;
  const dx = x - f.x, dy = y - f.y, dz = z - f.z;
  return dx * dx + dy * dy + dz * dz < f.radio * f.radio ? 1 - f.k : 1;
}
