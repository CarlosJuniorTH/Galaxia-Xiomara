// Medidor de fluidez (?fps). Solo se carga con ?fps en la dirección (js/main.js lo importa entonces): sin él no existe y
// no cuesta nada. No envía nada a ningún sitio. Mide, cuadro a cuadro:
//  · tiempo entre cuadros DIBUJADOS (WebGL o el lienzo 2D del clip): FPS, p50/p95/p99, cuadros > 25 y > 50 ms;
//  · long animation frames (PerformanceObserver 'long-animation-frame'), con el script que más tardó;
//  · órdenes de dibujo, triángulos y puntos del lienzo 3D (#galaxia), contadas en la propia API de WebGL (incluye todas las
//    pasadas del compositor; renderer.info se reinicia en cada render y no las suma);
//  · resolución interna (el tamaño del búfer en el que más se dibuja) y la del lienzo;
//  · tiempo de GPU por pasada (EXT_disjoint_timer_query_webgl2): un tramo por cada cambio de framebuffer, con el nombre de
//    la pasada del compositor en curso (conectar(escena) envuelve cada pass.render);
//  · subidas a la GPU: texturas (texImage*/texSubImage*/compressedTexImage*/texStorage*), compilaciones (compileShader,
//    linkProgram), geometrías (bufferData), render targets (createFramebuffer/createRenderbuffer) y decodificaciones de
//    imagen (createImageBitmap, HTMLImageElement.decode);
//  · música: cambios de playbackRate, saltos (currentTime con la pista sonando), pausas, cortes (waiting/stalled sonando, o
//    una pausa mientras su ganancia se oye) y fines; aterrizaje de cada viaje frente al fin de la música de los viajes;
//  · desfase audio↔imagen: window.__medidor.desfase(ms, fuente) lo alimenta el reloj maestro; mientras nadie lo llame,
//    se compara cada cuadro el reloj del clip de la intro (__intro.tiempo) o del videoclip del gigante (escena.clip.segundo)
//    con la posición real de su <audio> (solo con #debug, que es lo que expone esos relojes).
// API: window.__medidor.tramo(nombre) cierra el tramo en curso y abre otro (null: solo cerrar); .resumen() devuelve un JSON
// por tramo; .marca(texto) anota un evento; .llegada({ destino, finMusicaMs }) para el reloj maestro futuro.
// Panel discreto arriba a la izquierda (?fps=oculto lo esconde; ?fps=singpu no mide la GPU).
const opcion = new URLSearchParams(location.search).get('fps') || '';
const ahora = () => performance.now();

// ── Registro global (todo con marca de tiempo; los tramos se reparten al resumir) ─────────────────────────────────────
const C = { t: [], dt: [], llamadas: [], triangulos: [], puntos: [], interna: [], gpu: [] };   // un elemento por cuadro dibujado
const gpuPorPasada = [];   // [indiceCuadro, { pasada: ms }]
const eventos = [];        // { t, tipo, ... } subidas, compilaciones, audio, llegadas, marcas
const loafs = [];          // { t, dur, bloqueo, script }
const desfases = [];       // [t, ms, fuente]
const tramos = [];         // { nombre, inicio, fin }
let actual = null, ultimoDesfaseExterno = -Infinity;
const ev = (tipo, datos) => { if (eventos.length < 300000) eventos.push({ t: ahora(), tipo, ...datos }); };

