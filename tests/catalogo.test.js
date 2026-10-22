// Catálogo del universo de 100 millones de años luz: escala documentada, regiones, paisaje de los
// viajes (galaxias a los lados de cada camino y nebulosas, alguna atravesada), separaciones
// intergalácticas (con excepciones explícitas), vacíos, universo de llegada de cada gigante despejado
// sobre su silueta y nebulosas de la población dentro de sus galaxias.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { crearTelarana, puntoFilamento } from '../js/data/telarana.js';
import { universoCatalogo, RUTAS, claveRuta, SEPARACION_MINIMA, SEPARACION_GRUPO, LIBRE_CORAZON, UNIDAD_ANOS_LUZ, distanciaSegmento } from '../js/data/catalogo.js';
import { RADIO_XIOMARA, DISTANCIA_SUPERNOVA, HITOS_MAL, aMal, desdeMal } from '../js/data/escalaCosmica.js';
import { SEMIEJES_CORAZON, LLEGADA_GIGANTE, RADIO_GIGANTE, SILUETA_GIGANTE } from '../js/data/escalaCosmica.js';

const U = universoCatalogo(THREE), G = U.galaxias, N = U.nebulosas, D = U.destinos;
const eje = D.supernova.clone().normalize();
const avance = p => p.dot(eje), lateral = p => p.clone().addScaledVector(eje, -avance(p)).length();

test('escala: 1 u ≈ 51 años luz y los grandes destinos a 1000 Mal de Xiomara', () => {
  assert.equal(UNIDAD_ANOS_LUZ, 51);
  assert.ok(Math.abs(aMal(D.supernova.length()) - 1000) < 0.5, `${aMal(D.supernova.length()).toFixed(2)} Mal`);
  assert.equal(Math.round(D.supernova.length()), DISTANCIA_SUPERNOVA);
  for (const id of ['ton618', 'cuasar', 'pulsar', 'sagitario']) assert.ok(Math.abs(aMal(D[id].length()) - 1000) < 0.5, `${id} también a 1000 Mal`);
});

test('el mismo universo en cada carga (determinista)', () => {
  const otro = universoCatalogo(THREE);
  assert.equal(otro.galaxias.length, G.length);
  for (let i = 0; i < G.length; i++) { assert.equal(otro.galaxias[i].id, G[i].id); assert.ok(otro.galaxias[i].pos.distanceTo(G[i].pos) < 1e-6); assert.ok(otro.galaxias[i].quaternion.angleTo(G[i].quaternion) < 1e-6); }
  assert.ok(new Set(G.map(g => g.id)).size === G.length, 'identificadores únicos');
});

test('radios: Xiomara es la galaxia más grande del universo; ninguna otra la iguala', () => {
  for (const g of G) assert.ok(g.r < RADIO_XIOMARA, `${g.id}: ${g.r}`);
  const r = G.map(g => g.r).sort((a, b) => a - b);
  assert.ok(r[r.length >> 1] < RADIO_XIOMARA * 0.75, `mediana ${r[r.length >> 1]}`);
});

test('telaraña cósmica: la población vive sobre ella, se ve en todas direcciones desde cada destino y deja su espacio a los destinos', () => {
  const web = crearTelarana(THREE.Vector3), V = THREE.Vector3;
  assert.ok(web.nudos.length >= 120 && web.filamentos.length >= 200, `${web.nudos.length} nudos, ${web.filamentos.length} filamentos`);
  // Muestras de los filamentos: cada galaxia de la población está cerca de un nudo o de un filamento.
  const muestras = web.nudos.map(n => n.pos);
  for (const f of web.filamentos) for (let t = 0; t <= 1; t += 0.05) muestras.push(puntoFilamento(t, web.nudos, f, V));
  const lejos = G.filter(g => g.poblacion && Math.min(...muestras.map(m => m.distanceTo(g.pos))) > 3500000);
  assert.ok(lejos.length / G.filter(g => g.poblacion).length < 0.02, `${lejos.length} galaxias fuera de la telaraña`);
  assert.ok(G.filter(g => g.poblacion).length > 1500, 'un universo lleno, no solo los caminos');
  for (const id of ['xiomara', 'supernova', 'cuasar', 'ton618']) {
    const C = D[id], oct = new Set(web.nudos.map(n => { const p = n.pos.clone().sub(C); return `${p.x > 0}${p.y > 0}${p.z > 0}`; }));
    assert.equal(oct.size, 8, `${id}: nudos en ${oct.size} octantes`);
    assert.ok(web.nudos.every(n => n.pos.distanceTo(C) >= 2500000), `${id}: un nudo pegado al destino`);
  }
});

