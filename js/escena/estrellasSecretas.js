// Estrellas secretas: una por cada mes juntos. Al tocarlas se abre un recuerdo.
import * as THREE from 'three';
import { escalaLimitada } from '../util/encuadre.js';
import { texCorazonBrillo, texBrillo, texAnillo } from './texturas.js';
import { crearDestellos } from './materiales.js';

const ROSA = new THREE.Color(0xff6fb5);
const DORADO = new THREE.Color(0xffd27a);

export function crearEstrellasSecretas({ scene, camera, uScale, uPR }, cantidad, encontradas) {
  const grupo = new THREE.Group();
  scene.add(grupo);
  const tex = texCorazonBrillo();
  const tam = 46;
  const enVista = new THREE.Vector3();
  const estrellas = [];

  for (let i = 0; i < cantidad; i++) {
    const ang = i * 2.39996323;
    const r = 350 + ((i * 173) % 640); // estable entre visitas, también al añadir meses
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: ROSA.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    s.position.set(Math.cos(ang) * r, (65 + (i * 37) % 95) * (i % 2 ? 1 : -0.6), Math.sin(ang) * r);
    s.scale.set(tam, tam, 1);
    s.userData = { indice: i, fase: Math.random() * 10, base: s.position.clone(), baseY: s.position.y, encontrada: encontradas.includes(i) };
    if (s.userData.encontrada) s.material.color.copy(DORADO);
    grupo.add(s);
    estrellas.push(s);
  }

  const ray = new THREE.Raycaster();
  const v = new THREE.Vector2();

  let pista = -1, pistaT = 0;
  // Celebración: las estrellas encontradas vuelan a formar un corazón que mira a la cámara.
  let reunion = 0, reunionMeta = 0;
  const destinos = new Map(), mirada = new THREE.Quaternion();
  function prepararReunion(indices) {
    destinos.clear(); mirada.copy(camera.quaternion);
    // Delante de la galaxia (a un tercio del camino hacia la cámara) y de un tamaño que
    // ocupe ~40 % del alto visible a esa distancia.
    const centroVista = new THREE.Vector3(0, 70, 0), centro = centroVista.clone().lerp(camera.position, 0.35);
    const alcance = camera.position.distanceTo(centro), escala = 0.4 * 2 * alcance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / 29;
    const curva = t => new THREE.Vector3(16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5, 0).multiplyScalar(escala).applyQuaternion(mirada).add(centro);
    indices.forEach((indice, k) => destinos.set(indice, { pos: curva((k / indices.length) * Math.PI * 2), orden: k / Math.max(1, indices.length) }));
    // Hilo de luz que dibuja el corazón entre las estrellas reunidas.
    if (hiloReunion) { grupo.remove(hiloReunion); hiloReunion.geometry.dispose(); hiloReunion.material.dispose(); }
    hiloReunion = crearDestellos(Array.from({ length: 220 }, (_, i) => ({ pos: curva(i / 220 * Math.PI * 2).toArray(), color: i % 11 ? '#ffd9a0' : '#fff4e0', tam: escala * (i % 11 ? 0.32 : 0.55), opacidad: 0.75, pulso: 0.3 })), { map: texBrillo(), uScale, uPR });
    hiloReunion.material.uniforms.uOpacidad.value = 0; grupo.add(hiloReunion);
  }
  let hiloReunion = null;
  // Zona iluminada (segunda y tercera pista): un resplandor centrado EN la estrella y una
  // onda de luz que se cierra sobre ella una y otra vez, para que se vea dónde está.
  const zona = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo(), color: '#ffd9a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const onda = new THREE.Sprite(new THREE.SpriteMaterial({ map: texAnillo(), color: '#fff0c8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  grupo.add(zona, onda);
  let zonaT = 0, zonaIndice = -1;
  const centroZona = i => estrellas[i].position.clone();
  return {
    destruir() { scene.remove(grupo); for (const s of estrellas) s.material.dispose(); tex.dispose(); },
    posicion(i) { return estrellas[i]?.getWorldPosition(new THREE.Vector3()); },
    senalar(i) { pista = i; pistaT = 22; },
    iluminarZona(i) { if (!estrellas[i]) return null; zonaIndice = i; zonaT = 20; return centroZona(i); },
    centroZona(i) { return estrellas[i] ? centroZona(i) : null; },
    reiniciar() { for (const s of estrellas) { s.userData.encontrada = false; s.material.color.copy(ROSA); } },
    // Devuelve el índice de la estrella tocada o -1
    probarToque(x, y) {
      v.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
      ray.setFromCamera(v, camera);
      // Zona de toque más generosa que el dibujo (dedos en celular)
      for (const s of estrellas) s.scale.multiplyScalar(1.8);
      grupo.updateMatrixWorld(true);
      const hit = ray.intersectObjects(estrellas, false)[0];
      for (const s of estrellas) s.scale.divideScalar(1.8);
      grupo.updateMatrixWorld(true);
      return hit ? hit.object.userData.indice : -1;
    },
    reunir(indices) { if (indices) { prepararReunion(indices); reunionMeta = 1; } else reunionMeta = 0; },
    encender(i) { const s = estrellas[i]; if (s) s.userData.destello = 1.4; },
    marcar(i) {
      const s = estrellas[i];
      if (!s) return;
      s.userData.encontrada = true;
      s.material.color.copy(DORADO);
      s.userData.destello = 1;
    },
    actualizar(t, dt) {
      pistaT = Math.max(0, pistaT - dt); // posiciones estables para encontrar y revisitar
      zonaT = Math.max(0, zonaT - dt);
      reunion += (reunionMeta - reunion) * Math.min(1, dt * (reunionMeta ? 0.22 : 0.6));
      if (reunionMeta === 0 && reunion < 0.002) { reunion = 0; destinos.clear(); }
      if (hiloReunion) {
        // El hilo se teje cuando las estrellas ya casi han llegado.
        const u = hiloReunion.material.uniforms; u.uTime.value = t;
        u.uOpacidad.value = Math.max(0, Math.min(1, (reunion - 0.82) / 0.15));
        hiloReunion.geometry.setDrawRange(0, Math.floor(220 * Math.min(1, Math.max(0, (reunion - 0.8) / 0.18))));
        hiloReunion.visible = u.uOpacidad.value > 0.01;
      }
      zona.visible = onda.visible = zonaT > 0;
      if (zonaT > 0 && estrellas[zonaIndice]) {
        const fundido = Math.min(1, zonaT / 2, (20 - zonaT) / 1.2), p = estrellas[zonaIndice].position;
        zona.position.copy(p); onda.position.copy(p);
        // Tamaño en pantalla estable: se calcula con la distancia a la cámara.
        const d = Math.max(60, camera.position.distanceTo(p)), k = d * 0.42;
        zona.scale.setScalar(k * 0.55); zona.material.opacity = fundido * (0.45 + 0.12 * Math.sin(t * 3));
        const ciclo = (t * 0.55) % 1;
        onda.scale.setScalar(k * (1.3 - ciclo * 1.15)); onda.material.opacity = fundido * Math.sin(ciclo * Math.PI) * 0.9;
      }
      grupo.rotation.y = 0;
      for (const s of estrellas) {
        const u = s.userData;
        const pulso = u.encontrada ? 0.9 + 0.08 * Math.sin(t * 1.5 + u.fase) : 1 + 0.28 * Math.pow(Math.sin(t * 2.2 + u.fase) * 0.5 + 0.5, 3);
        if (u.destello) u.destello = Math.max(0, u.destello - dt * 0.8);
        const senalada = u.indice === pista && pistaT > 0;
        const k = tam * (pulso + (u.destello || 0) * 1.5 + (senalada ? .7 + .3 * Math.sin(t * 5) : 0));
        if (senalada) s.material.color.set('#fff0bd'); else s.material.color.copy(u.encontrada ? DORADO : ROSA);
        s.position.copy(u.base); s.position.y = u.baseY + Math.sin(t * 0.8 + u.fase) * 8;
        const destino = destinos.get(u.indice);
        if (destino && reunion > 0) {
          // Cada estrella sale en su turno y viaja en arco hasta su lugar en el corazón.
          const k = Math.min(1, Math.max(0, (reunion - destino.orden * 0.5) / 0.5)), e = k * k * (3 - 2 * k);
          s.position.lerp(destino.pos, e); s.position.y += Math.sin(e * Math.PI) * 120;
        }
        enVista.copy(s.position).applyMatrix4(camera.matrixWorldInverse);
        const reunida = destinos.has(u.indice) && reunion > 0.5;
        const visible = escalaLimitada(k * (reunida ? 1.6 : 1), senalada ? 38 : reunida ? 44 : 26, -enVista.z, innerHeight, camera.fov);
        s.scale.set(visible, visible, 1);
      }
    }
  };
}
