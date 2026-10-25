// El universo propio de cada gigante: al acercarse a la supernova, al cuásar, a TON 618 o al púlsar
// aparece otro cielo, con sus estrellas, su velo de color y sus constelaciones (dibujos nuestros:
// un corazón, un infinito, una flecha de Cupido…). Son puntos con posición 3D fija alrededor del
// destino: al girar cambia su perspectiva. Desde casa no se ven (están a millones de unidades y se
// encienden solo al entrar en su región); allí, el cielo de casa se ha apagado (index.js, «locales»).
// Las galaxias de fondo de cada destino están en el catálogo (js/data/catalogo.js, universosLlegada).
import * as THREE from 'three';
import { deUnTiron } from '../util/azarSemilla.js';
import { RADIO_GIGANTE, LLEGADA_GIGANTE } from '../data/escalaCosmica.js';
import { RUIDO_TABLA, texturaRuido } from './nube.js';

// Paletas: [estrellas frías, estrellas cálidas, acento de las constelaciones, velo A, velo B].
const PALETAS = {
  supernova: ['#cfe0ff', '#ffc4d8', '#ffb3cf', '#ff4f9a', '#7a4dff'],
  cuasar: ['#bcd8ff', '#ffd2a0', '#9fd0ff', '#2f6bff', '#ff7a2a'],
  ton618: ['#e8e2ff', '#ffd98a', '#ffd27a', '#ff9f2a', '#8a3dff'],
  pulsar: ['#c8f4ff', '#e0ccff', '#8ff0ff', '#1fc8d8', '#7a5cff'],
  sagitario: ['#ffe0c0', '#ffc8a0', '#ffd0a0', '#ff8a3c', '#b04cff'],
  deneb: ['#e8f0ff', '#ffffff', '#cfe0ff', '#4f8aff', '#c06cff']
};
// Constelaciones: puntos en un plano (−1…1) y trazos entre ellos.
const FIGURAS = {
  corazon: { curva: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], p: [[0.000, 0.394], [0.038, 0.524], [0.250, 0.749], [0.611, 0.776], [0.899, 0.523], [0.899, 0.140], [0.611, -0.224], [0.250, -0.540], [0.038, -0.795], [0.000, -0.900], [-0.038, -0.795], [-0.250, -0.540], [-0.611, -0.224], [-0.899, 0.140], [-0.899, 0.523], [-0.611, 0.776], [-0.250, 0.749], [-0.038, 0.524]], t: [] },
  infinito: { curva: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], p: [[1.000, 0.000], [0.868, 0.322], [0.601, 0.424], [0.355, 0.345], [0.162, 0.185], [0.000, 0.000], [-0.162, -0.185], [-0.355, -0.345], [-0.601, -0.424], [-0.868, -0.322], [-1.000, -0.000], [-0.868, 0.322], [-0.601, 0.424], [-0.355, 0.345], [-0.162, 0.185], [-0.000, 0.000], [0.162, -0.185], [0.355, -0.345], [0.601, -0.424], [0.868, -0.322]], t: [] },
  estrella: { p: [[0, 1], [0.24, 0.32], [0.95, 0.3], [0.38, -0.12], [0.59, -0.81], [0, -0.38], [-0.59, -0.81], [-0.38, -0.12], [-0.95, 0.3], [-0.24, 0.32]], t: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0]] },
  flecha: { p: [[-1, -0.6], [-0.3, -0.18], [0.45, 0.27], [1, 0.6], [0.72, 0.62], [0.95, 0.32], [-0.85, -0.38], [-0.82, -0.75], [-0.6, -0.42]], t: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [0, 6], [0, 7], [1, 8]] },
  corona: { p: [[-0.9, -0.5], [-0.9, 0.35], [-0.45, -0.05], [0, 0.65], [0.45, -0.05], [0.9, 0.35], [0.9, -0.5]], t: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]] },
  luna: { curva: [0, 1, 2, 3, 4, 5, 6, 7, 8], p: [[0.2, 1], [-0.35, 0.8], [-0.75, 0.35], [-0.85, -0.2], [-0.55, -0.7], [0.1, -0.95], [-0.25, -0.45], [-0.35, 0.05], [-0.15, 0.55]], t: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0]] }
};
// Constelaciones de cada destino: figura, ángulo respecto a la mirada de llegada (grados), giro
// alrededor de ella y tamaño angular (grados). Las primeras se ven al llegar, en los bordes.
const CIELOS = {
  // La supernova, sin constelaciones con figura: su único corazón es el que nace de sus chispas (Carlos no quiere
  // corazones ni infinitos hechos con estrellas en el cielo de los gigantes).
  supernova: [],
  cuasar: [['corazon', 23, 140, 4.5], ['infinito', 24, 330, 4.5]],
  ton618: [['corazon', 24, 320, 4.5], ['infinito', 24, 140, 4.5]],
  pulsar: [['corazon', 23, 135, 4.5], ['infinito', 24, 315, 4.5]],
  sagitario: [['flecha', 23, 45, 4.5], ['estrella', 24, 225, 4.5]],   // la flecha del arquero (Sagitario); sin corazones ni infinitos
  deneb: []   // sin figuras de estrellas: su historia la cuenta la estrella que nace (deneb.js)
};

