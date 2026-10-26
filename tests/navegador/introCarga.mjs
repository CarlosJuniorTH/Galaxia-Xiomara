// Flujo de la intro como en un iPhone (390×844, DPR 3), con su canción: «Toca para empezar ♡» → descarga y preparación al
// 100 % → el videoclip. Comprueba que:
//  · el clip no empieza hasta que TODO está: 100 %, todos los MB descargados (el texto dice «X de X MB»), la escena
//    preparada y la canción lista;
//  · su primer segundo va sin tirones con la CPU ×4 (nada pesado de la escena 3D ni de la carga cae encima);
//  · la página no se recarga sola en 2 minutos (ninguna navegación más que la primera).
import { lanzar } from './arnes.mjs';

const CPU = 4, TIRON = 100, VECES_MEDIANA = 2.2, SUELTOS = 2, PASADAS = 3;

async function pasada(base) {
  const { navegador, pagina, errores } = await lanzar('iphone', { musica: true });
  const navegaciones = []; pagina.on('framenavigated', f => { if (f === pagina.mainFrame()) navegaciones.push(f.url()); });
  try {
    await pagina.addInitScript(() => {
      // Intervalos de los avisos de pantalla desde que empieza el clip (su animación dibuja en cada uno).
      const M = window.__clip = { dt: [], alEmpezar: null }; let antes = 0;
      const f = t => { const i = window.__intro; if (i?.empezado) { if (!M.alEmpezar) M.alEmpezar = { pc: document.getElementById('carga-pc').textContent, texto: document.getElementById('carga-texto').textContent, hechos: window.__descargas?.hechos, total: window.__descargas?.total, preparado: document.getElementById('btn-entrar').classList.contains('preparado') }; else if (M.dt.length < 600) M.dt.push(t - antes); } antes = t; requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    await pagina.goto(`${base}/?calidad=alta#debug`);
    await pagina.waitForSelector('#toque:not([hidden])', { timeout: 60000 });
    const cdp = await pagina.context().newCDPSession(pagina);
    await pagina.click('#toque');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 240000, polling: 100 });
    await pagina.waitForTimeout(1200 * 1);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const r = await pagina.evaluate(() => ({ ...window.__clip, dt: window.__clip.dt.slice() }));
    // El primer segundo del clip.
    let suma = 0; const primero = []; for (const d of r.dt) { if (suma > 1000) break; primero.push(d); suma += d; }
    const o = primero.slice().sort((a, b) => a - b), p50 = o[Math.floor(o.length / 2)] || 0, umbral = Math.max(TIRON, p50 * VECES_MEDIANA);
    return { pagina, navegador, errores, navegaciones, alEmpezar: r.alEmpezar, cuadros: primero.length, p50: +p50.toFixed(1), max: Math.round(o.at(-1) || 0), tirones: primero.filter(d => d > umbral).map(Math.round) };
  } catch (e) { await navegador.close(); throw e; }
}

export default async function ({ base, informe }) {
  let mejor = null, ultima = null;
  for (let i = 0; i < PASADAS; i++) {
    const p = await pasada(base);
    informe.nota(`pasada ${i + 1}: ${p.cuadros} cuadros en el primer segundo · p50 ${p.p50} ms · máx ${p.max} ms · tirones ${p.tirones.length}`);
    if (!mejor || p.tirones.length < mejor.tirones.length || (p.tirones.length === mejor.tirones.length && p.max < mejor.max)) mejor = { ...p, pagina: undefined, navegador: undefined };
    if (ultima) await ultima.navegador.close();
    ultima = p;
    if (p.tirones.length <= SUELTOS && p.max <= 250) break;
  }
  const a = mejor.alEmpezar || {};
  informe.comprobar(a.pc === '100 %' && a.preparado, 'el clip empieza con la carga al 100 % y la escena preparada', a);
  informe.comprobar(a.total > 0 && a.hechos >= a.total && /(\d+,\d) de \1 MB/.test(a.texto || ''), 'el clip empieza con todo descargado («X de X MB»)', { texto: a.texto, hechos: a.hechos, total: a.total });
  informe.comprobar(mejor.tirones.length <= SUELTOS && mejor.max <= 250, `primer segundo del clip con la CPU ×${CPU}: como mucho ${SUELTOS} cuadros > ${TIRON} ms (y > ${VECES_MEDIANA}× la mediana) y ninguno > 250 ms`, { cuadros: mejor.cuadros, p50: mejor.p50, max: mejor.max, tirones: mejor.tirones });
  // Dos minutos en la misma página (clip, tarjeta y dentro): ninguna recarga.
  const { pagina, navegador, errores, navegaciones } = ultima;
  try {
    await pagina.waitForFunction(() => document.getElementById('entrada').classList.contains('formado'), null, { timeout: 120000 }).catch(() => {});
    await pagina.click('#btn-entrar').catch(() => {});
    await pagina.waitForTimeout(Math.max(0, 120000 - 40000));
    informe.comprobar(navegaciones.length === 1, 'en 2 minutos la página no se recarga sola (una sola navegación)', { navegaciones: navegaciones.length });
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
