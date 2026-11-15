// Estrellas secretas: una por cada mes juntos. Al tocarlas se abre un recuerdo.
import * as THREE from 'three';
import { escalaLimitada } from '../util/encuadre.js';
import { texCorazonBrillo, texBrillo, texAnillo } from './texturas.js';
import { crearDestellos } from './materiales.js';
import { vista } from '../util/vista.js';

const ROSA = new THREE.Color(0xff6fb5);
const DORADO = new THREE.Color(0xffd27a);

// Constelación de cada año: al cumplirlo (el 15/12/2026 nace la estrella 12), las trece luces de ese capítulo (el comienzo
// y sus doce meses, o del mes 12 al 24…) se unen con trazos finos en una vuelta cerrada alrededor del centro de la galaxia,
// por el ángulo de cada una (como una órbita: «nuestra primera vuelta al Sol»). En orden de meses los trazos cruzaban el
// corazón y el nombre (las estrellas van saltando por el ángulo de oro). Devuelve los pares de índices (vacío antes del año).
const ANGULO = i => i * 2.39996323;   // el mismo de su posición, abajo
export function trazosConstelacion(cantidad) {
  const pares = [];
  for (let anio = 0; 12 * (anio + 1) < cantidad; anio++) {
    const vuelta = Array.from({ length: 13 }, (_, k) => 12 * anio + k).sort((a, b) => (ANGULO(a) % (2 * Math.PI)) - (ANGULO(b) % (2 * Math.PI)));
    vuelta.forEach((i, k) => pares.push([i, vuelta[(k + 1) % 13]]));
  }
  return pares;
}
const CLAVE_CONSTELACION = 'xiomara:constelacion-vista';   // ya se vio aparecer: las siguientes veces, fundido corto
// Trazo nítido en píxeles de pantalla (WebGL no deja líneas de más de 1 px de dispositivo: en un móvil de 3× serían
// casi invisibles): cada tramo es un rectángulo de ANCHO px CSS con el borde suavizado medio píxel, sin halo. Los tramos
// se acortan HUECO px por cada lado para no pisar el dibujo de las estrellas.
const ANCHO = 0.8, HUECO = 9;
function crearConstelacion(estrellas, pares, uPR) {
  const n = pares.length, a = new Float32Array(n * 12), b = new Float32Array(n * 12), lado = new Float32Array(n * 4), fin = new Float32Array(n * 4), indices = [];
  for (let k = 0; k < n; k++) { lado.set([-1, 1, -1, 1], k * 4); fin.set([0, 0, 1, 1], k * 4); const v = k * 4; indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }   // (en sentido antihorario en pantalla: si no, se descartan como caras traseras)
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(a, 3).setUsage(THREE.DynamicDrawUsage));   // (extremo A)
  geo.setAttribute('aB', new THREE.BufferAttribute(b, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aLado', new THREE.BufferAttribute(lado, 1)); geo.setAttribute('aFin', new THREE.BufferAttribute(fin, 1));
  geo.setIndex(indices);
  const uOpacidad = { value: 0 }, uRes = { value: new THREE.Vector2(1, 1) };
  const malla = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uOpacidad, uRes, uPR, uColor: { value: new THREE.Color(0xffe2ad) } },
    vertexShader: /* glsl */`attribute vec3 aB; attribute float aLado, aFin; uniform vec2 uRes; uniform float uPR; varying float vD; varying float vMedio;
      void main(){
        vec4 pa = projectionMatrix * modelViewMatrix * vec4(position, 1.0), pb = projectionMatrix * modelViewMatrix * vec4(aB, 1.0);
        if (pa.w < 1.0 || pb.w < 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }   // un extremo detrás de la cámara
        vec2 sa = pa.xy / pa.w * uRes * 0.5, sb = pb.xy / pb.w * uRes * 0.5, d = sb - sa; float largo = length(d);
        vec2 u = d / max(largo, 1e-3), nn = vec2(-u.y, u.x); float hueco = min(${HUECO.toFixed(1)} * uPR, largo * 0.45);
        vec4 p = aFin > 0.5 ? pb : pa; vec2 s = (aFin > 0.5 ? sb - u * hueco : sa + u * hueco);
        vMedio = ${(ANCHO / 2).toFixed(3)} * uPR; vD = aLado * (vMedio + 1.0);
        s += nn * vD; gl_Position = vec4(s / (uRes * 0.5) * p.w, p.z, p.w);
      }`,
    fragmentShader: /* glsl */`uniform float uOpacidad; uniform vec3 uColor; varying float vD; varying float vMedio;
      void main(){ float borde = clamp(vMedio + 0.5 - abs(vD), 0.0, 1.0); gl_FragColor = vec4(uColor * uOpacidad * borde * 0.32, 1.0); }`,   // (un hilo que se adivina: el año lo cuenta la guirnalda del corazón)
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  malla.frustumCulled = false; malla.visible = false;
  let yaVista = false; try { yaVista = localStorage.getItem(CLAVE_CONSTELACION) === '1'; } catch {}
  let aparicion = 0; const duracion = yaVista ? 2.5 : 9;   // la primera vez, un fundido lento
  return {
    malla,
    // El fundido avanza solo con ella ya en casa, con el vuelo terminado (no se gasta tras la tarjeta de entrada ni en un viaje).
    actualizar(dt, apagar, mirando) {
      if (mirando) aparicion = Math.min(1, aparicion + dt / duracion);
      if (aparicion >= 1 && !yaVista) { yaVista = true; try { localStorage.setItem(CLAVE_CONSTELACION, '1'); } catch {} }
      const e = aparicion * aparicion * (3 - 2 * aparicion);
      uOpacidad.value = 0.5 * e * (1 - apagar);
      malla.visible = uOpacidad.value > 0.004;
      if (!malla.visible) return;
      for (let k = 0; k < n; k++) for (let v = 0; v < 4; v++) { estrellas[pares[k][0]].position.toArray(a, (k * 4 + v) * 3); estrellas[pares[k][1]].position.toArray(b, (k * 4 + v) * 3); }
      geo.attributes.position.needsUpdate = geo.attributes.aB.needsUpdate = true;
      uRes.value.set(vista.ancho * uPR.value, vista.alto * uPR.value);
    },
    destruir() { geo.dispose(); malla.material.dispose(); }
  };
}

