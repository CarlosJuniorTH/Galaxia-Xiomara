// Cero tirones en los viajes, como en un móvil: iPhone (390×844, DPR 3) con la CPU limitada ×4 (TIRONES_CPU), muchas rutas
// (casa ↔ cada destino, gigante ↔ gigante, entrar y salir del sistema solar, los lugares de casa, el cometa y viajes
// cambiados a mitad). Cada ruta se mide del clic a 4 s después de llegar (TIRONES_TRAS: el arranque del videoclip del
// gigante, su tarjeta y, con TIRONES_MUSICA=1, su canción incluidos). Tirón: un cuadro DIBUJADO de más de 60 ms que además
// pasa de 2,2 veces la mediana del tramo; TIRONES_DISPOSITIVO=pc mide en el PC (1440×900, CPU ×1, umbral 34 ms).
// La máquina de pruebas está cargada (y la GPU compartida): se hacen varias pasadas, cada una en una página nueva (todo
// por primera vez, como quien abre la web), y de cada ruta cuenta su mejor pasada.
// Lánzala con la GPU reservada: flock /tmp/claude-1000/gpu.lock node tests/navegador/ejecutar.mjs tironesViajes
// Variables: TIRONES_PASADAS (3), TIRONES_CPU (4), TIRONES_RUTAS («hogar>cuasar,pulsar>ton618~deneb@0.4»: ~destino@fracción
// cambia de destino a esa fracción del viaje), TIRONES_DIAG=1 (atribución por cuadro: llamadas GL, programas, LoAF) y
// TIRONES_SALIDA (JSON con todo; por defecto .pruebas/tirones.json).
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { abrir } from './arnes.mjs';

export const RUTAS = [
  // Casa ↔ las seis grandes (y entre ellas).
  'hogar>cuasar', 'cuasar>hogar', 'hogar>pulsar', 'pulsar>ton618', 'ton618>sagitario', 'sagitario>deneb', 'deneb>supernova',
  'supernova>hogar', 'hogar>ton618', 'ton618>hogar', 'hogar>sagitario', 'sagitario>hogar', 'hogar>deneb', 'deneb>hogar',
  'hogar>supernova', 'supernova>cuasar', 'cuasar>pulsar', 'pulsar>hogar',
  // El sistema solar: entrar, sus lugares, salir (a casa y a un gigante) y de un gigante directo a él.
  'hogar>rosa', 'rosa>azul', 'azul>cartas', 'cartas>gigante', 'gigante>hogar', 'cuasar>azul', 'azul>deneb',
  // Los lugares de la galaxia de Xiomara y el cometa.
  'hogar>constelacion', 'constelacion>suenos', 'suenos>capsulas', 'capsulas>calma', 'calma>hogar', 'hogar>cometa', 'cometa>hogar',
  // Cambiar de destino a mitad de viaje.
  'hogar>pulsar~sagitario@0.4', 'sagitario>hogar~deneb@0.5', 'hogar>rosa~cuasar@0.3', 'cuasar>hogar~azul@0.6'
];

// En el PC (TIRONES_DISPOSITIVO=pc: 1440×900 sin limitar la CPU) el umbral es más fino: dos cuadros perdidos (34 ms).
const DISPOSITIVO = process.env.TIRONES_DISPOSITIVO || 'iphone', EN_PC = DISPOSITIVO === 'pc';
const UMBRAL_MS = Number(process.env.TIRONES_UMBRAL || (EN_PC ? 34 : 60)), VECES_MEDIANA = 2.2, TRAS_LLEGAR = Number(process.env.TIRONES_TRAS || 4000);
export const contarTirones = dt => {
  const o = dt.slice().sort((a, b) => a - b), mediana = o[Math.floor(o.length / 2)] || 16.7;
  return { mediana, tirones: dt.filter(x => x > UMBRAL_MS && x > VECES_MEDIANA * mediana) };
};

