// Planificador de dibujo: decide en cada requestAnimationFrame si se dibuja o no.
// rAF sigue la frecuencia de la pantalla (puede ser 90, 120 o 144 Hz); aquí se fija
// un objetivo propio según lo que está pasando:
//   reposo         página oculta, gráficos suspendidos o lectura → no se dibuja
//   quieto         pausa completa → solo cuando se pide un cuadro (cambio de tamaño, toque…)
//   interaccion    gestos, vuelos, efectos o actividad reciente → hasta `interaccion` FPS
//   contemplacion  sin actividad durante `esperaMs` → hasta `contemplacion` FPS
// Las animaciones usan tiempo real, así que bajar la cadencia no cambia su velocidad.
export function crearPlanificador({ interaccion = 60, contemplacion = 30, esperaMs = 4000 } = {}) {
  let ultimaActividad = -Infinity, ultimoDibujo = -Infinity, cuadroPedido = true;
  return {
    actividad(ahora) { ultimaActividad = ahora; },
    pedirCuadro() { cuadroPedido = true; },
    // Devuelve null si este rAF no debe dibujar; si debe, el modo que se ha usado.
    decidir(ahora, { reposo = false, quieto = false, activo = false } = {}) {
      if (reposo) return null;
      if (quieto) {
        if (!cuadroPedido) return null;
        cuadroPedido = false; ultimoDibujo = ahora;
        return 'quieto';
      }
      const modo = activo || ahora - ultimaActividad < esperaMs ? 'interaccion' : 'contemplacion';
      const objetivo = modo === 'interaccion' ? interaccion : contemplacion;
      // Margen del 10 %: en una pantalla de 60 Hz se dibuja cada cuadro; a 120 Hz, uno de cada dos.
      if (!cuadroPedido && ahora - ultimoDibujo < (1000 / objetivo) * 0.9) return null;
      cuadroPedido = false; ultimoDibujo = ahora;
      return modo;
    }
  };
}
