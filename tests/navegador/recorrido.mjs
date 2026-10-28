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
import { writeFileSync, mkdirSync, statSync, existsSync, readFileSync } from 'fs';
import { gzipSync } from 'zlib';
import { loadavg, cpus } from 'os';
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
const vp0 = conf => PERFILES[conf.perfil].viewport;
const tipoDe = n => /^vuelo|^viaje|vuelta a casa/.test(n) ? 'vuelo' : /^giro|^zoom/.test(n) ? 'gesto' : /^clip|^escena (cuasar|pulsar|deneb|ton618|sagitario|supernova)/.test(n) ? 'clip' : /^carga/.test(n) ? 'carga' : 'resto';

// Bytes por la red como los sirve GitHub Pages (la web publicada): el texto (módulos, estilos, JSON, SVG, HTML) con gzip, lo
// demás tal cual. Se calcula igual sea cual sea el servidor de pruebas (el de antes no comprimía; scripts/servir.py ahora
// sí): así antes y después se comparan con la misma vara. `disco` guarda el tamaño sin comprimir.
const COMPRIMIBLES = new Set(['.js', '.mjs', '.css', '.json', '.svg', '.html', '.webmanifest', '.txt']), gz = new Map();
function transferidos(f, disco) {
  if (!COMPRIMIBLES.has(path.extname(f))) return disco;
  const clave = f + ':' + disco; if (!gz.has(clave)) gz.set(clave, gzipSync(readFileSync(f), { level: 6 }).length);
  return gz.get(clave);
}
// ── Red: cada petición que llega al servidor (página, módulos, obreros y service worker) ─────────────────────────────────
function vigilarRed() {
  const peticiones = []; let resto = '';
  const quitar = alRegistroServidor(texto => {
    const lineas = (resto + texto).split('\n'); resto = lineas.pop();
    for (const l of lineas) { const m = l.match(/"(GET|HEAD|POST) ([^ ]+) HTTP\/[\d.]+" (\d{3})/); if (!m) continue;
      const ruta = decodeURIComponent(m[2].split('?')[0].split('#')[0]); let bytes = 0;
      let disco = 0;
      if (m[1] === 'GET' && m[3] === '200') { const f = path.join(RAIZ, ruta === '/' || ruta.endsWith('/') ? ruta.slice(1) + 'index.html' : ruta.slice(1)); try { disco = statSync(f).size; bytes = transferidos(f, disco); } catch {} }
      peticiones.push({ t: Date.now(), metodo: m[1], ruta, estado: +m[3], bytes, disco }); }
  });
  return { peticiones, quitar };
}
const MB = b => +(b / 1048576).toFixed(2);
function resumirRed(lista) {
  const descargas = lista.filter(p => p.metodo === 'GET' && p.estado === 200);
  const disco = descargas.reduce((s, p) => s + (p.disco ?? p.bytes), 0);
  return { peticiones: lista.length, descargas: descargas.length, bytes: descargas.reduce((s, p) => s + p.bytes, 0), MB: MB(descargas.reduce((s, p) => s + p.bytes, 0)), MBdisco: MB(disco),
    archivos: descargas.slice(0, 30).map(p => `${p.ruta} (${(p.bytes / 1024).toFixed(0)} KB)`) };
}