// ── WebGL: dibujo, subidas, compilaciones y tiempos de GPU ──────────────────────────────────────────────────────────────
let dibujado = false, llamadas = 0, triangulos = 0, puntos = 0, mejorVp = 0, mejorVpLlamadas = 0, vpLlamadas = 0, vpActual = 0;
const principal = new WeakMap();
const esPrincipal = gl => { let v = principal.get(gl); if (v === undefined) { v = gl.canvas?.id === 'galaxia'; principal.set(gl, v); } return v; };
const GPU = { ext: null, gl: null, abierta: null, etiqueta: '', cuadro: [], pendientes: [], pasada: 'fuera del compositor', libres: [] };
function contarDibujo(gl, modo, n, instancias = 1) {
  dibujado = true;
  if (!esPrincipal(gl)) return;
  llamadas++; vpLlamadas++;
  const c = n * instancias;
  if (modo === 4) triangulos += c / 3; else if (modo === 5 || modo === 6) triangulos += Math.max(0, n - 2) * instancias; else if (modo === 0) puntos += c;
  if (GPU.ext && !GPU.abierta && GPU.pendientes.length < 10) abrirConsulta(gl);
}
function abrirConsulta(gl) {
  const q = GPU.libres.pop() || gl.createQuery(); if (!q) return;
  gl.beginQuery(GPU.ext.TIME_ELAPSED_EXT, q); GPU.abierta = q;
  GPU.cuadro.push([`${GPU.pasada} · ${GPU.etiqueta}`, q]);
}
function cerrarConsulta(gl) { if (GPU.abierta) { gl.endQuery(GPU.ext.TIME_ELAPSED_EXT); GPU.abierta = null; } }
function cambioFramebuffer(gl) {
  if (!esPrincipal(gl)) return;
  if (vpLlamadas > mejorVpLlamadas) { mejorVpLlamadas = vpLlamadas; mejorVp = vpActual; }
  vpLlamadas = 0;
  if (GPU.ext) cerrarConsulta(gl);
}
function leerGPU() {
  const gl = GPU.gl; if (!gl) return;
  while (GPU.pendientes.length) {
    const [indice, lista] = GPU.pendientes[0], ultima = lista.at(-1)[1];
    if (!gl.getQueryParameter(ultima, gl.QUERY_RESULT_AVAILABLE)) break;
    GPU.pendientes.shift();
    const disjunto = gl.getParameter(GPU.ext.GPU_DISJOINT_EXT), porPasada = {};
    let total = 0;
    for (const [nombre, q] of lista) { const ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6; GPU.libres.push(q); porPasada[nombre] = (porPasada[nombre] || 0) + ms; total += ms; }
    if (!disjunto && indice >= 0) { C.gpu[indice] = +total.toFixed(3); gpuPorPasada.push([indice, porPasada]); }
  }
}
function instrumentarWebGL(P) {
  if (!P) return;
  const envolver = (nombre, antes) => { const f = P[nombre]; if (typeof f !== 'function') return; P[nombre] = function (...a) { antes.call(this, a); return f.apply(this, a); }; };
  envolver('drawArrays', function (a) { contarDibujo(this, a[0], a[2]); });
  envolver('drawElements', function (a) { contarDibujo(this, a[0], a[1]); });
  envolver('drawArraysInstanced', function (a) { contarDibujo(this, a[0], a[2], a[3]); });
  envolver('drawElementsInstanced', function (a) { contarDibujo(this, a[0], a[1], a[4]); });
  envolver('drawRangeElements', function (a) { contarDibujo(this, a[0], a[3]); });
  envolver('clear', function () { dibujado = true; });
  envolver('bindFramebuffer', function () { cambioFramebuffer(this); });
  envolver('viewport', function (a) { if (esPrincipal(this)) { vpActual = a[2] * a[3]; GPU.etiqueta = `${a[2]}×${a[3]}`; } });
  const origen = s => s == null ? 'vacía' : s.constructor?.name?.replace(/^HTML|Element$/g, '') || typeof s;
  for (const n of ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'compressedTexImage2D', 'compressedTexSubImage2D', 'compressedTexImage3D'])
    envolver(n, function (a) { const fuente = a.find(x => x && typeof x === 'object' && !ArrayBuffer.isView(x)) ?? a.find(x => ArrayBuffer.isView(x)); const w = fuente?.width ?? fuente?.videoWidth ?? a[3], h = fuente?.height ?? fuente?.videoHeight ?? a[4];
      ev('textura', { f: n, origen: origen(fuente), tam: Number.isFinite(w) && Number.isFinite(h) ? `${w}×${h}` : '', principal: esPrincipal(this) }); });
  for (const n of ['texStorage2D', 'texStorage3D']) envolver(n, function (a) { ev('reservaTextura', { f: n, tam: `${a[2]}×${a[3]}`, principal: esPrincipal(this) }); });
  envolver('compileShader', function () { ev('compilacion', { principal: esPrincipal(this) }); });
  envolver('linkProgram', function () { ev('enlace', { principal: esPrincipal(this) }); });
  envolver('bufferData', function (a) { const b = typeof a[1] === 'number' ? a[1] : a[1]?.byteLength ?? 0; if (b > 0) ev('geometria', { bytes: b, principal: esPrincipal(this) }); });
  envolver('createFramebuffer', function () { ev('renderTarget', { f: 'framebuffer', principal: esPrincipal(this) }); });
  envolver('createRenderbuffer', function () { ev('renderTarget', { f: 'renderbuffer', principal: esPrincipal(this) }); });
}
instrumentarWebGL(globalThis.WebGL2RenderingContext?.prototype);
instrumentarWebGL(globalThis.WebGLRenderingContext?.prototype);
// El lienzo 2D del clip de la intro también es un cuadro dibujado.
{ const P = globalThis.CanvasRenderingContext2D?.prototype;
  if (P) for (const n of ['clearRect', 'fillRect', 'drawImage', 'fill', 'stroke', 'fillText', 'putImageData']) { const f = P[n]; P[n] = function (...a) { dibujado = true; return f.apply(this, a); }; } }
