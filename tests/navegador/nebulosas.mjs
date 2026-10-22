// Nebulosas volumétricas: calidad del muestreo y composición.
//  · Error de 16 y 24 muestras frente a una referencia convergida (96), por vista.
//  · Estriado: anisotropía de los gradientes de la imagen (las vetas paralelas la elevan).
//  · Composición: un cuerpo opaco delante tapa la nube; detrás queda velado por ella.
import { abrir } from './arnes.mjs';

export async function dibujarNube(pagina, { vista, muestras, esfera = null, indice = 0 }) {
  return pagina.evaluate(async ({ vista, muestras, esfera, indice }) => {
    const e = window.__galaxia.escena, i = e.interno, { THREE, camera, controls, renderer, scene } = i;
    e.pausar(true); i.lento(0); controls.enabled = false;
    const nubes = []; scene.traverse(o => { if (o.userData.volumen3D) nubes.push(o); });
    window.__nubePrueba ||= {};
    if (!window.__nubePrueba[indice]) window.__nubePrueba[indice] = nubes.filter(o => { const p = o.getWorldPosition(new THREE.Vector3()).length(); return p > 15000 && p < 50000; }).sort((a, b) => a.getWorldPosition(new THREE.Vector3()).length() - b.getWorldPosition(new THREE.Vector3()).length())[indice];   // por distancia a casa: estable aunque cambie el paisaje
    const n = window.__nubePrueba[indice];
    const c = n.getWorldPosition(new THREE.Vector3()), s = n.getWorldScale(new THREE.Vector3()), tam = Math.max(s.x, s.y, s.z);
    const z = new THREE.Vector3(0, 0, 1).applyQuaternion(n.getWorldQuaternion(new THREE.Quaternion())), x = new THREE.Vector3(1, 0, 0).applyQuaternion(n.getWorldQuaternion(new THREE.Quaternion()));
    const { ang, dist } = { frente: { ang: 0, dist: 1.6 }, oblicua: { ang: 0.8, dist: 1.6 }, lateral: { ang: 1.5, dist: 1.6 }, rasante: { ang: 1.35, dist: 0.85 } }[vista];
    const dir = z.clone().multiplyScalar(Math.cos(ang)).addScaledVector(x, Math.sin(ang)).normalize();
    camera.position.copy(c).addScaledVector(dir, tam * dist); camera.up.set(0, 1, 0); controls.target.copy(c); camera.lookAt(c); camera.fov = 60; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const anterior = i.nube.MUESTRAS.value; i.nube.MUESTRAS.value = muestras;
    const padre = n.parent, indicePadre = padre.children.indexOf(n), mundo = n.matrixWorld.clone();
    const escena = new THREE.Scene(); escena.add(n); mundo.decompose(n.position, n.quaternion, n.scale);
    let malla = null;
    if (esfera) { malla = new THREE.Mesh(new THREE.SphereGeometry(tam * 0.12, 32, 16), new THREE.MeshBasicMaterial({ color: 0x00ff00 })); malla.position.copy(c).addScaledVector(dir, tam * esfera); escena.add(malla); }
    const W = 360, H = 240, rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType }), buf = new Float32Array(W * H * 4);
    const asp = camera.aspect; camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setRenderTarget(rt); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(escena, camera); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); renderer.setRenderTarget(null);
    camera.aspect = asp; camera.updateProjectionMatrix(); padre.add(n); padre.children.splice(padre.children.indexOf(n), 1); padre.children.splice(indicePadre, 0, n); n.matrixWorld.copy(mundo); padre.worldToLocal(n.position); { const pm = padre.matrixWorld.clone().invert().multiply(mundo); pm.decompose(n.position, n.quaternion, n.scale); } i.nube.MUESTRAS.value = anterior; rt.dispose(); e.pedirCuadro();
    const lum = Array.from({ length: W * H }, (_, k) => 0.2126 * buf[k * 4] + 0.7152 * buf[k * 4 + 1] + 0.0722 * buf[k * 4 + 2]);
    const k0 = ((H >> 1) * W + (W >> 1)) * 4;
    return { W, H, lum, centro: [buf[k0], buf[k0 + 1], buf[k0 + 2]] };
  }, { vista, muestras, esfera, indice });
}
// Error relativo (RMS) entre dos imágenes, sobre la luz media de la referencia.
const error = (a, ref) => { let s = 0, m = 0; for (let k = 0; k < ref.length; k++) { s += (a[k] - ref[k]) ** 2; m += ref[k]; } return Math.sqrt(s / ref.length) / (m / ref.length); };
// Anisotropía de gradientes (tensor de estructura global): 0 isótropo, 1 todo en una dirección.
function anisotropia({ W, H, lum }) { let xx = 0, yy = 0, xy = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const gx = lum[y * W + x + 1] - lum[y * W + x - 1], gy = lum[(y + 1) * W + x] - lum[(y - 1) * W + x]; xx += gx * gx; yy += gy * gy; xy += gx * gy; } return Math.hypot(xx - yy, 2 * xy) / (xx + yy); }

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc');
  try {
    for (const vista of ['frente', 'oblicua', 'lateral', 'rasante']) {
      const ref = await dibujarNube(pagina, { vista, muestras: -128 }), m16 = await dibujarNube(pagina, { vista, muestras: 16 }), m24 = await dibujarNube(pagina, { vista, muestras: 24 });
      const e16 = error(m16.lum, ref.lum), e24 = error(m24.lum, ref.lum);
      informe.nota(`${vista}: error frente a 128 muestras fijas → 16: ${(e16 * 100).toFixed(1)} % · 24: ${(e24 * 100).toFixed(1)} %; anisotropía 24: ${anisotropia(m24).toFixed(2)} · 128: ${anisotropia(ref).toFixed(2)}`);
      informe.comprobar(e24 < 0.45, `${vista}: error de 24 muestras acotado (< 45 % frente a la referencia; medido 17–42 % según la nube)`, { error16: +e16.toFixed(3), error24: +e24.toFixed(3) });
      if (vista === 'lateral' || vista === 'rasante') informe.comprobar(anisotropia(m24) < 0.4, `${vista}: sin vetas paralelas dominantes (anisotropía < 0,4; antes 0,49–0,54)`, { anisotropia: +anisotropia(m24).toFixed(2) });
    }
    // Composición con un cuerpo opaco: delante tapa la nube (verde puro); detrás queda velado (menos verde).
    const delante = await dibujarNube(pagina, { vista: 'frente', muestras: 24, esfera: 1.2 }), detras = await dibujarNube(pagina, { vista: 'frente', muestras: 24, esfera: -0.9 });
    informe.comprobar(delante.centro[1] > 0.95 && delante.centro[0] < 0.05, 'un cuerpo opaco delante de la nube la tapa', { centro: delante.centro.map(v => +v.toFixed(2)) });
    informe.comprobar(detras.centro[0] > 0.05 && detras.centro[2] > 0.05, 'un cuerpo opaco detrás de la nube se ve a través de su gas (la nube se dibuja encima)', { centro: detras.centro.map(v => +v.toFixed(2)) });
    const dentro = await dibujarNube(pagina, { vista: 'frente', muestras: 24, esfera: 0 });
    informe.nota(`cuerpo opaco DENTRO de la nube (límite conocido): centro ${dentro.centro.map(v => v.toFixed(2)).join(', ')}`);
    informe.comprobar(errores.length === 0, 'sin errores de consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
