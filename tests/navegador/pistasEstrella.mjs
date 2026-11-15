// Las cuatro pistas para encontrar una estrella (no es de la batería): ninguna es un viaje (sin su música), la onda se apaga
// sola y la estrella no se marca sola. node tests/navegador/pistasEstrella.mjs
import { lanzar, fijarFecha } from './arnes.mjs';
import { spawn } from 'node:child_process';
const puerto = 8094, servidor = spawn('python3', ['scripts/servir.py', '--port', String(puerto)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const { navegador, pagina, errores } = await lanzar('movil430', { musica: true });
try {
  await fijarFecha(pagina, '2026-11-16T10:00:00-03:00');
  await pagina.goto(`http://127.0.0.1:${puerto}/?sinEstreno#debug`);
  await pagina.waitForSelector('#toque:not([hidden])', { timeout: 60000 }); await pagina.click('#toque');
  await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 90000 }); await pagina.evaluate(() => window.__intro.fijar(9999));
  await pagina.waitForFunction(() => document.getElementById('btn-entrar')?.classList.contains('preparado'), null, { timeout: 60000 });
  await pagina.evaluate(() => document.getElementById('btn-entrar').click());
  await pagina.waitForFunction(() => document.body.classList.contains('dentro') && !window.__galaxia.escena.viajando, null, { timeout: 60000 });
  await pagina.waitForTimeout(2500);
  const encontradasAntes = await pagina.evaluate(() => JSON.stringify(window.__galaxia.progreso.estado?.estrellas ?? null));
  for (let n = 1; n <= 4; n++) {
    await pagina.evaluate(() => document.getElementById('btn-pista').click());
    const musicas = new Set();
    for (let i = 0; i < 8; i++) { await pagina.waitForTimeout(500); musicas.add(await pagina.evaluate(() => window.__bandaSonora?.objetivo)); }
    await pagina.screenshot({ path: `.pruebas/capturas/pista-${n}.png` });
    await pagina.waitForTimeout(3000);
    console.log(`pista ${n}: músicas ${[...musicas].join(',')} · aviso «${await pagina.evaluate(() => document.querySelector('#aviso, .aviso')?.textContent?.slice(0, 40) ?? '')}»`);
  }
  await pagina.waitForTimeout(3000);
  const tras = await pagina.evaluate(() => JSON.stringify(window.__galaxia.progreso.estado?.estrellas ?? null));
  console.log('encontradas igual:', encontradasAntes === tras, '· errores', errores.slice(0, 3));
} finally { await navegador.close(); servidor.kill(); }
