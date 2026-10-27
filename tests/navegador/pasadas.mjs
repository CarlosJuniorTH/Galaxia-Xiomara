// Pasadas de GPU y capturas a la nativa en las mismas poses (casa, supernova, TON 618, Sagitario A*, sistema solar), en el
// PC y en el móvil (iphoneMax). Mide el tiempo de GPU de cada pasada (EXT_disjoint_timer_query_webgl2: escena, lente,
// salto, resplandor, salida) y de las capas a menor resolución (gas volumétrico, galaxias de la telaraña), y guarda una
// captura del lienzo (sin la interfaz HTML) por pose para comparar antes/después:
//   ETIQUETA=antes node tests/navegador/ejecutar.mjs pasadas    → .pruebas/capturas/pasadas/antes/*.png + pasadas.json
// Con COMPARAR=antes compara las capturas de esta ejecución con las de esa etiqueta (brillo medio por canal y nitidez).
import { abrir, visitar } from './arnes.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';

const POSES = ['hogar', 'supernova', 'ton618', 'sagitario', 'rosa'];
const PERFILES = (process.env.PERFILES || 'pc,iphoneMax').split(',');

function instrumentar() {
  const i = window.__galaxia.escena.interno, gl = i.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const T = window.__pasadas = { ext: !!ext, datos: {}, pend: [], activo: false, cuadros: 0 };
  if (!ext) return false;
  const medir = (nombre, f) => function (...a) {
    if (!T.activo) return f.apply(this, a);
    const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
    try { return f.apply(this, a); } finally { gl.endQuery(ext.TIME_ELAPSED_EXT); T.pend.push([nombre, q]); }
  };
  const nombre = (p, k) => p === i.nucleo.lente ? 'lente' : p === i.nucleo.salto ? 'salto' : p === i.nucleo.bloom ? 'resplandor' : p.constructor.name === 'SalidaPass' ? 'salida' : p.constructor.name === 'RenderPass' ? 'escena' : p.nombre || p.constructor.name + k;
  const envolver = () => { for (const [k, p] of (i.nucleo.post?.passes ?? []).entries()) if (!p.__medida) { p.render = medir(nombre(p, k), p.render); p.__medida = true; } };
  envolver(); T.envolver = envolver;
  i.capaVolumen.dibujar = medir('volumen', i.capaVolumen.dibujar);
  i.telarana.dibujarGalaxias = medir('telarana', i.telarana.dibujarGalaxias);
  const leer = () => {
    T.pend = T.pend.filter(([n, q]) => {
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) return true;
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) (T.datos[n] ||= []).push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q); return false;
    });
    if (T.activo) T.cuadros++;
    requestAnimationFrame(leer);
  };
  requestAnimationFrame(leer);
  return true;
}

async function medirPasadas(pagina, cuadros = 90) {
  await pagina.evaluate(() => { const T = window.__pasadas; T.envolver?.(); T.datos = {}; T.cuadros = 0; T.activo = true; });
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    await pagina.evaluate(() => { const e = window.__galaxia.escena; e.actividad?.(); e.pedirCuadro?.(); });
    if (await pagina.evaluate(n => window.__pasadas.cuadros >= n, cuadros)) break;
    await pagina.waitForTimeout(150);
  }
  await pagina.evaluate(() => { window.__pasadas.activo = false; });
  await pagina.waitForTimeout(300);
  return pagina.evaluate(() => {
    const T = window.__pasadas, med = a => { const s = [...a].sort((x, y) => x - y); return +s[s.length >> 1].toFixed(3); }, out = {};
    let total = 0; for (const [n, a] of Object.entries(T.datos)) { const m = med(a); out[n] = { ms: m, cuadros: a.length }; total += m; }
    out.total = +total.toFixed(3); return out;
  });
}

async function posar(pagina, id) {
  if (id !== 'hogar') {
    await pagina.evaluate(() => window.__galaxia.escena.interno.lento(4));
    await visitar(pagina, id);
    await pagina.evaluate(() => window.__galaxia.escena.interno.lento(1));
  }
  await pagina.waitForTimeout(id === 'hogar' ? 500 : 3500);
  // Tiempo congelado: misma imagen en las dos versiones (sin titileo ni giro).
  await pagina.evaluate(() => { const e = window.__galaxia.escena; e.interno.lento(0); e.actividad?.(); e.pedirCuadro?.(); });
  await pagina.waitForTimeout(600);
}

