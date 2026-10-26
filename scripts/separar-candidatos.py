# Separa las canciones de las estancias con varios modelos y ensembles para compararlos (comparar-separaciones.py).
#
# Cada candidato queda en la caché de siempre: audios-originales/.separado/<huella>/<candidato>/{instrumental,vocals}.wav
#   · la instrumental con la ganancia corregida (instrumental + voz = original: los separadores normalizan el volumen);
#   · vocals = original − instrumental (así la suma reconstruye la canción exacta, muestra a muestra).
# Lo ya separado no se repite. Los ensembles se construyen a partir de los modelos sueltos, sin volver a separar.
# Nada se sintetiza ni se añade: todo sale de la grabación original.
#
# Entorno (una vez):  Linux:   python3 -m venv .pruebas/audio && .pruebas/audio/bin/pip install "audio-separator[gpu]==0.47.1" scipy
#                     Windows: py -3.11 -m venv .pruebas\audio  &&  .pruebas\audio\Scripts\pip install "audio-separator[gpu]==0.47.1" scipy
#                     (sin GPU NVIDIA: [cpu]).  ffmpeg en el PATH.
# Uso:
#   python scripts/separar-candidatos.py                                  # todo lo de abajo, en las 6 canciones
#   python scripts/separar-candidatos.py --solo resurrection-inst becruily-inst
#   python scripts/separar-candidatos.py --modelo deux=<archivo.ckpt>     # otro modelo de `audio-separator -l`
#   python scripts/separar-candidatos.py --ensemble mio=resurrection-inst+becruily-inst:avg_wave
#   python scripts/separar-candidatos.py --mvsep 40                        # MVSEP (necesita MVSEP_API_TOKEN), sep_type 40
#   python scripts/separar-candidatos.py --archivos audios-originales/.pruebas-sdr/*.wav   # mezclas de prueba (SDR)
#   python scripts/separar-candidatos.py --listar                         # qué candidatos hay en cada canción
import argparse, glob, json, os, shutil, sys, tempfile, time, urllib.request, uuid
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from separacion_comun import (RAIZ, SR, planes, ruta_cancion, carpeta, decodificar, leer, escribir, ganancia,
                              ensemble, ruta_candidato, candidato_listo, candidatos_de, guardar_json, igualar)

# Modelos sueltos (nombre corto → archivo de audio-separator). Puntuaciones de referencia (SDR instrumental, dB):
# viperx 1297 16,45 · Inst V2 16,06 (tabla de audio-separator) · Resurrection 17,25 · becruily 17,55 (Multisong).
SUELTOS = {
    'bsrof1297': 'model_bs_roformer_ep_317_sdr_12.9755.ckpt',          # el actual
    'melinst2': 'melband_roformer_inst_v2.ckpt',                       # el actual
    'resurrection-inst': 'bs_roformer_instrumental_resurrection_unwa.ckpt',
    'becruily-inst': 'mel_band_roformer_instrumental_becruily.ckpt',
    'gabox-bs-voc': 'bs_roformer_vocals_gabox.ckpt',
    'fv7z': 'mel_band_roformer_instrumental_fv7z_gabox.ckpt',
    'instv8': 'mel_band_roformer_instrumental_instv8_gabox.ckpt',
    'v1e-plus': 'melband_roformer_inst_v1e_plus.ckpt',
}
# Presets de la guía de la comunidad UVR (vienen en audio-separator 0.47.1; si no, estos):
PRESETS_RESPALDO = {
    'instrumental_clean': (['mel_band_roformer_instrumental_fv7z_gabox.ckpt', 'bs_roformer_instrumental_resurrection_unwa.ckpt'], 'uvr_max_spec'),
    'instrumental_full': (['melband_roformer_inst_v1e_plus.ckpt', 'mel_band_roformer_instrumental_becruily.ckpt'], 'uvr_max_spec'),
    'instrumental_balanced': (['mel_band_roformer_instrumental_instv8_gabox.ckpt', 'bs_roformer_instrumental_resurrection_unwa.ckpt'], 'uvr_max_spec'),
}
# Ensembles propios por defecto (sobre los sueltos): media de ondas y «mínimo espectral» (el que menos voz deja).
ENSEMBLES = {
    'ens-actual': (['bsrof1297', 'melinst2'], 'avg_wave'),
    'ens-res-bec-avg': (['resurrection-inst', 'becruily-inst'], 'avg_wave'),
    'ens-res-bec-min': (['resurrection-inst', 'becruily-inst'], 'min_spec'),
    'ens-res-gbx-bec-avg': (['resurrection-inst', 'gabox-bs-voc', 'becruily-inst'], 'avg_wave'),
}
MDXC = {'segment_size': 256, 'override_model_segment_size': False, 'batch_size': 1, 'overlap': 8, 'pitch_shift': 0}


def presets():
    try:
        from importlib import resources
        datos = json.loads(resources.files('audio_separator').joinpath('ensemble_presets.json').read_text(encoding='utf-8'))
        return {k: (v['models'], v['algorithm']) for k, v in datos['presets'].items() if k.startswith('instrumental')}
    except Exception:
        return PRESETS_RESPALDO


