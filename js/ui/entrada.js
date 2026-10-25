import { descargas } from '../util/descargas.js';
// Entrada: portada animada (dos luces que se encuentran y forman un universo), una breve
// presentación y la tarjeta para entrar. Se ve en cada visita (se puede saltar) y quien
// vuelve puede continuar donde lo dejó.
// Con canción de portada (momento «inicio» de js/data/bandaSonora.js) hay antes una pantalla «Toca para empezar ♡»: los
// navegadores (iOS, Chrome) solo dejan sonar audio tras un gesto. La descarga empieza ya al abrir la página, sin esperar
// al toque; el toque arranca a la vez la canción y la animación, que sigue el reloj de la canción (sus hitos caen en las
// marcas) mientras el universo termina de cargar. La primera vez se escucha entera (sin «Saltar») y la tarjeta para
// entrar aparece en la marca «tarjeta», aunque la carga haya acabado antes; si la carga tarda más, la galaxia sigue
// girando con la música y la tarjeta llega cuando esté todo listo.
import { crearPortada, HITOS } from './portada.js';
import { reescalar } from '../util/sincronia.js';
import { DESTINOS } from '../data/universo.js';
const $ = s => document.querySelector(s);

const FRASES = [
  { desde: 0.25, texto: 'Dos luces, muy lejos la una de la otra…' },
  { desde: 2.4, texto: '…aprendieron a encontrarse.' },
  { desde: 5.0, texto: 'Se convirtieron en amor…' },
  { desde: 6.7, texto: '…y de ese amor nació un universo.' }
];

export function crearEntrada(config, { viaje, banda } = {}) {
  $('#entrada-nombre').textContent = config.nombre;
  $('#entrada-cita').textContent = config.cita;
  const foto = $('#foto');
  foto.alt = `Para ${config.nombre}`;
  foto.onerror = () => { foto.onerror = null; foto.src = config.fotoRespaldo; };
  foto.src = config.foto;

  const entrada = $('#entrada'), boton = $('#btn-entrar'), continuar = $('#btn-continuar'), saltar = $('#portada-saltar'), frase = $('#portada-frase');
  let alEntrar = () => {}, preparado = false;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const yaVista = !!viaje?.portadaVista;
  const cancion = !!banda?.conInicio, toque = $('#toque');
  // Con canción: la tarjeta espera a su marca (o, sin esa marca, a que se forme la galaxia); «libre», tras «Saltar».
  let marcaTarjeta = false, libre = false, tocado = false;
  const marcas = cancion ? banda.marcas('inicio') : {};

  function mostrarTarjeta() {
    entrada.classList.add('formado'); saltar.hidden = true; frase.classList.remove('visible');
    viaje?.marcarPortada();
    if (cancion && !libre && banda.tiempo('inicio') !== null) viaje?.marcarInicio();
  }
  const intentarTarjeta = () => { if (preparado && marcaTarjeta && !entrada.classList.contains('formado')) mostrarTarjeta(); };
  // Fase 1: carga de paquetes; la presentación espera a que todo esté listo (así corre sin pausas).
  entrada.classList.add('cargando');
  const portada = crearPortada($('#portada-lienzo'), { empezar: false,
    // Reloj de la canción llevado al de la animación; null (sin canción, si no se pudo cargar o tras «Saltar»): a su ritmo.
    reloj: cancion ? () => { if (libre) return null; const s = banda.tiempo('inicio'); return s === null ? null : reescalar(s, marcas, HITOS); } : null,
    frases: FRASES, alFormarse: () => {
      if (!cancion) { setTimeout(mostrarTarjeta, 900); return; }
      // Sin marca «tarjeta» (o sin canción que suene), como siempre: 0,9 s después de formarse.
      if (libre || !Number.isFinite(marcas.tarjeta) || banda.tiempo('inicio') === null) setTimeout(() => { marcaTarjeta = true; intentarTarjeta(); }, 900);
    },
    textoFrase: texto => {
      frase.classList.remove('visible');
      if (texto) setTimeout(() => { frase.textContent = texto; frase.classList.add('visible'); }, 260);
    }
  });
  // La presentación se ve en cada visita (se puede saltar); solo el movimiento reducido la omite.
  const empezarPresentacion = () => { if (reducido) { portada.saltar(); mostrarTarjeta(); } portada.empezar(); };
  saltar.addEventListener('click', () => {
    if (!cancion) { portada.saltar(); mostrarTarjeta(); return; }
    // La canción sigue sonando; la animación deja su reloj y la tarjeta sale en cuanto la carga esté lista.
    libre = true; portada.saltar(); marcaTarjeta = true; saltar.hidden = true; frase.classList.remove('visible'); intentarTarjeta();
  });
  if (cancion) {
    banda.alMarca(({ momento, marca }) => { if (momento === 'inicio' && marca === 'tarjeta') { marcaTarjeta = true; intentarTarjeta(); } });
    entrada.classList.add('con-toque'); toque.hidden = false;
    toque.addEventListener('click', () => {
      if (tocado) return; tocado = true;
      // Todo síncrono dentro del toque: contexto de audio, desbloqueo de las pistas (iOS) y la canción desde el principio.
      banda.desbloquear(); banda.activar(true); banda.ir('inicio', { desde: 0 });
      toque.classList.add('fuera'); setTimeout(() => { toque.hidden = true; }, 800);
      entrada.classList.remove('con-toque', 'cargando'); entrada.classList.add('cancion');
      if (!preparado) entrada.classList.add('descargando');
      // La primera vez se escucha entera; en las siguientes se puede saltar, como siempre.
      saltar.hidden = !viaje?.inicioEscuchado;
      if (reducido) { libre = true; portada.saltar(); marcaTarjeta = true; saltar.hidden = true; }
      portada.empezar(); intentarTarjeta();
    }, { once: true });
  }

  // Para quien vuelve: descubrirlo todo de nuevo (la presentación ya se ve siempre).
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
    setTimeout(() => { entrada.style.display = 'none'; portada.parar(); }, 1600);
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
  // Megas descargados de los previstos (texturas horneadas y cielo): con una conexión lenta se ve que avanza y cuánto falta.
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
  function completar() { preparado = true; boton.disabled = continuar.disabled = false; boton.classList.add('preparado');
      // Con canción, la presentación ya empezó con el toque (o empezará con él): la tarjeta, en su marca.
      if (cancion) { entrada.classList.remove('descargando'); intentarTarjeta(); return; }
      // Fase 2: con todo cargado, la presentación (nada pesado a la vez).
      entrada.classList.remove('cargando'); setTimeout(empezarPresentacion, 500);
  }
  return {
    progreso(f, hasta = f) {
      f = Math.max(0, Math.min(1, f)); meta = Math.max(meta, f); techo = Math.max(meta, Math.min(1, hasta));
      if (!animando) { animando = true; anterior = performance.now(); requestAnimationFrame(avanzar); }
    },
    // Todo cargado: el número termina de subir hasta 100 (rápido, sin saltar) y entonces empieza la presentación.
    listo() { alCompletar = completar; this.progreso(1); },
    alEntrar(fn) { alEntrar = fn; }
  };
}
