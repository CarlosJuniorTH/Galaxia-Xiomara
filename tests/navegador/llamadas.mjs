// Llamadas de dibujo, triángulos, puntos y tiempo de GPU por lugar (casa, cada gigante, el sistema solar), en el PC y en el
// móvil emulado (iphoneMax), con una captura de cada lugar en la misma pose para comparar antes/después.
// Se cuenta TODO el cuadro (capas a menor resolución, escena y pasadas): renderer.info sin reinicio automático entre el
// principio y el final del callback de requestAnimationFrame que dibuja. Desglose de la escena por objeto (capa y nombre).
// Objetivo del encargo (móvil): < 150 llamadas en casa y < 250 en el peor gigante.
// ETIQUETA=antes|despues guarda .pruebas/llamadas-<etiqueta>.json y las capturas en .pruebas/capturas/llamadas/<etiqueta>/.
// LUGARES=hogar,ton618 limita los lugares; PERFILES=pc,iphoneMax los perfiles.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { abrir, visitar } from './arnes.mjs';

const LUGARES = (process.env.LUGARES || 'hogar,deneb,pulsar,cuasar,ton618,sagitario,rosa,gigante,supernova').split(',');
const PERFILES = (process.env.PERFILES || 'pc,iphoneMax').split(',');
const ETIQUETA = process.env.ETIQUETA || 'ultima';
// Poses de cámara de una medida anterior (POSES=antes lee .pruebas/llamadas-poses-antes.json): mismas capturas.
const POSES = process.env.POSES && existsSync(`.pruebas/llamadas-poses-${process.env.POSES}.json`) ? JSON.parse(readFileSync(`.pruebas/llamadas-poses-${process.env.POSES}.json`, 'utf8')) : {};
const poses = {};

async function instrumentar(pagina) {
  return pagina.evaluate(() => {
    const i = window.__galaxia.escena.interno, { renderer, scene } = i, gl = renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const M = window.__ll = { cuadros: [], gpu: [], pend: [], desglose: null, pedirDesglose: 0, porLlamada: [], gpuLlamada: {}, cuadrosDesglose: 0 };
    renderer.info.autoReset = false;
    // Desglose: qué objeto produce cada llamada (solo en el cuadro en que se pide).
    const rbd = renderer.renderBufferDirect.bind(renderer);
    const capaDe = o => { let x = o; while (x) { if (x.userData?.capa) return x.userData.capa; if (x.name && x.parent === scene) return x.name; x = x.parent; } return '?'; };
    renderer.renderBufferDirect = (cam, esc, geo, mat, obj, grupo) => {
      if (M.desglose) {
        const pasada = !obj.parent;
        const clave = pasada ? 'pasada ' + (mat.name || mat.type) : `${capaDe(obj)} · ${obj.name || obj.type}${obj.isPoints ? ' (puntos)' : obj.isSprite ? ' (sprite)' : ''} · ${mat.blending === 2 ? 'aditivo' : mat.transparent ? 'transparente' : 'opaco'}`;
        M.desglose[clave] = (M.desglose[clave] || 0) + 1;
        // Tiempo de GPU de cada llamada (consulta propia; sin la del cuadro entero, que no se pueden anidar).
        if (ext) { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); const r = rbd(cam, esc, geo, mat, obj, grupo); gl.endQuery(ext.TIME_ELAPSED_EXT); M.porLlamada.push([clave, q]); return r; }
      }
      return rbd(cam, esc, geo, mat, obj, grupo);
    };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => raf(t => {
      renderer.info.reset(); const desglosar = M.pedirDesglose > 0; if (desglosar) { M.desglose = {}; M.pedirDesglose--; M.cuadrosDesglose++; }
      M.porLlamada = M.porLlamada.filter(([k, p]) => { if (!gl.getQueryParameter(p, gl.QUERY_RESULT_AVAILABLE)) return true; M.gpuLlamada[k] = (M.gpuLlamada[k] || 0) + gl.getQueryParameter(p, gl.QUERY_RESULT) / 1e6; gl.deleteQuery(p); return false; });
      const q = ext && !desglosar && M.pend.length < 6 ? gl.createQuery() : null; if (q) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      cb(t);
      if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); M.pend.push(q); }
      M.pend = M.pend.filter(p => { if (!gl.getQueryParameter(p, gl.QUERY_RESULT_AVAILABLE)) return true; if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) M.gpu.push(gl.getQueryParameter(p, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(p); return false; });
      const r = renderer.info.render;
      if (r.calls) M.cuadros.push([r.calls, r.triangles, r.points]);
      if (desglosar) { M.ultimoDesglose = M.desglose; M.desglose = null; }
    });
    return !!ext;
  });
}
const mediana = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
async function medir(pagina, segundos) {
  await pagina.evaluate(() => { const M = window.__ll; M.cuadros = []; M.gpu = []; window.__galaxia.escena.pedirCuadro(); });
  await pagina.waitForTimeout(segundos * 1000);
  const { cuadros, gpu } = await pagina.evaluate(() => ({ cuadros: window.__ll.cuadros, gpu: window.__ll.gpu }));
  // Después, 20 cuadros con el desglose por objeto y su tiempo de GPU (ms por cuadro, media).
  await pagina.evaluate(() => { const M = window.__ll; M.gpuLlamada = {}; M.cuadrosDesglose = 0; M.pedirDesglose = 20; });
  await pagina.waitForTimeout(1500);
  const { desglose, gpuLlamada, n } = await pagina.evaluate(() => ({ desglose: window.__ll.ultimoDesglose, gpuLlamada: window.__ll.gpuLlamada, n: window.__ll.cuadrosDesglose }));
  const col = k => cuadros.map(c => c[k]);
  return { cuadros: cuadros.length, llamadas: mediana(col(0)), llamadasMax: Math.max(0, ...col(0)), triangulos: mediana(col(1)), puntos: mediana(col(2)), gpuMs: gpu.length ? +mediana(gpu).toFixed(2) : null,
    desglose: Object.fromEntries(Object.entries(desglose || {}).sort((a, b) => b[1] - a[1])),
    gpuPorObjeto: Object.fromEntries(Object.entries(gpuLlamada || {}).map(([k, v]) => [k, +(v / Math.max(1, n)).toFixed(3)]).sort((a, b) => b[1] - a[1]).slice(0, 25)) };
}