// Decodificaciones de imagen.
if (globalThis.createImageBitmap) { const f = globalThis.createImageBitmap; globalThis.createImageBitmap = function (...a) { ev('decodificacion', { f: 'createImageBitmap' }); return f.apply(this, a); }; }
if (globalThis.HTMLImageElement) { const f = HTMLImageElement.prototype.decode; if (f) HTMLImageElement.prototype.decode = function () { ev('decodificacion', { f: 'decode', src: String(this.src).split('/').pop().slice(0, 60) }); return f.call(this); }; }

// ── Música ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Las canciones suenan desde blob: (bandaSonora las descarga entera): su nombre sale del tamaño de la descarga.
const porTamano = new Map(), porBlob = new Map(), nombreDeRuta = u => decodeURIComponent(String(u).split('/').pop().split('?')[0]).replace(/\.\w+$/, '');
{ const f = globalThis.fetch; if (f) globalThis.fetch = function (...a) { const p = f.apply(this, a); p.then(r => { if (/\.(m4a|mp3|ogg|wav)(\?|$)/i.test(r.url)) { const n = +r.headers.get('content-length'); if (n) porTamano.set(n, nombreDeRuta(r.url)); } }, () => {}); return p; };
  const c = URL.createObjectURL; URL.createObjectURL = function (o) { const u = c.call(URL, o); if (o?.size && porTamano.has(o.size)) porBlob.set(u, porTamano.get(o.size)); return u; }; }
const nombrePista = el => { const s = el.currentSrc || el.src || ''; return s.startsWith('data:') ? 'silencio' : s.startsWith('blob:') ? porBlob.get(s) || 'blob' : nombreDeRuta(s) || '?'; };
const medios = new Map();   // nombre → <audio>
const oidos = new WeakSet();
const gananciaDe = nombre => { try { return window.__bandaSonora?.estado().pistas[nombre]?.ganancia ?? null; } catch { return null; } };
function vigilarMedio(el) {
  const n = nombrePista(el); if (n !== 'silencio') medios.set(n, el);
  if (oidos.has(el)) return; oidos.add(el);
  // Corte: la pista ya sonaba (evento playing) y se queda sin datos sin que nadie la pause (no el arranque de cada play()).
  let sono = false;
  el.addEventListener('playing', () => { sono = true; });
  el.addEventListener('pause', () => { sono = false; });
  const corte = motivo => { const n = nombrePista(el); if (sono && !el.paused && n !== 'silencio' && el.readyState < 3) ev('corte', { pista: n, motivo, segundo: +el.currentTime.toFixed(3) }); };
  el.addEventListener('waiting', () => corte('waiting'));
  el.addEventListener('stalled', () => corte('stalled'));
  el.addEventListener('ended', () => { const n = nombrePista(el); if (n === 'viajes') finViajes = ahora(); ev('fin', { pista: n }); });
}
if (globalThis.HTMLMediaElement) {
  const P = HTMLMediaElement.prototype;
  const ritmo = Object.getOwnPropertyDescriptor(P, 'playbackRate'), pos = Object.getOwnPropertyDescriptor(P, 'currentTime');
  Object.defineProperty(P, 'playbackRate', { configurable: true, get: ritmo.get, set(v) { const antes = ritmo.get.call(this); if (Math.abs(antes - v) > 1e-6) ev('ritmo', { pista: nombrePista(this), de: +antes.toFixed(4), a: +(+v).toFixed(4), sonando: !this.paused }); ritmo.set.call(this, v); } });
  Object.defineProperty(P, 'currentTime', { configurable: true, get: pos.get, set(v) { const de = pos.get.call(this); if (Math.abs(de - v) > 1e-3) ev(this.paused ? 'posicion' : 'salto', { pista: nombrePista(this), de: +de.toFixed(3), a: +(+v).toFixed(3) }); pos.set.call(this, v); } });
  const play = P.play, pause = P.pause;
  P.play = function () { vigilarMedio(this); if (this.paused) ev('play', { pista: nombrePista(this), segundo: +this.currentTime.toFixed(3) }); return play.call(this); };
  P.pause = function () { if (!this.paused) { const pista = nombrePista(this), g = gananciaDe(pista); ev('pausa', { pista, segundo: +this.currentTime.toFixed(3), ganancia: g }); if (g !== null && g > 0.05) ev('corte', { pista, motivo: 'pausa audible', ganancia: g }); } return pause.call(this); };
}
if (globalThis.AudioBufferSourceNode) { const f = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { ev('inicioBuffer', { cuando: a[0] ?? 0, desde: a[1] ?? 0, dura: +(this.buffer?.duration ?? 0).toFixed(2) }); return f.apply(this, a); }; }

