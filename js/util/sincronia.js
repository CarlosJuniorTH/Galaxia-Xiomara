// Cálculos de la banda sonora sin navegador (los usan js/ui/bandaSonora.js, js/ui/entrada.js y sus pruebas).

// Reloj de una animación guiado por el de una canción: lleva el segundo de la canción al tiempo de la animación de modo
// que cada hito caiga en su marca. Tramos rectos entre (0, 0) y cada par (marca, hito) en orden; desde el último, al
// ritmo normal (1 s de canción = 1 s de animación: la galaxia sigue girando igual aunque la canción ya haya acabado).
// Las marcas que faltan o que irían hacia atrás se ignoran (sin marcas, la animación va a su ritmo de siempre).
export function reescalar(segundo, marcas, hitos) {
  const nudos = [[0, 0]];
  for (const [nombre, h] of Object.entries(hitos).sort((a, b) => a[1] - b[1])) {
    const s = marcas?.[nombre], [s0, h0] = nudos[nudos.length - 1];
    if (Number.isFinite(s) && s > s0 && h > h0) nudos.push([s, h]);
  }
  const x = Math.max(0, segundo);
  for (let i = 1; i < nudos.length; i++) if (x < nudos[i][0]) { const [s0, h0] = nudos[i - 1], [s1, h1] = nudos[i]; return h0 + (x - s0) * (h1 - h0) / (s1 - s0); }
  const [s, h] = nudos[nudos.length - 1]; return h + (x - s);
}

// Marcas cruzadas entre dos lecturas del reloj (desde, hasta]: las que caen en ese intervalo. En bucle, si el reloj ha
// dado la vuelta (hasta < desde), las del final y las del principio de la vuelta nueva.
export function marcasCruzadas(marcas, desde, hasta, { duracion = Infinity, bucle = false } = {}) {
  const lista = Object.entries(marcas || {}).filter(([, s]) => Number.isFinite(s));
  if (bucle && hasta < desde - 0.25) return lista.filter(([, s]) => (s > desde && s <= duracion) || (s >= 0 && s <= hasta)).sort((a, b) => ((a[1] <= hasta) - (b[1] <= hasta)) || a[1] - b[1]).map(([n]) => n);
  return lista.filter(([, s]) => s > desde && s <= hasta).sort((a, b) => a[1] - b[1]).map(([n]) => n);
}

// Qué suena «en reposo» (sin viaje ni destino con canción propia): en casa, la canción del mes si la hay; si no, el
// ambiente. tiene(nombre) dice si ese momento tiene archivo.
export function momentoReposo(lugar, mes, tiene) {
  if (lugar === 'hogar' && tiene(`mes-${mes}`)) return `mes-${mes}`;
  return 'ambiente';
}
