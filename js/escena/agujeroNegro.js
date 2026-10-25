// Agujero negro central: horizonte, anillo de fotones, halo, discos de acreción y chorros
import * as THREE from 'three';
import { materialPuntos, materialSombra } from './materiales.js';

function crearDisco(grupo, inner, outer, c1, c2, c3, op, rx) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uIn: { value: inner }, uOut: { value: outer },
      uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) }, uC3: { value: new THREE.Color(c3) }
    },
    vertexShader: `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: /* glsl */`
      uniform float uTime,uIn,uOut; uniform vec3 uC1,uC2,uC3; varying vec3 vP;
      float h(vec2 p){ vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      float rn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){
        float r=length(vP.xy); float t=clamp((r-uIn)/(uOut-uIn),0.,1.);
        vec3 c=t<.4?mix(uC1,uC2,t/.4):mix(uC2,uC3,(t-.4)/.6);
        float ang=atan(vP.y,vP.x);
        // Remolinos que giran más rápido cerca del centro
        float giro=ang*3.0+uTime*(1.4-t)*0.9;
        float remolino=rn(vec2(giro, r*0.06))*0.6+rn(vec2(giro*2.0, r*0.15))*0.4;
        float brillo=(1.-t)*(1.-t)*1.15+remolino*.35*(1.-t);
        float a=(1.-t)*(1.-t*t)*${op.toFixed(2)}*(0.7+remolino*0.6);
        gl_FragColor=vec4(c*brillo,clamp(a,0.,1.));
      }`,
    side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 256, 8), mat);
  m.rotation.x = rx;
  grupo.add(m);
  return mat;
}

function crearChorro(grupo, dir) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vU;varying float vCara;void main(){vU=uv;vec4 mv=modelViewMatrix*vec4(position,1.);
      vCara=abs(dot(normalize(normalMatrix*normal),normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vU; varying float vCara;
      void main(){
        // Haz suave: brilla en el eje y se desvanece hacia los bordes según el ángulo
        // de visión (antes dependía de la coordenada alrededor del cono y dibujaba un rectángulo).
        float largo=1.-vU.y;
        // Nace desvanecido: la base queda dentro del horizonte y no debe asomar como un saliente.
        float f=largo*largo*vCara*vCara*smoothstep(0.17,0.36,vU.y);
        float p=.6+.28*sin(uTime*3.8+vU.y*9.);
        vec3 c=mix(vec3(1.,.72,.88),vec3(.72,.0,.38),vU.y);
        gl_FragColor=vec4(c*p,f*0.32);
      }`,
    transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const m = new THREE.Mesh(new THREE.ConeGeometry(8, 225, 32, 1, true), mat);
  m.position.y = dir * 112;
  m.rotation.x = dir > 0 ? 0 : Math.PI;
  grupo.add(m);
  return mat;
}

