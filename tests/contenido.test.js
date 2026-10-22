import test from 'node:test';
import assert from 'node:assert/strict';
import { validarContenido, contenidoActual } from '../js/data/contenido.js';
test('el contenido predeterminado se puede guardar y volver a leer sin perder cartas y recuerdos', () => {
  const original = contenidoActual(), guardado = validarContenido(JSON.parse(JSON.stringify(original)));
  assert.equal(guardado.config.recuerdos.length, 11); assert.equal(guardado.cartas.length, 4); assert.equal(guardado.capsulas[0].fecha, '2026-12-15');
});
test('el editor rechaza fechas inexistentes, recursos ejecutables y ids duplicados', () => {
  assert.throws(() => validarContenido({ version:1, config:{ fechaInicio:'2026-02-31' } }));
  assert.throws(() => validarContenido({ version:1, config:{ foto:'javascript:alert(1)' } }));
  assert.throws(() => validarContenido({ version:1, suenos:[{id:'x',titulo:'a',texto:'b'},{id:'x',titulo:'c',texto:'d'}] }));
});
test('ignora propiedades desconocidas y evita listas que rompan las escenas', () => {
  assert.deepEqual(validarContenido({version:1, config:{ nombre:'Xio', codigo:'no ejecutar' }}), {version:1, config:{nombre:'Xio'}});
  assert.throws(() => validarContenido({version:1, suenos:[]}));
  assert.throws(() => validarContenido({version:1, config:{toques:[]}}));
});
