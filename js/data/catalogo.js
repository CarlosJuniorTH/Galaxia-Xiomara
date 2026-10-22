// Catálogo persistente del universo (además de Xiomara y de la Vía Láctea, que tienen módulo
// propio). Cada galaxia tiene identificador, posición, radio, tipo y orientación fijos; cada
// nebulosa, su galaxia anfitriona. Se ve desde cualquier destino por la misma geometría, sin
// reglas por destino, y existe antes de verse (no se crea ni se recoloca delante de la cámara).
//
// Escala (docs/ESCALA-Y-ESPACIO.md): 1 unidad ≈ 51 años luz (el diámetro de Xiomara, ~1960 u,
// ≈ 100 000 años luz). La supernova está a 100 millones de años luz (≈ 1,96 millones de unidades).
//
// Composición:
//  · región de salida: satélites de Xiomara, la Vía Láctea (módulo propio), Andrómeda y el Triángulo;
//  · PAISAJE DE LOS VIAJES (RUTAS): en cada camino largo desde Xiomara (supernova, TON 618, cuásar),
//    galaxias a los lados, a cierta distancia, que crecen y pasan por los bordes de la pantalla
//    mientras se viaja más rápido que la luz; nebulosas cerca del camino y alguna que se ATRAVIESA;
//  · el UNIVERSO DE LLEGADA de cada gigante: galaxias detrás y alrededor, lejos (se nota la
//    profundidad), para que al llegar se vea un cosmos nuevo (las estrellas y las constelaciones
//    propias de cada destino están en js/escena/universoLocal.js);
//  · POBLACIÓN: grupos y filamentos por todo el volumen (también lejos de los caminos), con grandes
//    vacíos entre agrupaciones. Galaxias independientes separadas ≥ 20 000 u (≈ 1 Mal); excepciones
//    explícitas: satélites, miembros de grupo y de cúmulo.
// Nebulosas: las de la población, dentro de galaxias anfitrionas (regiones de formación estelar
// AMPLIADAS ×~25 para que se reconozcan a escala intergaláctica); las del paisaje de los viajes son
// nubes enormes propias de nuestro universo (licencia), algunas atravesadas por el camino.
//
// tipo: índice de DESCRIPTORES (formasGalaxia.js): 0 espiral, 1 espiral rosa, 2 barrada dorada,
// 3 floculenta, 4 elíptica, 5 de canto, 6 irregular, 7 espiral violeta, 8 barrada azul,
// 9 Andrómeda, 10 colisión.
// forma de nebulosa (nube.js): emision, cavidad, pilares, filamentos, reflexion, oscura.
import { posicionDestino, direccion } from './sitios.js';
import { UNIDAD_ANOS_LUZ, desdeMal, aMal, RADIO_GIGANTE, LLEGADA_GIGANTE, SILUETA_GIGANTE, LEJANIA } from './escalaCosmica.js';
import { generador, semillaDe } from '../util/azarSemilla.js';
import { crearTelarana, puntoFilamento } from './telarana.js';

export { UNIDAD_ANOS_LUZ };
export const SEPARACION_MINIMA = 20000;   // ≈ 1 millón de años luz entre galaxias independientes
export const SEPARACION_GRUPO = 9000;     // dentro de un grupo (≈ 460 000 años luz como mínimo)
export const AMPLIACION_NEBULOSAS = 25;   // declarada: regiones de formación estelar ×25
export const LIBRE_CORAZON = 600000 * LEJANIA;      // ninguna galaxia de la población a < 30 Mal del corazón (su universo de llegada)
export const DESTINOS_CATALOGO = ['xiomara', 'supernova', 'ton618', 'cuasar', 'pulsar', 'sagitario', 'deneb'];

// Ya no hay encuentros con nombre en los que el viaje se detenga: el paisaje pasa sin pararse.
export const ENCUENTROS = Object.freeze([]);

