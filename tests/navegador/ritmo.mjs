// Ritmo de dibujo del perfil ultra: dentro, sin tocar, sigue a 60 (nunca a 30) y no se duerme nunca: tras 15 s sin tocar
// todo sigue moviéndose a 60 (el cuásar gira, el gas se mueve); un toque sigue a 60. La resolución interna no cambia
// en toda la visita (ni con un giro largo ni en un viaje).
import { abrir, visitar } from './arnes.mjs';

const contar = (pagina, ms) => pagina.evaluate(ms => new Promise(r => { const e = window.__galaxia.escena, n0 = e.cuadrosDibujados, t0 = performance.now(); setTimeout(() => r({ fps: (e.cuadrosDibujados - n0) * 1000 / (performance.now() - t0) }), ms); }), ms);

export default async function ({ base, informe }) {
  for (const perfil of ['iphoneMax', 'pc']) {
    const { navegador, pagina, errores } = await abrir(base, perfil, { espera: 500 });
    try {
      const res0 = await pagina.evaluate(() => document.getElementById('galaxia').dataset.resolucion3d);
      // Esperar a que acabe la entrada (12 s de «entrada» cuentan como animación) sin tocar.
      await pagina.waitForTimeout(12500);
      const a = await contar(pagina, 2000);
      informe.comprobar(a.fps > 50, `${perfil}: sin tocar y con algo animado o recién tocado, a 60 (no a 30)`, a);
      // Sin tocar más de 15 s desde la llegada: sigue moviéndose a 60 (no se queda en una imagen fija).
      await pagina.waitForFunction(() => { const c = document.getElementById('galaxia').dataset; return !c.motivo || c.motivo === 'reciente'; }, null, { timeout: 50000 }).catch(() => {});
      await pagina.waitForTimeout(16000);
      const motivo = await pagina.evaluate(() => document.getElementById('galaxia').dataset.motivo || '');
      const b = await contar(pagina, 2000);
      informe.comprobar(b.fps > 50, `${perfil}: 15 s sin tocar → sigue a 60 (nada se congela)`, { ...b, motivo });
      // Un toque: dibuja en el cuadro siguiente.
      const despierta = await pagina.evaluate(() => new Promise(r => { const e = window.__galaxia.escena, n0 = e.cuadrosDibujados; document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); requestAnimationFrame(() => requestAnimationFrame(() => r(e.cuadrosDibujados - n0))); }));
      informe.comprobar(despierta >= 1, `${perfil}: el toque vuelve a dibujar en el cuadro siguiente`, { cuadros: despierta });
      const c = await contar(pagina, 1500);
      informe.comprobar(c.fps > 50, `${perfil}: tras el toque, a 60 otra vez`, c);
      // Un viaje y un giro: la resolución interna no cambia.
      await pagina.evaluate(() => window.__galaxia.escena.interno?.lento?.(4));
      await visitar(pagina, 'cuasar');
      const res1 = await pagina.evaluate(() => document.getElementById('galaxia').dataset.resolucion3d);
      informe.comprobar(res0 === res1, `${perfil}: resolución interna fija toda la visita`, { antes: res0, despues: res1 });
      informe.comprobar(errores.length === 0, `${perfil}: sin errores de consola`, errores.slice(0, 3));
    } finally { await navegador.close(); }
  }
}
