// Capturas de calidad ANTES/DESPUÉS en poses fijas y reproducibles (docs/PROMPT-ULTRA-FLUIDO.md, criterio 5): el clip de
// la intro en 5 instantes, casa, cada gigante en su momento más espectacular (un segundo concreto de su videoclip), la
// supernova (estallido y corazón) y el sistema solar. En las dos ventanas del recorrido: movil (430×932, DPR 3) y pc
// (1440×900). Sin ?fps (sin panel) y sin limitar la CPU: lo que se compara es la imagen.
//  · Intro: cuando su reloj llega al instante, __intro.fijar(t) lo deja exactamente ahí mientras se captura.
//  · Gigantes y supernova: cuando el segundo de su videoclip (escena.clip.segundo, el de su canción) pasa el previsto, se
//    congela el lienzo 3D en ese mismo cuadro (las órdenes de dibujo de WebGL dejan de hacer nada: queda el último cuadro)
//    y se captura; la cámara la lleva la pista del clip con ese segundo, así que es la misma en cada pasada.
//  · Casa y sistema solar: la cámara se coloca en una pose guardada en docs/capturas-rendimiento/poses.json (la primera
//    pasada la anota al llegar; las siguientes la reutilizan), se espera un momento y se congela igual.
// En docs/capturas-rendimiento/<DESTINO>/ (antes por defecto) quedan <config>-<nombre>.jpg y capturas.json con el segundo
// exacto de cada una. Lanzar:
//   PLAYWRIGHT_CORE=… PUERTO_PRUEBAS=8220 DESTINO=despues node tests/navegador/capturasRendimiento.mjs [movil] [pc]
// (FORMATO=png para capturas sin pérdida). Si el reloj maestro expone window.__relojMaestro.fijar(s), no hace falta: el
// segundo de cada gigante se lee igual de escena.clip.segundo.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { spawnSync, execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import { lanzar, arrancarServidor, pararServidor } from './arnes.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(RAIZ, 'docs/capturas-rendimiento');
const FORMATO = process.env.FORMATO === 'png' ? 'png' : 'jpeg';
const VENTANAS = { movil: 'movil430', pc: 'pc' };
// Instantes del clip de la intro (s) y segundo de cada gigante (marcas de js/util/escenasGigantes.js, guionTon618.js,
// guionSagitario.js y supernovaAmor.js: estribillo del púlsar, el cuásar estalla, el drop de Deneb, la cumbre de TON 618,
// el cuarto «sí» de Sagitario A*, el estallido de la supernova y su corazón ya formado).
const INTRO = [2.0, 8.0, 20.5, 25.5, 28.5];
const GIGANTES = [['pulsar', 18.5], ['cuasar', 29.8], ['deneb', 21.5], ['ton618', 32.8], ['sagitario', 33.4], ['supernova', 44.0, 'supernova-estallido'], ['supernova', 54.0, 'supernova-corazon']];

