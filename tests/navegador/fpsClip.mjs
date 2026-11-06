// Fluidez de un videoclip en móvil emulado, con la CPU a un cuarto (no es la batería): node tests/navegador/fpsClip.mjs <11|12|dossoles> <seg,seg,…>
// Mide 6 s de cuadros en cada segundo pedido. Es este PC: orienta, no sustituye a un teléfono real.
import { abrir } from './arnes.mjs';
import { spawn } from 'node:child_process';
const [mes, lista] = process.argv.slice(2), puerto = 8096, servidor = spawn('python3', ['scripts/servir.py', '--port', String(puerto)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
try {
  const { navegador, pagina, errores } = await abrir(`http://127.0.0.1:${puerto}`, 'iphone', { fecha: mes !== '12' ? '2026-11-15T10:00:00-03:00' : '2026-12-15T10:00:00-03:00', espera: 3000 });
  await pagina.waitForFunction(() => window.__galaxia?.interfaz?.teatro, null, { timeout: 120000 });
  const cdp = await pagina.context().newCDPSession(pagina); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await pagina.evaluate(m => { window.__galaxia.interfaz.teatro.reproducir(m); }, mes === 'dossoles' ? mes : +mes);
  await pagina.waitForTimeout(4000);
  let va = 2;
  for (const s of lista.split(',').map(Number)) {
    if (s > va) { await pagina.evaluate(d => window.__galaxia.interfaz.teatro.saltar(d), s - va); va = s; }
    await pagina.waitForTimeout(700);
    const d = await pagina.evaluate(() => new Promise(fin => { const v = []; let t = performance.now(); const fi = t + 6000; (function c(a) { v.push(a - t); t = a; if (a < fi) requestAnimationFrame(c); else fin(v.slice(2).sort((x, y) => x - y)); })(t); }));
    va += 6.7; const p = q => d[Math.floor(d.length * q)]?.toFixed(1);
    console.log(`s=${s}  cuadros ${d.length}  p50 ${p(0.5)} ms  p99 ${p(0.99)} ms  máx ${d.at(-1)?.toFixed(1)} ms`);
  }
  console.log('errores', errores.length);
  await navegador.close();
} finally { servidor.kill(); }
