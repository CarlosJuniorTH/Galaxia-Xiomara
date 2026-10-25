// Vuelo cinematográfico por fases (convención de película: la compresión del tiempo no es física). Planificación pura, sin escena: se calcula TODO antes de empezar, incluido el
// corredor recto del crucero y su perfil de velocidad, y después se evalúa por tiempo.
//
//  A seleccion    se fija el destino (señal discreta anclada a él); empieza a la vez que la maniobra.
//  B maniobra     si el corredor recto no está libre desde donde estamos (anillos, discos, la propia
//                 galaxia), se va con suavidad a un punto despejado cercano.
//  C alineacion   la mirada gira de forma continua hasta coincidir con la dirección del corredor.
//  D ruptura      (ya no se usa: era un «salto» con destello, campo de visión abierto y estelas de golpe; el viaje es ahora
//                 un vuelo continuo y la fase dura 0 s. Se conserva el nombre para el orden de las fases.)
//  E crucero      rectilíneo en coordenadas del universo, mucho más rápido que la luz y mirando
//                 siempre al destino (sin giros de cámara). La velocidad sigue con suavidad la
//                 distancia a lo más cercano (raíz cuadrada: sin pararse en cada galaxia): las
//                 galaxias crecen y pasan por los bordes, y al atravesar una nebulosa se frena lo
//                 justo para ver su interior.
//  F aproximacion la velocidad baja al acercarse a la región de llegada.
//  G llegada      arco deliberado hasta el encuadre final, sin entrar nunca en el destino.
// D, E, F y G comparten un único perfil de avance (velocidad continua).
import * as THREE from 'three';
import { cercanoSegmento, segmentoLibre as libreSegmento, CurvaPorDistancia } from './ruta.js';
import { duracionViaje } from './aproximacion.js';

const V = () => new THREE.Vector3();
const suave = t => t * t * t * (t * (t * 6 - 15) + 10);
export const FASES = Object.freeze(['seleccion', 'maniobra', 'alineacion', 'ruptura', 'crucero', 'aproximacion', 'llegada']);

// (La duración la decide duracionViaje, js/util/aproximacion.js: el viaje entero dura 10–15 s según la distancia.)

// ¿El segmento a→b libra los obstáculos? (mismas reglas que ruta.js: salida y llegada propias)
const segmentoLibre = (a, b, obstaculos, desde, hasta, margen = 1.05) => libreSegmento(a, b, obstaculos, desde, hasta, margen, 80);

