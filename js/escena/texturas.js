// Texturas generadas con canvas (sin descargar imágenes)
import * as THREE from 'three';
import { lienzo, trazarCorazon } from '../util/dibujo.js';
import { crearRuido } from '../util/ruido.js';
import { deUnTiron } from '../util/azarSemilla.js';

// Sin conversión de color: la cadena de post-procesado muestra los valores tal cual,
// así los colores del canvas se ven exactamente como se dibujaron.
export function aTextura(c) {
  return new THREE.CanvasTexture(c);
}

// Lienzo para texturas de luz (se usan con mezcla aditiva). Fondo negro OPACO: la luz
// va en el color y el alfa es 1. Con fondo transparente, el canvas guarda el color
// premultiplicado en 8 bits y al subirlo a WebGL se divide por un alfa casi nulo;
// en Safari, que trama los degradados, eso convertía el borde de cada brillo en
// puntitos rojos, verdes, azules y violetas. Con aditivo, el negro no suma nada.
export function lienzoLuz(ancho, alto = ancho) {
  const [c, x] = lienzo(ancho, alto);
  x.fillStyle = '#000'; x.fillRect(0, 0, ancho, alto);
  return [c, x];
}

// Brillo suave y redondo
let brilloCompartido, destelloCompartido;
export function texBrillo() {
  if (brilloCompartido) return brilloCompartido;
  const [c, x] = lienzoLuz(128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  // Caída suave (casi gaussiana) hasta cero: sin borde de círculo visible al agrandarse.
  for (const [p, v] of [[0, 1], [0.12, 0.62], [0.28, 0.25], [0.45, 0.08], [0.62, 0.025], [0.8, 0.006], [1, 0]]) g.addColorStop(p, `rgba(255,255,255,${v})`);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return (brilloCompartido = aTextura(c));
}

// Estrella brillante con destellos en cruz (como en las fotos del telescopio)
export function texDestello() {
  if (destelloCompartido) return destelloCompartido;
  const S = 256, [c, x] = lienzoLuz(S);
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [p, v] of [[0, 1], [0.05, 0.85], [0.14, 0.22], [0.3, 0.05], [0.6, 0.008], [1, 0]]) g.addColorStop(p, `rgba(255,255,255,${v})`);
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const rayo = (ancho, ang) => {
    x.save(); x.translate(S / 2, S / 2); x.rotate(ang);
    const l = x.createLinearGradient(-S / 2, 0, S / 2, 0);
    l.addColorStop(0, 'rgba(255,255,255,0)');
    l.addColorStop(0.5, 'rgba(255,255,255,.85)');
    l.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = l; x.fillRect(-S / 2, -ancho / 2, S, ancho);
    x.restore();
  };
  rayo(1.6, 0); rayo(1.6, Math.PI / 2);   // solo una cruz fina (sin las diagonales)
  return (destelloCompartido = aTextura(c));
}

// Estrella secreta: brillo con un corazón en el centro
export function texCorazonBrillo() {
  // Estrella con destellos finos y un corazón nítido (nada de halo redondo tipo burbuja)
  const S = 128, [c, x] = lienzoLuz(S);
  x.globalCompositeOperation = 'lighter';
  const rayo = (largo, ancho, ang) => {
    x.save(); x.translate(64, 64); x.rotate(ang);
    const l = x.createLinearGradient(-largo, 0, largo, 0);
    l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.5, 'rgba(255,255,255,.9)'); l.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = l; x.fillRect(-largo, -ancho / 2, largo * 2, ancho);
    x.restore();
  };
  rayo(62, 2.2, 0); rayo(62, 2.2, Math.PI / 2); rayo(30, 1.4, Math.PI / 4); rayo(30, 1.4, -Math.PI / 4);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 26);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 6;
  trazarCorazon(x, 64, 66, 30); x.fill();
  return aTextura(c);
}

// Texto luminoso como textura (para etiquetas). Se usa con mezcla aditiva: ver lienzoLuz.
export function texTexto(texto, { fuente = "600 64px 'Quicksand', sans-serif", color = '#ffd6ea', sombra = '#ff4f97', ancho = 1024, alto = 160 } = {}) {
  const [c, x] = lienzoLuz(ancho, alto);
  x.font = fuente; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = sombra; x.shadowBlur = 18; x.fillStyle = color;
  x.fillText(texto, ancho / 2, alto / 2);
  x.shadowBlur = 0; x.fillText(texto, ancho / 2, alto / 2);
  return aTextura(c);
}

