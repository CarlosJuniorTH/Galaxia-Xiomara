// Distingue un toque corto (beso / estrella secreta) de un arrastre (girar la cámara)
export function escucharToques(canvas, alTocar) {
  // Se siguen los dedos por su identificador y se escuchan al soltar en toda la ventana:
  // si un dedo se levanta sobre algo que acaba de aparecer (la tarjeta del lugar al llegar),
  // el lienzo no recibe su pointerup y un contador simple se quedaba «atascado», haciendo
  // que el siguiente toque pareciera un pellizco y se ignorara.
  const dedos = new Set();
  let inicio = null;
  canvas.addEventListener('pointerdown', e => {
    dedos.add(e.pointerId);
    inicio = e.isPrimary && dedos.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null;
  });
  const soltar = e => {
    dedos.delete(e.pointerId);
    if (!inicio || inicio.id !== e.pointerId) return;
    const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y;
    const corto = performance.now() - inicio.t < 350;
    inicio = null;
    if (corto && dx * dx + dy * dy < 100 && e.target === canvas) alTocar(e.clientX, e.clientY);
  };
  addEventListener('pointerup', soltar, true);
  addEventListener('pointercancel', e => { dedos.delete(e.pointerId); if (inicio?.id === e.pointerId) inicio = null; }, true);
  addEventListener('blur', () => { dedos.clear(); inicio = null; });

  // El pellizco y el doble toque sobre el universo mueven la cámara, no amplían la
  // página (iOS ignora touch-action para el gesto de Safari). Fuera del lienzo se puede
  // ampliar con normalidad: cartas y paneles siguen siendo legibles para quien lo necesite.
  for (const evento of ['gesturestart', 'gesturechange', 'dblclick']) {
    canvas.addEventListener(evento, e => e.preventDefault(), { passive: false });
  }
}
