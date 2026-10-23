// Gas volumétrico a media resolución (como los volúmenes de los juegos): las nebulosas con volumen (ray-march: la del
// púlsar, las de las maravillas y las del catálogo) se pintan en una capa a la mitad de la resolución de la escena y se
// componen encima. El gas es suave, así que se ve igual con la cuarta parte de píxeles; en un móvil eran lo más caro de
// algunos gigantes (el Cangrejo llenando la pantalla).
// Para que el gas no quede pintado encima de lo sólido (la estrella del púlsar, la sombra de un agujero negro), la capa
// registra antes la profundidad de los objetos opacos del cosmos y el gas se dibuja con esa profundidad.
import * as THREE from 'three';

const CAPA_VOLUMEN = 2, CAPA_OPACOS = 3;

export function crearCapaVolumen({ scene, renderer, uPR, hdr }) {
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true });
  const soloProfundidad = new THREE.MeshBasicMaterial({ colorWrite: false });
  const compuesto = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { uCapa: { value: rt.texture } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    // El gas ya viene con su alfa multiplicado (como lo pintaba cada nebulosa): se compone igual que antes.
    fragmentShader: 'uniform sampler2D uCapa; varying vec2 vUv; void main(){ gl_FragColor = texture2D(uCapa, vUv); }',
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation }));
  compuesto.frustumCulled = false; compuesto.renderOrder = -3; compuesto.name = 'Gas volumétrico (media resolución)'; scene.add(compuesto);

  let cuenta = 0, volumenes = 0;
  // Cada cierto tiempo (y al principio) se marcan las capas: el gas en la suya, los opacos del cosmos en la de profundidad.
  function marcar() {
    volumenes = 0;
    scene.traverse(o => {
      if (o.userData.volumen3D) { o.layers.set(CAPA_VOLUMEN); volumenes++; return; }
      let raiz = o; while (raiz.parent && raiz.parent !== scene) raiz = raiz.parent;
      if (o.isMesh && o.material && !o.material.transparent && raiz.userData.capa === 'cosmos') o.layers.enable(CAPA_OPACOS);
    });
  }
  const color = new THREE.Color();
  return {
    compuesto,
    // lado: tamaño forzado (calentamiento en la carga: una imagen diminuta, sin un cuadro enorme).
    dibujar(camera, lado = 0) {
      if (cuenta++ % 120 === 0) marcar();
      if (!volumenes) { compuesto.visible = false; return; }
      const pr = uPR.value * 0.5, w = lado || Math.max(1, Math.round(innerWidth * pr)), h = lado || Math.max(1, Math.round(innerHeight * pr));
      if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
      const previo = renderer.getRenderTarget(), alfa = renderer.getClearAlpha(), autoClear = renderer.autoClear, fondo = scene.background, mascara = camera.layers.mask;
      renderer.getClearColor(color);
      compuesto.visible = false;
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, false);
      renderer.autoClear = false; scene.background = null;
      camera.layers.set(CAPA_OPACOS); scene.overrideMaterial = soloProfundidad; renderer.render(scene, camera); scene.overrideMaterial = null;
      camera.layers.set(CAPA_VOLUMEN); renderer.render(scene, camera);
      camera.layers.mask = mascara; scene.background = fondo; renderer.autoClear = autoClear;
      renderer.setClearColor(color, alfa); renderer.setRenderTarget(previo);
      compuesto.visible = true;
    }
  };
}
