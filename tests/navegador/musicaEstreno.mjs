// Qué suena en el estreno, de principio a fin (no es de la batería): intro, saltar la intro, el clip y la llegada a casa. Lo que
// Carlos oyó en noviembre: «Middle» antes del clip y en casa. node tests/navegador/musicaEstreno.mjs [fecha]
import { lanzar, fijarFecha } from './arnes.mjs';
import { spawn } from 'node:child_process';
const puerto = 8095, servidor = spawn('python3', ['scripts/servir.py', '--port', String(puerto)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const fecha = process.argv[2] || '2026-11-15T10:00:00-03:00';
const { navegador, pagina, errores } = await lanzar('movil430', { musica: true });
const linea = [];
try {
  await fijarFecha(pagina, fecha);
  // Como el teléfono de Carlos: la última vez estaba en Deneb.
  await pagina.addInitScript(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.setItem('xiomara:universo:v2:lugar', JSON.stringify({ destino: 'deneb', fecha: Date.now() })); } });
  await pagina.goto(`http://127.0.0.1:${puerto}/#debug`);
  await pagina.waitForSelector('#toque:not([hidden])', { timeout: 60000 }); await pagina.click('#toque');
  await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 90000 });
  const anotar = async etapa => linea.push(`${etapa}: ${await pagina.evaluate(() => window.__bandaSonora?.objetivo)}`);
  await pagina.waitForTimeout(1500); await anotar('intro');
  await pagina.evaluate(() => document.getElementById('btn-saltar-intro').click());
  for (let i = 0; i < 6; i++) { await pagina.waitForTimeout(700); await anotar(`tras saltar ${i}`); }
  await pagina.waitForFunction(() => document.getElementById('btn-entrar')?.classList.contains('preparado'), null, { timeout: 60000 });
  await anotar('listo para entrar');
  await pagina.evaluate(() => document.getElementById('btn-entrar').click());
  for (let i = 0; i < 4; i++) { await pagina.waitForTimeout(1000); await anotar(`clip ${i}`); }
  await pagina.evaluate(d => window.__galaxia.interfaz.teatro.saltar(d), 60);
  await pagina.waitForFunction(() => !document.body.classList.contains('en-teatro'), null, { timeout: 30000 });
  // (Su carta: se abre y se cierra.)
  await pagina.waitForSelector('.carta-estreno .sobre', { timeout: 10000 }); await anotar('carta');
  await pagina.evaluate(() => document.querySelector('.carta-estreno .sobre').click()); await pagina.waitForTimeout(2000);
  await pagina.evaluate(() => document.querySelector('.carta-estreno .carta-seguir').click());
  for (let i = 0; i < 12; i++) { await pagina.waitForTimeout(1000); await anotar(`tras el clip ${i}`); }
  console.log(linea.join('\n')); console.log('errores', errores.slice(0, 3));
} finally { await navegador.close(); servidor.kill(); }
