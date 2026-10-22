// Los datos de la telaraña cósmica (sin escena): posiciones, colores y brillos de sus galaxias y de su polvo de luz,
// ya troceados en bloques espaciales. Se calculan en un Web Worker (telaranaObrero.js) en paralelo con el resto de la
// carga, como los paquetes de un juego; si el navegador no puede, en el hilo principal (telarana.js). Mismas semillas:
// el universo sale idéntico en cualquier aparato. No importa three.js: lo recibe (el obrero lo carga por su ruta).
import { generador, semillaDe } from '../util/azarSemilla.js';
import { crearTelarana, TELARANA } from '../data/telarana.js';

// Trocea una nube de puntos en bloques espaciales (rejilla de G³ celdas sobre su caja, orden por cubetas: rápido aun
// con un millón de puntos). Devuelve los atributos reordenados y, por bloque, su tramo y su esfera envolvente: en la
// escena cada bloque se dibuja solo si está a la vista.
export function trocearDatos(atributos, G = 4) {
  const p = atributos.position.datos, n = p.length / 3;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) { const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  const celda = new Uint16Array(n), cuenta = new Uint32Array(G * G * G + 1), q = (v, a, b) => Math.min(G - 1, Math.floor((v - a) / Math.max(1e-9, b - a) * G));
  for (let i = 0; i < n; i++) { const c = (q(p[i * 3], x0, x1) * G + q(p[i * 3 + 1], y0, y1)) * G + q(p[i * 3 + 2], z0, z1); celda[i] = c; cuenta[c + 1]++; }
  for (let c = 0; c < G * G * G; c++) cuenta[c + 1] += cuenta[c];
  const inicio = cuenta.slice(), destino = new Uint32Array(n); for (let i = 0; i < n; i++) destino[i] = inicio[celda[i]]++;
  const salida = {};
  // Atributo a atributo, soltando el original en cuanto está copiado (menos memoria a la vez).
  for (const nombre of Object.keys(atributos)) { const { datos, k } = atributos[nombre]; const a = new Float32Array(n * k); for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) a[destino[i] * k + j] = datos[i * k + j]; salida[nombre] = { datos: a, k }; if (nombre !== 'position') atributos[nombre] = null; }
  const P = salida.position.datos, bloques = [];
  for (let c = 0; c < G * G * G; c++) {
    const a = cuenta[c], b = cuenta[c + 1]; if (b <= a) continue;
    let cx = 0, cy = 0, cz = 0; for (let i = a; i < b; i++) { cx += P[i * 3]; cy += P[i * 3 + 1]; cz += P[i * 3 + 2]; } cx /= b - a; cy /= b - a; cz /= b - a;
    let r2 = 0; for (let i = a; i < b; i++) { const dx = P[i * 3] - cx, dy = P[i * 3 + 1] - cy, dz = P[i * 3 + 2] - cz; r2 = Math.max(r2, dx * dx + dy * dy + dz * dz); }
    bloques.push({ a, n: b - a, centro: [cx, cy, cz], radio: Math.sqrt(r2) * 1.001 + 1 });
  }
  return { atributos: salida, bloques };
}

// Lista de números en memoria compacta (Float32Array que crece al doble cuando se llena). Las motas son millones: en una
// lista normal de JavaScript ocupaban el doble (8 bytes cada número) y luego se copiaban dos veces más; en un iPhone la
// memoria se agotaba y Safari cerraba el obrero sin avisar (la carga se quedaba parada).
function listaF(capacidad) {
  let a = new Float32Array(capacidad), n = 0;
  const crecer = k => { if (n + k <= a.length) return; const b = new Float32Array(Math.max(a.length * 2, n + k)); b.set(a); a = b; };
  return {
    push3(x, y, z) { crecer(3); a[n] = x; a[n + 1] = y; a[n + 2] = z; n += 3; },
    push1(x) { crecer(1); a[n++] = x; },
    datos() { const d = a.slice(0, n); a = null; return d; }
  };
}

