// Muchos THREE.Sprite aditivos con la misma imagen en UNA llamada de dibujo, con el mismo aspecto exacto.
// Un sprite de three.js es una llamada de dibujo propia: los soles del cielo (3-4 brillos cada uno), las enanas rojas y los
// brillos de los lugares sumaban decenas de llamadas en casa. Aquí los sprites siguen existiendo (se mueven, se escalan, se
// apagan y se tocan como siempre: la lógica de cada parte no cambia), pero no se dibujan ellos (material.visible = false):
// antes de cada dibujo de la escena (recorte.js, alDibujar: después de poner al día las matrices y antes de que three.js
// decida qué dibujar) se copia de cada uno lo que su sombreador leía (posición en la vista, escala, giro, color y opacidad)
// a un único dibujo instanciado con el MISMO programa de THREE.SpriteMaterial (sus trozos de sombreador, con esos datos por
// instancia en lugar de uniformes). Solo se agrupan los que se pueden sumar en cualquier orden sin cambiar la imagen:
// mezcla aditiva sin escribir profundidad, misma imagen sin transformar, mismo orden de dibujo (renderOrder) y mismo
// depthTest.
// Orden respecto a lo transparente no aditivo: el lote se ordena (three.js, de lejos a cerca) en la profundidad del sprite
// visible más cercano, justo por delante: queda después de todo lo que está detrás de sus sprites, como estaban ellos. Por eso
// solo se agrupan sprites que no se cruzan en pantalla con objetos transparentes de mezcla normal de su misma profundidad
// (lo decide quien llama: ver cosmos.js).
import * as THREE from 'three';
import { recorteDe } from './recorte.js';

const VERTICES = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), UV = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);

// ¿Se puede dibujar este sprite en un lote sin cambiar la imagen?
export const agrupable = s => {
  const m = s.material, t = m.map;
  return s.isSprite && m.isSpriteMaterial && m.visible && m.blending === THREE.AdditiveBlending && !m.depthWrite && m.sizeAttenuation && !m.alphaMap && !m.alphaTest && !m.alphaHash
    && t && t.offset.x === 0 && t.offset.y === 0 && t.repeat.x === 1 && t.repeat.y === 1 && t.rotation === 0 && s.center.x === 0.5 && s.center.y === 0.5 && s.onBeforeRender === THREE.Object3D.prototype.onBeforeRender;
};

