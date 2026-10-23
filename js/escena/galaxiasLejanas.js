// El universo del catálogo (js/data/catalogo.js) en la escena: galaxias con posición, tamaño y
// orientación fijos (campoGalaxias.js: luz no resuelta → imagen → estrellas 3D de la MISMA galaxia)
// y nebulosas volumétricas dentro de sus galaxias anfitrionas. Más el campo profundo remoto, que sí
// acompaña a la cámara (fondo óptico a distancia infinita: nada de lo que se descubre está ahí).
import { crearIndiceEsferas } from '../util/indiceEsferas.js';
import * as THREE from 'three';
import { esMovil } from '../util/dispositivo.js';
import { azar } from '../util/dibujo.js';
import { ceder } from '../util/azarSemilla.js';
import { texturaPlaneta } from './fabricaTexturas.js';
import { crearNube } from './nube.js';
import { crearCampoGalaxias } from './campoGalaxias.js';
import { crearInteriorNebulosa } from './interiorNebulosa.js';
import { DESCRIPTORES } from './formasGalaxia.js';
import { universoCatalogo, ENCUENTROS } from '../data/catalogo.js';
import { vista } from '../util/vista.js';

// Texturas como en las fotografías (bulbo, brazos azulados, regiones HII rosadas, polvo),
// calculadas en el Web Worker (texturasPlaneta.js).
const LADO = esMovil ? 320 : 384;   // en pantalla ocupan como mucho ~300 px
const texGalaxia = (tipo, semilla, extra = {}, lado = LADO) => {
  const t = texturaPlaneta('galaxia', { tipo, semilla, ancho: lado, alto: lado, ...extra }, { relleno: [0, 0, 0], bloquea: true });
  t.wrapS = THREE.ClampToEdgeWrapping; return t;
};
// Andrómeda y la colisión tienen generador propio, con más detalle.
const texEspecial = (tipo, semilla, lado) => {
  const t = texturaPlaneta(tipo, { semilla, ancho: lado, alto: lado }, { relleno: [0, 0, 0], bloquea: true });
  t.wrapS = THREE.ClampToEdgeWrapping; return t;
};
// Imágenes de nebulosa compartidas por tono y variante (cada nebulosa se ve distinta por su volumen,
// su forma, su orientación y su tamaño). Se generan en segundo plano al empezar: cuando el viaje
// llega a una nebulosa, su imagen ya está.
const cacheNebulosa = new Map();
const texNebulosa = (semilla, tono, forma = 'emision', bloquea = false) => {
  const clave = `${tono}:${semilla % 3}:${forma}`;
  if (!cacheNebulosa.has(clave)) { const t = texturaPlaneta('nebulosaFondo', { semilla: semilla % 3 * 7 + 2, tono, forma, ancho: esMovil ? 384 : 512, alto: esMovil ? 384 : 512 }, { relleno: [0, 0, 0], bloquea }); t.userData.liberable = true; t.wrapS = THREE.ClampToEdgeWrapping; cacheNebulosa.set(clave, t); }
  return cacheNebulosa.get(clave);
};