def guardar_candidato(cancion: Path, nombre: str, inst: np.ndarray, info: dict):
    """Guarda instrumental (ganancia ya corregida) y vocals = original − instrumental."""
    m = leer(decodificar(cancion))
    inst = inst[:len(m)]
    if len(inst) < len(m): inst = np.vstack([inst, np.zeros((len(m) - len(inst), inst.shape[1]))])
    d = ruta_candidato(cancion, nombre)
    escribir(d / 'instrumental.wav', inst); escribir(d / 'vocals.wav', m - inst)
    (d / 'info.json').write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding='utf-8')


def cargar_corregido(cancion: Path, inst_ruta, voz_ruta):
    m = leer(decodificar(cancion)); i = leer(inst_ruta); v = leer(voz_ruta)
    g = ganancia(m, i, v)
    return i * g, g


_separador = {}
def separador(dir_modelos: Path, salida: Path):
    from audio_separator.separator import Separator
    s = _separador.get('s')
    if s is None:
        s = Separator(output_dir=str(salida), model_file_dir=str(dir_modelos), output_format='WAV',
                      sample_rate=SR, mdxc_params=MDXC)
        _separador['s'] = s
    s.output_dir = str(salida)
    if getattr(s, 'model_instance', None) is not None: s.model_instance.output_dir = str(salida)
    return s


def separar_suelto(cancion: Path, nombre: str, archivo: str, dir_modelos: Path):
    if candidato_listo(cancion, nombre): print(f'   {nombre}: ya está'); return True
    entrada = decodificar(cancion)
    with tempfile.TemporaryDirectory(dir=carpeta(cancion)) as tmp:
        tmp = Path(tmp)
        try:
            s = separador(dir_modelos, tmp); t = time.time()
            s.load_model(model_filename=archivo)
            salida = [Path(f) if Path(f).is_absolute() else tmp / Path(f).name for f in s.separate(str(entrada))]
        except Exception as e:
            print(f'   {nombre}: NO se pudo ({type(e).__name__}: {e})'); return False
        inst = [f for f in salida if any(k in f.name.lower() for k in ('(instrumental)', '(no_vocals)', '(other)'))]
        voz = [f for f in salida if '(vocals)' in f.name.lower()]
        if not inst or not voz: print(f'   {nombre}: salida inesperada {[f.name for f in salida]}'); return False
        i, g = cargar_corregido(cancion, inst[0], voz[0])
        guardar_candidato(cancion, nombre, i, dict(tipo='modelo', modelo=archivo, ganancia=round(g, 4), segundos=round(time.time() - t, 1)))
        print(f'   {nombre}: {time.time() - t:.0f} s · ganancia {g:.3f}', flush=True)
        return True


def hacer_ensemble(cancion: Path, nombre: str, partes, metodo):
    if candidato_listo(cancion, nombre): print(f'   {nombre}: ya está'); return
    falta = [p for p in partes if not candidato_listo(cancion, p)]
    if falta: print(f'   {nombre}: faltan {falta}, se salta'); return
    insts = [leer(ruta_candidato(cancion, p) / 'instrumental.wav') for p in partes]
    guardar_candidato(cancion, nombre, ensemble(insts, metodo), dict(tipo='ensemble', partes=partes, metodo=metodo))
    print(f'   {nombre}: {metodo} de {"+".join(partes)}', flush=True)


# ---------- MVSEP (opcional, de pago; solo con MVSEP_API_TOKEN) ----------

def _multipart(campos: dict, archivo: Path):
    limite = uuid.uuid4().hex; partes = []
    for k, v in campos.items():
        partes.append(f'--{limite}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    partes.append(f'--{limite}\r\nContent-Disposition: form-data; name="audiofile"; filename="{archivo.name}"\r\n'
                  f'Content-Type: application/octet-stream\r\n\r\n'.encode() + archivo.read_bytes() + b'\r\n')
    partes.append(f'--{limite}--\r\n'.encode())
    return b''.join(partes), f'multipart/form-data; boundary={limite}'