function azarSemilla(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const materialEstrellas = (uPR) => new THREE.ShaderMaterial({
  uniforms: { uPR, uVisible: { value: 0 }, uT: { value: 0 } },
  vertexShader: /* glsl */`uniform float uPR, uVisible, uT; attribute vec3 aCol; attribute float aTam, aFase; varying vec3 vC; varying float vA, vBrillante;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
      gl_PointSize = aTam * uPR; vBrillante = step(3.2, aTam);
      vA = uVisible * (0.75 + 0.25 * sin(uT * (0.6 + aFase * 1.8) + aFase * 40.0)); vC = aCol; }`,
  fragmentShader: /* glsl */`varying vec3 vC; varying float vA, vBrillante;
    void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; if (d > 1.0) discard;
      float k = exp(-d * d * 7.0) + vBrillante * (exp(-d * 3.0) * 0.25 + (exp(-abs(q.x) * 40.0) + exp(-abs(q.y) * 40.0)) * exp(-d * 2.5) * 0.35);
      gl_FragColor = vec4(vC * k * vA, k * vA); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
});

// De un tirón; la carga usa construirUniversoLocal, el mismo código como generador (yield entre pasos: ver porTramos).
export const crearUniversoLocal = (...a) => deUnTiron(construirUniversoLocal(...a));
export function* construirUniversoLocal({ scene, uPR, uScale, centros }) {
  const raiz = new THREE.Group(); raiz.name = 'Universos de llegada'; raiz.userData.profundo = true; scene.add(raiz);
  const regiones = [];
  for (const [id, centro] of Object.entries(centros)) {
    yield;
    const paleta = PALETAS[id].map(c => new THREE.Color(c)), A = LLEGADA_GIGANTE[id], R = RADIO_GIGANTE[id];
    const eje = centro.clone().normalize(), camara = centro.clone().addScaledVector(eje, -A), azar = azarSemilla(id.length * 977 + id.charCodeAt(0));
    const dentro = Math.max(A * 1.25, R * 1.6), fuera = id === 'pulsar' ? A * 3.5 : Math.max(A * 4, R * 3);   // grande: se sigue en su cielo aunque la cámara se aleje del gigante
    // Deneb: su estrella (radio 100 en su espacio, A = 100) y su mundo llegan a 2,6 radios y la cámara la ve desde 450–720: su
    // cielo, de 3,2 a 16 veces A (por fuera de su mundo y alrededor de la cámara, no una bola de puntos delante).
    const [dentroCielo, fueraCielo] = id === 'deneb' ? [A * 3.2, A * 16] : [dentro, fuera];
    const grupo = new THREE.Group(); grupo.position.copy(centro); raiz.add(grupo);
    // ── Estrellas del cielo nuevo: una cáscara alrededor del destino (la cámara de llegada queda dentro) ──
    const n = id === 'pulsar' ? 2200 : 5200;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tam = new Float32Array(n), fase = new Float32Array(n), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      if (i % 1500 === 1499) yield;
      const u = azar() * 2 - 1, a = azar() * Math.PI * 2, r = dentroCielo + Math.pow(azar(), 0.7) * (fueraCielo - dentroCielo), s = Math.sqrt(1 - u * u);
      pos.set([s * Math.cos(a) * r, u * r, s * Math.sin(a) * r], i * 3);
      c.copy(paleta[azar() < 0.55 ? 0 : 1]).lerp(new THREE.Color(1, 1, 1), azar() * 0.5).multiplyScalar(0.55 + azar() * 0.6);
      col.set([c.r, c.g, c.b], i * 3); tam[i] = azar() < 0.04 ? 3.4 + azar() * 3.2 : 1.1 + Math.pow(azar(), 2) * 2; fase[i] = azar();
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aTam', new THREE.BufferAttribute(tam, 1)); g.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
    const estrellas = new THREE.Points(g, materialEstrellas(uPR)); estrellas.frustumCulled = false; estrellas.renderOrder = -11; grupo.add(estrellas);
    // ── Velo de color: el gas tenue de esa región del universo, en una esfera vista desde dentro ──
    const velo = new THREE.Mesh(new THREE.SphereGeometry(fuera * 1.05, 48, 32), new THREE.ShaderMaterial({
      uniforms: { uA: { value: paleta[3] }, uB: { value: paleta[4] }, uVisible: { value: 0 }, uSemilla: { value: azar() * 4 }, uRuido: { value: texturaRuido() } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`uniform vec3 uA, uB; uniform float uVisible, uSemilla; varying vec3 vD;
        // Ruido de valor desde la tabla compartida con las nebulosas (dos lecturas en vez de ocho hashes): el velo
        // cubre toda la pantalla y en el móvil era caro para lo tenue que es.
        ${RUIDO_TABLA}
        float fbm(vec3 p){ return rn3(p) * 0.5 + rn3(p * 2.1 + 3.1) * 0.27 + rn3(p * 4.3 + 7.7) * 0.15 + rn3(p * 8.7 + 1.3) * 0.08; }
        void main(){ vec3 p = vD * 1.6 + uSemilla;
          float a = fbm(p), b = fbm(p * 1.3 + 5.0), banda = smoothstep(0.5, 0.85, fbm(vec3(vD.x * 1.1, vD.y * 3.2, vD.z * 1.1) + uSemilla + 2.0));
          float k = (pow(smoothstep(0.38, 0.85, a), 1.5) * 0.9 + banda * 0.5) * uVisible;
          vec3 col = mix(uA, uB, smoothstep(0.3, 0.75, b)) * k * 0.012;   // apenas: el fondo es negro
          gl_FragColor = vec4(col, 1.0); }`,
      // Opaco en el orden de dibujo: se dibuja antes que los cuerpos opacos (no se suma sobre una sombra).
      transparent: false, depthWrite: false, depthTest: false, side: THREE.BackSide, blending: THREE.AdditiveBlending
    }));
    velo.renderOrder = -30; velo.frustumCulled = false; grupo.add(velo);
    // ── Constelaciones: vistas de frente desde la llegada. Las estrellas principales brillan con su
    // destello en cruz; los trazos son hilos de polvo de estrellas (curvos en el corazón, el infinito y
    // la luna) con un resplandor suave y un destello que recorre el dibujo. Se encienden al llegar. ──
    const puntosC = [], colC = [], tamC = [], hilo = [], colH = [], tamH = [], recorrido = [], espH = [];
    const u1 = new THREE.Vector3().crossVectors(eje, new THREE.Vector3(0, 1, 0)).normalize();
    const blanco = new THREE.Color(1, 1, 1), rosa = new THREE.Color('#ffb8dc');
    for (const [figura, ang, giro, tamGrados] of CIELOS[id]) {
      yield;
      const f = FIGURAS[figura], dir = eje.clone().applyAxisAngle(u1, THREE.MathUtils.degToRad(ang)).applyAxisAngle(eje, THREE.MathUtils.degToRad(giro)).normalize();
      // El cielo está lejos (más allá de las estrellas): el dibujo se ve desde la llegada con su tamaño angular.
      // Detrás del gigante, lejos pero no infinitamente: tienen su sitio (al girar alrededor del gigante cambian
      // de lugar en el cielo con su paralaje, no acompañan a la pantalla) y crecen poco a poco al acercarse.
      const d = A + R * 6, centroFig = camara.clone().addScaledVector(dir, d).sub(centro), escala = Math.tan(THREE.MathUtils.degToRad(tamGrados / 2)) * d;
      // Derecho, como lo ve la cámara de llegada (arriba es el «arriba» del mundo).
      const y = new THREE.Vector3(0, 1, 0).addScaledVector(dir, -dir.y).normalize(), x = new THREE.Vector3().crossVectors(dir, y).normalize();
      const rot = (azar() - 0.5) * 0.4, cr = Math.cos(rot), sr = Math.sin(rot);
      const pts = f.p.map(([px, py]) => centroFig.clone().addScaledVector(x, (px * cr - py * sr) * escala).addScaledVector(y, (px * sr + py * cr) * escala).addScaledVector(dir, (azar() - 0.5) * escala * 0.15));
      pts.forEach((p, k) => { puntosC.push(p.x, p.y, p.z); const c = paleta[2].clone().lerp(blanco, 0.55 + azar() * 0.3); colC.push(c.r, c.g, c.b); tamC.push(k === 0 || azar() < 0.35 ? 9 + azar() * 3 : 5.5 + azar() * 2); });
      // Caminos del dibujo: curvas suaves o tramos rectos.
      const caminos = f.curva ? [new THREE.CatmullRomCurve3(f.curva.map(i => pts[i]), true, 'centripetal')] : f.t.map(([i, j]) => new THREE.LineCurve3(pts[i], pts[j]));
      const largoTotal = caminos.reduce((s, c) => s + c.getLength(), 0); let hecho = 0;
      for (const c of caminos) {
        const largo = c.getLength(), n = Math.max(12, Math.round(largo / escala * 260));
        for (let k = 0; k < n; k++) {
          const t = (k + azar() * 0.6) / n, p = c.getPointAt(Math.min(1, t)), j = (azar() - 0.5) * escala * 0.012;
          p.addScaledVector(x, j).addScaledVector(y, (azar() - 0.5) * escala * 0.012);
          const col = paleta[2].clone().lerp(rosa, azar() * 0.4).lerp(blanco, azar() * 0.35);
          espH.push(largo / n); hilo.push(p.x, p.y, p.z); colH.push(col.r, col.g, col.b); tamH.push(azar() < 0.1 ? 4.2 : 1.8 + azar() * 1.6); recorrido.push((hecho + t * largo) / largoTotal);
        }
        hecho += largo;
      }
    }
    const gc = new THREE.BufferGeometry(); gc.setAttribute('position', new THREE.Float32BufferAttribute(puntosC, 3)); gc.setAttribute('aCol', new THREE.Float32BufferAttribute(colC, 3));
    gc.setAttribute('aTam', new THREE.Float32BufferAttribute(tamC, 1)); gc.setAttribute('aFase', new THREE.Float32BufferAttribute(tamC.map(() => azar()), 1));
    const estrellasC = new THREE.Points(gc, materialEstrellas(uPR)); estrellasC.frustumCulled = false; estrellasC.renderOrder = -10; grupo.add(estrellasC);
    const gh = new THREE.BufferGeometry(); gh.setAttribute('position', new THREE.Float32BufferAttribute(hilo, 3)); gh.setAttribute('aCol', new THREE.Float32BufferAttribute(colH, 3));
    gh.setAttribute('aTam', new THREE.Float32BufferAttribute(tamH, 1)); gh.setAttribute('aS', new THREE.Float32BufferAttribute(recorrido, 1)); gh.setAttribute('aEsp', new THREE.Float32BufferAttribute(espH, 1));
    const trazos = new THREE.Points(gh, new THREE.ShaderMaterial({ uniforms: { uPR, uScale, uVis: { value: 0 }, uT: { value: 0 } },
      vertexShader: /* glsl */`uniform float uPR, uScale, uVis, uT; attribute vec3 aCol; attribute float aTam, aS, aEsp; varying vec3 vC; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          // Al alejarse, los puntos del trazo se juntan en pantalla: su luz se reparte (no se amontona).
          float junto = clamp(aEsp * uScale / max(1.0, -mv.z) / 1.4, 0.35, 1.0);
          // Un destello recorre el dibujo despacio.
          float dibujado = 1.0;   // ya existen: se encienden juntas (no se dibujan trazo a trazo)
          float destello = exp(-pow(fract(aS - uT * 0.06) * 14.0, 2.0)) + exp(-pow((1.0 - fract(aS - uT * 0.06)) * 40.0, 2.0));
          vA = dibujado * (0.85 + 0.15 * sin(uT * 2.0 + aS * 90.0) + destello * 2.2) * min(1.0, uVis * 1.5);
          vA *= junto; vC = aCol; gl_PointSize = (aTam * mix(0.6, 1.0, junto) + destello * 1.6 * junto) * uPR; }`,
      fragmentShader: /* glsl */`varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = (exp(-d * d * 5.0) + exp(-d * 2.2) * 0.4) * vA; gl_FragColor = vec4(vC * a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    trazos.frustumCulled = false; trazos.renderOrder = -10; grupo.add(trazos);
    regiones.push({ id, centro, dentro, fuera, A, estrellas, estrellasC, velo, trazos, grupo });
  }
  const v = new THREE.Vector3();
  return {
    raiz, regiones,
    // Cuánto se está «en» la región de cada gigante (0 fuera, 1 dentro), para la interfaz y las pruebas.
    presencia: {},
    actualizar(t, dt, { camera }) {
      for (const r of regiones) {
        const d = v.copy(camera.position).distanceTo(r.centro);
        // Su cielo solo existe cerca de él: se apaga mucho antes de llegar a Xiomara (desde casa nunca se ve).
        const fin = Math.min(r.fuera * 1.5, r.centro.length() * 0.5), k = 1 - THREE.MathUtils.smoothstep(d, fin * 0.75, fin);
        // Las constelaciones dependen de lo lejos que se esté de Xiomara (desde casa nunca) y de estar en la
        // zona de este gigante (no en la de otro); dentro, se ven siempre aunque la cámara se aleje de él.
        const L = r.centro.length(), kc = THREE.MathUtils.smoothstep(camera.position.length(), L * 0.15, L * 0.3) * (1 - THREE.MathUtils.smoothstep(d, L * 0.7, L * 0.95));
        this.presencia[r.id] = k;
        r.grupo.visible = k > 0.002 || kc > 0.002;
        if (!r.grupo.visible) continue;
        // El velo de color (una esfera que cubre toda la pantalla con ruido) aportaba ~1 % de la imagen y en la GPU de un
        // iPhone costaba mucho en cada cuadro en todos los gigantes: no se dibuja.
        r.estrellas.visible = k > 0.002; r.velo.visible = false;
        r.estrellas.material.uniforms.uVisible.value = k; r.estrellas.material.uniforms.uT.value = t;
        r.velo.material.uniforms.uVisible.value = k;
        r.estrellasC.material.uniforms.uVisible.value = kc; r.estrellasC.material.uniforms.uT.value = t;
        r.trazos.material.uniforms.uVis.value = kc; r.trazos.material.uniforms.uT.value = t;
      }
    }
  };
}
