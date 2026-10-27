// Estrenos en la GPU (solo con #debug, ?diag, ?fps o ?hud): cada compilación de programa, textura nueva o subida de
// imagen, geometría nueva (bufferData) y búfer de imagen intermedia (renderbuffer) que pide la página, con el momento en
// que ocurre. Durante un vuelo, un videoclip o un gesto deben ser cero (todo se estrena en la carga y tras la portada):
// cualquiera de ellos es un tirón en un móvil. Se envuelven las llamadas de WebGL que lo hacen (no se tocan las de cada
// cuadro: uniformes, dibujos), así que no cuesta nada medible.
// Cada estreno se cuenta aquí y, si existe, se pasa al medidor: window.__medidor.registrar({ tipo, momento, bytes, t }).
//   tipo: 'compilacion' | 'textura' (reserva o imagen completa) | 'subida' (actualizar parte de una textura) |
//         'geometria' (bufferData) | 'renderTarget' (renderbufferStorage)
//   momento: lo que se estaba haciendo ('vuelo', 'clip', 'gesto' o '' en reposo), lo fija el bucle de dibujo.
export const TIPOS_ESTRENO = Object.freeze(['compilacion', 'textura', 'subida', 'geometria', 'renderTarget']);

export function vigilarEstrenos(gl) {
  const total = {}, enMovimiento = {}, ultimos = [];
  const pila = typeof location !== 'undefined' && location.hash === '#debug';
  for (const t of TIPOS_ESTRENO) { total[t] = 0; enMovimiento[t] = 0; }
  const registro = { momento: '', total, enMovimiento, ultimos };
  const anotar = (tipo, bytes = 0) => {
    total[tipo]++;
    const momento = registro.momento;
    if (momento) enMovimiento[tipo]++;
    const ev = { tipo, momento, bytes, t: Math.round(performance.now()) };
    // Con #debug, de dónde viene cada estreno en movimiento (para encontrarlo): las primeras líneas de la pila propias.
    if (momento && pila) ev.pila = (new Error().stack || '').split('\n').filter(l => /\/js\//.test(l) && !/estrenos\.js/.test(l)).slice(0, 4).map(l => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')).join(' < ');
    if (momento || ultimos.length < 400) { ultimos.push(ev); if (ultimos.length > 600) ultimos.splice(0, 200); }
    try { window.__medidor?.registrar?.(ev); } catch {}
  };
  const envolver = (nombre, tipo, bytes) => {
    const original = gl[nombre]; if (typeof original !== 'function') return;
    gl[nombre] = function (...a) { anotar(tipo, bytes ? bytes(a) : 0); return original.apply(this, a); };
  };
  envolver('linkProgram', 'compilacion');
  for (const n of ['texImage2D', 'texImage3D', 'texStorage2D', 'texStorage3D', 'compressedTexImage2D', 'copyTexImage2D']) envolver(n, 'textura');
  for (const n of ['texSubImage2D', 'texSubImage3D', 'compressedTexSubImage2D']) envolver(n, 'subida');
  envolver('bufferData', 'geometria', a => (typeof a[1] === 'number' ? a[1] : a[1]?.byteLength ?? 0));
  envolver('renderbufferStorage', 'renderTarget', a => a[2] * a[3] * 4);
  envolver('renderbufferStorageMultisample', 'renderTarget', a => a[1] * a[3] * a[4] * 4);
  // Lo que pasó durante vuelos, clips y gestos desde `desde` (ms de performance.now()).
  registro.durante = (desde = 0) => ultimos.filter(e => e.momento && e.t >= desde);
  registro.reiniciar = () => { for (const t of TIPOS_ESTRENO) { total[t] = 0; enMovimiento[t] = 0; } ultimos.length = 0; };
  return registro;
}
