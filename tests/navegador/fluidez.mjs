// Fluidez como en un móvil: CPU limitada ×4, gestos reales con el dedo (arrastre rápido y soltar: inercia), casa en reposo,
// un viaje completo y la llegada a un gigante. Falla si algún cuadro pasa de 33 ms o el p99 de 25 ms, si se rehacen
// búferes (reservas) durante la interacción o si se compila algún programa de GPU después de la carga. Guarda un informe
// JSON en .pruebas/fluidez.json. (No sustituye la prueba en un teléfono físico.)
import { writeFileSync, mkdirSync } from 'fs';
import { abrir, visitar } from './arnes.mjs';

const LIMITE = 34, P99 = 25;   // un cuadro perdido a 60 Hz son 33,3 ms: se admite el redondeo, no dos perdidos seguidos

export default async function ({ base, informe }) {
  const { navegador, pagina } = await abrir(base, 'iphoneMax', { espera: 2000 });
  const cdp = await pagina.context().newCDPSession(pagina);
  const datos = {};
  try {
    await pagina.evaluate(() => {
      // Intervalos entre cuadros (marcas del rAF) y tareas largas del hilo principal.
      const M = window.__fluidez = { dt: [], largas: [] }; let p = 0;
      const f = t => { if (p) M.dt.push(t - p); p = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) M.largas.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: false }); } catch {}
    });
    const estado = () => pagina.evaluate(() => { const c = document.getElementById('galaxia').dataset, r = window.__galaxia.escena.rendimiento; return { reservas: +c.reservas3d || 0, programas: r.programas }; });
    const tramo = async (nombre, accion) => {
      const antes = await estado();
      // Se limita la CPU y se deja medio segundo para que se asiente (el propio cambio da un tropiezo que no es de la página).
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await pagina.waitForTimeout(500);
      await pagina.evaluate(() => { window.__fluidez.dt = []; window.__fluidez.largas = []; });
      await accion();
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const despues = await estado();
      const { dt, largas } = await pagina.evaluate(() => ({ dt: window.__fluidez.dt.filter(x => x < 1000), largas: window.__fluidez.largas }));
      const o = dt.slice().sort((a, b) => a - b), q = p => +(o[Math.min(o.length - 1, Math.floor(o.length * p))] || 0).toFixed(1);
      const r = { cuadros: dt.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: +(o.at(-1) || 0).toFixed(1), sobre33: dt.filter(x => x > LIMITE).length, tareasLargas: largas, reservas: despues.reservas - antes.reservas, programasNuevos: despues.programas - antes.programas };
      datos[nombre] = r;
      informe.comprobar(r.sobre33 === 0 && r.p99 <= P99, `${nombre}: ningún cuadro > 33 ms y p99 ≤ ${P99} ms`, r);
      informe.comprobar(r.reservas === 0, `${nombre}: sin rehacer búferes durante la interacción`, { reservas: r.reservas });
      informe.comprobar(r.programasNuevos <= 0, `${nombre}: ningún programa de GPU nuevo después de la carga`, { programas: r.programasNuevos });
    };
    // Gesto real con el dedo: arrastres rápidos en varias direcciones, soltando con impulso; 3 s de inercia tras el último.
    const arrastrar = async (dx, dy) => {
      let x = 215, y = 420; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let k = 0; k < 14; k++) { x += dx; y += dy; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await new Promise(r => setTimeout(r, 16)); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await tramo('casa en reposo', () => pagina.waitForTimeout(3000));
    await tramo('arrastre e inercia', async () => { for (const [dx, dy] of [[18, 0], [-16, 4], [10, -8], [22, 0]]) { await arrastrar(dx, dy); await pagina.waitForTimeout(700); } await pagina.waitForTimeout(3000); });
    await tramo('viaje y llegada a un gigante', async () => { await visitar(pagina, 'cuasar'); await pagina.waitForTimeout(1500); });
    await tramo('arrastre e inercia en el gigante', async () => { for (const [dx, dy] of [[-18, 0], [16, -4]]) { await arrastrar(dx, dy); await pagina.waitForTimeout(700); } await pagina.waitForTimeout(3000); });
  } finally {
    mkdirSync('.pruebas', { recursive: true }); writeFileSync('.pruebas/fluidez.json', JSON.stringify(datos, null, 2));
    await navegador.close();
  }
}
