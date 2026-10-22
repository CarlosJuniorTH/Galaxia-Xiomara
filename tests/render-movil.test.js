import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, PerspectiveCamera, Vector2 } from 'three';
import { curvaSalida, CODO, SalidaPass, enfocar, nitidezPara } from '../js/escena/salida.js';
import { BrilloEficiente } from '../js/escena/brillo.js';
import { crearAgujeroNegro } from '../js/escena/agujeroNegro.js';
import { RADIO_SILUETA } from '../js/escena/materiales.js';
import { encuadreHogar, distanciaGalaxia, escalaSimbolos, desplazamientoZonaLibre, RADIO_GALAXIA, compensacionPuntos, distanciaDestino } from '../js/util/encuadre.js';

const srgb = x => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

test('la salida limpia NaN, infinitos y negativos antes de mostrarlos', () => {
  for (const malo of [[NaN, 0.2, 0.3], [Infinity, 0.1, 0.1], [-5, -1, 0.4], [0.3, -Infinity, NaN]]) {
    const c = curvaSalida(malo, [NaN, -2, Infinity]);
    assert.ok(c.every(v => Number.isFinite(v) && v >= 0 && v <= 1), `${malo} → ${c}`);
  }
});

test('por debajo del codo la imagen es la misma composición que antes (sRGB + brillo)', () => {
  for (const [r, g, b] of [[0.02, 0.01, 0.03], [0.1, 0.05, 0.2], [0.3, 0.12, 0.25]]) {
    const esperado = [srgb(r) + 0.01, srgb(g) + 0.02, srgb(b) + 0.03];
    if (Math.max(...esperado) > CODO) continue;
    curvaSalida([r, g, b], [0.01, 0.02, 0.03]).forEach((v, i) => assert.ok(Math.abs(v - esperado[i]) < 1e-12));
  }
});

test('las altas luces del núcleo se comprimen sin quemarse en blanco ni perder el matiz', () => {
  let anterior = 0;
  for (const k of [0.5, 1, 2, 4, 8, 16, 40]) {
    const c = curvaSalida([k, k * 0.35, k * 0.6]);
    const m = Math.max(...c);
    assert.ok(m <= 1 && m >= anterior, 'monótona y acotada');
    assert.ok(c[0] > c[1] + 0.05, `conserva el rosa en ${k}: ${c}`);   // antes: (1,1,1) a partir de k≈2.9
    anterior = m;
  }
  // Dos zonas distintas del disco siguen siendo distinguibles.
  assert.ok(Math.max(...curvaSalida([3, 1, 2])) - Math.max(...curvaSalida([1.5, 0.5, 1])) > 0.01);
});

