// La carta que sigue a un videoclip de estreno (js/util/guionVuelta.js, ESTRENOS[].carta): aún a oscuras, un sobre cerrado con un
// corazón; al tocarlo se abre y sube la carta. Se lee entera (con desplazamiento si no cabe) y su botón lleva a la galaxia.
// Solo DOM y transformaciones CSS: nada nuevo en la GPU. Devuelve una promesa que se cumple al cerrarla.
export function abrirCartaEstreno({ para, parrafos, firma }) {
  return new Promise(fin => {
    const raiz = document.createElement('div'); raiz.className = 'carta-estreno'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-label', 'Una carta para ti');
    raiz.innerHTML = `
      <button class="sobre" type="button" aria-label="Abrir la carta">
        <span class="sobre-cuerpo"></span><span class="sobre-solapa"></span>
        <svg class="sobre-sello" viewBox="-20 -20 40 38" aria-hidden="true"><path d="M0 15C-9 8-17 2-17-7c0-5 4-9 9-9 3.3 0 6.2 1.8 8 4.5C1.8-14.2 4.7-16 8-16c5 0 9 4 9 9 0 9-8 15-17 22z"/></svg>
      </button>
      <p class="sobre-pie">Para ti, Xiomara · toca para abrir</p>
      <article class="carta-papel"><div class="carta-texto"></div><button class="carta-seguir" type="button">Ir a nuestra galaxia ♡</button></article>`;
    const texto = raiz.querySelector('.carta-texto');
    const titulo = document.createElement('h2'); titulo.textContent = para; texto.append(titulo);
    for (const p of parrafos) { const e = document.createElement('p'); e.textContent = p; texto.append(e); }
    const f = document.createElement('p'); f.className = 'carta-firma'; f.textContent = firma; texto.append(f);
    document.body.append(raiz);
    requestAnimationFrame(() => raiz.classList.add('visible'));
    const sobre = raiz.querySelector('.sobre');
    sobre.addEventListener('click', () => {
      if (raiz.classList.contains('abierta')) return;
      raiz.classList.add('abierta');                                   // la solapa se abre…
      setTimeout(() => { raiz.classList.add('leyendo'); raiz.querySelector('.carta-seguir').focus({ preventScroll: true }); }, 1100);   // …y sube la carta
    });
    raiz.querySelector('.carta-seguir').addEventListener('click', () => {
      raiz.classList.add('saliendo');
      setTimeout(() => { raiz.remove(); fin(); }, 900);
    });
  });
}
