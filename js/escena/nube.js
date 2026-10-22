// Gas con volumen real: el rayo atraviesa una densidad 3D. No son planos orientados
// a la cámara. Atlas pequeño precalculado y número fijo de pasos para acotar coste.
import * as THREE from 'three';
import { esMovil } from '../util/dispositivo.js';
import { crearAtlasNebulosa } from '../util/volumenNebulosa.js';
const cache = new Map();
// Tabla de ruido de valor 3D (32³ valores del retículo, con un borde repetido para el filtrado) en un atlas 2D de
// 8×4 cortes de 33×33: cada ruido cuesta dos lecturas con filtrado lineal (en vez de ocho hashes con senos por
// muestra del rayo). Es el mismo ruido de valor (interpolación suavizada en los tres ejes): mismos grumos y huecos,
// mucho menos trabajo para la GPU del móvil. Funciona en WebGL 1 y 2.
let tablaRuido = null;
export const RUIDO_TABLA = /* glsl */`uniform sampler2D uRuido;
      float rn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); i = mod(i, 32.0);
        vec2 xy = i.xy + f.xy + 0.5; float z1 = mod(i.z + 1.0, 32.0);
        float a = texture2D(uRuido, (vec2(mod(i.z, 8.0), floor(i.z / 8.0)) * 33.0 + xy) / vec2(264.0, 132.0)).r;
        float b = texture2D(uRuido, (vec2(mod(z1, 8.0), floor(z1 / 8.0)) * 33.0 + xy) / vec2(264.0, 132.0)).r;
        return mix(a, b, f.z); }`;
