# Comprueba que cada estancia es la canción REAL (no una imitación) y va muestra a muestra con ella:
#   · clip → estancia: en los 3 s del fundido, los graves (< 150 Hz, donde no hay voz) del final del clip y del inicio
#     de la estancia deben coincidir: correlación ≥ 0,9 con desfase 0 ms.
#   · original → estancia (si audios-originales/ está): lo mismo a lo largo de toda la estancia, por ventanas de 5 s.
# Sale con código 1 si algo falla (sirve para tests / CI).
#   python scripts/verificar-alineacion.py [--minimo 0.9]
import argparse, json, sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfiltfilt, correlate

sys.path.insert(0, str(Path(__file__).resolve().parent))
from separacion_comun import MUSICA, ORIGINALES, planes, ruta_cancion, leer_m4a

SR = 22050
GRAVES = butter(4, 150, 'low', fs=SR, output='sos')


def comparar(a, b, max_lag_ms=50):
    a, b = sosfiltfilt(GRAVES, a), sosfiltfilt(GRAVES, b)
    n = min(len(a), len(b)); a, b = a[:n], b[:n]
    m = int(max_lag_ms / 1000 * SR)
    x = correlate(a, b, 'full', method='fft')[n - 1 - m:n + m]
    lag = int(np.argmax(x)) - m
    r = np.corrcoef(np.roll(b, lag), a)[0, 1]
    return float(r), lag / SR * 1000


ap = argparse.ArgumentParser(); ap.add_argument('--minimo', type=float, default=0.9); A = ap.parse_args()
indice = json.loads((MUSICA / 'indice.json').read_text(encoding='utf-8'))
fallos = 0
for lugar, p in planes().items():
    e_n = f'{lugar}-estancia.m4a'
    if e_n not in indice: print(f'{lugar}: sin estancia en indice.json'); continue
    ie = indice[e_n]; e = leer_m4a(MUSICA / e_n, SR)
    linea = [f'{lugar:10s}']
    c_n = f'{lugar}.m4a'
    if p.get('clip') and c_n in indice:
        c = leer_m4a(MUSICA / c_n, SR); t0 = ie['desde'] - indice[c_n]['desde']
        a = int(t0 * SR); seg = c[a:a + int(2.5 * SR)]
        r, lag = comparar(seg, e[:len(seg)])
        ok = r >= A.minimo and abs(lag) < 1
        fallos += not ok
        linea.append(f'clip→estancia r={r:.3f} desfase={lag:+.1f} ms {"OK" if ok else "FALLA"}')
    if ORIGINALES.exists():
        try:
            o = leer_m4a(ruta_cancion(ie.get('origen', p['cancion'])), SR)
            a = int(ie['desde'] * SR); rs, lags = [], []
            for k in range(0, len(e) - 5 * SR, 5 * SR):
                r, lag = comparar(o[a + k:a + k + 5 * SR], e[k:k + 5 * SR])
                if np.std(e[k:k + 5 * SR]) > 1e-4: rs.append(r); lags.append(lag)
            peor = min(rs) if rs else float('nan'); maxlag = max(map(abs, lags)) if lags else 0
            ok = peor >= A.minimo - 0.05 and maxlag < 1
            fallos += not ok
            linea.append(f'original→estancia peor r={peor:.3f} desfase máx={maxlag:.1f} ms {"OK" if ok else "FALLA"}')
        except FileNotFoundError as ex:
            linea.append(f'(sin original: {ex})')
    print(' · '.join(linea))
sys.exit(1 if fallos else 0)
