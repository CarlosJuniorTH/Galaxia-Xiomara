// Reloj maestro de toda la experiencia: un solo tiempo (segundos, continuo y que nunca va hacia atrás) que leen la intro,
// los vuelos, los viajes, la supernova y las escenas de los gigantes, y en el que la banda sonora programa sus canciones.
//
// Con audio, sale del AudioContext: el instante del audio que suena AHORA por los altavoces (getOutputTimestamp, o
// currentTime menos la latencia de salida donde no lo hay). Lo que se ve es lo que se oye: una canción programada con
// AudioBufferSourceNode avanza exactamente a ese ritmo, y una animación que lee este reloj no se separa de ella nunca.
// Sin audio (música apagada desde el principio, o el contexto parado por el sistema), sale de performance.now().
//
// Se lee una vez por cuadro: el instante del cuadro (document.timeline.currentTime, el mismo para todo lo que se dibuja en
// él) más lo que tarda en verse (un cuadro). Entre una lectura del audio y la siguiente se interpola con el reloj de la
// página; el desvío entre los dos (deriva de relojes, cuantos de 128 muestras) se corrige un 10 % por cuadro: décimas de
// milisegundo, nunca un salto. Si el audio se para (el sistema lo retiene), la imagen lo espera: nunca va hacia atrás. Al cambiar de origen (audio ↔ página) el tiempo sigue desde donde iba.
//
// Con el contexto suspendido (pestaña oculta) el reloj se queda quieto, como la música; al volver sigue desde ahí.
const PRESENTACION = 1 / 60;   // lo que se dibuja en este cuadro se ve en el siguiente refresco
const ESPERA_PARADO = 0.5;     // contexto parado con la página a la vista: tras esto, el reloj sigue con el de la página
const TOPE_PAGINA = 0.25;
const SALTO = 0.03;            // más que esto entre audio y página no es deriva: el audio se paró (o cambió su salida); se sigue a él      // con el reloj de la página, un hueco mayor (pestaña oculta, depurador) no cuenta entero

export function crearRelojMaestro({ ahoraPagina = () => globalThis.performance?.now() ?? Date.now(), instanteCuadro = null, oculta = () => !!globalThis.document?.hidden } = {}) {
  const cuadroDe = instanteCuadro ?? (() => { const t = globalThis.document?.timeline?.currentTime; return Number.isFinite(t) ? t : ahoraPagina(); });
  let ctx = null, dominio = 'pagina';
  let s = 0, pUlt = null;                // último valor y el instante de página (ms) en que se calculó
  let kPagina = null;                     // s = p/1000 + kPagina con el reloj de la página
  let k = 0, filtro = null;               // s = oido + k con el del audio; filtro: (oído − p/1000), suavizado
  let crudo = null;                       // último (oído − p/1000) sin suavizar (para medir el desfase)
  let paradoDesde = null, oidoUlt = null; // oidoUlt: último instante oído (tiempo del contexto)
  const oyentes = new Set();

  // Instante (tiempo del contexto) que suena por los altavoces en el instante de página p (ms).
  function oidoEn(p) {
    const ts = ctx.getOutputTimestamp?.();
    if (ts && ts.performanceTime > 0 && Number.isFinite(ts.contextTime)) return ts.contextTime + (p - ts.performanceTime) / 1000;
    return ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0) + (p - ahoraPagina()) / 1000;
  }
  function actualizar(p) {
    if (p === pUlt) return s;
    const primera = pUlt === null, dp = primera ? 0 : (p - pUlt) / 1000;
    pUlt = p;
    const pv = p + PRESENTACION * 1000;
    if (ctx && ctx.state === 'running') {
      paradoDesde = null;
      const oido = oidoEn(pv), r = oido - pv / 1000;
      crudo = r;
      if (dominio !== 'audio') {
        // Del reloj de la página al del audio: sigue desde donde iba.
        const sAhora = primera || kPagina === null ? 0 : Math.max(s, pv / 1000 + kPagina);
        filtro = r; k = sAhora - oido; dominio = 'audio';
      } else if (filtro === null || Math.abs(r - filtro) > SALTO) filtro = r;   // el contexto estuvo parado: sigue desde su instante
      else filtro += (r - filtro) * 0.1;
      oidoUlt = filtro + pv / 1000;
      s = Math.max(s, oidoUlt + k);
      return s;
    }
    if (dominio === 'audio') {
      // Contexto parado: el reloj se queda quieto (la música también) mientras la página está oculta o un momento
      // (al volver, el contexto tarda unos milisegundos en reanudarse); si sigue parado, el de la página toma el relevo.
      if (paradoDesde === null) paradoDesde = p;
      if (oculta() || (p - paradoDesde) / 1000 < ESPERA_PARADO) return s;
      dominio = 'pagina'; kPagina = s - pv / 1000; filtro = null; crudo = null;
      return s;
    }
    if (kPagina === null) kPagina = s - pv / 1000;
    else if (dp > TOPE_PAGINA) kPagina -= dp - TOPE_PAGINA;
    s = Math.max(s, pv / 1000 + kPagina);
    return s;
  }
  return {
    // El contexto de audio de la banda sonora (se crea parado; cuenta en cuanto suena).
    usarContexto(c) { ctx = c; },
    get contexto() { return ctx; },
    get dominio() { return dominio; },
    // Segundos del reloj maestro en este cuadro.
    ahora() { return actualizar(cuadroDe()); },
    // Conversión al tiempo del contexto de audio (para programar en él) y al revés. Solo con el reloj del audio.
    aContexto: t => t - k,
    deContexto: t => t + k,
    // Lo que el contexto lleva por delante de lo que se oye (latencia de salida): una canción programada en
    // ctx.currentTime + x empieza a oírse dentro de x + esto.
    latencia() { if (!ctx || ctx.state !== 'running' || dominio !== 'audio') return 0; this.ahora(); return Math.max(0, ctx.currentTime - oidoUlt); },
    // Desfase entre lo que se ve (el reloj suavizado) y lo que se oye (la lectura del audio sin suavizar), en ms.
    desfase() { this.ahora(); return dominio === 'audio' && crudo !== null && filtro !== null ? (filtro - crudo) * 1000 : 0; },
    // Una vez por cuadro, desde el bucle de dibujo: avanza y avisa a quien lo necesite en el cuadro (marcas de la banda).
    cuadro(p = cuadroDe()) { const t = actualizar(p); for (const f of oyentes) { try { f(t); } catch (e) { console.error(e); } } return t; },
    alCuadro(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
  };
}

export const relojMaestro = crearRelojMaestro();
if (typeof location !== 'undefined' && location.hash === '#debug') globalThis.__relojMaestro = relojMaestro;
