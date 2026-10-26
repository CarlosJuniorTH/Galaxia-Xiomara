#!/usr/bin/env python3
"""Vista local/LAN de la app, sin exponer Git ni los archivos del proyecto."""
from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
from datetime import datetime, timezone
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
ARCHIVOS = {'index.html', 'editor.html', 'manifest.webmanifest', 'favicon.ico', 'sw.js', 'app-shell.json'}
CARPETAS = {'assets', 'css', 'js'}

class AppHandler(SimpleHTTPRequestHandler):
    def recurso_permitido(self):
        ruta = unquote(urlsplit(self.path).path)
        destino = (ROOT / ruta.lstrip('/')).resolve()
        try:
            relativa = destino.relative_to(ROOT)
        except ValueError:
            return False
        if any(p.startswith('.') for p in relativa.parts):
            return False
        if relativa == Path('.'):
            return True
        return (len(relativa.parts) == 1 and relativa.name in ARCHIVOS) or bool(relativa.parts and relativa.parts[0] in CARPETAS)

    def paquetes(self):
        # Todos los archivos públicos con sus bytes (como el paquetes.json de dist/): la precarga de la pantalla de carga
        # (js/util/precarga.js) descarga lo que la web pueda pedir después. Se calcula al vuelo: siempre al día.
        todos = {}
        for nombre in sorted(ARCHIVOS - {'sw.js', 'app-shell.json', 'editor.html'}):
            f = ROOT / nombre
            if f.is_file():
                todos[nombre] = f.stat().st_size
        for carpeta in sorted(CARPETAS):
            for f in sorted((ROOT / carpeta).rglob('*')):
                rel = f.relative_to(ROOT)
                if f.is_file() and not any(p.startswith('.') for p in rel.parts):
                    todos[rel.as_posix()] = f.stat().st_size
        cuerpo = json.dumps(todos).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_GET(self):
        if urlsplit(self.path).path == '/paquetes.json' and not (ROOT / 'paquetes.json').exists():
            self.paquetes()
            return
        if not self.recurso_permitido():
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        if not self.recurso_permitido():
            self.send_error(404)
            return
        super().do_HEAD()

    def do_POST(self):
        # Diagnóstico local de arranque; no lee archivos privados.
        if urlsplit(self.path).path != '/__diagnostico3d' or self.headers.get_content_type() != 'application/json':
            self.send_error(404)
            return
        try:
            longitud = int(self.headers.get('Content-Length', '0'))
            if not 0 < longitud <= 16384:
                self.send_error(413)
                return
            datos = json.loads(self.rfile.read(longitud))
            if not isinstance(datos, dict):
                raise ValueError('Formato no válido')
            informe = {k: str(datos.get(k, ''))[:3000] for k in ['etapa', 'tipo', 'mensaje', 'navegador']}
            informe['fecha'] = datetime.now(timezone.utc).isoformat()
            informe['intentos'] = [{k: v for k, v in i.items() if k in ['api', 'antialias', 'powerPreference', 'disponible']} for i in datos.get('intentos', [])[:6] if isinstance(i, dict)]
            destino = ROOT / '.pruebas'
            destino.mkdir(exist_ok=True)
            (destino / 'diagnostico-3d.json').write_text(json.dumps(informe, ensure_ascii=False, indent=2), encoding='utf-8')
        except (ValueError, TypeError, AttributeError):
            self.send_error(400)
            return
        self.send_response(204)
        self.end_headers()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('--lan', action='store_true', help='Permitir pruebas desde la Wi-Fi local')
    parser.add_argument('--port', type=int, default=8080)
    args = parser.parse_args()
    host = '0.0.0.0' if args.lan else '127.0.0.1'
    handler = partial(AppHandler, directory=str(ROOT))
    with ThreadingHTTPServer((host, args.port), handler) as server:
        print(f'Universo listo: http://127.0.0.1:{args.port}/', flush=True)
        if args.lan:
            print('Modo Wi-Fi activo. Sin listado de carpetas ni acceso a .git.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
