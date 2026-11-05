// El día exacto de los once meses y el del año, la visita abre directamente con su videoclip: tras el toque, sin intro ni
// tarjeta, sin rato a oscuras; al acabar se entra en casa, queda anotado y la estrella no lo repite.
import { lanzar, fijarFecha } from './arnes.mjs';
const CAP = '.pruebas/capturas/navegador/diaDelClip';
export default async function ({ base, informe: inf }) {
  for (const [perfil, nombre, fecha, clave, dura] of [['movil430', 'mes 11', '2026-11-15T10:00:00-03:00', 'mes-11', 38.85], ['pc', 'año', '2026-12-15T10:00:00-03:00', 'mes-12', 98.01]]) {
    const { navegador, pagina, errores } = await lanzar(perfil, { musica: true });
    const pedidas = []; pagina.on('request', r => { const m = r.url().match(/musica\/([^?]+)/); if (m) pedidas.push(m[1]); });
    try {
      await fijarFecha(pagina, fecha);
      await pagina.goto(`${base}/?calidad=alta#debug`);
      await pagina.waitForSelector('#toque:not([hidden])', { timeout: 30000 });
      await pagina.waitForFunction(() => document.getElementById('btn-entrar')?.classList.contains('preparado'), null, { timeout: 90000 });
      const t0 = Date.now(); await pagina.click('#toque');
      await pagina.waitForFunction(() => document.body.classList.contains('en-teatro') && !document.querySelector('.teatro-negro').classList.contains('activo'), null, { timeout: 15000 });
      const espera = Date.now() - t0;
      inf.comprobar(espera < 1500, `${nombre}: tras el toque el clip se ve enseguida`, { ms: espera });
      inf.comprobar(!pedidas.includes('inicio.m4a') && pedidas.includes(`${clave}.m4a`), `${nombre}: baja su canción y no la de la intro`, { pedidas: pedidas.slice(0, 5) });
      await pagina.waitForTimeout(2500);
      const durante = await pagina.evaluate(k => ({ dentro: document.body.classList.contains('dentro'), suena: window.__galaxia.interfaz.teatro.activo, ancla: true, pista: k }), clave);
      inf.comprobar(durante.suena && !durante.dentro, `${nombre}: es el videoclip, no la intro`, durante);
      await pagina.screenshot({ path: `${CAP}-${perfil}.png` });
      await pagina.evaluate(d => window.__galaxia.interfaz.teatro.saltar(d), dura - 6);
      await pagina.waitForFunction(() => !document.body.classList.contains('en-teatro'), null, { timeout: 20000 });
      await pagina.waitForFunction(() => document.body.classList.contains('dentro') && !window.__galaxia.escena.viajando, null, { timeout: 20000 });
      await pagina.waitForTimeout(1200);
      const tras = await pagina.evaluate(m => { const g = window.__galaxia; return { anotado: g.progreso.tiene('celebraciones', `clip-${m}`), entrada: getComputedStyle(document.getElementById('entrada')).display, pendiente: g.interfaz.clipPendiente(m) }; }, clave === 'mes-11' ? 11 : 12);
      inf.comprobar(tras.anotado && !tras.pendiente && tras.entrada === 'none', `${nombre}: al acabar se entra en casa, anotado`, tras);
      await pagina.screenshot({ path: `${CAP}-${perfil}-casa.png` });
      inf.comprobar(!errores.length, `${nombre}: sin errores en la consola`, errores.slice(0, 4));
    } finally { await navegador.close(); }
  }
}
