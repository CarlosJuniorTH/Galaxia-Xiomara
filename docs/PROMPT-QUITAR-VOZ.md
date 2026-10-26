# Prompt para Claude Code — Instrumentales de las estancias: la canción real, solo sin la voz

> Antes de pegarlo: copia en `scripts/` del repo los 6 archivos que acompañan a este prompt
> (`separacion_comun.py`, `separar-candidatos.py`, `comparar-separaciones.py`, `escucha-ciegas.py`,
> `verificar-alineacion.py`, `quitar-voz.py`) y este archivo en `docs/`. Luego pega el texto de abajo en Claude Code
> dentro del repo `Galaxia-Xiomara` (con `audios-originales/` en su sitio).

---

Vas a rehacer, con método y medidas, las instrumentales de las **estancias** de Galaxia-Xiomara: la música que suena en cada uno de los 6 grandes (cuásar, supernova, púlsar, los dos agujeros negros —TON 618 y Sagitario A*— y Deneb) y en casa cuando termina su clip. Trabaja por fases, enséñame resultados al final de cada fase y no pases a la siguiente sin enseñármelos.

## Lo que quiero (y lo que NO)

- Cada estancia es **la misma grabación original con la voz quitada**. Nada más.
- **PROHIBIDO** sintetizar, imitar o añadir nada: ni pianos, ni melodías reconstruidas (pYIN/notas), ni instrumentales de otras canciones, ni loops, ni empalmes de trozos distintos. Eso ya se probó (commit `299698d`) y suena falso, no sigue el ritmo. Si en algún momento te parece que «rellenar» mejoraría algo, **pregúntame antes**.
- La instrumental tiene que ir **muestra a muestra** con la canción original: mismo tempo, compás, tonalidad y fase. Se comprueba (ver Fase 4).
- Ningún separador del mundo es perfecto: donde voz e instrumentos comparten frecuencias siempre queda algo (restos de voz o «gorgoteo»). El objetivo es el **mínimo audible**, medido y escuchado, no prometer el 100 %.

## Contexto del repo (léelo antes de tocar nada)

- `js/data/bandaSonora.js` y `js/ui/bandaSonora.js`: qué suena dónde y el mezclador (funde 3 s del clip a la estancia).
- `scripts/preparar-estancias.py`: tramos (`PLANES`) y codificación (−20 LUFS, AAC 128k, `assets/musica/indice.json`). Lee la separación de `audios-originales/.separado/<huella>/<carpeta>/instrumental.wav`.
- `scripts/separar-instrumental.py`, `scripts/ensamblar-instrumental.py`: la separación actual = media de **BS-RoFormer viperx 1297** (`model_bs_roformer_ep_317_sdr_12.9755.ckpt`) y **MelBand Inst V2** (`melband_roformer_inst_v2.ckpt`); en casa y cuásar solo BS-RoFormer (Inst V2 dejaba letra que Whisper oía).
- `scripts/analizar-audio.py`: huellas, compases y transcripción con faster-whisper.
- `scripts/verificar-estancias.py`: comprobaciones actuales.
- **Scripts nuevos ya escritos para esta tarea** (léelos enteros antes de ejecutarlos; están probados de principio a fin con un separador simulado y con los `.m4a` reales del repo, pero NO con los modelos reales: si algo falla con los modelos de verdad, corrígelo y dime qué cambiaste):
  - `scripts/separacion_comun.py`: rutas relativas al repo, caché `.separado/<huella>/`, lectura/escritura, corrección de ganancia, SDR y ensembles (`avg_wave`, `min_spec`, `max_spec`). Lee `PLANES` de `preparar-estancias.py` sin ejecutarlo.
  - `scripts/separar-candidatos.py`: separa con los modelos sueltos, construye los ensembles y presets a partir de ellos sin volver a separar, y MVSEP opcional. Admite `--solo`, `--modelo nombre=archivo.ckpt`, `--ensemble nombre=a+b:metodo`, `--mvsep sep_type[:add_opt1]`, `--archivos`, `--listar`.
  - `scripts/comparar-separaciones.py`: `preparar` (mezclas de prueba con verdad conocida) y `medir` (SDR, pérdida/sobrante, fuga de voz, integridad por bandas, Whisper) → `.pruebas/separaciones/comparacion.{md,json}`.
  - `scripts/escucha-ciegas.py`: página local A/B/C/D con el original de referencia y saltos a los momentos con más voz → `.pruebas/escucha/index.html`.
  - `scripts/verificar-alineacion.py`: clip→estancia y original→estancia (graves, correlación ≥ 0,9, desfase 0 ms); sale con código 1 si falla. Hoy, con lo publicado, da OK en las seis (r = 0,92–0,97).
  - `scripts/quitar-voz.py`: herramienta rápida para una canción suelta (no sustituye a lo anterior).