// ── Paisaje de los viajes largos desde Xiomara. galaxias / nebulosas: cuántas a los lados del camino;
// cruces: fracciones del camino donde una nebulosa enorme se atraviesa por dentro. ──
export const RUTAS = Object.freeze([
  { destino: 'supernova', galaxias: 75, nebulosas: 12, cruces: [0.34, 0.7] },
  { destino: 'ton618', galaxias: 64, nebulosas: 10, cruces: [0.28, 0.6] },
  { destino: 'cuasar', galaxias: 60, nebulosas: 10, cruces: [0.3, 0.68] },
  // Caminos entre los gigantes: también llenos de galaxias y nebulosas.
  { origen: 'supernova', destino: 'cuasar', galaxias: 34, nebulosas: 7, cruces: [0.45] },
  { origen: 'supernova', destino: 'ton618', galaxias: 30, nebulosas: 6, cruces: [0.55] },
  { origen: 'cuasar', destino: 'ton618', galaxias: 40, nebulosas: 8, cruces: [0.4] },
  // Los demás destinos, también a 100 Mal, con su camino desde casa y hacia su vecino.
  { destino: 'pulsar', galaxias: 70, nebulosas: 11, cruces: [0.35, 0.7] },
  { destino: 'sagitario', galaxias: 70, nebulosas: 11, cruces: [0.4, 0.75] },
  { destino: 'deneb', galaxias: 70, nebulosas: 11, cruces: [0.3, 0.65] },
  { origen: 'pulsar', destino: 'cuasar', galaxias: 34, nebulosas: 7, cruces: [0.5] },
  { origen: 'deneb', destino: 'supernova', galaxias: 34, nebulosas: 7, cruces: [0.5] },
  { origen: 'sagitario', destino: 'ton618', galaxias: 34, nebulosas: 7, cruces: [0.5] },
  { origen: 'deneb', destino: 'pulsar', galaxias: 34, nebulosas: 7, cruces: [0.5] },
  { origen: 'sagitario', destino: 'supernova', galaxias: 34, nebulosas: 7, cruces: [0.5] }
]);
// Nombre de una ruta (los caminos desde casa conservan el del destino).
export const claveRuta = r => r.origen ? `${r.origen}-${r.destino}` : r.destino;
export const FORMAS_NEBULOSA = Object.freeze(['emision', 'cavidad', 'pilares', 'reflexion', 'filamentos', 'emision', 'oscura']);

// Región de salida (grupo local de Xiomara). cielo: [acimut, elevación, distancia] desde casa.
export const LOCALES = Object.freeze([
  { id: 'xiomara-enana-norte', satelite: 'xiomara', desplazamiento: [2600, 1700, -3900], r: 210, tipo: 6, nota: 'satélite irregular (como una Nube de Magallanes)' },
  { id: 'xiomara-enana-sur', satelite: 'xiomara', desplazamiento: [-4200, -1300, 2700], r: 150, tipo: 4, nota: 'satélite elíptica enana' },
  { id: 'andromeda', cielo: [-122, 33, 49000], r: 900, tipo: 9, rot: [1.33, 0.1, 0.62], nota: 'a ~2,5 millones de años luz; algo menor que Xiomara (en nuestro universo ella es la mayor)' },
  { id: 'andromeda-m32', satelite: 'andromeda', desplazamiento: [900, -350, 250], r: 70, tipo: 4 },
  { id: 'andromeda-m110', satelite: 'andromeda', desplazamiento: [-1500, 900, -500], r: 150, tipo: 4 },
  { id: 'triangulo', cielo: [-95, 18, 56000], r: 450, tipo: 7, nota: 'compañera de Andrómeda a ~1 millón de años luz' }
]);

// Universo de llegada de cada gigante: n galaxias detrás y alrededor (cono: ángulo máximo respecto a la
// mirada de llegada; el resto, a los lados y detrás, para descubrirlas al girar), lejos y grandes.
export const UNIVERSO_LLEGADA = Object.freeze({
  supernova: { n: 16, cono: 42 }, ton618: { n: 14, cono: 45 }, cuasar: { n: 12, cono: 48 }, pulsar: { n: 12, cono: 45 }, sagitario: { n: 12, cono: 45 }, deneb: { n: 12, cono: 45 }
});

export const POBLACION = Object.freeze({ margenCorredor: 90000 * LEJANIA, margenDestino: 150000 * LEJANIA });
// Espacio propio de cada destino (la población no entra): su tamaño y su universo de llegada.
export const RESERVA = Object.freeze({ xiomara: 60000, supernova: 1000000 * LEJANIA, ton618: 900000 * LEJANIA, cuasar: 420000 * LEJANIA, pulsar: 400000 * LEJANIA, sagitario: 300000, deneb: 600000 * LEJANIA });