// Arco de aproximación alrededor del centro del destino, de q (en la recta) a hasta (encuadre).
function arcoLlegada(q, hasta, centro) {
  const a = q.clone().sub(centro), b = hasta.clone().sub(centro), ra = a.length(), rb = b.length();
  a.normalize(); b.normalize();
  const angulo = a.angleTo(b), pts = [q.clone()];
  if (angulo < 0.02) { pts.push(q.clone().lerp(hasta, 0.5), hasta.clone()); return new THREE.CatmullRomCurve3(pts, false, 'centripetal'); }
  let eje = V().crossVectors(a, b); if (eje.lengthSq() < 1e-8) eje.set(0, 1, 0); eje.normalize();
  const tramos = Math.max(3, Math.ceil(angulo / 0.2));
  // El arco sale en la dirección de la recta (un primer punto sigue recto hacia el centro): antes empezaba ya girando y en
  // el empalme había una esquina (la cámara cambiaba de dirección de golpe al empezar la llegada).
  const d = Math.max(0, ra - rb) * 0.3, r0 = ra - d;
  if (d > 1) pts.push(centro.clone().addScaledVector(a, r0));
  // Puntos repartidos por igual (la suavidad la da el perfil de velocidad): con una curva de
  // suavizado aquí se amontonaban al principio del arco y la velocidad daba un tirón al empezar a girar.
  for (let k = 1; k <= tramos; k++) { const f = k / tramos; pts.push(centro.clone().addScaledVector(a.clone().applyAxisAngle(eje, angulo * f), r0 + (rb - r0) * suave(f))); }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

// Perfil de velocidad del viaje: v(s) = k·d(s)·rampa(t), integrado en el tiempo, y una frenada final por TIEMPO.
// d(s): distancia a lo más cercano (catálogo, punto de partida, destino). k se ajusta para que el
// viaje dure lo pedido. Devuelve una tabla tiempo → recorrido.
// Es un generador: se calcula a trozos (cada `yield` es una pausa de menos de medio milisegundo) repartidos entre los
// primeros cuadros del viaje, mientras la cámara aún se alinea, en vez de todo de golpe en el cuadro del clic.
function* perfilViaje({ camino, longitud, cercania, interes, desde, salidaCentro, centro, dLlegada, duracion, tRampa, tFrenada, lRecta = longitud, tArco = 0 }) {
  const N = 1600, dist = new Float64Array(N + 1), p = V();
  for (let i = 0; i <= N; i++) {
    camino.getPointAt(i / N, p);
    const dSalida = p.distanceTo(desde) + salidaCentro * 0.5;
    const dDestino = Math.max(p.distanceTo(centro) - dLlegada * 0.6, dLlegada * 0.3);
    // Lo más cercano (con un suelo: dentro de una nebulosa se va más despacio, pero no se para) y el
    // arranque y la frenada. Raíz cuadrada: la velocidad acompaña al paisaje sin detenerse en él.
    const cerca = Math.max(cercania ? cercania(p) : Infinity, Math.min(4000, dLlegada * 0.5));
    dist[i] = Math.sqrt(Math.max(40, Math.min(cerca, dSalida, dDestino)));
    if (i % 64 === 63) yield;
  }
  // Suavizado en escala logarítmica (sin esquinas en la velocidad al pasar de un objeto a otro).
  const ld = Array.from(dist, Math.log), sm = new Float64Array(N + 1), W = 6;
  for (let i = 0; i <= N; i++) { let s = 0, n = 0; for (let j = Math.max(0, i - W); j <= Math.min(N, i + W); j++) { s += ld[j]; n++; } sm[i] = Math.exp(s / n); }
  const dEn = s => { const x = Math.min(N, Math.max(0, s / longitud * N)), i = Math.min(N - 1, Math.floor(x)), f = x - i; return sm[i] + (sm[i + 1] - sm[i]) * f; };
  const dt = 1 / 120, TF = Math.min(tFrenada, duracion * 0.35), TA = Math.min(tArco, duracion * 0.45), A = longitud - lRecta;
  // Frenada final: en cuanto lo que falta se recorre frenando en TF segundos (resto ≤ v·TF/2), la velocidad baja como
  // v0·(1 − 3x² + 2x³): empieza sin tirón, llega a cero y la deceleración también. Antes se frenaba solo en los últimos
  // 1,5 radios de llegada, que al volver a casa (radio pequeño, crucero rapidísimo) se cruzaban en dos cuadros: la cámara
  // aceleraba al final y se paraba en seco.
  // Si la llegada rodea el destino (arco), el arco tiene su propio tiempo TA (según lo que gira): la frenada de la recta
  // termina al empezar el arco con la velocidad justa para recorrerlo en TA (2A/TA) y sin deceleración, y el arco se
  // recorre frenando igual hasta cero. Antes el arco de casa (170° alrededor de la galaxia) se cruzaba en 0,45 s.
  const vArco = TA > 0 && A > 1 ? 2 * A / TA : 0;
  // Frenada de v0 a v1 en T: v = v1 + (v0 − v1)·(1 − 3x² + 2x³); recorrido v1·T·x + (v0 − v1)·T·(x − x³ + x⁴/2).
  const frenada = (f, t) => { const x = Math.min(1, (t - f.t0) / f.T); return x >= 1 ? f.fin : f.s0 + f.v1 * f.T * x + (f.v0 - f.v1) * f.T * (x - x * x * x + x * x * x * x / 2); };
  // limite: en la búsqueda basta saber si se pasa de la duración pedida (se corta ahí: mismo resultado, sin tirón).
  const simular = (k, guardar, limite = 600) => {
    let s = 0, t = 0, fr = null; const tabla = guardar ? [0] : null;
    while (s < longitud - 1e-3 && t < limite) {
      if (!fr) {
        const rampa = t < tRampa ? suave(Math.min(1, (t + dt * 0.5) / tRampa)) * 0.98 + 0.02 : 1;
        const v = Math.max(k * dEn(s) * rampa, longitud * 1e-6), v1 = Math.min(vArco, v), fin = v1 > 0 ? lRecta : longitud, resto = fin - s;
        if (resto <= (v + v1) * TF * 0.5) fr = resto > 0 ? { t0: t, s0: s, v0: v, v1, T: 2 * resto / (v + v1), fin }
          : { t0: t, s0: s, v0: v1, v1: 0, T: 2 * (longitud - s) / v1, fin: longitud };   // (ya en el arco)
        else s = Math.min(longitud, s + v * dt);
      }
      t += dt;
      if (fr) {
        // Al terminar la frenada de la recta empieza la del arco, en el mismo instante y con la misma velocidad.
        if (fr.v1 > 0 && t >= fr.t0 + fr.T) fr = { t0: fr.t0 + fr.T, s0: fr.fin, v0: fr.v1, v1: 0, T: 2 * (longitud - fr.fin) / fr.v1, fin: longitud };
        s = frenada(fr, t);
      }
      if (guardar) tabla.push(s);
    }
    return guardar ? tabla : t;
  };
  // Búsqueda de k (la duración baja al subir k, casi como 1/k): primero una estimación con una sola simulación y un
  // intervalo estrecho alrededor; si no la contiene, el intervalo amplio de siempre. Misma precisión (≈1e-4 en k,
  // menos de un milisegundo en la duración) con la mitad de simulaciones: el viaje arranca sin tirón.
  // El suavizado final (abajo) alarga el movimiento WT cuadros: la simulación apunta a la duración pedida menos eso.
  const WT = Math.round(0.45 / dt), objetivo = duracion - WT * dt;
  const limite = Math.min(600, objetivo + dt * 2), tarda = lk => simular(Math.exp(lk), false, limite);
  let lo = Math.log(1e-3), hi = Math.log(1e6), pasos = 26;
  // Estimación: sin arranque ni frenada, la duración sería Σ ds / (k·d(s)); con ellos es algo mayor (k algo mayor).
  let integral = 0; for (let i = 0; i < N; i++) integral += longitud / N / (0.5 * (sm[i] + sm[i + 1]));
  const guia = Math.log(integral / objetivo), a = guia - 0.3, b = guia + 1.1;
  yield; const ta = tarda(a) > objetivo; yield;
  if (ta && !(tarda(b) > objetivo)) { lo = a; hi = b; pasos = 14; }
  for (let i = 0; i < pasos; i++) { yield; const mid = (lo + hi) / 2; if (tarda(mid) > objetivo) lo = mid; else hi = mid; }
  yield; const k = Math.exp(hi), crudo = simular(k, true); yield;
  // La velocidad se suaviza en el TIEMPO (gaussiana de ±0,45 s): a toda velocidad, en los vacíos, un
  // cuadro recorre más que la escala en la que cambia el perfil y la velocidad saltaba hasta un 37 %
  // entre cuadros. La tabla sigue WT cuadros tras el final de la simulación (la cola del suavizado: antes se cortaba,
  // se reescalaba todo hacia arriba y la cámara llegaba antes y se paraba en seco) y se reescala para acabar justo.
  const n = crudo.length - 1, nf = n + WT, vel = new Float64Array(n), g = Array.from({ length: 2 * WT + 1 }, (_, j) => Math.exp(-Math.pow((j - WT) / (WT / 3), 2) / 2)), sg = g.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) vel[i] = (crudo[i + 1] - crudo[i]) / dt;
  const tabla = [0];
  for (let i = 0; i < nf; i++) {
    let a = 0; for (let j = -WT; j <= WT; j++) { const kk = i + j; a += (kk < 0 || kk >= n ? 0 : vel[kk]) * g[j + WT]; }
    tabla.push(tabla[i] + a / sg * dt);
    if (i % 128 === 127) yield;
  }
  const escala = longitud / tabla[nf]; for (let i = 0; i <= nf; i++) tabla[i] = Math.min(longitud, tabla[i] * escala);
  // La duración en función de k puede dar un salto: si con algo más de velocidad la frenada empieza ya en un vacío
  // rapidísimo, se salta de golpe la parte lenta del final (al volver a casa desde la supernova salía 1,5 s más corto).
  // Entonces se estira (o encoge) el tiempo de toda la tabla por igual hasta la duración pedida: el mismo vuelo, igual
  // de suave, solo un poco más lento.
  const n2 = Math.round(duracion / dt);
  if (Math.abs(n2 - nf) > 1) {
    const r = nf / n2, otra = new Array(n2 + 1);
    for (let i = 0; i <= n2; i++) { const x = i * r, j = Math.min(nf - 1, Math.floor(x)), f = x - j; otra[i] = tabla[j] + (tabla[j + 1] - tabla[j]) * f; }
    otra[n2] = longitud;
    return { k, dt, tabla: otra, duracion: n2 * dt, distancia: dEn };
  }
  return { k, dt, tabla, duracion: nf * dt, distancia: dEn };
}

