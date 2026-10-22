import { ZONAS } from '../data/universo.js';
// Los formateadores de fechas son caros de crear: se crean una vez por zona y se reutilizan (el contador los usa
// cada segundo; crearlos en cada llamada provocaba pequeños tirones).
const formatos = new Map();
const formato = (clave, crear) => { if (!formatos.has(clave)) formatos.set(clave, crear()); return formatos.get(clave); };
// Resultado guardado por segundo y zona: se consulta en cada cuadro (el cielo de Xiomara sigue su hora) y la fecha solo
// cambia una vez por segundo; así no se crea memoria temporal en cada cuadro (menos pausas del recolector en el móvil).
const ultimas = new Map();
export function partesEnZona(ahora = new Date(), zona = ZONAS.xiomara) {
  const segundo = Math.floor(+ahora / 1000), previo = ultimas.get(zona);
  if (previo && previo.s === segundo) return previo.r;
  const r = calcularPartes(ahora, zona); ultimas.set(zona, { s: segundo, r: Object.freeze(r) }); return r;
}
function calcularPartes(ahora, zona) {
  const f = formato('partes|' + zona, () => new Intl.DateTimeFormat('en-GB', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }));
  const p = Object.fromEntries(f.formatToParts(ahora).map(x => [x.type, x.value]));
  return { anio: +p.year, mes: +p.month, dia: +p.day, hora: +p.hour, minuto: +p.minute, segundo: +p.second, fecha: `${p.year}-${p.month}-${p.day}` };
}
export function relojZona(ahora, zona) {
  return formato('reloj|' + zona, () => new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })).format(ahora);
}
export function mesesCumplidos(fechaInicio, ahora = new Date()) {
  const [a, m, d] = fechaInicio.split('-').map(Number);
  const p = partesEnZona(ahora);
  const ultimo = new Date(Date.UTC(p.anio, p.mes, 0)).getUTCDate();
  return Math.max(0, (p.anio - a) * 12 + p.mes - m - (p.dia < Math.min(d, ultimo) ? 1 : 0));
}
export function estrellasDisponibles(fechaInicio, ahora = new Date()) {
  const meses = mesesCumplidos(fechaInicio, ahora);
  return Array.from({ length: meses + 1 }, (_, i) => {
    const [a, m, d] = fechaInicio.split('-').map(Number);
    const f = new Date(Date.UTC(a, m - 1 + i, 1));
    const dia = Math.min(d, new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 0)).getUTCDate());
    const fecha = `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return { id: fecha, mes: i, capitulo: Math.floor(i / 12) + 1 };
  });
}
export function capsulaAbierta(fecha, ahora = new Date()) { return partesEnZona(ahora).fecha >= fecha; }
export function saludoMomento(ahora = new Date()) {
  const { hora } = partesEnZona(ahora);
  if (hora < 6) return 'Si sigues despierta, mi Xio, aquí tienes un cielo para acompañarte.';
  if (hora < 12) return 'Buenos días, mi Xio. Te guardé un poquito de luz.';
  if (hora < 20) return 'Buenas tardes, mi amor. Este ratito de universo es para ti.';
  return 'Buenas noches, mi Xio. Quédate un ratito entre nuestras estrellas.';
}
export function fechaBonita(fecha) {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${fecha}T12:00:00Z`));
}
