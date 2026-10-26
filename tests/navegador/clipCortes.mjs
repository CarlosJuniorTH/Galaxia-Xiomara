// Director de cámara: (1) un plano 'corte' (un salto de la cámara en un cuadro) no cuenta como velocidad: durante un
// videoclip no salen las estelas del «salto a la luz» (campo de velocidad); (2) en el móvil vertical, durante el clip
// (sin tarjeta ni panel) el gigante queda centrado en la pantalla, no en el tercio de arriba por la franja libre de la
// interfaz; al terminar, la franja libre vuelve a mandar. Usa una pista propia con cortes en el púlsar.
import { abrir, visitar } from './arnes.mjs';

const PISTA = [
  { t: 0, pos: [0, 10, 1], mira: [0, 0, 0], curva: 'corte' },
  { t: 1.5, pos: [90, 25, 0.55], curva: 'corte' },
  { t: 3, pos: [-60, -15, 2.2], curva: 'corte' },
  { t: 4.5, pos: [170, 35, 0.7], curva: 'corte' },
  { t: 6, pos: [20, 5, 1.8], curva: 'rapida' },
  { t: 7.5, pos: [-120, 20, 0.6], curva: 'corte' },
  { t: 9, pos: [0, 10, 1], curva: 'corte' }
];

async function probar(base, informe, perfil) {
  const { navegador, pagina, errores } = await abrir(base, perfil, { espera: 800 });
  try {
    await pagina.evaluate(() => window.__galaxia.escena.aplazarSupernova(1e6));
    await visitar(pagina, 'pulsar');
    await pagina.waitForTimeout(1200);
    // Se corta el clip de llegada (su pista es la del agente del púlsar) y se lanza la de cortes, a mano.
    await pagina.evaluate(() => { window.__galaxia.escena.cancelarEscenaGigante('pulsar'); window.__galaxia.interfaz.terminarEscena(); });
    await pagina.waitForFunction(() => !window.__galaxia.escena.clip, null, { timeout: 20000, polling: 100 });
    await pagina.waitForTimeout(1000);
    const r = await pagina.evaluate(async pista => {
      const e = window.__galaxia.escena, i = e.interno, { ESCENA_PULSAR } = await import('/js/util/escenasGigantes.js');
      const config = { ...ESCENA_PULSAR, duracion: 10, marcas: { ...ESCENA_PULSAR.marcas }, camara: pista };
      let maxEstelas = 0, saltos = 0, centro = [], antes = i.camera.position.clone(), seguir = true;
      const v = new i.THREE.Vector3();
      const mirar = () => {
        if (!seguir) return;
        maxEstelas = Math.max(maxEstelas, i.estelas);
        const d = i.camera.position.distanceTo(antes); antes.copy(i.camera.position);
        if (d > e.camaraZoom.encuadre * 0.3) saltos++;
        const c = e.clip;
        if (c && c.segundo > 2.4 && c.segundo < 2.9) { i.camera.updateMatrixWorld(); v.copy(i.controls.target).project(i.camera); centro.push(v.y); }
        requestAnimationFrame(mirar);
      };
      requestAnimationFrame(mirar);
      const fin = e.escenaGigante('pulsar', { config });
      await fin;
      await new Promise(r => setTimeout(r, 500));
      seguir = false;
      return { maxEstelas, saltos, centroY: centro.length ? centro.reduce((a, b) => a + b, 0) / centro.length : null };
    }, PISTA);
    informe.comprobar(r.saltos >= 4, `${perfil}: la pista de prueba corta de verdad (saltos de cámara en un cuadro)`, r.saltos);
    informe.comprobar(r.maxEstelas < 0.015, `${perfil}: los cortes del clip no encienden las estelas del salto a la luz`, +r.maxEstelas.toFixed(4));
    if (perfil !== 'pc') {
      informe.comprobar(r.centroY !== null && Math.abs(r.centroY) < 0.06, `${perfil}: en vertical, durante el clip el gigante queda centrado (no en el tercio de arriba)`, r.centroY);
      await pagina.waitForFunction(() => !window.__galaxia.escena.clip, null, { timeout: 20000, polling: 100 });
      await pagina.waitForTimeout(3500);
      const despues = await pagina.evaluate(() => { const i = window.__galaxia.escena.interno; return i.camera.view?.enabled ? i.camera.view.offsetY : 0; });
      informe.comprobar(Math.abs(despues) > 5, `${perfil}: al terminar, la franja libre de la tarjeta vuelve a desplazar la vista`, despues);
    }
    informe.comprobar(errores.length === 0, `${perfil}: sin errores en la consola`, errores.slice(0, 5));
  } finally { await navegador.close(); }
}

export default async function ({ base, informe }) {
  await probar(base, informe, 'pc');
  await probar(base, informe, 'android');
}
