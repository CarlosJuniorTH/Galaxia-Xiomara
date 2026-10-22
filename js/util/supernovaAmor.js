// Geometría y tiempo compartidos por la escena y sus pruebas. Sin reloj de pared:
// la revelación espera al universo, también tras leer o cambiar de aplicación.
export const TIEMPOS_AMOR = Object.freeze({ espera: 14, silencio: 0.85, formar: 4, formado: 16, revelar: 19, reposo: 25 });
export const FRASE_SUPERNOVA = 'De toda esta luz, mi lugar favorito sigue siendo contigo.';
export const RECUERDO_SUPERNOVA = 'supernova-amor';
export function puntoCorazon(a, radio = 1, profundidad = 0) {
  return [70 * 16 * Math.sin(a) ** 3 * radio,
    70 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a) + 2.5) * radio,
    profundidad];
}
export function faseSupernova(estado, segundos, falta = TIEMPOS_AMOR.espera) {
  if (estado === 'inestable') return falta <= TIEMPOS_AMOR.silencio ? 'silencio' : 'encuentro';
  if (estado === 'remanente') return 'recuerdo';
  if (estado !== 'estallido') return 'estrella';
  if (segundos < TIEMPOS_AMOR.formar) return 'expansion';
  if (segundos < TIEMPOS_AMOR.formado) return 'formacion';
  if (segundos < TIEMPOS_AMOR.revelar) return 'revelacion';
  return 'recuerdo';
}

// Secciones curvas, más estrechas hacia delante y detrás: no se extruye una
// silueta plana entre dos tapas. La turbulencia cambia en los tres ejes.
export function puntoCorazonVolumen(a, latitud = 0, radio = 1, fase = 0) {
  const z=Math.max(-1,Math.min(1,latitud));
  const seccion=Math.sqrt(Math.max(0,1-z*z));
  const relieve=1+0.045*Math.sin(a*5+z*4+fase)+0.025*Math.cos(a*9-z*3+fase);
  const p=puntoCorazon(a,seccion*radio*relieve,z*760*radio);
  p[0]+=Math.sin(a*3+z*5+fase)*45*seccion*radio;
  p[1]+=Math.cos(a*4-z*4+fase)*35*seccion*radio;
  p[2]+=Math.sin(a*3+fase)*95*seccion*radio;
  return p;
}