// ── Long animation frames ───────────────────────────────────────────────────────────────────────────────────────────────
try {
  new PerformanceObserver(lista => { for (const e of lista.getEntries()) {
    const s = (e.scripts || []).slice().sort((a, b) => b.duration - a.duration)[0];
    loafs.push({ t: +e.startTime.toFixed(1), dur: +e.duration.toFixed(1), bloqueo: +(e.blockingDuration ?? 0).toFixed(1), script: s ? `${(s.sourceURL || '').split('/').pop()}:${s.sourceFunctionName || s.invoker || ''} ${s.duration.toFixed(0)}ms` : '' });
  } }).observe({ type: 'long-animation-frame', buffered: true });
} catch {
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) loafs.push({ t: +e.startTime.toFixed(1), dur: +e.duration.toFixed(1), bloqueo: +(e.duration - 50).toFixed(1), script: 'longtask' }); }).observe({ type: 'longtask', buffered: true }); } catch {}
}

// ── Bucle: un registro por cuadro dibujado ──────────────────────────────────────────────────────────────────────────────
let escena = null, tUltimo = null, audioPrevio = null, introPrevio = null, viajandoAntes = false, finViajes = -Infinity, interna = '', lienzo = '';
function desfaseAuto(t) {
  if (t - ultimoDesfaseExterno < 500) return;
  const I = window.__intro;
  if (I?.empezado && I.conCancion && I.tiempo != null && !document.body.classList.contains('dentro')) {
    // El clip dibujó este valor en el cuadro anterior (su callback va después del nuestro): con el audio de entonces. Solo
    // si de verdad dibujó (su reloj cambió): con la tarjeta ya quieta no hay imagen que comparar.
    const nuevo = I.tiempo !== introPrevio; introPrevio = I.tiempo;
    if (nuevo && audioPrevio && audioPrevio[0] === 'inicio') desfases.push([t, +((I.tiempo - audioPrevio[1]) * 1000).toFixed(1), 'intro']);
    const el = medios.get('inicio'); audioPrevio = el && !el.paused && !el.seeking ? ['inicio', el.currentTime] : null; return;
  }
  audioPrevio = null;
  const c = escena?.clip; if (!c || c.segundo == null) return;
  const el = medios.get(c.id); if (!el || el.paused || el.seeking) return;
  desfases.push([t, +((c.segundo - el.currentTime) * 1000).toFixed(1), c.id]);
}
function vigilarLlegada(t) {
  if (!escena || ultimoDesfaseExterno > -Infinity) return;   // (con el reloj maestro, él informa de cada llegada: llegada())
  const v = escena.viajando || (escena.restanteViaje ?? 0) > 0;
  if (viajandoAntes && !v) {
    const el = medios.get('viajes');
    let finMusicaMs = null;
    if (el && !el.paused && !el.ended && Number.isFinite(el.duration)) finMusicaMs = +((el.duration - el.currentTime) * 1000).toFixed(1);
    else if (t - finViajes < 20000) finMusicaMs = +(finViajes - t).toFixed(1);
    ev('llegada', { destino: escena.destino, finMusicaMs, fuente: 'audio' });
  }
  viajandoAntes = v;
}
function cuadro(t) {
  requestAnimationFrame(cuadro);
  leerGPU();
  if (GPU.ext && GPU.gl) { cerrarConsulta(GPU.gl); }
  if (dibujado) {
    if (vpLlamadas > mejorVpLlamadas) { mejorVp = vpActual; mejorVpLlamadas = vpLlamadas; }
    if (tUltimo !== null) {
      const i = C.t.length;
      C.t.push(t); C.dt.push(+(t - tUltimo).toFixed(2)); C.llamadas.push(llamadas); C.triangulos.push(Math.round(triangulos)); C.puntos.push(puntos); C.interna.push(mejorVp); C.gpu.push(null);
      if (GPU.cuadro.length) GPU.pendientes.push([i, GPU.cuadro]);
    } else if (GPU.cuadro.length) GPU.pendientes.push([-1, GPU.cuadro]);
    tUltimo = t;
  } else if (GPU.cuadro.length) GPU.pendientes.push([-1, GPU.cuadro]);
  GPU.cuadro = [];
  dibujado = false; llamadas = 0; triangulos = 0; puntos = 0; mejorVp = 0; mejorVpLlamadas = 0; vpLlamadas = 0;
  desfaseAuto(t); vigilarLlegada(t);
  if (panel && t - ultimoPanel > 500) pintarPanel(t);
}
requestAnimationFrame(cuadro);

