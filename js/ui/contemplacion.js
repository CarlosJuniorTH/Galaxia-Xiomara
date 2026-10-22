// Modo contemplación: tras unos segundos sin tocar, la navegación secundaria se retira
// con suavidad y deja respirar al universo. Cualquier toque, tecla o foco la devuelve;
// ese primer toque solo despierta la interfaz (no envía un beso ni abre nada).
export function crearContemplacion({ espera = 9000, permitido = () => true } = {}) {
  let temporizador = 0, despertadoEn = -Infinity;
  const cuerpo = document.body;
  function dormir() {
    if (permitido()) cuerpo.classList.add('contemplando');
    else temporizador = setTimeout(dormir, espera);
  }
  function despertar() {
    if (cuerpo.classList.contains('contemplando')) { cuerpo.classList.remove('contemplando'); despertadoEn = performance.now(); }
    clearTimeout(temporizador); temporizador = setTimeout(dormir, espera);
  }
  // Fase de captura: se despierta antes de que el lienzo interprete el toque.
  for (const evento of ['pointerdown', 'keydown', 'wheel', 'focusin']) document.addEventListener(evento, despertar, { capture: true, passive: true });
  document.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') despertar(); }, { passive: true });
  // Otras partes pueden devolver la interfaz (p. ej., al terminar la ceremonia de la supernova).
  document.addEventListener('despertar-interfaz', despertar);
  despertar();
  return { recienDespertado: () => performance.now() - despertadoEn < 600, despertar };
}
