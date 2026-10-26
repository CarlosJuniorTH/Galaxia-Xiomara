// Sistema solar (Rosa, Azul, la luna de las cartas), en el PC y en el móvil (iphoneMax: resolución dinámica hasta 2,25,
// reescalado con enfoque):
//  · Sin puntos negros: con zoom adelante y atrás y girando (cuadros reales, con las estelas del movimiento), la escena HDR
//    no tiene NaN ni infinitos. Antes: miles por cuadro (pow de un negativo en bordes de triángulo con el MSAA de esta
//    escena, en las estelas y en los chorros del cuásar que se veía a lo lejos), y la pasada de salida los pintaba negros.
//  · Red de seguridad: un píxel NaN metido a propósito no sale negro en la pantalla (se rellena con sus vecinos).
//  · Desde dentro solo se ve el centro de nuestra galaxia (en su dirección real) y nada del cielo lejano; su núcleo no pasa
//    del umbral del resplandor (sin mancha difusa).
//  · Entrada: se mira al punto del brazo (el Sol) al llegar a él; tras el corte, al Sol; y se termina mirando al destino.
import { abrir, visitar } from './arnes.mjs';


// NaN e infinitos de los dos búferes del compositor tras el último cuadro dibujado.
const leerNaN = () => {
  const i = window.__galaxia.escena.interno, { renderer, nucleo } = i, post = nucleo.post; let nan = 0, inf = 0;
  for (const rt of [post.renderTarget1, post.renderTarget2]) {
    const W = Math.floor(rt.viewport.z), H = Math.floor(rt.viewport.w), px = new Uint16Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
    for (let k = 0; k < W * H; k++) for (let c = 0; c < 3; c++) { const h = px[k * 4 + c]; if (((h >> 10) & 31) === 31) { if (h & 1023) nan++; else inf++; } }
  }
  return { nan, inf };
};

async function moverYMedir(pagina) {
  await pagina.evaluate(l => { window.__leerNaN = eval(l); window.__trasCuadro = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(window.__leerNaN())))); }, `(${leerNaN})`);
  const vp = pagina.viewportSize(), cx = vp.width / 2, cy = vp.height / 2, cuadros = [];
  await pagina.mouse.move(cx, cy);
  for (let k = 0; k < 8; k++) { await pagina.mouse.wheel(0, k < 4 ? 450 : -450); await pagina.waitForTimeout(50); cuadros.push(await pagina.evaluate(() => window.__trasCuadro())); }
  await pagina.mouse.down();
  for (let k = 0; k < 8; k++) { await pagina.mouse.move(cx - k * 45, cy + k * 10); cuadros.push(await pagina.evaluate(() => window.__trasCuadro())); }
  await pagina.mouse.up();
  return { nan: cuadros.reduce((a, c) => a + c.nan, 0), inf: cuadros.reduce((a, c) => a + c.inf, 0), cuadros: cuadros.length };
}

