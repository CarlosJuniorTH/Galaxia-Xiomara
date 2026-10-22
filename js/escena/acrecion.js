import * as THREE from 'three';
// Materia que cae, con velocidad angular creciente. El centro del agujero permanece fijo.
export function crearAcrecion({ radio, escala, uScale, uPR, cantidad = 800 }) {
  const p = new Float32Array(cantidad * 3);
  for (let i = 0; i < cantidad; i++) p.set([i * 2.399963, (i * 0.6180339) % 1, (i * 0.7548776) % 1], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p,3));
  return new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uScale, uPR, uRadio: { value: radio }, uEscala: { value: escala } },
    vertexShader: `uniform float uT,uScale,uPR,uRadio,uEscala; varying vec3 vC;varying float vA;
      void main(){float f=fract(position.y+uT*(0.025+position.z*0.018));float r=uRadio*mix(6.3,1.2,f*f);
        float a=position.x+f*f*14.0+uT*0.13;vec3 p=vec3(cos(a)*r,(position.z-0.5)*uRadio*0.12,sin(a)*r);
        vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
        vA=smoothstep(0.0,0.12,f)*(1.0-smoothstep(0.9,1.0,f))*0.75;
        vC=mix(vec3(1.0,0.28,0.055),vec3(1.0,0.9,0.65),f);
        float s=uRadio*0.027*uEscala*uScale/max(1.0,-mv.z);gl_PointSize=clamp(s,1.0,2.5*uPR);vA*=min(1.0,s);}`,
    fragmentShader: 'varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-0.5)*2.0;if(d>1.0)discard;float a=exp(-d*d*5.0)*(1.0-smoothstep(0.7,1.0,d))*vA;gl_FragColor=vec4(vC*a,a);}',
    transparent:true,premultipliedAlpha:true,depthWrite:false,blending:THREE.AdditiveBlending
  }));
}