// ── Estadística ────────────────────────────────────────────────────────────────────────────────────────────────────────
const pct = (o, p) => o.length ? +o[Math.min(o.length - 1, Math.floor(o.length * p))].toFixed(2) : null;
const ordenar = a => Float64Array.from(a).sort();
function rango(t0, t1) { let a = 0, b = C.t.length; while (a < b && C.t[a] < t0) a++; let c = a; while (c < b && C.t[c] <= t1) c++; return [a, c]; }
function resumirTramo(tr) {
  const t1 = tr.fin ?? ahora(), [a, b] = rango(tr.inicio, t1);
  // El primer intervalo de un tramo se mide desde que empieza el tramo (o desde el cuadro anterior, si es más tarde): un
  // tirón al empezar es del tramo, pero el rato en que no se dibujaba nada antes (la pantalla de carga, que es HTML) no.
  const brutos = C.dt.slice(a, b);
  if (brutos.length && C.t[a] - brutos[0] < tr.inicio) brutos[0] = +Math.max(0, C.t[a] - tr.inicio).toFixed(2);
  const dt = brutos.filter(x => x < 1000 && x > 0), o = ordenar(dt), suma = dt.reduce((s, x) => s + x, 0);
  const huecos = brutos.filter(x => x >= 1000).length;
  const ll = ordenar(C.llamadas.slice(a, b)), tri = ordenar(C.triangulos.slice(a, b)), pu = ordenar(C.puntos.slice(a, b));
  const gpu = ordenar(C.gpu.slice(a, b).filter(x => x !== null));
  const pasadas = {};
  for (const [i, m] of gpuPorPasada) if (i >= a && i < b) for (const [k, v] of Object.entries(m)) (pasadas[k] ||= []).push(v);
  const porPasada = Object.fromEntries(Object.entries(pasadas).map(([k, v]) => { const s = ordenar(v); return [k, { p50: pct(s, 0.5), p95: pct(s, 0.95), cuadros: v.length }]; }).sort((x, y) => y[1].p50 - x[1].p50));
  const interna = (() => { const m = new Map(); for (let i = a; i < b; i++) m.set(C.interna[i], (m.get(C.interna[i]) || 0) + 1); let mejor = 0, n = 0; for (const [k, v] of m) if (v > n && k) { mejor = k; n = v; } return mejor; })();
  const evs = eventos.filter(e => e.t >= tr.inicio && e.t <= t1), cuenta = tipo => evs.filter(e => e.tipo === tipo).length;
  const subidas = evs.filter(e => ['textura', 'reservaTextura', 'compilacion', 'enlace', 'geometria', 'renderTarget', 'decodificacion'].includes(e.tipo));
  const ls = loafs.filter(l => l.t >= tr.inicio && l.t <= t1), ds = desfases.filter(d => d[0] >= tr.inicio && d[0] <= t1), dabs = ordenar(ds.map(d => Math.abs(d[1])));
  const audio = evs.filter(e => ['ritmo', 'salto', 'posicion', 'pausa', 'play', 'corte', 'fin', 'inicioBuffer'].includes(e.tipo));
  return {
    nombre: tr.nombre, inicio: +tr.inicio.toFixed(0), pared: tr.pared, duracion: +((t1 - tr.inicio) / 1000).toFixed(2),
    cuadros: dt.length, fps: suma ? +(dt.length * 1000 / suma).toFixed(1) : 0, p50: pct(o, 0.5), p95: pct(o, 0.95), p99: pct(o, 0.99), max: pct(o, 1),
    sobre25: dt.filter(x => x > 25).length, sobre50: dt.filter(x => x > 50).length, huecosSinDibujo: huecos,
    peores: Array.from(o.slice(-5)).reverse().map(x => +x.toFixed(1)),
    loaf: { n: ls.length, max: ls.reduce((m, l) => Math.max(m, l.dur), 0), bloqueoTotal: +ls.reduce((s, l) => s + l.bloqueo, 0).toFixed(0), peores: ls.slice().sort((x, y) => y.dur - x.dur).slice(0, 4) },
    dibujo: { llamadasP50: pct(ll, 0.5), llamadasMax: pct(ll, 1), triangulosP50: pct(tri, 0.5), triangulosMax: pct(tri, 1), puntosP50: pct(pu, 0.5) },
    resolucion: { interna: interna ? `${(interna / 1e6).toFixed(2)} MP` : null, internaPx: interna, lienzo },
    gpu: { p50: pct(gpu, 0.5), p95: pct(gpu, 0.95), max: pct(gpu, 1), cuadros: gpu.length, porPasada },
    subidas: { texturas: cuenta('textura'), reservasTextura: cuenta('reservaTextura'), compilaciones: cuenta('compilacion'), enlaces: cuenta('enlace'), geometrias: cuenta('geometria'), renderTargets: cuenta('renderTarget'), decodificaciones: cuenta('decodificacion'),
      detalle: subidas.slice(0, 40) },
    audio: { cambiosRitmo: cuenta('ritmo'), saltos: cuenta('salto'), pausas: cuenta('pausa'), cortes: cuenta('corte'), eventos: audio.slice(0, 60) },
    desfase: { muestras: ds.length, p50: pct(dabs, 0.5), p95: pct(dabs, 0.95), max: pct(dabs, 1), fuentes: [...new Set(ds.map(d => d[2]))] },
    llegadas: evs.filter(e => e.tipo === 'llegada'), marcas: evs.filter(e => e.tipo === 'marca').map(e => e.texto)
  };
}

