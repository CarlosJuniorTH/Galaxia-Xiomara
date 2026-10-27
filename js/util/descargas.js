// Descargas del universo, como en un juego: lo imprescindible en la pantalla de carga (contado en sus MB) y todo lo demás
// después, por prioridad y sin estorbar nunca a lo que se ve.
//  · descargas: cuánto cuenta la pantalla de carga (texturas horneadas, cielo, cálculos horneados, las canciones de la
//    intro y de los viajes); la barra muestra «X de Y MB».
//  · descargarAhora(ruta): lo que hace falta ya (la canción de un destino al elegirlo, su estancia al llegar). Sale al
//    momento aunque haya un vuelo o un clip (lo ha pedido quien mira) y devuelve su Blob.
//  · enReposo(ruta, prioridad): lo que puede esperar (las demás canciones y estancias, el cielo grande, fuentes…). Se
//    descarga de uno en uno solo cuando la página está libre (requestIdleCallback) y nada la ocupa.
//  · ocupado(motivo, sí/no): la carga, el clip, un vuelo o un gesto la ocupan; mientras, la cola no empieza nada (y un vuelo
//    o un clip cortan lo que estuviera bajando: vuelve a la cola). Al soltarse el último motivo, sigue sola.
//  · cuandoLibre(fn): trabajo que debe esperar a un momento libre (decodificar o subir una imagen a la GPU).
// Cada archivo se pide una sola vez: lo que la cola ya bajó se vuelve a leer de la caché del navegador sin preguntar al
// servidor (cache: 'force-cache'), y una petición a lo que ya está bajando espera a esa misma descarga. (Con service worker,
// él lo guarda al pasar: paquetes.js.)
const oyentes = new Set();
export const descargas = {
  total: 0, hechos: 0,
  previsto(bytes) { this.total += bytes; avisar(); },
  hecho(bytes) { this.hechos += bytes; avisar(); },
  escuchar(f) { oyentes.add(f); f(this); return () => oyentes.delete(f); }
};
function avisar() { for (const f of oyentes) f(descargas); }
// Lo que la carga pide sin contarlo por su cuenta (la página, sus módulos —three.js entre ellos—, estilos, fuentes,
// índices): se suma según llega (lo que de verdad viaja por la red, comprimido), para que la barra diga los MB reales.
// (Las texturas, el cielo, el horno y las canciones de la carga ya los cuentan quienes los piden.)
const CONTADO_APARTE = /\/assets\/(texturas|cielo|horno|musica)\//;
let vigiaCarga = null;
if (typeof PerformanceObserver === 'function' && typeof location !== 'undefined') {
  const sumar = lista => { let b = 0; for (const e of lista) if (e.name.startsWith(location.origin) && !CONTADO_APARTE.test(e.name) && e.transferSize > 0) b += e.transferSize; if (b) { descargas.total += b; descargas.hechos += b; avisar(); } };
  try { sumar(performance.getEntriesByType('resource')); vigiaCarga = new PerformanceObserver(l => sumar(l.getEntries())); vigiaCarga.observe({ type: 'resource' }); } catch {}
}

const enNavegador = typeof window !== 'undefined' && typeof fetch === 'function';
const reposo = enNavegador && typeof requestIdleCallback === 'function' ? f => requestIdleCallback(f, { timeout: 2000 }) : f => setTimeout(() => f({ timeRemaining: () => 8, didTimeout: true }), 120);
// La carga ocupa la cola desde el principio: hasta que la intro termina (main.js lo suelta) solo baja lo imprescindible.
const motivos = new Map([['carga', { cortar: true }]]);
const comprobaciones = new Set();   // ¿algo más la ocupa? (p. ej. «la escena está viajando»), por si nadie lo avisa
const cola = [];                    // [{ ruta, prioridad, orden, alTerminar[] }] de menor a mayor prioridad
const bajadas = new Map();          // ruta → promesa de su Blob (en curso o terminada y guardada)
const enCache = new Set();          // rutas ya descargadas en esta visita (en la caché del navegador o del service worker)
const tareas = [];                  // cuandoLibre()
const registro = [];                // diagnóstico/pruebas: { ruta, como, inicio, fin, motivos }
let enCurso = null, orden = 0, programado = false;

const libre = () => !motivos.size && ![...comprobaciones].some(f => { try { return f(); } catch { return false; } });

async function pedir(ruta, { prioridad = 'auto', alResponder = null, alAvance = null, senal, cache } = {}) {
  // Lo que ya se bajó en esta visita sale de la caché sin volver a preguntar (sin revalidación: una sola petición).
  const r = await fetch(ruta, { priority: prioridad, cache: cache || (enCache.has(ruta) ? 'force-cache' : 'default'), signal: senal });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { estado: r.status });
  alResponder?.(r);
  if (alAvance && r.body?.getReader) {
    const lector = r.body.getReader(), trozos = [];
    for (;;) { const { done, value } = await lector.read(); if (done) break; trozos.push(value); alAvance(value.byteLength, r); }
    return new Blob(trozos, { type: r.headers.get('content-type') || '' });
  }
  const b = await r.blob(); alAvance?.(b.size, r); return b;
}

