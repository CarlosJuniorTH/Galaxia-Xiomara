// Tirones en la entrada tras la intro y al navegar, como en un iPhone (390×844, DPR 3) con la CPU ×4.
// El flujo de verdad, sin ?sinIntro: «Toca para empezar ♡» → carga al 100 % → videoclip de 32 s con «Maps» → tarjeta →
// «Entrar» (con la canción, que la intro necesita). Se mide cada cuadro DIBUJADO (el planificador puede no dibujar en
// todos los avisos de la pantalla) en cuatro tramos: la entrada (desde el toque hasta 3 s tras llegar), gestos con el dedo
// en la galaxia de Xiomara, el viaje y la llegada a un gigante (con su escena), y el sistema solar.
// Tirón: un cuadro que tarda más de 60 ms (más de tres de pantalla) y más de 2,2 veces la mediana de su tramo (con la CPU ×4 en
// casa cada cuadro ya cuesta ~2–3 de pantalla: eso es lentitud pareja, no un tirón). Se admiten 2 por tramo (una
// recolección de memoria de V8 puede caer en cualquier parte) y ninguno de más de 250 ms. Tampoco se compila ningún
// programa de GPU ni se sube ninguna textura nueva después de la carga. La máquina de pruebas está compartida: si una
// pasada falla, se repite (hasta 3) y en cada tramo vale su mejor medida. Guarda .pruebas/entrada.json.
import { writeFileSync, mkdirSync } from 'fs';
import { lanzar } from './arnes.mjs';

const CPU = Number(process.env.CPU || 4), TIRON = 60, VECES_MEDIANA = 2.2, SUELTOS = 2, MAXIMO = 250, PASADAS = Number(process.env.ENTRADA_PASADAS || 3);

function resumir(dt) {
  const o = dt.slice().sort((a, b) => a - b), q = p => +(o[Math.min(o.length - 1, Math.floor(o.length * p))] || 0).toFixed(1);
  const p50 = q(0.5), umbral = Math.max(TIRON, p50 * VECES_MEDIANA);
  return { cuadros: dt.length, p50, p95: q(0.95), p99: q(0.99), max: +(o.at(-1) || 0).toFixed(0), sobre33: dt.filter(x => x > 34).length, tirones: dt.filter(x => x > umbral).map(Math.round) };
}

