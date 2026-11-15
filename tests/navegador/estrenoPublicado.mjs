// Comprobación contra la web publicada, con el reloj real (no es de la batería): primera visita de un móvil limpio → intro y, al
// pulsar, el clip del día; se recarga a mitad del clip → ya no vuelve a salir. node tests/navegador/estrenoPublicado.mjs
import { lanzar } from './arnes.mjs';
const URL = 'https://carlosjuniorth.github.io/Galaxia-Xiomara/';
const PREPARADO = () => document.getElementById('btn-entrar')?.classList.contains('preparado') && document.getElementById('entrada').classList.contains('cielo');
const { navegador, pagina, errores } = await lanzar('movil430', { musica: true });
const pedidas = []; pagina.on('request', r => { const m = r.url().match(/musica\/([^?]+)/); if (m) pedidas.push(m[1]); });
const entrar = async () => {
  await pagina.waitForSelector('#toque:not([hidden])', { timeout: 60000 }); await pagina.click('#toque');
  await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 90000 });
  await pagina.evaluate(() => window.__intro.fijar(9999));
  await pagina.waitForFunction(PREPARADO, null, { timeout: 60000 });
  await pagina.evaluate(() => document.getElementById('btn-entrar').click()); await pagina.waitForTimeout(1500);
  return pagina.evaluate(() => document.body.classList.contains('en-teatro'));
};
try {
  await pagina.goto(URL);
  const hoy = await pagina.evaluate(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()));
  const primera = await entrar();
  await pagina.waitForTimeout(9000);
  await pagina.screenshot({ path: '.pruebas/capturas/estreno-publicado.png' });
  await pagina.reload();
  const segunda = await entrar();
  console.log(JSON.stringify({ hoy, primeraSaleClip: primera, trasRecargarAMitadSale: segunda, musica: pedidas.filter(p => p.startsWith('mes-')), errores: errores.slice(0, 4) }));
} finally { await navegador.close(); }
