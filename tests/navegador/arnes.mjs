// Arnés de las comprobaciones en navegador (npm run test:navegador).
// Chromium con la GPU real del equipo; un servidor propio solo en 127.0.0.1 (no expone la red).
// playwright-core se busca en node_modules, en PLAYWRIGHT_CORE o en .pruebas/pw/node_modules.
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import path from 'path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function cargarPlaywright() {
  const candidatos = [process.env.PLAYWRIGHT_CORE, path.join(RAIZ, 'node_modules/playwright-core'), path.join(RAIZ, '.pruebas/pw/node_modules/playwright-core')].filter(Boolean);
  for (const c of candidatos) if (existsSync(c)) return createRequire(import.meta.url)(c);
  console.error('Falta playwright-core. Instálalo (npm i -D playwright-core) o indica su ruta con PLAYWRIGHT_CORE.'); process.exit(2);
}
const { chromium, devices } = cargarPlaywright();
const CHROME = process.env.CHROME || homedir() + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';

export const PERFILES = {
  pc: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  iphoneMax: { ...devices['iPhone 13'], viewport: { width: 430, height: 775 }, screen: { width: 430, height: 932 } },
  android: { ...devices['Pixel 7'] }
};

let servidor = null;
export async function arrancarServidor(puerto = Number(process.env.PUERTO_PRUEBAS || 8091)) {
  if (process.env.BASE) return process.env.BASE;
  servidor = spawn('python3', [path.join(RAIZ, 'scripts/servir.py'), '--port', String(puerto)], { cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, mal) => { const t = setTimeout(() => mal(new Error('el servidor de pruebas no arrancó')), 10000); servidor.stdout.on('data', d => { if (String(d).includes('Universo listo')) { clearTimeout(t); ok(); } }); servidor.on('exit', c => mal(new Error('servidor terminado: ' + c))); });
  return `http://127.0.0.1:${puerto}`;
}
export function pararServidor() { servidor?.kill(); servidor = null; }

export async function abrir(base, perfil = 'pc', { espera = 2500, calidad = 'alta' } = {}) {
  if (!existsSync(CHROME)) { console.error('No encuentro Chromium en ' + CHROME + ' (variable CHROME).'); process.exit(2); }
  const navegador = await chromium.launch({ executablePath: CHROME, headless: true, args: process.env.GL === 'sw' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-features=Vulkan'] });
  const contexto = await navegador.newContext(PERFILES[perfil]);
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  pagina.on('pageerror', e => errores.push('pageerror: ' + e.message));
  await pagina.goto(`${base}/?calidad=${calidad}#debug`);
  await pagina.waitForFunction(() => document.getElementById('btn-entrar')?.classList.contains('preparado'), null, { timeout: 90000 });
  await pagina.click('#btn-entrar');
  await pagina.waitForFunction(() => window.__galaxia && !window.__galaxia.escena.viajando && document.body.classList.contains('dentro'), null, { timeout: 40000 });
  await pagina.waitForTimeout(espera);
  return { navegador, pagina, errores };
}

// Utilidades comunes para los casos.
export const esperarLlegada = (pagina, t = 120000) => pagina.waitForFunction(() => !window.__galaxia.escena.viajando, null, { timeout: t, polling: 100 });
export async function visitar(pagina, id) { await pagina.evaluate(id => { window.__galaxia.interfaz.visitar(id); }, id); await pagina.waitForFunction(() => window.__galaxia.escena.viajando, null, { timeout: 5000, polling: 30 }).catch(() => {}); await esperarLlegada(pagina); }

// Registro de aceptación: cada comprobación cuenta; al final, código de salida ≠ 0 si alguna falla.
export function crearInforme(nombre) {
  const fallos = [], hechos = [];
  return {
    comprobar(condicion, texto, datos) { (condicion ? hechos : fallos).push(texto); console.log(`${condicion ? '  ✓' : '  ✗'} ${texto}${datos !== undefined ? '  ' + JSON.stringify(datos) : ''}`); },
    nota(texto) { console.log('  · ' + texto); },
    resumen() { console.log(`${nombre}: ${hechos.length} correctas, ${fallos.length} fallos`); return fallos; }
  };
}
