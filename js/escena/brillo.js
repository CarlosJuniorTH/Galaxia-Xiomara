import { ShaderMaterial, Vector2, Vector4 } from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { nucleoGaussiano } from '../util/gaussiano.js';
import { fijarZona, zonaProporcional, zonaDe, GLSL_ZONA } from './zona.js';
import { LIMITE_HDR } from './salida.js';

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
    // Filtro de brillo: lee la escena dentro de su zona (zona.js), sin valores no válidos y con el tope del HDR.
    this.highPassUniforms.uZona = { value: new Vector4(1, 1, 1, 1) };
    this.materialHighPassFilter.fragmentShader = this.materialHighPassFilter.fragmentShader
      .replace('varying vec2 vUv;', `varying vec2 vUv; uniform vec4 uZona; ${GLSL_ZONA}`)
      .replace('vec4 texel = texture2D( tDiffuse, vUv );', `vec4 texel = min( max( texture2D( tDiffuse, enZona( vUv, uZona ) ), vec4( 0.0 ) ), vec4( ${LIMITE_HDR.toFixed(1)} ) );`);
  }

  // escala: fracción del búfer de la escena a la que se calcula el primer nivel (UnrealBloomPass usa ½). Con ¼ cuesta
  // la cuarta parte y, como es una luz muy difuminada, se ve igual (index/nucleo.js lo eligen según el aparato).
  setSize(width, height) { super.setSize(Math.max(2, Math.round(width * (this.escalaBrillo ?? 0.5) * 2)), Math.max(2, Math.round(height * (this.escalaBrillo ?? 0.5) * 2))); }

  getSeperableBlurMaterial(radio) {
    const { pesos, pares, total } = nucleoGaussiano(radio);
    const numero = n => n.toPrecision(12);
    // Dentro de la zona: hacia abajo/izquierda basta el borde de la textura; hacia arriba/derecha, el de la zona.
    const suma = (distancia, peso) => `suma += (texture2D(colorTexture, min(uv + paso * ${numero(distancia)}, uZona.zw)).rgb + texture2D(colorTexture, uv - paso * ${numero(distancia)}).rgb) * ${numero(peso)};`;
    return new ShaderMaterial({
      uniforms: { colorTexture: { value: null }, invSize: { value: new Vector2() }, direction: { value: new Vector2() }, uZona: { value: new Vector4(1, 1, 1, 1) } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D colorTexture;
        uniform vec2 invSize, direction;
        uniform vec4 uZona;
        void main() {
          vec2 paso = invSize * direction, uv = min(vUv * uZona.xy, uZona.zw);
          vec3 suma = texture2D(colorTexture, uv).rgb * ${numero(pesos[0])};
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

  // La composición de los niveles, cada uno leído dentro de su zona.
  getCompositeMaterial(nMips) {
    const m = super.getCompositeMaterial(nMips);
    for (let i = 1; i <= 5; i++) m.uniforms['uZona' + i] = { value: new Vector4(1, 1, 1, 1) };
    m.fragmentShader = m.fragmentShader
      .replace('uniform float bloomStrength;', `uniform float bloomStrength; uniform vec4 uZona1, uZona2, uZona3, uZona4, uZona5; ${GLSL_ZONA}`)
      .replace(/texture2D\(blurTexture(\d), vUv\)/g, 'texture2D(blurTexture$1, enZona(vUv, uZona$1))');
    return m;
  }

  // Igual que UnrealBloomPass.render, pero: cada búfer se dibuja en la zona que corresponde a la de la escena (la
  // resolución dinámica no reasigna nada) y sin la última pasada de mezcla, que con colorWrite = false no pintaba nada
  // pero cargaba y guardaba el búfer de la escena entero en cada cuadro (la pasada de salida ya suma el resplandor).
  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    renderer.getClearColor(this._oldClearColor);
    this.oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(this.clearColor, 0);
    if (maskActive) renderer.state.buffers.stencil.setTest(false);

    zonaProporcional(this.renderTargetBright, readBuffer);
    zonaDe(readBuffer, this.highPassUniforms.uZona.value);
    this.highPassUniforms.tDiffuse.value = readBuffer.texture;
    this.highPassUniforms.luminosityThreshold.value = this.threshold;
    this.fsQuad.material = this.materialHighPassFilter;
    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    this.fsQuad.render(renderer);

    let entrada = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i++) {
      const mat = this.separableBlurMaterials[i], h = this.renderTargetsHorizontal[i], v = this.renderTargetsVertical[i];
      zonaProporcional(h, readBuffer); fijarZona(v, h.viewport.z, h.viewport.w);
      this.fsQuad.material = mat;
      mat.uniforms.colorTexture.value = entrada.texture; zonaDe(entrada, mat.uniforms.uZona.value);
      mat.uniforms.direction.value = UnrealBloomPass.BlurDirectionX;
      renderer.setRenderTarget(h); renderer.clear(); this.fsQuad.render(renderer);
      mat.uniforms.colorTexture.value = h.texture; zonaDe(h, mat.uniforms.uZona.value);
      mat.uniforms.direction.value = UnrealBloomPass.BlurDirectionY;
      renderer.setRenderTarget(v); renderer.clear(); this.fsQuad.render(renderer);
      entrada = v;
    }

    const c = this.compositeMaterial.uniforms;
    for (let i = 0; i < this.nMips; i++) zonaDe(this.renderTargetsVertical[i], c['uZona' + (i + 1)].value);
    this.fsQuad.material = this.compositeMaterial;
    c.bloomStrength.value = this.strength;
    c.bloomRadius.value = this.radius;
    c.bloomTintColors.value = this.bloomTintColors;
    renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
    renderer.clear();
    this.fsQuad.render(renderer);

    if (maskActive) renderer.state.buffers.stencil.setTest(true);
    renderer.setClearColor(this._oldClearColor, this.oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }
}
