// Lo que se dibuja en las escenas propias de los gigantes (sus tiempos y curvas: js/util/escenasGigantes.js). El púlsar
// tiene su propio archivo: js/escena/pulsar.js.
// Toda la luz nueva son motas nítidas de 1,5–3 píxeles (nada de halos ni degradados) y nada tapa a los
// gigantes: las motas que caen delante de la estrella, en la línea de la cámara, se apagan. Las geometrías y
// los materiales se crean en la carga (preparacion.js los compila y calienta); en cada cuadro solo cambian
// uniformes y, en Deneb, la posición del mundo nuevo (sin memoria nueva). Ocultos mientras no hay escena.
import * as THREE from 'three';
import { EXPOSICION } from './exposicion.js';

// Azar con semilla: las mismas motas en cada carga y en cada aparato.
function azarCon(semilla) { let s = semilla >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; }

const motas = (uniforms, vertexShader, colorFinal = 'vC') => new THREE.ShaderMaterial({
  uniforms, vertexShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  // Punto redondo con núcleo: nítido, sin cola difusa (y sin discard: mejor para las GPU de teselas del móvil).
  fragmentShader: /* glsl */`varying vec3 vC; varying float vA;
    void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(max(1.0 - d * 2.0, 0.0), 1.6) + (1.0 - smoothstep(0.0, 0.18, d)) * 0.8;
      // Luz sumada tal cual (alfa 1 con mezcla aditiva): con (c·k, k) se sumaba c·k² y las motas se perdían.
      float k = a * vA; gl_FragColor = vec4(${colorFinal} * k, 1.0); }`
});

// Tamaño en píxeles de una mota de `tam` unidades locales (como las de la supernova) y su luz: las que
// quedan por debajo del mínimo se reparten en 1,5 px con menos luz (no parpadean al girar).
const TAMANO = /* glsl */`
  float tamMota(float tam, vec4 mv, float maximo){ float px = tam * length(modelViewMatrix[0].xyz) * uScale / max(1.0, -mv.z);
    gl_PointSize = clamp(px, 1.5, maximo * uPR); return min(1.0, px * px / 2.25); }
  // Delante de la estrella (en la línea de la cámara, dentro de un cono de radio uSilueta en el centro) no
  // hay motas: el gigante se ve limpio. Todo en el espacio de la vista (sin coordenadas enormes).
  float fueraSilueta(vec4 mv){ vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float dc = max(length(c), 1.0); vec3 eje = c / dc;
    float t = dot(mv.xyz, eje), r = uSilueta * length(modelViewMatrix[0].xyz) * t / dc;
    return 1.0 - step(t, dc) * step(0.0, t) * (1.0 - smoothstep(r * 0.8, r * 1.2, length(mv.xyz - eje * t))); }`;