const congelador = () => {
  // Congela el lienzo 3D en el cuadro en curso: mientras __congelado, WebGL no dibuja nada (queda la última imagen).
  const P = WebGL2RenderingContext.prototype;
  for (const n of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements', 'clear', 'blitFramebuffer']) { const f = P[n]; P[n] = function (...a) { if (window.__congelado && this.canvas?.id === 'galaxia') return; return f.apply(this, a); }; }
  window.__congelado = false; window.__objetivo = null;
  // Primero en cada cuadro (se registra antes que la página): si el segundo del clip ya pasó el objetivo, congela este cuadro.
  const f = () => { requestAnimationFrame(f); const o = window.__objetivo; if (!o || window.__congelado) return;
    const c = window.__galaxia?.escena.clip; if (c?.id === o.id && c.segundo != null && c.segundo >= o.s) { window.__congelado = true; o.visto = c.segundo; o.anterior = window.__ultimoSegundo ?? null; }
    window.__ultimoSegundo = c?.segundo ?? null; };
  requestAnimationFrame(f);
};

async function capturar(base, config, { destino, poses, log }) {
  const { navegador, pagina, errores } = await lanzar(VENTANAS[config], { musica: true });
  const hechas = [], carpeta = path.join(DIR, destino);
  const foto = async (nombre, datos = {}) => {
    const archivo = `${config}-${nombre}.${FORMATO === 'png' ? 'png' : 'jpg'}`;
    await pagina.screenshot({ path: path.join(carpeta, archivo), type: FORMATO, ...(FORMATO === 'jpeg' ? { quality: 92 } : {}) });
    hechas.push({ nombre, archivo, ...datos }); log(`  ✓ ${archivo} ${JSON.stringify(datos)}`);
  };
  const pose = () => pagina.evaluate(() => { const { camera, controls } = window.__galaxia.escena.interno; return { pos: camera.position.toArray(), objetivo: controls.target.toArray(), fov: camera.fov }; });
  const ponerPose = p => pagina.evaluate(p => { const e = window.__galaxia.escena, { camera, controls } = e.interno; e.detenerGiro(true); camera.position.fromArray(p.pos); controls.target.fromArray(p.objetivo); camera.fov = p.fov; camera.updateProjectionMatrix(); controls.update(); }, p);
  const congelarYFoto = async (nombre, datos) => { await pagina.evaluate(() => { window.__congelado = true; }); await pagina.waitForTimeout(150); await foto(nombre, datos); await pagina.evaluate(() => { window.__congelado = false; }); };
  try {
    await pagina.addInitScript(congelador);
    await pagina.goto(`${base}/?calidad=alta#debug`);
    await pagina.waitForSelector('#toque:not([hidden])', { timeout: 300000 });
    await pagina.click('#toque');
    await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 300000, polling: 50 });
    for (const [k, t] of INTRO.entries()) {
      await pagina.waitForFunction(t => { const I = window.__intro; if (I.tiempo !== null && I.tiempo >= t - 0.03) { I.fijar(t); return true; } return false; }, t, { timeout: 60000, polling: 'raf' });
      await pagina.waitForTimeout(250);
      await foto(`intro-${k + 1}`, { segundo: t });
      await pagina.evaluate(() => window.__intro.soltar());
    }
    await pagina.waitForFunction(() => document.getElementById('btn-entrar')?.classList.contains('preparado') && document.getElementById('entrada').classList.contains('formado'), null, { timeout: 200000, polling: 100 });
    await pagina.waitForTimeout(1500);
    await pagina.click('#btn-entrar');
    await pagina.waitForFunction(() => window.__galaxia && !window.__galaxia.escena.viajando && document.body.classList.contains('dentro'), null, { timeout: 200000, polling: 100 });
    await pagina.evaluate(() => window.__galaxia.escena.aplazarSupernova(1e6));
    await pagina.waitForTimeout(2500);
    poses[config] ||= {};
    if (!poses[config].casa) poses[config].casa = await pose();
    await ponerPose(poses[config].casa); await pagina.waitForTimeout(1500); await ponerPose(poses[config].casa); await pagina.waitForTimeout(300);
    await congelarYFoto('casa', { pose: poses[config].casa });

    const visitar = async id => {
      await pagina.evaluate(id => { const i = window.__galaxia.interfaz; i.terminarEscena(); i.visitar(id); }, id);
      await pagina.waitForFunction(() => window.__galaxia.escena.viajando || window.__galaxia.escena.restanteViaje > 0, null, { timeout: 8000, polling: 30 }).catch(() => {});
      await pagina.waitForFunction(() => !window.__galaxia.escena.viajando && !(window.__galaxia.escena.restanteViaje > 0), null, { timeout: 200000, polling: 100 });
    };
    let ultimo = null;
    for (const [id, s, nombre = id] of GIGANTES) {
      if (id !== ultimo) await visitar(id);
      ultimo = id;
      await pagina.evaluate(([id, s]) => { window.__objetivo = { id, s }; }, [id, s]);
      await pagina.waitForFunction(() => window.__congelado, null, { timeout: 120000, polling: 50 });
      await pagina.waitForTimeout(150);
      const o = await pagina.evaluate(() => window.__objetivo);
      await foto(nombre, { segundoPrevisto: s, segundoDibujado: o.anterior !== null ? +o.anterior.toFixed(3) : null, segundoAlCongelar: +o.visto.toFixed(3) });
      await pagina.evaluate(() => { window.__objetivo = null; window.__congelado = false; });
    }
    await visitar('rosa');
    await pagina.waitForTimeout(2500);
    if (!poses[config].solar) poses[config].solar = await pose();
    await ponerPose(poses[config].solar); await pagina.waitForTimeout(1500); await ponerPose(poses[config].solar); await pagina.waitForTimeout(300);
    await congelarYFoto('sistema-solar', { pose: poses[config].solar });
    return { config, ventana: VENTANAS[config], capturas: hechas, errores: errores.slice(0, 5) };
  } finally { await navegador.close(); }
}

async function todo(base, configs, log) {
  const destino = process.env.DESTINO || 'antes';
  mkdirSync(path.join(DIR, destino), { recursive: true });
  const archivoPoses = path.join(DIR, 'poses.json');
  const poses = existsSync(archivoPoses) ? JSON.parse(readFileSync(archivoPoses, 'utf8')) : {};
  let commit = ''; try { commit = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch {}
  const salida = { fecha: new Date().toISOString(), commit, formato: FORMATO, intro: INTRO, gigantes: GIGANTES, configuraciones: {} };
  for (const c of configs) { log(`▸ ${c}`); salida.configuraciones[c] = await capturar(base, c, { destino, poses, log }); writeFileSync(archivoPoses, JSON.stringify(poses, null, 1)); }
  writeFileSync(path.join(DIR, destino, 'capturas.json'), JSON.stringify(salida, null, 1));
  return salida;
}

export default async function ({ base, informe }) {
  const s = await todo(base, (process.env.CONFIGS || 'movil,pc').split(','), t => informe.nota(t));
  for (const [c, r] of Object.entries(s.configuraciones)) informe.comprobar(r.capturas.length === INTRO.length + GIGANTES.length + 2, `${c}: todas las capturas`, r.capturas.length);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const CERROJO = '/tmp/claude-1000/gpu.lock';
  if (!process.env.CON_CERROJO && existsSync(path.dirname(CERROJO)) && spawnSync('which', ['flock']).status === 0) {
    const r = spawnSync('flock', [CERROJO, process.execPath, ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, CON_CERROJO: '1' } });
    process.exit(r.status ?? 1);
  }
  process.chdir(RAIZ);
  const pedidas = process.argv.slice(2).filter(a => VENTANAS[a]);
  const base = await arrancarServidor();
  try { await todo(base, pedidas.length ? pedidas : (process.env.CONFIGS || 'movil,pc').split(','), console.log); }
  finally { pararServidor(); }
}