export function texturaRuido() {
  if (tablaRuido) return tablaRuido;
  const L = 33, A = 8 * L, B = 4 * L, datos = new Uint8Array(A * B * 4);
  const h = (x, y, z) => { let n = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791); n = Math.imul(n ^ (n >>> 13), 0x5bd1e995); n ^= n >>> 15; return (n >>> 0) / 4294967295; };
  for (let z = 0; z < 32; z++) for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
    const v = Math.round(h(x % 32, y % 32, z) * 255), u = (z % 8) * L + x, w = Math.floor(z / 8) * L + y, k = (w * A + u) * 4;
    datos[k] = datos[k + 1] = datos[k + 2] = v; datos[k + 3] = 255;
  }
  const t = new THREE.DataTexture(datos, A, B, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
  return (tablaRuido = t);
}
// Muestras por rayo, compartidas por todas las nubes (las pruebas de calidad las cambian).
export const MUESTRAS = { value: esMovil ? 16 : 24 };   // en una pantalla de móvil 16 muestras por rayo se ven igual que 24 (y el gas del púlsar cuesta un tercio menos)
// Variantes (la forma la dibuja su imagen: nebulosaFondo con la misma forma): su densidad 3D acompaña
// a la imagen (cáscara, columnas, velos, nube suave, núcleo de polvo) y la lámina es más gruesa, para
// que tengan volumen desde cualquier lado sin verse como cajas ni rayas.
const VARIANTES = new Set(['cavidad', 'filamentos', 'reflexion', 'oscura', 'pilares']);
const GROSOR = { cavidad: 1.15, pilares: 1.1, oscura: 1.15, reflexion: 1.2, filamentos: 1.1 };
export function crearNube(textura, centro, tam, semilla, escala = 1, capas = 7, { corazon = false, variante = null, orientacion = null } = {}) {
  // Densidades compartidas (seis formas; el Cangrejo y el corazón, la suya; y las variantes con
  // volumen propio): se calculan una vez y cada una cuesta lo suyo.
  const volumetrica = !corazon && VARIANTES.has(variante), grueso = volumetrica ? GROSOR[variante] : 1;
  const forma = corazon || semilla === 44 ? semilla : volumetrica ? semilla % 3 + 1 : semilla % 6 + 1, clave = `${forma}/${corazon}/${volumetrica ? variante : ''}`;
  if (!cache.has(clave)) {
    // Densidad propia solo para las formas casi esféricas (cáscara, velos, nube suave); los pilares y la
    // nube oscura usan las formas generales: su silueta la dibuja la imagen y no debe recortarse.
    const a = crearAtlasNebulosa(forma, corazon, 32, ['cavidad', 'filamentos', 'reflexion'].includes(variante) ? variante : null);
    const t = new THREE.DataTexture(a.datos, a.ancho, a.alto, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; cache.set(clave, t);
  }
  const inversa = new THREE.Matrix4(), camaraLocal = new THREE.Vector3();
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.ShaderMaterial({
    uniforms: { uMapa: { value: textura }, uDensidad: { value: cache.get(clave) }, uRuido: { value: texturaRuido() }, uCamara: { value: camaraLocal }, uBrillo: { value: 1 }, uOpacidad: { value: 1 }, uMuestras: MUESTRAS },
    vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: /* glsl */`
      uniform sampler2D uMapa, uDensidad; uniform vec3 uCamara; uniform float uBrillo,uOpacidad,uMuestras; varying vec3 vP;
      vec2 uvAtlas(vec3 p, float z){return (vec2(mod(z,8.0)*32.0,floor(z/8.0)*32.0)+0.5+p.xy*31.0)/vec2(256.0,128.0);}
      // Ruido de valor 3D anclado a la nube (detalle multiescala que rompe la extrusión de la imagen).
      // Ruido de valor desde la tabla (ver texturaRuido): el filtrado lineal hace la interpolación en x e y con los
      // pesos ya suavizados, y se mezclan dos cortes en z.
      ${RUIDO_TABLA}
      vec3 densidad(vec3 p){float z=clamp(p.z,0.0,1.0)*31.0;return mix(texture2D(uDensidad,uvAtlas(p,floor(z))).rgb,texture2D(uDensidad,uvAtlas(p,min(31.0,floor(z)+1.0))).rgb,fract(z));}
      void main(){
        vec3 dir=normalize(vP-uCamara), segura=mix(vec3(0.0001),dir,step(vec3(0.0001),abs(dir)));
        vec3 a=(-0.5-uCamara)/segura,b=(0.5-uCamara)/segura;
        vec3 lo=min(a,b),hi=max(a,b);float desde=max(0.0,max(max(lo.x,lo.y),lo.z)),hasta=min(min(hi.x,hi.y),hi.z);
        if(hasta<=desde)discard;
        // Muestras según el recorrido del rayo dentro de la caja: los rayos largos (vistas oblicuas y
        // laterales, donde el error era mayor) reciben más; los cortos, menos.
        float n=uMuestras<0.0 ? -uMuestras : clamp(floor(uMuestras*(hasta-desde)/1.1+0.5), floor(uMuestras*0.6), floor(uMuestras*1.6)), paso=(hasta-desde)/n;
        // Cuadratura estable en el volumen: no cambia la semilla con los píxeles de pantalla.
        float azar=0.5;
        // El color de cada punto del volumen está ANCLADO a la nube: se lee en sus coordenadas
        // propias (la imagen proyectada a lo largo de su eje z, con una leve cizalla y una
        // deformación que dependen solo de la posición), nunca según desde dónde se mira. Al
        // orbitar cambia la perspectiva del volumen, no su dibujo. De frente se ve la imagen
        // nítida; de lado, el espesor que da la densidad 3D (grumos, huecos y polvo).
        vec4 suma=vec4(0.0);
        for(int i=0;i<128;i++){ if(float(i)>=n) break;
          vec3 p=uCamara+dir*(desde+(float(i)+azar)*paso)+0.5;
          vec3 d=densidad(clamp(p,0.0,1.0));
          ${corazon ? `vec3 color=texture2D(uMapa,clamp(p.xy+(p.z-0.5)*vec2(0.035,-0.025),0.0,1.0)).rgb;` : `// Lejos del plano medio, cada capa se deforma distinto (ruido 3D anclado): de frente la imagen
          // sigue nítida y de lado no se repite la misma imagen en todas las capas (vetas).
          float fuera=smoothstep(0.03,0.3,abs(p.z-0.5));
          vec2 deforma=(vec2(rn3(p*vec3(5.0,5.0,12.0)),rn3(p*vec3(5.0,5.0,12.0)+7.3))-0.5)*0.22*fuera;
          vec3 color=texture2D(uMapa,clamp(p.xy+(p.z-0.5)*vec2(0.06,-0.04)+(d.yz-0.5)*0.14*(0.3+abs(p.z-0.5)*3.0)+deforma,0.0,1.0)).rgb;`}
          ${corazon ? 'color=color*0.45+texture2D(uMapa,p.xz).rgb*0.3+texture2D(uMapa,p.yz).rgb*0.25;' : ''}
          float luz=max(max(color.r,color.g),color.b);
          ${corazon ? 'float gas=d.x*smoothstep(0.002,0.09,luz);' : `// La fotografía (filamentos, pilares, bordes) dibuja la silueta nítida; el volumen
          // decide la profundidad, los grumos y las sombras.
          color=max(mix(vec3(luz*0.8),color,1.4),0.0);   // colores intensos, como en las fotos del Hubble
          color*=mix(vec3(1.22,0.72,0.88),vec3(0.88,1.04,1.16),smoothstep(0.12,0.7,luz)*(0.5+0.5*d.y));   // bordes cálidos, núcleos fríos
          // Espesor propio: el gas es una lámina deformada (no una caja). Su plano medio se curva
          // según la densidad leída en el plano central y su grosor crece donde la nube es más
          // brillante (más columna de gas); de lado se ve su silueta, no la imagen estirada.
          vec3 medio=densidad(vec3(p.xy,0.5));
          float centro=0.5+(medio.y-0.5)*0.45+(medio.z-0.5)*0.2, grosor=(0.05+0.2*smoothstep(0.03,0.6,luz)*(0.5+medio.x))*${grueso.toFixed(2)};
          float lamina=exp(-pow((p.z-centro)/grosor,2.0));
          // Detalle multiescala en 3D (dos octavas, más fino a lo largo del espesor): grumos y huecos
          // que cambian con la profundidad, en vez de repetir la imagen en cada capa.
          float detalle=0.45+1.1*(rn3(p*vec3(7.0,7.0,13.0)+${(semilla % 13).toFixed(1)})*0.65+rn3(p*vec3(17.0,17.0,29.0))*0.35);
          float gas=(0.15+0.85*smoothstep(0.2,0.75,d.x))*smoothstep(0.03,0.45,luz)*(0.35+0.7*luz)*lamina*detalle;`}
          float polvoOscuro=d.z*${corazon ? '1.0' : 'smoothstep(0.03,0.25,luz)*lamina'}${variante === 'oscura' ? '*1.8' : ''};
          float absorcion=1.0-exp(-(gas*${corazon ? '6.0' : '7.5'}+polvoOscuro*3.5)*paso*uOpacidad);
          // Mezcla delante→detrás: los grumos se ocultan entre sí, con huecos y profundidad.
          vec3 emision=color*(1.1+d.y*1.4)*uBrillo*(1.0-min(1.0,polvoOscuro)*0.85)${corazon ? '' : '*(0.85+smoothstep(0.6,0.95,luz)*0.35)'};
          suma.rgb+=(1.0-suma.a)*absorcion*emision;
          suma.a+=(1.0-suma.a)*absorcion;
          if(suma.a>0.95)break;
        }
        if(suma.a<0.002)discard;gl_FragColor=suma;
      }`,
    transparent: true, premultipliedAlpha: true, depthWrite: false, side: THREE.BackSide, blending: THREE.NormalBlending
  }));
  m.position.copy(centro); m.rotation.set(0.1, (semilla % 5 - 2) * 0.12, (semilla % 7 - 3) * 0.08);
  m.scale.set(tam * 1.5, tam * 1.15, tam * 1.2);
  // Las del cielo se orientan hacia casa: desde allí se ven de frente, con todo su detalle (vista
  // en diagonal, la imagen proyectada se emborronaría); al viajar se ve su volumen de lado.
  // Las del catálogo traen su orientación (hacia quien pasa por el camino: nunca se ven de canto al cruzarlas).
  if (!corazon && centro.lengthSq() > 1) { m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), (orientacion ? orientacion.clone() : centro.clone().negate()).normalize()); m.rotateZ((semilla % 7 - 3) * 0.3); m.rotateX(0.08); }
  m.onBeforeRender = (renderer, scene, camera) => { inversa.copy(m.matrixWorld).invert(); camera.getWorldPosition(camaraLocal).applyMatrix4(inversa); m.material.uniformsNeedUpdate = true; };
  m.renderOrder = -3; m.userData.volumen3D = true;
  return m;
}
