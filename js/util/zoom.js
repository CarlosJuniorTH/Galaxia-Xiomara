// Zoom con la rueda del ratón (o el gesto de pellizco del panel táctil, que llega como rueda), suave como en los juegos:
// cada paso de la rueda acerca o aleja lo mismo que antes (el factor de OrbitControls), pero repartido en unos cuadros
// con un frenado exponencial en vez de aplicarse de golpe en uno. Los pasos seguidos se suman sin tirones.
// El pellizco con los dedos en una pantalla táctil lo sigue llevando OrbitControls (sigue a los dedos al instante).
import * as THREE from 'three';

export function crearZoom({ canvas, camera, controls, alGesto = () => {} }) {
  const desp = new THREE.Vector3();
  let pendiente = 0;   // logaritmo del factor de distancia que falta por recorrer
  canvas.addEventListener('wheel', e => {
    if (!controls.enabled || !controls.enableZoom || !e.deltaY) return;
    // Esta rueda la lleva este módulo (OrbitControls ya no la aplica de golpe).
    e.preventDefault(); e.stopImmediatePropagation();
    const n = Math.abs(e.deltaY) / (100 * (window.devicePixelRatio | 0)), f = Math.pow(0.95, controls.zoomSpeed * n);
    pendiente += e.deltaY < 0 ? Math.log(f) : -Math.log(f);
    alGesto();
  }, { capture: true, passive: false });

  return {
    get moviendo() { return pendiente !== 0; },
    detener() { pendiente = 0; },
    // Cada cuadro, con el tiempo real transcurrido: avanza una parte de lo que falta (la misma por segundo a cualquier ritmo).
    actualizar(dt, puede) {
      if (!pendiente) return;
      if (!puede) { pendiente = 0; return; }
      const paso = Math.abs(pendiente) < 1e-4 ? pendiente : pendiente * (1 - Math.exp(-dt * 16));
      pendiente -= paso;
      desp.copy(camera.position).sub(controls.target);
      const r = desp.length(), r2 = THREE.MathUtils.clamp(r * Math.exp(paso), controls.minDistance, controls.maxDistance);
      if (r2 === controls.minDistance || r2 === controls.maxDistance) pendiente = 0;   // en el límite: sin empujar contra él
      if (r > 0) camera.position.copy(controls.target).addScaledVector(desp, r2 / r);
    }
  };
}
