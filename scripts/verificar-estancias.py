# Verificación objetiva de las estancias (scripts/preparar-estancias.py): duración, volumen, silencios y huecos, clics y
# saltos de energía o de pulso en las uniones, melodía presente donde cantaba la voz y continuidad con el final del clip.
# (Los restos de voz se miden aparte con Whisper: solo cuenta palabras, nunca escribe la letra.)
# Uso: .pruebas/audio/bin/python scripts/verificar-estancias.py --informe DIR [lugares…] [--destino assets/musica]
import argparse, json, subprocess, sys
from pathlib import Path
import numpy as np, librosa, scipy.signal as ss

RAIZ = Path(__file__).resolve().parent.parent; SR = 44100
ap = argparse.ArgumentParser(); ap.add_argument('lugares', nargs='*'); ap.add_argument('--informe', required=True)
ap.add_argument('--destino', default=str(RAIZ / 'assets/musica')); A = ap.parse_args()

def leer(r):
    o = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(r), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(o, np.float32).reshape(-1, 2).astype(np.float64)
def rms_db(x, hop):
    m = x.mean(1) if x.ndim == 2 else x; h = int(hop * SR); k = len(m) // h
    return 20 * np.log10(np.sqrt((m[:k * h].reshape(k, h) ** 2).mean(1)) + 1e-9)
def ebu(r):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(r), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    i = float(e.rsplit('I:', 1)[1].split('LUFS')[0]); tp = float(e.rsplit('Peak:', 1)[1].split('dBFS')[0]); return i, tp