export async function generarDatosTelarana(THREE, ceder = async () => {}) {
  const gauss = a => { let u = 0; while (!u) u = a(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * a()); };
  const col = c => new THREE.Color(c);
// Galaxias: sobre todo doradas y blancas (luz de estrellas viejas), algunas azuladas y alguna rosada.
  const GAL_CALIDAS = ['#fff3dc', '#ffe3b0', '#ffd291', '#ffc174'].map(col), GAL_FRIAS = ['#e2eaff', '#bcd0ff'].map(col), GAL_ROSA = col('#ffbfe0');
  const galaxiaColor = a => {   const r = a(); return r < 0.72 ? GAL_CALIDAS[Math.floor(a() * 4)] : r < 0.95 ? GAL_FRIAS[Math.floor(a() * 2)] : GAL_ROSA; };
// Gas de las hebras: azul, violeta y lavanda (algún toque rosado); dorado junto a los cúmulos.
  const ROSA_FIL = col('#ff7ad0');
  const AURORA = ['#4fa8ff', '#3fd8ff', '#6f7dff', '#a77dff', '#e07ad8', '#5ac8ff'].map(col);
  const FIBRA = ['#5aa2ff', '#4fc6ff', '#7d8cff', '#9a7dff', '#c48cff', '#ff8ad8', '#6fb8ff'].map(col);
  const HEBRA = ['#4f8cff', '#5aa8ff', '#6f86ff', '#47c0ff', '#8f7dff', '#b88cff', '#e08ad8'].map(col), ORO = col('#ffcf8a'), BLANCO_AZUL = col('#dfe8ff');

  const V = THREE.Vector3, web = crearTelarana(V), azar = generador(semillaDe('telarana-escena'));
  const K = 1;   // el mismo contenido en móvil y en PC
  const O = web.centro;   // las coordenadas se guardan respecto al centro (precisión de float en la GPU)

  // ── Caminos orgánicos: la curva base del filamento con ondulaciones a tres escalas (perpendiculares a él),
  // nulas en los extremos para que todas las hebras de un filamento se junten en sus nudos. ──
  function crearCamino(a, b, control, grosor, rnd, amplitud = 0.75) {
    const base = t => { const u = 1 - t; return new V(u * u * a.x + 2 * u * t * control.x + t * t * b.x, u * u * a.y + 2 * u * t * control.y + t * t * b.y, u * u * a.z + 2 * u * t * control.z + t * t * b.z); };
    const T = b.clone().sub(a).normalize(), N1 = new V().crossVectors(T, Math.abs(T.y) < 0.9 ? new V(0, 1, 0) : new V(1, 0, 0)).normalize(), N2 = new V().crossVectors(T, N1);
    const ondas = [1, 2.3, 5.1].map((f, k) => ({ f, a: [0.9, 0.45, 0.18][k] * (0.6 + rnd() * 0.8), p1: rnd() * 6.28, p2: rnd() * 6.28 }));
    const A = grosor * amplitud;
    const punto = (t, extra = null) => {
      const env = Math.sin(Math.PI * t), p = base(t);
      let x = 0, y = 0; for (const o of ondas) { x += o.a * Math.sin(2 * Math.PI * o.f * t + o.p1); y += o.a * Math.cos(2 * Math.PI * o.f * t + o.p2); }
      p.addScaledVector(N1, x * A * env).addScaledVector(N2, y * A * env);
      if (extra) p.addScaledVector(N1, extra.x * env).addScaledVector(N2, extra.y * env);
      return p;
    };
    // Versión rápida (sin crear objetos), para los cientos de miles de motas: escribe x, y, z en «M» (un trío de dobles).
    const rapido = (t, ex, ey, M) => {
      const env = Math.sin(Math.PI * t), u = 1 - t;
      let x = 0, y = 0; for (const o of ondas) { x += o.a * Math.sin(2 * Math.PI * o.f * t + o.p1); y += o.a * Math.cos(2 * Math.PI * o.f * t + o.p2); }
      const k1 = (x * A + ex) * env, k2 = (y * A + ey) * env;
      M[0] = u * u * a.x + 2 * u * t * control.x + t * t * b.x + N1.x * k1 + N2.x * k2 - O.x; M[1] = u * u * a.y + 2 * u * t * control.y + t * t * b.y + N1.y * k1 + N2.y * k2 - O.y; M[2] = u * u * a.z + 2 * u * t * control.z + t * t * b.z + N1.z * k1 + N2.z * k2 - O.z;
    };
    return { punto, rapido, N1, N2, largo: a.distanceTo(b) };
  }

  const gal = [], polvo = [], halos = [], niebla = [], radiosN = [], M = listaF(3 * 2700000), MC = listaF(3 * 2700000), MB = listaF(2700000), P3 = new Float64Array(3), B = [], BR = [], BC = [], BB = [];   // M, MC, MB: motas (posición, color, brillo) en listas planas
  const PUNTOS = 44;
  // Un filamento completo: resplandor, fibras trenzadas, ramitas y sus galaxias.
  function filamento(a, b, control, grosor, peso, rnd) {
    const camino = crearCamino(a, b, control, grosor, rnd);
    const t1 = HEBRA[Math.floor(rnd() * HEBRA.length)], t2 = HEBRA[Math.floor(rnd() * HEBRA.length)];
    const colorEn = t => t1.clone().lerp(t2, t).lerp(ORO, Math.pow(Math.abs(t - 0.5) * 2, 6) * 0.7);
    const ts = Array.from({ length: PUNTOS }, (_, i) => i / (PUNTOS - 1));
    // Resplandor del gas (ancho real en el mundo): muy tenue.
    // Gas del filamento: nubecillas suaves de tamaño real (sin líneas), azules, cian y violetas, más densas en el centro.
    for (let i = 0, n = Math.round(PUNTOS * 1.4 * peso); i < n; i++) { const t = rnd(), p = camino.punto(t).add(new V(gauss(rnd), gauss(rnd), gauss(rnd)).multiplyScalar(grosor * 0.25));
      niebla.push(p, HEBRA[Math.floor(rnd() * HEBRA.length)].clone().lerp(colorEn(t), 0.5), (0.07 + rnd() * 0.06) * peso * (0.4 + 0.6 * Math.sin(Math.PI * t))); radiosN.push(grosor * (0.25 + rnd() * 0.3)); }   // muy tenue y estrecho: el vacío queda negro
    // Fibras: cada una con su pequeño desvío propio. No se dibujan como líneas: son polvo luminoso (miles de motas
    // finas azules, violetas y rosadas) que se agolpa a lo largo de ellas, con zonas densas y huecos, y un halo más
    // suelto alrededor. Así el filamento se ve esponjoso, como gas, y no un cable.
    const nf = Math.max(4, Math.round((10 + rnd() * 7) * peso));   // haces de muchas hebras finas
    const fibras = Array.from({ length: nf }, () => ({ o: [0, 1].map(() => ({ f: 1 + rnd() * 3, p: rnd() * 6.28, a: grosor * (0.1 + rnd() * 0.3) })), bri: 0.4 + rnd() * 0.6, fase: rnd() * 6.28, fr: 1.5 + rnd() * 4 }));
    const desvio = (fb, t) => ({ x: fb.o[0].a * Math.sin(2 * Math.PI * fb.o[0].f * t + fb.o[0].p), y: fb.o[1].a * Math.sin(2 * Math.PI * fb.o[1].f * t + fb.o[1].p) });
    // Un hilo de luz muy tenue por fibra (da continuidad de lejos, donde las motas no llegan a verse).
    // Luz del filamento (como en las simulaciones de la red cósmica): no son líneas, sino la luz difusa que emiten
    // sus galaxias y su gas, hecha de muchos brillos suaves y redondos (se ve igual desde cualquier ángulo). Un velo
    // ancho y tenue alrededor y varias corrientes más estrechas y brillantes que se trenzan, de colores distintos
    // (azul, cian, violeta, rosa), con zonas más densas y huecos.
    const brillo = (p, r, c, a) => { return; B.push(p.x - O.x, p.y - O.y, p.z - O.z); BR.push(r); BC.push(c.r, c.g, c.b); BB.push(a); };
    for (let i = 0, n = Math.round(14 * peso + 6); i < n; i++) {
      const t = rnd(), p = camino.punto(t).add(new V(gauss(rnd), gauss(rnd), gauss(rnd)).multiplyScalar(grosor * 0.12));
      brillo(p, grosor * (0.45 + rnd() * 0.35), AURORA[Math.floor(rnd() * AURORA.length)].clone().lerp(colorEn(t), 0.4), 0.05 * Math.sin(Math.PI * t));
    }
    for (const fb of fibras.slice(0, Math.max(3, Math.round(5 * peso)))) {
      const c1 = AURORA[Math.floor(rnd() * AURORA.length)], c2 = AURORA[Math.floor(rnd() * AURORA.length)];
      for (let i = 0, n = Math.round(70 * peso + 20); i < n; i++) {
        const t = rnd(), dens = 0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * fb.fr * t + fb.fase), 2), dv = desvio(fb, t);
        const p = camino.punto(t, dv).add(new V(gauss(rnd), gauss(rnd), gauss(rnd)).multiplyScalar(grosor * 0.025));
        brillo(p, grosor * (0.16 + rnd() * 0.2), c1.clone().lerp(c2, t).lerp(BLANCO_AZUL, rnd() * 0.2), 0.16 * dens * fb.bri * Math.sin(Math.PI * t));
      }
    }
    // Ramas que salen hacia el vacío: corrientes de luz más finas que se apagan.
    for (let k = 0, nb = Math.round((3 + rnd() * 5) * peso); k < nb; k++) {
      const t0 = 0.1 + rnd() * 0.8, p0 = camino.punto(t0), ang = rnd() * 6.28, dir = camino.N1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(camino.N2, Math.sin(ang));
      const largo = camino.largo * (0.05 + rnd() * 0.14), curva = new V(gauss(rnd), gauss(rnd), gauss(rnd)).multiplyScalar(largo * 0.7), cr = AURORA[Math.floor(rnd() * AURORA.length)];
      for (let i = 0; i < 12; i++) { const u = i / 11; brillo(p0.clone().addScaledVector(dir, largo * u).addScaledVector(curva, u * u), grosor * 0.07 * (1 - u * 0.5), cr, 0.12 * Math.pow(1 - u, 1.3)); }
    }
    const nd = Math.round(camino.largo * densidadPolvo * peso);
    for (let i = 0; i < nd; i++) {
      const t = rnd(), fb = fibras[Math.floor(rnd() * nf)], dens = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * fb.fr * t + fb.fase), 2);
      if (rnd() > dens) continue;
      // Sin objetos temporales por mota (cientos de miles): el desvío y el color se calculan en números sueltos, con las
      // mismas operaciones y el mismo orden de llamadas al azar que antes (el universo sale idéntico, la carga es más rápida).
      const suelto = rnd() < 0.18, o0 = fb.o[0], o1 = fb.o[1], g = grosor * (suelto ? 0.16 : 0.04);
      camino.rapido(t, o0.a * Math.sin(2 * Math.PI * o0.f * t + o0.p), o1.a * Math.sin(2 * Math.PI * o1.f * t + o1.p), P3); P3[0] += gauss(rnd) * g; P3[1] += gauss(rnd) * g; P3[2] += gauss(rnd) * g; M.push3(P3[0], P3[1], P3[2]);
      fb.c1 ??= AURORA[Math.floor(rnd() * AURORA.length)]; fb.c2 ??= AURORA[Math.floor(rnd() * AURORA.length)];
      const hacia = rnd() < 0.15 ? ROSA_FIL : BLANCO_AZUL, kc = rnd() * rnd() * 0.5;
      let cr = fb.c1.r, cg = fb.c1.g, cb = fb.c1.b; cr += (fb.c2.r - cr) * t; cg += (fb.c2.g - cg) * t; cb += (fb.c2.b - cb) * t;
      cr += (hacia.r - cr) * kc; cg += (hacia.g - cg) * kc; cb += (hacia.b - cb) * kc;
      MC.push3(cr, cg, cb); MB.push1((suelto ? 0.18 : 0.3 + rnd() * 0.35) * fb.bri * (0.45 + 0.55 * Math.sin(Math.PI * t)) * (0.7 + 0.3 * peso));
    }
    // Ramitas que salen hacia el vacío, también de polvo, y se apagan en la punta.
    const nr = Math.round((3 + rnd() * 5) * peso);
    for (let k = 0; k < nr; k++) {
      const t0 = 0.12 + rnd() * 0.76, p0 = camino.punto(t0), ang = rnd() * 6.28, dir = camino.N1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(camino.N2, Math.sin(ang));
      const largo = camino.largo * (0.04 + rnd() * 0.1), curva = new V(gauss(rnd), gauss(rnd), gauss(rnd)).multiplyScalar(largo * 0.9), c0 = colorEn(t0);
      for (let i = 0, n = Math.round(largo * densidadPolvo * 0.5); i < n; i++) { const u = Math.pow(rnd(), 1.3), g = grosor * 0.1 * (1 + 2 * u), c = c0.clone().lerp(HEBRA[Math.floor(rnd() * HEBRA.length)], 0.4);
        M.push3(p0.x + dir.x * largo * u + curva.x * u * u + gauss(rnd) * g - O.x, p0.y + dir.y * largo * u + curva.y * u * u + gauss(rnd) * g - O.y, p0.z + dir.z * largo * u + curva.z * u * u + gauss(rnd) * g - O.z); MC.push3(c.r, c.g, c.b); MB.push1(0.45 * Math.pow(1 - u, 1.2) * peso); }
    }
    // Galaxias sobre las hebras.
    const ng = Math.round(camino.largo * densidadGal * peso);
    for (let i = 0; i < ng; i++) { const t = rnd(), fb = fibras[Math.floor(rnd() * nf)], dv = desvio(fb, t), p = camino.punto(t, dv).add(new V(gauss(rnd), gauss(rnd), gauss(rnd)).multiplyScalar(grosor * (rnd() < 0.75 ? 0.035 : 0.15))); gal.push(p, galaxiaColor(rnd), 0.3 + rnd() * 0.7); }   // sobre las fibras: la red está hecha de galaxias
    // Grupos de galaxias a lo largo del filamento (pequeños nudos dorados).
    for (let m = 0, nm = 1 + Math.floor(rnd() * 3 * peso); m < nm; m++) {
      const c0 = camino.punto(0.15 + rnd() * 0.7), r = grosor * (0.3 + rnd() * 0.4);
      for (let k = 0; k < 30 * K; k++) gal.push(c0.clone().add(new V(gauss(rnd), gauss(rnd), gauss(rnd)).multiplyScalar(r * 0.35)), galaxiaColor(rnd), 0.6 + rnd() * 0.6);
      halos.push(c0, r * 0.8, 0.35);
    }
  }
  const largoTotal = web.filamentos.reduce((s, f) => s + web.nudos[f.a].pos.distanceTo(web.nudos[f.b].pos), 0);
  const densidadGal = 120000 * K / largoTotal, densidadPolvo = 1700000 * K / largoTotal;   // polvo de luz fino: forma la luz de los filamentos   // las motas, solo como destellos
  let nf = 0;
  for (const f of web.filamentos) { filamento(web.nudos[f.a].pos, web.nudos[f.b].pos, f.control, f.grosor, 1, azar); if (++nf % 25 === 0) await ceder(); }
  // ── Filamentos menores (solo visuales): nudos pequeños por todo el volumen unidos a sus vecinos, más finos y
  // tenues. Cierran celdas alrededor de los vacíos, como en las simulaciones. ──
  const menores = [], rm = generador(semillaDe('telarana-menores'));
  for (let i = 0; menores.length < 420 && i < 30000; i++) {
    const u = rm() * 2 - 1, a = rm() * Math.PI * 2, sq = Math.sqrt(1 - u * u), r = TELARANA.radio * Math.pow(rm(), 0.5);
    const p = web.centro.clone().add(new V(sq * Math.cos(a) * r, u * r * 0.55, sq * Math.sin(a) * r));
    if (web.nudos.some(n => n.pos.distanceTo(p) < TELARANA.separacion * 0.3) || menores.some(m => m.distanceTo(p) < TELARANA.separacion * 0.32)) continue;
    menores.push(p);
  }
  const todos = [...web.nudos.map(n => n.pos), ...menores], unidos = new Set();
  for (let i = 0; i < menores.length; i++) { const p = menores[i];
    if (i % 40 === 39) await ceder();
    const cerca = todos.map((q, j) => [j, q.distanceTo(p)]).filter(([j, d]) => d > 1 && d < TELARANA.separacion * 1.3).sort((x, y) => x[1] - y[1]).slice(0, 2 + Math.floor(rm() * 2));
    for (const [j] of cerca) {
      const clave = [web.nudos.length + i, j].sort((x, y) => x - y).join('-'); if (unidos.has(clave)) continue; unidos.add(clave);
      const q = todos[j], largo = p.distanceTo(q), control = p.clone().add(q).multiplyScalar(0.5).add(new V(rm() - 0.5, (rm() - 0.5) * 0.6, rm() - 0.5).normalize().multiplyScalar(largo * (0.1 + rm() * 0.25)));
      filamento(p, q, control, (20000 + rm() * 50000) * 10, 0.45, rm);
    }
    // Un grupo pequeño en el nudo menor.
    for (let k = 0; k < 40 * K; k++) gal.push(p.clone().add(new V(gauss(rm), gauss(rm), gauss(rm)).multiplyScalar(90000)), galaxiaColor(rm), 0.5 + rm() * 0.6);
    halos.push(p, 220000, 0.3);
  }
  // ── Cúmulos en los nudos: cientos de galaxias doradas, polvo luminoso denso hacia el centro y un resplandor. ──
  for (const nudo of web.nudos) {
    const n = Math.round((110 + nudo.peso * 200) * K);
    for (let i = 0; i < n; i++) gal.push(nudo.pos.clone().add(new V(gauss(azar), gauss(azar), gauss(azar)).multiplyScalar(nudo.r * (azar() < 0.7 ? 0.22 : 0.55))), azar() < 0.85 ? GAL_CALIDAS[Math.floor(azar() * 4)] : GAL_FRIAS[0], 0.6 + azar() * 0.8);
    for (let i = 0, nc = Math.round((700 + nudo.peso * 1100) * K); i < nc; i++) polvo.push(nudo.pos.clone().add(new V(gauss(azar), gauss(azar), gauss(azar)).multiplyScalar(nudo.r * Math.pow(azar(), 1.5) * 0.6)), GAL_CALIDAS[Math.floor(azar() * 4)], 0.3 + azar() * 0.45);
    halos.push(nudo.pos, nudo.r * 1.4, 1.0 + nudo.peso * 0.6); halos.push(nudo.pos, nudo.r * 0.45, 1.4);
  }

  await ceder();   // un latido más antes de empaquetar (el obrero sigue vivo)
  // Listas de [posición, color, brillo] → atributos planos (relativos a O) y troceados en bloques.
  const empaquetar = lista => {
    const n = lista.length / 3, pos = new Float32Array(n * 3), c = new Float32Array(n * 3), tam = new Float32Array(n);
    for (let i = 0; i < n; i++) { const p = lista[i * 3], k = lista[i * 3 + 1]; pos[i * 3] = p.x - O.x; pos[i * 3 + 1] = p.y - O.y; pos[i * 3 + 2] = p.z - O.z; c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; tam[i] = lista[i * 3 + 2]; }
    return trocearDatos({ position: { datos: pos, k: 3 }, aCol: { datos: c, k: 3 }, aBrillo: { datos: tam, k: 1 } });
  };
  return {
    galaxias: empaquetar(gal), nubes: empaquetar(polvo),
    polvo: trocearDatos({ position: { datos: M.datos(), k: 3 }, aCol: { datos: MC.datos(), k: 3 }, aBrillo: { datos: MB.datos(), k: 1 } })
  };
}

// Los búferes que se pueden transferir del obrero al hilo principal sin copiarlos.
export const transferibles = d => Object.values(d).flatMap(x => Object.values(x.atributos).map(a => a.datos.buffer));