// Se construye por pasos (cede el control al navegador entre nebulosas): la portada no se congela.
export async function crearGalaxiasLejanas({ scene, uPR, uScale }) {
  const tipos = DESCRIPTORES.map(d => d.especial ? texEspecial(d.especial, d.semilla, esMovil ? d.lado[0] : d.lado[1]) : texGalaxia(d.tipo, d.semilla, { brazos: d.brazos, enrollado: d.enrollado, paleta: d.paleta }));
  const grupo = new THREE.Group(); grupo.name = 'Fondo óptico (acompaña a la cámara)';
  const nubes = new THREE.Group(); nubes.name = 'Nebulosas (coordenadas fijas)'; nubes.userData.profundo = true;
  const universo = new THREE.Group(); universo.name = 'Galaxias del catálogo (coordenadas fijas)'; universo.userData.profundo = true;
  scene.add(grupo, nubes, universo);

  // ── Catálogo persistente: el mismo mapa en cada carga y en cualquier dispositivo ──
  await ceder();
  const u = universoCatalogo(THREE);
  const nombres = new Map(ENCUENTROS.flatMap(e => (e.galaxias || []).map(g => [g.id, e.nombre])));
  // op: brillo superficial de las imágenes, igualado al de Xiomara a igual tamaño e inclinación (antes
  // 0,9: un 60 % más luz por área que nuestra galaxia; ver .pruebas/pw/comparar.mjs y la documentación).
  const listaGalaxias = u.galaxias.map(g => ({ id: g.id, pos: g.pos, radio: g.r, quaternion: g.quaternion, tipo: g.tipo, op: 0.62, region: g.region, encuentro: g.encuentro, nombre: nombres.get(g.id),
    puntos: 1950 }));   // el mismo número en todas: la transición imagen → estrellas está calibrada con él (y se crean solo al acercarse)
  await ceder();
  const campo = crearCampoGalaxias({ lista: listaGalaxias, texturas: tipos, descriptores: DESCRIPTORES, uPR }); universo.add(campo.grupo);

  // ── Nebulosas dentro de sus galaxias: el volumen se crea al acercarse (antes de verse: a ~1 px), se
  // funde al crecer de 1 a 4 px y se oculta lejos. Su posición y forma están fijadas desde el inicio. ──
  // Las que se ven desde casa (cerca de Xiomara) hacen esperar a la carga: al empezar ya tienen su imagen y no
  // «aparecen» de golpe cuando llega. Se piden primero; las demás, lejanas, se generan después en segundo plano.
  const cercaDeCasa = n => n.pos.length() < 450000;
  for (const n of u.nebulosas) if (cercaDeCasa(n)) texNebulosa(n.semilla, n.tono, n.forma, true);
  let indice = null;
  const indiceCercania = () => (indice ??= crearIndiceEsferas([...listaGalaxias.map(g => ({ x: g.pos.x, y: g.pos.y, z: g.pos.z, r: g.radio * 1.1 })), ...listaNubes.map(n => ({ x: n.pos.x, y: n.pos.y, z: n.pos.z, r: n.r * 1.3 }))]));
  const listaNubes = u.nebulosas.map(n => ({ ...n, malla: null, tex: texNebulosa(n.semilla, n.tono, n.forma) }));
  const v = new THREE.Vector3();
  function prepararNube(n) {
    n.malla = crearNube(n.tex, n.pos, n.r / 0.45, n.semilla, 1, 7, { variante: n.forma, orientacion: n.orientacion });
    n.malla.userData.nebulosa = n.id; n.malla.userData.anfitriona = n.anfitriona; n.malla.renderOrder = -3;
    nubes.add(n.malla);
    // Las que el viaje atraviesa tienen interior: gas, estrellas jóvenes y soles en 3D.
    if (n.cruce) { n.interior = crearInteriorNebulosa({ r: n.r, tono: n.tono, semilla: n.semilla, uScale, uPR }); n.interior.position.copy(n.pos); n.interior.quaternion.copy(n.malla.quaternion); nubes.add(n.interior); }
  }

  // Las nebulosas de cada tipo se preparan ya al empezar (ocultas): su programa se compila con la pantalla de
  // carga y ninguna aparece «de golpe» (con un tirón) la primera vez que se ve.
  const vistas = new Set();
  for (const n of listaNubes) { const clave = `${n.forma}/${n.semilla % 3}/${n.cruce ? 1 : 0}`; if (vistas.has(clave)) continue; vistas.add(clave); prepararNube(n); n.malla.visible = false; if (n.interior) n.interior.visible = false; await ceder(); }

  // ── Campo profundo (fondo óptico remoto): solo contribuciones realmente remotas y discretas,
  // diminutas y tenues (acompaña a la cámara, a distancia infinita). Lo que debe descubrirse al
  // acercarse está en el catálogo, con posición persistente; nada se representa en los dos. ──
  const o = new THREE.Object3D(), c = new THREE.Color(), fondo = [];
  for (let i = 0; i < 130; i++) {
    const s = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = azar(48000, 66000);
    fondo.push({ pos: new THREE.Vector3(Math.sqrt(1 - s * s) * Math.cos(a) * r, s * r * 0.75, Math.sqrt(1 - s * s) * Math.sin(a) * r), escala: azar(110, 260), tipo: Math.floor(Math.random() * 9), op: azar(0.25, 0.5) });
  }
  const porTipo = new Map();
  for (const f of fondo) { if (!porTipo.has(f.tipo)) porTipo.set(f.tipo, []); porTipo.get(f.tipo).push(f); }
  for (const [tipo, lista] of porTipo) {
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tipos[tipo], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), lista.length);
    lista.forEach((f, i) => {
      o.position.copy(f.pos); o.scale.set(f.escala, f.escala, 1); o.rotation.set(0, 0, 0); o.lookAt(0, 0, 0);
      o.rotateX(azar(-1.2, 1.2)); o.rotateY(azar(-0.6, 0.6)); o.rotateZ(Math.random() * Math.PI * 2); o.updateMatrix();
      im.setMatrixAt(i, o.matrix); im.setColorAt(i, c.setScalar(f.op));
    });
    im.renderOrder = -2; im.frustumCulled = false; grupo.add(im);
  }

  universo.userData.universo = { galaxias: listaGalaxias, nebulosas: listaNubes, destinos: u.destinos, encuentros: ENCUENTROS };
  return {
    // Carga completa (como un videojuego): todas las nebulosas creadas antes de entrar, ocultas; así ninguna se
    // construye durante un viaje.
    async prepararTodas(alAvance = () => {}) {
      for (let i = 0; i < listaNubes.length; i++) { const n = listaNubes[i]; if (!n.malla) { prepararNube(n); n.malla.visible = false; if (n.interior) n.interior.visible = false; } if (i % 12 === 11) { alAvance(i + 1, listaNubes.length); await ceder(); } }
      indiceCercania();   // el índice de cercanía también se prepara en la carga
      alAvance(listaNubes.length, listaNubes.length);
    },
    universo: universo.userData.universo,
    campo,
    // Distancia a la superficie más cercana del catálogo (galaxias y nebulosas): fija el plano cercano
    // de la cámara durante los viajes (index.js) y la velocidad del crucero (vuelo.js).
    // Con un índice espacial (árbol k-d): el mismo resultado que recorrerlas todas, sin el tirón al
    // planificar un viaje (se consulta en 1600 puntos del camino).
    distanciaCercana(p) {
      return indiceCercania().distancia(p.x, p.y, p.z);
    },
    actualizar(t, dt, { camera }) {
      campo.actualizar(camera);
      const f = vista.alto / (2 * Math.tan(camera.fov * Math.PI / 360)), ahora = performance.now();   // un solo reloj por cuadro
      for (const n of listaNubes) {
        const d = Math.max(1, v.copy(n.pos).distanceTo(camera.position)), px = n.r * f / d;
        if (!n.malla && px > 1.2) prepararNube(n);
        // Por debajo de ~4 px el volumen no aporta forma y su polvo oscurecía un recuadro: no se dibuja.
        // Sin imagen aún, no se dibuja; al llegar, fundido. Se enciende muy despacio con su tamaño en pantalla (de 1,5 a 25 px): de lejos aparece tenue y va ganando
        // presencia al acercarse, sin encenderse de golpe.
        if (n.malla) { const lista = n.tex.userData.lista, k = THREE.MathUtils.smoothstep(px, 1.5, 25) * (lista ? THREE.MathUtils.smoothstep(ahora - lista, 0, 2500) : 0); n.malla.visible = k > 0.002; n.malla.material.uniforms.uOpacidad.value = k * k; }
        if (n.interior) { n.interior.visible = px > 20; n.interior.material.uniforms.uOpacidad.value = THREE.MathUtils.smoothstep(px, 20, 120); }
      }
    }
  };
}
