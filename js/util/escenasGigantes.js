// Escenas propias de tres gigantes al llegar (como la de la supernova): el púlsar del Cangrejo, el cuásar y Deneb (esta, en escenaDeneb.js).
// Cada una va con un fragmento de audio (js/data/bandaSonora.js) y se define solo por su DURACIÓN y unas MARCAS en
// segundos dentro del fragmento: si cambia el audio, basta con ajustar estos números (o escalarlos con
// `escalarEscena`). El reloj es el del audio (`bandaSonora.tiempo(id)`, js/ui/escenasGigantes.js); sin audio, el
// tiempo propio desde la llegada. Aquí solo hay números y curvas (sin three.js): las pruebas las comprueban sin navegador.

// Púlsar → pulsar.m4a (33,65 s): la parte de amor de «Neo Romeo» (Rusowsky), a 108 BPM: un pulso cada 0,556 s y un
// compás (4 pulsos) cada 2,25 s desde el 0. El púlsar casi se para, con los haces de lado, y LATE con la canción
// como un corazón: haces y destellos a pulsos, cada vez más fuertes, y del todo en el estribillo.
//  bailar      «Quererte hasta que bailar»: ya está quieto y empieza a latir, suave;
//  corazon     «Todo este corazón caliente»: los latidos se notan y los haces se abren un poco;
//  quererte    «Siempre sirvo pa' quererte»: sube (los haces se van abriendo y encendiendo);
//  estribillo  «De tu amor yo no sé…»: el momento grande: haces del todo, la nebulosa se ilumina con hilos de motas
//              del centro hacia fuera y todo late al compás;
//  segunda     segunda vuelta del estribillo: aún más fuerte y con luz rosa y dorada;
//  fin         en los dos últimos segundos vuelve a girar normal.
// camara: el videoclip (formato: js/util/directorCamara.js; segundos del fragmento, distancias en radios de encuadre).
// Pista de ejemplo, sencilla, a la espera de la del agente del púlsar: se acerca mientras se para, rodea el corazón
// mientras late, un golpe de cámara en el estribillo y una vuelta lenta y abierta en la segunda.
export const ESCENA_PULSAR = { id: 'pulsar', duracion: 33.6, pulso: 60 / 108, compas: 4, desfase: 0, parada: 'bailar', marcas: { inicio: 0, bailar: 1.4, corazon: 4.9, quererte: 12.5, estribillo: 15, segunda: 28, fin: 33.6 },
  camara: [
    { t: 0, pos: [0, 12, 1], curva: 'suave' },
    { t: 4.9, pos: [-18, 16, 0.78], fov: 54, curva: 'suave' },
    { t: 12.5, pos: [-62, 22, 0.66], fov: 50, curva: 'lineal' },
    { t: 14.6, pos: [-74, 20, 0.62], fov: 48, curva: 'lineal' },
    { t: 15, pos: [-80, 10, 0.5], fov: 44, curva: 'rapida' },
    { t: 27.5, pos: [-150, 14, 0.62], fov: 50, curva: 'suave' },
    { t: 33.6, pos: [-190, 18, 0.95], fov: 60, curva: 'suave' }
  ] };