export function crearAgujeroNegro({ scene, uScale, uPR }) {
  const grupo = new THREE.Group();
  scene.add(grupo);
  const mats = [];

  // Horizonte de eventos: esfera negra con prueba de profundidad normal (LessEqual) que SÍ
  // escribe su profundidad. Así tapa lo que está detrás (planetas, lugares) y queda tapada por
  // lo que está delante; antes usaba AlwaysDepth y se pintaba encima de cuerpos más cercanos.
  // El disco, el anillo de fotones y la luz curvada se dibujan después (orden 1).
  const horizonte = new THREE.Mesh(new THREE.SphereGeometry(42, 64, 64), materialSombra({ depthTest: true, depthFunc: THREE.LessEqualDepth, depthWrite: true }));
  horizonte.renderOrder = 0.5;
  grupo.add(horizonte);

  // Halo de borde
  const halo = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec3 vN;
      void main(){
        float rim=1.-max(dot(vN,vec3(0,0,1)),0.);
        rim=pow(rim,6.0); float p=0.85+0.1*sin(uTime*1.8);
        vec3 c=mix(vec3(.3,.04,.14),vec3(1.,.55,.78),rim)*rim*p;
        gl_FragColor=vec4(c*0.55,rim*0.22);
      }`,
    transparent: true, side: THREE.FrontSide, depthWrite: false, blending: THREE.AdditiveBlending
  });
  mats.push(halo);
  grupo.add(new THREE.Mesh(new THREE.SphereGeometry(47, 64, 64), halo));

  // Anillo de fotones: una línea de luz fina que siempre mira a la cámara
  const anilloMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCanto: { value: 0 } },
    vertexShader: `varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: /* glsl */`
      uniform float uTime, uCanto; varying vec2 vP;
      void main(){
        float r=length(vP);
        // Lente gravitatoria: visto de canto, la parte del disco que queda DETRÁS del
        // agujero se ve curvada por encima (y, más tenue, por debajo) de la sombra.
        float dlen=(r-54.0)/10.0, arriba=step(0.0,vP.y);
        float vertical=pow(abs(vP.y)/max(r,1.0),0.9);
        float lente=exp(-dlen*dlen)*vertical*uCanto*mix(0.55,1.0,arriba);
        float grano=0.94+0.06*sin(atan(vP.y,vP.x)*9.0-uTime*1.2);
        // x*x en lugar de pow(x, 2.0): pow con base negativa no está definido en GLSL
        // y en algunas GPU devuelve NaN en el interior del anillo.
        float dl=(r-44.5)*0.55, ds=(r-46.0)*0.12;
        float linea=exp(-dl*dl);
        float suave=exp(-ds*ds)*0.35;
        float ang=atan(vP.y,vP.x);
        float doppler=0.75+0.25*sin(ang+uTime*0.6);   // un lado más brillante, como en las fotos reales
        vec3 c=mix(vec3(1.0,0.55,0.78),vec3(1.0,0.95,0.97),linea);
        vec3 cl=mix(vec3(1.0,0.62,0.82),vec3(1.0,0.92,0.95),exp(-dlen*dlen*3.0))*lente*grano*2.1;
        float a=(linea+suave)*doppler;
        gl_FragColor=vec4(c*a+cl,max(a,lente));
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  });
  mats.push(anilloMat);
  const anillo = new THREE.Mesh(new THREE.RingGeometry(42.5, 82, 160, 2), anilloMat);
  grupo.add(anillo);

  // Discos de acreción
  mats.push(
    crearDisco(grupo, 48, 165, '#FFE6F1', '#FFB8D8', '#880044', 0.50, Math.PI / 2),
    crearDisco(grupo, 56, 132, '#FFD6E8', '#E8508A', '#3D001A', 0.26, Math.PI / 2),
    crearDisco(grupo, 165, 295, '#FF8CB8', '#AA0050', '#000000', 0.16, Math.PI / 2),
    crearChorro(grupo, 1),
    crearChorro(grupo, -1)
  );

  // Materia que cae en espiral hacia el horizonte: cada partícula recorre su ciclo,
  // gira más rápido y se calienta (rosa → blanco) al acercarse, y se desvanece al
  // cruzarlo. El movimiento se calcula en la GPU (antes, CPU y subida de búfer por cuadro).
  const pN = 900, pBuf = new Float32Array(pN * 3), colores = new Float32Array(pN * 3), tamanos = new Float32Array(pN), fases = new Float32Array(pN);
  const rosa = new THREE.Color(0xffb0d0);
  for (let i = 0; i < pN; i++) {
    const a = Math.random() * Math.PI * 2;
    pBuf[i * 3] = a; pBuf[i * 3 + 1] = (Math.random() - 0.5) * 7; pBuf[i * 3 + 2] = Math.random();   // ángulo, altura, carril
    rosa.toArray(colores, i * 3); tamanos[i] = 1.6 + Math.random() * 1.6; fases[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pBuf, 3));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(colores, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(tamanos, 1));
  pGeo.setAttribute('aPhase', new THREE.BufferAttribute(fases, 1));
  const matOrbital = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale, uPR, uMaximo: { value: 3 } },
    vertexShader: /* glsl */`
      attribute vec3 aColor; attribute float aSize, aPhase;
      uniform float uTime, uScale, uPR, uMaximo;
      varying vec3 vC; varying float vA;
      void main(){
        float f = fract(uTime * (0.022 + aPhase * 0.018) + aPhase * 7.0);   // 0: borde exterior → 1: horizonte
        float r = mix(262.0, 47.0, pow(f, 0.75)) + position.z * 18.0 * (1.0 - f);
        float ang = position.x + f * 9.0 + uTime * (0.25 + 40.0 / r);       // más rápido cerca del centro
        vec3 p = vec3(cos(ang) * r, position.y * (1.0 - f * 0.8), sin(ang) * r);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float prof = max(0.1, -mv.z), s = aSize * (1.0 + f) * uScale / prof;
        gl_PointSize = clamp(s, 1.0, uMaximo * uPR);
        vC = mix(aColor, vec3(1.0, 0.95, 0.98), f * f) * (0.7 + f * 0.9);
        vA = smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.9, 1.0, f)) * clamp(s, 0.0, 1.0) * smoothstep(18.0, 85.0, prof);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = pow(max(1.0 - d * 2.0, 0.0), 1.6);
        gl_FragColor = vec4(vC * a, a * vA);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  mats.push(matOrbital);
  const puntos = new THREE.Points(pGeo, matOrbital);
  puntos.frustumCulled = false;
  grupo.add(puntos);

  for (const hijo of grupo.children) if (hijo !== horizonte) hijo.renderOrder = 1;
  const luz = new THREE.PointLight(0xff70b0, 2.8, 430);
  grupo.add(luz);
  scene.add(new THREE.AmbientLight(0xffe8f8, 0.28));

  return {
    actualizar(t, dt, { camera, pulso }) {
      const visible = THREE.MathUtils.smoothstep(30000 / Math.max(1,camera.position.length()),0,1);
      for (const o of grupo.children) o.visible = o === luz || visible > 0.03;
      for (const m of mats) m.uniforms.uTime.value = t;
      anillo.quaternion.copy(camera.quaternion);
      // De canto (cámara en el plano del disco) la imagen curvada se ve entera; desde arriba, nada.
      const elevacion = Math.abs(camera.position.y - grupo.position.y) / Math.max(1, camera.position.distanceTo(grupo.position));
      anilloMat.uniforms.uCanto.value = Math.pow(1 - Math.min(1, elevacion / 0.6), 1.5);
      luz.intensity = 2.5 + Math.sin(t * 2.8) * 0.55 + pulso * 2;
    }
  };
}