export default async function ({ base, informe }) {
  for (const perfil of ['pc', 'iphoneMax']) {
    const { navegador, pagina, errores } = await abrir(base, perfil);
    try {
      informe.nota(`perfil ${perfil}`);
      await visitar(pagina, 'rosa');
      const m = await moverYMedir(pagina);
      informe.comprobar(m.nan === 0 && m.inf === 0, `${perfil}: zoom y giro en el sistema solar sin NaN ni infinitos en la escena (puntos negros)`, m);

      // Red de seguridad: la pasada de salida, con una imagen gris que tiene un cuadradito de 3×3 píxeles NaN en el centro, no
      // lo pinta negro (lo rellena con sus vecinos). Con y sin el reescalado con enfoque del móvil (uNitidez).
      const red = await pagina.evaluate(async () => {
        const e = window.__galaxia.escena, i = e.interno, { THREE, renderer, nucleo } = i; e.pausar(true);
        const W = 64, H = 64, entrada = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }), salidaRt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
        const plano = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { uCero: { value: 0 } }, depthTest: false, depthWrite: false,
          vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
          // Gris en todo y NaN (pow de un negativo, con un uniforme para que no se pliegue) en 3×3 píxeles del centro.
          fragmentShader: 'uniform float uCero; void main(){ vec2 d = abs(gl_FragCoord.xy - 32.5); float n = pow(-1.0 - uCero, 1.3); gl_FragColor = vec4(max(d.x, d.y) <= 1.0 ? vec3(n) : vec3(0.3), 1.0); }' }));
        plano.frustumCulled = false; const sola = new THREE.Scene(); sola.add(plano);
        renderer.setRenderTarget(entrada); renderer.render(sola, i.camera);
        const salida = nucleo.post.passes.at(-1), u = salida.material.uniforms, guardado = { b: u.uBrillo.value, n: u.uNitidez.value, z: u.uZona.value.clone(), t: u.uTexel.value.clone() };
        const f = h => { const ex = (h >> 10) & 31, m = h & 1023; return ex === 31 ? NaN : +(ex ? Math.pow(2, ex - 15) * (1 + m / 1024) : Math.pow(2, -14) * m / 1024).toFixed(3); };
        const res = {};
        for (const nitidez of [0, 0.35]) {
          u.tDiffuse.value = entrada.texture; u.uBrillo.value = 0; u.uNitidez.value = nitidez; u.uTexel.value.set(1 / W, 1 / H); u.uZona.value.set(1, 1, (W - 0.5) / W, (H - 0.5) / H);
          renderer.setRenderTarget(salidaRt); salida.quad.render(renderer);
          const px = new Uint16Array(4), ref = new Uint16Array(4); renderer.readRenderTargetPixels(salidaRt, 32, 32, 1, 1, px); renderer.readRenderTargetPixels(salidaRt, 50, 32, 1, 1, ref);
          res[nitidez ? 'conEnfoque' : 'sinEnfoque'] = { centro: Array.from(px.slice(0, 3), f), referencia: Array.from(ref.slice(0, 3), f) };
        }
        renderer.setRenderTarget(null); u.uBrillo.value = guardado.b; u.uNitidez.value = guardado.n; u.uZona.value.copy(guardado.z); u.uTexel.value.copy(guardado.t);
        entrada.dispose(); salidaRt.dispose(); plano.material.dispose(); plano.geometry.dispose(); e.pausar(false);
        return res;
      });
      const igual = r => r.centro.every((v, k) => Math.abs(v - r.referencia[k]) < 0.03);
      informe.comprobar(igual(red.sinEnfoque) && igual(red.conEnfoque), `${perfil}: un píxel NaN en la escena no sale negro en la pantalla (se rellena con sus vecinos)`, red);

      // Vista: solo el centro galáctico, en la dirección real, y sin cielo lejano; núcleo por debajo del umbral del resplandor.
      const vista = await pagina.evaluate(async () => {
        const e = window.__galaxia.escena, i = e.interno, { THREE, camera, controls, renderer, nucleo, solar } = i; e.pausar(true); controls.enabled = false;
        const ajenos = solar.escena.children.filter(o => ['cosmos', 'estrellas', 'galaxiasLejanas', 'viaLactea'].includes(o.userData.capa)).length;
        const nc = solar.escena.getObjectByName('Centro galáctico'); if (!nc) return { ajenos };
        const p = nc.geometry.attributes.position, c = new THREE.Vector3(); for (let k = 0; k < 2000; k++) c.add(new THREE.Vector3().fromBufferAttribute(p, k)); c.normalize();
        // Dirección real: la opuesta al punto del brazo (galaxia.js: enBrazo(1, 0,62) con 5 brazos, giro 4,5 y radio 980) en el marco de la galaxia.
        const ang = 2 * Math.PI / 5 + 0.62 * 4.5, real = new THREE.Vector3(-Math.cos(ang), 0, -Math.sin(ang));
        controls.target.copy(camera.position).add(c.clone().multiplyScalar(2000)); camera.lookAt(controls.target); camera.updateMatrixWorld();
        nucleo.lente.enabled = false; nucleo.post.render();
        const rt = nucleo.post.readBuffer, W = Math.floor(rt.viewport.z), H = Math.floor(rt.viewport.w), px = new Uint16Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
        const f = h => { const s = h >> 15, ex = (h >> 10) & 31, m = h & 1023; return (s ? -1 : 1) * (ex ? Math.pow(2, ex - 15) * (1 + m / 1024) : Math.pow(2, -14) * m / 1024); };
        let pico = 0, encendidos = 0;
        for (let y = Math.floor(H * 0.4); y < H * 0.6; y++) for (let x = Math.floor(W * 0.4); x < W * 0.6; x++) { const k = (y * W + x) * 4, l = 0.2126 * f(px[k]) + 0.7152 * f(px[k + 1]) + 0.0722 * f(px[k + 2]); pico = Math.max(pico, l); if (l > 0.05) encendidos++; }
        e.pausar(false);
        return { ajenos, angulo: +THREE.MathUtils.radToDeg(c.angleTo(real)).toFixed(2), pico: +pico.toFixed(3), encendidos };
      });
      informe.comprobar(vista.ajenos === 0, `${perfil}: en el sistema solar no se dibuja el cielo lejano (cosmos, estrellas, galaxias, Vía Láctea)`, vista);
      informe.comprobar(vista.angulo < 1 && vista.encendidos > 50, `${perfil}: el centro galáctico se ve en su dirección real`, vista);
      informe.comprobar(vista.pico < 0.78, `${perfil}: su núcleo no pasa del umbral del resplandor (motas nítidas, sin mancha)`, vista);

      // Entrada desde casa: mirando al Sol antes y después del corte; al final, al destino.
      if (perfil === 'pc') {
        await visitar(pagina, 'hogar');
        await pagina.evaluate(() => { window.__galaxia.interfaz.visitar('azul'); });
        const muestras = [];
        for (let k = 0; k < 200; k++) {
          const s = await pagina.evaluate(() => {
            const i = window.__galaxia.escena.interno, { THREE, camera, galaxia } = i, enSolar = i.escenaActiva === 'solar';
            const mira = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), a = p => THREE.MathUtils.radToDeg(mira.angleTo(p.clone().sub(camera.position).normalize()));
            return { enSolar, sol: a(enSolar ? new THREE.Vector3() : galaxia.puntoBrazo()), destino: enSolar ? a(new THREE.Vector3(1650, -100 + 22, 1600)) : null, d: camera.position.distanceTo(enSolar ? new THREE.Vector3() : galaxia.puntoBrazo()), viajando: window.__galaxia.escena.viajando };
          });
          muestras.push(s); if (!s.viajando && k > 4) break; await pagina.waitForTimeout(120);
        }
        const antes = muestras.filter(s => !s.enSolar && s.viajando), despues = muestras.filter(s => s.enSolar);
        const finAntes = antes.slice(Math.floor(antes.length / 2)).filter(s => s.d > 300), inicioDespues = despues.slice(0, 3), ultimo = muestras.at(-1);
        informe.comprobar(finAntes.length > 0 && Math.max(...finAntes.map(s => s.sol)) < 10, 'entrada: hacia el punto del brazo, mirando al Sol', { maxGrados: finAntes.length ? +Math.max(...finAntes.map(s => s.sol)).toFixed(1) : null });
        informe.comprobar(inicioDespues.length > 0 && Math.max(...inicioDespues.map(s => s.sol)) < 3, 'entrada: tras el corte, la cámara mira al Sol', { grados: inicioDespues.map(s => +s.sol.toFixed(1)) });
        informe.comprobar(ultimo.enSolar && ultimo.destino < 8, 'entrada: termina mirando al destino (Azul)', { grados: +ultimo.destino?.toFixed(1) });

        // Salida (de Azul a casa), el espejo de la entrada: en el sistema solar la cámara se aleja mirando al Sol; tras el corte
        // aparece junto a la marca del brazo, mirándola, en la misma posición relativa (escalada ×60/8400 y girada con el brazo):
        // ni salto de lado ni la miniatura «mirando a otro sitio».
        await pagina.waitForTimeout(800);
        await pagina.evaluate(() => { window.__galaxia.interfaz.visitar('hogar'); });
        const salida = [];
        for (let k = 0; k < 500; k++) {
          const s = await pagina.evaluate(() => {
            const i = window.__galaxia.escena.interno, { THREE, camera, galaxia } = i, enSolar = i.escenaActiva === 'solar';
            const mira = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), centro = enSolar ? new THREE.Vector3() : galaxia.puntoBrazo();
            const a = THREE.MathUtils.radToDeg(mira.angleTo(centro.clone().sub(camera.position).normalize()));
            // Posición relativa en el marco del sistema solar: en la escena principal se deshace el giro del brazo y la escala.
            const ang = 2 * Math.PI / 5 + 0.62 * 4.5, rad = 60 + 0.62 * 980, giro = Math.atan2(centro.x, centro.z) - Math.atan2(Math.cos(ang) * rad, Math.sin(ang) * rad);
            const rel = camera.position.clone().sub(centro); if (!enSolar) rel.applyAxisAngle(new THREE.Vector3(0, 1, 0), -giro).multiplyScalar(8400 / 60);
            return { enSolar, a, rel: rel.toArray(), viajando: window.__galaxia.escena.viajando };
          });
          salida.push(s); if (!s.viajando && k > 4) break; await pagina.waitForTimeout(30);   // muestreo fino alrededor del corte
        }
        const dentro = salida.filter(s => s.enSolar), fueraS = salida.filter(s => !s.enSolar);
        const ultDentro = dentro.at(-1), primFuera = fueraS[0];
        const V = a => ({ l: Math.hypot(...a), n: a.map(x => x / Math.hypot(...a)) }), d1 = V(ultDentro.rel), d2 = V(primFuera.rel);
        const angRel = Math.acos(Math.min(1, d1.n.reduce((t, x, j) => t + x * d2.n[j], 0))) * 180 / Math.PI;
        informe.comprobar(dentro.slice(-3).every(s => s.a < 5) && V(dentro.at(-1).rel).l > V(dentro[Math.floor(dentro.length / 2)].rel).l, 'salida: en el sistema solar se aleja mirando al Sol', { grados: dentro.slice(-3).map(s => +s.a.toFixed(1)) });
        informe.comprobar(primFuera.a < 3, 'salida: tras el corte, la cámara mira a la marca del sistema solar', { grados: +primFuera.a.toFixed(1) });
        informe.comprobar(angRel < 8 && d2.l / d1.l > 0.5 && d2.l / d1.l < 2, 'salida: aparece junto a la marca en la misma posición relativa (sin salto de lado)', { angulo: +angRel.toFixed(1), razon: +(d2.l / d1.l).toFixed(2) });
      }
      informe.comprobar(errores.length === 0, `${perfil}: sin errores de consola`, errores.slice(0, 3));
    } finally { await navegador.close(); }
  }
}
