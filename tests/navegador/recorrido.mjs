// Recorrido completo con el medidor ?fps (js/util/medidorFps.js) y un JSON por tramo con todas sus métricas: carga, toque,
// clip de la intro entero, tarjeta, «Empezar», vuelo de entrada, casa, giro con arrastre e inercia, zoom, un viaje a cada
// destino y gigante con su escena completa, el sistema solar (con giro) y la vuelta a casa. Por tramo: FPS, p50/p95/p99,
// cuadros > 25 y > 50 ms, long animation frames, órdenes de dibujo y triángulos, resolución interna, GPU por pasada,
// subidas/compilaciones/geometrías/render targets, música (playbackRate, saltos, cortes, desfase audio↔imagen, aterrizaje
// frente al fin de la música de los viajes) y la red (lo pedido al servidor en ese tramo, también por el service worker).
// Configuraciones: movil (430×932, DPR 3, iPhone, CPU ×4 desde el principio) y pc (1440×900, CPU ×1).
//
// Lanzar (toma solo el cerrojo de la GPU si no lo tiene):
//   PLAYWRIGHT_CORE=…/.pruebas/pw/node_modules/playwright-core PUERTO_PRUEBAS=8220 SALIDA=docs/rendimiento-antes.json \
//     node tests/navegador/recorrido.mjs [movil] [pc]
// o como caso de ejecutar.mjs (node tests/navegador/ejecutar.mjs recorrido; SALIDA por defecto .pruebas/recorrido.json):
// entonces cada criterio de aceptación de docs/PROMPT-ULTRA-FLUIDO.md es una comprobación.
// Variables: CPU (×4), CALIDAD (alta; vacío = sin ?calidad), DESTINOS=cuasar,deneb… (por defecto todos), CONFIGS=movil,pc.
import { writeFileSync, mkdirSync, statSync, existsSync } from 'fs';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import { lanzar, alRegistroServidor, arrancarServidor, pararServidor, PERFILES } from './arnes.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CPU = Number(process.env.CPU || 4);
const CALIDAD = process.env.CALIDAD ?? 'alta';
const GIGANTES = ['cuasar', 'pulsar', 'deneb', 'ton618', 'sagitario', 'supernova'];
// Orden del recorrido: los gigantes, los lugares de casa, el sistema solar (azul y rosa) y la supernova al final (la que
// quiere estallar se aplaza para que no se lleve la cámara a mitad de otro clip), y la vuelta a casa.
const TODOS = ['cuasar', 'pulsar', 'deneb', 'ton618', 'sagitario', 'gigante', 'constelacion', 'cartas', 'suenos', 'capsulas', 'calma', 'azul', 'rosa', 'supernova'];
const CONFIGURACIONES = {
  movil: { perfil: 'movil430', cpu: CPU, tactil: true, maxAntesToque: 5 * 1048576 },
  pc: { perfil: 'pc', cpu: 1, tactil: false, maxAntesToque: 7 * 1048576 }
};
// Tipo de cada tramo (los criterios dependen de él): vuelo, gesto, clip (intro y videoclips de los gigantes), resto.
// p95 < 16,7 ms = ningún cuadro del 95 % pierde la sincronía vertical. Los intervalos entre cuadros a 60 Hz miden 16,7 ± 0,1:
// se admite esa variación (17,5 ms sigue siendo un solo periodo de pantalla).
const VSYNC = 17.5;
const tipoDe = n => /^vuelo|^viaje|vuelta a casa/.test(n) ? 'vuelo' : /^giro|^zoom/.test(n) ? 'gesto' : /^clip|^escena (cuasar|pulsar|deneb|ton618|sagitario|supernova)/.test(n) ? 'clip' : /^carga/.test(n) ? 'carga' : 'resto';

