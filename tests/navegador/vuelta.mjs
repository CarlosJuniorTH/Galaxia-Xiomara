// Los videoclips de la primera vuelta al Sol con la fecha simulada: la estrella del mes los dispara, suenan con su canción,
// no dejan rastro al terminar y la escena grande vuelve a dibujarse. Capturas en .pruebas/capturas/navegador/vuelta-*.png.
import { abrir } from './arnes.mjs';
const CAP = '.pruebas/capturas/navegador/vuelta';
export default async function ({ base, informe: inf }) {
  const { navegador, pagina, errores } = await abrir(base, 'movil430', { fecha: '2026-11-15T10:00:00-03:00', espera: 2000, toque: true, musica: true });
  try {
    await pagina.evaluate(() => window.__galaxia.recuerdos.abrir(11));
    await pagina.waitForTimeout(700);
    await pagina.evaluate(() => document.querySelector('.ventana.abierta .cerrar, .ventana.abierta button')?.click());
    await pagina.waitForFunction(() => document.body.classList.contains('en-teatro'), null, { timeout: 15000 });
    await pagina.waitForFunction(() => !document.querySelector('.teatro-negro').classList.contains('activo'), null, { timeout: 25000 });
    await pagina.waitForTimeout(6000);
    const enClip = await pagina.evaluate(() => ({ suena: window.__galaxia.interfaz.teatro.activo, mes: document.querySelector('.teatro-mes small').textContent, ui: getComputedStyle(document.getElementById('muelle')).visibility }));
    inf.comprobar(enClip.suena && /Mes|comienzo/.test(enClip.mes) && enClip.ui === 'hidden', 'mes 11: la estrella nueva abre el videoclip y la interfaz se aparta', enClip);
    await pagina.screenshot({ path: `${CAP}-mes11-movil.png` });
    // Medida de fluidez real del clip (cuadros por rAF), unos segundos.
    const c = await pagina.evaluate(() => new Promise(fin => { const d = []; let a = performance.now(), n = 0; const paso = t => { d.push(t - a); a = t; if (++n < 300) requestAnimationFrame(paso); else { d.sort((x, y) => x - y); fin({ p50: d[150], p99: d[297], max: d[299] }); } }; requestAnimationFrame(paso); }));
    inf.comprobar(c.p50 < 18, 'mes 11: el clip va a 60 FPS', c);
    await pagina.waitForFunction(() => !document.body.classList.contains('en-teatro'), null, { timeout: 45000 });
    await pagina.waitForTimeout(1500);
    const tras = await pagina.evaluate(() => ({ oculto: document.getElementById('teatro').hidden, ui: getComputedStyle(document.getElementById('muelle')).visibility, marcado: window.__galaxia.progreso.tiene('celebraciones', 'clip-11') }));
    inf.comprobar(tras.oculto && tras.ui === 'visible' && tras.marcado, 'mes 11: al terminar todo vuelve y queda anotado', tras);
    const dial = await pagina.evaluate(() => ({ llenas: document.querySelectorAll('#dial-vuelta .llena').length, espera: document.querySelectorAll('#dial-vuelta .espera').length, clase: document.body.classList.contains('dia-mes-once') }));
    inf.comprobar(dial.llenas === 11 && dial.espera === 1 && dial.clase, 'mes 11: el dial marca once y una esperando', dial);
    await pagina.screenshot({ path: `${CAP}-mes11-casa-movil.png` });
    inf.comprobar(!errores.length, 'mes 11: sin errores en la consola', errores.slice(0, 4));
  } finally { await navegador.close(); }
  const { navegador: n2, pagina: p2, errores: e2 } = await abrir(base, 'pc', { fecha: '2026-12-15T10:00:00-03:00', espera: 2000 });
  try {
    await p2.evaluate(() => { window.__fin = window.__galaxia.interfaz.verClip(12); });
    await p2.waitForFunction(() => !document.querySelector('.teatro-negro')?.classList.contains('activo') && document.body.classList.contains('en-teatro'), null, { timeout: 25000 });
    await p2.evaluate(() => window.__galaxia.interfaz.teatro.saltar(80)); await p2.waitForTimeout(1500);
    await p2.screenshot({ path: `${CAP}-mes12-pc.png` });
    await p2.waitForFunction(() => !document.body.classList.contains('en-teatro'), null, { timeout: 40000 });
    const d = await p2.evaluate(() => ({ llenas: document.querySelectorAll('#dial-vuelta .llena').length, clase: document.body.classList.contains('dia-anio') }));
    inf.comprobar(d.llenas === 12 && d.clase, 'mes 12: dial completo y día en dorado', d);
    inf.comprobar(!e2.length, 'mes 12: sin errores en la consola', e2.slice(0, 4));
    await p2.screenshot({ path: `${CAP}-mes12-casa-pc.png` });
    // Los lugares que abre el tiempo: «Dos soles» dispara su videoclip al llegar.
    await p2.evaluate(() => window.__galaxia.interfaz.visitar('dossoles')); await p2.waitForTimeout(1000);
    await p2.waitForFunction(() => !window.__galaxia.escena.viajando, null, { timeout: 90000 });
    await p2.waitForFunction(() => document.body.classList.contains('en-teatro'), null, { timeout: 8000 });
    await p2.waitForFunction(() => !document.querySelector('.teatro-negro').classList.contains('activo'), null, { timeout: 25000 });
    const c2 = await p2.evaluate(() => new Promise(fin => { const d = []; let a = performance.now(), n = 0; const paso = t => { d.push(t - a); a = t; if (++n < 240) requestAnimationFrame(paso); else { d.sort((x, y) => x - y); fin({ p50: d[120], p99: d[237] }); } }; requestAnimationFrame(paso); }));
    inf.comprobar(c2.p50 < 18, 'Dos soles: su videoclip abre al llegar y va a 60 FPS', c2);
    await p2.waitForFunction(() => !document.body.classList.contains('en-teatro'), null, { timeout: 70000 });
    inf.comprobar(!e2.length, 'Dos soles: sin errores en la consola', e2.slice(0, 4));
  } finally { await n2.close(); }
}
