# Utilidades compartidas por los scripts de separación de voz (Linux y Windows, sin rutas fijas).
#   separar-candidatos.py · comparar-separaciones.py · escucha-ciegas.py · verificar-alineacion.py · quitar-voz.py
import ast, hashlib, json, subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

RAIZ = Path(__file__).resolve().parent.parent
SR = 44100
ORIGINALES = RAIZ / 'audios-originales'
MUSICA = RAIZ / 'assets' / 'musica'


# ---------- canciones y tramos ----------

def planes():
    """Los tramos de cada estancia, leídos de scripts/preparar-estancias.py (PLANES) sin ejecutarlo."""
    src = (RAIZ / 'scripts' / 'preparar-estancias.py').read_text(encoding='utf-8')
    for nodo in ast.parse(src).body:
        if isinstance(nodo, ast.Assign) and any(getattr(t, 'id', None) == 'PLANES' for t in nodo.targets):
            return eval(compile(ast.Expression(nodo.value), 'PLANES', 'eval'), {'__builtins__': {}, 'dict': dict, 'None': None})
    raise RuntimeError('No encuentro PLANES en preparar-estancias.py')


def ruta_cancion(nombre: str) -> Path:
    """Busca la canción en audios-originales/ (con o sin extensión)."""
    p = ORIGINALES / nombre
    if p.exists(): return p
    hits = sorted(ORIGINALES.glob(nombre + '.*'))
    hits = [h for h in hits if not h.name.endswith('.json')]
    if not hits: raise FileNotFoundError(f'No está {nombre} en {ORIGINALES}')
    return hits[0]


def huella(ruta: Path) -> str:
    return hashlib.sha1(Path(ruta).read_bytes()).hexdigest()[:12]


def carpeta(ruta: Path) -> Path:
    """Caché de separaciones de una canción: <carpeta de la canción>/.separado/<huella>/ (la misma de siempre)."""
    ruta = Path(ruta)
    return ruta.parent / '.separado' / huella(ruta)


def decodificar(ruta: Path) -> Path:
    """entrada.wav 44,1 kHz estéreo en la caché (ffmpeg lee cualquier formato)."""
    wav = carpeta(ruta) / 'entrada.wav'
    if not wav.exists():
        wav.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ruta), '-ar', str(SR), '-ac', '2', str(wav)], check=True)
    return wav


# ---------- audio ----------

def leer(ruta, mono=False) -> np.ndarray:
    x, sr = sf.read(str(ruta), dtype='float64', always_2d=True)
    if sr != SR: raise ValueError(f'{ruta}: {sr} Hz (se esperaba {SR})')
    return x.mean(1) if mono else x


def escribir(ruta, x):
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(ruta), np.asarray(x, np.float32), SR, subtype='FLOAT')


def leer_m4a(ruta, sr=SR) -> np.ndarray:
    """Mono float32 de cualquier archivo con ffmpeg (para los .m4a publicados)."""
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ruta), '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                       capture_output=True, check=True).stdout
    return np.frombuffer(b, np.float32).astype(np.float64)


def igualar(*xs):
    n = min(len(x) for x in xs)
    return [x[:n] for x in xs]


def ganancia(mezcla, inst, voz) -> float:
    """Ganancia (mínimos cuadrados) con la que inst + voz reconstruye la mezcla: deshace la normalización del separador."""
    mezcla, inst, voz = igualar(mezcla, inst, voz)
    s = (inst + voz).ravel()
    return float(np.dot(mezcla.ravel(), s) / (np.dot(s, s) or 1.0))


def db(x, eps=1e-12):
    return 10 * np.log10(np.asarray(x, np.float64) + eps)


def sdr(verdad, estimado) -> float:
    verdad, estimado = igualar(verdad, estimado)
    return float(db(np.sum(verdad ** 2)) - db(np.sum((verdad - estimado) ** 2)))


def rms_frames(x, hop=0.1):
    """RMS (dB) por ventanas de `hop` s, mono."""
    m = x.mean(1) if x.ndim == 2 else x
    h = int(hop * SR); k = len(m) // h
    return db(np.mean(m[:k * h].reshape(k, h) ** 2, axis=1))


# ---------- ensembles (como UVR / audio-separator) ----------

def _stft(x, n=2048, hop=1024):
    from scipy.signal import stft
    return stft(x.T, fs=SR, nperseg=n, noverlap=n - hop)[2]   # (canal, freq, tiempo)


def _istft(S, largo, n=2048, hop=1024):
    from scipy.signal import istft
    y = istft(S, fs=SR, nperseg=n, noverlap=n - hop)[1].T
    out = np.zeros((largo, S.shape[0])); k = min(largo, len(y)); out[:k] = y[:k]
    return out


def ensemble(instrumentales, metodo='avg_wave', pesos=None):
    """Combina instrumentales ya alineadas y con ganancia corregida.
    avg_wave: media de ondas (la del repo; la de mejor SDR).  min_spec: en cada celda tiempo-frecuencia se queda la de
    MENOR magnitud (la que menos voz deja; algo más «seca»).  max_spec: la de MAYOR (la más «llena»; algo más de voz)."""
    xs = igualar(*instrumentales)
    if metodo == 'avg_wave':
        w = np.ones(len(xs)) if pesos is None else np.asarray(pesos, float)
        return sum(x * wi for x, wi in zip(xs, w)) / w.sum()
    if metodo in ('min_spec', 'max_spec', 'uvr_min_spec', 'uvr_max_spec'):
        S = np.stack([_stft(x) for x in xs])               # (modelo, canal, freq, tiempo)
        idx = (np.abs(S).argmin if 'min' in metodo else np.abs(S).argmax)(axis=0)
        sel = np.take_along_axis(S, idx[None], axis=0)[0]
        return _istft(sel, len(xs[0]))
    raise ValueError(f'Método de ensemble desconocido: {metodo}')


# ---------- caché de candidatos ----------

def ruta_candidato(cancion: Path, nombre: str) -> Path:
    return carpeta(cancion) / nombre


def candidato_listo(cancion: Path, nombre: str) -> bool:
    d = ruta_candidato(cancion, nombre)
    return (d / 'instrumental.wav').exists() and (d / 'vocals.wav').exists()


def candidatos_de(cancion: Path):
    base = carpeta(cancion)
    if not base.exists(): return []
    return sorted(d.name for d in base.iterdir() if d.is_dir() and (d / 'instrumental.wav').exists())


def guardar_json(ruta, datos):
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    Path(ruta).write_text(json.dumps(datos, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
