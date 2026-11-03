// Preparación de la carga, como un videojuego: subir todas las texturas a la tarjeta gráfica, compilar todos los programas
// de GPU (también lo que aún no se ve), un cuadro de calentamiento con todo visible y, al final, un cuadro a tamaño real
// con todas las pasadas en la pose de llegada de cada destino (calentarPoses), para que nada se prepare por primera vez
// al entrar, durante un viaje o al llegar. (Tras la carga, el final del clip de la intro dibuja además el 3D detrás de la
// portada: index.js, precalentar.)
import * as THREE from 'three';
import { cederUnMomento } from '../subidaPorTrozos.js';

// Ceder el hilo un momento (que la portada dibuje su cuadro) sin la espera mínima de setTimeout (4 ms tras unos cuantos
// encadenados: con cientos de trozos, segundos de carga perdidos): subidaPorTrozos.js.
const cederYa = cederUnMomento;
// Trozos de ~8 ms: con la CPU ×4 (un móvil de gama media) ninguna tarea pasa de ~50 ms y la portada no da tirones.
const TROZO_MS = 8;
const crearCesion = () => { let t0 = performance.now(); return async () => { if (performance.now() - t0 > TROZO_MS) { await cederYa(); t0 = performance.now(); } }; };
const dibujable = o => o.isMesh || o.isLine || o.isPoints || o.isSprite;
// La esfera envolvente de una geometría como BufferGeometry.computeBoundingSphere (la misma caja, el mismo centro y el
// mismo radio, operación a operación), pero recorriendo los vértices a trozos: una sola nube de millones de puntos eran
// ~150 ms de golpe con la CPU ×4. Con atributos de morfología, la de three tal cual.
const _v = new THREE.Vector3();
export async function esferaPorTrozos(g, cederSiToca) {
  const pos = g.attributes.position;
  if (g.morphAttributes.position?.length) { g.computeBoundingSphere(); return; }
  const n = pos.count, centro = new THREE.Vector3(), _caja = new THREE.Box3();
  for (let i = 0; i < n; i++) { _caja.expandByPoint(_v.fromBufferAttribute(pos, i)); if ((i & 16383) === 16383) await cederSiToca(); }
  _caja.getCenter(centro);
  let maxR2 = 0;
  for (let i = 0; i < n; i++) { _v.fromBufferAttribute(pos, i); maxR2 = Math.max(maxR2, centro.distanceToSquared(_v)); if ((i & 16383) === 16383) await cederSiToca(); }
  if (g.boundingSphere !== null) return;   // (alguien la calculó entretanto)
  g.boundingSphere = new THREE.Sphere(centro, Math.sqrt(maxR2));
  if (isNaN(g.boundingSphere.radius)) console.error('Esfera envolvente con radio NaN', g);
}

