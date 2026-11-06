// Una estrella de verdad: una esfera sólida con su plasma calculado en cada píxel, nítida y sin halo. Sustituye a las decenas de
// miles de motas que simulaban su superficie (y que por mucho que se solaparan se veían como granito): se ve mejor y dibuja
// mucho menos. Blanca y dorada en el centro, honda en el borde (oscurecimiento del limbo), con su marea: se estira en lágrima
// hacia la estrella compañera. Un dibujo por estrella; los chorros finos de su corona siguen siendo motas.
import * as THREE from 'three';

export function crearEstrella({ radio, color, borde, brillo = 1 }) {
  const u = { uT: { value: 0 }, uMarea: { value: 0 }, uDir: { value: new THREE.Vector3(1, 0, 0) }, uAlfa: { value: 1 }, uBrillo: { value: brillo }, uColor: { value: new THREE.Color(...color) }, uBorde: { value: new THREE.Color(...borde) } };
  const malla = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 40), new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: true, depthTest: true, toneMapped: false,
    vertexShader: /* glsl */`
      uniform float uMarea; uniform vec3 uDir; varying vec3 vD, vN, vV;
      void main() {
        vD = normal;
        vec3 p = normal * (1.0 + uMarea * 0.62 * pow(max(0.0, dot(normal, uDir)), 5.0));
        vec4 v = modelViewMatrix * vec4(p, 1.0);
        vN = normalMatrix * normal; vV = -v.xyz;
        gl_Position = projectionMatrix * v;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uT, uAlfa, uBrillo; uniform vec3 uColor, uBorde; varying vec3 vD, vN, vV;
      float n(vec3 p, float t) { return sin(p.x + sin(p.y * 1.3 + t)) * sin(p.y + sin(p.z * 1.1 - t * 0.8)) * sin(p.z + sin(p.x * 1.2 + t * 0.6)); }
      void main() {
        float mu = max(0.0, dot(normalize(vN), normalize(vV)));
        vec3 d = normalize(vD);
        float g = uT * 0.1, c = cos(g), s = sin(g);
        d = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z);
        // El plasma: células grandes que se mueven despacio y granos finos encima.
        float q = 0.55 * n(d * 5.0, uT * 0.3) + 0.3 * n(d * 11.0 + 3.0, uT * 0.45) + 0.15 * n(d * 23.0 + 7.0, uT * 0.6);
        float calor = clamp(0.5 + q * 0.95, 0.0, 1.0);
        vec3 centro = mix(uColor, vec3(1.0, 0.95, 0.86), calor * calor);
        vec3 col = mix(uBorde, centro, smoothstep(0.0, 0.62, mu)) * (0.62 + 0.48 * pow(mu, 0.45));
        gl_FragColor = vec4(col * uBrillo, uAlfa * smoothstep(0.0, 0.07, mu));
      }`
  }));
  malla.scale.setScalar(radio); malla.frustumCulled = false; malla.renderOrder = -1;
  return { malla, u, liberar() { malla.parent?.remove(malla); malla.geometry.dispose(); malla.material.dispose(); } };
}