async function recorrer(base, nombre, { destinos = TODOS, log = console.log } = {}) {
  const conf = CONFIGURACIONES[nombre];
  const red = vigilarRed();
  // La máquina de pruebas se comparte: la carga media del sistema durante el recorrido se guarda con el resultado (si otros
  // procesos ocupan la CPU, los cuadros salen peores sin que sea la página).
  const cargas = [], vigiaCarga = setInterval(() => cargas.push(loadavg()[0]), 5000);
  const { navegador, pagina, errores } = await lanzar(conf.perfil, { musica: true });
  const marcasNodo = [];   // [epoch, tramo] para repartir la red
  try {
    const cdp = await pagina.context().newCDPSession(pagina);
    if (conf.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: conf.cpu });
    const tramo = async n => { const t = await pagina.evaluate(n => { window.__medidor.tramo(n); return performance.timeOrigin + performance.now(); }, n); marcasNodo.push([t, n]); log(`  · ${n}`); };
    // Cambia de tramo en el cuadro exacto en que termina el viaje en curso (o el vuelo de entrada).
    const alLlegar = async n => {
      // En el cuadro de la llegada: el aviso de la escena a la banda sonora (banda.llegada, el mismo instante en que empiezan
      // la canción y la escena del destino) o, si no llega, cuando ya no queda viaje.
      await pagina.evaluate(n => {
        const e = window.__galaxia.escena, b = window.__bandaSonora; window.__llegadaEn = 0;
        const cambiar = () => { if (window.__llegadaEn) return; window.__medidor.tramo(n); window.__llegadaEn = performance.timeOrigin + performance.now(); };
        if (b && !b.__medido) { b.__medido = true; const o = b.llegada; b.llegada = function (...a) { window.__alLlegarBanda?.(); return o.apply(this, a); }; }
        window.__alLlegarBanda = () => { window.__alLlegarBanda = null; cambiar(); };
        const f = () => { if (window.__llegadaEn) return; if (e.viajando || e.restanteViaje > 0) return requestAnimationFrame(f); cambiar(); }; requestAnimationFrame(f);
      }, n);
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
    // El toque en sí (su respuesta: el botón se va) y, si la carga aún no ha terminado, la pantalla de carga hasta el 100 %
    // (tipo carga: es la misma carga, que empieza al abrir la página y sigue aunque se toque antes).
    await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 1000, polling: 50 }).catch(async () => {
      await tramo('carga tras el toque');
      await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 300000, polling: 50 });
    });
    await tramo('clip de la intro');
    const tClip = Date.now();
    if (process.env.HASTA === 'toque') return { configuracion: nombre, perfil: conf.perfil, viewport: vp0(conf), dpr: PERFILES[conf.perfil].deviceScaleFactor, cpu: conf.cpu, red: { antesDelToque: resumirRed(red.peticiones.filter(p => p.t < tToque)), antesDelClip: resumirRed(red.peticiones.filter(p => p.t < tClip)), archivos: red.peticiones.filter(p => p.t < tToque && p.estado === 200).map(p => [p.ruta, p.bytes, p.disco]) }, tramos: [], errores: [] };
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
    // Un gesto dura hasta que la vista se para del todo (su inercia incluida: escena.enGesto); entonces empieza la calma
    // (lo que se haga en reposo ya no es «durante un gesto»).
    const quieto = async () => {
      await pagina.waitForTimeout(200);
      await pagina.waitForFunction(() => !(window.__galaxia.escena.enGesto ?? false), null, { timeout: 8000, polling: 'raf' }).catch(() => log('    (la vista no se paró en 8 s)'));
      const n = await pagina.evaluate(() => window.__medidor.tramoActual); await tramo(`quieto tras ${n}`); await pagina.waitForTimeout(1500);
    };
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
      await quieto();   // la inercia hasta pararse
    };
    const zoom = async () => {
      if (conf.tactil) {
        for (const sentido of [1, -1]) {
          let d = sentido > 0 ? 60 : 200; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }] });
          for (let k = 0; k < 20; k++) { d += sentido * 7; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }] }); await pagina.waitForTimeout(16); }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pagina.waitForTimeout(300);
        }
      } else {
        await pagina.mouse.move(cx, cy);
        for (const s of [-240, 240]) { for (let k = 0; k < 10; k++) { await pagina.mouse.wheel(0, s); await pagina.waitForTimeout(40); } await pagina.waitForTimeout(300); }
      }
      await quieto();
    };
    // El tramo de un gesto empieza con el primer contacto (pointerdown o rueda), en la página: no antes.
    const alGesto = n => pagina.evaluate(n => { const f = () => { removeEventListener('pointerdown', f, true); removeEventListener('wheel', f, true); window.__medidor.tramo(n); }; addEventListener('pointerdown', f, true); addEventListener('wheel', f, true); }, n).then(() => { marcasNodo.push([Date.now(), n]); log(`  · ${n}`); });
    // Un viaje: el clic (lo que se prepara antes de despegar: plan, búferes de la escena de destino) y, desde el primer
    // cuadro en movimiento, el vuelo.
    const viajar = async (id, nombre) => {
      await tramo(`clic hacia ${id}`);
      await pagina.evaluate(n => { const e = window.__galaxia.escena; window.__despegue = 0; const f = () => { if (!(e.viajando || e.restanteViaje > 0)) return requestAnimationFrame(f); window.__medidor.tramo(n); window.__despegue = 1; }; requestAnimationFrame(f); }, nombre);
      await pagina.evaluate(id => { const i = window.__galaxia.interfaz; i.terminarEscena(); i.visitar(id); }, id);
      await pagina.waitForFunction(() => window.__despegue, null, { timeout: 8000, polling: 30 }).then(() => log(`  · ${nombre}`), () => log(`    (${id}: no despegó)`));
    };
    await alGesto('giro en casa'); await giro();
    await alGesto('zoom en casa'); await zoom();

    for (const id of destinos) {
      await viajar(id, `viaje a ${id}`);
      await alLlegar(`escena ${id}`);
      if (GIGANTES.includes(id)) {
        await pagina.waitForFunction(id => window.__galaxia.escena.clip?.id === id || document.body.classList.contains('escena-gigante'), id, { timeout: 20000, polling: 100 }).catch(() => log(`    (${id}: no empezó su clip)`));
        // El videoclip termina (escena.clip vuelve a null): lo que sigue (la cámara vuelve con un fundido, la interfaz) ya no
        // es el clip.
        await pagina.evaluate(n => { const e = window.__galaxia.escena; window.__finClip = 0; let visto = false; const f = () => { if (e.clip) visto = true; if (visto && !e.clip) { window.__medidor.tramo(n); window.__finClip = 1; return; } requestAnimationFrame(f); }; requestAnimationFrame(f); }, `tras la escena ${id}`);
        await pagina.waitForFunction(() => window.__finClip, null, { timeout: 200000, polling: 250 }).then(() => log(`  · tras la escena ${id}`), () => {});
        await pagina.waitForFunction(() => !window.__galaxia.escena.clip && !document.body.classList.contains('escena-gigante') && (document.getElementById('supernova-amor')?.hidden ?? true), null, { timeout: 200000, polling: 250 });
        await pagina.waitForTimeout(1000);
      } else await pagina.waitForTimeout(4000);
      if (id === 'rosa') { await tramo('sistema solar'); await pagina.waitForTimeout(3000); await alGesto('giro en el sistema solar'); await giro(); }
    }
    await viajar('hogar', 'vuelta a casa');
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
      red: { antesDelClip: (({ MB, MBdisco, descargas }) => ({ MB, MBdisco, descargas }))(resumirRed(red.peticiones.filter(p => p.t < tClip))), antesDelToque: { MB: antes.MB, MBdisco: antes.MBdisco, bytes: antes.bytes, descargas: antes.descargas, archivos: red.peticiones.filter(p => p.t < tToque && p.estado === 200).map(p => [p.ruta, p.bytes, p.disco]) }, total: resumirRed(red.peticiones), repetidos: [...veces].filter(([, n]) => n > 1).map(([ruta, n]) => ({ ruta, veces: n })) },
      tramos, errores: errores.slice(0, 10),
      cargaMaquina: { nucleos: cpus().length, media: +(cargas.reduce((a, b) => a + b, 0) / Math.max(1, cargas.length)).toFixed(2), max: +Math.max(0, ...cargas).toFixed(2) }
    };
  } finally { clearInterval(vigiaCarga); red.quitar(); await navegador.close(); }
}

