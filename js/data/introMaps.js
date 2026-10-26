// Los tiempos de «Maps» (Yeah Yeah Yeahs) en el fragmento de la intro (assets/musica/inicio.m4a = 62,624–94,621 s de la
// canción), en segundos DEL FRAGMENTO: aquí cae cada golpe del videoclip (js/ui/portada.js) y de aquí salen las marcas
// del momento «inicio» (js/data/bandaSonora.js).
// Cómo se midieron (2026-10-26): sobre la voz aislada (Demucs, audios-originales/.separado/dc518c07654a/…/vocals.wav)
// —el .m4a está alineado con el original a la muestra (correlación: 0,000 s)—:
//   · cada «say» empieza con su «s»: la sibilante (agudos > 6 kHz sobre graves) marca la sílaba y el arranque es la subida
//     de energía de la vocal justo después (180–2500 Hz); son los tiempos de SAY, con ±10 ms;
//   · cada «oh» va ligado a la sílaba anterior (sin ataque): cae en el 4.º tiempo del compás, donde la altura (pyin) cambia
//     o hay un corte glotal (3,47; 5,47; 7,48; 9,48); el primero, donde entra la voz (1,42);
//   · los tres «wait» son el portamento ascendente (de ~E3 a ~D#4 en 0,35 s) que abre cada frase: 11,88 y 15,88 (el
//     segundo, ligado al final de la frase anterior) y 23,89 (tras la nota larga);
//   · las frases de después (las tres empiezan igual: 13,39; 17,32; 25,32), la nota larga (20,00 → 23,75) y el final de
//     la voz (27,85), por la energía y la altura;
//   · Whisper large-v3 (tiempos por palabra, en Intro-Galaxia.analisis.json) da el orden de las palabras pero llega
//     0,2–1 s antes en este tramo (la reverberación): solo sirve para nombrarlas, no para el tiempo.
//   · Batería (instrumental Demucs, HPSS + onsets): un golpe fuerte de caja dos veces por compás (a +0,72 y +1,47 s del
//     compás), redobles en 11,24–11,50 y 29,96–30,71, platos en 29,45 y 31,47; compases (117,5 BPM) cada ~2,0 s.

// Las cinco series de llamadas: [oh, say, say, say]. 1.ª él, 2.ª ella, 3.ª él, 4.ª ella, 5.ª los dos.
export const SERIES = Object.freeze([
  [1.42, 1.936, 2.447, 2.978],
  [3.47, 3.991, 4.458, 4.966],
  [5.47, 5.962, 6.487, 6.986],
  [7.48, 7.985, 8.469, 8.977],
  [9.48, 9.938, 10.461, 10.96]
].map(s => Object.freeze(s)));
// Las frases de después: los tres «wait», las tres frases, la nota larga y el fin de la voz.
export const VOZ = Object.freeze({ espera1: 11.88, frase1: 13.39, espera2: 15.88, frase2: 17.32, notaLarga: 20.0, finNota: 23.75, espera3: 23.89, frase3: 25.32, finVoz: 27.85 });
// Compases (primer tiempo), de la pista de pulsos de scripts/analizar-audio.py.
export const COMPASES = Object.freeze([0, 1.97, 3.99, 6.01, 8.01, 10.03, 12.03, 14.02, 16.02, 18.02, 19.99, 22.01, 24.03, 26.01, 27.98, 30]);
// Golpes de caja (y platos) de la batería: [segundo, fuerza 0–1]. Para la cámara.
export const CAJA = Object.freeze([
  [0.69, 0.5], [1.44, 0.8], [2.70, 0.8], [3.46, 0.6], [4.71, 0.45], [5.46, 0.6], [5.98, 0.5], [6.72, 0.4], [7.47, 0.6], [8.72, 0.8],
  [9.47, 0.6], [10.735, 1], [11.24, 0.8], [11.50, 0.65], [12.74, 0.5], [13.475, 0.6], [14.715, 0.45], [15.46, 0.6], [16.71, 0.5],
  [17.457, 0.65], [18.70, 0.5], [19.46, 0.65], [20.70, 0.65], [21.46, 0.4], [22.72, 0.65], [23.47, 0.5], [24.71, 0.4], [25.46, 0.45],
  [26.70, 0.45], [27.21, 0.6], [28.70, 0.6], [29.45, 0.85], [29.96, 0.5], [30.22, 0.4], [30.46, 0.5], [30.71, 0.6], [31.47, 0.8]
].map(g => Object.freeze(g)));

// Los hitos del videoclip (js/ui/portada.js explica cada uno), en la voz o en un compás.
export const HITOS_INTRO = Object.freeze({
  luzCarlos: SERIES[0][0], luzXiomara: SERIES[1][0], mapa: SERIES[2][0], ruta: SERIES[3][0], juntos: SERIES[4][0],
  espera: VOZ.espera1, respuesta: VOZ.espera2, encuentro: COMPASES[10], nombres: COMPASES[11], cielo: VOZ.espera3, globo: VOZ.frase3,
  mundo: COMPASES[13], salto: COMPASES[14], tarjeta: COMPASES[15]
});
// Las marcas del momento «inicio» (js/data/bandaSonora.js): los hitos y, además, cada sílaba de las llamadas
// (serie1 … serie5 = la exclamación; serie1a/b/c = sus tres sílabas) y las frases de después.
export const MARCAS_INTRO = Object.freeze({
  ...HITOS_INTRO,
  ...Object.fromEntries(SERIES.flatMap((s, i) => s.map((t, j) => [`serie${i + 1}${j ? 'abc'[j - 1] : ''}`, t]))),
  ...VOZ
});
