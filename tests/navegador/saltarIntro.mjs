// Saltar la intro: el botón sale solo mientras corre el clip; al pulsarlo se llega a la tarjeta sin volver atrás, la canción salta
// a su compás y se puede entrar con normalidad.
import { mkdirSync } from 'node:fs';
import { lanzar } from './arnes.mjs';
const CAP = '.pruebas/capturas/navegador/saltarIntro';
export default async function ({ base, informe: inf }) {
  mkdirSync(CAP, { recursive: true });
  for (const perfil of ['movil430', 'pc']) {
    const { navegador, pagina, errores } = await lanzar(perfil, { musica: true });
    try {
      await pagina.goto(`${base}/?calidad=alta&sinEstreno#debug`);
      await pagina.waitForSelector('#toque:not([hidden])', { timeout: 30000 });
      const antes = await pagina.evaluate(() => getComputedStyle(document.getElementById('btn-saltar-intro')).visibility);
      inf.comprobar(antes === 'hidden', `${perfil}: sin clip, no hay botón`, antes);
      await pagina.click('#toque');
      await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 90000 });
      await pagina.waitForTimeout(3500);
      const b = await pagina.evaluate(() => { const r = document.getElementById('btn-saltar-intro').getBoundingClientRect(); return { alto: r.height, cabe: r.left >= 0 && r.right <= innerWidth && r.top >= 0, t: window.__intro.tiempo }; });
      inf.comprobar(b.cabe && b.alto >= 44 && b.t > 1, `${perfil}: durante el clip se ve y se puede tocar`, b);
      await pagina.screenshot({ path: `${CAP}/${perfil}-clip.png` });
      // Cada cuadro tras el toque: el reloj del clip nunca vuelve atrás de la tarjeta.
      const r = await pagina.evaluate(() => new Promise(fin => {
        const v = [], H0 = performance.now(); document.getElementById('btn-saltar-intro').click();
        (function c() { v.push(window.__intro.tiempo); if (performance.now() - H0 < 1500) requestAnimationFrame(c); else fin({ min: Math.min(...v.slice(2).filter(x => x !== null)), max: Math.max(...v), s: window.__bandaSonora?.tiempo('inicio') ?? null, formado: document.getElementById('entrada').classList.contains('formado') }); })();
      }));
      inf.comprobar(r.formado && r.min >= 20, `${perfil}: llega a la tarjeta, sin volver atrás`, r);
      inf.comprobar(r.s !== null && r.s > 20, `${perfil}: la canción ha saltado con él`, { segundo: r.s });
      await pagina.waitForTimeout(1800);
      await pagina.screenshot({ path: `${CAP}/${perfil}-tarjeta.png` });
      const oculto = await pagina.evaluate(() => getComputedStyle(document.getElementById('btn-saltar-intro')).visibility);
      inf.comprobar(oculto === 'hidden', `${perfil}: en la tarjeta ya no se ve`, oculto);
      await pagina.waitForFunction(() => document.getElementById('btn-entrar')?.classList.contains('preparado'), null, { timeout: 40000 });
      await pagina.evaluate(() => document.getElementById('btn-entrar').click()); await pagina.waitForTimeout(1500);
      inf.comprobar(await pagina.evaluate(() => document.body.classList.contains('dentro')), `${perfil}: se entra con normalidad`);
      inf.comprobar(!errores.length, `${perfil}: sin errores en la consola`, errores.slice(0, 4));
    } finally { await navegador.close(); }
  }
}
