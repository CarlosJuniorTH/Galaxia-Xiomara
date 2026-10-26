// «Algunas cosas se separan al moverse»: ninguna capa visible se dibuja con la matriz de un cuadro anterior. En cada
// dibujo de la escena (también las capas a media resolución: gas volumétrico, galaxias de la telaraña) se recompone la
// matriz del mundo de cada objeto visible desde su posición/giro/escala y la de su padre, y se compara con la que se usa.
// Giros rápidos con el dedo en casa, un viaje a un gigante (con su clip) y giros allí. Perfil iPhone.
import { abrir } from './arnes.mjs';

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'iphone', { espera: 1500 });
  try {
    await pagina.evaluate(() => {
      const { scene, THREE } = window.__galaxia.escena.interno;
      const m = new THREE.Matrix4(), w = new THREE.Matrix4(), R = window.__mat = { dibujos: 0, malos: new Map() };
      scene.onBeforeRender = () => {
        R.dibujos++;
        scene.traverseVisible(o => {
          if (o === scene || o.isCamera || !o.parent) return;
          if (o.matrixAutoUpdate) m.compose(o.position, o.quaternion, o.scale); else m.copy(o.matrix);
          w.multiplyMatrices(o.parent.matrixWorld, m);
          let d = 0; for (let i = 0; i < 16; i++) d = Math.max(d, Math.abs(w.elements[i] - o.matrixWorld.elements[i]) / (1 + Math.abs(w.elements[i])));
          if (d > 1e-5) { let r = o; while (r.parent && r.parent !== scene) r = r.parent; const k = `${o.name || o.type} (${r.userData.capa || r.name || r.type})`; R.malos.set(k, Math.max(R.malos.get(k) || 0, d)); }
        });
      };
    });
    const cdp = await pagina.context().newCDPSession(pagina);
    const arrastrar = async (dx, dy) => { let x = 195, y = 430; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); for (let k = 0; k < 14; k++) { x += dx; y += dy; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await new Promise(r => setTimeout(r, 16)); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    const leer = () => pagina.evaluate(() => { const r = window.__mat, s = { dibujos: r.dibujos, malos: [...r.malos].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, d]) => `${k} ${d.toExponential(1)}`) }; r.malos.clear(); r.dibujos = 0; return s; });
    for (const [dx, dy] of [[28, 0], [-24, 6], [32, -5]]) { await arrastrar(dx, dy); await pagina.waitForTimeout(500); }
    const casa = await leer();
    informe.comprobar(casa.dibujos > 20 && casa.malos.length === 0, 'giros rápidos en casa: todo se dibuja con su matriz de este cuadro', casa);
    await pagina.evaluate(() => window.__galaxia.interfaz.visitar('cuasar'));
    await pagina.waitForFunction(() => window.__galaxia.escena.viajando, null, { timeout: 5000 }).catch(() => {});
    await pagina.waitForFunction(() => !window.__galaxia.escena.viajando, null, { timeout: 120000, polling: 100 });
    const viaje = await leer();
    informe.comprobar(viaje.malos.length === 0, 'viaje al cuásar: ninguna capa va un cuadro por detrás', viaje);
    await pagina.waitForTimeout(4000);
    for (const [dx, dy] of [[28, 0], [-24, 6]]) { await arrastrar(dx, dy); await pagina.waitForTimeout(500); }
    const gigante = await leer();
    informe.comprobar(gigante.malos.length === 0, 'en el cuásar (clip y giros): ninguna capa va un cuadro por detrás', gigante);
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