// ── Utilidades geométricas (V: constructor de vectores, p. ej. THREE.Vector3) ──
function base(a, b, V) {
  const eje = b.clone().sub(a).normalize();
  let u1 = new V().crossVectors(eje, new V(0, 1, 0)); if (u1.lengthSq() < 1e-8) u1.set(1, 0, 0); u1.normalize();
  const u2 = new V().crossVectors(u1, eje).normalize();
  return { a, b, eje, u1, u2, largo: a.distanceTo(b) };
}
const enRuta = (B, mal, l, ang, V) => { const t = ang * Math.PI / 180; return B.a.clone().addScaledVector(B.eje, desdeMal(mal)).addScaledVector(B.u1, Math.cos(t) * l).addScaledVector(B.u2, Math.sin(t) * l); };
// Distancia de un punto al segmento a–b.
export function distanciaSegmento(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, l2 = abx * abx + aby * aby + abz * abz;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / l2)) : 0;
  return Math.hypot(p.x - a.x - abx * t, p.y - a.y - aby * t, p.z - a.z - abz * t);
}
// Orientación: el disco con normal n (de cara a quien llega por el camino: −eje, inclinado inc
// alrededor de u1 y girado az alrededor del eje) y un giro propio alrededor de su normal.
function orientacionRuta(B, inc, az, giro, T) {
  const n = B.eje.clone().negate().applyAxisAngle(B.u1, inc * Math.PI / 180).applyAxisAngle(B.eje, az * Math.PI / 180).normalize();
  return new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), n).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), giro));
}
function orientacionAzar(azar, T) {
  const u = azar() * 2 - 1, a = azar() * Math.PI * 2, n = new T.Vector3(Math.sqrt(1 - u * u) * Math.cos(a), u, Math.sqrt(1 - u * u) * Math.sin(a));
  return new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), n).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), azar() * Math.PI * 2));
}
// La de antes para las galaxias del grupo local (mira a casa y luego gira): Andrómeda conserva su aspecto.
function orientacionLocal(pos, rot, azar, T) {
  const o = new T.Object3D(); o.position.copy(pos); o.lookAt(0, 0, 0);
  if (rot) { o.rotateX(rot[0]); o.rotateY(rot[1]); o.rotateZ(rot[2]); } else { o.rotateX(azar() * 2.2 - 1.1); o.rotateY(azar() - 0.5); o.rotateZ(azar() * Math.PI * 2); }
  return o.quaternion.clone();
}

// Destinos y corredores entre ellos (los viajes van en línea recta: ninguna galaxia de la población
// se cruza por accidente pegada a un corredor; los encuentros cercanos están diseñados).
export function destinosYCorredores(V) {
  const D = Object.fromEntries(DESTINOS_CATALOGO.map(id => [id, posicionDestino(id, V)]));
  D.sagitario = posicionDestino('sagitario', V);
  const corredores = [];
  for (let i = 0; i < DESTINOS_CATALOGO.length; i++) for (let j = i + 1; j < DESTINOS_CATALOGO.length; j++) corredores.push([DESTINOS_CATALOGO[i], DESTINOS_CATALOGO[j]]);
  corredores.push(['xiomara', 'sagitario']);
  return { D, corredores };
}

// Universo completo, determinista (T: espacio de nombres de three; semilla fija por parte).
export function universoCatalogo(T) {
  const V = T.Vector3, { D, corredores } = destinosYCorredores(V), galaxias = [], nebulosas = [], porId = new Map();
  const anadir = g => { if (porId.has(g.id)) throw Error(`galaxia repetida: ${g.id}`); galaxias.push(g); porId.set(g.id, g); return g; };
  const azarLocal = generador(semillaDe('catalogo-local'));
  // Región de salida
  for (const g of LOCALES) {
    const pos = g.satelite ? (g.satelite === 'xiomara' ? new V() : porId.get(g.satelite).pos.clone()).add(new V(...g.desplazamiento)) : direccion(...g.cielo, V);
    anadir({ id: g.id, tipo: g.tipo, r: g.r, pos, quaternion: orientacionLocal(pos, g.rot, azarLocal, T), region: 'salida', grupo: 'grupo-local', satelite: g.satelite, nota: g.nota });   // el grupo local: Andrómeda, el Triángulo y los satélites
  }
  // Paisaje de los viajes y universo de llegada de cada gigante
  paisajeViajes(T, D, galaxias, nebulosas, anadir);
  universosLlegada(T, D, galaxias, anadir);
  // Población: grupos y filamentos alrededor de «semillas» de superestructura, con vacíos.
  poblar(T, D, corredores, galaxias, nebulosas, anadir);
  return { galaxias, nebulosas, destinos: D, corredores };
}

