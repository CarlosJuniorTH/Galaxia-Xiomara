// Rendimiento con condiciones explícitas (no sustituye la prueba en un teléfono físico).
// GPU: consulta de tiempo (EXT_disjoint_timer_query_webgl2) alrededor de composer.render, el dibujo
// completo del cuadro. CPU: el cuadro entero (actualización + envío). Percentiles de intervalo
// entre cuadros, llamadas de dibujo, puntos, triángulos, memoria estimada; coste por capa y fases
// de uso (casa, viaje, lectura con panel, reposo).
import { abrir, visitar } from './arnes.mjs';

async function instrumentar(pagina) {
  return pagina.evaluate(() => {
    const i = window.__galaxia.escena.interno, gl = i.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const M = window.__med = { gpu: [], cpu: [], dt: [], ext: !!ext, pend: [], ultimo: 0 };
    const composer = i.nucleo.composer, render = composer.render;
    composer.render = (...a) => {
      const q = ext && M.pend.length < 6 ? gl.createQuery() : null; if (q) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      const r = render(...a); if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); M.pend.push(q); }
      M.pend = M.pend.filter(p => { if (!gl.getQueryParameter(p, gl.QUERY_RESULT_AVAILABLE)) return true; if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) M.gpu.push(gl.getQueryParameter(p, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(p); return false; });
      const ahora = performance.now(); if (M.ultimo) M.dt.push(ahora - M.ultimo); M.ultimo = ahora; return r;
    };
    // CPU del cuadro completo: el tiempo que el propio bucle mide (canvas.dataset.cpuMs es una media);
    // aquí se toma por cuadro envolviendo requestAnimationFrame alrededor del callback que dibuja.
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => raf(t => { const n0 = M.dt.length, a = performance.now(); cb(t); if (M.dt.length > n0) M.cpu.push(performance.now() - a); });
    return !!ext;
  });
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2) : null; };
async function medir(pagina, segundos) {
  await pagina.evaluate(() => { const M = window.__med; M.gpu = []; M.cpu = []; M.dt = []; M.ultimo = 0; });
  await pagina.waitForTimeout(segundos * 1000);
  const r = await pagina.evaluate(() => new Promise(res => {
    const { renderer } = window.__galaxia.escena.interno; renderer.info.autoReset = false; renderer.info.reset();
    const M = window.__med, n = M.dt.length;
    const esperar = () => { if (M.dt.length > n) { const x = renderer.info.render; renderer.info.autoReset = true; res({ llamadas: x.calls, triangulos: x.triangles, puntos: x.points, M: { gpu: M.gpu, cpu: M.cpu, dt: M.dt } }); } else requestAnimationFrame(esperar); };
    // Si la escena no dibuja (lectura, página parada), no hay cuadro que esperar: se devuelve sin él.
    setTimeout(() => { renderer.info.autoReset = true; res({ llamadas: 0, triangulos: 0, puntos: 0, M: { gpu: M.gpu, cpu: M.cpu, dt: M.dt } }); }, 2500);
    window.__galaxia.escena.pedirCuadro(); requestAnimationFrame(esperar);
  }));
  const { gpu, cpu, dt } = r.M;
  return { cuadros: dt.length, fps: dt.length ? +(1000 / (dt.reduce((a, b) => a + b, 0) / dt.length)).toFixed(1) : 0, dt50: pct(dt, 0.5), dt95: pct(dt, 0.95), dt99: pct(dt, 0.99), cpu50: pct(cpu, 0.5), cpu95: pct(cpu, 0.95), gpu50: pct(gpu, 0.5), gpu95: pct(gpu, 0.95), llamadas: r.llamadas, puntos: r.puntos, triangulos: r.triangulos };
}
const memoria = pagina => pagina.evaluate(() => {
  const i = window.__galaxia.escena.interno, { THREE, scene, nucleo, renderer } = i, vistas = new Set(); let tex = 0, n = 0;
  const bytes = t => { const im = t.image; if (!im) return 0; const w = im.width || 0, h = im.height || 0, d = im.depth || 1; const b = t.type === THREE.FloatType ? 16 : t.type === THREE.HalfFloatType ? 8 : 4; return w * h * d * b * (t.generateMipmaps ? 1.33 : 1); };
  scene.traverse(o => { for (const m of [].concat(o.material || [])) { for (const v of Object.values(m)) if (v?.isTexture && !vistas.has(v)) { vistas.add(v); tex += bytes(v); n++; } for (const u of Object.values(m.uniforms || {})) if (u.value?.isTexture && !vistas.has(u.value)) { vistas.add(u.value); tex += bytes(u.value); n++; } } });
  let rt = 0, nrt = 0; const visto = new Set(); const buscar = (o, prof) => { if (!o || prof > 3 || visto.has(o)) return; visto.add(o); if (o.isWebGLRenderTarget) { nrt++; rt += o.width * o.height * (o.texture.type === THREE.HalfFloatType ? 8 : o.texture.type === THREE.FloatType ? 16 : 4) * (o.depthBuffer ? 1.5 : 1); return; } if (Array.isArray(o)) o.forEach(x => buscar(x, prof + 1)); else if (typeof o === 'object') for (const k of Object.keys(o)) { const v = o[k]; if (v && typeof v === 'object' && !v.isTexture && !v.isObject3D) buscar(v, prof + 1); } };
  buscar(nucleo.post, 0);
  let vertices = 0; scene.traverse(o => { if (o.geometry?.attributes?.position) vertices += o.geometry.attributes.position.count; });
  return { texturas: n, texturasMB: +(tex / 1048576).toFixed(1), destinosRender: nrt, destinosRenderMB: +(rt / 1048576).toFixed(1), verticesTotales: vertices, resolucion: `${i.renderer.domElement.width}x${i.renderer.domElement.height}`, uPR: nucleo.uPR.value };
});
const conmutar = (pagina, que, v) => pagina.evaluate(([que, v]) => {
  const i = window.__galaxia.escena.interno, s = i.scene;
  const cada = f => s.traverse(o => { if (f(o)) { o.userData.__v ??= o.visible; o.visible = v ? o.userData.__v : false; } });
  if (que === 'nebulosas') cada(o => o.userData.volumen3D);
  if (que === 'puntos') cada(o => o.isPoints);
  if (que === 'transparentes') cada(o => o.material && [].concat(o.material).some(m => m.transparent) && !o.isPoints && !o.userData.volumen3D);
  if (que === 'postprocesado') { const p = i.nucleo.post; if (p) p.passes.forEach((pass, k) => { if (k > 0) { pass.__e ??= pass.enabled; pass.enabled = v ? pass.__e : false; } }); }
  if (que === 'lotesGalaxias') cada(o => o.isPoints && o.userData.galaxia);
}, [que, v]);

