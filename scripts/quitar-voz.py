# Quita la voz de una canción y deja SOLO su instrumental real (la misma grabación, sin nada imitado ni añadido).
#
# Cómo lo hace (lo mismo que UVR / las apps profesionales de separar pistas):
#   1. Pasa la canción por dos redes de separación entrenadas para esto:
#        · BS-RoFormer viperx 1297  → el que menos voz deja.
#        · MelBand RoFormer Inst V2 → el más limpio y «lleno» (menos gorgoteo).
#   2. Ajusta la ganancia de cada una para que instrumental + voz reconstruya el original (los separadores normalizan).
#   3. Hace la media de las dos instrumentales («ensemble»): en las pruebas del proyecto gana a cada modelo por separado
#      (SDR 17,3 dB frente a 17,0 y 16,6).  La voz = original − instrumental.
#   Como sale de la grabación original, va en el MISMO tempo, compás y tonalidad: se puede empalmar con el clip.
#
# Instalar (una vez). Hace falta ffmpeg en el PATH.
#   Windows:  py -3.11 -m venv .pruebas\audio
#             .pruebas\audio\Scripts\pip install "audio-separator[gpu]" soundfile numpy      (sin NVIDIA: [cpu])
#   Linux:    python3 -m venv .pruebas/audio && .pruebas/audio/bin/pip install "audio-separator[gpu]" soundfile numpy
#   Los modelos (~600 MB) se descargan solos la primera vez en .pruebas/modelos-separacion/.
#
# Uso:
#   .pruebas\audio\Scripts\python scripts\quitar-voz.py audios-originales\Deneb-Galaxia.mp3
#   .pruebas\audio\Scripts\python scripts\quitar-voz.py audios-originales            (todas las canciones de la carpeta)
#   … --solo bs        un único modelo (más rápido; o si Inst V2 deja restos de voz en esa canción)
#   … --desde 95.2     separar solo desde ese segundo (ahorra tiempo en CPU; para escuchar: las estancias
#                      necesitan la canción entera porque preparar-estancias.py corta por segundos de la canción)
#   … --m4a            además guarda instrumental.m4a lista para escuchar
#
# Resultado, junto a la canción (la misma caché que usan analizar-audio.py y preparar-estancias.py):
#   <carpeta>/.separado/<huella>/ensamble/instrumental.wav   y   vocals.wav
#   → luego:  python scripts/preparar-estancias.py  (usa --separacion ensamble por defecto)
import argparse, hashlib, shutil, subprocess, sys, tempfile, time
from pathlib import Path

import numpy as np
import soundfile as sf

RAIZ = Path(__file__).resolve().parent.parent
SR = 44100
MODELOS = {
    'bs': ('model_bs_roformer_ep_317_sdr_12.9755.ckpt', 'bsrof1297'),
    'inst': ('melband_roformer_inst_v2.ckpt', 'melinst2'),
}
EXT = {'.mp3', '.m4a', '.wav', '.flac', '.ogg', '.opus', '.aac', '.mp4', '.webm', '.aiff', '.aif'}


def huella(ruta: Path) -> str:
    return hashlib.sha1(ruta.read_bytes()).hexdigest()[:12]


def decodificar(ruta: Path, destino: Path) -> Path:
    """WAV de trabajo 44,1 kHz estéreo (ffmpeg lee cualquier formato)."""
    wav = destino / 'entrada.wav'
    if not wav.exists():
        destino.mkdir(parents=True, exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ruta), '-ar', str(SR), '-ac', '2', str(wav)], check=True)
    return wav


def separar(entrada: Path, dst: Path, modelo: str, dir_modelos: Path):
    """Un modelo → dst/instrumental.wav + dst/vocals.wav (en caché: si ya existe no se repite)."""
    if (dst / 'instrumental.wav').exists() and (dst / 'vocals.wav').exists():
        print(f'   {dst.name}: ya separado', flush=True); return
    from audio_separator.separator import Separator   # import aquí: tarda y solo hace falta si hay trabajo
    with tempfile.TemporaryDirectory(dir=dst.parent) as tmp:
        tmp = Path(tmp)
        s = Separator(output_dir=str(tmp), model_file_dir=str(dir_modelos), output_format='WAV',
                      mdxc_params={'segment_size': 256, 'override_model_segment_size': False,
                                   'batch_size': 1, 'overlap': 8, 'pitch_shift': 0})
        s.load_model(model_filename=modelo)
        t = time.time(); salida = s.separate(str(entrada))
        dst.mkdir(parents=True, exist_ok=True)
        for f in salida:
            f = Path(f) if Path(f).is_absolute() else tmp / Path(f).name
            low = f.name.lower()
            if '(vocals)' in low: shutil.move(str(f), dst / 'vocals.wav')
            elif '(instrumental)' in low or '(no_vocals)' in low or '(other)' in low: shutil.move(str(f), dst / 'instrumental.wav')
        if not (dst / 'instrumental.wav').exists() or not (dst / 'vocals.wav').exists():
            raise RuntimeError(f'{modelo} no devolvió instrumental y voz: {salida}')
        print(f'   {dst.name}: {time.time() - t:.0f} s', flush=True)


