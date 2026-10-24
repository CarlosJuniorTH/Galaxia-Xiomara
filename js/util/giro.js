// Giro de la cámara con el dedo o el ratón, como en los juegos, en un solo sistema:
//  · Mientras se toca, la vista sigue al dedo casi al instante (un suavizado muy ligero que solo quita el temblor).
//  · Al soltar, sigue girando con la velocidad REAL del dedo en sus últimas ~0,08 s y frena de forma pareja.
//  · En los límites de arriba y abajo frena con suavidad en vez de pararse en seco.
// El acercamiento (pellizco y rueda) lo sigue haciendo OrbitControls. Ángulos: theta alrededor del eje vertical, phi desde
// arriba (como THREE.Spherical).
import * as THREE from 'three';

// Retraso con el que se lee el dedo (ms): lo justo para tener siempre un aviso a cada lado del instante del cuadro.
const RETRASO = 12;

export function crearGiro({ canvas, camera, controls, sensibilidad = 1, alEmpezar = () => {}, alTerminar = () => {} }) {
  const esfera = new THREE.Spherical(), desp = new THREE.Vector3();
  const punteros = new Map();   // dedos en la pantalla y su última posición
  // Tras un pellizco no se gira hasta levantar todos los dedos: si no, el dedo que se levanta el último giraba la vista
  // (y la lanzaba con inercia) al terminar de acercar o alejar.
  let id = null, x = 0, y = 0, arrastrando = false, trasPellizco = false;
  let objT = 0, objP = 0, camT = 0, camP = 0, velT = 0, velP = 0, resT = 0, resP = 0, sincronizado = false;
  const muestras = [];   // [tiempo, theta objetivo, phi objetivo] del dedo
  const limitar = p => THREE.MathUtils.clamp(p, controls.minPolarAngle, controls.maxPolarAngle);
  const leerCamara = () => { esfera.setFromVector3(desp.copy(camera.position).sub(controls.target)); camT = esfera.theta; camP = esfera.phi; };

  // Empieza a arrastrar con este dedo desde (px, py).
  function empezar(pid, px, py) {
    leerCamara(); objT = camT; objP = camP; velT = velP = 0; sincronizado = true;
    arrastrando = true; id = pid; x = px; y = py;
    muestras.length = 0; muestras.push([performance.now() - RETRASO, objT, objP]);
    alEmpezar();
  }
  function soltar(e) {
    punteros.delete(e.pointerId);
    if (!punteros.size) trasPellizco = false;
    if (!arrastrando || e.pointerId !== id) return;
    arrastrando = false; id = null;
    // Velocidad del dedo al soltar: la de sus últimos ~60 ms (si el dedo se paró antes de soltar, ~0). Con una ventana más
    // larga entraba el principio del gesto, aún lento, y la inercia arrancaba más despacio que la vista: frenazo al soltar.
    const ahora = performance.now(), b = muestras[muestras.length - 1];
    let a = b; for (let i = muestras.length - 2; i >= 0 && b[0] - muestras[i][0] <= 60; i--) a = muestras[i];
    if (a === b && muestras.length > 1) a = muestras[muestras.length - 2];
    if (b && a !== b && ahora - b[0] < 110) {
      // Sin recortar casi la velocidad: con un tope bajo, un giro fuerte frenaba de golpe justo al soltar.
      const t = Math.max(8, b[0] - a[0]) / 1000;
      velT = THREE.MathUtils.clamp((b[1] - a[1]) / t, -24, 24); velP = THREE.MathUtils.clamp((b[2] - a[2]) / t, -12, 12);
    } else { velT = 0; velP = 0; }
    // Lo que le faltaba a la vista para alcanzar al dedo se recorre con suavidad en los primeros cuadros del deslizamiento.
    resT = objT - camT; resP = objP - camP;
    muestras.length = 0;
    alTerminar();
  }
  canvas.addEventListener('pointerdown', e => {
    // El primer dedo de un gesto nuevo: si quedaba algún dedo «perdido» (un aviso de soltar que no llegó), se olvida;
    // si no, el giro creería que hay dos dedos y no giraría más.
    if (e.isPrimary) punteros.clear();
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!controls.enabled) return;
    // Pellizco: solo acercar. La vista se queda exactamente donde está (el primer dedo suele moverse un poco antes de que
    // llegue el segundo: ese giro ya no se completa solo después).
    if (punteros.size > 1) { trasPellizco = true; if (arrastrando) { arrastrando = false; id = null; velT = velP = resT = resP = 0; objT = camT; objP = camP; alTerminar(); } return; }
    if (trasPellizco) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    empezar(e.pointerId, e.clientX, e.clientY);
  });
  addEventListener('pointermove', e => {
    const p = punteros.get(e.pointerId); if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (!arrastrando || e.pointerId !== id) return;
    const alto = canvas.clientHeight || innerHeight, k = 2 * Math.PI / alto * sensibilidad;
    // Todas las posiciones intermedias del dedo (las pantallas de 120 Hz dan dos o más por cuadro), con su hora real.
    for (const ev of (e.getCoalescedEvents?.() || []).length ? e.getCoalescedEvents() : [e]) {
      objT -= (ev.clientX - x) * k; objP = limitar(objP - (ev.clientY - y) * k);
      x = ev.clientX; y = ev.clientY;
      muestras.push([ev.timeStamp || performance.now(), objT, objP]);
    }
    const ahora = performance.now(); while (muestras.length > 2 && ahora - muestras[0][0] > 160) muestras.shift();
  }, { passive: true });
  addEventListener('pointerup', soltar, true);
  addEventListener('pointercancel', soltar, true);
  addEventListener('blur', () => { punteros.clear(); if (arrastrando) { arrastrando = false; id = null; alTerminar(); } velT = velP = 0; });

  return {
    get arrastrando() { return arrastrando; },
    get moviendo() { return arrastrando || Math.abs(velT) + Math.abs(velP) > 0.003 || Math.abs(resT) + Math.abs(resP) > 1e-4 || Math.abs(objT - camT) + Math.abs(objP - camP) > 1e-4; },
    detener() { velT = velP = resT = resP = 0; arrastrando = false; id = null; sincronizado = false; },
    // Cada cuadro, después de controls.update(): mueve la cámara (si hay giro en curso) con el tiempo real transcurrido.
    actualizar(dt, puede) {
      if (!puede) { velT = velP = resT = resP = 0; sincronizado = false; if (arrastrando) { arrastrando = false; id = null; alTerminar(); } return; }
      if (!arrastrando && !(Math.abs(velT) + Math.abs(velP) > 0) && !(Math.abs(resT) + Math.abs(resP) > 0) && !(sincronizado && Math.abs(objT - camT) + Math.abs(objP - camP) > 1e-4)) { sincronizado = false; return; }
      if (!sincronizado) { leerCamara(); objT = camT; objP = camP; sincronizado = true; }
      // La distancia la lleva OrbitControls (zoom): se respeta la actual.
      esfera.setFromVector3(desp.copy(camera.position).sub(controls.target));
      if (arrastrando) {
        // Con el dedo: la posición del dedo en ESTE instante (un poco en el pasado), interpolada entre sus avisos con su hora
        // real. Los avisos llegan a otro ritmo que los cuadros (1, 2 o 3 por cuadro en una pantalla de 120 Hz) y seguirlos
        // tal cual daba un avance a saltitos («raspaba»); así cada cuadro avanza lo que el dedo avanzó en ese tiempo.
        const t = performance.now() - RETRASO; let rT = objT, rP = objP;
        for (let i = muestras.length - 1; i > 0; i--) {
          const a = muestras[i - 1], b = muestras[i];
          if (a[0] <= t) { if (t < b[0]) { const f = (t - a[0]) / Math.max(1e-3, b[0] - a[0]); rT = a[1] + (b[1] - a[1]) * f; rP = a[2] + (b[2] - a[2]) * f; } break; }
          if (i === 1) { rT = a[1]; rP = a[2]; }
        }
        const s = 1 - Math.exp(-dt * 60);   // un suavizado mínimo encima (casi directo: responde al instante)
        camT += (rT - camT) * s; camP += (rP - camP) * s;
      } else {
        // Deslizamiento (inercia): la vista sigue con la velocidad que llevaba el dedo y frena de forma pareja y continua
        // (la misma proporción por segundo), sin escalones: lo que faltaba por alcanzar se suma poco a poco al principio.
        const r = 1 - Math.exp(-dt * 18), dT = resT * r, dP = resP * r; resT -= dT; resP -= dP;
        camT += velT * dt + dT; camP += velP * dt + dP;
        // Frenado como el roce del aire: más fuerte cuanto más rápido gira (un giro muy potente se calma enseguida, siempre
        // de forma continua; uno suave conserva su inercia larga). Sin topes que lo corten de golpe.
        const f = Math.exp(-dt * (3.4 + 0.45 * Math.hypot(velT, velP))); velT *= f; velP *= f;
        // Límites de arriba y abajo: la velocidad vertical nunca supera la distancia que queda hasta el límite × 5, así que se
        // acerca a él cada vez más despacio y nunca choca (antes podía llegar con velocidad y pararse en seco).
        const bajo = Math.max(0, camP - controls.minPolarAngle), alto = Math.max(0, controls.maxPolarAngle - camP);
        if (velP < 0) velP = Math.max(velP, -bajo * 5); else if (velP > 0) velP = Math.min(velP, alto * 5);
        camP = limitar(camP);
        if (Math.abs(velT) + Math.abs(velP) < 0.003) { velT = velP = 0; }
        if (Math.abs(resT) + Math.abs(resP) < 1e-5) { resT = resP = 0; }
        objT = camT; objP = camP;
      }
      esfera.theta = camT; esfera.phi = camP; esfera.makeSafe();
      camera.position.copy(controls.target).add(desp.setFromSpherical(esfera)); camera.lookAt(controls.target);
    }
  };
}
