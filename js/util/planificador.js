// Planificador de dibujo (perfil ultra único): decide en cada requestAnimationFrame si se dibuja o no. Nunca hay un ritmo
// intermedio: o se dibuja al ritmo fijo, o no se dibuja.
//   reposo   página oculta, gráficos suspendidos o lectura → no se dibuja
//   quieto   pausa completa → solo cuando se pide un cuadro (cambio de tamaño, toque…)
//   activo   dentro del universo → al ritmo fijo: 60 en el móvil; en el PC, el de la pantalla con tope 120
//   dormido  la vista totalmente quieta, nada animado y sin tocar `esperaMs` (15 s) → no se dibuja (0 FPS). Un toque, una
//            animación o pedirCuadro dibuja en el aviso de pantalla siguiente (el mismo cuadro), ya al ritmo fijo.
// Las animaciones usan tiempo real: dejar de dibujar no cambia su velocidad.
//
// Cadencia como en los juegos: se mide la frecuencia real de la pantalla (mediana del intervalo entre rAF) y se dibuja uno
// de cada n cuadros de pantalla, con el n más alto que no baje del objetivo: 60 a 60 Hz, 60 a 120 Hz en el móvil; en el PC
// 120 a 120 y a 240 Hz, 144 a 144 Hz (un divisor que diera 72 sería un ritmo intermedio, peor). Siempre a intervalos iguales.
// Si el PC no sostiene más de 60 (más del 6 % de los cuadros llegan tarde), se queda en 60 el resto de la visita (una sola
// vez, nunca vuelve a cambiar).
export function crearPlanificador({ objetivo = 60, alto = 0, esperaMs = 15000 } = {}) {
  let ultimaActividad = -Infinity, ultimoDibujo = -Infinity, cuadroPedido = true, ultimoTic = -Infinity, periodo = 1000 / 60, cuenta = 0;
  let rebajado = false, tardes = 0, contados = 0;
  const intervalos = [];
  const divisor = meta => Math.max(1, Math.floor(1000 / periodo / (meta * 0.95)));
  return {
    // Un toque: si estaba dormido, se dibuja en el cuadro siguiente.
    // (Solo al despertar: un gesto que ya se dibuja a ritmo no se adelanta a la cadencia.)
    actividad(ahora) { if (ahora - ultimaActividad >= esperaMs) cuadroPedido = true; ultimaActividad = ahora; },
    pedirCuadro() { cuadroPedido = true; },
    get hz() { return 1000 / periodo; },
    get rapido() { return alto > objetivo && !rebajado; },
    // Devuelve null si este rAF no debe dibujar; si debe, el modo ('activo' o 'quieto').
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
      // Dormido: nada que dibujar hasta un toque, una animación o un cuadro pedido.
      if (!activo && !cuadroPedido && ahora - ultimaActividad >= esperaMs) return null;
      const rapido = alto > objetivo && !rebajado, meta = rapido ? alto : objetivo, n = divisor(meta);
      // Por TIEMPO, con el intervalo medido: ciclos de pantalla transcurridos desde el último dibujo (tiempo / ciclo,
      // redondeado); se dibuja al llegar a n. No le afectan los avisos que el navegador se salta ni la imprecisión de sus
      // marcas. (Hasta tener medida la pantalla, por tiempo con un margen del 10 %.) Un cuadro pedido no espera.
      if (!cuadroPedido) {
        if (intervalos.length < 5) { if (ahora - ultimoDibujo < (1000 / meta) * 0.9) return null; }
        else if (Math.round((ahora - ultimoDibujo) / periodo) < n) return null;
      }
      // ¿Sostiene el PC el ritmo rápido? (cuadros que llegan con más de medio intervalo de retraso)
      if (rapido && ultimoDibujo > 0 && intervalos.length >= 5) {
        const dt = ahora - ultimoDibujo; if (dt < 100) { contados++; if (dt > n * periodo * 1.4) tardes++; }
        if (contados >= 120) { if (tardes > contados * 0.06) rebajado = true; tardes = contados = 0; }
      }
      cuadroPedido = false; ultimoDibujo = ahora;
      return 'activo';
    }
  };
}
