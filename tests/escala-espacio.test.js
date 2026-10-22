import test from 'node:test';
import assert from 'node:assert/strict';
import { ESCALA_UNIVERSO, RADIO_XIOMARA, DISTANCIA_SUPERNOVA, ESCALA_SUPERNOVA, RADIO_REMANENTE_SUPERNOVA, tamanoAngular, pixeles, REGIONES, UNIDAD_ANOS_LUZ, HITOS_MAL, aMal, desdeMal } from '../js/data/escalaCosmica.js';
import { generador, sembrarAzar } from '../js/util/azarSemilla.js';

const grados = r => r * 180 / Math.PI;

test('la supernova está a 1000 millones de años luz de Xiomara (conversión documentada)', () => {
  assert.equal(UNIDAD_ANOS_LUZ, 51, '1 unidad ≈ 51 años luz (diámetro de Xiomara ≈ 100 000 años luz)');
  assert.ok(Math.abs(aMal(DISTANCIA_SUPERNOVA) - 1000) < 0.1, `${aMal(DISTANCIA_SUPERNOVA)} Mal`);
  assert.ok(Math.abs(aMal(RADIO_XIOMARA * 2) * 1e6 - 100000) < 100, 'diámetro de Xiomara ≈ 100 000 años luz');
  assert.deepEqual(HITOS_MAL, [10, 100, 350, 650, 900, 1000]);
  assert.ok(Math.abs(desdeMal(aMal(12345)) - 12345) < 1e-6);
});

test('desde la supernova, Xiomara es una luz no resuelta: por escala, sin mínimo artificial («Mirar hacia casa» la acerca ópticamente)', () => {
  assert.ok(pixeles(RADIO_XIOMARA, DISTANCIA_SUPERNOVA) < 2, 'PC 1440×900, FOV 60°: diámetro < 2 px');
  // Con el campo de visión de «Mirar hacia casa» (Xiomara ≈ 22 % del alto) sí se reconoce.
  const fov = 2 * Math.atan(980 / (0.44 * DISTANCIA_SUPERNOVA)) * 180 / Math.PI;
  assert.ok(pixeles(RADIO_XIOMARA, DISTANCIA_SUPERNOVA, 900, fov) > 300 && fov > 0.005, `fov ${fov.toFixed(3)}°`);
});

test('los gigantes son enormes: el corazón se ve desde casa con su forma (≈ 8°) y llena el cielo al llegar', async () => {
  const { SEMIEJES_CORAZON, RADIO_GIGANTE, LLEGADA_GIGANTE } = await import('../js/data/escalaCosmica.js');
  const a = grados(tamanoAngular(SEMIEJES_CORAZON[0], DISTANCIA_SUPERNOVA));
  assert.ok(a > 6 && a < 10, `${a.toFixed(2)}°`);
  assert.ok(grados(tamanoAngular(SEMIEJES_CORAZON[0], LLEGADA_GIGANTE.supernova)) > 35, 'desde la llegada ocupa decenas de grados');
  // Mucho mayores que Xiomara (radio 980).
  for (const [id, r] of Object.entries(RADIO_GIGANTE)) if (id !== 'pulsar') assert.ok(r > 980 * 30, `${id}: ${r}`);
});

test('acercarse aumenta el tamaño angular y alejarse lo reduce; el paralaje es mayor en lo cercano', () => {
  const r = 1000;
  let anterior = 0;
  for (const d of [1e6, 3e5, 1e5, 3e4, 1e4, 3e3]) { const a = tamanoAngular(r, d); assert.ok(a > anterior); anterior = a; }
  // Desplazamiento lateral L: el ángulo que barre un objeto a distancia d es atan(L/d).
  const L = 5000, cerca = Math.atan(L / 2e4), lejos = Math.atan(L / 5e5);
  assert.ok(cerca > 10 * lejos);
});

test('la tabla de escalas es coherente: regiones ordenadas y cada objeto dentro de la suya', () => {
  const orden = ['salida', 'extragalactica', 'intermedia', 'profunda', 'llegada'];
  for (let i = 1; i < orden.length; i++) assert.ok(REGIONES[orden[i]][0] >= REGIONES[orden[i - 1]][0]);
  assert.ok(DISTANCIA_SUPERNOVA >= REGIONES.llegada[0] && DISTANCIA_SUPERNOVA <= REGIONES.llegada[1]);
  for (const o of ESCALA_UNIVERSO) {
    const reg = REGIONES[o.region]; if (!reg || typeof o.distancia !== 'number') continue;
    assert.ok(o.distancia >= reg[0] && o.distancia <= reg[1], `${o.id} en ${o.region}`);
  }
  // A la misma distancia (100 Mal), los gigantes son tan enormes que se ven desde casa (más de medio grado).
  for (const id of ['ton618', 'pulsar', 'cuasar', 'supernova']) { const o = ESCALA_UNIVERSO.find(x => x.id === id); assert.ok(tamanoAngular(o.radio, o.distancia) * 180 / Math.PI > 0.5, id); }
});

test('el mapa procedural es el mismo en cada carga (semilla persistente)', () => {
  const a = generador(7), b = generador(7);
  for (let i = 0; i < 1000; i++) assert.equal(a(), b());
  const restaurar = sembrarAzar(42), primera = [Math.random(), Math.random()]; restaurar();
  const restaurar2 = sembrarAzar(42), segunda = [Math.random(), Math.random()]; restaurar2();
  assert.deepEqual(primera, segunda);
  const original = Math.random; const r = sembrarAzar(1); r(); assert.equal(Math.random, original, 'se devuelve el azar libre');
});

