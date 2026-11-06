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
    fragmentShader: 'uniform samplerCube uCubo; uniform float uI; varying vec3 vDir; void main(){ gl_FragColor = vec4(pow(textureCube(uCubo, vDir).rgb, vec3(0.4545)) * uI, 1.0); }',
    side: THREE.BackSide, depthWrite: false, depthTest: false, toneMapped: false
  }));
  malla.frustumCulled = false; malla.renderOrder = -1000;
  return { malla, fijar(k, giro) { uI.value = k; malla.rotation.y = giro + GIRO_CIELO; malla.rotation.x = giro * 0.4 + 0.9; }, liberar() { malla.parent?.remove(malla); malla.geometry.dispose(); malla.material.dispose(); } };
}