// Cuásar → cuasar.m4a (31 s): una voz de hombre, íntima, cuenta cómo se enamoró. «El faro que siempre te encuentra»
// se calma al llegar (su gas casi se para) y se va encendiendo con la historia hasta «es mi mujer ideal».
//  vi        «Me enamoré de ella desde la primera vez que la vi» (0–3,2): se calma;
//  salir     «le pedí que saliéramos»: una primera chispa: un anillo de motas alrededor del disco;
//  novios    «le pedí que fuéramos novios» (8–9,3): la luz empieza a subir por los chorros;
//  increible «…es simplemente increíble» (10,6–13,3): sube más;
//  otras     «he conocido a muchas mujeres impresionantes, bellas y muy exitosas» (14,5–20,2): muchas lucecitas en
//            la galaxia de alrededor… que se apagan con «pero ella» (otrasFin);
//  reir      «Pero ella es la primera mujer que me hace reír» (21–25,5): el anillo ríe: ondas de luz que salen;
//  disfrutar «y disfrutar estar con ella» (26–27,2): todo se entibia (rosa y oro);
//  ideal     «Es mi mujer ideal» (27,6–28,7): el clímax: la luz llega a la punta de los chorros, una onda de motas sale
//            del disco y la luz del faro sube por ellos;
//  fin       se serena y vuelve a su estado normal.
// camara: el videoclip (formato: js/util/directorCamara.js). El recorrido del faro de antes pasado a la pista: siempre
// por fuera (elevación 23–30° sobre el disco, sin cruzar el disco ni los chorros): se acerca, un arco lento alrededor con
// «le pedí que saliéramos», a lo largo de los chorros con las otras mujeres y el encuadre final, quieto para «es mi mujer
// ideal». Con movimiento reducido no se mueve.
export const ESCENA_CUASAR = { id: 'cuasar', duracion: 31, camara: [
    { t: 0, pos: [0, 30, 1.04], curva: 'suave' },
    { t: 4.4, pos: [0, 30, 1.04], curva: 'suave' },
    { t: 14.4, pos: [100, 24, 1.0], curva: 'suave' },
    { t: 22, pos: [118, 23, 0.99], curva: 'suave' },
    { t: 27.7, pos: [138, 27, 0.97], curva: 'suave' }
  ], marcas: { inicio: 0, vi: 3.2, salir: 4.4, novios: 8, increible: 10.6, otras: 14.5, otrasFin: 20.2, reir: 21, risaFin: 25.5, disfrutar: 26, ideal: 27.6, cima: 28.7, fin: 31 } };

// Deneb: su escena, su pista de cámara y su estado viven aparte (js/util/escenaDeneb.js).
import { ESCENA_DENEB, estadoDeneb } from './escenaDeneb.js';
export { ESCENA_DENEB, estadoDeneb };

export const ESCENAS_GIGANTES = { pulsar: ESCENA_PULSAR, cuasar: ESCENA_CUASAR, deneb: ESCENA_DENEB };

// La misma escena para un audio de otra duración: todas las marcas (y el latido y el pulso) en proporción.
export function escalarEscena(config, duracion) {
  const k = duracion / config.duracion, por = v => v ? v * k : v;
  return { ...config, duracion, latido: por(config.latido), pulso: por(config.pulso), desfase: por(config.desfase), marcas: Object.fromEntries(Object.entries(config.marcas).map(([m, s]) => [m, s * k])) };
}

const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;
const suave = (s, a, b) => { const x = sat((s - a) / Math.max(1e-6, b - a)); return x * x * (3 - 2 * x); };
const mezcla = (a, b, k) => a + (b - a) * k;

// Velocidad de giro del púlsar en reposo dentro de la escena (fracción de la normal): casi quieto, pero vivo.
export const GIRO_QUIETO = 0.006;

// Latido de corazón en cada pulso de la canción («pum-pum»: el golpe y otro menor 0,17 s después), con el primer
// pulso de cada compás más fuerte. Devuelve 0–1 y deja en `e.edad` los segundos desde el último pulso.
export function latidoPulso(s, { pulso, compas = 4, desfase = 0 }, e, reducido = false) {
  const b = (s - desfase) / pulso, k = Math.floor(b), edad = (b - k) * pulso;
  e.edad = edad;
  const golpe = Math.exp(-edad / (reducido ? 0.3 : 0.13)), eco = !reducido && edad > 0.17 ? 0.45 * Math.exp(-(edad - 0.17) / 0.09) : 0;
  return (golpe + eco) * ((((k % compas) + compas) % compas) === 0 ? 1 : 0.62);
}

