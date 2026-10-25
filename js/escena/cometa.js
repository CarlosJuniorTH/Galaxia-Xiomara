// El cometa: todo de motas nítidas (nada de velos ni halos difusos), como en las fotografías reales:
//  · núcleo blanco y nítido, con una cruz fina, y una coma de motas verde pálido (el carbono de los cometas reales
//    brilla en verde) que nace en el núcleo, se aleja despacio y la luz empuja hacia la cola;
//  · cola de polvo ancha y curvada, de blanco cálido a dorado pálido, hecha de hebras (las «sincronas»: el polvo que el
//    núcleo soltó a la vez) que se abren en abanico y se quedan atrás, en la estela del movimiento;
//  · cola de iones recta, fina y azulada, con unas pocas hebras que ondulan; apunta justo en contra de la luz.
// La «luz» es el centro de la galaxia (el origen): las dos colas salen siempre en sentido contrario, de forma continua.
// La orientación es una base fija en el espacio (contraluz y estela), sin depender de la cámara: antes las colas eran
// bandas giradas hacia la cámara y su curva cambiaba de lado de golpe cuando la cámara cruzaba su plano.
// Una sola nube de puntos (un dibujo) animada en la GPU: en cada cuadro solo cambian unos pocos uniformes.
// Cruza el cielo durante 42 s de cada ciclo de 130 s. Si se le visita, sigue avanzando (la cámara viaja con él) y al
// dejarlo está donde le corresponde. Lejos de casa (en las seis grandes) no se ve ni cuenta como visible.
import * as THREE from 'three';

const CICLO = 130, VISIBLE = 42;
// Pasa por la parte alta del encuadre de la vista inicial, por delante de la galaxia.
const RECORRIDO = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-2900, 820, 1000), new THREE.Vector3(200, 1300, 1700), new THREE.Vector3(2900, 620, 400));
const LARGO = RECORRIDO.getLength();
// Más allá de esta distancia de casa se está en el universo a gran escala (como escena.lejosDeCasa): ahí no hay cometa.
const LEJOS = 15000;
// Medidas de las colas (unidades de la escena) y número de motas de cada parte.
const POLVO = { largo: 950, abre: 0.14, curva: 480, ancho: 260, motas: 11000 }, IONES = { largo: 1500, ancho: 24, motas: 4000, hebras: 7 }, COMA = { radio: 70, motas: 1500 };

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

