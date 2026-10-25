// Escala común del universo. Unidad: la de la escena. La vara de medir es la galaxia de Xiomara
// (radio ~980, diámetro ~1960 ≈ 100 000 años luz): 1 unidad ≈ 51 años luz. Posiciones y tamaños
// fijos con UNA sola regla (el tamaño aparente sale de la perspectiva). Licencias artísticas,
// declaradas: el corazón de la supernova y su progenitora (mayores que una galaxia), las nebulosas
// (regiones de formación estelar ampliadas) y la luz no resuelta de las galaxias lejanas
// (compresión perceptiva). Ver docs/ESCALA-Y-ESPACIO.md.

export const RADIO_XIOMARA = 980;
export const UNIDAD_ANOS_LUZ = 51;
// Conversión: millones de años luz ⇄ unidades de la escena.
export const desdeMal = mal => mal * 1e6 / UNIDAD_ANOS_LUZ;
export const aMal = u => u * UNIDAD_ANOS_LUZ / 1e6;

// La supernova: a 100 millones de años luz de Xiomara (centro a centro). Desde casa el corazón es
// una luz rosada diminuta; desde allí Xiomara es una luz no resuelta («Mirar hacia casa» la acerca
// ópticamente, sin moverla ni agrandarla).
// LEJANIA: todos los grandes destinos están 10 veces más lejos que antes (≈ 1000 millones de años luz) y
// son 10 veces mayores: desde casa se ven igual de grandes; desde ellos, Xiomara es una lucecita lejana.
export const LEJANIA = 10;
export const DISTANCIA_SUPERNOVA = Math.round(desdeMal(100 * LEJANIA));
// Los gigantes del cosmos son enormes (licencia artística): mucho mayores que Xiomara, para que
// desde casa se vean en el cielo con su forma (la supernova ≈ 8°, el cuásar ≈ 12°, TON 618 ≈ 7°,
// el púlsar ≈ 12°). Desde ellos, Xiomara es una galaxia más, pequeña y lejana.
export const ESCALA_SUPERNOVA = 117 * LEJANIA;
// Ajustados para que desde casa todos se vean de un tamaño parecido (≈ 7–9° de cielo).
// Los agujeros negros (TON 618, Sagitario A*, el del cuásar) y la estrella del púlsar miden lo mismo (≈ 320 000):
// todo lo que los rodea es inmenso en proporción.
export const ESCALA_CUASAR = 13 * LEJANIA * 8.8, ESCALA_TON = 30 * LEJANIA * 9, ESCALA_PULSAR = 1230, ESCALA_DENEB = 1600 * LEJANIA, ESCALA_SGR = 2680;
export const RADIO_REMANENTE_SUPERNOVA = 1500;   // radio de referencia del diseño del corazón (×ESCALA_SUPERNOVA)
// La estrella progenitora, a su propia escala dentro del grupo: radio 110·117·0,45 ≈ 5800, una
// supergigante colosal (licencia) que desde casa brilla como una estrella enorme.
export const PROGENITORA_RELATIVA = 0.45;
// Semiejes reales del corazón (ancho, alto, espesor), medidos en su geometría final ×ESCALA_SUPERNOVA
// (el «radio de referencia» 1500·7 = 10 500 es solo la medida de diseño que usa el encuadre).
export const SEMIEJES_CORAZON = Object.freeze([8206, 7451, 5630].map(x => Math.round(x * ESCALA_SUPERNOVA / 7)));
// Radio visible de cada gigante y distancia aproximada de la cámara al llegar (unidades de la escena):
// el catálogo les deja su espacio y coloca alrededor su propio universo (js/data/catalogo.js).
export const RADIO_GIGANTE = Object.freeze({ supernova: SEMIEJES_CORAZON[0], cuasar: Math.round(4800 * ESCALA_CUASAR), ton618: 170000 * LEJANIA * 9, pulsar: Math.round(3000 * ESCALA_PULSAR), sagitario: Math.round(750 * ESCALA_SGR), deneb: 60000 * LEJANIA });
// Silueta densa de cada gigante (lo que tapa lo de detrás): el corazón, el núcleo del cuásar (disco, toro y
// brazos interiores) y el disco de TON 618 (su disco de estrellas exterior es tenue y transparente).
export const SILUETA_GIGANTE = Object.freeze({ supernova: SEMIEJES_CORAZON[0], cuasar: 30000 * LEJANIA * 8.8, ton618: 24000 * LEJANIA * 9, pulsar: Math.round(3000 * ESCALA_PULSAR), sagitario: Math.round(200 * ESCALA_SGR), deneb: 36000 * LEJANIA });
export const LLEGADA_GIGANTE = Object.freeze({ supernova: 380000 * LEJANIA, cuasar: Math.round(5200 * ESCALA_CUASAR), ton618: 1100 * ESCALA_TON, pulsar: Math.round(3850 * ESCALA_PULSAR), sagitario: Math.round(1500 * ESCALA_SGR), deneb: 160000 * LEJANIA });

// Hitos de composición del viaje principal (millones de años luz desde Xiomara). No son niveles ni
// paredes de objetos: referencias de distribución y ritmo (js/data/catalogo.js).
export const HITOS_MAL = Object.freeze([1, 10, 35, 65, 90, 100].map(x => x * LEJANIA));
export const REGIONES = Object.freeze({
  salida: [0, desdeMal(3)],                  // Xiomara, sus satélites, la Vía Láctea, Andrómeda y el Triángulo
  extragalactica: [desdeMal(3), desdeMal(20 * LEJANIA)],
  intermedia: [desdeMal(20 * LEJANIA), desdeMal(80 * LEJANIA)],
  profunda: [desdeMal(80 * LEJANIA), desdeMal(93 * LEJANIA)],
  llegada: [desdeMal(93 * LEJANIA), desdeMal(110 * LEJANIA)]     // la región remota de la supernova
});

