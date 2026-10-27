// Renderizador, cámara, controles y post-procesado (brillo)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BrilloMips } from './brillo.js';
import { SalidaPass, LIMITE_HDR } from './salida.js';
import { crearPasadaLente } from './lente.js';
import { crearPasadaSalto } from './salto.js';
import { fijarZona } from './zona.js';
import { crearContextoWebGL } from '../util/webgl.js';
import { esMovil, Q, modoCompatible, calidadFija, nivelSeguro } from '../util/dispositivo.js';

export const BRILLO_BASE = 0.45;

export function crearNucleo(canvas) {
  // En móvil el lienzo trabaja a resolución nativa y solo recibe la pasada final, así que
  // el multimuestreo del lienzo no aporta nada y costaría memoria a 3 Mpx.
  // Sin profundidad en el lienzo cuando habrá postprocesado (siempre fuera del modo compatible: si no hay HDR se compone
  // igual sobre un búfer de 8 bits con su profundidad); solo el dibujo directo, el último recurso, la necesita.
  const seleccion = crearContextoWebGL(canvas, { antialias: !modoCompatible && !esMovil, depth: modoCompatible });
  const renderer = new THREE.WebGLRenderer({ canvas, context: seleccion.contexto, alpha: false });
  canvas.dataset.webgl = seleccion.api;
  canvas.dataset.perfil3d = modoCompatible ? 'compatible' : calidadFija ? 'alta' : 'normal'; canvas.dataset.seguro = String(nivelSeguro);
  renderer.setClearColor(0x05010c, 1);
  // Cadena de color única: la pasada de salida codifica en sRGB y el lienzo se presenta
  // en sRGB en todas las pantallas. (Presentarlo como Display P3 sin convertir las
  // primarias reinterpretaba los colores: más saturados en unos móviles que en el PC.)
  const gl = renderer.getContext();
  if ('drawingBufferColorSpace' in gl) gl.drawingBufferColorSpace = 'srgb';
  // Dos resoluciones, como en las consolas, fijas toda la visita (perfil ultra único, sin resolución dinámica):
  //  · Lienzo de salida: la nativa en el PC; en el móvil, DPR 2 como mucho (pintar la pasada final a la nativa de un iPhone,
  //    DPR 3, unos 3 Mpx, no añadía nada visible y costaba a la GPU y a la composición de iOS en cada cuadro).
  //  · Escena 3D (pr): interna, por PRESUPUESTO DE PÍXELES (no por DPR): ≈ 1,65 Mpx en el móvil y ≈ 3,5 Mpx en el PC, nunca
  //    más que el lienzo. (En el móvil, con 1,3 Mpx un iPhone de 430×932 dibujaba a DPR 1,78 y el reescalado al lienzo de
  //    DPR 2 ablandaba estrellas y letras en las capturas comparadas; con 1,65 queda a DPR 2, como antes: la GPU lo permite,
  //    tras el resto de mejoras cuesta menos que antes a 1,6 Mpx.) La pasada de salida la reescala al lienzo con enfoque adaptativo (salida.js).
  //    Tras un cierre por memoria (nivelSeguro 2, solo la visita siguiente), 1,25 como mucho en el móvil.
  const prMaximo = Math.min(devicePixelRatio, Q.pr);
  const PRESUPUESTO = esMovil ? 1.65e6 : 3.5e6;
  const prPresupuesto = () => {
    const lienzo = esMovil ? Math.min(prMaximo, 2) : prMaximo, porPixeles = Math.sqrt(PRESUPUESTO / Math.max(1, innerWidth * innerHeight));
    return Math.max(0.5, Math.min(lienzo, Math.floor(porPixeles * 32) / 32, esMovil && nivelSeguro >= 2 ? 1.25 : Infinity));
  };
  let pr = prPresupuesto();
  renderer.setPixelRatio(pr);
  canvas.dataset.resolucion3d = String(pr);
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 2e9);   // los destinos y sus maravillas están a ~10⁸: el plano lejano no debe cortarlos   // lo más lejano es el fondo óptico (~4·10⁷); el plano cercano se adapta a lo que hay cerca (index.js)

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = esMovil ? 0.085 : 0.055;   // con el dedo, inercia algo más corta: sigue al dedo y se para limpia (no flota)
  // Evita atravesar el núcleo y llenar toda la pantalla con el disco de acreción.
  controls.minDistance = 300;
  controls.maxDistance = 14000;
  controls.zoomSpeed = esMovil ? 1.2 : 1.25;   // rueda del PC algo más viva (antes 1,0); el pellizco sigue igual
  // Giro (util/giro.js): una altura de pantalla arrastrada = 1,2 vueltas en el móvil y 1,1 en el PC (antes 1 y 0,85: Carlos
  // lo notaba lento al girar).
  controls.rotateSpeed = esMovil ? 1.2 : 1.1;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.82;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.autoRotateSpeed = 0.3;
  controls.enabled = false;

  // Algunos controladores permiten WebGL pero no los búferes HDR del brillo.
  // El modo compatible conserva toda la escena 3D y evita ese postprocesado.
  // Búferes de coma flotante para el HDR: en WebGL 2 basta con los de media precisión (EXT_color_buffer_half_float), que
  // es lo que usa el compositor. Antes se exigía la extensión de precisión completa y un iPhone que solo ofrece la media
  // caía al modo de 8 bits: sin resplandor y con la luz sumada (telaraña) saturada en blanco y sin color.
  const soportaHDR = seleccion.api === 'webgl2'
    ? !!(seleccion.contexto.getExtension('EXT_color_buffer_float') || seleccion.contexto.getExtension('EXT_color_buffer_half_float'))
    : !!seleccion.contexto.getExtension('EXT_color_buffer_half_float');
  let rtSolar = null, lecturaPrincipal = null;   // MSAA del sistema solar (fijarEscena)
  let muestrasAA = 0, post = null, bloom = { strength: BRILLO_BASE }, pasadaEscena = null, escenaActiva = scene, salida = null;
  // Lente y salto: ya no son pasadas (salida.js los aplica en la pasada final solo mientras están activos).
  const lente = crearPasadaLente(), salto = crearPasadaSalto();
  if (!modoCompatible && soportaHDR && nivelSeguro < 1) {   // tras un cierre por memoria, sin HDR (menos memoria de GPU)
    try {
      // Bordes suaves (MSAA ×4, WebGL 2) en el sistema solar (fijarEscena): sin él, sus órbitas, anillos y bordes de planetas
      // salían en escalera (el antialias del lienzo no actúa al dibujar en una imagen intermedia). En los gigantes no hace
      // falta (casi no hay líneas finas) y con tanta luz superpuesta costaría mucho. ?aa=0 lo quita (comparaciones).
      muestrasAA = seleccion.api === 'webgl2' && new URLSearchParams(location.search).get('aa') !== '0' ? 4 : 0;
      post = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: THREE.HalfFloatType }));
      post.setPixelRatio(pr); post.setSize(innerWidth, innerHeight);
      pasadaEscena = new RenderPass(scene, camera); post.addPass(pasadaEscena);
      // Resplandor por cadena de mips (brillo.js), con el primer nivel a ½ de la escena (a ¼ se difuminaba más ancho y se
      // derramaba sobre lo que tapa a los agujeros negros). #debug&comparar=original: el UnrealBloomPass de antes.
      const original = location.hash === '#debug' && new URLSearchParams(location.search).get('comparar') === 'original';
      bloom = original ? new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), BRILLO_BASE, 0.3, 0.78) : new BrilloMips(new THREE.Vector2(innerWidth, innerHeight), BRILLO_BASE, 0.3, 0.78);
      canvas.dataset.brilloMotor = original ? 'original' : 'mips';
      // El brillo solo se calcula; la pasada de salida lo combina con la escena, limpia valores no válidos y comprime las
      // altas luces en lugar de quemarlas. (El original no mezcla: su última pasada no escribe color.)
      if (original) bloom.blendMaterial.colorWrite = false;
      post.addPass(bloom);
      post.addPass(salida = new SalidaPass(bloom, { lente, salto }));
    } catch (error) {
      post?.dispose(); post = null; salida = null;
      console.warn('Se mantiene la escena 3D sin postprocesado:', error);
    }
  }
  // Sin HDR (modo compatible o GPU sin búferes de coma flotante) se compone con la
  // misma pasada de salida sobre un búfer de 8 bits, sin brillo: así todos los
  // materiales (propios y de Three.js) reciben la misma codificación de color.
  if (!post) {
    try {
      const objetivo = new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: THREE.UnsignedByteType });
      post = new EffectComposer(renderer, objetivo);
      post.setPixelRatio(pr); post.setSize(innerWidth, innerHeight);
      pasadaEscena = new RenderPass(scene, camera); post.addPass(pasadaEscena);
      post.addPass(salida = new SalidaPass(null, { lente, salto }));
      canvas.dataset.brillo3d = 'sin-brillo';
    } catch (error) {
      post?.dispose(); post = null; salida = null;
      console.warn('Se dibuja directamente, sin pasada de salida:', error);
      if (!modoCompatible) console.warn('El lienzo se creó sin profundidad: para dibujar directo con ocultación correcta, abre con ?calidad=compatible');
    }
  }
  canvas.dataset.brillo3d ||= post ? 'hdr' : 'directo';
  // Con postprocesado el lienzo pasa a la resolución nativa; sin él la escena se dibuja
  // directamente en el lienzo, que entonces sigue a la resolución interna. En el móvil, como mucho 2: la escena ya se
  // calcula a 2 o menos, y pintar la pasada final a la nativa de un iPhone (3, unos 3 Mpx) no añadía nada visible pero
  // costaba mucho a la GPU en cada cuadro (y iOS tenía que componer esos 3 Mpx). El texto y la interfaz son HTML: nítidos igual.
  // El lienzo, a la resolución nativa de la pantalla: la escena se amplía una sola vez (en la pasada de salida, con su enfoque);
  // con el lienzo a 2 en una pantalla de DPR 3 se ampliaba dos veces (y el navegador sin enfoque) y se veía borroso.
  // Lienzo del móvil a 2 como mucho (perfil ultra: lo que se ve lo pone el enfoque de la pasada de salida, que cuenta
  // también con la ampliación que hace después el navegador hasta la pantalla física).
  const prLienzo = () => post ? (esMovil ? Math.min(prMaximo, 2) : prMaximo) : pr;
  renderer.setPixelRatio(prLienzo());
  renderer.setSize(innerWidth, innerHeight);
  canvas.dataset.lienzo3d = String(prLienzo());
  if (salida) salida.ampliacionNavegador = Math.max(1, devicePixelRatio / prLienzo());
  const composer = {
    render: () => post ? post.render() : renderer.render(escenaActiva, camera),
    setSize: (w,h) => post?.setSize(w,h),
    setPixelRatio: valor => post?.setPixelRatio(valor)
  };

  // Escala para que el tamaño de los puntos sea consistente con la pantalla
  // (altura del búfer donde se dibuja la escena, no la del lienzo)
  const alturaEscena = () => Math.floor(innerHeight * pr) / 2;
  const uScale = { value: alturaEscena() };
  const uPR = { value: pr };
  // Compensación de tamaño de las estrellas de la galaxia según la distancia (index.js).
  const uTamGalaxia = { value: 1 };

  // Reserva de los búferes del compositor (y del resplandor, que los sigue) al tamaño de la escena. Solo se rehacen si la
  // pantalla crece más allá (girar el móvil, agrandar la ventana del PC), si se queda en menos de la mitad (para devolver la
  // memoria) o para una postal a más resolución (fijarResolucion, temporal).
  // Ninguna pasada intercambia los búferes (la lente va en la pasada final): el segundo búfer del compositor no se usa y se
  // queda en 1×1 (en un iPhone, ~16 MB menos de memoria de la GPU).
  if (post) { const tam = post.setSize.bind(post); post.setSize = (w, h) => { tam(w, h); post.writeBuffer.setSize(1, 1); }; }
  let reserva = { w: 0, h: 0, pr: 0 };
  // (Sin margen para las barras del navegador: la página no se desplaza, casi nunca cambian, y en un móvil ese margen eran
  // un 20 % más de memoria en los búferes más grandes.)
  const altoMaximo = () => innerHeight;
  function reservar(prReserva = pr) {
    reserva = { w: innerWidth, h: altoMaximo(), pr: prReserva };
    post?.setPixelRatio(prReserva); post?.setSize(reserva.w, reserva.h);
    canvas.dataset.reservas3d = String((Number(canvas.dataset.reservas3d) || 0) + 1);
  }
  // Zona activa: la escena de este cuadro (ventana actual × pr) dentro de lo reservado.
  function aplicarZona() {
    if (!post) return;
    const w = Math.round(innerWidth * pr), h = Math.round(innerHeight * pr);
    for (const rt of [post.renderTarget1, post.renderTarget2]) fijarZona(rt, w, h);
    seguirSolar();
  }
  function ajustarReserva() {
    if (!post) return;
    // Se rehace si no cabe, o si la VENTANA se ha quedado en menos de la mitad de lo reservado (no por bajar la resolución).
    const w = innerWidth * pr, h = innerHeight * pr, rw = reserva.w * reserva.pr, rh = reserva.h * reserva.pr;
    if (w > rw + 0.5 || h > rh + 0.5 || innerWidth * innerHeight < reserva.w * reserva.h * 0.45) reservar();
    aplicarZona();
  }
  if (post) { reservar(); aplicarZona(); }

  function redimensionar() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    // El mismo presupuesto de píxeles con el nuevo tamaño (girar el móvil, cambiar la ventana): no es un cambio de calidad.
    const nuevo = prPresupuesto(); if (nuevo !== pr) { pr = nuevo; if (!post) renderer.setPixelRatio(pr); uPR.value = pr; canvas.dataset.resolucion3d = String(pr); }
    ajustarReserva();
    uScale.value = alturaEscena();
  }

  // Cambia la resolución interna sin alterar el tamaño visual de nada: los puntos
  // se limitan en píxeles CSS (uPR) y su escala sigue la altura del búfer (uScale). Solo para la postal (temporal).
  let cambios = 0;
  function fijarResolucion(valor) {
    const nuevo = Math.max(1, Math.min(prMaximo, Math.round(valor * 8) / 8));   // pasos de 1/8: ahora no cuestan nada
    if (nuevo === pr) return pr;
    pr = nuevo;
    // Sin reasignar nada: solo cambia la zona de los búferes (salvo una postal a más resolución que la reservada).
    // El lienzo no depende de pr con postprocesado (antes se volvía a fijar y el navegador lo rehacía).
    if (!post) renderer.setPixelRatio(pr);
    uPR.value = pr; canvas.dataset.resolucion3d = String(pr);
    canvas.dataset.cambiosResolucion = String(++cambios);
    ajustarReserva();
    uScale.value = alturaEscena();
    return pr;
  }

  // Escena que se dibuja: la principal o la del sistema solar (index.js).
  // Suavizado de bordes (MSAA) solo en el sistema solar, en un búfer propio que sustituye al de lectura mientras se está
  // allí (en el sistema solar ninguna pasada intercambia los búferes). Nunca se crea nada en pleno vuelo: el búfer de la
  // escena a la que se va se reserva en el CLIC del viaje (prepararEscena, antes de despegar) y el de la que se deja se
  // suelta al cambiar (bajo el fundido). Memoria de GPU como antes: solo uno de los dos vive, salvo entre el clic y el
  // fundido; en el móvil el MSAA es de 2 muestras (con 4, búfer de escena + MSAA pasaban del pico de antes, que era solo
  // el MSAA de 4; en una pantalla de DPR 2 la diferencia no se ve).
  const muestrasSolar = () => (esMovil ? Math.min(2, muestrasAA) : muestrasAA);
  const reservarYa = rt => { const previo = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.setRenderTarget(previo); };   // three crea sus búferes al enlazarlo
  function bufferSolar() {
    const base = lecturaPrincipal ?? post.readBuffer;
    if (!rtSolar || rtSolar.width !== base.width || rtSolar.height !== base.height) { rtSolar?.dispose(); rtSolar = base.clone(); rtSolar.samples = muestrasSolar(); }
    rtSolar.viewport.copy(base.viewport); rtSolar.scissor.copy(base.scissor); rtSolar.scissorTest = base.scissorTest;
    return rtSolar;
  }
  // En el clic de un viaje que cambiará de escena: reserva ya el búfer de la escena de destino.
  function prepararEscena(cual) {
    if (!post || !muestrasAA) return;
    if (cual === 'solar' && !lecturaPrincipal) reservarYa(bufferSolar());
    else if (cual === 'principal' && lecturaPrincipal) reservarYa(lecturaPrincipal);
  }
  function fijarEscena(otra) {
    escenaActiva = otra; if (pasadaEscena) pasadaEscena.scene = otra;
    if (!post) return;
    const conAA = otra !== scene && muestrasAA > 0;
    if (conAA && !lecturaPrincipal) {
      const solar = bufferSolar();
      lecturaPrincipal = post.readBuffer; post.readBuffer = solar;
      lecturaPrincipal.dispose();   // (se vuelve a crear al preparar la vuelta)
    } else if (!conAA && lecturaPrincipal) {
      post.readBuffer = lecturaPrincipal; lecturaPrincipal = null;
      rtSolar?.dispose(); rtSolar = null;
      // Ya, bajo el fundido (o en el calentamiento): si nadie lo reservó en el clic (prepararEscena), el búfer de la escena
      // principal se crearía en su primer cuadro (tras el calentamiento, en mitad del clip de la intro).
      reservarYa(post.readBuffer);
    }
  }
  // Tras cambiar el tamaño o la zona estando en el sistema solar, el búfer MSAA sigue al de lectura.
  function seguirSolar() {
    if (!lecturaPrincipal || !rtSolar) return;
    const base = lecturaPrincipal;
    if (rtSolar.width !== base.width || rtSolar.height !== base.height) rtSolar.setSize(base.width, base.height);
    rtSolar.viewport.copy(base.viewport); rtSolar.scissor.copy(base.scissor);
  }
  return { renderer, scene, camera, controls, composer, bloom, fijarEscena, prepararEscena, get escenaActiva() { return escenaActiva; }, get lente() { return lente; }, get post() { return post; }, get salto() { return salto; }, uScale, uPR, uTamGalaxia, redimensionar, fijarResolucion,
    get resolucion() { return pr; }, prMaximo, get prTope() { return pr; }, get resolucionLienzo() { return prLienzo(); } };
}