// Región de una galaxia de la población: por su avance a lo largo del camino principal; lo que
// queda lejos de él (más de 30 Mal de lado, o por detrás de casa o más allá de la supernova) es
// universo «fuera del camino» (se ve de lejos desde cualquier punto).
function regionPoblacion(p, D) {
  if (p.distanceTo(D.supernova) < RESERVA.supernova) return 'llegada';
  const eje = D.supernova.clone().normalize(), t = p.dot(eje), lateral = p.clone().addScaledVector(eje, -t).length();
  if (t < 0 || t > D.supernova.length() * 1.05 || lateral > desdeMal(30)) return 'fuera';
  return regionDe(aMal(t));
}
export function regionDe(mal) {
  return mal < 3 ? 'salida' : mal < 20 ? 'extragalactica' : mal < 80 ? 'intermedia' : mal < 93 ? 'profunda' : 'llegada';
}

// Nebulosa dentro de su anfitriona: en el plano del disco, hacia el lado del camino (haciaRuta:
// fracción del radio) y girada giroRuta grados dentro del plano. objetivo: punto hacia el que se
// orienta en el plano (por defecto, el punto más cercano del camino).
function nebulosaEn(h, n, B, T, region, encuentro, objetivo) {
  const V = T.Vector3, nrm = new V(0, 0, 1).applyQuaternion(h.quaternion);
  let hacia;
  if (objetivo) hacia = objetivo.clone().sub(h.pos);
  else { const t = Math.max(0, Math.min(B.largo, h.pos.clone().sub(B.a).dot(B.eje))); hacia = B.a.clone().addScaledVector(B.eje, t).sub(h.pos); }
  hacia.addScaledVector(nrm, -hacia.dot(nrm)); if (hacia.lengthSq() < 1e-6) hacia.copy(new V(1, 0, 0).applyQuaternion(h.quaternion)); hacia.normalize();
  hacia.applyAxisAngle(nrm, (n.giroRuta || 0) * Math.PI / 180);
  const pos = h.pos.clone().addScaledVector(hacia, (n.haciaRuta ?? 0.6) * h.r).addScaledVector(nrm, (n.alto || 0) * h.r);
  // Orientación de su cara: a medio camino entre quien llega por el camino (−eje) y el propio camino
  // (de lado): al acercarse se ve en diagonal y al cruzarla, casi de frente; nunca de canto.
  let orientacion;
  if (B) { const t = Math.max(0, Math.min(B.largo, pos.clone().sub(B.a).dot(B.eje))), alCamino = B.a.clone().addScaledVector(B.eje, t).sub(pos).normalize(); orientacion = alCamino.add(B.eje.clone().negate()).normalize(); }
  else orientacion = nrm.clone();
  return { id: n.id, anfitriona: h.id, forma: n.forma, tono: n.tono, r: n.r, pos, normal: nrm, orientacion, region, encuentro, semilla: semillaDe(n.id) % 997 };
}