// Instrumentación en la página: intervalos entre cuadros, con su instante, y (diagnóstico) qué pasó en cada cuadro.
function instrumentar(diag) {
  const M = window.__tirones = { cuadros: [], marca: 0, loaf: [] };
  const e = window.__galaxia.escena, i = e.interno, gl = i.renderer.getContext();
  M.gl = {}; let actual = {};
  if (diag) {
    for (const n of ['texImage2D', 'texSubImage2D', 'texStorage2D', 'texImage3D', 'texSubImage3D', 'texStorage3D', 'compressedTexImage2D', 'bufferData', 'bufferSubData', 'compileShader', 'linkProgram', 'getProgramParameter', 'getShaderParameter', 'renderbufferStorageMultisample', 'generateMipmap', 'readPixels', 'clientWaitSync', 'getError']) {
      const f = gl[n]; if (typeof f !== 'function') continue;
      gl[n] = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { const d = performance.now() - t; const c = actual[n] ??= [0, 0]; c[0]++; c[1] += d; } };
    }
    try { new PerformanceObserver(l => { for (const x of l.getEntries()) M.loaf.push({ t: x.startTime, dur: Math.round(x.duration), bloq: Math.round(x.blockingDuration), render: Math.round(x.startTime + x.duration - x.renderStart), estilo: x.styleAndLayoutStart ? Math.round(x.startTime + x.duration - x.styleAndLayoutStart) : 0, scripts: x.scripts.map(s => ({ dur: Math.round(s.duration), inv: s.invoker, f: s.sourceFunctionName, src: (s.sourceURL || '').split('/').slice(-2).join('/') + ':' + s.sourceCharPosition, tipo: s.invokerType, forzado: Math.round(s.forcedStyleAndLayoutDuration) })) }); }).observe({ type: 'long-animation-frame', buffered: false }); } catch {}
  }
  // Solo cuentan los cuadros DIBUJADOS (el planificador puede saltarse avisos de la pantalla a propósito).
  let previo = 0, n0 = -1;
  const f = t => {
    const n = e.cuadrosDibujados;
    if (n !== n0) {
      if (previo) {
        const c = e.interno, info = c.renderer.info, d = c.renderer.domElement.dataset;
        const r = { t: Math.round(t - M.marca), dt: +(t - previo).toFixed(1), fase: d.fase || (e.viajando ? 'viaje' : 'llegado'), prog: info.programs?.length ?? 0, geo: info.memory.geometries, tex: info.memory.textures, res: d.resolucion3d, esc: c.escenaActiva };
        if (diag) { r.gl = actual; actual = {}; }
        M.cuadros.push(r);
      }
      previo = t; n0 = n;
    }
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}

