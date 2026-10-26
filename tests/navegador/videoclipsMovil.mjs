// Videoclips en el móvil vertical (390×844): durante cada clip la vista no se desplaza por la franja libre de la tarjeta
// (tampoco al empezar, al llegar del viaje), el gigante queda cerca del centro de la pantalla y la cámara se aleja lo
// que haga falta para que a lo ancho quepa lo mismo que en el PC (con tope). Capturas de cuatro momentos de cada clip en
// .pruebas/capturas/navegador/clip-movil-<gigante>-<n>.png. VIDEOCLIPS=pulsar,deneb limita los gigantes.
import { existsSync } from 'fs';
import { abrir, visitar } from './arnes.mjs';

const TODOS = ['pulsar', 'cuasar', 'deneb', 'ton618', 'sagitario', 'supernova'];
const MOMENTOS = [0.1, 0.35, 0.6, 0.85];
export default async function ({ base, informe }) {
  const ids = (process.env.VIDEOCLIPS || TODOS.join(',')).split(',').filter(id => TODOS.includes(id));
  const musica = existsSync('assets/musica/pulsar.m4a');
  const { navegador, pagina, errores } = await abrir(base, 'movil390', { musica, espera: 800 });
  const medir = () => pagina.evaluate(() => {
    const e = window.__galaxia.escena, i = e.interno, c = e.clip; if (!c) return null;
    i.camera.updateMatrixWorld();
    const v = new i.THREE.Vector3(...c.centro).project(i.camera);
    return { id: c.id, fase: c.fase, segundo: +(c.segundo ?? 0).toFixed(2), x: +v.x.toFixed(3), y: +v.y.toFixed(3), delante: v.z < 1, desplazamiento: i.camera.view?.enabled ? +i.camera.view.offsetY.toFixed(1) : 0, R: Math.round(c.R), Rnormal: Math.round(c.Rnormal) };
  });
  try {
    await pagina.evaluate(() => window.__galaxia.escena.aplazarSupernova(1e6));
    for (const id of ids) {
      await visitar(pagina, id);
      await pagina.waitForFunction(id => window.__galaxia.escena.clip?.id === id, id, { timeout: 15000, polling: 50 }).catch(() => {});
      const inicio = await medir();
      informe.comprobar(inicio && Math.abs(inicio.desplazamiento) < 8, `${id}: al empezar el clip la vista ya está centrada (sin desplazamiento de la franja libre)`, inicio);
      const dura = await pagina.evaluate(id => window.__bandaSonora?.duracion?.(id) || 35, id);
      const medidas = [];
      for (let k = 0; k < MOMENTOS.length; k++) {
        await pagina.waitForFunction(([s]) => (window.__galaxia.escena.clip?.segundo ?? 1e9) >= s, [MOMENTOS[k] * dura], { timeout: 90000, polling: 100 }).catch(() => {});
        const m = await medir(); if (!m) break;
        medidas.push(m);
        await pagina.screenshot({ path: `.pruebas/capturas/navegador/clip-movil-${id}-${k + 1}.png` });
      }
      informe.nota(`${id}: ${JSON.stringify(medidas.map(m => [m.segundo, m.x, m.y, m.desplazamiento]))}`);
      informe.comprobar(medidas.length === MOMENTOS.length && medidas.every(m => m.delante && Math.abs(m.desplazamiento) < 1), `${id}: durante el clip la vista no se desplaza (el gigante, sin la franja de la tarjeta)`, medidas.map(m => m.desplazamiento));
      informe.comprobar(medidas.every(m => Math.abs(m.x) < 0.5 && Math.abs(m.y) < 0.5), `${id}: el gigante queda cerca del centro de la pantalla en los cuatro momentos`, medidas.map(m => [m.x, m.y]));
      if (id !== 'supernova') informe.comprobar(medidas[0] && medidas[0].R > medidas[0].Rnormal * 1.2, `${id}: en vertical la cámara se aleja más que al llegar para que quepa a lo ancho como en el PC`, medidas[0] && { R: medidas[0].R, llegada: medidas[0].Rnormal });
      await pagina.waitForFunction(() => !window.__galaxia.escena.clip && !document.body.classList.contains('escena-gigante'), null, { timeout: 120000, polling: 250 });
      await pagina.waitForTimeout(800);
    }
    // «El gigante del corazón»: su vuelta (el gesto del lugar) también la lleva el director: suave, centrada y a la
    // distancia del móvil, con los controles bloqueados, y al terminar vuelve al encuadre de llegada.
    await visitar(pagina, 'gigante');
    await pagina.waitForTimeout(1000);
    const vuelta = pagina.evaluate(() => window.__galaxia.escena.accion('gigante'));
    await pagina.waitForTimeout(6000);
    const g = await medir(), bloqueada = await pagina.evaluate(() => window.__galaxia.escena.camaraZoom.bloqueada);
    await pagina.screenshot({ path: '.pruebas/capturas/navegador/clip-movil-gigante.png' });
    informe.comprobar(g?.id === 'gigante' && bloqueada && Math.abs(g.x) < 0.2 && Math.abs(g.y) < 0.2 && Math.abs(g.desplazamiento) < 1 && g.R > g.Rnormal * 1.2, 'el gigante del corazón: su vuelta va con el director, centrada, alejada en vertical y sin tocar', { ...g, bloqueada });
    const termino = await vuelta, z = await pagina.evaluate(() => window.__galaxia.escena.camaraZoom);
    informe.comprobar(termino && !z.bloqueada && Math.abs(z.distancia / z.encuadre - 1) < 0.05, 'y al terminar vuelve al encuadre de llegada con el control', { termino, distancia: Math.round(z.distancia), encuadre: Math.round(z.encuadre) });
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
