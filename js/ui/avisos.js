// Cola de avisos: los mensajes breves (el brindis y la frase del cometa) salen de uno en uno; el siguiente espera a que
// el anterior termine de irse (antes podían salir dos a la vez, uno encima del otro, al empezar). Cada clase de aviso
// tiene su presentador: { mostrar(texto), ocultar(), duracion, salida } (salida: lo que tarda en irse, en ms).
// No se repite un aviso seguido: si ya se ve, si ya espera en la cola o si acaba de irse, se descarta.
// Los urgentes (la supernova que va a estallar) pasan delante de todo: quitan el que se ve y salen ya.
// Un aviso puede llevar vigente(): se comprueba al llegarle el turno; si ya no tiene sentido (el cometa se fue, se está
// lejos de casa), se salta.
export function crearAvisos(presentadores, { olvido = 12000 } = {}) {
  const cola = [];
  let actual = null, temporizador = 0, ultimo = { texto: '', fin: -Infinity };

  function siguiente() {
    temporizador = 0;
    if (actual) return;
    while (cola.length) {
      const aviso = cola.shift();
      if (aviso.vigente && !aviso.vigente()) continue;
      actual = aviso;
      const p = presentadores[aviso.tipo];
      p.mostrar(aviso.texto);
      temporizador = setTimeout(terminar, aviso.duracion ?? p.duracion);
      return;
    }
  }
  function terminar() {
    const p = presentadores[actual.tipo];
    p.ocultar();
    ultimo = { texto: actual.texto, fin: Date.now() };
    actual = null;
    temporizador = setTimeout(siguiente, p.salida ?? 0);
  }

  return {
    // texto; tipo: el presentador ('brindis' si no se dice); urgente; vigente(); duracion (ms) propia.
    poner(texto, { tipo = 'brindis', urgente = false, vigente = null, duracion } = {}) {
      if (!texto || !presentadores[tipo]) return false;
      const repetido = actual?.texto === texto || cola.some(a => a.texto === texto) || (ultimo.texto === texto && Date.now() - ultimo.fin < olvido);
      if (repetido && !urgente) return false;
      if (repetido && actual?.texto === texto) return true;   // el urgente ya se está viendo
      const aviso = { texto, tipo, vigente, duracion };
      if (urgente) {
        // Pasa delante: el que se ve se quita al momento (sin esperar a su salida) y el urgente sale ya.
        const i = cola.findIndex(a => a.texto === texto); if (i >= 0) cola.splice(i, 1);
        clearTimeout(temporizador); temporizador = 0;
        if (actual) { presentadores[actual.tipo].ocultar({ inmediato: true }); actual = null; }
        cola.unshift(aviso); siguiente();
        return true;
      }
      cola.push(aviso);
      if (!actual && !temporizador) siguiente();
      return true;
    },
    get actual() { return actual?.texto ?? null; },
    get pendientes() { return cola.map(a => a.texto); }
  };
}
