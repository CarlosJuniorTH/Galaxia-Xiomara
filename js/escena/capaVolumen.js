// Gas volumétrico a resolución reducida y reconstruido (como los volúmenes de los juegos): las nebulosas con volumen
// (ray-march: la del púlsar, las de las maravillas y las del catálogo) se pintan en su propia capa y se componen en la
// escena. El gas es suave; lo caro es el rayo, no el detalle:
//  · Capa a ¼ del lado de la resolución interna en el móvil (1/16 de los píxeles) y a ½ en el PC.
//  · Cada cuadro, la capa se desplaza una fracción de píxel (Halton 2,3) y cada rayo empieza con un desfase de ruido azul
//    (ruidoAzul.js) que cambia con la razón áurea: el muestreo cambia de cuadro en cuadro.
//  · Reproyección temporal a una historia a ½ del lado de la interna (en el móvil, el doble de lado que la capa): cada
//    texel de la historia toma la muestra del cuadro que cae más cerca de él y se acumula con lo reproyectado del cuadro
//    anterior, recortado al rango de los vecinos actuales (sin estelas al moverse). Quieta, en unos pocos cuadros tiene el
//    detalle de la capa a ½ de antes, sin bandas de las muestras; en movimiento, nunca peor que la capa del cuadro.
//  · Reconstrucción bilateral a resolución completa: dos piezas de pantalla en la escena, una que solo se dibuja donde no
//    hay nada opaco y otra solo encima de lo opaco (prueba de profundidad contra la escena a resolución completa); cada
//    una mezcla solo los texeles de su misma clase (según la profundidad de la capa): el gas no se derrama sobre el borde
//    de la estrella del púlsar ni deja un cerco oscuro a su alrededor.
//  · Si no hay gas a la vista, ni la capa ni las piezas se dibujan (ninguna pasada).
// Para que el gas no quede pintado encima de lo sólido (la estrella del púlsar, la sombra de un agujero negro), la capa
// registra antes la profundidad de los objetos opacos del cosmos y el gas se dibuja con esa profundidad.
import * as THREE from 'three';
import { vista } from '../util/vista.js';
import { esMovil } from '../util/dispositivo.js';
import { texturaRuidoAzul, AZAR_VOLUMEN } from './ruidoAzul.js';

const CAPA_VOLUMEN = 2, CAPA_OPACOS = 3;
// ?volumen=media: la capa a ½ también en el móvil (comparaciones).
export const ESCALA_VOLUMEN = esMovil && new URLSearchParams(location.search).get('volumen') !== 'media' ? 0.25 : 0.5;
export const ESCALA_HISTORIA = 0.5;
const HALTON = Array.from({ length: 8 }, (_, i) => { const h = (b, k) => { let f = 1, r = 0; k++; while (k > 0) { f /= b; r += f * (k % b); k = Math.floor(k / b); } return r; }; return [h(2, i) - 0.5, h(3, i) - 0.5]; });
const AUREA = 0.6180339887, SIN_DESPLAZAR = [0, 0];

const VERTICE = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

