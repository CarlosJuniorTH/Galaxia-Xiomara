import { CONFIG } from './config.js';
import { leerFecha, fechaCorta } from './util/fechas.js';
import { elegir } from './util/dibujo.js';
import { crearEntrada } from './ui/entrada.js';
import { crearMusica } from './ui/musica.js';
import { crearBandaSonora } from './ui/bandaSonora.js';
import { crearContador } from './ui/contador.js';
import { crearMensajes } from './ui/mensajes.js';
import { crearCarta } from './ui/carta.js';
import { crearRecuerdos } from './ui/recuerdos.js';
import './util/horno.js';   // empieza a descargar los cálculos horneados en cuanto arranca la página
import { crearEfectos } from './ui/efectos.js';
import { escucharToques } from './ui/toques.js';
import { crearProgreso } from './util/progreso.js';
import { estrellasDisponibles, saludoMomento } from './util/tiempo.js';
import { crearInterfazUniverso } from './ui/universo.js';
import { describirFallo } from './util/webgl.js';
import { cargarContenido, aplicarContenido } from './data/contenido.js';
import { crearContemplacion } from './ui/contemplacion.js';
import { crearViaje } from './util/viaje.js';
import { vigilarPaquetes } from './util/paquetes.js';
import { precargarTodo } from './util/precarga.js';
import { crearMedidor } from './ui/medidor.js';
import { cargaTerminada, esMovil } from './util/dispositivo.js';

let interfaz, escena, contemplacion, etapa = 'fuentes';
const problema = texto => { document.getElementById('problema-texto').textContent = texto; document.getElementById('problema-3d').hidden = false; if (interfaz?.enRuta) interfaz.pausarRuta(true); };
document.getElementById('reintentar-3d').addEventListener('click', () => location.reload());
document.getElementById('compatible-3d').addEventListener('click', () => { const url = new URL(location.href); url.searchParams.set('calidad', 'compatible'); location.href = url.href; });
window.addEventListener('unhandledrejection', e => { console.error('Universo:', e.reason); });
// Banda sonora (js/data/bandaSonora.js): sus canciones de la carga empiezan a descargarse ya, antes que nada (sin archivos
// configurados no hace nada). CONFIG.volumen se lee al sonar (el contenido puede cambiarlo).
const banda = crearBandaSonora({ volumen: () => CONFIG.volumen });
if (location.hash === '#debug' || new URLSearchParams(location.search).has('pruebaAudio')) window.__bandaSonora = banda;
// Paquetes guardados en el dispositivo desde el primer momento (también en la primera visita: lo que se descarga se
// guarda mientras llega, sin descargas de más que compitan con la carga). Nunca recarga la página por sí solo.
const paquetes = vigilarPaquetes();
// Y TODO lo demás que la web pueda pedir ya dentro (las canciones de los destinos y sus estancias, fuentes, módulos…) se
// descarga ya, durante la carga, y cuenta en sus MB: el clip de la intro no empieza hasta tenerlo, y después nada sale a
// la red (con service worker se guarda en su caché, sin pasar por la memoria de la página).
let escenaCreada; const trasEscena = new Promise(r => { escenaCreada = r; }); setTimeout(escenaCreada, 30000);
precargarTodo({ movil: esMovil, servicio: paquetes.servicio, tras: trasEscena });
try {
  await cargarContenido();
  if (location.hash === '#borrador') { const borrador = localStorage.getItem('xiomara:contenido-borrador'); if (borrador) aplicarContenido(JSON.parse(borrador)); }
} catch (e) { console.warn('Se conserva el contenido original:', e.message); }
document.title = `Nuestro pequeño infinito · ${CONFIG.nombre}`;
const inicio = leerFecha(CONFIG.fechaInicio);
let almacen;
try { almacen = localStorage; } catch { almacen = { getItem() { return null; }, setItem() { throw Error('No disponible'); } }; }
const progreso = crearProgreso(almacen, texto => interfaz?.avisar(texto));
const estrellas = estrellasDisponibles(CONFIG.fechaInicio);
const viaje = crearViaje(almacen);
const entrada = crearEntrada(CONFIG, { viaje, banda }), musica = crearMusica(CONFIG, banda), mensajes = crearMensajes(CONFIG), efectos = crearEfectos();
crearContador(CONFIG, inicio); crearCarta(CONFIG);
document.getElementById('saludo-entrada').textContent = saludoMomento();
const numero = estrellas.filter(s => progreso.tiene('estrellas', s.id)).length;
document.getElementById('entrada-progreso').textContent = numero ? `Tu viaje te espera · ${numero} de ${estrellas.length} estrellas encontradas` : `${estrellas.length} pequeñas luces guardan nuestra historia`;
try { if (almacen.getItem('xiomara:universo:v2:viaje-anterior')) document.getElementById('btn-restaurar').hidden = false; } catch {}
document.getElementById('btn-restaurar').addEventListener('click', () => { if (progreso.restaurar()) location.reload(); });

