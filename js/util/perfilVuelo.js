// Perfil de velocidad del vuelo por fases (js/util/vuelo.js), la parte puramente numérica: sin three.js ni escena, para
// calcularlo en un obrero (js/util/obreroVuelo.js) antes de despegar, fuera del hilo principal. En el hilo principal (sin
// obreros: las pruebas en Node, o si el obrero falla) es el mismo cálculo, a trozos cortos (cada `yield` < 0,5 ms).
//
// v(s) = k·d(s)·rampa(t), integrado en el tiempo, y una frenada final por TIEMPO. d(s) llega ya muestreada (`dist`, N + 1
// valores a lo largo del camino: la distancia a lo más cercano elevada a 0,42, ver vuelo.js). k se ajusta para que el vuelo
// dure lo pedido. Devuelve { k, dt, tabla (tiempo → recorrido), duracion, sm (d(s) suavizada) }.
const suave = t => t * t * t * (t * (t * 6 - 15) + 10);

export function* perfilDesdeDistancias({ dist, longitud, duracion, tRampa, tFrenada, lRecta = longitud, tArco = 0 }) {
  const N = dist.length - 1;
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
  // Cede cada 1500 pasos (una simulación entera eran hasta 15 ms de golpe en un PC: el tirón del primer cuadro del viaje).
  let resultado = 0;
  function* simular(k, guardar, limite = 600) {
    let s = 0, t = 0, fr = null, pasos = 0; const tabla = guardar ? [0] : null;
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
      if (++pasos % 1500 === 0) yield;
    }
    resultado = guardar ? tabla : t;
  }
  // Búsqueda de k (la duración baja al subir k, casi como 1/k): primero una estimación con una sola simulación y un
  // intervalo estrecho alrededor; si no la contiene, el intervalo amplio de siempre. Misma precisión (≈1e-4 en k,
  // menos de un milisegundo en la duración) con la mitad de simulaciones: el viaje arranca sin tirón.
  // El suavizado final (abajo) alarga el movimiento WT cuadros: la simulación apunta a la duración pedida menos eso.
  const WT = Math.round(0.45 / dt), objetivo = duracion - WT * dt;
  const limite = Math.min(600, objetivo + dt * 2);
  function* tarda(lk) { yield* simular(Math.exp(lk), false, limite); return resultado; }
  let lo = Math.log(1e-3), hi = Math.log(1e6), pasos = 26;
  // Estimación: sin arranque ni frenada, la duración sería Σ ds / (k·d(s)); con ellos es algo mayor (k algo mayor).
  let integral = 0; for (let i = 0; i < N; i++) integral += longitud / N / (0.5 * (sm[i] + sm[i + 1]));
  const guia = Math.log(integral / objetivo), a = guia - 0.3, b = guia + 1.1;
  yield; const ta = (yield* tarda(a)) > objetivo; yield;
  if (ta && !((yield* tarda(b)) > objetivo)) { lo = a; hi = b; pasos = 14; }
  for (let i = 0; i < pasos; i++) { yield; const mid = (lo + hi) / 2; if ((yield* tarda(mid)) > objetivo) lo = mid; else hi = mid; }
  yield; const k = Math.exp(hi); yield* simular(k, true); const crudo = resultado; yield;
  // La velocidad se suaviza en el TIEMPO (gaussiana de ±0,45 s): a toda velocidad, en los vacíos, un
  // cuadro recorre más que la escala en la que cambia el perfil y la velocidad saltaba hasta un 37 %
  // entre cuadros. La tabla sigue WT cuadros tras el final de la simulación (la cola del suavizado: antes se cortaba,
  // se reescalaba todo hacia arriba y la cámara llegaba antes y se paraba en seco) y se reescala para acabar justo.
  const n = crudo.length - 1, nf = n + WT, vel = new Float64Array(n), g = Array.from({ length: 2 * WT + 1 }, (_, j) => Math.exp(-Math.pow((j - WT) / (WT / 3), 2) / 2)), sg = g.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) vel[i] = (crudo[i + 1] - crudo[i]) / dt;
  const tabla = new Float64Array(nf + 1);
  for (let i = 0; i < nf; i++) {
    let a = 0; for (let j = -WT; j <= WT; j++) { const kk = i + j; a += (kk < 0 || kk >= n ? 0 : vel[kk]) * g[j + WT]; }
    tabla[i + 1] = tabla[i] + a / sg * dt;
    if (i % 128 === 127) yield;
  }
  const escala = longitud / tabla[nf]; for (let i = 0; i <= nf; i++) tabla[i] = Math.min(longitud, tabla[i] * escala);
  // La duración en función de k puede dar un salto: si con algo más de velocidad la frenada empieza ya en un vacío
  // rapidísimo, se salta de golpe la parte lenta del final (al volver a casa desde la supernova salía 1,5 s más corto).
  // Entonces se estira (o encoge) el tiempo de toda la tabla por igual hasta la duración pedida: el mismo vuelo, igual
  // de suave, solo un poco más lento.
  const n2 = Math.round(duracion / dt);
  if (Math.abs(n2 - nf) > 1) {
    const r = nf / n2, otra = new Float64Array(n2 + 1);
    for (let i = 0; i <= n2; i++) { const x = i * r, j = Math.min(nf - 1, Math.floor(x)), f = x - j; otra[i] = tabla[j] + (tabla[j + 1] - tabla[j]) * f; }
    otra[n2] = longitud;
    return { k, dt, tabla: otra, duracion: n2 * dt, sm };
  }
  return { k, dt, tabla, duracion: nf * dt, sm };
}

// El mismo cálculo de un tirón (en el obrero).
export function calcularPerfil(args) { const g = perfilDesdeDistancias(args); for (;;) { const r = g.next(); if (r.done) return r.value; } }