// Resolución de la historia: reproyección + la muestra más cercana del cuadro actual.
const RESOLVER = /* glsl */`
  uniform sampler2D tActual, tHistoria, tProfundidad;
  uniform vec2 uTamActual; uniform vec2 uJitter; uniform mat4 uReproyeccion; uniform float uZGas, uMezcla, uReiniciar, uRazon;
  varying vec2 vUv;
  vec4 actual(vec2 t) { return texture2D(tActual, (t + 0.5) / uTamActual); }
  void main() {
    // Posición de este texel de la historia en texeles de la capa (sin desplazar); las muestras de la capa están en
    // (i + 0,5 − jitter): la más cercana y su distancia.
    vec2 p = vUv * uTamActual, q = p + uJitter - 0.5, i = floor(q + 0.5), d = q - i;
    vec4 c = actual(i);
    vec4 mn = c, mx = c;
    for (int k = 0; k < 8; k++) {
      vec2 o = k == 0 ? vec2(1.0, 0.0) : k == 1 ? vec2(-1.0, 0.0) : k == 2 ? vec2(0.0, 1.0) : k == 3 ? vec2(0.0, -1.0) : k == 4 ? vec2(1.0, 1.0) : k == 5 ? vec2(-1.0, 1.0) : k == 6 ? vec2(1.0, -1.0) : vec2(-1.0, -1.0);
      vec4 v = actual(i + o); mn = min(mn, v); mx = max(mx, v);
    }
    // Lo mismo, interpolado (la capa de este cuadro sin desplazar): lo que se ve si no hay historia.
    vec4 suave = texture2D(tActual, (p + uJitter) / uTamActual);
    if (uReiniciar > 0.5) { gl_FragColor = suave; return; }
    // Reproyección: lo opaco a su profundidad; el gas, a la del gas a la vista.
    float z = texture2D(tProfundidad, (i + 0.5) / uTamActual).r;
    vec4 previo = uReproyeccion * vec4(vUv * 2.0 - 1.0, z < 1.0 ? z * 2.0 - 1.0 : uZGas, 1.0);
    vec2 uvPrevio = previo.xy / previo.w * 0.5 + 0.5;
    if (any(lessThan(uvPrevio, vec2(0.0))) || any(greaterThan(uvPrevio, vec2(1.0)))) { gl_FragColor = suave; return; }
    vec4 h = clamp(texture2D(tHistoria, uvPrevio), mn, mx);
    // La muestra cuenta más cuanto más cerca cae de este texel (en la historia a doble lado, una de cada cuatro cae dentro).
    vec2 dh = d * uRazon; float w = uMezcla * exp(-1.5 * dot(dh, dh));
    gl_FragColor = mix(h, c, max(w, uMezcla * 0.15));
  }`;

// Reconstrucción bilateral a resolución completa: solo texeles de la misma clase (opaco / sin nada) que este píxel.
const COMPONER = opaco => /* glsl */`
  uniform sampler2D tHistoria, tProfundidad; uniform vec2 uTamHistoria; uniform float uAtenuar; varying vec2 vUv;
  float clase(vec2 uv) { return texture2D(tProfundidad, uv).r < 1.0 ? 1.0 : 0.0; }
  void main() {
    vec2 p = vUv * uTamHistoria - 0.5, b = floor(p), f = p - b;
    vec4 suma = vec4(0.0); float peso = 0.0;
    for (int k = 0; k < 4; k++) {
      vec2 o = vec2(float(k - (k / 2) * 2), float(k / 2)), uv = (b + o + 0.5) / uTamHistoria;
      float w = (o.x > 0.5 ? f.x : 1.0 - f.x) * (o.y > 0.5 ? f.y : 1.0 - f.y) + 1e-4;
      w *= clase(uv) == ${opaco ? '1.0' : '0.0'} ? 1.0 : 1e-3;
      suma += texture2D(tHistoria, uv) * w; peso += w;
    }
    gl_FragColor = suma / peso * uAtenuar;
  }`;

