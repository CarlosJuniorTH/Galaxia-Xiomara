// El cometa: todo de motas nítidas (nada de velos ni halos difusos), como en las fotografías de los grandes cometas
// (Hale-Bopp, NEOWISE): cada mota es un grano con edad, nace en el núcleo y se aleja según la física de verdad.
//  · Núcleo: un punto blanco pequeño y nítido, con una cruz fina.
//  · Coma: motas finas que salen del núcleo en tres chorros que giran con él (el núcleo rota) y otras en todas las
//    direcciones; la luz las frena y las dobla hacia atrás, como fuentes: dibujan arcos y espirales que se van a la cola.
//  · Cola de polvo: ancha, curvada, de blanco a dorado. La luz empuja cada grano hacia fuera (más a los granos finos) y
//    el grano se va quedando atrás de la órbita: la cola nace en el núcleo pegada a la de iones, se abre en abanico y se
//    curva sola hacia la estela. Los «golpes» de actividad del núcleo dejan
//    estrías (bandas de granos que salieron a la vez) y la cola se riza despacio.
//  · Cola de iones: recta, fina, azulada, en contra de la luz en todo momento; hecha de filamentos que ondulan como una
//    bandera al viento y se aceleran al alejarse.
//  · Chispas: unos pocos granos que destellan un instante.
// La «luz» es el centro de la galaxia (el origen): la cola de iones apunta siempre justo en contra; la de polvo se curva
// hacia atrás de la órbita. Nada depende de la cámara (antes las colas eran bandas giradas hacia ella y cambiaban de lado).
// Una sola nube de puntos (un dibujo) animada en la GPU: en cada cuadro solo cambian unos pocos uniformes.
// Cruza el cielo durante 42 s de cada ciclo de 130 s, por detrás de la galaxia y por encima de su borde lejano: desde
// casa (en PC y en el móvil en vertical) se ve como un trazo largo en el cielo. Si se le visita, sigue avanzando (la
// cámara viaja con él) y al dejarlo está donde le corresponde. Lejos de casa (en las seis grandes) no se ve.
import * as THREE from 'three';

const CICLO = 130, VISIBLE = 42;
// El recorrido (curva de Bézier cuadrática; más allá del final sigue en línea recta con la misma velocidad).
const P0 = new THREE.Vector3(-1800, 80, -600), P1 = new THREE.Vector3(-100, 500, -1600), P2 = new THREE.Vector3(1600, 60, -600);
// Avance por segundo en el parámetro de la curva (0,06 → 0,94 en los 42 s visibles).
const DU = 0.88 / VISIBLE;
// Más allá de esta distancia de casa se está en el universo a gran escala (como escena.lejosDeCasa): ahí no hay cometa.
const LEJOS = 15000;
// Medidas (unidades de la escena), vidas (s) y número de motas de cada parte.
const COMA = { motas: 1400, vida: 2.2, chorro: 20, empuje: 18 };
const POLVO = { motas: 11000, vida: 15, largo: 1900, atras: 380 };
const IONES = { motas: 6000, vida: 3.6, largo: 2700, hebras: 9 };

const D01 = new THREE.Vector3().subVectors(P1, P0), D12 = new THREE.Vector3().subVectors(P2, P1), FINAL = new THREE.Vector3().copy(D12).multiplyScalar(2);
function punto(u, salida) {
  if (u > 1) return punto(1, salida).addScaledVector(FINAL, u - 1);
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
  return salida.set(0, 0, 0).addScaledVector(P0, a).addScaledVector(P1, b).addScaledVector(P2, c);
}
function derivada(u, salida) {
  u = Math.min(u, 1);
  return salida.copy(D01).multiplyScalar(2 * (1 - u)).addScaledVector(D12, 2 * u);
}

