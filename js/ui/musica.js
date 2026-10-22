import { crearSonidoSupernova } from './sonidoSupernova.js';
// Canción opcional + una pequeña composición ambiental original, generada en el dispositivo.
// No necesita descargar audio de terceros. El sonido comienza siempre con un gesto.
export function crearMusica(config) {
  const audio = document.getElementById('musica'), boton = document.getElementById('btn-musica');
  let contexto, salida, temporizador, quiere = false, suspendida = false, sintetico = !config.cancion;
  let indice = 0, notasVivas = new Set();
  const acordes = [[48, 55, 59, 64, 67], [45, 52, 55, 59, 64], [41, 48, 52, 57, 60], [43, 50, 55, 57, 62]];
  const ui = sonando => { boton.classList.toggle('pausado', !sonando); boton.setAttribute('aria-label', sonando ? 'Pausar música' : 'Reproducir música'); boton.setAttribute('aria-pressed', String(sonando)); };
  function preparar() {
    if (contexto) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw Error('Audio no disponible');
    contexto = new AudioCtx(); salida = contexto.createGain(); salida.gain.value = 0;
    const filtro = contexto.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 1700;
    const eco = contexto.createDelay(1); eco.delayTime.value = 0.37;
    const retorno = contexto.createGain(); retorno.gain.value = 0.24;
    salida.connect(filtro); filtro.connect(contexto.destination); filtro.connect(eco); eco.connect(retorno); retorno.connect(eco); retorno.connect(contexto.destination);
  }
  function nota(midi, retraso, duracion = 5) {
    const t = contexto.currentTime + retraso, osc = contexto.createOscillator(), gain = contexto.createGain();
    osc.type = 'sine'; osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.085, t + 0.15); gain.gain.exponentialRampToValueAtTime(0.001, t + duracion);
    osc.connect(gain); gain.connect(salida); osc.start(t); osc.stop(t + duracion + 0.1); notasVivas.add(osc);
    osc.onended = () => { notasVivas.delete(osc); osc.disconnect(); gain.disconnect(); };
  }
  function compas() {
    if (!quiere || document.hidden) return;
    const acorde = acordes[indice++ % acordes.length];
    acorde.forEach((n, i) => nota(n + 12, i * 0.7, 5.5)); nota(acorde[0], 0, 6.5);
    temporizador = setTimeout(compas, 6200);
  }
  async function ambiente() {
    preparar(); await contexto.resume(); if (!quiere) return;
    clearTimeout(temporizador); salida.gain.cancelScheduledValues(contexto.currentTime); salida.gain.setTargetAtTime(Math.min(0.75, config.volumen * 0.7), contexto.currentTime, 1.2); compas(); ui(true);
  }
  async function reproducir(desdeInicio = false) {
    quiere = true;
    try {
      if (sintetico) await ambiente();
      else { if (desdeInicio) audio.currentTime = config.inicioCancion || 0; audio.volume = Math.min(1, config.volumen); await audio.play(); ui(true); }
    } catch { ui(false); }
  }
  function pausar() {
    quiere = false; clearTimeout(temporizador); audio.pause();
    if (contexto) { salida.gain.cancelScheduledValues(contexto.currentTime); salida.gain.setTargetAtTime(0, contexto.currentTime, 0.18); }
    ui(false);
  }
  if (config.cancion) {
    audio.src = config.cancion;
    audio.addEventListener('error', () => { sintetico = true; if (quiere) ambiente().catch(() => ui(false)); });
  }
  boton.addEventListener('click', () => quiere ? pausar() : reproducir());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && quiere) {
      suspendida = true; clearTimeout(temporizador); audio.pause(); contexto?.suspend().catch(() => {}); ui(false);
    } else if (!document.hidden && suspendida) { suspendida = false; if (quiere) reproducir(); }
  });
  return { reproducir, pausar,
    supernova() {
      if (!quiere) return null;
      try { preparar(); } catch { return null; }
      return crearSonidoSupernova({ contexto, salida, permitido: () => quiere,
        atenuar: factor => {
          if (contexto && quiere) { salida.gain.cancelScheduledValues(contexto.currentTime); salida.gain.setTargetAtTime(Math.min(0.75, config.volumen * 0.7) * factor, contexto.currentTime, 0.35); }
          if (!sintetico) audio.volume = Math.min(1, config.volumen) * factor;
        }
      });
    }
  };
}