// Sobre de carta dibujado (papel crema, solapa y sello con corazón). Se sube con el
// alfa premultiplicado y se dibuja con mezcla premultiplicada: bordes limpios en Safari.
let sobreCompartido;
export function texSobre() {
  if (sobreCompartido) return sobreCompartido;
  const S = 256, [c, x] = lienzo(S);
  const ancho = 200, alto = 136, izq = (S - ancho) / 2, arriba = (S - alto) / 2 + 8, r = 14;
  x.shadowColor = 'rgba(255,150,200,.75)'; x.shadowBlur = 22;
  x.fillStyle = '#fff3ea';
  x.beginPath(); x.roundRect(izq, arriba, ancho, alto, r); x.fill();
  x.shadowBlur = 0;
  // Solapas
  x.strokeStyle = '#e0a3bd'; x.lineWidth = 5; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(izq + 8, arriba + 10); x.lineTo(S / 2, arriba + alto * 0.58); x.lineTo(izq + ancho - 8, arriba + 10); x.stroke();
  x.beginPath(); x.moveTo(izq + 8, arriba + alto - 8); x.lineTo(S / 2 - 28, arriba + alto * 0.5);
  x.moveTo(izq + ancho - 8, arriba + alto - 8); x.lineTo(S / 2 + 28, arriba + alto * 0.5); x.stroke();
  x.strokeStyle = '#efc7d6'; x.lineWidth = 4;
  x.beginPath(); x.roundRect(izq, arriba, ancho, alto, r); x.stroke();
  // Sello
  x.fillStyle = '#e84d8a'; x.shadowColor = 'rgba(232,77,138,.6)'; x.shadowBlur = 8;
  trazarCorazon(x, S / 2, arriba + alto * 0.6, 40); x.fill();
  const t = aTextura(c);
  t.premultiplyAlpha = true;
  return (sobreCompartido = t);
}

// Flor de luz: seis pétalos con nervio central y un corazón brillante (se tiñe con el
// color de cada flor; lienzo opaco para mezcla aditiva, ver lienzoLuz).
let florCompartida;
export function texFlor() {
  if (florCompartida) return florCompartida;
  const S = 256, [c, x] = lienzoLuz(S), m = S / 2;
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    x.save(); x.translate(m, m); x.rotate(i * Math.PI / 3);
    const g = x.createLinearGradient(0, 0, 0, -m * 0.92);
    g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.55, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,.08)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, -6);
    x.bezierCurveTo(m * 0.36, -m * 0.3, m * 0.24, -m * 0.8, 0, -m * 0.92);
    x.bezierCurveTo(-m * 0.24, -m * 0.8, -m * 0.36, -m * 0.3, 0, -6); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, -10); x.lineTo(0, -m * 0.7); x.stroke();
    x.restore();
  }
  const g = x.createRadialGradient(m, m, 0, m, m, m * 0.28);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return (florCompartida = aTextura(c));
}

// Partícula de polvo alargada para colas de cometa y corrientes de luz.
let polvoCompartido;
export function texPolvo() {
  if (polvoCompartido) return polvoCompartido;
  const S = 64, [c, x] = lienzoLuz(S);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.45)'); g.addColorStop(0.6, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return (polvoCompartido = aTextura(c));
}

// Aro de luz fino (ondas que señalan un punto).
let anilloCompartido;
export function texAnillo() {
  if (anilloCompartido) return anilloCompartido;
  const S = 256, [c, x] = lienzoLuz(S);
  const g = x.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return (anilloCompartido = aTextura(c));
}

