// Los datos de la telaraña cósmica (sin escena): posiciones, colores y brillos de sus galaxias y de su polvo de luz,
// ya troceados en bloques espaciales. Se calculan en tres Web Workers (telaranaObrero.js) en paralelo con el resto de la
// carga, como los paquetes de un juego: dos se reparten los filamentos principales y el tercero hace los menores (su
// azar es propio) y los cúmulos; se pasan sus partes y cada lista queda en el orden de siempre (ver parteFilamentos). Si
// el navegador no puede, todo en el hilo principal (telarana.js). Mismas semillas y mismo orden: el universo sale
// idéntico (byte a byte) en cualquier aparato, con uno o con tres obreros. No importa three.js: lo recibe (el obrero lo
// carga por su ruta).
// En el iPhone el JavaScript va sin compilador (cada llamada y cada objeto cuestan mucho): los bucles de millones de
// motas leen el azar de un depósito por tandas (serie) y calculan en números sueltos, sin crear vectores ni colores.
import { semillaDe, rellenarAzar } from '../util/azarSemilla.js';
import { crearTelarana, TELARANA } from '../data/telarana.js';

// Trocea una nube de puntos en bloques espaciales (rejilla de G³ celdas sobre su caja, orden por cubetas: rápido aun
// con un millón de puntos). Devuelve los atributos reordenados y, por bloque, su tramo y su esfera envolvente: en la
// escena cada bloque se dibuja solo si está a la vista.
export function trocearDatos(atributos, G = 4) {
  const p = atributos.position.datos, n = p.length / 3, NC = G * G * G;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) { const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  // Celda de cada punto: min(G − 1, ⌊(v − mín) / máx(1e-9, ancho) · G⌋) por eje (las mismas cuentas, sin llamadas).
  const celda = new Uint16Array(n), cuenta = new Uint32Array(NC + 1), ax = Math.max(1e-9, x1 - x0), ay = Math.max(1e-9, y1 - y0), az = Math.max(1e-9, z1 - z0), U = G - 1;
  for (let i = 0, j = 0; i < n; i++, j += 3) {
    let a = Math.floor((p[j] - x0) / ax * G), b = Math.floor((p[j + 1] - y0) / ay * G), c = Math.floor((p[j + 2] - z0) / az * G);
    if (a > U) a = U; if (b > U) b = U; if (c > U) c = U;
    const k = (a * G + b) * G + c; celda[i] = k; cuenta[k + 1]++;
  }
  for (let c = 0; c < NC; c++) cuenta[c + 1] += cuenta[c];
  const inicio = cuenta.slice(), destino = new Uint32Array(n); for (let i = 0; i < n; i++) destino[i] = inicio[celda[i]]++;
  // Dentro de cada bloque, orden barajado (con semilla: siempre igual): dibujar solo la primera parte de un bloque es una
  // muestra repartida de todo él (en el móvil se dibuja una parte con más luz cada punto: telarana.js). El azar de cada
  // bloque se saca de una tanda (los mismos números que generador(semillaDe('bloque-' + c))).
  const barajado = new Uint32Array(n); for (let i = 0; i < n; i++) barajado[i] = i;
  let mayor = 0; for (let c = 0; c < NC; c++) mayor = Math.max(mayor, cuenta[c + 1] - cuenta[c]);
  const azar = new Float64Array(mayor);
  for (let c = 0; c < NC; c++) {
    const a = cuenta[c], b = cuenta[c + 1]; if (b - a < 2) continue;
    rellenarAzar(semillaDe('bloque-' + c), azar, 0, b - a - 1);
    for (let i = b - 1, r = 0; i > a; i--, r++) { const j = a + Math.floor(azar[r] * (i - a + 1)), t = barajado[i]; barajado[i] = barajado[j]; barajado[j] = t; }
  }
  for (let i = 0; i < n; i++) destino[i] = barajado[destino[i]];
  const salida = {};
  // Atributo a atributo, soltando el original en cuanto está copiado (menos memoria a la vez). Copias de tríos y de
  // números sueltos aparte (sin el bucle interior por componente).
  for (const nombre of Object.keys(atributos)) {
    const { datos, k } = atributos[nombre], a = new Float32Array(n * k);
    if (k === 3) for (let i = 0, s = 0; i < n; i++, s += 3) { const o = destino[i] * 3; a[o] = datos[s]; a[o + 1] = datos[s + 1]; a[o + 2] = datos[s + 2]; }
    else if (k === 1) for (let i = 0; i < n; i++) a[destino[i]] = datos[i];
    else for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) a[destino[i] * k + j] = datos[i * k + j];
    salida[nombre] = { datos: a, k }; if (nombre !== 'position') atributos[nombre] = null;
  }
  const P = salida.position.datos, bloques = [];
  for (let c = 0; c < NC; c++) {
    const a = cuenta[c], b = cuenta[c + 1]; if (b <= a) continue;
    let cx = 0, cy = 0, cz = 0; for (let i = a; i < b; i++) { cx += P[i * 3]; cy += P[i * 3 + 1]; cz += P[i * 3 + 2]; } cx /= b - a; cy /= b - a; cz /= b - a;
    let r2 = 0; for (let i = a; i < b; i++) { const dx = P[i * 3] - cx, dy = P[i * 3 + 1] - cy, dz = P[i * 3 + 2] - cz; r2 = Math.max(r2, dx * dx + dy * dy + dz * dz); }
    bloques.push({ a, n: b - a, centro: [cx, cy, cz], radio: Math.sqrt(r2) * 1.001 + 1 });
  }
  return { atributos: salida, bloques };
}

