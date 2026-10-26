// De tanta luz, nacimos nosotros: estrella → encuentro → silencio → expansión →
// nebulosa de corazón persistente. Los puntos se transforman en la GPU y las
// texturas aditivas tienen fondo negro opaco para evitar artefactos en Safari.
import * as THREE from 'three';
import { deUnTiron } from '../util/azarSemilla.js';
import { EXPOSICION } from './exposicion.js';
import { crearNube } from './nube.js';
import { RADIO_REMANENTE_SUPERNOVA, PROGENITORA_RELATIVA as P } from '../data/escalaCosmica.js';
import { crearRuido } from '../util/ruido.js';
import { puntoCorazon, puntoCorazonVolumen, faseSupernova, TIEMPOS_AMOR, faltaAnimacion, desdeAnimacion, latidoCancion, respiracionCancion, colapsoCancion, edadCapa, cantoCancion } from '../util/supernovaAmor.js';
import { texBrillo, texDestello, texEstrellaGigante } from './texturas.js';

const RUIDO = /* glsl */`
  float h3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  float rn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm3(vec3 p){ return rn3(p) * 0.5 + rn3(p * 2.03 + 1.7) * 0.28 + rn3(p * 4.1 + 3.1) * 0.14 + rn3(p * 8.3 + 5.3) * 0.08; }`;

const sprite = (mapa, color, tam, opacidad) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mapa, color, transparent: true, opacity: opacidad, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(tam); return s;
};
const aditivo = (uniforms, vertexShader, fragmentShader, extra = {}) => new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, premultipliedAlpha: true, depthWrite: false, blending: THREE.AdditiveBlending, ...extra });

// Propagación (unidades locales del grupo): la onda de material se frena; la luz (el eco), no.
export const radioOnda = e => 60 + 1900 * (1 - Math.exp(-e / 2.4));
export const ECO = Object.freeze({ plano: 6000, inicio: 120, velocidad: 900 });
export const radioEco = e => ECO.inicio + ECO.velocidad * e;

