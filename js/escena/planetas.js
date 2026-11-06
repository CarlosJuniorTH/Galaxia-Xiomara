// Planeta rosa con anillos y su lunita («Donde empezó todo», lleva nuestra fecha) y el
// planeta océano de «Dos orillas, un cielo»: dos ciudades unidas por un arco de luz y dos
// estrellas, rosa y azul, que orbitan juntas sobre él.
// La luz viene del centro de la galaxia. El halo y la atmósfera son discretos: la máxima
// luminosidad se reserva para lo importante (la fecha, las ciudades, las estrellas).
import * as THREE from 'three';
import { deUnTiron } from '../util/azarSemilla.js';
import { esMovil, texturasLigeras } from '../util/dispositivo.js';
import { texTexto, texBrillo, texDestello } from './texturas.js';
import { BARCELONA, BUENOS_AIRES } from './geografia.js';
import { puntoSubsolar } from '../util/sol.js';
import { crearRuido } from '../util/ruido.js';

import { texturaPlaneta } from './fabricaTexturas.js';
// Las texturas se calculan en un Web Worker (texturasPlaneta.js); aquí solo se piden.
const RES = texturasLigeras ? 768 : 1024;
// Los que llenan la pantalla de cerca (Rosa, el gigante): a 1024 se veía media textura (~512 px) ampliada ×2,5 en un
// iPhone, borrosa. Su copia en memoria se suelta al subirla (liberable), así que solo ocupan la tarjeta gráfica.
const RES_CERCA = texturasLigeras || esMovil ? RES : 2048;   // en el móvil, como antes: a 2048 cada textura tardaba más de 15 s en un iPhone
const RELIEVE = 16;   // fuerza del relieve de los cráteres
const texGaseosa = (paleta, semilla, res = RES) => texturaPlaneta('gaseosa', { paleta, semilla, ancho: res, alto: res / 2 }, { relleno: [240, 170, 205], bloquea: false, liberable: true });
// Resolución según el tamaño en pantalla: las lunas pequeñas no necesitan más de 512 px.
export const texCrateres = (paleta, semilla, cantidad = 46, mares = 0, ancho = 512, { relieve = false, rayos = 0 } = {}) => texturaPlaneta('crateres', { paleta, semilla, cantidad, mares, ancho, alto: ancho / 2, relieve, rayos }, { liberable: true, relleno: [150, 140, 175], bloquea: false });   // el sistema solar no retrasa la entrada
// Lunas con relieve de verdad (altura en el canal alfa) y rayos en los cráteres jóvenes.
const texLuna = (paleta, semilla, cantidad, mares, ancho, rayos = 3) => { const t = texCrateres(paleta, semilla, cantidad, mares, ancho, { relieve: true, rayos }); t.colorSpace = THREE.SRGBColorSpace; return t; };
const texTierra = semilla => texturaPlaneta('tierra', { semilla, ancho: texturasLigeras ? 1024 : 2048, alto: texturasLigeras ? 512 : 1024 }, { claves: ['superficie', 'mascara'], relleno: [40, 80, 150], bloquea: false, liberable: true });
const texNubes = semilla => texturaPlaneta('nubes', { semilla, ancho: texturasLigeras ? 512 : 1024, alto: texturasLigeras ? 256 : 512 }, { relleno: [0, 0, 0], bloquea: false, liberable: true });

