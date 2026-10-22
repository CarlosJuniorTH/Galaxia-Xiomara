// Un pasaje corto y original, conectado al mismo volumen y silencio de la música.
// No crea un AudioContext adicional, no descarga sonidos ni impone audio si está apagado.
export function crearSonidoSupernova({ contexto, salida, permitido, atenuar }) {
  const voces = new Set(); let cerrado = false, ultima = '';
  function tono(midi, duracion, retraso = 0, fuerza = 0.12) {
    if (cerrado || !permitido() || document.hidden || contexto.state !== 'running') return;
    const o = contexto.createOscillator(), g = contexto.createGain(), t = contexto.currentTime + retraso;
    o.type = 'sine'; o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(fuerza, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    o.connect(g); g.connect(salida); o.start(t); o.stop(t + duracion + 0.1);
    const voz = { o, g }; voces.add(voz); o.onended = () => { voces.delete(voz); o.disconnect(); g.disconnect(); };
  }
  function silenciar() { for (const { o, g } of voces) { g.gain.cancelScheduledValues(contexto.currentTime); g.gain.setTargetAtTime(0, contexto.currentTime, 0.06); try { o.stop(contexto.currentTime + 0.3); } catch {} } }
  return {
    fase(fase) {
      if (cerrado || ultima === fase) return; ultima = fase;
      atenuar(fase === 'silencio' ? 0.015 : fase === 'recuerdo' ? 1 : 0.55);
      if (fase === 'encuentro') { tono(69, 5, 0, 0.10); tono(76, 5, 1.3, 0.09); }
      if (fase === 'silencio') silenciar();
      if (fase === 'expansion') { tono(45, 6, 0, 0.15); tono(64, 6, 0.1, 0.09); }
      if (fase === 'revelacion') [60, 64, 67, 71, 76].forEach((nota, i) => tono(nota, 6, i * 0.35, 0.07));
    },
    silenciar,
    cerrar() { if (cerrado) return; cerrado = true; silenciar(); atenuar(1); }
  };
}
