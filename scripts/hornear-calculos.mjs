// Hornea los cálculos pesados de la carga (js/util/horno.js): abre la página en Chromium con ?hornear en cada tipo de
// aparato (móvil normal y en modo seguro, y PC; el PC en modo seguro calcula lo mismo que el móvil en modo seguro), recoge lo que se calcula y lo guarda en assets/horno/paquete.bin.gz; su
// tamaño va al índice de texturas (la pantalla de carga muestra el total desde el principio).
// Uso: node scripts/hornear-calculos.mjs   (necesita playwright-core, como npm run test:navegador)
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { gzipSync, gunzipSync } from 'zlib';
import { abrir, arrancarServidor, pararServidor } from '../tests/navegador/arnes.mjs';

const base = await arrancarServidor();
const partes = {};
try {
  for (const [perfil, seguro] of [['iphoneMax', 0], ['iphoneMax', 1], ['pc', 0]]) {
    const { navegador, pagina } = await abrir(base, perfil, { espera: 0, consulta: `&hornear&seguro=${seguro}` });
    const grabado = await pagina.evaluate(async () => {
      const { empaquetar } = await import('/js/util/horno.js');
      const b = empaquetar(window.__horno); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
      return { claves: Object.keys(window.__horno), datos: btoa(s) };
    });
    await navegador.close();
    console.log(`${perfil} seguro=${seguro}: ${grabado.claves.length} cálculos`);
    partes[`${perfil}-${seguro}`] = Buffer.from(grabado.datos, 'base64');
  }
} finally { pararServidor(); }

// Une los cuatro paquetes (las claves repetidas son el mismo cálculo).
const unido = {}, trozos = []; let o = 0;
for (const b of Object.values(partes)) {
  const n = b.readUInt32LE(0), cab = JSON.parse(b.subarray(4, 4 + n).toString()), baseDatos = 4 + n + ((8 - ((4 + n) % 8)) % 8);
  const mover = v => (v && typeof v === 'object' ? (v.$t ? (() => { const tam = { Uint8Array: 1, Float32Array: 4, Uint16Array: 2, Uint32Array: 4, Int32Array: 4, Float64Array: 8 }[v.$t] * v.n, t = { $t: v.$t, o, n: v.n };
    trozos.push(b.subarray(baseDatos + v.o, baseDatos + v.o + tam)); o += tam; const p = (8 - (o % 8)) % 8; if (p) { trozos.push(Buffer.alloc(p)); o += p; } return t; })()
    : Array.isArray(v) ? v.map(mover) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mover(x)]))) : v);
  for (const [k, v] of Object.entries(cab)) if (!(k in unido)) unido[k] = mover(v);
}
const cab = Buffer.from(JSON.stringify(unido)), pad = (8 - ((4 + cab.length) % 8)) % 8, largo = Buffer.alloc(4); largo.writeUInt32LE(cab.length);
const paquete = Buffer.concat([largo, cab, Buffer.alloc(pad), ...trozos]), gz = gzipSync(paquete, { level: 9 });
if (!gunzipSync(gz).equals(paquete)) throw new Error('el paquete no se descomprime igual');
mkdirSync('assets/horno', { recursive: true }); writeFileSync('assets/horno/paquete.bin.gz', gz);
const indice = JSON.parse(readFileSync('assets/texturas/indice.json')); indice.horno = gz.length; writeFileSync('assets/texturas/indice.json', JSON.stringify(indice));
console.log(`${Object.keys(unido).length} cálculos · ${(paquete.length / 1e6).toFixed(1)} MB → ${(gz.length / 1e6).toFixed(1)} MB comprimido`);
