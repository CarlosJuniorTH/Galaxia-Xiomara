// Mensajes que aparecen abajo uno tras otro + pista de controles
import { saludoMomento } from '../util/tiempo.js';
import { esMovil } from '../util/dispositivo.js';

export function crearMensajes(config) {
  const el = document.getElementById('mensaje');
  const pista = document.getElementById('pista');
  pista.textContent = esMovil
    ? 'Desliza para girar · pellizca para acercar · toca para enviar amor'
    : 'Arrastra para girar · rueda para acercar · clic para enviar amor';

  let i = 0, intervalo = 0;
  function mostrar(texto) {
    el.classList.add('fuera');
    setTimeout(() => { el.textContent = texto; el.classList.remove('fuera'); }, 1200);
  }
  const siguiente = () => { const turno = i++; mostrar(turno % (config.mensajes.length + 1) === 0 ? saludoMomento() : config.mensajes[(turno - 1) % config.mensajes.length]); };

  return {
    iniciar() {
      setTimeout(() => { siguiente(); intervalo = setInterval(siguiente, 8000); }, 9500);
      setTimeout(() => {
        pista.classList.add('fuera');
        document.getElementById('pastilla-estrellas').classList.add('visible');
      }, 16000);
    },
    // Muestra un mensaje puntual y reinicia el ciclo
    decir(texto) {
      clearInterval(intervalo);
      mostrar(texto);
      intervalo = setInterval(siguiente, 8000);
    }
  };
}
