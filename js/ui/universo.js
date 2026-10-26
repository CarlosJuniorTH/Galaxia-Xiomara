import { crearPresentacionViajes } from './presentacionViajes.js';
import { DESTINOS, LEJANOS, lugaresDeZona, CARTAS, CAPSULAS, SUENOS, SORPRESAS, ZONAS, CONSTELACIONES, FRASES_COMETA } from '../data/universo.js';
import { relojZona, fechaBonita, capsulaAbierta, partesEnZona } from '../util/tiempo.js';
import { momentoDelDia } from '../util/sol.js';
import { crearCieloNoche } from './cieloNoche.js';
import { crearSupernovaAmor } from './supernovaAmor.js';
import { crearFaroCuasar } from './faroCuasar.js';
import { crearMapa } from './mapa.js';
import { crearEscenasGigantes } from './escenasGigantes.js';
import { FRASE_SUPERNOVA, TIEMPOS_AMOR } from '../util/supernovaAmor.js';
import { crearAvisos } from './avisos.js';
import { crearEscenaAgujeros } from './escenaAgujeros.js';
import { ESCENAS_GIGANTES } from '../util/escenasGigantes.js';
import { DURACION as DURACION_AGUJEROS } from '../util/guionAgujeros.js';
const $ = id => document.getElementById(id);
// Las seis grandes (supernova, cuásar, púlsar, Deneb, TON 618 y Sagitario A*): los lejanos salvo el gigante del corazón.
const GRANDES = new Set(LEJANOS.filter(d => d.id !== 'gigante').map(d => d.id));
function el(tag, clase, texto) { const n = document.createElement(tag); if (clase) n.className = clase; if (texto !== undefined) n.textContent = texto; return n; }
function boton(texto, clase, accion) { const b = el('button', clase, texto); b.type = 'button'; b.addEventListener('click', accion); return b; }