// ── Cuásar: las motas de su escena (el resto lo hace el propio cuásar: chorros que crecen, disco, núcleo; cuasar.js) ──
// En el espacio del cuásar (CUASAR de cuasar.js: disco 300–1100, chorros de 7600 por ±Y, galaxia de radio 4800). El disco
// está en el plano XZ. Se dibujan por encima del remolino (como su polvo estelar) y la sombra del horizonte, que va encima
// de todo, las tapa si caen delante. (Sin anillo de motas girando alrededor del disco: Carlos no lo quería.)
//  · chorros: un hilo de motas que sube por cada chorro, siempre; en la escena, solo hasta donde ha llegado el chorro, con
//    su frente brillante mientras crece;
//  · otras: lucecitas de colores por toda la galaxia (las otras mujeres), que se apagan con «pero ella»;
//  · onda: en «es mi mujer…» la luz de la galaxia se recoge en el núcleo y en «…ideal» sale del disco hacia fuera;
//  · lóbulos: en las puntas de los chorros, cuando llegan enteros, la luz florece (motas que se abren y se apagan).
export function crearEscenaCuasar({ uScale, uPR, largo = 7600 }) {
  const azar = azarCon(3107), grupo = new THREE.Group();

  const NC = 5000, pC = new Float32Array(NC * 3);
  for (let i = 0; i < NC; i++) pC.set([azar(), azar(), i % 2 ? 1 : -1], i * 3);
  const gC = new THREE.BufferGeometry(); gC.setAttribute('position', new THREE.BufferAttribute(pC, 3));
  const uC = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uBase: { value: 0.4 }, uSubida: { value: 1.05 }, uFrente: { value: 0 }, uFlujo: { value: 0 }, uCalido: { value: 0 }, uSilueta: { value: 0 }, uNudos: { value: new THREE.Vector4(-1, -1, -1, -1) }, uNudosLuz: { value: new THREE.Vector4() } };
  const chorros = new THREE.Points(gC, motas(uC, /* glsl */`uniform float uScale, uPR, uExpo, uLuz, uBase, uSubida, uFrente, uFlujo, uCalido, uSilueta; uniform vec4 uNudos, uNudosLuz; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float f = fract(position.x + uFlujo * (0.4 + 0.6 * position.y)), y = 300.0 + f * ${(largo * 0.93).toFixed(1)}, yf = y / ${largo.toFixed(1)};
      float a = position.y * 6.2832 + position.x * 31.0 + f * 9.0, r = (30.0 + 300.0 * f) * sqrt(fract(position.x * 7.13 + position.y * 3.1));
      vec4 mv = modelViewMatrix * vec4(cos(a) * r, position.z * y, sin(a) * r, 1.0); gl_Position = projectionMatrix * mv;
      // Hasta donde ha llegado el chorro (en reposo, 1,05: entero) y su frente, que brilla mientras crece.
      float dentro = 1.0 - smoothstep(uSubida - 0.03, uSubida, yf), frente = exp(-pow((yf - uSubida + 0.015) / 0.02, 2.0)) * uFrente;
      vC = mix(mix(vec3(1.0), vec3(0.7, 0.8, 1.0), f), mix(vec3(1.0, 0.66, 0.8), vec3(1.0, 0.85, 0.55), position.y), uCalido);
      float base = uBase * (0.4 + 0.6 * position.y) * (1.0 - smoothstep(0.75, 1.0, f));
      vec4 dn = (vec4(yf) - uNudos) / 0.02; float nudo = dot(exp(-dn * dn), uNudosLuz);   // los nudos de plasma que recorren el chorro
      vA = ((base + uLuz * (0.5 + 0.5 * position.y) + nudo * 2.6) * dentro + frente * 2.4) * tamMota(20.0 + position.y * 16.0, mv, 2.8) * uExpo; }`));
  chorros.renderOrder = 22;

  // Las otras (impresionantes, bellas, exitosas… pero no ella): 48 estrellas brillantes repartidas por la galaxia, cada una
  // con su cruz de luz fina (nítida: un punto y dos trazos de 1 px, sin halo), que se encienden una tras otra con la frase y
  // titilan; con «pero ella» se apagan todas. Tamaño fijo en pantalla: se leen igual de cerca que de lejos.
  const NO = 48, pO = new Float32Array(NO * 3), dO = new Float32Array(NO * 2);
  for (let i = 0; i < NO; i++) { const r = 1500 + 3000 * Math.sqrt(azar()), a = azar() * Math.PI * 2; pO.set([Math.cos(a) * r, (azar() - 0.5) * 160, Math.sin(a) * r], i * 3); dO.set([(i + azar() * 0.8) / NO, azar()], i * 2); }
  const gO = new THREE.BufferGeometry(); gO.setAttribute('position', new THREE.BufferAttribute(pO, 3)); gO.setAttribute('aDato', new THREE.BufferAttribute(dO, 2));
  const uO = { uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uT: { value: 0 }, uTitileo: { value: 1 } };
  const otras = new THREE.Points(gO, new THREE.ShaderMaterial({
    uniforms: uO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`attribute vec2 aDato; uniform float uPR, uExpo, uLuz, uT, uTitileo; varying vec3 vC; varying float vA, vBrazo;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float h = aDato.x, h2 = aDato.y;
        vC = h2 < 0.3 ? vec3(1.0, 0.85, 0.6) : h2 < 0.55 ? vec3(0.75, 0.85, 1.0) : h2 < 0.8 ? vec3(1.0, 0.72, 0.86) : vec3(1.0);
        // Cada una se enciende a su turno (h: su orden) con un destello breve y luego titila.
        float x = (uLuz - h * 0.85) / 0.15, aparece = clamp(x, 0.0, 1.0), destello = exp(-pow(x - 1.0, 2.0) * 2.0) * step(0.0, x);
        float titila = 1.0 - uTitileo * 0.35 * (0.5 + 0.5 * sin(uT * (1.4 + h2 * 2.2) + h * 40.0));
        vBrazo = 0.55 + 0.45 * titila + 0.6 * destello;
        gl_PointSize = 19.0 * uPR; vA = 1.8 * aparece * min(1.0, uLuz * 3.0) * titila * (1.0 + destello) * uExpo * step(0.0, -mv.z); }`,
    fragmentShader: /* glsl */`varying vec3 vC; varying float vA, vBrazo;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q);
        float nucleo = 1.0 - smoothstep(0.05, 0.09, d);
        float largo = 0.5 * vBrazo, brazos = (1.0 - smoothstep(0.012, 0.04, abs(q.x))) * max(0.0, 1.0 - abs(q.y) / largo) + (1.0 - smoothstep(0.012, 0.04, abs(q.y))) * max(0.0, 1.0 - abs(q.x) / largo);
        float k = (nucleo + brazos * 0.75) * vA; gl_FragColor = vec4(vC * k, 1.0); }`
  }));
  otras.renderOrder = 16;

  // La onda: primero (uConv 0 → 1) motas de toda la galaxia caen en espiral al núcleo; luego (uCima ≥ 0, segundos) sale una
  // onda de motas del disco hacia fuera, nítida, que se apaga al alejarse.
  const NE = 3600, pE = new Float32Array(NE * 3);
  for (let i = 0; i < NE; i++) pE.set([azar() * Math.PI * 2, azar(), azar()], i * 3);
  const gE = new THREE.BufferGeometry(); gE.setAttribute('position', new THREE.BufferAttribute(pE, 3));
  const uE = { uScale, uPR, uExpo: EXPOSICION, uLuz: { value: 0 }, uCima: { value: -1 }, uConv: { value: -1 }, uSilueta: { value: 330 } };
  const onda = new THREE.Points(gE, motas(uE, /* glsl */`uniform float uScale, uPR, uExpo, uLuz, uCima, uConv, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float r, a, h, luz;
      if (uConv >= 0.0) {
        float c = uConv * uConv * (3.0 - 2.0 * uConv), r0 = 1500.0 + 3200.0 * position.y;
        r = mix(r0, 330.0, c); a = position.x + c * (2.5 + 2.0 * position.z); h = (position.z - 0.5) * 120.0 * (1.0 - c);
        luz = smoothstep(0.0, 0.25, uConv) * (1.0 - smoothstep(0.85, 1.0, uConv) * 0.6);
      } else {
        float t = max(uCima, 0.0); r = 1100.0 + t * 2300.0 * (0.75 + 0.5 * position.y); a = position.x + t * 0.1; h = (position.z - 0.5) * 90.0 * (0.3 + t);
        luz = step(0.0, uCima) * smoothstep(0.0, 0.15, uCima) * (1.0 - smoothstep(0.8, 2.3, t));
      }
      vec4 mv = modelViewMatrix * vec4(cos(a) * r, h, sin(a) * r, 1.0); gl_Position = projectionMatrix * mv;
      vC = mix(vec3(1.0, 0.7, 0.84), vec3(1.0, 0.9, 0.62), position.z);
      vA = uLuz * luz * tamMota(22.0 + position.z * 16.0, mv, 3.0) * fueraSilueta(mv) * uExpo; }`));
  onda.renderOrder = 16;

  // Lóbulos que florecen: en cada punta, motas que se abren desde el final del chorro (uEst: segundos desde que llegan).
  const NL = 1200, pL = new Float32Array(NL * 3);
  for (let i = 0; i < NL; i++) pL.set([azar(), azar(), i % 2 ? 1 : -1], i * 3);
  const gL = new THREE.BufferGeometry(); gL.setAttribute('position', new THREE.BufferAttribute(pL, 3));
  const uL = { uScale, uPR, uExpo: EXPOSICION, uEst: { value: -1 }, uLuz: { value: 0 }, uSilueta: { value: 0 } };
  const lobulos = new THREE.Points(gL, motas(uL, /* glsl */`uniform float uScale, uPR, uExpo, uEst, uLuz, uSilueta; varying vec3 vC; varying float vA;
    ${TAMANO}
    void main(){ float t = max(uEst, 0.0), z = position.x * 2.0 - 1.0, ph = position.y * 6.2832, q = sqrt(max(0.0, 1.0 - z * z));
      vec3 d = vec3(q * cos(ph), z * 0.8 + 0.35, q * sin(ph));   // hacia fuera (un poco más en la dirección del chorro)
      float k = fract(position.x * 13.7 + position.y * 7.1), R = 2100.0 * (1.0 - exp(-t * 2.2)) * (0.45 + 0.55 * k);
      vec3 p = vec3(0.0, ${(largo * 0.97).toFixed(1)}, 0.0) + d * R; p.y *= position.z;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
      vC = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.75, 0.88), k);
      vA = uLuz * step(0.0, uEst) * smoothstep(0.0, 0.12, uEst) * (1.0 - smoothstep(0.5, 1.5, t)) * tamMota(60.0 + k * 40.0, mv, 3.0) * uExpo; }`));
  lobulos.renderOrder = 22;

  for (const o of [chorros, otras, onda, lobulos]) { o.frustumCulled = false; o.visible = false; grupo.add(o); }
  let flujo = 0;
  return {
    grupo,
    // e: estado de js/util/escenasGigantes.js (estadoCuasar); peso: 1 en escena, → 0 al cancelarla.
    actualizar(e, peso, dt, t, reducido) {
      const ver = peso > 0.0005;
      flujo += dt * (reducido ? 0.006 : 0.015) * (ver ? 1 : 2); uC.uFlujo.value = flujo;   // el hilo de los chorros, siempre
      chorros.visible = true; otras.visible = ver && e.otras > 0.002; onda.visible = ver && (e.conv >= 0 || (e.cima >= 0 && e.cima < 2.4)); lobulos.visible = ver && e.estallido >= 0 && e.estallido < 1.6;
      uC.uSubida.value = ver ? 1.05 + (e.alcance - 1.05) * peso : 1.05;
      if (!ver) { uC.uLuz.value = 0; uC.uFrente.value = 0; uC.uCalido.value = 0; uC.uNudosLuz.value.set(0, 0, 0, 0); return; }
      if (e.nudos) { uC.uNudos.value.fromArray(e.nudos); uC.uNudosLuz.value.fromArray(e.nudosLuz).multiplyScalar(peso); }
      uC.uLuz.value = 0.35 * e.frente * peso; uC.uFrente.value = e.frente * peso; uC.uCalido.value = e.calido * peso;
      uO.uLuz.value = e.otras * peso; uO.uT.value = t; uO.uTitileo.value = reducido ? 0 : 1;
      uE.uLuz.value = peso; uE.uCima.value = e.cima; uE.uConv.value = e.conv;
      uL.uLuz.value = peso * (reducido ? 0.5 : 1); uL.uEst.value = e.estallido;
    }
  };
}
