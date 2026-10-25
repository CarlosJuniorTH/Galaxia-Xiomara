import { mkdir, copyFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
const raiz = path.resolve('node_modules/three/examples/jsm');
const salida = path.resolve('assets/vendor/three');
await rm(path.join(salida, 'addons'), { recursive: true, force: true });
await mkdir(salida, { recursive: true });
await copyFile('node_modules/three/build/three.module.js', path.join(salida, 'three.module.js'));
// La versión minificada oficial (la misma r160): la publicación la usa en lugar de la legible (preparar-pages.mjs).
await copyFile('node_modules/three/build/three.module.min.js', path.join(salida, 'three.module.min.js'));
await copyFile('node_modules/three/LICENSE', path.join(salida, 'LICENSE'));
const vistos = new Set();
async function incluir(relativo) {
  if (vistos.has(relativo)) return; vistos.add(relativo);
  const fuente = path.join(raiz, relativo), destino = path.join(salida, 'addons', relativo);
  await mkdir(path.dirname(destino), { recursive: true }); await copyFile(fuente, destino);
  const texto = await readFile(fuente, 'utf8');
  for (const m of texto.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    if (m[1].startsWith('.')) await incluir(path.normalize(path.join(path.dirname(relativo), m[1])));
  }
}
for (const archivo of ['controls/OrbitControls.js', 'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js', 'postprocessing/UnrealBloomPass.js']) await incluir(archivo);
console.log(`Three.js local preparado: ${vistos.size} módulos auxiliares.`);

await copyFile('node_modules/es-module-shims/dist/es-module-shims.js', 'assets/vendor/es-module-shims.js');
await copyFile('node_modules/es-module-shims/LICENSE', 'assets/vendor/es-module-shims-LICENSE');