// Interpola una dirección de mirada por guiñada (giro alrededor del eje vertical, por el lado más corto) e
// inclinación, como gira la cabeza una persona.
// sentido (±1): si el giro es de casi media vuelta, se da en ese sentido (el que ya traía la mirada), no por el más corto:
// cerca de 180° el más corto podía cambiar de un cuadro a otro o ir al revés que el movimiento anterior (un tirón).
function girarMirada(a, b, k, sentido = 0) {
  const gu = v => Math.atan2(v.x, v.z), in_ = v => Math.asin(THREE.MathUtils.clamp(v.y, -1, 1));
  let dg = gu(b) - gu(a); dg -= Math.PI * 2 * Math.round(dg / (Math.PI * 2));
  if (sentido && Math.abs(dg) > Math.PI * 0.6 && Math.sign(dg) !== sentido) dg += sentido * Math.PI * 2;
  // Mirando casi en vertical la guiñada no está definida: ahí basta el giro directo.
  if (Math.abs(a.y) > 0.985 || Math.abs(b.y) > 0.985) return a.clone().lerp(b, k).normalize();
  const g = gu(a) + dg * k, i = THREE.MathUtils.lerp(in_(a), in_(b), k), c = Math.cos(i);
  return new THREE.Vector3(Math.sin(g) * c, Math.sin(i), Math.cos(g) * c);
}

