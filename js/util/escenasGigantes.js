// Escenas propias de tres gigantes al llegar (como la de la supernova): el púlsar del Cangrejo, el cuásar y Deneb.
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
export const ESCENA_PULSAR = { id: 'pulsar', duracion: 33.6, pulso: 60 / 108, compas: 4, desfase: 0, parada: 'bailar', marcas: { inicio: 0, bailar: 1.4, corazon: 4.9, quererte: 12.5, estribillo: 15, segunda: 28, fin: 33.6 } };

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
// camara: el videoclip. En cada marca (más un desfase en segundos) la cámara hace un tramo del recorrido del faro
// (index.js, faro: siempre por fuera, sin cruzar el disco ni los chorros): se acerca, un arco lento alrededor, a lo largo
// de los chorros y el encuadre final, que queda quieto para «es mi mujer ideal». Con movimiento reducido no se mueve.
export const ESCENA_CUASAR = { id: 'cuasar', duracion: 31, camara: [['inicio', 0, 'inicio'], ['salir', 0, 'arco'], ['otras', 0, 'chorros'], ['reir', 1.2, 'final']], marcas: { inicio: 0, vi: 3.2, salir: 4.4, novios: 8, increible: 10.6, otras: 14.5, otrasFin: 20.2, reir: 21, risaFin: 25.5, disfrutar: 26, ideal: 27.6, cima: 28.7, fin: 31 } };

// Deneb → deneb.m4a (43,4 s): «Middle» (DJ Snake), a 103 BPM (un compás cada 2,33 s). La supergigante late suave con
// cada pulso de la canción (más en el primero de cada compás) y, con la canción, nace a su alrededor un mundo nuevo con ella en el medio.
//  atras       «I hope that I can turn back the time» (3,1–5,2): el tiempo retrocede: el viento de motas vuelve a la estrella;
//  bien        «to make it all alright… for us» (5,7–9,6): su luz crece;
//  prometo     «I promise to build a new world for us two» (11–15,4): nace un disco de motas que se ordena en un corazón
//              (su órbita) con un mundo pequeño y luminoso que lo recorre (prometoFin: ya ordenado);
//  contigo     «with you…» (16–17,5): el mundo ya formado brilla;
//  estribillo  «…in the middle» (20,6): el gran momento: una onda de luz sale de Deneb, en el centro, y enciende el corazón;
//  segunda     segunda vuelta del estribillo: otra onda, aún más cálida;
//  fundido     fundido final (41–43,4): se serena; en `fin` queda en calma con el mundo nuevo orbitando, sin volver a empezar.
export const ESCENA_DENEB = { id: 'deneb', duracion: 43.4, pulso: 60 / 103, compas: 4, desfase: 0, persiste: true, marcas: { inicio: 0, atras: 3.1, atrasFin: 5.2, bien: 5.7, prometo: 11, prometoFin: 15.4, contigo: 16, estribillo: 20.6, segunda: 32, fundido: 41, fin: 43.4 } };

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

// Estado de Deneb en el segundo `s`. Al terminar (s ≥ fin) queda el estado de calma con el mundo nuevo.
//  latido  fuerza del latido (0–1) y `pum` su valor en este instante (0–1, doble: «pum-pum»);
//  viento  velocidad del viento de motas (1 hacia fuera; negativa: el tiempo vuelve atrás);
//  luz     luz que crece con la canción (0–1);  nace  aparición del disco de motas (0–1);
//  forma   cuánto se ha ordenado en el corazón (0–1);  mundo  el mundo pequeño ya formado (0–1);
//  onda    luz de la onda que sale de Deneb en el estribillo (0–1) y `ondaR` su radio (unidades de Deneb);
//  calma   serenidad del final (0–1);  foco  cuánto se atenúa el resto del cielo alrededor (0–0,55).
export function estadoDeneb(s, config, e = {}, reducido = false) {
  const m = config.marcas, fin = Math.min(s, m.fin);
  e.calma = suave(fin, m.fundido, m.fin);
  e.latido = suave(fin, m.inicio, m.inicio + 2) * (1 - 0.55 * e.calma);
  e.pum = latidoPulso(Math.max(0, s), config, e, reducido);   // al compás de la canción (pulsos de 0,58 s, compases de 2,33 s)
  e.viento = 1 - (reducido ? 1.3 : 2.6) * suave(fin, m.atras - 0.2, m.atras + 0.6) * (1 - suave(fin, m.atrasFin, m.bien));
  e.luz = suave(fin, m.bien - 0.3, m.prometo) * (1 - 0.45 * e.calma);
  const formacion = m.prometoFin - m.prometo;
  e.nace = suave(fin, m.prometo - 0.4, m.prometo + formacion * (reducido ? 0.6 : 0.4));
  e.forma = suave(fin, m.prometo + formacion * 0.2, m.prometoFin);
  e.mundo = suave(fin, m.prometoFin - 1.5, m.contigo + 1.5);
  // Ondas del estribillo: salen de Deneb a unas 190 unidades por segundo y se apagan al pasar el corazón.
  const onda = (marca, fuerza) => { const t = fin - marca; return t >= 0 && t < 2.2 ? [t * 190, fuerza * Math.min(1, t * 6) * (1 - suave(t, 1.2, 2.2))] : null; };
  const o = onda(m.segunda, 1) || onda(m.estribillo, 1);
  e.ondaR = o ? o[0] : 0; e.onda = o ? o[1] * (reducido ? 0.5 : 1) : 0;
  e.calido = suave(fin, m.segunda - 0.3, m.segunda + 1.5) * (1 - 0.5 * e.calma);
  e.foco = 0.55 * suave(fin, m.bien, m.prometo) * (1 - 0.4 * e.calma);
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
