// La música de los viajes («Duvet», viajes.m4a, 15 s, hastaLlegar) con la canción de verdad, como en un iPhone y con la CPU
// ×4 (CPU=…, PERFIL=…): alejar y acercar con la rueda y viajar, volver a viajar justo al llegar (con la música aún en su
// fundido de salida), cambiar de destino a mitad de un viaje (encadenar), cancelar un viaje y uno que cruza al sistema
// solar. La música es un AudioBufferSourceNode programado en el reloj maestro (js/util/relojMaestro.js) y el vuelo es
// función de ese reloj. Comprueba que:
//  · arranca UNA vez por viaje (al encadenar, un solo fundido cruzado), siempre entrando desde el silencio;
//  · ningún <audio> cambia de playbackRate ni salta de segundo mientras suena (cero cambios de ritmo, cero saltos);
//  · durante todo el viaje suena (cero cortes) y su segundo + lo que queda de viaje = su duración, cuadro a cuadro
//    (< 20 ms): lo que se ve va con lo que se oye;
//  · cada viaje aterriza al acabar su música: la llegada programada a ±20 ms del final y el cuadro de la llegada como mucho
//    un cuadro después;
//  · el desfase entre el reloj suavizado (lo que se ve) y el del audio (lo que se oye) < 20 ms en todo momento.
import { writeFileSync } from 'fs';
import { abrir } from './arnes.mjs';