// De un tirón; la carga usa construirSupernova, el mismo código como generador (yield entre pasos: ver porTramos).
export const crearSupernova = (...a) => deUnTiron(construirSupernova(...a));
export function* construirSupernova({ uScale, uPR, escala }) {
  const grupo = new THREE.Group();
  const brillo = texBrillo(), destello = texDestello(), rayosTex = texEstrellaGigante();
  const R = 110;   // radio de la estrella (espacio de diseño)

  yield;
  // ── La estrella: superficie azul blanca hirviendo, con oscurecimiento al borde ──
  const progenitora = new THREE.Group(); grupo.add(progenitora);
  const superficie = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uAgita: { value: 0 }, uLatido: { value: 0 }, uColapso: { value: 0 }, uPellizco: { value: 0 } },
    vertexShader: RUIDO + 'uniform float uT,uAgita,uPellizco; varying vec3 vN, vP; void main(){vP=position;vN=normalize(normalMatrix*normal);float relieve=1.0+(fbm3(normal*7.0+uT*0.04)-0.5)*(0.1+uAgita*0.12);vec3 p=position*relieve;float xn=p.x/110.0;p.x*=1.0+uPellizco*0.25;p.y*=1.0-uPellizco*0.9*exp(-xn*xn*4.0);p.z*=1.0-uPellizco*0.6*exp(-xn*xn*4.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
    fragmentShader: RUIDO + /* glsl */`
      uniform float uT, uAgita, uLatido, uColapso; varying vec3 vN, vP;
      void main(){
        vec3 q = normalize(vP);
        // Supergigante roja: pocas celdas de convección gigantes (como Betelgeuse) y granulación fina.
        float celda = fbm3(q * 3.2 + uT * (0.012 + uAgita * 0.05)), gran = fbm3(q * 13.0 + uT * (0.05 + uAgita * 0.15)), mu = max(dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0);
        float calor = smoothstep(0.3, 0.8, celda * 0.62 + gran * 0.38);
        vec3 col = mix(vec3(0.55, 0.06, 0.02), vec3(1.0, 0.62, 0.26), calor);
        col = mix(col, vec3(1.0, 0.86, 0.6), smoothstep(0.78, 0.95, calor) * 0.6);
        col *= 0.16 + 0.95 * pow(mu, 0.8);   // oscurecimiento al borde
        col += vec3(1.0, 0.85, 0.7) * smoothstep(0.72, 0.9, gran) * uAgita * 0.8;   // erupciones al volverse inestable
        // Cada latido la enciende y la calienta (rojo → naranja → blanco); al colapsar se vuelve
        // blanca azulada y se apaga un instante.
        col *= 1.0 + uLatido * (0.9 + uAgita * 1.4);
        col = mix(col, vec3(1.0, 0.92, 0.8) * (0.3 + 0.9 * pow(mu, 0.6)), uLatido * uAgita * 0.45);
        col = mix(col, vec3(1.0, 0.25, 0.08) * (0.5 + pow(mu, 0.5)) * 1.6, uColapso);   // sigue roja y se enciende al contraerse
        gl_FragColor = vec4(col * (1.1 + uAgita * 0.7), 1.0); }`
  }));
  progenitora.add(superficie);
  const corona = sprite(brillo, '#ffad62', R * 4, 0.3), halo = sprite(brillo, '#d95f3b', R * 9, 0.08), rayos = sprite(rayosTex, '#ffd8aa', R * 12, 0.16);
  progenitora.add(halo, corona, rayos);
  yield;
  // Prominencias irregulares ancladas a la superficie, no dos globos huecos.
  const plasma = new THREE.Group(); progenitora.add(plasma);
  const materialPlasma=aditivo({uT:{value:0},uLuz:{value:1}},
    'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    `uniform float uT,uLuz;varying vec2 vUv;void main(){
      float curso=pow(0.5+0.5*sin(vUv.x*19.0-uT*1.4),3.0);
      float borde=pow(0.5+0.5*cos(vUv.y*6.283),2.0);
      float a=sin(vUv.x*3.14159)*borde*(0.18+curso*0.55)*uLuz;
      gl_FragColor=vec4(mix(vec3(1.0,0.15,0.025),vec3(1.0,0.73,0.32),curso)*a,a);
    }`,{side:THREE.DoubleSide});
  for(let i=0;i<11;i++){
    const a=i*2.39996,altura=-0.8+(i%7)/6*1.6;
    const base=new THREE.Vector3(Math.cos(a)*Math.sqrt(1-altura*altura),altura,Math.sin(a)*Math.sqrt(1-altura*altura));
    const tangente=new THREE.Vector3().crossVectors(base,new THREE.Vector3(0.1,1,0.2)).normalize();
    const puntos=Array.from({length:33},(_,j)=>{
      const t=j/32,radio=R*(1+Math.sin(t*Math.PI)*(0.45+(i%4)*0.16));
      return base.clone().multiplyScalar(radio).addScaledVector(tangente,(t-0.5)*R*(0.5+i%3*0.15)).add(new THREE.Vector3(Math.sin(t*9+i),Math.cos(t*7+i),Math.sin(t*8)).multiplyScalar(R*0.045));
    });
    plasma.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos),48,2.5+i%3,5,false),materialPlasma));
  }

  yield;
  // ── De tanta luz, nacimos nosotros ──
  // La misma materia primero se expande y después encuentra su lugar en un corazón.
  // Dos lotes de puntos y seis cintas, sin añadir objetos por cada partícula.
  const explosion = new THREE.Group(), corazon = new THREE.Group();
  explosion.visible = false; grupo.add(explosion); explosion.add(corazon);
  const uE = { value: 0 }, uT = { value: 0 }, uCanto = { value: 0 };   // uCanto: la nota larga que se sostiene (la luz la sigue)
  const n = 7600;
  let semilla = 180125;
  const azar = () => { semilla = (Math.imul(1664525, semilla) + 1013904223) >>> 0; return semilla / 4294967296; };
  function* polvo(cantidad, exterior) {
    const posiciones = new Float32Array(cantidad * 3), salidas = new Float32Array(cantidad * 3), datos = new Float32Array(cantidad * 3);
    for (let i = 0; i < cantidad; i++) {
      if (i % 1000 === 999) yield;
      const a = azar() * Math.PI * 2, r = exterior ? 0.92 + azar() * 0.14 : Math.cbrt(azar()) * 0.94;
      const z = azar()*2-1;
      const p = puntoCorazonVolumen(a,z,r,0);
      p[0] += (azar() - 0.5) * 32; p[1] += (azar() - 0.5) * 32;
      posiciones.set(p, i * 3);
      const phi = azar() * Math.PI * 2, h = azar() * 2 - 1, v = Math.sqrt(1 - h * h);
      salidas.set([Math.cos(phi) * v, h, Math.sin(phi) * v], i * 3);
      datos.set([azar(), azar(), azar()], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geo.setAttribute('aSalida', new THREE.BufferAttribute(salidas, 3));
    geo.setAttribute('aDato', new THREE.BufferAttribute(datos, 3));
    const mat = aditivo({ uE, uT, uScale, uPR, uCanto }, /* glsl */`
      attribute vec3 aSalida, aDato; uniform float uE, uT, uScale, uPR, uCanto;
      varying vec3 vColor; varying float vA;
      ${RUIDO}
      void main(){
        float forma = smoothstep(4.0, 16.0, uE);
        // Dedos de Rayleigh-Taylor: la materia sale en grumos y columnas, no en una esfera lisa.
        float dedo = fbm3(aSalida * 3.1 + 4.0), grumo = pow(smoothstep(0.35, 0.75, dedo), 1.5);
        float radio = 120.0 + 1250.0 * (1.0 - exp(-uE / 2.2));
        vec3 salida = aSalida * radio * (0.5 + grumo * 0.55 + aDato.x * 0.22);
        salida.y *= 1.08;   // algo bipolar, como las de verdad
        vec3 p = mix(salida, position, forma);
        float movimiento = sin(uT * 0.22 + aDato.x * 6.283) * 8.0;
        p += vec3(movimiento, cos(uT * 0.17 + aDato.y * 6.283) * 6.0, movimiento * 0.6) * forma;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        vec3 rosa = mix(vec3(0.72, 0.12, 0.32), vec3(1.0, 0.49, 0.66), aDato.y);
        vColor = mix(rosa, vec3(1.0, 0.77, 0.46), smoothstep(0.72, 1.0, aDato.y));
        // Elementos del remanente: algunos filamentos verdes de oxígeno y dorados de azufre.
        vColor = mix(vColor, vec3(0.55, 0.78, 1.0), step(aDato.y, 0.14) * 0.85);   // chispas azules entre el rosa y el dorado
        // Temperatura de la eyecta: azul blanca al salir, amarilla, naranja y roja al enfriarse.
        vec3 caliente = mix(vec3(0.78, 0.86, 1.0), vec3(1.0, 0.9, 0.68), smoothstep(0.2, 1.4, uE));
        caliente = mix(caliente, vec3(1.0, 0.5, 0.2), smoothstep(1.4, 3.5, uE));
        vColor = mix(caliente * (1.0 + grumo * 0.6), vColor, smoothstep(3.0, 9.0, uE));
        vA = smoothstep(0.0, 1.0, uE) * (0.48 + 0.09 * sin(uT * 0.22 + aDato.z * 6.283)) * (1.0 + 4.5 * (1.0 - forma) * smoothstep(1.0, 3.5, uE));   // en vuelo, chispas vivas que se ven contra el fondo
        float px = (12.0 + aDato.z * 14.0) * ${escala.toFixed(3)} * uScale / max(1.0, -mv.z);
        gl_PointSize = clamp(px, 1.5 * uPR * (1.0 - forma) + 1.0 * forma, 3.2 * uPR);
        vA *= min(1.0, px * px) * (1.0 + 0.45 * uCanto);   // con la voz sostenida, más luz
      }`, /* glsl */`
      varying vec3 vColor; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if(d > 1.0) discard;
        float a = (1.0 - smoothstep(0.55, 1.0, d)) * vA * 0.75;   // motas nítidas, sin borde difuso
        gl_FragColor = vec4(vColor * a * ${exterior ? '1.6' : '0.8'}, a); }`);
    const puntos = new THREE.Points(geo, mat); puntos.frustumCulled = false; corazon.add(puntos);
  }
  yield* polvo(n, true); yield* polvo(Math.round(n * 0.6), false);
  yield;
  // Caja de la figura final (espacio del corazón): la cámara la encuadra entera.
  const cajaCorazon = new THREE.Box3();
  for (const o of corazon.children) { o.geometry.computeBoundingBox(); cajaCorazon.union(o.geometry.boundingBox); }

  yield;
  // Filamentos con espesor real: el corazón conserva volumen al rodearlo.
  for (let i = 0; i < 10; i++) {
    yield;
    const radio = 0.9 + (i%3) * 0.055;
    const curva = new THREE.CatmullRomCurve3(Array.from({ length: 129 }, (_, j) => {
      const a = j / 128 * Math.PI * 2, p = puntoCorazonVolumen(a, (i/9-0.5)*1.55 + Math.sin(a*2+i)*0.08, radio, i*0.7);
      return new THREE.Vector3(...p);
    }), true);
    const cinta = new THREE.Mesh(new THREE.TubeGeometry(curva, 256, 9 + i%3 * 3, 8, true), aditivo({ uE, uT, uCanto, uSemilla: { value: i } },
      'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', /* glsl */`
      varying vec2 vUv; uniform float uE, uT, uSemilla, uCanto;
      void main(){
        // Las líneas del corazón se dibujan con la materia de la explosión: avanzan a lo largo del contorno,
        // con una cabeza brillante, en vez de aparecer de golpe.
        float avance = smoothstep(4.0, 15.0, uE) * 1.15, frente = fract(vUv.x + uSemilla * 0.13);
        float tejido = smoothstep(frente, frente + 0.06, avance) * smoothstep(4.0, 6.0, uE);
        float cabeza = exp(-pow((frente - avance + 0.03) * 30.0, 2.0)) * step(avance, 1.05) * 2.0;
        float hilo = pow(0.5 + 0.5 * cos(vUv.y * 6.283), 2.0);
        // De lejos el hilo es más fino que un píxel: se promedia (sin líneas temblorosas ni pixeladas).
        float aa = 1.0 - smoothstep(0.4, 1.6, fwidth(vUv.x * 113.0));
        float fil = mix(0.31, pow(0.5 + 0.5 * sin(vUv.x * 113.0 + uSemilla * 7.0 - uT * 0.12), 3.0), aa) * mix(0.45, 1.0, aa);
        // Rosa, dorado y chispas de azul a lo largo de cada hilo; un brillo que recorre el corazón.
        vec3 col = mix(vec3(1.0, 0.32, 0.55), vec3(1.0, 0.74, 0.45), 0.5 + 0.5 * sin(vUv.x * 6.283 + uSemilla));
        col = mix(col, vec3(0.6, 0.78, 1.0), pow(0.5 + 0.5 * sin(vUv.x * 18.85 + uSemilla * 2.3), 8.0) * 0.6);
        col *= 1.0 + 0.5 * exp(-pow(fract(vUv.x - uT * 0.025 + uSemilla * 0.1) * 6.0 - 3.0, 2.0));
        float a = hilo * (fil * tejido * 0.48 + cabeza * 0.4 * smoothstep(4.0, 6.0, uE)) * (1.0 + 0.5 * uCanto);
        gl_FragColor = vec4(col * a, a);
      }`, { side: THREE.DoubleSide }));
    corazon.add(cinta);
  }

  yield;
  // Gas continuo tenue dentro de la figura: fondo opaco en la textura aditiva,
  // sin los alfas diminutos que causaban puntos de color en Safari.
  const ladoGas = 256, datosGas = new Uint8Array(ladoGas * ladoGas * 4);
  const { fbm } = crearRuido(1801);
  for(let y=0;y<ladoGas;y++)for(let x=0;x<ladoGas;x++){
    if (x === 0 && (y & 15) === 15) yield;
    const u=x/ladoGas*2-1,v=y/ladoGas*2-1;
    const giro=fbm(u*2+7,v*2,1,3),desvio=fbm(u*2,v*2+9,2,3);
    const qx=u+(giro-0.5)*0.65,qy=v+(desvio-0.5)*0.65;
    const n=fbm(qx*4,qy*4,3,4),detalle=fbm(qx*15,qy*15,8,3);
    const filamento=Math.exp(-Math.pow((n-0.55)/0.045,2));
    const gasLuz=0.14+n*n*0.5+filamento*(0.3+detalle*0.55);
    const oro=Math.max(0,Math.min(1,(desvio-0.48)*4));
    const k=(y*ladoGas+x)*4;
    datosGas[k]=Math.min(255,gasLuz*210);
    datosGas[k+1]=Math.min(255,gasLuz*(28+oro*90));
    datosGas[k+2]=Math.min(255,gasLuz*(98-oro*40)); datosGas[k+3]=255;
  }
  const gasTex = new THREE.DataTexture(datosGas,ladoGas,ladoGas,THREE.RGBAFormat);
  gasTex.flipY=true;gasTex.minFilter=THREE.LinearMipmapLinearFilter;gasTex.magFilter=THREE.LinearFilter;gasTex.generateMipmaps=true;gasTex.needsUpdate=true;
  const gas = crearNube(gasTex, new THREE.Vector3(0, 0, -40), 1800, 1801, escala, 7, { corazon: true }); gas.rotation.set(0, 0, 0); corazon.add(gas); gas.userData.brilloPropio = true;
  yield;
  // Dos estrellas que siguen juntas en el corazón: una gigante azul (más masiva, más grande y
  // brillante) y una enana roja pequeña. Giran alrededor de su centro de masas en el plano del
  // corazón (la azul describe una órbita menor), sin acercarse ni alejarse de quien mira.
  const centroCorazon = cajaCorazon.getCenter(new THREE.Vector3()).setZ(0);
  const parejas = [['#9fc4ff', 300, 110, 0.95, 70], ['#ff8fc8', 300, 110, 0.95, 175]].map(([color, halo, nucleo, op, orbita]) => {
    const p = new THREE.Group(); p.add(sprite(destello, color, nucleo * 0.7, op)); p.userData.orbita = orbita; corazon.add(p); return p;   // (sin el halo difuso de antes)
  });
  yield;
  // Antes de estallar, la estrella late y cada latido lanza una onda de gas que se aleja de su
  // superficie (pulsaciones cada vez más rápidas e intensas).
  // Pérdida de masa en las pulsaciones previas: no son cáscaras lisas sino eyecta de plasma
  // rota en grumos y jirones (inestabilidades), con huecos que se abren al expandirse. El ruido
  // está anclado a la cáscara (no a la vista) y cada pulso nace con otra orientación. Un medio
  // ópticamente delgado se ve más brillante en el limbo, pero aquí sin anillo continuo.
  // (Antes eran esferas translúcidas: «humo». Ahora cada capa es una cáscara de motas nítidas de 1,5–3 px, rota en
  // grumos y filamentos por el mismo ruido, que se expande y se enfría.)
  const pulsos = [0, 1, 2].map(k => {
    const nP = 1400, pos = new Float32Array(nP * 3), dat = new Float32Array(nP * 2);
    for (let i = 0; i < nP; i++) {
      const y = 1 - 2 * (i + 0.5) / nP, r = Math.sqrt(1 - y * y), a = i * 2.39996 + k * 1.7;
      const j = 1 + (azar() - 0.5) * 0.06;   // un poco de espesor
      pos.set([Math.cos(a) * r * j, y * j, Math.sin(a) * r * j], i * 3); dat.set([azar(), azar()], i * 2);
    }
    const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gP.setAttribute('aDato', new THREE.BufferAttribute(dat, 2));
    const m = new THREE.Points(gP, aditivo({ uA: { value: 0 }, uF: { value: 0 }, uS: { value: k * 7.3 }, uPR },
      RUIDO + `attribute vec2 aDato; uniform float uA,uF,uS,uPR; varying vec3 vC; varying float vA;
      void main(){
        float n=fbm3(position*2.6+uS), fino=rn3(position*9.0-uS*1.3);
        float grumo=smoothstep(0.42+uF*0.16,0.62+uF*0.12,n)*(0.45+0.55*fino);   // se fragmenta al expandirse
        vA=grumo*uA*(0.55+0.9*aDato.x);
        vC=mix(vec3(1.0,0.62,0.36),vec3(0.85,0.24,0.16),uF);   // se enfría: de naranja a rojo
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        gl_PointSize=vA<0.004 ? 0.0 : (1.5+1.5*aDato.y)*uPR;
      }`,
      `varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0) discard; float a=vA*(1.0-smoothstep(0.6,1.0,d)); gl_FragColor=vec4(vC*a*2.8,a); }`));
    m.visible = false; m.userData.f = 1; progenitora.add(m); return m;
  });
  let fasePulso = 0, faseLatido = 0, faseGiro = 0;
  yield;
  // Las dos estrellitas (azul y rosa) que nacen del colapso: giran en órbita, se acercan en espiral y,
  // al juntarse, estalla todo. Cada una con su estela.
  const NE = 48, dos = [['#8fbaff', '#d8e8ff'], ['#ff7fbf', '#ffd2ea']].map(([c, c2]) => {
    const g = new THREE.Group(); g.visible = false; grupo.add(g);
    const nucleo = sprite(destello, c2, 1, 1), luz = sprite(brillo, c, 1, 0.8); g.add(luz, nucleo);
    const pos = new Float32Array(NE * 3), edad = new Float32Array(NE); for (let i = 0; i < NE; i++) edad[i] = i / NE;
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ge.setAttribute('aEdad', new THREE.BufferAttribute(edad, 1));
    const estela = new THREE.Points(ge, aditivo({ uC: { value: new THREE.Color(c) }, uPR, uTam: { value: 1 }, uScale, uVis: { value: 0 } },
      'attribute float aEdad; uniform float uPR, uTam, uScale; varying float vE; void main(){ vE = aEdad; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uTam * (1.0 - aEdad) * uScale / max(1.0, -mv.z), 1.0, 40.0 * uPR); }',
      'uniform vec3 uC; uniform float uVis; varying float vE; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = exp(-d * d * 4.0) * pow(1.0 - vE, 1.5) * uVis; gl_FragColor = vec4(uC * a, a); }'));
    estela.frustumCulled = false; grupo.add(estela);
    return { g, nucleo, luz, estela, pos, hist: [] };
  });
  const destelloGrande = sprite(destello, '#eef3ff', 1, 0), luzGrande = sprite(brillo, '#dfe6ff', 1, 0);
  explosion.add(luzGrande, destelloGrande);
  const onda = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), aditivo({ uE, uVer: { value: 1 } },
    'varying vec3 vN,vV;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    `varying vec3 vN,vV; uniform float uE, uVer; void main(){float borde=pow(clamp(1.0-abs(dot(normalize(vN),normalize(vV))),0.0,1.0),7.0);float a=borde*smoothstep(0.0,0.25,uE)*exp(-uE/3.2)*0.15*uVer;if(a<0.003)discard;gl_FragColor=vec4(vec3(0.6,0.78,1.0)*a,a);}`,
    { side: THREE.DoubleSide })); explosion.add(onda);

  yield;
  // Bola de fuego: la eyecta incandescente se expande y se enfría (azul blanca → amarilla →
  // naranja → roja); al volverse transparente se rompe en grumos y dedos (Rayleigh-Taylor) que
  // dejan ver el remanente que nace dentro.
  const bola = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), aditivo({ uE, uT },
    RUIDO + `  float so3(vec3 p){ return 0.5 + 0.5 * sin(p.x * 1.7 + sin(p.y * 2.3 + 1.1)) * sin(p.y * 1.9 + sin(p.z * 2.9 + 2.3)) * sin(p.z * 2.1 + sin(p.x * 1.3 + 0.7)); }
  float fbmO(vec3 p){ float v = 0.0, a = 0.55; mat3 r = mat3(0.8, 0.36, -0.48, -0.6, 0.48, -0.64, 0.0, 0.8, 0.6);
    for (int i = 0; i < 5; i++){ v += a * so3(p); p = r * p * 2.03 + 3.7; a *= 0.5; } return v / 1.05; }
