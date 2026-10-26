// Matrices del mundo solo de lo que se dibuja, y solo si algo ha cambiado (como los motores de los juegos).
// three.js (Object3D.updateMatrixWorld) recalcula en CADA cuadro la matriz local (compose) y la del mundo de los ~1000
// objetos de la escena, también los ocultos y los que no se han movido: con la CPU ×4 era el 15–18 % del cuadro.
// Aquí, con el mismo resultado para todo lo visible:
//  · Un objeto oculto (visible = false) no se recorre, ni su rama: se marca pendiente (matrixWorldNeedsUpdate) si su padre
//    cambió, y se pone al día el primer cuadro en que vuelve a verse (antes de dibujarse). Quien necesite la posición de
//    algo oculto la pide con getWorldPosition/updateWorldMatrix (three.js la calcula entera, como siempre).
//  · La matriz local solo se recompone si cambió su posición, giro o escala (se guardan los 10 números del último cálculo).
//  · La del mundo, solo si cambió la local o la del padre (igual que three.js con matrixWorldNeedsUpdate).
// Con force (updateMatrixWorld(true)) se hace el recorrido completo de three.js, sin atajos.
import * as THREE from 'three';

const base = THREE.Object3D.prototype.updateMatrixWorld;
const previo = new WeakMap();

// ¿Cambió la posición, el giro o la escala desde el último cálculo? (y lo guarda)
function cambioLocal(o) {
  const p = o.position, q = o.quaternion, s = o.scale;
  let g = previo.get(o);
  if (!g) { g = new Float64Array(10); previo.set(o, g); g[0] = NaN; }
  if (g[0] === p.x && g[1] === p.y && g[2] === p.z && g[3] === q._x && g[4] === q._y && g[5] === q._z && g[6] === q._w && g[7] === s.x && g[8] === s.y && g[9] === s.z) return false;
  g[0] = p.x; g[1] = p.y; g[2] = p.z; g[3] = q._x; g[4] = q._y; g[5] = q._z; g[6] = q._w; g[7] = s.x; g[8] = s.y; g[9] = s.z;
  return true;
}

function visitar(o, forzar) {
  // Clases con su propio cálculo (cámaras: también su inversa): el de three.js.
  if (o.updateMatrixWorld !== base && !o.updateMatrixWorld.propio) { o.updateMatrixWorld(forzar); return; }
  if (o.matrixAutoUpdate && cambioLocal(o)) o.updateMatrix();
  if (o.matrixWorldNeedsUpdate || forzar) {
    if (o.parent === null) o.matrixWorld.copy(o.matrix); else o.matrixWorld.multiplyMatrices(o.parent.matrixWorld, o.matrix);
    o.matrixWorldNeedsUpdate = false; forzar = true;
  }
  const hijos = o.children;
  for (let i = 0, l = hijos.length; i < l; i++) {
    const h = hijos[i];
    if (h.matrixWorldAutoUpdate !== true && !forzar) continue;
    if (!h.visible) { if (forzar) h.matrixWorldNeedsUpdate = true; continue; }   // al día cuando vuelva a verse
    visitar(h, forzar);
  }
}

// Pone al día un objeto y su rama (lo visible). El objeto en sí se calcula aunque esté oculto.
export function actualizarVisibles(o, forzar = false) {
  if (forzar) { base.call(o, true); return; }
  visitar(o, false);
}

// Sustituye el recorrido de la escena que hace three.js al dibujar (renderer.render → scene.updateMatrixWorld()).
export function matricesSoloVisibles(escena) {
  escena.updateMatrixWorld = function (force) { if (force) base.call(this, true); else visitar(this, false); };
  escena.updateMatrixWorld.propio = true;
  // La primera vez, todo entero (también lo oculto), como antes.
  base.call(escena, true);
}
