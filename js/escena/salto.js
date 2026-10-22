// Se conserva la interfaz del compositor. El movimiento se dibuja con estelas
// geométricas en velocidad.js; esta pasada solo atenúa la periferia de la ceremonia.
import { Vector2 } from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
export function crearPasadaSalto() {
  const pasada = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uFuerza: { value: 0 }, uFlash: { value: 0 }, uPenumbra: { value: 0 }, uCentro: { value: new Vector2(0.5, 0.5) }, uAspecto: { value: 1 }, uOnda: { value: 2 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uAspecto,uPenumbra; uniform vec2 uCentro; varying vec2 vUv;
      void main(){float r=length((vUv-uCentro)*vec2(uAspecto,1.0));
        gl_FragColor=vec4(texture2D(tDiffuse,vUv).rgb*(1.0-uPenumbra*smoothstep(0.12,0.65,r)),1.0);
      }`
  });
  pasada.enabled = false; return pasada;
}
