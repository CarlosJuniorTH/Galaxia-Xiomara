# Compara con números las separaciones candidatas (separar-candidatos.py) de cada estancia.
#
#   1. preparar → mezclas de prueba con verdad conocida: tramos de la canción que YA son instrumentales (sin voz) +
#      voz real aislada de la misma canción. Se guardan en audios-originales/.pruebas-sdr/ para separarlas igual:
#         python scripts/comparar-separaciones.py preparar
#         python scripts/separar-candidatos.py --archivos "audios-originales/.pruebas-sdr/*.wav"
#   2. medir → en el tramo REAL de cada estancia (PLANES de preparar-estancias.py) y en las mezclas de prueba:
#      · SDR (dB, más = mejor) contra la instrumental verdadera, y energía perdida / sobrante (al estilo fullness /
#        bleedless de MVSEP: dB de espectro que falta y que sobra; más negativo = mejor).
#      · fuga de voz: correlación de la instrumental con la voz de referencia donde se canta (dB, más negativo = mejor).
#      · integridad: diferencia de energía por bandas (graves / medios / agudos) frente al original donde no hay voz
#        (0 dB = no se ha perdido nada del instrumental).
#      · whisper (con --whisper): palabras que faster-whisper reconoce en la instrumental (objetivo: 0).
#         python scripts/comparar-separaciones.py medir [--whisper] [--lugares supernova deneb]
#   Escribe .pruebas/separaciones/comparacion.{json,md} con la tabla, el ranking y los momentos difíciles de cada tramo
#   (los usa escucha-ciegas.py).
import argparse, json, sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from separacion_comun import (RAIZ, SR, ORIGINALES, planes, ruta_cancion, carpeta, decodificar, leer, escribir, igualar,
                              sdr, db, rms_frames, ensemble, ruta_candidato, candidatos_de, guardar_json, leer_candidato)

PRUEBAS = ORIGINALES / '.pruebas-sdr'
SALIDA = RAIZ / '.pruebas' / 'separaciones'
REFERENCIAS = ['bsrof1297', 'resurrection-inst', 'becruily-inst', 'gabox-bs-voc', 'ensamble']   # para la voz de referencia
HOP = 0.1


def voz_referencia(cancion: Path, a=0, b=None):
    """La voz más «limpia» posible: mínimo espectral de las voces de varios modelos (lo que todos coinciden en que es
    voz). Sirve para saber dónde y cuánto se canta, y para medir la fuga."""
    disp = [c for c in REFERENCIAS if (ruta_candidato(cancion, c) / 'vocals.wav').exists()]
    if not disp: disp = candidatos_de(cancion)[:3]
    if not disp: raise RuntimeError(f'{cancion.name}: no hay separaciones; ejecuta antes separar-candidatos.py')
    voces = [leer_candidato(cancion, c, 'vocals', a, b) for c in disp[:4]]
    return ensemble(voces, 'min_spec') if len(voces) > 1 else voces[0], disp[:4]


def suave(d, segundos=1.0):
    """Media móvil (en energía) de una curva en dB por ventanas de HOP: quita los huecos entre golpes y sílabas."""
    k = max(1, int(segundos / HOP)); e = np.convolve(10 ** (d / 10), np.ones(k) / k, 'same')
    return db(e)


def zonas(mascara, minimo):
    """Tramos contiguos (en ventanas de HOP) donde mascara es True y duran ≥ minimo s → [(ini, fin)] en muestras."""
    out, ini = [], None
    for k, v in enumerate(list(mascara) + [False]):
        if v and ini is None: ini = k
        if not v and ini is not None:
            if (k - ini) * HOP >= minimo: out.append((int(ini * HOP * SR), int(k * HOP * SR)))
            ini = None
    return out


# ---------------- preparar ----------------

