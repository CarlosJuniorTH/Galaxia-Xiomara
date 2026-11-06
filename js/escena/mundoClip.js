// Lo que da mundo a los videoclips de la primera vuelta: el cielo de casa (las mismas nebulosas, ya en la tarjeta gráfica, sin
// descargar nada) y la Tierra de verdad, con sus dos ciudades. Sin ellos un clip era un dibujo sobre negro, menos que un día
// normal en la galaxia, y podría ser de cualquier pareja. La Tierra usa las texturas del sistema solar (costas reales).
// Luz nítida: el borde de la atmósfera se dibuja dentro del disco, sin halo por fuera.
import * as THREE from 'three';

const RAD = Math.PI / 180;
// Dirección de un punto de la Tierra en la esfera de Three.js (u = (lon + 180) / 360, como las texturas horneadas).
export const dirGeo = (lat, lon) => new THREE.Vector3(Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.sin(lat * RAD), -Math.cos(lat * RAD) * Math.sin(lon * RAD));
export const BARCELONA = dirGeo(41.39, 2.17), BUENOS_AIRES = dirGeo(-34.6, -58.38);

// (Girado para que detrás de los soles queden las paredes violetas, no las de fuego, que les quitaban todo el protagonismo.)
const GIRO_CIELO = 2.3;
export function crearCieloClip(textura) {
  const uI = { value: 0 };
  const malla = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.ShaderMaterial({
    uniforms: { uCubo: { value: textura }, uI },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(modelViewMatrix) * position, 1.0); gl_Position = p.xyww; }',
    // (El clip se dibuja directo a pantalla, sin el paso de color de la escena: se devuelve a sRGB aquí.)
    fragmentShader: 'uniform samplerCube uCubo; uniform float uI; varying vec3 vDir; void main(){ gl_FragColor = vec4(pow(textureCube(uCubo, vDir).rgb, vec3(0.4545)) * uI, 1.0); }',
    side: THREE.BackSide, depthWrite: false, depthTest: false, toneMapped: false
  }));
  malla.frustumCulled = false; malla.renderOrder = -1000;
  return { malla, fijar(k, giro) { uI.value = k; malla.rotation.y = giro + GIRO_CIELO; malla.rotation.x = giro * 0.4 + 0.9; }, liberar() { malla.parent?.remove(malla); malla.geometry.dispose(); malla.material.dispose(); } };
}

