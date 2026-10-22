// Conserva tiempo para ver los detalles en la aproximación. En un viaje enorme,
// interpolar kilómetros linealmente deja los últimos metros para un único cuadro.
export function avanceAproximacion(k, distancia, llegada) {
  if (k <= 0) return 0; if (k >= 1) return 1;
  const t = Math.max(0, Math.min(1, k)), suave = t * t * t * (t * (t * 6 - 15) + 10);
  const razon = Math.max(0, distancia) / Math.max(200, llegada);
  if (razon < 8) return suave;
  return Math.max(0, Math.min(1, 1 - Math.expm1(Math.log1p(razon) * (1 - suave)) / razon));
}
export function duracionViaje(distancia, propuesta) {
  return distancia < 20000 ? propuesta : Math.max(propuesta, Math.min(24, 8 + Math.log10(distancia / 20000) * 6));
}

// Viaje a escala cósmica («potencias de diez»): cada factor 10 de distancia dura lo mismo, al
// salir y al llegar. Así al despegar se ve cómo lo que se deja (la galaxia) se aleja y encoge
// poco a poco, en vez de desaparecer en un cuadro, y al llegar el destino crece con calma.
// salida: tamaño de lo que se deja (distancia al centro del lugar de partida); llegada: distancia
// final al destino. Devuelve la fracción del trayecto recorrida.
export function avanceLogaritmico(k, distancia, salida, llegada, { umbral = 2e6, peso = 0.3 } = {}) {
  if (k <= 0) return 0; if (k >= 1) return 1;
  const D = Math.max(1e-9, distancia), H = D / 2, a = Math.max(1, salida), b = Math.max(1, llegada);
  const t = k * k * k * (k * (k * 6 - 15) + 10);
  // «Esfuerzo» de cada tramo: los órdenes de magnitud cercanos (dejar la galaxia y su entorno,
  // hasta «umbral») pasan algo más rápido (peso) y el resto, con más universo que ver, despacio.
  const T = Math.min(H, Math.max(a, umbral)), la1 = Math.log1p(T / a), la2 = Math.log((1 + H / a) / (1 + T / a));
  const Sa = peso * la1 + la2, Sb = Math.log1p(H / b), e = t * (Sa + Sb);
  const x = e < peso * la1 ? a * Math.expm1(e / peso) : e < Sa ? a * ((1 + T / a) * Math.exp(e - peso * la1) - 1) : D - b * Math.expm1(Sa + Sb - e);
  return Math.max(0, Math.min(1, x / D));
}