test('el brillo se calcula sin mezclar y la salida lo compone con la escena', () => {
  const brillo = new BrilloEficiente(new Vector2(390, 844), 0.45, 0.3, 0.78);
  const salida = new SalidaPass(brillo);
  try {
    assert.equal(salida.needsSwap, false);
    assert.match(salida.material.fragmentShader, /tBrillo/);
    assert.match(salida.material.fragmentShader, /min\(max\(c, vec3\(0\.0\)\)/);
  } finally { brillo.dispose(); salida.dispose(); }
});

test('el anillo de fotones no usa pow con base negativa y los chorros no dibujan un rectángulo', () => {
  const scene = new Scene();
  crearAgujeroNegro({ scene, uScale: { value: 1000 }, uPR: { value: 3 } });
  const shaders = []; scene.traverse(o => { if (o.material?.fragmentShader) shaders.push(o.material.fragmentShader); });
  const anillo = shaders.find(s => s.includes('linea'));
  assert.ok(anillo && !/pow\(\s*\(r-/.test(anillo), 'pow((r-44.5)…) era NaN en GPU que evalúan exp2(y·log2(x))');
  const chorros = shaders.filter(s => s.includes('vCara'));
  assert.equal(chorros.length, 2);
  for (const s of chorros) assert.ok(!/vU\.x/.test(s), 'la intensidad no depende de la coordenada alrededor del cono');
  let horizonte = 0; scene.traverse(o => { if (o.geometry?.type === 'SphereGeometry' && o.material?.color?.getHex() === 0) horizonte = o.geometry.parameters.radius; });
  assert.ok(RADIO_SILUETA > horizonte, 'el cono de la silueta cubre el horizonte');
  scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
});

test('en vertical la galaxia llena el ancho y está más cerca; en PC el encuadre no cambia', () => {
  const tan30 = Math.tan(Math.PI / 6);
  for (const aspecto of [390 / 844, 390 / 664, 360 / 740]) {
    const { distancia, elevacion } = encuadreHogar(aspecto);
    const anchoVisible = 2 * distancia * tan30 * aspecto;
    assert.ok(anchoVisible >= 1.6 * RADIO_GALAXIA && anchoVisible <= 1.95 * RADIO_GALAXIA, `ancho ${anchoVisible}`);   // casi completa, llena el ancho
    assert.ok(distancia <= distanciaGalaxia(aspecto), 'no más lejos que antes');
    // Altura que ocupa el disco en pantalla: antes era una franja casi de canto (≈25°).
    const elevacionAnterior = Math.atan2(0.42, Math.hypot(0.2, 0.88));
    const altura = d => 2 * RADIO_GALAXIA * Math.sin(d.elevacion) / (2 * d.distancia * tan30);
    assert.ok(altura({ distancia, elevacion }) > 1.5 * altura({ distancia: distanciaGalaxia(aspecto), elevacion: elevacionAnterior }));
  }
  for (const aspecto of [16 / 9, 1.6, 2.2, 844 / 390]) assert.equal(encuadreHogar(aspecto).distancia, distanciaGalaxia(aspecto));
});

test('el corazón y el nombre crecen al alejar y conservan su tamaño de escritorio', () => {
  assert.equal(escalaSimbolos(1050), 1);
  assert.equal(escalaSimbolos(300), 1);
  assert.ok(escalaSimbolos(2800) > 2.3 && escalaSimbolos(2800) <= 2.6);
  assert.equal(escalaSimbolos(1e6), 2.6);
  assert.equal(desplazamientoZonaLibre(250, 480, 664), 33);
  assert.equal(desplazamientoZonaLibre(500, 400, 664), 0);
});

test('las estrellas de la galaxia no se desvanecen al verla desde lejos y el PC no cambia', () => {
  assert.equal(compensacionPuntos(1050), 1);
  assert.equal(compensacionPuntos(400), 1, 'al acercar crecen solo por perspectiva');
  const movil = encuadreHogar(430 / 775).distancia;
  assert.ok(compensacionPuntos(movil) > 1.3 && compensacionPuntos(movil) <= 2.2, `${movil} → ${compensacionPuntos(movil)}`);
  assert.equal(compensacionPuntos(1e5), 2.2);
});

test('los lugares se adaptan a la franja libre del móvil y en PC no cambian', () => {
  for (const base of [510, 550, 740]) {
    assert.equal(distanciaDestino(base, 16 / 9), base);
    assert.equal(distanciaDestino(base, 844 / 390), base);
    const visita = distanciaDestino(base, 430 / 775, 0.5), recorrido = distanciaDestino(base, 430 / 775, 0.3);
    // La figura (radio ≈ 0,2 · base) ocupa ~75 % del alto de la franja en la visita.
    const ocupa = 2 * 0.2 * base / (2 * visita * Math.tan(Math.PI / 6) * 0.5);
    assert.ok(ocupa > 0.7 && ocupa < 0.8, `ocupa ${ocupa}`);
    assert.ok(visita < base * 1.71, 'más cerca que el factor fijo anterior');
    assert.ok(recorrido > visita, 'con la tarjeta del recorrido se aleja');
    assert.ok(recorrido <= 1.8 * base && visita >= 0.85 * base);
  }
});

test('el reescalado enfoca sin halos: nunca sale del rango de los vecinos', () => {
  assert.equal(nitidezPara(1), 0, 'en PC (misma resolución) no se enfoca');
  assert.ok(nitidezPara(1.5) > 0 && nitidezPara(3) <= 0.35);
  const k = nitidezPara(1.5);
  assert.equal(enfocar(1, [0.1, 0.1, 0.1, 0.1], k), 1, 'una estrella no se vuelve más brillante');
  assert.equal(enfocar(0, [0.8, 0.8, 0.8, 0.8], k), 0, 'el negro no se vuelve negativo');
  const borde = enfocar(0.5, [0.2, 0.8, 0.5, 0.5], k);
  assert.ok(borde >= 0.2 && borde <= 0.8);
  assert.ok(enfocar(0.6, [0.2, 0.2, 0.2, 0.9], k) > 0.6, 'un detalle claro gana contraste');
});