test('cada parte del universo tiene su semilla: generar más en un dispositivo no mueve las demás', async () => {
  const { semillaDe } = await import('../js/util/azarSemilla.js');
  assert.equal(semillaDe('galaxiasLejanas'), semillaDe('galaxiasLejanas'));
  assert.notEqual(semillaDe('galaxiasLejanas'), semillaDe('cosmos'));
  // Simulación: la capa A consume 3 o 5 números según el dispositivo; la B da lo mismo.
  const capaB = consumoA => { let r = sembrarAzar(semillaDe('A')); for (let i = 0; i < consumoA; i++) Math.random(); r(); r = sembrarAzar(semillaDe('B')); const v = Math.random(); r(); return v; };
  assert.equal(capaB(3), capaB(5));
});

test('los tamaños proyectados coinciden con la cámara real de three.js (esfera y disco)', async () => {
  const THREE = await import('three');
  const { radioPxEsfera, radioPxDisco, focalPx, diametroAngularEsfera } = await import('../js/data/escalaCosmica.js');
  const alto = 900, ancho = 1440, cam = new THREE.PerspectiveCamera(60, ancho / alto, 0.5, 1e8);
  cam.position.set(0, 0, 0); cam.lookAt(0, 0, -1); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const f = focalPx(alto, 60);
  for (const [r, d] of [[980, 50000], [10500, 50000], [2000, 2600], [100, 150], [980, DISTANCIA_SUPERNOVA]]) {
    // Disco perpendicular: el borde del disco en (r, 0, -d).
    const borde = new THREE.Vector3(r, 0, -d).project(cam), px = borde.x * ancho / 2 * (alto / ancho) * (ancho / alto);
    assert.ok(Math.abs(borde.x * ancho / 2 - radioPxDisco(r, d, f)) < 0.01 * radioPxDisco(r, d, f) + 0.01, `disco ${r}/${d}`);
    // Esfera: el punto tangente del contorno está a ángulo asin(r/d) del centro.
    const a = Math.asin(r / d), tangente = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)).multiplyScalar(Math.sqrt(d * d - r * r)).project(cam);
    assert.ok(Math.abs(tangente.x * ancho / 2 - radioPxEsfera(r, d, f)) < 0.01 * radioPxEsfera(r, d, f) + 0.01, `esfera ${r}/${d}`);
    assert.ok(Math.abs(diametroAngularEsfera(r, d) - 2 * a) < 1e-12);
  }
  assert.equal(diametroAngularEsfera(10, 5), Math.PI, 'desde dentro ocupa todo');
  // Para objetos grandes y cercanos la aproximación lineal (ángulo × f) se equivoca bastante.
  const r = 2000, d = 2600; assert.ok(Math.abs(2 * Math.asin(r / d) * f / 2 - radioPxEsfera(r, d, f)) > 100);
});

test('la tabla describe la geometría que se dibuja: corazón y estrella progenitora medidos en la escena', async () => {
  const { SEMIEJES_CORAZON, ESCALA_SUPERNOVA, PROGENITORA_RELATIVA, ESCALA_UNIVERSO } = await import('../js/data/escalaCosmica.js');
  const THREE = await import('three');
  const guardar = { document: globalThis.document, matchMedia: globalThis.matchMedia, location: globalThis.location };
  const gradiente = () => ({ addColorStop() {} }), ctx = new Proxy({ createRadialGradient: gradiente, createLinearGradient: gradiente }, { get: (o, k) => k in o ? o[k] : () => {} });
  Object.assign(globalThis, { location: { search: '' }, matchMedia: () => ({ matches: false }), document: { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) } });
  try {
    const { crearSupernova } = await import('../js/escena/supernova.js');
    const sn = crearSupernova({ uScale: { value: 400 }, uPR: { value: 2 }, escala: ESCALA_SUPERNOVA });
    sn.grupo.scale.setScalar(ESCALA_SUPERNOVA); sn.actualizar(0, new THREE.Vector3(0, 0, 4000), new THREE.Vector3(0, 0, 4000)); sn.grupo.updateMatrixWorld(true);
    const semi = sn.cajaCorazon.getSize(new THREE.Vector3()).multiplyScalar(0.5 * sn.corazon.getWorldScale(new THREE.Vector3()).x).toArray();
    semi.forEach((v, i) => assert.ok(Math.abs(v - SEMIEJES_CORAZON[i]) / SEMIEJES_CORAZON[i] < 0.02, `semieje ${i}: ${v.toFixed(0)}`));
    const rProg = 110 * sn.superficie.getWorldScale(new THREE.Vector3()).x, tabla = ESCALA_UNIVERSO.find(o => o.id === 'progenitora').radio;
    assert.ok(Math.abs(rProg - tabla) / tabla < 0.05, `progenitora ${rProg.toFixed(1)} vs ${tabla}`);
    assert.ok(rProg > 980 * 2 && rProg < SEMIEJES_CORAZON[0] / 10, 'una supergigante colosal (se ve desde casa), mucho menor que su corazón');
    // Destello, eco de luz y onda de material se propagan distinto: la luz va siempre por delante
    // de la materia (que además se frena).
    const { radioOnda, radioEco } = await import('../js/escena/supernova.js');
    for (let e = 0; e <= 15; e += 0.25) assert.ok(radioEco(e) > radioOnda(e), `eco por delante en t=${e}`);
    assert.ok(radioOnda(4) - radioOnda(3) < radioOnda(1) - radioOnda(0), 'la onda de material se frena');
  } finally { Object.assign(globalThis, guardar); }
});

