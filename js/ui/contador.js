import { partesEnZona, mesesCumplidos, estrellasDisponibles, fechaBonita, cuentaAtrasAniversario } from '../util/tiempo.js';
const p = n => String(n).padStart(2, '0');
// Solo si cambia: escribir el mismo texto también obliga al navegador a rehacer la maquetación de la página.
const escribir = (el, t) => { if (el.textContent !== t) el.textContent = t; };
export function crearContador(config) {
  const titulo = document.getElementById('titulo-texto'), linea = document.getElementById('contador'), sub = document.getElementById('contador-sub');
  const textoSub = `Nuestra primera estrella · ${fechaBonita(config.fechaInicio)}`;   // no cambia: se calcula una vez
  // El dial de la primera vuelta: doce marcas junto a la cuenta atrás, desde el mes 11; la que falta, latiendo.
  const dial = document.getElementById('dial-vuelta');
  let mesesDial = -1;
  const ponerDial = meses => {
    if (meses === mesesDial) return; mesesDial = meses;
    dial.toggleAttribute('hidden', meses < 11); if (meses < 11) return;   // (un <svg> no tiene la propiedad .hidden)
    const llenas = meses % 12 === 0 ? 12 : meses % 12;
    let trazo = '';
    for (let i = 0; i < 12; i++) { const a = (i / 12 - 0.25) * Math.PI * 2; trazo += `<circle cx="${(12 + Math.cos(a) * 9.5).toFixed(2)}" cy="${(12 + Math.sin(a) * 9.5).toFixed(2)}" r="${i < llenas ? 1.5 : 1.1}" class="${i < llenas ? 'llena' : i === llenas ? 'espera' : 'vacia'}"/>`; }
    dial.innerHTML = trazo; dial.setAttribute('aria-label', `${llenas} de 12 meses de nuestra vuelta al Sol`);
  };
  let cuentaPuesta = null, diaCuenta = '', cuenta = null;   // clases de la cuenta atrás: se tocan solo cuando cambia su estado ('' · 'cuenta' · 'hoy')
  function tick() {
    const ahora = new Date(), meses = mesesCumplidos(config.fechaInicio, ahora), a = partesEnZona(ahora);
    const ancla = estrellasDisponibles(config.fechaInicio, ahora).at(-1).id;
    const ms = Math.max(0, ahora - Date.parse(`${ancla}T00:00:00-03:00`));
    const dias = Math.floor(ms / 864e5), horas = Math.floor(ms / 36e5) % 24, minutos = Math.floor(ms / 6e4) % 60, segundos = Math.floor(ms / 1e3) % 60;
    escribir(titulo, a.fecha === ancla && meses > 0 ? (meses % 12 ? `Feliz mes ${meses}, mi amor ♡` : meses === 12 ? 'Feliz primer año, mi amor ♡' : `Feliz ${meses / 12} años, mi amor ♡`) : config.titulo);
    escribir(linea, `${meses} ${meses === 1 ? 'mes' : 'meses'} · ${dias} ${dias === 1 ? 'día' : 'días'} · ${p(horas)}h ${p(minutos)}m ${p(segundos)}s juntos`);
    // El último mes antes de cada año, la línea de abajo cuenta los días que faltan (y el día, «Hoy, un año»).
    // (Solo cambia con el día en Argentina: se recalcula entonces, no cada segundo.)
    if (a.fecha !== diaCuenta) {
      diaCuenta = a.fecha; cuenta = cuentaAtrasAniversario(config.fechaInicio, ahora); ponerDial(meses);
      // El día de un mes con videoclip, y sobre todo el del año, todo el universo lo sabe (css/teatro.css).
      const hoyEsAncla = a.fecha === ancla && meses > 0;
      document.body.classList.toggle('dia-mes-once', hoyEsAncla && meses % 12 === 11);
      document.body.classList.toggle('dia-anio', hoyEsAncla && meses % 12 === 0);
    }
    const estado = cuenta ? (cuenta.dias ? 'cuenta' : 'hoy') : '';
    escribir(sub, cuenta ? cuenta.texto : textoSub);
    if (estado !== cuentaPuesta) { cuentaPuesta = estado; sub.classList.toggle('cuenta-atras', !!estado); sub.classList.toggle('aniversario', estado === 'hoy'); }
  }
  tick(); setInterval(tick, 1000);
}
