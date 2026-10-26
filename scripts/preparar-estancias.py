# Estancias: la instrumental que suena en cada lugar cuando acaba su canción (js/data/bandaSonora.js, `estancia`).
#
# Cada estancia es la MISMA canción, en la parte que no suena en el videoclip, sin voz pero CON su melodía:
#   · Empieza 3 s antes de donde acaba el fragmento del clip (el mezclador, js/ui/bandaSonora.js, la funde en esos 3 s
#     finales de la canción): la estancia continúa la canción en el mismo compás, sin salto, en la misma tonalidad.
#   · Donde la canción ya es instrumental (intros, puentes, solos), suena el ORIGINAL (calidad perfecta, sin Demucs).
#   · Donde cantaba la voz, el instrumental de Demucs (no_vocals.wav) y, encima, la melodía de la voz tocada con un piano
#     eléctrico suave: el f0 de la voz aislada (pYIN) → notas → síntesis FM tipo Rhodes con un colchón que sostiene las
#     notas largas, un coro leve y reverberación. Así la melodía no desaparece donde estaba la voz.
#   · Si hace falta alargarla (45–90 s), se encadenan compases de otra parte de la canción: los saltos van de primer tiempo
#     a primer tiempo de compás, se elige el tramo cuyo contexto armónico (croma) y energía más se parecen, se alinea la
#     rejilla de pulsos (correlación de ataques, ±25 ms) y se funden en 80 ms con igual potencia justo antes del golpe.
#   · Termina en el final natural de la canción (su propio cierre), con un último fundido de seguridad.
# Normaliza a −20 LUFS (dos pasadas de loudnorm) y guarda AAC .m4a como scripts/preparar-audio.mjs; apunta en
# assets/musica/indice.json bytes, duración y los tramos usados.
#
# Uso: .pruebas/audio/bin/python scripts/preparar-estancias.py [supernova pulsar …] [--originales DIR] [--informe DIR]
import argparse, json, os, subprocess, sys
from pathlib import Path

import numpy as np
import librosa
import scipy.signal as ss
import soundfile as sf

RAIZ = Path(__file__).resolve().parent.parent
SR = 44100

# Planes: (modo, desde, hasta) en segundos de la canción original. modo «mezcla» = instrumental + melodía (y el original
# donde no hay voz en dos compases o más); «original» = la canción tal cual (solo en tramos sin voz).
# Cada salto (un tramo que no empieza donde acabó el anterior) se ajusta al primer tiempo de compás más cercano.
PLANES = {
    # «Sparks»: del final del clip (177,3) al final de la canción, que acaba sola en la guitarra.
    'supernova': dict(cancion='Supernova-Galaxia', clip=(114.962, 177.3), tramos=[('mezcla', 174.3, 225.58)]),
    # «Neo Romeo»: del final del clip al final; para llegar a 45 s se repiten 4 compases de la 2.ª estrofa (64,2–73,2)
    # en la frontera de la última estrofa (156,2), que es donde la armonía y la energía coinciden mejor.
    'pulsar': dict(cancion='Galaxia-Analizar1', clip=(95.643, 129.289),
                   tramos=[('mezcla', 126.289, 156.2), ('mezcla', 64.226, 73.213), ('mezcla', 156.2, 166.91)]),
    # «Middle»: del final del clip al final (estribillo, el «drop» instrumental, la última estrofa y el puente que se apaga).
    'deneb': dict(cancion='Deneb-Galaxia', clip=(155.806, 199.25), tramos=[('mezcla', 196.25, 300.33)]),
    # «I Wanna Be Yours»: del final del clip al final; antes del puente final, 4 compases de la intro original (el riff
    # sin voz, calidad perfecta), que encajan con ese punto mejor que ningún otro.
    'ton618': dict(cancion='Galaxia-Analizar4', clip=(101.634, 138.971),
                   tramos=[('mezcla', 135.971, 163.863), ('original', 3.855, 10.96), ('mezcla', 163.863, 183.96)]),
    # «Say Yes to Heaven»: al acabar el estribillo del clip, el estribillo anterior de la canción (102,3: su armonía
    # sigue a la del final del clip, croma 0,99), que desemboca en el estribillo instrumental (114,3–133,5, el original:
    # la misma progresión sin voz), y de ahí al último estribillo (185,7, croma 0,97) hasta el final.
    'sagitario': dict(cancion='Galaxia-Analizar2', clip=(145.241, 183.345),
                      tramos=[('mezcla', 180.345, 183.345), ('mezcla', 102.307, 133.515), ('mezcla', 185.69, 209.26)]),
    # «I Saw Your Face Today» en casa: del final del clip (54,2) hasta el final del solo instrumental (95,2–102,6,
    # original) y de ahí a la última estrofa (147,4: misma armonía, croma 0,97, y mismo nivel), que lleva al final.
    'hogar': dict(cancion='Galaxia-Analizar3', clip=(23.057, 54.195),
                  tramos=[('mezcla', 51.195, 102.609), ('mezcla', 147.423, 170.41)]),
    # La misma canción para el cuásar (su «clip» es un mensaje hablado): desde el solo instrumental hasta el final, con
    # el piano en la octava de la voz, como en casa.
    'cuasar': dict(cancion='Galaxia-Analizar3', clip=None, transporte=0, tramos=[('mezcla', 95.202, 170.41)]),
}