// Puntos (posición, color, brillo) en memoria compacta: Float32Array que crecen cuando se llenan. Las motas son
// millones: en listas normales de JavaScript ocupaban el doble (8 bytes cada número) y luego se copiaban dos veces más;
// en un iPhone la memoria se agotaba y Safari cerraba el obrero sin avisar (la carga se quedaba parada).
const puntos = capacidad => ({ n: 0, pos: new Float32Array(capacidad * 3), col: new Float32Array(capacidad * 3), bri: new Float32Array(capacidad) });
function reservar(L, m) {
  if (L.n + m <= L.bri.length) return;
  const cap = Math.max(Math.ceil(L.bri.length * 1.5), L.n + m);
  for (const [c, k] of [['pos', 3], ['col', 3], ['bri', 1]]) { const b = new Float32Array(cap * k); b.set(L[c].subarray(0, L.n * k)); L[c] = b; }
}
function anadir(L, o) { reservar(L, o.n); L.pos.set(o.pos.subarray(0, o.n * 3), L.n * 3); L.col.set(o.col.subarray(0, o.n * 3), L.n * 3); L.bri.set(o.bri.subarray(0, o.n), L.n); L.n += o.n; }
// Lo justo de cada lista, sin copiarla (vistas sobre la misma memoria).
const recortar = L => ({ n: L.n, pos: L.pos.subarray(0, L.n * 3), col: L.col.subarray(0, L.n * 3), bri: L.bri.subarray(0, L.n) });

// Serie de azar con semilla: los mismos números que generador(semilla) y en el mismo orden, calculados por tandas
// (rellenarAzar) en un depósito «d». rnd() sirve en cualquier sitio; los bucles de millones de motas leen d[k] directamente
// con su propio índice (y lo devuelven a z.k antes de llamar a nada que gaste azar), recargando cuando quedan menos de
// MARGEN (lo que más gasta una mota son unos 16 números).
const TANDA = 4096, MARGEN = 64, DOS_PI = 2 * Math.PI;
function serie(semilla) {
  const d = new Float64Array(TANDA); let estado = semilla >>> 0;
  const z = { d, k: TANDA };
  // Lo que queda sin leer pasa al principio y el resto se rellena con los números siguientes.
  z.recargar = () => { const quedan = TANDA - z.k; d.copyWithin(0, z.k); estado = rellenarAzar(estado, d, quedan); z.k = 0; };
  z.rnd = () => { if (z.k === TANDA) z.recargar(); return d[z.k++]; };
  // Estado del generador justo antes del siguiente número sin leer (el paso es sumar una constante: se puede deshacer).
  // serie(z.estado()) sigue la serie exactamente desde aquí.
  z.estado = () => (estado - Math.imul(TANDA - z.k, 0x6D2B79F5)) >>> 0;
  return z;
}
// La gaussiana gasta un número distinto de cero y otro más (si sale un cero exacto, repite: casi nunca).
const gauss = a => { let u = 0; while (!u) u = a(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * a()); };
const noNulo = z => { let u = 0; while (!u) u = z.rnd(); return u; };
// Gasta el azar de n tandas de «un número, tres gaussianas y m números más» sin calcular nada con él: lo que se calculaba
// con esos números ya no se dibuja (el gas y las luces difusas de los filamentos), pero lo que viene después tiene que
// leer la serie en el mismo punto que antes para que el universo salga idéntico.
function saltar(z, n, m) {
  const d = z.d;
  for (let i = 0; i < n; i++) {
    if (z.k > TANDA - MARGEN) z.recargar();
    let k = z.k + 1;
    for (let g = 0; g < 3; g++) { while (!d[k++]); k++; }
    z.k = k + m;
  }
}

// Capacidad inicial de las listas de puntos: lo que sale (2 195 442 motas: 987 116 + 432 268 de las dos partes de los
// filamentos principales y 776 058 de los menores; galaxias: 95 366 + 41 880, 108 600 y 42 348 de los cúmulos; 247 153
// nubes), con un poco de holgura. Si no basta, crecen (con una copia).
const CAP = { motas: 2200000, motasSegunda: 435000, motasMenores: 780000, gal: 290000, galPrimera: 96000, galSegunda: 42500, galMenores: 109000, galCumulos: 43000, nubes: 248000 };
const empaquetar = L => trocearDatos({ position: { datos: L.pos.subarray(0, L.n * 3), k: 3 }, aCol: { datos: L.col.subarray(0, L.n * 3), k: 3 }, aBrillo: { datos: L.bri.subarray(0, L.n), k: 1 } });
const buferes = L => [L.pos.buffer, L.col.buffer, L.bri.buffer];

