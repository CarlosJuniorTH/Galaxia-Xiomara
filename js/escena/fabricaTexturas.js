// Pide las texturas de los planetas al Web Worker y devuelve DataTextures que se rellenan
// al llegar. Si el navegador no admite workers de módulo (o fallan), se calculan aquí.
// `texturasListas()` resuelve cuando todas están rellenas: la pantalla de carga la espera.
import * as THREE from 'three';
import { GENERADORES } from './texturasPlaneta.js';
import { conDiagnostico } from '../util/diag.js';
import { huellaTextura } from './huellaTextura.js';
import { descargas, cuandoLibre } from '../util/descargas.js';
import { esMovil, texturasLigeras } from '../util/dispositivo.js';

// Texturas HORNEADAS (scripts/hornear-texturas.mjs): las mismas, ya calculadas, en imágenes WebP sin pérdidas. Se descargan
// y el navegador las decodifica (nativo y rápido en cualquier aparato); calcularlas aquí queda solo de respaldo. En un
// iPhone, calcular las 105 texturas en JavaScript tardaba minutos (la carga se quedaba en el 85 %).
const enNavegador = typeof window !== 'undefined' && typeof fetch === 'function' && typeof createImageBitmap === 'function';
// El índice dice qué imágenes descarga este tipo de aparato (y cuánto pesa el cielo): el total de la descarga se conoce y se
// muestra desde el principio («0 de 11,9 MB»), no sumando por partes. (Del cielo, la carga solo trae las caras medianas:
// las grandes llegan después, en reposo, cieloProfundo.js.)
const grupoAparato = `${esMovil ? 'movil' : 'pc'}-${texturasLigeras ? 1 : 0}`, sufijoCielo = 'media';
const contadas = new Set(), pedidas = new Set();
let bytesIndice = {};
const indiceHorneadas = !enNavegador ? Promise.resolve({}) : fetch('assets/texturas/indice.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(j => {
  const archivos = j.archivos || {}, propias = j.grupos?.[grupoAparato] || [];
  for (const n of propias) contadas.add(n); bytesIndice = archivos;
  descargas.horno = j.horno || 0;
  descargas.previsto(propias.reduce((a, n) => a + (archivos[n] || 0), 0) + (j.cielo?.[sufijoCielo] || 0) + (j.horno || 0));
  return archivos;
});
let bajando = 0; const esperando = [];
const turnoDescarga = () => (bajando < 6 ? (bajando++, Promise.resolve()) : new Promise(r => esperando.push(r)));
const finDescarga = () => { const s = esperando.shift(); if (s) s(); else bajando--; };
// Se decodifican en dos obreros (obreroImagenes.js): en el hilo principal, leer los píxeles de cada imagen restaba
// fluidez a la animación de la portada durante la carga. Si un obrero no arranca, falla o tarda más de 8 s con una
// imagen, esa imagen (y las siguientes, si no arrancó) se decodifica aquí.
let decodificadores = null, idImagen = 0, decodificadasFuera = 0, avisarArranque = null;
const esperandoImagen = new Map();
// Espera a que arranque alguno (como mucho 3 s; si no, se decodifica aquí).
const arranque = new Promise(r => { avisarArranque = r; setTimeout(r, 3000); });
function decodificadoresVivos() {
  if (decodificadores) return decodificadores.filter(w => w.vivo);
  decodificadores = [];
  try {
    for (let i = 0; i < 2; i++) {
      const w = new Worker(new URL('./obreroImagenes.js', import.meta.url));
      w.onmessage = ({ data }) => { if (data.listo) { w.vivo = true; avisarArranque(); return; } const e = esperandoImagen.get(data.id); if (!e) return; if (data.recibida) { e.recibida(); return; } esperandoImagen.delete(data.id); e(data); };
      w.onerror = ev => { ev.preventDefault?.(); w.vivo = false; };
      decodificadores.push(w);
    }
  } catch {}
  return [];
}
if (enNavegador) decodificadoresVivos();   // arrancan ya, mientras llega el índice
async function decodificarFuera(nombre, ancho, alto) {
  await arranque;
  const vivos = decodificadoresVivos(); if (!vivos.length) return null;
  const w = vivos[idImagen % vivos.length], id = ++idImagen;
  return new Promise(resolver => {
    // El plazo de 8 s cuenta desde que la imagen ha llegado (con datos móviles lentos la descarga sola puede tardar más):
    // antes de eso solo se abandona si el obrero no da señales en 60 s.
    const abandonar = () => { esperandoImagen.delete(id); resolver(null); };
    let plazo = setTimeout(abandonar, 60000);
    const e = d => { clearTimeout(plazo); resolver(d.datos || null); };
    e.recibida = () => { clearTimeout(plazo); plazo = setTimeout(abandonar, 8000); };
    esperandoImagen.set(id, e);
    w.postMessage({ id, url: new URL('assets/texturas/' + nombre, location.href).href, ancho, alto });
  });
}
let lienzoLectura = null;
async function bajarImagen(nombre, ancho, alto, bytes) {
  pedidas.add(nombre);
  await turnoDescarga();
  try {
    const fuera = await decodificarFuera(nombre, ancho, alto);
    if (fuera) { decodificadasFuera++; descargas.hecho(bytes); return fuera; }
    const r = await fetch('assets/texturas/' + nombre); if (!r.ok) throw new Error(nombre + ': ' + r.status);
    const bmp = await createImageBitmap(await r.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    lienzoLectura ||= typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(ancho, alto) : document.createElement('canvas');
    if (lienzoLectura.width !== ancho || lienzoLectura.height !== alto) { lienzoLectura.width = ancho; lienzoLectura.height = alto; }
    const ctx = lienzoLectura.getContext('2d', { willReadFrequently: true }); ctx.clearRect(0, 0, ancho, alto); ctx.drawImage(bmp, 0, 0); bmp.close?.();
    const datos = ctx.getImageData(0, 0, ancho, alto).data;
    descargas.hecho(bytes); return datos;
  } finally { finDescarga(); }
}

// Reparto como en los juegos: una COLA común de texturas por calcular (primero las que bloquean la carga). Cada obrero
// coge la siguiente cuando termina la suya, y si los obreros van lentos (en un iPhone tardaban ~25 s por textura), el hilo
// principal también coge de la cola: nada se calcula dos veces y el que va más rápido hace más. Un obrero que no avisa de
// que ha arrancado en 5 s, o que se queda más de 60 s con una textura, se descarta y su textura vuelve a la cola.
let obreros = null, vigilante = 0;
const colaBloquea = [], colaResto = [], promesas = [], todas = [], enCurso = new Map(), errores = [];
// Diagnóstico de la carga (main.js lo envía al PC en la red local): qué texturas faltan y qué ha fallado.
let hechasAqui = 0, hechasObreros = 0;
if (typeof window !== 'undefined' && conDiagnostico) window.__texturas = () => ({ faltan: [...enCurso.values()], enHiloPrincipal: hechasAqui, porObreros: hechasObreros, obreros: obreros ? obreros.length : null, errores: errores.slice(-3), decodificadasFuera });
// En el móvil, dos como mucho: junto con el obrero de la telaraña y el hilo principal no se satura el procesador.
const movil = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
const NUM_OBREROS = Math.max(1, Math.min(movil ? 2 : 4, (navigator.hardwareConcurrency || 2) - 1));
let ultimaEntrega = performance.now();

const tomar = () => colaBloquea.shift() || colaResto.shift();
const quedan = () => colaBloquea.length + colaResto.length;
function calcularAqui(pedido) {
  try { const r = GENERADORES[pedido.tipo](pedido.opciones); pedido.resolver(r instanceof Uint8ClampedArray ? { pixeles: r } : r); }
  catch (e) { errores.push('hilo principal: ' + (e.message || e)); pedido.resolver(null); }   // (un fallo nunca bloquea)
}
// El hilo principal ayuda si no hay obreros vivos o si llevan más de 1,5 s sin entregar nada: una textura cada vez, cediendo
// entre ellas (la pantalla de carga sigue respondiendo).
let ayudando = false;
function ayudar() {
  if (ayudando) return; ayudando = true;
  setTimeout(function paso() {
    const sinObreros = !obreros || !obreros.length;
    if (quedan() && (sinObreros || performance.now() - ultimaEntrega > 1500)) { calcularAqui(tomar()); hechasAqui++; }
    if (quedan()) setTimeout(paso, sinObreros ? 0 : 120); else ayudando = false;
  }, 0);
}
function despachar() {
  for (const w of obreros || []) if (!w.pedido && quedan()) { const pedido = tomar(); w.pedido = pedido; w.desde = performance.now(); w.postMessage({ id: 1, tipo: pedido.tipo, opciones: pedido.opciones }); }
  if (quedan()) ayudar();
}
function descartar(w) {
  obreros = obreros.filter(o => o !== w); try { w.terminate(); } catch {}
  if (w.pedido) { colaBloquea.unshift(w.pedido); w.pedido = null; }   // vuelve a la cola, la primera
  despachar();
}
function iniciarObreros() {
  if (obreros) return; obreros = [];
  try {
    for (let i = 0; i < NUM_OBREROS; i++) {
      const w = new Worker(new URL('./obreroTexturas.js', import.meta.url), { type: 'module' });
      w.onmessage = ({ data: { datos, error, listo } }) => {
        if (listo) { w.vivo = true; return; }
        const pedido = w.pedido; w.pedido = null; ultimaEntrega = performance.now();
        if (pedido) { if (error) calcularAqui(pedido); else { pedido.resolver(datos); hechasObreros++; } }
        despachar();
      };
      w.onerror = e => { e.preventDefault?.(); descartar(w); };
      obreros.push(w);
    }
    setTimeout(() => { for (const w of obreros.filter(o => !o.vivo)) descartar(w); }, 5000);
    vigilante = setInterval(() => { for (const w of (obreros || []).filter(o => o.pedido && performance.now() - o.desde > 60000)) descartar(w); }, 5000);
  } catch { obreros = []; }
}

// Sin memoria hasta que llegan sus píxeles: antes cada textura reservaba ya su relleno (ancho×alto×4) al crearse y, al llegar
// la imagen, se copiaba encima (dos copias a la vez). Con ~110 texturas eran ~100 MB de golpe en la carga de un iPhone (iOS
// cierra la página sin memoria y la recarga sola). Ahora la imagen que llega se usa tal cual (sin copia) y el relleno de
// color solo se crea si la imagen no llega (nada se dibuja antes: la carga espera a todas, texturasTodas).
function rellenar(t, relleno) {
  const datos = new Uint8Array(t.image.width * t.image.height * 4);
  new Uint32Array(datos.buffer).fill(new Uint32Array(new Uint8Array([relleno[0], relleno[1], relleno[2], 255]).buffer)[0]);   // (de una vez: el bucle tardaba ~1 s en un móvil)
  t.image.data = datos; t.needsUpdate = true;
}
function dataTextura(ancho, alto) {
  const t = new THREE.DataTexture(null, ancho, alto, THREE.RGBAFormat);
  // Filas de arriba abajo, como un lienzo: se voltean al subirlas (igual que CanvasTexture).
  t.flipY = true; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  return t;
}
// Quien sube las texturas a la GPU en cuanto llegan (index.js, con el renderizador): así las que sueltan su copia
// (liberable) la sueltan ya en la carga, y no se acumulan todas en memoria hasta el final (pico de memoria del iPhone).
let alLlegar = null, tardias = false;
// Desde aquí (fin de la carga y de su calentamiento, index.js), las texturas que no bloquean se aplican en momentos libres.
export function texturasTardiasEnReposo() { tardias = true; }
export function subirAlLlegar(fn) { alLlegar = fn; }
const comoBytes = d => (d instanceof Uint8Array ? d : new Uint8Array(d.buffer, d.byteOffset, d.byteLength));

// claves: nombres de los resultados (p. ej. ['superficie', 'mascara']); por defecto uno solo.
// bloquea = false: la carga no la espera (cielo de fondo: negro e invisible hasta que llega).
// liberable: nadie vuelve a leer sus píxeles desde el procesador (los planetas): en cuanto la imagen definitiva llega a la
// tarjeta gráfica se suelta su copia en memoria (decenas de MB en un móvil).
const soltarCopia = t => { t.image = { width: t.image.width, height: t.image.height, data: null }; t.onUpdate = null; };
export function texturaPlaneta(tipo, opciones, { claves = ['pixeles'], relleno = [120, 110, 140], bloquea = true, liberable = false } = {}) {
  const { ancho, alto } = opciones;
  if (typeof window !== 'undefined' && conDiagnostico) (window.__pedidosTextura ||= []).push({ tipo, opciones, claves, bloquea });
  const texturas = Object.fromEntries(claves.map(c => [c, dataTextura(ancho, alto)]));
  const promesa = new Promise(resolve => {
    const clave = `${tipo} ${ancho}×${alto}`; enCurso.set(promesas.length + todas.length + Math.random(), clave);
    const marca = [...enCurso.keys()].at(-1);
    // Nunca deja la carga colgada: si rellenar la textura falla (datos que no encajan, una copia ya soltada…), se anota el
    // error, la textura se queda con su color de relleno y la carga sigue. Antes la promesa no se resolvía nunca.
    let hecho = false;
    const pedido = { tipo, opciones, resolver: datos => {
      if (hecho) return; hecho = true;
      // Una que no bloquea y llega cuando la carga ya terminó (el cielo de fondo, los planetas del sistema solar): se rellena
      // y se sube a la GPU en un momento libre (cuandoLibre), nunca durante un vuelo, un clip o un gesto.
      if (!bloquea && tardias) { cuandoLibre(() => aplicar(datos)).catch(() => aplicar(datos)); return; }
      aplicar(datos);
    } };
    const aplicar = datos => {
      try {
        for (const c of claves) { const t = texturas[c], n = ancho * alto * 4; if (!datos?.[c] || datos[c].length !== n) throw new Error(`${clave}: datos que no encajan (${datos?.[c]?.length} para ${n})`);
          t.image.data = comoBytes(datos[c]); t.needsUpdate = true; t.userData.lista = performance.now(); if (liberable) t.onUpdate = soltarCopia; }
      } catch (e) { errores.push(String(e.message || e)); console.warn('Textura', e); }
      for (const c of claves) if (!texturas[c].image.data) rellenar(texturas[c], relleno);   // (la que no llegó: su color de relleno)
      if (alLlegar) for (const c of claves) { try { alLlegar(texturas[c]); } catch (e) { console.warn('Textura', e); } }
      enCurso.delete(marca); resolve();
    };
    const enviar = () => { iniciarObreros(); (bloquea ? colaBloquea : colaResto).push(pedido); despachar(); };
    // Horneada si está (se descarga); si no, a la cola de cálculo (las que no bloquean, detrás de las imprescindibles).
    const h = huellaTextura(tipo, opciones);
    indiceHorneadas.then(indice => {
      const nombres = claves.map(c => `${h}-${c}.webp`);
      if (!nombres.every(n => indice[n] != null)) { enviar(); return; }
      const bytes = c => indice[`${h}-${c}.webp`] + (indice[`${h}-${c}-a.webp`] || 0);
      const nuevas = claves.filter(c => !contadas.has(`${h}-${c}.webp`)); if (nuevas.length) descargas.previsto(nuevas.reduce((a, c) => a + bytes(c), 0));   // (solo si no estaban ya en el total)
      Promise.all(claves.map(async c => {
        const rgba = await bajarImagen(`${h}-${c}.webp`, ancho, alto, indice[`${h}-${c}.webp`]);
        if (indice[`${h}-${c}-a.webp`]) { const a = await bajarImagen(`${h}-${c}-a.webp`, ancho, alto, indice[`${h}-${c}-a.webp`]); for (let i = 3; i < rgba.length; i += 4) rgba[i] = a[i - 3]; }
        return [c, rgba];
      })).then(pares => pedido.resolver(Object.fromEntries(pares)), e => { errores.push('horneada: ' + (e.message || e)); enviar(); });
    });
  });
  promesa.then(() => { promesa.lista = true; });
  if (bloquea) promesas.push(promesa);
  todas.push(promesa);
  return claves.length === 1 ? texturas[claves[0]] : texturas;
}

export const texturasListas = () => Promise.all(promesas);
// Con todas las texturas listas ya no hacen falta: obreros, vigilante y lienzos de lectura (hasta ~8 MB cada uno en un iPhone).
function soltarObreros() {
  if (todas.some(p => !p.lista)) return;
  for (const w of [...(obreros || []), ...(decodificadores || [])]) { try { w.terminate(); } catch {} }
  obreros = []; decodificadores = []; clearInterval(vigilante);
  if (lienzoLectura) { lienzoLectura.width = lienzoLectura.height = 0; lienzoLectura = null; }
}
// Todas, también las que no bloquean (nebulosas del viaje…): la carga completa espera a que estén calculadas, así
// nada se genera ni se sube a la GPU durante un viaje. alAvance(hechas, total) informa del progreso.
export function texturasTodas(alAvance = () => {}) {
  let hechas = 0; const total = todas.length;
  return Promise.all(todas.map(p => p.then(() => alAvance(++hechas, total)))).then(r => {
    soltarObreros();
    // Lo que el índice contaba para este aparato y nadie ha pedido (una textura que ya no se usa) se descuenta del total:
    // si no, el contador de la pantalla de carga se quedaba en «18,0 de 18,1 MB» para siempre.
    let sobra = 0; for (const n of contadas) if (!pedidas.has(n)) { sobra += bytesIndice[n] || 0; pedidas.add(n); }
    if (sobra) descargas.previsto(-sobra);
    return r;
  });
}
