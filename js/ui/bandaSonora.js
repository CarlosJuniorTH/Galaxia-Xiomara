import { descargas, descargarAhora } from '../util/descargas.js';
import { configuracionActiva, FUNDIDO } from '../data/bandaSonora.js';
import { marcasCruzadas, momentoReposo } from '../util/sincronia.js';
import { partesEnZona } from '../util/tiempo.js';
import { relojMaestro } from '../util/relojMaestro.js';
// Banda sonora sincronizada: una canción por momento (js/data/bandaSonora.js) y un mezclador con un GainNode por pista y
// fundidos entre momentos. Sin archivos configurados no descarga nada y todo suena como siempre: el ambiente que genera
// js/ui/musica.js, que aquí es un canal más («ambiente»).
//
// Un solo reloj (js/util/relojMaestro.js, el del AudioContext): las canciones con marcas visuales (la intro, la de los
// viajes y la de cada destino) son AudioBufferSourceNode programados en él. Cada una tiene un ANCLA: el instante del reloj
// maestro en que está en su segundo 0; su segundo es (reloj − ancla) y la imagen que lo lee no se separa nunca de lo que
// suena. Nada las sigue ni las corrige: ni playbackRate, ni saltos, ni sondeo de currentTime.
//  · Se decodifican justo a tiempo: la intro y la de los viajes en la carga; la de un destino en cuanto se elige (durante el
//    vuelo). En memoria solo la que suena, la del destino, la del lugar y la de los viajes: las demás se liberan (iOS).
//  · La de los viajes arranca una vez por viaje con su ancla en (llegada − su duración): acaba justo al aterrizar.
//  · Si una canción aún no está lista cuando le toca (se decodifica), su ancla ya está fijada: entra después, en su sitio.
// Las estancias (sin marcas: la instrumental de cada lugar) siguen siendo un <audio> conectado al contexto
// (MediaElementSource), con el fundido de siempre: son largas y así no ocupan memoria decodificadas.

// Medio segundo de silencio en WAV: en iOS cada <audio> necesita un play() dentro de un gesto para poder sonar después sin
// él. Las estancias se desbloquean una a una, una por gesto (nunca más de un play() por gesto).
const SILENCIO = (() => {
  const n = 4000, b = new DataView(new ArrayBuffer(44 + n * 2)), txt = (o, s) => { for (let i = 0; i < s.length; i++) b.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); txt(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); txt(36, 'data'); b.setUint32(40, n * 2, true);
  let s = ''; for (const x of new Uint8Array(b.buffer)) s += String.fromCharCode(x);
  return 'data:audio/wav;base64,' + btoa(s);
})();
// Se cuentan en la pantalla de carga y se decodifican con ella; las demás las baja después la cola de descargas en los
// momentos libres (js/util/precarga.js, al caché) y se leen de ahí al elegir su destino (descargarAhora: si aún no habían
// llegado, se piden en ese momento).
const CON_LA_CARGA = new Set(['inicio', 'viajes']);
const FUNDIDO_ESTANCIA = 3;   // de la canción de un lugar a su versión instrumental (estancia): más lento, sin que se note
const ARRANQUE = 0.12;        // una canción se programa así de lejos en el futuro (más la latencia de salida)
const MARGEN = 0.03;          // lo mínimo por delante del contexto para programar algo
const CRUCE = 0.4;            // fundido cruzado de la música de los viajes al encadenar un viaje con otro
const ANTICLIC = 0.015;       // una voz que entra a mitad de canción sube en esto (sin chasquido)

