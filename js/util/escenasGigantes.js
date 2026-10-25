// Escenas propias de dos gigantes al llegar (como la de la supernova): el púlsar del Cangrejo y Deneb.
// Cada una va con un fragmento de audio que aún no tenemos, así que se define solo por su DURACIÓN y
// unas MARCAS en segundos. Al llegar el audio basta con ajustar estos números (o escalarlos con
// `escalarEscena`) y pasar su reloj: `bandaSonora.tiempo(id)` en vez del tiempo propio desde la llegada.
// Aquí solo hay números y curvas (sin three.js): las pruebas las comprueban sin navegador.

// Púlsar (28 s de voz): «no podía dejar de verla… era como si hubiera tomado mi corazón… entonces supe
// que la palabra hermosa existía para cosas así».
//  quieto   el giro y los destellos bajan hasta casi detenerse (el tiempo se para para mirarlo);
//  corazon  los haces ya se han ido abriendo y encendiendo con la frase;
//  hermosa  los haces se encienden del todo y la nebulosa se ilumina con motas, del centro hacia fuera;
//  vuelta   empieza a girar otra vez; en `fin` ya gira normal.
export const ESCENA_PULSAR = { id: 'pulsar', duracion: 28, marcas: { inicio: 0, quieto: 3, corazon: 15, hermosa: 21, vuelta: 26, fin: 28 } };

// Deneb (36 s de canción: «construir un mundo nuevo para los dos, contigo en el medio»).
//  inicio     la estrella late suave (`latido`: segundos entre latidos, a ajustar al tempo de la canción);
//  subida     su luz crece: una corona de motas que se abre;
//  estribillo nace a su alrededor un disco de motas que gira;
//  mundo      el disco ya se ha ordenado en un corazón (su órbita) con un mundo pequeño y luminoso que la
//             recorre, y Deneb en el medio;
//  calma      todo se serena; en `fin` queda el mundo nuevo orbitando mientras se esté allí.
export const ESCENA_DENEB = { id: 'deneb', duracion: 36, latido: 1.05, persiste: true, marcas: { inicio: 0, subida: 8, estribillo: 16, mundo: 22, calma: 32, fin: 36 } };

export const ESCENAS_GIGANTES = { pulsar: ESCENA_PULSAR, deneb: ESCENA_DENEB };

// La misma escena para un audio de otra duración: todas las marcas (y el latido) en proporción.
export function escalarEscena(config, duracion) {
  const k = duracion / config.duracion;
  return { ...config, duracion, latido: config.latido ? config.latido * k : config.latido, marcas: Object.fromEntries(Object.entries(config.marcas).map(([m, s]) => [m, s * k])) };
}

const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;
const suave = (s, a, b) => { const x = sat((s - a) / Math.max(1e-6, b - a)); return x * x * (3 - 2 * x); };
const mezcla = (a, b, k) => a + (b - a) * k;

// Velocidad de giro del púlsar en reposo dentro de la escena (fracción de la normal): casi quieto, pero vivo.
export const GIRO_QUIETO = 0.006;

// Estado del púlsar en el segundo `s` (escribe en `e`, sin memoria nueva en cada cuadro). Fuera de la escena
// (s ≤ inicio o s ≥ fin) coincide con el estado normal: giro 1, tiempo 1, haces 1, apertura 1, motas 0.
//  giro      fracción de la velocidad de giro;  tiempo  fracción del ritmo de su gas (ondas, nudos, flujo);
//  haces     intensidad de los haces (1 la normal);  apertura  anchura de los haces (1 la normal);
//  motasHaz  luz de las motas que llenan los haces (0–1);  nebulosa  frente de luz de la nebulosa (0 → 1,15:
//            hasta dónde, del centro hacia fuera, se han encendido sus motas);  brillo  luz de esas motas (0–1);
//  foco      cuánto se atenúa el resto del cielo alrededor (0–0,6).
export function estadoPulsar(s, { marcas: m }, e = {}, reducido = false) {
  const para = suave(s, m.inicio, m.quieto), vuelve = suave(s, m.vuelta, m.fin);
  e.giro = mezcla(mezcla(1, GIRO_QUIETO, para), 1, vuelve);
  e.tiempo = mezcla(mezcla(1, 0.12, para), 1, vuelve);
  // Primero los haces se apagan un poco al pararse; después se abren y encienden con la frase y, en
  // «hermosa», del todo (un segundo). Con movimiento reducido el último paso es más lento.
  const frase = suave(s, m.quieto, m.corazon) * 0.55 + suave(s, m.corazon, m.hermosa - 0.6) * 0.25;
  const pleno = suave(s, m.hermosa - 0.6, m.hermosa + (reducido ? 1.6 : 0.5));
  const encendido = sat(frase + pleno * 0.2);   // 0 → 1 de «quieto» a «hermosa»
  e.haces = mezcla(mezcla(mezcla(1, 0.5, para), 2.2, encendido), 1, vuelve);
  e.apertura = mezcla(mezcla(1, 1.9, encendido), 1, vuelve);
  e.motasHaz = sat(suave(s, m.quieto - 0.5, m.quieto + 2) * (0.3 + 0.7 * encendido)) * (1 - vuelve);
  // La nebulosa se enciende en «hermosa», del centro hacia fuera, y se apaga despacio al volver a girar.
  e.nebulosa = 1.15 * suave(s, m.hermosa - 0.3, m.hermosa + (reducido ? 3 : 1.5));
  e.brillo = suave(s, m.hermosa - 0.3, m.hermosa + 0.8) * (1 - suave(s, m.vuelta, m.fin));
  // Penumbra del resto (la telaraña se atenúa: el tiempo se para y solo queda mirarlo).
  e.foco = 0.6 * para * (1 - vuelve);
  return e;
}

// Estado de Deneb en el segundo `s`. Al terminar (s ≥ fin) queda el estado de calma con el mundo nuevo.
//  latido  fuerza del latido (0–1) y `pum` su valor en este instante (0–1, doble: «pum-pum»);
//  luz     luz que crece con la subida (0–1);  corona  hasta dónde se ha abierto su corona de motas (0–1);
//  nace    aparición del disco de motas (0–1);  forma  cuánto se ha ordenado en el corazón (0–1);
//  mundo   el mundo pequeño ya formado (0–1);  calma  serenidad del final (0–1);
//  foco    cuánto se atenúa el resto del cielo alrededor (0–0,55).
export function estadoDeneb(s, config, e = {}, reducido = false) {
  const m = config.marcas, fin = Math.min(s, m.fin);
  e.calma = suave(fin, m.calma, m.fin);
  e.latido = suave(fin, m.inicio, m.inicio + 2) * (1 - 0.55 * e.calma);
  const f = (Math.max(0, s - m.inicio) / config.latido) % 1;
  e.pum = Math.exp(-((f / 0.07) ** 2)) + 0.6 * Math.exp(-(((f - 0.24) / 0.07) ** 2));
  e.luz = suave(fin, m.subida, m.estribillo) * (1 - 0.45 * e.calma);
  e.corona = suave(fin, m.subida - 1, m.estribillo + 2);
  const formacion = m.mundo - m.estribillo;
  e.nace = suave(fin, m.estribillo - 0.4, m.estribillo + formacion * (reducido ? 0.6 : 0.4));
  e.forma = suave(fin, m.estribillo + formacion * 0.2, m.mundo);
  e.mundo = suave(fin, m.mundo - formacion * 0.35, m.mundo + 1.5);
  e.foco = 0.55 * suave(fin, m.subida, m.estribillo) * (1 - 0.4 * e.calma);
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
