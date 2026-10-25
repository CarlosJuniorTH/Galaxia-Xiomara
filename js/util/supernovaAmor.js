// Geometría y tiempo compartidos por la escena y sus pruebas. Sin reloj de pared:
// la revelación espera al universo, también tras leer o cambiar de aplicación.
// La ceremonia dura lo que su canción («Sparks», 62,3 s, desde «My heart is yours»: js/data/bandaSonora.js), que empieza
// con ella. En segundos desde el principio: la estrella late y gana tensión durante las estrofas (0–28, «…but I won't let
// you down»), se aprieta en un infinito que gira y se apaga (28–37), dos estrellitas giran en espiral (38,2) y estalla en
// el pico de energía, en el primer tiempo del compás de los 41,7 s («Oh yeah, I will…»); el corazón se forma (45,7) y se
// revela con «I said ooh» (53,8, también en compás); queda el recuerdo (57,3) y la ceremonia se cierra con el fundido final.
// espera: del principio al estallido; formar, formado, revelar y reposo: desde el estallido.
export const TIEMPOS_AMOR = Object.freeze({ espera: 41.7, silencio: 0.85, formar: 4, formado: 12.12, revelar: 15.56, reposo: 20.6 });
// Pista de cámara de la ceremonia (formato: js/util/directorCamara.js), en segundos de «Sparks» desde el principio de la
// ceremonia (el estallido, en TIEMPOS_AMOR.espera) y en radios del encuadre del corazón ya nacido. null: sin pista (la
// cámara se acerca a la estrella y se retira al corazón como siempre, index.js verEstallido).
export const CAMARA_SUPERNOVA = null;

// La animación se diseñó con otro reloj (14 s de espera; formar 4, formado 16, revelar 19, reposo 25) y se conserva tal
// cual: solo se estira y se reparte. Estos tramos llevan el tiempo real de la ceremonia al de la animación.
// Antes del estallido (lo que falta): 41,7 → 13,7 s, los latidos (14 → 9,5 de la animación, ahora durante 28 s); hasta 10,4
// el pellizco en infinito; hasta 4,4 el infinito que gira y se contrae; un instante a oscuras; desde 3,5, las dos estrellitas.
const ANTES = [[0, 0], [3.5, 3.8], [4.4, 4.8], [10.38, 7.5], [13.7, 9.5], [41.7, 14]];
// Después del estallido: la explosión a su ritmo (0–4), la formación del corazón algo más deprisa (4–12,1 frente a 4–16),
// la revelación y el reposo un poco más despacio.
const DESPUES = [[0, 0], [4, 4], [12.12, 16], [15.56, 19], [20.6, 25]];
function tramos(x, nudos) {
  if (x <= nudos[0][0]) return nudos[0][1] + (x - nudos[0][0]);
  for (let i = 1; i < nudos.length; i++) if (x <= nudos[i][0]) { const [a0, b0] = nudos[i - 1], [a1, b1] = nudos[i]; return b0 + (x - a0) * (b1 - b0) / (a1 - a0); }
  const [a, b] = nudos[nudos.length - 1]; return b + (x - a);
}
// Segundos que faltan para el estallido (reales) → los de la animación; y al revés (para mover la cámara a tiempo).
export const faltaAnimacion = falta => tramos(falta, ANTES);
export const faltaReal = faltaAnim => tramos(faltaAnim, ANTES.map(([a, b]) => [b, a]));
// Segundos desde el estallido (reales) → los de la animación (los sombreadores de la explosión y del corazón).
export const desdeAnimacion = e => tramos(e, DESPUES);
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
