// Resolución dinámica, como en los juegos: se mide el tiempo real entre fotogramas en ventanas
// cortas (1,5 s) mientras se dibuja a 60 FPS. Solo cambia la resolución interna de la escena; el
// lienzo sigue siempre a la nativa (nucleo.js). Cada persona abre el universo con su propio aparato
// (GitHub solo sirve los archivos): el regulador lo adapta enseguida para que vaya fluido en movimiento.
//  · Baja 0,5 si la mediana pasa de 26 ms (menos de 38 FPS: va claramente a saltos) y 0,25 si pasa
//    de 19,5 ms (menos de ~51 FPS). La mediana ignora un tirón aislado (cargar algo, el recolector).
//  · Sube 0,25 solo tras seis ventanas CONSECUTIVAS estables (9 s, p90 < 18,5 ms); cualquier
//    ventana que no cumpla reinicia la cuenta (histéresis entre 18,5 y 19,5 ms).
//  · Si una subida no se sostiene, vuelve atrás y fija ahí el techo para no oscilar.
//  · Si ya está en el mínimo y sigue lento, avisa (alAgotar) para aligerar efectos (index.js); con margen estable,
//    alRecuperar los devuelve uno a uno antes de volver a subir la resolución (el teléfono se ha enfriado).
//  · reiniciar() descarta la ventana en curso (pausas, cambios de estado o de tamaño).
export function crearReguladorResolucion({ minimo, maximo, inicial, paso = 0.25, ventanaMs = 1500, ventanasParaSubir = 6, alAgotar = () => {}, alRecuperar = () => false }) {
  let actual = inicial, techo = maximo, tiempos = [], suma = 0, estables = 0, subio = false;
  function bajar(pasos) {
    estables = 0;
    if (actual - paso < minimo - 1e-9) { alAgotar(); return null; }
    if (subio) techo = actual - paso;
    subio = false; actual = Math.max(minimo, actual - paso * pasos); return actual;
  }
  function registrar(ms) {
    tiempos.push(ms); suma += ms;
    if (suma < ventanaMs) return null;
    tiempos.sort((a, b) => a - b);
    const mediana = tiempos[tiempos.length >> 1], p90 = tiempos[Math.floor(tiempos.length * 0.9)];
    tiempos = []; suma = 0;
    if (mediana > 26) return bajar(2);
    if (mediana > 19.5) return bajar(1);
    subio = false;
    if (p90 >= 18.5) { estables = 0; return null; }
    if (++estables >= ventanasParaSubir) {
      // Con margen: primero se recupera lo que se aligeró (index.js) y luego la resolución.
      if (alRecuperar()) { estables = 0; return null; }
      if (actual + paso <= techo + 1e-9) { actual += paso; estables = 0; subio = true; return actual; }
    }
    return null;
  }
  registrar.reiniciar = () => { tiempos = []; suma = 0; estables = 0; };
  return registrar;
}
