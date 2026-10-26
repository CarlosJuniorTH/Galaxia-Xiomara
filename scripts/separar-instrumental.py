# Separa la voz de las canciones (audios-originales/) con un modelo profesional de audio-separator (los de UVR:
# BS-RoFormer, Mel-Band RoFormer, htdemucs_ft…) → audios-originales/.separado/<huella>/<carpeta>/{instrumental,vocals}.wav
# Instalar (una vez): .pruebas/audio/bin/pip install "audio-separator[gpu]" audioread standard-aifc standard-sunau
# Uso (GPU compartida): flock /tmp/claude-1000/gpu.lock .pruebas/audio/bin/python scripts/separar-instrumental.py \
#   model_bs_roformer_ep_317_sdr_12.9755.ckpt bsrof1297 [huellas…]   (sin huellas: las seis canciones con estancia)
import sys, os, glob, shutil, glob as g
from audio_separator.separator import Separator
O = '/home/carlos/proyectos/Galaxia-Xiomara/audios-originales/.separado/'
HASH = ['42c028880bed', 'e8ccaeb72b62', 'a39b45169840', 'df7aebfecdcf', '8cb496ff7e1c', 'ea19bfd83fa3']
modelo = sys.argv[1]; corto = sys.argv[2]
extra = {}
if modelo.startswith('htdemucs'): extra = dict(demucs_params={'segment_size': 'Default', 'shifts': 4, 'overlap': 0.5, 'segments_enabled': True})
else: extra = dict(mdxc_params={'segment_size': 256, 'override_model_segment_size': False, 'batch_size': 1, 'overlap': 8, 'pitch_shift': 0})
for h in (sys.argv[3:] or HASH):
    dst = O + h + '/' + corto + '/'
    if os.path.exists(dst + 'instrumental.wav'): print('ya', h); continue
    os.makedirs(dst, exist_ok=True)
    s = Separator(output_dir=dst, model_file_dir='/home/carlos/proyectos/Galaxia-Xiomara/.pruebas/modelos-separacion', output_format='WAV', **extra)
    s.load_model(model_filename=modelo)
    salida = s.separate(O + h + '/entrada.wav')
    for f in salida:
        f = f if os.path.isabs(f) else dst + os.path.basename(f)
        low = os.path.basename(f).lower()
        if '(vocals)' in low: shutil.move(f, dst + 'vocals.wav')
        elif '(instrumental)' in low or '(no_vocals)' in low or ('(other)' in low and not modelo.startswith('htdemucs')): shutil.move(f, dst + 'instrumental.wav')
        else: print('  otro:', f)
    # Demucs de 4 pistas: instrumental = suma de batería, bajo y otros
    if not os.path.exists(dst + 'instrumental.wav'):
        import soundfile as sf, numpy as np
        partes = [p for p in glob.glob(dst + '*.wav') if 'vocals' not in p.lower()]
        x = sum(sf.read(p)[0] for p in partes); sr = sf.info(partes[0]).samplerate
        sf.write(dst + 'instrumental.wav', x, sr, subtype='FLOAT')
        for p in partes: os.remove(p)
    print('hecho', h, os.listdir(dst), flush=True)
