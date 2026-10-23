// Tamaño de la ventana guardado: se actualiza al cambiar de tamaño o de orientación. Leer innerWidth/innerHeight en
// mitad de un cuadro obliga al navegador a recalcular la maquetación de la página si algo del HTML ha cambiado (una
// animación de la interfaz, un texto): en cada cuadro del universo, eso era trabajo de más en el móvil.
const hayVentana = typeof window !== 'undefined';   // fuera del navegador (pruebas), un tamaño fijo
export const vista = { ancho: hayVentana ? innerWidth : 1280, alto: hayVentana ? innerHeight : 800 };
const medir = () => { vista.ancho = innerWidth; vista.alto = innerHeight; };
if (hayVentana) {
  addEventListener('resize', medir);
  addEventListener('orientationchange', medir);
  window.visualViewport?.addEventListener('resize', medir);
}