def leer(ruta: Path) -> np.ndarray:
    x, sr = sf.read(ruta, dtype='float64', always_2d=True)
    assert sr == SR, (ruta, sr)
    return x


def ganancia(mezcla, inst, voz) -> float:
    """La ganancia con la que instrumental + voz reconstruye mejor el original."""
    s = (inst + voz).ravel()
    return float(np.dot(mezcla.ravel(), s) / (np.dot(s, s) or 1.0))


def procesar(ruta: Path, A):
    base = ruta.parent / '.separado' / huella(ruta)
    entrada = decodificar(ruta, base)
    if A.desde:   # recorte: solo se separa desde ahí (la salida sigue en la línea de tiempo de la canción entera)
        rec = base / f'desde-{A.desde:g}'; rec.mkdir(exist_ok=True)
        if not (rec / 'entrada.wav').exists():
            x = leer(entrada); sf.write(rec / 'entrada.wav', x[int(A.desde * SR):], SR, subtype='FLOAT')
        trabajo, t0 = rec, int(A.desde * SR)
    else:
        trabajo, t0 = base, 0
    m = leer(entrada)
    claves = [A.solo] if A.solo else list(MODELOS)
    insts = []
    for k in claves:
        modelo, corto = MODELOS[k]
        separar(trabajo / 'entrada.wav', trabajo / corto, modelo, Path(A.modelos))
        i, v = leer(trabajo / corto / 'instrumental.wav'), leer(trabajo / corto / 'vocals.wav')
        n = min(len(i), len(v), len(m) - t0); i, v = i[:n], v[:n]
        g = ganancia(m[t0:t0 + n], i, v); insts.append(i * g)
        print(f'   {corto}: ganancia {g:.3f}', flush=True)
    n = min(len(x) for x in insts)
    inst = np.zeros_like(m); inst[t0:t0 + n] = sum(x[:n] for x in insts) / len(insts)
    if t0: inst[:t0] = np.nan   # antes del recorte no hay separación: se recorta abajo
    voz = m - inst

    nombre = 'ensamble' if len(claves) > 1 else MODELOS[claves[0]][1]
    if A.desde: nombre += f'-desde-{A.desde:g}'
    out = base / nombre; out.mkdir(exist_ok=True)
    sl = slice(t0, t0 + n) if t0 else slice(None)
    sf.write(out / 'instrumental.wav', inst[sl].astype(np.float32), SR, subtype='FLOAT')
    sf.write(out / 'vocals.wav', voz[sl].astype(np.float32), SR, subtype='FLOAT')

    # Cuánta voz quedaba y cuánta se quitó (orientativo): energía de la voz separada respecto al original.
    e = lambda x: 10 * np.log10(np.mean(x[sl] ** 2) + 1e-12)
    print(f'   voz quitada: {e(voz) - e(m):+.1f} dB respecto al original  →  {out}', flush=True)

    if A.m4a:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'instrumental.wav'), '-c:a', 'aac', '-b:a', '192k',
                        '-movflags', '+faststart', str(out / 'instrumental.m4a')], check=True)
        print(f'   {out / "instrumental.m4a"}', flush=True)


def main():
    ap = argparse.ArgumentParser(description='Quita la voz de canciones (BS-RoFormer + MelBand Inst V2).')
    ap.add_argument('audios', nargs='+', help='archivos o carpetas')
    ap.add_argument('--solo', choices=list(MODELOS), help='usar un único modelo: bs o inst')
    ap.add_argument('--desde', type=float, default=0, help='separar solo desde este segundo')
    ap.add_argument('--m4a', action='store_true', help='guardar también instrumental.m4a')
    ap.add_argument('--modelos', default=str(RAIZ / '.pruebas' / 'modelos-separacion'))
    A = ap.parse_args()
    if not shutil.which('ffmpeg'): sys.exit('Falta ffmpeg en el PATH (Windows: winget install Gyan.FFmpeg).')

    rutas = []
    for a in map(Path, A.audios):
        if a.is_dir(): rutas += sorted(p for p in a.iterdir() if p.is_file() and not p.name.startswith('.') and (p.suffix.lower() in EXT or not p.suffix))
        else: rutas.append(a)
    for r in rutas:
        print(f'● {r.name}', flush=True)
        procesar(r, A)


if __name__ == '__main__':
    main()
