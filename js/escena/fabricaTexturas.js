// Pide las texturas de los planetas al Web Worker y devuelve DataTextures que se rellenan
// al llegar. Si el navegador no admite workers de módulo (o fallan), se calculan aquí.
// `texturasListas()` resuelve cuando todas están rellenas: la pantalla de carga la espera.
import * as THREE from 'three';
import { GENERADORES } from './texturasPlaneta.js';

// Varios workers en paralelo (uno por núcleo libre, hasta 4): las texturas se calculan a la vez
// durante la presentación y al entrar ya está todo.
let obreros, siguiente = 0, turno = 0, diferidos = null;
const pendientes = new Map(), promesas = [], todas = [];
// En el móvil, dos como mucho: junto con el obrero de la telaraña y el hilo principal no se satura el procesador
// (en un iPhone, más hilos a la vez solo calentaban y retrasaban todo).
const movil = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
const NUM_OBREROS = Math.max(1, Math.min(movil ? 2 : 4, (navigator.hardwareConcurrency || 2) - 1));
let ultimaRespuesta = performance.now();

// Respaldo en el hilo principal: de una en una, cediendo entre ellas (calcularlas todas de golpe congelaba la página).
const colaAqui = [];
function aqui(pedido) { colaAqui.push(pedido); if (colaAqui.length === 1) setTimeout(siguienteAqui, 0); }
function siguienteAqui() { const p = colaAqui[0]; if (!p) return; calcularAqui(p); colaAqui.shift(); if (colaAqui.length) setTimeout(siguienteAqui, 0); }
function calcularAqui(pedido) {
  const r = GENERADORES[pedido.tipo](pedido.opciones);
  pedido.resolver(r instanceof Uint8ClampedArray ? { pixeles: r } : r);
}
function rescatar() {
  obreros = [];
  for (const pedido of pendientes.values()) aqui(pedido);
  pendientes.clear();
}
function obtenerObrero() {
  if (!obreros) {
    obreros = [];
    try {
      for (let i = 0; i < NUM_OBREROS; i++) {
        const w = new Worker(new URL('./obreroTexturas.js', import.meta.url), { type: 'module' });
        w.onmessage = ({ data: { id, datos, error } }) => {
          ultimaRespuesta = w.ultima = performance.now();
          const pedido = pendientes.get(id); if (!pedido) return;
          pendientes.delete(id);
          if (error) aqui(pedido); else pedido.resolver(datos);
        };
        w.onerror = e => { e.preventDefault?.(); rescatar(); };
        obreros.push(w);
      }
    } catch { obreros = []; }
  }
  return obreros.length ? obreros[turno++ % obreros.length] : false;
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
    const pedido = { tipo, opciones, resolver: datos => {
      for (const c of claves) { texturas[c].image.data.set(datos[c]); texturas[c].needsUpdate = true; texturas[c].userData.lista = performance.now(); if (liberable) texturas[c].onUpdate = soltarCopia; }
      resolve();
    } };
    const enviar = () => {
      const w = obtenerObrero();
      if (!w) { aqui(pedido); return; }
      const id = ++siguiente; pendientes.set(id, pedido); w.ultima ??= performance.now();
      w.postMessage({ id, tipo, opciones });
      // Red de seguridad: si SU obrero deja de contestar (muerto, no lento), se calcula aquí. Antes contaba la respuesta de
      // cualquier obrero y esperaba solo 15 s: en un iPhone una textura grande tarda más, se repetía el cálculo en el hilo
      // principal (la carga se congelaba en el 85 % y el teléfono se calentaba); y si un obrero moría mientras el otro
      // seguía contestando, no saltaba nunca y la carga no terminaba.
      const vigilar = () => { if (!pendientes.has(id)) return; if (performance.now() - w.ultima < 45000) { setTimeout(vigilar, 5000); return; } pendientes.delete(id); aqui(pedido); };
      setTimeout(vigilar, 45000);
    };
    // El worker atiende los pedidos en orden: los que no bloquean la carga esperan a que
    // terminen los imprescindibles (así no retrasan la entrada).
    if (bloquea) enviar();
    else {
      if (!diferidos) { diferidos = []; setTimeout(() => Promise.all(promesas).then(() => { const lista = diferidos; diferidos = null; lista.forEach(f => f()); })); }
      diferidos.push(enviar);
    }
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