// Estado del púlsar en el segundo `s` (escribe en `e`, sin memoria nueva en cada cuadro). Fuera de la escena
// (s ≤ inicio o s ≥ fin) coincide con el estado normal: giro 1, tiempo 1, haces 1, apertura 1, motas 0.
//  giro      fracción de la velocidad de giro;  tiempo  fracción del ritmo de su gas (ondas, nudos, flujo);
//  pulso     el latido en este instante (0–~1,2: ya multiplicado por su fuerza), `edad` (s desde el último pulso)
//            y `fuerza` (0–1,15: cuánto late en esta parte de la canción);
//  haces     intensidad de los haces (1 la normal, con el latido);  apertura  anchura de los haces (1 la normal);
//  motasHaz  luz de las motas que llenan los haces (0–1);  nebulosa  frente de luz de la nebulosa (0 → 1,15:
//            hasta dónde, del centro hacia fuera, se han encendido sus motas);  brillo  luz de esas motas (0–1);
//  tibio     luz rosa y dorada de la segunda vuelta (0–1);  foco  cuánto se atenúa el resto del cielo (0–0,6).
export function estadoPulsar(s, config, e = {}, reducido = false) {
  const m = config.marcas, para = suave(s, m.inicio, m[config.parada || 'bailar']), vuelve = suave(s, m.fin - 2, m.fin);
  e.giro = mezcla(mezcla(1, GIRO_QUIETO, para), 1, vuelve);
  e.tiempo = mezcla(mezcla(1, 0.15, para), 1, vuelve);
  // La fuerza del latido crece con la canción: suave al empezar, se nota en «corazón», sube hacia el estribillo,
  // plena en él y algo más en la segunda vuelta.
  const fuerza = (suave(s, m.bailar - 0.4, m.bailar + 0.6) * 0.3 + suave(s, m.corazon - 0.3, m.corazon + 0.8) * 0.25 + suave(s, m.quererte, m.estribillo - 0.2) * 0.2
    + suave(s, m.estribillo - 0.2, m.estribillo + 0.2) * 0.25 + suave(s, m.segunda - 0.3, m.segunda + 0.6) * 0.15) * (1 - vuelve);
  e.pulso = latidoPulso(s, config, e, reducido) * fuerza * (reducido ? 0.4 : 1);
  e.fuerza = fuerza;
  // Los haces se van abriendo y encendiendo con la canción; en el estribillo, del todo (en un cuarto de segundo).
  const encendido = sat(suave(s, m.corazon - 0.5, m.corazon + 2) * 0.3 + suave(s, m.quererte, m.estribillo - 0.3) * 0.3 + suave(s, m.estribillo - 0.3, m.estribillo + (reducido ? 1.5 : 0.25)) * 0.4);
  e.haces = mezcla(mezcla(mezcla(1, 0.55, para), 2, encendido), 1, vuelve) * (1 + 0.9 * e.pulso);
  e.apertura = mezcla(mezcla(1, 1.9, encendido), 1, vuelve) * (1 + 0.1 * e.pulso);
  e.motasHaz = sat(suave(s, m.bailar - 0.4, m.corazon) * (0.35 + 0.65 * encendido)) * (1 - vuelve);
  // La nebulosa se enciende en el estribillo, del centro hacia fuera, y se apaga al volver a girar.
  e.nebulosa = 1.15 * suave(s, m.estribillo - 0.2, m.estribillo + (reducido ? 3 : 1.3));
  e.brillo = suave(s, m.estribillo - 0.2, m.estribillo + 0.6) * (1 - vuelve);
  e.tibio = suave(s, m.segunda - 0.5, m.segunda + 1.2) * (1 - vuelve);
  e.foco = 0.6 * para * (1 - vuelve);
  return e;
}

