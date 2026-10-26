// La intro de verdad (con «Maps», assets/musica/inicio.m4a): «Toca para empezar ♡», la carga y el videoclip de 32 s.
// 1. Capturas del clip cada 2 s y en sus golpes, fijando el reloj del clip en cada instante (window.__intro.fijar), en el
//    iPhone, en el PC y en los tamaños de móvil (390×844, 360×780, 430×932 y apaisado): .pruebas/capturas/intro/<perfil>-<segundo>.png
//    (para revisarlas a ojo).
// 2. Fluidez en el iPhone con la CPU ×4: se espera a que la carga termine sin tocar, se limita la CPU y se toca; el clip
//    entero (y la tarjeta) con p99 ≤ 25 ms (ver SUELTOS). El reloj del clip sigue al de la canción, la tarjeta
//    sale en su marca y no hay forma de saltarlo. Guarda .pruebas/intro.json.
import { mkdirSync, writeFileSync } from 'fs';
import { lanzar } from './arnes.mjs';
import { HITOS } from '../../js/ui/portada.js';

// Se admiten hasta dos cuadros sueltos de más de 33 ms (y ninguno de más de 120): tras la carga del universo, V8 hace
// una recolección grande (el «reductor de memoria», ~25 ms reales en un móvil, ~100 ms con la CPU ×4) que puede caer en
// cualquier momento del clip; el resto, ninguno. La tarjeta se prepara en el negro de antes de aparecer (29,55 s).
const LIMITE = 34, P99 = 25, SUELTOS = 2, MAXIMO = 120;
const INSTANTES = [...Array.from({ length: 17 }, (_, i) => i * 2), 1.4, 2.6, 3.5, 5.6, 7.6, 9.8, 11.1, 13.2, 15.9, 18.5, 20.3, 21, 22.8, 25, 25.8, 26.6, 27.4, 27.7, 28.3, 28.9, 29.5, 30.4, 31.3]
  .sort((a, b) => a - b);

async function abrirIntro(perfil, base, { tocar = true, calma = false } = {}) {
  const { navegador, pagina, errores } = await lanzar(perfil, { musica: true });
  if (calma) await pagina.emulateMedia({ reducedMotion: 'reduce' });
  await pagina.goto(`${base}/?calidad=alta#debug`);
  await pagina.waitForSelector('#toque:not([hidden])', { timeout: 30000 });
  if (tocar) await pagina.click('#toque');
  return { navegador, pagina, errores };
}

