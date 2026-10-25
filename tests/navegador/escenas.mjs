// Escenas de los gigantes con las canciones de verdad (assets/musica): al llegar a Deneb su canción y su escena empiezan
// en el mismo cuadro; la escena no se puede saltar (los controles para irse se apagan y los viajes se rechazan) y al
// terminar vuelven con un fundido; la supernova que va a estallar pasa por encima de la escena de otro gigante. Al acabar
// la canción del lugar suena su estancia. (Sin los archivos de música, se omite.)
import { existsSync } from 'fs';
import { abrir } from './arnes.mjs';

const CONTROLES = ['muelle', 'btn-mapa', 'btn-tour'];
export default async function ({ base, informe }) {
  if (!existsSync('assets/musica/deneb.m4a')) { informe.nota('sin assets/musica/deneb.m4a: se omite'); return; }
  const { navegador, pagina, errores } = await abrir(base, 'pc', { musica: true, toque: true, espera: 1000 });
  const opacidades = () => pagina.evaluate(ids => ids.map(id => +getComputedStyle(document.getElementById(id)).opacity), CONTROLES);
  try {
    await pagina.evaluate(() => {
      window.__llegada = null;
      window.__galaxia.interfaz.visitar('deneb');
      const mirar = () => { if (window.__galaxia.escena.viajando || window.__galaxia.escena.destino !== 'deneb') return requestAnimationFrame(mirar);
        window.__llegada = { cancion: window.__bandaSonora.objetivo, t: window.__bandaSonora.tiempo('deneb'), escena: document.body.classList.contains('escena-gigante') }; };
      setTimeout(() => requestAnimationFrame(mirar), 300);
    });
    await pagina.waitForFunction(() => window.__llegada, null, { timeout: 40000, polling: 50 });
    const llegada = await pagina.evaluate(() => window.__llegada);
    informe.comprobar(llegada.cancion === 'deneb' && llegada.t < 0.1 && llegada.escena, 'al llegar a Deneb, su canción y su escena empiezan en el mismo cuadro', llegada);
    await pagina.waitForTimeout(1000);
    const durante = await opacidades();
    informe.comprobar(durante.every(o => o < 0.05), 'durante la escena, muelle, mapa y recorrido se apagan', durante);
    await pagina.evaluate(() => window.__galaxia.interfaz.visitar('hogar'));
    await pagina.waitForTimeout(600);
    const sigue = await pagina.evaluate(() => ({ destino: window.__galaxia.escena.destino, viajando: window.__galaxia.escena.viajando, aviso: document.getElementById('brindis').textContent }));
    informe.comprobar(sigue.destino === 'deneb' && !sigue.viajando, 'la escena no se puede saltar: irse a otro sitio se rechaza con un aviso', sigue);
    // Hasta el final de la escena (lo que dura su canción) y un poco más: vuelven los controles y entra la estancia.
    const restante = await pagina.evaluate(() => window.__galaxia.interfaz.escenaActual?.restante ?? 0);
    informe.comprobar(restante > 35 && restante < 44, 'la escena dura lo que su canción (43,4 s)', +restante.toFixed(1));
    await pagina.waitForFunction(() => !document.body.classList.contains('escena-gigante'), null, { timeout: 60000, polling: 200 });
    await pagina.waitForTimeout(1500);
    const despues = await opacidades(), musica = await pagina.evaluate(() => window.__bandaSonora.objetivo);
    informe.comprobar(despues.every(o => o > 0.5), 'al terminar, los controles vuelven (con un fundido)', despues);
    informe.comprobar(musica === 'deneb-estancia', 'y al acabar su canción suena su estancia', musica);
    // Otra escena en curso (se vuelve a Deneb … se abre a mano) y la supernova quiere estallar: pasa por encima.
    await pagina.evaluate(() => { window.__galaxia.interfaz.escenaEnCurso('deneb', 60); window.__galaxia.escena.aplazarSupernova(0); });
    await pagina.waitForFunction(() => window.__galaxia.escena.viajando && window.__galaxia.escena.destino === 'supernova', null, { timeout: 8000, polling: 100 }).catch(() => {});
    const forzado = await pagina.evaluate(() => ({ destino: window.__galaxia.escena.destino, escena: window.__galaxia.interfaz.escenaActual }));
    informe.comprobar(forzado.destino === 'supernova', 'la supernova que va a estallar tiene prioridad sobre la escena de otro gigante', forzado);
    await pagina.waitForFunction(() => !window.__galaxia.escena.viajando, null, { timeout: 40000, polling: 100 });
    await pagina.waitForTimeout(1500);
    const ceremonia = await pagina.evaluate(() => ({ escena: window.__galaxia.interfaz.escenaActual, musica: window.__bandaSonora.objetivo, t: window.__bandaSonora.tiempo('supernova'), fase: document.getElementById('supernova-amor')?.dataset.fase }));
    informe.comprobar(ceremonia.escena?.id === 'supernova' && ceremonia.musica === 'supernova' && ceremonia.t < 2.5 && ceremonia.fase === 'encuentro', 'al llegar empieza su ceremonia con «Sparks», también como escena que no se salta', ceremonia);
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