// ── Red: cada petición que llega al servidor (página, módulos, obreros y service worker) ─────────────────────────────────
function vigilarRed() {
  const peticiones = []; let resto = '';
  const quitar = alRegistroServidor(texto => {
    const lineas = (resto + texto).split('\n'); resto = lineas.pop();
    for (const l of lineas) { const m = l.match(/"(GET|HEAD|POST) ([^ ]+) HTTP\/[\d.]+" (\d{3})/); if (!m) continue;
      const ruta = decodeURIComponent(m[2].split('?')[0].split('#')[0]); let bytes = 0;
      if (m[1] === 'GET' && m[3] === '200') { try { bytes = statSync(path.join(RAIZ, ruta === '/' ? 'index.html' : ruta.slice(1))).size; } catch {} }
      peticiones.push({ t: Date.now(), metodo: m[1], ruta, estado: +m[3], bytes }); }
  });
  return { peticiones, quitar };
}
const MB = b => +(b / 1048576).toFixed(2);
function resumirRed(lista) {
  const descargas = lista.filter(p => p.metodo === 'GET' && p.estado === 200);
  return { peticiones: lista.length, descargas: descargas.length, bytes: descargas.reduce((s, p) => s + p.bytes, 0), MB: MB(descargas.reduce((s, p) => s + p.bytes, 0)),
    archivos: descargas.slice(0, 30).map(p => `${p.ruta} (${(p.bytes / 1024).toFixed(0)} KB)`) };
}