export default async function ({ base, informe }) {
  mkdirSync('.pruebas/capturas/intro', { recursive: true });
  // 1. Capturas.
  for (const perfil of process.env.INTRO_SIN_CAPTURAS ? [] : (process.env.INTRO_PERFILES || 'iphoneMax,pc,movil390,movil360,movil430,movilApaisado').split(',')) {
    const { navegador, pagina, errores } = await abrirIntro(perfil, base);
    try {
      await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 150000, polling: 100 });
      for (const t of INSTANTES) {
        await pagina.evaluate(t => window.__intro.fijar(t), t);
        await pagina.waitForTimeout(t >= HITOS.tarjeta ? 1700 : 1150);   // el texto entra con un fundido; la tarjeta, en 1,3 s
        await pagina.screenshot({ path: `.pruebas/capturas/intro/${perfil}-${t.toFixed(1).padStart(4, '0')}.png` });
      }
      informe.comprobar(errores.length === 0, `${perfil}: capturas del clip sin errores en la consola`, errores.slice(0, 5));
      // Al final, el pequeño mundo queda entero en el hueco libre: ni la tarjeta lo tapa ni se sale de la pantalla.
      const final = await pagina.evaluate(() => { const m = window.__intro.mundo, r = document.querySelector('#entrada .tarjeta').getBoundingClientRect(); return { m, t: { x: r.left, y: r.top, d: r.right, a: r.bottom }, w: innerWidth, h: innerHeight }; });
      const { m, t: c } = final, dx = Math.max(c.x - m.x, 0, m.x - c.d), dy = Math.max(c.y - m.y, 0, m.y - c.a);
      informe.comprobar(m.r >= 30 && Math.hypot(dx, dy) >= m.r + 2 && m.x - m.r >= 0 && m.x + m.r <= final.w && m.y - m.r >= 0 && m.y + m.r <= final.h, `${perfil}: el mundo final se ve entero, sin que la tarjeta lo tape`, final);
    } finally { await navegador.close(); }
  }

  // 1b. Con movimiento reducido: la versión tranquila (sin ondas, chispas, latidos ni salto), también hasta la tarjeta.
  if (!process.env.INTRO_SIN_CAPTURAS) {
    const { navegador, pagina, errores } = await abrirIntro('iphoneMax', base, { calma: true });
    try {
      await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 150000, polling: 100 });
      for (const t of [11.1, 20.3, 28.6, 31.3]) { await pagina.evaluate(t => window.__intro.fijar(t), t); await pagina.waitForTimeout(1500); await pagina.screenshot({ path: `.pruebas/capturas/intro/calma-${t.toFixed(1).padStart(4, '0')}.png` }); }
      informe.comprobar(errores.length === 0 && await pagina.evaluate(() => document.getElementById('entrada').classList.contains('formado')), 'con movimiento reducido, el clip tranquilo llega a la tarjeta sin errores', errores.slice(0, 5));
    } finally { await navegador.close(); }
  }

  // 2. Fluidez con la CPU ×4 (iPhone), con la canción de verdad.
  if (process.env.INTRO_SOLO_CAPTURAS) return;
  const { navegador, pagina, errores } = await abrirIntro('iphoneMax', base, { tocar: false });
  const datos = {};
  try {
    const cdp = await pagina.context().newCDPSession(pagina);
    await pagina.waitForFunction(() => document.getElementById('btn-entrar').classList.contains('preparado'), null, { timeout: 150000 })
      .catch(async e => { throw Error(`la carga no terminó: ${await pagina.evaluate(() => document.getElementById('carga-pc').textContent + ' · ' + document.getElementById('entrada').className + ' · ' + window.__pasoCarga)}`); });
    informe.comprobar(await pagina.evaluate(() => !window.__intro.empezado && !document.getElementById('entrada').classList.contains('formado')), 'cargado pero sin tocar: el clip espera al toque');
    informe.comprobar(await pagina.evaluate(() => !document.querySelector('#portada-saltar, .portada-saltar')), 'no hay botón para saltar la intro');
    await pagina.waitForTimeout(1500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await pagina.waitForTimeout(600);
    await pagina.evaluate(() => {
      const M = window.__medida = { dt: [], largas: [], reloj: [] }; let p = 0;
      // Desde 0,4 s de clip: el arranque cae dentro del toque (aquí se toca con la carga ya hecha; en la vida real el clip
      // empieza solo al 100 %, sin toque) y con la pantalla aún en negro.
      const f = t => { if (p && window.__intro.empezado && window.__intro.tiempo > 0.4) { M.dt.push(t - p); if (t - p > 20) (M.lentos ||= []).push([+(window.__intro.empezado ? window.__intro.tiempo : -1).toFixed(2), Math.round(t - p)]); } p = t; if (window.__intro.empezado) M.reloj.push([window.__intro.tiempo, window.__bandaSonora.tiempo('inicio')]); if (!M.fin) requestAnimationFrame(f); }; requestAnimationFrame(f);
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) M.largas.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: false }); } catch {}
      new MutationObserver(() => { if (!M.tarjeta && document.getElementById('entrada').classList.contains('formado')) M.tarjeta = window.__bandaSonora.tiempo('inicio'); }).observe(document.getElementById('entrada'), { attributes: true });
    });
    await pagina.click('#toque');
    await pagina.waitForFunction(() => window.__intro.empezado, null, { timeout: 20000 });
    await pagina.waitForFunction(() => document.getElementById('entrada').classList.contains('formado'), null, { timeout: 60000, polling: 250 });
    await pagina.waitForTimeout(3000);
    const M = await pagina.evaluate(() => { window.__medida.fin = true; return window.__medida; });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const dt = M.dt.filter(x => x < 1000), o = dt.slice().sort((a, b) => a - b), q = p => +(o[Math.min(o.length - 1, Math.floor(o.length * p))] || 0).toFixed(1);
    const r = { cuadros: dt.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: +(o.at(-1) || 0).toFixed(1), sobre33: dt.filter(x => x > LIMITE).length, tareasLargas: M.largas, lentos: M.lentos || [] };
    datos.fluidez = r;
    informe.comprobar(r.sobre33 <= SUELTOS && r.max <= MAXIMO && r.p99 <= P99, `el clip entero con la CPU ×4: p99 ≤ ${P99} ms, como mucho ${SUELTOS} cuadros sueltos > 33 ms (recolector) y ninguno > ${MAXIMO} ms`, r);
    // El reloj del clip, pegado al de la canción (a 1:1 con sus marcas) mientras suena.
    const sonando = M.reloj.filter(([, s]) => s > 0.5 && s < 29);
    const desfase = sonando.length ? Math.max(...sonando.map(([t, s]) => Math.abs(t - s))) : Infinity;
    datos.desfaseMax = +desfase.toFixed(3);
    informe.comprobar(sonando.length > 300 && desfase < 0.05, 'el clip va clavado al reloj de la canción', { muestras: sonando.length, desfaseMax: datos.desfaseMax });
    informe.comprobar(M.tarjeta >= HITOS.tarjeta - 0.15, `la tarjeta sale al final del clip (marca «tarjeta», ${HITOS.tarjeta} s)`, { tarjeta: M.tarjeta });
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally {
    writeFileSync('.pruebas/intro.json', JSON.stringify(datos, null, 2));
    await navegador.close();
  }
}
