// La carga repartida (obreros de la telaraña, construcciones por tramos) da EXACTAMENTE lo mismo que de un tirón: el
// universo sale igual en cada carga y en cada aparato, con uno o con tres obreros y con o sin pausas.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generador, rellenarAzar, porTramos, deUnTiron } from '../js/util/azarSemilla.js';
import { generarDatosTelarana, parteFilamentos, parteSegunda, parteMenores } from '../js/escena/telaranaDatos.js';
import { construirCatalogo } from '../js/data/catalogo.js';

// Todos los atributos (bytes) y los bloques de cada grupo, en un orden fijo.
const huella = d => Object.keys(d).sort().map(g => ({ g, bloques: d[g].bloques,
  atributos: Object.keys(d[g].atributos).sort().map(n => [n, d[g].atributos[n].k, Buffer.from(d[g].atributos[n].datos.buffer, d[g].atributos[n].datos.byteOffset, d[g].atributos[n].datos.byteLength)]) }));

test('rellenarAzar da los mismos números que generador, también seguido por tandas', () => {
  for (const semilla of [0, 1, 20251215, 0xffffffff]) {
    const rnd = generador(semilla), a = new Float64Array(1000); let estado = semilla;
    for (let i = 0; i < 10; i++) estado = rellenarAzar(estado, a, i * 100, i * 100 + 100);
    for (let i = 0; i < 1000; i++) assert.equal(a[i], rnd(), `semilla ${semilla}, número ${i}`);
  }
});

test('telaraña: las tres partes de los obreros juntas son idénticas byte a byte a todo en un hilo', async () => {
  const uno = await generarDatosTelarana(THREE);
  // Buzones en memoria entre las partes (como los canales entre obreros), con pausas entre medias.
  const buzones = new Map(), buzon = (de, a) => { const k = `${de}>${a}`; if (!buzones.has(k)) { let r; buzones.set(k, { p: new Promise(x => { r = x; }), r }); } return buzones.get(k); };
  const canal = yo => ({ enviar: (a, m) => buzon(yo, a).r(m), recibir: de => buzon(de, yo).p });
  const ceder = () => new Promise(r => setImmediate(r));
  const partes = await Promise.all([parteFilamentos(THREE, ceder, canal('filamentos')), parteSegunda(THREE, ceder, canal('segunda')), parteMenores(THREE, ceder, canal('menores'))]);
  assert.deepEqual(huella(Object.assign({}, ...partes)), huella(uno));
});

test('catálogo: por tramos (cediendo en cada paso) sale igual que de un tirón', async () => {
  const ser = u => JSON.stringify(u, (k, v) => (v && (v.isVector3 || v.isQuaternion) ? v.toArray() : v));
  assert.equal(ser(await porTramos(construirCatalogo(THREE), 0)), ser(deUnTiron(construirCatalogo(THREE))));
});