async function recorrer(base, nombre, { destinos = TODOS, log = console.log } = {}) {
  const conf = CONFIGURACIONES[nombre];
  const red = vigilarRed();
  const { navegador, pagina, errores } = await lanzar(conf.perfil, { musica: true });
  const marcasNodo = [];   // [epoch, tramo] para repartir la red
  try {
    const cdp = await pagina.context().newCDPSession(pagina);
    if (conf.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: conf.cpu });
    const tramo = async n => { const t = await pagina.evaluate(n => { window.__medidor.tramo(n); return performance.timeOrigin + performance.now(); }, n); marcasNodo.push([t, n]); log(`  · ${n}`); };
    // Cambia de tramo en el cuadro exacto en que termina el viaje en curso (o el vuelo de entrada).
    const alLlegar = async n => {
      await pagina.evaluate(n => { const e = window.__galaxia.escena; const f = () => { if (e.viajando || e.restanteViaje > 0) return requestAnimationFrame(f); window.__medidor.tramo(n); window.__llegadaEn = performance.timeOrigin + performance.now(); }; window.__llegadaEn = 0; requestAnimationFrame(f); }, n);
      await pagina.waitForFunction(() => window.__llegadaEn > 0, null, { timeout: 200000, polling: 100 });
      marcasNodo.push([await pagina.evaluate(() => window.__llegadaEn), n]); log(`  · ${n}`);
    };
    const consulta = `?fps${CALIDAD ? '&calidad=' + CALIDAD : ''}`;
    const tCarga = Date.now(); marcasNodo.push([tCarga, 'carga']);
    await pagina.goto(`${base}/${consulta}#debug`);
    await pagina.waitForFunction(() => window.__medidor, null, { timeout: 60000, polling: 20 });
    await pagina.evaluate(() => window.__medidor.tramo('carga'));
    await pagina.waitForSelector('#toque:not([hidden])', { timeout: 300000 });
    await pagina.waitForTimeout(500);
    const tToque = Date.now();
    await tramo('toque');
    if (conf.tactil) await pagina.tap('#toque'); else await pagina.click('#toque');
    await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 300000, polling: 50 });
    await tramo('clip de la intro');
    await pagina.waitForFunction(() => document.getElementById('entrada').classList.contains('formado'), null, { timeout: 200000, polling: 100 });
    await tramo('tarjeta');
    await pagina.waitForFunction(() => document.getElementById('btn-entrar')?.classList.contains('preparado'), null, { timeout: 200000, polling: 100 });
    await pagina.waitForTimeout(1500);
    await tramo('empezar');
    if (conf.tactil) await pagina.tap('#btn-entrar'); else await pagina.click('#btn-entrar');
    await pagina.waitForFunction(() => window.__galaxia?.escena.viajando, null, { timeout: 30000, polling: 30 }).catch(() => {});
    await tramo('vuelo de entrada');
    await pagina.waitForFunction(() => document.body.classList.contains('dentro'), null, { timeout: 200000, polling: 100 });
    await alLlegar('casa');
    await pagina.evaluate(() => window.__galaxia.escena.aplazarSupernova(1e6));
    await pagina.waitForTimeout(4000);

    // Gestos: un giro con arrastre y suelta rápida (inercia) y un zoom (pellizco en el móvil, rueda en el PC).
    const vp = PERFILES[conf.perfil].viewport, cx = vp.width / 2, cy = vp.height / 2;
    const giro = async () => {
      if (conf.tactil) {
        let x = cx - 120, y = cy; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let k = 0; k < 24; k++) { x += k < 16 ? 6 : 14; y += k % 2 ? 1 : -1; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await pagina.waitForTimeout(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        let x = cx - 300, y = cy; await pagina.mouse.move(x, y); await pagina.mouse.down();
        for (let k = 0; k < 24; k++) { x += k < 16 ? 12 : 30; await pagina.mouse.move(x, y + (k % 2 ? 1 : -1)); await pagina.waitForTimeout(16); }
        await pagina.mouse.up();
      }
      await pagina.waitForTimeout(3500);   // la inercia hasta pararse
    };
    const zoom = async () => {
      if (conf.tactil) {
        for (const sentido of [1, -1]) {
          let d = sentido > 0 ? 60 : 200; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }] });
          for (let k = 0; k < 20; k++) { d += sentido * 7; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }] }); await pagina.waitForTimeout(16); }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pagina.waitForTimeout(1200);
        }
      } else {
        await pagina.mouse.move(cx, cy);
        for (const s of [-240, 240]) { for (let k = 0; k < 10; k++) { await pagina.mouse.wheel(0, s); await pagina.waitForTimeout(40); } await pagina.waitForTimeout(1200); }
      }
      await pagina.waitForTimeout(1000);
    };
    await tramo('giro en casa'); await giro();
    await tramo('zoom en casa'); await zoom();

    for (const id of destinos) {
      await tramo(`viaje a ${id}`);
      await pagina.evaluate(id => { const i = window.__galaxia.interfaz; i.terminarEscena(); i.visitar(id); }, id);
      await pagina.waitForFunction(() => window.__galaxia.escena.viajando || window.__galaxia.escena.restanteViaje > 0, null, { timeout: 8000, polling: 30 }).catch(() => {});
      await alLlegar(`escena ${id}`);
      if (GIGANTES.includes(id)) {
        await pagina.waitForFunction(id => window.__galaxia.escena.clip?.id === id || document.body.classList.contains('escena-gigante'), id, { timeout: 20000, polling: 100 }).catch(() => log(`    (${id}: no empezó su clip)`));
        await pagina.waitForFunction(() => !window.__galaxia.escena.clip && !document.body.classList.contains('escena-gigante') && (document.getElementById('supernova-amor')?.hidden ?? true), null, { timeout: 200000, polling: 250 });
        await pagina.waitForTimeout(1000);
      } else await pagina.waitForTimeout(4000);
      if (id === 'rosa') { await tramo('sistema solar'); await pagina.waitForTimeout(3000); await tramo('giro en el sistema solar'); await giro(); }
    }
    await tramo('vuelta a casa');
    await pagina.evaluate(() => { const i = window.__galaxia.interfaz; i.terminarEscena(); i.visitar('hogar'); });
    await pagina.waitForFunction(() => window.__galaxia.escena.viajando || window.__galaxia.escena.restanteViaje > 0, null, { timeout: 8000, polling: 30 }).catch(() => {});
    await alLlegar('casa al volver');
    await pagina.waitForTimeout(4000);
    await tramo(null);
    if (conf.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await pagina.waitForTimeout(1500);   // (las últimas consultas de GPU)
    const r = await pagina.evaluate(() => window.__medidor.resumen());
    const origen = await pagina.evaluate(() => performance.timeOrigin);
    // Red por tramo (por la hora de cada petición) y la global.
    const tramos = r.tramos.map((t, k) => {
      const a = k === 0 ? tCarga : origen + t.inicio, b = origen + t.inicio + t.duracion * 1000;
      return { ...t, tipo: tipoDe(t.nombre), red: resumirRed(red.peticiones.filter(p => p.t >= a && p.t < b)) };
    });
    const descargas = red.peticiones.filter(p => p.metodo === 'GET' && p.estado === 200), veces = new Map();
    for (const p of descargas) veces.set(p.ruta, (veces.get(p.ruta) || 0) + 1);
    const antes = resumirRed(red.peticiones.filter(p => p.t < tToque));
    return {
      configuracion: nombre, perfil: conf.perfil, viewport: vp, dpr: PERFILES[conf.perfil].deviceScaleFactor, cpu: conf.cpu, consulta, gpuDisponible: r.gpu, lienzo: r.lienzo,
      red: { antesDelToque: { MB: antes.MB, bytes: antes.bytes, descargas: antes.descargas }, total: resumirRed(red.peticiones), repetidos: [...veces].filter(([, n]) => n > 1).map(([ruta, n]) => ({ ruta, veces: n })) },
      tramos, errores: errores.slice(0, 10)
    };
  } finally { red.quitar(); await navegador.close(); }
}

