// Hornea las texturas procedurales (planetas, galaxias, nebulosas) en imágenes WebP, una sola vez, aquí: el móvil solo
// las descarga y decodifica (nativo y rápido), sin calcular nada. Son las mismas (mismos generadores y semillas).
// Uso: node scripts/hornear-texturas.mjs pedidos.json   (la lista sale de window.__pedidosTextura en la página)
// Necesita ImageMagick (magick). Escribe assets/texturas/<huella>-<clave>.webp y assets/texturas/indice.json (tamaños).
import { readFileSync, writeFileSync, mkdirSync, statSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { GENERADORES } from '../js/escena/texturasPlaneta.js';
import { huellaTextura } from '../js/escena/huellaTextura.js';

const pedidos = JSON.parse(readFileSync(process.argv[2], 'utf8')), dir = path.resolve('assets/texturas'), tmp = path.resolve('.pruebas/horno-texturas');
mkdirSync(dir, { recursive: true }); mkdirSync(tmp, { recursive: true });
const indice = {}; let total = 0;
for (const [n, { tipo, opciones }] of pedidos.entries()) {
  const r = GENERADORES[tipo](opciones), datos = r instanceof Uint8ClampedArray ? { pixeles: r } : r, h = huellaTextura(tipo, opciones);
  for (const [clave, px] of Object.entries(datos)) {
    // Sin pérdidas (los datos se usan tal cual: relieve en el alfa, máscaras, brillo medio de las galaxias). Si hay alfa, va
    // en una segunda imagen (-a, en gris): al decodificar, un lienzo multiplica el color por el alfa y perdería precisión.
    let conAlfa = false; for (let i = 3; i < px.length; i += 4) if (px[i] !== 255) { conAlfa = true; break; }
    const opaco = Uint8Array.from(px); if (conAlfa) for (let i = 3; i < opaco.length; i += 4) opaco[i] = 255;
    const imagenes = [[`${h}-${clave}.webp`, opaco]];
    if (conAlfa) { const a = new Uint8Array(px.length); for (let i = 0; i < px.length; i += 4) { a[i] = a[i + 1] = a[i + 2] = px[i + 3]; a[i + 3] = 255; } imagenes.push([`${h}-${clave}-a.webp`, a]); }
    for (const [nombre, datosImg] of imagenes) {
      const crudo = path.join(tmp, 'x.rgba'); writeFileSync(crudo, Buffer.from(datosImg.buffer, datosImg.byteOffset, datosImg.byteLength));
      const destino = path.join(dir, nombre);
      execFileSync('magick', ['-size', `${opciones.ancho}x${opciones.alto}`, '-depth', '8', `rgba:${crudo}`, '-define', 'webp:lossless=true', '-define', 'webp:exact=true', '-quality', '100', destino]);
      const b = statSync(destino).size; indice[nombre] = b; total += b;
    }
  }
  if (n % 20 === 0) console.log(`${n + 1}/${pedidos.length}`);
}
writeFileSync(path.join(dir, 'indice.json'), JSON.stringify(indice));
rmSync(tmp, { recursive: true, force: true });
console.log(`${Object.keys(indice).length} imágenes, ${(total / 1048576).toFixed(1)} MB`);
