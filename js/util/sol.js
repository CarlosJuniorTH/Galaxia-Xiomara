// Posición real del Sol sobre la Tierra (punto subsolar) para una fecha: la Tierra del
// universo muestra el día y la noche que hay de verdad en Barcelona y en Buenos Aires.
// Precisión de pocos minutos: declinación por el día del año y ecuación del tiempo.
const RAD = Math.PI / 180;

export function puntoSubsolar(fecha = new Date()) {
  const inicio = Date.UTC(fecha.getUTCFullYear(), 0, 0), dia = (fecha.getTime() - inicio) / 864e5;
  const g = 2 * Math.PI / 365 * (dia - 1);
  const declinacion = (0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)) / RAD;
  const ecuacion = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));   // minutos
  const minutosUTC = fecha.getUTCHours() * 60 + fecha.getUTCMinutes() + fecha.getUTCSeconds() / 60;
  let longitud = -(minutosUTC + ecuacion - 720) / 4;
  longitud = ((longitud + 540) % 360) - 180;
  return { longitud, latitud: declinacion };
}

// Altura del Sol (grados) vista desde una longitud y latitud.
export function alturaSol(longitud, latitud, fecha = new Date()) {
  const s = puntoSubsolar(fecha);
  const a = [Math.cos(latitud * RAD) * Math.cos(longitud * RAD), Math.cos(latitud * RAD) * Math.sin(longitud * RAD), Math.sin(latitud * RAD)];
  const b = [Math.cos(s.latitud * RAD) * Math.cos(s.longitud * RAD), Math.cos(s.latitud * RAD) * Math.sin(s.longitud * RAD), Math.sin(s.latitud * RAD)];
  return Math.asin(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / RAD;
}

// Cómo está el cielo en ese lugar ahora: de día, amaneciendo, atardeciendo o de noche.
export function momentoDelDia(longitud, latitud, fecha = new Date()) {
  const altura = alturaSol(longitud, latitud, fecha), s = puntoSubsolar(fecha);
  const tarde = ((longitud - s.longitud + 540) % 360) - 180 > 0;   // el Sol ya pasó por allí (va hacia el oeste)
  if (altura > 8) return 'de día';
  if (altura > -8) return tarde ? 'atardeciendo' : 'amaneciendo';
  return 'de noche';
}
