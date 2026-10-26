import { descargas } from '../util/descargas.js';
// Entrada, en tres tiempos y siempre igual (en cada visita, sin «Saltar»):
//   1. «Toca para empezar ♡» (solo con canción de portada, momento «inicio» de js/data/bandaSonora.js): los navegadores
//      (iOS, Chrome) solo dejan sonar audio tras un gesto. El toque solo desbloquea el sonido; no suena nada aún.
//   2. La pantalla de carga, con el porcentaje y los MB descargados de los previstos. La descarga empieza al abrir la
//      página (la canción, la primera), sin esperar al toque.
//   3. Al llegar al 100 %, el videoclip de la intro (js/ui/portada.js) y la canción, a la vez y desde el principio. El clip
//      sigue el reloj de la canción (sus hitos caen en las marcas); si no hay canción, falla o no arranca, va con su propio
//      reloj de 32 s. En la marca «tarjeta» aparece la tarjeta para entrar sobre el cielo del universo.
// Quien vuelve puede continuar donde lo dejó (desde la tarjeta).
import { crearPortada, HITOS } from './portada.js';
import { reescalar } from '../util/sincronia.js';
import { DESTINOS } from '../data/universo.js';
const $ = s => document.querySelector(s);
// Lo que se espera a la canción al terminar la carga (si aún se descarga) antes de empezar el clip sin ella.
const ESPERA_CANCION = 15000;