- Las rutas de los scripts viejos están fijadas a `/home/carlos/...` y usan `flock`: hazlas relativas a la raíz del repo (`Path(__file__).resolve().parent.parent`) y que funcionen igual en Linux y Windows.

## Estado del arte (investigado, octubre 2026) — de aquí salen los candidatos

- Los modelos actuales ya son de la familia buena, pero no los mejores: en las puntuaciones de `audio-separator`, viperx 1297 da **16,45 dB** de SDR de instrumental e Inst V2 **16,06 dB**. Hay modelos abiertos más nuevos por encima (p. ej. `bs_roformer_vocals_gabox.ckpt` 17,21 dB en la misma tabla; en la tabla Multisong de MVSEP: becruily «deux» 17,66, unwa HyperACE v2 17,40–17,70, Resurrection 17,25).
- `audio-separator` **0.47.1** (pip) ya trae esos modelos y **presets de ensemble** de la guía de la comunidad UVR (deton24): `instrumental_clean` (gabox Fv7z + Resurrection Inst, el de menos voz), `instrumental_full` (Inst v1e+ + becruily inst, el más «lleno»), `instrumental_balanced` (gabox INSTV8 + Resurrection Inst). Opciones CLI: `--list_models --list_filter instrumental`, `--list_presets`, `--ensemble_preset`, `--extra_models`, `--ensemble_algorithm` (`avg_wave`, `avg_fft`, `uvr_max_spec`, `uvr_min_spec`…).
- El mejor por métricas ahora mismo es **MVSEP BS Roformer 124 bands (ver. 2026.07)**: **18,64 dB** de instrumental en Multisong (vs 17,17 del viperx en esa misma tabla). Es de MVSEP (no descargable), con **API** (`POST https://mvsep.com/api/separation/create` con `api_token`, `audiofile`, `sep_type`, `output_format=4` = WAV 32 bits; sondeo en `GET /api/separation/get?hash=`; lista de algoritmos y su `render_id` en `GET /api/app/algorithms`). Es premium/de pago. **Solo lo usas si te doy un `MVSEP_API_TOKEN` en una variable de entorno**; sin token, se salta.
- Las empresas grandes (LALAL.AI «Andromeda», AudioShake, Moises/Music.AI, Logic Stem Splitter, iZotope RX) son cerradas y no publican métricas comparables entre sí; las pruebas independientes ponen los ensembles RoFormer de UVR a su nivel o por encima. No hace falta pagarlas: compite contra ellas con las medidas de abajo.

## Fase 0 — Comprobar qué está oyendo Carlos (antes de separar nada)

1. Confirma que `main` está publicado: el último despliegue de Pages terminó bien y `assets/musica/*-estancia.m4a` en la web coincide en bytes con el repo.
2. Recuerda que el service worker (`sw.js`, generado por `scripts/preparar-pages.mjs`) guarda la versión vieja en el móvil hasta pulsar «Actualizar». Dime cómo forzarlo en iPhone y Android.
3. Enséñame una tabla con lo que hay ahora en cada estancia: canción, tramo, separación usada.

## Fase 1 — Entorno y separaciones candidatas

- Entorno en `.pruebas/audio` con `audio-separator[gpu]==0.47.1 scipy faster-whisper` (detecta GPU; si no hay, avísame del tiempo estimado en CPU antes de lanzar).
- Separa las canciones de las estancias (`Supernova-Galaxia`, `Galaxia-Analizar1`, `Deneb-Galaxia`, `Galaxia-Analizar4`, `Galaxia-Analizar2`, `Galaxia-Analizar3`) **enteras**, en WAV float, con:
  1. **Base**: lo actual (`ensamble` y `bsrof1297`).
  2. Modelos sueltos: `bs_roformer_instrumental_resurrection_unwa.ckpt`, `mel_band_roformer_instrumental_becruily.ckpt`, `bs_roformer_vocals_gabox.ckpt`, `mel_band_roformer_instrumental_fv7z_gabox.ckpt`, y el HyperACE v2 / becruily «deux» si están en `--list_models` (si no están, dilo; no los descargues de sitios raros).
  3. Presets: `instrumental_clean`, `instrumental_balanced`, `instrumental_full`.
  4. Ensembles propios: los 2–3 mejores modelos de la fase 2, con `avg_wave` (con corrección de ganancia como en `ensamblar-instrumental.py`) y con `uvr_min_spec` (el que menos voz deja).
  5. MVSEP 124 bands, solo con token.
