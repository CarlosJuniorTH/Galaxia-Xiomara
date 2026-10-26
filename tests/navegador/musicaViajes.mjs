// La música de los viajes («Duvet», viajes.m4a, 15 s, hastaLlegar) con la canción de verdad, como en un iPhone y con la CPU
// ×4: alejar y acercar con la rueda y viajar, volver a viajar justo al llegar (con la música aún en su fundido de salida),
// cambiar de destino a mitad de un viaje (encadenar) y un viaje que cruza al sistema solar. Comprueba que:
//  · cada vez que vuelve a sonar entra desde el silencio (antes, al viajar justo tras llegar, arrancaba de golpe a media voz);
//  · nunca salta de segundo mientras se oye (al encadenar, antes saltaba en seco a plena voz): baja, salta y vuelve a subir;
//  · durante todo el viaje suena y su segundo + lo que queda de viaje = 15 (acaba justo al llegar).
import { abrir } from './arnes.mjs';

const CPU = Number(process.env.CPU || 4);

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, process.env.PERFIL || 'iphone', { espera: 1500, musica: true });
  try {
    informe.comprobar(await pagina.evaluate(() => window.__bandaSonora.estado().pistas.viajes?.estado === 'lista'), 'la música de los viajes está descargada y lista');
    await pagina.evaluate(() => {
      const b = window.__bandaSonora, e = window.__galaxia.escena, R = window.__duvet = { arranques: [], saltos: [], muestras: [] };
      const gViajes = () => b.estado().pistas.viajes.ganancia;
      const esViajes = el => Math.abs(el.duration - 15) < 0.5;
      const P = HTMLMediaElement.prototype, play = P.play, d = Object.getOwnPropertyDescriptor(P, 'currentTime');
      // Al arrancar: la ganancia 150 ms después (entrando desde el silencio con su fundido debe ser baja).
      P.play = function () { if (esViajes(this) && this.paused) { const t = performance.now(); setTimeout(() => R.arranques.push({ t, g: gViajes() }), 150); } return play.call(this); };
      // Un salto con la pista sonando: la ganancia en ese instante (debe estar en silencio).
      Object.defineProperty(P, 'currentTime', { get: d.get, set(v) { if (esViajes(this) && !this.paused) R.saltos.push({ t: performance.now(), de: +this.currentTime.toFixed(2), a: +(+v).toFixed(2), g: gViajes() }); d.set.call(this, v); } });
      const f = () => { const p = b.estado().pistas.viajes; R.muestras.push({ t: performance.now(), v: e.viajando || e.restanteViaje > 0, r: e.restanteViaje, tv: b.tiempo('viajes'), s: p.sonando, o: b.objetivo }); setTimeout(f, 100); };
      f();
    });
    const cdp = await pagina.context().newCDPSession(pagina);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    const caja = await (await pagina.$('#galaxia')).boundingBox();
    await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    const zoom = async () => { for (const s of [400, -400]) { for (let i = 0; i < 10; i++) { await pagina.mouse.wheel(0, s); await pagina.waitForTimeout(40); } await pagina.waitForTimeout(500); } };
    const ir = id => pagina.evaluate(id => { const i = window.__galaxia.interfaz; i.terminarEscena(); window.__viaje = i.visitar(id); }, id);
    const llegar = () => pagina.evaluate(() => window.__viaje);
    const tramos = [];   // [inicio, fin] de cada viaje completo (para la sincronía)
    const marca = () => pagina.evaluate(() => performance.now());
    // 1. Zoom atrás y adelante, y viajar.
    await zoom(); let t = await marca(); await ir('cuasar'); await llegar(); tramos.push([t, await marca()]);
    // 2. Viajar justo al llegar (la música de los viajes aún suena en su fundido de salida), dos veces.
    t = await marca(); await ir('deneb'); await llegar(); tramos.push([t, await marca()]);
    await pagina.waitForTimeout(200);
    await zoom(); t = await marca(); await ir('hogar'); await llegar(); tramos.push([t, await marca()]);
    // 3. Cambiar de destino a mitad del viaje (encadenar).
    await pagina.waitForTimeout(200);
    await ir('pulsar'); await pagina.waitForTimeout(4500); t = await marca(); await ir('ton618'); await llegar(); tramos.push([t + 1500, await marca()]);
    // 4. Un viaje que cruza al sistema solar (dos tramos y un fundido), justo al llegar.
    t = await marca(); await ir('rosa'); await llegar(); tramos.push([t, await marca()]);
    await pagina.waitForTimeout(2500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const R = await pagina.evaluate(() => window.__duvet);

    informe.comprobar(R.arranques.length >= 5 && R.arranques.every(a => a.g < 0.3), 'cada vez que vuelve a sonar entra desde el silencio (también al viajar justo tras llegar)', R.arranques.map(a => a.g));
    informe.comprobar(R.saltos.length >= 1 && R.saltos.every(s => s.g < 0.1), 'al encadenar viajes salta de segundo en silencio (baja, salta y vuelve a subir), nunca a plena voz', R.saltos);
    // Sincronía: en cada viaje, del segundo 2 hasta medio segundo antes de llegar, suena y segundo + restante = 15.
    const malas = [], calladas = [];
    for (const [a, b] of tramos) for (const m of R.muestras) {
      if (m.t < a + 2000 || m.t > b - 600 || !m.v || m.r < 0.6) continue;
      if (!m.s || m.o !== 'viajes') calladas.push({ t: Math.round(m.t - a), o: m.o }); else if (Math.abs(m.tv + m.r - 15) > 0.4) malas.push(+(m.tv + m.r).toFixed(2));
    }
    informe.comprobar(calladas.length === 0, 'durante todo el viaje suena la música de los viajes', calladas.slice(0, 5));
    informe.comprobar(malas.length === 0, 'y su segundo + lo que queda de viaje = 15 (acaba justo al llegar), con la CPU ×' + CPU, malas.slice(0, 8));
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
