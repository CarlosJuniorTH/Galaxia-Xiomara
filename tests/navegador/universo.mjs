// El universo de 100 millones de años luz en la app real. Luz medida antes del brillo (búfer de coma
// flotante), aislando el objeto, con la cámara real del viaje.
//  · descubrimiento: una galaxia del camino pasa de luz no resuelta a estructura (imagen → estrellas)
//    sin saltos de luz, crece por la aproximación real y queda atrás; es el mismo objeto;
//  · nebulosas: existen antes de verse, se ven durante el viaje y tienen luz;
//  · estrellas locales: casi desaparecen en el espacio intergaláctico;
//  · Xiomara: identificable al «mirar hacia casa» desde TON 618 y el cuásar (sin moverla ni agrandarla);
//  · región de llegada y regreso por el mismo universo; continuidad de luz de la Vía Láctea.
import { SEMIEJES_CORAZON } from '../../js/data/escalaCosmica.js';
import { abrir, visitar } from './arnes.mjs';

// Luz integrada (y radio en pantalla) de un objeto aislado con la cámara actual.
async function luzAislada(pagina, cual) {
  return pagina.evaluate(async cual => {
    const i = window.__galaxia.escena.interno, { THREE, camera, renderer, scene, galaxia } = i;
    let campo = null, vl = null; scene.traverse(o => { if (o.userData.campo) campo = o.userData.campo; if (o.name?.startsWith('Vía Láctea')) vl = o; });
    let grupo, centro, radio, temporal = false;
    if (cual === 'xiomara') { grupo = galaxia.grupo; centro = new THREE.Vector3(); radio = 980; }
    else if (cual === 'viaLactea') { grupo = vl; centro = vl.position.clone(); radio = 1300; }
    else if (cual.startsWith('neb:')) { const n = i.lejanas.universo.nebulosas.find(n => n.id === cual.slice(4)); if (!n.malla) return { L: 0, px: 0, sinMalla: true }; grupo = n.malla; centro = n.pos.clone(); radio = n.r; }
    else { const g = campo.lista.find(g => g.id === cual); grupo = campo.soloGalaxia(g); centro = g.pos; radio = g.radio; temporal = true; }
    camera.updateMatrixWorld();
    const escena = new THREE.Scene(), padre = grupo.parent, mundo = grupo.matrixWorld.clone();
    escena.add(grupo); mundo.decompose(grupo.position, grupo.quaternion, grupo.scale); grupo.updateMatrixWorld(true);
    const W = innerWidth, H = innerHeight, rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType }), buf = new Float32Array(W * H * 4);
    renderer.setRenderTarget(rt); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(escena, camera); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); renderer.setRenderTarget(null);
    escena.remove(grupo); if (!temporal) { padre.add(grupo); const pm = padre.matrixWorld.clone().invert().multiply(mundo); pm.decompose(grupo.position, grupo.quaternion, grupo.scale); }
    rt.dispose();
    let L = 0; for (let k = 0; k < W * H; k++) L += 0.2126 * buf[k * 4] + 0.7152 * buf[k * 4 + 1] + 0.0722 * buf[k * 4 + 2];
    const f = H / (2 * Math.tan(camera.fov * Math.PI / 360)), z = -centro.clone().applyMatrix4(camera.matrixWorldInverse).z, p = centro.clone().project(camera);
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const d = centro.distanceTo(camera.position);
    return { L, px: radio * f / Math.max(1, z), pxDist: radio * f / Math.max(1, d), enVista: p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1, angulo: centro.clone().sub(camera.position).angleTo(dir) * 180 / Math.PI, pos: centro.toArray() };
  }, cual);
}
// Instantes del vuelo en curso en que el objeto alcanza cada radio en pantalla (con el plan real).
const instantes = (pagina, id, radios) => pagina.evaluate(({ id, radios }) => {
  const i = window.__galaxia.escena.interno, plan = i.curvaVuelo.plan, u = i.lejanas.universo, o = u.galaxias.find(g => g.id === id) ?? u.nebulosas.find(n => n.id === id), r = o.radio ?? o.r;
  const f = innerHeight / (2 * Math.tan(60 * Math.PI / 360)), res = [];
  let k = 0, maxPx = 0, tMax = 0;
  for (let t = 0; t <= plan.duracion; t += 0.02) { const e = plan.evaluar(t), px = r / e.pos.distanceTo(o.pos) * f; if (px > maxPx) { maxPx = px; tMax = t; } while (k < radios.length && px >= radios[k]) { res.push({ t, px: radios[k] }); k++; } }
  return { res, tMax, maxPx, duracion: plan.duracion };
}, { id, radios });
async function enInstante(pagina, t) {
  await pagina.waitForFunction(t => { const c = window.__galaxia.escena.interno.curvaVuelo; return !c || c.transcurrido >= t; }, t, { timeout: 90000, polling: 8 });
  await pagina.evaluate(() => window.__galaxia.escena.interno.lento(0)); await pagina.waitForTimeout(120);
}
const seguir = pagina => pagina.evaluate(() => window.__galaxia.escena.interno.lento(1));

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc');
  try {
    await pagina.evaluate(() => window.__galaxia.escena.recordarSupernova());
    if (await pagina.evaluate(() => window.__galaxia.escena.destino) !== 'hogar') await visitar(pagina, 'hogar');
    await pagina.waitForTimeout(800);
    const locCasa = await pagina.evaluate(() => +document.getElementById('galaxia').dataset.estrellasLocales);
    const antes = await pagina.evaluate(() => window.__galaxia.escena.interno.lejanas.universo.galaxias.map(g => [g.id, ...g.pos.toArray()]));
    // ── Viaje a la supernova: descubrimiento de una galaxia del paisaje, una nebulosa del camino y estrellas locales ──
    await pagina.evaluate(() => { window.__galaxia.interfaz.visitar('supernova'); });
    await pagina.waitForFunction(() => window.__galaxia.escena.interno.curvaVuelo?.plan, null, { timeout: 20000 });
    const faro = await instantes(pagina, 'supernova-nebulosa-4', [0.5, 1.5, 3, 8, 20]);
    const dorada = await instantes(pagina, 'supernova-paisaje-37', [0, 2, 3.5, 8, 20, 40, 70]);
    // Todas las mediciones en orden temporal sobre el mismo vuelo (la Gran Barrada ya se ve desde casa
    // como luz no resuelta, ~1,3 px; la nebulosa del Faro llega antes de su máximo).
    const tNeb = faro.res.find(x => x.px === 1.5)?.t ?? 0, tareas = [];
    tareas.push({ t: tNeb + 0.1, hacer: async () => { existe = await pagina.evaluate(() => !!window.__galaxia.escena.interno.lejanas.universo.nebulosas.find(n => n.id === 'supernova-nebulosa-4').malla); } });
    tareas.push({ t: faro.tMax - 0.4, hacer: async () => { neb = await luzAislada(pagina, 'neb:supernova-nebulosa-4'); opNeb = await pagina.evaluate(() => window.__galaxia.escena.interno.lejanas.universo.nebulosas.find(n => n.id === 'supernova-nebulosa-4').malla?.material.uniforms.uOpacidad.value ?? 0); loc = await pagina.evaluate(() => +document.getElementById('galaxia').dataset.estrellasLocales); } });
    const serie = [];
    for (const x of dorada.res) tareas.push({ t: Math.max(x.t, 2.5), hacer: async () => { serie.push({ objetivo: x.px, ...(await luzAislada(pagina, 'supernova-paisaje-37')) }); } });
    let existe = false, neb = null, opNeb = 0, loc = 1;
    for (const tarea of tareas.sort((a, b) => a.t - b.t)) { await enInstante(pagina, tarea.t); await tarea.hacer(); await seguir(pagina); }
    informe.comprobar(existe, 'la nebulosa existe antes de verse (se crea a ~1 px, no delante de la cámara)');
    informe.comprobar(neb.px > 30 && opNeb > 0.9 && neb.L / (neb.px * neb.px) > 0.01, 'una nebulosa del camino se ve durante el viaje, con volumen y luz', { radioPx: +neb.px.toFixed(0), opacidad: +opNeb.toFixed(2), luzPorArea: +(neb.L / Math.max(1, neb.px * neb.px)).toFixed(3) });
    informe.comprobar(locCasa > 0.95 && loc < 0.05, 'las estrellas locales de casa casi desaparecen en el espacio intergaláctico', { casa: locCasa, enElViaje: loc });
    await enInstante(pagina, Math.min(dorada.duracion - 1, dorada.tMax + 6)); const despues = await luzAislada(pagina, 'supernova-paisaje-37'); await seguir(pagina);
    informe.nota('Galaxia del paisaje (radio px · luz/px² · en vista) → ' + serie.map(s => `${s.px.toFixed(1)} · ${(s.L / Math.max(1e-6, s.px * s.px)).toFixed(3)} · ${s.enVista ? 'sí' : 'no'}`).join(' | '));
    const sb = serie.filter(s => s.px >= 1.5 && s.enVista).map(s => s.L / (s.px * s.px)), saltos = sb.slice(1).map((v, k) => Math.abs(Math.log(v / sb[k])));
    const crece = serie.every((s, k) => k === 0 || s.pxDist >= serie[k - 1].pxDist * 0.98);
    informe.comprobar(crece && serie[serie.length - 1].px > 60 && serie[0].px < 1.5, 'descubrimiento: de luz no resuelta (< 1,5 px) a estructura (> 60 px) por la aproximación real', { inicio: +serie[0].px.toFixed(2), fin: +serie[serie.length - 1].px.toFixed(0) });
    informe.comprobar(Math.max(...saltos) < Math.log(1.35), 'descubrimiento: su luz por área no salta entre luz, imagen y estrellas (misma galaxia)', { mayorSalto: +(Math.exp(Math.max(...saltos)) - 1).toFixed(2) });
    informe.comprobar(serie.every(s => s.pos.join() === serie[0].pos.join()), 'descubrimiento: la misma posición en todas sus representaciones');
    informe.comprobar(despues.angulo > 90, 'la galaxia pasa de lado y queda atrás', { anguloFinal: +despues.angulo.toFixed(0) });
    await pagina.waitForFunction(() => !window.__galaxia.escena.viajando, null, { timeout: 120000 });
    // Región de llegada: galaxias remotas a la vista, ninguna sobre el corazón.
    const llegada = await pagina.evaluate(SEMI => { const i = window.__galaxia.escena.interno, f = innerHeight / (2 * Math.tan(i.camera.fov * Math.PI / 360)), S = i.cosmos.supernova.grupo.getWorldPosition(new i.THREE.Vector3());
      const semi = Math.atan(SEMI / S.distanceTo(i.camera.position)), haciaS = S.clone().sub(i.camera.position);
      let remotas = 0, sobre = 0; for (const g of i.lejanas.universo.galaxias) { const p = g.pos.clone().project(i.camera), v = g.pos.clone().sub(i.camera.position), px = g.radio / v.length() * f; if (p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && px > 0.6) { remotas++; if (px > 4 && v.angleTo(haciaS) - Math.atan(g.radio / v.length()) < semi * 1.1) sobre++; } }
      return { remotas, sobre, mal: +(i.camera.position.length() * 51 / 1e6).toFixed(1) }; }, SEMIEJES_CORAZON[0]);
    informe.comprobar(llegada.remotas >= 3 && llegada.sobre === 0, 'al llegar: galaxias remotas a la vista y nada sobre el corazón', llegada);
    // «Mirar hacia casa» desde la supernova, TON 618 y el cuásar.
    for (const id of ['supernova', 'ton618', 'cuasar']) {
      if (id !== 'supernova') { await pagina.evaluate(() => window.__galaxia.escena.interno.lento(4)); await visitar(pagina, id); await pagina.evaluate(() => window.__galaxia.escena.interno.lento(1)); await pagina.waitForTimeout(1500); }
      const antesCam = await pagina.evaluate(() => window.__galaxia.escena.interno.camera.position.toArray());
      await pagina.evaluate(() => window.__galaxia.escena.mirarCasa(true)); await pagina.waitForTimeout(2400);
      const m = await pagina.evaluate(() => { const i = window.__galaxia.escena.interno, p = new i.THREE.Vector3().project(i.camera), f = innerHeight / (2 * Math.tan(i.camera.fov * Math.PI / 360));
        return { fov: i.camera.fov, x: (p.x + 1) / 2 / 1, y: (1 - p.y) / 2, radioRel: 980 / i.camera.position.length() * f / innerHeight, cam: i.camera.position.toArray(), escala: i.galaxia.grupo.scale.x, marca: document.getElementById('marca-casa').classList.contains('activa') }; });
      const xio = await luzAislada(pagina, 'xiomara');
      await pagina.evaluate(() => window.__galaxia.escena.mirarCasa(false)); await pagina.waitForTimeout(2200);
      const fovFin = await pagina.evaluate(() => window.__galaxia.escena.interno.camera.fov);
      const quieta = m.cam.every((v, k) => Math.abs(v - antesCam[k]) < 1e-3);
      informe.comprobar(Math.abs(m.x - 0.5) < 0.05 && Math.abs(m.y - 0.5) < 0.05 && m.radioRel > 0.18 && m.radioRel < 0.26 && m.marca && xio.L > 0, `mirar hacia casa desde ${id}: Xiomara centrada, ~22 % del alto, identificada y con luz`, { radio: +m.radioRel.toFixed(3), fov: +m.fov.toFixed(3) });
      informe.comprobar(quieta && Math.abs(m.escala - 1) < 1e-9 && Math.abs(fovFin - 60) < 0.01, `mirar hacia casa desde ${id}: ni la cámara ni Xiomara se mueven ni cambian de tamaño; al volver, todo igual`, { quieta, escala: m.escala, fovFinal: +fovFin.toFixed(2) });
    }
    // Regreso por el mismo universo.
    await pagina.evaluate(() => window.__galaxia.escena.interno.lento(4)); await visitar(pagina, 'hogar'); await pagina.evaluate(() => window.__galaxia.escena.interno.lento(1)); await pagina.waitForTimeout(800);
    const despuesU = await pagina.evaluate(() => window.__galaxia.escena.interno.lejanas.universo.galaxias.map(g => [g.id, ...g.pos.toArray()]));
    informe.comprobar(antes.length === despuesU.length && antes.every((a, k) => a[0] === despuesU[k][0] && a.slice(1).every((v, j) => Math.abs(v - despuesU[k][j + 1]) < 1e-6)), 'al volver, el universo es el mismo (ninguna galaxia se crea, mueve ni recoloca)', { galaxias: antes.length });
    // ── Vía Láctea: luz continua de luz no resuelta a galaxia resuelta ──
    const vl = [];
    for (const px of [1, 2, 3, 5, 10, 25, 60, 150, 400]) {
      await pagina.evaluate(px => { const e = window.__galaxia.escena, { camera, controls, scene, THREE } = e.interno; e.pausar(true); e.interno.lento(0); controls.enabled = false; let v = null; scene.traverse(o => { if (o.name?.startsWith('Vía Láctea')) v = o; });
        const n = new THREE.Vector3(0, 1, 0).applyQuaternion(v.quaternion), f = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)), d = 1300 * f / px;
        camera.position.copy(v.position).addScaledVector(n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.4).normalize(), d); camera.lookAt(v.position); controls.target.copy(v.position); camera.updateMatrixWorld(); e.pedirCuadro(); }, px);
      await pagina.waitForTimeout(300); vl.push({ px, ...(await luzAislada(pagina, 'viaLactea')) });
    }
    informe.nota('Vía Láctea: radio px → luz/px² ' + vl.map(m => `${m.px}: ${(m.L / (m.px * m.px)).toFixed(3)}`).join(' · '));
    const sv = vl.map(m => m.L / (m.px * m.px)), sal = sv.slice(1).map((v, k) => Math.abs(Math.log(v / sv[k])));
    informe.comprobar(Math.max(...sal) < Math.log(1.6), 'Vía Láctea: su luz por área es continua entre representaciones (sin saltos > 60 % por paso)', { mayorSalto: +(Math.exp(Math.max(...sal)) - 1).toFixed(2) });
    informe.comprobar(errores.length === 0, 'sin errores de consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
