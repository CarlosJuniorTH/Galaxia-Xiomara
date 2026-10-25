// Fugaces, deseo, cometa y cola de avisos: en casa como siempre; en las grandes sin fugaces, sin deseo y sin cometa;
// el aviso de la supernova sale en cualquier sitio, pasa delante de la cola y lleva a la supernova.
import { abrir, visitar } from './arnes.mjs';

let pagina;
// Clics reales del ratón en puntos donde lo que hay debajo es el lienzo del universo.
async function tocar(n) {
  for (let k = 0; k < n; k++) {
    const p = await pagina.evaluate(() => { for (let y = 380; y < 700; y += 37) for (let x = 560; x < 1300; x += 53) if (document.elementFromPoint(x, y)?.id === 'galaxia') return [x, y]; return null; });
    await pagina.mouse.click(p[0] + k * 9, p[1]); await pagina.waitForTimeout(900);
  }
}
export default async function ({ base, informe: inf }) {
  const abierto = await abrir(base, 'pc', { espera: 0 }); pagina = abierto.pagina; const { navegador, errores } = abierto;
  try {
    // Los meteoros (y solo ellos) dibujan su cabeza con createRadialGradient en el lienzo de efectos: se cuentan.
    await pagina.evaluate(() => {
      window.__meteoros = 0;
      const orig = CanvasRenderingContext2D.prototype.createRadialGradient;
      CanvasRenderingContext2D.prototype.createRadialGradient = function (...a) { if (this.canvas.id === 'efectos') window.__meteoros++; return orig.apply(this, a); };
      window.__galaxia.escena.probarToque = () => null;   // el toque cae siempre en el cielo vacío
      window.__flotantes = []; new MutationObserver(m => { for (const r of m) for (const n of r.addedNodes) if (n.classList?.contains('flotante')) window.__flotantes.push(n.textContent); }).observe(document.body, { childList: true });
    });
    // 1. En casa, al empezar: nunca dos avisos a la vez (bienvenida y frase del cometa), y caen fugaces.
    const casa = await pagina.evaluate(async () => {
      const b = document.getElementById('brindis'), f = document.getElementById('cometa-frase'), vistos = new Set();
      let juntos = 0, fin = performance.now() + 34000;
      while (performance.now() < fin) {
        const vb = b.classList.contains('visible'), vf = f.classList.contains('visible') && !f.hidden;
        if (vb && vf) juntos++;
        if (vb) vistos.add('brindis:' + b.textContent); if (vf) vistos.add('cometa:' + document.getElementById('cometa-frase-texto').textContent);
        await new Promise(r => setTimeout(r, 100));
      }
      return { juntos, vistos: [...vistos], meteoros: window.__meteoros, cometa: window.__galaxia.escena.cometaVisible };
    });
    inf.comprobar(casa.juntos === 0 && casa.vistos.length >= 2, 'en casa, al empezar, los avisos salen de uno en uno', casa);
    inf.comprobar(casa.meteoros > 0, 'en casa caen estrellas fugaces', casa.meteoros);
    // Tocar el cielo en casa: el primer toque es el deseo.
    await pagina.evaluate(() => { window.__flotantes = []; });
    await tocar(3);
    const toquesCasa = await pagina.evaluate(() => window.__flotantes);
    inf.comprobar(toquesCasa.some(t => t.includes('Pide un deseo')), 'en casa, tocar el cielo trae el deseo', toquesCasa);
    // Cola: dos avisos seguidos no se pisan, y el repetido no sale.
    const cola = await pagina.evaluate(async () => {
      const b = document.getElementById('brindis'), i = window.__galaxia.interfaz;
      await new Promise(r => setTimeout(r, 7000));   // que termine el «Tu deseo ya viaja…»
      i.avisar('Aviso A'); i.avisar('Aviso B'); i.avisar('Aviso B');
      const t0 = b.textContent; await new Promise(r => setTimeout(r, 3000)); const t1 = b.textContent;
      await new Promise(r => setTimeout(r, 3300)); const t2 = b.textContent;
      await new Promise(r => setTimeout(r, 6000)); const t3 = b.classList.contains('visible');
      return { t0, t1, t2, sigueVisible: t3 };
    });
    inf.comprobar(cola.t0 === 'Aviso A' && cola.t1 === 'Aviso A' && cola.t2 === 'Aviso B' && !cola.sigueVisible, 'cola de avisos: A, luego B, y B no se repite', cola);

    // 2. En una de las grandes (el púlsar).
    await visitar(pagina, 'pulsar');
    await pagina.evaluate(() => { window.__meteoros = 0; window.__flotantes = []; });
    await tocar(4);
    const grande = await pagina.evaluate(async () => {
      const i = window.__galaxia.interfaz, e = window.__galaxia.escena;
      let cometa = false, avisoCometa = false; const fin = performance.now() + 36000;
      while (performance.now() < fin) { cometa ||= e.cometaVisible; avisoCometa ||= !document.getElementById('cometa-aviso').hidden || !document.getElementById('cometa-frase').hidden; await new Promise(r => setTimeout(r, 250)); }
      return { enLasGrandes: i.enLasGrandes, lejos: e.lejosDeCasa, meteoros: window.__meteoros, flotantes: window.__flotantes, cometa, avisoCometa, brindis: document.getElementById('brindis').textContent };
    });
    inf.comprobar(grande.enLasGrandes && grande.meteoros === 0, 'en el púlsar no caen estrellas fugaces', grande);
    inf.comprobar(grande.flotantes.length >= 3 && !grande.flotantes.some(t => t.includes('deseo')) && !grande.brindis.includes('deseo'), 'en el púlsar tocar da besos, no el deseo', grande.flotantes);
    inf.comprobar(!grande.cometa && !grande.avisoCometa, 'en el púlsar no hay cometa ni su aviso');

    // 3. La supernova quiere estallar: su aviso pasa delante del que se ve y el viaje empieza, también desde el púlsar.
    const sn = await pagina.evaluate(async () => {
      const b = document.getElementById('brindis'), i = window.__galaxia.interfaz, e = window.__galaxia.escena;
      i.avisar('Un aviso cualquiera'); i.avisar('Otro que espera');
      await new Promise(r => setTimeout(r, 300));
      e.aplazarSupernova(-1);
      const t0 = performance.now(); while (performance.now() - t0 < 4000 && !b.textContent.includes('Dos luces')) await new Promise(r => setTimeout(r, 50));
      return { texto: b.textContent, visible: b.classList.contains('visible'), ms: Math.round(performance.now() - t0), destino: e.destino, viajando: e.viajando };
    });
    inf.comprobar(sn.texto.includes('Dos luces') && sn.visible && sn.destino === 'supernova', 'el aviso de la supernova pasa delante de la cola y lleva a la supernova', sn);
    inf.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
