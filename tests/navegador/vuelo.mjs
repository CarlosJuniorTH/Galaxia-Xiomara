// Vuelo por fases en la app real (A selección, B maniobra, C alineación, D ruptura, E crucero,
// F aproximación, G llegada): posiciones de cámara registradas cuadro a cuadro. Los viajes van a ×3
// de tiempo (escalaTiempo de diagnóstico) salvo el de referencia, que se mide en tiempo real.
import { abrir, visitar, esperarLlegada } from './arnes.mjs';

const ORDEN = ['seleccion', 'maniobra', 'alineacion', 'ruptura', 'crucero', 'aproximacion', 'llegada'];
const MANIOBRA = ['seleccion', 'maniobra', 'alineacion'];
async function registrar(pagina, destino, { durante } = {}) {
  await pagina.evaluate(() => { const i = window.__galaxia.escena.interno, c = document.getElementById('galaxia'); window.__reg = []; window.__grabar = true;
    const f = () => { if (!window.__grabar) return; const v = i.curvaVuelo; if (c.dataset.fase) window.__reg.push({ fase: c.dataset.fase, t: i.curvaVuelo?.real ?? null, pos: i.camera.position.toArray(), mira: i.controls.target.toArray(), fov: i.camera.fov, estelas: i.estelas, recta: v ? null : null }); requestAnimationFrame(f); }; f(); });
  await pagina.evaluate(d => { window.__galaxia.interfaz.visitar(d); }, destino);
  if (durante) await durante();
  await esperarLlegada(pagina, 150000); await pagina.waitForTimeout(400);
  return pagina.evaluate(() => { window.__grabar = false; const i = window.__galaxia.escena.interno; return { reg: window.__reg, fin: i.camera.position.toArray(), fov: i.camera.fov, marca: document.getElementById('marca-destino').classList.contains('activa') }; });
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], n = a => Math.hypot(...a), nor = a => { const l = n(a) || 1; return a.map(x => x / l); };
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, nor(a).reduce((s, x, k) => s + x * nor(b)[k], 0)))) * 180 / Math.PI;