// Todo en un solo hilo (el hilo principal, si no hay obreros), en el orden de siempre: filamentos principales, menores,
// cúmulos y el troceado.
export async function generarDatosTelarana(THREE, ceder = async () => {}) {
  const T = taller(THREE, CAP.motas, CAP.gal), z = serie(semillaDe('telarana-escena'));
  await principales(T, z, ceder);
  await filamentosMenores(T, ceder);
  const nubes = puntos(CAP.nubes); cumulos(T, z, T.gal, nubes);
  await ceder();   // un latido más antes de empaquetar
  return { galaxias: empaquetar(T.gal), nubes: empaquetar(nubes), polvo: empaquetar(T.motas) };
}

// Lo mismo repartido en tres obreros que se hablan por canales propios (canal.enviar(a, mensaje, transferibles),
// canal.recibir(de): a y de son 'filamentos', 'segunda' o 'menores'):
//   · parteFilamentos: la primera parte de los filamentos principales (hasta CORTE); pasa sus galaxias a «menores»,
//     recibe las motas de «segunda» y de «menores», las pone detrás de las suyas y trocea el polvo (lo más grande).
//   · parteSegunda: recorre en seco la primera parte (solo gasta su azar, mucho más deprisa) y hace el resto; pasa sus
//     motas a «filamentos» y sus galaxias y el punto de la serie de azar a «menores».
//   · parteMenores: los filamentos menores (su azar es propio); pasa sus motas a «filamentos», recibe las galaxias de
//     las dos partes principales, sigue la serie de azar donde la dejaron (los cúmulos) y trocea las galaxias
//     (principales, menores, cúmulos) y las nubes.
// Cada lista queda en el mismo orden que en un solo hilo: el resultado es idéntico byte a byte.
export async function parteFilamentos(THREE, ceder, canal) {
  const T = taller(THREE, CAP.motas, CAP.galPrimera), z = serie(semillaDe('telarana-escena'));
  await principales(T, z, ceder, 0, corte(T.web));
  const g = recortar(T.gal); canal.enviar('menores', g, buferes(g));
  const segunda = canal.recibir('segunda'), menores = canal.recibir('menores');
  anadir(T.motas, await segunda); anadir(T.motas, await menores);
  await ceder();
  return { polvo: empaquetar(T.motas) };
}
export async function parteSegunda(THREE, ceder, canal) {
  const T = taller(THREE, CAP.motasSegunda, CAP.galSegunda), z = serie(semillaDe('telarana-escena'));
  await principales(T, z, ceder, corte(T.web), T.web.filamentos.length);
  const m = recortar(T.motas); canal.enviar('filamentos', m, buferes(m));
  const g = recortar(T.gal); canal.enviar('menores', { estado: z.estado(), gal: g }, buferes(g));
  return {};
}
export async function parteMenores(THREE, ceder, canal) {
  const T = taller(THREE, CAP.motasMenores, CAP.galMenores);
  await filamentosMenores(T, ceder);
  const m = recortar(T.motas); canal.enviar('filamentos', m, buferes(m));
  const primera = await canal.recibir('filamentos'), { estado, gal: segunda } = await canal.recibir('segunda');
  const G = puntos(primera.n + segunda.n + T.gal.n + CAP.galCumulos); anadir(G, primera); anadir(G, segunda); anadir(G, T.gal);
  const nubes = puntos(CAP.nubes); cumulos(T, serie(estado), G, nubes);
  await ceder();
  return { galaxias: empaquetar(G), nubes: empaquetar(nubes) };
}

// Dónde se parten los filamentos principales entre «filamentos» y «segunda»: el trabajo de cada filamento va con su
// largo (sus motas y galaxias), y «segunda» recorre antes en seco lo de «filamentos», que le cuesta SECO de lo normal.
// Con el corte en la fracción 1 / (2 − SECO) del largo total, las dos acaban a la vez. (Solo reparte el trabajo: el
// resultado es el mismo con cualquier corte.)
const SECO = 0.55;   // medido sin compilador (node --jitless): el recorrido en seco cuesta algo más de la mitad
function corte(web) {
  const largos = web.filamentos.map(f => web.nudos[f.a].pos.distanceTo(web.nudos[f.b].pos)), total = largos.reduce((s, l) => s + l, 0);
  let suma = 0, i = 0; while (i < largos.length && suma < total / (2 - SECO)) suma += largos[i++];
  return i;
}

// Los filamentos principales [desde, hasta) (los anteriores, en seco: solo para llegar al mismo punto de la serie).
async function principales(T, z, ceder, desde = 0, hasta = T.web.filamentos.length) {
  const { web, filamento } = T;
  for (let i = 0; i < hasta; i++) { const f = web.filamentos[i]; filamento(web.nudos[f.a].pos, web.nudos[f.b].pos, f.control, f.grosor, 1, z, i < desde); if ((i + 1) % 25 === 0) await ceder(); }
}