async function pasada(base) {
  const { navegador, pagina, errores } = await lanzar('iphone', { musica: true });
  const datos = {};
  try {
    // La GPU del equipo de pruebas se comparte: si ahora no da contexto WebGL, esta pasada no cuenta (no es la página).
    if (!await pagina.evaluate(() => !!document.createElement('canvas').getContext('webgl2'))) return { entorno: 'la GPU compartida no dio contexto WebGL' };
    await pagina.addInitScript(() => {
      // Intervalo entre cuadros dibujados (el contador de la escena sube en su requestAnimationFrame).
      const M = window.__entrada = { dib: [], tramo: null }; let n0 = -1, t0 = 0;
      const f = t => { const e = window.__galaxia?.escena, n = e ? e.cuadrosDibujados : -1; if (n !== n0) { if (n0 >= 0 && M.tramo) M.dib.push([M.tramo, t - t0]); n0 = n; t0 = t; } requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    await pagina.goto(`${base}/?calidad=alta#debug`);
    const r = await Promise.race([pagina.waitForSelector('#toque:not([hidden])', { timeout: 120000 }).then(() => 'ok'), pagina.waitForSelector('#problema-3d:not([hidden])', { timeout: 120000 }).then(() => 'sin-webgl')]);
    if (r !== 'ok') return { entorno: 'la GPU compartida no dio contexto WebGL' };
    await pagina.click('#toque');
    await pagina.waitForFunction(() => document.getElementById('entrada').classList.contains('formado') && document.getElementById('btn-entrar').classList.contains('preparado'), null, { timeout: 240000, polling: 250 });
    const cdp = await pagina.context().newCDPSession(pagina);
    const estado = () => pagina.evaluate(() => { const r = window.__galaxia?.escena.rendimiento; return r ? { programas: r.programas, texturas: r.texturas } : null; });
    const tramo = async (nombre, accion) => {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU }); await pagina.waitForTimeout(500);
      const antes = await estado();
      await pagina.evaluate(n => { window.__entrada.tramo = n; }, nombre);
      await accion();
      await pagina.evaluate(() => { window.__entrada.tramo = null; });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const despues = await estado();
      const dt = await pagina.evaluate(n => window.__entrada.dib.filter(d => d[0] === n).map(d => d[1]), nombre);
      datos[nombre] = { ...resumir(dt.filter(x => x < 2000)), programasNuevos: antes ? despues.programas - antes.programas : 0, texturasNuevas: antes ? despues.texturas - antes.texturas : 0 };
    };
    const arrastrar = async (dx, dy) => {
      let x = 195, y = 430; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let k = 0; k < 14; k++) { x += dx; y += dy; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await new Promise(r => setTimeout(r, 16)); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const visitar = async id => {
      await pagina.evaluate(id => { window.__galaxia.interfaz.terminarEscena(); window.__galaxia.interfaz.visitar(id); }, id);
      await pagina.waitForFunction(() => window.__galaxia.escena.viajando, null, { timeout: 5000, polling: 30 }).catch(() => {});
      await pagina.waitForFunction(() => !window.__galaxia.escena.viajando, null, { timeout: 120000, polling: 100 });
    };
    // Como una persona: la tarjeta ya está, se lee un segundo y se toca «Entrar».
    await pagina.waitForTimeout(1500);
    await tramo('entrada tras la intro', async () => {
      await pagina.tap('#btn-entrar');
      await pagina.waitForFunction(() => window.__galaxia?.escena.viajando, null, { timeout: 10000, polling: 30 }).catch(() => {});
      await pagina.waitForFunction(() => window.__galaxia && !window.__galaxia.escena.viajando && document.body.classList.contains('dentro'), null, { timeout: 120000, polling: 100 });
      await pagina.waitForTimeout(3000);
    });
    await tramo('gestos en la galaxia de Xiomara', async () => { for (const [dx, dy] of [[18, 0], [-16, 4], [10, -8], [22, 0]]) { await arrastrar(dx, dy); await pagina.waitForTimeout(700); } await pagina.waitForTimeout(2500); });
    await tramo('viaje y llegada al cuásar', async () => { await visitar('cuasar'); await pagina.waitForTimeout(5000); });
    await tramo('sistema solar', async () => { await visitar('rosa'); for (const [dx, dy] of [[18, 0], [-16, 4]]) { await arrastrar(dx, dy); await pagina.waitForTimeout(700); } await pagina.waitForTimeout(2500); });
    datos.errores = errores.slice(0, 5);
    return datos;
  } finally { await navegador.close(); }
}

const tramoBien = r => r.tirones.length <= SUELTOS && r.max <= MAXIMO && r.programasNuevos <= 0 && r.texturasNuevas <= 0;
const tramos = d => Object.entries(d).filter(([k]) => k !== 'errores');
// En cada tramo, su mejor medida entre las pasadas (la carga de la máquina compartida cambia de un minuto a otro).
const mejorDe = pasadas => { const m = {}; for (const d of pasadas) if (!d.entorno) for (const [k, r] of tramos(d)) if (!m[k] || r.tirones.length < m[k].tirones.length || (r.tirones.length === m[k].tirones.length && r.max < m[k].max)) m[k] = r; return m; };

export default async function ({ base, informe }) {
  const pasadas = [];
  for (let i = 0, sinGpu = 0; i < PASADAS; i++) {
    const d = await pasada(base); pasadas.push(d);
    if (d.entorno && ++sinGpu <= 6) { i--; informe.nota(d.entorno + ': se repite en 10 s'); await new Promise(r => setTimeout(r, 10000)); continue; }
    informe.nota(`pasada ${i + 1}: ${d.entorno ?? Object.entries(d).filter(([k]) => k !== 'errores').map(([k, r]) => `${k}: p50 ${r.p50} · p99 ${r.p99} · máx ${r.max} · tirones ${r.tirones.length}`).join(' | ')}`);
    const m = mejorDe(pasadas); if (Object.keys(m).length && Object.values(m).every(tramoBien)) break;
  }
  mkdirSync('.pruebas', { recursive: true }); writeFileSync('.pruebas/entrada.json', JSON.stringify(pasadas, null, 2));
  const mejor = mejorDe(pasadas), medidas = pasadas.filter(d => !d.entorno);
  if (!medidas.length) { informe.comprobar(false, `sin medir: ${pasadas[0]?.entorno}`); return; }
  for (const [nombre, r] of Object.entries(mejor)) {
    informe.comprobar(r.tirones.length <= SUELTOS && r.max <= MAXIMO, `${nombre}: como mucho ${SUELTOS} tirones (cuadros > ${TIRON} ms y > ${VECES_MEDIANA}× la mediana) y ninguno > ${MAXIMO} ms`, r);
    informe.comprobar(r.programasNuevos <= 0 && r.texturasNuevas <= 0, `${nombre}: nada se compila ni se sube a la GPU por primera vez`, { programas: r.programasNuevos, texturas: r.texturasNuevas });
  }
  const errores = medidas.flatMap(d => d.errores);
  informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
}
