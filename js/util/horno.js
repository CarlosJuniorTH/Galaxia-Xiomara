// Cálculos HORNEADOS: los resultados de los cálculos deterministas más pesados de la carga (densidades 3D de las nebulosas,
// imágenes de las maravillas, estrellas del cielo de casa) vienen ya hechos en un único paquete comprimido
// (assets/horno/paquete.bin.gz, scripts/hornear-calculos.mjs) y aquí solo se leen. En un iPhone, donde JavaScript va sin
// compilador, calcularlos tardaba ~20 s; descargarlos y descomprimirlos, una fracción de segundo. Si el paquete no está
// (o no tiene esa clave) se calcula como siempre: mismo resultado.
//
// La clave incluye una huella del código del cálculo: si se cambia, deja de coincidir y se calcula aquí hasta que se
// vuelva a hornear.
import { descargas } from './descargas.js';

const enNavegador = typeof window !== 'undefined' && typeof fetch === 'function';
const grabando = enNavegador && /[?&]hornear\b/.test(location.search);
const paquete = new Map();
if (grabando) window.__horno = {};
const calculados = []; if (enNavegador && !grabando) window.__hornoCalculados = calculados;   // diagnóstico: lo que no venía horneado

const huella = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
const TIPOS = { Uint8Array, Uint16Array, Uint32Array, Int32Array, Float32Array, Float64Array };

async function cargar() {
  try {
    if (typeof DecompressionStream !== 'function') return;
    const r = await fetch('assets/horno/paquete.bin.gz'); if (!r.ok || !r.body) return;
    // Se cuentan los bytes según llegan (el total ya lo sabe la pantalla de carga por el índice de texturas).
    const contar = new TransformStream({ transform(trozo, c) { descargas.hecho(trozo.byteLength); c.enqueue(trozo); } });
    const buf = await new Response(r.body.pipeThrough(contar).pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const n = new DataView(buf).getUint32(0, true), cabecera = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
    const base = 4 + n + ((8 - ((4 + n) % 8)) % 8);
    const revivir = v => (v && typeof v === 'object' ? (v.$t ? new TIPOS[v.$t](buf, base + v.o, v.n) : Array.isArray(v) ? v.map(revivir) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revivir(x)]))) : v);
    for (const [k, v] of Object.entries(cabecera)) paquete.set(k, revivir(v));
  } catch (e) { paquete.clear(); console.warn('Paquete horneado', e); }
}
export const hornoListo = enNavegador && !grabando ? cargar() : Promise.resolve();

// nombre: qué es (y sus parámetros); calcular: lo calcula; codigo: la función cuyo código entra en la clave.
// (El cálculo no debe usar Math.random: saltárselo cambiaría lo que sale después con la semilla del universo.)
export function horneado(nombre, calcular, codigo = calcular) {
  const clave = `${nombre}#${huella(String(codigo))}`;
  if (paquete.has(clave)) return paquete.get(clave);   // (alguno se pide dos veces con lo mismo: no se borra; nadie lo modifica)
  const v = calcular();
  if (!grabando) calculados.push(nombre);
  if (grabando) window.__horno[clave] = v;
  return v;
}

// Para el horneado: empaqueta lo grabado (cabecera JSON + datos binarios alineados a 8).
export function empaquetar(grabado) {
  const trozos = []; let o = 0;
  const aplanar = v => {
    if (ArrayBuffer.isView(v)) { const t = { $t: v.constructor.name, o, n: v.length }; trozos.push(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); o += v.byteLength; const p = (8 - (o % 8)) % 8; if (p) { trozos.push(new Uint8Array(p)); o += p; } return t; }
    if (v && typeof v === 'object') return Array.isArray(v) ? v.map(aplanar) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, aplanar(x)]));
    return v;
  };
  const cab = new TextEncoder().encode(JSON.stringify(aplanar(grabado))), pad = (8 - ((4 + cab.length) % 8)) % 8;
  const salida = new Uint8Array(4 + cab.length + pad + o); new DataView(salida.buffer).setUint32(0, cab.length, true); salida.set(cab, 4);
  let p = 4 + cab.length + pad; for (const t of trozos) { salida.set(t, p); p += t.length; }
  return salida;
}