// ── Criterios de aceptación (docs/PROMPT-ULTRA-FLUIDO.md, «Medición y criterios de aceptación», punto 4) ─────────────────
export function evaluar(res) {
  const conf = CONFIGURACIONES[res.configuracion];
  for (const t of res.tramos) {
    const mal = [];
    // Con menos de 10 cuadros (un clic, un toque) p95 y p99 son el peor: se le pide lo mismo que al p99.
    const medible = t.cuadros >= 10;
    if (!medible && t.cuadros > 0 && t.tipo !== 'carga' && t.max >= 20) mal.push(`un tramo corto con un cuadro de ${t.max} ms (≥ 20 ms)`);
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
  return [`${res.configuracion} (${res.viewport.width}×${res.viewport.height}, DPR ${res.dpr}, CPU ×${res.cpu}) · antes del toque ${res.red.antesDelToque.MB} MB por la red (${res.red.antesDelToque.MBdisco} MB en disco) · antes del clip ${res.red.antesDelClip.MB} MB · repetidos ${res.red.repetidos.length} · carga de la máquina ${res.cargaMaquina?.media} (máx. ${res.cargaMaquina?.max}, ${res.cargaMaquina?.nucleos} núcleos)`,
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
      try { r = await recorrer(base, n, { destinos, log }); if (!process.env.HASTA) r = evaluar(r); }
      catch (e) { log(`  ${n}: el recorrido falló (${e.message.split('\n')[0]})${intento < 2 ? ', se repite' : ''}`); if (intento === 2) salida.configuraciones[n] = { error: e.message.split('\n')[0] }; }
    }
    if (r && process.env.HASTA) { salida.configuraciones[n] = r; log(`${n}: antes del toque ${r.red.antesDelToque.MB} MB (${r.red.antesDelToque.MBdisco} MB en disco) · antes del clip ${r.red.antesDelClip.MB} MB (${r.red.antesDelClip.MBdisco} en disco)`); continue; }
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