// ── Criterios de aceptación (docs/PROMPT-ULTRA-FLUIDO.md, «Medición y criterios de aceptación», punto 4) ─────────────────
export function evaluar(res) {
  const conf = CONFIGURACIONES[res.configuracion];
  for (const t of res.tramos) {
    const mal = [];
    const medible = t.cuadros >= 10;
    if (medible && t.tipo !== 'carga') {
      if (t.p95 > VSYNC) mal.push(`p95 ${t.p95} > 16,7 ms`);
      if (t.p99 >= 20) mal.push(`p99 ${t.p99} ≥ 20 ms`);
      if (t.sobre50 > 0) mal.push(`${t.sobre50} cuadros > 50 ms`);
      if ((t.tipo === 'vuelo' || t.tipo === 'gesto') && t.sobre25 > 1) mal.push(`${t.sobre25} cuadros > 25 ms (máx. 1)`);
    }
    if (t.tipo !== 'carga') {
      if (t.audio.cambiosRitmo) mal.push(`${t.audio.cambiosRitmo} cambios de playbackRate`);
      if (t.audio.saltos) mal.push(`${t.audio.saltos} saltos de la música`);
      if (t.audio.cortes) mal.push(`${t.audio.cortes} cortes de la música`);
    }
    if (t.tipo === 'clip' && t.desfase.muestras && t.desfase.max >= 20) mal.push(`desfase audio↔imagen hasta ${t.desfase.max} ms (p95 ${t.desfase.p95})`);
    for (const l of t.llegadas || []) if (t.nombre !== 'vuelo de entrada' && (l.finMusicaMs === null || Math.abs(l.finMusicaMs) > 20)) mal.push(`aterriza a ${l.finMusicaMs === null ? '(sin música de viajes)' : l.finMusicaMs + ' ms'} del fin de su música`);
    if (['vuelo', 'gesto', 'clip'].includes(t.tipo)) {
      const s = t.subidas, n = s.texturas + s.compilaciones + s.enlaces + s.geometrias + s.renderTargets + s.decodificaciones;
      if (n) mal.push(`${n} subidas/compilaciones (tex ${s.texturas}, comp ${s.compilaciones}, enl ${s.enlaces}, geo ${s.geometrias}, RT ${s.renderTargets}, dec ${s.decodificaciones})`);
      if (t.red.descargas) mal.push(`${t.red.descargas} descargas (${t.red.MB} MB)`);
    }
    t.incumple = mal;
  }
  const global = [];
  if (res.red.antesDelToque.bytes > conf.maxAntesToque) global.push(`antes del toque ${res.red.antesDelToque.MB} MB > ${MB(conf.maxAntesToque)} MB`);
  if (res.red.repetidos.length) global.push(`${res.red.repetidos.length} archivos pedidos más de una vez`);
  if (res.errores.length) global.push(`${res.errores.length} errores en la consola`);
  res.incumpleGlobal = global;
  res.tramosQueIncumplen = res.tramos.filter(t => t.incumple.length).length;
  return res;
}

