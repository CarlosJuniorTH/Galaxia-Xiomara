// «El mapa de nosotros»: los lugares del universo en tres zonas, de lo más cercano a lo más lejano.
// Arriba, nuestro sistema solar ampliado en un recuadro (el Sol y las órbitas de sus lugares); en el
// centro, nuestra galaxia vista desde arriba con sus lugares donde están de verdad; y alrededor, más
// allá de su borde, los gigantes lejanos. El actual lleva un anillo, los visitados su nombre y los
// pendientes son siluetas sin desvelar. Solo trazos y motas nítidas: nada de degradados.
import { DESTINOS, LEJANOS } from '../data/universo.js';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, padre) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); padre?.append(n); return n; };

// Los lugares que viven en la escena del sistema solar (los mismos que SOLARES en escena/index.js),
// de dentro afuera por el radio de su órbita (planetas.js): el planeta rosa (1601), la luna del correo
// (1991), la Tierra (2298) y el gigante (4157). El gigante está en el sistema solar, no lejos.
const SOLARES = ['rosa', 'cartas', 'azul', 'gigante'];
const todos = [...DESTINOS, ...LEJANOS];
export const ZONAS_MAPA = {
  solar: SOLARES.map(id => todos.find(d => d.id === id)).filter(Boolean),
  galaxia: DESTINOS.filter(d => !SOLARES.includes(d.id)),
  lejos: LEJANOS.filter(d => !SOLARES.includes(d.id))
};

