// Cuánto se está descargando (texturas horneadas, cielo): la pantalla de carga lo muestra en MB para saber si tardará.
const oyentes = new Set();
export const descargas = {
  total: 0, hechos: 0,
  previsto(bytes) { this.total += bytes; avisar(); },
  hecho(bytes) { this.hechos += bytes; avisar(); },
  escuchar(f) { oyentes.add(f); f(this); return () => oyentes.delete(f); }
};
function avisar() { for (const f of oyentes) f(descargas); }
