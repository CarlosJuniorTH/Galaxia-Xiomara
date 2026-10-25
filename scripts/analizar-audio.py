# Analizador de canciones: elige sus mejores fragmentos y saca las marcas para sincronizar las animaciones con ellas.
# Hace lo que hacen las herramientas profesionales de análisis musical:
#   1. Separa la voz del instrumental (Demucs, htdemucs: el mismo modelo que usan las apps de separar pistas), en la GPU.
#   2. Transcribe la letra sobre la voz aislada, con el tiempo de cada palabra (faster-whisper large-v3).
#   3. Tempo, pulsos y PRIMER TIEMPO de cada compás (la fase del compás se elige por dónde caen los golpes graves).
#   4. Estructura por auto-similitud (croma + timbre por pulsos, con realce de diagonales): límites de sección por novedad,
#      ajustados al compás, y secciones agrupadas por parecido (A, B, C…): la que más se repite con voz y energía es el
#      estribillo; antes de ella, el pre-estribillo; sin voz, intro, instrumental o final.
#   5. Emoción por segundo: sonoridad, brillo, presencia de voz, densidad de golpes y «subida» (energía que crece).
#   6. Fragmentos candidatos de la duración pedida que empiezan y terminan en primer tiempo de compás SIN cortar una
#      palabra, puntuados por emoción, estribillo, clímax dentro y una entrada que se construye.
#   7. Marcas dentro de cada fragmento (compases, secciones, entrada de la voz, clímax, golpes fuertes, letra) y una
#      muestra .m4a de cada candidato con fundidos, para escucharlo.
# Escribe <nombre>.analisis.json junto al audio y un resumen en la terminal.
#
# Entorno (una vez): python3 -m venv .pruebas/audio && .pruebas/audio/bin/pip install librosa faster-whisper soundfile demucs
#   y torch con CUDA para la GPU: .pruebas/audio/bin/pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128
# Uso:
#   .pruebas/audio/bin/python scripts/analizar-audio.py cancion.mp3 [--duracion 30] [--min 22 --max 45]
#        [--frase "inicio de la letra"] [--hasta "final de la letra"] [--idioma en] [--instrumental] [--sin-muestras]
import argparse, ctypes, glob, hashlib, json, os, re, subprocess, sys, unicodedata
from pathlib import Path

import numpy as np
import librosa

# Las bibliotecas de CUDA que trae torch (cuBLAS, cuDNN) se cargan antes para que la transcripción también use la GPU.
for patron in ('nvidia/cublas/lib/libcublasLt.so.*', 'nvidia/cublas/lib/libcublas.so.*', 'nvidia/cudnn/lib/libcudnn*.so.*'):
    for so in sorted(glob.glob(os.path.join(sys.prefix, 'lib', 'python3*', 'site-packages', patron))):
        try: ctypes.CDLL(so, mode=ctypes.RTLD_GLOBAL)
        except OSError: pass

p = argparse.ArgumentParser()
p.add_argument('audios', nargs='+')
p.add_argument('--duracion', type=float, default=30, help='duración ideal del fragmento (s)')
p.add_argument('--min', type=float, default=None); p.add_argument('--max', type=float, default=None)
p.add_argument('--frase'); p.add_argument('--hasta')
p.add_argument('--idioma', default=None)
p.add_argument('--modelo', default='large-v3')
p.add_argument('--instrumental', action='store_true', help='sin voz: no separa ni transcribe')
p.add_argument('--sin-muestras', action='store_true')
A = p.parse_args()
DMIN = A.min or max(8, A.duracion * 0.75); DMAX = A.max or A.duracion * 1.35
PY = sys.executable
mmss = lambda t: f'{int(t // 60)}:{t % 60:05.2f}'
norm = lambda s: re.sub(r'[^a-z0-9 ]', '', unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode())
escala = lambda v: (v - np.min(v)) / (np.ptp(v) or 1)

