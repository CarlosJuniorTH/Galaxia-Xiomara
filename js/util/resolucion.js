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
//  · Una bajada que no acelera se deshace: si en la ventana siguiente la mediana no ha mejorado al menos un 10 %, lo que no
//    llega no son los píxeles (el procesador, o una tarjeta gráfica que se atasca en los vértices): vuelve a la resolución
//    de antes y no la baja de ahí durante ~1 minuto. Antes, con la CPU ×4 o en un móvil de procesador modesto, la imagen
//    perdía nitidez al llegar a casa sin ganar ni un cuadro.
//  · Lo mismo con cada escalón de aligerar (alAgotar devuelve true si aplicó uno): a prueba una ventana; si no acelera se
//    devuelve (alRecuperar) y no se reintenta en ~1 minuto. Si la resolución no ayudaba, se prueba aligerar (en un PC con
//    gráfica integrada, lo que pesa son los puntos de la telaraña: bajar su muestra sí acelera).
export function crearReguladorResolucion({ minimo, maximo, inicial, paso = 0.25, ventanaMs = 1500, ventanasParaSubir = 6, alAgotar = () => {}, alRecuperar = () => false }) {
  let actual = inicial, techo = maximo, tiempos = [], suma = 0, estables = 0, subio = false;
  let prueba = null, suelo = minimo, esperaSuelo = 0, esperaAligerar = 0;   // bajada en observación; mínimos provisionales
  function bajar(pasos, mediana) {
    estables = 0;
    if (actual - paso < suelo - 1e-9) { if (!esperaAligerar && alAgotar() === true) prueba = { aligerar: true, mediana }; return null; }
    if (subio) techo = actual - paso;
    else prueba = { desde: actual, mediana };   // (deshacer una subida que no se sostuvo no se pone a prueba)
    subio = false; actual = Math.max(suelo, actual - paso * pasos); return actual;
  }
  function registrar(ms) {
    tiempos.push(ms); suma += ms;
    if (suma < ventanaMs) return null;
    tiempos.sort((a, b) => a - b);
    const mediana = tiempos[tiempos.length >> 1], p90 = tiempos[Math.floor(tiempos.length * 0.9)];
    tiempos = []; suma = 0;
    if (esperaSuelo > 0 && --esperaSuelo === 0) suelo = minimo;
    if (esperaAligerar > 0) esperaAligerar--;
    if (prueba) {
      const { desde, mediana: antes, aligerar } = prueba; prueba = null;
      if (mediana > antes * 0.9) {
        estables = 0;
        if (aligerar) { alRecuperar(); esperaAligerar = 40; return null; }
        suelo = desde; esperaSuelo = 40; actual = desde; return actual;
      }
    }
    if (mediana > 26) return bajar(2, mediana);
    if (mediana > 19.5) return bajar(1, mediana);
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