// Lienzo de 320 × 422: recuadro solar arriba y, debajo, la galaxia rodeada por la zona lejana.
const ANCHO = 320, ALTO = 422;
const CAJA_SOLAR = { x: 8, y: 22, w: 304, h: 80 }, SOL = { x: 24, y: 56 };
const LEJOS = { x: 8, y: 118, w: 304, h: 300 };
const GALAXIA = { x: 160, y: 258, r: 90 }, RADIO_MUNDO = 3350;   // u del mundo que caben en el radio del disco
const ORBITA_LEJOS = 134;                                      // los gigantes, más allá del borde

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
function etiqueta(padre, x, y, texto, clase = 'mapa-nombre') {
  const t = svg('text', { x, y, class: clase }, padre);
  lineas(texto).forEach((l, i) => { const s = svg('tspan', { x, dy: i ? '1.15em' : 0 }, t); s.textContent = l; });
  return t;
}
// Azar fijo para las motas de los brazos: el dibujo es el mismo cada vez que se abre.
function azarFijo(semilla) { let s = semilla; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function crearMapa({ escena, progreso, actual, visitar }) {
  const lienzo = $('mapa-svg');
  lienzo.setAttribute('viewBox', `0 0 ${ANCHO} ${ALTO}`);

  // El fondo no cambia entre aperturas: se dibuja una vez y los lugares encima, cada vez.
  const fondo = svg('g', { 'aria-hidden': 'true' }, lienzo), capaLugares = svg('g', {}, lienzo);
  const defs = svg('defs', {}, fondo);
  const recorte = svg('clipPath', { id: 'mapa-recorte-solar' }, defs);
  svg('rect', { x: CAJA_SOLAR.x, y: CAJA_SOLAR.y, width: CAJA_SOLAR.w, height: CAJA_SOLAR.h, rx: 14 }, recorte);
  svg('path', { id: 'mapa-arco-galaxia', d: `M ${GALAXIA.x - GALAXIA.r - 7} ${GALAXIA.y} A ${GALAXIA.r + 7} ${GALAXIA.r + 7} 0 0 1 ${GALAXIA.x + GALAXIA.r + 7} ${GALAXIA.y}` }, defs);

  // ── Más allá de nuestra galaxia: un marco que lo abarca todo alrededor del disco ──
  svg('rect', { x: LEJOS.x, y: LEJOS.y, width: LEJOS.w, height: LEJOS.h, rx: 16, class: 'mapa-zona-marco' }, fondo);
  svg('text', { x: LEJOS.x + 12, y: LEJOS.y + 16, class: 'mapa-zona' }, fondo).textContent = 'Más allá de nuestra galaxia';
  // Polvo de estrellas lejanas: motas sueltas en el marco, fuera del disco.
  const azar = azarFijo(7);
  for (let i = 0; i < 70; i++) {
    const x = LEJOS.x + 6 + azar() * (LEJOS.w - 12), y = LEJOS.y + 24 + azar() * (LEJOS.h - 30);
    if (Math.hypot(x - GALAXIA.x, y - GALAXIA.y) < GALAXIA.r + 10) continue;
    svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (0.35 + azar() * 0.4).toFixed(2), class: 'mapa-mota-lejana' }, fondo);
  }

  // ── Nuestra galaxia: borde, título en arco y dos brazos de motas nítidas ──
  svg('circle', { cx: GALAXIA.x, cy: GALAXIA.y, r: GALAXIA.r, class: 'mapa-borde-galaxia' }, fondo);
  const titulo = svg('text', { class: 'mapa-zona mapa-zona-arco' }, fondo);
  const tp = svg('textPath', { href: '#mapa-arco-galaxia', startOffset: '50%' }, titulo); tp.textContent = 'Nuestra galaxia';
  for (let brazo = 0; brazo < 2; brazo++) {
    for (let i = 0; i < 120; i++) {
      const f = i / 120, a = brazo * Math.PI + f * 3.4 + (azar() - 0.5) * 0.35;
      const r = (0.08 + f * 0.88) * GALAXIA.r + (azar() - 0.5) * 9 * (0.4 + f);
      svg('circle', { cx: (GALAXIA.x + Math.cos(a) * r).toFixed(1), cy: (GALAXIA.y + Math.sin(a) * r).toFixed(1), r: (0.4 + azar() * 0.55 * (1 - f * 0.5)).toFixed(2), class: 'mapa-mota' }, fondo);
    }
  }
  for (let i = 0; i < 40; i++) {   // el bulbo: un puñado de motas apretadas en el centro
    const a = azar() * Math.PI * 2, r = Math.sqrt(azar()) * 10;
    svg('circle', { cx: (GALAXIA.x + Math.cos(a) * r).toFixed(1), cy: (GALAXIA.y + Math.sin(a) * r).toFixed(1), r: (0.4 + azar() * 0.5).toFixed(2), class: 'mapa-mota' }, fondo);
  }
  // Cenital (x, z) del mundo en el disco. Lo de fuera del radio (el cometa) se queda en el borde.
  const enGalaxia = (x, z, dentro = 1) => {
    let u = x / RADIO_MUNDO * GALAXIA.r, v = z / RADIO_MUNDO * GALAXIA.r; const l = Math.hypot(u, v), max = GALAXIA.r * dentro;
    if (l > max) { u *= max / l; v *= max / l; }
    return [GALAXIA.x + u, GALAXIA.y + v];
  };
  // Dónde está el sistema solar en su brazo: el centro de las marcas `mapa` de sus lugares.
  const marcas = ZONAS_MAPA.solar.filter(d => d.mapa);
  const [sx, sy] = enGalaxia(marcas.reduce((s, d) => s + d.mapa[0], 0) / marcas.length, marcas.reduce((s, d) => s + d.mapa[1], 0) / marcas.length);
  // El recuadro es su ampliación: un hilo desde el punto del brazo hasta el borde inferior del recuadro.
  svg('line', { x1: sx, y1: sy - 4, x2: sx, y2: CAJA_SOLAR.y + CAJA_SOLAR.h, class: 'mapa-ampliacion' }, fondo);
  svg('rect', { x: sx - 4, y: sy - 4, width: 8, height: 8, rx: 1.5, class: 'mapa-marca-solar' }, fondo);

  // ── Nuestro sistema solar, ampliado: el Sol a la izquierda y las órbitas de sus lugares ──
  svg('text', { x: CAJA_SOLAR.x + 12, y: CAJA_SOLAR.y - 7, class: 'mapa-zona' }, fondo).textContent = 'Nuestro sistema solar';
  svg('rect', { x: CAJA_SOLAR.x, y: CAJA_SOLAR.y, width: CAJA_SOLAR.w, height: CAJA_SOLAR.h, rx: 14, class: 'mapa-caja-solar' }, fondo);
  const orbitas = svg('g', { 'clip-path': 'url(#mapa-recorte-solar)' }, fondo);
  const n = ZONAS_MAPA.solar.length, paso = (CAJA_SOLAR.x + CAJA_SOLAR.w - 34 - SOL.x - 62) / Math.max(1, n - 1);
  const radiosSolar = ZONAS_MAPA.solar.map((_, i) => 62 + i * paso);
  for (const r of radiosSolar) svg('circle', { cx: SOL.x, cy: SOL.y, r, class: 'mapa-orbita' }, orbitas);
  svg('circle', { cx: SOL.x, cy: SOL.y, r: 6.5, class: 'mapa-sol' }, fondo);
  for (let i = 0; i < 8; i++) {   // rayos del Sol: trazos cortos y nítidos
    const a = i / 8 * Math.PI * 2;
    svg('line', { x1: SOL.x + Math.cos(a) * 9, y1: SOL.y + Math.sin(a) * 9, x2: SOL.x + Math.cos(a) * 12.5, y2: SOL.y + Math.sin(a) * 12.5, class: 'mapa-rayo' }, fondo);
  }

  // Posición de cada lugar en su zona.
  const lugaresFijos = [];
  ZONAS_MAPA.solar.forEach((d, i) => {
    // Cada uno sobre su órbita, un poco por encima del eje del Sol (alternando) para dejar sitio a dos líneas de nombre.
    const dy = [-8, -3, -10, -5][i % 4], a = Math.asin(dy / radiosSolar[i]);
    lugaresFijos.push({ ...d, zona: 'solar', x: SOL.x + Math.cos(a) * radiosSolar[i], y: SOL.y + dy });
  });
  for (const d of ZONAS_MAPA.galaxia) { const [x, y] = enGalaxia(d.posicion[0], d.posicion[2], 0.92); lugaresFijos.push({ ...d, zona: 'galaxia', x, y }); }
  // Los gigantes, alrededor del disco: la mitad a la derecha y la otra a la izquierda, dejando libre
  // el hilo hacia el sistema solar (arriba) y repartidos por igual en cada lado.
  const lejos = ZONAS_MAPA.lejos, derecha = Math.ceil(lejos.length / 2);
  lejos.forEach((d, i) => {
    const lado = i < derecha, k = lado ? i : i - derecha, cuantos = lado ? derecha : lejos.length - derecha;
    const f = cuantos > 1 ? k / (cuantos - 1) : 0.5;
    const ang = (lado ? -27 + f * 89 : 118 + f * 89) * Math.PI / 180;
    const x = GALAXIA.x + Math.cos(ang) * ORBITA_LEJOS * 1.04, y = GALAXIA.y + Math.sin(ang) * ORBITA_LEJOS;
    lugaresFijos.push({ ...d, zona: 'lejos', x, y, ang });
  });
  // Hilos desde el borde del disco hacia cada gigante: están más allá, fuera de nuestra galaxia.
  for (const d of lugaresFijos.filter(d => d.zona === 'lejos')) {
    const x1 = GALAXIA.x + Math.cos(d.ang) * (GALAXIA.r + 3), y1 = GALAXIA.y + Math.sin(d.ang) * (GALAXIA.r + 3);
    svg('line', { x1, y1, x2: d.x - Math.cos(d.ang) * 9, y2: d.y - Math.sin(d.ang) * 9, class: 'mapa-camino' }, fondo);
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
      etiqueta(g, d.x, d.y + (d.zona === 'lejos' ? 15.5 : 13), aqui ? 'Estás aquí' : conocido ? nombre : 'Por descubrir');
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
  return { abrir, cerrar };
}
