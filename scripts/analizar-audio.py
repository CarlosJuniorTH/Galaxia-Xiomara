# Analiza una canción para elegir su mejor fragmento y sincronizar las animaciones con ella:
#   · letra con el tiempo de cada palabra (faster-whisper, en la GPU si la hay),
#   · tempo, pulsos y compases (librosa), energía por segundo y cambios de sección,
#   · candidatos a estribillo (las partes que más se repiten y con más energía),
#   · y, si se le da una frase, dónde empieza y termina, ajustado al compás más cercano.
# Escribe un JSON junto al audio (<nombre>.analisis.json) y un resumen legible en la terminal.
#
# Uso (con el entorno de .pruebas/audio: python3 -m venv .pruebas/audio && .pruebas/audio/bin/pip install librosa faster-whisper soundfile):
#   .pruebas/audio/bin/python scripts/analizar-audio.py cancion.mp3 [--frase "texto de la letra"] [--hasta "texto final"] [--idioma en]
import argparse, json, re, sys, unicodedata
from pathlib import Path

import numpy as np
import librosa

p = argparse.ArgumentParser()
p.add_argument('audio')
p.add_argument('--frase', help='frase de la letra donde empieza el fragmento')
p.add_argument('--hasta', help='frase de la letra donde termina el fragmento')
p.add_argument('--idioma', default=None, help='en, es… (por defecto lo detecta)')
p.add_argument('--modelo', default='large-v3')
p.add_argument('--sin-letra', action='store_true', help='instrumental: no transcribe')
a = p.parse_args()
ruta = Path(a.audio)

# ── Música: tempo, pulsos, compases, energía y secciones ──
y, sr = librosa.load(ruta, sr=22050, mono=True)
duracion = len(y) / sr
tempo, pulsos = librosa.beat.beat_track(y=y, sr=sr, units='time')
tempo = float(np.atleast_1d(tempo)[0])
compases = pulsos[::4].tolist()   # aproximación: compás de 4 tiempos desde el primer pulso
rms = librosa.feature.rms(y=y, hop_length=512)[0]
t_rms = librosa.times_like(rms, sr=sr, hop_length=512)
energia = [float(np.mean(rms[(t_rms >= s) & (t_rms < s + 1)])) if np.any((t_rms >= s) & (t_rms < s + 1)) else 0.0 for s in range(int(duracion) + 1)]
emax = max(energia) or 1
energia = [round(e / emax, 3) for e in energia]

# Secciones: límites por cambios de timbre y armonía (agrupamiento aglomerativo sobre croma + MFCC por pulsos).
croma = librosa.feature.chroma_cqt(y=y, sr=sr)
mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
marcos_pulso = librosa.time_to_frames(pulsos, sr=sr)
rasgos = librosa.util.sync(np.vstack([librosa.util.normalize(croma), librosa.util.normalize(mfcc)]), marcos_pulso)
n_sec = max(4, min(14, int(duracion / 18)))
limites = librosa.segment.agglomerative(rasgos, n_sec)
t_limites = sorted(set([0.0] + [float(pulsos[min(i, len(pulsos) - 1)]) for i in limites if i > 0] + [duracion]))
secciones = []
for i in range(len(t_limites) - 1):
    s0, s1 = t_limites[i], t_limites[i + 1]
    e = float(np.mean(energia[int(s0):max(int(s0) + 1, int(s1))]))
    secciones.append({'desde': round(s0, 2), 'hasta': round(s1, 2), 'energia': round(e, 3)})

# Repetición: cuánto se parece cada pulso al resto de la canción (los estribillos se repiten). Matriz de recurrencia.
R = librosa.segment.recurrence_matrix(librosa.util.sync(croma, marcos_pulso), mode='affinity', sym=True, width=4)
repeticion = np.asarray(R.sum(axis=0)).ravel()
repeticion = repeticion / (repeticion.max() or 1)
for s in secciones:
    idx = [k for k, t in enumerate(pulsos[:len(repeticion)]) if s['desde'] <= t < s['hasta']]
    s['repeticion'] = round(float(np.mean(repeticion[idx])) if idx else 0.0, 3)
    s['puntuacion'] = round(0.6 * s['energia'] + 0.4 * s['repeticion'], 3)   # candidato a estribillo: energía y repetición

