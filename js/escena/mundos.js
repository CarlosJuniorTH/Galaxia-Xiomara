// Los lugares del universo, cada uno con su propia identidad visual:
//  · El hilo invisible: un corazón de estrellas que se teje y, completo, se llena de luz.
//  · El correo de la luna: luna con cráteres y una ruta postal; los sobres viajan sobre ella.
//  · El jardín de lo que viene: flores de luz con tallo que se mecen, musgo y luciérnagas.
//  · La órbita del mañana: cápsula de cristal con un corazón de luz, astrolabio y relicarios.
//  · Aquí, contigo: cortinas de aurora, luciérnagas y dos luces que orbitan juntas.
//  · El cometa (cometa.js): núcleo, coma y dos colas que cruzan el cielo.
import * as THREE from 'three';
import { deUnTiron } from '../util/azarSemilla.js';
import { DESTINOS, SUENOS, CONSTELACIONES, CAPSULAS } from '../data/universo.js';
import { capsulaAbierta } from '../util/tiempo.js';
import { texBrillo, texDestello, texTexto, texSobre, texFlor, texFlorRedonda, lienzoLuz, texNebulosa } from './texturas.js';
import { crearDestellos, materialPuntos, geometriaPuntos } from './materiales.js';
import { texCrateres, crearDosEstrellas } from './planetas.js';
import { crearCometa } from './cometa.js';
import { vista } from '../util/vista.js';
const vector = a => new THREE.Vector3(...a);
const EJE_Z = new THREE.Vector3(0, 0, 1), giroRueda = new THREE.Quaternion();

// Partículas que flotan y suben despacio, parpadeando (luciérnagas, polvo de tiempo).
function crearLuciernagas({ uScale, uPR }, { cantidad = 70, radio = 180, alto = 200, base = -90, colores = ['#fff3c4', '#d8fff2'], tam = 3, giro = 0, parpadeo = 1, maximo = 6 }) {
  const pos = new Float32Array(cantidad * 3), col = new Float32Array(cantidad * 3), fase = new Float32Array(cantidad), c = new THREE.Color();
  for (let i = 0; i < cantidad; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radio;
    pos.set([Math.cos(a) * r, Math.random(), Math.sin(a) * r], i * 3);
    c.set(colores[i % colores.length]); col.set([c.r, c.g, c.b], i * 3); fase[i] = Math.random() * 10;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); g.setAttribute('aPhase', new THREE.BufferAttribute(fase, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale, uPR, uAlto: { value: alto }, uBase: { value: base }, uTam: { value: tam }, uGiro: { value: giro }, uParpadeo: { value: parpadeo }, uMaximo: { value: maximo } },
    vertexShader: /* glsl */`
      attribute vec3 aColor; attribute float aPhase; uniform float uTime, uScale, uPR, uAlto, uBase, uTam, uGiro, uParpadeo, uMaximo;
      varying vec3 vC; varying float vA;
      void main(){
        float sube = fract(position.y + uTime * 0.018 + aPhase * 0.1);
        float a = (uTime * uGiro + aPhase) * 0.05;
        vec3 p = vec3(position.x * cos(a) - position.z * sin(a), uBase + sube * uAlto, position.x * sin(a) + position.z * cos(a));
        p.x += sin(uTime * 0.6 + aPhase * 3.0) * 6.0; p.z += cos(uTime * 0.5 + aPhase * 2.0) * 6.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float parpadeo = mix(1.0, 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * 1.7 + aPhase * 7.0), 3.0), uParpadeo);
        vA = parpadeo * smoothstep(0.0, 0.15, sube) * (1.0 - smoothstep(0.75, 1.0, sube));
        vC = aColor;
        float px=uTam*uScale/max(0.1,-mv.z); gl_PointSize = clamp(px, 1.0, uMaximo * uPR); vA*=min(1.0,px*px);
      }`,
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float k = (pow(1.0 - d * 2.0, 2.0) + pow(max(0.0, 1.0 - d * 5.0), 2.0)) * vA; gl_FragColor = vec4(vC * k, k); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const p = new THREE.Points(g, material); p.frustumCulled = false; return p;
}

// Puntos a lo largo de una curva por los que viajan pulsos de luz (de fuera hacia dentro).
function crearRecorridoLuz(puntos, color) {
  const n = puntos.length, pos = new Float32Array(n * 3), t = new Float32Array(n);
  puntos.forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); t[i] = i / (n - 1); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: 'attribute float aT; uniform float uTime; varying float vA; void main(){ float p = fract(aT * 3.0 - uTime * 0.25); vA = (0.12 + pow(p, 6.0)) * smoothstep(0.0, 0.1, aT) * (1.0 - smoothstep(0.92, 1.0, aT)); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float px=2200.0/max(1.0,-mv.z); gl_PointSize = clamp(px, 1.5, 8.0); vA*=min(1.0,px*px/2.25); }',
    fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float k = pow(1.0 - d * 2.0, 1.6) * vA; gl_FragColor = vec4(uColor * k, k); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}
// Textura con un texto repetido a lo largo (para escribir en anillos).
function texTextoAnillo(texto, fuente, color) {
  const W = 2048, H = 96, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  x.font = fuente; x.textBaseline = 'middle'; x.shadowColor = color; x.shadowBlur = 10; x.fillStyle = color;
  const ancho = x.measureText(texto).width, veces = Math.max(1, Math.round(W / ancho));
  x.save(); x.scale(W / (ancho * veces), 1); for (let k = 0; k < veces; k++) x.fillText(texto, k * ancho, H / 2 + 3); x.restore();
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

// ¿Está (x, y) dentro del polígono? (regla par-impar: sirve también para el infinito)
function dentro(x, y, poligono) {
  let si = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i], [xj, yj] = poligono[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) si = !si;
  }
  return si;
}

// De un tirón; la carga usa construirMundos, el mismo código como generador (yield entre pasos: ver porTramos).
// Las seis grandes (sus videoclips y su cielo propio): desde ellas no se ve la constelación de casa.
const GRANDES = new Set(['supernova', 'cuasar', 'pulsar', 'ton618', 'sagitario', 'deneb']);

