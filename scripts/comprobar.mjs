// Comprobaciones de sintaxis y recursos estáticos, sin navegador ni publicación.
import { readFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
async function archivos(carpeta) {
  const resultado = [];
  for (const entrada of await readdir(carpeta, {withFileTypes:true})) {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) resultado.push(...await archivos(ruta)); else resultado.push(ruta);
  }
  return resultado;
}
const fuentes = [...await archivos('js'), ...await archivos('scripts')].filter(p => /\.(js|mjs)$/.test(p));
for (const archivo of fuentes) {
  execFileSync(process.execPath, ['--check', archivo]);
  const texto = await readFile(archivo, 'utf8');
  for (const m of texto.matchAll(/(?:from\s*|import\s*\()['"]([^'"]+)['"]/g)) {
    if (m[1].startsWith('.')) await stat(path.resolve(path.dirname(archivo), m[1]));
  }
}
for (const html of ['index.html','editor.html']) {
  const texto = await readFile(html,'utf8');
  for (const m of texto.matchAll(/(?:href|src)="([^"#]+)"/g)) if (!/^(https?:|\/)/.test(m[1])) await stat(m[1]);
}
for (const css of (await archivos('css')).filter(p => p.endsWith('.css'))) {
  const texto = await readFile(css,'utf8');
  for (const m of texto.matchAll(/url\(([^)]+)\)/g)) if (!/^https?:/.test(m[1])) await stat(path.resolve(path.dirname(css),m[1]));
}
console.log(`${fuentes.length} archivos JavaScript comprobados. Importaciones, hojas de estilo, fuentes e imágenes locales presentes.`);
