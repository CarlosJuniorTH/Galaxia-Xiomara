import { CONFIG } from './config.js';
import { leerFecha, fechaCorta } from './util/fechas.js';
import { elegir } from './util/dibujo.js';
import { crearEntrada } from './ui/entrada.js';
import { crearMusica } from './ui/musica.js';
import { crearContador } from './ui/contador.js';
import { crearMensajes } from './ui/mensajes.js';
import { crearCarta } from './ui/carta.js';
import { crearRecuerdos } from './ui/recuerdos.js';
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
import { crearMedidor } from './ui/medidor.js';

let interfaz, escena, contemplacion, etapa = 'fuentes';
const problema = texto => { document.getElementById('problema-texto').textContent = texto; document.getElementById('problema-3d').hidden = false; if (interfaz?.enRuta) interfaz.pausarRuta(true); };
document.getElementById('reintentar-3d').addEventListener('click', () => location.reload());
document.getElementById('compatible-3d').addEventListener('click', () => { const url = new URL(location.href); url.searchParams.set('calidad', 'compatible'); location.href = url.href; });
window.addEventListener('unhandledrejection', e => { console.error('Universo:', e.reason); });
// Paquetes guardados en el dispositivo y actualizaciones (desde el principio: si hay una versión nueva, se aplica en la carga).
vigilarPaquetes();
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
const entrada = crearEntrada(CONFIG, { viaje }), musica = crearMusica(CONFIG), mensajes = crearMensajes(CONFIG), efectos = crearEfectos();
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
  const informar = () => { const pc = document.getElementById('carga-pc')?.textContent || ''; const m = `${window.__pasoCarga || 'inicio'} · ${pc} · ${Math.round((performance.now() - t0) / 1000)} s · latidos ${window.__latidosTelarana || 0}${window.__respaldoTelarana ? ' · respaldo' : ''}`;
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
    alViajar: id => { interfaz?.situar(id); contemplacion?.despertar(); viaje.anotarDestino(id); }, alProblema: problema,
    alProgreso: (f, techo) => entrada.progreso(0.08 + 0.92 * f, 0.08 + 0.92 * techo)
  });
  etapa = 'recuerdos e interfaz';
  const recuerdos = crearRecuerdos(CONFIG, estrellas, progreso, {
    alEncontrar: i => { escena.marcarEstrella(i); navigator.vibrate?.(40); },
    alCompletar: () => interfaz.celebrar(),
  });
  interfaz = crearInterfazUniverso({ config: CONFIG, escena, progreso, recuerdos, estrellas, efectos, musica, viaje });
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
      // pedir un deseo; las demás, un beso.
      if (toquesCielo++ % 3 === 0) {
        efectos.deseo(x, y); efectos.texto(x, y, 'Pide un deseo ✨'); escena.besar();
        setTimeout(() => interfaz.avisar('Tu deseo ya viaja entre las estrellas. ♡'), 2600);
      } else { efectos.explosion(x, y, 14); efectos.texto(x, y, elegir(CONFIG.toques)); escena.besar(); }
    }
  });
  // El giroscopio (efecto ventana) se activa con el toque de entrada: iOS pide permiso en un gesto.
  for (const id of ['btn-entrar', 'btn-continuar']) document.getElementById(id)?.addEventListener('click', () => escena.activarGiroscopio(), { once: true });
  entrada.alEntrar(({ continuar } = {}) => {
    // Continuar: el vuelo de entrada lleva directamente al lugar (o al paso del recorrido).
    musica.reproducir(true); mensajes.iniciar(); setTimeout(efectos.programarFugaces, 4000);
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
  etapa = 'listo';
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
