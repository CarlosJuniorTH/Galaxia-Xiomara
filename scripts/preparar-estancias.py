# Estancias: la instrumental que suena en cada lugar cuando acaba su canción (js/data/bandaSonora.js, `estancia`).
#
# Cada estancia es la MISMA canción sin la voz y nada más: la instrumental tal cual, sacada con un separador de calidad
# profesional, sin nada añadido: la media de BS-RoFormer y MelBand Inst V2 (scripts/ensamblar-instrumental.py: es la
# que mejor reproduce la instrumental verdadera en mezclas de prueba), o BS-RoFormer solo donde Inst V2 deja voz.
#   · Un solo tramo continuo, sin empalmes: empieza 3 s antes de donde acaba el fragmento del clip (el mezclador,
#     js/ui/bandaSonora.js, la funde en esos 3 s finales), así que la canción sigue en el mismo compás, y llega hasta su
#     final natural (la canción se apaga sola) o, si es demasiado larga, hasta un primer tiempo de compás con un fundido
#     limpio de dos compases.
#   · Normaliza a −20 LUFS (dos pasadas de loudnorm) y guarda AAC .m4a como scripts/preparar-audio.mjs; apunta en
#     assets/musica/indice.json bytes, duración, el tramo y el modelo.
#
# Separar (una vez, GPU): .pruebas/audio/bin/python <scratch>/sep.py <modelo.ckpt> <carpeta>  →  audios-originales/
#   .separado/<huella>/<carpeta>/instrumental.wav (la huella es la de scripts/analizar-audio.py).
# Uso: .pruebas/audio/bin/python scripts/preparar-estancias.py [supernova pulsar …] [--separacion bsrof1297]
import argparse, hashlib, json, subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

RAIZ = Path(__file__).resolve().parent.parent
SR = 44100

# Un tramo por lugar (segundos de la canción original): desde = final del clip − 3; hasta = None (final natural) o un
# primer tiempo de compás en el que se cierra con un fundido de dos compases.
PLANES = {
    'supernova': dict(cancion='Supernova-Galaxia', clip=(114.962, 177.3), desde=174.3, hasta=None),      # «Sparks»
    'pulsar': dict(cancion='Galaxia-Analizar1', clip=(95.643, 129.289), desde=126.289, hasta=None),       # «Neo Romeo»
    # «Middle»: hasta el final de su último estribillo (265,9); después el puente es casi solo voz (la instrumental queda
    # a −21 dB con silencios entre frases), así que se cierra ahí con un fundido de dos compases.
    'deneb': dict(cancion='Deneb-Galaxia', clip=(155.806, 199.25), desde=196.25, hasta=265.915),
    'ton618': dict(cancion='Galaxia-Analizar4', clip=(101.634, 138.971), desde=135.971, hasta=None),      # «I Wanna Be Yours»
    'sagitario': dict(cancion='Galaxia-Analizar2', clip=(145.241, 183.345), desde=180.345, hasta=None),   # «Say Yes to Heaven»
    # «I Saw Your Face Today»: solo BS-RoFormer. Con Inst V2 en la media, Whisper oye restos de la letra (11 palabras
    # en el cuásar, 0 con BS-RoFormer solo): esta voz se cuela en Inst V2.
    'hogar': dict(cancion='Galaxia-Analizar3', clip=(23.057, 54.195), desde=51.195, hasta=None, separacion='bsrof1297'),
    # El cuásar (su clip es un mensaje hablado): la misma canción de casa desde su solo instrumental hasta el final.
    'cuasar': dict(cancion='Galaxia-Analizar3', clip=None, desde=95.202, hasta=None, separacion='bsrof1297'),
}

ap = argparse.ArgumentParser()
ap.add_argument('lugares', nargs='*')
ap.add_argument('--originales', default=str(RAIZ.parent.parent.parent / 'audios-originales') if 'worktrees' in str(RAIZ) else str(RAIZ / 'audios-originales'))
ap.add_argument('--separacion', default='ensamble', help='carpeta de la separación dentro de .separado/<huella>/')
ap.add_argument('--destino', default=str(RAIZ / 'assets/musica'))
ap.add_argument('--informe', default=None, help='carpeta para el wav sin comprimir y el JSON de cada estancia')
ap.add_argument('--lufs', type=float, default=-20)
ap.add_argument('--kbps', type=int, default=128)
A = ap.parse_args()
ORIG = Path(A.originales)

