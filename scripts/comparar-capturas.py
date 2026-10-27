#!/usr/bin/env python3
"""Compara las capturas ANTES y DESPUÉS de docs/capturas-rendimiento (tests/navegador/capturasRendimiento.mjs).

Para cada pose: diferencia media absoluta (0–255), PSNR, SSIM de la luminancia (ventanas de 8×8), brillo medio antes y
después y nitidez (varianza del laplaciano: si baja mucho, la imagen se ha vuelto blanda). Escribe
docs/capturas-rendimiento/comparacion.json y una tabla en la salida. Uso: python3 scripts/comparar-capturas.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

DIR = Path(__file__).resolve().parent.parent / 'docs' / 'capturas-rendimiento'


def luminancia(img):
    a = np.asarray(img.convert('RGB'), dtype=np.float64)
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2], a


def ssim(x, y, b=8):
    h, w = (x.shape[0] // b) * b, (x.shape[1] // b) * b
    x, y = x[:h, :w].reshape(h // b, b, w // b, b), y[:h, :w].reshape(h // b, b, w // b, b)
    mx, my = x.mean(axis=(1, 3)), y.mean(axis=(1, 3))
    vx, vy = x.var(axis=(1, 3)), y.var(axis=(1, 3))
    cxy = ((x - mx[:, None, :, None]) * (y - my[:, None, :, None])).mean(axis=(1, 3))
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    return float((((2 * mx * my + c1) * (2 * cxy + c2)) / ((mx ** 2 + my ** 2 + c1) * (vx + vy + c2))).mean())


def nitidez(l):
    lap = -4 * l[1:-1, 1:-1] + l[:-2, 1:-1] + l[2:, 1:-1] + l[1:-1, :-2] + l[1:-1, 2:]
    return float(lap.var())


def main():
    filas = []
    for antes in sorted((DIR / 'antes').glob('*.jpg')) + sorted((DIR / 'antes').glob('*.png')):
        despues = DIR / 'despues' / antes.name
        if not despues.exists():
            continue
        la, a = luminancia(Image.open(antes))
        ld, d = luminancia(Image.open(despues))
        if a.shape != d.shape:
            filas.append({'captura': antes.name, 'error': f'tamaños distintos {a.shape} / {d.shape}'})
            continue
        mse = float(((a - d) ** 2).mean())
        filas.append({
            'captura': antes.name,
            'difMedia': round(float(np.abs(a - d).mean()), 2),
            'psnr': round(10 * np.log10(255 ** 2 / mse), 1) if mse > 0 else None,
            'ssim': round(ssim(la, ld), 3),
            'brilloAntes': round(float(la.mean()), 1), 'brilloDespues': round(float(ld.mean()), 1),
            'nitidezDespuesSobreAntes': round(nitidez(ld) / max(1e-9, nitidez(la)), 2),
        })
    (DIR / 'comparacion.json').write_text(json.dumps(filas, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"{'captura':34} {'dif':>6} {'PSNR':>6} {'SSIM':>6} {'brillo a→d':>13} {'nitidez d/a':>11}")
    for f in filas:
        if 'error' in f:
            print(f"{f['captura']:34} {f['error']}")
            continue
        print(f"{f['captura']:34} {f['difMedia']:6} {f['psnr']:6} {f['ssim']:6} {f['brilloAntes']:6}→{f['brilloDespues']:<6} {f['nitidezDespuesSobreAntes']:11}")


if __name__ == '__main__':
    main()
