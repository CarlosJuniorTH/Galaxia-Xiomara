// Renderizador, cámara, controles y post-procesado (brillo)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BrilloEficiente } from './brillo.js';
import { SalidaPass, LIMITE_HDR } from './salida.js';
import { crearPasadaLente } from './lente.js';
import { crearPasadaSalto } from './salto.js';
import { crearContextoWebGL } from '../util/webgl.js';
import { esMovil, Q, modoCompatible, calidadFija, nivelSeguro } from '../util/dispositivo.js';

export const BRILLO_BASE = 0.45;

export function crearNucleo(canvas) {
  // En móvil el lienzo trabaja a resolución nativa y solo recibe la pasada final, así que
  // el multimuestreo del lienzo no aporta nada y costaría memoria a 3 Mpx.
  const seleccion = crearContextoWebGL(canvas, { antialias: !modoCompatible && !esMovil });
  const renderer = new THREE.WebGLRenderer({ canvas, context: seleccion.contexto, alpha: false });
  canvas.dataset.webgl = seleccion.api;
  canvas.dataset.perfil3d = modoCompatible ? 'compatible' : calidadFija ? 'alta' : 'normal'; canvas.dataset.seguro = String(nivelSeguro);
  renderer.setClearColor(0x05010c, 1);
  // Cadena de color única: la pasada de salida codifica en sRGB y el lienzo se presenta
  // en sRGB en todas las pantallas. (Presentarlo como Display P3 sin convertir las
  // primarias reinterpretaba los colores: más saturados en unos móviles que en el PC.)
  const gl = renderer.getContext();
  if ('drawingBufferColorSpace' in gl) gl.drawingBufferColorSpace = 'srgb';
  // Dos resoluciones, como en las consolas:
  //  · Lienzo: siempre la nativa de la pantalla (1290×2325 en un iPhone de DPR 3).
  //  · Escena 3D (pr): interna. Dibujarla entera a DPR 3 midió 25,7 FPS en un iPhone,
  //    así que en móvil empieza en DPR 2 y la resolución dinámica de index.js la ajusta.
  //    La pasada de salida la reescala a la nativa con un enfoque adaptativo (salida.js).
  const prMaximo = Math.min(devicePixelRatio, Q.pr);
  let pr = esMovil ? Math.min(prMaximo, nivelSeguro >= 2 ? 1.25 : 1.75) : prMaximo;   // 1,75 en el móvil: en una pantalla de DPR 3 no se distingue de 2 y el teléfono se calienta menos
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
  controls.zoomSpeed = esMovil ? 1.2 : 1.0;
  controls.rotateSpeed = esMovil ? 1.0 : 0.85;   // en el móvil responde al dedo como en un juego (antes 0,6: se notaba duro)
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
  let post = null, bloom = { strength: BRILLO_BASE }, lente = null, salto = null, pasadaEscena = null, escenaActiva = scene;
  if (!modoCompatible && soportaHDR && nivelSeguro < 1) {   // tras un cierre por memoria, sin HDR (menos memoria de GPU)
    try {
      post = new EffectComposer(renderer);
      post.setPixelRatio(pr); post.setSize(innerWidth, innerHeight);
      pasadaEscena = new RenderPass(scene, camera); post.addPass(pasadaEscena);
      lente = crearPasadaLente(); post.addPass(lente); salto = crearPasadaSalto(); post.addPass(salto);
      const Brillo = location.hash === '#debug' && new URLSearchParams(location.search).get('comparar') === 'original' ? UnrealBloomPass : BrilloEficiente;
      bloom = new Brillo(new THREE.Vector2(innerWidth, innerHeight), BRILLO_BASE, 0.3, 0.78);
      canvas.dataset.brilloMotor = Brillo === BrilloEficiente ? 'eficiente' : 'original';
      // El brillo solo se calcula; la pasada de salida lo combina con la escena,
      // limpia valores no válidos y comprime las altas luces en lugar de quemarlas.
      bloom.materialHighPassFilter.fragmentShader = bloom.materialHighPassFilter.fragmentShader.replace(
        'vec4 texel = texture2D( tDiffuse, vUv );',
        `vec4 texel = min( max( texture2D( tDiffuse, vUv ), vec4( 0.0 ) ), vec4( ${LIMITE_HDR.toFixed(1)} ) );`);
      bloom.blendMaterial.colorWrite = false;
      post.addPass(bloom);
      post.addPass(new SalidaPass(bloom));
    } catch (error) {
      post?.dispose(); post = null; lente = null; salto = null;
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
      lente = crearPasadaLente(); post.addPass(lente); salto = crearPasadaSalto(); post.addPass(salto);
      post.addPass(new SalidaPass(null));
      canvas.dataset.brillo3d = 'sin-brillo';
    } catch (error) {
      post?.dispose(); post = null; lente = null; salto = null;
      console.warn('Se dibuja directamente, sin pasada de salida:', error);
    }
  }
  canvas.dataset.brillo3d ||= post ? 'hdr' : 'directo';
  // Con postprocesado el lienzo pasa a la resolución nativa; sin él la escena se dibuja
  // directamente en el lienzo, que entonces sigue a la resolución interna. En el móvil, como mucho 2: la escena ya se
  // calcula a 2 o menos, y pintar la pasada final a la nativa de un iPhone (3, unos 3 Mpx) no añadía nada visible pero
  // costaba mucho a la GPU en cada cuadro (y iOS tenía que componer esos 3 Mpx). El texto y la interfaz son HTML: nítidos igual.
  const prLienzo = () => post ? (esMovil ? Math.min(prMaximo, 2) : prMaximo) : pr;
  renderer.setPixelRatio(prLienzo());
  renderer.setSize(innerWidth, innerHeight);
  canvas.dataset.lienzo3d = String(prLienzo());
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

  function redimensionar() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    uScale.value = alturaEscena();
  }

  // Cambia la resolución interna sin alterar el tamaño visual de nada: los puntos
  // se limitan en píxeles CSS (uPR) y su escala sigue la altura del búfer (uScale).
  let cambios = 0;
  function fijarResolucion(valor) {
    const nuevo = Math.max(1, Math.min(prMaximo, Math.round(valor * 4) / 4));
    if (nuevo === pr) return pr;
    pr = nuevo;
    renderer.setPixelRatio(prLienzo()); composer.setPixelRatio(pr);
    uPR.value = pr; canvas.dataset.resolucion3d = String(pr);
    canvas.dataset.cambiosResolucion = String(++cambios);
    redimensionar();
    return pr;
  }

  // Escena que se dibuja: la principal o la del sistema solar (index.js).
  function fijarEscena(otra) { escenaActiva = otra; if (pasadaEscena) pasadaEscena.scene = otra; }
  return { renderer, scene, camera, controls, composer, bloom, fijarEscena, get escenaActiva() { return escenaActiva; }, get lente() { return lente; }, get post() { return post; }, get salto() { return salto; }, uScale, uPR, uTamGalaxia, redimensionar, fijarResolucion,
    get resolucion() { return pr; }, prMaximo, get resolucionLienzo() { return prLienzo(); } };
}