// ── API ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const api = {
  tramo(nombre) { const t = ahora(); if (actual) actual.fin = t; actual = nombre ? { nombre, inicio: t, pared: Date.now(), fin: null } : null; if (actual) tramos.push(actual); return t; },
  get tramoActual() { return actual?.nombre ?? null; },
  resumen(nombre) { const lista = tramos.filter(t => !nombre || t.nombre === nombre).map(resumirTramo); return nombre ? lista.at(-1) ?? null : { tramos: lista, gpu: !!GPU.ext, lienzo, interna, version: 1 }; },
  // El reloj maestro (cuando exista) informa del desfase entre lo que se ve y lo que se oye, en ms (con signo).
  desfase(ms, fuente = 'reloj') { ultimoDesfaseExterno = ahora(); if (Number.isFinite(ms)) desfases.push([ultimoDesfaseExterno, +(+ms).toFixed(2), fuente]); },
  llegada({ destino = escena?.destino, finMusicaMs = null } = {}) { ev('llegada', { destino, finMusicaMs, fuente: 'reloj' }); },
  marca(texto) { ev('marca', { texto }); },
  conectar,
  get crudo() { return { cuadros: C.t.length, eventos: eventos.length, loafs: loafs.length }; }
};
window.__medidor = api;

// conectar(escena): nombres de las pasadas del compositor (para el tiempo de GPU) y la escena para llegadas y videoclips.
function conectar(e) {
  escena = e;
  const i = e?.interno, renderer = i?.renderer, gl = renderer?.getContext?.() ?? document.getElementById('galaxia')?.getContext?.('webgl2');
  if (gl && opcion !== 'singpu') { GPU.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2'); GPU.gl = GPU.ext ? gl : null; }
  const post = i?.nucleo?.post ?? i?.nucleo?.composer;
  const nombres = new Map([[i?.nucleo?.lente, 'lente'], [i?.nucleo?.salto, 'salto'], [i?.bloom, 'bloom']]);
  const nombrar = (p, k) => nombres.get(p) || (p.constructor?.name === 'RenderPass' ? 'escena' : p.constructor?.name && p.constructor.name.length > 2 ? p.constructor.name.replace(/Pass$/, '').toLowerCase() : `pasada ${k}`);
  const envolverPasadas = () => { for (const [k, p] of (post?.passes || []).entries()) { if (p.__medido) continue; p.__medido = true; const r = p.render, n = nombrar(p, k);
    p.render = function (...a) { const antes = GPU.pasada; GPU.pasada = n; if (GPU.gl) cerrarConsulta(GPU.gl); try { return r.apply(this, a); } finally { if (GPU.gl) cerrarConsulta(GPU.gl); GPU.pasada = antes; } }; } };
  envolverPasadas(); setInterval(envolverPasadas, 2000);   // (pasadas que se añadan más tarde)
  const c = document.getElementById('galaxia');
  const medirLienzo = () => { if (c) lienzo = `${c.width}×${c.height}`; };
  medirLienzo(); setInterval(medirLienzo, 1000);
}

// ── Panel ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
let panel = null, ultimoPanel = 0;
if (opcion !== 'oculto') {
  panel = document.createElement('div');
  panel.id = 'medidor-fps';
  panel.style.cssText = 'position:fixed;left:6px;top:calc(6px + env(safe-area-inset-top));z-index:2147483000;padding:4px 7px;border-radius:7px;background:#000b;color:#9f9;font:600 10px/1.3 ui-monospace,monospace;pointer-events:none;white-space:pre;max-width:calc(100vw - 12px);overflow:hidden';
  (document.body || document.documentElement).appendChild(panel);
}
function pintarPanel(t) {
  ultimoPanel = t;
  const [a, b] = rango(t - 2000, t), dt = C.dt.slice(a, b).filter(x => x < 1000), o = ordenar(dt), suma = dt.reduce((s, x) => s + x, 0);
  const g = ordenar(C.gpu.slice(a, b).filter(x => x !== null)), ds = desfases.filter(d => d[0] > t - 2000), dmax = ds.reduce((m, d) => Math.max(m, Math.abs(d[1])), 0);
  const total = tipo => eventos.reduce((n, e) => n + (e.tipo === tipo), 0);
  const ls = loafs.filter(l => l.t > t - 2000).length, ip = C.interna[b - 1] || 0;
  panel.textContent = `${suma ? (dt.length * 1000 / suma).toFixed(0) : 0} FPS · p50 ${pct(o, 0.5) ?? '-'} p95 ${pct(o, 0.95) ?? '-'} p99 ${pct(o, 0.99) ?? '-'} ms · >25 ${dt.filter(x => x > 25).length} >50 ${dt.filter(x => x > 50).length} · LoAF ${ls}\n`
    + `dibujo ${C.llamadas[b - 1] ?? 0} · tri ${((C.triangulos[b - 1] ?? 0) / 1000).toFixed(0)}k · interna ${(ip / 1e6).toFixed(2)} MP · lienzo ${lienzo} · GPU ${GPU.ext ? (pct(g, 0.5) ?? '-') + ' ms' : 'n/d'}\n`
    + `tex ${total('textura')} · comp ${total('compilacion')} · geo ${total('geometria')} · RT ${total('renderTarget')} · ritmo ${total('ritmo')} · saltos ${total('salto')} · cortes ${total('corte')} · desfase ${ds.length ? dmax.toFixed(0) + ' ms' : '-'}${actual ? '\n▸ ' + actual.nombre : ''}`;
}