// Lo que hace falta ya. Devuelve la promesa de su Blob (la misma para todas las peticiones a esa ruta mientras se guarde).
// No se retiene en la página: una vez entregado se suelta (si se vuelve a pedir, sale de la caché, sin red).
// alResponder(respuesta): en cuanto responde el servidor (antes del cuerpo); alAvance(bytes): cada trozo que llega.
export function descargarAhora(ruta, { alResponder = null, alAvance = null, prioridad = 'high' } = {}) {
  if (!enNavegador) return Promise.reject(new Error('sin red'));
  const previa = bajadas.get(ruta); if (previa) return previa;
  // Si estaba en la cola, sale de ella (ya no hace falta esperar al reposo); si la cola la está bajando, se espera a esa.
  const i = cola.findIndex(x => x.ruta === ruta); const enCola = i >= 0 ? cola.splice(i, 1)[0] : null;
  const anotar = { ruta, como: 'ahora', inicio: performance.now(), motivos: [...motivos.keys()], deCache: enCache.has(ruta) }; registro.push(anotar);
  const antes = enCurso?.ruta === ruta ? new Promise(f => enCurso.alTerminar.push(f)) : Promise.resolve();
  const p = antes.then(() => pedir(ruta, { prioridad, alResponder, alAvance })).then(b => { enCache.add(ruta); anotar.fin = performance.now(); enCola?.alTerminar.forEach(f => f(true)); return b; },
    e => { anotar.fallo = e.message; enCola?.alTerminar.forEach(f => f(false)); throw e; })
    .finally(() => bajadas.delete(ruta));
  bajadas.set(ruta, p); return p;
}

// Lo que puede esperar a un momento libre (prioridad: menor = antes). Devuelve una promesa que se cumple (true/false)
// cuando está descargado (o ha fallado). Lo ya descargado en esta visita se cumple en el acto.
export function enReposo(ruta, prioridad = 5) {
  if (!enNavegador) return Promise.resolve(false);
  if (enCache.has(ruta)) return Promise.resolve(true);
  if (bajadas.has(ruta)) return bajadas.get(ruta).then(() => true, () => false);
  if (enCurso?.ruta === ruta) return new Promise(f => enCurso.alTerminar.push(f));
  let x = cola.find(c => c.ruta === ruta);
  if (x) { if (prioridad < x.prioridad) { x.prioridad = prioridad; ordenar(); } }
  else { x = { ruta, prioridad, orden: orden++, alTerminar: [] }; cola.push(x); ordenar(); }
  programar();
  return new Promise(f => x.alTerminar.push(f));
}
const ordenar = () => cola.sort((a, b) => a.prioridad - b.prioridad || a.orden - b.orden);

// Motivos que ocupan la página: 'carga', 'clip', 'vuelo', 'gesto'… cortar: lo que la cola esté bajando se cancela y
// vuelve a la cola (un vuelo o un clip no comparten la red ni el hilo con nada).
export function ocupado(motivo, si = true, { cortar = motivo !== 'gesto' } = {}) {
  if (si) {
    motivos.set(motivo, { cortar });
    if (cortar && enCurso) enCurso.cortar.abort();
  } else if (motivos.delete(motivo)) {
    if (motivo === 'carga') { vigiaCarga?.disconnect(); vigiaCarga = null; }   // (lo de después ya no es de la carga)
    programar();
  }
}
// Otra forma de saber si está ocupada (la escena viajando…): se consulta antes de empezar cada descarga.
export function ocupadoSi(fn) { comprobaciones.add(fn); return () => comprobaciones.delete(fn); }

// Trabajo para un momento libre (decodificar una imagen, subirla a la GPU): fn se ejecuta en un reposo sin motivos.
export function cuandoLibre(fn) { return new Promise((ok, mal) => { tareas.push({ fn, ok, mal }); programar(); }); }

function programar() {
  if (programado || !enNavegador) return;
  programado = true;
  reposo(paso);
}
function paso(plazo) {
  programado = false;
  if (!libre()) { if (cola.length || tareas.length) setTimeout(programar, 400); return; }
  // Primero las tareas (cortas), una por reposo, con margen.
  if (tareas.length && (plazo?.timeRemaining?.() ?? 8) > 4) {
    const t = tareas.shift();
    try { Promise.resolve(t.fn()).then(t.ok, t.mal); } catch (e) { t.mal(e); }
  }
  if (!enCurso && cola.length) bajar(cola.shift());
  if (tareas.length || (!enCurso && cola.length)) programar();
}
function bajar(x) {
  const cortar = new AbortController(), anotar = { ruta: x.ruta, como: 'reposo', inicio: performance.now(), motivos: [] };
  x.cortar = cortar; enCurso = x; registro.push(anotar);
  // (El Blob no se guarda: la descarga deja el archivo en la caché y quien lo use lo leerá de ahí.)
  // (Lo que no es música, sin revalidar lo que ya esté en la caché: los módulos que importan los obreros no salen en
  // performance de la página y se pedirían otra vez.)
  pedir(x.ruta, { prioridad: 'low', senal: cortar.signal, cache: /\.m4a$/.test(x.ruta) ? undefined : 'force-cache' }).then(() => {
    enCache.add(x.ruta); anotar.fin = performance.now();
    for (const f of x.alTerminar.splice(0)) f(true);
  }, e => {
    if (cortar.signal.aborted) { anotar.cortada = performance.now(); cola.unshift(x); return; }   // vuelve a la cola, la primera
    anotar.fallo = e.message; for (const f of x.alTerminar.splice(0)) f(false);
  }).finally(() => { enCurso = null; programar(); });
}

// Diagnóstico (y pruebas con #debug): qué hay en la cola, qué la ocupa y qué se ha descargado y cuándo.
export const red = {
  descargarAhora, enReposo, ocupado, ocupadoSi, cuandoLibre,
  estado: () => ({ motivos: [...motivos.keys()], libre: libre(), pendientes: cola.map(x => x.ruta), enCurso: enCurso?.ruta ?? null, tareas: tareas.length, descargadas: enCache.size }),
  registro
};
if (enNavegador && location.hash === '#debug') window.__red = red;
