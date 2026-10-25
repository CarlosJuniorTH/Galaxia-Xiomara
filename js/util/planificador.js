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
//
// alto: en un PC con pantalla rápida (120, 144, 240 Hz) se dibuja a ~120 por segundo, no a 60: más fluido, y un aviso de
// pantalla que llega tarde cuesta 4 ms en vez de 8 (a 60 en una pantalla de 240 Hz, cada cuadro debe durar justo 4
// ciclos y cualquier retraso lo convertía en 5 y el siguiente en 3: tirones). Si el aparato no sostiene ese ritmo (más
// del 6 % de los cuadros llegan tarde), se queda en 60 el resto de la visita.
export function crearPlanificador({ interaccion = 60, contemplacion = 30, alto = 0, esperaMs = 4000 } = {}) {
  let ultimaActividad = -Infinity, ultimoDibujo = -Infinity, cuadroPedido = true, ultimoTic = -Infinity, periodo = 1000 / 60, cuenta = 0;
  let rebajadoHasta = -Infinity, tardes = 0, contados = 0;
  const intervalos = [];
  const divisor = objetivo => Math.max(1, Math.floor(1000 / periodo / (objetivo * 0.95)));
  return {
    // Al volver de la contemplación, el primer toque se dibuja en el cuadro siguiente (no espera a la cadencia lenta).
    actividad(ahora) { if (ahora - ultimaActividad >= esperaMs) cuadroPedido = true; ultimaActividad = ahora; },
    pedirCuadro() { cuadroPedido = true; },
    get hz() { return 1000 / periodo; },
    get rapido() { return alto > 0 && performance.now() > rebajadoHasta; },
    // Devuelve null si este rAF no debe dibujar; si debe, el modo que se ha usado.
    decidir(ahora, { reposo = false, quieto = false, activo = false } = {}) {
      const d = ahora - ultimoTic; ultimoTic = ahora;
      if (d > 3 && d < 40) {   // (sin pausas ni cuadros perdidos)
        intervalos.push(d); if (intervalos.length > 61) intervalos.shift();
        // Ciclo de la pantalla: la mediana de los intervalos normales (sin los alargados por avisos perdidos).
        if (intervalos.length >= 5 && (intervalos.length < 15 || ++cuenta % 15 === 0)) { const o = intervalos.slice().sort((x, y) => x - y), base = o[Math.floor(o.length * 0.25)], normales = o.filter(x => x <= base * 1.4); periodo = normales[normales.length >> 1]; }
      }
      if (reposo) return null;
      if (quieto) {
        if (!cuadroPedido) return null;
        cuadroPedido = false; ultimoDibujo = ahora;
        return 'quieto';
      }
      const modo = activo || ahora - ultimaActividad < esperaMs ? 'interaccion' : 'contemplacion';
      const rapido = alto > 0 && ahora > rebajadoHasta && contemplacion >= interaccion;
      const objetivo = rapido ? Math.max(alto, modo === 'interaccion' ? interaccion : contemplacion) : modo === 'interaccion' ? interaccion : contemplacion;
      // (Hasta tener medida la pantalla, por tiempo, con un margen del 10 %.)
      // Por TIEMPO, con el intervalo medido (n cuadros de pantalla) y medio cuadro de margen. Contar avisos fallaba: si un
      // cuadro tardaba algo más, el navegador se saltaba avisos y el siguiente dibujo esperaba de más (en una pantalla de
      // 240 o 120 Hz salían cuadros de 25 ms en vez de 16,7: tirones).
      // Ciclos de pantalla transcurridos desde el último dibujo (tiempo / ciclo, redondeado): se dibuja al llegar a n. No le
      // afectan ni los avisos que el navegador se salta (un cuadro pesado) ni la imprecisión de sus marcas de tiempo.
      const n = divisor(objetivo);
      if (!cuadroPedido) {
        if (intervalos.length < 5) { if (ahora - ultimoDibujo < (1000 / objetivo) * 0.9) return null; }
        else if (Math.round((ahora - ultimoDibujo) / periodo) < n) return null;
      }
      // ¿Sostiene el ritmo rápido? (cuadros que llegan con más de medio intervalo de retraso)
      if (rapido && ultimoDibujo > 0 && intervalos.length >= 5) {
        const dt = ahora - ultimoDibujo; if (dt < 100) { contados++; if (dt > n * periodo * 1.4) tardes++; }
        if (contados >= 120) { if (tardes > contados * 0.06) rebajadoHasta = Infinity; tardes = contados = 0; }   // para el resto de la visita: reintentar metía tramos irregulares
      }
      cuadroPedido = false; ultimoDibujo = ahora;
      return modo;
    }
  };
}
