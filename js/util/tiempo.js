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
// Los meses juntos con su fracción: el 25 de noviembre son 11 y un tercio (para lo que avanza día a día).
export function mesesConFraccion(fechaInicio, ahora = new Date()) {
  const dia = +String(fechaInicio).slice(8, 10) || 15, hoy = partesEnZona(ahora).dia;
  return mesesCumplidos(fechaInicio, ahora) + Math.min(0.99, (hoy >= dia ? hoy - dia : hoy + 30 - dia) / 30);
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
// Cuenta atrás a cada aniversario: el último mes antes de cumplir un año (del mes 11 al 12, del 23 al 24…) y el mismo día.
// Fecha en Argentina, como el contador y las estrellas (el día cambia a su medianoche). Días de calendario, no de 24 h.
// Devuelve null fuera de ese mes; { dias, anios, texto } dentro (dias = 0 el día del aniversario).
const VUELTAS = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima'];
const diaUTC = f => Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10));
export function cuentaAtrasAniversario(fechaInicio, ahora = new Date()) {
  const meses = mesesCumplidos(fechaInicio, ahora);
  const hoy = meses > 0 && meses % 12 === 0, vispera = meses % 12 === 11;
  if (!hoy && !vispera) return null;
  const anios = hoy ? meses / 12 : (meses + 1) / 12;
  const meta = estrellasDisponibles(fechaInicio, ahora).at(-1).id;     // el último aniversario mensual (hoy o hace < 1 mes)
  if (hoy && partesEnZona(ahora).fecha !== meta) return null;          // el aniversario ya pasó: solo cuenta su día
  const vuelta = `nuestra ${VUELTAS[anios - 1] || `${anios}.ª`} vuelta al Sol`;
  if (hoy) return { dias: 0, anios, texto: `Hoy, ${anios === 1 ? 'un año' : `${anios} años`} · ${vuelta}` };
  const [a, m, d] = fechaInicio.split('-').map(Number), f = new Date(Date.UTC(a, m - 1 + meses + 1, 1));
  const dia = Math.min(d, new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 0)).getUTCDate());
  const dias = Math.round((Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), dia) - diaUTC(partesEnZona(ahora).fecha)) / 864e5);
  return { dias, anios, texto: `Falta${dias === 1 ? '' : 'n'} ${dias} ${dias === 1 ? 'día' : 'días'} para ${vuelta}` };
}
export function capsulaAbierta(fecha, ahora = new Date()) { return partesEnZona(ahora).fecha >= fecha; }
export function saludoMomento(ahora = new Date()) {
  const { hora } = partesEnZona(ahora);
  if (hora < 6) return 'Si sigues despierta, mi Xio, aquí tienes un cielo para acompañarte.';
  if (hora < 12) return 'Buenos días, mi Xio. Te guardé un poquito de luz.';
  if (hora < 20) return 'Buenas tardes, mi amor. Este ratito de universo es para ti.';
  return 'Buenas noches, mi Xio. Quédate un ratito entre nuestras estrellas.';
}
// (El contador la pedía cada segundo y creaba un formateador nuevo en cada llamada: ~1–5 ms en un móvil.)
export function fechaBonita(fecha) {
  return formato('bonita', () => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })).format(new Date(`${fecha}T12:00:00Z`));
}
