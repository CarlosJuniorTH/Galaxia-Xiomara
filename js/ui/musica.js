import { crearSonidoSupernova } from './sonidoSupernova.js';
// Canción opcional + una pequeña composición ambiental original, generada en el dispositivo.
// No necesita descargar audio de terceros. El sonido comienza siempre con un gesto.
// El ambiente es un canal más del mezclador de la banda sonora (js/ui/bandaSonora.js): la banda decide cuándo se oye
// (en reposo, entre canciones) y lo enciende o apaga; aquí quedan el botón de música y el propio ambiente.
export function crearMusica(config, banda) {
  const audio = document.getElementById('musica'), boton = document.getElementById('btn-musica');
  let contexto, salida, temporizador, quiere = false, encendido = false, sintetico = !config.cancion;
  let indice = 0, notasVivas = new Set();
  const acordes = [[48, 55, 59, 64, 67], [45, 52, 55, 59, 64], [41, 48, 52, 57, 60], [43, 50, 55, 57, 62]];
  const nivel = () => Math.min(0.75, config.volumen * 0.7);
  const ui = sonando => { boton.classList.toggle('pausado', !sonando); boton.setAttribute('aria-label', sonando ? 'Pausar música' : 'Reproducir música'); boton.setAttribute('aria-pressed', String(sonando)); };
  function preparar() {
    if (contexto) return;
    contexto = banda.contexto();
    if (!contexto) throw Error('Audio no disponible');
    salida = contexto.createGain(); salida.gain.value = 0;
    const filtro = contexto.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 1700;
    const eco = contexto.createDelay(1); eco.delayTime.value = 0.37;
    const retorno = contexto.createGain(); retorno.gain.value = 0.24;
    // Al canal «ambiente» del mezclador (no directo a los altavoces): así se funde con las canciones.
    const canal = banda.entradaAmbiente();
    salida.connect(filtro); filtro.connect(canal); filtro.connect(eco); eco.connect(retorno); retorno.connect(eco); retorno.connect(canal);
  }
  function nota(midi, retraso, duracion = 5) {
    const t = contexto.currentTime + retraso, osc = contexto.createOscillator(), gain = contexto.createGain();
    osc.type = 'sine'; osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.085, t + 0.15); gain.gain.exponentialRampToValueAtTime(0.001, t + duracion);
    osc.connect(gain); gain.connect(salida); osc.start(t); osc.stop(t + duracion + 0.1); notasVivas.add(osc);
    osc.onended = () => { notasVivas.delete(osc); osc.disconnect(); gain.disconnect(); };
  }
  function compas() {
    if (!encendido || document.hidden) return;
    const acorde = acordes[indice++ % acordes.length];
    acorde.forEach((n, i) => nota(n + 12, i * 0.7, 5.5)); nota(acorde[0], 0, 6.5);
    temporizador = setTimeout(compas, 6200);
  }
  // La banda enciende el ambiente cuando debe oírse y lo apaga cuando su fundido de salida ha terminado (no se
  // programan notas que nadie oye mientras suena una canción).
  const ambiente = {
    encender() {
      encendido = true; clearTimeout(temporizador);
      if (!sintetico) { audio.volume = Math.min(1, config.volumen); audio.play().catch(() => {}); return; }
      try { preparar(); } catch { return; }
      salida.gain.cancelScheduledValues(contexto.currentTime); salida.gain.setTargetAtTime(nivel(), contexto.currentTime, 0.3); compas();
    },
    apagar() { encendido = false; clearTimeout(temporizador); if (!sintetico) audio.pause(); }
  };
  banda.registrarAmbiente(ambiente);
  function reproducir(desdeInicio = false) {
    quiere = true;
    // Síncrono dentro del toque: el contexto y las pistas quedan desbloqueados (iOS).
    try { banda.desbloquear(); preparar(); } catch { ui(false); return; }
    if (!sintetico && desdeInicio && !encendido) audio.currentTime = config.inicioCancion || 0;
    banda.activar(true); ui(true);
  }
  function pausar() { quiere = false; banda.activar(false); ui(false); }
  if (config.cancion) {
    audio.src = config.cancion;
    audio.addEventListener('error', () => { sintetico = true; if (encendido) ambiente.encender(); });
  }
  boton.addEventListener('click', () => quiere ? pausar() : reproducir());
  // (Al cambiar de aplicación, la banda apaga el ambiente y pausa el contexto; al volver, lo enciende con un fundido.)
  return { reproducir, pausar,
    supernova() {
      if (!quiere) return null;
      // Con canción propia, la ceremonia la empieza desde el principio (sus fases son marcas de la canción) y no se
      // superponen los tonos sintéticos.
      if (banda.tiene('supernova')) { banda.ceremonia('supernova'); return null; }
      try { preparar(); } catch { return null; }
      return crearSonidoSupernova({ contexto, salida, permitido: () => quiere,
        atenuar: factor => {
          if (contexto && quiere) { salida.gain.cancelScheduledValues(contexto.currentTime); salida.gain.setTargetAtTime(nivel() * factor, contexto.currentTime, 0.35); }
          if (!sintetico) audio.volume = Math.min(1, config.volumen) * factor;
        }
      });
    }
  };
}
