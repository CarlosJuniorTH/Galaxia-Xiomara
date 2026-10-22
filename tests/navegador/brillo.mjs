// Continuidad de la luz en el paso imagen → estrellas 3D de una galaxia del campo.
// Se mide la luz integrada ANTES del brillo (bloom): solo el campo de galaxias, a un búfer de coma
// flotante del tamaño real del lienzo, sumando en una ventana alrededor de la galaxia. Una galaxia
// tiene brillo superficial constante: su luz total crece con el área (∝ radio²), así que L/radio²
// debe mantenerse a través del fundido (35–80 px). También de canto (oblicua), desplazada del centro
// y al alejarse (sin histéresis).
import { abrir } from './arnes.mjs';

export async function medirLuz(pagina, { px, inclinacion = 0, desplazada = 0, solo = null, rejilla = 0, indice = null }) {
  return pagina.evaluate(async ({ px, inclinacion, desplazada, solo, rejilla, indice }) => {
    const e = window.__galaxia.escena, i = e.interno, { THREE, camera, controls, renderer, scene } = i;
    e.pausar(true); i.lento(0); controls.enabled = false;
    // La galaxia de prueba, aislada: su imagen y sus estrellas con los mismos materiales, solas.
    let campo = null; scene.traverse(o => { if (o.userData.campo) campo = o.userData.campo; });
    const clave = 'g' + indice;
    if (!window.__prueba?.[clave]) {
      const lista = campo.lista, g = indice !== null ? lista[indice] : lista.find(g => g.id === 'ton618-paisaje-8')   // barrada dorada del paisaje del viaje;
      const n = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion); if (n.dot(g.pos) > 0) n.negate();
      (window.__prueba ||= {})[clave] = { g, n, grupo: campo.soloGalaxia(g) };
    }
    const { g, n, grupo } = window.__prueba[clave];
    const f = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)), d = g.radio * f / px;
    const lado = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize();
    const dir = n.clone().applyAxisAngle(lado, inclinacion);
    camera.position.copy(g.pos).addScaledVector(dir, d); camera.up.set(0, 1, 0); camera.lookAt(g.pos);
    if (desplazada) camera.rotateY(desplazada);   // la galaxia queda hacia un lado de la vista
    controls.target.copy(g.pos); camera.updateMatrixWorld(); e.pedirCuadro();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));   // uniformes al día (focal)
    grupo.children.forEach(o => { o.visible = !solo || (solo === 'imagen' ? !!o.userData.imagen : !!o.userData.estrellas); });
    const escena = new THREE.Scene(); escena.add(grupo);
    const tam = new THREE.Vector2(innerWidth, innerHeight).multiplyScalar(i.nucleo.uPR.value).floor(), W = tam.x, H = tam.y;   // resolución de la escena (la de uPR)
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType }), buf = new Float32Array(W * H * 4);
    const fondo = renderer.getClearColor(new THREE.Color()), alfa = renderer.getClearAlpha(); renderer.setClearColor(0, 1);
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(escena, camera); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); renderer.setRenderTarget(null); renderer.setClearColor(fondo, alfa);
    escena.remove(grupo); rt.dispose(); e.pedirCuadro();
    let L = 0; for (let k = 0; k < W * H; k++) L += 0.2126 * buf[k * 4] + 0.7152 * buf[k * 4 + 1] + 0.0722 * buf[k * 4 + 2];
    // Radio proyectado REAL (contorno del disco) frente al que usa el detalle (radio/profundidad).
    const pr = W / innerWidth, centro = g.pos.clone().project(camera), cx = (centro.x + 1) / 2 * W, cy = (centro.y + 1) / 2 * H;
    let rpx = 0; const u1 = lado.clone(), u2 = new THREE.Vector3().crossVectors(n, u1);
    for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2, q = g.pos.clone().addScaledVector(u1, Math.cos(a) * g.radio).addScaledVector(u2, Math.sin(a) * g.radio).project(camera); rpx = Math.max(rpx, Math.hypot((q.x + 1) / 2 * W - cx, (q.y + 1) / 2 * H - cy)); }
    let mapa = null;
    if (rejilla) { mapa = new Array(rejilla * rejilla).fill(0); for (let y = Math.max(0, Math.floor(cy - rpx)); y < Math.min(H, cy + rpx); y++) for (let x = Math.max(0, Math.floor(cx - rpx)); x < Math.min(W, cx + rpx); x++) { const gx = Math.floor((x - cx + rpx) / (2 * rpx) * rejilla), gy = Math.floor((y - cy + rpx) / (2 * rpx) * rejilla); if (gx < 0 || gy < 0 || gx >= rejilla || gy >= rejilla) continue; const j = (y * W + x) * 4; mapa[gy * rejilla + gx] += buf[j] + buf[j + 1] + buf[j + 2]; } }
    const z = -g.pos.clone().applyMatrix4(camera.matrixWorldInverse).z;
    return { px, L, mapa, LporArea: L / (px * pr) ** 2, radioDetalle: +(g.radio * f / z).toFixed(1), radioReal: +(rpx / pr).toFixed(1) };
  }, { px, inclinacion, desplazada, solo, rejilla, indice });
}

