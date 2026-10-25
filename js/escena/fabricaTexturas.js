// Pide las texturas de los planetas al Web Worker y devuelve DataTextures que se rellenan
// al llegar. Si el navegador no admite workers de módulo (o fallan), se calculan aquí.
// `texturasListas()` resuelve cuando todas están rellenas: la pantalla de carga la espera.
import * as THREE from 'three';
import { GENERADORES } from './texturasPlaneta.js';

// Reparto como en los juegos: una COLA común de texturas por calcular (primero las que bloquean la carga). Cada obrero
// coge la siguiente cuando termina la suya, y si los obreros van lentos (en un iPhone tardaban ~25 s por textura), el hilo
// principal también coge de la cola: nada se calcula dos veces y el que va más rápido hace más. Un obrero que no avisa de
// que ha arrancado en 5 s, o que se queda más de 60 s con una textura, se descarta y su textura vuelve a la cola.
let obreros = null;
const colaBloquea = [], colaResto = [], promesas = [], todas = [], enCurso = new Map(), errores = [];
// Diagnóstico de la carga (main.js lo envía al PC en la red local): qué texturas faltan y qué ha fallado.
let hechasAqui = 0, hechasObreros = 0;
if (typeof window !== 'undefined') window.__texturas = () => ({ faltan: [...enCurso.values()], enHiloPrincipal: hechasAqui, porObreros: hechasObreros, obreros: obreros ? obreros.length : null, errores: errores.slice(-3) });
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
    setInterval(() => { for (const w of (obreros || []).filter(o => o.pedido && performance.now() - o.desde > 60000)) descartar(w); }, 5000);
  } catch { obreros = []; }
}

function dataTextura(ancho, alto, relleno) {
  const datos = new Uint8Array(ancho * alto * 4);
  for (let i = 0; i < datos.length; i += 4) { datos[i] = relleno[0]; datos[i + 1] = relleno[1]; datos[i + 2] = relleno[2]; datos[i + 3] = 255; }
  const t = new THREE.DataTexture(datos, ancho, alto, THREE.RGBAFormat);
  // Filas de arriba abajo, como un lienzo: se voltean al subirlas (igual que CanvasTexture).
  t.flipY = true; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// claves: nombres de los resultados (p. ej. ['superficie', 'mascara']); por defecto uno solo.
// bloquea = false: la carga no la espera (cielo de fondo: negro e invisible hasta que llega).
// liberable: nadie vuelve a leer sus píxeles desde el procesador (los planetas): en cuanto la imagen definitiva llega a la
// tarjeta gráfica se suelta su copia en memoria (decenas de MB en un móvil).
const soltarCopia = t => { t.image = { width: t.image.width, height: t.image.height, data: null }; t.onUpdate = null; };
export function texturaPlaneta(tipo, opciones, { claves = ['pixeles'], relleno = [120, 110, 140], bloquea = true, liberable = false } = {}) {
  const { ancho, alto } = opciones;
  const texturas = Object.fromEntries(claves.map(c => [c, dataTextura(ancho, alto, relleno)]));
  const promesa = new Promise(resolve => {
    const clave = `${tipo} ${ancho}×${alto}`; enCurso.set(promesas.length + todas.length + Math.random(), clave);
    const marca = [...enCurso.keys()].at(-1);
    // Nunca deja la carga colgada: si rellenar la textura falla (datos que no encajan, una copia ya soltada…), se anota el
    // error, la textura se queda con su color de relleno y la carga sigue. Antes la promesa no se resolvía nunca.
    let hecho = false;
    const pedido = { tipo, opciones, resolver: datos => {
      if (hecho) return; hecho = true;
      try {
        for (const c of claves) { const t = texturas[c]; if (!t.image.data || !datos?.[c] || datos[c].length !== t.image.data.length) throw new Error(`${clave}: datos que no encajan (${datos?.[c]?.length} para ${t.image.data?.length})`);
          t.image.data.set(datos[c]); t.needsUpdate = true; t.userData.lista = performance.now(); if (liberable) t.onUpdate = soltarCopia; }
      } catch (e) { errores.push(String(e.message || e)); console.warn('Textura', e); }
      enCurso.delete(marca); resolve();
    } };
    const enviar = () => { iniciarObreros(); (bloquea ? colaBloquea : colaResto).push(pedido); despachar(); };
    // A la cola (las que no bloquean la carga, detrás de las imprescindibles: no retrasan la entrada).
    enviar();
  });
  if (bloquea) promesas.push(promesa);
  todas.push(promesa);
  return claves.length === 1 ? texturas[claves[0]] : texturas;
}

export const texturasListas = () => Promise.all(promesas);
// Todas, también las que no bloquean (nebulosas del viaje…): la carga completa espera a que estén calculadas, así
// nada se genera ni se sube a la GPU durante un viaje. alAvance(hechas, total) informa del progreso.
export function texturasTodas(alAvance = () => {}) {
  let hechas = 0; const total = todas.length;
  return Promise.all(todas.map(p => p.then(() => alAvance(++hechas, total))));
}
