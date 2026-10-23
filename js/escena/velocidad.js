// Velocidad de la luz: estelas de estrellas en 3D alrededor de la cámara que salen del punto
// hacia el que se viaja de verdad (la velocidad real de la cámara, no el centro de la pantalla)
// y pasan rozando. Al curvar el rumbo, el punto de fuga se desplaza y las estelas se curvan con
// él. Valen igual para los viajes, el zoom (acercarse o alejarse) y los cambios de escena. Son
// cintas con grosor en píxeles de pantalla (visibles en móviles de alta densidad), con la cabeza
// blanca azulada y la cola de color; en el punto de fuga brilla un pequeño foco. Sin desenfoque
// ni deformación de la imagen. Girar despacio alrededor de algo no es viajar: no las activa.
import * as THREE from 'three';
import { EXPOSICION } from './exposicion.js';
import { impulsoVisual } from '../util/impulsoVisual.js';
import { vista } from '../util/vista.js';

const L = 2400;
const Z = new THREE.Vector3(0, 0, 1), haciaCam = new THREE.Vector3();   // profundidad del campo de estelas (espacio de cámara, por unidad de escala)

export function crearVelocidad(camera, { reducido = false } = {}) {
  const n = 1700;
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
  g.setAttribute('aEsquina', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]), 2));
  g.setIndex([0, 2, 1, 2, 3, 1]);
  const semillas = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) semillas[i] = Math.random();
  g.setAttribute('aSemilla', new THREE.InstancedBufferAttribute(semillas, 4)); g.instanceCount = n;
  const u = { uFuerza: { value: 0 }, uAvance: { value: 0 }, uLargo: { value: 0 }, uDir: { value: new THREE.Vector3(0, 0, -1) }, uEscala: { value: 1 },
    uViewport: { value: new THREE.Vector2(vista.ancho, vista.alto) }, uGiro: { value: new THREE.Vector2() }, uPeriferia: { value: 0 }, uDensidad: { value: 1 }, uClaro: { value: 0 }, uExpo: EXPOSICION };   // exposición automática: en la pantalla vertical del móvil las estelas se juntan en el centro
  const material = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      attribute vec2 aEsquina; attribute vec4 aSemilla;
      uniform float uFuerza, uAvance, uLargo, uEscala, uPeriferia, uDensidad, uClaro, uExpo; uniform vec3 uDir; uniform vec2 uViewport, uGiro;
      varying float vA, vLado, vLargo; varying vec3 vC;
      void main(){
        vec3 eje = normalize(uDir), ref = abs(eje.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 ua = normalize(cross(ref, eje)), va = cross(eje, ua);
        float r = (70.0 + pow(aSemilla.x, 0.8) * 400.0), a = aSemilla.y * 6.2831853;
        // Recorren el eje desde delante hasta detrás de la cámara: en un movimiento lateral hay
        // estelas a ambos lados de la pantalla (las de detrás, en un avance, quedan fuera de la vista).
        float s = ${L.toFixed(1)} - mod(aSemilla.z * ${(L * 1.5).toFixed(1)} + uAvance, ${(L * 1.5).toFixed(1)});
        vec3 cabeza = (eje * s + (ua * cos(a) + va * sin(a)) * r) * uEscala;
        vec3 cola = cabeza + eje * uLargo * (0.45 + aSemilla.w * 0.9) * uEscala;           // la cola apunta al punto de fuga
        vec4 c0 = projectionMatrix * vec4(cabeza, 1.0), c1 = projectionMatrix * vec4(cola, 1.0);
        float delante = step(0.0, c0.w) * step(0.0, c1.w);
        vec2 p0 = c0.xy / max(c0.w, 1e-4), p1 = c1.xy / max(c1.w, 1e-4);
        // Al girar rápido, las luces se arrastran de lado a lado (en sentido contrario al giro).
        p1 -= uGiro * vec2(uViewport.y / uViewport.x, 1.0) * (0.03 + aSemilla.w * 0.05);
        vec2 d = (p1 - p0) * uViewport;
        vec2 normal = length(d) > 0.001 ? normalize(vec2(-d.y, d.x)) : vec2(0.0, 1.0);
        float dist = length(cabeza) / uEscala, cerca = 1.0 - clamp(dist / ${L.toFixed(1)}, 0.0, 1.0);
        float ancho = (0.9 + aSemilla.w * 1.3) * (0.55 + cerca * 0.9);
        vec2 p = mix(p0, p1, aEsquina.x) + normal * aEsquina.y * ancho * 2.0 / uViewport;
        gl_Position = vec4(p, 0.0, 1.0) * delante + vec4(0.0, 0.0, 2.0, 1.0) * (1.0 - delante);
        vA = uFuerza * (1.0 - smoothstep(${(L * 0.7).toFixed(1)}, ${L.toFixed(1)}, s)) * smoothstep(${(-L * 0.5).toFixed(1)}, ${(-L * 0.3).toFixed(1)}, s) * smoothstep(50.0, 160.0, dist) * (0.3 + aSemilla.w * 0.5);   // túnel libre: el destino se ve en el centro
        // Fuera de los viajes (girar o acercarse) es un apunte sutil: pocas estelas, solo hacia los
        // bordes de la pantalla; el centro queda limpio.
        vA *= mix(1.0, smoothstep(0.6, 1.15, length(p0)) * step(0.5, aSemilla.w), uPeriferia);
        // En el crucero acompañan sin tapar: menos estelas y una zona despejada alrededor del punto
        // de fuga y del centro, donde aparecen las galaxias y las nebulosas que se cruzan.
        vec4 cf = projectionMatrix * vec4(eje * 1000.0, 1.0); vec2 fuga = cf.w > 0.0 ? cf.xy / cf.w : vec2(0.0), asp = vec2(uViewport.x / uViewport.y, 1.0);
        float claro = min(length((p0 - fuga) * asp), length(p0 * asp));
        vA *= step(aSemilla.x, uDensidad) * mix(1.0, smoothstep(0.18, 0.62, claro), uClaro) * uExpo;
        vLado = aEsquina.y; vLargo = aEsquina.x;
        vC = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.78, 0.92), aSemilla.y);
      }`,
    fragmentShader: /* glsl */`
      varying float vA, vLado, vLargo; varying vec3 vC;
      void main(){ float a = vA * pow(max(0.0, 1.0 - vLado * vLado), 1.5) * pow(1.0 - vLargo, 1.3);
        vec3 c = mix(vec3(1.0), vC, smoothstep(0.0, 0.35, vLargo));                      // cabeza blanca, cola de color
        gl_FragColor = vec4(c * a, a); }`,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(g, material); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 5; camera.add(mesh);
  // Foco en el punto de fuga: hacia ahí se viaja.
  // (degradado radial calculado en el shader: sin lienzo ni textura)
  const foco = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: { uOpacidad: { value: 0 }, uRuptura: { value: 0 }, uAnillo: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    // Ruptura del salto: un destello puntual en el punto de fuga y un anillo fino que se expande (el destino sigue
    // visible a través: es luz aditiva, nunca una pantalla blanca). Sin halos difusos alrededor (se veían como una bola).
    fragmentShader: 'uniform float uOpacidad, uRuptura, uAnillo; varying vec2 vUv; void main(){ float r = length(vUv) * 2.0; float a = exp(-r * r * 900.0) * (1.0 - smoothstep(0.8, 1.0, r)) * uOpacidad;'   // solo un punto nítido en el punto de fuga (sin halo difuso: tapaba media pantalla)
      + ' float anillo = exp(-pow((r - uAnillo) / 0.012, 2.0)) * (1.0 - uAnillo) * uRuptura * 1.2; float nucleo = exp(-r * r * 1500.0) * 2.6 * uRuptura;'
      // Segundo anillo, rosado, algo detrás del primero (azulado): la luz se abre en un frente doble.
      + ' float r2 = uAnillo * 0.72; float anillo2 = exp(-pow((r - r2) / 0.014, 2.0)) * (1.0 - uAnillo) * uRuptura * 0.8;'   // anillos finos y nítidos que no se ensanchan (antes se volvían un halo difuso enorme)
      + ' float borde = 1.0 - smoothstep(0.9, 1.0, r); a *= borde;'
      + ' vec3 c = vec3(0.86, 0.92, 1.0) * (a + (anillo + nucleo) * borde) + vec3(1.0, 0.62, 0.86) * anillo2 * borde; gl_FragColor = vec4(c, a + (anillo + nucleo + anillo2) * borde); }',
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  foco.frustumCulled = false;
  foco.renderOrder = 5; foco.visible = false; mesh.add(foco);   // un único objeto colgado de la cámara
  if (typeof addEventListener === 'function') addEventListener('resize', () => u.uViewport.value.set(vista.ancho, vista.alto));

  const antes = new THREE.Vector3(), vel = new THREE.Vector3(), dirCam = new THREE.Vector3(), inversa = new THREE.Matrix4();
  const giroAnterior = new THREE.Quaternion(), delta = new THREE.Quaternion(), flujo = new THREE.Vector2();
  let primero = true, empuje = 0, ruptura = 0, anillo = 0, dirFija = null;
  return {
    mesh,
    impulsar() { empuje = 1; },
    // Fase de ruptura del vuelo: intensidad (0–1) y avance del anillo (0–1).
    ruptura(valor, progreso) { ruptura = reducido ? 0 : valor; anillo = progreso; },
    // Dirección del avance en el mundo (el corredor del vuelo): el punto de fuga nace ya en el
    // destino al romper, aunque la cámara aún no se haya movido (antes heredaba la maniobra lateral).
    direccion(mundo) { if (!mundo) { dirFija = null; return; } inversa.copy(camera.matrixWorld).invert(); dirFija = mundo.clone().normalize().transformDirection(inversa); },
    actualizar(dt, { vuelo, ceremonia = false, entrada = true } = {}) {
      if (primero) { antes.copy(camera.position); giroAnterior.copy(camera.quaternion); primero = false; }
      if (dt <= 0) return;
      // Giro de la cámara (arrastrar): velocidad angular en pantalla.
      delta.copy(giroAnterior).invert().multiply(camera.quaternion); giroAnterior.copy(camera.quaternion);
      const signo = delta.w < 0 ? -1 : 1, div = 2 / Math.max(0.008, dt);
      flujo.set(delta.y * signo * div, -delta.x * signo * div).clampLength(0, 4);
      const giro = impulsoVisual({ angular: flujo.length(), reducido, ceremonia }).giro;
      vel.copy(camera.position).sub(antes).divideScalar(dt); antes.copy(camera.position);
      const rapidez = vel.length();
      if (rapidez > 1e-3) {
        inversa.copy(camera.matrixWorld).invert();
        dirCam.copy(vel).normalize().transformDirection(inversa);
      }
      // Fuera de un vuelo solo cuenta acercarse o alejarse con fuerza (zoom), no orbitar.
      const frontal = Math.abs(dirCam.z);
      let objetivo = 0;
      if (vuelo && vuelo.corriente > 0) objetivo = THREE.MathUtils.smoothstep(rapidez, 300, 2500) * Math.max(0.75, Math.min(1, vuelo.corriente));
      else if (!vuelo) objetivo = THREE.MathUtils.smoothstep(rapidez, 700, 4500) * THREE.MathUtils.smoothstep(frontal, 0.75, 0.95) * 0.7;
      if (reducido || ceremonia || !entrada) objetivo = 0;
      objetivo = Math.max(objetivo, reducido ? 0 : empuje, (reducido || !entrada || ceremonia) ? 0 : giro * 0.7);
      // Mientras el vuelo maniobra (selección, maniobra, alineación) no hay estelas: ni de avance ni de giro.
      const maniobrando = vuelo && (vuelo.fase === 'seleccion' || vuelo.fase === 'maniobra' || vuelo.fase === 'alineacion');
      if (maniobrando) objetivo = 0;
      // Crucero: las estelas acompañan (más tenues y menos) para que se vea el paisaje real; en la
      // ruptura, todas y con fuerza.
      const crucero = vuelo && (vuelo.fase === 'crucero' || vuelo.fase === 'aproximacion');
      if (crucero) objetivo *= 0.95;
      u.uDensidad.value += ((crucero ? 0.85 : 1) - u.uDensidad.value) * Math.min(1, dt * 1.5);
      u.uClaro.value += ((crucero ? 1 : 0) - u.uClaro.value) * Math.min(1, dt * 1.5);
      u.uGiro.value.lerp(giro > 0 && !maniobrando ? flujo : flujo.set(0, 0), Math.min(1, dt * 9));
      u.uFuerza.value += (objetivo - u.uFuerza.value) * Math.min(1, dt * (objetivo > u.uFuerza.value ? 8 : 4));
      // Hacia delante: las estrellas vienen del punto de fuga. Hacia atrás: se alejan hacia él.
      const atras = dirCam.z > 0.35, eje = atras ? dirCam.clone().negate() : dirCam.clone();   // de lado no cambia de sentido a cada cuadro
      // Al arrancar, el punto de fuga nace ya donde se va (en el centro): no viene de un lado.
      if (dirFija) u.uDir.value.copy(dirFija);
      else if (rapidez > 1) { if (u.uFuerza.value < 0.08) u.uDir.value.copy(eje).normalize(); else u.uDir.value.lerp(eje, Math.min(1, dt * 6)).normalize(); }
      // Velocidad aparente en el campo de estelas (que crece con la escala de la cámara): en los
      // saltos lejanos, por enormes que sean, se ve siempre a toda velocidad, sin congelarse.
      u.uEscala.value = Math.max(1, camera.near * 2.5);
      let visual = Math.min(rapidez / u.uEscala.value, 9000);
      if (vuelo && vuelo.corriente >= 1) visual = Math.max(visual, 5200 * u.uFuerza.value);
      if (!vuelo) visual = Math.max(visual, 3200 * giro);   // al girar de lado: barrido nítido en los bordes
      u.uPeriferia.value += ((vuelo && vuelo.corriente > 0 ? 0 : 1) - u.uPeriferia.value) * Math.min(1, dt * 4);
      u.uAvance.value += visual * dt * 0.55 * (atras ? -1 : 1);
      // En la ruptura las estelas se estiran de golpe: se percibe la aceleración.
      u.uLargo.value += (Math.min(vuelo ? 1200 : 520, visual * 0.22) * (1 + ruptura * 1.8) - u.uLargo.value) * Math.min(1, dt * (ruptura > 0 ? 12 : 5));
      foco.position.copy(u.uDir.value).multiplyScalar(L * 0.9 * u.uEscala.value);
      foco.scale.setScalar(L * 0.9 * u.uEscala.value * 0.1 * (0.8 + u.uFuerza.value * 0.6)); foco.quaternion.setFromUnitVectors(Z, haciaCam.copy(u.uDir.value).negate());
      foco.material.uniforms.uOpacidad.value = u.uFuerza.value * 0.55 * EXPOSICION.value;
      foco.material.uniforms.uRuptura.value = ruptura * EXPOSICION.value; foco.material.uniforms.uAnillo.value = anillo;
      if (ruptura > 0) foco.scale.multiplyScalar(1 + anillo * 16);   // el anillo se abre hacia los bordes de la pantalla
      empuje = Math.max(0, empuje - dt * 1.5);
      mesh.visible = foco.visible = u.uFuerza.value > 0.015 || ruptura > 0.01;
    }
  };
}
