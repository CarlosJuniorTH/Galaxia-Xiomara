// Subida a la GPU por trozos, como los juegos que transmiten texturas: una textura grande (las caras de 2048 del cielo,
// los planetas de 2048×1024) se sube en franjas de pocas filas, cada una en su propio momento libre (cuandoLibre, nunca
// en un vuelo, un clip o un gesto). Subirla de una vez eran 16–96 MB en una sola tarea: medido, 162 ms de golpe en un
// móvil (CPU ×4) justo al entrar. Cada franja es ~1 MB (pocos ms).
// Solo WebGL 2 (texStorage2D + texSubImage2D con origen y desplazamiento); si no, devuelve false y se sube como siempre.
// La textura de WebGL se crea aquí y se entrega a three.js al terminar (sus propiedades internas __webglTexture y
// __version: three la enlaza sin volver a subirla). Si three la subiera antes por su cuenta (se dibujó entretanto), se
// abandona la nuestra sin estropear nada.
import * as THREE from 'three';
import { cuandoLibre } from '../util/descargas.js';

const FILAS_BYTES = 1 << 20;   // ~1 MB por franja

function parametros(gl, renderer, objetivo, t, niveles) {
  const filtro = f => f === THREE.NearestFilter ? gl.NEAREST : f === THREE.LinearMipmapLinearFilter ? gl.LINEAR_MIPMAP_LINEAR : f === THREE.LinearMipmapNearestFilter ? gl.LINEAR_MIPMAP_NEAREST : f === THREE.NearestMipmapNearestFilter ? gl.NEAREST_MIPMAP_NEAREST : f === THREE.NearestMipmapLinearFilter ? gl.NEAREST_MIPMAP_LINEAR : gl.LINEAR;
  const envolver = w => w === THREE.RepeatWrapping ? gl.REPEAT : w === THREE.MirroredRepeatWrapping ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(objetivo, gl.TEXTURE_MIN_FILTER, niveles > 1 ? filtro(t.minFilter) : (t.minFilter === THREE.NearestFilter ? gl.NEAREST : gl.LINEAR));
  gl.texParameteri(objetivo, gl.TEXTURE_MAG_FILTER, filtro(t.magFilter));
  gl.texParameteri(objetivo, gl.TEXTURE_WRAP_S, envolver(t.wrapS)); gl.texParameteri(objetivo, gl.TEXTURE_WRAP_T, envolver(t.wrapT));
  if (objetivo === gl.TEXTURE_CUBE_MAP) gl.texParameteri(objetivo, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  const ani = renderer.extensions.get('EXT_texture_filter_anisotropic');
  if (ani && t.anisotropy > 1 && niveles > 1) gl.texParameterf(objetivo, ani.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(t.anisotropy, renderer.capabilities.getMaxAnisotropy()));
}

// Prepara en la GPU (sin subir nada aún) y devuelve el estado de la subida, o null si no se puede.
function empezar(renderer, t, objetivo, ancho, alto) {
  const gl = renderer.getContext();
  if (!renderer.capabilities.isWebGL2 || typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) return null;
  if (t.type !== THREE.UnsignedByteType || (t.format !== THREE.RGBAFormat)) return null;
  const srgb = t.colorSpace === THREE.SRGBColorSpace;
  const mip = t.generateMipmaps && t.minFilter !== THREE.LinearFilter && t.minFilter !== THREE.NearestFilter;
  const niveles = mip ? Math.floor(Math.log2(Math.max(ancho, alto))) + 1 : 1;
  const tex = gl.createTexture();
  renderer.state.bindTexture(objetivo, tex);
  gl.texStorage2D(objetivo, niveles, srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8, ancho, alto);
  parametros(gl, renderer, objetivo, t, niveles);
  return { gl, tex, objetivo, niveles, ancho, alto, filas: Math.max(8, Math.floor(FILAS_BYTES / (ancho * 4))) };
}
// Ajustes de desempaquetado como los de three.js para estas texturas (sin girar, sin premultiplicar, sin convertir).
function desempaquetar(gl, t, origen = null) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, t.unpackAlignment || 4); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, origen ? origen.width : 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
}
function terminar(renderer, s, t) {
  const { gl, tex, objetivo, niveles } = s;
  const props = renderer.properties.get(t);
  if (props.__webglTexture && props.__webglTexture !== tex) { gl.deleteTexture(tex); return false; }   // three ya la subió
  if (niveles > 1) { renderer.state.bindTexture(objetivo, tex); gl.generateMipmap(objetivo); }
  props.__webglTexture = tex; props.__version = t.version;
  return true;
}
const abandonar = (renderer, s, t) => { const p = renderer.properties.get(t); if (p.__webglTexture && p.__webglTexture !== s.tex) { s.gl.deleteTexture(s.tex); return true; } return false; };

// Una DataTexture (image.data RGBA de 8 bits) por franjas. Promesa: true si la subió así; false si no se pudo (entonces
// se sube como siempre, de una vez).
export async function subirDatosPorTrozos(renderer, t) {
  const { width: ancho, height: alto, data } = t.image || {};
  if (!data || !(data instanceof Uint8Array || data instanceof Uint8ClampedArray)) return false;
  const s = await cuandoLibre(() => empezar(renderer, t, renderer.getContext().TEXTURE_2D, ancho, alto));
  if (!s) return false;
  for (let y = 0; y < alto; y += s.filas) {
    const h = Math.min(s.filas, alto - y);
    const seguir = await cuandoLibre(() => {
      if (abandonar(renderer, s, t)) return false;
      const { gl } = s; renderer.state.bindTexture(gl.TEXTURE_2D, s.tex); desempaquetar(gl, t);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, y, ancho, h, gl.RGBA, gl.UNSIGNED_BYTE, data, y * ancho * 4);
      return true;
    });
    if (!seguir) return true;
  }
  return cuandoLibre(() => { const ok = terminar(renderer, s, t); if (ok) t.onUpdate?.(t); return true; });
}

// Una textura de cubo de `lado`, con sus seis caras pedidas de una en una (obtenerCara(i) → Promise<ImageBitmap>): cada
// una se decodifica, se sube por franjas y se cierra antes de pedir la siguiente (en un iPhone las seis decodificadas a la
// vez eran 96 MB de memoria). Devuelve la CubeTexture ya en la GPU, o null si no se pudo (sin WebGL 2).
export async function subirCuboPorTrozos(renderer, t, lado, obtenerCara) {
  const s = await cuandoLibre(() => empezar(renderer, t, renderer.getContext().TEXTURE_CUBE_MAP, lado, lado));
  if (!s) return null;
  t.images = Array.from({ length: 6 }, () => ({ width: lado, height: lado }));   // (three solo mira su tamaño)
  try {
    for (let i = 0; i < 6; i++) {
      const cara = await obtenerCara(i);
      try {
        for (let y = 0; y < lado; y += s.filas) {
          const h = Math.min(s.filas, lado - y);
          await cuandoLibre(() => {
            const { gl } = s; renderer.state.bindTexture(gl.TEXTURE_CUBE_MAP, s.tex); desempaquetar(gl, t, cara);
            gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y);
            gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 0, y, lado, h, gl.RGBA, gl.UNSIGNED_BYTE, cara);
            gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0); gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
          });
        }
      } finally { cara.close?.(); }
    }
  } catch (e) { s.gl.deleteTexture(s.tex); throw e; }
  await cuandoLibre(() => terminar(renderer, s, t));
  return t;
}