// ── Paisaje de los viajes: a lo largo de cada camino largo desde Xiomara, galaxias a los lados (a
// distancia: se ven crecer y pasar por los bordes, sin rozar la cámara), pequeños grupos más lejos,
// nebulosas cerca del camino y nebulosas enormes que el camino atraviesa. Todo con posición fija. ──
function paisajeViajes(T, D, galaxias, nebulosas, anadir) {
  const V = T.Vector3, tipos = [0, 1, 2, 3, 7, 8, 1, 3, 0, 4, 6, 9, 10, 5, 7, 2];
  const separada = (p, r) => galaxias.every(o => o.pos.distanceTo(p) >= Math.max(SEPARACION_MINIMA, (o.r + r) * 3));
  for (const ruta of RUTAS) {
    const clave = claveRuta(ruta), origen = ruta.origen || 'xiomara';
    const B = base(D[origen], D[ruta.destino], V), azar = generador(semillaDe(`paisaje-${clave}`)), region = `camino-${clave}`;
    // Empieza fuera del grupo de Xiomara y termina donde empieza el universo de llegada del gigante.
    const s0 = origen === 'xiomara' ? 120000 * LEJANIA : LLEGADA_GIGANTE[origen] + SILUETA_GIGANTE[origen] * 1.6, s1 = B.largo - (LLEGADA_GIGANTE[ruta.destino] + SILUETA_GIGANTE[ruta.destino] * 1.6), tramo = s1 - s0;
    const punto = (s, l, ang) => { const t = ang * Math.PI / 180; return B.a.clone().addScaledVector(B.eje, s).addScaledVector(B.u1, Math.cos(t) * l).addScaledVector(B.u2, Math.sin(t) * l); };
    // Ángulo alrededor del camino: se evita la franja de abajo (la tarjeta del viaje la taparía).
    const angulo = () => { let a; do a = azar() * 360; while (a > 235 && a < 305); return a; };
    let k = 0;
    for (let i = 0; i < ruta.galaxias; i++) {
      for (let intento = 0; intento < 30; intento++) {
        const s = s0 + (i + 0.15 + azar() * 0.7) / ruta.galaxias * tramo, r = Math.round(450 + Math.pow(azar(), 1.4) * 430);
        const l = r * 2.4 + 3000 + Math.pow(azar(), 2) * 15000 * Math.sqrt(LEJANIA), pos = punto(s, l, angulo());
        if (!separada(pos, r)) continue;
        const id = `${clave}-paisaje-${++k}`;
        anadir({ id, tipo: tipos[Math.floor(azar() * tipos.length)], r, pos, quaternion: orientacionRuta(B, 15 + azar() * 50, azar() * 360, azar() * Math.PI * 2, T), region, grupo: id, paisaje: clave });
        // A veces, un grupito: la galaxia y dos o tres compañeras más pequeñas a su alrededor.
        if (azar() < 0.22) for (let m = 0, n = 2 + Math.floor(azar() * 2); m < n; m++) {
          const rr = Math.round(150 + azar() * 270), d = new V(azar() - 0.5, azar() - 0.5, azar() - 0.5).normalize().multiplyScalar(r * 2.5 + 3000 + azar() * 4000), pp = pos.clone().add(d);
          if (galaxias.every(o => o.pos.distanceTo(pp) >= Math.max(o.grupo === id ? SEPARACION_GRUPO * 0.6 : SEPARACION_MINIMA, (o.r + rr) * 3)) && distanciaSegmento(pp, B.a, B.b) > rr * 2.4 + 2500)
            anadir({ id: `${id}-${m + 1}`, tipo: tipos[Math.floor(azar() * tipos.length)], r: rr, pos: pp, quaternion: orientacionAzar(azar, T), region, grupo: id, satelite: id, paisaje: clave });
        }
        break;
      }
    }
    // Nebulosas: de cara al camino (al acercarse se ven en diagonal y al pasar, casi de frente).
    const caraAlCamino = pos => { const t = Math.max(0, Math.min(B.largo, pos.clone().sub(B.a).dot(B.eje))); return B.a.clone().addScaledVector(B.eje, t).sub(pos).normalize().add(B.eje.clone().negate()).normalize(); };
    const nebulosa = (id, pos, r, cruce) => nebulosas.push({ id, anfitriona: null, forma: FORMAS_NEBULOSA[Math.floor(azar() * FORMAS_NEBULOSA.length)], tono: Math.floor(azar() * 5), r, pos,
      normal: caraAlCamino(pos), orientacion: cruce ? B.eje.clone().negate().applyAxisAngle(B.u1, 0.5).normalize() : caraAlCamino(pos), region, paisaje: clave, cruce, semilla: semillaDe(id) % 997 });
    // Las nebulosas del camino empiezan lejos de casa (desde Xiomara solo se ven pequeñas, a lo lejos).
    const sN = origen === 'xiomara' ? Math.min(Math.max(s0, 350000 * LEJANIA), s0 + tramo * 0.5) : s0, tramoN = s1 - sN;
    for (let i = 0; i < ruta.nebulosas; i++) {
      const s = sN + (i + 0.2 + azar() * 0.6) / ruta.nebulosas * tramoN, r = Math.round(2600 + azar() * 3600);
      nebulosa(`${clave}-nebulosa-${i + 1}`, punto(s, r * 1.7 + 3000 + azar() * 14000, angulo()), r, false);
    }
    ruta.cruces.forEach((f, i) => { const r = Math.round((7000 + azar() * 2500) * Math.sqrt(LEJANIA)); nebulosa(`${clave}-cruce-${i + 1}`, punto(s0 + f * tramo, r * 0.18, angulo()), r, true); });
  }
}