// Tabla de referencia: radio físico representado (medido en su geometría, no la distancia de
// encuadre de la cámara) y distancia a Xiomara (centro). Se contrasta con cosmos.medidas() en
// tests/navegador/geometria.mjs. Los radios de NAVEGACIÓN (rutas) están en medidas().
export const ESCALA_UNIVERSO = Object.freeze([
  { id: 'xiomara', radio: RADIO_XIOMARA, distancia: 0, region: 'salida' },
  { id: 'sistemaSolar', radio: 60, distancia: 610, region: 'salida', nota: 'escena aparte dentro de un brazo' },
  { id: 'pulsar', radio: Math.round(3000 * ESCALA_PULSAR), distancia: Math.round(desdeMal(100 * LEJANIA)), region: 'llegada', nota: 'semieje mayor del volumen de la nebulosa del Cangrejo (caja del ray-march, ×ESCALA_PULSAR; el gas visible no llena las esquinas)' },
  { id: 'sagitario', radio: 210, distancia: Math.round(desdeMal(100 * LEJANIA)), region: 'llegada', nota: 'flujo de acreción (×0,196) en el centro de la Vía Láctea (radio 1300); sombra ≈33, anillo de fotones ≈35' },
  { id: 'cuasar', radio: Math.round(4800 * ESCALA_CUASAR), distancia: Math.round(desdeMal(100 * LEJANIA)), region: 'llegada', nota: 'galaxia anfitriona espiral de partículas (×ESCALA_CUASAR); disco de acreción ≈14 300' },
  { id: 'supernova', radio: SEMIEJES_CORAZON[0], distancia: DISTANCIA_SUPERNOVA, region: 'llegada', nota: `corazón (licencia artística): semiejes ${SEMIEJES_CORAZON.join(' × ')}` },
  { id: 'progenitora', radio: 110 * ESCALA_SUPERNOVA * PROGENITORA_RELATIVA, distancia: DISTANCIA_SUPERNOVA, region: 'llegada', nota: 'supergigante colosal (licencia): desde casa, un gran lucero' },
  { id: 'deneb', radio: Math.round(100 * ESCALA_DENEB), distancia: Math.round(desdeMal(100 * LEJANIA)), region: 'llegada', nota: 'la supergigante (RADIO_DENEB = 100 en su espacio, js/escena/deneb.js; su mundo de hilos llega a 2,6 radios); de lejos, un brillo no resuelto' },
  { id: 'ton618', radio: Math.round(4000 * ESCALA_TON / 5.2), distancia: Math.round(desdeMal(100 * LEJANIA)), region: 'remota', nota: 'disco de acreción (×ESCALA_TON·0,55); su disco de estrellas llega a ≈170 000' },
  { id: 'galaxiasCatalogo', radio: [70, 2600], distancia: [4500, 3600000], region: 'catalogo', nota: 'js/data/catalogo.js: regiones, encuentros del viaje y población en grupos y filamentos; separadas ≥ 20 000 (≈ 1 millón de años luz) salvo satélites y miembros de grupo' },
  { id: 'viaLactea', radio: 1300, distancia: Math.round(desdeMal(100 * LEJANIA)), region: 'llegada', nota: 'galaxia vecina 3D con centro en Sagitario A* (viaLactea.js)' },
  { id: 'fondoOptico', radio: null, distancia: Infinity, region: 'remota', nota: 'acompaña a la cámara: muy por fuera de cualquier viaje' }
]);

// ── Tamaño aparente ──
// Esfera de radio r vista desde fuera a distancia d de su centro: diámetro angular 2·asin(r/d).
// Desde dentro (d ≤ r) ocupa todo el campo: π.
export const diametroAngularEsfera = (r, d) => d <= r ? Math.PI : 2 * Math.asin(r / d);
// Disco de radio r, centrado y perpendicular a la línea de visión: diámetro angular 2·atan(r/d).
export const diametroAngularDisco = (r, d) => 2 * Math.atan(r / Math.max(1e-9, d));
// Distancia focal en píxeles CSS para un FOV vertical (grados) y un alto de vista (px).
export const focalPx = (alto, fov) => alto / (2 * Math.tan(fov * Math.PI / 360));
// Radio proyectado en píxeles (objeto centrado en la vista, proyección en perspectiva real):
//  · disco perpendicular: f·r/d (exacto, el plano proyecta linealmente);
//  · esfera: el contorno es el cono tangente, f·tan(asin(r/d)) = f·r/√(d²−r²).
// No se usa ángulo×f: para ángulos grandes esa aproximación lineal falla.
export const radioPxDisco = (r, d, f) => f * r / Math.max(1e-9, d);
export const radioPxEsfera = (r, d, f) => d <= r ? Infinity : f * r / Math.sqrt(d * d - r * r);
// Compatibilidad: diámetro en píxeles de una esfera centrada (PC de referencia 1440×900, FOV 60°).
export const tamanoAngular = diametroAngularEsfera;
export const pixeles = (r, d, alto = 900, fov = 60) => 2 * radioPxEsfera(r, d, focalPx(alto, fov));
