// Ventanas heredadas: foco contenido, Escape y devolución al botón de origen.
export function crearVentana(id, { alCerrar } = {}) {
  const el = document.getElementById(id);
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  const titulo = el.querySelector('h2'); if (titulo?.id) el.setAttribute('aria-labelledby', titulo.id);
  let anterior = null;
  const enfocables = () => [...el.querySelectorAll('button, a[href], [tabindex="0"]')].filter(x => !x.disabled);
  function abrir() {
    anterior = document.activeElement; el.inert = false;
    el.classList.add('abierta'); el.setAttribute('aria-hidden', 'false');
    enfocables()[0]?.focus({ preventScroll: true });
  }
  function cerrar() {
    if (!el.classList.contains('abierta')) return;
    el.classList.remove('abierta'); el.setAttribute('aria-hidden', 'true'); el.inert = true;
    anterior?.focus({ preventScroll: true }); alCerrar?.();
  }
  el.inert = true;
  el.querySelector('.cerrar')?.addEventListener('click', e => { e.stopPropagation(); cerrar(); });
  el.addEventListener('click', e => { if (e.target === el) cerrar(); });
  el.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); cerrar(); }
    if (e.key === 'Tab') {
      const lista = enfocables(), primero = lista[0], ultimo = lista.at(-1);
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo?.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
    }
  });
  return { el, abrir, cerrar };
}
