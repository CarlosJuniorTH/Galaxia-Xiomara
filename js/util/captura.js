// Resolución temporal para guardar la postal: la máxima del aparato, sin superar un
// presupuesto de píxeles (≈ 8,3 Mpx, una imagen 4K) para no agotar la memoria gráfica.
export const PRESUPUESTO_POSTAL = 8_300_000;
export function resolucionPostal(ancho, alto, maximo, presupuesto = PRESUPUESTO_POSTAL) {
  const porPresupuesto = Math.sqrt(presupuesto / Math.max(1, ancho * alto));
  return Math.max(1, Math.min(maximo, Math.floor(porPresupuesto * 4) / 4));
}

// Ejecuta una operación con una resolución temporal y la restaura siempre:
// éxito, error, cancelación o tiempo agotado. Solo admite una captura a la vez.
export function crearCapturador({ obtener, fijar }) {
  let enCurso = false;
  return async function capturar(resolucion, operacion) {
    if (enCurso) throw new Error('Ya se está guardando una postal.');
    enCurso = true;
    const habitual = obtener();
    try {
      fijar(resolucion);
      return await operacion();
    } finally {
      fijar(habitual);
      enCurso = false;
    }
  };
}
