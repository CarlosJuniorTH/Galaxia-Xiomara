// Red de la carga (CDP: lo que llega de verdad por la red). Cuántos MB se bajan antes de que empiece el clip de la intro
// (lo que cuenta la barra «X de Y MB») y en cada tramo después (clip, tarjeta, vuelo de entrada, dentro), y que cada
// archivo se pida UNA sola vez. PERFIL=iphone,pc (por defecto los dos). Guarda las peticiones en .pruebas/red-<perfil>.json.
import { writeFileSync, mkdirSync } from 'fs';
import { lanzar } from './arnes.mjs';

const LIMITE = { iphone: 5, iphoneMax: 5, android: 5, pc: 7 };
const mb = b => +(b / 1048576).toFixed(2);

async function medir(base, perfil, informe) {
  const { navegador, pagina, errores } = await lanzar(perfil, { musica: true });
  try {
    // (Playwright: también lo que piden los obreros —las texturas horneadas se descargan en obreroImagenes.js—; el tamaño
    // es el que llega por la red: una revalidación 304 son solo cabeceras.)
    const origen = new URL(base).origin, hechas = [];
    let tramo = 'previo';
    pagina.on('requestfinished', async q => {
      const t = tramo, url = q.url(); if (!url.startsWith(origen)) return;
      const r = await q.response().catch(() => null); if (!r || r.fromServiceWorker()) return;
      const s = await q.sizes().catch(() => null);
      hechas.push({ ruta: url.slice(origen.length).split(/[?#]/)[0], bytes: s ? s.responseBodySize + s.responseHeadersSize : 0, cuerpo: s?.responseBodySize ?? 0, estado: r.status(), tramo: t });
    });
    await pagina.goto(`${base}/?calidad=alta#debug`);
    await pagina.waitForSelector('#toque:not([hidden])', { timeout: 60000 });
    tramo = 'carga'; await pagina.click('#toque');
    await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 240000, polling: 100 });
    const barra = await pagina.evaluate(() => ({ texto: document.getElementById('carga-texto').textContent, total: window.__descargas.total, hechos: window.__descargas.hechos }));
    tramo = 'clip';
    await pagina.waitForFunction(() => document.getElementById('entrada').classList.contains('formado'), null, { timeout: 120000 });
    tramo = 'tarjeta';
    await pagina.waitForTimeout(1500);
    await pagina.click('#btn-entrar');
    tramo = 'entrada';
    await pagina.waitForFunction(() => window.__galaxia && !window.__galaxia.escena.viajando && document.body.classList.contains('dentro'), null, { timeout: 60000 });
    tramo = 'dentro';
    await pagina.waitForTimeout(Number(process.env.DENTRO || 8000));
    const suma = t => hechas.filter(h => h.tramo === t).reduce((a, h) => a + h.bytes, 0);
    const conCuerpo = hechas.filter(h => h.cuerpo > 0), veces = new Map();
    for (const h of conCuerpo) veces.set(h.ruta, (veces.get(h.ruta) || 0) + 1);
    const duplicados = [...veces].filter(([, n]) => n > 1);
    const en = t => conCuerpo.filter(h => h.tramo === t).map(h => h.ruta);
    const r = { perfil, antesDelToque: mb(suma('previo')), antesDelClip: mb(suma('previo') + suma('carga')), clip: mb(suma('clip')), tarjeta: mb(suma('tarjeta')), entrada: mb(suma('entrada')), dentro: mb(suma('dentro')), barra, duplicados, peticiones: hechas };
    mkdirSync('.pruebas', { recursive: true }); writeFileSync(`.pruebas/red-${perfil}.json`, JSON.stringify(r, null, 1));
    informe.nota(`${perfil}: antes del toque ${r.antesDelToque} MB · antes del clip ${r.antesDelClip} MB (${hechas.filter(h => h.tramo === 'carga' || h.tramo === 'previo').length} peticiones) · clip ${r.clip} · tarjeta ${r.tarjeta} · entrada ${r.entrada} · dentro ${r.dentro} · barra «${barra.texto}»`);
    const lim = LIMITE[perfil] ?? 5;
    informe.comprobar(r.antesDelToque <= lim, `${perfil}: antes del toque ≤ ${lim} MB`, { MB: r.antesDelToque, antesDelClip: r.antesDelClip });
    informe.comprobar(duplicados.length === 0, `${perfil}: cada archivo se descarga una sola vez`, duplicados.slice(0, 10));
    informe.comprobar(en('clip').length === 0, `${perfil}: durante el clip, 0 descargas`, en('clip').slice(0, 10));
    informe.comprobar(en('entrada').length === 0, `${perfil}: durante el vuelo de entrada, 0 descargas`, en('entrada').slice(0, 10));
    const contado = mb(barra.total);
    informe.comprobar(Math.abs(contado - r.antesDelClip) <= 0.1 * Math.max(1, r.antesDelClip), `${perfil}: la barra cuenta lo que de verdad se baja antes del clip`, { barra: contado, red: r.antesDelClip });
    informe.comprobar(errores.length === 0, `${perfil}: sin errores en la consola`, errores.slice(0, 5));
  } finally { await navegador.close(); }
}

export default async function ({ base, informe }) {
  for (const p of (process.env.PERFIL || 'iphone,pc').split(',')) await medir(base, p, informe);
}
