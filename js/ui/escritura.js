// Efecto de máquina de escribir para las cartas: el texto aparece letra por letra
// y al final se muestra la firma. Tocar la carta la completa de golpe.
export function crearEscritura(elTexto, elFirma, velocidad = 32) {
  let tipeo = 0, espera = 0, completo = '';

  function terminar() {
    clearInterval(tipeo); clearTimeout(espera);
    elTexto.textContent = completo;
    elFirma.classList.add('visible');
  }

  function escribir(texto, retraso = 600) {
    parar();
    completo = texto;
    elTexto.textContent = '';
    elFirma.classList.remove('visible');
    let i = 0;
    espera = setTimeout(() => {
      tipeo = setInterval(() => {
        elTexto.textContent = completo.slice(0, ++i);
        if (i >= completo.length) terminar();
      }, velocidad);
    }, retraso);
  }

  function parar() { clearInterval(tipeo); clearTimeout(espera); }

  return { escribir, terminar, parar };
}