def carpeta(ruta): return ruta.parent / '.separado' / hashlib.sha1(ruta.read_bytes()).hexdigest()[:12]
def decodificar(ruta):
    """WAV de trabajo (44,1 kHz estéreo) con ffmpeg: lee cualquier formato (mp3, m4a, mp4/DASH sin extensión…)."""
    wav = carpeta(ruta) / 'entrada.wav'
    if not wav.exists():
        wav.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(ruta), '-ar', '44100', '-ac', '2', str(wav)], check=True)
    return wav
def separar(ruta):
    """Voz e instrumental con Demucs (en caché por huella del archivo, junto al audio en .separado/)."""
    base = carpeta(ruta); wav = decodificar(ruta)
    hechos = list(base.glob('htdemucs/*/vocals.wav'))
    if not hechos:
        print('  separando voz e instrumental (Demucs)…', file=sys.stderr)
        subprocess.run([PY, '-m', 'demucs', '--two-stems=vocals', '-n', 'htdemucs', '-o', str(base), str(wav)], check=True, stdout=subprocess.DEVNULL)
        hechos = list(base.glob('htdemucs/*/vocals.wav'))
    voz = hechos[0]; return voz, voz.with_name('no_vocals.wav')

def transcribir(voz_wav):
    from faster_whisper import WhisperModel
    y16 = librosa.load(voz_wav, sr=16000, mono=True)[0]   # (ya decodificado: su lector propio choca con algunas versiones de PyAV)
    def con(dispositivo, tipo):
        m = WhisperModel(A.modelo, device=dispositivo, compute_type=tipo)
        segs, info = m.transcribe(y16, language=A.idioma, word_timestamps=True, vad_filter=True, condition_on_previous_text=False, beam_size=5)
        return [{'t0': round(w.start, 2), 't1': round(w.end, 2), 'p': w.word.strip()} for sg in segs for w in (sg.words or [])], info.language
    try: return con('cuda', 'float16')
    except Exception as e:
        print('  (transcripción en el procesador:', str(e)[:60], ')', file=sys.stderr)
        return con('cpu', 'int8')

def tonalidad(croma):
    mayor = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]); menor = np.array([6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    c = croma.mean(axis=1); notas = 'Do Do# Re Mib Mi Fa Fa# Sol Lab La Sib Si'.split()
    return max((np.corrcoef(c, np.roll(perfil, k))[0, 1], f'{notas[k]} {modo}') for perfil, modo in ((mayor, 'mayor'), (menor, 'menor')) for k in range(12))[1]

def sonoridad_lufs(ruta):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(ruta), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True)
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr); return float(m[-1]) if m else None