function analizar(informe, nombre, r) {
  const fases = [...new Set(r.reg.map(x => x.fase))];
  let orden = true, ultima = 0; for (const x of r.reg) { const k = ORDEN.indexOf(x.fase); if (k < ultima) orden = false; ultima = Math.max(ultima, k); }
  informe.comprobar(orden && ['ruptura', 'crucero', 'aproximacion', 'llegada'].every(f => fases.includes(f)), `${nombre}: fases en orden`, fases);
  const crucero = r.reg.filter(x => x.fase === 'crucero');
  if (crucero.length > 4) {
    const a = crucero[0].pos, b = crucero[crucero.length - 1].pos, L = n(sub(b, a)), d = nor(sub(b, a));
    const fuera = Math.max(...crucero.map(x => { const v = sub(x.pos, a), t = v.reduce((s, c, k) => s + c * d[k], 0); return n(sub(v, d.map(c => c * t))); }));
    informe.comprobar(fuera < L * 0.002 + 1, `${nombre}: crucero rectilíneo en coordenadas del universo`, { desviacionMax: +fuera.toFixed(1), largo: Math.round(L) });
    // El avance (punto de fuga de las estelas) es la recta; la mirada se inclina como mucho 20° hacia lo que se cruza.
    let peor = 0, peorAvance = 0; for (let k = 1; k < crucero.length; k++) { const av = sub(crucero[k].pos, crucero[k - 1].pos); if (n(av) > 2) { peor = Math.max(peor, ang(av, sub(crucero[k].mira, crucero[k].pos))); peorAvance = Math.max(peorAvance, ang(av, d)); } }
    informe.comprobar(peorAvance < 0.5 && peor < 20.5, `${nombre}: el avance sigue el corredor y la mirada no se aparta más de 20°`, { avanceMax: +peorAvance.toFixed(2), miradaMax: +peor.toFixed(2) });
    const r0 = r.reg.find(x => x.fase === 'ruptura');
    informe.comprobar(r0 && ang(sub(r0.mira, r0.pos), d) < 1.5, `${nombre}: alineado con el corredor al romper`, { grados: r0 ? +ang(sub(r0.mira, r0.pos), d).toFixed(2) : null });
    informe.comprobar(crucero.length >= 90, `${nombre}: el crucero dura (${crucero.length} cuadros), no ocurre en dos fotogramas`);
  }
  const maniobra = r.reg.filter(x => MANIOBRA.includes(x.fase));
  informe.comprobar(maniobra.every(x => x.estelas < 0.12), `${nombre}: sin estelas intensas mientras maniobra`, { max: maniobra.length ? +Math.max(...maniobra.map(x => x.estelas)).toFixed(3) : 0 });
  // Las estelas acompañan el crucero sin taparlo (más tenues que en la ruptura).
  const enCrucero = r.reg.filter(x => x.fase === 'crucero').map(x => x.estelas), enRuptura = r.reg.filter(x => x.fase === 'ruptura').map(x => x.estelas);
  informe.comprobar(Math.max(...enCrucero, 0) > 0.25 && Math.max(...enCrucero, 0) <= Math.max(...enRuptura, 0) + 0.05, `${nombre}: estelas presentes en el crucero y más tenues que en la ruptura`, { crucero: +Math.max(...enCrucero, 0).toFixed(2), ruptura: +Math.max(...enRuptura, 0).toFixed(2) });
  informe.comprobar(Math.abs(r.fov - 60) < 0.01 && !r.marca, `${nombre}: al llegar, campo de visión y señal restaurados`, { fov: r.fov, marca: r.marca });
}

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc');
  try {
    await pagina.evaluate(() => window.__galaxia.escena.recordarSupernova());
    if (await pagina.evaluate(() => window.__galaxia.escena.destino) !== 'hogar') await visitar(pagina, 'hogar');
    // Viaje de referencia en tiempo real: duración y regiones atravesadas.
    {
      const t0 = Date.now(), regiones = new Set(), encuentros = new Set();
      const r = await registrar(pagina, 'supernova', { durante: async () => { for (let k = 0; k < 140; k++) { const x = await pagina.evaluate(() => { const c = document.getElementById('galaxia'); return { r: c.dataset.region, e: c.dataset.encuentro, v: !!c.dataset.viaje }; }); if (x.r) regiones.add(x.r); if (x.e) encuentros.add(x.e); if (!x.v) break; await pagina.waitForTimeout(400); } } });
      const s = (Date.now() - t0) / 1000;
      informe.comprobar(s >= 9 && s <= 22, `casa → supernova en tiempo real: ${s.toFixed(0)} s (más rápido que la luz: referencia 12–16 s)`, { segundos: +s.toFixed(1) });
      informe.comprobar(regiones.size >= 4, 'el viaje atraviesa varias regiones, hasta el universo de la supernova', { regiones: [...regiones] });
      analizar(informe, 'hogar → supernova (tiempo real)', r);
    }
    await pagina.evaluate(() => window.__galaxia.escena.interno.lento(3));
    // Rutas en ambos sentidos (posiciones reales cuadro a cuadro), a ×3.
    for (const [a, b] of [['supernova', 'hogar'], ['hogar', 'ton618'], ['ton618', 'supernova'], ['supernova', 'ton618'], ['ton618', 'hogar'], ['hogar', 'cuasar'], ['cuasar', 'hogar']]) {
      if (await pagina.evaluate(() => window.__galaxia.escena.destino) !== a) await visitar(pagina, a);
      await pagina.waitForTimeout(600);
      analizar(informe, `${a} → ${b}`, await registrar(pagina, b));
    }
    // Saltar el viaje y modalidad breve.
    {
      await visitar(pagina, 'hogar'); await pagina.waitForTimeout(400);
      await pagina.evaluate(() => window.__galaxia.escena.interno.lento(1));
      let tSalto = 0;
      const r = await registrar(pagina, 'supernova', { durante: async () => {
        await pagina.waitForFunction(() => document.getElementById('galaxia').dataset.fase === 'crucero', null, { timeout: 30000, polling: 16 });
        await pagina.waitForTimeout(2200); tSalto = Date.now();
        await pagina.evaluate(() => document.querySelector('#viaje-visual .viaje-saltar').click());
      } });
      const tras = (Date.now() - tSalto) / 1000, fases = [...new Set(r.reg.map(x => x.fase))];
      // Sin tirones: la aceleración (cambio de desplazamiento entre cuadros) no cambia de golpe.
      // Con el tiempo del vuelo de cada cuadro (no el número de cuadro: su duración varía): velocidad real,
      // suavizada en 3 cuadros, y su cambio. Se mide desde el salto hasta la llegada.
      const desdeSalto = r.reg.filter(x => x.t !== null && ['crucero', 'aproximacion', 'llegada'].includes(x.fase));
      const vel = []; for (let k = 1; k < desdeSalto.length; k++) { const dt = desdeSalto[k].t - desdeSalto[k - 1].t; if (dt > 1e-4) vel.push({ t: desdeSalto[k].t, v: n(sub(desdeSalto[k].pos, desdeSalto[k - 1].pos)) / dt }); }
      const suave = vel.map((x, k) => ({ t: x.t, v: (vel[Math.max(0, k - 1)].v + x.v + vel[Math.min(vel.length - 1, k + 1)].v) / 3 }));
      const acel = suave.slice(1).map((x, k) => (x.v - suave[k].v) / Math.max(1e-3, x.t - suave[k].t)), maxA = Math.max(...acel.map(Math.abs));
      const maxPaso = Math.max(...acel.slice(1).map((x, k) => Math.abs(x - acel[k]))) / Math.max(1, maxA);
      informe.comprobar(tras < 14 && fases.includes('aproximacion') && fases.includes('llegada'), `saltar el viaje: se llega en ${tras.toFixed(1)} s con la aproximación normal`, { fases });
      informe.comprobar(maxPaso < 0.5, 'saltar no da tirones (la aceleración no cambia de golpe entre cuadros)', { tironRelativo: +maxPaso.toFixed(2) });
      await visitar(pagina, 'hogar'); await pagina.waitForTimeout(400);
      await pagina.evaluate(() => { window.__galaxia.escena.viajeBreve = true; });
      const t1 = Date.now(); await registrar(pagina, 'supernova'); const breve = (Date.now() - t1) / 1000;
      await pagina.evaluate(() => { window.__galaxia.escena.viajeBreve = false; });
      informe.comprobar(breve < 32, `modalidad breve: casa → supernova en ${breve.toFixed(0)} s`, { segundos: +breve.toFixed(1) });
      await pagina.evaluate(() => window.__galaxia.escena.interno.lento(3));
    }
    // Salida segura desde órbitas distintas de casa (girada y elevada): no atraviesa Xiomara ni planetas.
    for (const [nombre, giro, alto] of [['órbita girada 120°', 2.1, 0], ['órbita baja, casi en el plano', 0.8, -0.35], ['órbita alta', -1.2, 0.6]]) {
      await visitar(pagina, 'hogar'); await pagina.waitForTimeout(500);
      await pagina.evaluate(([g, h]) => { const { camera, controls, THREE } = window.__galaxia.escena.interno; const v = camera.position.clone().sub(controls.target); v.applyAxisAngle(new THREE.Vector3(0, 1, 0), g); v.y += v.length() * h; camera.position.copy(controls.target).add(v); camera.lookAt(controls.target); controls.update(); }, [giro, alto]);
      const r = await registrar(pagina, 'supernova');
      const salida = r.reg.filter(x => MANIOBRA.includes(x.fase)), d0 = n(r.reg[0].pos);
      const minimo = Math.min(...r.reg.map(x => n(x.pos)));
      informe.comprobar(minimo >= Math.min(d0, 1600) * 0.95 - 1, `${nombre}: la salida no se adentra en Xiomara`, { inicio: Math.round(d0), minimo: Math.round(minimo), maniobra: salida.length });
    }
    // Cancelación en cada fase: cambiar a otro destino a mitad; se llega bien y no queda nada atascado.
    for (const fase of ORDEN) {
      await visitar(pagina, 'hogar'); await pagina.waitForTimeout(500);
      let presente = false;
      const r = await registrar(pagina, 'supernova', { durante: async () => {
        // Espera a la fase; si el vuelo la deja atrás sin pasar por ella (p. ej. sin maniobra), no se cancela.
        const estado = await pagina.waitForFunction(([f, orden]) => { const c = document.getElementById('galaxia'), x = c.dataset.fase; if (x === f) return 'si'; if (!c.dataset.viaje || orden.indexOf(x) > orden.indexOf(f)) return 'no'; return false; }, [fase, ORDEN], { timeout: 60000, polling: 8 }).then(h => h.jsonValue()).catch(() => 'no');
        presente = estado === 'si';
        if (presente) await pagina.evaluate(() => { window.__galaxia.interfaz.visitar('ton618'); });
      } });
      if (!presente) { informe.nota(`cancelar durante «${fase}»: este vuelo no tuvo esa fase (corredor libre desde casa)`); continue; }
      const llegoTon = await pagina.evaluate(() => window.__galaxia.escena.destino === 'ton618');
      informe.comprobar(llegoTon && Math.abs(r.fov - 60) < 0.01 && !r.marca, `cancelar durante «${fase}» y cambiar a TON 618: llega y no queda nada atascado`, { destino: llegoTon, fov: +r.fov.toFixed(2), marca: r.marca });
    }
    // Giro de pantalla en cada fase del viaje al corazón: al llegar, el corazón cabe entero.
    for (const fase of ['alineacion', 'ruptura', 'crucero', 'aproximacion', 'llegada']) {
      await pagina.setViewportSize({ width: 900, height: 430 }); await visitar(pagina, 'hogar'); await pagina.waitForTimeout(500);
      await registrar(pagina, 'supernova', { durante: async () => {
        await pagina.waitForFunction(f => document.getElementById('galaxia').dataset.fase === f, fase, { timeout: 60000, polling: 8 }).catch(() => {});
        await pagina.setViewportSize({ width: 430, height: 775 });
      } });
      await pagina.waitForFunction(() => !window.__galaxia.escena.interno.encuadre.ajustando, null, { timeout: 8000 }).catch(() => {}); await pagina.waitForTimeout(400);
      const c = await pagina.evaluate(() => { const { THREE, camera, cosmos } = window.__galaxia.escena.interno, sn = cosmos.supernova, b = sn.cajaCorazon, z = (b.min.z + b.max.z) / 2; let mn = 1e9, mx = -1e9;
        for (const [x, y] of [[b.min.x, b.min.y], [b.max.x, b.max.y], [b.min.x, b.max.y], [b.max.x, b.min.y]]) { const p = sn.corazon.localToWorld(new THREE.Vector3(x, y, z)).project(camera); const px = (p.x + 1) / 2 * innerWidth; mn = Math.min(mn, px); mx = Math.max(mx, px); } return { mn: Math.round(mn), mx: Math.round(mx), W: innerWidth }; });
      informe.comprobar(c.mn >= -4 && c.mx <= c.W + 4 && c.mx - c.mn > c.W * 0.45, `girar a vertical durante «${fase}»: el corazón cabe al llegar`, c);
      await pagina.setViewportSize({ width: 1440, height: 900 });
    }
    informe.comprobar(errores.length === 0, 'sin errores de consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
