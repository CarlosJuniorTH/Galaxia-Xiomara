// El cielo profundo: lo que se ve detrás de todo, desde cualquier lugar (casa, el viaje, los gigantes). Vacíos negros
// con estrellas y, en sus orillas, grandes paredes de polvo iluminado (ver cieloProfundoShader.js). Está HORNEADO en
// 6 imágenes (scripts/hornear-cielo.mjs): el juego solo las carga, sin calcular nada en el dispositivo (sin tirones,
// también en el teléfono). Se dibuja detrás de todo acompañando a la cámara (está a distancia infinita).
import * as THREE from 'three';
import { Q, texturasLigeras } from '../util/dispositivo.js';
import { descargas, enReposo, cuandoLibre } from '../util/descargas.js';   // MB en la pantalla de carga; la cola de reposo
import { FONDO_ESCENA } from '../util/fondoEscena.js';
import { subirCuboPorTrozos } from './subidaPorTrozos.js';   // el videoclip de un gigante apaga sus paredes de polvo

const CARAS = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

export function crearCieloProfundo({ renderer, scene }) {
  // Caras de 2048 (también en el móvil: su pantalla tiene tantos píxeles por grado como la del PC); de 1024 en el modo
  // seguro o con calidad reducida. La carga trae siempre las de 1024 (1,3 MB en lugar de 4,3: la pantalla de carga solo
  // baja lo imprescindible) y las de 2048 llegan después por la cola de reposo (util/descargas.js): se descargan, se
  // decodifican de una en una y se suben a la tarjeta gráfica solo en momentos libres (nunca en un vuelo, clip o gesto), y
  // entonces sustituyen a las otras.
  const final = texturasLigeras || Q.cielo < 1024 ? 'media' : 'alta';
  const uI = { value: 0 }, uVisible = { value: 0 };
  // Sin mipmaps donde nunca se ve reducido: con caras de 2048 (≈23 texels por grado) y una pantalla densa (un móvil:
  // ≥ 20 píxeles de escena por grado) cada texel ocupa más de un píxel, así que sus niveles reducidos no se usaban y
  // ocupaban un tercio más de memoria de la tarjeta gráfica (~32 MB en un iPhone). En un PC de pantalla normal sí se reduce: con mipmaps.
  const pxPorGrado = innerHeight * Math.min(devicePixelRatio, 2) / 60;
  const cubo = sufijo => {
    const t = new THREE.CubeTexture(); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false;
    if (pxPorGrado >= (sufijo === 'alta' ? 2048 : 1024) / 90 * 0.88) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
    return t;
  };
  const decodificar = b => createImageBitmap(b, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  // Ya en la tarjeta gráfica: las seis imágenes decodificadas (6 × 2048² × 4 = 96 MB en un iPhone) se sueltan. Antes se
  // quedaban para siempre en la memoria de la página (iOS la cerraba por memoria y la recargaba sola).
  const subir = (t, caras) => {
    t.images = caras; t.needsUpdate = true; renderer.initTexture?.(t);
    if (renderer.initTexture) { t.images = caras.map(b => ({ width: b.width, height: b.height })); for (const b of caras) b.close?.(); }
  };
  let textura = cubo('media'), listo = 0;
  // Las imágenes se decodifican fuera del hilo principal (createImageBitmap) y se suben a la GPU nada más llegar,
  // mientras se presenta el universo: ningún congelón al decodificarlas.
  const cargado = Promise.all(CARAS.map(c => fetch(`assets/cielo/${c}-media.webp`).then(r => { if (!r.ok) throw Error(r.status); const n = Number(r.headers.get('content-length')) || 0; return r.blob().then(b => { descargas.hecho(n); return b; }); })
    .then(decodificar)))
    .then(caras => { subir(textura, caras); listo = performance.now(); })
    .catch(e => console.warn('No se pudo cargar el cielo profundo', e));
  // Las de 2048, en reposo (se encolan ya; la cola no empieza hasta después de la intro).
  if (final === 'alta') cargado.then(async () => {
    const rutas = CARAS.map(c => `assets/cielo/${c}-alta.webp`);
    if (!(await Promise.all(rutas.map(r => enReposo(r, 4)))).every(Boolean)) return;
    const caras = [];
    try {
      // Por franjas (subidaPorTrozos.js): una cara cada vez, cada franja (~1 MB) en su momento libre. Subir las seis de
      // golpe era una tarea de 162 ms (medido, móvil CPU ×4) justo al entrar.
      const cara = i => cuandoLibre(async () => decodificar(await (await fetch(rutas[i], { cache: 'force-cache' })).blob()));
      let nueva = await subirCuboPorTrozos(renderer, cubo('alta'), 2048, cara).catch(e => { console.warn('Cielo profundo por franjas', e); return null; });
      if (!nueva) {   // sin WebGL 2: como antes, de una vez
        for (let i = 0; i < 6; i++) caras.push(await cara(i));
        nueva = await cuandoLibre(() => { const t = cubo('alta'); subir(t, caras); return t; });
      }
      await cuandoLibre(() => { const vieja = textura; textura = nueva; fondo.material.uniforms.uCubo.value = nueva; vieja.dispose(); });
    } catch (e) { for (const b of caras) b.close?.(); console.warn('Cielo profundo: sin las caras grandes', e); }
  });
  // Al entrar ya está todo: sin fundido (la carga espera a que llegue).
  cargado.then(() => { listo = performance.now() - 2000; });
  const fondo = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.ShaderMaterial({
    uniforms: { uCubo: { value: textura }, uI, uVisible },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(modelViewMatrix) * position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: 'uniform samplerCube uCubo; uniform float uI, uVisible; varying vec3 vDir; void main(){ gl_FragColor = vec4(textureCube(uCubo, vDir).rgb * uI * uVisible, 1.0); }',
    // Opaco en el orden de dibujo (va lo primero, antes que los cuerpos opacos: nunca se suma encima de ellos).
    side: THREE.BackSide, depthWrite: false, depthTest: false, transparent: false, blending: THREE.AdditiveBlending
  }));
  fondo.frustumCulled = false; fondo.renderOrder = -1000; fondo.name = 'Cielo profundo'; fondo.visible = false; scene.add(fondo);
  let base = 0, ampliacion = 1;
  return {
    fondo, get textura() { return textura; }, listo: cargado,
    // lejos: 0 en casa, 1 lejos de Xiomara y de la Vía Láctea (el mismo criterio que apaga el cielo de casa).
    fijar(lejos) { base = 0.3 + 0.5 * lejos; uI.value = base * ampliacion; },   // como antes del horneado
    // Con el teleobjetivo de «Mirar hacia casa» un solo texel llenaría la pantalla (todo blanco): se atenúa (index.js).
    ampliar(k) { ampliacion = k; uI.value = base * ampliacion; },
    actualizar() {
      // Aparece con un fundido suave cuando sus imágenes ya están en la GPU.
      // Durante el videoclip de un gigante (js/util/fondoEscena.js) las paredes de polvo se atenúan: no le roban el encuadre.
      uVisible.value = (listo ? Math.min(1, (performance.now() - listo) / 1500) : 0) * (1 - Math.min(1, FONDO_ESCENA.k * 1.15));   // k 0,88 en el clip: apagadas; en la calma, a medias
      fondo.visible = uVisible.value > 0 && uI.value > 0.003;
    }
  };
}
