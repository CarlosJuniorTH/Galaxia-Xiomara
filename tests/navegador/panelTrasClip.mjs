// El panel de abajo (Explorar, Mi álbum, Cartas, Una pista, Postal) vuelve siempre al terminar el videoclip de un gigante
// (Carlos vio que desaparecía y no volvía): justo al acabar, tras un rato sin tocar (la contemplación lo retira) con un
// toque, y tras «Volver a sentirlo». PANEL=pulsar,ton618 elige los gigantes (por defecto, el púlsar y TON 618).
import { existsSync } from 'fs';
import { abrir, visitar } from './arnes.mjs';

export async function estadoPanel(pagina) {
  return pagina.evaluate(() => {
    const m = document.getElementById('muelle'), cs = getComputedStyle(m), r = m.getBoundingClientRect();
    let inerte = false; for (let n = m; n; n = n.parentElement) if (n.inert) inerte = true;
    const b = m.querySelector('button'), br = b.getBoundingClientRect(), arriba = document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2);
    return { opacidad: +cs.opacity, eventos: cs.pointerEvents, visible: cs.visibility, oculto: m.hidden, inerte, alto: Math.round(r.height), tocable: !!arriba && m.contains(arriba),
      clases: document.body.className, hud: document.getElementById('hud')?.className, escena: document.body.dataset.escenaEnCurso ?? null };
  });
}
export const panelVisible = p => p.opacidad > 0.9 && p.eventos !== 'none' && p.visible === 'visible' && !p.oculto && !p.inerte && p.alto > 20 && p.tocable;

export default async function ({ base, informe }) {
  const ids = (process.env.PANEL || 'pulsar,ton618').split(',');
  const musica = existsSync('assets/musica/pulsar.m4a');
  const perfil = process.env.PERFIL || 'pc';
  const { navegador, pagina, errores } = await abrir(base, perfil, { musica, espera: 800 });
  try {
    await pagina.evaluate(() => window.__galaxia.escena.aplazarSupernova(1e6));
    for (const id of ids) {
      await visitar(pagina, id);
      await pagina.waitForTimeout(1500);
      await pagina.waitForFunction(() => !document.body.classList.contains('escena-gigante') && !window.__galaxia.escena.clip, null, { timeout: 120000, polling: 250 });
      await pagina.waitForTimeout(1500);
      const fin = await estadoPanel(pagina);
      informe.comprobar(panelVisible(fin), `${id}: al terminar el clip el panel de abajo vuelve`, fin);
      await pagina.waitForTimeout(11000);
      const { width: an, height: al } = pagina.viewportSize(); await pagina.mouse.click(an * 0.9, al * 0.3); await pagina.waitForTimeout(1600);
      const toque = await estadoPanel(pagina);
      informe.comprobar(panelVisible(toque), `${id}: tras un rato sin tocar, un toque lo devuelve`, toque);
      await pagina.click('#lugar-accion');
      await pagina.waitForTimeout(2000);
      await pagina.waitForFunction(() => !document.body.classList.contains('escena-gigante') && !window.__galaxia.escena.clip, null, { timeout: 120000, polling: 250 });
      await pagina.waitForTimeout(1500);
      const otra = await estadoPanel(pagina);
      informe.comprobar(panelVisible(otra), `${id}: tras «Volver a sentirlo», el panel vuelve`, otra);
    }
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
