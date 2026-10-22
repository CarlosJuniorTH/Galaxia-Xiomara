// La galaxia de Xiomara al alejarse: sus dos niveles (la galaxia de verdad y su versión lejana)
// tienen la misma orientación y forma, y la luz no da saltos en el fundido (por tamaño en pantalla).
import { abrir } from './arnes.mjs';

// Dibuja solo la galaxia (o una parte) a un búfer de coma flotante y devuelve su luz y una rejilla.
export async function medir(pagina, { px, parte = 'todo', G = 16, inclinacion = 0.15 }) {
  return pagina.evaluate(async ({ px, parte, G, inclinacion }) => {
    const e = window.__galaxia.escena, i = e.interno, { THREE, camera, controls, renderer, scene, galaxia } = i;
    e.pausar(true); i.lento(0); controls.enabled = false;
    const R = 980, f = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)), d = R * f / px;
    camera.position.set(0, Math.cos(inclinacion) * d, Math.sin(inclinacion) * d); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0); controls.target.set(0, 0, 0); camera.updateMatrixWorld();
    e.pedirCuadro(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));   // el fundido según esta cámara
    const ocultos = scene.children.filter(o => o.visible && o !== galaxia.grupo); ocultos.forEach(o => { o.visible = false; });
    const L = galaxia.partesLejos, cambios = [];
    const ocultar = o => { cambios.push([o, o.visible]); o.visible = false; };
    if (parte === 'cerca') ocultar(L.grupo);
    if (parte === 'lejos') galaxia.grupo.children.forEach(o => { if (o !== L.grupo) ocultar(o); });
    const sola = { puntosLejos: L.puntos, discoLejos: L.disco, bulboLejos: L.bulbo }[parte];
    if (sola) { galaxia.grupo.children.forEach(o => { if (o !== L.grupo) ocultar(o); }); L.grupo.children.forEach(o => { if (o !== sola) ocultar(o); }); }
    const W = Math.floor(innerWidth * i.nucleo.uPR.value), H = Math.floor(innerHeight * i.nucleo.uPR.value);
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType }), buf = new Float32Array(W * H * 4);
    const fondo = renderer.getClearColor(new THREE.Color()), alfa = renderer.getClearAlpha(); renderer.setClearColor(0, 1);
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); renderer.setRenderTarget(null); renderer.setClearColor(fondo, alfa);
    ocultos.forEach(o => { o.visible = true; }); cambios.forEach(([o, v]) => { o.visible = v; }); rt.dispose(); e.pedirCuadro();
    const pr = W / innerWidth, cx = W / 2, cy = H / 2, r = px * pr * 1.15; let luz = 0; const mapa = new Array(G * G).fill(0);
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(H, cy + r); y++) for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(W, cx + r); x++) {
      const j = (y * W + x) * 4, l = 0.2126 * buf[j] + 0.7152 * buf[j + 1] + 0.0722 * buf[j + 2]; luz += l;
      const gx = Math.floor((x - cx + r) / (2 * r) * G), gy = Math.floor((y - cy + r) / (2 * r) * G); if (gx >= 0 && gy >= 0 && gx < G && gy < G) mapa[gy * G + gx] += l;
    }
    return { luz, porArea: luz / (px * pr) ** 2, mapa };
  }, { px, parte, G, inclinacion });
}
const pearson = (x, y) => { const n = x.length, mx = x.reduce((s, v) => s + v) / n, my = y.reduce((s, v) => s + v) / n; let xy = 0, xx = 0, yy = 0; for (let i = 0; i < n; i++) { xy += (x[i] - mx) * (y[i] - my); xx += (x[i] - mx) ** 2; yy += (y[i] - my) ** 2; } return xy / Math.sqrt(xx * yy); };

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc');
  try {
    const G = 16, voltear = m => m.map((_, i) => m[(G - 1 - Math.floor(i / G)) * G + i % G]);
    // 1. El nivel lejano: su disco (imagen) y sus puntos 3D con la misma orientación.
    const pun = (await medir(pagina, { px: 50, parte: 'puntosLejos', G })).mapa, dis = (await medir(pagina, { px: 50, parte: 'discoLejos', G })).mapa;
    const t1 = pearson(pun, dis), r1 = pearson(voltear(pun), dis);
    informe.comprobar(t1 > r1 + 0.01, 'lejos: el disco y los puntos de Xiomara tienen la misma orientación (no reflejados)', { talCual: +t1.toFixed(3), reflejada: +r1.toFixed(3) });
    // 2. La galaxia de verdad y su versión lejana se parecen (forma y orientación) a 60 px.
    const cerca = (await medir(pagina, { px: 60, parte: 'cerca', G })).mapa, lejos = (await medir(pagina, { px: 60, parte: 'lejos', G })).mapa;
    const t2 = pearson(cerca, lejos), r2 = pearson(voltear(cerca), lejos);
    informe.comprobar(t2 > 0.6 && t2 > r2 + 0.01, 'la galaxia de verdad y su versión lejana coinciden en forma y orientación', { talCual: +t2.toFixed(3), reflejada: +r2.toFixed(3) });
    // 3. Luz durante el fundido (radio en pantalla 85 → 30 px): sin saltos entre pasos contiguos.
    const radios = [140, 100, 85, 70, 55, 45, 35, 30, 22, 15];
    const serie = []; for (const px of radios) serie.push((await medir(pagina, { px })).porArea);
    const rel = serie.map(v => v / serie[0]);
    informe.nota(`luz por área relativa a 140 px → ${radios.map((p, k) => `${p}px ${rel[k].toFixed(2)}`).join(' · ')}`);
    const salto = Math.max(...rel.slice(1).map((v, k) => Math.abs(Math.log(v / rel[k]))));
    informe.comprobar(salto < Math.log(1.15), 'Xiomara: la luz por área no salta más de un 15 % entre pasos del fundido', { mayorSaltoRel: +(Math.exp(salto) - 1).toFixed(2) });
    informe.comprobar(errores.length === 0, 'sin errores de consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