lugares = A.lugares or [p.name.replace('-estancia.json', '') for p in sorted(Path(A.informe).glob('*-estancia.json'))]
todo_ok = True
for lugar in lugares:
    info = json.loads((Path(A.informe) / f'{lugar}-estancia.json').read_text())
    ruta = Path(A.destino) / f'{lugar}-estancia.m4a'; x = leer(ruta); dur = len(x) / SR
    fallos, datos = [], {}
    lufs, tp = ebu(ruta); datos['duración'] = round(dur, 1); datos['LUFS'] = lufs; datos['pico'] = tp
    if not 45 <= dur <= 90: fallos.append(f'duración {dur:.1f} s fuera de 45–90')
    if abs(lufs + 20) > 0.7: fallos.append(f'volumen {lufs} LUFS')
    # silencios (< −50 dBFS) y huecos de energía (12 dB bajo la mediana) de más de 0,4 s, salvo el final (4 s)
    d = rms_db(x, 0.05); med = np.median(d); cuerpo = d[:int((dur - 4) / 0.05)]
    def tramos(mask):
        out, i = [], 0
        while i < len(mask):
            if mask[i]:
                j = i
                while j < len(mask) and mask[j]: j += 1
                if (j - i) * 0.05 > 0.4: out.append((round(i * 0.05, 2), round(j * 0.05, 2)))
                i = j
            else: i += 1
        return out
    sil = tramos(cuerpo < -50); hue = tramos(cuerpo[int(1 / 0.05):] < med - 12)
    hue = [(a + 1, b + 1) for a, b in hue]
    datos['silencios'] = sil; datos['huecos'] = hue
    if sil: fallos.append(f'silencios {sil}')
    if hue: fallos.append(f'huecos {hue}')
    # estabilidad: nivel por segundo (salvo el último fundido): mayor salto entre segundos seguidos
    s1 = rms_db(x[:int((dur - 4) * SR)], 1.0); datos['salto_max_dB_por_s'] = round(float(np.abs(np.diff(s1)).max()), 1) if len(s1) > 1 else 0
    # uniones: clic (energía de agudos en 3 ms frente a su entorno, comparada con 30 golpes normales de la misma pista),
    # salto de nivel (1 s antes/después) y regularidad del pulso alrededor
    m = x.mean(1); hp = ss.sosfilt(ss.butter(4, 7000, 'hp', fs=SR, output='sos'), m)
    def clic(t):
        i = int(t * SR); w = int(0.003 * SR); seg = hp[max(0, i - int(0.5 * SR)):i + int(0.5 * SR)]
        e = np.convolve(seg ** 2, np.ones(w) / w, 'same'); c = len(e) // 2
        return float(10 * np.log10(e[c - int(0.03 * SR):c + int(0.03 * SR)].max() / (np.median(e) + 1e-12)))
    onset = librosa.onset.onset_strength(y=librosa.resample(m.astype(np.float32), orig_sr=SR, target_sr=22050), sr=22050, hop_length=256)
    _, pulsos = librosa.beat.beat_track(onset_envelope=onset, sr=22050, hop_length=256, units='time')
    golpes = librosa.onset.onset_detect(onset_envelope=onset, sr=22050, hop_length=256, units='time')
    base = [clic(t) for t in golpes[(golpes > 2) & (golpes < dur - 5)][::max(1, len(golpes) // 30)]]
    lim_clic = float(np.percentile(base, 95)) if base else 30
    ibi = np.diff(pulsos); ibi_med = float(np.median(ibi))
    datos['uniones'] = []
    def desv_en(t):
        cerca = [b for a, b in zip(pulsos[:-1], ibi) if t - 3 < a < t + 3]
        return float(np.max(np.abs(np.array(cerca) / ibi_med - 1))) if cerca else 0.0
    # irregularidad propia de la canción (rubato, cambios de figura): la misma medida en todos sus pulsos
    lim_pulso = max(0.12, float(np.percentile([desv_en(p) for p in pulsos if 3 < p < dur - 5], 90)))
    for u in info['uniones']:
        t = u['en']; c = clic(t)
        dif = np.abs(np.diff(m[int((t - 0.06) * SR):int((t + 0.06) * SR)])).max(); dif_g = np.percentile(np.abs(np.diff(m)), 99.99)
        ant, des = rms_db(x[int((t - 1) * SR):int(t * SR)], 1.0)[0], rms_db(x[int(t * SR):int((t + 1) * SR)], 1.0)[0]
        desv = desv_en(t)
        r = {'en': t, 'tipo': u['tipo'], 'clic_dB': round(c, 1), 'clic_limite_dB': round(lim_clic, 1), 'muestra_vs_p99,99': round(float(dif / dif_g), 2),
             'nivel_antes_despues_dB': round(float(des - ant), 1), 'pulso_desv_max': round(desv, 3)}
        datos['uniones'].append(r)
        if c > max(lim_clic, 12): fallos.append(f'clic en {t}')
        if dif / dif_g > 1.5: fallos.append(f'discontinuidad de muestra en {t}')
        nat = u.get('cambio_natural_dB', 0); r['cambio_natural_dB'] = nat
        if abs(des - ant) > 4 and abs((des - ant) - nat) > 3: fallos.append(f'salto de nivel {des - ant:.1f} dB en {t} (la canción cambia {nat} dB ahí)')
        r['pulso_limite'] = round(lim_pulso, 3)
        if desv > lim_pulso: fallos.append(f'pulso irregular junto a {t} ({desv:.2f})')
    datos['pulso_desv_global_p95'] = round(float(np.percentile(np.abs(ibi / ibi_med - 1), 95)), 3)
    # melodía: % del tiempo con voz en la canción original que queda cubierto por notas
    datos['notas'] = info['notas']; datos['transporte'] = info['transporte']
    for c in ('cobertura_melodia', 'fidelidad_melodia', 'melodia_vs_instrumental_dB', 'afinacion'):
        if c in info: datos[c] = info[c]
    if info['notas'] and info.get('cobertura_melodia', 1) < 0.75: fallos.append('la melodía no cubre la voz')
    if info['notas'] and info.get('fidelidad_melodia', 1) < 0.8: fallos.append('la melodía no sigue a la voz')
    # continuidad con el clip: últimos 3 s del fragmento del clip contra los 3 primeros de la estancia
    clip = Path(A.destino) / f'{lugar}.m4a'
    if info.get('continua_clip') and clip.exists():
        y = leer(clip); yc = y[-int(3.0 * SR):].mean(1); xc = m[:int(3.0 * SR)]
        e1 = librosa.onset.onset_strength(y=librosa.resample(yc.astype(np.float32), orig_sr=SR, target_sr=22050), sr=22050, hop_length=128)
        e2 = librosa.onset.onset_strength(y=librosa.resample(xc.astype(np.float32), orig_sr=SR, target_sr=22050), sr=22050, hop_length=128)
        n = min(len(e1), len(e2)); e1, e2 = e1[:n] - e1[:n].mean(), e2[:n] - e2[:n].mean()
        L = int(0.25 * 22050 / 128); cc = [float(np.dot(e1[max(0, -k):n - max(0, k)], e2[max(0, k):n - max(0, -k)])) for k in range(-L, L + 1)]
        lag = (int(np.argmax(cc)) - L) * 128 / 22050
        c1 = librosa.feature.chroma_cqt(y=librosa.resample(yc.astype(np.float32), orig_sr=SR, target_sr=22050), sr=22050).mean(1)
        c2 = librosa.feature.chroma_cqt(y=librosa.resample(xc.astype(np.float32), orig_sr=SR, target_sr=22050), sr=22050).mean(1)
        sim = float(c1 @ c2 / np.linalg.norm(c1) / np.linalg.norm(c2))
        datos['continuidad_clip'] = {'desfase_ms': round(lag * 1000), 'croma_cos': round(sim, 3)}
        if abs(lag) > 0.03: fallos.append(f'la estancia no sigue el compás del clip (desfase {lag * 1000:.0f} ms)')
        if sim < 0.85: fallos.append(f'armonía distinta al final del clip ({sim:.2f})')
    datos['fallos'] = fallos; todo_ok &= not fallos
    (Path(A.informe) / f'{lugar}-verificacion.json').write_text(json.dumps(datos, indent=1, ensure_ascii=False))
    print(f'== {lugar}: {"BIEN" if not fallos else "FALLA: " + "; ".join(fallos)}')
    print('  ', json.dumps(datos, ensure_ascii=False))
sys.exit(0 if todo_ok else 1)
