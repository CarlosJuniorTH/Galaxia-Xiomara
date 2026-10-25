// Videoclips de los seis gigantes (director de cámara, js/util/directorCamara.js): al llegar a cada uno empieza su clip;
// mientras dura, la cámara se mueve sola si el gigante tiene pista y los controles están bloqueados (ni girar ni
// acercar o alejar); al terminar, la cámara vuelve con un fundido a un encuadre normal del gigante (a su distancia de
// llegada) y los límites del zoom son razonables (como mucho ~2,5 veces el encuadre: antes, en la supernova, se podía
// alejar muchísimo y la cámara quedaba lejísimos). «Volver a sentirlo» relanza clip, canción y cámara desde el 0.
// VIDEOCLIPS=pulsar,deneb limita los gigantes (por defecto, los seis). Con las canciones si están en assets/musica.
import { existsSync } from 'fs';
import { abrir, visitar } from './arnes.mjs';

const TODOS = ['pulsar', 'cuasar', 'deneb', 'ton618', 'sagitario', 'supernova'];
export default async function ({ base, informe }) {
  const ids = (process.env.VIDEOCLIPS || TODOS.join(',')).split(',').filter(id => TODOS.includes(id));
  const musica = existsSync('assets/musica/pulsar.m4a');
  if (!musica) informe.nota('sin las canciones: los clips siguen su tiempo propio');
  // Sin la intro (?sinIntro): el clic en «Entrar» ya desbloquea el audio. VIDEOCLIPS_TOQUE=1 pasa por la intro entera.
  const { navegador, pagina, errores } = await abrir(base, 'pc', { musica, toque: musica && !!process.env.VIDEOCLIPS_TOQUE, espera: 800 });
  const estado = () => pagina.evaluate(() => {
    const e = window.__galaxia.escena, cam = e.interno.camera;
    return { clip: e.clip, zoom: e.camaraZoom, pos: cam.position.toArray(), destino: e.destino, viajando: e.viajando, escena: document.body.classList.contains('escena-gigante'),
      boton: (() => { const b = document.getElementById('lugar-accion'); return { texto: b.textContent, opacidad: +getComputedStyle(b).opacity }; })() };
  });
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  // Intenta mover la cámara con la rueda y arrastrando: con los controles bloqueados no debe pasar nada.
  async function intentarMover() {
    const antes = await pagina.evaluate(() => window.__galaxia.escena.camaraZoom.distancia);
    await pagina.mouse.move(720, 450); await pagina.mouse.wheel(0, 2400); await pagina.waitForTimeout(250);
    return antes;
  }
  try {
    // La supernova que quiere estallar viajaría a ella a la fuerza en mitad de otro clip: se aplaza (se visita al final).
    await pagina.evaluate(() => window.__galaxia.escena.aplazarSupernova(1e6));
    for (const id of ids) {
      informe.nota(`— ${id}`);
      await visitar(pagina, id);
      if (id === 'supernova') await pagina.waitForFunction(() => window.__galaxia.escena.clip?.id === 'supernova', null, { timeout: 15000, polling: 100 }).catch(() => {});
      await pagina.waitForTimeout(1500);
      const a = await estado();
      informe.comprobar(a.clip?.id === id, `${id}: al llegar empieza su clip`, a.clip);
      informe.comprobar(a.zoom.bloqueada, `${id}: durante el clip los controles están bloqueados`, a.zoom.bloqueada);
      // Con la rueda no se aleja (si el clip no mueve la cámara, la distancia no cambia; si la mueve, la lleva su pista).
      if (!a.clip?.pista) {
        const antes = await intentarMover(), despues = await pagina.evaluate(() => window.__galaxia.escena.camaraZoom.distancia);
        informe.comprobar(Math.abs(despues - antes) / antes < 0.02, `${id}: la rueda no acerca ni aleja durante el clip`, { antes: Math.round(antes), despues: Math.round(despues) });
      }
      await pagina.waitForTimeout(3000);
      const b = await estado();
      if (a.clip?.pista) informe.comprobar(dist(a.pos, b.pos) > a.zoom.encuadre * 0.02, `${id}: la cámara se mueve sola siguiendo su pista`, { recorrido: Math.round(dist(a.pos, b.pos)), encuadre: Math.round(a.zoom.encuadre) });
      else informe.nota(`${id}: sin pista de cámara (se queda en la llegada, bloqueada)`);
      // Hasta el final del clip y de su fundido de salida.
      await pagina.waitForFunction(() => !window.__galaxia.escena.clip, null, { timeout: 120000, polling: 250 });
      await pagina.waitForTimeout(400);
      const c = await estado();
      const razonable = c.zoom.distancia > c.zoom.encuadre * 0.7 && c.zoom.distancia < c.zoom.encuadre * 1.6;
      informe.comprobar(razonable, `${id}: al terminar la cámara queda en un encuadre normal (cerca de su distancia de llegada)`, { distancia: Math.round(c.zoom.distancia), encuadre: Math.round(c.zoom.encuadre) });
      informe.comprobar(c.zoom.max <= c.zoom.encuadre * 3.01 && c.zoom.max >= c.zoom.encuadre * 1.5 && c.zoom.min < c.zoom.distancia, `${id}: límites del zoom razonables (máximo ≤ 3× el encuadre)`, { min: Math.round(c.zoom.min), max: Math.round(c.zoom.max), encuadre: Math.round(c.zoom.encuadre) });
      informe.comprobar(!c.zoom.bloqueada && Math.abs(c.zoom.fov - 60) < 0.01, `${id}: el control vuelve y el campo de visión es el normal`, { bloqueada: c.zoom.bloqueada, fov: c.zoom.fov });
      // Alejar del todo con la rueda: no se puede ir más allá del máximo (ni crece después).
      await pagina.waitForFunction(() => !document.body.classList.contains('escena-gigante'), null, { timeout: 60000, polling: 250 });
      await pagina.waitForTimeout(1500);
      for (let i = 0; i < 6; i++) { await pagina.mouse.move(720, 450); await pagina.mouse.wheel(0, 3000); await pagina.waitForTimeout(150); }
      await pagina.waitForTimeout(1600);
      const d = await estado();
      informe.comprobar(d.zoom.distancia <= d.zoom.encuadre * 3.05 && d.zoom.max <= d.zoom.encuadre * 3.01, `${id}: alejando con la rueda al máximo no se va lejísimos`, { distancia: Math.round(d.zoom.distancia), max: Math.round(d.zoom.max), encuadre: Math.round(d.zoom.encuadre) });
      // «Volver a sentirlo»: visible al terminar; relanza el clip (y su canción) desde el 0.
      informe.comprobar(/Volver a sentirlo/.test(d.boton.texto) && d.boton.opacidad > 0.5, `${id}: el botón «Volver a sentirlo» está a la vista`, d.boton);
      await pagina.click('#lugar-accion');
      await pagina.waitForFunction(id => window.__galaxia.escena.clip?.id === id, id, { timeout: 15000, polling: 100 }).catch(() => {});
      await pagina.waitForTimeout(1200);
      const e = await estado();
      const cancion = musica ? await pagina.evaluate(id => ({ objetivo: window.__bandaSonora.objetivo, t: window.__bandaSonora.tiempo(id) }), id) : null;
      informe.comprobar(e.clip?.id === id && e.clip.segundo < (id === 'supernova' ? 8 : 4) && e.zoom.bloqueada && e.escena, `${id}: «Volver a sentirlo» relanza su clip desde el principio, sin poder saltarlo`, { clip: e.clip, escena: e.escena });
      if (cancion) informe.comprobar(cancion.objetivo === id && cancion.t < 6, `${id}: y su canción vuelve a empezar`, cancion);
      // Irse no se puede mientras dura; se espera al final para pasar al siguiente gigante.
      await pagina.waitForFunction(() => !window.__galaxia.escena.clip && !document.body.classList.contains('escena-gigante'), null, { timeout: 120000, polling: 250 });
      await pagina.waitForTimeout(800);
    }
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