test('separaciones intergalácticas: ≥ 20 000 u (≈ 1 Mal) entre independientes; excepciones explícitas', () => {
  let peor = Infinity, par = null, peorGrupo = Infinity;
  for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
    const a = G[i], b = G[j], d = a.pos.distanceTo(b.pos);
    if (a.satelite === b.id || b.satelite === a.id || (a.satelite && a.satelite === b.satelite)) { assert.ok(d > Math.min(a.r, b.r) * 3, `satélites ${a.id}/${b.id} solapados`); continue; }   // un satélite puede estar en el halo de su anfitriona (como M32)
    if (a.grupo === b.grupo) { peorGrupo = Math.min(peorGrupo, d / Math.max(1, (a.r + b.r) * 2)); assert.ok(d >= Math.min(SEPARACION_GRUPO, (a.r + b.r) * 3), `${a.id}/${b.id}: ${Math.round(d)} dentro de su grupo`); continue; }
    if (d < peor) { peor = d; par = [a.id, b.id]; }
  }
  assert.ok(peor >= SEPARACION_MINIMA, `${par}: ${Math.round(peor)}`);
});

test('paisaje de los viajes: galaxias a lo largo de todo el camino, a los lados y a distancia (nunca rozando la cámara)', () => {
  for (const ruta of RUTAS) {
    const clave = claveRuta(ruta), a = D[ruta.origen || 'xiomara'], b = D[ruta.destino], largo = a.distanceTo(b), e = b.clone().sub(a).normalize();
    const propias = G.filter(g => g.paisaje === clave && !g.satelite);
    assert.ok(propias.length >= ruta.galaxias * 0.85, `${ruta.destino}: ${propias.length} galaxias`);
    const s = propias.map(g => g.pos.clone().sub(a).dot(e) / largo).sort((x, y) => x - y);
    for (let i = 1; i < s.length; i++) assert.ok(s[i] - s[i - 1] < 0.08, `${ruta.destino}: hueco del ${((s[i] - s[i - 1]) * 100).toFixed(0)} % del camino`);
    assert.ok(s[0] < (ruta.origen ? 0.55 : 0.6) && s[s.length - 1] > 0.38, `${clave}: de ${s[0].toFixed(2)} a ${s[s.length - 1].toFixed(2)}`);
    for (const g of G.filter(g => g.paisaje === clave)) assert.ok(distanciaSegmento(g.pos, a, b) >= g.r * 2.3 + 2500, `${g.id} demasiado cerca del camino`);
    // Alrededor del camino (no todas del mismo lado): en al menos tres de los cuatro cuadrantes.
    const u1 = new THREE.Vector3().crossVectors(e, new THREE.Vector3(0, 1, 0)).normalize(), u2 = new THREE.Vector3().crossVectors(u1, e);
    const cuadrantes = new Set(propias.map(g => { const v = g.pos.clone().sub(a); return `${v.dot(u1) > 0}${v.dot(u2) > 0}`; }));
    assert.ok(cuadrantes.size >= 3, `${ruta.destino}: ${cuadrantes.size} cuadrantes`);
  }
});

test('no hay paredes ni tubos: el contenido ocupa todo el volumen, con vacíos grandes', () => {
  // Fuera del camino principal (más de 30 Mal de lado, o por detrás de casa o más allá de la supernova) está la mayor parte.
  const fuera = G.filter(g => lateral(g.pos) > desdeMal(30) || avance(g.pos) < 0 || avance(g.pos) > D.supernova.length() * 1.05).length;
  assert.ok(fuera / G.length > 0.5, `${fuera} de ${G.length} fuera del camino`);
  // Ningún hito acumula una pared de galaxias (±2 Mal a lo largo del camino y a menos de 30 Mal de él).
  for (const h of HITOS_MAL) { const n = G.filter(g => !g.paisaje && Math.abs(aMal(avance(g.pos)) - h) < 2 && lateral(g.pos) < desdeMal(30) && g.pos.length() > desdeMal(3)).length; assert.ok(n <= 8, `${n} galaxias en el hito ${h}`); }
  // Vacíos: puntos al azar del volumen lejos de toda galaxia (> 12 Mal) son frecuentes.
  const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const g of G) { min.min(g.pos); max.max(g.pos); }
  let vacios = 0; const n = 400; let semilla = 7; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) { const p = new THREE.Vector3(min.x + azar() * (max.x - min.x), min.y + azar() * (max.y - min.y), min.z + azar() * (max.z - min.z)); if (G.every(g => g.pos.distanceTo(p) > desdeMal(12))) vacios++; }
  assert.ok(vacios / n > 0.25, `vacíos: ${(vacios / n * 100).toFixed(0)} % del volumen`);
  // En todas las direcciones: galaxias en los ocho octantes alrededor del camino.
  const oct = new Set(G.map(g => { const p = g.pos.clone().sub(D.supernova.clone().multiplyScalar(0.5)); return `${p.x > 0}${p.y > 0}${p.z > 0}`; }));
  assert.equal(oct.size, 8);
});

