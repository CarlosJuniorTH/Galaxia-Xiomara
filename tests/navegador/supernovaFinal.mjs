// El error que vio Carlos en la supernova («De tanta luz nacimos nosotros»): al terminar la ceremonia y su canción, la
// cámara quedaba lejísimos del corazón y con la rueda se podía alejar muchísimo más (los límites del zoom habían ido
// engordando). Ahora, al terminar, la cámara queda en el encuadre del corazón y el máximo del zoom es ~2,5 veces ese
// encuadre. Solo usa lo que ya había (interno de #debug), así que también reproduce el fallo en el código de antes.
import { existsSync } from 'fs';
import { abrir, visitar } from './arnes.mjs';

export default async function ({ base, informe }) {
  const musica = existsSync('assets/musica/supernova.m4a');
  const { navegador, pagina, errores } = await abrir(base, 'pc', { musica, toque: musica, espera: 800 });
  const medir = () => pagina.evaluate(() => {
    const i = window.__galaxia.escena.interno, d = i.camera.position.distanceTo(i.controls.target), e = i.encuadre;
    return { distancia: Math.round(d), ideal: Math.round(e.ideal ?? 0), max: Math.round(i.controls.maxDistance), min: Math.round(i.controls.minDistance), habilitados: i.controls.enabled, fov: i.camera.fov };
  });
  try {
    await visitar(pagina, 'supernova');
    await pagina.waitForFunction(() => !document.getElementById('supernova-amor').hidden, null, { timeout: 15000, polling: 100 });
    informe.nota('ceremonia en curso (≈ 70 s)');
    // Hasta que la ceremonia se cierra, la interfaz vuelve y la cámara se asienta.
    await pagina.waitForFunction(() => document.getElementById('supernova-amor').hidden && !document.body.classList.contains('escena-gigante'), null, { timeout: 150000, polling: 250 });
    await pagina.waitForTimeout(4000);
    const fin = await medir();
    informe.comprobar(fin.distancia > fin.ideal * 0.75 && fin.distancia < fin.ideal * 1.4, 'al terminar, la cámara queda en el encuadre del corazón (no lejísimos)', fin);
    informe.comprobar(fin.max <= fin.ideal * 3.01, 'el máximo del zoom es razonable (≤ 3 veces el encuadre)', fin);
    informe.comprobar(fin.habilitados && Math.abs(fin.fov - 60) < 0.01, 'el control vuelve, con el campo de visión normal', fin);
    await pagina.screenshot({ path: '.pruebas/capturas/navegador/supernova-final.png' });
    for (let k = 0; k < 8; k++) { await pagina.mouse.move(720, 450); await pagina.mouse.wheel(0, 3000); await pagina.waitForTimeout(150); }
    await pagina.waitForTimeout(2000);
    const lejos = await medir();
    informe.comprobar(lejos.distancia <= lejos.ideal * 3.05, 'alejando con la rueda al máximo no se va lejísimos', lejos);
    await pagina.screenshot({ path: '.pruebas/capturas/navegador/supernova-final-alejada.png' });
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
