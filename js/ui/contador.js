import { partesEnZona, mesesCumplidos, estrellasDisponibles, fechaBonita } from '../util/tiempo.js';
const p = n => String(n).padStart(2, '0');
export function crearContador(config) {
  const titulo = document.getElementById('titulo-texto'), linea = document.getElementById('contador'), sub = document.getElementById('contador-sub');
  function tick() {
    const ahora = new Date(), meses = mesesCumplidos(config.fechaInicio, ahora), a = partesEnZona(ahora);
    const ancla = estrellasDisponibles(config.fechaInicio, ahora).at(-1).id;
    const ms = Math.max(0, ahora - Date.parse(`${ancla}T00:00:00-03:00`));
    const dias = Math.floor(ms / 864e5), horas = Math.floor(ms / 36e5) % 24, minutos = Math.floor(ms / 6e4) % 60, segundos = Math.floor(ms / 1e3) % 60;
    titulo.textContent = a.fecha === ancla && meses > 0 ? (meses % 12 ? `Feliz mes ${meses}, mi amor ♡` : `Feliz ${meses / 12} ${meses === 12 ? 'año' : 'años'}, mi amor ♡`) : config.titulo;
    linea.textContent = `${meses} ${meses === 1 ? 'mes' : 'meses'} · ${dias} ${dias === 1 ? 'día' : 'días'} · ${p(horas)}h ${p(minutos)}m ${p(segundos)}s juntos`;
    sub.textContent = `Nuestra primera estrella · ${fechaBonita(config.fechaInicio)}`;
  }
  tick(); setInterval(tick, 1000);
}