// Agrupa los sprites agrupables de `raiz` (en su rama) en lotes por imagen, orden de dibujo y depthTest. Devuelve los lotes.
// escena: la escena donde se dibujan (para engancharse a cada dibujo). filtro(s): solo los que devuelva true.
export function agruparSprites(raiz, escena, { filtro = () => true, nombre = 'Lote de sprites' } = {}) {
  const grupos = new Map(), usos = new Map();
  // (Un material compartido con un sprite que no entra en el lote no se puede apagar: esos se quedan como estaban.)
  raiz.traverse(s => { if (s.material) usos.set(s.material, (usos.get(s.material) || 0) + 1); });
  raiz.traverse(s => { if (!s.isSprite || usos.get(s.material) !== 1 || !agrupable(s) || !filtro(s)) return; const k = `${s.material.map.uuid}|${s.renderOrder}|${s.material.depthTest}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(s); });
  const lotes = [];
  for (const sprites of grupos.values()) {
    if (sprites.length < 2) continue;
    lotes.push(crearLote(raiz, escena, sprites, nombre));
  }
  return lotes;
}

function crearLote(raiz, escena, sprites, nombre) {
  const n = sprites.length, m0 = sprites[0].material;
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(VERTICES, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); geo.setIndex([0, 1, 2, 0, 2, 3]);
  const aVista = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), aEscala = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), aColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
  for (const a of [aVista, aEscala, aColor]) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aVista', aVista); geo.setAttribute('aEscala', aEscala); geo.setAttribute('aColor', aColor);
  geo.instanceCount = 0;
  // El mismo material de los sprites (THREE.SpriteMaterial: los mismos trozos de sombreador, defines y uniformes), con la
  // posición, la escala, el giro y el color de cada instancia.
  const material = new THREE.SpriteMaterial({ map: m0.map, transparent: true, depthWrite: false, depthTest: m0.depthTest, blending: THREE.AdditiveBlending, toneMapped: m0.toneMapped, fog: m0.fog });
  material.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('uniform float rotation;', 'attribute vec3 aVista; attribute vec3 aEscala; attribute vec4 aColor; varying vec4 vColorLote;').replace(/\( rotation \)/g, '( aEscala.z )')
      .replace('vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );', 'vec4 mvPosition = vec4( aVista, 1.0 ); vColorLote = aColor;')
      .replace('scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );', 'scale.x = aEscala.x;')
      .replace('scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );', 'scale.y = aEscala.y;');
    sh.fragmentShader = sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vColorLote;').replace('uniform vec3 diffuse;', 'varying vec4 vColorLote;\nuniform vec3 diffuse;');
  };
  material.customProgramCacheKey = () => 'loteSprites';
  const lote = new THREE.Mesh(geo, material);
  lote.name = nombre; lote.frustumCulled = false; lote.renderOrder = sprites[0].renderOrder; lote.raycast = () => {};
  lote.matrixAutoUpdate = false; lote.matrixWorldAutoUpdate = false;
  lote.center = new THREE.Vector2(0.5, 0.5);   // (three.js pasa object.center al programa de los sprites)
  raiz.add(lote);
  // Los sprites ya no se dibujan ellos (siguen visibles para todo lo demás: matrices, toques, animaciones).
  for (const s of sprites) s.material.visible = false;
  const p = new THREE.Vector3(), adelante = new THREE.Vector3(), e = new THREE.Vector3();
  // ¿Se dibujaría este sprite? (él y toda su rama hasta la raíz del lote visibles)
  const visible = s => { for (let x = s; x && x !== raiz; x = x.parent) if (!x.visible) return false; return true; };
  recorteDe(escena).alDibujar(camera => {
    let k = 0, cerca = Infinity;
    if (raiz.visible) {
      const inv = camera.matrixWorldInverse, v = aVista.array, sc = aEscala.array, c = aColor.array;
      for (let i = 0; i < n; i++) {
        const s = sprites[i]; if (!visible(s)) continue;
        const mw = s.matrixWorld.elements, ms = s.material;
        // modelViewMatrix · (0, 0, 0, 1): la columna de traslación de cámara⁻¹ · mundo (como three.js, en doble precisión).
        p.set(mw[12], mw[13], mw[14]).applyMatrix4(inv);
        v[k * 3] = p.x; v[k * 3 + 1] = p.y; v[k * 3 + 2] = p.z;
        sc[k * 3] = e.set(mw[0], mw[1], mw[2]).length(); sc[k * 3 + 1] = e.set(mw[4], mw[5], mw[6]).length(); sc[k * 3 + 2] = ms.rotation;
        c[k * 4] = ms.color.r; c[k * 4 + 1] = ms.color.g; c[k * 4 + 2] = ms.color.b; c[k * 4 + 3] = ms.opacity;
        if (-p.z < cerca) cerca = -p.z;
        k++;
      }
    }
    geo.instanceCount = k; lote.visible = k > 0;
    if (!k) return;
    aVista.needsUpdate = aEscala.needsUpdate = aColor.needsUpdate = true;
    // Para ordenar lo transparente: el lote está donde su sprite más cercano, un pelo por delante.
    const cw = camera.matrixWorld.elements, d = cerca * 0.999999;
    adelante.set(-cw[8], -cw[9], -cw[10]).normalize();
    lote.matrixWorld.makeTranslation(cw[12] + adelante.x * d, cw[13] + adelante.y * d, cw[14] + adelante.z * d);
  });
  return { lote, sprites };
}
