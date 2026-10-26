# Instrumental de las estancias = media («ensemble» de UVR) de dos separadores RoFormer:
#   · BS-RoFormer viperx 1297 (canción entera; .separado/<huella>/bsrof1297/): el que menos voz deja, pero recorta más
#     el espectro (más «gorgoteo»).
#   · MelBand RoFormer Inst V2 de Unwa (desde 5 s antes de la estancia; .separado/recorte-<lugar>/melinst2/): el más
#     limpio y «lleno» (menos artefactos), con algo más de voz residual.
# En mezclas de prueba con instrumental verdadera conocida (tramos instrumentales de las canciones + voz real de la misma
# canción), la media gana a los dos: SDR 17,3 dB (BS 17,0, Inst V2 16,6, becruily 16,0, htdemucs_ft 12,5), ruido
# espectral 5,4 dB (BS 7,8) y voz restante −31 dB.
# Cada instrumental va a la ganancia que mejor reconstruye el original con su propia voz (el separador normaliza).
# Escribe .separado/<huella>/ensamble/{instrumental,vocals}.wav en la línea de tiempo de la canción (fuera del recorte,
# BS-RoFormer; no se usa). Antes: scripts/separar-instrumental.py con los dos modelos.
# Uso: .pruebas/audio/bin/python scripts/ensamblar-instrumental.py [--recortar]
import hashlib, json, sys
from pathlib import Path
import numpy as np, soundfile as sf

RAIZ = Path(__file__).resolve().parent.parent
ORIG = RAIZ.parent.parent.parent / 'audios-originales' if 'worktrees' in str(RAIZ) else RAIZ / 'audios-originales'
SEP = ORIG / '.separado'; SR = 44100
CANCION = {'supernova': 'Supernova-Galaxia', 'pulsar': 'Galaxia-Analizar1', 'deneb': 'Deneb-Galaxia', 'ton618': 'Galaxia-Analizar4',
           'sagitario': 'Galaxia-Analizar2', 'hogar': 'Galaxia-Analizar3'}
if '--recortar' in sys.argv:
    # 1.er paso: recortes «desde − 5 s → final» de cada canción para separarlos con Inst V2 (separar-instrumental.py
    # melband_roformer_inst_v2.ckpt melinst2 recorte-supernova recorte-pulsar …)
    DESDE = {'supernova': 174.3, 'pulsar': 126.289, 'deneb': 196.25, 'ton618': 135.971, 'sagitario': 180.345, 'hogar': 51.195}
    rec = {}
    for n, d in DESDE.items():
        b = SEP / hashlib.sha1((ORIG / CANCION[n]).read_bytes()).hexdigest()[:12]; x = sf.read(b / 'entrada.wav', dtype='float32')[0]
        (SEP / f'recorte-{n}').mkdir(exist_ok=True); sf.write(SEP / f'recorte-{n}/entrada.wav', x[int((d - 5) * SR):], SR); rec[n] = d - 5
    (SEP / 'recortes.json').write_text(json.dumps(rec)); sys.exit(0)
rec = json.loads((SEP / 'recortes.json').read_text())   # lugar → segundo de la canción en que empieza su recorte

def ganancia(m, i, v):
    s = (i + v).ravel(); return float(np.dot(m.ravel(), s) / np.dot(s, s))

for n, t0 in rec.items():
    ruta = ORIG / CANCION[n]; b = SEP / hashlib.sha1(ruta.read_bytes()).hexdigest()[:12]
    m = sf.read(b / 'entrada.wav')[0]; i1 = sf.read(b / 'bsrof1297/instrumental.wav')[0]; v1 = sf.read(b / 'bsrof1297/vocals.wav')[0]
    L = min(len(m), len(i1), len(v1)); m, i1, v1 = m[:L], i1[:L], v1[:L]
    a = int(round(t0 * SR)); r = SEP / f'recorte-{n}'
    i2 = sf.read(r / 'melinst2/instrumental.wav')[0]; v2 = sf.read(r / 'melinst2/vocals.wav')[0]; k = min(len(i2), L - a)
    g1 = ganancia(m[a:a + k], i1[a:a + k], v1[a:a + k]); g2 = ganancia(m[a:a + k], i2[:k], v2[:k])
    inst = i1 * g1; inst[a:a + k] = (i1[a:a + k] * g1 + i2[:k] * g2) / 2
    (b / 'ensamble').mkdir(exist_ok=True)
    sf.write(b / 'ensamble/instrumental.wav', inst, SR, subtype='FLOAT'); sf.write(b / 'ensamble/vocals.wav', m - inst, SR, subtype='FLOAT')
    print(n, 'ganancias', round(g1, 3), round(g2, 3))
