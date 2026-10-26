import { descargas } from '../util/descargas.js';
import { configuracionActiva, FUNDIDO } from '../data/bandaSonora.js';
import { marcasCruzadas, momentoReposo } from '../util/sincronia.js';
import { partesEnZona } from '../util/tiempo.js';
// Banda sonora sincronizada: una canción por momento (js/data/bandaSonora.js) y un mezclador con un GainNode por pista y
// fundidos entre momentos. Sin archivos configurados no descarga nada y todo suena como siempre: el ambiente que genera
// js/ui/musica.js, que aquí es un canal más («ambiente»).
// Cada pista es un <audio> conectado al contexto con MediaElementSource (no decodeAudioData): en el iPhone una canción de
// minutos decodificada ocupa decenas de MB en memoria (PCM sin comprimir) y tarda en decodificarse de una vez; el
// elemento la reproduce en continuo desde el archivo comprimido, y el GainNode hace los fundidos (en iOS audio.volume no se
// puede cambiar). El archivo se descarga con fetch (así se cuentan los bytes en la pantalla de carga) y se le da al
// elemento como blob: suena sin volver a pedirlo a la red ni depender de peticiones por rangos.

// Medio segundo de silencio en WAV: en iOS cada <audio> necesita un play() dentro de un toque para poder sonar después
// sin él. En el toque se «desbloquean» todas las pistas (las que aún se descargan, con este silencio).
const SILENCIO = (() => {
  const n = 4000, b = new DataView(new ArrayBuffer(44 + n * 2)), txt = (o, s) => { for (let i = 0; i < s.length; i++) b.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); txt(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); txt(36, 'data'); b.setUint32(40, n * 2, true);
  let s = ''; for (const x of new Uint8Array(b.buffer)) s += String.fromCharCode(x);
  return 'data:audio/wav;base64,' + btoa(s);
})();
// Se cuentan en la pantalla de carga (se descargan con ella); los demás, al viajar hacia su destino o en segundo plano.
const CON_LA_CARGA = new Set(['inicio', 'viajes']);
const FUNDIDO_ESTANCIA = 3;   // de la canción de un lugar a su versión instrumental (estancia): más lento, sin que se note