// Velo de una cola: una banda orientada a lo largo de la cola y girada hacia la cámara (lo usan los cometas lejanos del cosmos).
export function crearVelo({ largo, ancho, colorA, colorB, curva = 0, intensidad = 1 }) {
  const g = new THREE.PlaneGeometry(1, 1, 48, 8); g.translate(0.5, 0, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(colorA) }, uB: { value: new THREE.Color(colorB) }, uCurva: { value: curva }, uI: { value: intensidad } },
    vertexShader: /* glsl */`
      uniform float uCurva; varying vec2 vUv;
      void main(){
        vUv = uv; vec3 p = position;
        p.y += p.x * p.x * uCurva;            // el polvo se curva con la distancia al núcleo
        p.y *= 0.25 + p.x * 0.95;             // y se ensancha
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uI; uniform vec3 uA, uB; varying vec2 vUv;
      void main(){
        float x = vUv.x, y = abs(vUv.y - 0.5) * 2.0;
        float perfil = exp(-y * y * 3.2);
        float caida = pow(1.0 - x, 1.7) * smoothstep(0.0, 0.035, x);
        float estrias = 0.82 + 0.18 * sin(vUv.y * 46.0 + x * 9.0 - uTime * 0.6) * sin(vUv.y * 17.0 - uTime * 0.35);
        float a = perfil * caida * estrias * uI;
        gl_FragColor = vec4(mix(uA, uB, x) * a, a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
  });
  const malla = new THREE.Mesh(g, m); malla.scale.set(largo, ancho, 1); malla.frustumCulled = false;
  return malla;
}

const f1 = v => v.toFixed(1), f4 = v => v.toFixed(4);

// Las motas del cometa. aTipo: 0 núcleo, 1 coma, 2 polvo, 3 iones.
// aSemilla: x fase de la vida, y/z rasgos propios (chorro, finura del grano, hebra…), w brillo propio.
// position: una dirección al azar (dispersión de cada grano), no una posición.
function crearMotas({ uScale, uPR }) {
  const total = 1 + COMA.motas + POLVO.motas + IONES.motas;
  const dir = new Float32Array(total * 3), semilla = new Float32Array(total * 4), tipo = new Float32Array(total);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;   // de −1 a 1, más denso en el centro
  const esfera = i => { const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - z * z), r = Math.cbrt(Math.random()); dir.set([Math.cos(a) * s * r, z * r, Math.sin(a) * s * r], i * 3); };
  let i = 1;   // la 0 es el núcleo
  for (let k = 0; k < COMA.motas; k++, i++) { esfera(i); semilla.set([Math.random(), Math.random(), Math.random(), 0.4 + Math.random() * 0.6], i * 4); tipo[i] = 1; }
  for (let k = 0; k < POLVO.motas; k++, i++) {
    // Finura del grano (cuánto lo empuja la luz): más granos medianos que extremos.
    const fino = 0.42 + 0.58 * Math.pow(Math.random(), 0.7);
    esfera(i); semilla.set([Math.random(), fino, gauss(), 0.35 + Math.random() * 0.65], i * 4); tipo[i] = 2;
  }
  for (let k = 0; k < IONES.motas; k++, i++) {
    // Las hebras centrales llevan más motas: un eje brillante y filamentos más tenues a los lados.
    const h = Math.floor(Math.pow(Math.random(), 1.4) * IONES.hebras);
    esfera(i); semilla.set([Math.random(), h, Math.random(), 0.4 + Math.random() * 0.6], i * 4); tipo[i] = 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(dir, 3)); g.setAttribute('aSemilla', new THREE.BufferAttribute(semilla, 4)); g.setAttribute('aTipo', new THREE.BufferAttribute(tipo, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uScale, uPR, uI: { value: 0 },
      uAnti: { value: new THREE.Vector3(1, 0, 0) }, uAtras: { value: new THREE.Vector3(0, 1, 0) }
    },
    vertexShader: /* glsl */`
      attribute vec4 aSemilla; attribute float aTipo;
      uniform float uTime, uScale, uPR, uI; uniform vec3 uAnti, uAtras;
      varying vec3 vC; varying float vA, vTipo, vTam;
      // Giro de v alrededor del eje unitario k (Rodrigues).
      vec3 girar(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
      void main(){
        vec3 e1 = uAnti, e2 = uAtras, e3 = cross(e1, e2);   // contraluz, estela, y el tercer eje
        vec3 p = vec3(0.0); float tam = 2.4, maximo = 2.4, a = 1.0;
        if (aTipo < 0.5) {
          vC = vec3(1.0, 0.98, 0.94); tam = 0.0;
        } else if (aTipo < 1.5) {
          // Coma: chorros que giran con el núcleo (una vuelta cada ~8 s) y granos sueltos; la luz los dobla hacia la cola.
          float edad = fract(aSemilla.x + uTime / ${f1(COMA.vida)}) * ${f1(COMA.vida)}, tau = edad / ${f1(COMA.vida)};
          float sale = uTime - edad;   // instante en que salió
          vec3 d; float v;
          if (aSemilla.y < 0.45) {
            float j = floor(aSemilla.y / 0.15);
            vec3 base = j < 0.5 ? vec3(0.9, 0.3, 0.3) : (j < 1.5 ? vec3(-0.5, 0.6, -0.6) : vec3(-0.2, -0.8, 0.55));
            d = normalize(girar(normalize(base), normalize(vec3(0.25, 1.0, 0.15)), sale * 0.78 + j * 2.1) + position * 0.1);
            v = ${f1(COMA.chorro)} * (0.75 + 0.5 * aSemilla.z);
          } else { d = normalize(position + vec3(1e-4)); v = ${f1(COMA.chorro * 0.55)} * (0.5 + aSemilla.z); }
          p = d * v * edad + e1 * (0.5 * ${f1(COMA.empuje)} * edad * edad);
          a = pow(1.0 - tau, 1.5) * smoothstep(0.0, 0.06, tau) * aSemilla.w * 0.32;
          vC = mix(vec3(1.0, 1.0, 0.97), vec3(0.72, 0.95, 0.9), smoothstep(0.1, 0.8, tau));
          tam = 1.8;
        } else if (aTipo < 2.5) {
          // Polvo: la luz aleja cada grano en contra del centro (más cuanto más fino) y el grano se va quedando atrás de la
          // órbita: la cola nace en el núcleo junto a la de iones y se curva poco a poco hacia la estela. Con la contraluz y
          // la estela de AHORA (no las del instante en que salió cada grano): el cometa gira deprisa alrededor del centro y
          // con las de entonces la cola de polvo se iba por la órbita y se veía partida, separada de la de iones.
          float edad = fract(aSemilla.x + uTime / ${f1(POLVO.vida)}) * ${f1(POLVO.vida)}, tau = edad / ${f1(POLVO.vida)};
          float fino = aSemilla.y;
          vec3 lado = e3;
          p = e1 * (${f1(POLVO.largo)} * fino * tau * tau) + e2 * (${f1(POLVO.atras)} * fino * tau * tau * tau);
          // Dispersión de la salida (la cola gana grosor al alejarse) y un rizo lento que recorre la cola.
          p += position * (3.0 + 38.0 * tau) + lado * sin(tau * 9.0 - uTime * 0.55 + fino * 4.0) * tau * 38.0;
          // Estrías: los golpes de actividad del núcleo sueltan más polvo a la vez (bandas nítidas a lo ancho).
          float sale = uTime - edad;
          float golpe = 0.5 + 0.5 * sin(sale * 0.83) * sin(sale * 0.37 + 1.3);
          a = pow(1.0 - tau, 1.9) * smoothstep(0.0, 0.02, tau) * aSemilla.w * (0.35 + 0.9 * golpe * golpe) * mix(0.1, 1.0, smoothstep(0.0, 0.2, tau)) * 1.1;
          // Chispas: unos pocos granos destellan un instante.
          float chispa = step(0.985, aSemilla.w) * pow(max(0.0, sin(uTime * 2.3 + aSemilla.x * 61.0)), 24.0);
          a += chispa * 0.9 * (1.0 - tau);
          vC = mix(vec3(1.0, 0.97, 0.9), vec3(1.0, 0.78, 0.46), smoothstep(0.03, 0.6, tau) * (1.1 - fino * 0.6));
          tam = 2.0 + (1.0 - fino) * 0.7; maximo = 1.9 + chispa;
        } else {
          // Iones: recto en contra de la luz, cada vez más rápido; filamentos que ondulan como una bandera.
          float edad = fract(aSemilla.x + uTime / ${f1(IONES.vida)}) * ${f1(IONES.vida)}, tau = edad / ${f1(IONES.vida)};
          float h = aSemilla.y, lejos = ${f1(IONES.largo)} * (0.22 * tau + 0.78 * tau * tau);
          float ang = h * 2.39996 + 0.4, abre = h < 0.5 ? 0.0 : (0.35 + 0.65 * fract(h * 0.618));
          vec2 o = vec2(cos(ang), sin(ang)) * (lejos * 0.022 * abre);
          // Ondas que viajan hacia fuera a lo largo de la cola (más amplias lejos del núcleo) y un pliegue lento.
          o.x += sin(lejos * 0.0045 - uTime * 1.2 + h * 0.9) * lejos * 0.010;
          o.y += sin(lejos * 0.0031 - uTime * 0.8 + h * 2.3) * lejos * 0.006;
          o += position.xy * (0.4 + tau * 4.0);
          p = e1 * lejos + e2 * o.x + e3 * o.y;
          a = pow(1.0 - tau, 1.1) * smoothstep(0.0, 0.12, tau) * aSemilla.w * (h < 0.5 ? 1.0 : 0.62);
          vC = mix(vec3(0.78, 0.9, 1.0), vec3(0.34, 0.56, 1.0), smoothstep(0.0, 0.35, tau));
          tam = 1.8; maximo = 1.6;
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float px = tam * uScale / max(0.1, -mv.z);
        if (aTipo < 0.5) { vTam = clamp(30.0 * uScale / max(0.1, -mv.z), 7.0, 15.0) * uPR; gl_PointSize = vTam; vA = uI; }
        // Motas de 1 a ~2,4 px: de cerca no se vuelven manchas; las de menos de un píxel se atenúan en vez de parpadear
        // (sin bajar del 35 %: de lejos, las colas siguen leyéndose como un trazo).
        else { gl_PointSize = clamp(px, 1.0, maximo) * uPR; vTam = gl_PointSize; vA = a * uI * clamp(px * px, 0.35, 1.0); }
        vTipo = aTipo;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying float vA, vTipo, vTam;
      void main(){
        vec2 q = (gl_PointCoord - 0.5) * vTam;   // en píxeles desde el centro
        float d = length(q), a;
        if (vTipo < 0.5) {
          // Núcleo: un disco nítido y una cruz de un píxel que se adelgaza hasta la punta.
          float disco = 1.0 - smoothstep(1.4, 2.1, d);
          float cruz = (1.0 - smoothstep(0.3, 0.8, min(abs(q.x), abs(q.y)))) * max(0.0, 1.0 - d / (vTam * 0.5));
          a = max(disco, cruz * 0.7);
        } else {
          float r = d / max(0.5, vTam * 0.5); if (r > 1.0) discard;
          a = 1.0 - smoothstep(0.55, 1.0, r);   // mota redonda de borde nítido
        }
        if (a <= 0.0) discard;
        gl_FragColor = vec4(vC * vA * a, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}

export function crearCometa({ uScale, uPR }) {
  const grupo = new THREE.Group(), motas = crearMotas({ uScale, uPR }), u = motas.material.uniforms;
  // La cabeza solo sirve para tocar el cometa (el rayo no mira si se dibuja): no se ve, lo que se ve son las motas.
  const cabeza = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  cabeza.scale.setScalar(62); cabeza.visible = false; cabeza.userData.destino = 'cometa';
  grupo.add(motas, cabeza);

  let visible = false, pasoSeguido = null;
  const tangente = new THREE.Vector3(), atras = new THREE.Vector3(), cola = new THREE.Vector3();
  function situar(avance) {
    punto(avance, grupo.position); derivada(avance, tangente).normalize();
  }
  // Base de la cola de iones y de la coma: contraluz (lejos del centro de la galaxia) y estela (lo que queda atrás del
  // movimiento, sin la parte que va en la dirección de la luz). Cambian poco a poco con el recorrido: nunca hay saltos.
  // Si la estela llegara a ir justo en la dirección de la luz, se conserva la del cuadro anterior.
  function orientar() {
    const anti = u.uAnti.value.copy(grupo.position).normalize();
    atras.copy(tangente).negate().addScaledVector(anti, tangente.dot(anti));
    if (atras.lengthSq() < 1e-4) atras.copy(u.uAtras.value).addScaledVector(anti, -u.uAtras.value.dot(anti));
    u.uAtras.value.copy(atras.normalize());
  }

  return {
    grupo, cabeza,
    get visible() { return visible; },
    posicion: () => grupo.position.clone(),
    // Hacia el centro de la cola de polvo (para llegar al cometa siguiéndola).
    cola: () => cola.copy(u.uAnti.value).multiplyScalar(POLVO.largo * 0.3).addScaledVector(u.uAtras.value, POLVO.atras * 0.12).normalize().clone(),
    // Perpendicular al plano de las colas (contraluz y estela): desde ahí se ven de perfil, enteras y curvadas.
    lado: () => new THREE.Vector3().crossVectors(u.uAnti.value, u.uAtras.value).normalize(),
    actualizar(t, dt, { tiempoDentro, foco, camera }) {
      if (tiempoDentro === null || camera.position.lengthSq() > LEJOS * LEJOS) { visible = false; grupo.visible = false; return; }
      const inicioCiclo = tiempoDentro - (tiempoDentro % CICLO);
      // Al visitarlo se sigue el paso en curso (o empieza uno nuevo si no estaba en el cielo).
      if (foco === 'cometa') { if (pasoSeguido === null) pasoSeguido = tiempoDentro % CICLO < VISIBLE ? inicioCiclo : tiempoDentro; }
      else pasoSeguido = null;
      const transcurrido = tiempoDentro - (pasoSeguido ?? inicioCiclo);
      // Visitándolo, se le acompaña hasta el final de su recorrido (sin salirse de él).
      const FIN = VISIBLE * 0.94 / 0.88;
      visible = transcurrido < (foco === 'cometa' ? FIN : VISIBLE);
      grupo.visible = visible;
      if (!visible) return;
      situar(0.06 + transcurrido * DU);
      orientar();
      // Al aparecer y al irse, se funde (sin saltos).
      u.uI.value = Math.min(1, transcurrido / 2.5, ((foco === 'cometa' ? FIN : VISIBLE) - transcurrido) / 2.5);
      u.uTime.value = t;
    }
  };
}