export function crearEstrellasSecretas({ scene, camera, uScale, uPR }, cantidad, encontradas) {
  const grupo = new THREE.Group();
  scene.add(grupo);
  const tex = texCorazonBrillo();
  const tam = 46;
  const enVista = new THREE.Vector3();
  const estrellas = [];

  for (let i = 0; i < cantidad; i++) {
    const ang = ANGULO(i);
    const r = 350 + ((i * 173) % 640); // estable entre visitas, también al añadir meses
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: ROSA.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    s.position.set(Math.cos(ang) * r, (65 + (i * 37) % 95) * (i % 2 ? 1 : -0.6), Math.sin(ang) * r);
    s.scale.set(tam, tam, 1);
    s.userData = { indice: i, fase: Math.random() * 10, base: s.position.clone(), baseY: s.position.y, encontrada: encontradas.includes(i) };
    if (s.userData.encontrada) s.material.color.copy(DORADO);
    s.visible = false;   // se dibujan todas juntas (abajo); el sprite queda para tocarlas y para su posición
    grupo.add(s);
    estrellas.push(s);
  }
  // Todas en UNA orden de dibujo: un punto por estrella con la misma imagen, color y tamaño que su sprite (antes, una orden
  // por estrella, una por cada mes: en casa son lo que más órdenes sumaba después de la telaraña y los lugares).
  // Tamaño en pantalla de un sprite de s unidades: s · P[1][1] · (alto en píxeles / 2) / profundidad.
  const n = estrellas.length, posLuz = new Float32Array(n * 3), colLuz = new Float32Array(n * 3), tamLuz = new Float32Array(n);
  const geoLuz = new THREE.BufferGeometry();
  geoLuz.setAttribute('position', new THREE.BufferAttribute(posLuz, 3).setUsage(THREE.DynamicDrawUsage));
  geoLuz.setAttribute('aColor', new THREE.BufferAttribute(colLuz, 3).setUsage(THREE.DynamicDrawUsage));
  geoLuz.setAttribute('aTam', new THREE.BufferAttribute(tamLuz, 1).setUsage(THREE.DynamicDrawUsage));
  const uAlto = { value: vista.alto * uPR.value };
  const luces = new THREE.Points(geoLuz, new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uAlto },
    vertexShader: /* glsl */`attribute vec3 aColor; attribute float aTam; uniform float uAlto; varying vec3 vC;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; vC = aColor;
        gl_PointSize = aTam * projectionMatrix[1][1] * 0.5 * uAlto / max(1e-3, -mv.z); }`,
    // (gl_PointCoord va de arriba abajo; las coordenadas del sprite, de abajo arriba)
    fragmentShader: /* glsl */`uniform sampler2D map; varying vec3 vC;
      void main(){ vec4 t = texture2D(map, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y)); gl_FragColor = vec4(t.rgb * vC, t.a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  luces.frustumCulled = false; grupo.add(luces);
  // Antes del primer año no existe (ni memoria ni órdenes de dibujo); después, una sola orden para todos sus trazos.
  const pares = trazosConstelacion(cantidad), constelacion = pares.length ? crearConstelacion(estrellas, pares, uPR) : null;
  if (constelacion) grupo.add(constelacion.malla);
  const copiarLuces = () => {
    for (let i = 0; i < n; i++) { const s = estrellas[i]; posLuz[i * 3] = s.position.x; posLuz[i * 3 + 1] = s.position.y; posLuz[i * 3 + 2] = s.position.z; colLuz[i * 3] = s.material.color.r; colLuz[i * 3 + 1] = s.material.color.g; colLuz[i * 3 + 2] = s.material.color.b; tamLuz[i] = s.scale.y; }
    for (const a of Object.values(geoLuz.attributes)) a.needsUpdate = true;
    uAlto.value = vista.alto * uPR.value;
  };
  copiarLuces();

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
  // La pista: un anillo nítido que se cierra sobre la estrella cinco veces seguidas y se apaga. Sin resplandor (era un
  // halo que no dejaba de brillar) y sin quedarse encendido: cada pista lo vuelve a lanzar.
  const onda = new THREE.Sprite(new THREE.SpriteMaterial({ map: texAnillo(), color: '#fff0c8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  grupo.add(onda);
  const ZONA_T = 9.4;   // (cinco cierres de 1,8 s, uno tras otro, y el fundido)
  let zonaT = 0, zonaIndice = -1;
  const centroZona = i => estrellas[i].position.clone();
  return {
    destruir() { scene.remove(grupo); for (const s of estrellas) s.material.dispose(); geoLuz.dispose(); luces.material.dispose(); tex.dispose(); constelacion?.destruir(); },
    posicion(i) { return estrellas[i]?.getWorldPosition(new THREE.Vector3()); },
    senalar(i) { pista = i; pistaT = 9; if (estrellas[i]) { zonaIndice = i; zonaT = ZONA_T; } },
    iluminarZona(i) { if (!estrellas[i]) return null; zonaIndice = i; zonaT = ZONA_T; return centroZona(i); },
    centroZona(i) { return estrellas[i] ? centroZona(i) : null; },
    reiniciar() { for (const s of estrellas) { s.userData.encontrada = false; s.material.color.copy(ROSA); } },
    // Devuelve el índice de la estrella tocada o -1
    probarToque(x, y) {
      v.set((x / vista.ancho) * 2 - 1, -(y / vista.alto) * 2 + 1);
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
    actualizar(t, dt, ctx) {
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
      onda.visible = zonaT > 0;
      if (zonaT > 0 && estrellas[zonaIndice]) {
        const pasado = ZONA_T - zonaT, fundido = Math.min(1, zonaT / 0.6), p = estrellas[zonaIndice].position;
        onda.position.copy(p);
        // Tamaño en pantalla estable: se calcula con la distancia a la cámara.
        const d = Math.max(60, camera.position.distanceTo(p)), k = d * 0.42;
        const ciclo = (pasado / 1.8) % 1;
        onda.scale.setScalar(k * (0.5 - ciclo * 0.42)); onda.material.opacity = fundido * Math.sin(ciclo * Math.PI) * 0.75;   // (pequeño: se cierra justo sobre la estrella)
      }
      grupo.rotation.y = 0;
      for (const s of estrellas) {
        const u = s.userData;
        const pulso = u.encontrada ? 0.9 + 0.08 * Math.sin(t * 1.5 + u.fase) : 1 + 0.28 * Math.pow(Math.sin(t * 2.2 + u.fase) * 0.5 + 0.5, 3);
        if (u.destello) u.destello = Math.max(0, u.destello - dt * 0.8);
        const senalada = u.indice === pista && pistaT > 0;
        const k = tam * (pulso + (u.destello || 0) * 1.5 + (senalada ? .7 + .3 * Math.sin(t * 5) : 0));
        s.material.color.copy(u.encontrada ? DORADO : ROSA);   // (señalada sigue rosa: en dorado parecía ya encontrada)
        s.position.copy(u.base); s.position.y = u.baseY + Math.sin(t * 0.8 + u.fase) * 8;
        const destino = destinos.get(u.indice);
        if (destino && reunion > 0) {
          // Cada estrella sale en su turno y viaja en arco hasta su lugar en el corazón.
          const k = Math.min(1, Math.max(0, (reunion - destino.orden * 0.5) / 0.5)), e = k * k * (3 - 2 * k);
          s.position.lerp(destino.pos, e); s.position.y += Math.sin(e * Math.PI) * 120;
        }
        enVista.copy(s.position).applyMatrix4(camera.matrixWorldInverse);
        const reunida = destinos.has(u.indice) && reunion > 0.5;
        const visible = escalaLimitada(k * (reunida ? 1.6 : 1), senalada ? 38 : reunida ? 44 : 26, -enVista.z, vista.alto, camera.fov);
        s.scale.set(visible, visible, 1);
      }
      copiarLuces();
      // (Mientras las estrellas vuelan a formar el corazón de la celebración, sus trazos se apagan: ese momento tiene su hilo.)
      if (constelacion) constelacion.actualizar(dt, Math.min(1, reunion * 3), ctx?.tiempoDentro != null && ctx.destino === 'hogar');
    }
  };
}
