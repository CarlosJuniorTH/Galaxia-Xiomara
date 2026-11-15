// El estreno: la intro de siempre con su música; al pulsar para entrar, en vez del vuelo, su videoclip, con su primer cuadro al
// instante (sin negro) y su canción; al acabar, a la galaxia aunque se viniera de otro sitio. Una sola vez en cada dispositivo.
import { lanzar, fijarFecha } from './arnes.mjs';
const CAP = '.pruebas/capturas/navegador/diaDelClip';
const PREPARADO = () => document.getElementById('btn-entrar')?.classList.contains('preparado') && document.getElementById('entrada').classList.contains('cielo');
export default async function ({ base, informe: inf }) {
  for (const [perfil, nombre, fecha, clave, pista, dura] of [['movil430', 'Dos soles', '2026-11-15T10:00:00-03:00', 'dossoles', 'mes-dossoles', 64.784], ['pc', 'año', '2026-12-15T10:00:00-03:00', 12, 'mes-12', 98.01]]) {
    const { navegador, pagina, errores } = await lanzar(perfil, { musica: true });
    const pedidas = []; pagina.on('request', r => { const m = r.url().match(/musica\/([^?]+)/); if (m) pedidas.push(m[1]); });
    try {
      await fijarFecha(pagina, fecha);
      // Quien la última vez estaba en Deneb: al acabar el clip ha de quedar en casa, no ahí.
      // Y quien vio Dos soles antes de que tuviera carta (marca vieja «clip-dossoles»): el estreno reiniciado le sale otra vez.
      await pagina.addInitScript(([vieja, version]) => { if (!sessionStorage.getItem('sembrado')) { sessionStorage.setItem('sembrado', '1'); localStorage.setItem('xiomara:universo:v2:lugar', JSON.stringify({ destino: 'deneb', fecha: Date.now() }));
        if (vieja) localStorage.setItem('xiomara:universo:v2', JSON.stringify({ version, celebraciones: ['clip-dossoles'] })); } }, [clave === 'dossoles', 2]);   // (2: la versión del guardado, js/util/progreso.js)
      await pagina.goto(`${base}/?calidad=alta#debug`);
      await pagina.waitForSelector('#toque:not([hidden])', { timeout: 30000 });
      await pagina.click('#toque');
      await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 90000 });
      const intro = await pagina.evaluate(() => ({ teatro: document.body.classList.contains('en-teatro'), suena: window.__intro.conCancion }));
      inf.comprobar(!intro.teatro && intro.suena && pedidas.includes('inicio.m4a'), `${nombre}: sale la intro de siempre con su música`, intro);
      await pagina.evaluate(() => window.__intro.fijar(9999));
      await pagina.waitForFunction(PREPARADO, null, { timeout: 40000 });
      inf.comprobar(await pagina.evaluate(() => document.getElementById('btn-continuar').hidden), `${nombre}: sin «Continuar», se entra por el clip`);
      // (Desde dentro de la página: el clic de Playwright espera a que el botón deje de animarse.)
      const { espera, negro } = await pagina.evaluate(() => new Promise(f => { const t0 = performance.now(); document.getElementById('btn-entrar').click(); const m = () => document.body.classList.contains('en-teatro') ? f({ espera: Math.round(performance.now() - t0), negro: document.querySelector('.teatro-negro').classList.contains('activo') }) : requestAnimationFrame(m); m(); }));
      inf.comprobar(espera < 500 && !negro, `${nombre}: al pulsar, el clip al instante y sin negro`, { ms: espera, negro });
      await pagina.waitForTimeout(150);
      const luz = await pagina.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); return new Promise(f => requestAnimationFrame(() => { x.drawImage(document.querySelector('#galaxia canvas') || document.querySelector('canvas#galaxia'), 0, 0, 64, 64); const d = x.getImageData(0, 0, 64, 64).data; let m = 0; for (let i = 0; i < d.length; i += 4) m = Math.max(m, d[i] + d[i + 1] + d[i + 2]); f(m); })); }).catch(() => -1);
      inf.nota(`luz máxima del primer cuadro: ${luz}`);
      inf.comprobar(pedidas.includes(`${pista}.m4a`), `${nombre}: con su canción`, { pedidas: pedidas.slice(0, 5) });
      await pagina.waitForTimeout(2000);
      await pagina.screenshot({ path: `.pruebas/capturas/estreno-${nombre.replace(/ /g, '-')}.png` });   // (el primer plano real del evento: la Tierra con sus texturas, no una bola lisa)
      await pagina.screenshot({ path: `${CAP}-${perfil}.png` });
      inf.comprobar(await pagina.evaluate(k => !window.__galaxia.progreso.tiene('celebraciones', k) && !document.body.classList.contains('dentro'), clave === 'dossoles' ? 'estreno-dossoles-v2' : 'estreno-12'), `${nombre}: durante el clip aún no está dentro ni anotado`);
      await pagina.evaluate(d => window.__galaxia.interfaz.teatro.saltar(d), dura - 6);
      await pagina.waitForFunction(() => !document.body.classList.contains('en-teatro'), null, { timeout: 20000 });
      // Dos soles: antes de la galaxia, su carta en un sobre cerrado; al tocarlo se abre y se lee; su botón lleva a casa.
      if (clave === 'dossoles') {
        await pagina.waitForSelector('.carta-estreno.visible .sobre', { timeout: 10000 });
        const cerrada = await pagina.evaluate(() => ({ dentro: document.body.classList.contains('dentro'), fondo: getComputedStyle(document.querySelector('.carta-estreno')).backgroundColor }));
        await pagina.screenshot({ path: `${CAP}-${perfil}-sobre.png` });
        await pagina.evaluate(() => document.querySelector('.carta-estreno .sobre').click()); await pagina.waitForTimeout(2600);   // (flota: el clic de Playwright esperaría a que pare)
        const abierta = await pagina.evaluate(() => { const p = document.querySelector('.carta-papel'), r = p.getBoundingClientRect(); return { leyendo: document.querySelector('.carta-estreno').classList.contains('leyendo'), cabe: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, parrafos: p.querySelectorAll('p').length }; });
        await pagina.screenshot({ path: `${CAP}-${perfil}-carta.png` });
        inf.comprobar(!cerrada.dentro && cerrada.fondo === 'rgb(0, 0, 0)' && abierta.leyendo && abierta.cabe && abierta.parrafos > 3, `${nombre}: tras el clip, su carta en el sobre; se abre y se lee entera`, { cerrada, abierta });
        // Al pulsar «Ir a nuestra galaxia» nunca asoma la portada: se vigila cada cuadro hasta que la carta desaparece.
        const asoma = await pagina.evaluate(() => new Promise(f => { let visto = false; document.querySelector('.carta-estreno .carta-seguir').click();
          const mira = () => { const c = document.querySelector('.carta-estreno'), e = document.getElementById('entrada'); if (e && getComputedStyle(e).display !== 'none' && (!c || +getComputedStyle(c).opacity < 0.98)) visto = true; if (c) requestAnimationFrame(mira); else f(visto); }; requestAnimationFrame(mira); }));
        inf.comprobar(!asoma, `${nombre}: al cerrar la carta, directo a la galaxia sin que asome la portada`);
      }
      await pagina.waitForFunction(() => document.body.classList.contains('dentro') && !window.__galaxia.escena.viajando, null, { timeout: 20000 });
      await pagina.waitForTimeout(1500);
      const tras = await pagina.evaluate(k => ({ anotado: window.__galaxia.progreso.tiene('celebraciones', `clip-${k}`), entrada: getComputedStyle(document.getElementById('entrada')).display, lugar: JSON.parse(localStorage.getItem('xiomara:universo:v2:lugar') || '{}').destino, nombre: document.getElementById('lugar-nombre')?.textContent || '' }), clave);
      inf.comprobar(tras.anotado && tras.entrada === 'none' && tras.lugar === 'hogar', `${nombre}: al acabar, en la galaxia y anotado`, tras);
      // El evento deja algo en el universo y lo dice, sin bloquear.
      await pagina.waitForSelector('.evento-aviso.visible', { timeout: 9000 }).catch(() => {});
      const aviso = await pagina.evaluate(() => { const c = document.querySelector('.evento-aviso.visible'); if (!c) return null; const r = c.getBoundingClientRect(), m = document.getElementById('muelle').getBoundingClientRect(); return { nombre: c.textContent, cabe: r.left >= 0 && r.right <= innerWidth && r.bottom <= m.top, alto: r.height }; });
      inf.comprobar(aviso?.cabe && aviso.nombre.includes(nombre === 'año' ? 'Nuestra primera vuelta' : 'Dos soles'), `${nombre}: al llegar, anuncia el lugar nuevo sin tapar el muelle`, aviso);
      await pagina.screenshot({ path: `${CAP}-${perfil}-casa.png` });
      // Segunda visita: intro y, al pulsar, el vuelo; ya no el clip.
      await pagina.reload();
      await pagina.waitForSelector('#toque:not([hidden])', { timeout: 30000 });
      await pagina.click('#toque');
      await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 90000 });
      await pagina.evaluate(() => window.__intro.fijar(9999));
      await pagina.waitForFunction(PREPARADO, null, { timeout: 40000 });
      await pagina.click('#btn-entrar'); await pagina.waitForTimeout(1200);
      const otra = await pagina.evaluate(() => ({ teatro: document.body.classList.contains('en-teatro'), dentro: document.body.classList.contains('dentro') }));
      inf.comprobar(!otra.teatro && otra.dentro, `${nombre}: la segunda vez ya no sale, se entra con el vuelo`, otra);
      inf.comprobar(!errores.length, `${nombre}: sin errores en la consola`, errores.slice(0, 4));
    } finally { await navegador.close(); }
  }
}
