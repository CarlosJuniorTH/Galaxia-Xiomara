import { ShaderMaterial, Vector2 } from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { nucleoGaussiano } from '../util/gaussiano.js';

export class BrilloEficiente extends UnrealBloomPass {
  constructor(...args) {
    super(...args);
    // Estas once superficies solo contienen color. La escena principal sí
    // conserva su profundidad para ocultar correctamente planetas y estrellas.
    for (const rt of [this.renderTargetBright, ...this.renderTargetsHorizontal, ...this.renderTargetsVertical]) {
      rt.depthBuffer = false;
      rt.stencilBuffer = false;
    }
    for (const mat of [this.materialHighPassFilter, ...this.separableBlurMaterials, this.compositeMaterial]) {
      mat.depthTest = false;
      mat.depthWrite = false;
    }
  }

  getSeperableBlurMaterial(radio) {
    const { pesos, pares, total } = nucleoGaussiano(radio);
    const numero = n => n.toPrecision(12);
    const suma = (distancia, peso) => `suma += (texture2D(colorTexture, vUv + paso * ${numero(distancia)}).rgb + texture2D(colorTexture, vUv - paso * ${numero(distancia)}).rgb) * ${numero(peso)};`;
    return new ShaderMaterial({
      uniforms: { colorTexture: { value: null }, invSize: { value: new Vector2() }, direction: { value: new Vector2() } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D colorTexture;
        uniform vec2 invSize, direction;
        void main() {
          vec2 paso = invSize * direction;
          vec3 suma = texture2D(colorTexture, vUv).rgb * ${numero(pesos[0])};
          // La pasada horizontal también reduce cada mip: sus muestras NO
          // son contiguas en la entrada. Solo agrupamos la pasada vertical,
          // cuya entrada tiene exactamente la resolución de salida.
          if (direction.y > 0.5) {
            ${pares.map(p => suma(p.distancia, p.peso)).join('\n')}
          } else {
            ${pesos.slice(1).map((p, i) => suma(i + 1, p)).join('\n')}
          }
          gl_FragColor = vec4(suma / ${numero(total)}, 1.0);
        }`
    });
  }
}