# ── Letra con tiempos por palabra ──
palabras = []
if not a.sin_letra:
    from faster_whisper import WhisperModel
    voz = librosa.load(ruta, sr=16000, mono=True)[0]   # (ya decodificado: su lector propio choca con algunas versiones de PyAV)
    def transcribir(dispositivo, tipo):
        modelo = WhisperModel(a.modelo, device=dispositivo, compute_type=tipo)
        segs, _ = modelo.transcribe(voz, language=a.idioma, word_timestamps=True, vad_filter=False, beam_size=5)
        return [{'t0': round(w.start, 2), 't1': round(w.end, 2), 'p': w.word.strip()} for sg in segs for w in (sg.words or [])]
    try: palabras = transcribir('cuda', 'float16')
    except Exception as e:   # sin las bibliotecas de CUDA (o una GPU que aún no admite): en el procesador, más lento
        print('(transcripción en el procesador:', str(e)[:70], ')', file=sys.stderr)
        palabras = transcribir('cpu', 'int8')

norm = lambda s: re.sub(r'[^a-z0-9 ]', '', unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode())
def buscar(frase, desde=0.0):
    """Primera aparición de la frase (por palabras normalizadas, tolerante a una palabra mal transcrita) a partir de `desde`."""
    objetivo = norm(frase).split()
    if not objetivo or not palabras: return None
    ps = [norm(w['p']) for w in palabras]
    mejor = None
    for i in range(len(ps)):
        if palabras[i]['t0'] < desde: continue
        aciertos = sum(1 for k, o in enumerate(objetivo) if i + k < len(ps) and ps[i + k] == o)
        if aciertos >= max(1, len(objetivo) - 1) and (mejor is None or aciertos > mejor[1]):
            mejor = (i, aciertos)
            if aciertos == len(objetivo): break
    if mejor is None: return None
    i = mejor[0]; j = min(len(palabras) - 1, i + len(objetivo) - 1)
    return palabras[i]['t0'], palabras[j]['t1']

cerca = lambda t, lista: min(lista, key=lambda c: abs(c - t)) if len(lista) else t
fragmento = None
if a.frase:
    r0 = buscar(a.frase)
    if r0:
        fin = None
        if a.hasta:
            r1 = buscar(a.hasta, r0[0])
            fin = r1[1] if r1 else None
        # El fragmento empieza un compás antes de la frase (la entrada de la música) y termina en el compás siguiente al final.
        ini = max(0.0, cerca(r0[0], compases) - (60 / tempo) * 4) if compases else max(0.0, r0[0] - 2)
        fin = fin if fin else r0[1] + 30
        fin2 = min(duracion, min([c for c in compases if c >= fin] or [fin]) + 0.0)
        fragmento = {'frase_en': r0[0], 'inicio_sugerido': round(ini, 2), 'fin_sugerido': round(fin2, 2), 'duracion': round(fin2 - ini, 2)}

salida = {'archivo': ruta.name, 'duracion': round(duracion, 2), 'tempo': round(tempo, 1), 'pulsos': [round(float(t), 3) for t in pulsos],
          'compases': [round(float(t), 3) for t in compases], 'energia_por_segundo': energia, 'secciones': secciones, 'palabras': palabras, 'fragmento': fragmento}
destino = ruta.with_suffix('.analisis.json'); destino.write_text(json.dumps(salida, ensure_ascii=False, indent=1))

# ── Resumen ──
mmss = lambda t: f'{int(t // 60)}:{t % 60:05.2f}'
print(f'{ruta.name}: {mmss(duracion)} · {tempo:.0f} BPM · {len(pulsos)} pulsos')
print('Secciones (★ = mejor candidata a estribillo / parte más intensa):')
top = sorted(secciones, key=lambda s: -s['puntuacion'])[:3]
for s in secciones:
    print(f"  {mmss(s['desde'])}–{mmss(s['hasta'])}  energía {s['energia']:.2f}  repetición {s['repeticion']:.2f}{'  ★' if s in top else ''}")
if palabras:
    print('Letra (por líneas aproximadas):')
    linea, t0 = [], None
    for k, w in enumerate(palabras):
        if t0 is None: t0 = w['t0']
        linea.append(w['p'])
        if k + 1 == len(palabras) or palabras[k + 1]['t0'] - w['t1'] > 0.6:
            print(f'  {mmss(t0)}  {" ".join(linea)}'); linea, t0 = [], None
if fragmento: print(f"Fragmento: {mmss(fragmento['inicio_sugerido'])} → {mmss(fragmento['fin_sugerido'])} ({fragmento['duracion']:.1f} s); la frase empieza en {mmss(fragmento['frase_en'])}")
elif a.frase: print('No encontré la frase en la letra transcrita: revisa la letra impresa arriba y dame el minuto aproximado.')
print('→', destino)
