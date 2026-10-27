// El resplandor por cadena de mips (brillo.js) tiene el mismo aspecto que el UnrealBloomPass de antes: misma luz total y el
// mismo perfil alrededor de una estrella (energía por anillos), en la GPU real y con los mismos parámetros.
import { abrir } from './arnes.mjs';

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc', { consulta: '&diag=render', espera: 500 });
  try {
    const r = await pagina.evaluate(async () => {
      const { THREE, renderer } = window.__galaxia.escena.interno;
      const { BrilloMips } = await import('./js/escena/brillo.js');
      const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
      const W = 1024, H = 640, fuente = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
      const dibujar = (puntos) => {
        const datos = new Float32Array(W * H * 4);
        for (const [x, y, v] of puntos) { const k = (y * W + x) * 4; datos[k] = datos[k + 1] = datos[k + 2] = v; datos[k + 3] = 1; }
        const t = new THREE.DataTexture(datos, W, H, THREE.RGBAFormat, THREE.FloatType); t.needsUpdate = true;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: t })), e = new THREE.Scene(); e.add(m);
        renderer.setRenderTarget(fuente); renderer.render(e, new THREE.Camera()); renderer.setRenderTarget(null); t.dispose(); m.geometry.dispose(); m.material.dispose();
      };
      const leer = rt => { const u = new Uint16Array(rt.width * rt.height * 4); renderer.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, u); return { b: Float32Array.from(u, THREE.DataUtils.fromHalfFloat), w: rt.width, h: rt.height }; };
      const mips = new BrilloMips(new THREE.Vector2(W, H), 0.45, 0.3, 0.78), orig = new UnrealBloomPass(new THREE.Vector2(W, H), 0.45, 0.3, 0.78);
      mips.setSize(W, H); orig.setSize(W, H); orig.blendMaterial.colorWrite = false;
      const correr = () => { mips.render(renderer, null, fuente); orig.render(renderer, null, fuente, 0, false); return [leer(mips.salida), leer(orig.renderTargetsHorizontal[0])]; };
      // 1) Una estrella (un píxel muy brillante): perfil por anillos alrededor de ella.
      dibujar([[W / 2, H / 2, 40]]);   // (por debajo del tope del HDR, 64, que el original de antes también aplicaba)
      const [a, b] = correr(), cx = a.w / 2, cy = a.h / 2, radios = [1, 2, 4, 8, 16, 32, 64, 128, 256];
      const anillos = ({ b: d, w, h }) => { const out = new Array(radios.length).fill(0); let total = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = d[(y * w + x) * 4 + 1], r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); total += v; const i = radios.findIndex(R => r < R); if (i >= 0) out[i] += v; }
        return { total, anillos: out.map(v => v / total) }; };
      const pa = anillos(a), pb = anillos(b);
      // 2) Un campo de estrellas al azar (como el cielo): diferencia de la imagen del resplandor.
      let s = 7; const azar = () => (s = (s * 16807) % 2147483647) / 2147483647, campo = [];
      for (let i = 0; i < 400; i++) campo.push([Math.floor(azar() * W), Math.floor(azar() * H), 1 + azar() * azar() * 30]);
      dibujar(campo); const [c, d] = correr();
      let dif = 0, ref = 0; for (let k = 0; k < c.b.length; k += 4) { dif += Math.abs(c.b[k] - d.b[k]); ref += d.b[k]; }
      mips.dispose(); orig.dispose(); fuente.dispose();
      return { mips: pa, original: pb, radios, campo: { difRelativa: dif / ref } };
    });
    informe.nota(`anillos (radio en píxeles de ½): ${r.radios.join(' ')}`);
    informe.nota(`mips     ${r.mips.anillos.map(v => v.toFixed(3)).join(' ')}  total ${r.mips.total.toFixed(1)}`);
    informe.nota(`original ${r.original.anillos.map(v => v.toFixed(3)).join(' ')}  total ${r.original.total.toFixed(1)}`);
    const dTotal = Math.abs(r.mips.total / r.original.total - 1), dPerfil = Math.max(...r.mips.anillos.map((v, i) => Math.abs(v - r.original.anillos[i])));
    informe.comprobar(dTotal < 0.05, 'misma luz total del resplandor (±5 %)', { relacion: +(r.mips.total / r.original.total).toFixed(3) });
    informe.comprobar(dPerfil < 0.05, 'mismo perfil alrededor de una estrella (cada anillo ±5 puntos)', { mayorDiferencia: +dPerfil.toFixed(3) });
    informe.comprobar(r.campo.difRelativa < 0.25, 'un campo de estrellas da casi la misma imagen de resplandor', { difRelativa: +r.campo.difRelativa.toFixed(3) });
    informe.comprobar(errores.length === 0, 'sin errores de consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