// ── Universo de llegada: galaxias detrás y alrededor de cada gigante, lejos de él (de 1,6 a 5 veces su
// radio más la distancia de llegada) y grandes, para que al llegar se vea un cosmos nuevo con
// profundidad. Las del cono se ven en el encuadre de llegada, junto al gigante y por detrás. ──
function universosLlegada(T, D, galaxias, anadir) {
  const V = T.Vector3, tipos = [0, 1, 3, 7, 8, 2, 4, 9, 10, 6, 1, 0];
  for (const [destino, { n, cono }] of Object.entries(UNIVERSO_LLEGADA)) {
    const C = D[destino], eje = C.clone().normalize(), Bs = base(new V(), C, V), azar = generador(semillaDe(`llegada-${destino}`));
    const R = RADIO_GIGANTE[destino], A = LLEGADA_GIGANTE[destino], camara = C.clone().addScaledVector(eje, -A);
    // El cono empieza fuera de la silueta del gigante vista desde la llegada (nada se esconde detrás).
    const angMin = Math.atan(SILUETA_GIGANTE[destino] / A) * 180 / Math.PI * 1.12 + 4, angMax = Math.max(cono, angMin + 20);
    let k = 0;
    for (let i = 0, intentos = 0; k < n && intentos < 600; intentos++) {
      const enCono = k < n * 0.65, ang = enCono ? angMin + azar() * (angMax - angMin) : 70 + azar() * 100, giro = azar() * 360;
      const dir = eje.clone().applyAxisAngle(Bs.u1, ang * Math.PI / 180).applyAxisAngle(eje, giro * Math.PI / 180).normalize();
      // Desde la cámara de llegada: las del cono, más allá del gigante (detrás de él, lejos).
      // Las del cono, a los lados del gigante y más cerca que él (se ven con su forma); las demás, alrededor.
      const d = enCono ? A * (0.12 + azar() * 0.75) : R * (1.8 + azar() * 2.5), pos = (enCono ? camara : C).clone().addScaledVector(dir, d);
      const r = Math.round(500 + Math.pow(azar(), 1.3) * 400);
      if (pos.distanceTo(C) < (enCono ? SILUETA_GIGANTE[destino] * 1.15 : Math.max(R, SILUETA_GIGANTE[destino]) * 1.5) + r * 3) continue;
      const v = pos.clone().sub(camara); if (enCono && v.angleTo(C.clone().sub(camara)) - Math.atan(r / v.length()) < Math.atan(SILUETA_GIGANTE[destino] / A) * 1.08) continue;
      if (!galaxias.every(o => o.pos.distanceTo(pos) >= Math.max(SEPARACION_MINIMA, (o.r + r) * 3))) continue;
      const id = `llegada-${destino}-${++k}`;
      anadir({ id, tipo: tipos[Math.floor(azar() * tipos.length)], r, pos, quaternion: orientacionAzar(azar, T), region: destino === 'supernova' ? 'llegada' : `llegada-${destino}`, grupo: id, llegada: destino });
    }
  }
}

