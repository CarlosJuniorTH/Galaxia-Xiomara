// Ayudas de dibujo 2D y azar compartidas

export function lienzo(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// Corazón centrado en (x, y) de alto s
export function trazarCorazon(ctx, x, y, s) {
  const t = y - s * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, t + s * 0.3);
  ctx.bezierCurveTo(x, t, x - s * 0.5, t, x - s * 0.5, t + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, t + s * 0.6, x, t + s * 0.8, x, t + s);
  ctx.bezierCurveTo(x, t + s * 0.8, x + s * 0.5, t + s * 0.6, x + s * 0.5, t + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, t, x, t, x, t + s * 0.3);
  ctx.closePath();
}

// Número aleatorio con distribución normal (media 0, desviación 1)
export function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const azar = (a, b) => a + Math.random() * (b - a);
export const elegir = lista => lista[Math.floor(Math.random() * lista.length)];