// Captura del lienzo a su resolución de pantalla, sin la interfaz HTML encima.
async function capturar(pagina, ruta) {
  await pagina.addStyleTag({ content: 'body > *:not(#galaxia){visibility:hidden!important} #galaxia{visibility:visible!important}' }).then(h => h.evaluate(n => n.id = '__soloLienzo'));
  await pagina.evaluate(() => { window.__galaxia.escena.pedirCuadro?.(); });
  await pagina.waitForTimeout(250);
  await pagina.screenshot({ path: ruta });
  await pagina.evaluate(() => document.getElementById('__soloLienzo')?.remove());
}

// Brillo medio por canal y nitidez (energía del gradiente) de un PNG, decodificado en la página.
async function analizar(pagina, rutas) {
  const datos = rutas.map(r => readFileSync(r).toString('base64'));
  return pagina.evaluate(async datos => Promise.all(datos.map(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const { data: d, width: W, height: H } = x.getImageData(0, 0, img.width, img.height);
    let r = 0, g = 0, b = 0, grad = 0; const L = k => 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
    for (let y = 0; y < H - 1; y++) for (let x0 = 0; x0 < W - 1; x0++) { const k = (y * W + x0) * 4; r += d[k]; g += d[k + 1]; b += d[k + 2]; const l = L(k); grad += Math.abs(l - L(k + 4)) + Math.abs(l - L(k + W * 4)); }
    const n = (W - 1) * (H - 1); return { W, H, r: +(r / n).toFixed(2), g: +(g / n).toFixed(2), b: +(b / n).toFixed(2), nitidez: +(grad / n).toFixed(3) };
  })), datos);
}

export default async function ({ base, informe }) {
  const etiqueta = process.env.ETIQUETA || 'actual', dir = `.pruebas/capturas/pasadas/${etiqueta}`; mkdirSync(dir, { recursive: true });
  const resultado = {};
  for (const perfil of PERFILES) {
    const { navegador, pagina, errores } = await abrir(base, perfil, { consulta: '&diag=render', espera: 2500 });
    try {
      const hay = await pagina.evaluate(instrumentar);
      informe.nota(`${perfil}: consulta de tiempo de GPU ${hay ? 'disponible' : 'NO disponible'}`);
      const res = await pagina.evaluate(() => { const c = document.getElementById('galaxia'), n = window.__galaxia.escena.interno.nucleo; return { lienzo: `${c.width}x${c.height}`, interna: n.uPR.value, mpInterna: +(innerWidth * innerHeight * n.uPR.value ** 2 / 1e6).toFixed(2) }; });
      informe.nota(`${perfil}: ${JSON.stringify(res)}`);
      resultado[perfil] = { resolucion: res, poses: {} };
      for (const id of POSES) {
        await posar(pagina, id);
        const pasadas = await medirPasadas(pagina);
        const ruta = `${dir}/${perfil}-${id}.png`; await capturar(pagina, ruta);
        resultado[perfil].poses[id] = pasadas;
        informe.nota(`${perfil} ${id}: ${JSON.stringify(pasadas)}`);
        await pagina.evaluate(() => window.__galaxia.escena.interno.lento(1));
      }
      if (process.env.COMPARAR) {
        const otra = `.pruebas/capturas/pasadas/${process.env.COMPARAR}`;
        for (const id of POSES) {
          const a = `${otra}/${perfil}-${id}.png`, b = `${dir}/${perfil}-${id}.png`; if (!existsSync(a)) continue;
          const [x, y] = await analizar(pagina, [a, b]);
          const dBrillo = Math.max(Math.abs(x.r - y.r), Math.abs(x.g - y.g), Math.abs(x.b - y.b)), kNitidez = y.nitidez / Math.max(1e-6, x.nitidez);
          informe.nota(`${perfil} ${id}: ${process.env.COMPARAR} ${JSON.stringify(x)} → ${etiqueta} ${JSON.stringify(y)}`);
          resultado[perfil].poses[id].comparacion = { antes: x, despues: y, dBrillo: +dBrillo.toFixed(2), kNitidez: +kNitidez.toFixed(3) };
        }
      }
      informe.comprobar(errores.length === 0, `${perfil}: sin errores de consola`, errores.slice(0, 3));
    } finally { await navegador.close(); }
  }
  writeFileSync(`${dir}/pasadas.json`, JSON.stringify(resultado, null, 1));
}