export function crearInterfazUniverso({ config, escena, progreso, recuerdos, estrellas, efectos, musica, banda, viaje }) {
  const panel = $('panel-universo'), contenido = $('panel-contenido'), lectura = $('lectura');
  lectura.querySelector('.firma').textContent = config.firma;
  let panelActual = '', actual = 'hogar', postalURL = null, celebrando = false, celebracionRevision = 0, constelacionElegida = 'hilo';
  let tour = false, indiceRuta = 0, pausa = false, esperando = false, permanencia = 0, revision = 0, ultimo = performance.now();
  const ruta = [...DESTINOS.map(d => d.id), 'cometa'];
  const destinoCometa = { id: 'cometa', nombre: 'Un beso fuera de órbita', tipo: 'Una visita inesperada', texto: 'Este viajero no se queda para siempre. Se acerca un ratito, deja una pequeña sorpresa y sigue su camino entre las estrellas.', accion: 'Abrir la sorpresa del cometa' };
  const datos = id => DESTINOS.find(d => d.id === id) || LEJANOS.find(d => d.id === id) || destinoCometa;
  const cieloNoche = crearCieloNoche();
  crearPresentacionViajes({ canvas: $('galaxia'), escena, nombre: id => id === 'supernova' ? 'nuestra supernova' : id === 'hogar' ? 'nuestra galaxia' : datos(id).nombre, elegirDestino: () => abrirPanel('lugares') });
  const supernovaAmor = crearSupernovaAmor({ escena, progreso, musica, banda, alDescubrir: () => { if (actual === 'supernova') situar('supernova'); } });
  // El púlsar y Deneb: su escena al llegar (sincronizable con su audio: relojDe).
  const escenasGigantes = crearEscenasGigantes({ escena, banda });
  // La carta del cuásar: a la vista cuando su videoclip se ha visto entero.
  const faro = crearFaroCuasar({ escena, progreso, mostrarLectura, alCambiar: () => { if (actual === 'cuasar') situar('cuasar'); } });
  // TON 618 y Sagitario A*: su escena empieza sola al llegar, con su canción (js/ui/escenaAgujeros.js).
  const escenaAgujeros = crearEscenaAgujeros({ escena, banda, alRepetir: (id, segundos) => escenaEnCurso(id, segundos) });
  $('faro-carta').addEventListener('click', () => { if (actual === 'cuasar' && !escena.viajando) faro.abrirCarta(); });
  // Tras el estallido, el corazón es un lugar más: misma tarjeta, y su gesto es volver a sentirlo.
  const corazonNacido = () => supernovaAmor.descubierta || escena.estadoSupernova === 'remanente';
  // Escena de un gigante (supernova, cuásar, púlsar, Deneb, TON 618, Sagitario A*): cada visita la dispara con su canción
  // y NO se puede saltar. Mientras dura, los controles para irse a otro sitio (muelle, mapa, «Mirar hacia casa», «Volver al
  // centro», el gesto del lugar, el recorrido) se ocultan con un fundido y los viajes se rechazan con un aviso; al terminar
  // vuelven con otro fundido. Mecanismo común: la llegada la abre con la duración de su canción (o de la ceremonia de la
  // supernova) y las escenas de cada gigante pueden abrirla, alargarla o cerrarla con escenaEnCurso(id, segundos) y
  // terminarEscena(id). Solo la supernova que va a estallar pasa por encima (se viaja a ella a la fuerza).
  const GIGANTES = new Set(['supernova', 'cuasar', 'pulsar', 'deneb', 'ton618', 'sagitario']);
  let escenaActual = null, volviendoT = 0;
  function escenaEnCurso(id, duracion) {
    clearTimeout(escenaActual?.temporizador);
    if (!(duracion > 0)) { terminarEscena(); return; }
    escenaActual = { id, fin: performance.now() + duracion * 1000, temporizador: setTimeout(() => terminarEscena(id), duracion * 1000) };
    clearTimeout(volviendoT); document.body.classList.remove('escena-volviendo'); document.body.classList.add('escena-gigante');
    if (panel.open) cerrarPanel(); mapa.cerrar();
    if (escena.mirandoCasa) escena.mirarCasa(false);
    document.dispatchEvent(new CustomEvent('escena-gigante', { detail: { id, duracion, activa: true } }));
  }
  // Vigía del bloqueo común: el panel de abajo y los controles vuelven SIEMPRE. Si la escena sigue abierta pero ya se está
  // en otro sitio (se viajó a mitad), se cierra; si no hay escena, no queda ninguna clase que los oculte; y al terminar el
  // videoclip (la cámara vuelve al control) la interfaz se despierta.
  let clipAntes = null;
  setInterval(() => {
    if (escenaActual && !escena.viajando && escena.destino !== escenaActual.id) terminarEscena();
    if (!escenaActual && document.body.classList.contains('escena-gigante')) { document.body.classList.remove('escena-gigante'); document.dispatchEvent(new Event('despertar-interfaz')); }
    if (!accionEnCurso && document.body.classList.contains('accionando')) document.body.classList.remove('accionando');
    const clip = escena.clip?.id ?? null;
    if (clipAntes && !clip) document.dispatchEvent(new Event('despertar-interfaz'));
    clipAntes = clip;
  }, 400);
  function terminarEscena(id) {
    if (!escenaActual || (id && escenaActual.id !== id)) return;
    const fin = escenaActual; clearTimeout(fin.temporizador); escenaActual = null;
    document.body.classList.remove('escena-gigante'); document.body.classList.add('escena-volviendo');
    clearTimeout(volviendoT); volviendoT = setTimeout(() => document.body.classList.remove('escena-volviendo'), 1200);
    document.dispatchEvent(new CustomEvent('escena-gigante', { detail: { id: fin.id, duracion: 0, activa: false } }));
    document.dispatchEvent(new Event('despertar-interfaz'));   // (si la interfaz se había dormido mirando, vuelve)
  }
  // Al terminar un viaje (en el mismo cuadro que la canción del destino): la escena de un gigante empieza ya.
  function llegada(id) {
    if (!GIGANTES.has(id)) { terminarEscena(); return; }
    const ceremonia = id === 'supernova' && !corazonNacido();
    const duracion = ceremonia ? TIEMPOS_AMOR.espera + TIEMPOS_AMOR.revelar + 4.5 : banda?.duracion(id) || 0;
    if (duracion) escenaEnCurso(id, duracion);
  }
  // Contemplar: un paseo lento y sin interfaz por todos los lugares; cualquier toque lo termina.
  let contemplando = false, revisionContemplar = 0, salidaContemplar = 0;
  const ORDEN_CONTEMPLAR = ['rosa', 'azul', 'constelacion', 'calma', 'capsulas', 'cartas', 'suenos', 'hogar'];
  const esperarContemplando = (ms, mia) => new Promise(r => { const fin = performance.now() + ms; (function mirar() { if (!contemplando || mia !== revisionContemplar || performance.now() >= fin) r(); else setTimeout(mirar, 250); })(); });
  function terminarContemplar() {
    if (!contemplando) return;
    contemplando = false; revisionContemplar++; salidaContemplar = performance.now();
    document.body.classList.remove('paseo-contemplar'); situar(escena.destino);
  }
  async function contemplar() {
    if (celebrando || tour || contemplando || escenaActual) return;
    if (panel.open) cerrarPanel();
    contemplando = true; const mia = ++revisionContemplar;
    document.body.classList.add('paseo-contemplar'); musica?.reproducir?.(true);
    avisar('Un paseo sin prisa por nuestro universo. Toca la pantalla cuando quieras volver.');
    setTimeout(() => { if (contemplando && mia === revisionContemplar) for (const evento of ['pointerdown', 'keydown']) document.addEventListener(evento, terminarContemplar, { once: true, capture: true }); }, 900);
    for (let i = 0; contemplando && mia === revisionContemplar; i = (i + 1) % ORDEN_CONTEMPLAR.length) {
      const llegado = await escena.viajar(ORDEN_CONTEMPLAR[i], { duracion: 8.5, ritmoPropio: true });   // un paseo, no un viaje: su ritmo
      if (!contemplando || mia !== revisionContemplar) break;
      await esperarContemplando(llegado ? (ORDEN_CONTEMPLAR[i] === 'hogar' ? 20000 : 15000) : 1000, mia);
    }
  }
  // Los avisos breves van en cola (avisos.js): de uno en uno, sin repetirse; los urgentes pasan delante.
  let fraseT = 0;
  const avisos = crearAvisos({
    brindis: { duracion: 5200, salida: 700, mostrar(texto) { $('brindis').textContent = texto; $('brindis').classList.add('visible'); }, ocultar() { $('brindis').classList.remove('visible'); } },
    cometa: {
      duracion: 8000, salida: 1200,
      mostrar(texto) { clearTimeout(fraseT); $('cometa-frase-texto').textContent = texto; const caja = $('cometa-frase'); caja.hidden = false; requestAnimationFrame(() => caja.classList.add('visible')); },
      ocultar({ inmediato = false } = {}) { const caja = $('cometa-frase'); caja.classList.remove('visible'); clearTimeout(fraseT); fraseT = setTimeout(() => { caja.hidden = true; }, inmediato ? 0 : 1200); }
    }
  });
  // urgente: pasa delante de la cola (la supernova que va a estallar).
  function avisar(texto, { urgente = false } = {}) { avisos.poner(texto, { urgente }); }
  // Las seis grandes: lejos de casa, con el universo a gran escala, no hay estrellas fugaces (son meteoros de la
  // atmósfera) ni cometas. En casa y en nuestra galaxia, todo sigue igual.
  const enLasGrandes = () => escena.lejosDeCasa || GRANDES.has(escena.destino);
  function cerrarPanel() { panel.close(); panelActual = ''; }
  function mostrarLectura(titulo, parrafos, ceja = 'PALABRAS QUE VIAJAN HASTA TI', { conCometa = false, sinFirma = false } = {}) {
    if (tour) pausarRuta(true);
    // Con el cometa la carta deja ver el cielo: se le ve alejarse mientras se lee.
    lectura.classList.toggle('con-cometa', conCometa);
    lectura.classList.toggle('sin-firma', sinFirma);   // la carta ya lleva su propia firma
    if (panel.open) cerrarPanel();
    $('lectura-ceja').textContent = ceja; $('lectura-titulo').textContent = titulo;
    $('lectura-texto').replaceChildren(...parrafos.map(p => el('p', '', p)));
    lectura.showModal();
  }
  for (const dialogo of [panel, lectura, $('postal')]) {
    dialogo.querySelector('.cerrar-panel').addEventListener('click', () => dialogo === panel ? cerrarPanel() : dialogo.close());
    dialogo.addEventListener('click', e => { if (e.target !== dialogo) return; const r = dialogo.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialogo.close(); });
  }
  panel.addEventListener('close', () => { panelActual = ''; });
  $('btn-musica').addEventListener('click', () => { $('btn-musica').setAttribute('aria-label', $('btn-musica').classList.contains('pausado') ? 'Reproducir música' : 'Pausar música'); });
  document.querySelectorAll('[data-panel]').forEach(b => b.addEventListener('click', () => abrirPanel(b.dataset.panel)));
  $('lugar-accion').addEventListener('click', () => accionLugar(actual));
  $('btn-tour').addEventListener('click', iniciarRuta);
  $('ruta-salir').addEventListener('click', () => terminarRuta());
  $('ruta-anterior').addEventListener('click', () => { pausarRuta(false); pasoRuta(indiceRuta - 1); });
  $('ruta-descubrir').addEventListener('click', () => { const id = actual; terminarRuta(false, false); if (!escena.viajando) accionLugar(id); });
  $('ruta-siguiente').addEventListener('click', () => { pausarRuta(false); indiceRuta >= ruta.length - 1 ? terminarRuta(true) : pasoRuta(indiceRuta + 1); });
  $('ruta-pausa').addEventListener('click', () => pausarRuta(!pausa));
  $('btn-pista').addEventListener('click', darPista);
  $('btn-postal').addEventListener('click', postal);
  $('btn-cometa').addEventListener('click', () => visitar('cometa'));
  // Aparece al llegar a un lugar, a veces justo bajo el dedo que tocó el planeta: el clic
  // de ese mismo toque (clic fantasma) no debe deshacer el viaje recién empezado.
  let volverVisibleDesde = 0;
  $('lugar-volver').addEventListener('click', () => { if (performance.now() - volverVisibleDesde > 500) visitar('hogar'); });
  $('salir-calma').addEventListener('click', () => { modoCalma(false); visitar('hogar'); });
  $('reinicio-cancelar').addEventListener('click', () => $('reinicio').close());
  $('reinicio-confirmar').addEventListener('click', () => { if (progreso.reiniciar()) { viaje?.olvidar(); location.reload(); } else $('reinicio').close(); });

  // ── Mapa de orientación: «El mapa de nosotros», en tres zonas (mapa.js) ──
  const mapa = crearMapa({ escena, progreso, actual: () => actual, visitar });

  function modoCalma(valor) {
    document.body.classList.toggle('en-calma', valor); $('salir-calma').hidden = !valor;
    for (const n of $('hud').children) if (n.id !== 'salir-calma') n.inert = valor;
    if (valor) $('salir-calma').focus({ preventScroll: true });
  }
  function situar(id) {
    actual = id; const d = datos(id);
    const nacido = id === 'supernova' && corazonNacido();
    $('lugar-tipo').textContent = d.tipo; $('lugar-nombre').textContent = id === 'hogar' ? 'Nuestro pequeño infinito' : nacido ? 'Donde nuestra luz se encontró' : d.nombre;
    $('lugar-texto').textContent = id === 'hogar' ? 'Hay una historia escondida entre estas estrellas. La nuestra.' : nacido ? `De tanta luz, nacimos nosotros. ${FRASE_SUPERNOVA}` : d.texto;
    // En los seis gigantes, tras su videoclip: «Volver a sentirlo» (la supernova, cuando su corazón ya ha nacido).
    const textoAccion = id === 'hogar' ? 'Explorar los lugares' : nacido || (GIGANTES.has(id) && id !== 'supernova') ? 'Volver a sentirlo' : id === 'constelacion' && escena.constelada ? 'Elegir otra figura' : d.accion;
    $('lugar-accion').replaceChildren(document.createTextNode(textoAccion), el('span', '', '↗'));
    // En el corazón ya nacido: contemplarlo aislado o con el universo, y guardar su postal.
    $('lugar-extra').hidden = !nacido;
    $('lugar-faro').hidden = !(id === 'cuasar' && faro.cartaLista);
    $('faro-carta').textContent = faro.accionCarta;
    aislarCorazon(nacido && document.body.dataset.supernovaAislada === 'true');   // el botón refleja el estado real
    if (id !== 'constelacion' && !celebrando && !tour) $('tejido').hidden = true;
    if ($('lugar-volver').hidden && id !== 'hogar') volverVisibleDesde = performance.now();
    $('lugar-volver').hidden = id === 'hogar';
    modoCalma(false);
  }
  // La estrella que va a estallar: si sigue entera, al llegar empieza la cuenta atrás.
  function aislarCorazon(aislar) {
    if (aislar) document.body.dataset.supernovaAislada = 'true'; else delete document.body.dataset.supernovaAislada;
    $('lugar-aislar').setAttribute('aria-pressed', String(aislar)); $('lugar-aislar').textContent = aislar ? 'Ver con el universo' : 'Ver solo el corazón';
  }
  $('lugar-aislar').addEventListener('click', () => aislarCorazon(document.body.dataset.supernovaAislada !== 'true'));
  $('lugar-postal').addEventListener('click', () => postal({ supernova: true }));
  async function verSupernova() {
    // La ceremonia es la escena de la supernova (también al volver a sentirla): no se puede saltar ni irse a otro sitio.
    const repetir = corazonNacido();
    escenaEnCurso('supernova', (repetir ? 4 : 0) + TIEMPOS_AMOR.espera + TIEMPOS_AMOR.revelar + 4.5);
    await supernovaAmor.abrir({ repetir });
    terminarEscena('supernova');
    if (actual === 'supernova') situar('supernova');
  }
  // «Volver a sentirlo» en cualquiera de los seis gigantes: su canción, su escena y su cámara otra vez desde el segundo 0, y
  // sin poder saltarlo (como la primera vez: escenaEnCurso). Solo con el clip anterior ya terminado y estando en él.
  const duracionClip = id => banda?.duracion(id) || ESCENAS_GIGANTES[id]?.duracion || DURACION_AGUJEROS[id] || 0;
  // El clip de llegada del púlsar, del cuásar o de Deneb (al terminar, el cuásar deja su carta a la vista).
  async function clipGigante(id) {
    const completo = await escenasGigantes.abrir(id);
    if (completo && id === 'cuasar') faro.marcarVisto();
    if (actual === id) situar(id);
    return completo;
  }
  async function volverASentirlo(id) {
    if (!GIGANTES.has(id) || escenaActual || escena.viajando || escena.destino !== id || escena.clip) return;
    if (id === 'supernova') return verSupernova();
    if (escenaAgujeros.propia(id)) return escenaAgujeros.repetir(id);
    if (!escenasGigantes.tiene(id) || escenasGigantes.enCurso) return;
    banda?.ceremonia(id);
    escenaEnCurso(id, duracionClip(id));
    await clipGigante(id);
  }

  // forzado: el viaje de la supernova que va a estallar (pasa por encima de la escena de otro gigante).
  async function visitar(id, { forzado = false } = {}) {
    if (celebrando) { avisar('Estamos reuniendo nuestras estrellas. Puedes ir directamente a la carta con el botón de arriba.'); return; }
    if (escenaActual && !forzado) { avisar('Quédate un momento: esto está pasando solo para ti. ♡'); return; }
    if (forzado) terminarEscena();
    if (panel.open) cerrarPanel();
    if (tour) terminarRuta(false, false);
    // Ya estamos en ese lugar lejano: no se vuelve a viajar a él.
    const lejano = LEJANOS.find(l => l.id === id);
    if (lejano && escena.destino === id && !escena.viajando) { avisar(`Ya estás aquí: ${lejano.nombre}.`); return; }
    const llegado = await escena.viajar(id);
    // Si la estrella aún no ha estallado, al llegar empieza su cuenta atrás; el corazón ya nacido no.
    // En cuanto se llega (sin espera: la ceremonia y su canción empiezan con la llegada).
    if (llegado && id === 'supernova' && actual === 'supernova' && !corazonNacido() && !escena.viajando) accionLugar('supernova');
    if (llegado && escenasGigantes.tiene(id) && actual === id) clipGigante(id);
    if (llegado) { progreso.anotar('visitas', id); if (id === 'constelacion') avisar('La luz blanca te muestra por dónde empezar. Puedes tocar las luces o unirlas con el botón.'); }
  }
  // Cada lugar tiene su gesto propio antes de abrir su contenido: abrir un sobre, rodar
  // con una luna, seguir la corriente de luz, acercarse a la cápsula, hacer florecer…
  let accionEnCurso = false;
  async function accionLugar(id) {
    if (accionEnCurso || escena.viajando) return;
    if (escenasGigantes.enCurso === id) return;   // las escenas de llegada no se pueden saltar ni interrumpir con la acción del lugar
    // Los gigantes: su videoclip ya bloquea la navegación (escenaEnCurso) y la devuelve al terminar; no retiene «accionando»
    // (que oculta tarjeta y panel) durante todo el clip.
    if (GIGANTES.has(id) && id !== 'supernova') { volverASentirlo(id); return; }
    accionEnCurso = true; document.body.classList.add('accionando');
    try {
      if (id === 'hogar') abrirPanel('lugares');
      else if (id === 'rosa') { await escena.accion('rosa'); if (actual === 'rosa') recuerdos.abrir(0); }
      else if (id === 'constelacion') {
        if (escena.constelada) abrirPanel('constelaciones');
        else { tejer(); escena.accion('constelacion'); }
      }
      else if (id === 'calma') { modoCalma(true); escena.accion('calma'); }
      else if (id === 'cometa') sorpresa();
      else if (id === 'supernova') await verSupernova();
      else if (GIGANTES.has(id)) await volverASentirlo(id);   // su gesto: volver a sentir su videoclip
      else if (LEJANOS.some(l => l.id === id)) await escena.accion(id);
      else if (id === 'cartas') { await abrirSobre(); abrirPanel('cartas'); }
      else if (id === 'azul') { await escena.accion('azul'); if (actual === 'azul') abrirPanel('horarios'); }
      else { await escena.accion(id); if (actual === id) abrirPanel(id); }
    } finally { accionEnCurso = false; document.body.classList.remove('accionando'); }
  }
  // Un sobre que se abre y deja asomar la carta (~1,8 s).
  function abrirSobre() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    const caja = $('sobre-animado'); caja.hidden = false; caja.classList.remove('abierto', 'fuera');
    void caja.offsetWidth; caja.classList.add('abierto');
    return new Promise(r => setTimeout(() => { caja.classList.add('fuera'); setTimeout(() => { caja.hidden = true; r(); }, 380); }, 1650));
  }
  function tarjeta(d, accion, subtitulo) {
    const b = boton('', 'tarjeta-lugar', accion); b.style.setProperty('--acento', d.color || '#e8c6a0');
    const t = el('div'); t.append(el('strong', '', d.nombre || d.titulo), el('small', '', subtitulo || d.tipo || d.subtitulo));
    b.append(el('span', 'icono-lugar', d.icono || '✧'), t, el('span', 'flecha', '↗')); return b;
  }
  const intro = texto => contenido.append(el('p', 'intro-panel', texto));
  const separar = () => contenido.append(el('div', 'separador'));
  escena.cumplirSuenos(progreso.estado.suenos);
  function abrirPanel(tipo) {
    if (celebrando) { avisar('Estamos reuniendo nuestras estrellas. Puedes ir directamente a la carta con el botón de arriba.'); return; }
    if (tour) pausarRuta(true);
    panelActual = tipo; contenido.replaceChildren(); contenido.scrollTop = 0;
    const nombres = { lugares: ['UN MAPA PARA PERDERNOS', 'Elige una órbita'], album: ['LO QUE YA ES NUESTRO', 'Tu álbum de estrellas'], cartas: ['EL CORREO DE LA LUNA', 'Un sobre para cada momento'], capsulas: ['PALABRAS QUE ESPERAN SU DÍA', 'La órbita del mañana'], suenos: ['ESPACIO PARA LO QUE VIENE', 'Nuestro jardín de sueños'], constelaciones: ['HISTORIAS DIBUJADAS CON LUZ', 'Elige un hilo de estrellas'], horarios: ['LA DISTANCIA TAMBIÉN TIENE LUZ', 'Dos orillas, un cielo'] };
    const [ceja, titulo] = nombres[tipo] || nombres.lugares;
    $('panel-ceja').textContent = ceja; $('panel-titulo').textContent = titulo;
    if (tipo === 'lugares') {
      intro('Cada lugar guarda algo distinto. Puedes elegir tu destino o dejar que la cámara te acompañe por todo el universo.');
      contenido.append(boton('✧ Empezar el recorrido completo', 'primario ancho', () => { cerrarPanel(); iniciarRuta(); }));
      contenido.append(boton('☾ Contemplar el universo, sin prisa', 'secundario ancho', () => { cerrarPanel(); contemplar(); }));
      contenido.append(boton('✦ El cielo de la noche en que empezó todo', 'secundario ancho', () => { cerrarPanel(); cieloNoche.abrir(); })); separar();
      // Tres niveles, de lo más cercano a lo más lejano, según dónde está cada lugar de verdad (ZONAS_LUGARES).
      const sub = d => `${d.tipo}${progreso.tiene('visitas', d.id) ? ' · visitado' : ''}`;
      const zona = (titulo, texto, ids) => { contenido.append(el('h3', 'capitulo-titulo zona-titulo', titulo)); if (texto) intro(texto); for (const d of lugaresDeZona(ids)) contenido.append(tarjeta(d, () => visitar(d.id), sub(d))); };
      zona('Dentro de nuestro sistema solar', 'Nuestro Sol y sus mundos, en un brazo de la galaxia de Xiomara.', 'solar');
      separar(); zona('En la galaxia de Xiomara', 'Fuera del sistema solar, entre sus estrellas.', 'galaxia');
      contenido.append(boton('☄ Seguir al cometa viajero', 'secundario ancho', () => visitar('cometa')));
      // Más allá: la cámara viaja hasta donde están de verdad (no se acercan).
      separar(); zona('Más allá de la galaxia de Xiomara', 'Muy lejos, a cientos de millones de años luz: la cámara viajará hasta ellos.', 'fuera');
    } else if (tipo === 'constelaciones') {
      intro('Cada figura guarda una idea de nuestra historia. Elige una y toca sus luces blancas en orden, o deja que el hilo se teja solo.');
      for (const c of CONSTELACIONES) contenido.append(tarjeta(c, () => { constelacionElegida = c.id; escena.elegirConstelacion(c.id); $('lugar-nombre').textContent = c.nombre; $('lugar-texto').textContent = c.texto; cerrarPanel(); tejer(); }, `${c.texto}${progreso.tiene('constelaciones', c.id) ? ' · descubierta' : ''}`));
      separar(); contenido.append(boton('Prefiero unir las luces yo', 'secundario ancho', () => { escena.elegirConstelacion(constelacionElegida, true); cerrarPanel(); avisar('Empieza por la luz blanca y sigue el hilo, estrella a estrella.'); }));
    } else if (tipo === 'album') {
      const n = recuerdos.encontradas().length;
      const resumen = el('div', 'resumen-album'); const txt = el('p'); txt.append(document.createTextNode(`de ${estrellas.length} estrellas encontradas`), el('br'), document.createTextNode('Tu historia se guarda en este navegador.'));
      resumen.append(el('div', 'resumen-numero', n), txt); contenido.append(resumen);
      intro('Una luz por el comienzo y otra por cada mes cumplido. Los nuevos meses aparecen según la fecha de Argentina.');
      // Una cuadrícula de tarjetas por capítulo (año): el mes destacado, doradas las
      // encontradas y en tono apagado las pendientes, sin desvelar su contenido.
      let capitulo = 0, rejilla = null;
      for (const [i, s] of estrellas.entries()) {
        if (s.capitulo !== capitulo) {
          capitulo = s.capitulo;
          contenido.append(el('h3', 'capitulo-titulo', `Capítulo ${capitulo} · ${capitulo === 1 ? 'nuestro primer año' : `año ${capitulo}`}`));
          rejilla = el('div', 'album-rejilla'); contenido.append(rejilla);
        }
        const encontrada = progreso.tiene('estrellas', s.id), r = config.recuerdos[i];
        const b = boton('', `recuerdo-item tarjeta-mes${encontrada ? ' encontrada' : ''}`, () => { cerrarPanel(); recuerdos.abrir(i, { album: true }); }); b.disabled = !encontrada;
        const texto = el('div'); texto.append(el('em', 'mes-etiqueta', i ? `Mes ${i}` : 'El comienzo'), el('strong', '', encontrada ? (r?.titulo || `Nuestra estrella ${i}`) : 'Por descubrir'), el('small', '', fechaBonita(s.id)));
        b.append(el('span', '', encontrada ? '✦' : '✧'), texto); rejilla.append(b);
      }
      separar();
      contenido.append(el('p', 'intro-panel', `También has abierto ${progreso.estado.cartas.length} ${progreso.estado.cartas.length === 1 ? 'carta' : 'cartas'}, descubierto ${progreso.estado.cometas.length} ${progreso.estado.cometas.length === 1 ? 'sorpresa' : 'sorpresas'} y tejido ${progreso.estado.constelaciones.length} de ${CONSTELACIONES.length} constelaciones.`));
      if (progreso.estado.suenos.length) contenido.append(el('p', 'intro-panel', `${progreso.estado.suenos.length} sueños marcados como cumplidos. Cada uno conserva su luz en el jardín.`));
      if (n === estrellas.length) contenido.append(boton('♡ Volver a vivir la celebración', 'primario ancho', () => { cerrarPanel(); celebrar(); }));
      else contenido.append(boton('⌁ Ayúdame a encontrar otra estrella', 'primario ancho', () => { cerrarPanel(); darPista(); }));
      separar();
      contenido.append(boton('Guardar una copia de mi viaje ↓', 'secundario ancho', exportarViaje));
      const importar = el('input'); importar.type = 'file'; importar.accept = '.json,application/json'; importar.hidden = true; importar.id = 'importar-viaje'; importar.addEventListener('change', () => importarViaje(importar.files[0])); contenido.append(importar);
      contenido.append(boton('Recuperar una copia guardada ↑', 'enlace-suave ancho', () => importar.click()));
      separar(); contenido.append(boton('Empezar un nuevo viaje', 'secundario ancho', () => { cerrarPanel(); $('reinicio').showModal(); }));
      if (supernovaAmor.descubierta) {
        separar(); contenido.append(tarjeta({ nombre: 'Donde nuestra luz se encontró', icono: '♡', subtitulo: 'Nuestra supernova de amor · volver a contemplar' }, () => visitar('supernova')));
      }
    } else if (tipo === 'cartas') {
      intro('Las escribí para que puedas encontrarme también en las pequeñas pausas del día. Elige la que hoy te apetezca abrir.');
      contenido.append(tarjeta({ nombre: config.cartaTitulo, icono: '♡', subtitulo: 'La carta que dio origen a este universo' }, () => { cerrarPanel(); progreso.anotar('cartas', 'principal'); $('btn-carta').click(); }));
      for (const c of CARTAS) contenido.append(tarjeta(c, () => { progreso.anotar('cartas', c.id); mostrarLectura(c.titulo, c.texto, c.subtitulo); }, `${c.subtitulo}${progreso.tiene('cartas', c.id) ? ' · leída' : ''}`));
    } else if (tipo === 'capsulas') {
      intro('Estas palabras fueron preparadas para el futuro. Cada cápsula se abre al empezar su fecha en Argentina.');
      for (const c of CAPSULAS) {
        const abierta = capsulaAbierta(c.fecha), caja = el('article', 'capsula');
        caja.append(el('small', '', `${abierta ? '✧ Lista para abrir' : '◷ Esperando su día'} · ${fechaBonita(c.fecha)}`), el('h3', '', c.titulo));
        if (!abierta) {
          const dias = Math.ceil((Date.parse(`${c.fecha}T00:00:00-03:00`) - Date.now()) / 864e5);
          caja.append(el('p', '', dias > 1 ? `Faltan ${dias} días. Algunas sorpresas merecen viajar despacito.` : 'Se abre muy pronto, al llegar la medianoche de Argentina.'));
        }
        const b = boton(abierta ? 'Abrir esta cápsula ↗' : 'Todavía está viajando', abierta ? 'primario' : 'secundario', () => {
          if (!capsulaAbierta(c.fecha)) return;
          progreso.anotar('capsulas', c.id); mostrarLectura(c.titulo, [c.texto], `Cápsula del ${fechaBonita(c.fecha)}`);
        }); b.disabled = !abierta; caja.append(b); contenido.append(caja);
      }
    } else if (tipo === 'suenos') {
      intro('Son deseos que me gustaría compartir contigo. Cuando uno suceda de verdad, puedes encender su luz. Quedará guardado en este navegador.');
      for (const s of SUENOS) {
        const cumplido = progreso.tiene('suenos', s.id), caja = el('article', `sueno${cumplido ? ' cumplido' : ''}`);
        caja.append(el('div', 'ceja', cumplido ? '✧ ESTE SUEÑO YA TIENE SU LUZ' : '❋ UNA SEMILLA PARA EL FUTURO'), el('h3', '', s.titulo), el('p', '', s.texto));
        const b = boton(cumplido ? 'Volver a dejarlo pendiente' : 'Lo hemos cumplido ♡', cumplido ? 'secundario' : 'primario', () => {
          if (cumplido) { progreso.retirar('suenos', s.id); avisar('El sueño vuelve a esperar en el jardín.'); }
          else { progreso.anotar('suenos', s.id); escena.besar(); efectos.fuegos(1800); avisar('Un deseo acaba de convertirse en parte de vuestra historia.'); }
          escena.cumplirSuenos(progreso.estado.suenos); abrirPanel('suenos');
        }); caja.append(b); contenido.append(caja);
      }
    } else if (tipo === 'horarios') {
      intro('El saludo de Xio sigue la hora de Buenos Aires. El reloj de Cas sigue la hora de Barcelona, incluidos sus cambios de horario de verano.');
      const relojes = el('div', 'relojes-panel');
      for (const [id, nombre, zona] of [['reloj-panel-carlos', 'Cas · Barcelona', ZONAS.carlos], ['reloj-panel-xiomara', 'Xio · Buenos Aires', ZONAS.xiomara]]) {
        const div = el('div', 'reloj-tarjeta'); const hora = el('strong', '', relojZona(new Date(), zona)); hora.id = id; div.append(hora, el('small', '', nombre)); relojes.append(div);
      }
      contenido.append(relojes);
      // El planeta muestra el día y la noche reales: aquí se dice cómo está el cielo en cada orilla.
      intro(`Ahora mismo en Barcelona está ${momentoDelDia(2.17, 41.39)} y en Buenos Aires ${momentoDelDia(-58.38, -34.6)}: el planeta lo muestra tal cual, con las luces de las ciudades encendidas en la noche.`);
      intro('Dos luces orbitan juntas sobre este planeta. A veces se acercan, a veces parecen alejarse. Siempre comparten el mismo cielo.');
      contenido.append(boton('✦ Ver el cielo de la noche en que empezó todo', 'secundario ancho', () => { cerrarPanel(); cieloNoche.abrir(); }));
    }
    if (!panel.open) panel.showModal();
  }
  function exportarViaje() {
    const copia = { tipo: 'universo-xiomara', inicio: config.fechaInicio, guardado: new Date().toISOString(), progreso: progreso.estado };
    const url = URL.createObjectURL(new Blob([JSON.stringify(copia, null, 2)], { type: 'application/json' }));
    const a = el('a'); a.href = url; a.download = `nuestro-viaje-${partesEnZona().fecha}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    avisar('Tu copia guarda los descubrimientos de este viaje. Consérvala para recuperarlos en otro navegador.');
  }
  async function importarViaje(archivo) {
    if (!archivo) return;
    try {
      if (archivo.size > 500000) throw Error('Esta copia es demasiado grande. Elige un archivo de viaje de este universo.');
      const copia = JSON.parse(await archivo.text());
      if (copia.tipo !== 'universo-xiomara' || copia.inicio !== config.fechaInicio) throw Error('Esta copia pertenece a otra historia.');
      progreso.importar(copia.progreso); location.reload();
    } catch (e) { avisar(e.message || 'No se pudo leer la copia. Tus descubrimientos siguen aquí.'); }
  }
  // Pista progresiva, para no quitar la sensación de descubrimiento: cada vez que se pide
  // ayuda para la misma estrella se avanza un nivel.
  //  1 · una frase que sugiere la región  2 · se ilumina la zona  3 · la cámara se acerca a
  //  la zona  4 · se señala la estrella y la cámara la encuadra (el último toque es suyo).
  const nivelPista = new Map();
  function fraseZona(i) {
    const p = escena.posicionEstrella(i); if (!p) return 'Hay una luz rosa que late más que las demás. Gira el universo despacio.';
    const r = Math.hypot(p.x, p.z), arriba = p.y > 10;
    const donde = r < 560 ? 'muy cerca del corazón de la galaxia, donde la luz se arremolina' : r < 820 ? 'en uno de sus brazos, a medio camino entre el centro y el borde' : 'hacia las afueras, donde las estrellas se vuelven tímidas';
    return `Busca ${donde}, ${arriba ? 'un poco por encima del disco' : 'un poco por debajo del disco'}. Late en rosa, más despacio que las demás.`;
  }
  async function darPista() {
    if (celebrando) return;
    if (tour) terminarRuta(false, false);
    const pendiente = estrellas.findIndex(s => !progreso.tiene('estrellas', s.id));
    if (pendiente < 0) { avisar('Ya encontraste todas. Puedes releerlas en tu álbum o comenzar otro viaje.'); return; }
    if (escena.viajando) { avisar('Estamos llegando. Enseguida podrás seguir otra luz.'); return; }
    const nivel = Math.min(4, (nivelPista.get(pendiente) || 0) + 1); nivelPista.set(pendiente, nivel);
    if (nivel === 1) { avisar(`Pista 1 de 4 · ${fraseZona(pendiente)}`); return; }
    if (nivel === 2) {
      if (actual !== 'hogar') await visitar('hogar');
      escena.zonaPista(pendiente); avisar('Pista 2 de 4 · Una onda dorada se cierra justo sobre ella. Gira el universo hasta verla.'); return;
    }
    $('btn-pista').disabled = true;
    try {
      if (nivel === 3) { avisar('Pista 3 de 4 · Te acerco. Está en el centro de la onda dorada: tócala.'); await escena.acercarZona(pendiente); }
      else { avisar('Última pista · Sigue el destello dorado. La cámara te acerca; el último toque es tuyo.'); await escena.pista(pendiente); }
    } finally { $('btn-pista').disabled = false; }
  }
  function tejer() {
    if (escena.viajando) { avisar('Espera a que lleguemos a la constelación.'); return; }
    $('tejido').hidden = false; $('tejido-texto').textContent = 'Un hilo de luz entre nosotros…'; escena.constelar();
  }
  let fraseConstelacionT = 0;
  function alConstelar(id) {
    progreso.anotar('constelaciones', id);
    if (actual === 'constelacion') $('lugar-accion').replaceChildren(document.createTextNode('Elegir otra figura'), el('span', '', '↗'));
    escena.besar(); efectos.fuegos(2500); navigator.vibrate?.([30, 60, 30]);
    // Al completarla se revela su frase, con tiempo para leerla.
    const c = CONSTELACIONES.find(c => c.id === id);
    if (c && !celebrando) {
      $('tejido-texto').textContent = c.texto; $('tejido').hidden = false;
      clearTimeout(fraseConstelacionT); fraseConstelacionT = setTimeout(() => { if (!celebrando) $('tejido').hidden = true; }, 7000);
    } else if (!celebrando) $('tejido').hidden = true;
    // El aviso del álbum espera a que la frase se haya leído y retirado.
    setTimeout(() => avisar('Un nuevo hilo de luz ya vive en tu álbum. ♡'), c && !celebrando ? 7400 : 1200);
  }
  function tocarNodo(i) {
    if (escena.unirNodo(i)) {
      if (!escena.constelada) { $('tejido').hidden = false; $('tejido-texto').textContent = `${escena.unidas} ${escena.unidas === 1 ? 'luz unida' : 'luces unidas'} · sigue el destello blanco`; }
    } else if (!escena.constelada) avisar('Busca la luz blanca: ella continúa el hilo.');
  }
  function sorpresa() {
    const pendientes = SORPRESAS.map((_, i) => String(i)).filter(id => !progreso.tiene('cometas', id));
    const id = pendientes[0] ?? String(Math.floor(Math.random() * SORPRESAS.length));
    progreso.anotar('cometas', id); mostrarLectura('Un beso fuera de órbita', [SORPRESAS[+id]], 'EL COMETA DE LAS COSAS PEQUEÑAS', { conCometa: true });
  }
  function iniciarRuta(desde = 0) {
    if (celebrando) return;
    if (panel.open) cerrarPanel(); tour = true; pausa = false; despertarTick(); document.body.classList.add('en-ruta'); $('ruta').hidden = false; pasoRuta(Number.isInteger(desde) ? desde : 0);
  }
  async function pasoRuta(i) {
    if (!tour) return;
    const miRevision = ++revision;
    indiceRuta = Math.max(0, Math.min(ruta.length - 1, i)); const id = ruta[indiceRuta], d = datos(id);
    viaje?.anotarPaso(indiceRuta);
    permanencia = 0; esperando = true;
    $('ruta-descubrir').disabled = true;
    $('ruta-paso').textContent = `Llegando · ${indiceRuta + 1} / ${ruta.length}`;
    $('ruta-titulo').textContent = d.nombre; $('ruta-texto').textContent = d.texto;
    $('ruta-anterior').disabled = indiceRuta === 0;
    $('ruta-siguiente').textContent = indiceRuta === ruta.length - 1 ? 'Terminar ♡' : 'Siguiente ↗';
    $('ruta-pausa').textContent = pausa ? 'Continuar' : 'Pausar';
    const llegado = await escena.viajar(id, { duracion: indiceRuta === 0 ? 3.5 : 5.5 });
    if (!tour || miRevision !== revision || !llegado) return;
    esperando = false; progreso.anotar('visitas', id);
    $('ruta-descubrir').disabled = false;
    $('ruta-paso').textContent = `Nuestro viaje · ${indiceRuta + 1} / ${ruta.length}`;
    if (id === 'constelacion') { escena.elegirConstelacion('hilo'); escena.constelar(); $('tejido').hidden = false; }
  }
  function pausarRuta(valor) { pausa = valor; escena.pausar(valor); $('ruta-pausa').textContent = valor ? 'Continuar' : 'Pausar'; }
  function terminarRuta(completada = false, volver = true) {
    tour = false; revision++; pausa = false; esperando = false; escena.pausar(false); viaje?.anotarPaso(null);
    $('ruta').hidden = true; $('tejido').hidden = true; document.body.classList.remove('en-ruta');
    if (volver) visitar('hogar');
    if (completada) avisar('Este es vuestro universo. Ahora el siguiente camino lo eliges tú. ♡');
  }
  function finalCelebracion() {
    celebracionRevision++; celebrando = false;
    $('tejido').hidden = true; $('omitir-celebracion').hidden = true;
    $('reunion').classList.remove('visible'); setTimeout(() => { $('reunion').hidden = true; }, 1200);
    escena.detenerGiro(false); document.body.classList.remove('reuniendo'); setTimeout(() => escena.reunirEstrellas(null), 9000);
    document.body.classList.add('celebrando'); setTimeout(() => document.body.classList.remove('celebrando'), 8000);
    efectos.fuegos(6500); escena.besar(); recuerdos.mostrarCelebracion();
  }
  $('omitir-celebracion').addEventListener('click', () => { escena.cancelarViaje(); finalCelebracion(); });
  // Celebración personal: se nombran uno a uno los recuerdos encontrados, sus luces vuelan
  // a formar un corazón alrededor del agujero negro y termina con la composición del mes.
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  function mostrarReunion(mes, titulo, detalle = '') {
    const r = $('reunion'); r.hidden = false; r.classList.remove('visible');
    void r.offsetWidth;
    $('reunion-mes').textContent = mes; $('reunion-titulo').textContent = titulo; $('reunion-detalle').textContent = detalle;
    r.classList.add('visible');
  }
  async function celebrar() {
    if (celebrando) return; celebrando = true;
    const version = ++celebracionRevision, sigue = () => version === celebracionRevision;
    if (tour) terminarRuta(false, false);
    if (panel.open) cerrarPanel();
    $('omitir-celebracion').hidden = false; $('tejido').hidden = false;
    $('tejido-texto').textContent = 'Todos nuestros recuerdos, bajo un mismo cielo…';
    const llego = await escena.viajar('hogar', { duracion: 4.5 });
    if (!sigue()) return;
    if (!llego) { finalCelebracion(); return; }
    $('tejido').hidden = true;
    const indices = estrellas.flatMap((s, i) => progreso.tiene('estrellas', s.id) ? [i] : []);
    escena.detenerGiro(true); escena.reunirEstrellas(indices); document.body.classList.add('reuniendo');
    // Un nombre cada vez; el ritmo se ajusta para que la lista completa dure ~12 s.
    const paso = Math.max(700, Math.min(1500, 12000 / Math.max(1, indices.length)));
    for (const i of indices) {
      if (!sigue()) return;
      const r = config.recuerdos[i];
      mostrarReunion(i ? `MES ${i} · ${fechaBonita(estrellas[i].id)}` : `EL COMIENZO · ${fechaBonita(estrellas[i].id)}`, r?.titulo || `Nuestra estrella ${i}`);
      escena.encenderEstrella(i);
      await esperar(paso);
    }
    if (!sigue()) return;
    const meses = estrellas.length - 1;
    mostrarReunion(`${fechaBonita(estrellas.at(-1).id)}`, meses ? `${meses} ${meses === 1 ? 'mes' : 'meses'} de nosotros` : 'Nuestra primera estrella', `Cada luz de este corazón la encontraste tú: ${indices.length} ${indices.length === 1 ? 'recuerdo' : 'recuerdos'}.`);
    escena.besar(); efectos.fuegos(3500);
    await esperar(5200);
    if (sigue()) finalCelebracion();
  }
  async function postal({ supernova = false } = {}) {
    if (tour) pausarRuta(true);
    const b = $('btn-postal'); b.disabled = true;
    try {
      const imagen = await escena.capturar();
      // Composición proporcional al ancho: la letra y el pie escalan con la imagen
      // (antes, tamaños fijos que en una captura de 1290–2000 px quedaban pequeños).
      const canvas = document.createElement('canvas');
      const ancho = Math.min(2000, imagen.width), k = ancho / 1000;
      const altoImagen = Math.round(ancho * imagen.height / imagen.width), pie = Math.round(210 * k);
      canvas.width = ancho; canvas.height = altoImagen + pie;
      const cx = canvas.getContext('2d'); cx.fillStyle = '#100a1a'; cx.fillRect(0, 0, ancho, canvas.height);
      cx.drawImage(imagen, 0, 0, ancho, altoImagen);
      const y = altoImagen;
      const degradado = cx.createLinearGradient(0, y - 130 * k, 0, y + 4 * k); degradado.addColorStop(0, '#100a1a00'); degradado.addColorStop(1, '#100a1a');
      cx.fillStyle = degradado; cx.fillRect(0, y - 130 * k, ancho, 134 * k);
      cx.strokeStyle = '#e8c6a088'; cx.lineWidth = Math.max(1, 1.2 * k);
      cx.beginPath(); cx.moveTo(ancho / 2 - 70 * k, y + 26 * k); cx.lineTo(ancho / 2 - 14 * k, y + 26 * k); cx.moveTo(ancho / 2 + 14 * k, y + 26 * k); cx.lineTo(ancho / 2 + 70 * k, y + 26 * k); cx.stroke();
      cx.fillStyle = '#e8c6a0'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.font = `${Math.round(18 * k)}px 'Cormorant Garamond', serif`; cx.fillText('♡', ancho / 2, y + 27 * k);
      cx.textBaseline = 'alphabetic';
      cx.fillStyle = '#f5d8e8'; cx.font = `${Math.round(54 * k)}px 'Cormorant Garamond', serif`; cx.fillText(supernova ? 'Donde nuestra luz se encontró' : 'Nuestro pequeño infinito', ancho / 2, y + 92 * k, ancho - 50 * k);
      cx.fillStyle = '#cdb4ce'; cx.font = `${Math.round(22 * k)}px 'Quicksand', sans-serif`; cx.fillText(`Carlos & Xiomara · desde el ${fechaBonita(config.fechaInicio)}`, ancho / 2, y + 138 * k, ancho - 40 * k);
      cx.fillStyle = '#e8c6a0'; cx.font = `${Math.round(19 * k)}px 'Quicksand', sans-serif`; cx.fillText(supernova ? FRASE_SUPERNOVA : `${recuerdos.encontradas().length} estrellas encontradas · ${fechaBonita(partesEnZona().fecha)}`, ancho / 2, y + 176 * k, ancho - 40 * k);
      const blob = await new Promise((r, j) => canvas.toBlob(b => b ? r(b) : j(new Error('No se pudo dibujar la postal.')), 'image/png'));
      if (postalURL) URL.revokeObjectURL(postalURL); postalURL = URL.createObjectURL(blob);
      $('postal-imagen').src = postalURL; $('postal-descarga').href = postalURL; $('postal').showModal(); return true;
    } catch (e) { avisar(e.message || 'No se pudo guardar la postal. Vuelve a intentarlo desde el universo.'); return false; }
    finally { b.disabled = false; }
  }
  let ultimaFecha = partesEnZona().fecha;
  function relojes() {
    const ahora = new Date();
    for (const [id, nombre, zona] of [['hora-carlos', 'CAS · BARCELONA', ZONAS.carlos], ['hora-xiomara', 'XIO · BUENOS AIRES', ZONAS.xiomara]]) {
      $(id).replaceChildren(el('small', '', nombre), document.createTextNode(relojZona(ahora, zona)));
    }
    if (panelActual === 'horarios') { $('reloj-panel-carlos').textContent = relojZona(ahora, ZONAS.carlos); $('reloj-panel-xiomara').textContent = relojZona(ahora, ZONAS.xiomara); }
    const hoy = partesEnZona(ahora).fecha;
    if (hoy !== ultimaFecha) { ultimaFecha = hoy; if (panelActual === 'capsulas') abrirPanel('capsulas'); }
  }
  relojes(); setInterval(relojes, 15000);
  // Cada vez que el cometa aparece en el cielo deja una frase (una distinta en cada paso), en la cola de avisos.
  let cometaAntes = false;
  const fraseVigente = () => escena.cometaVisible && !enLasGrandes() && actual !== 'cometa' && !tour && !celebrando && document.body.classList.contains('dentro');
  function fraseCometa() {
    if (!FRASES_COMETA.length || !fraseVigente()) return;
    let i = 0; try { i = (+localStorage.getItem('xiomara:frase-cometa') || 0) % FRASES_COMETA.length; localStorage.setItem('xiomara:frase-cometa', String(i + 1)); } catch {}
    avisos.poner(FRASES_COMETA[i], { tipo: 'cometa', vigente: fraseVigente });
  }
  let supernovaAntes = false;
  // Cuando a la estrella le llega la hora, se viaja hasta ella desde donde se esté (también desde
  // el sistema solar) para verla estallar; si hay algo abierto, se espera un poco.
  setInterval(() => {
    if (!escena.supernovaQuiereEstallar || !document.body.classList.contains('dentro')) return;
    if (celebrando || tour || contemplando || panel.open || escena.viajando || document.querySelector('dialog[open], .ventana.abierta')) { escena.aplazarSupernova(20); return; }
    // Este aviso sale estés donde estés y pasa delante de la cola: el viaje a la supernova empieza ya (también durante la
    // escena de otro gigante).
    avisar('Dos luces están a punto de encontrarse. Hay algo hermoso esperándote. ♡', { urgente: true });
    visitar('supernova', { forzado: true });
  }, 2000);
  $('btn-supernova').addEventListener('click', () => visitar('supernova'));
  setInterval(() => {
    // En las grandes no hay cometa (ni su aviso ni su frase).
    const visible = escena.cometaVisible && !enLasGrandes();
    // Unos segundos después de aparecer (en la primera pasada, ya terminado el vuelo de entrada).
    if (visible && !cometaAntes) setTimeout(() => { if (!escena.viajando) fraseCometa(); }, 9000);
    cometaAntes = visible;
    $('cometa-aviso').hidden = !visible || actual === 'cometa' || tour || document.body.classList.contains('en-calma');
    // Supernova: cuando una estrella estalla, se avisa y se puede viajar a verla.
    const supernova = escena.supernovaActiva;
    if (supernova && !supernovaAntes && !tour && !celebrando && document.body.classList.contains('dentro')) avisar('Ha nacido una nebulosa para nosotros. Su luz te está esperando. ♡');
    supernovaAntes = supernova;
    $('supernova-aviso').hidden = !supernova || actual === 'supernova' || tour || contemplando || document.body.classList.contains('en-calma');
  }, 2000);
  function tick(ahora) {
    const dt = Math.min(0.1, (ahora - ultimo) / 1000); ultimo = ahora;
    if (tour && !pausa && !esperando && !document.hidden) {
      permanencia += dt;
      if (permanencia >= 17) { if (indiceRuta === ruta.length - 1) terminarRuta(true); else pasoRuta(indiceRuta + 1); }
    }
    if (tour && !document.hidden) $('ruta-avance').firstElementChild.style.transform = `scaleX(${Math.min(1, permanencia / 17)})`;
    // Solo trabaja durante el recorrido: fuera de él duerme (antes se despertaba en cada cuadro de la pantalla, 120 veces
    // por segundo en un móvil de 120 Hz, sin nada que hacer).
    if (tour) requestAnimationFrame(tick); else tickActivo = false;
  }
  let tickActivo = false;
  const despertarTick = () => { if (tickActivo) return; tickActivo = true; ultimo = performance.now(); requestAnimationFrame(tick); };
  return { get contemplando() { return contemplando || performance.now() - salidaContemplar < 700; }, contemplar, abrirCieloNoche: () => cieloNoche.abrir(), get celebrando() { return celebrando; }, actualizarAlbum() { if (panelActual === 'album') abrirPanel('album'); }, avisar, get enLasGrandes() { return enLasGrandes(); }, situar, visitar, llegada, escenaEnCurso, terminarEscena, get escenaActual() { return escenaActual ? { id: escenaActual.id, restante: Math.max(0, (escenaActual.fin - performance.now()) / 1000) } : null; }, alConstelar, tocarNodo, celebrar, abrirPanel, sorpresa, pausarRuta, iniciarRuta, get enRuta() { return tour; } };
}