def analizar(ruta):
    print(f'\n▶ {ruta.name}', file=sys.stderr)
    sr, hop = 22050, 512
    y = librosa.load(decodificar(ruta), sr=sr, mono=True)[0]; dur = len(y) / sr
    voz_wav = inst_wav = None
    if not A.instrumental:
        try: voz_wav, inst_wav = separar(ruta)
        except Exception as e: print('  (sin separación:', str(e)[:80], ')', file=sys.stderr)
    yi = librosa.load(inst_wav, sr=sr, mono=True)[0] if inst_wav else y
    yv = librosa.load(voz_wav, sr=sr, mono=True)[0] if voz_wav else np.zeros_like(y)
    n = min(len(y), len(yi), len(yv)); y, yi, yv = y[:n], yi[:n], yv[:n]

    # ── Ritmo: pulsos y primer tiempo de compás ──
    env = librosa.onset.onset_strength(y=yi, sr=sr, hop_length=hop)
    tempo, marcos = librosa.beat.beat_track(onset_envelope=env, sr=sr, hop_length=hop)
    tempo = float(np.atleast_1d(tempo)[0]); pulsos = librosa.frames_to_time(marcos, sr=sr, hop_length=hop)
    S = np.abs(librosa.stft(yi, hop_length=hop)); graves = S[librosa.fft_frequencies(sr=sr) < 150].sum(axis=0)
    fase = int(np.argmax([graves[marcos[k::4]].mean() if len(marcos[k::4]) else 0 for k in range(4)]))   # el bombo cae en el 1
    compases = pulsos[fase::4]

    # ── Curvas por cuadro ──
    t = librosa.times_like(env, sr=sr, hop_length=hop)
    rms = librosa.feature.rms(y=y, hop_length=hop)[0][:len(t)]
    db = librosa.amplitude_to_db(rms + 1e-9, ref=np.max)
    brillo = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0][:len(t)]
    rv = librosa.feature.rms(y=yv, hop_length=hop)[0][:len(t)]
    voz_activa = rv > max(1e-4, 0.25 * np.percentile(rv, 95)) if voz_wav else np.zeros(len(t), bool)
    suave = lambda v, s=1.0: np.convolve(v, np.ones(max(1, int(s * sr / hop))) / max(1, int(s * sr / hop)), mode='same')
    son = escala(suave(db, 1.0)); bri = escala(suave(brillo, 2.0)); vz = suave(voz_activa.astype(float), 1.5); dens = escala(suave(env, 2.0))
    subida = escala(np.clip(np.gradient(suave(db, 4.0)), 0, None))
    emocion = 0.42 * son + 0.18 * bri + 0.2 * vz + 0.14 * dens + 0.06 * subida
    tidx = lambda tt: int(np.clip(np.searchsorted(t, tt), 0, len(t) - 1))
    pidx = lambda tt: int(np.clip(np.searchsorted(pulsos, tt), 0, len(pulsos) - 1))

    # ── Estructura por auto-similitud ──
    croma = librosa.feature.chroma_cqt(y=yi, sr=sr, hop_length=hop); mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=hop)
    X = librosa.util.sync(np.vstack([librosa.util.normalize(croma, axis=0), librosa.util.normalize(mfcc, axis=1) * 0.5]), marcos, aggregate=np.median)
    R = librosa.segment.recurrence_matrix(X, mode='affinity', sym=True, width=3, k=max(5, X.shape[1] // 10))
    R = librosa.segment.path_enhance(R, 9)
    L = 16; v = np.r_[np.ones(L // 2), -np.ones(L // 2)]; g = np.outer(v, v) * np.outer(np.hanning(L), np.hanning(L))   # núcleo de tablero
    Rp = np.pad(R, L // 2); nov = escala(np.array([np.sum(Rp[i:i + L, i:i + L] * g) for i in range(R.shape[0])]))
    picos = librosa.util.peak_pick(nov, pre_max=8, post_max=8, pre_avg=8, post_avg=8, delta=0.05, wait=12)
    lim = sorted({0.0, dur} | {float(min(compases, key=lambda c: abs(c - pulsos[i]))) for i in picos if i < len(pulsos)})
    limpio = [lim[0]]
    for x in lim[1:]:
        if x - limpio[-1] >= 6: limpio.append(x)
    limpio[-1] = dur
    secs = [{'desde': round(a, 2), 'hasta': round(b, 2)} for a, b in zip(limpio[:-1], limpio[1:])]
    for s in secs:
        a, b = tidx(s['desde']), max(tidx(s['desde']) + 1, tidx(s['hasta']))
        s.update(energia=round(float(son[a:b].mean()), 3), voz=round(float(voz_activa[a:b].mean()), 3), brillo=round(float(bri[a:b].mean()), 3), emocion=round(float(emocion[a:b].mean()), 3))
    def parecido(s1, s2):   # el mejor promedio de una diagonal del bloque: dos apariciones de la misma parte
        B = R[pidx(s1['desde']):pidx(s1['hasta']), pidx(s2['desde']):pidx(s2['hasta'])]
        m = min(B.shape) if B.size else 0
        if not m: return 0
        return max((float(np.mean(np.diagonal(B, k)[:m])) for k in range(-B.shape[0] + 1, B.shape[1]) if len(np.diagonal(B, k)) >= m * 0.7), default=0)
    etiquetas, siguiente = [None] * len(secs), 0
    for i in range(len(secs)):
        if etiquetas[i] is not None: continue
        etiquetas[i] = chr(65 + siguiente % 26); siguiente += 1
        for j in range(i + 1, len(secs)):
            proporcion = (secs[j]['hasta'] - secs[j]['desde']) / max(1e-3, secs[i]['hasta'] - secs[i]['desde'])
            if etiquetas[j] is None and 0.6 < proporcion < 1.6 and parecido(secs[i], secs[j]) > 0.35: etiquetas[j] = etiquetas[i]
    for s, e in zip(secs, etiquetas): s['grupo'] = e
    grupos = {e: [s for s in secs if s['grupo'] == e] for e in set(etiquetas)}
    cand = [(np.mean([s['energia'] for s in g]) * 0.6 + np.mean([s['voz'] for s in g]) * 0.4 + 0.1 * len(g), e) for e, g in grupos.items() if len(g) >= 2]
    estribillo = max(cand)[1] if cand else max(secs, key=lambda s: s['emocion'])['grupo']
    for k, s in enumerate(secs):
        if s['grupo'] == estribillo: s['tipo'] = 'estribillo'
        elif k + 1 < len(secs) and secs[k + 1]['grupo'] == estribillo and secs[k + 1]['energia'] > s['energia']: s['tipo'] = 'pre-estribillo'
        elif s['voz'] < 0.15: s['tipo'] = 'intro' if k == 0 else 'final' if k == len(secs) - 1 else 'instrumental'
        else: s['tipo'] = 'puente' if len(grupos[s['grupo']]) == 1 and k > len(secs) / 2 else 'estrofa'

    # ── Letra ──
    palabras, idioma = transcribir(voz_wav) if voz_wav else ([], None)
    def buscar(frase, desde=0.0):
        obj = norm(frase).split(); ps = [norm(w['p']) for w in palabras]; mejor = None
        for i in range(len(ps)):
            if palabras[i]['t0'] < desde: continue
            ac = sum(1 for k, o in enumerate(obj) if i + k < len(ps) and ps[i + k] == o)
            if ac >= max(1, len(obj) - 1) and (mejor is None or ac > mejor[1]):
                mejor = (i, ac)
                if ac == len(obj): break
        if not mejor: return None
        return palabras[mejor[0]]['t0'], palabras[min(len(palabras) - 1, mejor[0] + len(obj) - 1)]['t1']

    # ── Fragmentos: de primer tiempo a primer tiempo, sin cortar palabras ──
    se = suave(emocion, 2.0); climax_global = float(se.max()) or 1
    def corta_palabra(tt): return any(w['t0'] - 0.05 < tt < w['t1'] + 0.05 for w in palabras) if palabras else bool(voz_wav and voz_activa[tidx(tt)])
    def puntuar(a, b):
        ia, ib = tidx(a), tidx(b); e = float(emocion[ia:ib].mean())
        estr = sum(max(0, min(b, s['hasta']) - max(a, s['desde'])) for s in secs if s['tipo'] == 'estribillo') / (b - a)
        pico = float(se[ia:ib].max()) / climax_global
        entrada = float(son[ia:ia + int(4 * sr / hop)].mean()) < float(son[ia:ib].mean())   # empieza por debajo de su media: se construye
        final = 1 - abs(float(son[max(ia, ib - int(3 * sr / hop)):ib].mean()) - 0.5)          # ni corte en seco a todo volumen ni silencio
        ideal = 1 - min(1, abs((b - a) - A.duracion) / A.duracion)
        return 0.45 * e + 0.2 * estr + 0.15 * pico + 0.08 * entrada + 0.05 * final + 0.07 * ideal
    cortes = [float(c) for c in compases if not corta_palabra(c)]
    frag = sorted(((puntuar(a, b), a, b) for a in cortes for b in cortes if DMIN <= b - a <= DMAX), reverse=True)
    elegidos = []
    for f in frag:
        if all(f[2] <= g[1] + 2 or f[1] >= g[2] - 2 for g in elegidos): elegidos.append(f)
        if len(elegidos) == 3: break
    pedido = None
    if A.frase and palabras and (r0 := buscar(A.frase)):
        r1 = buscar(A.hasta, r0[0]) if A.hasta else None
        a = max([c for c in cortes if c <= r0[0] - 0.3] or [max(0.0, r0[0] - 2)])   # el compás limpio anterior a la frase
        fin = r1[1] if r1 else r0[0] + A.duracion
        b = min([c for c in cortes if c >= fin + 0.2] or [min(dur, fin + 1)])
        pedido = (puntuar(a, b), a, b)

    def marcas(a, b):
        ia, ib = tidx(a), tidx(b); tramo = env[ia:ib]
        golpes = librosa.util.peak_pick(tramo, pre_max=20, post_max=20, pre_avg=40, post_avg=40, delta=float(np.percentile(tramo, 90)) * 0.3, wait=40)
        golpes = sorted(golpes, key=lambda k: -tramo[k])[:8]
        return {'compases': [round(float(c) - a, 2) for c in compases if a <= c < b],
                'secciones': [{'en': round(max(0, s['desde'] - a), 2), 'tipo': s['tipo']} for s in secs if s['hasta'] > a and s['desde'] < b],
                'entrada_voz': next((round(float(t[k]) - a, 2) for k in range(ia, ib) if voz_activa[k]), None),
                'climax': round(float(t[ia + int(np.argmax(se[ia:ib]))]) - a, 2),
                'golpes': sorted(round(float(t[ia + k]) - a, 2) for k in golpes),
                'letra': [{'en': round(w['t0'] - a, 2), 'p': w['p']} for w in palabras if a <= w['t0'] < b]}
    lista = ([('pedido', pedido)] if pedido else []) + [(f'candidato {k + 1}', f) for k, f in enumerate(elegidos)]
    fragmentos = []
    for nombre, (pt, a, b) in lista:
        d = {'nombre': nombre, 'inicio': round(a, 2), 'fin': round(b, 2), 'duracion': round(b - a, 2), 'puntuacion': round(pt, 3), 'marcas': marcas(a, b)}
        if not A.sin_muestras:
            m = ruta.parent / 'muestras' / f'{ruta.stem}.{nombre.replace(" ", "-")}.m4a'; m.parent.mkdir(exist_ok=True)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', str(ruta), '-af', f'afade=t=in:d=0.4,afade=t=out:st={max(0, b - a - 1.5)}:d=1.5', '-c:a', 'aac', '-b:a', '160k', str(m)], check=True)
            d['muestra'] = str(m)
        fragmentos.append(d)

    info = {'archivo': ruta.name, 'duracion': round(dur, 2), 'tempo': round(tempo, 1), 'tonalidad': tonalidad(croma), 'lufs': sonoridad_lufs(ruta), 'idioma': idioma,
            'compases': [round(float(c), 3) for c in compases], 'pulsos': [round(float(x), 3) for x in pulsos], 'secciones': secs,
            'emocion_por_segundo': [round(float(emocion[tidx(s):tidx(s + 1)].mean()), 3) if tidx(s + 1) > tidx(s) else 0 for s in range(int(dur))],
            'palabras': palabras, 'fragmentos': fragmentos}
    (ruta.parent / f'{ruta.stem}.analisis.json').write_text(json.dumps(info, ensure_ascii=False, indent=1))

    print(f"\n{ruta.name}: {mmss(dur)} · {tempo:.0f} BPM · {info['tonalidad']} · {info['lufs']} LUFS · idioma {idioma}")
    print('Estructura:')
    for s in secs: print(f"  {mmss(s['desde'])}–{mmss(s['hasta'])}  {s['grupo']}  {s['tipo']:<15} emoción {s['emocion']:.2f}  energía {s['energia']:.2f}  voz {s['voz']:.2f}")
    if palabras:
        print('Letra:'); linea, t0 = [], None
        for k, w in enumerate(palabras):
            t0 = w['t0'] if t0 is None else t0; linea.append(w['p'])
            if k + 1 == len(palabras) or palabras[k + 1]['t0'] - w['t1'] > 0.7: print(f'  {mmss(t0)}  {" ".join(linea)}'); linea, t0 = [], None
    print('Fragmentos:')
    for d in fragmentos:
        m = d['marcas']; print(f"  {d['nombre']:<12} {mmss(d['inicio'])} → {mmss(d['fin'])} ({d['duracion']:.1f} s) puntuación {d['puntuacion']:.2f} · clímax a los {m['climax']} s · voz a los {m['entrada_voz']} s")
    if A.frase and not pedido: print('  (no encontré la frase en la letra: mira la letra de arriba y dime el minuto)')

for r in A.audios: analizar(Path(r))