// Opciones: sol (dirección de la luz en el mundo; por defecto, desde el centro de la galaxia),
// relieve (cráteres con sombra a partir de la textura), reflejo (luz que el planeta vecino
// devuelve al lado de noche), sombraAnillo (el anillo proyecta su sombra) y corazon
// (una tormenta con forma de corazón, como la Gran Mancha Roja de Júpiter).
function materialPlaneta(mapa, tinteBorde, { deriva = 0, atmosfera = 0.32, mascara = null, especular = 0.08, diferencial = 0, terminador = 0.7, sol = null, relieve = 0, altura = false, lunar = false, reflejo = null, sombraAnillo = null, corazon = null } = {}) {
  const defines = {};
  if (mascara) defines.OCEANO = '';
  if (sol) defines.SOL = '';
  if (relieve) defines.RELIEVE = '';
  if (altura) defines.ALTURA = '';
  if (lunar) defines.LUNAR = '';
  if (sombraAnillo) defines.SOMBRA_ANILLO = '';
  if (corazon) defines.CORAZON = '';
  return new THREE.ShaderMaterial({
    defines,
    uniforms: { uMapa: { value: mapa }, uMascara: { value: mascara }, uBorde: { value: new THREE.Color(tinteBorde) }, uTime: { value: 0 }, uDeriva: { value: deriva }, uAtmos: { value: atmosfera }, uEsp: { value: especular }, uDif: { value: diferencial }, uTerm: { value: terminador },
      uSol: { value: sol || new THREE.Vector3(0, 1, 0) }, uRelieve: { value: relieve }, uTexel: { value: new THREE.Vector2(1 / (mapa.image?.width || 512), 1 / (mapa.image?.height || 256)) },
      uReflejo: { value: new THREE.Color(reflejo || 0x000000) },
      uAnN: { value: sombraAnillo?.normal || new THREE.Vector3() }, uAnC: { value: sombraAnillo?.centro || new THREE.Vector3() }, uAnIn: { value: sombraAnillo?.rIn || 0 }, uAnOut: { value: sombraAnillo?.rOut || 1 },
      uCorazon: { value: new THREE.Vector3(...(corazon || [0, 0, 1])) } },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vN; varying vec3 vMundo;
      #ifdef RELIEVE
        varying vec3 vT, vB;
      #endif
      void main(){
        vUv = uv; vec4 m = modelMatrix * vec4(position, 1.0); vMundo = m.xyz;
        vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * m;
        #ifdef RELIEVE
          // Base tangente sobre la esfera: hacia donde crece u (este) y hacia el norte.
          vT = normalize(mat3(modelMatrix) * cross(vec3(0.0, 1.0, 0.0), normalize(normal) + vec3(0.0, 0.0, 1e-4)));
          vB = cross(vN, vT);
        #endif
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMapa; uniform sampler2D uMascara; uniform vec3 uBorde; uniform float uTime, uDeriva, uAtmos, uEsp, uDif, uTerm;
      uniform vec3 uSol, uReflejo, uAnN, uAnC, uCorazon; uniform float uRelieve, uAnIn, uAnOut; uniform vec2 uTexel;
      varying vec2 vUv; varying vec3 vN; varying vec3 vMundo;
      #ifdef RELIEVE
        varying vec3 vT, vB;
      #endif
      void main(){
        // Rotación diferencial: cada banda de latitud avanza a su propia velocidad.
        vec2 uv = vUv + vec2(uTime * uDeriva * (1.0 + uDif * sin(vUv.y * 21.0) * sin(vUv.y * 7.0 + 1.3)), 0.0);
        vec3 base = texture2D(uMapa, uv).rgb;
        vec3 n = normalize(vN), v = normalize(cameraPosition - vMundo);
        #ifdef SOL
          vec3 l = normalize(uSol);
        #else
          vec3 l = normalize(-vMundo);
        #endif
        #ifdef RELIEVE
          // Relieve: los bordes claros de los cráteres sobresalen y los fondos oscuros se hunden.
          #ifdef ALTURA
            // Altura real (canal alfa), con diferencias centradas: relieve limpio y sin dirección preferida.
            float h0 = texture2D(uMapa, uv - vec2(uTexel.x, 0.0)).a, hx = texture2D(uMapa, uv + vec2(uTexel.x, 0.0)).a;
            float hy0 = texture2D(uMapa, uv - vec2(0.0, uTexel.y)).a, hy = texture2D(uMapa, uv + vec2(0.0, uTexel.y)).a;
            h0 = (h0 + hy0) * 0.5; hx = h0 + (hx - texture2D(uMapa, uv - vec2(uTexel.x, 0.0)).a) * 0.5; hy = h0 + (hy - hy0) * 0.5;
          #else
            float h0 = dot(base, vec3(0.333)), hx = dot(texture2D(uMapa, uv + vec2(uTexel.x, 0.0)).rgb, vec3(0.333)), hy = dot(texture2D(uMapa, uv + vec2(0.0, uTexel.y)).rgb, vec3(0.333));
          #endif
          n = normalize(n - (normalize(vT) * (hx - h0) + normalize(vB) * (hy - h0)) * uRelieve);
        #endif
        #ifdef CORAZON
          // Tormenta con forma de corazón que gira despacio sobre sí misma, con un borde más claro.
          vec2 q = vec2((fract(vUv.x + uTime * uDeriva - uCorazon.x + 0.5) - 0.5) * 2.0, vUv.y - uCorazon.y) / uCorazon.z;
          vec2 hq = vec2(q.x, q.y * 1.08 + 0.18) * 1.18;
          float fc = pow(hq.x * hq.x + hq.y * hq.y - 1.0, 3.0) - hq.x * hq.x * hq.y * hq.y * hq.y;
          float dentro = 1.0 - smoothstep(-0.04, 0.03, fc), rq = length(q);
          float remolino = 0.75 + 0.25 * sin(atan(q.y, q.x) * 3.0 - rq * 9.0 + uTime * 0.35);
          vec3 tormenta = mix(vec3(0.5, 0.1, 0.18), vec3(0.86, 0.34, 0.4), remolino * 0.6 * (1.0 - rq * 0.5));
          base = mix(base, tormenta, dentro * 0.96) + vec3(1.0, 0.82, 0.8) * exp(-abs(fc) * 22.0) * (1.0 - smoothstep(1.2, 1.8, rq)) * 0.22;
        #endif
        float ndl = dot(n, l), luz = smoothstep(-0.12, uTerm, ndl);
        #ifdef LUNAR
          // Cuerpo sin aire (Lommel–Seeliger): el disco se ve casi igual de claro hasta el borde
          // y el terminador es nítido; el relieve marca los cráteres junto a la línea de sombra.
          float ndv = max(dot(n, v), 0.0), ls = max(ndl, 0.0);
          luz = 1.6 * ls / (ls + ndv + 0.05) * smoothstep(-0.03, 0.06, dot(normalize(vN), l));
        #endif
        #ifdef SOMBRA_ANILLO
          // Sombra del anillo sobre el planeta (bandas, con el hueco de la división).
          float dn = dot(l, uAnN);
          if (abs(dn) > 0.001) {
            float tt = dot(uAnC - vMundo, uAnN) / dn;
            if (tt > 0.0) {
              float t2 = (length(vMundo + l * tt - uAnC) - uAnIn) / (uAnOut - uAnIn);
              if (t2 > 0.0 && t2 < 1.0) {
                float hueco = smoothstep(0.55, 0.57, t2) * (1.0 - smoothstep(0.62, 0.64, t2));
                float dens = (0.55 + 0.35 * sin(t2 * 23.0)) * (1.0 - hueco * 0.9) * smoothstep(0.0, 0.06, t2) * (1.0 - smoothstep(0.88, 1.0, t2));
                luz *= 1.0 - 0.72 * dens;
              }
            }
          }
        #endif
        float esp = uEsp;
        vec3 orillas = vec3(0.0);
        #ifdef OCEANO
          vec3 m = texture2D(uMascara, uv).rgb;
          esp = mix(0.03, 0.55, m.r);
          // España y Argentina: una luz suave que late, visible también de noche.
          float latido = 0.75 + 0.25 * sin(uTime * 1.4);
          orillas = (vec3(0.55, 0.78, 1.0) * m.g + vec3(1.0, 0.55, 0.76) * m.b) * 0.42 * latido;   // España azul, Argentina rosa
          // Luces de las ciudades en el lado de noche.
          orillas += vec3(1.0, 0.8, 0.5) * texture2D(uMascara, uv).a * (1.0 - smoothstep(-0.25, 0.05, ndl)) * 0.7;
        #endif
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        float atm = fres * smoothstep(-0.3, 0.5, ndl) * uAtmos;
        float nh = max(dot(n, normalize(l + v)), 0.0);
        #ifdef OCEANO
          // Reflejo del Sol en el mar: un destello nítido y un brillo amplio y suave alrededor.
          float brillo = (pow(nh, 500.0) * 1.4 + pow(nh, 60.0) * 0.05) * esp * luz;
        #else
          float brillo = pow(nh, 60.0) * esp * luz;
        #endif
        vec3 c = base * (0.05 + luz * 0.9) + uBorde * atm + vec3(1.0, 0.95, 0.88) * brillo + orillas + base * uReflejo * (1.0 - luz);
        gl_FragColor = vec4(c, 1.0);
      }`,
    // Transparente (alfa 1) para dibujarse después del velo del fondo (index.js).
    transparent: true
  });
}

// Capa de nubes: algo mayor que el planeta, se desplaza más rápido que la superficie
// y proyecta una sombra suave (se oscurece también en el lado nocturno).
function materialNubes(mapa, { sol = null, color = '#f7f5ff', velocidad = 0.0035, opacidad = 0.72 } = {}) {
  return new THREE.ShaderMaterial({
    defines: sol ? { SOL: '' } : {},
    uniforms: { uMapa: { value: mapa }, uTime: { value: 0 }, uSol: { value: sol || new THREE.Vector3(0, 1, 0) }, uColor: { value: new THREE.Color(color) }, uVel: { value: velocidad }, uOpac: { value: opacidad } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vMundo; void main(){ vUv = uv; vec4 m = modelMatrix * vec4(position, 1.0); vMundo = m.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * m; }',
    fragmentShader: /* glsl */`
      uniform sampler2D uMapa; uniform float uTime, uVel, uOpac; uniform vec3 uSol, uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vMundo;
      void main(){
        #ifdef SOL
          vec3 l = normalize(uSol);
        #else
          vec3 l = normalize(-vMundo);
        #endif
        vec3 n = normalize(vN);
        float a = texture2D(uMapa, vUv + vec2(uTime * uVel, 0.0)).r * uOpac;
        float luz = smoothstep(-0.15, 0.6, dot(n, l));
        a *= 0.08 + 0.92 * luz;
        gl_FragColor = vec4(uColor * (0.15 + luz * 0.85) * a, a);
      }`,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
  });
}

function crearAnillo(rIn, rOut, centro, radioPlaneta) {
  return new THREE.Mesh(
    new THREE.RingGeometry(rIn, rOut, 256, 1),
    new THREE.ShaderMaterial({
      uniforms: { uIn: { value: rIn }, uOut: { value: rOut }, uCentro: { value: centro }, uRadio: { value: radioPlaneta } },
      vertexShader: `varying vec2 vP; varying vec3 vMundo; void main(){ vP = position.xy; vec4 m = modelMatrix * vec4(position, 1.0); vMundo = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }`,
      fragmentShader: /* glsl */`
        uniform float uIn, uOut, uRadio; uniform vec3 uCentro; varying vec2 vP; varying vec3 vMundo;
        float h(float x){ x = fract(x * 0.1031); x *= x + 33.33; x *= x + x; return fract(x); }
        void main(){
          float t = (length(vP) - uIn) / (uOut - uIn);
          // Muchos anillos finos de densidad distinta, como los de Saturno, con la división de Cassini.
          float i = floor(t * 140.0), f = fract(t * 140.0);
          float fino = mix(h(i), h(i + 1.0), smoothstep(0.0, 1.0, f));
          float densidad = 0.35 + 0.65 * fino * (0.6 + 0.4 * sin(t * 23.0));
          float hueco = smoothstep(0.55, 0.57, t) * (1.0 - smoothstep(0.62, 0.64, t));
          float a = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.88, 1.0, t)) * densidad * (1.0 - hueco * 0.92);
          vec3 l = normalize(-vMundo), aC = uCentro - vMundo;
          float tl = dot(aC, l), dist = length(aC - l * tl);
          float sombra = tl > 0.0 ? smoothstep(uRadio * 0.92, uRadio * 1.04, dist) : 1.0;
          // A contraluz el polvo fino de los anillos se ilumina (dispersión hacia delante).
          float contraluz = pow(max(dot(normalize(cameraPosition - vMundo), -l), 0.0), 5.0);
          vec3 c = mix(vec3(1.0, 0.7, 0.86), vec3(0.88, 0.6, 1.0), t) * (0.2 + 0.8 * sombra) * (1.0 + contraluz * 1.6);
          gl_FragColor = vec4(c * a * 1.25, a * 0.62);
        }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
    })
  );
}