def preparar(A):
    PRUEBAS.mkdir(parents=True, exist_ok=True); (PRUEBAS / 'verdad').mkdir(exist_ok=True)
    indice = {}
    for nombre in dict.fromkeys(p['cancion'] for p in planes().values()):
        c = ruta_cancion(nombre); m = leer(decodificar(c)); v, refs = voz_referencia(c)
        rm, rv = igualar(suave(rms_frames(m, HOP)), suave(rms_frames(v, HOP)))
        # sin voz: la voz de referencia 30 dB por debajo de la mezcla o de lo que suena la voz cuando canta
        sin_voz = (rv < rm - 30) | (rv < np.percentile(rv, 95) - 30)
        sin_voz &= rm > np.median(rm) - 20                # que el instrumental suene (no silencios ni fundidos)
        dur = A.duracion; tramos = zonas(sin_voz, dur)
        if not tramos and A.duracion_minima < dur:   # canciones sin 10 s seguidos sin voz: tramos más cortos
            dur = A.duracion_minima; tramos = zonas(sin_voz, dur)
            if tramos: print(f'{nombre}: no tiene {A.duracion:.0f} s seguidos sin voz; uso tramos de {dur:.0f} s')
        if not tramos: print(f'{nombre}: no tiene {dur:.0f} s seguidos sin voz; se salta'); continue
        # voz: la ventana de dur con más voz
        n = int(dur * SR); e = np.convolve(10 ** (rv / 10), np.ones(int(dur / HOP)), 'valid')
        k0 = int(np.argmax(e) * HOP * SR); voz = v[k0:k0 + n]
        for j, (i0, i1) in enumerate(tramos[:A.max_tramos]):
            verdad = m[i0:i0 + n]
            if len(verdad) < n: continue
            mezcla = verdad + voz[:len(verdad)]
            pico = np.abs(mezcla).max()
            if pico > 0.99: mezcla *= 0.99 / pico; verdad = verdad * 0.99 / pico
            base = f'{nombre}-{j}'
            escribir(PRUEBAS / f'{base}.wav', mezcla); escribir(PRUEBAS / 'verdad' / f'{base}.wav', verdad)
            indice[base] = dict(cancion=nombre, duracion=dur, instrumental_desde=round(i0 / SR, 2), voz_desde=round(k0 / SR, 2), referencias=refs)
            print(f'{base}: instrumental {i0 / SR:.1f}s + voz {k0 / SR:.1f}s')
    guardar_json(PRUEBAS / 'indice.json', indice)
    print(f'\nAhora: python scripts/separar-candidatos.py --archivos "{PRUEBAS / "*.wav"}"')


# ---------------- medir ----------------

def bandas_db(x):
    from scipy.signal import welch
    f, p = welch(x.mean(1) if x.ndim == 2 else x, fs=SR, nperseg=4096)
    tramo = lambda lo, hi: db(p[(f >= lo) & (f < hi)].sum())
    return np.array([tramo(20, 150), tramo(150, 4000), tramo(8000, 20000)])


def perdida_sobrante(verdad, est):
    """dB de espectro que falta / que sobra respecto a la verdad (magnitudes STFT)."""
    from scipy.signal import stft
    V = np.abs(stft(verdad.mean(1), fs=SR, nperseg=2048)[2]); E = np.abs(stft(est.mean(1), fs=SR, nperseg=2048)[2])
    V, E = igualar(V.T, E.T); tot = np.sum(V ** 2)
    return float(db(np.sum(np.maximum(V - E, 0) ** 2)) - db(tot)), float(db(np.sum(np.maximum(E - V, 0) ** 2)) - db(tot))


def fuga(inst, voz_ref, activos, ventana):
    """Correlación normalizada instrumental↔voz en las ventanas donde se canta (dB)."""
    cs = []
    for k in np.flatnonzero(activos):
        a, b = k * ventana, (k + 1) * ventana
        i, v = inst[a:b].ravel(), voz_ref[a:b].ravel()
        if len(i) < ventana: continue
        cs.append(abs(np.dot(i, v)) / (np.linalg.norm(i) * np.linalg.norm(v) + 1e-12))
    return float(20 * np.log10(np.mean(cs) + 1e-6)) if cs else None


