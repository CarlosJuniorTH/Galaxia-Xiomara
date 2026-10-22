// Hornea el cielo profundo en 6 imágenes (caras de un cubo) con mucha calidad, una sola vez, aquí: el juego solo
// las carga (nada se calcula en el teléfono ni en el PC al jugar). Uso: node scripts/hornear-cielo.mjs [lado] [pasos]
// Necesita playwright-core (como las pruebas del navegador) e ImageMagick (magick) para convertir a WebP.
import { createRequire } from 'module';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LADO = Number(process.argv[2] || 2048), PASOS = Number(process.argv[3] || 220), TESELA = 256;
// Se calcula al doble de resolución y se promedia (4 muestras por píxel): sin grano y con bordes finos.
const CALCULO = LADO * 2;
const cand = [process.env.PLAYWRIGHT_CORE, path.join(RAIZ, 'node_modules/playwright-core'), path.join(RAIZ, '.pruebas/pw/node_modules/playwright-core')].filter(Boolean);
const { chromium } = createRequire(import.meta.url)(cand.find(c => existsSync(c)));
const CHROME = process.env.CHROME || homedir() + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const tmp = path.join(RAIZ, '.pruebas', 'horno'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });

const html = `<!doctype html><html><body style="margin:0;background:#000"><canvas id="c" width="${TESELA}" height="${TESELA}"></canvas>
<script type="importmap">{"imports":{"three":"/assets/vendor/three/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import { fragmentoCielo } from '/js/escena/cieloProfundoShader.js';
import { crearRuido3D } from '/js/escena/ruido3d.js';
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.setSize(${TESELA}, ${TESELA}, false);
// Direcciones de cada cara con la convención de los cubemaps de GL (origen arriba a la izquierda de la imagen).
const frag = fragmentoCielo([${LADO} * 0.55, ${LADO} * 0.22, ${LADO} * 0.075], ${PASOS})
  .replace('varying vec3 vDir;', 'varying vec2 vUv; uniform float uCara; uniform vec3 uTes; vec3 dirDe(){ vec2 st = (uTes.xy + vUv * uTes.z) * 2.0 - 1.0; float sc = st.x, tc = st.y; int f = int(uCara + 0.5); vec3 v = f == 0 ? vec3(1.0, -tc, -sc) : f == 1 ? vec3(-1.0, -tc, sc) : f == 2 ? vec3(sc, 1.0, tc) : f == 3 ? vec3(sc, -1.0, -tc) : f == 4 ? vec3(sc, -tc, 1.0) : vec3(-sc, -tc, -1.0); return normalize(v); }')
  .replace('vec3 d = normalize(vDir)', 'vec3 d = dirDe()');
const m = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = vec2(uv.x, 1.0 - uv.y); gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: frag,
  uniforms: { uS: { value: 11.3 }, uRuido: { value: crearRuido3D() }, uCara: { value: 0 }, uTes: { value: new THREE.Vector3() } } });
const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); const cam = new THREE.Camera();
window.pintar = (cara, x, y, t) => { m.uniforms.uCara.value = cara; m.uniforms.uTes.value.set(x, y, t); r.render(s, cam); const gl = r.getContext(); const p = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); return true; };
window.listo = true;
</script></body></html>`;

const navegador = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-features=Vulkan'] });
const pagina = await navegador.newPage({ viewport: { width: TESELA, height: TESELA } });
const tipos = { '.js': 'text/javascript', '.mjs': 'text/javascript' };
await pagina.route('http://horno.local/**', r => {
  const u = new URL(r.request().url()); if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: html });
  const f = path.join(RAIZ, decodeURIComponent(u.pathname)); return r.fulfill({ contentType: tipos[path.extname(f)] || 'application/octet-stream', body: readFileSync(f) });
});
pagina.on('pageerror', e => console.error(e));
await pagina.goto('http://horno.local/'); await pagina.waitForFunction(() => window.listo, null, { timeout: 30000 });
const CARAS = ['px', 'nx', 'py', 'ny', 'pz', 'nz'], n = CALCULO / TESELA, t0 = Date.now();
for (let f = 0; f < 6; f++) {
  const teselas = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    await pagina.evaluate(a => window.pintar(...a), [f, i / n, j / n, 1 / n]);
    const archivo = path.join(tmp, `${CARAS[f]}-${j}-${i}.png`); await (await pagina.$('#c')).screenshot({ path: archivo }); teselas.push(archivo);
  }
  const cara = path.join(tmp, `${CARAS[f]}.png`);
  execFileSync('magick', ['montage', ...teselas, '-tile', `${n}x${n}`, '-geometry', '+0+0', cara]);
  for (const [lado, sufijo] of [[LADO, 'alta'], [LADO / 2, 'media']]) execFileSync('magick', [cara, '-filter', 'Box', '-resize', `${lado}x${lado}`, '-quality', '94', '-define', 'webp:method=6', '-define', 'webp:use-sharp-yuv=true', path.join(RAIZ, 'assets/cielo', `${CARAS[f]}-${sufijo}.webp`)]);
  console.log(`cara ${CARAS[f]} lista (${Math.round((Date.now() - t0) / 1000)} s)`);
}
await navegador.close();