// Anillo de la fecha: nuestra fecha escrita en luz alrededor del planeta, girando despacio.
function crearAnilloFecha(rIn, rOut, texto) {
  const W = 2048, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  x.font = "600 76px 'Quicksand', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = '#ff7fb8'; x.shadowBlur = 16; x.fillStyle = '#fff1f7';
  for (let k = 0; k < 3; k++) { x.fillText(texto, W * (k + 0.5) / 3, H / 2 + 4); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 8;
  return new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 256, 1), new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uIn: { value: rIn }, uOut: { value: rOut }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D uTex; uniform float uIn, uOut, uTime; varying vec2 vP;
      void main(){
        float ang = atan(vP.y, vP.x), v = (length(vP) - uIn) / (uOut - uIn);
        // Letras con la base hacia fuera: se lee de frente en la parte cercana del anillo.
        vec3 t = texture2D(uTex, vec2(-ang / 6.2831853 + uTime * 0.012, 1.0 - v)).rgb;
        float borde = smoothstep(0.0, 0.08, v) * (1.0 - smoothstep(0.92, 1.0, v));
        vec3 c = t * vec3(1.0, 0.86, 0.93) * borde * 1.1 + vec3(1.0, 0.7, 0.85) * borde * 0.025;
        gl_FragColor = vec4(c, max(max(c.r, c.g), c.b));
      }`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
  }));
}

// Cinturón de partículas dentro de los anillos: las interiores giran más rápido
// (velocidad ∝ r^-1,5) y las que pasan por la sombra del planeta se oscurecen.
function crearCinturon(rIn, rOut, centro, radioPlaneta, { uScale, uPR }) {
  const n = 1400, pos = new Float32Array(n * 3), fase = new Float32Array(n), tam = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = Math.random(); if (t > 0.55 && t < 0.64) { i--; continue; }
    pos[i * 3] = Math.random() * Math.PI * 2; pos[i * 3 + 1] = rIn + (rOut - rIn) * (0.05 + t * 0.85); pos[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
    fase[i] = Math.random(); tam[i] = 0.9 + Math.random() * 1.4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPhase', new THREE.BufferAttribute(fase, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(tam, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale, uPR, uIn: { value: rIn }, uCentro: { value: centro }, uRadio: { value: radioPlaneta } },
    vertexShader: /* glsl */`
      attribute float aPhase, aSize; uniform float uTime, uScale, uPR, uIn; uniform vec3 uCentro; uniform float uRadio;
      varying float vA; varying vec3 vC;
      void main(){
        float r = position.y, ang = position.x + uTime * 0.35 * pow(uIn / r, 1.5);
        vec3 p = vec3(cos(ang) * r, sin(ang) * r, position.z);
        vec4 m = modelMatrix * vec4(p, 1.0);
        vec3 l = normalize(-m.xyz), aC = uCentro - m.xyz; float tl = dot(aC, l);
        float sombra = tl > 0.0 ? smoothstep(uRadio * 0.9, uRadio * 1.06, length(aC - l * tl)) : 1.0;
        vec4 mv = viewMatrix * m; gl_Position = projectionMatrix * mv;
        float s = aSize * uScale / max(0.1, -mv.z);
        gl_PointSize = clamp(s, 1.0, 3.0 * uPR);
        vA = clamp(s, 0.0, 1.0) * (0.3 + 0.7 * sombra) * (0.7 + 0.3 * sin(uTime * 2.0 + aPhase * 40.0)) * 0.8;
        vC = mix(vec3(1.0, 0.86, 0.93), vec3(0.88, 0.76, 1.0), aPhase);
      }`,
    fragmentShader: /* glsl */`
      varying float vA; varying vec3 vC;
      void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = pow(max(1.0 - d * 2.0, 0.0), 1.5); gl_FragColor = vec4(vC * a, a * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const puntos = new THREE.Points(g, material); puntos.frustumCulled = false;
  return puntos;
}

// Puntos con un pulso que recorre la secuencia (aT de 0 a 1): arco entre ciudades y estelas.
function crearRecorrido(puntos, color, { uScale, uPR, tam = 3, velocidad = 0.18, base = 0.25 }) {
  const n = puntos.length, pos = new Float32Array(n * 3), t = new Float32Array(n);
  puntos.forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); t[i] = i / (n - 1); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale, uPR, uColor: { value: new THREE.Color(color) }, uTam: { value: tam }, uVel: { value: velocidad }, uBase: { value: base } },
    vertexShader: /* glsl */`
      attribute float aT; uniform float uTime, uScale, uPR, uTam, uVel, uBase; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        // Dos pulsos en sentidos opuestos: de cada orilla sale una luz hacia la otra.
        float p1 = fract(uTime * uVel), p2 = 1.0 - fract(uTime * uVel + 0.5);
        float pulso = exp(-pow((aT - p1) * 14.0, 2.0)) + exp(-pow((aT - p2) * 14.0, 2.0));
        vA = uBase * smoothstep(0.0, 0.08, aT) * (1.0 - smoothstep(0.92, 1.0, aT)) + pulso;
        gl_PointSize = clamp(uTam * (1.0 + pulso) * uScale / max(0.1, -mv.z), 1.0, 7.0 * uPR);
      }`,
    fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = pow(1.0 - d * 2.0, 1.8) * vA; gl_FragColor = vec4(uColor * a, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const p = new THREE.Points(g, material); p.frustumCulled = false; return p;
}