// En la red local (pruebas con el móvil): cada segundo se avisa al servidor del PC de en qué paso va la carga, para saber
// dónde se para en un aparato real. No sale de la red de casa.
if (location.protocol === 'http:' && /^(192\.168\.|10\.)/.test(location.hostname)) {
  const t0 = performance.now(); let ultimo = '';
  // Cuándo empieza cada paso de la carga (para ver dónde se va el tiempo en un aparato real).
  const pasos = []; { let paso; Object.defineProperty(window, '__pasoCarga', { configurable: true, get: () => paso, set: v => { if (v !== paso) pasos.push(`${v} ${Math.round((performance.now() - t0) / 1000)}s`); paso = v; } }); }
  const errores = []; addEventListener('error', e => errores.push(String(e.message || e.error).slice(0, 200))); addEventListener('unhandledrejection', e => errores.push('promesa: ' + String(e.reason?.message || e.reason).slice(0, 200)));
  const informar = () => { const pc = document.getElementById('carga-pc')?.textContent || ''; const tx = window.__texturas?.(); const m = `${window.__pasoCarga || 'inicio'} · ${pc} · ${Math.round((performance.now() - t0) / 1000)} s · latidos ${window.__latidosTelarana || 0}${window.__respaldoTelarana ? ' · respaldo' : ''}${tx ? ` · texturas que faltan ${tx.faltan.length} [${tx.faltan.slice(0, 6).join(', ')}] · en hilo principal ${tx.enHiloPrincipal} · obreros ${tx.obreros}${tx.errores.length ? ' · fallos ' + tx.errores.join(' | ') : ''}` : ''}${errores.length ? ' · errores ' + errores.slice(-3).join(' | ') : ''} · pasos ${pasos.slice(-12).join(', ')}`;
    if (m !== ultimo) { ultimo = m; fetch('./__diagnostico3d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ etapa: 'progreso-carga', tipo: 'carga', mensaje: m, navegador: navigator.userAgent }) }).catch(() => {}); }
    if (!document.getElementById('btn-entrar')?.classList.contains('preparado')) setTimeout(informar, 1000); };
  setTimeout(informar, 500);
}
// El porcentaje cuenta desde el principio: fuentes (0–3 %), módulos 3D (3–8 %) y el universo (8–100 %).
entrada.progreso(0, 0.03);
try {
  await Promise.race([Promise.all([document.fonts.load("600 100px 'Quicksand'"), document.fonts.load("100px 'Great Vibes'"), document.fonts.load("100px 'Cormorant Garamond'")]), new Promise(r => setTimeout(r, 3500))]).catch(() => {});
  etapa = 'carga de módulos 3D'; entrada.progreso(0.03, 0.08);
  const { crearEscena } = await import('./escena/index.js'); entrada.progreso(0.08);
  etapa = 'creación de la escena 3D';
  escena = await crearEscena(document.getElementById('galaxia'), {
    config: CONFIG, cantidadSecretas: estrellas.length,
    encontradas: estrellas.flatMap((s, i) => progreso.tiene('estrellas', s.id) ? [i] : []),
    consteladas: progreso.estado.constelaciones,
    fechaTexto: inicio ? `♡ ${fechaCorta(inicio)} ♡` : '♡',
    alConstelar: id => interfaz?.alConstelar(id),
    // Cada viaje despierta la interfaz: al llegar se ve la tarjeta del lugar y «Volver al centro».
    // La banda sonora funde a la música de los viajes al despegar y a la del destino (o al reposo) al llegar. (Un viaje que
    // cruza al sistema solar sigue siéndolo también en el fundido entre sus dos tramos, restanteViaje: si en ese instante no
    // hay vuelo, la banda no lo da por terminado ni suena la del destino antes de tiempo.)
    alViajar: id => { interfaz?.situar(id); contemplacion?.despertar(); viaje.anotarDestino(id); banda.viajar(id, { viajando: () => !!escena?.viajando || (escena?.restanteViaje ?? 0) > 0, restante: () => escena?.restanteViaje ?? 0, ceremoniaPendiente: d => d === 'supernova' }); },
    // El viaje terminó (en este cuadro): la canción del destino y la escena del gigante empiezan a la vez.
    alLlegar: id => { banda.llegada(id); interfaz?.llegada(id); }, alProblema: problema,
    alProgreso: (f, techo) => entrada.progreso(0.08 + 0.92 * f, 0.08 + 0.92 * techo)
  });
  escenaCreada();   // (sus módulos ya están pedidos: la precarga sigue con lo que no son canciones)
  etapa = 'recuerdos e interfaz';
  const recuerdos = crearRecuerdos(CONFIG, estrellas, progreso, {
    alEncontrar: i => { escena.marcarEstrella(i); navigator.vibrate?.(40); },
    alCompletar: () => interfaz.celebrar(),
  });
  interfaz = crearInterfazUniverso({ config: CONFIG, escena, progreso, recuerdos, estrellas, efectos, musica, viaje, banda });
  contemplacion = crearContemplacion({
    permitido: () => document.body.classList.contains('dentro') && !document.body.classList.contains('supernova-en-escena') && !interfaz.enRuta && !interfaz.celebrando && !document.querySelector('dialog[open], .ventana.abierta')
  });
  let toquesCielo = 0;
  escucharToques(document.getElementById('galaxia'), (x, y) => {
    if (document.body.classList.contains('supernova-en-escena')) return;
    if (!document.body.classList.contains('dentro') || interfaz.enRuta || interfaz.celebrando || interfaz.contemplando) return;
    const tocado = escena.probarToque(x, y);
    // El toque que despierta la interfaz abre lo que toca (estrella, lugar, nodo),
    // pero no envía un beso al vacío.
    if (!tocado && contemplacion.recienDespertado()) return;
    if (tocado?.tipo === 'estrella') { efectos.explosion(x, y, 24); recuerdos.abrir(tocado.id); }
    else if (tocado?.tipo === 'destino') interfaz.visitar(tocado.id);
    else if (tocado?.tipo === 'nodo') interfaz.tocarNodo(tocado.id);
    else if (!escena.viajando) {
      // Tocar el cielo: la primera vez (y luego una de cada tres) cae una estrella fugaz para
      // pedir un deseo; las demás, un beso. En las seis grandes no hay estrellas fugaces (son
      // meteoros de la atmósfera): ahí siempre es el beso, sin el deseo ni sus frases.
      if (interfaz.enLasGrandes) { efectos.explosion(x, y, 14); efectos.texto(x, y, elegir(CONFIG.toques)); escena.besar(); }
      else if (toquesCielo++ % 3 === 0) {
        efectos.deseo(x, y); efectos.texto(x, y, 'Pide un deseo ✨'); escena.besar();
        setTimeout(() => { if (!interfaz.enLasGrandes) interfaz.avisar('Tu deseo ya viaja entre las estrellas. ♡'); }, 2600);
      } else { efectos.explosion(x, y, 14); efectos.texto(x, y, elegir(CONFIG.toques)); escena.besar(); }
    }
  });
  entrada.alEntrar(({ continuar } = {}) => {
    // Continuar: el vuelo de entrada lleva directamente al lugar (o al paso del recorrido).
    banda.entrar(); musica.reproducir(true); mensajes.iniciar(); setTimeout(() => efectos.programarFugaces(() => !interfaz.enLasGrandes), 4000);
    if (continuar?.paso !== null && continuar?.paso !== undefined) { escena.iniciar('hogar', { duracion: 3 }); setTimeout(() => interfaz.iniciarRuta(continuar.paso), 2600); }
    else escena.iniciar(continuar?.destino || 'hogar');
    if (['render', 'completo'].includes(new URLSearchParams(location.search).get('diag'))) diagnosticoRender();
    if (new URLSearchParams(location.search).get('diag') === 'gigantes') setTimeout(async () => { while (escena.viajando) await new Promise(r => setTimeout(r, 300)); const { diagnosticarGigantes } = await import('./escena/diagnosticoGigantes.js'); diagnosticarGigantes(escena, interfaz); }, 3000);
    if (!progreso.disponible) interfaz.avisar('El guardado local no está disponible. Puedes explorar durante esta visita.');
    try { if (!sessionStorage.getItem('xiomara:bienvenida')) { setTimeout(() => interfaz.avisar('Empieza por «Deja que te lleve» o elige una órbita en Explorar.'), 8500); sessionStorage.setItem('xiomara:bienvenida', '1'); } } catch {}
  });
  // Diagnóstico de renderizado en el propio dispositivo (?diag=render ligero, ?diag=completo
  // con análisis por capas), tras el vuelo de entrada.
  async function diagnosticoRender() {
    await new Promise(r => setTimeout(r, 1000));
    while (escena.viajando) await new Promise(r => setTimeout(r, 500));
    await new Promise(r => setTimeout(r, 3000));
    const { diagnosticarRender, mostrarPanel } = await import('./escena/diagnostico.js');
    const completo = new URLSearchParams(location.search).get('diag') === 'completo';
    mostrarPanel(escena, await diagnosticarRender(escena, { completo }));
  }
  etapa = 'preparación de shaders y texturas';
  await escena.listo;
  escena.esperarGPU();
  etapa = 'listo';
  // Tras entrar, cuando el vuelo de entrada ha terminado (nada compite con él: ni descargas, ni el guardado de paquetes):
  //  · la carga se da por buena (sin cierre por memoria): si iOS cierra la página en el clip o en la entrada (el pico de
  //    memoria llega ahí, con todo ya en la GPU), la siguiente carga arranca en el modo ligero (dispositivo.js) en lugar de
  //    cerrarse otra vez igual;
  //  · (nada más que descargar: la precarga ya lo bajó todo durante la carga; antes las canciones de los destinos y el
  //    resto de paquetes se descargaban aquí, ya dentro, y un viaje podía toparse con su canción aún en camino.)
  entrada.alEntrarTambien(() => {
    const mirar = () => { if (escena.viajando) { setTimeout(mirar, 500); return; } setTimeout(cargaTerminada, 3000); };
    setTimeout(mirar, 1500);
  });
  entrada.listo();
  crearMedidor(escena);
  if (location.hash === '#debug') window.__galaxia = { escena, recuerdos, interfaz, progreso, estrellas };
  // El cielo crece también si se queda abierto al cumplirse un nuevo mes.
  setInterval(() => {
    const nuevas = estrellasDisponibles(CONFIG.fechaInicio);
    if (nuevas.length !== estrellas.length) {
      const crecio = nuevas.length > estrellas.length;
      estrellas.splice(0, estrellas.length, ...nuevas);
      escena.actualizarEstrellas(estrellas.length, estrellas.flatMap((s, i) => progreso.tiene('estrellas', s.id) ? [i] : []));
      recuerdos.actualizar(); interfaz.actualizarAlbum();
      interfaz.avisar(crecio ? 'Hoy se enciende una nueva estrella en nuestra historia. ♡' : 'Nuestro cielo se ha actualizado con la fecha de Argentina.');
    }
  }, 60000);
} catch (e) {
  const informe = describirFallo(e, etapa);
  console.error('Arranque del universo:', informe, e); problema(informe.texto);
  document.getElementById('error-arranque').hidden = false;
  document.getElementById('error-arranque-texto').textContent = `${informe.etapa}\n${informe.tipo}: ${informe.mensaje}`;
  if (location.protocol === 'http:' && /^(localhost$|127\.|192\.168\.|10\.)/.test(location.hostname)) fetch('./__diagnostico3d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...informe, navegador: navigator.userAgent }) }).catch(() => {});
}