// Con TIRONES_PERFIL=1, perfil de CPU de cada ruta: de cada tirón, las funciones que más tiempo propio gastaron en él.
function atribuir(perfil, marcaUs, detalle) {
  const nodos = new Map(perfil.nodes.map(n => [n.id, n])), padre = new Map();
  for (const n of perfil.nodes) for (const h of n.children || []) padre.set(h, n.id);
  const nombre = n => `${n.callFrame.functionName || '(anónima)'}@${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber + 1}`;
  const tiempos = []; let t = perfil.startTime; for (const d of perfil.timeDeltas) { t += d; tiempos.push(t); }
  for (const c of detalle) {
    const fin = marcaUs + c.t * 1000, ini = fin - c.dt * 1000, propio = new Map(), pila = new Map();
    for (let i = 0; i < perfil.samples.length; i++) {
      if (tiempos[i] < ini || tiempos[i] > fin) continue;
      const dt = (perfil.timeDeltas[i + 1] ?? 0) / 1000, n = nodos.get(perfil.samples[i]);
      propio.set(nombre(n), (propio.get(nombre(n)) || 0) + dt);
      // y su cadena (tiempo total de cada función en el cuadro)
      const vistos = new Set(); for (let id = n.id; id !== undefined; id = padre.get(id)) { const k = nombre(nodos.get(id)); if (vistos.has(k)) continue; vistos.add(k); pila.set(k, (pila.get(k) || 0) + dt); }
    }
    const top = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${v.toFixed(1)} ${k}`);
    c.ocupado = Math.round([...propio].filter(([k]) => !/^\((idle|program)\)/.test(k)).reduce((a, [, v]) => a + v, 0));
    c.propio = top(propio); c.total = top(pila).filter(x => !/\(root\)|\(program\)/.test(x));
  }
}

async function medirRuta(pagina, cdp, ruta, cpu, diag) {
  const [, desde, hacia, cambio, fraccion] = ruta.match(/^(\w+)>(\w+)(?:~(\w+)@([\d.]+))?$/);
  // Sin limitar la CPU: se llega al origen (si no se está ya) y se termina su escena.
  const ir = id => pagina.evaluate(async id => { const g = window.__galaxia; g.interfaz.terminarEscena(); if (g.escena.destino !== id || g.escena.viajando) await g.interfaz.visitar(id); g.interfaz.terminarEscena(); }, id);
  await ir(desde);
  await pagina.waitForFunction(() => !window.__galaxia.escena.viajando, null, { timeout: 60000, polling: 200 });
  await pagina.evaluate(() => window.__galaxia.interfaz.terminarEscena());
  await pagina.waitForTimeout(1200);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); await pagina.waitForTimeout(600);
  const perfilar = process.env.TIRONES_PERFIL === '1';
  if (perfilar) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: Number(process.env.TIRONES_MUESTREO || 1000) }); await cdp.send('Profiler.start'); }
  const r = await pagina.evaluate(async ({ hacia, cambio, fraccion, tras }) => {
    const M = window.__tirones, g = window.__galaxia, e = g.escena;
    // Marca para alinear el perfil de CPU: 15 ms en una función con nombre propio justo antes del clic.
    const __marcaTirones = () => { const t = performance.now(); while (performance.now() - t < 15); return performance.now(); };
    M.cuadros = []; M.loaf = []; M.marca = __marcaTirones();
    const p = g.interfaz.visitar(hacia);
    if (cambio) {
      await new Promise(r => setTimeout(r, 300)); const total = (e.restanteViaje || 10) + 0.3;
      await new Promise(r => setTimeout(r, Math.max(0, total * +fraccion * 1000 - 300)));
      M.cambio = Math.round(performance.now() - M.marca); await g.interfaz.visitar(cambio);
    } else await p;
    while (e.viajando) await new Promise(r => setTimeout(r, 50));
    M.llegada = Math.round(performance.now() - M.marca);
    await new Promise(r => setTimeout(r, tras));
    return { cuadros: M.cuadros, loaf: M.loaf, llegada: M.llegada, cambio: M.cambio ?? null, destino: e.destino };
  }, { hacia, cambio, fraccion, tras: TRAS_LLEGAR });
  let perfil = null; if (perfilar) { perfil = (await cdp.send('Profiler.stop')).profile; await cdp.send('Profiler.disable'); }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  // Solo lo que pasa desde el clic (antes, en reposo, el planificador puede no dibujar: no es un tirón).
  // El primero cuenta desde el clic (lo que se tarda en ver la respuesta).
  r.cuadros = r.cuadros.filter(c => c.t > 0); if (r.cuadros[0] && r.cuadros[0].t - r.cuadros[0].dt < 0) r.cuadros[0].dt = r.cuadros[0].t;
  const dt = r.cuadros.map(c => c.dt);
  const { mediana, tirones } = contarTirones(dt);
  const detalle = r.cuadros.filter(c => c.dt > UMBRAL_MS && c.dt > VECES_MEDIANA * mediana);
  // Diagnóstico: TIRONES_PEORES=n atribuye además los n cuadros más largos aunque no lleguen a tirón.
  const peores = Number(process.env.TIRONES_PEORES || 0) ? r.cuadros.slice().sort((a, b) => b.dt - a.dt).slice(0, Number(process.env.TIRONES_PEORES)).filter(c => !detalle.includes(c)).map(c => ({ ...c, peor: true })) : [];
  if (perfil) {
    // Fin de la marca = última muestra dentro de __marcaTirones.
    const ids = new Set(perfil.nodes.filter(n => n.callFrame.functionName === '__marcaTirones').map(n => n.id)), hijos = new Map(perfil.nodes.map(n => [n.id, n.children || []]));
    for (const id of [...ids]) { const pila = [...hijos.get(id)]; while (pila.length) { const h = pila.pop(); ids.add(h); pila.push(...hijos.get(h)); } }
    let t = perfil.startTime, fin = null; for (let i = 0; i < perfil.samples.length; i++) { t += perfil.timeDeltas[i]; if (ids.has(perfil.samples[i])) fin = t; }
    if (fin !== null) atribuir(perfil, fin, [...detalle, ...peores]);
  }
  return { ruta, destinoFinal: r.destino, llegada: r.llegada, cambio: r.cambio, cuadros: dt.length, mediana: +mediana.toFixed(1), max: Math.round(Math.max(0, ...dt)), tirones: tirones.length, detalle, peores, loaf: r.loaf.filter(l => l.dur > UMBRAL_MS) };
}

// Abre una página nueva (reintenta si la GPU compartida no da contexto WebGL o la carga falla).
async function abrirConGpu(base) {
  for (let intento = 1; ; intento++) {
    try {
      const a = await abrir(base, DISPOSITIVO, { espera: 2500, musica: process.env.TIRONES_MUSICA === '1' });
      const webgl = await a.pagina.evaluate(() => document.getElementById('galaxia').dataset.webgl || '');
      if (webgl && webgl !== 'ninguno') return a;
      await a.navegador.close(); throw new Error('sin contexto WebGL');
    } catch (err) { if (intento >= 4) throw err; console.log(`  · reintento ${intento} (${err.message.split('\n')[0]})`); await new Promise(r => setTimeout(r, 4000 * intento)); }
  }
}

export default async function ({ base, informe }) {
  const pasadas = Number(process.env.TIRONES_PASADAS || 3), cpu = Number(process.env.TIRONES_CPU || (EN_PC ? 1 : 4)), diag = process.env.TIRONES_DIAG === '1';
  const rutas = process.env.TIRONES_RUTAS ? process.env.TIRONES_RUTAS.split(',') : RUTAS;
  const salida = process.env.TIRONES_SALIDA || '.pruebas/tirones.json';
  const todas = [];
  for (let p = 0; p < pasadas; p++) {
    const { navegador, pagina, errores } = await abrirConGpu(base);
    const cdp = await pagina.context().newCDPSession(pagina);
    try {
      await pagina.evaluate(instrumentar, diag);
      for (const ruta of rutas) {
        let m; try { m = await medirRuta(pagina, cdp, ruta, cpu, diag); } catch (err) { m = { ruta, error: err.message.split('\n')[0], tirones: 99 }; await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {}); }
        m.pasada = p; todas.push(m);
        console.log(`  · [${p + 1}/${pasadas}] ${ruta.padEnd(28)} tirones ${m.tirones}${m.error ? ' ERROR ' + m.error : `  (mediana ${m.mediana} ms, máx ${m.max} ms, ${m.cuadros} cuadros) ${m.detalle.map(d => `${d.dt}@${d.t}/${d.fase}${d.ocupado !== undefined ? '/cpu' + d.ocupado : ''}`).join(' ')}`}`);
      }
      if (errores.length) todas.push({ pasada: p, errores: errores.slice(0, 5) });
    } finally { await navegador.close(); }
    mkdirSync(path.dirname(salida), { recursive: true }); writeFileSync(salida, JSON.stringify(todas, null, 1));
  }
  for (const ruta of rutas) {
    const de = todas.filter(m => m.ruta === ruta), mejor = de.reduce((a, b) => (b.tirones < a.tirones || (b.tirones === a.tirones && b.max < a.max) ? b : a));
    informe.comprobar(mejor.tirones === 0 && mejor.destinoFinal === (ruta.match(/~(\w+)/)?.[1] ?? ruta.split('>')[1]), `${ruta}: sin tirones (${DISPOSITIVO}, CPU ×${cpu}; mejor de ${de.length})`, { tirones: de.map(m => m.tirones), max: mejor.max, mediana: mejor.mediana });
  }
  const errores = todas.filter(m => m.errores).flatMap(m => m.errores);
  informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
}
