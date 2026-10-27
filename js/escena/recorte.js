// Recorte por grupos (como los motores de los juegos): un grupo entero que cae fuera de la vista no se dibuja.
// three.js recorta objeto a objeto, y solo los que tienen frustumCulled; muchos de nuestros puntos y destellos lo llevan
// apagado porque su forma la mueve el sombreador (su caja de contorno no sirve). Aquí cada grupo registrado tiene una
// esfera de contorno amplia (todo lo que dibuja, con lo que mueve el sombreador, cabe dentro) y, si la vista de ESTE dibujo
// no la toca, el grupo se oculta solo mientras three.js decide qué dibujar (scene.onBeforeRender) y vuelve a quedar como
// estaba al terminar (scene.onAfterRender). Para el resto del código el grupo sigue visible: sus matrices se ponen al día,
// se anima y se puede tocar como siempre. La imagen es la misma: solo se quitan dibujos que no tocan la pantalla.
import * as THREE from 'three';

// Margen en píxeles CSS alrededor de la esfera: los puntos tienen tamaño en píxeles (los destellos, hasta 170 px: medio
// punto, 85) y uno en el borde de la esfera puede asomar aunque su centro quede fuera.
const MARGEN_PX = 100;

// Uno por escena (la principal y la del sistema solar): cualquier capa registra en él sus grupos.
const porEscena = new WeakMap();
export const recorteDe = escena => { let r = porEscena.get(escena); if (!r) porEscena.set(escena, r = crearRecorte(escena)); return r; };

function crearRecorte(escena, { alto = () => innerHeight } = {}) {
  const lista = [], ocultos = [], antesDeDibujar = [];
  let activo = true;
  const frustum = new THREE.Frustum(), m = new THREE.Matrix4(), esfera = new THREE.Sphere(), camPos = new THREE.Vector3();
  const antes = escena.onBeforeRender, despues = escena.onAfterRender;
  let contados = 0;
  escena.onBeforeRender = function (renderer, scene, camera, objetivo) {
    antes.call(this, renderer, scene, camera, objetivo);
    for (let i = 0; i < antesDeDibujar.length; i++) antesDeDibujar[i](camera);
    if (!activo || !camera.isPerspectiveCamera || !lista.length) return;
    m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(m);
    camPos.setFromMatrixPosition(camera.matrixWorld);
    // Píxeles por unidad a distancia 1 (la focal en píxeles CSS): el margen en el mundo crece con la distancia.
    const porPx = 2 / (camera.projectionMatrix.elements[5] * alto());
    for (let i = 0; i < lista.length; i++) {
      const e = lista[i], o = e.objeto;
      if (!o.visible) continue;
      esfera.center.copy(e.centro).applyMatrix4(o.matrixWorld);
      const r = e.radio * o.matrixWorld.getMaxScaleOnAxis();
      esfera.radius = r + Math.max(0, esfera.center.distanceTo(camPos) - r) * MARGEN_PX * porPx;
      if (!frustum.intersectsSphere(esfera)) { o.visible = false; ocultos.push(o); }
    }
    contados = ocultos.length;
  };
  escena.onAfterRender = function (renderer, scene, camera) {
    despues.call(this, renderer, scene, camera);
    for (let i = 0; i < ocultos.length; i++) ocultos[i].visible = true;
    ocultos.length = 0;
  };
  return {
    // radio y centro en las coordenadas locales del objeto (sin su escala: se aplica la del mundo en cada dibujo).
    anadir(objeto, radio, centro = new THREE.Vector3()) { lista.push({ objeto, radio, centro: centro.clone() }); },
    // fn(cámara) antes de que three.js decida qué dibujar en cada dibujo de la escena (tramos de la telaraña).
    alDibujar(fn) { antesDeDibujar.push(fn); },
    // Apagado mientras se calienta la GPU (carga/preparacion.js dibuja todo para estrenarlo: nada se debe quedar fuera).
    set activo(v) { activo = v; }, get activo() { return activo; },
    get recortados() { return contados; },   // (diagnóstico: grupos fuera de la vista en el último dibujo)
    get grupos() { return lista.map(e => ({ nombre: e.objeto.name, radio: e.radio })); }
  };
}

// Esfera (en coordenadas locales de `raiz`) que contiene todas las geometrías de su rama, con su posición de reposo. Lo que
// el sombreador mueve fuera de la geometría (alturas, ondulaciones, puntos que suben) se cubre con `extra` (unidades).
export function esferaDe(raiz, extra = 0) {
  raiz.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(raiz.matrixWorld).invert(), caja = new THREE.Box3(), b = new THREE.Box3(), mm = new THREE.Matrix4();
  raiz.traverse(o => {
    const g = o.geometry; if (!g?.attributes?.position) return;
    if (!g.boundingBox) g.computeBoundingBox();
    mm.multiplyMatrices(inv, o.matrixWorld);
    // Un sprite siempre mira a la cámara: ocupa una esfera de su media diagonal, no su cuadrado plano.
    if (o.isSprite) { const c = new THREE.Vector3().setFromMatrixPosition(mm), r = new THREE.Vector3().setFromMatrixScale(mm), d = Math.hypot(r.x, r.y) / 2; b.set(c.clone().subScalar(d), c.addScalar(d)); }
    else b.copy(g.boundingBox).applyMatrix4(mm);
    caja.union(b);
  });
  const s = caja.getBoundingSphere(new THREE.Sphere());
  return { centro: s.center, radio: s.radius + extra };
}