// Dos estrellas en una misma órbita, cada una con una estela de su color que se apaga
// detrás de ella. La órbita es una elipse inclinada sobre el planeta.
export function crearDosEstrellas({ uScale, uPR }, { radio = 62, alto = 9, fondo = 34, velocidad = 0.22, colores = ['#ff8fc0', '#86b4ff'], tam = 1 } = {}) {
  const grupo = new THREE.Group(), n = 220, pos = new Float32Array(n * 3), ang = new Float32Array(n);
  const punto = a => [Math.cos(a) * radio, Math.sin(a) * alto, Math.sin(a) * fondo];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ang[i] = a; pos.set(punto(a), i * 3); }
  const [cR, cA] = colores.map(c => new THREE.Color(c));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aAng', new THREE.BufferAttribute(ang, 1));
  const estela = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uFase: { value: 0 }, uScale, uPR, uR: { value: cR }, uA: { value: cA } },
    vertexShader: /* glsl */`
      attribute float aAng; uniform float uFase, uScale, uPR; uniform vec3 uR, uA; varying vec3 vC; varying float vA;
      const float TAU = 6.2831853;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        // Distancia angular por detrás de cada estrella (rosa en uFase, azul enfrente).
        float dR = mod(uFase - aAng, TAU), dA = mod(uFase + 3.14159265 - aAng, TAU);
        float r = exp(-dR * 1.6), a = exp(-dA * 1.6);
        vC = uR * r + uA * a;
        vA = max(r, a) * 0.9 + 0.04;
        gl_PointSize = clamp(2.4 * uScale / max(0.1, -mv.z) * (0.6 + vA), 1.0, 5.0 * uPR);
      }`,
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float k = pow(1.0 - d * 2.0, 1.6); gl_FragColor = vec4(vC * k * vA + vec3(0.03) * k, k); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  estela.frustumCulled = false; grupo.add(estela);
  const destello = texDestello(), brillo = texBrillo();
  const estrella = (color, nucleo) => {
    const s = new THREE.Group();
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: brillo, color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(30 * tam);
    const rayos = new THREE.Sprite(new THREE.SpriteMaterial({ map: destello, color: nucleo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); rayos.scale.setScalar(24 * tam);
    s.add(halo, rayos); grupo.add(s); return s;
  };
  const rosa = estrella(colores[0], cR.clone().lerp(new THREE.Color('#ffffff'), 0.75)), azul = estrella(colores[1], cA.clone().lerp(new THREE.Color('#ffffff'), 0.75));
  return {
    grupo, estrellas: [rosa, azul],
    actualizar(t) {
      const f = t * velocidad; estela.material.uniforms.uFase.value = f % (Math.PI * 2);
      rosa.position.set(...punto(f)); azul.position.set(...punto(f + Math.PI));
      // Respiran a la vez: cuando una late, la otra también.
      const latido = 1 + Math.sin(t * 1.7) * 0.12;
      rosa.scale.setScalar(latido); azul.scale.setScalar(latido);
    }
  };
}

// Punto de la esfera de Three.js para una longitud y latitud reales, con la textura
// equirectangular estándar (u = (lon + 180) / 360): x = −cos(2πu)·cos(lat), z = sen(2πu)·cos(lat).
function lugar(lon, lat, radio) {
  const u = (lon + 180) / 360, la = lat * Math.PI / 180;
  return new THREE.Vector3(-Math.cos(u * Math.PI * 2) * Math.cos(la), Math.sin(la), Math.sin(u * Math.PI * 2) * Math.cos(la)).multiplyScalar(radio);
}

// Cinturón de asteroides: rocas con forma irregular (como patatas), con cráteres y rugosidad
// calculados por píxel y tres tipos reales: carbonáceos oscuros, silíceos pardos y metálicos
// con brillo. Órbitas keplerianas y giro propio en la GPU, una llamada de dibujo por tamaño.
function crearAsteroides(rIn, rOut, cantidad, { detalle = 1, tamMin = 0.8, tamMax = 6, semilla = 5 } = {}) {
  const { fbm } = crearRuido(semilla);
  const roca = new THREE.IcosahedronGeometry(1, detalle), p = roca.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 0.62 + fbm(v.x * 1.3 + 4, v.y * 1.3, v.z * 1.3, 3) * 0.75 + (fbm(v.x * 4, v.y * 4 + 2, v.z * 4, 2) - 0.5) * 0.18;
    p.setXYZ(i, v.x * k, v.y * k * 0.78, v.z * k * 0.66);
  }
  roca.computeVertexNormals();
  const g = new THREE.InstancedBufferGeometry().copy(roca); g.instanceCount = cantidad;
  const orb = new Float32Array(cantidad * 4), rot = new Float32Array(cantidad * 4), tam = new Float32Array(cantidad * 2);
  for (let i = 0; i < cantidad; i++) {
    const r = rIn + (rOut - rIn) * Math.pow(Math.random(), 0.8);
    orb.set([r, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 22 * (r / rOut), 0.06 * Math.pow(rIn / r, 1.5)], i * 4);
    const eje = new THREE.Vector3().randomDirection();
    rot.set([eje.x, eje.y, eje.z, 0.15 + Math.random() * 0.7], i * 4);
    tam.set([tamMin + Math.pow(Math.random(), 3) * (tamMax - tamMin), Math.random()], i * 2);
  }
  g.setAttribute('aOrb', new THREE.InstancedBufferAttribute(orb, 4)); g.setAttribute('aRot', new THREE.InstancedBufferAttribute(rot, 4)); g.setAttribute('aTam', new THREE.InstancedBufferAttribute(tam, 2));
  const malla = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    extensions: { derivatives: true },
    vertexShader: /* glsl */`
      attribute vec4 aOrb, aRot; attribute vec2 aTam; uniform float uT; varying vec3 vN, vMundo, vObj; varying float vTinte, vEscala;
      vec3 rotar(vec3 v, vec3 k, float a){ return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a)); }
      void main(){
        float a = aOrb.y + uT * aOrb.w;
        vec3 centro = vec3(cos(a) * aOrb.x, aOrb.z, sin(a) * aOrb.x), k = normalize(aRot.xyz);
        float giro = uT * aRot.w + aOrb.y * 7.0;
        vObj = position * 2.5 + aTam.y * 17.0;
        vec4 m = modelMatrix * vec4(centro + rotar(position * aTam.x, k, giro), 1.0);
        vMundo = m.xyz; vN = normalize(mat3(modelMatrix) * rotar(normal, k, giro)); vTinte = aTam.y; vEscala = aTam.x;
        gl_Position = projectionMatrix * viewMatrix * m;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vN, vMundo, vObj; varying float vTinte, vEscala;
      float h(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      float rn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      // Cráteres: celdas con un hoyo redondo y borde, más rugosidad fina.
      float crater(vec3 p){ vec3 c = floor(p), f = fract(p) - 0.5; vec3 o = (vec3(h(c), h(c + 3.1), h(c + 7.7)) - 0.5) * 0.5; float d = length(f - o) / (0.22 + 0.2 * h(c + 1.3));
        return step(0.45, h(c + 5.0)) * (d < 1.0 ? -(1.0 - d * d) * 0.6 + smoothstep(0.75, 1.0, d) * 0.4 : 0.0); }
      void main(){
        float alto = crater(vObj) + crater(vObj * 2.3 + 4.0) * 0.6 + (rn(vObj * 6.0) - 0.5) * 0.35 + (rn(vObj * 18.0) - 0.5) * 0.15;
        vec3 n = normalize(vN);
        // Relieve por píxel (perturbación de la normal con derivadas de pantalla, como bumpMap).
        vec3 sx = dFdx(vMundo), sy = dFdy(vMundo), r1 = cross(sy, n), r2 = cross(n, sx);
        float det = dot(sx, r1); vec2 dh = vec2(dFdx(alto), dFdy(alto)) * vEscala * 0.12;
        n = normalize(abs(det) * n - sign(det) * (dh.x * r1 + dh.y * r2));
        vec3 l = normalize(-vMundo), v = normalize(cameraPosition - vMundo);
        // Tipos: carbonáceo (oscuro), silíceo (pardo) y metálico (gris con brillo).
        vec3 color = vTinte < 0.55 ? vec3(0.2, 0.19, 0.19) : vTinte < 0.88 ? vec3(0.46, 0.4, 0.33) : vec3(0.5, 0.5, 0.53);
        color *= 0.8 + 0.4 * rn(vObj * 3.0) + alto * 0.15;
        float dif = max(dot(n, l), 0.0), esp = vTinte >= 0.88 ? pow(max(dot(reflect(-l, n), v), 0.0), 24.0) * 0.6 : 0.0;
        float borde = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        gl_FragColor = vec4(color * (0.03 + dif * 1.15) + vec3(1.0, 0.95, 0.85) * esp * dif + vec3(0.9, 0.75, 0.6) * borde * dif * 0.12, 1.0);
      }`,
    transparent: true
  }));
  malla.frustumCulled = false;
  return malla;
}

