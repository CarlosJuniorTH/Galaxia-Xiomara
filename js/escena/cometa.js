// El cometa: núcleo brillante, coma luminosa y dos colas, como en las fotografías reales:
//  · coma verde azulada (el carbono de los cometas reales brilla en verde) con núcleo blanco;
//  · cola de polvo ancha y curvada, de blanco a dorado y rosa, con una franja central.
// Nada sale disparado hacia fuera: toda la luz queda en la coma y en la cola.
// Las colas apuntan lejos del centro de la galaxia (la «luz»); el polvo se curva hacia la
// estela del movimiento. Cruza el cielo durante 42 s de cada ciclo de 130 s. Si se le visita,
// sigue avanzando (la cámara viaja con él) y al dejarlo está donde le corresponde.
import * as THREE from 'three';
import { texBrillo, texDestello, texPolvo } from './texturas.js';

const CICLO = 130, VISIBLE = 42;
// Pasa por la parte alta del encuadre de la vista inicial, por delante de la galaxia.
const RECORRIDO = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-2900, 820, 1000), new THREE.Vector3(200, 1300, 1700), new THREE.Vector3(2900, 620, 400));
const LARGO = RECORRIDO.getLength();

// Velo de una cola: una banda orientada a lo largo de la cola y girada hacia la cámara.
export function crearVelo({ largo, ancho, colorA, colorB, curva = 0, intensidad = 1 }) {
  const g = new THREE.PlaneGeometry(1, 1, 48, 8); g.translate(0.5, 0, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(colorA) }, uB: { value: new THREE.Color(colorB) }, uCurva: { value: curva }, uI: { value: intensidad } },
    vertexShader: /* glsl */`
      uniform float uCurva; varying vec2 vUv;
      void main(){
        vUv = uv; vec3 p = position;
        p.y += p.x * p.x * uCurva;            // el polvo se curva con la distancia al núcleo
        p.y *= 0.25 + p.x * 0.95;             // y se ensancha
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uI; uniform vec3 uA, uB; varying vec2 vUv;
      void main(){
        float x = vUv.x, y = abs(vUv.y - 0.5) * 2.0;
        float perfil = exp(-y * y * 3.2);
        float caida = pow(1.0 - x, 1.7) * smoothstep(0.0, 0.035, x);
        float estrias = 0.82 + 0.18 * sin(vUv.y * 46.0 + x * 9.0 - uTime * 0.6) * sin(vUv.y * 17.0 - uTime * 0.35);
        float a = perfil * caida * estrias * uI;
        gl_FragColor = vec4(mix(uA, uB, x) * a, a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
  });
  const malla = new THREE.Mesh(g, m); malla.scale.set(largo, ancho, 1); malla.frustumCulled = false;
  return malla;
}

// Partículas de una cola (animadas en la GPU): nacen en el núcleo y se alejan.
function crearParticulas(cantidad, { largo, curva, ancho, velocidad, colorA, colorB, tam, mapa, nudos = 0, brillo = 1 }, uScale, uPR) {
  const semillas = new Float32Array(cantidad * 3), edad = new Float32Array(cantidad);
  for (let i = 0; i < cantidad; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()); semillas.set([Math.cos(a) * r, Math.sin(a) * r, Math.random() * 2 - 1], i * 3); edad[i] = Math.random(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(semillas, 3)); g.setAttribute('aEdad', new THREE.BufferAttribute(edad, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { map: { value: mapa }, uTime: { value: 0 }, uScale, uPR, uDir: { value: new THREE.Vector3(-1, 0, 0) }, uLado: { value: new THREE.Vector3(0, 1, 0) },
      uLargo: { value: largo }, uCurva: { value: curva }, uAncho: { value: ancho }, uVel: { value: velocidad }, uA: { value: new THREE.Color(colorA) }, uB: { value: new THREE.Color(colorB) }, uTam: { value: tam }, uNudos: { value: nudos }, uI: { value: brillo } },
    vertexShader: /* glsl */`
      attribute float aEdad; uniform float uTime, uScale, uPR, uLargo, uCurva, uAncho, uVel, uTam, uNudos, uI; uniform vec3 uDir, uLado, uA, uB;
      varying vec3 vC; varying float vA;
      void main(){
        float e = fract(aEdad + uTime * uVel);
        vec3 normal = normalize(cross(uDir, uLado));
        vec3 p = uDir * (e * uLargo) + uLado * (e * e * uCurva + position.x * (1.5 + e * uAncho)) + normal * position.y * (1.5 + e * uAncho * 0.6);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        // Nudos: algunas partículas forman grumos más brillantes que viajan juntos.
        float nudo = uNudos * pow(0.5 + 0.5 * sin(e * 38.0 - uTime * 2.0 + position.z * 2.0), 8.0);
        vA = (pow(1.0 - e, 1.4) * smoothstep(0.0, 0.03, e)) * (0.55 + nudo) * uI;
        vC = mix(uA, uB, e);
        gl_PointSize = clamp(uTam * (1.0 + e * 3.0) * uScale / max(0.1, -mv.z), 1.0, 30.0 * uPR);
      }`,
    fragmentShader: 'uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ vec3 t = texture2D(map, gl_PointCoord).rgb; gl_FragColor = vec4(t * vC * vA, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}

export function crearCometa({ uScale, uPR }) {
  const grupo = new THREE.Group(), brillo = texBrillo(), destello = texDestello(), polvo = texPolvo();
  const sprite = (mapa, color, tam, opacidad = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mapa, color, transparent: true, opacity: opacidad, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(tam); grupo.add(s); return s;
  };
  // Coma en capas: halo verde azulado, interior claro y núcleo blanco con destello.
  const comaExterior = sprite(brillo, '#4fe0bf', 250, 0.26);
  const comaMedia = sprite(brillo, '#9ff5dc', 120, 0.42);
  const comaInterior = sprite(brillo, '#f0fff8', 60, 0.75);
  const nucleo = sprite(brillo, '#ffffff', 26, 1);
  const cabeza = sprite(destello, '#fffaf0', 62, 0.95);
  cabeza.userData.destino = 'cometa';
  // Cola de polvo: velo ancho dorado-rosado y una franja central más brillante.
  const veloPolvo = crearVelo({ largo: 900, ancho: 320, colorA: '#fff8e6', colorB: '#ff9ccb', curva: 0.42, intensidad: 1 });
  const franja = crearVelo({ largo: 700, ancho: 90, colorA: '#ffffff', colorB: '#ffcf8a', curva: 0.38, intensidad: 0.7 });
  const colaPolvo = crearParticulas(4200, { largo: 800, curva: 230, ancho: 80, velocidad: 0.07, colorA: '#fffaf0', colorB: '#ffaecf', tam: 3.6, mapa: polvo, brillo: 0.45 }, uScale, uPR);
  grupo.add(veloPolvo, franja, colaPolvo);

  let visible = false, pasoSeguido = null;
  const tangente = new THREE.Vector3(), lejos = new THREE.Vector3(), dirPolvo = new THREE.Vector3(), lado = new THREE.Vector3(), haciaCam = new THREE.Vector3();
  const base = new THREE.Matrix4(), eje = new THREE.Vector3(), arriba = new THREE.Vector3(), frente = new THREE.Vector3();
  function situar(avance) {
    if (avance <= 1) { RECORRIDO.getPoint(avance, grupo.position); RECORRIDO.getTangent(avance, tangente); }
    else { RECORRIDO.getPoint(1, grupo.position); RECORRIDO.getTangent(1, tangente); grupo.position.addScaledVector(tangente, (avance - 1) * LARGO); }
  }
  // Orienta un velo: eje X a lo largo de la cola, plano girado hacia la cámara.
  function orientar(velo, direccion, camara, curvarHacia) {
    eje.copy(direccion).normalize();
    haciaCam.copy(camara.position).sub(grupo.position).normalize();
    frente.copy(haciaCam).addScaledVector(eje, -haciaCam.dot(eje)).normalize();
    arriba.crossVectors(frente, eje).normalize();
    if (curvarHacia && arriba.dot(curvarHacia) < 0) arriba.negate();
    base.makeBasis(eje, arriba, frente.crossVectors(eje, arriba)); velo.quaternion.setFromRotationMatrix(base);
  }

  return {
    grupo, cabeza,
    get visible() { return visible; },
    posicion: () => grupo.position.clone(),
    cola: () => colaPolvo.material.uniforms.uDir.value.clone(),
    actualizar(t, dt, { tiempoDentro, foco, camera }) {
      if (tiempoDentro === null) { visible = false; grupo.visible = false; return; }
      const inicioCiclo = tiempoDentro - (tiempoDentro % CICLO);
      // Al visitarlo se sigue el paso en curso (o empieza uno nuevo si no estaba en el cielo).
      if (foco === 'cometa') { if (pasoSeguido === null) pasoSeguido = tiempoDentro % CICLO < VISIBLE ? inicioCiclo : tiempoDentro; }
      else pasoSeguido = null;
      const transcurrido = tiempoDentro - (pasoSeguido ?? inicioCiclo);
      // Visitándolo, se le acompaña hasta el final de su recorrido (sin salirse de él).
      const FIN = VISIBLE * 0.94 / 0.88;
      visible = transcurrido < (foco === 'cometa' ? FIN : VISIBLE);
      grupo.visible = visible;
      if (!visible) return;
      situar(0.06 + transcurrido / VISIBLE * 0.88);
      // Al aparecer y al irse, se funde (sin saltos).
      const fundido = Math.min(1, transcurrido / 2.5, ((foco === 'cometa' ? FIN : VISIBLE) - transcurrido) / 2.5);
      lejos.copy(grupo.position).normalize();
      dirPolvo.copy(tangente).negate().lerp(lejos, 0.45).normalize();
      lado.crossVectors(dirPolvo, lejos).cross(dirPolvo).normalize().negate();
      colaPolvo.material.uniforms.uDir.value.copy(dirPolvo); colaPolvo.material.uniforms.uLado.value.copy(lado); colaPolvo.material.uniforms.uTime.value = t;
      orientar(veloPolvo, dirPolvo, camera, lado); orientar(franja, dirPolvo, camera, lado);
      veloPolvo.material.uniforms.uTime.value = t; franja.material.uniforms.uTime.value = t;
      veloPolvo.material.uniforms.uI.value = fundido; franja.material.uniforms.uI.value = 0.7 * fundido;
      colaPolvo.material.uniforms.uI.value = 0.45 * fundido;
      const latido = 1 + Math.sin(t * 3.1) * 0.06;
      nucleo.scale.setScalar(26 * latido); cabeza.material.opacity = 0.95 * fundido; nucleo.material.opacity = fundido;
      comaInterior.material.opacity = 0.75 * fundido; comaMedia.material.opacity = 0.42 * fundido; comaExterior.material.opacity = 0.26 * fundido;
      comaExterior.scale.setScalar(250 + Math.sin(t * 1.3) * 14); comaMedia.scale.setScalar(120 + Math.sin(t * 2.1) * 6);
    }
  };
}
