// «El mapa de nosotros»: los lugares del universo en tres niveles, de lo más cercano a lo más lejano, cada uno en su
// tarjeta y numerado (ZONAS_LUGARES, js/data/universo.js, dice dónde está cada lugar de verdad):
//  1 · Dentro de nuestro sistema solar: el Sol y las órbitas de sus lugares, de dentro afuera.
//  2 · En la galaxia de Xiomara: la galaxia vista desde arriba, sus lugares donde están y el punto dorado del sistema
//      solar en su brazo (con un hilo hasta la tarjeta de arriba: es su ampliación).
//  3 · Más allá de la galaxia de Xiomara: Xiomara pequeñita en el centro y los seis grandes alrededor, cada uno en su
//      dirección real vista desde arriba (js/data/sitios.js); las distancias no van a escala (están a ~1000 millones de
//      años luz; Deneb, al triple, un poco más afuera).
// El actual lleva un anillo, los visitados su nombre y los pendientes son siluetas sin desvelar. Solo trazos y motas
// nítidas: nada de degradados.
import { DESTINOS, LEJANOS, ZONAS_LUGARES, lugaresDeZona } from '../data/universo.js';
import { posicionDestino } from '../data/sitios.js';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, padre) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); padre?.append(n); return n; };
class V3 { constructor(x, y, z) { this.x = x; this.y = y; this.z = z; } multiplyScalar(k) { this.x *= k; this.y *= k; this.z *= k; return this; } }

export const ZONAS_MAPA = { solar: lugaresDeZona('solar'), galaxia: lugaresDeZona('galaxia'), lejos: lugaresDeZona('fuera') };

// Lienzo de 320 de ancho: tres tarjetas apiladas.
const ANCHO = 320, ALTO = 640;
const CAJA_SOLAR = { x: 8, y: 24, w: 304, h: 84 }, SOL = { x: 26, y: 62 };
const CAJA_GALAXIA = { x: 8, y: 138, w: 304, h: 214 }, GALAXIA = { x: 160, y: 247, r: 90 }, RADIO_MUNDO = 3350;   // u del mundo que caben en el radio del disco
const CAJA_LEJOS = { x: 8, y: 382, w: 304, h: 252 }, CENTRO_LEJOS = { x: 160, y: 512 }, ELIPSE = { rx: 104, ry: 82 };