export function crearTierraClip({ superficie, mascara, nubes }, radio) {
  const u = { uMapa: { value: superficie }, uMascara: { value: mascara }, uNubes: { value: nubes }, uSol: { value: new THREE.Vector3(1, 0, 0) }, uT: { value: 0 }, uAlfa: { value: 1 } };
  const malla = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: true, depthTest: true, toneMapped: false,
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vN, vW;
      void main() { vUv = uv; vN = mat3(modelMatrix) * normal; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D uMapa, uMascara, uNubes; uniform vec3 uSol; uniform float uT, uAlfa; varying vec2 vUv; varying vec3 vN, vW;
      void main() {
        vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
        float ndl = dot(n, uSol), dia = smoothstep(-0.1, 0.28, ndl), nv = max(0.0, dot(n, v));
        vec4 m = texture2D(uMascara, vUv);
        vec3 col = pow(texture2D(uMapa, vUv).rgb, vec3(0.52)) * (0.03 + 1.0 * dia);
        // El mar devuelve el Sol en un destello nítido.
        col += vec3(1.0, 0.9, 0.75) * pow(max(0.0, dot(n, normalize(uSol + v))), 180.0) * m.r * 0.8 * dia;
        // Las nubes pasan despacio; de noche apenas se ven.
        float nube = texture2D(uNubes, vUv + vec2(uT * 0.0016, 0.0)).r;
        col = mix(col, vec3(0.96, 0.97, 1.0) * (0.04 + dia), smoothstep(0.5, 1.0, nube) * 0.5);
        // Las luces de la noche, y los dos países, cada uno del color de su sol: oro y rosa.
        float noche = 1.0 - dia;
        col += vec3(1.0, 0.76, 0.42) * m.a * noche * 1.1;
        float late = 0.78 + 0.22 * sin(uT * 1.3);
        col += (vec3(1.0, 0.72, 0.3) * m.g + vec3(1.0, 0.36, 0.62) * m.b) * (0.26 + 0.34 * noche) * late;
        // La atmósfera: una línea azul fina en el borde iluminado.
        col += vec3(0.36, 0.62, 1.0) * pow(1.0 - nv, 4.0) * smoothstep(-0.25, 0.3, ndl) * 1.15;
        gl_FragColor = vec4(col, uAlfa * smoothstep(0.0, 0.05, nv));
      }`
  }));
  malla.scale.setScalar(radio); malla.frustumCulled = false;
  return {
    malla, u,
    // Con el Atlántico hacia `hacia` y el norte arriba: se ven Barcelona y Buenos Aires a la vez.
    orientarAtlantico(hacia, arriba = new THREE.Vector3(0, 1, 0)) {
      const f = BARCELONA.clone().addScaledVector(BUENOS_AIRES, 1.7).normalize(),   // (más hacia Sudamérica: si no, Buenos Aires queda cortada en el móvil)
        norte = new THREE.Vector3(0, 1, 0).addScaledVector(f, -f.y).normalize();
      const a = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(norte, f), norte, f);
      const F = hacia.clone().normalize(), U = arriba.clone().addScaledVector(F, -arriba.dot(F)).normalize();
      const b = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(U, F), U, F);
      malla.quaternion.setFromRotationMatrix(b.multiply(a.transpose()));
    },
    punto(dir, destino = new THREE.Vector3()) { return destino.copy(dir).applyQuaternion(malla.quaternion).multiplyScalar(radio).add(malla.position); },
    liberar() { malla.parent?.remove(malla); malla.geometry.dispose(); malla.material.dispose(); }   // (las texturas son del sistema solar)
  };
}

// Las dos ciudades encendidas, el hilo de luz que cruza el Atlántico y la estela de cada luz al subir. Un solo dibujo.
export function crearLucesCiudades() {
  const nHilo = 5000, nEstela = 6000, total = 2 + nHilo + nEstela * 2, A = new Float32Array(total * 4); let k = 0, s = 1234567;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647, poner = (f, sem, fam, h) => { A.set([f, sem, fam, h], k * 4); k++; };
  poner(0, 0.5, 0, 0); poner(0, 0.5, 0, 1);
  for (let i = 0; i < nHilo; i++) poner(r(), r(), 1, 0);
  for (let h = 0; h < 2; h++) for (let i = 0; i < nEstela; i++) poner(r(), r(), 2, h);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3)); geo.setAttribute('aA', new THREE.BufferAttribute(A, 4));
  const u = { uC0: { value: new THREE.Vector3() }, uC1: { value: new THREE.Vector3() }, uF0: { value: new THREE.Vector3() }, uF1: { value: new THREE.Vector3() }, uE: { value: new THREE.Vector3() }, uR: { value: 1 }, uHilo: { value: 0 }, uSube: { value: 0 }, uCiudad: { value: 1 }, uT: { value: 0 }, uPx: { value: 1000 }, uPR: { value: 1 } };
  const puntos = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: /* glsl */`
      #define PI 3.14159265
      uniform vec3 uC0, uC1, uF0, uF1, uE; uniform float uR, uHilo, uSube, uCiudad, uT, uPx, uPR;
      attribute vec4 aA; varying vec3 vColor; varying float vForma;
      const vec3 ORO = vec3(1.0, 0.76, 0.40), ROSA = vec3(1.0, 0.44, 0.66), PERLA = vec3(1.0, 0.93, 0.84);
      vec3 ruta(vec3 c, vec3 f, float p) { vec3 n = normalize(c - uE), q = c + n * length(f - c) * 0.55; float i = 1.0 - p; return i * i * c + 2.0 * i * p * q + p * p * f; }
      void main() {
        float f = aA.x, sem = aA.y, fam = aA.z, h = aA.w, brillo = 0.0, tam = 0.05; vec3 p; vec3 color = h < 0.5 ? ORO : ROSA; vForma = 0.0;
        if (fam < 0.5) {            // La ciudad: una estrella nítida que late
          p = (h < 0.5 ? uC0 : uC1) + normalize((h < 0.5 ? uC0 : uC1) - uE) * uR * 0.012; vForma = 1.0;
          brillo = uCiudad * (0.82 + 0.18 * sin(uT * 2.0 + h * 2.0)); tam = uR * 0.17 * (1.0 + 0.1 * sin(uT * 2.0 + h * 2.0));
        } else if (fam < 1.5) {     // El hilo: de una orilla a la otra, se dibuja desde las dos a la vez y se encuentra en medio
          vec3 a = normalize(mix(uC0, uC1, f) - uE), b = (fract(vec3(sem * 13.7, sem * 57.1, sem * 91.3)) - 0.5);
          p = uE + a * uR * (1.015 + 0.16 * sin(f * PI)) + b * uR * 0.012;
          float d = min(f, 1.0 - f) * 2.0, pulso = pow(0.5 + 0.5 * sin(f * 26.0 - uT * 3.2), 10.0);
          color = mix(ORO, ROSA, smoothstep(0.3, 0.7, f));
          brillo = step(d, uHilo) * (0.36 + 1.1 * pulso) * (1.0 - smoothstep(0.1, 0.7, uSube)); tam = uR * 0.0034;
        } else {                    // La estela: la luz sube de su ciudad y deja atrás un rastro fino
          vec3 c = h < 0.5 ? uC0 : uC1, dest = h < 0.5 ? uF0 : uF1, b = (fract(vec3(sem * 13.7, sem * 57.1, sem * 91.3)) - 0.5);
          float cola = uSube - f * 0.5;
          p = ruta(c, dest, max(0.0, cola)) + b * (0.1 + f * 1.6);
          brillo = step(0.001, cola) * pow(1.0 - f, 2.0) * 1.05 * (1.0 - smoothstep(0.92, 1.0, uSube)); tam = 0.07;
        }
        if (brillo <= 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vColor = vec3(0.0); return; }
        vec4 v = viewMatrix * vec4(p, 1.0); if (vForma > 0.5) v.xyz *= 0.8;   // (hacia la cámara sin moverse en pantalla: la curva de la Tierra no corta su estrella)
        gl_Position = projectionMatrix * v;
        gl_PointSize = clamp(uPx * tam / max(0.1, -v.z), 1.05 * uPR, (vForma > 0.5 ? 54.0 : 3.2) * uPR);
        vColor = color * min(brillo, 1.5);
      }`,
    fragmentShader: /* glsl */`
      precision highp float; varying vec3 vColor; varying float vForma;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0; float a;
        if (vForma > 0.5) { vec2 q = abs(p); float r = length(p), rayo = max((1.0 - smoothstep(0.0, 0.05, q.y)) * (1.0 - q.x), (1.0 - smoothstep(0.0, 0.05, q.x)) * (1.0 - q.y)); a = max(1.0 - smoothstep(0.13, 0.19, r), rayo * rayo); }
        else a = 1.0 - smoothstep(0.72, 1.0, length(p));
        if (a <= 0.003) discard;
        gl_FragColor = vec4(vColor * a, 1.0);
      }`
  }));
  puntos.frustumCulled = false;
  return { puntos, u, liberar() { puntos.parent?.remove(puntos); geo.dispose(); puntos.material.dispose(); } };
}
// El mismo camino que la estela, para que el sol vaya a su cabeza.
export function enRuta(c, f, e, p, destino) {
  const n = c.clone().sub(e).normalize(), q = c.clone().addScaledVector(n, c.distanceTo(f) * 0.55), i = 1 - p;
  return destino.set(0, 0, 0).addScaledVector(c, i * i).addScaledVector(q, 2 * i * p).addScaledVector(f, p * p);
}
