// Planificador de dibujo: decide en cada requestAnimationFrame si se dibuja o no.
// rAF sigue la frecuencia de la pantalla (puede ser 90, 120 o 144 Hz); aquí se fija
// un objetivo propio según lo que está pasando:
//   reposo         página oculta, gráficos suspendidos o lectura → no se dibuja
//   quieto         pausa completa → solo cuando se pide un cuadro (cambio de tamaño, toque…)
//   interaccion    gestos, vuelos, efectos o actividad reciente → hasta `interaccion` FPS
//   contemplacion  sin actividad durante `esperaMs` → hasta `contemplacion` FPS
// Las animaciones usan tiempo real, así que bajar la cadencia no cambia su velocidad.
//
// Cadencia como en los juegos: se mide la frecuencia real de la pantalla (mediana del intervalo entre rAF) y se dibuja
// uno de cada n cuadros de pantalla, con el n más alto que no baje del objetivo: 60 a 60 Hz, 60 a 120 Hz, 90 a 90 Hz y
// 72 a 144 Hz (antes, contando tiempo con margen, una pantalla de 90 Hz daba 45 y una de 144, 48), y siempre a intervalos
// iguales. Un toque o un aviso (actividad, pedirCuadro) dibuja en el cuadro siguiente.
export function crearPlanificador({ interaccion = 60, contemplacion = 30, esperaMs = 4000 } = {}) {
  let ultimaActividad = -Infinity, ultimoDibujo = -Infinity, cuadroPedido = true, ultimoTic = -Infinity, tics = 0, periodo = 1000 / 60, cuenta = 0;
  const intervalos = [];
  const divisor = objetivo => Math.max(1, Math.floor(1000 / periodo / (objetivo * 0.95)));
  return {
    // Al volver de la contemplación, el primer toque se dibuja en el cuadro siguiente (no espera a la cadencia lenta).
    actividad(ahora) { if (ahora - ultimaActividad >= esperaMs) cuadroPedido = true; ultimaActividad = ahora; },
    pedirCuadro() { cuadroPedido = true; },
    get hz() { return 1000 / periodo; },
    // Devuelve null si este rAF no debe dibujar; si debe, el modo que se ha usado.
    decidir(ahora, { reposo = false, quieto = false, activo = false } = {}) {
      const d = ahora - ultimoTic; ultimoTic = ahora;
      if (d > 3 && d < 40) {   // (sin pausas ni cuadros perdidos)
        intervalos.push(d); if (intervalos.length > 61) intervalos.shift();
        if (intervalos.length >= 5 && (intervalos.length < 15 || ++cuenta % 15 === 0)) { const o = intervalos.slice().sort((x, y) => x - y); periodo = o[o.length >> 1]; }
      }
      if (reposo) return null;
      if (quieto) {
        if (!cuadroPedido) return null;
        cuadroPedido = false; tics = 0; ultimoDibujo = ahora;
        return 'quieto';
      }
      const modo = activo || ahora - ultimaActividad < esperaMs ? 'interaccion' : 'contemplacion';
      const objetivo = modo === 'interaccion' ? interaccion : contemplacion;
      // (Hasta tener medida la pantalla, por tiempo, con un margen del 10 %.)
      if (!cuadroPedido && (intervalos.length < 5 ? ahora - ultimoDibujo < (1000 / objetivo) * 0.9 : ++tics < divisor(objetivo))) return null;
      cuadroPedido = false; tics = 0; ultimoDibujo = ahora;
      return modo;
    }
  };
}
