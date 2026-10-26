// Calidad automática (movido de index.js sin cambios): la resolución dinámica medida (util/resolucion.js) y, si con la
// mínima el aparato sigue sin llegar, los escalones que aligeran lo más caro (y lo recuperan cuando va sobrado).
import { crearReguladorResolucion } from '../../util/resolucion.js';
import { esMovil } from '../../util/dispositivo.js';

export function crearGestorCalidad({ canvas, nucleo, telarana, muestrasNube }) {
  // Resolución dinámica medida (ver util/resolucion.js).
  // En móvil empieza en 2 como mucho (más no se nota en pantalla) y baja hasta 1,5 (nítido) si el aparato no llega a 60 FPS; sube
  // solo tras seis ventanas estables; si la subida no se sostiene, vuelve y fija ese techo.
  // Si con la resolución mínima el aparato sigue sin llegar a 60 FPS, se aligera lo más caro (las nebulosas con
  // volumen, con menos muestras por rayo), en dos escalones como mucho: fluido antes que perfecto en un móvil modesto.
  // Escalones (como la calidad automática de los juegos): si el aparato no llega —un móvil modesto o uno caliente que ha
  // bajado su GPU— se aligera paso a paso; cuando vuelve a ir sobrado durante un rato, se recupera en orden inverso.
  const muestrasBase = muestrasNube.value;
  const ESCALONES = [
    [() => { muestrasNube.value = Math.max(8, Math.round(muestrasBase * 0.7)); }, () => { muestrasNube.value = muestrasBase; }],
    [() => { muestrasNube.value = Math.max(8, Math.round(muestrasBase * 0.5)); }, () => { muestrasNube.value = Math.max(8, Math.round(muestrasBase * 0.7)); }],
    [() => telarana.escalarCapaGalaxias(telarana.escalaCapaInicial * 0.75), () => telarana.escalarCapaGalaxias(telarana.escalaCapaInicial)],
    [() => telarana.fijarMuestra(telarana.muestraInicial * 0.65), () => telarana.fijarMuestra(telarana.muestraInicial)]
  ];
  let aligerado = 0;
  const aligerar = () => { if (aligerado >= ESCALONES.length) return false; ESCALONES[aligerado][0](); aligerado++; canvas.dataset.aligerado = String(aligerado); return true; };
  const recuperar = () => { if (!aligerado) return false; aligerado--; ESCALONES[aligerado][1](); canvas.dataset.aligerado = String(aligerado); return true; };
  const regular = crearReguladorResolucion({ minimo: esMovil ? Math.min(1.5, nucleo.resolucion) : 1, maximo: nucleo.prTope,   // lo reservado (nucleo.js): subir hasta ahí no rehace nada
    inicial: nucleo.resolucion, alAgotar: aligerar, alRecuperar: recuperar,
    // Reacción en ~1 s (antes 1,5 s por ventana y 9 s para subir): con el equipo cargado por otros programas la imagen se
    // ajusta enseguida, y cuando se libera recupera la nitidez en ~4 s (la mediana sigue ignorando un tirón suelto).
    ventanaMs: 1000, ventanasParaSubir: 4 });
  // (El cambio de resolución ya no rehace búferes, zona.js: se aplica en el acto.)
  let resolucionPendiente = null;
  function regularResolucion(ms) { const nueva = regular(ms); if (nueva !== null) resolucionPendiente = nueva; aplicarResolucionPendiente(); }
  // Cambiar de resolución ya no rehace ningún búfer (solo la zona en la que se dibuja, zona.js): se aplica en el acto.
  // Antes esperaba 2,5 s tras soltar el dedo… y caía justo en la cola de la inercia: un cuadro de 30–100 ms en un móvil.
  function aplicarResolucionPendiente() { if (resolucionPendiente === null) return; nucleo.fijarResolucion(resolucionPendiente); resolucionPendiente = null; regular.reiniciar(); }
  return { regular, regularResolucion, aplicarResolucionPendiente, aligerar, recuperar, get aligerado() { return aligerado; } };
}
