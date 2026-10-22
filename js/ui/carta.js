// Carta de amor del sobre 💌, se escribe sola letra por letra
import { crearVentana } from './ventana.js';
import { crearEscritura } from './escritura.js';

export function crearCarta(config) {
  const boton = document.getElementById('btn-carta');
  document.getElementById('carta-titulo').textContent = config.cartaTitulo;
  document.getElementById('carta-firma').textContent = config.firma;

  const escritura = crearEscritura(document.getElementById('carta-texto'), document.getElementById('carta-firma'));
  const ventana = crearVentana('carta', { alCerrar: () => escritura.parar() });

  boton.addEventListener('click', () => {
    boton.classList.add('leida');
    ventana.abrir();
    escritura.escribir(config.carta.join('\n\n'));
  });

  ventana.el.querySelector('.papel').addEventListener('click', e => {
    if (!e.target.closest('.cerrar')) escritura.terminar();
  });
}