// Estado del cuásar en el segundo `s`. Fuera de la escena coincide con el normal (tiempo 1 y todo lo demás a 0).
//  tiempo    ritmo de su gas (se calma al llegar);  anillo  luz del anillo de motas alrededor del disco (0–1);
//  subida    hasta dónde ha subido la luz por los chorros (0 base – 1 punta) y luzChorro su intensidad (0–1);
//  otras     lucecitas en la galaxia de alrededor (0–1);  risa  ondas de luz que salen del anillo (0–1);
//  calido    rosa y oro (0–1);  cima  segundos desde «es mi mujer ideal» (−1 antes): la onda de motas que sale;
//  acento    la luz del faro subiendo por los chorros (0–1; −1 apagada);  foco  penumbra del resto (0–0,55).
export function estadoCuasar(s, { marcas: m }, e = {}, reducido = false) {
  const calma = suave(s, m.inicio, m.vi), vuelve = suave(s, m.fin - 2.3, m.fin);
  e.tiempo = mezcla(mezcla(1, reducido ? 0.2 : 0.3, calma), 1, vuelve);
  e.anillo = (suave(s, m.salir - 0.3, m.salir + 1.4) * 0.4 + suave(s, m.novios, m.novios + 1.5) * 0.15 + suave(s, m.increible, m.increible + 2) * 0.1
    + suave(s, m.reir - 0.3, m.reir + 1) * 0.15 + suave(s, m.ideal - 0.2, m.ideal + 0.5) * 0.2) * (1 - vuelve);
  e.subida = suave(s, m.novios, m.otras - 1.2) * 0.45 + suave(s, m.reir, m.disfrutar) * 0.25 + suave(s, m.ideal - 0.1, m.cima) * 0.3;
  e.luzChorro = suave(s, m.novios - 0.3, m.novios + 1) * (1 - vuelve);
  e.otras = suave(s, m.otras - 0.5, m.otras + 1.5) * (1 - suave(s, m.otrasFin + 0.3, m.reir + 1.2));
  e.risa = suave(s, m.reir, m.reir + 0.6) * (1 - suave(s, m.risaFin, m.disfrutar + 0.6)) * (reducido ? 0.4 : 1);
  e.calido = suave(s, m.disfrutar - 0.5, m.ideal + 0.3) * (1 - vuelve);
  e.cima = s >= m.ideal && s < m.fin ? s - m.ideal : -1;
  const dura = m.cima - m.ideal + 1.2;
  e.acento = s >= m.ideal && s < m.ideal + dura ? (s - m.ideal) / dura : -1;
  e.foco = 0.55 * calma * (1 - vuelve);
  return e;
}

// Director de una escena: lleva su segundo (del reloj que se le pase o, si no, del tiempo propio desde que
// empezó) y su peso (1 en escena; al cancelarla, baja suave a 0 con el último estado quieto, y el gigante
// vuelve a su estado normal). `reloj()` devuelve segundos desde el inicio del fragmento; si aún no sabe
// (null, NaN: el audio no ha empezado), la escena espera en el segundo en que está.
export function crearDirector(config, { salida = 1.5 } = {}) {
  let activa = false, terminada = false, t0 = 0, reloj = null, s = 0, peso = 0, cancelada = false, alTerminar = null, cfg = config;
  const cerrar = valor => { const f = alTerminar; alTerminar = null; f?.(valor); };
  return {
    get config() { return cfg; },
    get activa() { return activa; },
    get terminada() { return terminada; },
    get segundo() { return s; },
    get peso() { return peso; },
    // Algo que dibujar: en escena, saliendo de ella o (Deneb) con el mundo nuevo ya creado.
    get visible() { return peso > 0.0005; },
    iniciar(t, { reloj: r = null, config: c = null, alFin = null } = {}) {
      if (activa) cerrar(false);
      cfg = c || config; reloj = r; t0 = t; s = 0; activa = true; terminada = false; cancelada = false; peso = 1; alTerminar = alFin;
    },
    cancelar() {
      if (!activa && !terminada) return;
      const enCurso = activa; activa = false; terminada = false; cancelada = true;
      if (enCurso) cerrar(false);
    },
    avanzar(t, dt) {
      if (activa) {
        const r = reloj ? reloj() : t - t0;
        if (Number.isFinite(r)) s = Math.max(0, r);
        if (s >= cfg.duracion) {
          s = cfg.duracion; activa = false;
          // Lo que persiste (el mundo de Deneb) se queda hasta que se cancele al irse; lo demás ya está normal.
          if (cfg.persiste) terminada = true; else peso = 0;
          cerrar(true);
        }
      } else if (cancelada) {
        peso = Math.max(0, peso - dt / salida);
        if (peso === 0) cancelada = false;
      }
      return s;
    }
  };
}