ap = argparse.ArgumentParser()
ap.add_argument('lugares', nargs='*')
ap.add_argument('--originales', default=str(RAIZ.parent.parent.parent / 'audios-originales') if 'worktrees' in str(RAIZ) else str(RAIZ / 'audios-originales'))
ap.add_argument('--destino', default=str(RAIZ / 'assets/musica'))
ap.add_argument('--informe', default=None, help='carpeta para el wav sin comprimir y el JSON de uniones de cada estancia')
ap.add_argument('--lufs', type=float, default=-20)
ap.add_argument('--kbps', type=int, default=128)
ap.add_argument('--nivel-melodia', type=float, default=-5, help='dB de la melodía respecto al instrumental donde suena')
A = ap.parse_args()
ORIG = Path(A.originales)


# ─── Entrada ─────────────────────────────────────────────────────────────────────────────────────────────────────────
def carpeta_demucs(ruta):
    import hashlib
    return ruta.parent / '.separado' / hashlib.sha1(ruta.read_bytes()).hexdigest()[:12] / 'htdemucs' / 'entrada'

def leer(ruta):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ruta), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).astype(np.float64)

def pistas(cancion):
    ruta = ORIG / cancion; base = carpeta_demucs(ruta)
    orig = leer(ruta); voz = sf.read(base / 'vocals.wav')[0]; inst = sf.read(base / 'no_vocals.wav')[0]
    n = min(len(orig), len(voz), len(inst))
    return orig[:n], voz[:n], inst[:n]

def rms_db(x, hop):
    m = x.mean(1) if x.ndim == 2 else x; h = int(hop * SR); k = len(m) // h
    return 20 * np.log10(np.sqrt((m[:k * h].reshape(k, h) ** 2).mean(1)) + 1e-9)


# ─── Melodía: voz aislada → notas → piano eléctrico ─────────────────────────────────────────────────────────────────
SRP, HOP = 22050, 256; DT = HOP / SRP

