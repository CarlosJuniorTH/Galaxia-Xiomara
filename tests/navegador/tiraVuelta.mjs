// Capturas de los videoclips de la primera vuelta al Sol en segundos elegidos, sin esperar a que pasen (no es un caso de
// la batería): node tests/navegador/tiraVuelta.mjs <carpeta> <11|12|dossoles> <perfil> <seg,seg,…>
import { abrir } from './arnes.mjs';
import { spawn } from 'node:child_process';
const [carpeta, mes, perfil, lista] = process.argv.slice(2);
const puerto = 8097, servidor = spawn('python3', ['scripts/servir.py', '--port', String(puerto)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
try {
  const fecha = mes !== '12' ? '2026-11-15T10:00:00-03:00' : '2026-12-15T10:00:00-03:00';
  const { navegador, pagina, errores } = await abrir(`http://127.0.0.1:${puerto}`, perfil, { fecha, espera: 3000 });
  await pagina.waitForFunction(() => window.__galaxia?.interfaz?.teatro, null, { timeout: 120000 });
  await pagina.evaluate(m => { window.__clip = window.__galaxia.interfaz.teatro.reproducir(m); }, mes === 'dossoles' ? mes : +mes);
  await pagina.waitForFunction(() => document.querySelector('.teatro-negro') && !document.querySelector('.teatro-negro').classList.contains('activo'), null, { timeout: 30000 });
  const t0 = Date.now(); let saltado = 0;
  for (const s of lista.split(',').map(Number)) {
    const ahora = saltado + (Date.now() - t0) / 1000;
    if (s > ahora) { await pagina.evaluate(d => window.__galaxia.interfaz.teatro.saltar(d), s - ahora); saltado += s - ahora; }
    await pagina.waitForTimeout(650);
    await pagina.screenshot({ path: `${carpeta}/m${mes}-${perfil}-${String(s).padStart(3, '0')}.png` });
  }
  console.log(JSON.stringify({ errores: errores.slice(0, 5) }));
  await navegador.close();
} finally { servidor.kill(); }