// ── Cúmulos en los nudos: cientos de galaxias doradas, polvo luminoso denso hacia el centro y un resplandor. Siguen la
// serie de azar principal justo donde la dejaron los filamentos principales. ──
function cumulos(T, z, gal, polvo) {
  const { web, O, GAL_CALIDAS, GAL_FRIAS } = T, azar = z.rnd, S = new Float64Array(3);
  const poner = (L, p, s, c, b) => { reservar(L, 1); const i = L.n++; L.pos[i * 3] = p.x + S[0] * s - O.x; L.pos[i * 3 + 1] = p.y + S[1] * s - O.y; L.pos[i * 3 + 2] = p.z + S[2] * s - O.z; L.col[i * 3] = c.r; L.col[i * 3 + 1] = c.g; L.col[i * 3 + 2] = c.b; L.bri[i] = b; };
  for (const nudo of web.nudos) {
    const n = Math.round((110 + nudo.peso * 200) * T.K), q = nudo.pos;
    for (let i = 0; i < n; i++) { S[0] = gauss(azar); S[1] = gauss(azar); S[2] = gauss(azar); const s = nudo.r * (azar() < 0.7 ? 0.22 : 0.55), c = azar() < 0.85 ? GAL_CALIDAS[Math.floor(azar() * 4)] : GAL_FRIAS[0]; poner(gal, q, s, c, 0.6 + azar() * 0.8); }
    for (let i = 0, nc = Math.round((700 + nudo.peso * 1100) * T.K); i < nc; i++) { S[0] = gauss(azar); S[1] = gauss(azar); S[2] = gauss(azar); const s = nudo.r * Math.pow(azar(), 1.5) * 0.6; poner(polvo, q, s, GAL_CALIDAS[Math.floor(azar() * 4)], 0.3 + azar() * 0.45); }
  }
}

// ── Filamentos menores (solo visuales): nudos pequeños por todo el volumen unidos a sus vecinos, más finos y
// tenues. Cierran celdas alrededor de los vacíos, como en las simulaciones. Su azar es propio («telarana-menores»):
// no dependen de nada de lo anterior y se pueden calcular a la vez en otro obrero. ──
async function filamentosMenores(T, ceder) {
  const { web, V, filamento, galaxiaColor, gal, O } = T, menores = [], zm = serie(semillaDe('telarana-menores')), rm = zm.rnd;
  for (let i = 0; menores.length < 420 && i < 30000; i++) {
    const u = rm() * 2 - 1, a = rm() * Math.PI * 2, sq = Math.sqrt(1 - u * u), r = TELARANA.radio * Math.pow(rm(), 0.5);
    const p = web.centro.clone().add(new V(sq * Math.cos(a) * r, u * r * 0.55, sq * Math.sin(a) * r));
    if (web.nudos.some(n => n.pos.distanceTo(p) < TELARANA.separacion * 0.3) || menores.some(m => m.distanceTo(p) < TELARANA.separacion * 0.32)) continue;
    menores.push(p);
  }
  const todos = [...web.nudos.map(n => n.pos), ...menores], unidos = new Set();
  for (let i = 0; i < menores.length; i++) { const p = menores[i];
    if (i % 40 === 39) await ceder();
    const cerca = todos.map((q, j) => [j, q.distanceTo(p)]).filter(([j, d]) => d > 1 && d < TELARANA.separacion * 1.3).sort((x, y) => x[1] - y[1]).slice(0, 2 + Math.floor(rm() * 2));
    for (const [j] of cerca) {
      const clave = [web.nudos.length + i, j].sort((x, y) => x - y).join('-'); if (unidos.has(clave)) continue; unidos.add(clave);
      const q = todos[j], largo = p.distanceTo(q), control = p.clone().add(q).multiplyScalar(0.5).add(new V(rm() - 0.5, (rm() - 0.5) * 0.6, rm() - 0.5).normalize().multiplyScalar(largo * (0.1 + rm() * 0.25)));
      filamento(p, q, control, (20000 + rm() * 50000) * 10, 0.45, zm);
    }
    // Un grupo pequeño en el nudo menor.
    for (let k = 0; k < 40 * T.K; k++) {
      const gx = gauss(rm), gy = gauss(rm), gz = gauss(rm), c = galaxiaColor(rm), b = 0.5 + rm() * 0.6;
      reservar(gal, 1); const n = gal.n++;
      gal.pos[n * 3] = p.x + gx * 90000 - O.x; gal.pos[n * 3 + 1] = p.y + gy * 90000 - O.y; gal.pos[n * 3 + 2] = p.z + gz * 90000 - O.z;
      gal.col[n * 3] = c.r; gal.col[n * 3 + 1] = c.g; gal.col[n * 3 + 2] = c.b; gal.bri[n] = b;
    }
  }
}