def notas_de_voz(voz_mono):
    """pYIN sobre la voz aislada → lista de notas (t0, t1, midi float, dB respecto al nivel alto de la voz)."""
    y = librosa.resample(voz_mono.astype(np.float32), orig_sr=SR, target_sr=SRP)
    f0, sonora, _ = librosa.pyin(y, fmin=60, fmax=1100, sr=SRP, frame_length=2048, hop_length=HOP, fill_na=np.nan)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=HOP)[0]
    ataque = librosa.onset.onset_strength(y=y, sr=SRP, hop_length=HOP)
    n = min(len(f0), len(rms), len(ataque)); f0, sonora, rms, ataque = f0[:n], sonora[:n], rms[:n], ataque[:n]
    db = 20 * np.log10(rms + 1e-9); ref = np.percentile(db, 95)
    m = np.where(np.isfinite(f0) & sonora & (db > ref - 32), librosa.hz_to_midi(np.nan_to_num(f0, nan=1.0)), np.nan)
    mm = m.copy()  # mediana de 5 cuadros (quita temblores sin mover las notas)
    for i in np.flatnonzero(np.isfinite(m)):
        w = m[max(0, i - 2):i + 3]; mm[i] = np.median(w[np.isfinite(w)])
    golpes = set(ss.find_peaks(ataque / (np.percentile(ataque, 99) + 1e-9), height=0.35, distance=int(0.12 / DT))[0])
    res, i = [], 0
    while i < n:
        if not np.isfinite(mm[i]): i += 1; continue
        j, vals = i, [mm[i]]
        while j + 1 < n and np.isfinite(mm[j + 1]):
            med = np.median(vals)
            if abs(mm[j + 1] - med) > 0.6:  # cambio de altura sostenido (4 cuadros, ~46 ms)
                fut = mm[j + 1:j + 5]
                if np.all(np.isfinite(fut)) and np.all(abs(fut - med) > 0.6): break
            if (j + 1) in golpes and (j + 1 - i) * DT > 0.12: break  # sílaba nueva a la misma altura
            j += 1; vals.append(mm[j])
        if (j + 1 - i) * DT >= 0.09: res.append([i * DT, (j + 1) * DT, float(np.median(vals)), float(db[i:j + 1].mean() - ref)])
        i = j + 1
    cuadros = [(k * DT, float(mm[k])) for k in np.flatnonzero(np.isfinite(mm))]
    return res, cuadros

def limpiar_notas(lista, afinacion=0.0):
    """Alturas referidas a la afinación de la banda (no todas las grabaciones están en La 440), octavas sueltas
    corregidas con la mediana de sus vecinas y todo dentro de ±10 semitonos de la mediana de la melodía (con dos voces,
    pYIN salta de una a otra), escala propia de la melodía (las 7 clases de altura más cantadas) para las notas cortas
    fuera de ella, y notas iguales pegadas unidas."""
    if not lista: return [], set(), 0
    p = np.array([n[2] for n in lista]) - afinacion
    for k in range(len(lista)):
        vec = p[max(0, k - 4):k + 5]; med = np.median(vec)
        while p[k] - med > 8: p[k] -= 12
        while med - p[k] > 8: p[k] += 12
    gm = np.median(p)
    p = np.where(p > gm + 10, p - 12, np.where(p < gm - 10, p + 12, p))
    q = np.round(p).astype(int)
    peso = np.zeros(12)
    for n, v in zip(lista, q): peso[v % 12] += n[1] - n[0]
    escala = set(np.argsort(peso)[-7:].tolist())
    out = []
    for n, v, pf in zip(lista, q, p):
        if v % 12 not in escala and n[1] - n[0] < 0.25:
            v = min((v - 1, v + 1), key=lambda c: (c % 12 not in escala, abs(c - pf)))
        if out and out[-1][2] == v and n[0] - out[-1][1] < 0.04 and n[1] - n[0] < 0.15:
            out[-1] = (out[-1][0], n[1], v, max(out[-1][3], n[3]))
        else: out.append((n[0], n[1], int(v), n[3]))
    return out, escala, float(np.median(q))