test('cada gigante en su universo: galaxias de llegada lejos de él, en varias direcciones, y nada sobre su silueta al llegar', () => {
  const S = D.supernova;
  const cerca = G.filter(g => !g.satelite && !g.llegada && !g.paisaje && g.pos.distanceTo(S) < LIBRE_CORAZON);
  assert.equal(cerca.length, 0, `población a menos de ${aMal(LIBRE_CORAZON).toFixed(1)} Mal del corazón: ${cerca.map(g => g.id)}`);
  for (const id of ['supernova', 'cuasar', 'ton618']) {
    const C = D[id], e = C.clone().normalize(), A = LLEGADA_GIGANTE[id], R = RADIO_GIGANTE[id], propias = G.filter(g => g.llegada === id);
    assert.ok(propias.length >= 10, `${id}: ${propias.length} galaxias de llegada`);
    const dirs = new Set(propias.map(g => { const p = g.pos.clone().sub(C); return `${p.x > 0}${p.y > 0}${p.z > 0}`; }));
    assert.ok(dirs.size >= 4, `${id}: ${dirs.size} octantes`);
    for (const g of propias) assert.ok(g.pos.distanceTo(C) > SILUETA_GIGANTE[id] * 1.1, `${g.id} dentro de ${id}`);
    // Desde la cámara de llegada, ninguna galaxia visible (> 4 px) cae sobre la silueta del gigante.
    const cam = C.clone().addScaledVector(e, -A), semi = Math.atan(SILUETA_GIGANTE[id] / A);
    for (const g of G) { const v = g.pos.clone().sub(cam), d = v.length(); if (g.r / d * 780 > 4 && d < A * 6) assert.ok(v.angleTo(C.clone().sub(cam)) - Math.atan(g.r / d) > semi * 1.05, `${g.id} sobre la silueta de ${id}`); }
  }
});

test('cada destino tiene su espacio: ninguna galaxia independiente pegada a TON 618, al cuásar ni a Xiomara', () => {
  for (const g of G.filter(g => g.region !== 'salida')) for (const id of ['xiomara', 'ton618', 'cuasar']) assert.ok(g.pos.distanceTo(D[id]) - g.r > 15000, `${g.id} junto a ${id}`);
});

test('nebulosas: las de la población dentro de sus galaxias; las del paisaje junto al camino, y alguna se atraviesa', () => {
  const porId = new Map(G.map(g => [g.id, g]));
  for (const n of N.filter(n => !n.paisaje)) { const h = porId.get(n.anfitriona); assert.ok(h, `${n.id} sin anfitriona`); assert.ok(n.pos.distanceTo(h.pos) <= h.r * 1.0, `${n.id} fuera de su galaxia`); }
  assert.ok(new Set(N.map(n => n.forma)).size >= 6, 'formas: emisión, cavidad, pilares, filamentos, reflexión y oscura');
  for (const ruta of RUTAS) {
    const clave = claveRuta(ruta), propias = N.filter(n => n.paisaje === clave), a = D[ruta.origen || 'xiomara'], b = D[ruta.destino];
    const cruces = propias.filter(n => n.cruce), alLado = propias.filter(n => !n.cruce);
    assert.equal(cruces.length, ruta.cruces.length, `${ruta.destino}: nebulosas atravesadas`);
    for (const n of cruces) assert.ok(distanciaSegmento(n.pos, a, b) < n.r * 0.3, `${n.id}: el camino no la atraviesa`);
    for (const n of alLado) { const d = distanciaSegmento(n.pos, a, b); assert.ok(d > n.r * 1.5 && d < n.r * 1.7 + 17500, `${n.id}: a ${Math.round(d)} del camino`); }
  }
});
