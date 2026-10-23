// El faro que siempre te encuentra: la experiencia del cuásar. Un recorrido de unos 30 s con una
// frase cada vez (cámara por fuera, una luz que sube por los chorros) y, al terminar, una carta.
// Estados explícitos: 'inactivo' → 'secuencia' → 'inactivo'. Se puede saltar (botón o Esc) y se
// cancela sola al salir del cuásar, viajar, ocultar la pestaña o girar el teléfono: entonces no
// queda ninguna frase, luz ni cámara bloqueada. Los textos están en js/data/universo.js.
import { FARO_CUASAR } from '../data/universo.js';
import { vista } from '../util/vista.js';

const $ = id => document.getElementById(id);
const espera = ms => new Promise(r => setTimeout(r, ms));

export function crearFaroCuasar({ escena, progreso, mostrarLectura, alCambiar = () => {} }) {
  const caja = $('faro-frase'), texto = $('faro-frase-texto'), saltar = $('faro-saltar');
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let estado = 'inactivo', revision = 0, visto = false, acentoRaf = 0, anchoInicio = vista.ancho, altoInicio = vista.alto;

  const vigente = mia => mia === revision && estado === 'secuencia' && escena.destino === 'cuasar';
  function frase(t) {
    if (!t) { caja.classList.remove('visible'); return espera(reducido ? 0 : 700).then(() => { if (!caja.classList.contains('visible')) caja.hidden = true; }); }
    texto.textContent = t; caja.hidden = false; requestAnimationFrame(() => caja.classList.add('visible'));
    return Promise.resolve();
  }
  function apagarFrase() { caja.classList.remove('visible'); caja.hidden = true; texto.textContent = ''; }
  // La luz sube por cada chorro, de la base a la punta (duración en ms).
  function acento(ms, mia) {
    cancelAnimationFrame(acentoRaf);
    const t0 = performance.now();
    return new Promise(r => {
      const paso = () => {
        const k = (performance.now() - t0) / ms;
        if (mia !== undefined && mia !== revision) { escena.faroAcento(-1); return r(false); }
        if (k >= 1) { escena.faroAcento(-1); return r(true); }
        escena.faroAcento(k * k * (3 - 2 * k)); acentoRaf = requestAnimationFrame(paso);
      };
      acentoRaf = requestAnimationFrame(paso);
    });
  }
  // Una pausa que termina antes si la secuencia deja de ser vigente.
  async function pausa(ms, mia) { const fin = performance.now() + ms; while (performance.now() < fin) { if (!vigente(mia)) return false; await espera(Math.min(120, fin - performance.now())); } return vigente(mia); }

  async function iniciar() {
    if (estado !== 'inactivo' || escena.destino !== 'cuasar' || escena.viajando) return false;
    estado = 'secuencia'; const mia = ++revision; anchoInicio = vista.ancho; altoInicio = vista.alto;
    document.body.classList.add('faro-en-curso'); saltar.hidden = false;
    const [a, b, c, d] = FARO_CUASAR.frases;
    try {
      // A: la cámara vuelve a un encuadre exterior tranquilo.
      await frase(a); if (!(await escena.faro('inicio')) || !(await pausa(900, mia))) return terminar(mia, false);
      // B: un arco lento por fuera de la galaxia.
      await frase(null); if (!vigente(mia)) return terminar(mia, false);
      await frase(b); if (!(await escena.faro('arco')) || !vigente(mia)) return terminar(mia, false);
      // C: una luz recorre cada chorro.
      await frase(null); if (!vigente(mia)) return terminar(mia, false);
      await frase(c); const luz = acento(reducido ? 2600 : 6500, mia);
      if (!(await escena.faro('chorros')) || !vigente(mia)) return terminar(mia, false);
      await luz; if (!vigente(mia)) return terminar(mia, false);
      // D: encuadre estable y la última frase, con tiempo para leerla.
      await frase(null); if (!vigente(mia)) return terminar(mia, false);
      await frase(d); if (!(await escena.faro('final')) || !(await pausa(4200, mia))) return terminar(mia, false);
      return terminar(mia, true);
    } catch (e) { console.warn('Faro del cuásar interrumpido', e); return terminar(mia, false); }
  }
  // Fin de la secuencia (completa o no): nada queda encendido ni bloqueado.
  function terminar(mia, completa) {
    if (mia !== revision) return false;
    revision++; estado = 'inactivo';
    cancelAnimationFrame(acentoRaf); escena.faroAcento(-1); apagarFrase();
    saltar.hidden = true; document.body.classList.remove('faro-en-curso');
    if (completa) visto = true;
    alCambiar();
    return completa;
  }
  // Saltar: se interrumpe el recorrido donde esté (la cámara se queda ahí, libre) y ya espera la carta.
  function saltarSecuencia() {
    if (estado !== 'secuencia') return;
    const mia = revision; if (escena.viajando) escena.cancelarViaje();
    visto = true; terminar(mia, false);
  }
  function cancelar() {
    if (estado !== 'secuencia') return;
    const mia = revision; if (escena.viajando && escena.destino === 'cuasar') escena.cancelarViaje();
    terminar(mia, false);
  }
  // La carta: una señal de luz breve por los chorros y la carta se abre.
  async function abrirCarta() {
    if (estado !== 'inactivo') return;
    const { carta } = FARO_CUASAR;
    if (!reducido && escena.destino === 'cuasar') await acento(1400);
    progreso.anotar('cartas', carta.id);
    mostrarLectura(carta.titulo, carta.texto, carta.ceja, { sinFirma: true });
    alCambiar();
  }

  saltar.addEventListener('click', saltarSecuencia);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && estado === 'secuencia') saltarSecuencia(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelar(); });
  // Girar el teléfono (o cambiar mucho la ventana) durante el recorrido lo cancela: la cámara queda libre.
  addEventListener('resize', () => {
    if (estado !== 'secuencia') return;
    if ((vista.ancho > vista.alto) !== (anchoInicio > altoInicio) || Math.abs(vista.ancho - anchoInicio) > 120) cancelar();
  });

  return {
    iniciar, cancelar, abrirCarta,
    get estado() { return estado; },
    // La carta está a la vista si ya se completó (o saltó) el recorrido o si ya se leyó alguna vez.
    get cartaLista() { return visto || progreso.tiene('cartas', FARO_CUASAR.carta.id); },
    get accionCarta() { return FARO_CUASAR.accionCarta; }
  };
}