def nota_piano(f, dur, vel):
    """Piano eléctrico FM (portadora 1:1 con índice que decae, «púa» 14:1 muy corta) + colchón senoidal que sostiene."""
    n = int((dur + 0.4) * SR); t = np.arange(n) / SR
    tau = 1.7 * (220 / f) ** 0.35
    suelta = np.where(t > dur, np.exp(-(t - dur) / 0.09), 1.0)
    env = np.minimum(1, t / 0.004) * np.exp(-t / tau) * suelta
    ind = (1.4 * np.exp(-t / 0.25) + 0.3) * vel
    tono = np.sin(2 * np.pi * f * t + ind * np.sin(2 * np.pi * f * t))
    pua = 0.10 * vel * np.sin(2 * np.pi * f * t + 1.0 * np.exp(-t / 0.03) * np.sin(2 * np.pi * 14 * f * t)) * np.exp(-t / 0.05)
    colchon = 0.28 * np.minimum(1, t / 0.12) * (np.sin(2 * np.pi * f * t) + 0.15 * np.sin(4 * np.pi * f * t)) * np.where(t > dur, np.exp(-(t - dur) / 0.14), 1.0)
    trem = 1 + 0.05 * np.sin(2 * np.pi * 5.0 * t)
    s = ((tono * env + pua) * trem + colchon) * vel
    s[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return s

def sintetizar(lista, total, transporte, afinacion=0.0):
    L = np.zeros(int(total * SR) + 2 * SR); R = np.zeros_like(L)
    for k, (t0, t1, q, d) in enumerate(lista):
        f = float(librosa.midi_to_hz(q + transporte + afinacion)); vel = float(np.clip(10 ** ((d + 6) / 40), 0.55, 1.0))
        # legato: si la nota siguiente llega enseguida (< 0,15 s de hueco), esta suena hasta ella
        sig = lista[k + 1][0] if k + 1 < len(lista) else 1e9
        dur = max(0.12, t1 - t0, sig - t0 if sig - t1 < 0.15 else 0)
        a = nota_piano(f, dur, vel); b = nota_piano(f * 2 ** (7 / 1200), dur, vel * 0.5)  # coro: 2.ª voz desafinada 7 cents
        i = int(t0 * SR); j = min(len(L), i + len(a))
        L[i:j] += (a + 0.45 * b)[:j - i]; R[i:j] += (0.85 * a + 0.65 * b)[:j - i]
    return np.stack([L, R], 1)[:int(total * SR)]

def reverberar(x, mezcla=0.25, sala=0.83):
    """Reverberación tipo Freeverb (8 peines con amortiguación + 4 pasatodo), distinta en cada canal."""
    out = np.zeros_like(x)
    for c in range(2):
        e = ss.lfilter([0.6], [1, -0.4], x[:, c] * 0.015); acc = np.zeros(len(e))
        for d in (1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617):
            d += 23 * c; a = np.zeros(d + 1); a[0] = 1; a[d] = -sala; acc += ss.lfilter([1], a, e)
        for d in (556, 441, 341, 225):
            d += 23 * c; b = np.zeros(d + 1); b[0] = -0.5; b[d] = 1; a = np.zeros(d + 1); a[0] = 1; a[d] = -0.5
            acc = ss.lfilter(b, a, acc)
        out[:, c] = acc
    return x * (1 - mezcla * 0.5) + out * mezcla * 3


# ─── Montaje ─────────────────────────────────────────────────────────────────────────────────────────────────────────
def construir(lugar, plan):
    an = json.load(open(ORIG / (plan['cancion'] + '.analisis.json')))
    compases = np.array(an['compases']); bar = float(np.median(np.diff(compases)))
    orig, voz, inst = pistas(plan['cancion'])
    vdb = rms_db(voz, 0.05); vref = np.percentile(vdb, 95)
    sin_voz = vdb < vref - 35  # cuadros de 50 ms sin voz (ni su eco)

    # Tramos con los saltos ajustados al compás
    tramos = [list(t) for t in plan['tramos']]
    al_compas = lambda t: float(compases[np.argmin(abs(compases - t))])
    for k in range(len(tramos)):
        modo, a, b = tramos[k]
        if k > 0 and abs(tramos[k - 1][2] - a) > 1e-3: tramos[k][1] = al_compas(a); tramos[k - 1][2] = al_compas(tramos[k - 1][2])
    # alineación fina de la rejilla en cada salto: los 2 s antes de cada primer tiempo deben latir igual
    env = librosa.onset.onset_strength(y=librosa.resample(inst.mean(1).astype(np.float32), orig_sr=SR, target_sr=22050), sr=22050, hop_length=128)
    fps = 22050 / 128
    for k in range(1, len(tramos)):
        b, a = tramos[k - 1][2], tramos[k][1]
        if abs(b - a) < 1e-3: continue
        ia, ib = int(a * fps), int(b * fps); w = int(2 * fps); L = int(0.025 * fps)
        ref = env[ib - w:ib]; mejor = (-1e9, 0)
        for d in range(-L, L + 1):
            c = env[ia - w + d:ia + d]; s = float(np.dot(ref - ref.mean(), c - c.mean()))
            mejor = max(mejor, (s, d))
        tramos[k][1] = a + mejor[1] / fps

    # Fuente de cada tramo: original donde no hay voz en ≥ 2 compases seguidos; si no, instrumental de Demucs.
    def fuente(modo, a, b, margen):
        i0, i1 = int((a - margen) * SR), int((b + margen) * SR)
        i0c, i1c = max(0, i0), min(len(orig), i1)
        x_o = np.zeros((i1 - i0, 2)); x_i = np.zeros((i1 - i0, 2))
        x_o[i0c - i0:i1c - i0] = orig[i0c:i1c]; x_i[i0c - i0:i1c - i0] = inst[i0c:i1c]
        if modo == 'original': return x_o, 1.0
        f = sin_voz[int((a - margen) / 0.05):int((b + margen) / 0.05) + 1].astype(float)
        f = np.pad(f, (0, max(0, int((b - a + 2 * margen) / 0.05) + 1 - len(f))), constant_values=1)
        # solo tramos sin voz de 2 compases o más, recortados 0,15 s por cada lado
        g = np.zeros_like(f); i = 0; minimo = int(2 * bar / 0.05)
        while i < len(f):
            if f[i]:
                j = i
                while j < len(f) and f[j]: j += 1
                if j - i >= minimo: g[i + 3:j - 3] = 1
                i = j
            else: i += 1
        w = np.interp(np.arange(len(x_o)) / SR, np.arange(len(g)) * 0.05, np.convolve(g, np.ones(4) / 4, 'same'))
        return x_i * (1 - w[:, None]) + x_o * w[:, None], float(g.mean())

    margen = 0.5
    total = sum(b - a for _, a, b in tramos)
    salida = np.zeros((int((total + 2 * margen + 1) * SR), 2))
    uniones, pos, melodia_notas, voz_cuadros = [], 0.0, [], []
    canta = np.zeros(int(total / 0.05) + 2, bool)  # dónde cantaba la voz (a 25 dB de su nivel alto), en tiempo de salida
    for k, (modo, a, b) in enumerate(tramos):
        x, parte_orig = fuente(modo, a, b, margen)
        t = np.arange(len(x)) / SR - margen  # tiempo relativo al inicio del tramo
        g = np.ones(len(x))
        # Un tramo intercalado (ni el primero ni el último) entra al nivel del compás anterior y sale al del siguiente
        # (rampa lineal en dB, ±6 dB como mucho): sin escalones de volumen en los saltos.
        if 0 < k < len(tramos) - 1:
            nivel = lambda y: np.sqrt(np.mean(y ** 2)) + 1e-9
            ant, sig = tramos[k - 1], tramos[k + 1]
            prev = fuente(ant[0], ant[2] - bar, ant[2], 0)[0]; post = fuente(sig[0], sig[1], sig[1] + bar, 0)[0]
            ini = x[int(margen * SR):int((margen + bar) * SR)]; fin_ = x[int((margen + b - a - bar) * SR):int((margen + b - a) * SR)]
            g0 = np.clip(20 * np.log10(nivel(prev) / nivel(ini)), -6, 6); g1 = np.clip(20 * np.log10(nivel(post) / nivel(fin_)), -6, 6)
            g *= 10 ** (np.interp(t, [0, b - a], [g0, g1]) / 20)
        # entrada
        if k == 0: g[t < 0] = 0; ini = np.clip(t / 0.03, 0, 1); g *= ini
        else:
            salto = abs(tramos[k - 1][2] - a) > 1e-3
            xf, c = (0.08, -0.02) if salto else (0.25, 0.0)
            u = np.clip((t - (c - xf / 2)) / xf, 0, 1)
            g *= np.sin(u * np.pi / 2) if salto else u
        # salida
        if k < len(tramos) - 1:
            salto = abs(tramos[k + 1][1] - b) > 1e-3
            xf, c = (0.08, -0.02) if salto else (0.25, 0.0)
            u = np.clip((t - (b - a) - (c - xf / 2)) / xf, 0, 1)
            g *= np.cos(u * np.pi / 2) if salto else 1 - u
            # cambio de nivel que la propia canción tiene en el punto de llegada (para juzgar si el del salto es natural)
            sm, sa = tramos[k + 1][0], tramos[k + 1][1]
            nat = 20 * np.log10((np.sqrt(np.mean(fuente(sm, sa, sa + 1, 0)[0] ** 2)) + 1e-9) / (np.sqrt(np.mean(fuente(sm, sa - 1, sa, 0)[0] ** 2)) + 1e-9))
            uniones.append({'en': round(pos + (b - a), 3), 'tipo': 'salto' if salto else 'continuo', 'de': round(b, 3), 'a': round(tramos[k + 1][1], 3), 'cambio_natural_dB': round(float(nat), 1)})
        else: g[t > b - a] = 0
        i0 = int(round((pos - margen) * SR))  # índice de salida de t = −margen
        lo = max(0, i0); salida[lo:i0 + len(x)] += (x * g[:, None])[lo - i0:]
        # melodía del tramo (solo en modo mezcla), en tiempo de salida
        if modo == 'mezcla':
            ns, cuadros = notas_de_voz(voz[int(a * SR):int(b * SR)].mean(1))
            melodia_notas += [(pos + n[0], pos + min(n[1], b - a), n[2], n[3]) for n in ns if n[0] < b - a - 0.05]
            voz_cuadros += [(pos + t_, m_) for t_, m_ in cuadros if t_ < b - a]
        if modo == 'mezcla':
            c = vdb[int(a / 0.05):int(b / 0.05)] > vref - 25; k0 = int(round(pos / 0.05)); canta[k0:k0 + len(c)] = c[:len(canta) - k0]
        pos += b - a
    salida = salida[:int(total * SR)]

    # afinación de la banda (fracción de semitono respecto a La 440), medida en el instrumental
    afin = float(librosa.estimate_tuning(y=librosa.resample(inst.mean(1)[:120 * SR].astype(np.float32), orig_sr=SR, target_sr=22050), sr=22050))
    notas, escala, mediana = limpiar_notas(sorted(melodia_notas), afin)
    suena = np.zeros_like(canta)
    for t0, t1, _, _ in notas: suena[int(t0 / 0.05):int(t1 / 0.05) + 3] = True  # (+0,15 s: la nota sigue sonando)
    cobertura = float((canta & suena).sum() / max(1, canta.sum()))
    # fidelidad: en cada cuadro con voz afinada, ¿la nota que suena es la que canta (misma clase de altura, ±0,5 st)?
    ini_n = np.array([n[0] for n in notas]); bien = tot = 0
    for t_, m_ in voz_cuadros:
        k_ = np.searchsorted(ini_n, t_, 'right') - 1
        if k_ < 0 or t_ > notas[k_][1]: continue
        tot += 1; bien += abs(((m_ - afin - notas[k_][2]) + 6) % 12 - 6) <= 0.5
    fidelidad = bien / max(1, tot)
    # una octava arriba si la voz es grave (el piano canta más claro por encima de la banda); el plan puede fijarlo
    transporte = plan.get('transporte', 12 if mediana < 60 else 0)
    if notas:
        mel = reverberar(sintetizar(notas, total, transporte, afin))
        # nivel: donde suena, la melodía queda a --nivel-melodia dB (−5) del instrumental que la acompaña: se oye clara,
        # como un instrumento solista, sin taparlo
        mdb = rms_db(mel, 0.05); activo = mdb > mdb.max() - 30
        ia = np.repeat(activo, int(0.05 * SR)); n_ = min(len(mel), len(salida), len(ia)); ia = ia[:n_]
        rel0 = 20 * np.log10(np.sqrt(np.mean(mel[:n_][ia] ** 2)) / (np.sqrt(np.mean(salida[:n_][ia] ** 2)) + 1e-9) + 1e-12)
        mel *= 10 ** ((A.nivel_melodia - rel0) / 20); rel = A.nivel_melodia
        salida += mel[:len(salida)]
        if A.informe: sf.write(Path(A.informe) / f"{lugar}-melodia.wav", (mel / (np.abs(mel).max() + 1e-9) * 0.5).astype(np.float32), SR)
    else: rel = None

    # Final: la canción ya se apaga sola; se recorta su silencio y se asegura con un fundido de 2 s.
    d = rms_db(salida, 0.05); umbral = np.percentile(d, 90) - 45
    ultimo = int(np.flatnonzero(d > umbral)[-1]) if (d > umbral).any() else len(d) - 1
    fin = min(len(salida), int((ultimo * 0.05 + 0.4) * SR)); salida = salida[:fin]
    nf = int(2.0 * SR); salida[-nf:] *= np.linspace(1, 0, nf)[:, None] ** 1.5
    return salida, dict(tramos=[[m, round(a, 3), round(b, 3)] for m, a, b in tramos], uniones=uniones, notas=len(notas),
                        escala_melodia=sorted(int(e) for e in escala), transporte=transporte,
                        nota_mediana=mediana, afinacion=round(afin, 3), cobertura_melodia=round(cobertura, 3), fidelidad_melodia=round(fidelidad, 3), melodia_vs_instrumental_dB=None if rel is None else round(float(rel), 1),
                        continua_clip=bool(plan['clip']) and abs(plan['tramos'][0][1] - (plan['clip'][1] - 3)) < 0.01, duracion=round(len(salida) / SR, 3), bar=round(bar, 3),
                        notas_lista=[[round(a, 3), round(b, 3), int(q)] for a, b, q, _ in notas])


def codificar(lugar, x, info):
    wav = Path(A.informe or '/tmp') / f'{lugar}-estancia.wav'; wav.parent.mkdir(parents=True, exist_ok=True)
    pico = np.abs(x).max(); sf.write(wav, (x / max(pico, 1e-9) * 0.98).astype(np.float32), SR, subtype='FLOAT')
    med = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(wav), '-af', f'loudnorm=I={A.lufs}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(med[med.rindex('{'):med.rindex('}') + 1])
    filtro = f"loudnorm=I={A.lufs}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=44100"
    destino = Path(A.destino) / f'{lugar}-estancia.m4a'
    subprocess.run(['ffmpeg', '-hide_banner', '-v', 'error', '-y', '-i', str(wav), '-vn', '-map_metadata', '-1', '-af', filtro, '-ac', '2', '-c:a', 'aac', '-b:a', f'{A.kbps}k', '-movflags', '+faststart', str(destino)], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(destino)], capture_output=True, text=True).stdout)
    ri = Path(A.destino) / 'indice.json'; indice = json.loads(ri.read_text()) if ri.exists() else {}
    indice[destino.name] = {'bytes': destino.stat().st_size, 'duracion': round(dur, 3), 'origen': PLANES[lugar]['cancion'],
                            'desde': info['tramos'][0][1], 'hasta': info['tramos'][-1][2], 'lufs': A.lufs,
                            'tramos': [{'modo': t[0], 'desde': t[1], 'hasta': t[2]} for t in info['tramos']], 'melodia': info['notas'] > 0}
    ri.write_text(json.dumps(dict(sorted(indice.items())), indent=2, ensure_ascii=False) + '\n')
    if A.informe: (Path(A.informe) / f'{lugar}-estancia.json').write_text(json.dumps(info, indent=1))
    print(f"{destino.name}: {dur:.1f} s · {destino.stat().st_size / 1048576:.2f} MB · {info['notas']} notas de melodía (transporte {info['transporte']:+d}) · tramos {info['tramos']} · uniones {[u['en'] for u in info['uniones']]}", flush=True)


for lugar in (A.lugares or list(PLANES)):
    x, info = construir(lugar, PLANES[lugar]); codificar(lugar, x, info)