export function crearEntrada(config, { viaje, banda } = {}) {
  $('#entrada-nombre').textContent = config.nombre;
  $('#entrada-cita').textContent = config.cita;
  const foto = $('#foto');
  foto.alt = `Para ${config.nombre}`;
  foto.onerror = () => { foto.onerror = null; foto.src = config.fotoRespaldo; };
  foto.src = config.foto;

  const entrada = $('#entrada'), boton = $('#btn-entrar'), continuar = $('#btn-continuar'), frase = $('#portada-frase'), toque = $('#toque');
  let alEntrar = () => {}, trasIntro = [], introAcabada = false, preparado = false, tocado = false, empezado = false, conCancion = false;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const yaVista = !!viaje?.portadaVista;
  // cancion: hay canción de intro Y su archivo está (se sabe en cuanto responde el servidor; si falta, por ejemplo en
  // GitHub Pages sin los audios, no hay pantalla de toque y el clip va con su propio reloj).
  const conInicio = !!banda?.conInicio, marcas = conInicio ? banda.marcas('inicio') : {};
  let cancion = false;
  // Solo para las pruebas automáticas (?sinIntro con #debug): la tarjeta en cuanto carga, sin toque ni clip.
  const sinIntro = location.hash === '#debug' && new URLSearchParams(location.search).has('sinIntro');

  // Reloj del clip: el de la canción llevado al del clip (reescalar). Si la canción no avanza en 1,5 s de cuadros (no
  // arrancó, se cortó), sigue con un reloj propio desde ese punto. El propio avanza con los cuadros (tope 0,1 s): con
  // la pestaña oculta se para, igual que la canción.
  let propio = null, ultimo = null, ultimoS = null, quieto = 0, ultimoT = 0, antes = 0, fijo = null;
  function relojClip() { return ultimo = relojAhora(); }
  function relojAhora() {
    if (fijo !== null) return fijo;
    if (!empezado) return null;
    const ahora = performance.now(), dt = Math.min(0.1, Math.max(0, (ahora - antes) / 1000)); antes = ahora;
    if (propio === null && conCancion) {
      const s = banda.tiempo('inicio');
      if (s !== null) {
        if (s !== ultimoS) { ultimoS = s; quieto = 0; } else quieto += dt;
        if (quieto < 1.5) return ultimoT = reescalar(s, marcas, HITOS);
      }
      propio = ultimoT;
    }
    if (propio === null) propio = 0;
    return propio += dt;
  }

  function mostrarTarjeta() {
    entrada.classList.add('formado', 'cielo'); frase.classList.remove('visible');
    viaje?.marcarPortada();
    // Lo que espera al final del clip (descargas en segundo plano), cuando la tarjeta ya ha terminado de entrar.
    // (sin clip, ?sinIntro de las pruebas, en el acto: como antes de la intro)
    setTimeout(() => { introAcabada = true; for (const fn of trasIntro.splice(0)) fn(); }, sinIntro ? 0 : 2500);
  }
  const portada = crearPortada($('#portada-lienzo'), {
    calma: reducido, reloj: relojClip, alFinal: mostrarTarjeta, alPrevio: () => entrada.classList.add('previa'),
    alFrase: texto => {
      frase.classList.remove('visible');
      clearTimeout(alFraseEspera);
      if (texto) alFraseEspera = setTimeout(() => { frase.textContent = texto; frase.classList.add('visible'); }, 280);
    }
  });
  let alFraseEspera = 0;

  // Empieza el clip (y la canción desde el principio, si está lista). Se llama dentro del toque si la carga ya terminó.
  function empezarClip(sonar) {
    if (empezado) return;
    empezado = true; antes = performance.now();
    entrada.classList.remove('cargando', 'con-toque'); entrada.classList.add('clip');
    conCancion = !!sonar;
    if (conCancion) { banda.ir('inicio', { desde: 0 }); banda.activar(true); }
  }
  // Al terminar la carga: la canción ya debería estar (va la primera y cuenta en los MB); si aún llega, se la espera.
  function cuandoCancion(fn) {
    if (!cancion) { setTimeout(() => fn(false), 500); return; }
    const t0 = performance.now();
    const mirar = () => {
      const estado = banda.estado().pistas.inicio?.estado;
      if (estado === 'lista') return fn(true);
      if (estado === 'fallo' || performance.now() - t0 > ESPERA_CANCION) return fn(false);
      textoCarga.textContent = 'Preparando la canción…';
      setTimeout(mirar, 120);
    };
    mirar();
  }

  entrada.classList.add('cargando');
  // Mientras se sabe si el archivo está (unos milisegundos; como mucho 2,5 s), ni carga ni toque: así no parpadea.
  if (conInicio && !sinIntro) entrada.classList.add('con-toque');
  const decidido = !conInicio ? Promise.resolve(false) : Promise.race([banda.inicioDisponible, new Promise(r => setTimeout(() => r(false), 2500))]).then(hay => {
    cancion = hay;
    if (!hay || sinIntro) { entrada.classList.remove('con-toque'); return hay; }
    toque.hidden = false;
    toque.addEventListener('click', () => {
      if (tocado) return; tocado = true;
      // Síncrono dentro del toque: contexto de audio y desbloqueo de las pistas (iOS). La canción aún no suena.
      banda.desbloquear();
      toque.classList.add('fuera'); setTimeout(() => { toque.hidden = true; }, 800);
      entrada.classList.remove('con-toque');
      if (preparado) cuandoCancion(empezarClip);
    }, { once: true });
    return true;
  });

  // Para quien vuelve: descubrirlo todo de nuevo.
  if (yaVista) $('#entrada-opciones').hidden = false;
  $('#btn-desde-cero').addEventListener('click', () => $('#reinicio').showModal());

  // Continuar donde se dejó: el recorrido guiado (con su paso) o el último lugar.
  const destino = DESTINOS.find(d => d.id === viaje?.destino && d.id !== 'hogar');
  const paso = viaje?.paso;
  if (paso !== null && paso !== undefined) continuar.textContent = `Continuar el recorrido · lugar ${paso + 1} ↗`;
  else if (destino) continuar.textContent = `Continuar en «${destino.nombre}» ↗`;
  continuar.hidden = !(destino || (paso !== null && paso !== undefined));

  function entrar(opciones) {
    if (!preparado || boton.disabled) return;
    boton.disabled = continuar.disabled = true;
    entrada.classList.add('oculto');
    // La animación de la portada se para ya (su último cuadro se queda en el fundido de 1,5 s): seguía dibujando a pantalla
    // completa encima de los primeros cuadros del vuelo de entrada, los más cargados.
    portada.parar();
    setTimeout(() => { entrada.style.display = 'none'; }, 1600);
    document.body.classList.add('dentro');
    document.getElementById('hud').inert = false;
    setTimeout(() => document.getElementById('btn-tour')?.focus({ preventScroll: true }), 1700);
    alEntrar(opciones);
  }
  boton.addEventListener('click', () => entrar({}));
  continuar.addEventListener('click', () => entrar({ continuar: { destino: destino?.id ?? null, paso: paso ?? null } }));

  // Barra de carga (como un videojuego): la barra se llena y el porcentaje cuenta de 0 a 100, sin saltos y sin
  // retroceder. Cada paso dice dónde está (meta) y hasta dónde llegará (techo): el número alcanza la meta enseguida
  // y, mientras el paso trabaja, sigue subiendo despacio hacia su techo (nunca lo pasa): no parece parado.
  const textoCarga = $('#carga-texto'), barraCarga = document.querySelector('.carga-barra .carga-relleno'), pcCarga = $('#carga-pc');
  // Megas descargados de los previstos (la canción, texturas horneadas y cielo): con una conexión lenta se ve que avanza
  // y cuánto falta.
  const textoInicial = textoCarga.textContent, mb = b => (b / 1048576).toFixed(1).replace('.', ',');
  descargas.escuchar(({ total, hechos }) => { if (!total || preparado) return; const t = hechos >= total ? textoInicial : `Descargando el universo · ${mb(hechos)} de ${mb(total)} MB`; if (textoCarga.textContent !== t) textoCarga.textContent = t; });
  let meta = 0, techo = 0, mostrado = 0, animando = false, anterior = 0, alCompletar = null;
  const pintar = () => { const pc = Math.floor(mostrado * 100 + 1e-6); barraCarga.style.transform = `scaleX(${mostrado.toFixed(4)})`; if (pcCarga.textContent !== pc + ' %') pcCarga.textContent = pc + ' %'; };
  const avanzar = ahora => {
    const dt = Math.max(0, Math.min(0.1, (ahora - anterior) / 1000 || 0)); anterior = ahora;
    if (mostrado < meta) mostrado = Math.min(meta, mostrado + Math.max(0.25 * dt, (meta - mostrado) * Math.min(1, dt * 7)));
    else if (mostrado < techo) mostrado += (techo - mostrado) * Math.min(1, dt * 0.55) * 0.9;
    if (meta >= 1 && mostrado > 0.999) mostrado = 1;
    pintar();
    if (mostrado < 1) requestAnimationFrame(avanzar);
    else { animando = false; const fin = alCompletar; alCompletar = null; fin?.(); }
  };
  async function completar() {
    await decidido;   // (casi siempre ya resuelto: la carga tarda mucho más que la respuesta del servidor)
    preparado = true; boton.disabled = continuar.disabled = false; boton.classList.add('preparado');
    if (sinIntro) { entrada.classList.remove('cargando'); mostrarTarjeta(); return; }
    // Al 100 %: el clip y la canción (si ya se tocó; si no, empezarán con el toque).
    if (!cancion || tocado) cuandoCancion(empezarClip);
  }
  // Para las pruebas (#debug): fijar el clip en un instante (captura cuadro a cuadro) o soltarlo.
  if (location.hash === '#debug') window.__intro = { fijar: t => { fijo = t; }, soltar: () => { fijo = null; }, get tiempo() { return ultimo; }, get empezado() { return empezado; }, get conCancion() { return conCancion; } };
  return {
    progreso(f, hasta = f) {
      f = Math.max(0, Math.min(1, f)); meta = Math.max(meta, f); techo = Math.max(meta, Math.min(1, hasta));
      if (!animando) { animando = true; anterior = performance.now(); requestAnimationFrame(avanzar); }
    },
    // Todo cargado: el número termina de subir hasta 100 (rápido, sin saltar) y entonces empieza el clip.
    listo() { alCompletar = completar; this.progreso(1); },
    alEntrar(fn) { alEntrar = fn; },
    trasIntro(fn) { if (introAcabada) fn(); else trasIntro.push(fn); }
  };
}
