// Duración real de los viajes (reloj de pared, del clic a la llegada): 10–15 s según la distancia, el más largo 15 s y
// ninguno por debajo de ~10. Casa → cuásar, entre gigantes, de vuelta a casa, al sistema solar y fuera de él (con su
// fundido, sin salto) y un paseo corto dentro de casa. También que no queda nada del antiguo salto (campo de visión
// abierto, fundido a medias) y que no hay pausa al pulsar.
import { abrir } from './arnes.mjs';
import { duracionViaje } from '../../js/util/aproximacion.js';

const VIAJES = [['hogar', 'cuasar'], ['cuasar', 'supernova'], ['supernova', 'hogar'], ['hogar', 'rosa'], ['rosa', 'ton618'], ['ton618', 'deneb'], ['deneb', 'azul'], ['azul', 'constelacion'], ['constelacion', 'capsulas']];

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc', { espera: 1500 });
  try {
    const resultados = [];
    for (const [desde, hacia] of VIAJES) {
      const r = await pagina.evaluate(async id => {
        const e = window.__galaxia.escena, i = window.__galaxia.interfaz;
        i.terminarEscena();   // (la ceremonia de la supernova es una escena que no se salta: aquí solo se miden viajes)
        const t0 = performance.now();
        let previsto = 0, fovMax = 0, fundidoMax = 0, peorCuadro = 0, antes = t0, cuadros = 0;
        const p = i.visitar(id);
        // Mientras dura: lo previsto, el campo de visión (sin salto no se abre), el fundido y el cuadro más largo.
        const mirar = ahora => { if (!previsto) previsto = e.restanteViaje; cuadros++; if (cuadros > 2) peorCuadro = Math.max(peorCuadro, ahora - antes); antes = ahora;
          fovMax = Math.max(fovMax, e.interno.camera.fov); fundidoMax = Math.max(fundidoMax, +getComputedStyle(document.getElementById('fundido-escena')).opacity); if (e.viajando || e.restanteViaje > 0) requestAnimationFrame(mirar); };
        requestAnimationFrame(mirar);
        await p; const llegado = !e.viajando && e.destino === id;
        return { llegado, real: (performance.now() - t0) / 1000, previsto, fovMax, fundidoFinal: +getComputedStyle(document.getElementById('fundido-escena')).opacity, fundidoMax, peorCuadro: Math.round(peorCuadro) };
      }, hacia);
      resultados.push({ viaje: `${desde} → ${hacia}`, ...r });
      informe.comprobar(r.llegado && r.real <= 15.4 && r.real >= 9.6, `${desde} → ${hacia}: ${r.real.toFixed(2)} s (previsto ${r.previsto.toFixed(2)} s)`, { fov: +r.fovMax.toFixed(1), fundido: +r.fundidoMax.toFixed(2), peorCuadro: r.peorCuadro });
      informe.comprobar(r.fovMax <= 60.01 && r.fundidoFinal === 0, `${desde} → ${hacia}: sin salto (campo de visión fijo) y sin fundido al llegar`);
      // Se deja un momento en el destino (y se cierra la ceremonia de la supernova si empieza, para seguir viajando).
      await pagina.waitForTimeout(800);
    }
    const largo = resultados.find(r => r.viaje === 'ton618 → deneb'), cortos = resultados.filter(r => /constelacion → capsulas/.test(r.viaje));
    informe.comprobar(largo.previsto > 14.8 && largo.previsto <= 15.05, 'el más largo (TON 618 → Deneb) dura 15 s', largo.previsto);
    informe.comprobar(cortos.every(r => r.previsto >= 9.9 && r.previsto < 10.6), 'el paseo corto dentro de casa, ~10 s', cortos.map(r => r.previsto));
    const solares = resultados.filter(r => /rosa|azul/.test(r.viaje));
    informe.comprobar(solares.every(r => r.fundidoMax > 0.9), 'entrar o salir del sistema solar pasa por un fundido completo (no un corte)', solares.map(r => r.fundidoMax));
    informe.nota(`regla: casa → gigante ${duracionViaje(1.96e7).toFixed(2)} s · TON 618 → Deneb ${duracionViaje(7.74e7).toFixed(2)} s`);
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
