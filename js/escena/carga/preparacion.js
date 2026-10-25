// Preparación de la carga, como un videojuego (movido de index.js sin cambios): subir todas las texturas a la tarjeta
// gráfica, compilar todos los programas de GPU (también lo que aún no se ve) y un cuadro de calentamiento con todo
// visible, para que nada se prepare por primera vez al entrar o durante un viaje.
import * as THREE from 'three';

export function crearPreparacion({ renderer, camera, scene, nucleo, solar, telarana, composer, obtenerCapaVolumen }) {
  const anisotropiaMax = renderer.capabilities.getMaxAnisotropy();
  const subirTexturas = (escena = scene) => escena.traverse(o => {
    for (const m of [].concat(o.material || [])) {
      for (const v of [...Object.values(m), ...Object.values(m.uniforms || {}).map(u => u.value)]) if (v?.isTexture) {
        // Filtrado anisótropo al máximo del aparato en las que ya lo pedían (planetas, lunas, superficies): de lado, en el
        // borde de un planeta, la textura se veía emborronada con 4 u 8.
        if (v.anisotropy > 1 && v.anisotropy < anisotropiaMax) v.anisotropy = anisotropiaMax;
        renderer.initTexture(v);
        // Ya en la tarjeta gráfica: las imágenes que nadie vuelve a leer sueltan su copia en memoria (decenas de MB en un iPhone).
        if (v.userData.liberable && v.image?.data && v.version > 0) v.image = { width: v.image.width, height: v.image.height, data: null };
      }
    }
  });
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
  const calentar = () => {
    const capaVolumen = obtenerCapaVolumen();
    // Todo visible y sin descartar lo que queda fuera de la cámara: así cada geometría se sube ya a la tarjeta gráfica
    // (si no, la primera vez que entra en pantalla —al volver a casa, al llegar a un universo— se sube en pleno viaje).
    // También las escenas que se dibujan aparte: el sistema solar (Rosa, Azul, la luna de las cartas) y la capa de las
    // galaxias de la telaraña (sus bloques fuera de la vista se estrenaban al salir de casa en el primer viaje).
    const ocultos = [], recortados = [], aparte = [scene, solar.escena, telarana.capaGalaxias].filter(Boolean);
    for (const esc of aparte) esc.traverse(o => { if (!o.visible) { ocultos.push(o); o.visible = true; } if (o.frustumCulled) { recortados.push(o); o.frustumCulled = false; } });
    const leer = nucleo.post?.readBuffer, rt = new THREE.WebGLRenderTarget(128, 128, { type: leer?.texture?.type ?? THREE.UnsignedByteType });
    try { const previo = renderer.getRenderTarget(); renderer.setRenderTarget(rt); for (const esc of aparte) renderer.render(esc, camera); renderer.setRenderTarget(previo); } catch (e) { console.warn('Calentamiento', e); }
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
  return { subirTexturas, compilarTodo, calentar };
}
