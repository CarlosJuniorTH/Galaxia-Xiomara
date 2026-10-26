// Preparación de la carga, como un videojuego (movido de index.js sin cambios): subir todas las texturas a la tarjeta
// gráfica, compilar todos los programas de GPU (también lo que aún no se ve) y un cuadro de calentamiento con todo
// visible, para que nada se prepare por primera vez al entrar o durante un viaje.
import * as THREE from 'three';

export function crearPreparacion({ renderer, camera, scene, nucleo, solar, telarana, composer, obtenerCapaVolumen }) {
  const anisotropiaMax = renderer.capabilities.getMaxAnisotropy();
  // A trozos de ~25 ms, cediendo entre ellos: subirlas todas de golpe congelaba la animación de la portada ~1 s en un móvil.
  const subirTexturas = async (escena = scene) => {
    const lista = new Set(); escena.traverse(o => { for (const m of [].concat(o.material || [])) for (const v of [...Object.values(m), ...Object.values(m.uniforms || {}).map(u => u.value)]) if (v?.isTexture) lista.add(v); });
    let t0 = performance.now();
    for (const v of lista) {
      if (performance.now() - t0 > 25) { await new Promise(r => setTimeout(r, 0)); t0 = performance.now(); }
      {
        // Filtrado anisótropo al máximo del aparato en las que ya lo pedían (planetas, lunas, superficies): de lado, en el
        // borde de un planeta, la textura se veía emborronada con 4 u 8.
        if (v.anisotropy > 1 && v.anisotropy < anisotropiaMax) v.anisotropy = anisotropiaMax;
        renderer.initTexture(v);
        // Ya en la tarjeta gráfica: las imágenes que nadie vuelve a leer sueltan su copia en memoria (decenas de MB en un iPhone).
        if (v.userData.liberable && v.image?.data && v.version > 0) v.image = { width: v.image.width, height: v.image.height, data: null };
        // Los lienzos de las texturas dibujadas (frases, rótulos, brillos): nadie los vuelve a dibujar ni a subir, así que su
        // copia en la memoria de la página (hasta 1100×240×4 cada una, ~25 MB en total) se suelta en cuanto están en la GPU.
        else if (v.isCanvasTexture && v.version > 0 && !v.userData.redibujable && typeof HTMLCanvasElement !== 'undefined' && v.image instanceof HTMLCanvasElement && v.image.width > 1) {
          const c = v.image; v.image = { width: c.width, height: c.height }; c.width = c.height = 1;
        }
      }
    }
  };
  // Sube a la GPU los búferes de unos objetos ya, sin esperar al calentamiento del final: los que sueltan su copia en
  // memoria al subirse (la telaraña, decenas de MB) la sueltan en el acto y no coinciden con todo lo demás de la carga.
  // Se dibujan una vez con un material mínimo (three.js sube todos los atributos de cada geometría que dibuja).
  const escenaSubida = new THREE.Scene(), rtSubida = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
  escenaSubida.overrideMaterial = new THREE.PointsMaterial({ size: 1 }); escenaSubida.matrixWorldAutoUpdate = false;
  const subirGeometrias = objetos => {
    const tocados = []; for (const raiz of objetos) raiz.traverse(o => { tocados.push([o, o.visible, o.frustumCulled]); o.visible = true; o.frustumCulled = false; });
    const previo = renderer.getRenderTarget();
    try { escenaSubida.children = objetos; renderer.setRenderTarget(rtSubida); renderer.render(escenaSubida, camera); } catch (e) { console.warn('Subida', e); }
    finally { escenaSubida.children = []; renderer.setRenderTarget(previo); for (const [o, v, f] of tocados) { o.visible = v; o.frustumCulled = f; } }
  };
  const paralela = renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile');
  // Las texturas de los planetas llegan del Web Worker en paralelo a la compilación.
  // También lo que aún no se ve (el vecindario de la supernova, la otra galaxia, la explosión):
  // compile solo prepara lo visible, así que se muestra todo un momento (tras la pantalla de
  // carga) y luego se devuelve como estaba. Así nada se compila por primera vez durante un viaje.
  const compilarTodo = escena => {
    const ocultos = []; escena.traverse(o => { if (!o.visible) { ocultos.push(o); o.visible = true; } });
    const fin = () => { for (const o of ocultos) o.visible = false; };
    // La compilación se registra al llamarla: se devuelve la visibilidad en el acto (ni un cuadro).
    // Se compila para el mismo destino en el que se dibuja (la imagen intermedia del resplandor): si no, three.js
    // los compila otra vez al primer cuadro (otro espacio de color) y la entrada da un tirón.
    const previo = renderer.getRenderTarget(), destino = nucleo.post?.readBuffer ?? null;
    renderer.setRenderTarget(destino);
    let promesa; try { promesa = paralela ? renderer.compileAsync(escena, camera) : Promise.resolve(renderer.compile(escena, camera)); } catch (e) { promesa = Promise.reject(e); }
    renderer.setRenderTarget(previo);
    fin();
    return promesa.catch(() => renderer.compile(escena, camera));
  };

  // Calentamiento: un cuadro completo (escena, fondo y resplandor) dibujado una vez tras la portada, con todo
  // visible, para que ningún programa de GPU se compile por primera vez al entrar o durante un viaje.
  // Todo (también lo oculto) se dibuja una vez en una imagen diminuta de 128×128 con el mismo formato que la escena: se
  // preparan programas, búferes y texturas igual, pero la GPU apenas pinta. Antes se dibujaba TODO a la vez a pantalla
  // completa en un único cuadro enorme: en un iPhone caliente o con poca batería tardaba tanto que iOS daba la página por
  // colgada y la cerraba. Después, un cuadro normal (con lo visible) prepara el resplandor y la pasada final.
  // Se dibuja objeto a objeto, cediendo cada ~25 ms: todo en un cuadro congelaba la portada ~1 s en un móvil.
  const calentar = async () => {
    const capaVolumen = obtenerCapaVolumen();
    // Todo visible y sin descartar lo que queda fuera de la cámara: así cada geometría se sube ya a la tarjeta gráfica
    // (si no, la primera vez que entra en pantalla —al volver a casa, al llegar a un universo— se sube en pleno viaje).
    // También las escenas que se dibujan aparte: el sistema solar (Rosa, Azul, la luna de las cartas) y la capa de las
    // galaxias de la telaraña (sus bloques fuera de la vista se estrenaban al salir de casa en el primer viaje).
    const ocultos = [], recortados = [], aparte = [scene, solar.escena, telarana.capaGalaxias].filter(Boolean);
    for (const esc of aparte) esc.traverse(o => { if (!o.visible) { ocultos.push(o); o.visible = true; } if (o.frustumCulled) { recortados.push(o); o.frustumCulled = false; } });
    const leer = nucleo.post?.readBuffer, rt = new THREE.WebGLRenderTarget(128, 128, { type: leer?.texture?.type ?? THREE.UnsignedByteType });
    let t0 = performance.now();
    for (const esc of aparte) {
      const hijos = esc.children.slice();
      for (const h of hijos) {
        if (performance.now() - t0 > 25) { await new Promise(r => setTimeout(r, 0)); t0 = performance.now(); }
        const visibles = hijos.map(o => o.visible); for (const o of hijos) o.visible = o === h;
        try { const previo = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(esc, camera); renderer.setRenderTarget(previo); } catch (e) { console.warn('Calentamiento', e); }
        hijos.forEach((o, i) => { o.visible = visibles[i]; });
      }
    }
    for (const o of ocultos) o.visible = false;
    for (const o of recortados) o.frustumCulled = true;
    rt.dispose();
    // La lente (cerca de los universos) y el salto (el destello de los viajes) solo se activan allí: se encienden en
    // este cuadro para que su programa quede listo y el primer viaje no los estrene con un tirón.
    const pasadas = [nucleo.lente, nucleo.salto].filter(Boolean), antes = pasadas.map(p => p.enabled);
    for (const p of pasadas) p.enabled = true;
    try { capaVolumen.dibujar(camera, 64); telarana.dibujarGalaxias(renderer, camera); composer.render(); } catch (e) { console.warn('Calentamiento', e); }
    pasadas.forEach((p, i) => { p.enabled = antes[i]; });
  };
  return { subirTexturas, subirGeometrias, compilarTodo, calentar };
}
