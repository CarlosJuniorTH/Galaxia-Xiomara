// Mantener la anchura de la composición de escritorio también en vertical.
// Cambiar solo el DPR no corrige el recorte del campo de visión horizontal.
export function distanciaGalaxia(aspecto) {
  return 950 * Math.max(1, (16 / 9) / Math.max(0.2, aspecto));
}

// Convertir un límite visual CSS a unidades del mundo sin agrandar los
// recuerdos para hacerlos tocables. La zona de toque se amplía por separado.
export function escalaLimitada(tamano, pixeles, profundidad, alto, fov) {
  const unidadesPorPixel = 2 * Math.max(0, profundidad) * Math.tan(fov * Math.PI / 360) / Math.max(1, alto);
  return Math.min(tamano, pixeles * unidadesPorPixel);
}

// Vista de inicio. En pantallas anchas se conserva la composición de escritorio.
// En vertical, una galaxia vista casi de canto queda como una franja estrecha:
// se inclina más hacia el plano frontal y se acerca hasta que el disco llene el ancho
// (los brazos exteriores, más tenues, pueden quedar ligeramente recortados).
export const RADIO_GALAXIA = 1000;
export function encuadreHogar(aspecto) {
  if (aspecto >= 0.8) return { distancia: distanciaGalaxia(aspecto), elevacion: Math.atan2(0.42, Math.hypot(0.2, 0.88)) };
  // La galaxia se ve casi completa y llena el ancho; solo rozan el borde
  // las puntas más tenues de los brazos.
  const anchoVisible = 2 * RADIO_GALAXIA * 0.86;
  const distancia = Math.min(3800, Math.max(1700, anchoVisible / (2 * Math.tan(Math.PI / 6) * aspecto)));
  // Algo más baja que antes (≈ 34°): sobre la galaxia asoma la franja de cielo con los destinos.
  return { distancia, elevacion: 0.6 };
}

// El corazón y el nombre son símbolos: al alejar la cámara crecen para seguir
// siendo legibles. A la distancia de escritorio (~1050) la escala es 1.
export function escalaSimbolos(distancia) {
  return Math.min(2.6, Math.max(1, distancia / 1150));
}

// Franja vertical que deja libre la interfaz (en píxeles CSS) y desplazamiento
// necesario para centrar en ella la escena. arriba/abajo: bordes de lo que ocupa.
export function desplazamientoZonaLibre(arriba, abajo, alto) {
  if (!(abajo > arriba)) return 0;
  return Math.round((arriba + abajo) / 2 - alto / 2);
}

// Las estrellas de la galaxia no deben desvanecerse al ver el disco desde lejos
// (en vertical la cámara está ~2,7 veces más lejos que en el PC para que quepa):
// su tamaño en pantalla se compensa en parte. A la distancia del PC vale 1.
export function compensacionPuntos(distancia) {
  return Math.min(2.2, Math.pow(Math.max(1, distancia / 1100), 0.8));
}

// Distancia a un destino (planeta, luna, jardín…). La distancia base está pensada
// para el PC, donde la figura ocupa ~35 % de la altura (radio ≈ 0,2 · base).
// En pantallas estrechas la figura debe ocupar ~75 % de la dimensión que limita:
// el ancho o la franja libre que deja la interfaz (fraccionZona, 0–1 de la altura).
// Así, con la tarjeta del recorrido (franja menor) la cámara se aleja sola.
export function distanciaDestino(base, aspecto, fraccionZona = 1) {
  if (aspecto >= 0.95) return base * Math.max(1, Math.min(1.8, 0.95 / aspecto));
  const limite = Math.max(0.2, Math.min(aspecto, fraccionZona));
  const radio = 0.2 * base;
  const distancia = radio / (Math.tan(Math.PI / 6) * limite * 0.75);
  return Math.min(1.8 * base, Math.max(0.85 * base, distancia));
}

// Un giro DURANTE un vuelo no se puede reencuadrar a mitad de camino: el punto de
// llegada ya está trazado en la curva. `reencuadrar()` sale en seco si hay vuelo y, al
// aterrizar, `fijarEncuadre()` apuntaría la distancia IDEAL como si fuera la real; el
// recorte quedaría grabado como correcto y no se corregiría nunca (vw/vh ya coinciden).
//
// Esta función decide, al llegar, si la llegada se ha quedado mal encuadrada y a qué
// distancia habría que estar. Cuenta como cambio:
//  · la ventana: ancho distinto, o alto con una variación ≥ 20 % (el mismo criterio que
//    `reencuadrar()`; las barras del navegador no cuentan);
//  · la interfaz (idealSalida, opcional): si la distancia ideal al llegar difiere ≥ 3 % de
//    la calculada al salir (una tarjeta que aparece, otro tamaño de texto…).
// Devuelve null cuando no hay que tocar nada. Solo decide: mover la cámara es cosa de quien
// la llama, que conserva la órbita.
export function correccionAlLlegar({
  vwVuelo, vhVuelo, vw, vh,
  distanciaActual, distanciaIdeal, idealSalida,
  toleranciaAlto = 0.2, margen = 0.02, toleranciaInterfaz = 0.03,
} = {}) {
  if (!(distanciaActual > 0) || !(distanciaIdeal > 0)) return null;
  if (!(vwVuelo > 0) || !(vhVuelo > 0) || !(vw > 0) || !(vh > 0)) return null;
  const giro = vw !== vwVuelo || Math.abs(vh - vhVuelo) / vhVuelo >= toleranciaAlto;
  const interfaz = idealSalida > 0 && Math.abs(distanciaIdeal / idealSalida - 1) >= toleranciaInterfaz;
  if (!giro && !interfaz) return null;
  // Con idealSalida se escala la distancia real por la razón de encuadres (la llegada de cada
  // lugar no es exactamente su ideal); sin ella, se va a la ideal.
  const aD = idealSalida > 0 ? distanciaActual * distanciaIdeal / idealSalida : distanciaIdeal;
  // Un cambio inapreciable no justifica mover la cámara recién llegada.
  if (Math.abs(aD - distanciaActual) / distanciaActual < margen) return null;
  return { desdeD: distanciaActual, aD };
}

// Cambios de interfaz en reposo: ¿justifica reencuadrar un cambio de la franja libre sin
// redimensionar? (no se recentra por cambios mínimos).
export function cambioInterfazApreciable(idealAnterior, idealNuevo, tolerancia = 0.04) {
  return idealAnterior > 0 && idealNuevo > 0 && Math.abs(idealNuevo / idealAnterior - 1) >= tolerancia;
}