export default async function ({ base, informe }) {
  const res = {};
  for (const perfil of PERFILES) {
    const dir = `.pruebas/capturas/llamadas/${ETIQUETA}`; mkdirSync(dir, { recursive: true });
    const { navegador, pagina, errores } = await abrir(base, perfil, { espera: 3000 });
    try {
      await instrumentar(pagina); res[perfil] = {};
      for (const lugar of LUGARES) {
        // La escena de un gigante no deja irse hasta que acaba: se cierra antes (como al terminar su canción).
        await pagina.evaluate(() => window.__galaxia.interfaz.escenaEnCurso?.(null, 0));
        if (lugar !== 'hogar') await visitar(pagina, lugar); else await pagina.waitForTimeout(500);
        const llegado = await pagina.evaluate(() => window.__galaxia.escena.destino);
        if (llegado !== lugar && !(lugar === 'hogar' && !llegado)) informe.comprobar(false, `${perfil}: se llega a ${lugar}`, llegado);
        await pagina.waitForTimeout(3500);
        // Captura reproducible para comparar antes/después: universo en pausa, el mismo instante (fijarTiempo) y la misma pose
        // de cámara (la de POSES, si existe; si no, se guarda la actual), y solo el lienzo (sin la interfaz encima).
        const clave = `${perfil}-${lugar}`;
        const pose = await pagina.evaluate(({ guardada, T }) => {
          const e = window.__galaxia.escena, i = e.interno; e.pausar(true);
          if (guardada) { i.camera.position.fromArray(guardada.p); i.camera.quaternion.fromArray(guardada.q); i.controls.target.fromArray(guardada.t); i.camera.updateMatrixWorld(); }
          window.__tiempoAntes = i.fijarTiempo(T);
          const st = document.createElement('style'); st.id = '__solo3d'; st.textContent = 'body * { visibility: hidden !important; } #galaxia { visibility: visible !important; }'; document.head.appendChild(st);
          e.pedirCuadro();
          return { p: i.camera.position.toArray(), q: i.camera.quaternion.toArray(), t: i.controls.target.toArray() };
        }, { guardada: POSES[clave] || null, T: 4000 });
        poses[clave] = pose;
        await pagina.waitForTimeout(500);
        await pagina.evaluate(() => { const e = window.__galaxia.escena; e.interno.fijarTiempo(4000); e.pedirCuadro(); });
        await pagina.waitForTimeout(300);
        await pagina.screenshot({ path: `${dir}/${perfil}-${lugar}.png` });
        await pagina.evaluate(() => { const e = window.__galaxia.escena; e.interno.fijarTiempo(window.__tiempoAntes); document.getElementById('__solo3d')?.remove(); e.pausar(false); });
        const m = await medir(pagina, 6); res[perfil][lugar] = m;
        informe.nota(`${perfil} · ${lugar.padEnd(10)} llamadas ${m.llamadas} (máx ${m.llamadasMax}), triángulos ${m.triangulos}, puntos ${m.puntos}, GPU ${m.gpuMs} ms, ${m.cuadros} cuadros`);
      }
      informe.comprobar(errores.length === 0, `${perfil}: sin errores de consola`, errores.slice(0, 3));
    } finally { await navegador.close(); }
  }
  writeFileSync(`.pruebas/llamadas-${ETIQUETA}.json`, JSON.stringify(res, null, 1));
  writeFileSync(`.pruebas/llamadas-poses-${ETIQUETA}.json`, JSON.stringify(poses));
  const m = res.iphoneMax;
  if (m) {
    if (m.hogar) informe.comprobar(m.hogar.llamadasMax < 150, 'móvil: menos de 150 llamadas de dibujo en casa', m.hogar.llamadasMax);
    const gig = LUGARES.filter(l => l !== 'hogar' && m[l]).map(l => [l, m[l].llamadasMax]).sort((a, b) => b[1] - a[1]);
    if (gig.length) informe.comprobar(gig[0][1] < 250, 'móvil: menos de 250 llamadas de dibujo en el lugar más cargado', gig[0]);
  }
}
