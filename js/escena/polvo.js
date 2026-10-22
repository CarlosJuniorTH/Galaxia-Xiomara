// Polvo cercano: motas diminutas que flotan junto a la cámara. En reposo dan profundidad
// (algunas brillan al girar); al viajar se estiran en la dirección del movimiento y pasan
// rozando: se siente la velocidad aunque el cielo lejano no se mueva.
import * as THREE from 'three';

const S = 1400;   // lado del cubo de polvo que acompaña a la cámara (se repite sin costuras)

export function crearPolvo({ scene, uPR }) {
  const n = 300;
  const semillas = Array.from({ length: n }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
  const uniforms = { uCam: { value: new THREE.Vector3() }, uVel: { value: new THREE.Vector3() }, uRapidez: { value: 0 }, uT: { value: 0 }, uPR, uS: { value: S } };
  // Posición dentro del cubo que rodea a la cámara: al salir por un lado entra por el opuesto.
  const comun = /* glsl */`
    uniform vec3 uCam, uVel; uniform float uRapidez, uT, uPR, uS; attribute vec4 aSemilla;
    vec3 relativa(){ return mod(aSemilla.xyz * uS - uCam, uS) - uS * 0.5; }
    float visible(vec3 p){ float d = length(p); return smoothstep(18.0, 70.0, d) * (1.0 - smoothstep(uS * 0.28, uS * 0.5, d)); }`;

  // Motas en reposo: puntos tenues que titilan al captar la luz.
  const gPuntos = new THREE.BufferGeometry();
  gPuntos.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  gPuntos.setAttribute('aSemilla', new THREE.BufferAttribute(new Float32Array(semillas.flat()), 4));
  const puntos = new THREE.Points(gPuntos, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: comun + /* glsl */`
      varying float vA; varying vec3 vC;
      void main(){
        vec3 p = relativa(); vec4 mv = vec4(mat3(viewMatrix) * p, 1.0); gl_Position = projectionMatrix * mv;   // relativo a la cámara: preciso aunque esté a miles de millones
        float destello = pow(0.5 + 0.5 * sin(uT * (0.6 + aSemilla.w * 1.8) + aSemilla.w * 40.0), 8.0);
        vA = visible(p) * (0.22 + destello * 0.6) * (1.0 - smoothstep(300.0, 900.0, uRapidez));
        vC = mix(vec3(1.0, 0.9, 0.95), vec3(0.85, 0.88, 1.0), aSemilla.w);
        gl_PointSize = clamp((1.6 + aSemilla.w * 2.2) * uPR * (240.0 / max(60.0, -mv.z)), 1.0, 4.5 * uPR);
      }`,
    fragmentShader: 'varying float vA; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float k = pow(1.0 - d * 2.0, 1.5) * vA; gl_FragColor = vec4(vC * k, k); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));

  // Al viajar: cada mota deja una estela en contra del movimiento. Son tiras con grosor en
  // píxeles de pantalla (no líneas de 1 px, invisibles en pantallas de alta densidad).
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
  quad.setAttribute('aEsquina', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]), 2));
  quad.setIndex([0, 2, 1, 2, 3, 1]);
  quad.setAttribute('aSemilla', new THREE.InstancedBufferAttribute(new Float32Array(semillas.flat()), 4));
  quad.instanceCount = n;
  uniforms.uAspecto = { value: new THREE.Vector2(innerWidth, innerHeight) };
  addEventListener('resize', () => uniforms.uAspecto.value.set(innerWidth, innerHeight));
  const lineas = new THREE.Mesh(quad, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: comun + /* glsl */`
      attribute vec2 aEsquina; uniform vec2 uAspecto; varying float vA, vLado, vLargo;
      void main(){
        vec3 p = relativa(), cabeza = p, cola = cabeza - normalize(uVel + vec3(1e-4)) * min(length(uVel) * 0.012, 48.0);
        vec4 c0 = projectionMatrix * vec4(mat3(viewMatrix) * cabeza, 1.0), c1 = projectionMatrix * vec4(mat3(viewMatrix) * cola, 1.0);
        float delante = step(1.0, c0.w) * step(1.0, c1.w);
        vec2 d = (c1.xy / max(c1.w, 1.0) - c0.xy / max(c0.w, 1.0)) * uAspecto, dir = length(d) > 0.001 ? normalize(d) : vec2(1.0, 0.0);
        vec4 c = mix(c0, c1, aEsquina.x);
        float ancho = (0.3 + aSemilla.w * 0.45) * clamp(380.0 / max(1.0,c0.w), 0.7, 1.6);   // px de pantalla
        c.xy += vec2(-dir.y, dir.x) * aEsquina.y * ancho * 2.0 / uAspecto * c.w;
        gl_Position = delante > 0.5 ? c : vec4(2.0,2.0,2.0,1.0);
        vA = visible(p) * smoothstep(220.0, 900.0, uRapidez) * (0.16 + aSemilla.w * 0.18);
        vLado = aEsquina.y; vLargo = aEsquina.x;
      }`,
    fragmentShader: 'varying float vA, vLado, vLargo; void main(){ float a = vA * (1.0 - vLado * vLado) * pow(1.0 - vLargo, 1.4); gl_FragColor = vec4(vec3(1.0, 0.94, 0.97) * a, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  }));
  for (const o of [puntos, lineas]) { o.frustumCulled = false; o.renderOrder = 3; scene.add(o); }

  const anterior = new THREE.Vector3(), velocidad = new THREE.Vector3();
  let primero = true;
  return {
    actualizar(t, dt, { camera, velocidadPolvo }) {
      if (primero) { anterior.copy(camera.position); primero = false; }
      // La velocidad la da la escena: en los viajes, la real; fuera de ellos, solo el avance o
      // retroceso (girar alrededor de algo lejano no es viajar).
      if (dt > 0) velocidad.lerp(velocidadPolvo, Math.min(1, dt * 8));
      // Un salto grande (cámara recolocada) no es velocidad.
      if (velocidad.length() > 5e6) velocidad.set(0, 0, 0);
      anterior.copy(camera.position);
      // Solo hace falta la posición dentro del cubo que se repite (calculada en doble precisión).
      const m = x => ((x % S) + S) % S; uniforms.uCam.value.set(m(camera.position.x), m(camera.position.y), m(camera.position.z)); uniforms.uVel.value.copy(velocidad);
      uniforms.uRapidez.value = velocidad.length(); uniforms.uT.value = t;
      lineas.visible = uniforms.uRapidez.value > 180;
    }
  };
}