- Todo en la caché `audios-originales/.separado/<huella>/<nombre-candidato>/{instrumental,vocals}.wav`. Si un modelo devuelve la instrumental con otra ganancia, corrígela por mínimos cuadrados para que instrumental + voz reconstruya el original.
- Comandos (con el Python de `.pruebas/audio`):
  ```
  python scripts/separar-candidatos.py --listar                 # qué hay ya
  python scripts/separar-candidatos.py                          # sueltos + ensembles + presets, en las 6 canciones
  python scripts/separar-candidatos.py --modelo hyperace=<archivo.ckpt> --modelo deux=<archivo.ckpt>   # si están en `audio-separator -l`
  python scripts/separar-candidatos.py --mvsep <render_id>      # solo con MVSEP_API_TOKEN; el id sale de GET /api/app/algorithms
  ```
- Si un modelo no carga, el script lo dice y sigue. Apúntalo en la tabla como «no disponible».

## Fase 2 — Medir (números, no impresiones)

Usa `scripts/comparar-separaciones.py` (ya escrito; amplíalo si hace falta), que puntúa cada candidato en cada canción **dentro del tramo que usa su estancia** (`PLANES` de `preparar-estancias.py`):

1. **SDR con verdad conocida**: el método del repo. Toma tramos donde la canción ya es instrumental (sin voz según Whisper + energía), súmales voz real aislada de la misma canción, separa esa mezcla y compara con el tramo original. Reporta SDR, y fullness/bleedless al estilo MVSEP (energía de espectro perdida vs. sobrante).
2. **Voz residual en el tramo real**: (a) faster-whisper large-v3 sobre la instrumental: nº de palabras reconocidas (objetivo 0); (b) energía en banda de voz (200–4000 Hz) de la instrumental en los instantes con voz, relativa a la mezcla.
3. **Integridad del instrumental**: energía por bandas (graves < 150 Hz, medios, agudos > 8 kHz) de la instrumental vs. la mezcla en tramos sin voz: no debe perder bombo, bajo ni brillo (> −0,5 dB en cada banda).
4. **Artefactos**: planitud espectral/ruido en los silencios de la voz (el «gorgoteo»).

```
python scripts/comparar-separaciones.py preparar
python scripts/separar-candidatos.py --archivos "audios-originales/.pruebas-sdr/*.wav"
python scripts/comparar-separaciones.py medir --whisper
```
Revisa que `preparar` encuentre tramos sin voz de verdad en cada canción (si en alguna no hay 10 s seguidos, prueba `--duracion 6` y dímelo). La voz de las mezclas de prueba trae algo de instrumento colado (es voz separada): afecta a todos los candidatos por igual, así que vale para ordenar, no como cifra absoluta.

Salida: una tabla por canción y un ranking global. Elige por canción el candidato con **0 palabras de Whisper** y mejor SDR; en empate, más integridad. Enséñame la tabla antes de seguir.

## Fase 3 — Escucha a ciegas (la decisión final es mía)

`python scripts/escucha-ciegas.py --top 3 --segundos 40` genera `.pruebas/escucha/index.html` (local, no se publica): por cada estancia, los 3 mejores candidatos + el actual, con nombres ocultos (A/B/C/D), y en cada uno tres botones que saltan a los momentos más difíciles (donde la voz cantaba más fuerte). Debajo, un botón «revelar». Cada audio en m4a 192k, 30–40 s. Me lo pasas y espero mi elección.

## Fase 4 — Construir y verificar

1. `preparar-estancias.py` con la separación elegida por estancia (añade `separacion` por lugar en `PLANES`). Los tramos no se tocan salvo que me lo propongas y lo apruebe.
2. Ampliar `verificar-estancias.py` (y que falle si algo no cumple):
   - **Alineación con el original** (`python scripts/verificar-alineacion.py`, y añádelo a `npm test` o a `verificar-estancias.py`): en los 3 s del fundido, correlación de graves (< 150 Hz) entre el final del clip y el inicio de la estancia ≥ 0,9 con desfase 0 ms. (Hoy da 0,92–0,97 a 0 ms: no empeorar.)
   - Whisper: 0 palabras en cada estancia.
   - Sin clics, sin silencios a mitad, −20 LUFS ±0,5, pico ≤ −1,5 dBTP.
3. `npm test` en verde (incluido `tests/banda-sonora.test.js`).
4. Commit claro (qué modelo quedó en cada estancia y sus números) y push a `main`, que regenera `sw.js` para que el móvil ofrezca la actualización.

## Reglas de trabajo

- Nada de inventar resultados: si un modelo no carga, no está o no se puede medir, dilo.
- No borres las separaciones viejas de la caché; los candidatos van en carpetas propias.
- No subas a git nada de `audios-originales/` ni de `.pruebas/`.
- Al final, un resumen corto: qué ha cambiado en cada estancia, cuánto mejora en números y qué limitación queda (si queda algo de voz en algún punto, dime el segundo exacto).