// Lo común a los dos obreros: colores, la red (nudos y filamentos), las listas de puntos y cómo se llena un filamento.
// «capGal» y «capMotas»: capacidad inicial de las listas (crecen si hace falta).
function taller(THREE, capMotas, capGal) {
  const col = c => new THREE.Color(c);
// Galaxias: sobre todo doradas y blancas (luz de estrellas viejas), algunas azuladas y alguna rosada.
  const GAL_CALIDAS = ['#fff3dc', '#ffe3b0', '#ffd291', '#ffc174'].map(col), GAL_FRIAS = ['#e2eaff', '#bcd0ff'].map(col), GAL_ROSA = col('#ffbfe0');
  const galaxiaColor = a => {   const r = a(); return r < 0.72 ? GAL_CALIDAS[Math.floor(a() * 4)] : r < 0.95 ? GAL_FRIAS[Math.floor(a() * 2)] : GAL_ROSA; };
// Gas de las hebras: azul, violeta y lavanda (algún toque rosado); dorado junto a los cúmulos.
  const ROSA_FIL = col('#ff7ad0');
  const AURORA = ['#4fa8ff', '#3fd8ff', '#6f7dff', '#a77dff', '#e07ad8', '#5ac8ff'].map(col);
  const HEBRA = ['#4f8cff', '#5aa8ff', '#6f86ff', '#47c0ff', '#8f7dff', '#b88cff', '#e08ad8'].map(col), ORO = col('#ffcf8a'), BLANCO_AZUL = col('#dfe8ff');

  const V = THREE.Vector3, web = crearTelarana(V);
  const K = 1;   // el mismo contenido en móvil y en PC
  const O = web.centro;   // las coordenadas se guardan respecto al centro (precisión de float en la GPU)
  const Ox = O.x, Oy = O.y, Oz = O.z;
  const gal = puntos(capGal), motas = puntos(capMotas);

  // ── Caminos orgánicos: la curva base del filamento con ondulaciones a tres escalas (perpendiculares a él),
  // nulas en los extremos para que todas las hebras de un filamento se junten en sus nudos. Devuelve sus números
  // sueltos (los bucles de motas calculan con ellos directamente) y punto(t) para lo poco que necesita un vector. ──
  function crearCamino(a, b, control, grosor, rnd, amplitud = 0.75) {
    const T = b.clone().sub(a).normalize(), N1 = new V().crossVectors(T, Math.abs(T.y) < 0.9 ? new V(0, 1, 0) : new V(1, 0, 0)).normalize(), N2 = new V().crossVectors(T, N1);
    const ondas = [1, 2.3, 5.1].map((f, k) => ({ f, a: [0.9, 0.45, 0.18][k] * (0.6 + rnd() * 0.8), p1: rnd() * 6.28, p2: rnd() * 6.28 }));
    const [o0, o1, o2] = ondas;
    // w = 2π·f (la misma cuenta que «2 * Math.PI * o.f * t», que se evalúa de izquierda a derecha).
    const c = { ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, cx: control.x, cy: control.y, cz: control.z,
      n1x: N1.x, n1y: N1.y, n1z: N1.z, n2x: N2.x, n2y: N2.y, n2z: N2.z, A: grosor * amplitud,
      a0: o0.a, w0: 2 * Math.PI * o0.f, p10: o0.p1, p20: o0.p2, a1: o1.a, w1: 2 * Math.PI * o1.f, p11: o1.p1, p21: o1.p2, a2: o2.a, w2: 2 * Math.PI * o2.f, p12: o2.p1, p22: o2.p2,
      N1, N2, largo: a.distanceTo(b) };
    // Punto de la curva con sus ondas (y un desvío propio «ex, ey», si lo hay) en S[0..2]: las mismas operaciones y en el
    // mismo orden que la versión con vectores de antes (base + N1·(x·A·env) + N2·(y·A·env) [+ N1·ex·env + N2·ey·env]).
    c.puntoEn = (t, S, ex = null, ey = 0) => {
      const env = Math.sin(Math.PI * t), u = 1 - t;
      let x = 0, y = 0; x += c.a0 * Math.sin(c.w0 * t + c.p10); y += c.a0 * Math.cos(c.w0 * t + c.p20); x += c.a1 * Math.sin(c.w1 * t + c.p11); y += c.a1 * Math.cos(c.w1 * t + c.p21); x += c.a2 * Math.sin(c.w2 * t + c.p12); y += c.a2 * Math.cos(c.w2 * t + c.p22);
      let px = u * u * c.ax + 2 * u * t * c.cx + t * t * c.bx, py = u * u * c.ay + 2 * u * t * c.cy + t * t * c.by, pz = u * u * c.az + 2 * u * t * c.cz + t * t * c.bz;
      const s1 = x * c.A * env, s2 = y * c.A * env;
      px += c.n1x * s1; py += c.n1y * s1; pz += c.n1z * s1; px += c.n2x * s2; py += c.n2y * s2; pz += c.n2z * s2;
      if (ex !== null) { const s3 = ex * env, s4 = ey * env; px += c.n1x * s3; py += c.n1y * s3; pz += c.n1z * s3; px += c.n2x * s4; py += c.n2y * s4; pz += c.n2z * s4; }
      S[0] = px; S[1] = py; S[2] = pz;
    };
    c.punto = t => { c.puntoEn(t, S); return new V(S[0], S[1], S[2]); };
    return c;
  }

  // Datos por fibra en números sueltos (como mucho 17 fibras por filamento): amplitud, 2π·frecuencia y fase de sus dos
  // desvíos, brillo, 2π·frecuencia y fase de su densidad, y sus dos colores (FCOL: r, g, b de cada uno; FC1 < 0: aún sin elegir).
  const S = new Float64Array(3), FA0 = new Float64Array(32), FW0 = new Float64Array(32), FP0 = new Float64Array(32), FA1 = new Float64Array(32), FW1 = new Float64Array(32), FP1 = new Float64Array(32);
  const FBRI = new Float64Array(32), FFR = new Float64Array(32), FFASE = new Float64Array(32), FC1 = new Int8Array(32), FCOL = new Float64Array(32 * 6);
  const PUNTOS = 44;
  // Un filamento completo: fibras trenzadas de polvo luminoso, ramitas y sus galaxias (z: su serie de azar). En seco
  // solo se gasta el azar que gastaría, sin calcular ni guardar sus puntos (lo que se salta un obrero que empieza a
  // mitad de la lista de filamentos: así sabe en qué punto de la serie empieza su parte); cuánto azar gasta cada mota
  // depende solo de unos pocos de sus números (si se dibuja, si es suelta, si sale un cero), y esos se miran igual.
  function filamento(a, b, control, grosor, peso, z, seco = false) {
    const rnd = z.rnd, d = z.d;
    const camino = crearCamino(a, b, control, grosor, rnd);
    const t1 = HEBRA[Math.floor(rnd() * HEBRA.length)], t2 = HEBRA[Math.floor(rnd() * HEBRA.length)];
    const colorEn = t => t1.clone().lerp(t2, t).lerp(ORO, Math.pow(Math.abs(t - 0.5) * 2, 6) * 0.7);
    // (El gas del filamento ya no se dibuja: solo se gasta su azar. Por nubecilla: posición, tres gaussianas, color, brillo y radio.)
    saltar(z, Math.round(PUNTOS * 1.4 * peso), 3);
    // Fibras: cada una con su pequeño desvío propio. No se dibujan como líneas: son polvo luminoso (miles de motas
    // finas azules, violetas y rosadas) que se agolpa a lo largo de ellas, con zonas densas y huecos, y un halo más
    // suelto alrededor. Así el filamento se ve esponjoso, como gas, y no un cable.
    const nf = Math.max(4, Math.round((10 + rnd() * 7) * peso));   // haces de muchas hebras finas
    for (let f = 0; f < nf; f++) {
      const o = [0, 1].map(() => ({ f: 1 + rnd() * 3, p: rnd() * 6.28, a: grosor * (0.1 + rnd() * 0.3) })), bri = 0.4 + rnd() * 0.6, fase = rnd() * 6.28, fr = 1.5 + rnd() * 4;
      FA0[f] = o[0].a; FW0[f] = 2 * Math.PI * o[0].f; FP0[f] = o[0].p; FA1[f] = o[1].a; FW1[f] = 2 * Math.PI * o[1].f; FP1[f] = o[1].p;
      FBRI[f] = bri; FFR[f] = 2 * Math.PI * fr; FFASE[f] = fase; FC1[f] = -1;
    }
    // (Las luces difusas del filamento tampoco se dibujan ya: un velo ancho de brillos, las corrientes de cada fibra y las
    // ramas de luz. Solo se gasta su azar, en el mismo orden.)
    saltar(z, Math.round(14 * peso + 6), 2);
    for (let f = 0, nc = Math.min(nf, Math.max(3, Math.round(5 * peso))); f < nc; f++) { rnd(); rnd(); saltar(z, Math.round(70 * peso + 20), 2); }
    for (let k = 0, nb = Math.round((3 + rnd() * 5) * peso); k < nb; k++) { rnd(); rnd(); saltar(z, 1, 1); }   // t0, ángulo, largo, curva (tres gaussianas) y color
    // Polvo de luz a lo largo de las fibras: cientos de miles de motas, en números sueltos y con el azar leído del depósito
    // (las mismas operaciones y el mismo orden de lectura que con vectores, colores y llamadas: el universo sale idéntico).
    const nd = Math.round(camino.largo * densidadPolvo * peso);
    if (!seco) reservar(motas, nd);
    {
      const { ax, ay, az, bx, by, bz, cx, cy, cz, n1x, n1y, n1z, n2x, n2y, n2z, A, a0, w0, p10, p20, a1, w1, p11, p21, a2, w2, p12, p22 } = camino;
      const mp = motas.pos, mc = motas.col, mb = motas.bri, kp = 0.7 + 0.3 * peso, LIM = TANDA - MARGEN;
      let n = motas.n, k = z.k;
      for (let i = 0; i < nd; i++) {
        if (k > LIM) { z.k = k; z.recargar(); k = 0; }
        const t = d[k++], f = Math.floor(d[k++] * nf), dens = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(FFR[f] * t + FFASE[f]), 2);
        if (d[k++] > dens) continue;
        const suelto = d[k++] < 0.18, g = grosor * (suelto ? 0.16 : 0.04);
        if (seco) {   // tres gaussianas, los colores de la fibra (con su primera mota), el tono y el brillo (si no es suelta)
          for (let q = 0; q < 3; q++) { if (!d[k++]) { z.k = k; noNulo(z); k = z.k; } k++; }
          if (FC1[f] < 0) { FC1[f] = 0; k += 2; }
          k += suelto ? 3 : 4; continue;
        }
        const ex = FA0[f] * Math.sin(FW0[f] * t + FP0[f]), ey = FA1[f] * Math.sin(FW1[f] * t + FP1[f]);
        const env = Math.sin(Math.PI * t), u = 1 - t;
        let x = 0, y = 0; x += a0 * Math.sin(w0 * t + p10); y += a0 * Math.cos(w0 * t + p20); x += a1 * Math.sin(w1 * t + p11); y += a1 * Math.cos(w1 * t + p21); x += a2 * Math.sin(w2 * t + p12); y += a2 * Math.cos(w2 * t + p22);
        const k1 = (x * A + ex) * env, k2 = (y * A + ey) * env;
        let px = u * u * ax + 2 * u * t * cx + t * t * bx + n1x * k1 + n2x * k2 - Ox, py = u * u * ay + 2 * u * t * cy + t * t * by + n1y * k1 + n2y * k2 - Oy, pz = u * u * az + 2 * u * t * cz + t * t * bz + n1z * k1 + n2z * k2 - Oz;
        let v = d[k++]; if (!v) { z.k = k; v = noNulo(z); k = z.k; } px += Math.sqrt(-2 * Math.log(v)) * Math.cos(DOS_PI * d[k++]) * g;
        v = d[k++]; if (!v) { z.k = k; v = noNulo(z); k = z.k; } py += Math.sqrt(-2 * Math.log(v)) * Math.cos(DOS_PI * d[k++]) * g;
        v = d[k++]; if (!v) { z.k = k; v = noNulo(z); k = z.k; } pz += Math.sqrt(-2 * Math.log(v)) * Math.cos(DOS_PI * d[k++]) * g;
        mp[n * 3] = px; mp[n * 3 + 1] = py; mp[n * 3 + 2] = pz;
        if (FC1[f] < 0) {   // los dos colores de la fibra, con su primera mota
          const c1 = AURORA[FC1[f] = Math.floor(d[k++] * AURORA.length)], c2 = AURORA[Math.floor(d[k++] * AURORA.length)];
          FCOL[f * 6] = c1.r; FCOL[f * 6 + 1] = c1.g; FCOL[f * 6 + 2] = c1.b; FCOL[f * 6 + 3] = c2.r; FCOL[f * 6 + 4] = c2.g; FCOL[f * 6 + 5] = c2.b;
        }
        const hacia = d[k++] < 0.15 ? ROSA_FIL : BLANCO_AZUL, kc = d[k++] * d[k++] * 0.5, q = f * 6;
        let cr = FCOL[q], cg = FCOL[q + 1], cb = FCOL[q + 2]; cr += (FCOL[q + 3] - cr) * t; cg += (FCOL[q + 4] - cg) * t; cb += (FCOL[q + 5] - cb) * t;
        cr += (hacia.r - cr) * kc; cg += (hacia.g - cg) * kc; cb += (hacia.b - cb) * kc;
        mc[n * 3] = cr; mc[n * 3 + 1] = cg; mc[n * 3 + 2] = cb; mb[n] = (suelto ? 0.18 : 0.3 + d[k++] * 0.35) * FBRI[f] * (0.45 + 0.55 * env) * kp;
        n++;
      }
      motas.n = n; z.k = k;
    }
    // Ramitas que salen hacia el vacío, también de polvo, y se apagan en la punta.
    const nr = Math.round((3 + rnd() * 5) * peso);
    for (let r = 0; r < nr; r++) {
      const t0 = 0.12 + rnd() * 0.76, p0 = camino.punto(t0), ang = rnd() * 6.28, dir = camino.N1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(camino.N2, Math.sin(ang));
      const largo = camino.largo * (0.04 + rnd() * 0.1), curva = new V(gauss(rnd), gauss(rnd), gauss(rnd)).multiplyScalar(largo * 0.9), c0 = colorEn(t0);
      const n = Math.round(largo * densidadPolvo * 0.5); if (!seco) reservar(motas, n);
      const mp = motas.pos, mc = motas.col, mb = motas.bri, LIM = TANDA - MARGEN, dlx = dir.x * largo, dly = dir.y * largo, dlz = dir.z * largo;
      let j = motas.n, k = z.k;
      for (let i = 0; i < n; i++) {
        if (k > LIM) { z.k = k; z.recargar(); k = 0; }
        if (seco) { k += 2; for (let q = 0; q < 3; q++) { if (!d[k++]) { z.k = k; noNulo(z); k = z.k; } k++; } continue; }   // posición, tono y tres gaussianas
        const u = Math.pow(d[k++], 1.3), g = grosor * 0.1 * (1 + 2 * u), h = HEBRA[Math.floor(d[k++] * HEBRA.length)];
        let v = d[k++]; if (!v) { z.k = k; v = noNulo(z); k = z.k; } const gx = Math.sqrt(-2 * Math.log(v)) * Math.cos(DOS_PI * d[k++]);
        v = d[k++]; if (!v) { z.k = k; v = noNulo(z); k = z.k; } const gy = Math.sqrt(-2 * Math.log(v)) * Math.cos(DOS_PI * d[k++]);
        v = d[k++]; if (!v) { z.k = k; v = noNulo(z); k = z.k; } const gz = Math.sqrt(-2 * Math.log(v)) * Math.cos(DOS_PI * d[k++]);
        mp[j * 3] = p0.x + dlx * u + curva.x * u * u + gx * g - Ox; mp[j * 3 + 1] = p0.y + dly * u + curva.y * u * u + gy * g - Oy; mp[j * 3 + 2] = p0.z + dlz * u + curva.z * u * u + gz * g - Oz;
        mc[j * 3] = c0.r + (h.r - c0.r) * 0.4; mc[j * 3 + 1] = c0.g + (h.g - c0.g) * 0.4; mc[j * 3 + 2] = c0.b + (h.b - c0.b) * 0.4;   // c0.clone().lerp(h, 0.4)
        mb[j] = 0.45 * Math.pow(1 - u, 1.2) * peso;
        j++;
      }
      motas.n = j; z.k = k;
    }
    // Galaxias sobre las hebras (sobre las fibras: la red está hecha de galaxias).
    const ng = Math.round(camino.largo * densidadGal * peso);
    if (!seco) reservar(gal, ng);
    for (let i = 0; i < ng; i++) {
      if (seco) { rnd(); rnd(); gauss(rnd); gauss(rnd); gauss(rnd); rnd(); galaxiaColor(rnd); rnd(); continue; }
      const t = rnd(), f = Math.floor(rnd() * nf);
      camino.puntoEn(t, S, FA0[f] * Math.sin(FW0[f] * t + FP0[f]), FA1[f] * Math.sin(FW1[f] * t + FP1[f]));
      const gx = gauss(rnd), gy = gauss(rnd), gz = gauss(rnd), s = grosor * (rnd() < 0.75 ? 0.035 : 0.15), c = galaxiaColor(rnd), j = gal.n++;
      gal.pos[j * 3] = S[0] + gx * s - Ox; gal.pos[j * 3 + 1] = S[1] + gy * s - Oy; gal.pos[j * 3 + 2] = S[2] + gz * s - Oz;
      gal.col[j * 3] = c.r; gal.col[j * 3 + 1] = c.g; gal.col[j * 3 + 2] = c.b; gal.bri[j] = 0.3 + rnd() * 0.7;
    }
    // Grupos de galaxias a lo largo del filamento (pequeños nudos dorados).
    for (let m = 0, nm = 1 + Math.floor(rnd() * 3 * peso); m < nm; m++) {
      camino.puntoEn(0.15 + rnd() * 0.7, S); const qx = S[0], qy = S[1], qz = S[2], r = grosor * (0.3 + rnd() * 0.4), s = r * 0.35;
      if (!seco) reservar(gal, 30 * K);
      for (let k = 0; k < 30 * K; k++) {
        if (seco) { gauss(rnd); gauss(rnd); gauss(rnd); galaxiaColor(rnd); rnd(); continue; }
        const gx = gauss(rnd), gy = gauss(rnd), gz = gauss(rnd), c = galaxiaColor(rnd), j = gal.n++;
        gal.pos[j * 3] = qx + gx * s - Ox; gal.pos[j * 3 + 1] = qy + gy * s - Oy; gal.pos[j * 3 + 2] = qz + gz * s - Oz;
        gal.col[j * 3] = c.r; gal.col[j * 3 + 1] = c.g; gal.col[j * 3 + 2] = c.b; gal.bri[j] = 0.6 + rnd() * 0.6;
      }
    }
  }
  const largoTotal = web.filamentos.reduce((s, f) => s + web.nudos[f.a].pos.distanceTo(web.nudos[f.b].pos), 0);
  const densidadGal = 120000 * K / largoTotal, densidadPolvo = 1700000 * K / largoTotal;   // polvo de luz fino: forma la luz de los filamentos
  return { web, O, V, K, filamento, galaxiaColor, GAL_CALIDAS, GAL_FRIAS, gal, motas };
}

// Los búferes que se pueden transferir del obrero al hilo principal sin copiarlos.
export const transferibles = d => Object.values(d).flatMap(x => Object.values(x.atributos).map(a => a.datos.buffer));
