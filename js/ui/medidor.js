// Medidor en pantalla (?hud): cuadros por segundo reales, el cuadro más lento, resolución y tarjeta gráfica. Con «Medir
// capas» apaga una a una las partes del universo (1 s cada una, girando la cámara como un dedo) y muestra cuántos FPS se
// ganan sin cada una: así se ve en el propio teléfono qué es lo que le cuesta. No envía nada a ningún sitio.
export function crearMedidor(escena) {
  if (!new URLSearchParams(location.search).has('hud')) return;
  const caja = document.createElement('div');
  caja.style.cssText = 'position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom));z-index:500;padding:6px 9px;border-radius:10px;background:#000d;color:#9f9;font:600 11px/1.35 ui-monospace,monospace;pointer-events:none;white-space:pre;max-width:calc(100vw - 16px);overflow:hidden';
  const boton = document.createElement('button'); boton.type = 'button'; boton.textContent = 'Medir capas';
  boton.style.cssText = 'position:fixed;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));z-index:501;padding:8px 12px;border-radius:10px;border:1px solid #9f9;background:#000d;color:#9f9;font:600 12px ui-monospace,monospace';
  const boton2 = document.createElement('button'); boton2.type = 'button'; boton2.textContent = 'Probar ajustes';
  boton2.style.cssText = boton.style.cssText.replace('bottom:calc(8px', 'bottom:calc(52px');
  document.body.append(caja, boton, boton2);
  const lienzo = document.getElementById('galaxia'), gl = lienzo.getContext('webgl2') || lienzo.getContext('webgl');
  const info = gl?.getExtension('WEBGL_debug_renderer_info'), gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).slice(0, 34) : '';
  let antes = performance.now(), tiempos = [], ultimo = antes, informe = '';
  const paso = ahora => {
    tiempos.push(ahora - antes); antes = ahora;
    if (ahora - ultimo > 1000) {
      const t = tiempos.slice().sort((a, b) => a - b), media = t.reduce((a, b) => a + b, 0) / t.length, d = lienzo.dataset;
      caja.textContent = `${(1000 / media).toFixed(0)} FPS · peor ${t.at(-1).toFixed(0)} ms · >25ms: ${t.filter(x => x > 25).length}\nres ${d.resolucion3d} · lienzo ${d.lienzo3d} · aligerado ${d.aligerado || 0} · cambios ${d.cambiosResolucion || 0}\n${d.ritmo || ''} ${d.motivo || ''} · ${d.webgl || ''} ${d.brillo3d || ''} · ${gpu}${informe}`;
      tiempos = []; ultimo = ahora;
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);

  // FPS medios durante `ms` mientras la cámara gira alrededor del centro (como un dedo).
  const medir = ms => new Promise(fin => {
    const { camera, controls, THREE } = escena.interno, eje = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
    let t0 = performance.now(), prev = t0, n = 0;
    const f = ahora => { const dt = ahora - prev; prev = ahora; n++; escena.actividad();
      v.copy(camera.position).sub(controls.target).applyAxisAngle(eje, 0.6 * dt / 1000); camera.position.copy(controls.target).add(v); controls.update();
      if (ahora - t0 < ms) requestAnimationFrame(f); else fin(n * 1000 / (ahora - t0)); };
    requestAnimationFrame(f);
  });
  boton.addEventListener('click', async () => {
    const int = escena.interno; if (!int) return;
    boton.disabled = true; boton.textContent = 'Midiendo…';
    const { scene, camera, nucleo, telarana } = int;
    const partes = [], { THREE, cosmos } = int, w = new THREE.Vector3();
    // Nombre de cada grupo del cosmos: el gigante más cercano a su posición.
    const gigante = o => { o.getWorldPosition(w); let mejor = '', md = Infinity; for (const c of cosmos.cuerpos()) { const d = c.centro.distanceTo(w) / Math.max(1, c.radio); if (d < md) { md = d; mejor = c.id; } } return md < 4 ? mejor : 'otro'; };
    const juntos = new Map(), añadir = (n, o) => { if (!juntos.has(n)) juntos.set(n, []); juntos.get(n).push(o); };
    for (const o of scene.children) { if (!o.visible) continue; const nombre = o.userData.capa || o.name || o.type;
      if (nombre === 'cosmos') o.children.forEach(c => { if (c.visible) añadir(c.isGroup ? 'cosmos: ' + gigante(c) : 'cosmos: luces sueltas', c); });
      else if (nombre === 'telarana') o.children.forEach(c => { if (c.visible) añadir(c.isMesh ? 'telaraña: capa galaxias (composición)' : 'telaraña: polvo y cúmulos', c); });
      else añadir(nombre, o); }
    for (const c of camera.children) if (c.visible) añadir('cámara: estelas del viaje', c);
    if (telarana?.capaGalaxias) añadir('telaraña: galaxias', telarana.capaGalaxias);
    for (const [n, os] of juntos) partes.push([n, os]);
    const base = await medir(1500); const res = [];
    for (const [nombre, os] of partes) {
      const lista = [].concat(os); lista.forEach(o => (o.visible = false)); await medir(250); const fps = await medir(700); lista.forEach(o => (o.visible = true));
      res.push([nombre, fps]); informe = `\n— midiendo ${res.length}/${partes.length}: ${nombre}`;
    }
    const lente = nucleo.lente; if (lente?.enabled !== undefined) { const e = lente.enabled; lente.enabled = false; await medir(300); res.push(['pasada: lente', await medir(900)]); lente.enabled = e; }
    res.sort((a, b) => b[1] - a[1]);
    informe = `\nCON TODO: ${base.toFixed(0)} FPS. SIN CADA PARTE:\n` + res.slice(0, 16).map(([n, f]) => `${f.toFixed(0).padStart(3)} FPS sin ${n}`).join('\n');
    boton.disabled = false; boton.textContent = 'Medir capas';
  });

  // Prueba en el propio aparato varias soluciones candidatas (unos segundos cada una, girando la cámara) y muestra los FPS
  // de cada una y las órdenes de dibujo por cuadro: así se elige la que de verdad va a 60 en ese teléfono.
  boton2.addEventListener('click', async () => {
    const int = escena.interno; if (!int) return;
    boton2.disabled = true; boton2.textContent = 'Probando…';
    const { renderer, nucleo, telarana, bloom, scene, cosmos, THREE } = int;
    const llamadas = () => { renderer.info.autoReset = false; renderer.info.reset(); nucleo.composer.render(); const c = renderer.info.render.calls; renderer.info.autoReset = true; return c; };
    const prOriginal = nucleo.resolucion, w = new THREE.Vector3(); let escalaAntes = telarana.escalaCapaGalaxias;
    const raizCosmos = scene.children.find(o => o.userData.capa === 'cosmos');
    const actual = cosmos.cuerpos().find(c => int.camera.position.distanceTo(c.centro) < c.radio * 40)?.id;
    const otros = raizCosmos ? raizCosmos.children.filter(o => { if (!o.isGroup || !o.visible) return false; o.getWorldPosition(w); const c = cosmos.cuerpos().find(c => c.centro.distanceTo(w) < c.radio * 4); return c && c.id !== actual; }) : [];
    const pruebas = [
      ['tal cual', () => {}, () => {}],
      ['telaraña con 3 órdenes (sin bloques)', () => telarana.unirBloques(true), () => telarana.unirBloques(false)],
      ['capa de galaxias a media resolución', () => { escalaAntes = telarana.escalaCapaGalaxias; telarana.escalarCapaGalaxias(0.5); }, () => telarana.escalarCapaGalaxias(escalaAntes)],
      ['sin resplandor (bloom)', () => { bloom.enabled = false; }, () => { bloom.enabled = true; }],
      ['otros gigantes ocultos', () => otros.forEach(o => (o.visible = false)), () => otros.forEach(o => (o.visible = true))],
      ['resolución 1,25', () => nucleo.fijarResolucion(1.25), () => nucleo.fijarResolucion(prOriginal)],
      ['resolución 1', () => nucleo.fijarResolucion(1), () => nucleo.fijarResolucion(prOriginal)],
      ['todo lo anterior junto (res 1,25)', () => { telarana.unirBloques(true); telarana.escalarCapaGalaxias(0.5); bloom.enabled = false; otros.forEach(o => (o.visible = false)); nucleo.fijarResolucion(1.25); },
        () => { telarana.unirBloques(false); telarana.escalarCapaGalaxias(escalaAntes); bloom.enabled = true; otros.forEach(o => (o.visible = true)); nucleo.fijarResolucion(prOriginal); }]
    ];
    const res = [];
    for (const [nombre, poner, quitar] of pruebas) {
      informe = `\n— probando ${res.length + 1}/${pruebas.length}: ${nombre}`;
      poner(); await medir(600); const fps = await medir(1600); const c = llamadas(); quitar();
      res.push(`${fps.toFixed(0).padStart(3)} FPS · ${String(c).padStart(3)} órdenes · ${nombre}`);
    }
    informe = `\nPRUEBAS (res ${prOriginal}, otros gigantes: ${otros.length}):\n` + res.join('\n');
    boton2.disabled = false; boton2.textContent = 'Probar ajustes';
  });
}
