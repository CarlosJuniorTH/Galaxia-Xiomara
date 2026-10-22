// El cielo profundo: lo que se ve detrás de todo, desde cualquier lugar (casa, el viaje, los gigantes). Vacíos negros
// con estrellas y, en sus orillas, grandes paredes de polvo iluminado (ver cieloProfundoShader.js). Está HORNEADO en
// 6 imágenes (scripts/hornear-cielo.mjs): el juego solo las carga, sin calcular nada en el dispositivo (sin tirones,
// también en el teléfono). Se dibuja detrás de todo acompañando a la cámara (está a distancia infinita).
import * as THREE from 'three';
import { Q, esMovil } from '../util/dispositivo.js';

const CARAS = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

export function crearCieloProfundo({ renderer, scene }) {
  // Teléfonos y calidad reducida: caras de 1024; el resto, 2048.
  const sufijo = esMovil || Q.cielo < 1024 ? 'media' : 'alta';
  const uI = { value: 0 }, uVisible = { value: 0 };
  // Las imágenes se decodifican fuera del hilo principal (createImageBitmap) y se suben a la GPU nada más llegar,
  // mientras se presenta el universo: ningún congelón al decodificarlas.
  const textura = new THREE.CubeTexture(); textura.colorSpace = THREE.SRGBColorSpace; textura.flipY = false;
  let listo = 0;
  const cargado = Promise.all(CARAS.map(c => fetch(`assets/cielo/${c}-${sufijo}.webp`).then(r => { if (!r.ok) throw Error(r.status); return r.blob(); })
    .then(b => createImageBitmap(b, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))))
    .then(caras => { textura.images = caras; textura.needsUpdate = true; renderer.initTexture?.(textura); listo = performance.now(); })
    .catch(e => console.warn('No se pudo cargar el cielo profundo', e));
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
    fondo, textura, listo: cargado,
    // lejos: 0 en casa, 1 lejos de Xiomara y de la Vía Láctea (el mismo criterio que apaga el cielo de casa).
    fijar(lejos) { base = 0.3 + 0.5 * lejos; uI.value = base * ampliacion; },   // como antes del horneado
    // Con el teleobjetivo de «Mirar hacia casa» un solo texel llenaría la pantalla (todo blanco): se atenúa (index.js).
    ampliar(k) { ampliacion = k; uI.value = base * ampliacion; },
    actualizar() {
      // Aparece con un fundido suave cuando sus imágenes ya están en la GPU.
      uVisible.value = listo ? Math.min(1, (performance.now() - listo) / 1500) : 0;
      fondo.visible = uVisible.value > 0 && uI.value > 0.003;
    }
  };
}