_whisper = {}
def palabras_whisper(wav_tramo: np.ndarray, idioma=None):
    from faster_whisper import WhisperModel
    import tempfile, soundfile as sf
    if 'm' not in _whisper:
        try: _whisper['m'] = WhisperModel('large-v3', device='cuda', compute_type='float16')
        except Exception: _whisper['m'] = WhisperModel('large-v3', device='cpu', compute_type='int8')
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: ruta = f.name
    sf.write(ruta, wav_tramo.mean(1).astype(np.float32), SR)
    segs, _ = _whisper['m'].transcribe(ruta, language=idioma, vad_filter=True, word_timestamps=True,
                                       condition_on_previous_text=False, no_speech_threshold=0.6)
    # solo los segundos (del tramo) de cada palabra reconocida, nunca el texto: las letras tienen derechos de autor
    pal = [round(w.start, 1) for s in segs for w in (s.words or []) if w.probability > 0.5]
    Path(ruta).unlink(missing_ok=True)
    return pal


def momentos_dificiles(rv, a, n=3, separacion=8):
    """Los n instantes (s de la canción) con más voz, separados ≥ separacion s."""
    orden = np.argsort(rv)[::-1]; elegidos = []
    for k in orden:
        t = k * HOP
        # todos a menos de ±17 s del más fuerte: caben en el fragmento de 40 s de la escucha a ciegas
        if elegidos and abs(t - elegidos[0]) > 17: continue
        if all(abs(t - e) >= separacion for e in elegidos): elegidos.append(t)
        if len(elegidos) == n: break
    return [round(float(a / SR + max(0, t - 2)), 1) for t in sorted(elegidos)]