uniform float uE,uT; varying vec3 vN,vV,vQ; void main(){
      vQ=normalize(position); float d=fbmO(vQ*2.2+uE*0.1);
      float dedos=smoothstep(0.45,0.85,fbmO(vQ*2.2+7.0));   // dedos de Rayleigh-Taylor (lóbulos suaves)
      vec3 p=position*(0.85+0.15*d+0.22*dedos*smoothstep(0.3,3.0,uE));   // la materia se desgarra hacia fuera en dedos
      vec4 mv=modelViewMatrix*vec4(p,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    RUIDO + `  float so3(vec3 p){ return 0.5 + 0.5 * sin(p.x * 1.7 + sin(p.y * 2.3 + 1.1)) * sin(p.y * 1.9 + sin(p.z * 2.9 + 2.3)) * sin(p.z * 2.1 + sin(p.x * 1.3 + 0.7)); }
  float fbmO(vec3 p){ float v = 0.0, a = 0.55; mat3 r = mat3(0.8, 0.36, -0.48, -0.6, 0.48, -0.64, 0.0, 0.8, 0.6);
    for (int i = 0; i < 5; i++){ v += a * so3(p); p = r * p * 2.03 + 3.7; a *= 0.5; } return v / 1.05; }
uniform float uE,uT; varying vec3 vN,vV,vQ; void main(){
      float mu=abs(dot(normalize(vN),normalize(vV)));
      // Turbulencia: dedos de Rayleigh-Taylor (crestas) sobre un plasma que hierve.
      float n=fbmO(vQ*3.0+uE*0.25), cresta=1.0-abs(fbmO(vQ*5.0-uE*0.2)*2.0-1.0), fino=fbmO(vQ*13.0+uE*0.4);
      float materia=n*0.55+cresta*0.45;
      // Se aclara con el tiempo: al principio opaca y brillante, luego solo grumos y filamentos.
      float umbral=smoothstep(0.5,6.0,uE)*0.75, grumos=smoothstep(umbral-0.05,umbral+0.4,materia);   // grumos de borde suave
      // Temperatura: azul blanca → blanca → amarilla → naranja → roja.
      float T=clamp(1.0-uE/7.0,0.0,1.0)*(0.8+0.3*materia);
      vec3 c=mix(vec3(0.95,0.25,0.08),vec3(1.0,0.62,0.22),smoothstep(0.1,0.45,T));
      c=mix(c,vec3(1.0,0.86,0.55),smoothstep(0.5,0.8,T)); c=mix(c,vec3(1.0,0.97,0.9),smoothstep(0.78,0.9,T)); c=mix(c,vec3(0.8,0.88,1.0),smoothstep(0.85,1.0,T));
      float luz=smoothstep(0.0,0.1,uE)*exp(-uE/3.2)*(1.0-smoothstep(0.8,2.4,uE));   // se deshace pronto (mientras se sostiene el grito): quedan las chispas
      // Más brillante en el centro (se ve a través del gas caliente) y filamentos en el borde.
      float cuerpo=mix(pow(mu,1.6)*(0.7+0.8*pow(mu,6.0)),(0.1+1.1*pow(1.0-mu,2.0)*cresta)*pow(mu,0.35),smoothstep(0.8,3.5,uE));   // gas luminoso de borde suave → cáscara de filamentos
      float hervor=0.35+1.1*pow(materia,1.6)+0.35*fino;   // plasma que hierve: zonas más y menos calientes
      c=mix(vec3(1.0,0.3,0.08)*1.2,c,smoothstep(0.35,0.8,materia+0.25*(1.0-smoothstep(0.0,2.0,uE))));   // lo más frío, rojo anaranjado
      float a=luz*grumos*cuerpo*hervor*0.6*(1.0+0.9*cresta*smoothstep(1.0,4.0,uE)); if(a<0.002)discard;
      gl_FragColor=vec4(c*a*0.75,a); }`, { side: THREE.FrontSide }));
  bola.visible = false; explosion.add(bola);
  yield;
  // Fragmentos: miles de grumos de materia incandescente que salen disparados (unos más rápidos que
  // otros, en chorros), dejando una estela; se frenan y se enfrían: blanco azulado → amarillo →
  // naranja → rojo, y se apagan mientras nace el corazón.
  const nF = 7000, pF = new Float32Array(nF * 3), dF = new Float32Array(nF * 3);
  for (let i = 0; i < nF; i++) {
    const phi = azar() * Math.PI * 2, h = azar() * 2 - 1, v = Math.sqrt(1 - h * h);
    pF.set([Math.cos(phi) * v, h, Math.sin(phi) * v], i * 3); dF.set([azar(), azar(), azar()], i * 3);
  }
  const gF = new THREE.BufferGeometry(); gF.setAttribute('position', new THREE.BufferAttribute(pF, 3)); gF.setAttribute('aDato', new THREE.BufferAttribute(dF, 3));
  const fragmentos = new THREE.Points(gF, aditivo({ uE, uScale, uPR, uExpo: EXPOSICION }, RUIDO + /* glsl */`
    attribute vec3 aDato; uniform float uE, uScale, uPR, uExpo; varying vec3 vC; varying float vA;
    void main(){
      // Chorros: las direcciones con más «dedo» van más lejos (la explosión no es una esfera lisa).
      float dedo = smoothstep(0.35, 0.8, fbm3(position * 2.5 + 11.0));
      float vel = 0.55 + aDato.x * 0.6 + dedo * 0.7, r = 90.0 + 1500.0 * vel * (1.0 - exp(-uE / 1.4));
      vec4 mv = modelViewMatrix * vec4(position * r, 1.0); gl_Position = projectionMatrix * mv;
      float T = clamp(1.0 - uE / (2.2 + aDato.y * 2.5), 0.0, 1.0);
      vC = mix(vec3(0.9, 0.18, 0.08), vec3(1.0, 0.6, 0.18), smoothstep(0.0, 0.35, T));
      vC = mix(vC, vec3(1.0, 0.95, 0.75), smoothstep(0.35, 0.7, T)); vC = mix(vC, vec3(0.8, 0.88, 1.0), smoothstep(0.75, 1.0, T));
      // Al principio están todas juntas: se encienden a medida que se separan (sin una nube blanca en el primer instante).
      vA = smoothstep(0.0, 0.12, uE) * mix(0.22, 1.0, smoothstep(0.15, 1.1, uE)) * (1.0 - smoothstep(6.0 + aDato.z * 3.0, 11.0 + aDato.z * 3.0, uE)) * (1.0 + T * 1.3);
      float px = (10.0 + aDato.z * 18.0 + T * 14.0) * ${escala.toFixed(3)} * uScale / max(1.0, -mv.z);
      gl_PointSize = clamp(px, 1.5, 3.0 * uPR); vA *= min(1.0, px * px * 0.5) * uExpo;   // chispas nítidas de 1,5–3 px; exposición automática: en el móvil no se amontonan en manchas blancas
    }`, /* glsl */`varying vec3 vC; varying float vA;
    void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = (exp(-d * d * 4.0) + exp(-d * 10.0) * 0.4) * vA; gl_FragColor = vec4(vC * a * 2.6, a); }`));
  fragmentos.frustumCulled = false; fragmentos.visible = false; explosion.add(fragmentos);
  yield;
  // Destello del choque: núcleo blanco azulado cegador y una raya horizontal (como en las fotos).
  const raya = sprite(destello, '#cfe0ff', 1, 0); raya.material.rotation = 0; explosion.add(raya);
  yield;
  // Ecos de luz: el destello ilumina capas de polvo cada vez más lejanas y se ven anillos tenues
  // que se agrandan alrededor (como los de V838 Monocerotis).
  const eco = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), aditivo({ uE },
    'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    RUIDO + `uniform float uE; varying vec2 vP; void main(){
      float r=length(vP), ang=atan(vP.y,vP.x); float polvo=fbm3(vec3(vP*11.0,1.3))*0.7+fbm3(vec3(vP*30.0,4.0))*0.3;
      float a=0.0;
      for(int i=0;i<3;i++){ float fi=float(i), t=uE-fi*1.6, ri=${(ECO.inicio / ECO.plano).toFixed(4)}+t*${(ECO.velocidad / ECO.plano).toFixed(4)};
        a+=exp(-pow((r-ri)/(0.003+t*0.0008),2.0))*smoothstep(0.0,0.6,t)*exp(-t/5.0)*(1.0-fi*0.25); }
      a*=smoothstep(0.4,0.75,polvo)*(1.0-smoothstep(0.7,0.95,r))*0.16*(1.0-smoothstep(9.0,15.0,uE)); if(a<0.002)discard;
      gl_FragColor=vec4(mix(vec3(0.7,0.8,1.0),vec3(1.0,0.85,0.75),polvo)*a,a); }`, { side: THREE.DoubleSide }));
  yield;
  // Eco de luz: el destello iluminando polvo que ya estaba ahí. Viaja a velocidad constante
  // (la luz, ~900 u/s en esta escala) y siempre por delante de la onda de material, que nace a
  // ~790 u/s y se frena. Se dibuja en el plano del cielo: un eco es un fenómeno aparente.
  eco.scale.setScalar(ECO.plano); eco.visible = false; explosion.add(eco);

  const anillosChoque = [0, 1].map((i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.01 + i * 0.004, 6, 160), aditivo({ uE, uRetraso: { value: i * 1.35 } },
      'varying vec3 vN,vV,vP;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vP=position;vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
      RUIDO + `uniform float uE,uRetraso;varying vec3 vN,vV,vP;void main(){float t=max(0.0,uE-uRetraso);
        float ang=atan(vP.y,vP.x);
        // Collar de perlas: el choque enciende grumos uno a uno a lo largo del anillo.
        float perla=pow(0.5+0.5*cos(ang*29.0+fbm3(vP*6.0)*5.0),10.0)*smoothstep(0.0,1.0,t*1.6-fbm3(vP*3.0+7.0))*(0.25+1.3*rn3(vec3(floor(ang*29.0/6.2832+0.5)*1.7,uRetraso*3.0,0.5)));   // perlas irregulares
        float gas=0.03+0.05*fbm3(vP*24.0);
        float a=(perla*1.8+gas)*smoothstep(0.0,0.15,t)*exp(-t/1.7)*0.8;if(a<0.003)discard;
        gl_FragColor=vec4(mix(vec3(1.0,0.55,0.4),vec3(1.0,0.92,0.82),perla)*a,a);}`));
    m.rotation.set(1.05+i*0.28,0.25,i*0.25);explosion.add(m);return m;
  });
  let estado = 'estable' , inicio = 0, tActual = 0, proxima = 200 + azar() * 60, visitada = false, orientado = false;

  function recordar() { estado = 'remanente'; inicio = tActual - TIEMPOS_AMOR.reposo; orientado = false; }
  return {
    grupo,
    get estado() { return estado; },
    // Radio actual de la materia expulsada (bola de fuego u onda), en unidades del grupo: durante la
    // explosión es lo que ocupa la supernova (para la navegación).
    get radioEyecta() { return explosion.visible ? Math.max(bola.visible ? bola.scale.x : 0, onda.visible ? onda.scale.x : 0) : 0; },
    get fase() { return faseSupernova(estado, tActual - inicio, inicio - tActual); },
    get desdeEstallido() { return estado === 'estallido' || estado === 'remanente' ? tActual - inicio : null; },
    // Segundo de su canción en la ceremonia (null fuera de ella): el reloj del videoclip.
    get segundoCancion() { return estado === 'inestable' ? TIEMPOS_AMOR.espera - (inicio - tActual) : estado === 'estallido' ? TIEMPOS_AMOR.espera + (tActual - inicio) : null; },
    // La canción manda: si su reloj (bandaSonora.tiempo) se separa del de la ceremonia (el audio tardó en arrancar, un
    // cuadro largo…), la ceremonia se corrige poco a poco hacia él, sin saltos visibles.
    sincronizar(segundo) {
      if (!Number.isFinite(segundo) || (estado !== 'inestable' && estado !== 'estallido')) return;
      const propio = estado === 'inestable' ? TIEMPOS_AMOR.espera - (inicio - tActual) : TIEMPOS_AMOR.espera + (tActual - inicio), d = segundo - propio;
      if (Math.abs(d) > 1.5) inicio -= d; else if (Math.abs(d) > 0.03) inicio -= d * 0.25;
    },
    // Destello único y contenido: nunca una pantalla blanca sostenida.
    get destello() { return estado === 'estallido' ? Math.exp(-Math.max(0, tActual - inicio) / 0.9) * 0.28 : 0; },
    radioFinal: RADIO_REMANENTE_SUPERNOVA,
    cajaCorazon,
    corazon,
    superficie,   // la estrella progenitora (para medir su tamaño real)
    set visitada(v) { visitada = v; },
    get quiereEstallar() { return estado === 'estable' && !visitada && tActual > proxima; },
    aplazar(segundos = 30) { proxima = tActual + segundos; },
    recordar,
    // El corazón mira a casa (a la galaxia de Xiomara) y no se gira hacia la cámara.
    // La estrella se orienta con él: su infinito queda horizontal y las dos estrellitas giran en el plano del corazón.
    orientarHacia(direccionLocal) { corazon.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(direccionLocal, new THREE.Vector3(), new THREE.Vector3(0, 1, 0))); progenitora.quaternion.copy(corazon.quaternion); },
    orientar() {}, mirarA() {},
    reiniciar() { estado = 'estable'; proxima = Infinity; orientado = false; },
    preparar({ repetir = false } = {}) {
      if (estado === 'inestable') return Math.max(0, inicio - tActual);
      if (estado !== 'estable' && !repetir) return -1;
      estado = 'inestable'; inicio = tActual + TIEMPOS_AMOR.espera; orientado = false;
      return TIEMPOS_AMOR.espera;
    },
    actualizar(t, camara, camaraMundo) {
      const dt = Math.min(0.1, Math.max(0, t - tActual));
      tActual = t; uT.value = t;
      if (estado === 'inestable' && t >= inicio) { estado = 'estallido'; inicio = t; }
      if (estado === 'estallido' && t - inicio >= TIEMPOS_AMOR.reposo) estado = 'remanente';
      // Secuencia antes del estallido (falta: segundos que faltan, en el reloj de la animación; la ceremonia real es más
      // larga, como su canción, y faltaAnimacion la reparte: js/util/supernovaAmor.js):
      //  14 → 9,5 late «pum-pum» (despacio y luego deprisa), creciendo con cada latido; sus ondas respiran
      //           (se expanden y se contraen) y sus llamas se mueven;
      // 9,5 → 4,8 el núcleo colapsa a golpes con la canción: en cada tiempo se encoge de un tirón, la envoltura tiembla
      //           y suelta una capa que se aleja y se enfría; se apaga justo cuando calla la voz (colapsoCancion);
      // 4,8 → 3,8 oscuridad: un instante sin nada;
      // 3,8 → 0   dos estrellitas, azul y rosa, giran en órbita y se acercan en espiral; al juntarse, ¡pum!
      const activa = estado === 'inestable', falta = faltaAnimacion(inicio - t);
      const agita = activa ? THREE.MathUtils.clamp((14 - falta) / (14 - 9.5), 0, 1) : 0;
      const sC = activa ? TIEMPOS_AMOR.espera - (inicio - t) : null, cc = activa ? colapsoCancion(sC) : null;
      const contra = cc ? cc.contraccion : 0, colapso = cc ? cc.apagado : 0;
      const pellizco = 0, giroInf = 0;   // (sin figuras: la estrella no se deforma en un infinito)
      const silencio = activa ? 1 - THREE.MathUtils.smoothstep(falta, 4.8, 5.3) : 0;
      progenitora.visible = estado === 'estable' || (activa && falta > 4.8);
      explosion.visible = estado === 'estallido' || estado === 'remanente';
      superficie.material.uniforms.uT.value = t; superficie.material.uniforms.uAgita.value = agita * (1 + contra * 0.9) * (1 - colapso);   // la envoltura tiembla más al colapsar
      superficie.material.uniforms.uPellizco.value = pellizco;
      materialPlasma.uniforms.uT.value=t*(1+agita*2);materialPlasma.uniforms.uLuz.value=(0.6+agita*1.4)*(1-pellizco);plasma.visible=pellizco<0.98;plasma.rotation.y=t*(0.05+agita*0.25);
      // Latido doble («pum-pum»): en la ceremonia, con el golpe de caja de la canción y su corchea (desde el error, también
      // en el tiempo fuerte: el doble de seguido); fuera de ella, a su aire.
      if (dt > 0) faseLatido += dt * 0.7;
      const fl = faseLatido % 1, pum = activa ? latidoCancion(sC) : Math.exp(-Math.pow(fl / 0.05, 2)) + 0.65 * Math.exp(-Math.pow((fl - 0.2) / 0.05, 2));
      const fuerzaLatido = estado === 'estable' ? 0.35 : activa ? 0.5 + agita : 0;
      const canto = activa ? cantoCancion(sC) : 0;   // la nota larga: la estrella se enciende mientras se sostiene
      superficie.material.uniforms.uLatido.value = (pum * fuerzaLatido + canto * 0.35) * (1 - colapso);
      superficie.material.uniforms.uColapso.value = Math.max(contra * 0.55, colapso);
      // Crece con los latidos y, al final, se contrae hasta nada.
      const crece = 1 + agita * 0.55;
      const temblor = 1 + contra * 0.018 * (Math.sin(t * 43) + Math.sin(t * 29 + 1));   // la envoltura tiembla
      const latido = crece * (1 + pum * fuerzaLatido * (0.04 + agita * 0.06) + canto * 0.03) * (1 - 0.68 * contra) * temblor * Math.max(0.001, 1 - Math.pow(colapso, 1.3));
      // El infinito gira sobre sí mismo en varias direcciones, cada vez más deprisa.
      if (dt > 0 && giroInf > 0) { faseGiro += dt * (0.8 + giroInf * 5); superficie.rotation.set(Math.sin(faseGiro * 0.7) * 1.2 * giroInf, faseGiro, Math.cos(faseGiro * 0.5) * 0.9 * giroInf); } else if (!activa) superficie.rotation.set(0, 0, 0);
      const tension = activa ? THREE.MathUtils.smoothstep(agita, 0.45, 0.88) * (1 - colapso) : 0;
      progenitora.scale.setScalar(P);   // la estrella, a su escala
      superficie.scale.setScalar(latido);
      // Las dos estrellitas.
      const kDos = activa ? 1 - THREE.MathUtils.smoothstep(falta, 3.2, 3.8) : 0;
      dos.forEach((d, i) => {
        const vis = activa && falta < 3.8 && falta > 0; d.g.visible = vis; d.estela.visible = vis;
        if (!vis) { d.hist.length = 0; return; }
        // 1 al aparecer (golpe de caja), 0 al juntarse (el siguiente): giran y se acercan en espiral durante un compás; en
        // el silencio de antes del grito (falta < 0,5 en la animación) ya son una sola mota, quieta, que se encoge.
        const u = THREE.MathUtils.clamp((falta - 0.5) / 3.3, 0, 1), calla = THREE.MathUtils.smoothstep(falta, 0, 0.5);
        const radio = R * P * (0.02 + 4.5 * Math.pow(u, 1.4)), ang = (1 - u) * 8.5 * Math.PI + Math.pow(1 - u, 3) * 9 + i * Math.PI;
        d.g.position.set(Math.cos(ang) * radio, Math.sin(ang) * radio * 0.55, Math.sin(ang * 2) * radio * 0.08).applyQuaternion(corazon.quaternion);   // en el plano del corazón
        const tam = R * P * (1.6 + 1.2 * (1 - u)) * (1 + 0.15 * Math.sin(t * 9 + i) * calla) * (0.3 + 0.7 * calla);
        d.nucleo.scale.setScalar(tam * 1.1); d.luz.scale.setScalar(tam * 1.8); d.nucleo.material.opacity = kDos * (0.55 + 0.45 * calla); d.luz.material.opacity = 0.12 * kDos * calla;   // casi sin halo: motas nítidas
        // Estela con vectores reutilizados (el más antiguo pasa a ser el nuevo): sin memoria nueva en cada cuadro.
        const nuevo = d.hist.length >= NE ? d.hist.pop() : new THREE.Vector3(); d.hist.unshift(nuevo.copy(d.g.position));
        for (let k = 0; k < NE; k++) { const q = d.hist[Math.min(k, d.hist.length - 1)]; d.pos[k * 3] = q.x; d.pos[k * 3 + 1] = q.y; d.pos[k * 3 + 2] = q.z; }
        d.estela.geometry.attributes.position.needsUpdate = true;
        d.estela.material.uniforms.uTam.value = tam * 0.9; d.estela.material.uniforms.uVis.value = kDos * 0.9;
      });
      const brilloLatido = (1 + superficie.material.uniforms.uLatido.value * 1.6) * 1.6;   // más resplandeciente
      corona.material.opacity = 0.07 * (1 - colapso) * brilloLatido; halo.material.opacity = 0; rayos.material.opacity = 0.05 * (1 - colapso) * brilloLatido;   // casi sin halo: la estrella y sus motas
      const k = Math.min(1, Math.max(0.15, camara.distanceTo(grupo.position) / (8400 * grupo.scale.x * P)));
      // La luz de la estrella y sus prominencias crecen con ella (acompañan cada latido).
      const tamEstrella = superficie.scale.x;
      // Lo que la acompaña se estira y se aprieta con ella.
      const estira = 1 + pellizco * 0.25, aprieta = 1 - pellizco * 0.55;
      corona.scale.set(R * 3.5 * Math.max(k, 0.5) * tamEstrella * estira, R * 3.5 * Math.max(k, 0.5) * tamEstrella * aprieta, 1); halo.scale.set(R * 8 * k * tamEstrella * estira, R * 8 * k * tamEstrella * aprieta, 1); rayos.scale.setScalar(R * 12 * k * tamEstrella);
      plasma.scale.set(tamEstrella * estira, superficie.scale.y * aprieta, tamEstrella * aprieta);
      // Ondas de pulsación: salen de la superficie, se agrandan y se desvanecen; cada vez más seguidas.
      // Ondas de radiación que respiran: se expanden y se contraen sin parar (la estrella está viva).
      if (activa) fasePulso = respiracionCancion(sC); else if (dt > 0) fasePulso += dt * 0.5;   // una respiración por compás (luego, por medio)
      pulsos.forEach((m, i) => {
        const fuerza = (estado === 'estable' ? 0.35 : activa ? 0.4 + agita * 0.6 : 0) * (1 - pellizco);
        // En el colapso, cada onda es una capa que la envoltura suelta en un golpe: se aleja sin volver y se enfría.
        if (cc && cc.ultimo >= 0) {
          const edad = edadCapa(sC, i), vida = 2.4;
          m.visible = edad !== null && edad < vida;
          if (m.visible) { const f = edad / vida; m.scale.setScalar(R * crece * (1.04 + edad * 1.5)); m.material.uniforms.uF.value = Math.min(1, 0.15 + f * 0.85); m.material.uniforms.uA.value = 0.85 * Math.pow(1 - f, 1.5) * (1 - colapso * 0.5); m.material.uniforms.uS.value = i * 7.3 + edad * 0.3; }
          return;
        }
        const resp = 0.5 + 0.5 * Math.sin(fasePulso * Math.PI * 2 + i * 2.1);
        m.visible = fuerza > 0.01; m.scale.setScalar(R * tamEstrella * (1.12 + i * 0.22 + resp * (0.25 + agita * 0.25)));
        m.material.uniforms.uF.value = 0.2 + i * 0.15; m.material.uniforms.uS.value = i * 7.3 + fasePulso * 0.05;
        m.material.uniforms.uA.value = fuerza * (0.35 + 0.45 * (1 - resp)) * 0.8;
        m.rotation.y = fasePulso * 0.1 * (i % 2 ? 1 : -1);
      });

      if (!explosion.visible) return;
      const e = desdeAnimacion(Math.max(0, t - inicio)); uE.value = e; uCanto.value = estado === 'estallido' ? cantoCancion(TIEMPOS_AMOR.espera + t - inicio) : 0;   // (en el reloj de la animación)
      const flash = Math.exp(-e / 0.6) * THREE.MathUtils.smoothstep(e, 0, 0.08);   // ruptura del choque: breve
      destelloGrande.scale.setScalar(60 * (2 + 5 * flash)); destelloGrande.material.opacity = Math.min(1, flash * 0.5);   // un punto seco   // un destello seco, no una mancha blanca
      raya.scale.set(60 * 40 * flash + 1, 60 * 0.8 * flash + 1, 1); raya.material.opacity = flash * 0.45;
      fragmentos.visible = e < 15;
      luzGrande.scale.setScalar(60 * (18 + 55 * flash)); luzGrande.material.opacity = 0; luzGrande.visible = false;   // sin halo
      bola.visible = e < 10; bola.scale.setScalar(R * P * 0.9 + 720 * (1 - Math.exp(-e / 2.2)));   // nace del tamaño de la estrella
      eco.visible = false;   // sin aros: se veían como círculos quietos
      // El frente de choque solo se dibuja si la cámara está bien fuera de él: visto desde cerca,
      // su borde cruzaba la pantalla como una franja borrosa.
      const rOnda = radioOnda(e), lejosCam = camara.distanceTo(grupo.position) / grupo.scale.x;
      onda.material.uniforms.uVer.value = 1 - THREE.MathUtils.smoothstep(rOnda / lejosCam, 0.45, 0.75); onda.visible = false; onda.scale.setScalar(rOnda);
      anillosChoque.forEach(m => { m.visible = false; });   // sin anillos fijos: se veían como aros quietos
      gas.material.uniforms.uBrillo.value = 1.4 + 0.9 * THREE.MathUtils.smoothstep(lejosCam, 5500, 9500); /* de lejos brilla como las demás nebulosas */ gas.material.uniforms.uOpacidad.value = 0.05 * THREE.MathUtils.smoothstep(e, 6, 17);   // casi nada: el corazón lo dibujan las chispas y los hilos
      parejas.forEach((p, i) => { const a = t * 0.12 + i * Math.PI, r = p.userData.orbita; p.position.set(centroCorazon.x + Math.cos(a) * r, centroCorazon.y + Math.sin(a) * r * 0.55, 30); p.scale.setScalar(THREE.MathUtils.smoothstep(e, 5, 14) * (1 + Math.sin(t * 1.5 + i) * 0.03)); });
    }
  };
}