const pearson = (x, y) => { const n = x.length, mx = x.reduce((s, v) => s + v) / n, my = y.reduce((s, v) => s + v) / n; let xy = 0, xx = 0, yy = 0; for (let i = 0; i < n; i++) { xy += (x[i] - mx) * (y[i] - my); xx += (x[i] - mx) ** 2; yy += (y[i] - my) ** 2; } return xy / Math.sqrt(xx * yy); };

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc');
  try {
    // De luz no resuelta (1–3 px) a imagen y a estrellas 3D (35–80 px).
    const RADIOS = [1, 2, 3, 5, 12, 25, 35, 45, 55, 65, 80, 100, 120];
    for (const [nombre, op] of [['de frente', {}], ['oblicua (55°)', { inclinacion: 0.95 }], ['desplazada a un lado', { desplazada: 0.42 }]]) {
      const ida = [], vuelta = [];
      for (const px of RADIOS) ida.push(await medirLuz(pagina, { px, ...op }));
      for (const px of [...RADIOS].reverse()) vuelta.unshift(await medirLuz(pagina, { px, ...op }));
      // La galaxia aislada: su luz total debe crecer como su área proyectada (∝ radio²).
      const ref = ida.find(m => m.px === 25).LporArea, rel = ida.map(m => m.LporArea / ref);
      informe.nota(`${nombre}: L/radio² relativo a 25 px (1–3 px: luz no resuelta) → ${ida.map((m, k) => `${m.px}px ${rel[k].toFixed(3)}`).join(' · ')}`);
      informe.nota(`${nombre}: radio que usa el detalle / proyectado real → ${ida.map(m => `${m.radioDetalle}/${m.radioReal}`).join(' · ')}`);
      // Por debajo de 1,5 px rige la compresión perceptiva declarada (GAMMA_LUZ = 0,5: flujo ∝ px en vez de
      // px²): se espera un factor (1,5/px)^1 sobre la conservación pura. Por encima, conservación pura.
      const esperado = ida.map(m => Math.pow(Math.max(1, 1.5 / m.radioReal), 2 * (1 - 0.5))), corr = rel.map((v, k) => v / esperado[k]);
      const min = Math.min(...corr), max = Math.max(...corr);
      informe.comprobar(min > 0.95 && max < 1.05, `${nombre}: la luz sigue la regla en todo el paso luz → imagen → estrellas (±5 %; compresión declarada bajo 1,5 px)`, { min: +min.toFixed(3), max: +max.toFixed(3), a1px: +rel[0].toFixed(3), esperado1px: +esperado[0].toFixed(3) });
      const hist = Math.max(...ida.map((m, k) => Math.abs(m.L / vuelta[k].L - 1)));
      informe.comprobar(hist < 0.01, `${nombre}: acercarse y alejarse dan la misma luz (sin histéresis)`, { diferenciaMax: +hist.toFixed(4) });
    }
    // Orientación: el dibujo de las estrellas coincide con el de la imagen (no su reflejo).
    const G = 20, voltear = m => m.map((_, i) => m[(G - 1 - Math.floor(i / G)) * G + i % G]);
    const indices = await pagina.evaluate(() => { let c = null; window.__galaxia.escena.interno.scene.traverse(o => { if (o.userData.campo) c = o.userData.campo; });
      const l = c.lista, buscar = f => l.findIndex(f); return { espiral: buscar(g => g.tipo === 1 && g.radio > 900), barrada: buscar(g => g.tipo === 2 && g.radio > 900), andromeda: buscar(g => g.tipo === 9), colision: buscar(g => g.tipo === 10) }; });
    for (const [nombre, indice] of Object.entries(indices)) {
      if (indice < 0) { informe.nota(`${nombre}: no está en el campo`); continue; }
      const est = (await medirLuz(pagina, { px: 140, solo: 'estrellas', rejilla: G, indice })).mapa, img = (await medirLuz(pagina, { px: 140, solo: 'imagen', rejilla: G, indice })).mapa;
      const tal = pearson(est, img), refl = pearson(voltear(est), img);
      informe.comprobar(tal > 0.8 && tal > refl + 0.01, `${nombre}: estrellas e imagen con la misma orientación (no reflejadas)`, { talCual: +tal.toFixed(3), reflejada: +refl.toFixed(3) });
    }
    informe.comprobar(errores.length === 0, 'sin errores de consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