def separar_mvsep(cancion: Path, sep_type: str, add_opt1: str | None):
    nombre = f'mvsep-{sep_type}' + (f'-{add_opt1}' if add_opt1 else '')
    if candidato_listo(cancion, nombre): print(f'   {nombre}: ya está'); return
    token = os.environ.get('MVSEP_API_TOKEN')
    if not token: print(f'   {nombre}: sin MVSEP_API_TOKEN, se salta'); return
    import subprocess
    with tempfile.TemporaryDirectory(dir=carpeta(cancion)) as tmp:
        tmp = Path(tmp); flac = tmp / 'entrada.flac'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(decodificar(cancion)), '-c:a', 'flac', str(flac)], check=True)
        campos = {'api_token': token, 'sep_type': sep_type, 'output_format': '4'}   # 4 = WAV 32 bits
        if add_opt1 is not None: campos['add_opt1'] = add_opt1
        cuerpo, tipo = _multipart(campos, flac)
        req = urllib.request.Request('https://mvsep.com/api/separation/create', data=cuerpo, headers={'Content-Type': tipo})
        r = json.load(urllib.request.urlopen(req, timeout=600))
        if not r.get('success'): print(f'   {nombre}: MVSEP rechazó: {r}'); return
        h = r['data']['hash']; print(f'   {nombre}: en cola ({h})', flush=True)
        while True:
            time.sleep(15)
            e = json.load(urllib.request.urlopen(f'https://mvsep.com/api/separation/get?hash={h}', timeout=120))
            st = e.get('status')
            if st == 'done': break
            if st in ('failed', 'not_found'): print(f'   {nombre}: {st}: {e}'); return
        archivos = e['data']['files']; rutas = {}
        for f in archivos:
            url = f.get('url') or f.get('link'); n = (f.get('type') or f.get('download') or url).lower()
            destino = tmp / f'{len(rutas)}.wav'; urllib.request.urlretrieve(url, destino)
            if 'instrum' in n or 'no_vocals' in n or 'other' in n: rutas['inst'] = destino
            elif 'vocal' in n: rutas['voz'] = destino
        if set(rutas) != {'inst', 'voz'}: print(f'   {nombre}: no reconozco las pistas: {archivos}'); return
        for k in rutas:   # a 44,1 kHz estéreo por si acaso
            r44 = tmp / f'{k}-44.wav'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(rutas[k]), '-ar', str(SR), '-ac', '2', '-c:a', 'pcm_f32le', str(r44)], check=True)
            rutas[k] = r44
        i, g = cargar_corregido(cancion, rutas['inst'], rutas['voz'])
        guardar_candidato(cancion, nombre, i, dict(tipo='mvsep', sep_type=sep_type, add_opt1=add_opt1, ganancia=round(g, 4)))
        print(f'   {nombre}: listo · ganancia {g:.3f}', flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--solo', nargs='+', help='solo estos candidatos (nombres de SUELTOS/ENSEMBLES/preset-*)')
    ap.add_argument('--modelo', action='append', default=[], help='nombre=archivo.ckpt (otro modelo de audio-separator -l)')
    ap.add_argument('--ensemble', action='append', default=[], help='nombre=a+b[+c]:avg_wave|min_spec|max_spec')
    ap.add_argument('--mvsep', action='append', default=[], help='sep_type[:add_opt1] (GET https://mvsep.com/api/app/algorithms)')
    ap.add_argument('--archivos', nargs='+', help='separar estos audios en lugar de las canciones de las estancias')
    ap.add_argument('--sin-presets', action='store_true')
    ap.add_argument('--modelos', default=str(RAIZ / '.pruebas' / 'modelos-separacion'))
    ap.add_argument('--listar', action='store_true')
    A = ap.parse_args()

    if A.archivos:
        canciones = [Path(p) for a in A.archivos for p in sorted(glob.glob(a))]
        if not canciones: sys.exit(f'No hay audios en {A.archivos} (¿ejecutaste antes comparar-separaciones.py preparar?)')
    else:
        canciones = [ruta_cancion(c) for c in dict.fromkeys(p['cancion'] for p in planes().values())]
    if A.listar:
        for c in canciones: print(f'{c.name}: {", ".join(candidatos_de(c)) or "—"}')
        return
    if not shutil.which('ffmpeg'): sys.exit('Falta ffmpeg en el PATH')

    sueltos = dict(SUELTOS); sueltos.update(dict(m.split('=', 1) for m in A.modelo))
    ens = dict(ENSEMBLES)
    if not A.sin_presets:
        inverso = {v: k for k, v in sueltos.items()}
        for nombre, (modelos, metodo) in presets().items():
            for m in modelos:
                if m not in inverso: k = Path(m).stem.replace('_', '-'); sueltos[k] = m; inverso[m] = k
            ens[f'preset-{nombre}'] = ([inverso[m] for m in modelos], metodo.replace('uvr_', '').replace('avg_fft', 'avg_wave'))
    for e in A.ensemble:
        nombre, resto = e.split('=', 1); partes, metodo = (resto.split(':') + ['avg_wave'])[:2]
        ens[nombre] = (partes.split('+'), metodo)
    if A.solo:
        quiero = set(A.solo)
        for n in list(quiero):
            if n in ens: quiero |= set(ens[n][0])
        sueltos = {k: v for k, v in sueltos.items() if k in quiero}; ens = {k: v for k, v in ens.items() if k in quiero}

    resumen = {}
    for c in canciones:
        print(f'● {c.name}', flush=True)
        for n, archivo in sueltos.items(): separar_suelto(c, n, archivo, Path(A.modelos))
        for n, (partes, metodo) in ens.items(): hacer_ensemble(c, n, partes, metodo)
        for mv in A.mvsep:
            t, o = (mv.split(':') + [None])[:2]; separar_mvsep(c, t, o)
        resumen[c.name] = candidatos_de(c)
    guardar_json(RAIZ / '.pruebas' / 'separaciones' / 'candidatos.json', resumen)
    print('Candidatos por canción → .pruebas/separaciones/candidatos.json')


if __name__ == '__main__':
    main()
