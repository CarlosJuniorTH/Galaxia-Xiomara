// Profundidad de los agujeros negros frente al resto del universo y continuidad de la lente.
// Se dibuja la escena (sin postprocesado) a un búfer y se leen sus píxeles: un cuerpo opaco
// delante de TON 618 o de Sagitario A* debe taparlos; un cuerpo detrás debe quedar tapado por la
// sombra. La lente de pantalla no debe aparecer y desaparecer de golpe al cruzar un cuerpo.
import { abrir } from './arnes.mjs';

// En la página: coloca la cámara, añade (si se pide) una esfera opaca de prueba y devuelve los
// píxeles del búfer en una ventana alrededor del centro del agujero, más la máscara de la esfera.
async function medir(pagina, { agujero, inclinacion = 0, esfera = null }) {
  return pagina.evaluate(({ agujero, inclinacion, esfera }) => {
    const e = window.__galaxia.escena, i = e.interno, { THREE, camera, controls, renderer, scene, cosmos } = i;
    e.pausar(true); i.lento(0); controls.enabled = false;
    const b = cosmos.cuerpos(), c = agujero === 'ton618' ? b[1] : b[2];
    const eje = c.centro.clone().negate().normalize();   // desde el lado de casa
    const lado = new THREE.Vector3().crossVectors(eje, new THREE.Vector3(0, 1, 0)).normalize();
    eje.applyAxisAngle(lado, inclinacion);
    camera.position.copy(c.centro).addScaledVector(eje, c.radio * 4); controls.target.copy(c.centro); camera.lookAt(c.centro); camera.updateMatrixWorld();
    // El plano cercano, el que pondría index.js en esta posición (0,002 × la distancia a lo que se mira): con la escena en
    // pausa se quedaba el de casa (0,5) y a millones de unidades la profundidad no distinguía la esfera del disco.
    const cerca = camera.near; camera.near = Math.max(0.5, c.radio * 4 * 0.002);
    let malla = null;
    if (esfera) {
      malla = new THREE.Mesh(new THREE.SphereGeometry(c.radio * esfera.radio, 32, 16), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
      malla.position.copy(c.centro).addScaledVector(eje, c.radio * esfera.distancia).addScaledVector(lado, c.radio * (esfera.lateral || 0)); scene.add(malla);
    }
    const W = 320, H = 200, rt = new THREE.WebGLRenderTarget(W, H), px = new Uint8Array(W * H * 4);
    const aspecto = camera.aspect; camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.readRenderTargetPixels(rt, 0, 0, W, H, px); renderer.setRenderTarget(null);
    // Máscara de la esfera: solo ella, en negro sobre blanco.
    let mascara = null;
    if (malla) {
      const solo = new THREE.Scene(); const m2 = malla.clone(); m2.material = new THREE.MeshBasicMaterial({ color: 0xffffff }); solo.add(m2);
      const pm = new Uint8Array(W * H * 4); renderer.setRenderTarget(rt); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(solo, camera); renderer.readRenderTargetPixels(rt, 0, 0, W, H, pm); renderer.setRenderTarget(null);
      mascara = Array.from({ length: W * H }, (_, k) => pm[k * 4] > 128 ? 1 : 0); scene.remove(malla);
    }
    camera.aspect = aspecto; camera.near = cerca; camera.updateProjectionMatrix(); rt.dispose(); e.pedirCuadro();
    // Píxeles donde se ve la esfera: ¿son verde puro (tapa) o tienen luz del agujero encima?
    let dentro = 0, contaminados = 0, centroOscuro = 0;
    for (let k = 0; k < W * H; k++) {
      if (mascara && mascara[k]) { dentro++; if (px[k * 4] > 24 || px[k * 4 + 2] > 24) contaminados++; }
    }
    const k0 = ((H >> 1) * W + (W >> 1)) * 4; centroOscuro = px[k0] + px[k0 + 1] + px[k0 + 2];
    return { dentro, contaminados, centro: [px[k0], px[k0 + 1], px[k0 + 2]], centroOscuro };
  }, { agujero, inclinacion, esfera });
}

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc');
  try {
    for (const agujero of ['ton618', 'sagitario']) for (const inclinacion of [0, 0.35, -0.6]) {
      // Delante: una esfera opaca entre la cámara y el agujero, tapando su centro y parte del disco.
      const d = await medir(pagina, { agujero, inclinacion, esfera: { radio: 0.45, distancia: 2.2, lateral: 0.25 } });
      informe.comprobar(d.dentro > 200 && d.contaminados / d.dentro < 0.01, `${agujero} (inclinación ${inclinacion}): un cuerpo opaco delante lo tapa`, { pixelesEsfera: d.dentro, conLuzDelAgujero: d.contaminados });
      // Detrás: la esfera queda tapada por la sombra (el centro de la imagen es oscuro, no verde).
      // (Lo que haya DELANTE de la sombra, como la luz de la Vía Láctea alrededor de Sagitario A*, puede verse:
      // lo que se comprueba es que la esfera de detrás no cambia el píxel.)
      const t = await medir(pagina, { agujero, inclinacion, esfera: { radio: 0.25, distancia: -3 } }), t0 = await medir(pagina, { agujero, inclinacion });
      const cambio = Math.max(...t.centro.map((v, k) => Math.abs(v - t0.centro[k])));
      informe.comprobar(cambio <= 6, `${agujero} (inclinación ${inclinacion}): la sombra tapa lo que está detrás`, { conEsfera: t.centro, sinEsfera: t0.centro });
    }
    // Lente de Sagitario A*: barrido de la mirada para que el agujero salga de la pantalla y vuelva; la
    // fuerza de la lente no debe saltar más de un 35 % de su máximo entre cuadros contiguos. (Antes se
    // probaba con Xiomara pasando por delante de TON 618; con 100–140 Mal de separación ningún cuerpo
    // puede cruzar delante de una lente a un tamaño visible: la lente solo se ve a menos de ~14 000.)
    const serie = await pagina.evaluate(async () => {
      const e = window.__galaxia.escena, i = e.interno, { THREE, camera, controls, cosmos } = i; e.pausar(true); i.lento(0); controls.enabled = false;
      const sgr = cosmos.lentes().find(l => l.id === 'sagitario').centro, dir = sgr.clone().normalize(), lado = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      camera.position.copy(sgr).addScaledVector(dir, -5000);
      const out = [];
      for (let k = 0; k <= 80; k++) {
        const mira = sgr.clone().addScaledVector(lado, (k - 40) * 160); controls.target.copy(mira); camera.lookAt(mira); camera.updateMatrixWorld(); e.pedirCuadro();
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        out.push(i.lente.uL[0][3]);
      }
      return out;
    });
    const max = Math.max(...serie), salto = Math.max(...serie.slice(1).map((v, k) => Math.abs(v - serie[k])));
    informe.comprobar(max > 0 && salto / max < 0.35, 'la lente de Sagitario A* entra y sale de la pantalla con suavidad (sin saltos)', { maximo: +max.toFixed(4), mayorSalto: +salto.toFixed(4), minimo: +Math.min(...serie).toFixed(4) });
    informe.comprobar(errores.length === 0, 'sin errores de consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
