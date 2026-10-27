// npm run test:navegador [caso…] — comprobaciones en un navegador real con criterios de aceptación.
// Sale con código 1 si alguna comprobación falla y 2 si falta el entorno (Chromium, playwright-core).
import { readdirSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { arrancarServidor, pararServidor, crearInforme } from './arnes.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(DIR, '../..'));
mkdirSync('.pruebas/capturas/navegador', { recursive: true });
const pedidos = process.argv.slice(2);
// (recorrido y capturasRendimiento duran media hora: solo si se piden por su nombre)
const A_PEDIDO = ['recorrido', 'capturasRendimiento'];
const casos = readdirSync(DIR).filter(f => f.endsWith('.mjs') && !['arnes.mjs', 'ejecutar.mjs'].includes(f)).map(f => f.replace('.mjs', '')).filter(c => pedidos.length ? pedidos.includes(c) : !A_PEDIDO.includes(c));
const base = await arrancarServidor();
let fallos = [];
try {
  for (const caso of casos) {
    console.log(`\n▸ ${caso}`);
    const informe = crearInforme(caso), t = Date.now();
    try { const { default: ejecutar } = await import(path.join(DIR, caso + '.mjs')); await ejecutar({ base, informe }); }
    catch (e) { informe.comprobar(false, `el caso terminó con un error: ${e.message.split('\n')[0]}`); }
    fallos = fallos.concat(informe.resumen().map(f => `${caso}: ${f}`));
    console.log(`  (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  }
} finally { pararServidor(); }
if (fallos.length) { console.log('\nFALLOS:\n' + fallos.map(f => ' - ' + f).join('\n')); process.exit(1); }
console.log('\nTodas las comprobaciones de navegador pasan.');