export function crearPreparacion({ renderer, camera, scene, nucleo, solar, telarana, composer, obtenerCapaVolumen }) {
  const anisotropiaMax = renderer.capabilities.getMaxAnisotropy();
  // A trozos de ~8 ms, cediendo entre ellos: subirlas todas de golpe congelaba la animación de la portada ~1 s en un móvil.
  const subirTexturas = async (escena = scene) => {
    const lista = new Set(); escena.traverse(o => { for (const m of [].concat(o.material || [])) for (const v of [...Object.values(m), ...Object.values(m.uniforms || {}).map(u => u.value)]) if (v?.isTexture) lista.add(v); });
    const cederSiToca = crearCesion();
    for (const v of lista) {
      await cederSiToca();
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
  // Una pieza cada vez, cediendo cada ~8 ms (todas de golpe eran ~150 ms seguidos con la CPU ×4 en plena carga). No hace
  // falta esperarla: si algo se dibuja antes, three sube lo que falte por su cuenta.
  const subirGeometrias = async objetos => {
    const piezas = []; for (const raiz of objetos) raiz.traverse(o => { if (dibujable(o)) piezas.push(o); });
    const cederSiToca = crearCesion();
    for (const o of piezas) {
      await cederSiToca();
      const v = o.visible, f = o.frustumCulled, previo = renderer.getRenderTarget(); o.visible = true; o.frustumCulled = false;
      try { escenaSubida.children = [o]; renderer.setRenderTarget(rtSubida); renderer.render(escenaSubida, camera); } catch (e) { console.warn('Subida', e); }
      finally { escenaSubida.children = []; renderer.setRenderTarget(previo); o.visible = v; o.frustumCulled = f; }
    }
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
    const cederSiToca = crearCesion();
    // Las esferas envolventes (three las calcula al ordenar lo que dibuja; con millones de puntos, cientos de ms en un móvil)
    // se calculan antes, una geometría por vez y cediendo entre trozos: el mismo resultado que en el cuadro, sin el bloque.
    for (const esc of aparte) {
      const lista = []; esc.traverse(o => { if (dibujable(o) && o.layers.test(camera.layers)) lista.push(o); });
      for (const o of lista) {
        const g = o.geometry, pos = g?.attributes?.position;
        if (o.boundingSphere === null) { if (g && g.boundingSphere === null && pos && !pos.isGLBufferAttribute) await esferaPorTrozos(g, cederSiToca); o.computeBoundingSphere?.(); }   // (instancias: primero la de su geometría)
        else if (o.boundingSphere === undefined && g && g.boundingSphere === null && pos && !pos.isGLBufferAttribute) await esferaPorTrozos(g, cederSiToca);
        else continue;
        await cederSiToca();
      }
    }
    // Se dibuja por partes: cada hijo de la escena a solas y, si es un grupo con varias cosas dentro, cada una de ellas a
    // solas (antes, un grupo grande —la telaraña, el cosmos— era un único cuadro de ~300 ms con la CPU ×4: sus programas,
    // búferes y esferas, todos de golpe). Cada parte prepara lo mismo que antes (programas, búferes, texturas).
    const dibujarRt = esc => { try { const previo = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(esc, camera); renderer.setRenderTarget(previo); } catch (e) { console.warn('Calentamiento', e); } };
    const varios = o => { let n = 0; o.traverse(x => { if (dibujable(x)) n++; }); return n > 1; };
    // (Dentro de un grupo, sus luces siguen encendidas mientras se dibuja cada parte, como cuando se dibujaba entero: si no,
    // sus materiales se prepararían con otras luces, programas que nunca se usan. Entre los hijos de la escena, como antes.)
    const porPartes = async (esc, hijos, dentro) => {
      for (const h of hijos) {
        if (dentro && h.isLight) continue;
        await cederSiToca();
        const visibles = hijos.map(o => o.visible); for (const o of hijos) o.visible = o === h || (dentro && o.isLight);
        try {
          if (h.children.length && varios(h)) {
            if (dibujable(h)) { const k = h.children.map(o => o.visible); for (const o of h.children) o.visible = o.isLight; dibujarRt(esc); h.children.forEach((o, i) => { o.visible = k[i]; }); }
            await porPartes(esc, h.children.slice(), true);
          } else dibujarRt(esc);
        } finally { hijos.forEach((o, i) => { o.visible = visibles[i]; }); }
      }
    };
    for (const esc of aparte) await porPartes(esc, esc.children.slice(), false);
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
  // Calentamiento A TAMAÑO REAL, como en los juegos: un cuadro completo (con todas las pasadas: lente, salto, resplandor,
  // gas volumétrico, galaxias de la telaraña, salida) en cada destino, con la cámara en su pose de llegada, y también en el
  // sistema solar (su escena y su suavizado MSAA). El de arriba dibuja todo en 128×128 (programas y subidas); este estrena
  // lo que solo pasa a tamaño real (búferes intermedios, estados de la GPU con cada formato de imagen, el relleno de los
  // gigantes de cerca) para que no ocurra en el primer cuadro de un vuelo o de una escena. Antes de cada pose se compila lo
  // que se ve desde allí con el destino real (compileAsync con KHR_parallel_shader_compile: se espera sin bloquear) y entre
  // pose y pose se cede (un cuadro por tarea: nada de un cuadro enorme que iOS tome por un cuelgue).
  // poses: [{ escena: 'principal' | 'solar', pos, mira, near? }]. fijarEscena(cual) cambia de escena; dibujar() hace el
  // cuadro con el mismo camino que el bucle de dibujo. Devuelve los programas nuevos que aparecieron (deberían ser 0).
  const calentarPoses = async (poses, { fijarEscena, dibujar }) => {
    const guardada = { pos: camera.position.clone(), q: camera.quaternion.clone(), near: camera.near, fov: camera.fov };
    const pasadas = [nucleo.lente, nucleo.salto].filter(Boolean), antes = pasadas.map(p => p.enabled);
    const programas = () => renderer.info.programs?.length ?? 0, p0 = programas();
    let actual = null, nuevos = 0;
    try {
      for (const pose of poses) {
        if (pose.escena !== actual) { fijarEscena(pose.escena); actual = pose.escena; }
        camera.position.copy(pose.pos); camera.near = pose.near ?? guardada.near; camera.fov = guardada.fov; camera.updateProjectionMatrix();
        camera.lookAt(pose.mira); camera.updateMatrixWorld();
        for (const p of pasadas) p.enabled = true;
        const esc = pose.escena === 'solar' ? solar.escena : scene, previo = renderer.getRenderTarget();
        renderer.setRenderTarget(nucleo.post?.readBuffer ?? null);
        try { if (paralela) await renderer.compileAsync(esc, camera); } catch {} finally { renderer.setRenderTarget(previo); }
        const antesPose = programas();
        try { dibujar(pose); } catch (e) { console.warn('Calentamiento a tamaño real', e); }
        nuevos += programas() - antesPose;
        await new Promise(r => setTimeout(r, 0));
      }
    } finally {
      if (actual !== 'principal') fijarEscena('principal');
      camera.position.copy(guardada.pos); camera.quaternion.copy(guardada.q); camera.near = guardada.near; camera.fov = guardada.fov;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      pasadas.forEach((p, i) => { p.enabled = antes[i]; });
    }
    return { poses: poses.length, programasNuevos: nuevos, programasTotal: programas() - p0 };
  };
  return { subirTexturas, subirGeometrias, compilarTodo, calentar, calentarPoses };
}
