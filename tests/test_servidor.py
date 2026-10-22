import threading
import unittest
import urllib.request
import urllib.error
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
from functools import partial
from http.server import ThreadingHTTPServer
from scripts.servir import AppHandler, ROOT

class Silencioso(AppHandler):
    def log_message(self, *args):
        pass

class ServidorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1',0),partial(Silencioso,directory=str(ROOT)))
        cls.hilo = threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.hilo.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.hilo.join(timeout=2)

    def codigo(self,ruta,metodo='GET'):
        try:
            with urllib.request.urlopen(urllib.request.Request(self.base+ruta,method=metodo),timeout=2) as respuesta:
                return respuesta.status
        except urllib.error.HTTPError as error:
            codigo = error.code
            error.close()
            return codigo

    def test_archivos_publicos_y_head(self):
        for ruta in ['/', '/index.html', '/js/main.js','/css/base.css','/assets/contenido.json','/manifest.webmanifest']:
            with self.subTest(ruta=ruta):
                self.assertEqual(self.codigo(ruta),200)
                self.assertEqual(self.codigo(ruta,'HEAD'),200)

    def test_no_se_expone_el_proyecto(self):
        for ruta in ['/.git/config','/package.json','/.claude/settings.json','/scripts/servir.py','/assets/','/js/','/assets/%2e%2e/.git/config','/%2e%2e/%2e%2e/etc/passwd']:
            with self.subTest(ruta=ruta):
                self.assertEqual(self.codigo(ruta),404)
                self.assertEqual(self.codigo(ruta,'HEAD'),404)

    def test_diagnostico_limitado_y_privado(self):
        with tempfile.TemporaryDirectory() as carpeta, patch('scripts.servir.ROOT', Path(carpeta)):
            datos = json.dumps({'etapa': 'escena', 'mensaje': 'rechazado', 'secreto': 'no guardar', 'intentos': [{'api': 'webgl2', 'disponible': False, 'extra': 'no guardar'}]}).encode()
            peticion = urllib.request.Request(self.base+'/__diagnostico3d', data=datos, headers={'Content-Type':'application/json'})
            with urllib.request.urlopen(peticion, timeout=2) as respuesta:
                self.assertEqual(respuesta.status, 204)
            informe = json.loads((Path(carpeta)/'.pruebas/diagnostico-3d.json').read_text())
            self.assertEqual(informe['mensaje'], 'rechazado')
            self.assertNotIn('secreto', informe)
            self.assertNotIn('extra', informe['intentos'][0])
            self.assertEqual(self.codigo('/.pruebas/diagnostico-3d.json'), 404)

    def test_diagnostico_rechaza_json_invalido(self):
        peticion = urllib.request.Request(self.base+'/__diagnostico3d', data=b'[]', headers={'Content-Type':'application/json'})
        with self.assertRaises(urllib.error.HTTPError) as contexto:
            urllib.request.urlopen(peticion, timeout=2)
        self.assertEqual(contexto.exception.code, 400)
        contexto.exception.close()

if __name__ == '__main__':
    unittest.main()