// Gigante gaseoso lejano (como Júpiter): bandas de nubes que giran a distinta velocidad y,
// en lugar de la Gran Mancha Roja, una tormenta con forma de corazón. Lo rodea un cinturón
// de asteroides y un anillo de polvo muy tenue.
export const CENTRO_GIGANTE = new THREE.Vector3(3200, -520, -2650), RADIO_GIGANTE = 150;
function* crearGigante(scene, { uScale, uPR }) {
  const grupo = new THREE.Group(); grupo.position.copy(CENTRO_GIGANTE); scene.add(grupo);
  const textura = texturaPlaneta('gaseosa', { paleta: ['#d9c8ae', '#b8936a', '#8c5a38', '#6b4128', '#cdb596', '#7f5236', '#dcc29f'], semilla: 23, ancho: RES_CERCA, alto: RES_CERCA / 2 }, { relleno: [220, 190, 160], bloquea: false, liberable: true });
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(RADIO_GIGANTE, 160, 112), materialPlaneta(textura, 0xffd9b0, { deriva: 0.004, atmosfera: 0.35, especular: 0.03, terminador: 0.55, corazon: [0.62, 0.38, 0.075] }));
  esfera.rotation.z = 0.05; esfera.scale.y = 0.94;   // achatado por su giro rápido
  grupo.add(esfera);
  yield;
  const plano = new THREE.Group(); plano.rotation.set(0.32, 0, 0.18); grupo.add(plano);
  // Muchas rocas pequeñas sencillas y unas pocas grandes con más detalle.
  const asteroides = crearAsteroides(RADIO_GIGANTE * 1.9, RADIO_GIGANTE * 2.9, 650, { detalle: 1, tamMin: 0.7, tamMax: 3.5 });
  yield;
  const grandes = crearAsteroides(RADIO_GIGANTE * 1.95, RADIO_GIGANTE * 2.85, 44, { detalle: 3, tamMin: 4, tamMax: 11, semilla: 8 });
  plano.add(asteroides, grandes);
  yield;
  const polvo = crearCinturon(RADIO_GIGANTE * 1.7, RADIO_GIGANTE * 3.1, CENTRO_GIGANTE.clone(), RADIO_GIGANTE, { uScale, uPR });
  polvo.rotation.x = -Math.PI / 2; plano.add(polvo);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo(), color: 0xffd2a0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(RADIO_GIGANTE * 3.2); grupo.add(halo);
  yield;
  // Sus cuatro lunas grandes (como las de Júpiter), fuera del cinturón, y dos lunitas que comparten una misma órbita, una
  // rosada y otra azulada, siempre a la misma distancia una de otra: dan vueltas juntas alrededor del gigante del corazón.
  const lunasGigante = [];
  for (const [r, dist, vel, incl, tipo] of [[9, 560, 0.16, 0.06, 'roca'], [8, 680, 0.11, -0.04, 'hielo'], [12, 820, 0.08, 0.05, 'roca'], [11, 990, 0.055, 0.1, 'hielo']]) {
    const orbita = new THREE.Group(); orbita.rotation.set(0.32 + incl, Math.random() * Math.PI * 2, 0.18); grupo.add(orbita);
    const luna = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), tipo === 'hielo' ? materialLunaHielo() : materialLunaRoca()); luna.position.set(dist, 0, 0); orbita.add(luna);
    lunasGigante.push([orbita, vel]);
  }
  const pareja = new THREE.Group(); pareja.rotation.set(0.5, 0, -0.25); grupo.add(pareja);
  for (const [color, fase] of [['#ffb3d4', 0], ['#a9c8ff', 0.5]]) {
    const m = materialPlaneta(texLuna(['#5a4a55', '#b9a8b6', '#f6eef4'], 97, 30, 0.3, 256, 1), color, { atmosfera: 0.35, especular: 0, terminador: 0.35, lunar: true });
    m.uniforms.uBorde.value.set(color);
    const l = new THREE.Mesh(new THREE.SphereGeometry(4.5, 28, 20), m); l.position.set(Math.cos(fase) * 740, 0, Math.sin(fase) * 740); pareja.add(l);
  }
  lunasGigante.push([pareja, 0.07]);
  return {
    actualizar(t, dt) {
      for (const [o, v] of lunasGigante) o.rotation.y += dt * v;
      esfera.rotation.y += dt * 0.05; esfera.material.uniforms.uTime.value = t;
      asteroides.material.uniforms.uT.value = t; grandes.material.uniforms.uT.value = t; polvo.material.uniforms.uTime.value = t;
    }
  };
}

// Materiales de las lunas pequeñas, compartidos (dos texturas para todas: roca con cráteres y hielo claro).
let lunaRoca = null, lunaHielo = null;
const materialLunaRoca = () => lunaRoca ??= materialPlaneta(texLuna(['#3e3a3a', '#8d8580', '#d8d0c8'], 71, 60, 0.5, 256, 1), 0xffe6d0, { atmosfera: 0.02, especular: 0, terminador: 0.3, lunar: true });
const materialLunaHielo = () => lunaHielo ??= materialPlaneta(texLuna(['#8f97a6', '#c9d2dc', '#f4f7fb'], 83, 25, 0.2, 256, 2), 0xe8f4ff, { atmosfera: 0.03, especular: 0.02, terminador: 0.3, lunar: true });