// Nombres partidos en líneas cortas (el lienzo es estrecho en el móvil): en dos líneas equilibradas
// si caben («Dos orillas, / un cielo» y no «Dos orillas, un / cielo»); si no, llenando cada una.
function lineas(texto, max = 15) {
  const p = texto.split(' ');
  if (texto.length <= max) return [texto];
  if (texto.length <= 2 * max + 4) {
    let mejor = null;
    for (let i = 1; i < p.length; i++) { const l = [p.slice(0, i).join(' '), p.slice(i).join(' ')], m = Math.max(l[0].length, l[1].length); if (!mejor || m < mejor.m) mejor = { l, m }; }
    if (mejor && mejor.m <= max + 5) return mejor.l;
  }
  const salida = [];
  for (const q of p) { const u = salida.length - 1; if (u >= 0 && (salida[u] + ' ' + q).length <= max) salida[u] += ' ' + q; else salida.push(q); }
  return salida;
}
function etiqueta(padre, x, y, texto, max = 15, clase = 'mapa-nombre') {
  const t = svg('text', { x, y, class: clase }, padre);
  lineas(texto, max).forEach((l, i) => { const s = svg('tspan', { x, dy: i ? '1.15em' : 0 }, t); s.textContent = l; });
  return t;
}
// Azar fijo para las motas: el dibujo es el mismo cada vez que se abre.
function azarFijo(semilla) { let s = semilla; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// Una tarjeta de nivel: marco, número y título.
function nivel(fondo, caja, numero, titulo) {
  svg('rect', { x: caja.x, y: caja.y, width: caja.w, height: caja.h, rx: 14, class: 'mapa-caja' }, fondo);
  svg('circle', { cx: caja.x + 9, cy: caja.y - 9.5, r: 6, class: 'mapa-numero-aro' }, fondo);
  svg('text', { x: caja.x + 9, y: caja.y - 7.2, class: 'mapa-numero' }, fondo).textContent = numero;
  svg('text', { x: caja.x + 20, y: caja.y - 7.3, class: 'mapa-zona' }, fondo).textContent = titulo;
}
// Una espiral de motas nítidas (la galaxia de Xiomara), del radio que se pida.
function espiral(padre, cx, cy, r, azar, { motas = 120, bulbo = 40, tam = 1 } = {}) {
  for (let brazo = 0; brazo < 2; brazo++) for (let i = 0; i < motas; i++) {
    const f = i / motas, a = brazo * Math.PI + f * 3.4 + (azar() - 0.5) * 0.35;
    const rr = (0.08 + f * 0.88) * r + (azar() - 0.5) * r * 0.1 * (0.4 + f);
    svg('circle', { cx: (cx + Math.cos(a) * rr).toFixed(1), cy: (cy + Math.sin(a) * rr).toFixed(1), r: ((0.4 + azar() * 0.55 * (1 - f * 0.5)) * tam).toFixed(2), class: 'mapa-mota' }, padre);
  }
  for (let i = 0; i < bulbo; i++) { const a = azar() * Math.PI * 2, rr = Math.sqrt(azar()) * r * 0.11; svg('circle', { cx: (cx + Math.cos(a) * rr).toFixed(1), cy: (cy + Math.sin(a) * rr).toFixed(1), r: ((0.4 + azar() * 0.5) * tam).toFixed(2), class: 'mapa-mota mapa-bulbo' }, padre); }
}

export function crearMapa({ escena, progreso, actual, visitar }) {
  const lienzo = $('mapa-svg');
  lienzo.setAttribute('viewBox', `0 0 ${ANCHO} ${ALTO}`);

  // El fondo no cambia entre aperturas: se dibuja una vez y los lugares encima, cada vez.
  const fondo = svg('g', { 'aria-hidden': 'true' }, lienzo), capaLugares = svg('g', {}, lienzo);
  const defs = svg('defs', {}, fondo);
  const recorte = svg('clipPath', { id: 'mapa-recorte-solar' }, defs);
  svg('rect', { x: CAJA_SOLAR.x, y: CAJA_SOLAR.y, width: CAJA_SOLAR.w, height: CAJA_SOLAR.h, rx: 14 }, recorte);
  const azar = azarFijo(7);

  // ── 1 · Dentro de nuestro sistema solar: el Sol a la izquierda y las órbitas de sus lugares ──
  nivel(fondo, CAJA_SOLAR, '1', 'Dentro de nuestro sistema solar');
  const orbitas = svg('g', { 'clip-path': 'url(#mapa-recorte-solar)' }, fondo);
  const n = ZONAS_MAPA.solar.length, paso = (CAJA_SOLAR.x + CAJA_SOLAR.w - 34 - SOL.x - 62) / Math.max(1, n - 1);
  const radiosSolar = ZONAS_MAPA.solar.map((_, i) => 62 + i * paso);
  for (const r of radiosSolar) svg('circle', { cx: SOL.x, cy: SOL.y, r, class: 'mapa-orbita' }, orbitas);
  // El cinturón de asteroides (entre la Tierra y el gigante) y, más allá del gigante, el de Kuiper: motas sueltas.
  for (const [r0, r1, cuantas] of [[radiosSolar[2] + 12, radiosSolar[3] - 12, 46], [radiosSolar[3] + 14, radiosSolar[3] + 40, 40]]) {
    for (let i = 0; i < cuantas; i++) { const r = r0 + azar() * (r1 - r0), a = (azar() - 0.5) * 1.1; svg('circle', { cx: (SOL.x + Math.cos(a) * r).toFixed(1), cy: (SOL.y + Math.sin(a) * r).toFixed(1), r: (0.3 + azar() * 0.35).toFixed(2), class: 'mapa-mota-lejana' }, orbitas); }
  }
  svg('circle', { cx: SOL.x, cy: SOL.y, r: 6.5, class: 'mapa-sol' }, fondo);
  for (let i = 0; i < 8; i++) {   // rayos del Sol: trazos cortos y nítidos
    const a = i / 8 * Math.PI * 2;
    svg('line', { x1: SOL.x + Math.cos(a) * 9, y1: SOL.y + Math.sin(a) * 9, x2: SOL.x + Math.cos(a) * 12.5, y2: SOL.y + Math.sin(a) * 12.5, class: 'mapa-rayo' }, fondo);
  }
  svg('text', { x: SOL.x, y: SOL.y + 24, class: 'mapa-pie' }, fondo).textContent = 'el Sol';

  // ── 2 · En la galaxia de Xiomara: el disco desde arriba, con dos brazos de motas nítidas ──
  nivel(fondo, CAJA_GALAXIA, '2', 'En la galaxia de Xiomara');
  svg('circle', { cx: GALAXIA.x, cy: GALAXIA.y, r: GALAXIA.r, class: 'mapa-borde-galaxia' }, fondo);
  espiral(fondo, GALAXIA.x, GALAXIA.y, GALAXIA.r, azar);
  // Cenital (x, z) del mundo en el disco. Lo de fuera del radio (el cometa) se queda en el borde.
  const enGalaxia = (x, z, dentro = 1) => {
    let u = x / RADIO_MUNDO * GALAXIA.r, v = z / RADIO_MUNDO * GALAXIA.r; const l = Math.hypot(u, v), max = GALAXIA.r * dentro;
    if (l > max) { u *= max / l; v *= max / l; }
    return [GALAXIA.x + u, GALAXIA.y + v];
  };
  // Dónde está el sistema solar en su brazo: el centro de las marcas `mapa` de sus lugares. Un punto dorado (como en el
  // cielo) y un hilo hasta la tarjeta de arriba, que es su ampliación.
  const marcas = ZONAS_MAPA.solar.filter(d => d.mapa);
  const [sx, sy] = enGalaxia(marcas.reduce((s, d) => s + d.mapa[0], 0) / marcas.length, marcas.reduce((s, d) => s + d.mapa[1], 0) / marcas.length);
  svg('line', { x1: sx, y1: sy - 5, x2: sx, y2: CAJA_SOLAR.y + CAJA_SOLAR.h, class: 'mapa-ampliacion' }, fondo);
  svg('circle', { cx: sx, cy: sy, r: 4.6, class: 'mapa-marca-solar' }, fondo);
  svg('circle', { cx: sx, cy: sy, r: 2, class: 'mapa-sol' }, fondo);
  svg('text', { x: sx - 7, y: sy + 2.4, class: 'mapa-pie mapa-pie-izq' }, fondo).textContent = 'sistema solar';

  // ── 3 · Más allá de la galaxia de Xiomara: Xiomara en el centro y los seis grandes en su dirección real ──
  nivel(fondo, CAJA_LEJOS, '3', 'Más allá de la galaxia de Xiomara');
  for (let i = 0; i < 80; i++) {   // polvo de galaxias lejanas: motas sueltas
    const x = CAJA_LEJOS.x + 6 + azar() * (CAJA_LEJOS.w - 12), y = CAJA_LEJOS.y + 8 + azar() * (CAJA_LEJOS.h - 14);
    if (Math.hypot(x - CENTRO_LEJOS.x, y - CENTRO_LEJOS.y) < 22) continue;
    svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (0.3 + azar() * 0.4).toFixed(2), class: 'mapa-mota-lejana' }, fondo);
  }
  espiral(fondo, CENTRO_LEJOS.x, CENTRO_LEJOS.y, 15, azar, { motas: 28, bulbo: 10, tam: 0.75 });
  svg('text', { x: CENTRO_LEJOS.x, y: CENTRO_LEJOS.y + 25, class: 'mapa-pie' }, fondo).textContent = 'Xiomara';
  svg('text', { x: CAJA_LEJOS.x + CAJA_LEJOS.w / 2, y: CAJA_LEJOS.y + CAJA_LEJOS.h - 7, class: 'mapa-pie' }, fondo).textContent = 'cada uno en su dirección · distancias sin escala';

  // Posición de cada lugar en su nivel.
  const lugaresFijos = [];
  ZONAS_MAPA.solar.forEach((d, i) => {
    // Cada uno sobre su órbita, un poco por encima del eje del Sol (alternando) para dejar sitio a dos líneas de nombre.
    const dy = [-8, -3, -10, -5][i % 4], a = Math.asin(dy / radiosSolar[i]);
    lugaresFijos.push({ ...d, zona: 'solar', x: SOL.x + Math.cos(a) * radiosSolar[i], y: SOL.y + dy });
  });
  for (const d of ZONAS_MAPA.galaxia) { const [x, y] = enGalaxia(d.posicion[0], d.posicion[2], 0.92); lugaresFijos.push({ ...d, zona: 'galaxia', x, y }); }
  // Los grandes: dirección real desde Xiomara vista desde arriba (x, z del mundo, como el disco de la tarjeta 2), sobre
  // una elipse; Deneb, tres veces más lejos que los demás, un poco más afuera.
  for (const d of ZONAS_MAPA.lejos) {
    const p = posicionDestino(d.id, V3), l = Math.hypot(p.x, p.z) || 1, k = d.id === 'deneb' ? 1.12 : 1;
    const ux = p.x / l, uz = p.z / l;
    lugaresFijos.push({ ...d, zona: 'lejos', x: CENTRO_LEJOS.x + ux * ELIPSE.rx * k, y: CENTRO_LEJOS.y + uz * ELIPSE.ry * k, ux, uz });
  }
  // Hilos desde Xiomara hacia cada gigante.
  for (const d of lugaresFijos.filter(d => d.zona === 'lejos')) {
    svg('line', { x1: CENTRO_LEJOS.x + d.ux * 19, y1: CENTRO_LEJOS.y + d.uz * 17, x2: d.x - d.ux * 10, y2: d.y - d.uz * 10, class: 'mapa-camino' }, fondo);
  }

  function dibujar() {
    capaLugares.replaceChildren();
    const visitados = progreso.estado.visitas, aquiId = actual();
    const lugares = [...lugaresFijos];
    if (escena.cometaVisible) { const c = escena.posicionCometa?.(); if (c) { const [x, y] = enGalaxia(c.x, c.z, 0.97); lugares.push({ id: 'cometa', nombre: 'El cometa', color: '#fff1d2', zona: 'galaxia', x, y }); } }
    for (const d of lugares) {
      const aqui = d.id === aquiId, conocido = aqui || d.id === 'hogar' || d.id === 'cometa' || visitados.includes(d.id);
      const nombre = d.id === 'hogar' ? 'Nuestro pequeño infinito' : d.nombre;
      const g = svg('g', { class: `mapa-lugar mapa-${d.zona}${conocido ? '' : ' pendiente'}${aqui ? ' aqui' : ''}`, tabindex: '0', role: 'button', 'aria-label': conocido ? `Viajar a ${nombre}` : 'Viajar a un lugar por descubrir' }, capaLugares);
      svg('circle', { cx: d.x, cy: d.y, r: 15, class: 'mapa-toque' }, g);   // zona de toque amplia para el dedo
      if (aqui) svg('circle', { cx: d.x, cy: d.y, r: 10.5, class: 'mapa-aqui' }, g);
      const r = d.zona === 'lejos' ? 5.5 : d.id === 'hogar' ? 4 : 4.6;
      if (d.zona === 'lejos' && conocido) svg('circle', { cx: d.x, cy: d.y, r: r + 2.6, class: 'mapa-aro' }, g);   // los gigantes, con un aro fino
      svg('circle', { cx: d.x, cy: d.y, r: conocido ? r : r + 0.8, fill: conocido ? d.color : 'none', class: 'mapa-punto' }, g);
      if (!conocido) svg('text', { x: d.x, y: d.y + 2.8, class: 'mapa-interrogante' }, g).textContent = '?';
      // En la tarjeta 3, el nombre va hacia fuera (debajo de los de abajo, encima de los de arriba): no pisa los hilos.
      const texto = aqui ? 'Estás aquí' : conocido ? nombre : 'Por descubrir', arriba = d.zona === 'lejos' && d.uz < -0.35, max = d.zona === 'lejos' ? 17 : 15;
      etiqueta(g, d.x, arriba ? d.y - 11 - (lineas(texto, max).length - 1) * 9.2 : d.y + (d.zona === 'lejos' ? 15.5 : 13), texto, max);
      const ir = () => { cerrar(); if (!aqui) visitar(d.id); };
      g.addEventListener('click', ir); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } });
    }
    const lista = [...DESTINOS, ...LEJANOS].filter(d => d.id !== 'hogar'), vistos = lista.filter(d => visitados.includes(d.id)).length;
    $('mapa-resumen').textContent = vistos === lista.length ? 'Has visitado todos los lugares ♡' : `${vistos} de ${lista.length} lugares descubiertos`;
  }
  function abrir() { dibujar(); $('mapa').hidden = false; $('btn-mapa').setAttribute('aria-expanded', 'true'); }
  function cerrar() { $('mapa').hidden = true; $('btn-mapa').setAttribute('aria-expanded', 'false'); }
  $('btn-mapa').addEventListener('click', e => { e.stopPropagation(); $('mapa').hidden ? abrir() : cerrar(); });
  $('mapa-cerrar').addEventListener('click', cerrar);
  document.addEventListener('pointerdown', e => { if (!$('mapa').hidden && !e.target.closest('#mapa, #btn-mapa')) cerrar(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('mapa').hidden) cerrar(); });
  return { abrir, cerrar, zonas: ZONAS_LUGARES };
}
