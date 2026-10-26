# Página local de escucha a ciegas: por cada estancia, los mejores candidatos de comparar-separaciones.py + el actual,
# con nombres ocultos (A, B, C…), botones que saltan a los momentos donde más se cantaba y un botón «revelar».
# La elección final es de oído; los números solo filtran.
#   python scripts/comparar-separaciones.py medir --whisper
#   python scripts/escucha-ciegas.py [--top 3] [--segundos 40]  →  .pruebas/escucha/index.html (ábrelo en el navegador)
import argparse, html, json, random, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from separacion_comun import RAIZ, SR, ruta_cancion, ruta_candidato

ap = argparse.ArgumentParser()
ap.add_argument('--top', type=int, default=3)
ap.add_argument('--segundos', type=float, default=40)
ap.add_argument('--semilla', type=int, default=7)
ap.add_argument('--destino', default=None, help='carpeta de salida (por defecto .pruebas/escucha); p. ej. una que sirva el servidor LAN')
A = ap.parse_args()

res = json.loads((RAIZ / '.pruebas' / 'separaciones' / 'comparacion.json').read_text(encoding='utf-8'))
DEST = Path(A.destino).resolve() if A.destino else RAIZ / '.pruebas' / 'escucha'; (DEST / 'audio').mkdir(parents=True, exist_ok=True)
rnd = random.Random(A.semilla)
secciones, solucion = [], {}

for lugar, r in res.items():
    c = ruta_cancion(r['cancion'])
    elegidos = list(dict.fromkeys(r['ranking'][:A.top] + ([r['actual']] if r['actual'] in r['candidatos'] else [])))
    rnd.shuffle(elegidos)
    # el fragmento empieza un poco antes del primer momento difícil y dura A.segundos
    # (en tramos largos los momentos pueden estar a más de A.segundos: se elige la ventana que abarca más)
    opciones = [max(r['tramo'][0], t - 3) for t in (r['momentos'] or [r['tramo'][0]])]
    ini = max(opciones, key=lambda o: (sum(0 <= t - o < A.segundos for t in r['momentos']), -o))
    ini = max(r['tramo'][0], min(ini, r['tramo'][1] - A.segundos))
    marcas = [round(t - ini, 1) for t in r['momentos'] if 0 <= t - ini < A.segundos]
    # el original con voz, como referencia de cómo debe sonar el instrumental
    filas = []
    ref = DEST / 'audio' / f'{lugar}-original.m4a'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ini), '-t', str(A.segundos), '-i', str(c), '-ac', '2', '-ar', str(SR),
                    '-c:a', 'aac', '-b:a', '192k', str(ref)], check=True)
    for j, cand in enumerate(elegidos):
        letra = chr(65 + j); solucion[f'{lugar}-{letra}'] = cand
        out = DEST / 'audio' / f'{lugar}-{letra}.m4a'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ini), '-t', str(A.segundos), '-i', str(ruta_candidato(c, cand) / 'instrumental.wav'),
                        '-af', 'loudnorm=I=-20:TP=-1.5', '-ar', str(SR), '-c:a', 'aac', '-b:a', '192k', str(out)], check=True)
        botones = ''.join(f'<button data-t="{t}">▶ {t:.0f}s</button>' for t in marcas)
        filas.append(f'<div class="fila"><b>{letra}</b><audio controls preload="none" data-src="audio/{out.name}"></audio>{botones}'
                     f'<span class="rev" data-k="{lugar}-{letra}"></span></div>')
    secciones.append(f'<section><h2>{html.escape(lugar)}</h2><p class="nota">{html.escape(r["cancion"])} · desde {ini:.1f}s · '
                     f'original con voz: <audio controls preload="none" data-src="audio/{ref.name}"></audio></p>{"".join(filas)}</section>')

(DEST / 'index.html').write_text(f'''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Escucha a ciegas</title>
<style>
:root{{--f:#0e1018;--t:#e8e8f0;--s:#9aa0b4;--b:#2a2f44;--a:#8fb6ff}}
@media (prefers-color-scheme:light){{:root{{--f:#f6f7fb;--t:#141824;--s:#5a6075;--b:#d5d9e6;--a:#2856c9}}}}
body{{background:var(--f);color:var(--t);font:15px/1.5 system-ui,sans-serif;max-width:900px;margin:0 auto;padding:16px}}
section{{border:1px solid var(--b);border-radius:12px;padding:12px 16px;margin:16px 0}}
.fila{{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0}} .fila b{{width:1.5em;font-size:18px}}
audio{{height:34px;max-width:100%}} button{{background:none;border:1px solid var(--b);color:var(--a);border-radius:8px;padding:4px 8px;cursor:pointer}}
.nota{{color:var(--s);display:flex;flex-wrap:wrap;gap:8px;align-items:center}} .rev{{color:var(--a);font-family:monospace}}
</style>
<h1>Escucha a ciegas · estancias</h1>
<p class="nota">Escucha con auriculares. Los botones saltan a donde la canción tenía más voz: ahí se nota qué separación deja restos. Apunta tu favorita de cada estancia y luego pulsa «Revelar».</p>
{"".join(secciones)}
<p><button id="revelar">Revelar nombres</button></p>
<script>
const S={json.dumps(solucion)};
// Los audios se cargan enteros como blob: así se puede saltar a cualquier segundo aunque el servidor no admita Range
// (el servidor LAN es SimpleHTTPRequestHandler; Safari en iPhone no reproduce m4a sin Range si no es blob).
(async()=>{{for(const a of document.querySelectorAll('audio[data-src]')){{try{{const r=await fetch(a.dataset.src);if(!r.ok)throw 0;a.src=URL.createObjectURL(await r.blob());}}catch(e){{a.src=a.dataset.src;}}}}}})();
document.querySelectorAll('.fila button').forEach(b=>b.onclick=()=>{{const a=b.parentElement.querySelector('audio');document.querySelectorAll('audio').forEach(x=>x!==a&&x.pause());a.currentTime=+b.dataset.t;a.play();}});
document.getElementById('revelar').onclick=()=>document.querySelectorAll('.rev').forEach(s=>s.textContent=S[s.dataset.k]);
</script></html>''', encoding='utf-8')
print(f'→ {DEST / "index.html"}  ({len(solucion)} audios)')