export const crearMundos = (...a) => deUnTiron(construirMundos(...a));
export function* construirMundos({ scene, uScale, uPR }, { alConstelar = () => {}, consteladas = [] } = {}) {
  const raiz = new THREE.Group(); scene.add(raiz);
  const grupos = new Map(), animados = [], tocables = [], etiquetas = [];
  const brillo = texBrillo(), destello = texDestello();
  const colorConstelacion = new THREE.Color('#ffd595');
  function luz(grupo, posicion, color, tam = 20, mapa = brillo) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mapa, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.copy(vector(posicion)); sp.scale.set(tam, tam, 1); grupo.add(sp); return sp;
  }
  function anillo(grupo, radio, color, angulo = 0, opacidad = 0.35) {
    const puntos = Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos(i / 128 * Math.PI * 2) * radio, 0, Math.sin(i / 128 * Math.PI * 2) * radio));
    const m = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(puntos), new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacidad, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.z = angulo; grupo.add(m); return m;
  }
  for (const d of DESTINOS.filter(d => !['hogar', 'rosa', 'azul'].includes(d.id))) {
    const g = new THREE.Group(); g.position.copy(vector(d.posicion)); raiz.add(g); grupos.set(d.id, g);
    // Halo muy tenue: sitúa el lugar desde lejos sin competir con su contenido.
    if (d.id !== 'constelacion') { const halo = luz(g, [0, 0, -35], d.color, 300); halo.material.opacity = 0.07; }
    const etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: texTexto(d.nombre, { fuente: "48px 'Cormorant Garamond', serif", color: d.color }), transparent: true, depthWrite: false, opacity: 0.8, blending: THREE.AdditiveBlending }));
    etiqueta.userData.etiquetaDestino = d.id; etiquetas.push(etiqueta);
    etiqueta.position.set(0, -180, 0); etiqueta.scale.set(350, 55, 1); g.add(etiqueta);
    const baliza = luz(g, [0, 185, 0], d.color, 30, destello); baliza.userData.destino = d.id; tocables.push(baliza);
    animados.push({ objeto: baliza, tipo: 'baliza', base: 185 });
  }

  yield;
  // ── El hilo invisible ──
  // La constelación se dibuja en el espacio, punto a punto; no es una superposición 2D.
  const constelacion = grupos.get('constelacion');
  const figura = new THREE.Group(); constelacion.add(figura);
  const completadas = new Set(consteladas);
  let constelacionId = 'hilo', nodos = [], puntosHilo = [], geo = null, hilo = null, hiloLuz = null, relleno = null, guia = null, nebulosa = null, decoracion = null, luces = [];
  let trazado = 0, unidos = 0, tejiendo = false, tejidoT = 0, completada = false, llenado = 0, posicionNodos = [];
  yield;
  // Estrellas de campo: un cielo propio, tenue, alrededor de la figura.
  const campo = crearDestellos(Array.from({ length: 70 }, () => {
    const a = Math.random() * Math.PI * 2, r = 215 + Math.random() * 170;
    return { pos: [Math.cos(a) * r, Math.sin(a) * r * 0.85 + 10, -40 - Math.random() * 60], color: Math.random() < 0.5 ? '#ffe6c2' : '#e6dcff', tam: 2.5 + Math.random() * 4, opacidad: 0.25 + Math.random() * 0.35, pulso: 0.3 };
  }), { map: destello, uScale, uPR });
  constelacion.add(campo);

  function construirFigura(id, reiniciar = false) {
    const elegida = CONSTELACIONES.find(c => c.id === id) || CONSTELACIONES[0];
    for (const s of luces) { figura.remove(s); tocables.splice(tocables.indexOf(s), 1); s.material.dispose(); }
    for (const o of [hilo, hiloLuz, relleno, guia]) if (o) { figura.remove(o); o.geometry.dispose(); o.material.dispose(); }
    constelacionId = elegida.id; nodos = elegida.puntos.map(vector);
    // El corazón se traza con su curva exacta (la de las estrellas); las demás figuras, con
    // una curva suave entre sus estrellas.
    if (elegida.id === 'hilo') {
      puntosHilo = Array.from({ length: 241 }, (_, i) => { const t = i / 240 * Math.PI * 2; return new THREE.Vector3(7.4 * 16 * Math.sin(t) ** 3, 7.4 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) + 22, 0); });   // plano: estrellas y corazones encajan desde cualquier ángulo
      posicionNodos = elegida.indices.map(i => Math.round(i / 18 * 240));
    } else {
      puntosHilo = new THREE.CatmullRomCurve3(nodos.slice(0, -1), true, 'centripetal').getPoints(240);
      posicionNodos = nodos.slice(0, -1).map((_, i) => Math.round(i / (nodos.length - 1) * 240));
    }
    geo = new THREE.BufferGeometry().setFromPoints(puntosHilo);
    hilo = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: colorConstelacion, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
    // Guía: el contorno completo, muy tenue, para que la figura se intuya antes de tejerla.
    guia = crearDestellos(puntosHilo.filter((_, i) => i % 3 === 0).map(v => ({ pos: v.toArray(), color: '#d9b98a', tam: 3.2, opacidad: 0.32, pulso: 0.2 })), { map: brillo, uScale, uPR });
    // Hilo de luz: destellos finos a lo largo del trazo (la línea de 1 px casi no se ve
    // en pantallas densas). Se teje a la vez que la línea.
    // En el corazón, la mitad izquierda es rosa y la derecha azul: dos orillas que se unen.
    const tono = v => elegida.id !== 'hilo' ? colorConstelacion : new THREE.Color('#ffb0d4').lerp(new THREE.Color('#a9c8ff'), THREE.MathUtils.smoothstep(v.x, -40, 40)).lerp(colorConstelacion, 0.25);
    hiloLuz = crearDestellos(puntosHilo.map((v, i) => ({ pos: v.toArray(), color: i % 9 ? tono(v) : '#fff6e2', tam: i % 9 ? 7.5 : 12, opacidad: 0.85, pulso: 0.25 })), { map: brillo, uScale, uPR });
    // Relleno: polvo de luz dentro de la figura, aparece al completarla.
    const poligono = puntosHilo.map(v => [v.x, v.y]);
    const xs = poligono.map(p => p[0]), ys = poligono.map(p => p[1]);
    const caja = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], interior = [];
    for (let i = 0; interior.length < 260 && i < 6000; i++) {
      const x = caja[0] + Math.random() * (caja[1] - caja[0]), y = caja[2] + Math.random() * (caja[3] - caja[2]);
      if (dentro(x, y, poligono)) interior.push({ pos: [x, y, (Math.random() - 0.5) * 16], color: Math.random() < 0.6 ? '#ffc2dc' : '#ffe2b0', tam: 4 + Math.random() * 6, opacidad: 0.55, pulso: 0.5 });
    }
    relleno = crearDestellos(interior, { map: brillo, uScale, uPR });
    // Nebulosa interior del corazón (solo en «El hilo invisible»): gas suave rosa y lila con
    // la forma exacta de la curva, que se enciende al completarlo.
    if (nebulosa) { figura.remove(nebulosa); nebulosa.geometry.dispose(); nebulosa.material.dispose(); nebulosa = null; }
    if (elegida.id === 'hilo') {
      // Máscara con la forma exacta de la curva (el desenfoque lo dan los mipmaps).
      const L = 256, [cm, xm] = lienzoLuz(L);
      xm.fillStyle = '#fff'; xm.beginPath();
      puntosHilo.forEach((v, i) => { const px = (v.x / 300 + 0.5) * L, py = (0.5 - v.y / 300) * L; i ? xm.lineTo(px, py) : xm.moveTo(px, py); });
      xm.closePath(); xm.fill();
      const mascara = new THREE.CanvasTexture(cm);
      nebulosa = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uLlenado: { value: 0 }, uMascara: { value: mascara } },
        vertexShader: 'varying vec2 vP; varying vec2 vUv; void main(){ vP = position.xy; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */`
          uniform float uT, uLlenado; uniform sampler2D uMascara; varying vec2 vP; varying vec2 vUv;
          float h(vec2 p){ vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
          float r(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
          void main(){
            float dentro = texture2D(uMascara, vUv, 2.5).r;
            vec2 p = vP * 0.025;
            float gas = r(p * 2.0 + uT * 0.05) * 0.6 + r(p * 5.0 - uT * 0.04) * 0.4;
            // Rosa a la izquierda, azul a la derecha, mezclándose en el centro como dos orillas.
            vec3 col = mix(vec3(1.0, 0.55, 0.78), vec3(0.6, 0.72, 1.0), smoothstep(-60.0, 60.0, vP.x + (gas - 0.5) * 50.0));
            float a = uLlenado * smoothstep(0.15, 0.9, dentro) * (0.2 + 0.35 * gas);
            gl_FragColor = vec4(col * a, a);
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      }));
      figura.add(nebulosa);
    }
    // Decoración del corazón (solo «El hilo invisible»): marco de filigrana, corazón
    // interior, los dos nombres en sus lóbulos, halo de fondo y corazoncitos que suben.
    if (decoracion) { decoracion.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose?.(); o.material?.dispose?.(); }); figura.remove(decoracion); decoracion = null; }
    if (elegida.id === 'hilo') {
      decoracion = new THREE.Group(); figura.add(decoracion);
      const xs = puntosHilo.map(v => v.x), ys = puntosHilo.map(v => v.y);
      const centro = new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, 0);
      const escalado = (k, cada) => puntosHilo.filter((_, i) => i % cada === 0).map(v => v.clone().sub(centro).multiplyScalar(k).add(centro));
      const marco = crearDestellos(escalado(1.22, 3).map((v, i) => ({ pos: v.toArray(), color: i % 4 ? '#f6dcbc' : '#ffffff', tam: i % 4 ? 4.6 : 8, opacidad: 0.95, pulso: 0.5 })), { map: destello, uScale, uPR });
      const interior = crearDestellos(escalado(0.36, 4).map(v => ({ pos: v.toArray(), color: '#fff0f6', tam: 5, opacidad: 0.9, pulso: 0.4 })), { map: brillo, uScale, uPR });
      const halo = luz(decoracion, centro.toArray(), '#d9a6ff', 520); halo.material.opacity = 0.09; halo.position.z = -20;
      const nombre = (texto, color, x, y) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texTexto(texto, { fuente: "120px 'Great Vibes', cursive", color, sombra: color, ancho: 512, alto: 200 }), transparent: true, depthWrite: false, opacity: 0.5, blending: THREE.AdditiveBlending }));
        sp.position.set(x, y, 8); sp.scale.set(92, 36, 1); decoracion.add(sp); return sp;
      };
      // Rosa a la izquierda (Xio, Buenos Aires) y azul a la derecha (Cas, Barcelona).
      const nombres = [nombre('Xio', '#ffc2dd', centro.x - 58, centro.y + 38), nombre('Cas', '#c2d8ff', centro.x + 58, centro.y + 38)];
      // Corazoncitos que suben desde la figura (forma de corazón dibujada en el shader).
      const subida = new THREE.Points(geometriaPuntos(28, (i, p) => { const v = puntosHilo[(i * 9) % puntosHilo.length]; p.x = v.x; p.y = v.y; p.z = 0; const c = new THREE.Color(v.x < 0 ? '#ffb0d4' : '#b0ccff'); p.r = c.r; p.g = c.g; p.b = c.b; p.s = 9; }), materialPuntos({ uScale, uPR, corazon: true, maximo: 14, titileo: 0.3 }));
      subida.frustumCulled = false; subida.material.uniforms.uOp.value = 0;
      decoracion.add(marco, interior, subida);
      decoracion.userData = { marco, interior, nombres, subida, centro, base: subida.geometry.getAttribute('position').array.slice() };
    }
    figura.add(guia, relleno, hilo, hiloLuz);
    completada = !reiniciar && completadas.has(constelacionId);
    unidos = completada ? nodos.length : 0; trazado = completada ? puntosHilo.length + 1 : 0; llenado = completada ? 1 : 0; tejiendo = false;
    geo.setDrawRange(0, Math.round(trazado)); hiloLuz.geometry.setDrawRange(0, Math.round(trazado));
    luces = nodos.slice(0, -1).map((v, i) => { const s = luz(figura, v.toArray(), i === 0 ? '#ffffff' : '#ffd595', 24, destello); s.userData.nodo = i; tocables.push(s); return s; });
    return elegida;
  }
  const CHISPAS = 36;
  const chispas = crearDestellos(Array.from({ length: CHISPAS }, (_, k) => ({ pos: [0, 0, 0], color: k % 2 ? '#fff4fb' : '#ffe6c4', tam: 9, opacidad: 1, pulso: 0.4 })), { map: destello, uScale, uPR });
  constelacion.add(chispas);
  construirFigura('hilo');
  function unirNodo(indice) {
    if (completada || indice !== unidos) return false;
    unidos++;
    if (unidos === luces.length) { unidos++; completada = true; tejiendo = false; completadas.add(constelacionId); alConstelar(constelacionId); }
    return true;
  }
  function elegirConstelacion(id, reiniciar = false) {
    const elegida = construirFigura(id, reiniciar);
    const etiqueta = constelacion.children.find(s => s.userData.etiquetaDestino === 'constelacion');
    if (etiqueta) { etiqueta.material.map.dispose(); etiqueta.material.map = texTexto(elegida.nombre, { fuente: "48px 'Cormorant Garamond', serif", color: '#ffd595' }); etiqueta.material.needsUpdate = true; }
  }

  yield;
  // ── El correo de la luna ──
  const correo = grupos.get('cartas');
  const luna = new THREE.Mesh(new THREE.SphereGeometry(80, 128, 96), new THREE.MeshStandardMaterial({ map: texCrateres(['#3d3c42', '#a3a2a8', '#f0eff2'], 21, 80, 1, 1024), roughness: 0.97, emissive: '#2c2a33', emissiveIntensity: 0.28, transparent: true }));
  luna.userData.destino = 'cartas'; correo.add(luna); tocables.push(luna);
  const luzLuna = new THREE.PointLight('#fff2f6', 90000, 800, 2); luzLuna.position.set(170, 170, 240); correo.add(luzLuna);
  yield;
  // Ruta postal: un anillo inclinado de polvo de luz; los sobres viajan SOBRE él.
  const ruta = new THREE.Group(); ruta.rotation.set(0.38, 0, 0.22); correo.add(ruta);
  const RADIO_RUTA = 142;
  anillo(ruta, RADIO_RUTA, '#e6cfff', 0, 0.5);
  const polvoRuta = crearDestellos(Array.from({ length: 260 }, (_, i) => {
    const a = i / 260 * Math.PI * 2, r = RADIO_RUTA + (Math.random() - 0.5) * 16;
    return { pos: [Math.cos(a) * r, (Math.random() - 0.5) * 3, Math.sin(a) * r], color: Math.random() < 0.5 ? '#f3dcff' : '#ffd9ec', tam: 1.6 + Math.random() * 2.4, opacidad: 0.6, pulso: 0.4 };
  }), { map: brillo, uScale, uPR });
  ruta.add(polvoRuta);
  const sobres = Array.from({ length: 5 }, (_, i) => {
    // Sobres dibujados (antes un carácter ✉ que de lejos parecía un punto de luz).
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texSobre(), transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
    sp.material.color.setScalar(0.86);   // por debajo del umbral del brillo: se ve el papel, no solo luz
    sp.scale.set(34, 34, 1); sp.userData = { destino: 'cartas', angulo: i / 5 * Math.PI * 2 };
    ruta.add(sp); tocables.push(sp); return sp;
  });
  yield;
  // Estela de chispas detrás de cada sobre (12 por sobre, se recolocan cada cuadro).
  const POR_SOBRE = 12;
  const estelaSobres = crearDestellos(Array.from({ length: sobres.length * POR_SOBRE }, (_, k) => ({ pos: [0, 0, 0], color: k % 3 ? '#ffd6ea' : '#fff6e0', tam: 6 * (1 - (k % POR_SOBRE) / POR_SOBRE) + 1.5, opacidad: 0.9 * (1 - (k % POR_SOBRE) / POR_SOBRE), pulso: 0.3 })), { map: brillo, uScale, uPR });
  ruta.add(estelaSobres);
  yield;
  // Segunda ruta, más pequeña e inclinada al revés: sus sobres circulan en sentido contrario.
  const ruta2 = new THREE.Group(); ruta2.rotation.set(-0.52, 0.6, -0.3); correo.add(ruta2);
  const RADIO_RUTA2 = 112;
  anillo(ruta2, RADIO_RUTA2, '#ffd6ea', 0, 0.45);
  const polvoRuta2 = crearDestellos(Array.from({ length: 200 }, (_, i) => {
    const a = i / 200 * Math.PI * 2, r = RADIO_RUTA2 + (Math.random() - 0.5) * 13;
    return { pos: [Math.cos(a) * r, (Math.random() - 0.5) * 3, Math.sin(a) * r], color: Math.random() < 0.5 ? '#ffe2f0' : '#f3dcff', tam: 1.5 + Math.random() * 2.2, opacidad: 0.6, pulso: 0.4 };
  }), { map: brillo, uScale, uPR });
  ruta2.add(polvoRuta2);
  const sobres2 = Array.from({ length: 3 }, (_, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texSobre(), transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
    sp.material.color.setScalar(0.82); sp.scale.set(24, 24, 1); sp.userData = { destino: 'cartas', angulo: i / 3 * Math.PI * 2 + 0.5 };
    ruta2.add(sp); tocables.push(sp); return sp;
  });
  const estelaSobres2 = crearDestellos(Array.from({ length: 3 * POR_SOBRE }, (_, k) => ({ pos: [0, 0, 0], color: k % 3 ? '#ffe0ee' : '#fff6e0', tam: 5 * (1 - (k % POR_SOBRE) / POR_SOBRE) + 1.2, opacidad: 0.85 * (1 - (k % POR_SOBRE) / POR_SOBRE), pulso: 0.3 })), { map: brillo, uScale, uPR });
  ruta2.add(estelaSobres2);
  yield;
  // Corazoncitos que se desprenden de los sobres y suben despacio.
  const corazonesCorreo = new THREE.Points(geometriaPuntos(40, (i, p) => { p.x = p.y = p.z = 0; const c = new THREE.Color(i % 2 ? '#ffb7d6' : '#ffe2ef'); p.r = c.r; p.g = c.g; p.b = c.b; p.s = 6; }), materialPuntos({ uScale, uPR, corazon: true, maximo: 10, titileo: 0.2 }));
  corazonesCorreo.frustumCulled = false; correo.add(corazonesCorreo);
  const puntoSobre = new THREE.Vector3();

  yield;
  // ── El jardín de lo que viene ──
  const jardin = grupos.get('suenos');
  const jardinGiro = new THREE.Group(); jardin.add(jardinGiro);
  const PALETA_FLORES = ['#f1b8ff', '#ffc7a8', '#ff9fc8', '#b8f0e2', '#d8c2ff', '#ffe0a6'];
  const flores = [], cabezas = [], tallos = [], centros = [], savia = [];
  let semilla = 42;
  const azar = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296; };
  for (let i = 0; i < 30; i++) {
    const a = i * 2.39996, r = 28 + Math.sqrt(i / 30) * 150;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, h = 40 + azar() * 105;
    const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, -88, z), new THREE.Vector3(x + (azar() - 0.5) * 40, -88 + h * 0.55, z + (azar() - 0.5) * 20), new THREE.Vector3(x, h - 88, z));
    for (const p of curva.getPoints(16)) tallos.push({ pos: p.toArray(), color: '#7fd6c2', tam: 2.2, opacidad: 0.55 });
    savia.push(...curva.getPoints(24).map((p, k) => [p, k / 24, i * 0.137]));
    // Dos hojas: puntos a lo largo de una curva corta que sale del tallo.
    for (const lado of [-1, 1]) {
      const inicio = curva.getPoint(0.3 + azar() * 0.25);
      const hoja = new THREE.QuadraticBezierCurve3(inicio, inicio.clone().add(new THREE.Vector3(lado * 14, 10, 4)), inicio.clone().add(new THREE.Vector3(lado * 24, 6, 0)));
      for (const p of hoja.getPoints(6)) tallos.push({ pos: p.toArray(), color: '#9be8c8', tam: 3, opacidad: 0.5 });
    }
    const color = PALETA_FLORES[i % PALETA_FLORES.length];
    flores.push({ indice: cabezas.length, sueno: SUENOS[i % SUENOS.length].id, color: new THREE.Color(color), tam: 30 + azar() * 16 });
    cabezas.push({ pos: [x, h - 88, z], color, tam: flores.at(-1).tam, opacidad: 0.95, pulso: 0.07 });
    centros.push({ pos: [x, h - 87, z], color: '#fff6dc', tam: 9, pulso: 0.2 });
  }
  const tallosPuntos = crearDestellos(tallos, { map: brillo, uScale, uPR, ondula: 1.2 }); jardinGiro.add(tallosPuntos);
  yield;
  // Dos formas de flor alternadas (seis pétalos finos y cinco redondeados).
  const petalosPuntos = crearDestellos(cabezas.filter((_, i) => i % 2 === 0), { map: texFlor(), uScale, uPR, ondula: 2.4 }); jardinGiro.add(petalosPuntos);
  const petalosRedondos = crearDestellos(cabezas.filter((_, i) => i % 2 === 1), { map: texFlorRedonda(), uScale, uPR, ondula: 2.4 }); jardinGiro.add(petalosRedondos);
  yield;
  // Savia de luz: pulsos que suben por cada tallo hasta la flor.
  const saviaPuntos = (() => {
    const n = savia.length, pos = new Float32Array(n * 3), t = new Float32Array(n), f = new Float32Array(n);
    savia.forEach(([p, k, fase], i) => { pos.set([p.x, p.y, p.z], i * 3); t[i] = k; f[i] = fase; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(t, 1)); g.setAttribute('aF', new THREE.BufferAttribute(f, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale, uPR },
      vertexShader: 'attribute float aT, aF; uniform float uTime, uScale, uPR; varying float vA; void main(){ float c = fract(uTime * 0.22 + aF); float p = exp(-pow((aT - c * 1.3) * 9.0, 2.0)); vA = p; vec3 q = position + vec3(sin(uTime * 1.3 + aF * 20.0), 0.0, cos(uTime * 1.1 + aF * 17.0) * 0.6) * 1.2 * aT; vec4 mv = modelViewMatrix * vec4(q, 1.0); gl_Position = projectionMatrix * mv; float px=(2.0+p*4.0)*uScale/max(0.1,-mv.z); gl_PointSize = clamp(px, 1.0, 7.0 * uPR);vA*=min(1.0,px*px); }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float k = pow(1.0 - d * 2.0, 1.6) * vA; gl_FragColor = vec4(vec3(0.75, 1.0, 0.9) * k, k); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const pt = new THREE.Points(g, m); pt.frustumCulled = false; jardinGiro.add(pt); return pt;
  })();
  yield;
  // Rocío luminoso sobre la hierba: gotas que se encienden y apagan.
  const rocio = crearDestellos(Array.from({ length: 160 }, () => { const a = Math.random() * Math.PI * 2, r = 20 + Math.sqrt(Math.random()) * 190; return { pos: [Math.cos(a) * r, -84 + Math.random() * 10, Math.sin(a) * r], color: Math.random() < 0.5 ? '#e9fff8' : '#fff3d6', tam: 3 + Math.random() * 2, opacidad: 0.85, pulso: 0.9 }; }), { map: destello, uScale, uPR });
  jardin.add(rocio);
  const centrosPuntos = crearDestellos(centros, { map: destello, uScale, uPR, ondula: 2.4 }); jardinGiro.add(centrosPuntos);
  yield;
  // Suelo de musgo luminoso y luciérnagas.
  const musgo = crearDestellos(Array.from({ length: 420 }, () => {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 205;
    return { pos: [Math.cos(a) * r, -90 + Math.sin(r * 0.05 + a * 3) * 4, Math.sin(a) * r], color: Math.random() < 0.7 ? '#6fd0b8' : '#c4a8ff', tam: 2 + Math.random() * 3.5, opacidad: 0.35 * (1 - r / 260), pulso: 0.3 };
  }), { map: brillo, uScale, uPR });
  jardin.add(musgo);
  const luciernagasJardin = crearLuciernagas({ uScale, uPR }, { cantidad: 60, radio: 190, alto: 210, base: -85 }); jardin.add(luciernagasJardin);
  yield;
  // Hierba luminosa: briznas finas que se mecen con el viento.
  const hierba = crearDestellos(Array.from({ length: 900 }, (_, k) => {
    const brizna = Math.floor(k / 4), a = brizna * 2.39996 + 0.7, r = 15 + Math.sqrt((brizna % 225) / 225) * 195, h = (k % 4) * (5 + (brizna % 5) * 1.6);
    return { pos: [Math.cos(a) * r + (k % 4) * 0.8, -88 + h, Math.sin(a) * r], color: k % 4 === 3 ? '#c8ffe8' : '#5fc9ad', tam: 2.4 - (k % 4) * 0.35, opacidad: 0.45 + (k % 4) * 0.12 };
  }), { map: brillo, uScale, uPR, ondula: 1.6 });
  jardin.add(hierba);

  yield;
  // ── La órbita del mañana ──
  const capsula = grupos.get('capsulas');
  yield;
  // Cristal: solo el borde brilla (fresnel); el interior es transparente.
  const cristal = new THREE.Mesh(new THREE.SphereGeometry(62, 64, 48), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 m = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - m.xyz); vP = position; gl_Position = projectionMatrix * viewMatrix * m; }',
    fragmentShader: /* glsl */`
      uniform float uT; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
        float vetas = 0.85 + 0.15 * sin(vP.y * 0.25 + uT * 0.6) * sin(vP.x * 0.21 - uT * 0.4);
        vec3 c = mix(vec3(1.0, 0.82, 0.6), vec3(0.95, 0.75, 1.0), 0.5 + 0.5 * sin(uT * 0.3 + vP.y * 0.03));
        gl_FragColor = vec4(c * f * 0.75 * vetas, f);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
  }));
  capsula.add(cristal);
  const corazonCapsula = luz(capsula, [0, 0, 0], '#ffd9a6', 70, destello);
  const nucleoCapsula = luz(capsula, [0, 0, 0], '#ffb980', 120); nucleoCapsula.material.opacity = 0.35;
  yield;
  // Astrolabio: tres aros finos con marcas, cada uno en su eje.
  const aros = [[100, '#ffd6a0', [0.65, 0, 0.2]], [124, '#e3b9ff', [-0.7, 0.4, 0]], [148, '#f7d8c0', [0.2, 0, -0.6]]].map(([r, color, rot]) => {
    const g = new THREE.Group(); g.rotation.set(...rot); capsula.add(g);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.7, 6, 160), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })).rotateX(Math.PI / 2));
    const marcas = crearDestellos(Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return { pos: [Math.cos(a) * r, 0, Math.sin(a) * r], color, tam: i % 6 ? 3 : 6.5, opacidad: 0.8 }; }), { map: destello, uScale, uPR });
    g.add(marcas);
    return g;
  });
  yield;
  // Relicarios: una luz por cápsula del tiempo; las que ya pueden abrirse brillan doradas.
  const relicarios = CAPSULAS.map((c, i) => {
    const s = luz(aros[0], [0, 0, 0], '#ffe3b1', 22, destello); s.userData = { fecha: c.fecha, angulo: i / CAPSULAS.length * Math.PI * 2 };
    const halo = luz(s, [0, 0, 0], '#ffcf8f', 2.2); halo.material.opacity = 0.5; return s;
  });
  const polvoTiempo = crearLuciernagas({ uScale, uPR }, { cantidad: 90, radio: 170, alto: 260, base: -130, colores: ['#ffe2b8', '#f0d2ff'], tam: 2.4, giro: 1 }); capsula.add(polvoTiempo);
  yield;
  // Reloj de arena de luz dentro del cristal: dos conos y arena dorada que cae.
  const reloj = new THREE.Group(); capsula.add(reloj);
  const perfilReloj = [];
  for (let k = 0; k <= 40; k++) { const y = -42 + k * 2.1, ancho = 4 + Math.pow(Math.abs(y) / 42, 1.4) * 26; perfilReloj.push(new THREE.Vector2(ancho, y)); }
  reloj.add(new THREE.Mesh(new THREE.LatheGeometry(perfilReloj, 48), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 m = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - m.xyz); gl_Position = projectionMatrix * viewMatrix * m; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5); gl_FragColor = vec4(vec3(1.0, 0.85, 0.65) * f * 0.6, f); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
  })));
  yield;
  // Marco del reloj de arena: dos bases y tres columnas de luz dorada.
  const oro = new THREE.MeshBasicMaterial({ color: '#ffcf8f', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const y of [-44, 44]) reloj.add(new THREE.Mesh(new THREE.TorusGeometry(31, 1.2, 8, 64), oro).rotateX(Math.PI / 2).translateZ(-y));
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, c = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 88, 8), oro); c.position.set(Math.cos(a) * 31, 0, Math.sin(a) * 31); reloj.add(c); }
  const arena = (() => {
    const n = 260, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([Math.random() * Math.PI * 2, Math.random(), Math.random()], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale, uPR },
      vertexShader: /* glsl */`
        uniform float uTime, uScale, uPR; varying float vA;
        void main(){
          float f = fract(position.y + uTime * 0.12);
          // Mitad de la arena cae por el cuello; la otra reposa arriba y abajo formando montoncitos.
          vec3 p;
          if (position.z < 0.35) p = vec3(cos(position.x) * 1.2, 38.0 - f * 76.0, sin(position.x) * 1.2);
          else { float r = sqrt(fract(position.y * 7.3)) * (position.z < 0.7 ? 20.0 : 16.0); float y = position.z < 0.7 ? -40.0 + (20.0 - r) * 0.45 : 20.0 + (16.0 - r) * 0.3; p = vec3(cos(position.x) * r, y, sin(position.x) * r); }
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          float chispa = position.z < 0.35 ? pow(0.5 + 0.5 * sin(uTime * 9.0 + position.x * 30.0), 8.0) : 0.0;
          float px=(2.0+chispa*3.0)*uScale/max(0.1,-mv.z); gl_PointSize = clamp(px,1.0,5.0*uPR); vA=(0.8+chispa)*min(1.0,px*px);
        }`,
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float k = pow(1.0 - d * 2.0, 1.5) * vA; gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * k, k); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const p = new THREE.Points(g, m); p.frustumCulled = false; reloj.add(p); return p;
  })();
  yield;
  // Esfera de reloj: números romanos de luz alrededor, en el plano del aro exterior.
  const numeros = new THREE.Mesh(new THREE.RingGeometry(158, 182, 192, 1), new THREE.ShaderMaterial({
    uniforms: { uTex: { value: texTextoAnillo('XII · I · II · III · IV · V · VI · VII · VIII · IX · X · XI · ', "500 64px 'Cormorant Garamond', serif", '#ffe6c4') }, uTic: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D uTex; uniform float uTic; varying vec2 vP; void main(){ float ang = atan(vP.y, vP.x), v = (length(vP) - 158.0) / 24.0; vec3 t = texture2D(uTex, vec2(-ang / 6.2831853, 1.0 - v)).rgb * (0.85 + uTic * 0.6); gl_FragColor = vec4(t, max(t.r, max(t.g, t.b))); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
  }));
  numeros.rotation.x = Math.PI / 2; aros[2].add(numeros);
  yield;
  // Ruedas de reloj detrás del cristal: dos círculos dentados que giran en sentidos opuestos.
  const ruedas = [[84, 48, '#ffd7a0'], [96, 60, '#e9c9ff']].map(([r, dientes, color]) => {
    const g = new THREE.Group(); capsula.add(g);
    g.add(crearDestellos(Array.from({ length: dientes * 3 }, (_, k) => { const a = k / (dientes * 3) * Math.PI * 2, diente = k % 3 === 0; return { pos: [Math.cos(a) * (r + (diente ? 4 : 0)), Math.sin(a) * (r + (diente ? 4 : 0)), 0], color, tam: diente ? 3.4 : 2, opacidad: diente ? 0.85 : 0.5 }; }), { map: brillo, uScale, uPR }));
    return g;
  });
  yield;
  // La fecha de cada cápsula junto a su relicario.
  for (const s of relicarios) {
    const [a, m, d] = s.userData.fecha.split('-');
    const fecha = new THREE.Sprite(new THREE.SpriteMaterial({ map: texTexto(`${+d} · ${+m} · ${a}`, { fuente: "500 56px 'Cormorant Garamond', serif", color: '#ffe8c8', sombra: '#ffb070', ancho: 512, alto: 120 }), transparent: true, depthWrite: false, opacity: 0.85, blending: THREE.AdditiveBlending }));
    fecha.scale.set(4.6, 1.1, 1); fecha.position.set(0, 1.3, 0); s.add(fecha);
  }
  yield;
  // Facetas del cristal: aristas de un icosaedro que brillan como una gema y giran despacio.
  const facetas = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(63, 1)), new THREE.LineBasicMaterial({ color: '#ffe2bf', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  capsula.add(facetas);
  yield;
  // Rayos de luz hacia arriba desde las cápsulas que ya pueden abrirse.
  const rayosCapsula = relicarios.map(r => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3.2, 120, 16, 1, true), new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uA: { value: 0 } },
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uT, uA; varying vec2 vU; void main(){ float f = vU.y * (1.0 - smoothstep(0.85, 1.0, vU.y)) * (0.7 + 0.3 * sin(vU.y * 20.0 - uT * 3.0)); gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * f * uA, f * uA); }',
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
    }));
    m.geometry.translate(0, 60, 0); m.scale.setScalar(1 / 22); r.add(m); return m;
  });
  yield;
  // Anillo de estrellitas que da la vuelta dentro del cristal, como las horas que pasan.
  const horas = crearDestellos(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return { pos: [Math.cos(a) * 50, 0, Math.sin(a) * 50], color: i % 3 ? '#ffe6c8' : '#ffffff', tam: i % 3 ? 4 : 7, opacidad: 0.9, pulso: 0.4 }; }), { map: destello, uScale, uPR });
  const anilloHoras = new THREE.Group(); anilloHoras.rotation.x = 0.35; anilloHoras.add(horas); capsula.add(anilloHoras);
  yield;
  // Dos corrientes de luz que entran en espiral en el cristal.
  const espirales = [0, Math.PI].map(desfase => crearRecorridoLuz(Array.from({ length: 140 }, (_, k) => { const f = k / 139, a = desfase + f * Math.PI * 5, r = 230 - f * 168; return new THREE.Vector3(Math.cos(a) * r, (1 - f) * 90 * (desfase ? -1 : 1), Math.sin(a) * r); }), desfase ? '#e8c8ff' : '#ffd9a8'));
  for (const e of espirales) capsula.add(e);

  yield;
  // ── Aquí, contigo ──
  const calma = grupos.get('calma');
  yield;
  // Refugio cósmico: una estrella joven con su disco protoplanetario (polvo que gira con
  // huecos donde nacen planetas), nubes de nebulosa alrededor y dos luces que orbitan juntas.
  // Lado opuesto a la llegada de la cámara (desde el lado de la luz, girada como en index.js).
  const desdeCamara = new THREE.Vector3(...DESTINOS.find(d => d.id === 'calma').posicion).negate().setY(0).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.7);
  const detras = Math.atan2(-desdeCamara.x, -desdeCamara.z);
  const disco = (() => {
    const n = 4200, pos = new Float32Array(n * 3), fase = new Float32Array(n), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      let r; do { r = 78 + Math.pow(Math.random(), 0.8) * 160; } while (r > 150 && r < 160);   // hueco interior (la binaria) y una división
      pos.set([Math.random() * Math.PI * 2, r, (Math.random() - 0.5) * (2 + r * 0.04)], i * 3);
      c.set(r < 120 ? '#ffd0e4' : r < 180 ? '#e6c8ff' : '#bcd2ff').lerp(new THREE.Color('#ffffff'), Math.random() * 0.25); col.set([c.r, c.g, c.b], i * 3); fase[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); g.setAttribute('aPhase', new THREE.BufferAttribute(fase, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale, uPR },
      vertexShader: /* glsl */`
        attribute vec3 aColor; attribute float aPhase; uniform float uTime, uScale, uPR; varying vec3 vC; varying float vA;
        void main(){
          float r = position.y, ang = position.x + uTime * 0.6 * pow(80.0 / r, 1.5);   // giro kepleriano
          vec4 mv = modelViewMatrix * vec4(cos(ang) * r, position.z, sin(ang) * r, 1.0); gl_Position = projectionMatrix * mv;
          float s = (2.6 + aPhase * 3.0) * uScale / max(0.1, -mv.z);
          gl_PointSize = clamp(s, 1.5, 6.0 * uPR);
          float espiral = 0.55 + 0.45 * sin(2.0 * (position.x + uTime * 0.6 * pow(80.0 / r, 1.5)) - log(r) * 7.0 + uTime * 0.4);   // ondas espirales
          vA = min(s*s/2.25,1.0) * clamp(s * 0.6, 0.0, 1.0) * (0.75 + 0.35 * sin(uTime * 1.5 + aPhase * 30.0)) * espiral * 1.3 * (1.0 - smoothstep(190.0, 240.0, r)) * smoothstep(76.0, 100.0, r);
          vC = aColor;
        }`,
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float k = pow(1.0 - d * 2.0, 1.5) * vA; gl_FragColor = vec4(vC * k, k); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.rotation.set(0.32, 0, -0.18); calma.add(p); return p;
  })();
  yield;
  // Estrellas fugaces que cruzan el refugio de vez en cuando.
  const fugaces = Array.from({ length: 3 }, (_, i) => {
    const desde = new THREE.Vector3(-260 + i * 90, 150 - i * 40, -60 + i * 50), hasta = desde.clone().add(new THREE.Vector3(300, -140, 80));
    const p = crearRecorridoLuz(Array.from({ length: 40 }, (_, k) => desde.clone().lerp(hasta, k / 39)), i % 2 ? '#dff2ff' : '#ffe6f2');
    p.material.vertexShader = p.material.vertexShader.replace('float p = fract(aT * 3.0 - uTime * 0.25);', 'float ciclo = fract(uTime * 0.13 + ' + (i * 0.37).toFixed(2) + '); float p = 1.0 - clamp(abs(aT - ciclo * 4.0) * 4.0, 0.0, 1.0); p = p * step(ciclo, 0.25);');
    p.material.vertexShader = p.material.vertexShader.replace('vA = (0.12 + pow(p, 6.0))', 'vA = (pow(p, 2.0))');
    calma.add(p); return p;
  });
  yield;
  // La binaria: Xio (rosa) y Cas (azul) orbitan juntas, con su estela, y entre ellas fluye
  // un puente de gas luminoso de una a otra (como en las estrellas binarias reales).
  const parCalma = crearDosEstrellas({ uScale, uPR }, { radio: 46, alto: 0, fondo: 46, velocidad: 0.2, colores: ['#ff9fcb', '#94baff'], tam: 2.2 });
  parCalma.grupo.rotation.copy(disco.rotation); calma.add(parCalma.grupo);
  const halosBinaria = parCalma.estrellas.map((e, i) => { const h = luz(e, [0, 0, 0], i ? '#7fa8ff' : '#ff86bd', 120); h.material.opacity = 0.3; return h; });
  const PUENTE = 160, puente = crearDestellos(Array.from({ length: PUENTE }, (_, k) => ({ pos: [0, 0, 0], color: new THREE.Color('#9cc0ff').lerp(new THREE.Color('#ffa6d0'), (k % 40) / 39), tam: 3 + Math.random() * 3, opacidad: 0.7, pulso: 0.4 })), { map: brillo, uScale, uPR });
  parCalma.grupo.add(puente);
  const puenteA = new THREE.Vector3(), puenteB = new THREE.Vector3(), puenteC = new THREE.Vector3(), perp = new THREE.Vector3();
  const resplandorBinaria = luz(calma, [0, 0, 0], '#e6b8ff', 260); resplandorBinaria.material.opacity = 0.1;
  const luciernagasCalma = crearLuciernagas({ uScale, uPR }, { cantidad: 90, radio: 230, alto: 300, base: -150, colores: ['#ffffff', '#dfe8ff', '#ffe4f0'], tam: 2.2, parpadeo: 0.8 }); calma.add(luciernagasCalma);
  
  yield;
  // ── El cometa ── (cometa.js)
  const cometa = crearCometa({ uScale, uPR }); raiz.add(cometa.grupo); tocables.push(cometa.cabeza);
  let foco = 'hogar', floracion = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), proyectado = new THREE.Vector3();
  const conTiempo = [petalosPuntos, petalosRedondos, saviaPuntos, rocio, centrosPuntos, tallosPuntos, musgo, campo, polvoRuta, luciernagasJardin, luciernagasCalma, polvoTiempo, ...aros.map(g => g.children[1])];

  return {
    grupos,
    elegirConstelacion,
    cumplirSuenos(ids) {
      const cumplido = new THREE.Color('#ffe6a4');
      for (const f of flores) {
        const malla = f.indice % 2 ? petalosRedondos : petalosPuntos, j = f.indice >> 1, si = ids.includes(f.sueno);
        f.actual = si ? f.tam * 1.3 : f.tam;
        malla.geometry.getAttribute('aColor').setXYZ(j, ...(si ? cumplido : f.color).toArray()); malla.geometry.getAttribute('aSize').setX(j, f.actual);
      }
      for (const m of [petalosPuntos, petalosRedondos]) { m.geometry.getAttribute('aColor').needsUpdate = true; m.geometry.getAttribute('aSize').needsUpdate = true; }
    },
    // El jardín florece: una ola que abre las flores desde el centro hacia fuera.
    florecer() { floracion = 0.001; },
    enfocar(id) { foco = id; },
    get foco() { return foco; },
    constelar() { if (completada) { completada = false; unidos = 0; trazado = 0; llenado = 0; geo.setDrawRange(0, 0); } tejiendo = true; tejidoT = 0; },
    unirNodo,
    get unidas() { return unidos; },
    get constelada() { return completada; },
    get cometaVisible() { return cometa.visible; },
    posicionCometa() { return cometa.posicion(); },
    // Dirección de la cola de polvo (para llegar al cometa siguiéndola).
    colaCometa() { return cometa.cola(); },
    // Un punto de la ruta postal en coordenadas del mundo (ángulo en su plano).
    puntoRuta(angulo) { correo.updateMatrixWorld(true); return ruta.localToWorld(new THREE.Vector3(Math.cos(angulo) * RADIO_RUTA, 12, Math.sin(angulo) * RADIO_RUTA)); },
    probarToque(x, y, camera) {
      ndc.set(x / vista.ancho * 2 - 1, 1 - y / vista.alto * 2); ray.setFromCamera(ndc, camera);
      raiz.updateMatrixWorld(true);
      // Un destello fino conserva una zona de toque de 44 px; no es necesario
      // convertir la estrella en un halo gigante para poder unirla con el dedo.
      if (foco === 'constelacion') {
        let cercano = null, distancia = 22 * 22;
        for (const nodo of luces) {
          nodo.getWorldPosition(proyectado).project(camera);
          if (proyectado.z < -1 || proyectado.z > 1) continue;
          const dx = (proyectado.x + 1) * vista.ancho / 2 - x, dy = (1 - proyectado.y) * vista.alto / 2 - y;
          const d = dx * dx + dy * dy;
          if (d < distancia) { distancia = d; cercano = nodo; }
        }
        if (cercano) return { tipo: 'nodo', id: cercano.userData.nodo };
      }
      const objetos = tocables.filter(o => (o.userData.nodo === undefined || foco === 'constelacion') && (o.userData.destino !== 'cometa' || cometa.visible));
      const hit = ray.intersectObjects(objetos, false)[0];
      return hit ? (hit.object.userData.nodo !== undefined ? { tipo: 'nodo', id: hit.object.userData.nodo } : { tipo: 'destino', id: hit.object.userData.destino }) : null;
    },
    actualizar(t, dt, { tiempoDentro, camera }) {
      // Lejos de casa (desde los gigantes) los lugares no se ven: solo sigue el cometa, que tiene su propio recorrido.
      // La constelación de casa (el corazón, el infinito… de CONSTELACIONES) no se ve desde las seis grandes: allí no hay
      // figuras de corazón ni de infinito hechas con estrellas (cada una tiene su propio cielo: universoLocal.js).
      constelacion.visible = !GRANDES.has(foco);
      if (!raiz.visible) { cometa.actualizar(t, dt, { tiempoDentro, foco, camera }); return; }
      // La figura sigue siendo espacial, pero no desaparece de canto cuando
      // la cámara orbita. Igual que el corazón central, mira a quien la visita.
      constelacion.quaternion.copy(camera.quaternion);
      for (const a of animados) a.objeto.position.y = a.base + Math.sin(t * 0.7) * 7;
      for (const p of conTiempo) p.material.uniforms.uTime.value = t;
      hiloLuz.material.uniforms.uTime.value = t; relleno.material.uniforms.uTime.value = t; guia.material.uniforms.uTime.value = t;
      luna.rotation.y += dt * 0.035; ruta.rotation.y += dt * 0.06;
      const posEstela = estelaSobres.geometry.getAttribute('position'), giroRuta = ruta.rotation.y;
      sobres.forEach((s, j) => {
        const a = s.userData.angulo; s.position.set(Math.cos(a) * RADIO_RUTA, 4 + Math.sin(t * 1.2 + a * 3) * 2.5, Math.sin(a) * RADIO_RUTA);
        s.material.rotation = Math.sin(t * 0.9 + j) * 0.18;
        // La ruta gira en sentido positivo: la estela queda en los ángulos anteriores del sobre.
        for (let k = 0; k < POR_SOBRE; k++) { const b = a + (k + 1) * 0.045; posEstela.setXYZ(j * POR_SOBRE + k, Math.cos(b) * RADIO_RUTA, 4 + Math.sin(t * 1.2 + b * 3) * 2.5 + Math.sin(t * 3 + k) * 1.5, Math.sin(b) * RADIO_RUTA); }
      });
      posEstela.needsUpdate = true; estelaSobres.material.uniforms.uTime.value = t;
      ruta2.rotation.y -= dt * 0.09;
      const posEstela2 = estelaSobres2.geometry.getAttribute('position');
      sobres2.forEach((sp, j) => {
        const a = sp.userData.angulo; sp.position.set(Math.cos(a) * RADIO_RUTA2, Math.sin(t * 1.4 + j) * 2, Math.sin(a) * RADIO_RUTA2); sp.material.rotation = Math.sin(t + j * 2) * 0.2;
        // Esta ruta gira al revés: la estela queda en los ángulos posteriores.
        for (let k = 0; k < POR_SOBRE; k++) { const b = a - (k + 1) * 0.05; posEstela2.setXYZ(j * POR_SOBRE + k, Math.cos(b) * RADIO_RUTA2, Math.sin(t * 1.4 + j) * 2 + Math.sin(t * 3 + k) * 1.2, Math.sin(b) * RADIO_RUTA2); }
      });
      posEstela2.needsUpdate = true; estelaSobres2.material.uniforms.uTime.value = t; polvoRuta2.material.uniforms.uTime.value = t;
      // Destello al pasar por delante (el lado de la ruta más cercano a la cámara).
      const distanciaLuna = camera.position.distanceTo(luna.getWorldPosition(puntoSobre));
      for (const sp of [...sobres, ...sobres2]) {
        sp.getWorldPosition(puntoSobre); const cerca = 1 - Math.min(1, (puntoSobre.distanceTo(camera.position) - distanciaLuna + 150) / 300);
        sp.material.color.setScalar(0.8 + Math.max(0, cerca) * 0.25);
      }
      // Corazoncitos: nacen junto a un sobre y suben desvaneciéndose.
      const pc = corazonesCorreo.geometry.getAttribute('position');
      for (let k = 0; k < pc.count; k++) {
        const f = (t * 0.18 + k / pc.count) % 1, sp = sobres[k % sobres.length]; sp.getWorldPosition(puntoSobre); correo.worldToLocal(puntoSobre);
        if (f < 0.02) corazonesCorreo.userData[k] = puntoSobre.clone();
        const base = corazonesCorreo.userData[k] || puntoSobre;
        pc.setXYZ(k, base.x + Math.sin(t * 2 + k) * 6, base.y + f * 70, base.z);
      }
      pc.needsUpdate = true; corazonesCorreo.material.uniforms.uTime.value = t; corazonesCorreo.material.uniforms.uOp.value = 0.85;
      jardinGiro.rotation.y += dt * 0.02;
      hierba.material.uniforms.uTime.value = t;
      if (floracion > 0) {
        floracion += dt / 4.5;
        for (const f of flores) {
          const tam = (f.indice % 2 ? petalosRedondos : petalosPuntos).geometry.getAttribute('aSize'), [x, , z] = cabezas[f.indice].pos, ola = floracion * 1.6 - Math.hypot(x, z) / 190;
          tam.setX(f.indice >> 1, floracion >= 1 ? (f.actual ?? f.tam) : (f.actual ?? f.tam) * (1 + 0.55 * Math.max(0, Math.sin(Math.min(1, Math.max(0, ola)) * Math.PI))) * (ola < 0 ? 0.75 : 1));
        }
        for (const m of [petalosPuntos, petalosRedondos]) m.geometry.getAttribute('aSize').needsUpdate = true;
        if (floracion >= 1) floracion = 0;
      }
      aros.forEach((g, i) => { g.rotation.y += dt * 0.05 * (i + 1) * (i % 2 ? -1 : 1); });
      for (const s of relicarios) { const a = s.userData.angulo + t * 0.1, abierta = capsulaAbierta(s.userData.fecha); s.position.set(Math.cos(a) * 100, 0, Math.sin(a) * 100); s.material.color.set(abierta ? '#ffe0a0' : '#cdb8e8'); s.scale.setScalar(abierta ? 24 + Math.sin(t * 2.4) * 3 : 15); }
      const latido = Math.pow(Math.max(0, Math.sin(t * 1.6)), 6);
      corazonCapsula.scale.setScalar(62 + latido * 22); nucleoCapsula.material.opacity = 0.28 + latido * 0.2;
      cristal.material.uniforms.uT.value = t; cristal.rotation.y += dt * 0.03;
      arena.material.uniforms.uTime.value = t; reloj.rotation.y += dt * 0.1;
      // Las ruedas miran a la cámara y giran en sentidos opuestos.
      ruedas.forEach((g, i) => g.quaternion.copy(camera.quaternion).multiply(giroRueda.setFromAxisAngle(EJE_Z, i ? -t * 0.09 : t * 0.12)));
      // Tic: los números romanos destellan un instante cada segundo.
      numeros.material.uniforms.uTic.value = Math.exp(-((t % 1) * 9));
      for (const e of espirales) e.material.uniforms.uTime.value = t;
      facetas.rotation.y -= dt * 0.04; facetas.material.opacity = 0.16 + 0.08 * Math.sin(t * 1.1);
      anilloHoras.rotation.y = t * 0.2; horas.material.uniforms.uTime.value = t;
      rayosCapsula.forEach((m, i) => { m.material.uniforms.uT.value = t; m.material.uniforms.uA.value = capsulaAbierta(relicarios[i].userData.fecha) ? 0.9 : 0; });
      disco.material.uniforms.uTime.value = t;
      for (const f of fugaces) f.material.uniforms.uTime.value = t;
      parCalma.actualizar(t);
      // Puente de gas: corrientes que van de una estrella a la otra describiendo un arco.
      puenteA.copy(parCalma.estrellas[1].position); puenteB.copy(parCalma.estrellas[0].position);
      perp.set(-(puenteB.z - puenteA.z), 0, puenteB.x - puenteA.x).normalize().multiplyScalar(26);
      const posP = puente.geometry.getAttribute('position');
      for (let k = 0; k < PUENTE; k++) {
        const f = (k / 40 + t * 0.35) % 1, carril = Math.floor(k / 40) - 1.5;
        puenteC.copy(puenteA).lerp(puenteB, f).addScaledVector(perp, Math.sin(f * Math.PI) * (1 + carril * 0.18));
        posP.setXYZ(k, puenteC.x, puenteC.y + Math.sin(f * Math.PI * 2 + t) * 3 + carril * 1.5, puenteC.z);
      }
      posP.needsUpdate = true; puente.material.uniforms.uTime.value = t;
      // En pantallas estrechas la tarjeta ya muestra el nombre del lugar visitado: su
      // etiqueta 3D se atenúa para no repetirlo justo encima. Las demás se siguen viendo.
      const estrecha = vista.ancho / vista.alto < 0.95;
      for (const e of etiquetas) { const meta = estrecha && e.userData.etiquetaDestino === foco ? 0 : 0.8; e.material.opacity += (meta - e.material.opacity) * Math.min(1, dt * 3); }
      // Constelación: trazo, luces y relleno al completarla.
      const total = puntosHilo.length;
      const trazoMeta = completada ? total + 1 : unidos > 0 ? posicionNodos[Math.min(unidos, posicionNodos.length) - 1] + 1 : 0;
      trazado = Math.min(trazoMeta, trazado + dt * 70); geo.setDrawRange(0, Math.floor(trazado));
      hiloLuz.geometry.setDrawRange(0, Math.floor(trazado));
      hilo.visible = trazado >= 2; hiloLuz.visible = trazado >= 1;   // sin trazo aún: nada que dibujar (sin órdenes de dibujo vacías)
      llenado += ((completada && trazado >= total ? 1 : 0) - llenado) * Math.min(1, dt * 0.8);
      relleno.material.uniforms.uOpacidad.value = llenado * (nebulosa ? 0.45 : 1); relleno.visible = llenado > 0.01;
      if (nebulosa) { nebulosa.material.uniforms.uT.value = t; nebulosa.material.uniforms.uLlenado.value = llenado; nebulosa.visible = llenado > 0.01; }
      // Corriente de luz: chispas que recorren el trazo ya tejido.
      const tejido = Math.floor(trazado), posC = chispas.geometry.getAttribute('position');
      for (let k = 0; k < CHISPAS; k++) {
        const i = tejido > 2 ? Math.floor(((k / CHISPAS + t * 0.045) % 1) * Math.min(tejido, total - 1)) : 0;
        const v = puntosHilo[i] || puntosHilo[0]; posC.setXYZ(k, v.x, v.y, v.z + 1);
      }
      posC.needsUpdate = true; chispas.visible = tejido > 2; chispas.material.uniforms.uTime.value = t;
      // Completo, el corazón late con suavidad (doble pulso, como un latido).
      const fase = (t % 1.7) / 1.7, pulsoCorazon = completada ? Math.exp(-Math.pow((fase - 0.1) * 18, 2)) + 0.6 * Math.exp(-Math.pow((fase - 0.26) * 18, 2)) : 0;
      figura.scale.setScalar(1 + pulsoCorazon * 0.028 * llenado);
      if (decoracion) {
        const { marco, interior, nombres, subida, base } = decoracion.userData;
        marco.material.uniforms.uTime.value = t; interior.material.uniforms.uTime.value = t;
        interior.material.uniforms.uOpacidad.value = llenado * (0.6 + pulsoCorazon * 0.6); interior.visible = llenado > 0.002;
        for (const n of nombres) n.material.opacity = 0.32 + llenado * 0.6;
        // Corazoncitos: suben desde el contorno, se mecen y se desvanecen (solo con el corazón completo).
        subida.material.uniforms.uTime.value = t; subida.material.uniforms.uOp.value = llenado * 0.9; subida.visible = llenado > 0.002;
        const pos = subida.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) { const f = (t * 0.12 + i / pos.count) % 1; pos.setXYZ(i, base[i * 3] + Math.sin(t + i) * 6, base[i * 3 + 1] + f * 120, base[i * 3 + 2] + 10); }
        pos.needsUpdate = true;
      }
      luces.forEach((s, i) => { s.material.color.set(i < unidos ? '#fff0c9' : i === unidos ? '#ffffff' : '#d6a870'); s.scale.setScalar(i === unidos ? 30 + Math.sin(t * 3) * 3 : completada ? 21 + Math.sin(t * 2 + i) * 1.2 : 23); });
      if (tejiendo) { tejidoT += dt; if (tejidoT > 0.55) { tejidoT = 0; unirNodo(unidos); } }
      cometa.actualizar(t, dt, { tiempoDentro, foco, camera });
    }
  };
}