// duracionTotal: lo que dura TODO el viaje, del clic a la llegada (por defecto, la regla de duracionViaje: 10–15 s según
// la distancia; con la modalidad breve, ×0,7). duracion (solo pruebas): la del tramo de viaje, sin las fases previas.
export function planificarVuelo({ desde, miraDesde, hasta, mira, centro = mira, obstaculos = [], reducido = false, rAprox: rAproxPedido, cercania = null, interes = null, breve = false, duracion: duracionPedida, duracionTotal, salidaFrente = null }) {
  desde = desde.clone(); hasta = hasta.clone(); mira = mira.clone(); centro = centro.clone();
  const dLlegada = hasta.distanceTo(centro);
  // El crucero termina a esta distancia del destino (allí empieza el arco de llegada).
  const rAprox = rAproxPedido ?? Math.max(dLlegada * 1.6, dLlegada + 900);
  const finRecta = p => centro.clone().addScaledVector(p.clone().sub(centro).normalize(), rAprox);
  const corredorLibre = p => segmentoLibre(p, finRecta(p), obstaculos, p, hasta);
  // ── B: punto de maniobra ──
  let salida = desde.clone(), motivo = 'corredor libre desde la posición actual';
  if (desde.distanceTo(centro) <= rAprox * 1.05) motivo = 'ya cerca del destino';
  // (Saliendo de un gigante la salida es la de delante de él, más abajo: no se busca maniobra que se descartaría.)
  else if (!salidaFrente && !corredorLibre(desde)) {
    const haciaDestino = centro.clone().sub(desde).normalize();
    const u = V().crossVectors(haciaDestino, new THREE.Vector3(0, 1, 0)); if (u.lengthSq() < 1e-6) u.set(1, 0, 0); u.normalize();
    const w = V().crossVectors(u, haciaDestino).normalize();
    // Escala de la maniobra: el obstáculo que bloquea más cerca de la salida.
    let escala = 600;
    for (const o of obstaculos) { const d = o.c.distanceTo(desde); if (d < o.r * 3) escala = Math.max(escala, o.r * 1.2); }
    const direcciones = [w, w.clone().negate(), u, u.clone().negate(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
      w.clone().add(u).normalize(), w.clone().sub(u).normalize(), w.clone().negate().add(u).normalize(), w.clone().negate().sub(u).normalize(), haciaDestino.clone().negate()];
    let mejor = null;
    for (const f of [0.5, 1, 1.6, 2.4, 3.5, 5]) {
      for (const d of direcciones) {
        const p = desde.clone().addScaledVector(d, escala * f);
        if (!segmentoLibre(desde, p, obstaculos, desde, hasta) || !corredorLibre(p)) continue;
        const coste = desde.distanceTo(p) + d.angleTo(haciaDestino) * escala * 0.3;
        if (!mejor || coste < mejor.coste) mejor = { p, coste };
      }
      if (mejor) break;
    }
    if (mejor) { salida = mejor.p; motivo = 'maniobra para despejar el corredor'; }
    else motivo = 'sin corredor libre: se usa el directo (revisar obstáculos)';
  }
  // Saliendo de un gigante: primero se rodea (sin atravesarlo) hasta quedar delante de él, en la línea hacia
  // el destino; desde ahí el viaje recorre el mismo camino que la ida (en sentido contrario).
  let arcoSalida = null;
  if (salidaFrente) {
    // soloAcercar (casa): no rodea; solo vuelve a su distancia normal sin cambiar de lado, y luego gira hacia el destino.
    const c = salidaFrente.centro, rDesde = desde.distanceTo(c), haciaDestino = centro.clone().sub(c).normalize();
    // Casa: se rodea la galaxia hacia el lado del destino, pero por encima del disco (sin verlo de canto).
    if (salidaFrente.elevacion) { const arriba = new THREE.Vector3(0, 1, 0), plano = haciaDestino.clone().addScaledVector(arriba, -haciaDestino.dot(arriba)).normalize();
      haciaDestino.copy(plano).multiplyScalar(Math.cos(salidaFrente.elevacion)).addScaledVector(arriba, Math.sin(salidaFrente.elevacion)).normalize(); }
    // Delante del gigante a la distancia de llegada (si la cámara estaba muy lejos, primero se acerca).
    salida = c.clone().addScaledVector(haciaDestino, salidaFrente.soloAcercar ? salidaFrente.radio : Math.max(salidaFrente.minimo ?? 0, salidaFrente.radio ? Math.min(rDesde, salidaFrente.radio) : rDesde));
    arcoSalida = { c, d0: desde.clone().sub(c).normalize(), d1: haciaDestino, r0: rDesde, r1: salida.distanceTo(c) };
    motivo = 'delante del gigante, por el mismo camino';
  }
  // ── Trayectoria del viaje: recta (crucero) + arco (llegada) ──
  const q = finRecta(salida), recta = new THREE.LineCurve3(salida.clone(), q), arco = arcoLlegada(q, hasta, centro);
  // Tiempo del arco de llegada según cuánto rodea el destino (≈ 30°/s de media: un rodeo tranquilo; nada si llega de frente). También con
  // movimiento reducido: rodear deprisa es justo el movimiento que marea.
  const giroArco = q.clone().sub(centro).angleTo(hasta.clone().sub(centro)), tArco = giroArco < 0.02 ? 0 : THREE.MathUtils.clamp(giroArco * 2, 0.8, 6);
  // Recorrido por distancia real (la recta y el arco muestreado denso): con getPointAt de three el paso variaba hasta un 35 %
  // en el arco de llegada, justo mientras se frena (pequeños acelerones al llegar). Ahora el mismo avance es la misma distancia.
  const camino = new CurvaPorDistancia([salida, ...arco.getPoints(1500)]);
  const L = recta.getLength(), total = camino.getLength(), A = total - L;
  // ── Duraciones ──
  const dirInicial = miraDesde.clone().sub(desde).normalize(), dirCorredor = centro.clone().sub(salida).normalize();
  const anguloAlinear = arcoSalida ? Math.PI : Math.acos(THREE.MathUtils.clamp(dirInicial.dot(dirCorredor), -1, 1));
  const lSalida = desde.distanceTo(salida);
  // El viaje entero dura lo que dice la regla: las fases previas (selección, salida del gigante y giro hacia el destino)
  // se acortan a la vez si pasarían del 40 % (saliendo de un gigante podían sumar 8–10 s) y el resto es el vuelo.
  const totalViaje = duracionTotal ?? duracionViaje(desde.distanceTo(hasta)) * (breve ? 0.7 : 1);
  let tSeleccion = reducido ? 0.2 : 0.55;
  // Sentido en que gira la mirada mientras rodea el gigante (la vuelta hacia el destino sigue en ese mismo sentido).
  let sentidoGiro = 0;
  if (arcoSalida) { const gu = v => Math.atan2(-v.x, -v.z); let d = gu(arcoSalida.d1) - gu(arcoSalida.d0); d -= Math.PI * 2 * Math.round(d / (Math.PI * 2)); sentidoGiro = Math.sign(d) || 1; }
  // Cuánto tiene que acercarse o alejarse al salir de un gigante (0: ya está a su distancia).
  const radial = arcoSalida ? Math.min(1, Math.abs(Math.log2(arcoSalida.r0 / Math.max(1e-6, arcoSalida.r1)))) : 0;
  let tManiobra = (lSalida > 1 || arcoSalida) ? (arcoSalida ? THREE.MathUtils.clamp(2.0 + arcoSalida.d0.angleTo(arcoSalida.d1) * 1.4 + Math.abs(Math.log2(arcoSalida.r0 / arcoSalida.r1)) * 1.0, 2.0, 7.0) : THREE.MathUtils.clamp(1.3 + Math.log10(1 + lSalida / 500) * 0.8, 1.3, 2.6)) * (reducido ? 0.6 : 1) : 0;
  let tAlinear = THREE.MathUtils.clamp(1.0 + anguloAlinear / Math.PI * 2.2, 1.0, 3.0) * (reducido ? 0.6 : 1);   // giro suave hacia el destino
  { const previo = Math.max(tSeleccion, tManiobra > 0 ? tManiobra + 0.25 : 0) + tAlinear, tope = totalViaje * 0.4;
    if (previo > tope) { const f = tope / previo; tSeleccion *= f; tManiobra *= f; tAlinear *= f; } }
  const tRuptura = 0;   // sin salto: del giro hacia el destino se pasa al vuelo sin destello
  const inicioManiobra = Math.min(tSeleccion * 0.4, 0.25), finManiobra = inicioManiobra + tManiobra;
  // La mirada empieza a girar hacia el destino mientras la cámara aún rodea el gigante (antes esperaba a que se parara:
  // rodear, parar, girar, parar… se notaba a tirones). Un solo movimiento continuo.
  const inicioAlinear = tManiobra > 0 ? finManiobra - (arcoSalida ? Math.min(tManiobra * 0.45, tAlinear * 0.55) : Math.min(0.4, tManiobra * 0.3)) : tSeleccion * 0.6;
  const finAlinear = Math.max(inicioAlinear + tAlinear, tSeleccion);
  const inicioViaje = finAlinear;
  const salidaCentro = Math.max(400, desde.distanceTo(miraDesde));
  // El perfil del viaje (lo más costoso) no hace falta hasta la ruptura: se prepara a trozos con preparar(ms) en los
  // cuadros de la selección y la alineación (al menos 0,6 s). Si algo lo pide antes de estar listo, se termina en el acto.
  const duracionObjetivo = duracionPedida ?? Math.max(4, totalViaje - inicioViaje);
  let perfil = null, nT = 0, desvio = null, sAprox = 0, tAprox = 0, tLlegada = 0, listo = false;
  const preparacion = (function* () {
    perfil = yield* perfilViaje({ camino, longitud: total, cercania, interes, desde: salida, salidaCentro, centro, dLlegada,
      duracion: duracionObjetivo, tRampa: reducido ? 1.4 : 1.6, tFrenada: reducido ? 1.6 : 2.4, lRecta: L, tArco });
    nT = perfil.tabla.length; desvio = new Float32Array(nT * 3);
    yield* calcularDesvio();
    // Instantes de cada fase del viaje (para la interfaz, las pruebas y saltar el viaje).
    sAprox = Math.max(0, L - Math.min(L * 0.3, rAprox * 3)); const tiempoDe = s => { const i = perfil.tabla.findIndex(x => x >= s); return inicioViaje + (i < 0 ? perfil.tabla.length - 1 : i) * perfil.dt; };
    tAprox = tiempoDe(sAprox); tLlegada = tiempoDe(L); listo = true;
  })();
  const asegurar = () => { while (!listo) preparacion.next(); };
  // Mirada al pasar: durante el crucero la vista se inclina con suavidad (como mucho 20°) hacia lo que
  // se está cruzando, para verlo pasar de lado; el avance (y el punto de fuga de las estelas) sigue
  // siendo la recta. Tabla por instante, suavizada en el tiempo (±0,7 s): sin tirones entre objetos.
  function* calcularDesvio() {
    if (interes && !reducido) {
      const p = V(), w = V(), MAX = Math.tan(20 * Math.PI / 180), crudo = new Float32Array(nT * 3);
      for (let i = 0; i < nT; i += 2) {
        const s = perfil.tabla[i]; if (s > L) break;
        camino.getPointAt(Math.min(1, s / total), p); const r = interes(p, dirCorredor);
        if (!r?.pos || !(r.w > 0)) continue;
        w.subVectors(r.pos, p).normalize(); const c = w.dot(dirCorredor); w.addScaledVector(dirCorredor, -c);
        if (w.lengthSq() < 1e-8) continue;
        const ang = Math.acos(THREE.MathUtils.clamp(c, -1, 1)), k = Math.min(Math.tan(ang * 0.5), MAX) * r.w;
        w.normalize().multiplyScalar(k); for (let j = 0; j < 2 && i + j < nT; j++) crudo.set([w.x, w.y, w.z], (i + j) * 3);
        if (i % 64 === 62) yield;
      }
      const ventana = Math.round(0.7 / perfil.dt), g = Array.from({ length: ventana * 2 + 1 }, (_, j) => Math.exp(-Math.pow((j - ventana) / (ventana * 0.5), 2))), sumaG = g.reduce((a, b) => a + b, 0);
      // (Donde no hay nada en toda la ventana el resultado es cero: se salta sin calcular, mismo resultado.)
      const usados = new Int32Array(nT + 1); for (let i = 0; i < nT; i++) usados[i + 1] = usados[i] + (crudo[i * 3] || crudo[i * 3 + 1] || crudo[i * 3 + 2] ? 1 : 0);
      for (let i = 0; i < nT; i++) {
        if (usados[Math.min(nT, i + ventana + 1)] === usados[Math.max(0, i - ventana)]) continue;
        for (let c = 0; c < 3; c++) { let a = 0; for (let j = -ventana; j <= ventana; j++) { const k = Math.min(nT - 1, Math.max(0, i + j)); a += crudo[k * 3 + c] * g[j + ventana]; } desvio[i * 3 + c] = a / sumaG; }
        if (i % 32 === 31) yield; }
    }
  }
  // La inclinación entra después de la ruptura (en 1,5 s): el salto siempre ocurre alineado con el corredor.
  const desvioEn = (tv, out) => { const i = Math.min(nT - 1, Math.max(0, Math.round(tv / perfil.dt))), k = THREE.MathUtils.smoothstep(tv, tRuptura, tRuptura + 1.5); return out.set(desvio[i * 3] * k, desvio[i * 3 + 1] * k, desvio[i * 3 + 2] * k); };
  const tmpDesvio = V();
  const distMira = Math.max(200, miraDesde.distanceTo(desde));
  const recorridoEn = tv => { const x = Math.max(0, tv) / perfil.dt, i = Math.min(perfil.tabla.length - 2, Math.floor(x)), f = Math.min(1, x - i); return perfil.tabla[i] + (perfil.tabla[i + 1] - perfil.tabla[i]) * f; };

  function evaluar(t) {
    const pos = V(), m = V();
    let fase, corriente = 0, ruptura = 0, avance = 0, velocidad = 0;
    if (t < inicioViaje) {
      // A/B/C: selección, maniobra y alineación (sin estelas de velocidad).
      const ks = tManiobra > 0 ? suave(THREE.MathUtils.clamp((t - inicioManiobra) / tManiobra, 0, 1)) : 0;
      if (arcoSalida) {   // vuelve a su distancia y rodea, solapados (si ya está a su distancia, rodea desde el primer instante)
        const fr = 0.4 * radial, kr = fr > 0 ? suave(THREE.MathUtils.clamp(ks / (fr + 0.2), 0, 1)) : 1, kg = suave(THREE.MathUtils.clamp((ks - fr * 0.5) / (1 - fr * 0.5), 0, 1));
        const q = new THREE.Quaternion().setFromUnitVectors(arcoSalida.d0, arcoSalida.d1), dir = arcoSalida.d0.clone().applyQuaternion(new THREE.Quaternion().slerp(q, kg));
        pos.copy(arcoSalida.c).addScaledVector(dir, THREE.MathUtils.lerp(arcoSalida.r0, arcoSalida.r1, kr)); }
      else pos.copy(desde).lerp(salida, ks);
      const ka = suave(THREE.MathUtils.clamp((t - inicioAlinear) / Math.max(1e-3, finAlinear - inicioAlinear), 0, 1));
      // Al rodear un gigante se le mira (sigue en el centro de la pantalla); luego se gira hacia el destino.
      const mirarDesde = arcoSalida ? arcoSalida.c.clone().sub(pos).normalize() : dirInicial;
      // Giro de la mirada de lado (alrededor del eje vertical) y la inclinación a la vez: nunca da la vuelta por
      // abajo ni por arriba aunque haya que girar media vuelta (con un cuaternión, 180° elegía un eje cualquiera).
      const dir = girarMirada(mirarDesde, dirCorredor, ka, sentidoGiro);
      m.copy(pos).addScaledVector(dir, THREE.MathUtils.lerp(distMira, pos.distanceTo(centro), ka));
      fase = t < tSeleccion && ks < 0.02 ? 'seleccion' : (tManiobra > 0 && t < finManiobra && t < inicioAlinear) ? 'maniobra' : 'alineacion';
    } else {
      asegurar();
      const tv = t - inicioViaje, s = recorridoEn(tv);
      avance = s / total; velocidad = (recorridoEn(tv + 0.05) - recorridoEn(tv - 0.05)) / 0.1;
      camino.getPointAt(Math.min(1, avance), pos);
      if (s <= L) { desvioEn(tv, tmpDesvio); if (tmpDesvio.lengthSq() > 1e-10) m.copy(pos).addScaledVector(tmpDesvio.add(dirCorredor).normalize(), pos.distanceTo(centro)); else m.copy(centro); }
      else { const ka = (s - L) / Math.max(1e-6, A); m.copy(centro).lerp(mira, suave(ka)); }
      fase = s < sAprox ? 'crucero' : s < L * 0.999 ? 'aproximacion' : 'llegada';
      // Estelas: entran poco a poco con la velocidad (1,5 s), acompañan el crucero y se apagan al aproximarse, por tiempo
      // (por distancia, a toda velocidad se apagaban en unos cuadros).
      corriente = Math.min(THREE.MathUtils.smoothstep(tv, 0, 1.5), 1 - THREE.MathUtils.smoothstep(t, tAprox, Math.max(tAprox + 1.2, tLlegada)));
    }
    return { pos, mira: m, fase, corriente: reducido ? 0 : corriente, ruptura, avance, velocidad };
  }
  return {
    // Mientras se prepara, la duración es la pedida (la búsqueda del perfil la clava: difiere en menos de un cuadro).
    get duracion() { return inicioViaje + (listo ? perfil.duracion : duracionObjetivo); },
    get listo() { return listo; },
    // Avanza la preparación durante `ms` como mucho (cada trozo es corto); devuelve si ya está lista.
    preparar(ms = 2) { const fin = performance.now() + ms; while (!listo && performance.now() < fin) preparacion.next(); return listo; },
    evaluar, salida, finRecta: q, recta, arco, camino, motivo, rAprox,
    ruptura: [inicioViaje, inicioViaje + tRuptura],   // (sin esperar al perfil)
    get perfil() { asegurar(); return perfil; },
    get tiempos() { asegurar(); return { seleccion: [0, tSeleccion], maniobra: [inicioManiobra, finManiobra], alineacion: [inicioAlinear, finAlinear], ruptura: [inicioViaje, inicioViaje + tRuptura], crucero: [inicioViaje + tRuptura, tAprox], aproximacion: [tAprox, tLlegada], llegada: [tLlegada, inicioViaje + perfil.duracion], viaje: [inicioViaje, inicioViaje + perfil.duracion] }; },
    // Saltar el viaje: desde el instante t0, el resto del crucero se recorre en `segundos` y se sigue
    // normal desde la aproximación. La curva de Hermite (quíntica) va en DISTANCIA recorrida, de la
    // velocidad y aceleración actuales a las de la aproximación: sin tirones. (Comprimir el tiempo del plan comprimía también sus
    // cambios de velocidad entre encuentros y vacíos, y daba tirones.) Devuelve tiempo real → tiempo del plan.
    saltar(t0, segundos = 2.5) {
      asegurar();
      if (t0 >= tAprox - 0.5) return null;
      const tv0 = Math.max(0, t0 - inicioViaje), s0 = recorridoEn(tv0), s1 = sAprox, T = segundos;
      // Velocidad y aceleración del plan en los dos extremos (Hermite quíntica: se igualan las dos).
      const vel = t => (recorridoEn(t + 0.04) - recorridoEn(Math.max(0, t - 0.04))) / (t > 0.04 ? 0.08 : 0.04 + t);
      const acel = t => (vel(t + 0.04) - vel(Math.max(0, t - 0.04))) / (t > 0.04 ? 0.08 : 0.04 + t);
      const tv1 = tAprox - inicioViaje, v0 = vel(tv0), v1 = vel(tv1), a0 = acel(tv0), a1 = acel(tv1);
      const tabla = perfil.tabla, tiempoDeS = sx => { let lo = 0, hi = tabla.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (tabla[m] < sx) lo = m + 1; else hi = m; } const i = Math.max(1, lo), f = (sx - tabla[i - 1]) / Math.max(1e-9, tabla[i] - tabla[i - 1]); return inicioViaje + (i - 1 + Math.min(1, Math.max(0, f))) * perfil.dt; };
      const tFin = tiempoDeS(s1);   // el mismo instante con el que termina la curva: sin salto al empalmar
      return tau => {
        if (tau >= T) return tFin + (tau - T);
        if (tau <= 0) return t0 + tau;
        const x = tau / T, x3 = x ** 3, x4 = x ** 4, x5 = x ** 5;
        const H0 = 1 - 10 * x3 + 15 * x4 - 6 * x5, H1 = x - 6 * x3 + 8 * x4 - 3 * x5, H2 = 0.5 * x * x - 1.5 * x3 + 1.5 * x4 - 0.5 * x5, H3 = 0.5 * x3 - x4 + 0.5 * x5, H4 = -4 * x3 + 7 * x4 - 3 * x5, H5 = 10 * x3 - 15 * x4 + 6 * x5;
        return tiempoDeS(H0 * s0 + H1 * v0 * T + H2 * a0 * T * T + H3 * a1 * T * T + H4 * v1 * T + H5 * s1);
      };
    },
    // Toda la trayectoria (maniobra + viaje), para comprobar holguras y para pruebas.
    trayectoria() { const c = new THREE.CurvePath(); if (lSalida > 1) c.add(new THREE.LineCurve3(desde.clone(), salida.clone())); c.add(recta); c.add(arco); return c; }
  };
}

// Distancia de un punto al corredor recto (para pruebas y diagnóstico).
export const distanciaAlCorredor = (plan, p) => cercanoSegmento(plan.recta.v1, plan.recta.v2, p);