export function crearBandaSonora({ volumen = () => 0.85 } = {}) {
  const { carpeta, momentos } = configuracionActiva();
  const pistas = new Map();
  for (const [nombre, conf] of Object.entries(momentos)) if (conf?.archivo) {
    // existe: se resuelve en cuanto el servidor responde (true) o falla (false: 404 en GitHub Pages, sin red…).
    let avisar; const existe = new Promise(r => { avisar = r; });
    pistas.set(nombre, { nombre, conf, url: carpeta + conf.archivo, estado: 'pendiente', contar: CON_LA_CARGA.has(nombre), previsto: 0, nivel: 0, previo: -1e-3, existe, avisar });
  }
  const ambiente = { nombre: 'ambiente', nivel: 0, encendido: false, registro: null };
  const oyentes = new Set();
  let ctx = null, maestro = null, activa = false, objetivo = null, lugar = 'hogar', protegerInicio = false, vigia = 0, vigiaViaje = 0, viajeId = null, viajeEnCurso = null, primeraLlegada = false;

  // Índice que escribe scripts/preparar-audio.mjs: bytes (total de MB de la carga, conocido antes de descargar) y duración.
  const indice = pistas.size ? fetch(carpeta + 'indice.json').then(r => r.ok ? r.json() : {}).catch(() => ({})) : Promise.resolve({});
  indice.then(i => {
    let suma = 0;
    for (const p of pistas.values()) { const info = i[p.conf.archivo]; if (info?.duracion) p.duracionIndice = info.duracion; if (p.contar && info?.bytes) { p.previsto = info.bytes; suma += info.bytes; } }
    if (suma) descargas.previsto(suma);
  });

  function descargar(p) {
    if (p.promesa) return p.promesa;
    p.estado = 'descargando';
    return p.promesa = (async () => {
      let contados = 0;
      try {
        await indice;
        const r = await fetch(p.url, { priority: p.contar ? 'high' : 'low' });
        if (!r.ok) throw Error(`HTTP ${r.status}`);
        p.avisar(true);
        // Sin entrada en el índice, al menos lo que diga el servidor (el total crece un poco al empezar).
        if (p.contar && !p.previsto) { p.previsto = Number(r.headers.get('content-length')) || 0; if (p.previsto) descargas.previsto(p.previsto); }
        const trozos = [];
        // Las que no cuentan en la barra de carga (las de los destinos, que bajan en segundo plano justo cuando empieza la
        // entrada tras la intro) se reciben enteras, sin leerlas a trozos: cada trozo despertaba al hilo principal
        // (10–40 ms con la CPU ×4, encima de los cuadros del vuelo de entrada) y además se copiaba a la memoria de la página.
        if (!p.contar) { trozos.push(await r.blob()); }
        else if (r.body?.getReader) {
          const lector = r.body.getReader();
          for (;;) { const { done, value } = await lector.read(); if (done) break; trozos.push(value); const k = Math.min(value.byteLength, p.previsto - contados); if (k > 0) { contados += k; descargas.hecho(k); } }
        } else { trozos.push(await r.arrayBuffer()); if (p.previsto) { descargas.hecho(p.previsto); contados = p.previsto; } }
        if (contados < p.previsto) { descargas.previsto(contados - p.previsto); p.previsto = contados; }   // el contador siempre termina
        p.blobUrl = URL.createObjectURL(new Blob(trozos, { type: /\.m4a$/i.test(p.url) ? 'audio/mp4' : r.headers.get('content-type') || '' }));
        p.estado = 'lista';
        if (p.el) { p.conSilencio = false; p.el.src = p.blobUrl; }
        // Su estancia (la instrumental para después), detrás y sin prisa.
        const e = pistas.get(`${p.nombre}-estancia`); if (e) setTimeout(() => descargar(e), 1000);
        if (objetivo === p.nombre) aplicar();
      } catch (e) {
        console.warn(`Banda sonora: sin «${p.nombre}» (${e.message}); suena el ambiente.`);
        p.estado = 'fallo'; p.avisar(false); if (contados < p.previsto) descargas.previsto(contados - p.previsto);
        if (objetivo === p.nombre) ir('reposo');
      }
    })();
  }
  // Desde que se abre la página: la canción de la portada primero (hace falta al tocar) y la de los viajes detrás.
  if (pistas.has('inicio')) descargar(pistas.get('inicio')).then(() => pistas.has('viajes') && descargar(pistas.get('viajes')));
  else if (pistas.has('viajes')) descargar(pistas.get('viajes'));

  function crearContexto() {
    if (ctx) return ctx;
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return null;
    // «playback»: búfer de salida más grande (menos trabajo y menos cortes en el móvil); aquí nada necesita latencia baja.
    try { ctx = new Contexto({ latencyHint: 'playback' }); } catch { ctx = new Contexto(); }
    maestro = ctx.createGain(); maestro.connect(ctx.destination); vigilarEstado();
    ambiente.ganancia = ctx.createGain(); ambiente.ganancia.gain.value = 0; ambiente.ganancia.connect(maestro);
    for (const p of pistas.values()) prepararElemento(p);
    return ctx;
  }
  function prepararElemento(p) {
    const el = p.el = new Audio(); el.preload = p.contar ? 'auto' : 'metadata'; el.loop = !!p.conf.bucle; el.setAttribute('playsinline', '');
    p.ganancia = ctx.createGain(); p.ganancia.gain.value = 0;
    ctx.createMediaElementSource(el).connect(p.ganancia); p.ganancia.connect(maestro);
    el.addEventListener('ended', () => { p.sonando = false; p.fin = { t: duracionDe(p) || el.currentTime, en: performance.now() }; if (objetivo === p.nombre) despues(p); });
    el.addEventListener('error', () => { if (!p.conSilencio && p.estado === 'lista') { p.estado = 'fallo'; console.warn(`Banda sonora: «${p.nombre}» no se puede reproducir en este navegador.`); if (objetivo === p.nombre) ir('reposo'); } });
    if (p.blobUrl) el.src = p.blobUrl;
  }
  const duracionDe = p => p.conf.duracion || p.duracionIndice || (Number.isFinite(p.el?.duration) ? p.el.duration : 0);
  const volumenDe = canal => canal === ambiente ? 1 : Math.max(0, Math.min(1, (canal.conf.volumen ?? 1) * volumen()));
  const reposo = () => momentoReposo(lugar, partesEnZona().mes, n => pistas.get(n)?.estado !== 'fallo' && pistas.has(n));
  // Qué se oye ahora: el objetivo, o mientras su archivo llega, el ambiente (la portada espera en silencio a su canción).
  function audible() {
    const p = pistas.get(objetivo);
    if (!p || p.estado === 'lista') return objetivo;
    return p.nombre === 'inicio' ? null : 'ambiente';
  }

  // Reloj de una pista en segundos dentro del fragmento: audio.currentTime, suavizado con el reloj de la página (en
  // algunos navegadores currentTime avanza a saltos de 20–250 ms y la animación iría a tirones) y corregido en cuanto se
  // separa más de 0,3 s (un atasco, una vuelta del bucle, un salto). Acabado el fragmento sigue contando al mismo ritmo.
  function reloj(p) {
    const ahora = performance.now();
    if (p.fin) return p.fin.t + (ahora - p.fin.en) / 1000;
    const el = p.el, real = el.currentTime;
    if (el.paused || el.ended) { p.ancla = null; return real; }
    if (!p.ancla) p.ancla = { t: real, en: ahora };
    const estimado = p.ancla.t + (ahora - p.ancla.en) / 1000 * el.playbackRate;
    if (Math.abs(estimado - real) > 0.3) { p.ancla = { t: real, en: ahora }; return real; }
    return estimado;
  }

  function rampa(param, valor, duracion) {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(valor, t + duracion);
  }
  // Lleva cada canal a su nivel: el audible a su volumen, los demás a cero; el que se queda en silencio se pausa al
  // terminar su fundido (ni un <audio> ni el ambiente siguen trabajando sin oírse).
  function aplicar(duracion = FUNDIDO) {
    if (!ctx) return;
    const oir = activa && !document.hidden ? audible() : null;
    for (const canal of [ambiente, ...pistas.values()]) {
      if (!canal.ganancia) continue;
      if (canal.nombre === oir && canal.saltarA !== undefined && canal.estado === 'lista') {
        canal.el.currentTime = canal.saltarA; canal.previo = canal.saltarA - 1e-3; canal.ancla = null; canal.fin = null; delete canal.saltarA;
      }
      const nivel = canal.nombre === oir ? volumenDe(canal) : 0;
      if (nivel === canal.nivel && (nivel === 0 || sonando(canal))) continue;
      canal.nivel = nivel; rampa(canal.ganancia.gain, nivel, duracion); clearTimeout(canal.parada);
      if (nivel > 0) arrancar(canal); else canal.parada = setTimeout(() => detener(canal), (duracion + 0.25) * 1000);
    }
  }
  const sonando = canal => canal === ambiente ? canal.encendido : !!canal.el && !canal.el.paused;
  function arrancar(canal) {
    if (canal === ambiente) { if (!ambiente.encendido) { ambiente.encendido = true; ambiente.registro?.encender(); } return; }
    const p = canal; if (p.estado !== 'lista' || p.conSilencio) return;
    p.sonando = true;
    if (p.el.paused) {
      if (p.el.ended || (!p.conf.bucle && p.el.currentTime >= duracionDe(p) - 0.05)) { p.el.currentTime = 0; p.previo = -1e-3; }
      p.fin = null; p.ancla = null;
      p.el.play().catch(e => console.warn(`Banda sonora: «${p.nombre}» no arranca (${e.name}).`));
    }
    if (!vigia) vigia = setInterval(vigilar, 100);
  }
  function detener(canal) {
    if (canal.nivel > 0) return;
    if (canal === ambiente) { if (ambiente.encendido) { ambiente.encendido = false; ambiente.registro?.apagar(); } return; }
    const p = canal; p.sonando = false;
    if (p.el && !p.el.paused) {
      // Parada en el fundido final (o casi al final): su reloj sigue contando, como si el fragmento acabara solo.
      if (!p.conf.bucle && duracionDe(p) && p.el.currentTime >= duracionDe(p) - FUNDIDO - 0.4) p.fin = { t: p.el.currentTime, en: performance.now() };
      p.el.pause();
    }
  }

  // Avisos de marcas y fundido de salida de los fragmentos sin bucle (diez veces por segundo, solo mientras algo suena).
  function vigilar() {
    let alguna = false;
    for (const p of pistas.values()) {
      if (!p.sonando || !p.el || p.el.paused) continue;
      alguna = true;
      const t = reloj(p), dur = duracionDe(p);
      if (oyentes.size) for (const marca of marcasCruzadas(p.conf.marcas, p.previo, t, { duracion: dur, bucle: p.conf.bucle })) emitir({ momento: p.nombre, marca, segundo: p.conf.marcas[marca] });
      p.previo = t;
      // El fragmento ya trae su fundido de salida: el reposo entra a la vez, sin hueco de silencio. (La de los viajes no:
      // su final es la llegada, y al llegar se funde con lo que toque.)
      if (!p.conf.bucle && !p.conf.hastaLlegar && dur && objetivo === p.nombre && t >= dur - fundidoTras(p)) despues(p, t);
    }
    if (!alguna) { clearInterval(vigia); vigia = 0; }
  }
  // Al acabar un fragmento: su estancia, si la tiene (fundido de 3 s), y si no (o al acabar la estancia), el reposo.
  // La estancia es la continuación de la canción: su segundo 0 es el segundo «duración − 3» del fragmento (los dos suenan
  // a la vez durante el fundido, en el mismo compás). Como este aviso llega hasta 0,1 s tarde, la estancia arranca en lo
  // que ya lleva de retraso (t − (duración − 3)), para que sus golpes caigan encima de los del fragmento.
  const estanciaDe = p => pistas.get(`${p.nombre}-estancia`);
  const fundidoTras = p => estanciaDe(p) && estanciaDe(p).estado !== 'fallo' ? FUNDIDO_ESTANCIA : FUNDIDO;
  function despues(p, t = duracionDe(p)) {
    const e = estanciaDe(p);
    if (!e || e.estado === 'fallo') return ir('reposo');
    const retraso = Math.max(0, Math.min(FUNDIDO_ESTANCIA, t - (duracionDe(p) - FUNDIDO_ESTANCIA)));
    ir(e.nombre, { desde: Number.isFinite(retraso) ? +retraso.toFixed(3) : 0, fundido: FUNDIDO_ESTANCIA });
  }
  function emitir(aviso) { for (const f of oyentes) { try { f(aviso); } catch (e) { console.error(e); } } }

  function ir(nombre, { desde, fundido = FUNDIDO } = {}) {
    if (nombre === 'reposo' || (nombre !== 'ambiente' && !pistas.has(nombre)) || pistas.get(nombre)?.estado === 'fallo') nombre = reposo();
    const p = pistas.get(nombre);
    if (p && desde !== undefined && desde !== null) p.saltarA = desde;
    objetivo = nombre;
    if (p && p.estado !== 'lista') descargar(p);
    aplicar(fundido);
  }

  // Pausa al cambiar de aplicación o bloquear el teléfono; al volver, entra con un fundido.
  // Al irse: el maestro baja en ~0,1 s y el contexto se suspende después (antes, la ganancia a 0 de golpe y la suspensión en
  // el acto daban un chasquido feo). Al volver: iOS deja a menudo el contexto «interrumpido» y resume() fuera de un toque no
  // hace nada, así que se reintenta y, si sigue parado, se reanuda en el siguiente toque de la pantalla (antes el sonido no
  // volvía nunca, ni apagando y encendiendo la música).
  let suspension = 0, pidiendoToque = false;
  const reanudarConToque = () => {
    if (pidiendoToque) return; pidiendoToque = true;
    const alTocar = () => { if (!ctx || ctx.state === 'running') { quitar(); return; } ctx.resume().then(() => { if (ctx.state === 'running') { quitar(); aplicar(1.2); } }).catch(() => {}); };
    const quitar = () => { pidiendoToque = false; for (const ev of ['pointerdown', 'touchend', 'keydown']) removeEventListener(ev, alTocar, true); };
    for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, alTocar, true);
  };
  const reanudar = () => {
    if (!ctx || document.hidden) return;
    clearTimeout(suspension);
    maestro.gain.cancelScheduledValues(ctx.currentTime); maestro.gain.setValueAtTime(1, ctx.currentTime);
    const despues = () => { if (ctx.state === 'running') aplicar(1.2); else reanudarConToque(); };
    if (ctx.state === 'running') { aplicar(1.2); return; }
    ctx.resume().then(despues, despues); setTimeout(despues, 600);
  };
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      const t = ctx.currentTime; maestro.gain.cancelScheduledValues(t); maestro.gain.setValueAtTime(maestro.gain.value, t); maestro.gain.linearRampToValueAtTime(0, t + 0.12);
      clearTimeout(suspension);
      suspension = setTimeout(() => {
        if (!document.hidden) return;
        for (const canal of [ambiente, ...pistas.values()]) { if (!canal.ganancia) continue; canal.ganancia.gain.cancelScheduledValues(ctx.currentTime); canal.ganancia.gain.value = 0; canal.nivel = 0; clearTimeout(canal.parada); detener(canal); }
        ctx.suspend().catch(() => {});
      }, 160);
    } else reanudar();
  });
  // iOS también interrumpe el contexto sin ocultar la página (una llamada, Siri, otra app que suena): al volver a estar
  // libre, se reanuda igual.
  addEventListener('pageshow', reanudar);
  function vigilarEstado() { if (ctx && !ctx.__vigilado) { ctx.__vigilado = true; ctx.addEventListener('statechange', () => { if (ctx.state !== 'running' && !document.hidden && activa) setTimeout(reanudar, 300); }); } }

  return {
    // Hay canción de portada configurada (aún sin saber si su archivo está).
    get conInicio() { return pistas.has('inicio'); },
    // Promesa: true si el archivo de la canción de portada está (el servidor respondió bien), false si no.
    get inicioDisponible() { return pistas.get('inicio')?.existe ?? Promise.resolve(false); },
    get activa() { return activa; },
    get objetivo() { return objetivo; },
    tiene: nombre => pistas.has(nombre) && pistas.get(nombre).estado !== 'fallo',
    // Promesa: la canción de ese momento descargada y, si ya tiene su <audio>, con datos para sonar sin esperar (como mucho
    // `plazo` ms). La intro no empieza su clip hasta tenerla así (todo preparado antes: sin arranques a trompicones).
    preparada(nombre, plazo = 4000) {
      const p = pistas.get(nombre); if (!p) return Promise.resolve(false);
      const t0 = performance.now();
      return new Promise(fin => { const mirar = () => {
        if (p.estado === 'fallo') return fin(false);
        if (p.estado === 'lista' && (!p.el || p.conSilencio || p.el.readyState >= 3)) return fin(true);
        if (performance.now() - t0 > plazo && p.estado === 'lista') return fin(true);
        setTimeout(mirar, 80);
      }; mirar(); });
    },
    marcas: nombre => ({ ...(pistas.get(nombre)?.conf.marcas || {}) }),
    config: nombre => ({ ...(pistas.get(nombre)?.conf || {}) }),
    // Lo que dura el fragmento de ese momento (0 si no tiene canción o su archivo falta): la escena de un gigante dura eso.
    duracion: nombre => { const p = pistas.get(nombre); return p && p.estado !== 'fallo' ? duracionDe(p) : 0; },
    // El contexto de audio compartido (también el ambiente y la supernova sintética); se crea parado hasta un toque.
    contexto: crearContexto,
    entradaAmbiente() { crearContexto(); return ambiente.ganancia; },
    registrarAmbiente(registro) { ambiente.registro = registro; },
    // Dentro de un toque (síncrono): reanuda el contexto y deja cada pista lista para sonar sin otro toque (iOS).
    desbloquear() {
      if (!crearContexto()) return false;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      for (const p of pistas.values()) {
        if (p.desbloqueada) continue;
        p.desbloqueada = true;
        if (!p.el.src) { p.conSilencio = true; p.el.src = SILENCIO; }
        p.el.play()?.then(() => { if (!p.sonando) { p.el.pause(); if (!p.conSilencio) p.el.currentTime = 0; } }).catch(() => {});
      }
      return true;
    },
    // El botón de música (y el toque de la portada): con ella apagada nada suena ni se descarga de más.
    activar(valor) { activa = !!valor; if (activa && objetivo === null) objetivo = reposo(); if (activa && ctx && ctx.state !== 'running') { ctx.resume().catch(() => {}); maestro.gain.setValueAtTime(1, ctx.currentTime); } aplicar(activa ? 0.8 : 0.3); },
    ir,
    // La ceremonia de un lugar (la supernova): su canción desde el principio, a la vez que la animación.
    ceremonia: (nombre, desde = 0) => ir(nombre, { desde }),
    // Segundo dentro del fragmento de ese momento (null si no tiene canción o no se pudo cargar; 0 hasta que suena).
    tiempo(nombre) {
      const p = pistas.get(nombre);
      if (!p || p.estado === 'fallo') return null;
      if (!p.el || p.conSilencio || p.estado !== 'lista') return 0;
      return reloj(p);
    },
    // ¿Suena ahora mismo la canción de ese momento? (sin memoria nueva: lo pregunta una escena en cada cuadro)
    suena(nombre) { const p = pistas.get(nombre); return !!p && p.sonando && !!p.el && !p.el.paused && !p.conSilencio && p.estado === 'lista'; },
    pasada(nombre, marca) { const s = pistas.get(nombre)?.conf.marcas?.[marca], t = this.tiempo(nombre); return Number.isFinite(s) && t !== null && t >= s; },
    // fn({ momento, marca, segundo }) al cruzar cada marca; devuelve cómo dejar de escuchar.
    alMarca(fn) { oyentes.add(fn); return () => oyentes.delete(fn); },
    // Al entrar: el vuelo de entrada no corta la canción de la portada (termina sola y se funde con el reposo).
    entrar() { protegerInicio = objetivo === 'inicio'; primeraLlegada = true; },
    // Un viaje empieza (alViajar de la escena): su canción se pide ya; al despegar de verdad, la de los viajes; al llegar
    // (viajando() vuelve a ser falso), la del destino o el reposo. Si en 1,5 s no hay vuelo, es un cambio en el sitio.
    // ceremoniaPendiente(): al llegar, el lugar va a empezar su ceremonia (la supernova que aún no ha estallado); entonces
    // su canción espera a ella (ceremonia()) para que las fases caigan en sus marcas.
    // restante(): segundos que le quedan al viaje entero. La música de los viajes (hastaLlegar) entra en el segundo
    // duración − restante para acabar justo al llegar, y el fundido hacia la del destino empieza un poco antes de parar.
    viajar(id, { viajando, restante = () => 0, ceremoniaPendiente = () => false }) {
      const p = pistas.get(id); if (p && p.estado === 'pendiente') descargar(p);
      // El segundo tramo de un viaje que cruza al sistema solar vuelve a avisar del mismo destino: el viaje sigue.
      if (vigiaViaje && viajeId === id) return;
      clearInterval(vigiaViaje); viajeId = id;
      const antes = objetivo, t0 = performance.now(); let visto = false;
      const fin = () => { clearInterval(vigiaViaje); vigiaViaje = 0; viajeId = null; llegar(id, antes, ceremoniaPendiente(id)); };
      viajeEnCurso = { id, fin };
      vigiaViaje = setInterval(() => {
        const v = viajando();
        if (v && !visto) {
          visto = true;
          const m = pistas.get('viajes');
          if (m && m.estado !== 'fallo' && !(protegerInicio && objetivo === 'inicio')) ir('viajes', m.conf.hastaLlegar ? { desde: Math.max(0, (duracionDe(m) || 15) - restante()) } : {});
        }
        // (La llegada la avisa la escena en el cuadro exacto, llegada(); esto es por si no lo hiciera.)
        if ((visto && !v) || (!visto && performance.now() - t0 > 1500)) fin();
      }, 120);
    },
    // El viaje terminó en este cuadro (la escena lo avisa): la canción del destino empieza a la vez que su animación.
    llegada(id) { if (viajeEnCurso && viajeEnCurso.id === id && vigiaViaje) viajeEnCurso.fin(); },
    // La carga terminó: el resto de canciones (la del mes, primero) se descarga despacio, de una en una.
    cargaTerminada() {
      const mes = `mes-${partesEnZona().mes}`;
      // (Las estancias no: cada una se pide al terminar de bajar su canción.)
      const cola = [...pistas.values()].filter(p => !p.conf.esEstancia && (!p.nombre.startsWith('mes-') || p.nombre === mes)).sort((a, b) => (b.nombre === mes) - (a.nombre === mes));
      const siguiente = () => { const p = cola.shift(); if (p) descargar(p).then(() => setTimeout(siguiente, 1500)); };
      setTimeout(siguiente, 3000);
    },
    // Para las pruebas (?pruebaAudio) y el diagnóstico.
    estado() {
      const pistasEstado = {};
      for (const p of pistas.values()) pistasEstado[p.nombre] = { estado: p.estado, nivel: p.nivel, ganancia: p.ganancia ? +p.ganancia.gain.value.toFixed(3) : 0, sonando: !!p.el && !p.el.paused, tiempo: this.tiempo(p.nombre), previsto: p.previsto };
      return { contexto: ctx?.state ?? null, activa, objetivo, audible: audible(), lugar, ambiente: { nivel: ambiente.nivel, encendido: ambiente.encendido, ganancia: ambiente.ganancia ? +ambiente.ganancia.gain.value.toFixed(3) : 0 }, pistas: pistasEstado };
    }
  };
  function llegar(id, antes, espera) {
    lugar = id; viajeEnCurso = null;
    const entrada = primeraLlegada; primeraLlegada = false;
    if (protegerInicio) { protegerInicio = false; if (objetivo === 'inicio') return; }
    // La canción de casa es la de volver: al terminar el vuelo de entrada, el reposo.
    if (id === 'hogar' && entrada) { ir('reposo'); return; }
    // Si el lugar va a empezar su ceremonia, su canción espera a ella (ceremonia()); mientras, el reposo.
    if (pistas.has(id) && !espera) ir(id, { desde: antes === id ? null : 0 }); else ir('reposo');
  }
}