// El resto del sistema solar, para que se sienta completo: Mercurio, Venus, Marte, Saturno con
// sus anillos, Urano y Neptuno, cada uno con su aspecto real, y las órbitas dibujadas muy
// tenues alrededor del Sol. No son destinos; se ven al viajar entre los lugares.
const a = (r, grados, y = 0) => new THREE.Vector3(Math.cos(grados * Math.PI / 180) * r, y, Math.sin(grados * Math.PI / 180) * r);
export const OTROS_PLANETAS = [
  { nombre: 'Mercurio', centro: a(650, 160, 20), radio: 9, tex: () => texCrateres(['#4a4440', '#8f857c', '#cfc6bc'], 31, 70, 0.3, 512), giro: 0.02 },
  { nombre: 'Venus', centro: a(1050, 100, -30), radio: 24, tex: () => texGaseosa(['#f3e2b8', '#e9cf98', '#f6e8c6', '#dcc08a', '#f1ddb0'], 41), giro: 0.004, atmosfera: 0.6, borde: 0xffe2a8 },
  { nombre: 'Marte', centro: a(2900, 200, 60), radio: 15, tex: () => texCrateres(['#5c2a1a', '#b5552e', '#e08a5a'], 47, 60, 0.8, 512), giro: 0.05, atmosfera: 0.15, borde: 0xff9a70, lunas: [[2.4, 30, 0.9, 0.1, 'roca'], [1.8, 46, 0.5, -0.2, 'roca']] },
  { nombre: 'Saturno', centro: a(5800, 140, 200), radio: 105, tex: () => texGaseosa(['#efe0bd', '#dcc497', '#c9a874', '#f0dfba', '#d8bd8c', '#bfa171'], 53), giro: 0.06, anillos: true, borde: 0xffe6b8, lunas: [[10, 330, 0.12, 0.35, 'hielo'], [4.5, 270, 0.2, 0.3, 'hielo'], [3.5, 400, 0.09, 0.4, 'roca']] },
  { nombre: 'Urano', centro: a(7200, 250, -150), radio: 52, tex: () => texGaseosa(['#c9f1f2', '#b5e6ea', '#d6f6f5', '#a9dde3'], 61), giro: 0.03, inclinacion: 1.7, borde: 0xb8f4ff, anillosFinos: true, lunas: [[5, 120, 0.25, 0, 'hielo'], [4.6, 160, 0.17, 0, 'hielo']] },
  { nombre: 'Neptuno', centro: a(8400, 20, 100), radio: 50, tex: () => texGaseosa(['#3d63d6', '#2e4fb8', '#5a7fe8', '#3456c4', '#7b98f0'], 67), giro: 0.035, borde: 0x8fb0ff, lunas: [[6, 110, -0.2, 0.5, 'hielo']] }
];
function* crearOtrosPlanetas(scene, radiosOrbita) {
  const planetas = [], lunas = [];
  for (const p of OTROS_PLANETAS) {
    yield;
    const g = new THREE.Group(); g.position.copy(p.centro); g.rotation.z = p.inclinacion ?? 0.2; scene.add(g);
    const tex = p.tex(); tex.colorSpace = THREE.SRGBColorSpace;   // colores pensados como en una foto
    const esfera = new THREE.Mesh(new THREE.SphereGeometry(p.radio, 96, 64), materialPlaneta(tex, p.borde ?? 0xffffff, { atmosfera: p.atmosfera ?? 0.3, especular: 0.02, terminador: 0.4, deriva: 0.003 }));
    g.add(esfera); planetas.push([esfera, p.giro]);
    if (p.anillos) {
      // Anillos de Saturno: muchas bandas finas color arena, la división de Cassini y la sombra del planeta.
      const anillo = new THREE.Mesh(new THREE.RingGeometry(p.radio * 1.25, p.radio * 2.35, 256, 1), new THREE.ShaderMaterial({
        uniforms: { uCentro: { value: p.centro.clone() }, uRadio: { value: p.radio } },
        vertexShader: 'varying vec2 vP; varying vec3 vMundo; void main(){ vP = position.xy; vec4 m = modelMatrix * vec4(position, 1.0); vMundo = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }',
        fragmentShader: `uniform vec3 uCentro; uniform float uRadio; varying vec2 vP; varying vec3 vMundo;
          float h(float x){ x = fract(x * 0.1031); x *= x + 33.33; x *= x + x; return fract(x); }
          void main(){ float t = (length(vP) - uRadio * 1.25) / (uRadio * 1.1);
            float i = floor(t * 160.0), f = fract(t * 160.0), fino = mix(h(i), h(i + 1.0), smoothstep(0.0, 1.0, f));
            float cassini = smoothstep(0.6, 0.62, t) * (1.0 - smoothstep(0.67, 0.69, t));
            float a = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.92, 1.0, t)) * (0.35 + 0.65 * fino) * (1.0 - cassini * 0.92);
            vec3 l = normalize(-vMundo), aC = uCentro - vMundo; float tl = dot(aC, l);
            float sombra = tl > 0.0 ? smoothstep(uRadio * 0.92, uRadio * 1.04, length(aC - l * tl)) : 1.0;
            vec3 c = mix(vec3(0.95, 0.86, 0.7), vec3(0.78, 0.68, 0.55), t) * (0.15 + 0.85 * sombra);
            gl_FragColor = vec4(c * a, a * 0.85); }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide
      }));
      anillo.rotation.x = Math.PI / 2 - 0.35; anillo.renderOrder = 1; g.add(anillo);
    }
    if (p.anillosFinos) {
      // Anillos de Urano: unos pocos anillos estrechos y oscuros, trazos nítidos (no un disco difuso).
      const anillo = new THREE.Mesh(new THREE.RingGeometry(p.radio * 1.6, p.radio * 2.05, 256, 1), new THREE.ShaderMaterial({
        uniforms: { uRadio: { value: p.radio } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float uRadio; varying vec2 vP;
          void main(){ float r = length(vP) / uRadio, a = 0.0;
            for (int i = 0; i < 5; i++) { float c = 1.65 + float(i) * 0.085 + (i == 4 ? 0.06 : 0.0), w = i == 4 ? 0.012 : 0.006; a = max(a, step(abs(r - c), w)); }
            gl_FragColor = vec4(vec3(0.62, 0.72, 0.78) * a * 0.55, a * 0.6); }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide
      }));
      anillo.rotation.x = Math.PI / 2; g.add(anillo);
    }
    // Lunas: pequeñas, con cráteres (roca) o lisas y claras (hielo), cada una en su órbita (giran en actualizar).
    for (const [r, dist, vel, incl, tipo] of p.lunas ?? []) {
      const orbita = new THREE.Group(); orbita.rotation.set(incl, Math.random() * Math.PI * 2, 0); orbita.position.copy(p.centro); scene.add(orbita);
      const luna = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), tipo === 'hielo' ? materialLunaHielo() : materialLunaRoca());
      luna.position.set(dist, 0, 0); orbita.add(luna); lunas.push([orbita, vel, luna]);
    }
    radiosOrbita.push(Math.hypot(p.centro.x, p.centro.z));
  }
  // Órbitas: círculos muy tenues alrededor del Sol.
  const material = new THREE.LineBasicMaterial({ color: '#d9c6ff', transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const r of radiosOrbita) {
    const pts = Array.from({ length: 256 }, (_, i) => { const t = i / 256 * Math.PI * 2; return new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r); });
    scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), material));
  }
  return { actualizar(t, dt) { for (const [e, giro] of planetas) { e.rotation.y += dt * giro; e.material.uniforms.uTime.value = t; } for (const [o, v, l] of lunas) { o.rotation.y += dt * v; l.rotation.y += dt * 0.1; } } };
}

// De un tirón; la carga usa construirPlanetas, el mismo código como generador (yield entre pasos: ver porTramos).
export const crearPlanetas = (...a) => deUnTiron(construirPlanetas(...a));
export function* construirPlanetas({ scene, uScale, uPR }, fechaTexto) {
  const gigante = yield* crearGigante(scene, { uScale, uPR });
  yield;
  // Radios de las órbitas de los lugares (planeta rosa, Tierra, luna del correo, gigante) y del resto.
  yield;
  const otros = yield* crearOtrosPlanetas(scene, [Math.hypot(1550, -400), Math.hypot(1650, 1600), Math.hypot(1250, 1550), Math.hypot(3200, 2650)]);
  yield;
  // ── Planeta rosa ──
  const orbitaRosa = new THREE.Group(); scene.add(orbitaRosa);
  const planeta = new THREE.Group();
  const R = 62;
  planeta.position.set(1550, 160, -400);
  orbitaRosa.add(planeta);

  const sombraAnillo = { normal: new THREE.Vector3(), centro: planeta.position.clone(), rIn: R * 1.35, rOut: R * 2.45 };
  const esfera = new THREE.Mesh(
    new THREE.SphereGeometry(R, 160, 112),
    materialPlaneta(texGaseosa(['#ffe1ee', '#f7b6d4', '#ef8dbd', '#d65d97', '#bf4f8c', '#f4a9cc', '#e2a2f2'], 7, RES_CERCA), 0xff9ccc, { deriva: 0.005, atmosfera: 0.4, especular: 0.06, diferencial: 0.45, sombraAnillo })
  );
  esfera.rotation.z = 0.35;
  planeta.add(esfera);

  const anillo = crearAnillo(R * 1.35, R * 2.45, planeta.position.clone(), R);
  anillo.rotation.x = Math.PI / 2 - 0.42; anillo.rotation.y = 0.25;
  planeta.add(anillo);
  sombraAnillo.normal.set(0, 0, 1).applyEuler(anillo.rotation);
  yield;
  // Nubes altas rosadas que corren más rápido que las bandas.
  const nubesRosa = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 64), materialNubes(texNubes(17), { color: '#ffe8f3', velocidad: 0.008, opacidad: 0.4 }));
  nubesRosa.renderOrder = 1; esfera.add(nubesRosa);
  anillo.renderOrder = 1;   // después del planeta: la profundidad decide qué parte queda detrás
  const anilloFecha = crearAnilloFecha(R * 2.62, R * 2.95, fechaTexto);
  anilloFecha.rotation.copy(anillo.rotation); anilloFecha.renderOrder = 1; planeta.add(anilloFecha);
  const cinturon = crearCinturon(R * 1.35, R * 2.45, planeta.position.clone(), R, { uScale, uPR });
  cinturon.renderOrder = 1;
  cinturon.rotation.copy(anillo.rotation);
  planeta.add(cinturon);

  yield;
  // Halo discreto (antes 0,35 a 5 radios: un degradado rosa que lo envolvía todo).
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo(), color: 0xff7fb8, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(R * 3.6, R * 3.6, 1);
  planeta.add(halo);

  yield;
  // Auroras en los polos: cortinas de luz que ondulan (la vida del planeta).
  const auroras = [1, -1].map(polo => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.36, R * 0.32, 96, 1, true), new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`
        uniform float uT; varying vec2 vUv;
        void main(){
          float rayos = 0.55 + 0.45 * sin(vUv.x * 80.0 + sin(vUv.x * 13.0 + uT * 0.8) * 2.0 + uT * 0.4);
          float alto = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
          vec3 c = mix(vec3(1.0, 0.45, 0.75), vec3(0.75, 0.55, 1.0), vUv.y);
          float a = rayos * alto * (0.55 + 0.45 * sin(uT * 0.7 + vUv.x * 6.2831853 * 2.0));
          gl_FragColor = vec4(c * a * 0.7, a);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
    }));
    m.position.y = polo * R * 0.9; if (polo < 0) m.rotation.x = Math.PI; m.renderOrder = 2; esfera.add(m); return m;
  });
  yield;
  // Lunita con cráteres
  const orbitaLuna = new THREE.Group(); planeta.add(orbitaLuna);
  const luna = new THREE.Mesh(new THREE.SphereGeometry(14, 128, 96), materialPlaneta(texLuna(['#4c4650', '#a49aa6', '#efe7ee'], 3, 170, 1, texturasLigeras ? 768 : 1024), 0xffd8ea, { atmosfera: 0.04, especular: 0.0, terminador: 0.3, relieve: RELIEVE, altura: true, lunar: true, reflejo: 0x3a1c2c }));
  luna.position.set(R * 3.1, 18, 0);
  orbitaLuna.add(luna); orbitaLuna.rotation.x = 0.3;
  yield;
  // Segunda luna, pequeña y más rápida, en otra órbita.
  const orbitaLuna2 = new THREE.Group(); orbitaLuna2.rotation.set(-0.5, 0, 0.35); planeta.add(orbitaLuna2);
  const luna2 = new THREE.Mesh(new THREE.SphereGeometry(7, 96, 64), materialPlaneta(texLuna(['#5a4a4e', '#b8a0a8', '#f4e2e8'], 13, 110, 0.6, 512, 1), 0xffd0e0, { atmosfera: 0.03, especular: 0, terminador: 0.3, relieve: RELIEVE, altura: true, lunar: true, reflejo: 0x2a1420 }));
  luna2.position.set(-R * 3.55, 0, 0); orbitaLuna2.add(luna2);

  const etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texTexto(fechaTexto, { fuente: "600 72px 'Quicksand', sans-serif" }),
    transparent: true, depthWrite: false, opacity: 0.9, blending: THREE.AdditiveBlending
  }));
  etiqueta.scale.set(260, 40, 1); etiqueta.position.set(0, R * 2.1, 0);
  planeta.add(etiqueta);

  yield;
  // ── Dos orillas, un cielo: planeta océano ──
  const RA = 30, centroAzul = new THREE.Vector3(1650, -100, 1600);
  const orbitaAzul = new THREE.Group(); orbitaAzul.position.copy(centroAzul); scene.add(orbitaAzul);
  const ciudades = [lugar(...BARCELONA, RA), lugar(...BUENOS_AIRES, RA)];
  const { superficie, mascara } = texTierra(11);
  yield;
  // Colores pensados en sRGB (como una foto): sin esto el océano se veía lavado, celeste.
  superficie.colorSpace = THREE.SRGBColorSpace;
  yield;
  // El Sol de la Tierra está donde está de verdad ahora mismo (día y noche reales).
  const solTierra = new THREE.Vector3(1, 0, 0), solLocal = new THREE.Vector3(1, 0, 0), giroTierra = new THREE.Quaternion();
  let ultimoSol = -Infinity;
  const giroAzul = new THREE.Group(); giroAzul.rotation.z = 0.32; orbitaAzul.add(giroAzul);
  const azul = new THREE.Mesh(new THREE.SphereGeometry(RA, 128, 96), materialPlaneta(superficie, 0x7fb0ff, { atmosfera: 0.9, mascara, terminador: 0.35, sol: solTierra, relieve: 7, altura: true }));
  yield;
  // Atmósfera: una capa exterior que dispersa la luz azul en el borde iluminado (como vista desde el espacio).
  const atmosferaTierra = new THREE.Mesh(new THREE.SphereGeometry(RA * 1.045, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uSol: { value: solTierra } },
    vertexShader: 'varying vec3 vN; varying vec3 vMundo; void main(){ vec4 m = modelMatrix * vec4(position, 1.0); vMundo = m.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * m; }',
    fragmentShader: /* glsl */`
      uniform vec3 uSol; varying vec3 vN; varying vec3 vMundo;
      void main(){
        vec3 n = normalize(vN), v = normalize(cameraPosition - vMundo), l = normalize(uSol);
        float borde = pow(1.0 - abs(dot(n, v)), 2.2), luz = smoothstep(-0.25, 0.4, dot(n, l));
        // En el borde entre el día y la noche la luz atraviesa más aire: se vuelve anaranjada.
        float ocaso = exp(-pow(dot(n, l) * 4.0, 2.0));
        vec3 c = mix(mix(vec3(0.25, 0.5, 1.0), vec3(0.6, 0.82, 1.0), borde), vec3(1.0, 0.55, 0.3), ocaso * 0.6) * borde * max(luz, ocaso * 0.5) * 0.9;
        gl_FragColor = vec4(c, borde * luz);
      }`,
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending
  }));
  atmosferaTierra.renderOrder = 2;
  giroAzul.add(azul, atmosferaTierra);
  const nubes = new THREE.Mesh(new THREE.SphereGeometry(RA * 1.012, 96, 64), materialNubes(texNubes(5), { sol: solTierra }));
  nubes.renderOrder = 1; giroAzul.add(nubes);
  yield;
  // Atmósfera fina (borde) en lugar de un gran halo.
  const haloAzul = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo(), color: 0x7fa6ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
  haloAzul.scale.set(RA * 3.4, RA * 3.4, 1); orbitaAzul.add(haloAzul);
  yield;
  // Las dos ciudades encendidas y el arco de luz que las une, girando con el planeta.
  const destello = texDestello();
  for (const [i, c] of ciudades.entries()) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: destello, color: i ? '#ffb0d2' : '#9cc4ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(c.clone().multiplyScalar(1.01)); s.scale.setScalar(9); s.renderOrder = 2; azul.add(s);
  }
  const [a, b] = ciudades.map(c => c.clone().normalize()), omega = a.angleTo(b);
  const arco = Array.from({ length: 90 }, (_, i) => {
    const t = i / 89, p = a.clone().multiplyScalar(Math.sin((1 - t) * omega)).add(b.clone().multiplyScalar(Math.sin(t * omega))).divideScalar(Math.sin(omega));
    return p.multiplyScalar(RA * (1.02 + Math.sin(t * Math.PI) * 0.32));
  });
  const puente = crearRecorrido(arco, '#ffe0ef', { uScale, uPR, tam: 2.3, velocidad: 0.12, base: 0.55 }); puente.renderOrder = 2; azul.add(puente);
  yield;
  // Luna con cráteres en órbita inclinada.
  const orbitaLunaAzul = new THREE.Group(); orbitaLunaAzul.rotation.set(0.5, 0, 0.25); orbitaAzul.add(orbitaLunaAzul);
  const lunaAzul = new THREE.Mesh(new THREE.SphereGeometry(6.5, 128, 96), materialPlaneta(texLuna(['#3a3a3e', '#9a9aa0', '#f0f0f2'], 9, 220, 1, texturasLigeras ? 768 : 1024, 4), 0xffffff, { atmosfera: 0.02, especular: 0.0, terminador: 0.3, sol: solTierra, relieve: RELIEVE, altura: true, lunar: true, reflejo: 0x101c2e }));
  lunaAzul.position.set(58, 0, 0); orbitaLunaAzul.add(lunaAzul);
  yield;
  // Las dos estrellas de las orillas, encima del planeta.
  const dosEstrellas = crearDosEstrellas({ uScale, uPR });
  dosEstrellas.grupo.position.y = 64; orbitaAzul.add(dosEstrellas.grupo);

  yield;
  // Mitad del océano entre las dos ciudades (lo que se muestra al visitar) y vector auxiliar.
  const atlantico = lugar(-32, -6, 1), haciaCamara = new THREE.Vector3();
  esfera.userData.destino = 'rosa'; azul.userData.destino = 'azul';
  return {
    objetos: [esfera, azul],
    // Posiciones útiles para que la cámara cuente algo en el viaje (index.js).
    // Dónde estará la luna dentro de `segundos` (la cámara pasa por detrás de ella).
    lunaAzulEn(segundos = 0) {
      const antes = orbitaLunaAzul.rotation.y; orbitaLunaAzul.rotation.y += 0.4 * segundos;
      orbitaLunaAzul.updateMatrixWorld(true); const p = lunaAzul.getWorldPosition(new THREE.Vector3());
      orbitaLunaAzul.rotation.y = antes; orbitaLunaAzul.updateMatrixWorld(true); return p;
    },
    // Un punto en el borde exterior del anillo rosa, del lado indicado (vector unitario).
    bordeAnillo(direccion) {
      const normal = new THREE.Vector3(0, 0, 1).applyEuler(anillo.rotation);
      const enPlano = direccion.clone().addScaledVector(normal, -direccion.dot(normal)).normalize();
      return planeta.position.clone().addScaledVector(enPlano, R * 3.3).addScaledVector(normal, R * 0.35);
    },
    radioRosa: R, radioAzul: RA,
    // Dirección (en el mundo) desde el centro de la Tierra hacia el Atlántico, entre las dos orillas.
    atlantico() { azul.updateWorldMatrix(true, false); const c = azul.getWorldPosition(new THREE.Vector3()); return azul.localToWorld(atlantico.clone().multiplyScalar(RA)).sub(c).normalize(); },
    actualizar(t, dt, ctx) {
      esfera.rotation.y += dt * 0.12;
      esfera.material.uniforms.uTime.value = t;
      orbitaLuna.rotation.y += dt * 0.5; orbitaLuna2.rotation.y -= dt * 0.9;
      luna.rotation.y += dt * 0.2; luna2.rotation.y += dt * 0.3;
      for (const a of auroras) a.material.uniforms.uT.value = t;
      // Gira despacio; al visitarlo se orienta para mostrar el Atlántico entre las dos orillas.
      // La Tierra gira de forma que el Sol del sistema solar (en el origen) ilumine lo que es de
      // día ahora mismo de verdad: el punto subsolar real mira hacia el Sol.
      if (t - ultimoSol > 5 || t < ultimoSol) { const { longitud, latitud } = puntoSubsolar(new Date()); solLocal.copy(lugar(longitud, latitud, 1)); ultimoSol = t; }
      giroAzul.updateWorldMatrix(true, false); giroAzul.worldToLocal(haciaCamara.set(0, 0, 0)).normalize();
      const objetivoGiro = Math.atan2(haciaCamara.x, haciaCamara.z) - Math.atan2(solLocal.x, solLocal.z);
      const delta = ((objetivoGiro - azul.rotation.y) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      azul.rotation.y += Math.abs(delta) > 0.5 ? delta : delta * Math.min(1, dt * 2);
      nubes.rotation.y = azul.rotation.y + t * 0.004;
      azul.updateWorldMatrix(true, false); solTierra.copy(azul.getWorldPosition(haciaCamara)).negate().normalize();   // dirección al Sol
      nubes.material.uniforms.uTime.value = t; puente.material.uniforms.uTime.value = t;
      orbitaLunaAzul.rotation.y += dt * 0.4; lunaAzul.rotation.y += dt * 0.15;
      cinturon.material.uniforms.uTime.value = t; anilloFecha.material.uniforms.uTime.value = t;
      dosEstrellas.actualizar(t); gigante.actualizar(t, dt); otros.actualizar(t, dt);
      nubesRosa.material.uniforms.uTime.value = t;
    }
  };
}