export async function medirPerfil(base, perfil, { informe, largo = 0 }) {
  const { navegador, pagina, errores } = await abrir(base, perfil, { espera: 3000 });
  const filas = {};
  try {
    const hayGPU = await instrumentar(pagina);
    informe.nota(`${perfil}: consulta de tiempo de GPU ${hayGPU ? 'disponible' : 'NO disponible'} (Chromium sin ventana, GPU real con Vulkan; no es un móvil)`);
    informe.nota(`${perfil}: memoria ${JSON.stringify(await memoria(pagina))}`);
    filas.casa = await medir(pagina, 6);
    // Estrellas por galaxia, generadas al acercarse: solo existen las de galaxias que pueden verse con
    // detalle pronto (> 12 px) y ninguna de las que no; el resto del universo no tiene estrellas 3D.
    filas.lotes = await pagina.evaluate(() => { const { scene, camera, THREE } = window.__galaxia.escena.interno; let c = null; scene.traverse(o => { if (o.userData.campo) c = o.userData.campo; });
      camera.updateMatrixWorld(); const v = new THREE.Vector3(), f = c.focal.value;
      const px = g => { const z = -v.copy(g.pos).applyMatrix4(camera.matrixWorldInverse).z, d = g.pos.distanceTo(camera.position); return g.radio * f / Math.max(1, Math.min(d, z > 0 ? z : d)); };
      let incoherentes = 0, puntosActivos = 0;
      for (const g of c.lista) { if (g.estrellas) { puntosActivos += g.estrellas.geometry.attributes.position.count; if (px(g) < 12) incoherentes++; } else if (px(g) > 24) incoherentes++; }
      return { total: c.lista.length, activos: c.activas.size, puntosActivos, incoherentes }; });
    for (const capa of ['nebulosas', 'puntos', 'lotesGalaxias', 'transparentes', 'postprocesado']) { await conmutar(pagina, capa, false); filas[`casa sin ${capa}`] = await medir(pagina, 4); await conmutar(pagina, capa, true); }
    // Viaje largo (casa → TON 618), medido mientras dura.
    await pagina.evaluate(() => { window.__galaxia.interfaz.visitar('ton618'); }); await pagina.waitForTimeout(600);
    filas['viaje a TON 618'] = await medir(pagina, 6);
    await pagina.waitForFunction(() => !window.__galaxia.escena.viajando, null, { timeout: 150000 });
    filas['TON 618'] = await medir(pagina, 4);
    await visitar(pagina, 'supernova'); filas.supernova = await medir(pagina, 4);
    await visitar(pagina, 'hogar'); await pagina.waitForTimeout(1500);
    // Lectura: un panel abierto encima del universo.
    await pagina.click('[data-panel="cartas"]').catch(() => {}); await pagina.waitForTimeout(1500);
    filas['lectura (panel abierto)'] = await medir(pagina, 6);
    await pagina.evaluate(() => document.querySelector('#panel-universo')?.close?.()); await pagina.waitForTimeout(800);
    // Reposo: sin tocar nada (el planificador baja el ritmo).
    await pagina.waitForTimeout(20000); filas['reposo (tras 20 s sin tocar)'] = await medir(pagina, 8);
    for (let k = 0; k < largo; k++) filas[`casa, minuto ${k + 1}`] = await medir(pagina, 60);
    for (const [n, f] of Object.entries(filas)) informe.nota(`${perfil} · ${n.padEnd(30)} ${JSON.stringify(f)}`);
    informe.comprobar(errores.length === 0, `${perfil}: sin errores de consola`, errores.slice(0, 3));
    return filas;
  } finally { await navegador.close(); }
}

export default async function ({ base, informe }) {
  const pc = await medirPerfil(base, 'pc', { informe, largo: Number(process.env.MINUTOS || 0) });
  const movil = await medirPerfil(base, 'iphoneMax', { informe });
  // La consulta envuelve el dibujo completo y devuelve datos, pero su valor absoluto en Chromium sin
  // ventana no es fiable (no baja al quitar capas): se registra, no se interpreta.
  informe.comprobar(pc.casa.gpu50 !== null && pc.casa.gpu50 > 0, 'pc: la consulta de tiempo de GPU devuelve datos del cuadro completo (valor no fiable sin ventana)', { gpu50: pc.casa.gpu50 });
  informe.comprobar(pc.lotes.incoherentes === 0 && pc.lotes.activos < pc.lotes.total * 0.1, 'solo tienen estrellas 3D las galaxias que pueden verse con detalle (generadas al acercarse)', pc.lotes);
  informe.comprobar(movil['reposo (tras 20 s sin tocar)'].fps <= movil.casa.fps + 1, 'móvil emulado: en reposo no se dibuja más que en uso', { reposo: movil['reposo (tras 20 s sin tocar)'].fps, casa: movil.casa.fps });
}