function tabla(res) {
  const filas = res.tramos.map(t => `${t.nombre.padEnd(26)} ${String(t.fps).padStart(5)} ${String(t.p50).padStart(6)} ${String(t.p95).padStart(6)} ${String(t.p99).padStart(6)} ${String(t.sobre25).padStart(4)} ${String(t.sobre50).padStart(4)} ${String(t.loaf.n).padStart(4)} ${String(t.dibujo.llamadasP50).padStart(5)} ${String(t.gpu.p50 ?? '-').padStart(6)} ${String(t.red.MB).padStart(6)}  ${t.incumple.join('; ')}`);
  return [`${res.configuracion} (${res.viewport.width}×${res.viewport.height}, DPR ${res.dpr}, CPU ×${res.cpu}) · antes del toque ${res.red.antesDelToque.MB} MB · repetidos ${res.red.repetidos.length}`,
    'tramo                        FPS    p50    p95    p99  >25  >50 LoAF  draw  GPUms   red MB  incumple', ...filas, ...(res.incumpleGlobal.length ? ['GLOBAL: ' + res.incumpleGlobal.join('; ')] : [])].join('\n');
}

async function todo(base, nombres, log) {
  const destinos = (process.env.DESTINOS || TODOS.join(',')).split(',').filter(Boolean);
  let commit = ''; try { commit = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch {}
  const salida = { fecha: new Date().toISOString(), commit, criterios: 'docs/PROMPT-ULTRA-FLUIDO.md · Medición y criterios de aceptación, punto 4', configuraciones: {} };
  for (const n of nombres) {
    log(`▸ ${n}`);
    let r = null;
    for (let intento = 1; intento <= 2 && !r; intento++) {
      try { r = evaluar(await recorrer(base, n, { destinos, log })); }
      catch (e) { log(`  ${n}: el recorrido falló (${e.message.split('\n')[0]})${intento < 2 ? ', se repite' : ''}`); if (intento === 2) salida.configuraciones[n] = { error: e.message.split('\n')[0] }; }
    }
    if (r) { salida.configuraciones[n] = r; log(tabla(r)); }
  }
  return salida;
}
function guardar(salida) {
  const destino = path.resolve(RAIZ, process.env.SALIDA || '.pruebas/recorrido.json');
  mkdirSync(path.dirname(destino), { recursive: true }); writeFileSync(destino, JSON.stringify(salida, null, 1));
  console.log(`\nGuardado en ${path.relative(RAIZ, destino)}`);
}

// Como caso de ejecutar.mjs: cada criterio, una comprobación.
export default async function ({ base, informe }) {
  const nombres = (process.env.CONFIGS || 'movil,pc').split(',');
  const salida = await todo(base, nombres, t => informe.nota(t)); guardar(salida);
  for (const [n, r] of Object.entries(salida.configuraciones)) {
    if (r.error) { informe.comprobar(false, `${n}: el recorrido no terminó: ${r.error}`); continue; }
    for (const t of r.tramos) informe.comprobar(!t.incumple.length, `${n} · ${t.nombre}`, t.incumple.length ? t.incumple : undefined);
    informe.comprobar(!r.incumpleGlobal.length, `${n}: carga antes del toque, archivos pedidos una vez y consola limpia`, r.incumpleGlobal.length ? r.incumpleGlobal : undefined);
  }
}

// Directamente: node tests/navegador/recorrido.mjs [movil] [pc] (con el cerrojo de la GPU compartida).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const CERROJO = '/tmp/claude-1000/gpu.lock';
  if (!process.env.CON_CERROJO && existsSync(path.dirname(CERROJO)) && spawnSync('which', ['flock']).status === 0) {
    const r = spawnSync('flock', [CERROJO, process.execPath, ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, CON_CERROJO: '1' } });
    process.exit(r.status ?? 1);
  }
  process.chdir(RAIZ);
  const nombres = process.argv.slice(2).filter(a => CONFIGURACIONES[a]);
  const base = await arrancarServidor();
  try { const salida = await todo(base, nombres.length ? nombres : (process.env.CONFIGS || 'movil,pc').split(','), console.log); guardar(salida); }
  finally { pararServidor(); }
}