function poblar(T, D, corredores, galaxias, nebulosas, anadir) {
  const V = T.Vector3, P = POBLACION, azar = generador(semillaDe('poblacion'));
  const distCorredor = p => Math.min(...corredores.map(([a, b]) => distanciaSegmento(p, D[a], D[b])));
  const distDestino = p => Math.min(...['xiomara', 'ton618', 'cuasar', 'supernova'].map(id => p.distanceTo(D[id]) - RESERVA[id]));
  // Rejilla espacial para comprobar la separación solo con las galaxias cercanas (mismo resultado que mirar todas:
  // las que quedan fuera de las 27 celdas vecinas están más lejos que cualquier separación exigida). Antes esta
  // comprobación recorría todo el catálogo por cada candidata y tardaba casi un segundo al cargar.
  const CELDA = Math.max(SEPARACION_MINIMA, SEPARACION_GRUPO), rejilla = new Map(), grandes = []; let indexadas = 0;
  const celda = v => Math.floor(v / CELDA);
  const cercanas = p => {
    for (; indexadas < galaxias.length; indexadas++) {
      const o = galaxias[indexadas];
      if ((o.r + 1000) * 4 > CELDA) { grandes.push(o); continue; }   // por si alguna fuera enorme: se mira siempre
      const k = `${celda(o.pos.x)},${celda(o.pos.y)},${celda(o.pos.z)}`; if (!rejilla.has(k)) rejilla.set(k, []); rejilla.get(k).push(o);
    }
    const lista = [...grandes], cx = celda(p.x), cy = celda(p.y), cz = celda(p.z);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const l = rejilla.get(`${cx + a},${cy + b},${cz + c}`); if (l) lista.push(...l); }
    return lista;
  };
  const libre = (p, r, grupo) => cercanas(p).every(o => o.grupo === grupo ? o.pos.distanceTo(p) >= Math.max(SEPARACION_GRUPO, (o.r + r) * 3) : o.pos.distanceTo(p) >= Math.max(SEPARACION_MINIMA, (o.r + r) * 4))
    && distCorredor(p) >= r * 3 + 70000 * LEJANIA && distDestino(p) >= 0 && p.distanceTo(D.supernova) >= LIBRE_CORAZON;
  const radioAzar = (a, b, k = 1.5) => Math.round(a + Math.pow(azar(), k) * (b - a));
  const tipoAzar = () => [0, 0, 1, 2, 3, 4, 4, 5, 6, 6, 7, 8, 1, 3][Math.floor(azar() * 14)];
  // La población vive sobre la telaraña cósmica (js/data/telarana.js): un cúmulo en cada nudo y
  // galaxias a lo largo de los filamentos. Entre ellos, los grandes vacíos.
  const web = crearTelarana(V);
  web.nudos.forEach((nudo, gi) => {
    const c = nudo.pos; if (distCorredor(c) < P.margenCorredor || distDestino(c) < P.margenDestino * 0.3) return;
    const grupo = `cumulo-${gi + 1}`, n = 5 + Math.floor(nudo.peso * 8), radioGrupo = nudo.r * 0.7;
    for (let k = 0, intentos = 0; k < n && intentos < 400; intentos++) {
      const d = new V(azar() * 2 - 1, azar() * 2 - 1, azar() * 2 - 1); if (d.length() > 1) continue;
      const p = k === 0 ? c.clone() : c.clone().addScaledVector(d, radioGrupo), r = k === 0 ? radioAzar(600, 950, 1.2) : radioAzar(250, 850);
      if (!libre(p, r, grupo)) { if (k === 0) break; continue; }
      anadir({ id: `${grupo}-${++k}`, tipo: k === 1 ? 4 : tipoAzar(), r, pos: p, quaternion: orientacionAzar(azar, T), region: regionPoblacion(p, D), grupo, poblacion: true, nudo: gi });
    }
  });
  let f = 0;
  web.filamentos.forEach(fil => {
    const largo = web.nudos[fil.a].pos.distanceTo(web.nudos[fil.b].pos), n = Math.floor(largo / (260000 * LEJANIA / 3));
    for (let m = 1; m <= n; m++) {
      const t = (m + (azar() - 0.5) * 0.6) / (n + 1), p = puntoFilamento(t, web.nudos, fil, V).add(new V(azar() - 0.5, azar() - 0.5, azar() - 0.5).multiplyScalar(fil.grosor)), r = radioAzar(300, 850);
      if (libre(p, r, null)) anadir({ id: `hebra-${++f}`, tipo: tipoAzar(), r, pos: p, quaternion: orientacionAzar(azar, T), region: regionPoblacion(p, D), grupo: `hebra-${f}`, poblacion: true });
    }
  });
  // Regiones H II en algunas galaxias grandes de la población (dentro de su disco).
  const formas = ['emision', 'cavidad', 'pilares', 'reflexion', 'emision', 'oscura'];
  let nn = 0;
  for (const g of galaxias.filter(g => g.poblacion && g.r >= 650 && g.tipo !== 4)) {
    if (azar() > 0.08) continue;
    const n = { id: `neb-${g.id}`, anfitriona: g.id, forma: formas[nn++ % formas.length], tono: [0, 4, 1, 0, 2][nn % 5], r: Math.round(g.r * (0.17 + azar() * 0.1)), haciaRuta: 0.5 + azar() * 0.3, giroRuta: azar() * 360 };
    nebulosas.push(nebulosaEn(g, n, null, T, g.region, null, g.pos.clone().add(new V(0, 0, 1).applyQuaternion(g.quaternion).cross(new V(0, 1, 0)).multiplyScalar(g.r))));
  }
}

// Compatibilidad con el código anterior: posiciones de galaxias y nebulosas.
export function posicionesCatalogo(T) { const u = universoCatalogo(T); return { galaxias: u.galaxias, nebulosas: u.nebulosas }; }