// Las motas del cometa. aTipo: 0 núcleo, 1 coma, 2 polvo, 3 iones. aSemilla: x fase, y/z desvíos, w hebra o brillo.
// position solo la usa la coma (dirección y radio de salida de cada mota).
function crearMotas({ uScale, uPR }) {
  const total = 1 + COMA.motas + POLVO.motas + IONES.motas;
  const pos = new Float32Array(total * 3), semilla = new Float32Array(total * 4), tipo = new Float32Array(total);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;   // de −1 a 1, más denso en el centro
  let i = 1;   // la 0 es el núcleo (todo a cero)
  for (let k = 0; k < COMA.motas; k++, i++) {
    const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - z * z), r = COMA.radio * (0.15 + 0.85 * Math.pow(Math.random(), 1.2));
    pos.set([Math.cos(a) * s * r, z * r, Math.sin(a) * s * r], i * 3);
    semilla.set([Math.random(), 0, 0, 0.45 + Math.random() * 0.55], i * 4); tipo[i] = 1;
  }
  for (let k = 0; k < POLVO.motas; k++, i++) {
    // Dos de cada tres motas forman hebras (9 sincronas en abanico); el resto rellena la cola entre ellas.
    const hebra = Math.random() < 0.66 ? (Math.floor(Math.random() * 9) - 4) / 4 + gauss() * 0.05 : Math.random() * 2 - 1;
    semilla.set([Math.random(), gauss(), gauss(), hebra], i * 4); tipo[i] = 2;
  }
  for (let k = 0; k < IONES.motas; k++, i++) {
    const hebra = (Math.floor(Math.random() * IONES.hebras) + Math.random() * 0.12) / IONES.hebras;
    semilla.set([Math.random(), gauss(), gauss(), hebra], i * 4); tipo[i] = 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSemilla', new THREE.BufferAttribute(semilla, 4)); g.setAttribute('aTipo', new THREE.BufferAttribute(tipo, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale, uPR, uI: { value: 0 }, uAnti: { value: new THREE.Vector3(1, 0, 0) }, uAtras: { value: new THREE.Vector3(0, 1, 0) } },
    vertexShader: /* glsl */`
      attribute vec4 aSemilla; attribute float aTipo; uniform float uTime, uScale, uPR, uI; uniform vec3 uAnti, uAtras;
      varying vec3 vC; varying float vA, vTipo, vTam;
      void main(){
        vec3 e1 = uAnti, e2 = uAtras, e3 = cross(e1, e2);   // contraluz, estela, y el tercer eje
        vec3 p = vec3(0.0); float tam = 2.4, maximo = 2.6, a = 1.0;
        if (aTipo < 0.5) {
          vC = vec3(1.0, 0.99, 0.96); tam = 0.0;
        } else if (aTipo < 1.5) {
          // Coma: cada mota sale del núcleo, se aleja y se apaga; la luz la empuja hacia la cola.
          float e = fract(aSemilla.x + uTime * 0.035), r = length(position) * (0.45 + e * 0.8);
          p = position * (0.45 + e * 0.8) + e1 * r * 0.5;
          a = (1.0 - e) * smoothstep(0.0, 0.12, e) * aSemilla.w * 0.5;
          vC = mix(vec3(0.95, 1.0, 0.95), vec3(0.5, 1.0, 0.8), smoothstep(6.0, 40.0, r));
          tam = 2.4;
        } else if (aTipo < 2.5) {
          // Polvo: se aleja despacio, se curva hacia la estela (ya sale algo abierto respecto a los iones) y se abre en
          // hebras; el borde de delante, más nítido.
          float s = fract(aSemilla.x + uTime * ${(0.018).toFixed(3)});
          float abanico = 10.0 + s * ${POLVO.ancho.toFixed(1)};
          float lateral = aSemilla.w * abanico * 0.5 + aSemilla.y * (3.0 + s * 26.0);
          p = e1 * (s * ${POLVO.largo.toFixed(1)}) + e2 * (s * ${(POLVO.largo * POLVO.abre).toFixed(1)} + s * s * ${POLVO.curva.toFixed(1)} + lateral) + e3 * aSemilla.z * (4.0 + s * 46.0);
          a = pow(1.0 - s, 1.25) * smoothstep(0.0, 0.025, s) * (0.75 - 0.25 * aSemilla.w) * 0.85;
          vC = mix(vec3(1.0, 0.96, 0.88), vec3(1.0, 0.74, 0.42), smoothstep(0.05, 0.75, s));
          tam = 3.2 + s * 2.0;
        } else {
          // Iones: rectos, rápidos y finos; unas pocas hebras que ondulan con el viento de la luz.
          float s = fract(aSemilla.x + uTime * 0.055), ang = aSemilla.w * 6.2832;
          float radio = 1.5 + s * ${IONES.ancho.toFixed(1)};
          vec2 o = vec2(cos(ang), sin(ang)) * radio + aSemilla.yz * (0.8 + s * 5.0);
          o.x += sin(s * 11.0 - uTime * 1.3 + aSemilla.w * 23.0) * s * 16.0;
          p = e1 * (s * ${IONES.largo.toFixed(1)}) + e2 * o.x + e3 * o.y;
          a = pow(1.0 - s, 0.9) * smoothstep(0.0, 0.04, s);
          vC = mix(vec3(0.7, 0.84, 1.0), vec3(0.28, 0.5, 1.0), smoothstep(0.0, 0.3, s));
          tam = 2.6;
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float px = tam * uScale / max(0.1, -mv.z);
        if (aTipo < 0.5) { vTam = clamp(34.0 * uScale / max(0.1, -mv.z), 9.0, 19.0) * uPR; gl_PointSize = vTam; vA = uI; }
        // Motas de 1 a 2,6 px: de cerca no se vuelven manchas; las de menos de un píxel se atenúan en vez de parpadear.
        else { gl_PointSize = clamp(px, 1.0, maximo) * uPR; vTam = gl_PointSize; vA = a * uI * min(1.0, px * px); }
        vTipo = aTipo;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying float vA, vTipo, vTam;
      void main(){
        vec2 q = (gl_PointCoord - 0.5) * vTam;   // en píxeles desde el centro
        float d = length(q), a;
        if (vTipo < 0.5) {
          // Núcleo: un disco nítido y una cruz de un píxel que se adelgaza hasta la punta.
          float disco = 1.0 - smoothstep(1.9, 2.7, d);
          float cruz = (1.0 - smoothstep(0.35, 0.9, min(abs(q.x), abs(q.y)))) * max(0.0, 1.0 - d / (vTam * 0.5));
          a = max(disco, cruz * 0.85);
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
    if (avance <= 1) { RECORRIDO.getPoint(avance, grupo.position); RECORRIDO.getTangent(avance, tangente); }
    else { RECORRIDO.getPoint(1, grupo.position); RECORRIDO.getTangent(1, tangente); grupo.position.addScaledVector(tangente, (avance - 1) * LARGO); }
  }
  // Base de las colas: contraluz (lejos del centro de la galaxia) y estela (lo que queda atrás del movimiento, sin la
  // parte que va en la dirección de la luz). Las dos cambian poco a poco con el recorrido: nunca hay saltos. Si la estela
  // llegara a ir justo en la dirección de la luz, se conserva la del cuadro anterior en vez de dar un vector sin sentido.
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
    cola: () => cola.copy(u.uAnti.value).multiplyScalar(POLVO.largo * 0.5).addScaledVector(u.uAtras.value, POLVO.largo * POLVO.abre * 0.5 + POLVO.curva * 0.25).normalize().clone(),
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
      situar(0.06 + transcurrido / VISIBLE * 0.88);
      orientar();
      // Al aparecer y al irse, se funde (sin saltos).
      u.uI.value = Math.min(1, transcurrido / 2.5, ((foco === 'cometa' ? FIN : VISIBLE) - transcurrido) / 2.5);
      u.uTime.value = t;
    }
  };
}
