import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrarLista, prioridad } from '../js/util/precarga.js';

const archivos = {
  'index.html': 10, 'js/main.js': 20, 'js/editor.js': 5, 'css/editor.css': 5, 'editor.html': 5, 'sw.js': 3, 'paquetes.json': 2,
  'assets/musica/inicio.m4a': 100, 'assets/musica/viajes.m4a': 50, 'assets/musica/deneb.m4a': 70, 'assets/musica/deneb-estancia.m4a': 80,
  'assets/musica/indice.json': 1, 'assets/musica/prueba/hogar.m4a': 9, 'assets/texturas/abc-pixeles.webp': 40, 'assets/horno/paquete.bin.gz': 30,
  'assets/fuentes/fuente-3.woff2': 6, 'assets/fuentes/quicksand-OFL.txt': 1, 'assets/cielo/nz-alta.webp': 8, 'assets/cielo/nz-media.webp': 4,
  'assets/vendor/three/three.module.min.js': 600, 'assets/vendor/three/three.module.js': 1200, 'assets/vendor/es-module-shims.js': 60,
  'js/escena/diagnostico.js': 9
};

test('la cola de reposo lleva lo que se pide después (canciones de destinos, estancias, cielo grande, fuentes, módulos)', () => {
  const rutas = filtrarLista(archivos).map(([r]) => r);
  for (const r of ['assets/musica/deneb.m4a', 'assets/musica/deneb-estancia.m4a', 'assets/fuentes/fuente-3.woff2', 'js/main.js', 'index.html', 'assets/cielo/nz-alta.webp']) assert.ok(rutas.includes(r), r);
});
test('y no lo que trae la carga ni lo que la web no pide (three.js legible, diagnóstico, cielo mediano)', () => {
  const rutas = filtrarLista(archivos).map(([r]) => r);
  for (const r of ['assets/musica/inicio.m4a', 'assets/musica/viajes.m4a', 'assets/musica/prueba/hogar.m4a', 'assets/texturas/abc-pixeles.webp', 'assets/horno/paquete.bin.gz', 'js/editor.js', 'editor.html', 'sw.js', 'paquetes.json', 'assets/vendor/three/three.module.min.js', 'assets/vendor/three/three.module.js', 'assets/vendor/es-module-shims.js', 'js/escena/diagnostico.js', 'assets/fuentes/quicksand-OFL.txt', 'assets/cielo/nz-media.webp']) assert.ok(!rutas.includes(r), r);
});
test('en el modo seguro, sin el cielo grande; lo ya pedido no se repite', () => {
  const rutas = filtrarLista(archivos, { cieloAlto: false, pedidos: new Set(['js/main.js']) }).map(([r]) => r);
  assert.ok(!rutas.includes('assets/cielo/nz-alta.webp') && !rutas.includes('js/main.js'));
});
test('por prioridad: canciones de destinos, después sus estancias, el cielo y al final lo demás', () => {
  const rutas = filtrarLista(archivos).map(([r]) => r);
  assert.equal(rutas[0], 'assets/musica/deneb.m4a');
  assert.equal(rutas[1], 'assets/musica/deneb-estancia.m4a');
  assert.equal(rutas[2], 'assets/cielo/nz-alta.webp');
  assert.ok(prioridad('assets/musica/deneb.m4a') < prioridad('assets/musica/deneb-estancia.m4a'));
});
