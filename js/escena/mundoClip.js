// El fondo de los videoclips de la primera vuelta: el cielo de casa, las mismas nebulosas, ya en la tarjeta gráfica (sin descargar
// nada). Sin él un clip era un dibujo sobre negro, menos que un día normal en la galaxia.
import * as THREE from 'three';

// (Girado para que detrás de los soles queden las paredes violetas, no las de fuego, que les quitaban todo el protagonismo.)
const GIRO_CIELO = 2.3;
export function crearCieloClip(textura) {
  const uI = { value: 0 };
  const malla = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.ShaderMaterial({
    uniforms: { uCubo: { value: textura }, uI },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(modelViewMatrix) * position, 1.0); gl_Position = p.xyww; }',
    // (El clip se dibuja directo a pantalla, sin el paso de color de la escena: se devuelve a sRGB aquí.)
    // Sus nebulosas, muy bajas (tan cerca se leían como rocas), y estrellas nítidas de tamaño fijo, una por celda como mucho.
    fragmentShader: `precision highp float; uniform samplerCube uCubo; uniform float uI; varying vec3 vDir;
      float az(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      void main() {
        vec3 d = normalize(vDir) * 150.0, i = floor(d), f = d - i - 0.5;
        float h = az(i), radio = 0.06 + 0.07 * h * h;
        vec3 o = vec3(az(i + 3.1), az(i + 7.7), az(i + 11.3)) * 0.6 - 0.3;
        float e = step(0.84, h) * (1.0 - smoothstep(radio * 0.5, radio, length(f - o)));
        vec3 tinte = mix(vec3(1.0, 0.84, 0.82), vec3(0.86, 0.9, 1.0), az(i + 19.0));
        gl_FragColor = vec4(pow(textureCube(uCubo, vDir).rgb, vec3(0.4545)) * uI + tinte * e * (0.25 + 0.75 * h * h), 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, toneMapped: false
  }));
  malla.frustumCulled = false; malla.renderOrder = -1000;
  return { malla, fijar(k, giro) { uI.value = k; malla.rotation.y = giro + GIRO_CIELO; malla.rotation.x = giro * 0.4 + 0.9; }, liberar() { malla.parent?.remove(malla); malla.geometry.dispose(); malla.material.dispose(); } };
}
