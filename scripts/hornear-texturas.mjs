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
// Cada pedido trae su grupo (móvil/PC × normal/modo seguro): el índice guarda qué imágenes descarga cada uno, para que la
// pantalla de carga muestre el total desde el principio. Las texturas repetidas entre grupos se hornean una vez.
const indice = {}, grupos = {}, hechas = new Map(); let total = 0;
for (const [n, { tipo, opciones, grupo = 'todos' }] of pedidos.entries()) {
  const h = huellaTextura(tipo, opciones);
  if (hechas.has(h)) { (grupos[grupo] ||= new Set()); for (const x of hechas.get(h)) grupos[grupo].add(x); continue; }
  const r = GENERADORES[tipo](opciones), datos = r instanceof Uint8ClampedArray ? { pixeles: r } : r, propias = [];
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
      const b = statSync(destino).size; indice[nombre] = b; total += b; propias.push(nombre);
    }
  }
  hechas.set(h, propias); (grupos[grupo] ||= new Set()); for (const x of propias) grupos[grupo].add(x);
  if (n % 20 === 0) console.log(`${n + 1}/${pedidos.length}`);
}
// Tamaños del cielo de fondo (también se descargan en la carga).
const cielo = {}; for (const suf of ['alta', 'media']) cielo[suf] = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].reduce((a, c) => a + statSync(path.resolve(`assets/cielo/${c}-${suf}.webp`)).size, 0);
writeFileSync(path.join(dir, 'indice.json'), JSON.stringify({ archivos: indice, grupos: Object.fromEntries(Object.entries(grupos).map(([g, l]) => [g, [...l]])), cielo }));
for (const [g, l] of Object.entries(grupos)) console.log(g, [...l].length, 'imágenes', ([...l].reduce((a, x) => a + indice[x], 0) / 1048576).toFixed(1), 'MB');
rmSync(tmp, { recursive: true, force: true });
console.log(`${Object.keys(indice).length} imágenes, ${(total / 1048576).toFixed(1)} MB`);
