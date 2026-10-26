// Gas volumétrico a media resolución (como los volúmenes de los juegos): las nebulosas con volumen (ray-march: la del
// púlsar, las de las maravillas y las del catálogo) se pintan en una capa a la mitad de la resolución de la escena y se
// componen encima. El gas es suave, así que se ve igual con la cuarta parte de píxeles; en un móvil eran lo más caro de
// algunos gigantes (el Cangrejo llenando la pantalla).
// Para que el gas no quede pintado encima de lo sólido (la estrella del púlsar, la sombra de un agujero negro), la capa
// registra antes la profundidad de los objetos opacos del cosmos y el gas se dibuja con esa profundidad.
import * as THREE from 'three';
import { vista } from '../util/vista.js';
import { fijarZona, zonaDe, GLSL_ZONA } from './zona.js';

const CAPA_VOLUMEN = 2, CAPA_OPACOS = 3;

export function crearCapaVolumen({ scene, renderer, uPR, prTope = 2, hdr }) {
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true });
  const soloProfundidad = new THREE.MeshBasicMaterial({ colorWrite: false });
  const uZona = { value: new THREE.Vector4(1, 1, 1, 1) }, uAtenuar = { value: 1 };
  const compuesto = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { uCapa: { value: rt.texture }, uZona, uAtenuar },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    // El gas ya viene con su alfa multiplicado (como lo pintaba cada nebulosa): se compone igual que antes.
    fragmentShader: `uniform sampler2D uCapa; uniform vec4 uZona; uniform float uAtenuar; varying vec2 vUv; ${GLSL_ZONA} void main(){ gl_FragColor = texture2D(uCapa, enZona(vUv, uZona)) * uAtenuar; }`,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation }));
  compuesto.frustumCulled = false; compuesto.renderOrder = -3; compuesto.name = 'Gas volumétrico (media resolución)'; scene.add(compuesto);

  const muestra = new THREE.Mesh(new THREE.PlaneGeometry(1e-3, 1e-3)); muestra.frustumCulled = false;
  let cuenta = 0, volumenes = 0;
  const lista = [], frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), esfera = new THREE.Sphere();
  // ¿Hay algún gas a la vista? (visible y dentro de la cámara, con margen). Si no, la capa no recorre la escena.
  const hayGas = camera => {
    camera.updateMatrixWorld(); pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
    for (const o of lista) {
      let x = o; while (x && x.visible) x = x.parent; if (x) continue;
      const g = o.geometry; if (!g) return true; if (!g.boundingSphere) g.computeBoundingSphere();
      esfera.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); esfera.radius *= 1.25;
      if (frustum.intersectsSphere(esfera)) return true;
    }
    return false;
  };
  // Cada cierto tiempo (y al principio) se marcan las capas: el gas en la suya, los opacos del cosmos en la de profundidad.
  function marcar() {
    volumenes = 0; lista.length = 0;
    scene.traverse(o => {
      // Las luces, en las tres capas: three.js incluye el número de luces en cada programa de GPU; sin ellas, cada
      // nebulosa se compilaría otra vez la primera vez que se ve (un tirón al llegar a un gigante nuevo).
      if (o.isLight) { o.layers.enable(CAPA_VOLUMEN); o.layers.enable(CAPA_OPACOS); return; }
      if (o.userData.volumen3D) { o.layers.set(CAPA_VOLUMEN); volumenes++; lista.push(o); return; }
      let raiz = o; while (raiz.parent && raiz.parent !== scene) raiz = raiz.parent;
      if (o.isMesh && o.material && !o.material.transparent && raiz.userData.capa === 'cosmos') o.layers.enable(CAPA_OPACOS);
    });
  }
  const color = new THREE.Color();
  return {
    compuesto,
    // Todo el gas a la vez más tenue (k ≤ 1; premultiplicado: también más transparente). La ceremonia de la supernova.
    set atenuacion(k) { uAtenuar.value = k; },
    // lado: tamaño forzado (calentamiento en la carga: una imagen diminuta, sin un cuadro enorme).
    dibujar(camera, lado = 0) {
      if (cuenta++ % 120 === 0) marcar();
      if (!volumenes || (!lado && !hayGas(camera))) { compuesto.visible = false; return; }
      // Calentamiento: el material de solo profundidad se compila ya (con una pieza que siempre está en pantalla).
      if (lado) { muestra.layers.set(CAPA_OPACOS); scene.add(muestra); }
      // Reservada una vez a su tamaño máximo (la mitad de la escena más nítida que puede haber, también al calentarla en
      // la carga) y dibujada en la zona de este cuadro: la resolución dinámica no la rehace (zona.js).
      const rw = Math.max(1, Math.round(vista.ancho * prTope * 0.5)), rh = Math.max(1, Math.round(vista.alto * prTope * 0.5));
      if (rt.width < rw || rt.height < rh || rt.width * rt.height > rw * rh * 2.2) rt.setSize(rw, rh);
      const pr = uPR.value * 0.5;
      fijarZona(rt, lado || vista.ancho * pr, lado || vista.alto * pr); zonaDe(rt, uZona.value);
      const previo = renderer.getRenderTarget(), alfa = renderer.getClearAlpha(), autoClear = renderer.autoClear, fondo = scene.background, mascara = camera.layers.mask, auto = scene.matrixWorldAutoUpdate;
      renderer.getClearColor(color);
      compuesto.visible = false;
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, false);
      // Las matrices de la escena se calculan una vez por cuadro (en el dibujo principal): aquí se usan las del cuadro
      // anterior (el gas apenas se mueve en 1/60 s) en vez de recorrer la escena entera dos veces más.
      renderer.autoClear = false; scene.background = null; if (!lado) scene.matrixWorldAutoUpdate = false;
      camera.layers.set(CAPA_OPACOS); scene.overrideMaterial = soloProfundidad; renderer.render(scene, camera); scene.overrideMaterial = null;
      camera.layers.set(CAPA_VOLUMEN); renderer.render(scene, camera);
      camera.layers.mask = mascara; scene.background = fondo; renderer.autoClear = autoClear; scene.matrixWorldAutoUpdate = auto;
      renderer.setClearColor(color, alfa); renderer.setRenderTarget(previo);
      compuesto.visible = true;
      if (lado) scene.remove(muestra);
    }
  };
}
