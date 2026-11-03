// Cartas «faro» de TON 618 y Sagitario A* (como la del cuásar): antes de terminar su videoclip no hay carta; al terminarlo
// entero, «Hay algo para ti» queda en su tarjeta y abre su carta. Captura en .pruebas/capturas/navegador/faro-*.png.
import { abrir, visitar } from './arnes.mjs';
import { finEscena } from '../../js/util/guionAgujeros.js';

const TITULOS = { ton618: 'Todo cae hacia ti', sagitario: 'Una vuelta más, contigo' };
export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'movil430');
  try {
    for (const id of ['ton618', 'sagitario']) {
      await visitar(pagina, id);
      const antes = await pagina.evaluate(() => document.getElementById('lugar-faro').hidden);
      informe.comprobar(antes, `${id}: durante su videoclip todavía no hay carta`);
      await pagina.waitForFunction(() => !document.getElementById('lugar-faro').hidden, null, { timeout: (finEscena(id) + 20) * 1000, polling: 250 });
      informe.comprobar(true, `${id}: al terminar su videoclip queda «Hay algo para ti»`);
      await pagina.waitForTimeout(1500);   // (la interfaz vuelve con su fundido)
      await pagina.click('#faro-carta');
      await pagina.waitForFunction(() => document.getElementById('lectura').open, null, { timeout: 5000 });
      const titulo = await pagina.textContent('#lectura-titulo');
      informe.comprobar(titulo === TITULOS[id], `${id}: abre su carta`, titulo);
      await pagina.waitForTimeout(1200);
      await pagina.screenshot({ path: `.pruebas/capturas/navegador/faro-${id}-movil.png` });
      await pagina.keyboard.press('Escape'); await pagina.waitForTimeout(600);
    }
    informe.comprobar(!errores.length, 'sin errores en la consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
