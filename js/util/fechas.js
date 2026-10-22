// Cálculos de tiempo juntos
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export function leerFecha(texto) {
  if (!texto) return null;
  const [a, m, d] = texto.split('-').map(Number);
  const f = new Date(a, m - 1, d);
  return isNaN(f) ? null : f;
}

export function sumarMeses(fecha, n) {
  const f = new Date(fecha.getFullYear(), fecha.getMonth() + n, 1);
  const ultimo = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate();
  f.setDate(Math.min(fecha.getDate(), ultimo));
  return f;
}

// Meses completos + resto en días/horas/minutos/segundos
export function tiempoJuntos(inicio, ahora = new Date()) {
  let meses = (ahora.getFullYear() - inicio.getFullYear()) * 12 + (ahora.getMonth() - inicio.getMonth());
  let ancla = sumarMeses(inicio, meses);
  if (ancla > ahora) { meses--; ancla = sumarMeses(inicio, meses); }
  meses = Math.max(0, meses);
  const ms = Math.max(0, ahora - ancla);
  return {
    meses,
    dias: Math.floor(ms / 864e5),
    horas: Math.floor(ms / 36e5) % 24,
    minutos: Math.floor(ms / 6e4) % 60,
    segundos: Math.floor(ms / 1e3) % 60,
    diasTotales: Math.floor(Math.max(0, ahora - inicio) / 864e5)
  };
}

export function fechaLarga(f) {
  return `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
}

export function fechaCorta(f) {
  const p = n => String(n).padStart(2, '0');
  return `${p(f.getDate())} · ${p(f.getMonth() + 1)} · ${f.getFullYear()}`;
}
