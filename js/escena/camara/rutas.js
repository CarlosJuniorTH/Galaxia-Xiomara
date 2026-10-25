// Rutas de los viajes cortos (movido de index.js sin cambios): puntos de paso de cada destino (recta hasta el lugar y
// arco de llegada en órbita, el cometa, la vuelta a casa).
import * as THREE from 'three';

export function crearRutas({ camera, mundos }) {
  // Llegada en órbita: la cámara se acerca hasta una esfera amplia alrededor del destino
  // (por el lado desde el que viene), lo BORDEA girando a su alrededor hasta el ángulo final
  // y termina acercándose para encuadrarlo. Nunca pasa por dentro del lugar.
  function llegadaEnOrbita(desde, hasta, objetivo) {
    // Tramo rápido EN LÍNEA RECTA hacia el destino (el punto de fuga de las estelas coincide
    // con lo que se mira) hasta una esfera de aproximación; después, ya frenando, un arco
    // corto alrededor del destino hasta el encuadre final. Nunca se entra en él.
    const D = hasta.distanceTo(objetivo), inicio = desde.clone().sub(objetivo), r0 = inicio.length();
    inicio.normalize(); const fin = hasta.clone().sub(objetivo).normalize();
    const rAprox = Math.min(r0, Math.max(D * 1.45, D + 180));
    const paso = [];
    // Puntos sobre la recta que une la cámara con el centro del destino: la curva no se tuerce
    // antes de tiempo y el punto de fuga de las estelas coincide con lo que se mira.
    if (r0 > rAprox * 1.1) for (const f of [0.4, 0.75, 0.93, 1]) paso.push(objetivo.clone().addScaledVector(inicio, r0 + (rAprox - r0) * f));
    const angulo = inicio.angleTo(fin);
    if (angulo > 0.05) {
      let eje = new THREE.Vector3().crossVectors(inicio, fin);
      if (eje.lengthSq() < 1e-6) eje.set(0, 1, 0); eje.normalize();
      const tramos = Math.max(2, Math.ceil(angulo / 0.25));
      for (let k = 1; k < tramos; k++) {
        const f = k / tramos, dir = inicio.clone().applyAxisAngle(eje, angulo * f);
        paso.push(objetivo.clone().addScaledVector(dir, rAprox + (D - rAprox) * f));
      }
    }
    return paso;
  }
  // Puntos sobre la recta: el trayecto no se curva (CatmullRom pasa por ellos).
  const recta = (desde, hasta) => [0.3, 0.6, 0.85].map(f => desde.clone().lerp(hasta, f));
  function pasoHacia(id, hasta, objetivo) {
    if (id === 'cometa') return { paso: [objetivo.clone().add(mundos.colaCometa().multiplyScalar(650)).add(new THREE.Vector3(0, 60, 0))], mirarAntes: 1.7, corriente: 1 };
    // De vuelta al centro el encuadre es fijo (compone el cielo de fondo): estelas suaves.
    // Desde lejos se vuelve en recta hasta un punto en el eje del encuadre de casa y desde ahí se
    // llega de frente: la galaxia crece centrada, sin cruzarla ni rozarla.
    if (id === 'hogar') {
      if (camera.position.distanceTo(hasta) <= 20000) return { corriente: 0.35 };
      const eje = hasta.clone().sub(objetivo).normalize(), entrada = hasta.clone().addScaledVector(eje, 6000);   // se entra de frente por el eje del encuadre
      return { paso: [...recta(camera.position, entrada), entrada, hasta.clone().lerp(entrada, 0.3)], mirarAntes: 1, corriente: 1 };
    }
    return { paso: llegadaEnOrbita(camera.position, hasta, objetivo), mirarAntes: 1.7, corriente: 1 };
  }
  // Entrada al sistema solar: tras el cambio de escena la cámara mira al Sol (sol) desde donde venía. Primero sigue hacia él,
  // en recta y sin dejar de mirarlo, hasta entrar entre las órbitas (a algo más de la distancia del destino al Sol); allí gira
  // suave hacia el destino y llega a él con su arco de siempre (llegadaEnOrbita). giroMirada: en qué tramo del recorrido
  // (fracción de 0 a 1) pasa la mirada del Sol al destino.
  function entradaPorElSol(desde, sol, hasta, objetivo) {
    const r0 = desde.distanceTo(sol), dentro = Math.min(r0 * 0.7, Math.max(1800, objetivo.distanceTo(sol) * 1.35));
    const haciaFuera = desde.clone().sub(sol).normalize(), giro = sol.clone().addScaledVector(haciaFuera, dentro);
    const recto = [0.35, 0.7].map(f => desde.clone().lerp(giro, f));
    const llegada = llegadaEnOrbita(giro, hasta, objetivo);
    // Longitud aproximada de cada tramo (la curva pasa por estos puntos) para situar el giro de la mirada.
    let total = 0, hastaGiro = 0, previo = desde;
    for (const p of [...recto, giro, ...llegada, hasta]) { total += previo.distanceTo(p); if (p === giro) hastaGiro = total; previo = p; }
    const f = hastaGiro / Math.max(1, total);
    return { paso: [...recto, giro, ...llegada], giroMirada: [f * 0.7, Math.min(0.97, f + (1 - f) * 0.7)], centroDesde: sol.clone(), corriente: 1 };
  }
  return { llegadaEnOrbita, recta, pasoHacia, entradaPorElSol };
}