// Nube de nebulosa: ruido fbm en un lienzo opaco (se tiñe y se suma con mezcla aditiva).
const nebulosas = new Map();
export function texNebulosa(semilla = 0) { return deUnTiron(prepararTexNebulosa(semilla)); }
// La misma por tramos (un generador, con yield cada 16 filas).
export function* prepararTexNebulosa(semilla = 0) {
  if (nebulosas.has(semilla)) return nebulosas.get(semilla);
  const S = 192, [c, x] = lienzoLuz(S), img = x.getImageData(0, 0, S, S), d = img.data;
  const { fbm } = crearRuido(semilla + 3);
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    if (px === 0 && py % 16 === 15) yield;
    const u = px / S - 0.5, v = py / S - 0.5, r = Math.hypot(u, v) * 2;
    // Borde deshilachado (el ruido decide dónde acaba la nube) y filamentos finos: nada de bolas.
    const n = fbm(u * 3 + semilla, v * 3, 0.5, 5), filamento = fbm(u * 10, v * 10 + semilla, 2.1, 4);
    const borde = Math.max(0, 1 - r * (1.1 + (n - 0.5) * 1.6));
    const k = Math.max(0, Math.pow(Math.max(0, n - 0.38) * 2.6, 2.4) * borde * 1.8 + Math.pow(Math.max(0, filamento - 0.5) * 2, 2) * borde * 0.9) * 255;
    const j = (py * S + px) * 4; d[j] = d[j + 1] = d[j + 2] = Math.min(255, k);
  }
  x.putImageData(img, 0, 0);
  const t = aTextura(c); nebulosas.set(semilla, t); return t;
}

// Ala de mariposa de luz (se usa reflejada para la otra ala).
let alaCompartida;
export function texAla() {
  if (alaCompartida) return alaCompartida;
  const S = 128, [c, x] = lienzoLuz(S);
  x.globalCompositeOperation = 'lighter';
  const ala = (cx, cy, rx, ry, rot, a) => {
    x.save(); x.translate(cx, cy); x.rotate(rot);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.7, `rgba(255,255,255,${a * 0.45})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.scale(1, ry / rx); x.beginPath(); x.arc(0, 0, rx, 0, Math.PI * 2); x.fill(); x.restore();
  };
  ala(52, 46, 46, 30, -0.5, 0.95); ala(44, 84, 32, 22, 0.45, 0.8);
  x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(0, 50, 6, 30);
  return (alaCompartida = aTextura(c));
}

// Flor de cinco pétalos redondeados (alterna con la de seis pétalos finos).
let florRedondaCompartida;
export function texFlorRedonda() {
  if (florRedondaCompartida) return florRedondaCompartida;
  const S = 256, [c, x] = lienzoLuz(S), m = S / 2;
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 - Math.PI / 2, cx = m + Math.cos(a) * m * 0.42, cy = m + Math.sin(a) * m * 0.42;
    // Pétalo con borde definido y una vena central (antes, un degradado borroso).
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, m * 0.42);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.65, 'rgba(255,255,255,.6)'); g.addColorStop(0.9, 'rgba(255,255,255,.42)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, m * 0.4, m * 0.33, a, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 2; x.beginPath(); x.moveTo(m, m); x.lineTo(m + Math.cos(a) * m * 0.7, m + Math.sin(a) * m * 0.7); x.stroke();
  }
  const g = x.createRadialGradient(m, m, 0, m, m, m * 0.25);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return (florRedondaCompartida = aTextura(c));
}

// Estrella brillante con destellos de difracción: cuatro largos y cuatro cortos, y halo.
let gigantaCompartida;
export function texEstrellaGigante() {
  if (gigantaCompartida) return gigantaCompartida;
  const S = 256, [c, x] = lienzoLuz(S), m = S / 2;
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(m, m, 0, m, m, m);
  for (const [p, v] of [[0, 1], [0.04, 0.85], [0.12, 0.2], [0.3, 0.035], [0.6, 0.006], [1, 0]]) g.addColorStop(p, `rgba(255,255,255,${v})`);
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const rayo = (largo, ancho, ang, a) => {
    x.save(); x.translate(m, m); x.rotate(ang);
    const l = x.createLinearGradient(-largo, 0, largo, 0);
    l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.5, `rgba(255,255,255,${a})`); l.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = l; x.beginPath(); x.moveTo(-largo, 0); x.lineTo(0, -ancho); x.lineTo(largo, 0); x.lineTo(0, ancho); x.fill(); x.restore();
  };
  rayo(m, 1.8, 0, 0.8); rayo(m, 1.8, Math.PI / 2, 0.8);   // cruz fina, sin rayos en diagonal
  return (gigantaCompartida = aTextura(c));
}