def medir(A):
    pl = planes(); lugares = A.lugares or list(pl)
    indice_sdr = json.loads((PRUEBAS / 'indice.json').read_text(encoding='utf-8')) if (PRUEBAS / 'indice.json').exists() else {}
    res = {}
    ruta_cache = SALIDA / 'whisper-cache.json'
    cache_whisper = json.loads(ruta_cache.read_text(encoding='utf-8')) if ruta_cache.exists() else {}
    for lugar in lugares:
        p = pl[lugar]; c = ruta_cancion(p['cancion']); m = leer(decodificar(c))
        a = int(p['desde'] * SR); b = int(p['hasta'] * SR) if p.get('hasta') else len(m)
        mt = m[a:b]; vr, refs = voz_referencia(c, a, b)
        rm, rv = igualar(suave(rms_frames(mt, HOP), 0.3), suave(rms_frames(vr, HOP), 0.3))
        activos = rv > rm - 15; quietos = ((rv < rm - 30) | (rv < np.percentile(rv, 95) - 30)) & (rm > np.median(rm) - 20)
        ventana = int(HOP * SR)
        quietas_muestras = np.repeat(quietos, ventana)[:len(mt)]
        bm = bandas_db(mt[:len(quietas_muestras)][quietas_muestras]) if quietos.sum() > 20 else None
        filas = {}
        for cand in candidatos_de(c):
            inst = leer_candidato(c, cand, 'instrumental', a, b)
            fila = dict(fuga_db=fuga(inst, vr, activos, ventana))
            if bm is not None:
                bi = bandas_db(inst[:len(quietas_muestras)][quietas_muestras[:len(inst)]])
                fila['integridad_db'] = [round(float(x), 2) for x in (bi - bm)]
            # SDR en las mezclas de prueba de esta canción
            s, per, sob = [], [], []
            for base, info in indice_sdr.items():
                if info['cancion'] != p['cancion']: continue
                mezcla = PRUEBAS / f'{base}.wav'; est = ruta_candidato(mezcla, cand) / 'instrumental.wav'
                if cand == 'ensamble' and not est.exists():   # el actual: en las mezclas es ens-actual (la misma media)
                    est = ruta_candidato(mezcla, 'ens-actual') / 'instrumental.wav'
                if not est.exists(): continue
                ver = leer(PRUEBAS / 'verdad' / f'{base}.wav'); e = leer(est)
                s.append(sdr(ver, e)); x, y = perdida_sobrante(*igualar(ver, e)); per.append(x); sob.append(y)
            if s: fila.update(sdr=round(float(np.mean(s)), 2), perdida_db=round(float(np.mean(per)), 1), sobrante_db=round(float(np.mean(sob)), 1))
            if A.whisper:
                # caché por candidato y tramo (la separación no cambia: se puede volver a medir tras añadir candidatos)
                wav = ruta_candidato(c, cand) / 'instrumental.wav'
                clave = f'{wav}|{wav.stat().st_mtime_ns}|{a}|{b}|{A.idioma}'
                if clave not in cache_whisper: cache_whisper[clave] = palabras_whisper(inst, A.idioma)
                pal = cache_whisper[clave]; fila['whisper'] = len(pal); fila['whisper_segundos'] = pal[:20]
            if fila['fuga_db'] is not None: fila['fuga_db'] = round(fila['fuga_db'], 1)
            filas[cand] = fila
        # ranking: 0 palabras (si se midió) → SDR → menos fuga
        def clave(k):
            f = filas[k]
            return (f.get('whisper', 0) > 0, -(f.get('sdr') if f.get('sdr') is not None else -99), f['fuga_db'] if f['fuga_db'] is not None else 0)
        ranking = sorted(filas, key=clave)
        res[lugar] = dict(cancion=p['cancion'], tramo=[p['desde'], round(b / SR, 2)], referencias_voz=refs,
                          momentos=momentos_dificiles(rv, a), candidatos=filas, ranking=ranking,
                          actual=p.get('separacion', 'ensamble'))
        print(f'● {lugar}: mejor → {ranking[:3]}', flush=True)
        if A.whisper: guardar_json(ruta_cache, cache_whisper)
    guardar_json(SALIDA / 'comparacion.json', res)
    (SALIDA / 'comparacion.md').write_text(tabla_md(res), encoding='utf-8')
    print(f'→ {SALIDA / "comparacion.md"}')


def tabla_md(res):
    L = ['# Comparación de separaciones', '',
         'SDR: más es mejor · pérdida/sobrante y fuga: más negativo es mejor · integridad (graves/medios/agudos): cerca de 0 · whisper: 0', '']
    for lugar, r in res.items():
        L += [f'## {lugar} — {r["cancion"]} ({r["tramo"][0]}–{r["tramo"][1]} s) · actual: `{r["actual"]}`', '',
              '| # | candidato | SDR | pérdida | sobrante | fuga voz | integridad | whisper |', '|---|---|---|---|---|---|---|---|']
        for i, k in enumerate(r['ranking'], 1):
            f = r['candidatos'][k]; g = lambda x: '—' if f.get(x) is None else f[x]
            integ = '/'.join(f'{v:+.1f}' for v in f['integridad_db']) if 'integridad_db' in f else '—'
            L.append(f'| {i} | `{k}` | {g("sdr")} | {g("perdida_db")} | {g("sobrante_db")} | {g("fuga_db")} | {integ} | {g("whisper")} |')
        L += ['', f'Momentos con más voz (s): {r["momentos"]}', '']
    return '\n'.join(L)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest='orden', required=True)
    pp = sub.add_parser('preparar'); pp.add_argument('--duracion', type=float, default=10); pp.add_argument('--duracion-minima', type=float, default=6); pp.add_argument('--max-tramos', type=int, default=2)
    pm = sub.add_parser('medir'); pm.add_argument('--lugares', nargs='*'); pm.add_argument('--whisper', action='store_true'); pm.add_argument('--idioma', default=None)
    A = ap.parse_args()
    preparar(A) if A.orden == 'preparar' else medir(A)