export function crearBandaSonora({ volumen = () => 0.85 } = {}) {
  const { carpeta, momentos } = configuracionActiva();
  const pistas = new Map();
  for (const [nombre, conf] of Object.entries(momentos)) if (conf?.archivo) {
    // existe: se resuelve en cuanto el servidor responde (true) o falla (false: 404 en GitHub Pages, sin red…).
    let avisar; const existe = new Promise(r => { avisar = r; });
    pistas.set(nombre, { nombre, conf, url: carpeta + conf.archivo, bufer: !conf.esEstancia, estado: 'pendiente', contar: CON_LA_CARGA.has(nombre), previsto: 0, nivel: 0, previo: -1e-3, ancla: null, desdePedido: null, voz: null, existe, avisar });
  }
  const ambiente = { nombre: 'ambiente', nivel: 0, encendido: false, registro: null };
  const oyentes = new Set(), aterrizajes = [];
  let ctx = null, maestro = null, activa = false, objetivo = null, lugar = 'hogar', protegerInicio = false, viajeEnCurso = null, primeraLlegada = false, silencioDado = false, ultimoCuadro = -1;

  // Índice que escribe scripts/preparar-audio.mjs: bytes (total de MB de la carga, conocido antes de descargar) y duración.
  const indice = pistas.size ? fetch(carpeta + 'indice.json').then(r => r.ok ? r.json() : {}).catch(() => ({})) : Promise.resolve({});
  indice.then(i => {
    let suma = 0;
    for (const p of pistas.values()) { const info = i[p.conf.archivo]; if (info?.duracion) p.duracionIndice = info.duracion; if (p.contar && info?.bytes) { p.previsto = info.bytes; suma += info.bytes; } }
    if (suma) descargas.previsto(suma);
  });

  // ── Descarga (el archivo comprimido, como Blob) ──
  function descargar(p) {
    if (p.promesa) return p.promesa;
    p.estado = 'descargando';
    return p.promesa = (async () => {
      let contados = 0;
      try {
        await indice;
        // Por la cola de descargas (util/descargas.js): una sola descarga por archivo, aunque la cola de reposo ya lo
        // estuviera bajando. Las de la carga (intro y viajes) cuentan sus bytes en la barra según llegan.
        const blob = await descargarAhora(p.url, {
          prioridad: p.contar ? 'high' : 'auto',
          alResponder: r => {
            p.avisar(true);
            // Sin entrada en el índice, al menos lo que diga el servidor (el total crece un poco al empezar).
            if (p.contar && !p.previsto) { p.previsto = Number(r.headers.get('content-length')) || 0; if (p.previsto) descargas.previsto(p.previsto); }
          },
          alAvance: p.contar ? k => { k = Math.min(k, p.previsto - contados); if (k > 0) { contados += k; descargas.hecho(k); } } : null
        });
        if (contados < p.previsto) { descargas.previsto(contados - p.previsto); p.previsto = contados; }   // el contador siempre termina
        p.blob = /\.m4a$/i.test(p.url) ? new Blob([blob], { type: 'audio/mp4' }) : blob;
        if (p.bufer) { p.estado = 'guardada'; if (p.contar || necesaria(p)) await decodificar(p); }
        else {
          p.blobUrl = URL.createObjectURL(p.blob); p.estado = 'lista';
          if (p.el) { p.conSilencio = false; p.el.src = p.blobUrl; }
          if (objetivo === p.nombre) aplicar();
        }
        // (Su estancia, la instrumental para después, la pide la llegada al lugar; antes, la cola de reposo.)
      } catch (e) {
        console.warn(`Banda sonora: sin «${p.nombre}» (${e.message}); suena el ambiente.`);
        p.estado = 'fallo'; p.avisar(false); if (contados < p.previsto) descargas.previsto(contados - p.previsto);
        if (objetivo === p.nombre) ir('reposo');
      }
    })();
  }
  // ── Decodificación justo a tiempo (y liberación: un minuto de canción decodificada son ~23 MB en el iPhone) ──
  function decodificar(p) {
    if (p.buffer) return Promise.resolve(true);
    if (p.decodificando) return p.decodificando;
    if (!p.blob || !crearContexto()) return Promise.resolve(false);
    return p.decodificando = (async () => {
      try {
        const datos = await p.blob.arrayBuffer();
        p.buffer = await new Promise((ok, mal) => { const r = ctx.decodeAudioData(datos, ok, mal); r?.catch?.(mal); });
        p.estado = 'lista';
        if (objetivo === p.nombre) aplicar();
        return true;
      } catch (e) {
        console.warn(`Banda sonora: «${p.nombre}» no se puede decodificar (${e?.message || e}); suena el ambiente.`);
        p.estado = 'fallo'; if (objetivo === p.nombre) ir('reposo');
        return false;
      } finally { p.decodificando = null; }
    })();
  }
  // La que suena, la del destino del viaje en curso, la del lugar y la de los viajes se quedan; las demás se liberan.
  // (La de la intro, hasta que ha sonado.)
  const necesaria = p => p.nombre === 'viajes' || (p.nombre === 'inicio' && !p.usada) || !!p.voz || p.nombre === objetivo || p.nombre === viajeEnCurso?.id || p.nombre === lugar;
  function liberar() {
    for (const p of pistas.values()) if (p.bufer && p.buffer && !p.decodificando && !necesaria(p)) { p.buffer = null; p.estado = 'guardada'; }
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
    relojMaestro.usarContexto(ctx);
    // Creado antes de un gesto (para decodificar en la carga): parado hasta el toque, aunque el navegador lo deje sonar.
    if (globalThis.navigator?.userActivation && !navigator.userActivation.hasBeenActive && ctx.state === 'running') ctx.suspend().catch(() => {});
    maestro = ctx.createGain(); maestro.connect(ctx.destination); vigilarEstado();
    ambiente.ganancia = ctx.createGain(); ambiente.ganancia.gain.value = 0; ambiente.ganancia.connect(maestro);
    for (const p of pistas.values()) {
      p.ganancia = ctx.createGain(); p.ganancia.gain.value = 0; p.ganancia.connect(maestro);
      if (!p.bufer) prepararElemento(p);
    }
    return ctx;
  }
  function prepararElemento(p) {
    const el = p.el = new Audio(); el.preload = 'metadata'; el.loop = !!p.conf.bucle; el.setAttribute('playsinline', '');
    ctx.createMediaElementSource(el).connect(p.ganancia);
    el.addEventListener('ended', () => { if (!el.ended) return; if (objetivo === p.nombre) despues(p); });
    el.addEventListener('error', () => { if (!p.conSilencio && p.estado === 'lista') { p.estado = 'fallo'; console.warn(`Banda sonora: «${p.nombre}» no se puede reproducir en este navegador.`); if (objetivo === p.nombre) ir('reposo'); } });
    if (p.blobUrl) el.src = p.blobUrl;
  }
  const duracionDe = p => p.buffer?.duration || p.conf.duracion || p.duracionIndice || (Number.isFinite(p.el?.duration) ? p.el.duration : 0);
  const volumenDe = canal => canal === ambiente ? 1 : Math.max(0, Math.min(1, (canal.conf.volumen ?? 1) * volumen()));
  const reposo = () => momentoReposo(lugar, partesEnZona().mes, n => pistas.get(n)?.estado !== 'fallo' && pistas.has(n));
  const enMarcha = () => !!ctx && ctx.state === 'running' && relojMaestro.dominio === 'audio';
  // Qué se oye ahora: el objetivo, o mientras su archivo llega, el ambiente (la portada espera en silencio a su canción).
  function audible() {
    const p = pistas.get(objetivo);
    if (!p || p.estado === 'lista' || (p.bufer && p.voz)) return objetivo;
    return p.nombre === 'inicio' ? null : 'ambiente';
  }
  // Segundo de una canción programada (reloj − ancla); en bucle, dentro de la vuelta.
  function segundoDe(p, t = relojMaestro.ahora()) {
    if (p.ancla === null) return null;
    const s = t - p.ancla, d = duracionDe(p);
    return p.conf.bucle && d > 0 && s > 0 ? s % d : s;
  }
  // Fija el ancla pedida (desde: el segundo en que debe empezar a oírse) en cuanto el contexto suena.
  function anclar(p) {
    if (p.desdePedido === null || !enMarcha()) return;
    p.ancla = relojMaestro.ahora() + ARRANQUE + relojMaestro.latencia() - p.desdePedido; p.desdePedido = null;
  }

  // ── Voces: cada arranque de una canción con búfer es una voz (fuente + su ganancia) programada en su ancla ──
  function programarVoz(p, { cruce = 0 } = {}) {
    if (!p.buffer || p.ancla === null || !enMarcha()) return false;
    const d = p.buffer.duration, T = Math.max(ctx.currentTime + MARGEN, relojMaestro.aContexto(p.ancla));
    let desde = relojMaestro.deContexto(T) - p.ancla;
    if (p.conf.bucle) desde = ((desde % d) + d) % d;
    else if (desde >= d - 0.02) return false;   // ya habría acabado
    desde = Math.max(0, desde);
    const fuente = ctx.createBufferSource(), g = ctx.createGain();
    fuente.buffer = p.buffer; fuente.loop = !!p.conf.bucle; fuente.connect(g); g.connect(p.ganancia);
    // Entra desde el silencio: con el fundido de la pista si empieza la canción, cruzada al encadenar, o en 15 ms a mitad.
    const sube = cruce || (desde > 0.05 ? ANTICLIC : 0.004);
    g.gain.setValueAtTime(0, ctx.currentTime); g.gain.setValueAtTime(0, T); g.gain.linearRampToValueAtTime(1, T + sube);
    fuente.start(T, desde);
    const voz = { fuente, g, ancla: p.ancla, inicio: T, desde };
    fuente.onended = () => { try { fuente.disconnect(); g.disconnect(); } catch {} if (p.voz === voz) { p.voz = null; p.usada = true; liberar(); } };
    if (p.voz) apagarVoz(p.voz, cruce || 0.05);
    p.voz = voz; p.previo = relojMaestro.deContexto(T) - p.ancla - 1e-3;
    if (!cruce) {
      // Primera voz: la pista sube con su fundido desde el instante en que empieza a sonar (no antes, en silencio).
      const gp = p.ganancia.gain; gp.cancelScheduledValues(ctx.currentTime); gp.setValueAtTime(0, ctx.currentTime); gp.setValueAtTime(0, T); gp.linearRampToValueAtTime(p.nivel, T + (p.fundidoEntrada ?? FUNDIDO));
    }
    return true;
  }
  function apagarVoz(v, d) {
    const t = ctx.currentTime, gv = v.g.gain;
    gv.cancelScheduledValues(t); gv.setValueAtTime(gv.value, t); gv.linearRampToValueAtTime(0, t + d);
    try { v.fuente.stop(t + d + 0.02); } catch {}
  }

  function rampa(param, valor, duracion, desde = param.value) {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t); param.setValueAtTime(desde, t); param.linearRampToValueAtTime(valor, t + duracion);
  }
  // Lleva cada canal a su nivel: el audible a su volumen, los demás a cero; el que se queda en silencio se para al
  // terminar su fundido (ni una fuente, ni un <audio>, ni el ambiente siguen trabajando sin oírse).
  function aplicar(duracion = FUNDIDO) {
    if (!ctx) return;
    const oir = activa && !document.hidden ? audible() : null;
    for (const canal of [ambiente, ...pistas.values()]) {
      if (!canal.ganancia) continue;
      // Una estancia que entra en un segundo pedido (para caer en el compás de su canción): se sitúa antes de sonar.
      if (canal.el && canal.nombre === oir && canal.saltarA !== undefined && canal.estado === 'lista') { if (canal.el.paused) canal.el.currentTime = canal.saltarA; delete canal.saltarA; }
      const nivel = canal.nombre === oir ? volumenDe(canal) : 0;
      if (nivel === canal.nivel && (nivel === 0 || sonando(canal))) continue;
      const desdeCero = nivel > 0 && canal !== ambiente && !sonando(canal);
      canal.nivel = nivel; clearTimeout(canal.parada);
      if (canal.bufer && desdeCero) { canal.fundidoEntrada = duracion; arrancar(canal); continue; }   // (su fundido empieza con la voz)
      rampa(canal.ganancia.gain, nivel, duracion, desdeCero ? 0 : undefined);
      if (nivel > 0) arrancar(canal); else canal.parada = setTimeout(() => detener(canal), (duracion + 0.25) * 1000);
    }
  }
  const sonando = canal => canal === ambiente ? canal.encendido : canal.bufer ? !!canal.voz : !!canal.el && !canal.el.paused;
  // reiniciar: si la canción (sin bucle) ya acabó, vuelve a empezar desde el principio (al volver a pedirla, no en cada cuadro).
  function arrancar(canal, reiniciar = true) {
    if (canal === ambiente) { if (!ambiente.encendido) { ambiente.encendido = true; ambiente.registro?.encender(); } return; }
    const p = canal;
    if (p.bufer) {
      if (p.voz) return;
      if (!p.buffer) { if (p.estado === 'guardada') decodificar(p); else if (p.estado === 'pendiente') descargar(p); return; }
      if (p.ancla === null && p.desdePedido === null) p.desdePedido = 0;
      anclar(p);
      // Ya acabada (sin bucle): vuelve a empezar desde el principio.
      if (!programarVoz(p) && reiniciar && p.ancla !== null && !p.conf.bucle && !p.conf.hastaLlegar && enMarcha() && segundoDe(p) >= duracionDe(p) - 0.05) { p.ancla = null; p.desdePedido = 0; anclar(p); programarVoz(p); }
      return;
    }
    if (p.estado !== 'lista' || p.conSilencio) return;
    if (p.el.paused) {
      if (p.el.ended || (!p.conf.bucle && p.el.currentTime >= duracionDe(p) - 0.05)) p.el.currentTime = 0;
      p.el.play().catch(e => console.warn(`Banda sonora: «${p.nombre}» no arranca (${e.name}).`));
    }
  }
  function detener(canal) {
    if (canal.nivel > 0) return;
    if (canal === ambiente) { if (ambiente.encendido) { ambiente.encendido = false; ambiente.registro?.apagar(); } return; }
    const p = canal;
    if (p.bufer) {
      if (p.voz) { const v = p.voz; p.voz = null; p.usada = true; try { v.fuente.stop(); } catch {} }
      if (objetivo !== p.nombre) p.desdePedido = null;
      liberar();   // (su ancla se queda: acabada, su segundo sigue contando; al volver a pedirla empieza otra vez)
      return;
    }
    if (p.el && !p.el.paused) p.el.pause();
  }

  // ── En cada cuadro (el bucle de dibujo: relojMaestro.cuadro): marcas, fin de los fragmentos y viajes ──
  function cuadro(t) {
    ultimoCuadro = performance.now();
    let oida = null;
    for (const p of pistas.values()) {
      if (!p.bufer) continue;
      if (p.desdePedido !== null) anclar(p);
      if (p.nivel > 0 && !p.voz && p.buffer) arrancar(p, false);
      if (!p.voz) continue;
      oida ??= p.nombre;
      const s = segundoDe(p, t), dur = duracionDe(p);
      if (s < p.previo - 0.25 && !p.conf.bucle) p.previo = s - 1e-3;
      if (oyentes.size && s > p.previo) for (const marca of marcasCruzadas(p.conf.marcas, p.previo, s, { duracion: dur, bucle: p.conf.bucle })) emitir({ momento: p.nombre, marca, segundo: p.conf.marcas[marca] });
      p.previo = s;
      // El fragmento ya trae su fundido de salida: el reposo (o su estancia) entra a la vez, sin hueco de silencio. (La de
      // los viajes no: su final es la llegada, y al llegar se funde con lo que toque.)
      if (!p.conf.bucle && !p.conf.hastaLlegar && dur && objetivo === p.nombre && s >= dur - fundidoTras(p)) despues(p, s);
    }
    // Al medidor (?fps): lo que se ve (el reloj suavizado) frente a lo que se oye (la lectura del audio), en ms.
    if (oida) globalThis.__medidor?.desfase?.(relojMaestro.desfase(), oida);
    const v = viajeEnCurso;
    if (v) {
      const enVuelo = v.viajando();
      if (enVuelo && !v.visto) {
        v.visto = true;
        const m = pistas.get('viajes');
        if (m && m.estado !== 'fallo' && !(protegerInicio && objetivo === 'inicio')) { const fin = v.fin(); ir('viajes', m.conf.hastaLlegar && Number.isFinite(fin) ? { ancla: fin - duracionDe(m) } : {}); }
      } else if (enVuelo && objetivo === 'viajes') {
        // Un viaje que cambia su llegada (saltar el crucero, un tramo que no cabía): la música se recoloca con un fundido
        // cruzado para seguir acabando en la llegada. En un viaje normal la llegada no cambia y la música no se toca.
        // (Mientras la llegada se mueve —el viaje en pausa— se espera a que se quede quieta: un solo fundido.)
        const m = pistas.get('viajes'), fin = v.fin();
        if (!Number.isFinite(v.finAntes) || Math.abs(fin - v.finAntes) > 1e-3) { v.finAntes = fin; v.finDesde = t; }
        else if (m?.conf.hastaLlegar && Number.isFinite(fin) && t - v.finDesde > 0.25) recolocar(m, fin - duracionDe(m));
      }
      if ((v.visto && !enVuelo) || (!v.visto && t - v.t0 > 1.5)) v.terminar();
    }
  }
  relojMaestro.alCuadro(cuadro);
  // (Por si el bucle de dibujo no corre: sin 3D, la banda sigue avisando sus marcas y pasando de una canción a otra.)
  setInterval(() => { if (!document.hidden && performance.now() - ultimoCuadro > 300) cuadro(relojMaestro.ahora()); }, 250);

  function recolocar(p, ancla) {
    if (p.ancla !== null && Math.abs(p.ancla - ancla) <= 0.04) return;
    p.ancla = ancla; p.desdePedido = null;
    if (p.voz) programarVoz(p, { cruce: CRUCE });
  }
  // Al acabar un fragmento: su estancia, si la tiene (fundido de 3 s), y si no (o al acabar la estancia), el reposo.
  // La estancia es la continuación de la canción: su segundo 0 es el segundo «duración − 3» del fragmento (los dos suenan
  // a la vez durante el fundido, en el mismo compás); entra en lo que el fragmento ya lleve de más.
  const estanciaDe = p => pistas.get(`${p.nombre}-estancia`);
  const fundidoTras = p => estanciaDe(p) && estanciaDe(p).estado !== 'fallo' ? FUNDIDO_ESTANCIA : FUNDIDO;
  function despues(p, t = duracionDe(p)) {
    const e = estanciaDe(p);
    if (!e || e.estado === 'fallo') return ir('reposo');
    const retraso = Math.max(0, Math.min(FUNDIDO_ESTANCIA, t - (duracionDe(p) - FUNDIDO_ESTANCIA)));
    ir(e.nombre, { desde: Number.isFinite(retraso) ? +retraso.toFixed(3) : 0, fundido: FUNDIDO_ESTANCIA });
  }
  function emitir(aviso) { for (const f of oyentes) { try { f(aviso); } catch (e) { console.error(e); } } }

  // desde: segundo en que empieza a oírse (null: sigue donde va); ancla: el instante del reloj maestro de su segundo 0.
  function ir(nombre, { desde, fundido = FUNDIDO, ancla } = {}) {
    if (nombre === 'reposo' || (nombre !== 'ambiente' && !pistas.has(nombre)) || pistas.get(nombre)?.estado === 'fallo') nombre = reposo();
    const p = pistas.get(nombre);
    for (const otra of pistas.values()) if (otra !== p) otra.desdePedido = null;
    if (p?.bufer) {
      // (Si aún sonaba en su fundido de salida, se apaga y la nueva entra desde el silencio.)
      if (Number.isFinite(ancla)) { if (p.voz && objetivo === nombre) recolocar(p, ancla); else { if (p.voz) { apagarVoz(p.voz, 0.05); p.voz = null; } p.ancla = ancla; p.desdePedido = null; } }
      else if (desde !== undefined && desde !== null) { if (p.voz) { apagarVoz(p.voz, 0.05); p.voz = null; } p.ancla = null; p.desdePedido = desde; anclar(p); }
      else if (!p.voz && p.ancla === null) { p.desdePedido = 0; anclar(p); }
    } else if (p && desde !== undefined && desde !== null) p.saltarA = desde;
    objetivo = nombre;
    if (p && p.estado !== 'lista') { if (p.estado === 'guardada') decodificar(p); else descargar(p); }
    aplicar(fundido);
  }

  // Pausa al cambiar de aplicación o bloquear el teléfono; al volver, entra con un fundido.
  // Al irse: el maestro baja en ~0,1 s y el contexto se suspende después: las canciones programadas se quedan exactamente
  // donde iban (y el reloj maestro con ellas) y al volver siguen desde ahí. Al volver: iOS deja a menudo el contexto
  // «interrumpido» y resume() fuera de un toque no hace nada: se reintenta y, si sigue parado, en el siguiente toque.
  let suspension = 0, pidiendoToque = false;
  const reanudarConToque = () => {
    if (pidiendoToque) return; pidiendoToque = true;
    const alTocar = () => { if (!ctx || ctx.state === 'running') { quitar(); return; } ctx.resume().then(() => { if (ctx.state === 'running') { quitar(); volver(); } }).catch(() => {}); };
    const quitar = () => { pidiendoToque = false; for (const ev of ['pointerdown', 'touchend', 'keydown']) removeEventListener(ev, alTocar, true); };
    for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, alTocar, true);
  };
  // El maestro sube con un fundido; las estancias pausadas al irse y el ambiente vuelven a sonar.
  function volver() {
    const t = ctx.currentTime; maestro.gain.cancelScheduledValues(t); maestro.gain.setValueAtTime(0, t); maestro.gain.linearRampToValueAtTime(1, t + 1.2);
    for (const p of pistas.values()) if (p.pausadaAlIrse) { p.pausadaAlIrse = false; if (p.nivel > 0) p.el.play().catch(() => {}); }
    if (ambiente.apagadoAlIrse) { ambiente.apagadoAlIrse = false; ambiente.nivel = -1; }
    aplicar(1.2);
  }
  const reanudar = () => {
    if (!ctx || document.hidden) return;
    clearTimeout(suspension);
    const despues = () => { if (ctx.state === 'running') { if (!volviendo) return; volviendo = false; volver(); } else reanudarConToque(); };
    if (ctx.state === 'running') { if (volviendo) { volviendo = false; volver(); } else aplicar(1.2); return; }
    ctx.resume().then(despues, despues); setTimeout(despues, 600);
  };
  let volviendo = false;
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      const t = ctx.currentTime; maestro.gain.cancelScheduledValues(t); maestro.gain.setValueAtTime(maestro.gain.value, t); maestro.gain.linearRampToValueAtTime(0, t + 0.12);
      clearTimeout(suspension); volviendo = true;
      suspension = setTimeout(() => {
        if (!document.hidden) return;
        for (const p of pistas.values()) if (p.el && !p.el.paused) { p.el.pause(); p.pausadaAlIrse = true; }
        if (ambiente.encendido) { ambiente.encendido = false; ambiente.registro?.apagar(); ambiente.apagadoAlIrse = true; }
        ctx.suspend().catch(() => {});
      }, 160);
    } else reanudar();
  });
  // iOS también interrumpe el contexto sin ocultar la página (una llamada, Siri, otra app que suena): al volver a estar
  // libre, se reanuda igual.
  addEventListener('pageshow', reanudar);
  function vigilarEstado() { if (ctx && !ctx.__vigilado) { ctx.__vigilado = true; ctx.addEventListener('statechange', () => { if (ctx.state !== 'running' && !document.hidden && activa) { volviendo = true; setTimeout(reanudar, 300); } }); } }

  // Estancias: una por gesto (pointerdown con ratón, pointerup con el dedo, una tecla), la del lugar primero.
  function desbloquearUna(ev) {
    if (!ctx || (ev.type === 'pointerdown' && ev.pointerType !== 'mouse') || (ev.type === 'pointerup' && ev.pointerType === 'mouse')) return;
    const orden = [objetivo, lugar, viajeEnCurso?.id].map(n => n && pistas.get(`${n}-estancia`));
    const p = orden.find(e => e?.el && !e.desbloqueada) || [...pistas.values()].find(e => e.el && !e.desbloqueada);
    if (!p) { for (const n of ['pointerdown', 'pointerup', 'keydown']) removeEventListener(n, desbloquearUna, true); return; }
    p.desbloqueada = true;
    if (!p.el.src) { p.conSilencio = true; p.el.src = SILENCIO; }
    p.el.play()?.then(() => { if (p.nivel <= 0 || p.conSilencio) { p.el.pause(); if (p.conSilencio && p.blobUrl) { p.conSilencio = false; p.el.src = p.blobUrl; } } }).catch(() => {});
  }
  for (const n of ['pointerdown', 'pointerup', 'keydown']) addEventListener(n, desbloquearUna, { capture: true, passive: true });

  return {
    // Hay canción de portada configurada (aún sin saber si su archivo está).
    get conInicio() { return pistas.has('inicio'); },
    // Promesa: true si el archivo de la canción de portada está (el servidor respondió bien), false si no.
    get inicioDisponible() { return pistas.get('inicio')?.existe ?? Promise.resolve(false); },
    get activa() { return activa; },
    get objetivo() { return objetivo; },
    tiene: nombre => pistas.has(nombre) && pistas.get(nombre).estado !== 'fallo',
    // Promesa: la canción de ese momento lista para sonar (descargada y decodificada; como mucho `plazo` ms). La intro no
    // empieza su clip hasta tenerla así (todo preparado antes: sin arranques a trompicones).
    preparada(nombre, plazo = 4000) {
      const p = pistas.get(nombre); if (!p) return Promise.resolve(false);
      const t0 = performance.now();
      return new Promise(fin => { const mirar = () => {
        if (p.estado === 'fallo') return fin(false);
        if (p.estado === 'lista') return fin(true);
        if (performance.now() - t0 > plazo && p.estado === 'guardada') return fin(true);
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
    // Dentro de un toque (síncrono): reanuda el contexto y lo deja desbloqueado con una muestra de silencio. Nada más (las
    // estancias se desbloquean una a una en los gestos siguientes).
    desbloquear() {
      if (!crearContexto()) return false;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      if (!silencioDado) { silencioDado = true; const f = ctx.createBufferSource(); f.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); f.connect(ctx.destination); f.start(0); }
      return true;
    },
    // El botón de música (y el toque de la portada): con ella apagada nada suena ni se descarga de más.
    activar(valor) { activa = !!valor; if (activa && objetivo === null) objetivo = reposo(); if (activa && ctx && ctx.state !== 'running') { ctx.resume().catch(() => {}); maestro.gain.setValueAtTime(1, ctx.currentTime); } aplicar(activa ? 0.8 : 0.3); },
    ir,
    // La ceremonia de un lugar (la supernova): su canción desde ese segundo, a la vez que la animación.
    ceremonia: (nombre, desde = 0) => ir(nombre, { desde }),
    // Instante del reloj maestro en que la canción de ese momento está en su segundo 0 (null si no está programada). Las
    // escenas lo leen para seguirla: su segundo es relojMaestro.ahora() − ancla.
    ancla: nombre => pistas.get(nombre)?.ancla ?? null,
    // Una escena que empieza sin canción programada (música apagada…) fija su propio ancla: si la canción entra después,
    // entra en ese mismo compás.
    anclar(nombre, t) { const p = pistas.get(nombre); if (p?.bufer && p.ancla === null) { p.ancla = t; p.desdePedido = null; if (p.nivel > 0) arrancar(p); } },
    // Segundo dentro del fragmento de ese momento (null si no tiene canción o no se pudo cargar; 0 hasta que se programa).
    tiempo(nombre) {
      const p = pistas.get(nombre);
      if (!p || p.estado === 'fallo') return null;
      if (p.bufer) return Math.max(0, segundoDe(p) ?? 0);
      return p.el && !p.conSilencio && p.estado === 'lista' ? p.el.currentTime : 0;
    },
    // ¿Suena ahora mismo la canción de ese momento? (sin memoria nueva: lo pregunta una escena en cada cuadro)
    suena(nombre) { const p = pistas.get(nombre); if (!p || !activa) return false; return p.bufer ? !!p.voz && enMarcha() && segundoDe(p) >= p.voz.desde : !!p.el && !p.el.paused && !p.conSilencio && p.estado === 'lista'; },
    pasada(nombre, marca) { const s = pistas.get(nombre)?.conf.marcas?.[marca], t = this.tiempo(nombre); return Number.isFinite(s) && t !== null && t >= s; },
    // fn({ momento, marca, segundo }) al cruzar cada marca; devuelve cómo dejar de escuchar.
    alMarca(fn) { oyentes.add(fn); return () => oyentes.delete(fn); },
    // Al entrar: el vuelo de entrada no corta la canción de la portada (termina sola y se funde con el reposo).
    entrar() { protegerInicio = objetivo === 'inicio'; primeraLlegada = true; },
    // Un viaje empieza (alViajar de la escena): su canción se pide ya (se decodifica durante el vuelo); en el primer cuadro
    // del vuelo, la de los viajes, una sola vez, con su final en la llegada (fin(): instante del reloj maestro en que el
    // viaje aterriza); al llegar, la del destino o el reposo. Si en 1,5 s no hay vuelo, es un cambio en el sitio.
    // ceremoniaPendiente(): al llegar, el lugar va a empezar su ceremonia (la supernova que aún no ha estallado); entonces
    // su canción espera a ella (ceremonia()) para que las fases caigan en sus marcas.
    viajar(id, { viajando, fin = () => null, ceremoniaPendiente = () => false }) {
      const p = pistas.get(id); if (p) { if (p.estado === 'pendiente') descargar(p); else if (p.estado === 'guardada') decodificar(p); }
      // El segundo tramo de un viaje que cruza al sistema solar vuelve a avisar del mismo destino: el viaje sigue.
      if (viajeEnCurso && viajeEnCurso.id === id) return;
      const antes = objetivo;
      const v = viajeEnCurso = { id, viajando, fin, t0: relojMaestro.ahora(), visto: false,
        terminar: () => { if (viajeEnCurso !== v) return; viajeEnCurso = null; llegar(id, antes, ceremoniaPendiente(id)); } };
      liberar();
    },
    // El viaje terminó en este cuadro (la escena lo avisa): la canción del destino empieza a la vez que su animación.
    llegada(id) {
      const v = viajeEnCurso; if (!v || v.id !== id) return;
      const m = pistas.get('viajes');
      if (m?.ancla !== null && m?.ancla !== undefined && objetivo === 'viajes') { const t = relojMaestro.ahora(), finMusica = m.ancla + duracionDe(m), prevista = v.fin(); const r = { id, cuadro: +((t - finMusica) * 1000).toFixed(1), programado: Number.isFinite(prevista) ? +((prevista - finMusica) * 1000).toFixed(1) : null }; aterrizajes.push(r); if (aterrizajes.length > 50) aterrizajes.shift(); globalThis.__medidor?.llegada?.({ destino: id, finMusicaMs: r.programado ?? r.cuadro }); }
      v.terminar();
    },
    // Para las pruebas (?pruebaAudio) y el diagnóstico.
    estado() {
      const pistasEstado = {};
      // (La ganancia de una pista con búfer sin voz no se oye: el navegador ni siquiera procesa su rampa, se da 0.)
      for (const p of pistas.values()) pistasEstado[p.nombre] = { estado: p.estado, nivel: p.nivel, ganancia: p.ganancia && (!p.bufer || p.voz) ? +p.ganancia.gain.value.toFixed(3) : 0, sonando: sonando(p), tiempo: this.tiempo(p.nombre), previsto: p.previsto, ancla: p.ancla, decodificada: !!p.buffer };
      return { contexto: ctx?.state ?? null, activa, objetivo, audible: audible(), lugar, reloj: relojMaestro.dominio, aterrizajes: aterrizajes.slice(), ambiente: { nivel: ambiente.nivel, encendido: ambiente.encendido, ganancia: ambiente.ganancia ? +ambiente.ganancia.gain.value.toFixed(3) : 0 }, pistas: pistasEstado };
    }
  };
  function llegar(id, antes, espera) {
    lugar = id;
    // Su estancia (la instrumental que sigue a la canción), al llegar, si la cola de reposo aún no la había bajado.
    const e = pistas.get(`${id}-estancia`); if (e?.estado === 'pendiente') descargar(e);
    const entrada = primeraLlegada; primeraLlegada = false;
    if (protegerInicio) { protegerInicio = false; if (objetivo === 'inicio') return; }
    // La canción de casa es la de volver: al terminar el vuelo de entrada, el reposo.
    if (id === 'hogar' && entrada) { ir('reposo'); liberar(); return; }
    // Si el lugar va a empezar su ceremonia, su canción espera a ella (ceremonia()); mientras, el reposo.
    if (pistas.has(id) && !espera) ir(id, { desde: antes === id ? null : 0 }); else ir('reposo');
    liberar();
  }
}