export function crearCapaVolumen({ scene, renderer, uPR, hdr, sinProfundidad = false }) {
  const tipo = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const lineal = t => { t.texture.minFilter = t.texture.magFilter = THREE.LinearFilter; t.texture.generateMipmaps = false; return t; };
  const rt = lineal(new THREE.WebGLRenderTarget(1, 1, { type: tipo, depthBuffer: true }));
  rt.depthTexture = new THREE.DepthTexture(1, 1); rt.depthTexture.type = THREE.UnsignedIntType;
  const historias = [0, 1].map(() => lineal(new THREE.WebGLRenderTarget(1, 1, { type: tipo, depthBuffer: false })));
  const soloProfundidad = new THREE.MeshBasicMaterial({ colorWrite: false });
  AZAR_VOLUMEN.uRuidoAzul.value = texturaRuidoAzul();

  const uR = { tActual: { value: rt.texture }, tHistoria: { value: null }, tProfundidad: { value: rt.depthTexture }, uTamActual: { value: new THREE.Vector2(1, 1) }, uJitter: { value: new THREE.Vector2() },
    uReproyeccion: { value: new THREE.Matrix4() }, uZGas: { value: 0.999 }, uMezcla: { value: 0.25 }, uReiniciar: { value: 1 }, uRazon: { value: 1 } };
  const resolver = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: uR, vertexShader: VERTICE, fragmentShader: RESOLVER, depthTest: false, depthWrite: false }));
  resolver.frustumCulled = false; const escenaResolver = new THREE.Scene(); escenaResolver.add(resolver); const camaraPlana = new THREE.Camera();

  const uC = { tHistoria: { value: null }, tProfundidad: { value: rt.depthTexture }, uTamHistoria: { value: new THREE.Vector2(1, 1) }, uAtenuar: { value: 1 } };
  // Las dos piezas, en el fondo de la escena (z = w: profundidad 1) con prueba de profundidad: una donde no hay nada opaco,
  // otra encima de lo opaco. El gas ya viene con su alfa multiplicado (como lo pintaba cada nebulosa): se compone igual.
  const pieza = (opaco) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: uC,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }', fragmentShader: COMPONER(opaco),
      transparent: true, depthTest: !sinProfundidad, depthWrite: false, depthFunc: opaco ? THREE.GreaterDepth : THREE.LessEqualDepth,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation }));
    m.frustumCulled = false; m.renderOrder = -3; return m;
  };
  // (Dibujando directamente en un lienzo sin profundidad, el último recurso, una sola pieza sin clases, como antes.)
  const compuesto = new THREE.Group(); compuesto.add(pieza(false)); if (!sinProfundidad) compuesto.add(pieza(true));
  compuesto.name = 'Gas volumétrico (capa reducida y reconstruida)'; scene.add(compuesto);

  const muestra = new THREE.Mesh(new THREE.PlaneGeometry(1e-3, 1e-3)); muestra.frustumCulled = false;
  let cuenta = 0, volumenes = 0, cuadro = 0, actualHist = 0, reiniciar = true, distanciaGas = 1;
  const lista = [], frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), esfera = new THREE.Sphere();
  const vpPrevio = new THREE.Matrix4(), vpActual = new THREE.Matrix4(), inversa = new THREE.Matrix4(), posPrevia = new THREE.Vector3(), dirPrevia = new THREE.Vector3(), dir = new THREE.Vector3();
  // ¿Hay algún gas a la vista? (visible y dentro de la cámara, con margen). Si no, la capa no recorre la escena.
  // De paso, la distancia al gas más cercano a la vista (la de la reproyección).
  const hayGas = camera => {
    camera.updateMatrixWorld(); pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
    let hay = false; distanciaGas = Infinity;
    for (const o of lista) {
      let x = o; while (x && x.visible) x = x.parent; if (x) continue;
      const g = o.geometry; if (!g) return true; if (!g.boundingSphere) g.computeBoundingSphere();
      esfera.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); esfera.radius *= 1.25;
      if (frustum.intersectsSphere(esfera)) { hay = true; distanciaGas = Math.min(distanciaGas, Math.max(camera.near * 2, esfera.center.distanceTo(camera.position) - esfera.radius * 0.3)); }
    }
    return hay;
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
  const tamano = (t, w, h) => { if (t.width !== w || t.height !== h) { t.setSize(w, h); reiniciar = true; } };
  const color = new THREE.Color();
  return {
    compuesto,
    escala: ESCALA_VOLUMEN,
    // Todo el gas a la vez más tenue (k ≤ 1; premultiplicado: también más transparente). La ceremonia de la supernova.
    set atenuacion(k) { uC.uAtenuar.value = k; },
    // lado: calentamiento en la carga (se dibuja aunque no haya gas a la vista, para que todo quede compilado).
    dibujar(camera, lado = 0) {
      if (cuenta++ % 120 === 0) marcar();
      if (!volumenes || (!lado && !hayGas(camera))) { compuesto.visible = false; reiniciar = true; return; }
      if (lado) { muestra.layers.set(CAPA_OPACOS); scene.add(muestra); }
      const pr = uPR.value, w = Math.max(1, Math.round(vista.ancho * pr * ESCALA_VOLUMEN)), h = Math.max(1, Math.round(vista.alto * pr * ESCALA_VOLUMEN));
      const wh = Math.max(1, Math.round(vista.ancho * pr * ESCALA_HISTORIA)), hh = Math.max(1, Math.round(vista.alto * pr * ESCALA_HISTORIA));
      tamano(rt, w, h); tamano(historias[0], wh, hh); tamano(historias[1], wh, hh);
      // Un salto de cámara (un corte del director, el principio de un viaje) no se reproyecta: se empieza de nuevo.
      camera.getWorldDirection(dir);
      if (posPrevia.distanceTo(camera.position) > Math.max(1, distanciaGas) * 0.5 || dir.dot(dirPrevia) < 0.94) reiniciar = true;
      const previo = renderer.getRenderTarget(), alfa = renderer.getClearAlpha(), autoClear = renderer.autoClear, fondo = scene.background, mascara = camera.layers.mask, auto = scene.matrixWorldAutoUpdate;
      renderer.getClearColor(color);
      compuesto.visible = false;
      // Desplazamiento de esta capa (fracción de píxel) y desfase de los rayos.
      // (Al empezar de nuevo, sin desplazamiento ni desfase: ese cuadro se ve tal cual, como antes.)
      const [jx, jy] = reiniciar ? SIN_DESPLAZAR : HALTON[cuadro % HALTON.length]; cuadro++;
      vpActual.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const e = camera.projectionMatrix.elements, e8 = e[8], e9 = e[9];
      e[8] -= 2 * jx / w; e[9] -= 2 * jy / h;
      AZAR_VOLUMEN.uAzarVolumen.value = reiniciar ? -1 : (cuadro * AUREA) % 1;
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, false);
      // Las matrices de la escena se calculan una vez por cuadro (index.js, antes de esta capa): aquí se usan tal cual.
      renderer.autoClear = false; scene.background = null; if (!lado) scene.matrixWorldAutoUpdate = false;
      camera.layers.set(CAPA_OPACOS); scene.overrideMaterial = soloProfundidad; renderer.render(scene, camera); scene.overrideMaterial = null;
      camera.layers.set(CAPA_VOLUMEN); renderer.render(scene, camera);
      e[8] = e8; e[9] = e9;
      camera.layers.mask = mascara; scene.background = fondo; scene.matrixWorldAutoUpdate = auto;
      // Historia: reproyección del cuadro anterior + la muestra más cercana de este.
      const destino = historias[actualHist ^ 1], anterior = historias[actualHist];
      uR.uTamActual.value.set(w, h); uR.uJitter.value.set(jx, jy); uR.uRazon.value = wh / w; uR.tHistoria.value = anterior.texture; uR.uReiniciar.value = reiniciar ? 1 : 0;
      uR.uReproyeccion.value.multiplyMatrices(vpPrevio, inversa.copy(vpActual).invert());
      // Profundidad (en NDC) del gas a la vista, para reproyectarlo.
      const zv = -Math.min(distanciaGas, camera.far * 0.5), p = camera.projectionMatrix.elements; uR.uZGas.value = Number.isFinite(zv) ? (p[10] * zv + p[14]) / -zv : 0.999;
      renderer.setRenderTarget(destino); renderer.render(escenaResolver, camaraPlana);
      actualHist ^= 1; reiniciar = false; vpPrevio.copy(vpActual); posPrevia.copy(camera.position); dirPrevia.copy(dir);
      uC.tHistoria.value = destino.texture; uC.uTamHistoria.value.set(wh, hh);
      renderer.autoClear = autoClear; renderer.setClearColor(color, alfa); renderer.setRenderTarget(previo);
      compuesto.visible = true;
      if (lado) { scene.remove(muestra); reiniciar = true; }
    }
  };
}