const CPU = Number(process.env.CPU || 4);

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, process.env.PERFIL || 'iphone', { espera: 1500, musica: true });
  try {
    informe.comprobar(await pagina.evaluate(() => window.__bandaSonora.estado().pistas.viajes?.estado === 'lista'), 'la música de los viajes está descargada y decodificada');
    await pagina.evaluate(() => {
      const b = window.__bandaSonora, e = window.__galaxia.escena, reloj = window.__relojMaestro, R = window.__duvet = { arranques: [], ritmos: 0, saltos: [], muestras: [], cuadros: [] };
      const gViajes = () => b.estado().pistas.viajes.ganancia;
      // Cada voz de una canción con búfer: cuándo y desde qué segundo, y la ganancia de la pista 150 ms después de empezar a sonar.
      const S = AudioBufferSourceNode.prototype, start = S.start;
      S.start = function (cuando = 0, desde = 0) { const d = this.buffer?.duration || 0, ctx = this.context; if (Math.abs(d - 15) < 0.5) { const a = { t: performance.now(), cuando, desde: +desde.toFixed(3), adelanto: +(cuando - ctx.currentTime).toFixed(3) }; R.arranques.push(a); setTimeout(() => { a.g = gViajes(); }, Math.max(0, (cuando - ctx.currentTime) * 1000) + 150); } return start.call(this, cuando, desde); };
      // Ningún <audio> cambia de ritmo ni salta de segundo mientras suena.
      const P = HTMLMediaElement.prototype, dT = Object.getOwnPropertyDescriptor(P, 'currentTime'), dR = Object.getOwnPropertyDescriptor(P, 'playbackRate');
      Object.defineProperty(P, 'currentTime', { get: dT.get, set(v) { if (!this.paused) R.saltos.push({ de: +this.currentTime.toFixed(2), a: +(+v).toFixed(2) }); dT.set.call(this, v); } });
      Object.defineProperty(P, 'playbackRate', { get: dR.get, set(v) { if (v !== this.playbackRate) R.ritmos++; dR.set.call(this, v); } });
      // Cada cuadro: lo que lleva la música + lo que le queda al viaje (debe ser su duración), si suena, y el desfase.
      const f = () => { const v = e.viajando || e.restanteViaje > 0; if (v) R.cuadros.push({ t: performance.now(), tv: b.tiempo('viajes'), r: e.restanteViaje, s: b.suena('viajes'), o: b.objetivo, d: reloj.desfase(), dur: b.duracion('viajes') }); requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    const cdp = await pagina.context().newCDPSession(pagina);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    const caja = await (await pagina.$('#galaxia')).boundingBox();
    await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    const zoom = async () => { for (const s of [400, -400]) { for (let i = 0; i < 10; i++) { await pagina.mouse.wheel(0, s); await pagina.waitForTimeout(40); } await pagina.waitForTimeout(500); } };
    const ir = id => pagina.evaluate(id => { const i = window.__galaxia.interfaz; i.terminarEscena(); window.__viaje = i.visitar(id); }, id);
    const llegar = () => pagina.evaluate(() => window.__viaje);
    const tramos = [];   // [inicio, fin, nombre, desde] de cada viaje completo (desde: dónde empieza a contar la sincronía)
    const marca = () => pagina.evaluate(() => performance.now());
    const viaje = async (id, nombre) => { const t = await marca(); await ir(id); await llegar(); tramos.push([t, await marca(), nombre, t]); };
    // 1. Zoom atrás y adelante, y viajar.
    await zoom(); await viaje('cuasar', 'cuásar');
    // 2. Viajar justo al llegar (la música de los viajes aún suena en su fundido de salida), dos veces.
    await viaje('deneb', 'deneb justo al llegar');
    await pagina.waitForTimeout(200);
    await zoom(); await viaje('hogar', 'casa');
    // 3. Cambiar de destino a mitad del viaje (encadenar).
    await pagina.waitForTimeout(200);
    await ir('pulsar'); await pagina.waitForTimeout(4500); { const t = await marca(); await ir('ton618'); await llegar(); tramos.push([t, await marca(), 'encadenado', t + 600]); }
    // 4. Cancelar un viaje a mitad (la música se funde) y salir otra vez.
    await ir('sagitario'); await pagina.waitForTimeout(3000); await pagina.evaluate(() => window.__galaxia.escena.cancelarViaje()); await pagina.waitForTimeout(1200);
    await viaje('supernova', 'tras cancelar');
    // 5. Saltar el crucero (el botón «Saltar»): la llegada se adelanta y la música se recoloca con un solo fundido cruzado.
    { const t = await marca(); await ir('cuasar'); await pagina.waitForTimeout(4000); const ok = await pagina.evaluate(() => window.__galaxia.escena.saltarViaje()); await llegar(); tramos.push([t, await marca(), ok ? 'saltado' : 'sin saltar', t]); }
    // 6. Un viaje que cruza al sistema solar (dos tramos y un fundido), justo al llegar.
    await viaje('rosa', 'sistema solar');
    await pagina.waitForTimeout(2500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const R = await pagina.evaluate(() => window.__duvet), est = await pagina.evaluate(() => window.__bandaSonora.estado());

    informe.comprobar(R.ritmos === 0, 'cero cambios de playbackRate', R.ritmos);
    informe.comprobar(R.saltos.length === 0, 'cero saltos de segundo en un <audio> que suena', R.saltos.slice(0, 5));
    // Arranques: uno por viaje (6 viajes, más un fundido cruzado al encadenar y el viaje cancelado).
    const porTramo = tramos.map(([a, b, n]) => ({ n, voces: R.arranques.filter(x => x.t >= a - 50 && x.t <= b).length }));
    informe.comprobar(porTramo.every(x => x.voces === (x.n === 'saltado' ? 2 : 1)), 'la música de los viajes arranca UNA vez por viaje (al encadenar o saltar el crucero, un solo fundido cruzado)', porTramo);
    informe.comprobar(R.arranques.every(a => a.adelanto > 0.01), 'cada arranque está programado por delante del contexto (nada suena «ya»: sin chasquido)', R.arranques.map(a => a.adelanto));
    const cruces = tramos.filter(x => x[2] === 'encadenado' || x[2] === 'saltado'), frescos = R.arranques.filter(a => !cruces.some(c => a.t >= c[0] - 50 && a.t <= c[1]) || a === R.arranques.find(b => b.t >= cruces.at(-1)[0] - 50)).map(a => a.g);
    informe.comprobar(frescos.every(g => g === undefined || g < 0.35), 'cada vez que vuelve a sonar entra desde el silencio (también al viajar justo tras llegar)', frescos);
    // Sincronía cuadro a cuadro: desde 0,5 s de viaje hasta 0,1 s antes de llegar suena y segundo + restante = duración.
    const malas = [], calladas = [];
    let peor = 0;
    for (const [a, b, n, d] of tramos) for (const m of R.cuadros) {
      if (m.t < d + 500 || m.t > b - 150 || m.r < 0.15) continue;
      if (!m.s || m.o !== 'viajes') { calladas.push({ viaje: n, t: Math.round(m.t - a), o: m.o, r: +m.r.toFixed(2) }); continue; }
      const e = Math.abs(m.tv + m.r - m.dur) * 1000; peor = Math.max(peor, e); if (e > 20) malas.push({ viaje: n, ms: +e.toFixed(1) });
    }
    informe.comprobar(calladas.length === 0, 'durante todo el viaje suena la música de los viajes (cero cortes)', calladas.slice(0, 5));
    informe.comprobar(malas.length === 0, `y en cada cuadro su segundo + lo que queda de viaje = su duración (< 20 ms; peor ${peor.toFixed(1)} ms), con la CPU ×${CPU}`, malas.slice(0, 8));
    const desfase = Math.max(0, ...R.cuadros.filter(m => m.s).map(m => Math.abs(m.d)));
    informe.comprobar(desfase < 20, 'desfase audio↔imagen del reloj < 20 ms en todos los cuadros de los viajes', +desfase.toFixed(2));
    const at = est.aterrizajes;
    informe.comprobar(at.length >= 7 && at.every(x => Math.abs(x.programado) <= 20), 'cada viaje aterriza al acabar su música: llegada programada a ±20 ms del final', at);
    informe.comprobar(at.every(x => x.cuadro >= -20 && x.cuadro <= 60), 'y el cuadro de la llegada cae justo al acabar (como mucho un cuadro después)', at.map(x => x.cuadro));
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
    writeFileSync('.pruebas/musicaViajes.json', JSON.stringify({ cpu: CPU, aterrizajes: at, arranques: R.arranques, porTramo, peorSincroniaMs: +peor.toFixed(2), desfaseMaxMs: +desfase.toFixed(2), ritmos: R.ritmos, saltos: R.saltos.length }, null, 2));
  } finally { await navegador.close(); }
}