def huella(ruta): return hashlib.sha1(ruta.read_bytes()).hexdigest()[:12]
def rms_db(x, hop):
    m = x.mean(1) if x.ndim == 2 else x; h = int(hop * SR); k = len(m) // h
    return 20 * np.log10(np.sqrt((m[:k * h].reshape(k, h) ** 2).mean(1)) + 1e-9)

def construir(lugar, plan):
    ruta = ORIG / plan['cancion']; base = ruta.parent / '.separado' / huella(ruta) / plan.get('separacion', A.separacion)
    inst, sr = sf.read(base / 'instrumental.wav', dtype='float64'); assert sr == SR, sr
    an = json.load(open(ORIG / (plan['cancion'] + '.analisis.json'))); compases = np.array(an['compases'])
    a = plan['desde']; b = plan['hasta'] or len(inst) / SR
    x = inst[int(a * SR):int(b * SR)].copy()
    if plan['hasta']:
        # cierre limpio: fundido (coseno) de dos compases que acaba en el primer tiempo «hasta»
        bar = float(np.median(np.diff(compases))); nf = int(2 * bar * SR)
        x[-nf:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nf)))[:, None]
    else:
        # final natural: la canción se apaga sola; se recorta el silencio de después y un fundido de 2 s por seguridad
        d = rms_db(x, 0.05); umbral = np.percentile(d, 90) - 45
        ultimo = int(np.flatnonzero(d > umbral)[-1]); x = x[:min(len(x), int((ultimo * 0.05 + 0.4) * SR))]
        nf = int(2.0 * SR); x[-nf:] *= np.linspace(1, 0, nf)[:, None] ** 1.5
    ni = int(0.03 * SR); x[:ni] *= np.linspace(0, 1, ni)[:, None]   # (el mezclador ya funde 3 s; esto evita un clic)
    fin = a + len(x) / SR
    return x, dict(tramo=[round(a, 3), round(fin, 3)], separacion=plan.get('separacion', A.separacion), cancion=plan['cancion'],
                   continua_clip=bool(plan['clip']) and abs(a - (plan['clip'][1] - 3)) < 0.01, duracion=round(len(x) / SR, 3), uniones=[])

def codificar(lugar, x, info):
    tmp = Path(A.informe or '/tmp'); tmp.mkdir(parents=True, exist_ok=True); wav = tmp / f'{lugar}-estancia.wav'
    sf.write(wav, x.astype(np.float32), SR, subtype='FLOAT')
    med = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(wav), '-af', f'loudnorm=I={A.lufs}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(med[med.rindex('{'):med.rindex('}') + 1])
    filtro = f"loudnorm=I={A.lufs}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=44100"
    destino = Path(A.destino) / f'{lugar}-estancia.m4a'; destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-v', 'error', '-y', '-i', str(wav), '-vn', '-map_metadata', '-1', '-af', filtro, '-ac', '2', '-c:a', 'aac', '-b:a', f'{A.kbps}k', '-movflags', '+faststart', str(destino)], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(destino)], capture_output=True, text=True).stdout)
    ri = Path(A.destino) / 'indice.json'; indice = json.loads(ri.read_text()) if ri.exists() else {}
    indice[destino.name] = {'bytes': destino.stat().st_size, 'duracion': round(dur, 3), 'origen': info['cancion'],
                            'desde': info['tramo'][0], 'hasta': info['tramo'][1], 'lufs': A.lufs, 'separacion': info['separacion']}
    ri.write_text(json.dumps(dict(sorted(indice.items())), indent=2, ensure_ascii=False) + '\n')
    if A.informe: (Path(A.informe) / f'{lugar}-estancia.json').write_text(json.dumps(info, indent=1))
    print(f"{destino.name}: {dur:.1f} s · {destino.stat().st_size / 1048576:.2f} MB · tramo {info['tramo']} · {info['separacion']}", flush=True)

for lugar in (A.lugares or list(PLANES)):
    x, info = construir(lugar, PLANES[lugar]); codificar(lugar, x, info)
