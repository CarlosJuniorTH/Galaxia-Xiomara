// Noviembre de 2026 y el primer año: cuenta atrás del contador, carta propia de cada mes y estrella del mes 11.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cuentaAtrasAniversario, estrellasDisponibles, mesesCumplidos } from '../js/util/tiempo.js';
import { validarContenido, cartaDelMes, contenidoActual } from '../js/data/contenido.js';
import { CONFIG } from '../js/config.js';

const INICIO = '2025-12-15';
// Hora de Argentina (UTC−3), la misma que usa el contador.
const ar = (fecha, hora = '12:00') => new Date(`${fecha}T${hora}:00-03:00`);

test('la cuenta atrás al primer año empieza el 15/11 y llega al día del aniversario', () => {
  assert.equal(cuentaAtrasAniversario(INICIO, ar('2026-11-14', '23:59')), null);
  assert.deepEqual(cuentaAtrasAniversario(INICIO, ar('2026-11-15', '00:00')), { dias: 30, anios: 1, texto: 'Faltan 30 días para nuestra primera vuelta al Sol' });
  assert.equal(cuentaAtrasAniversario(INICIO, ar('2026-12-13')).texto, 'Faltan 2 días para nuestra primera vuelta al Sol');
  assert.equal(cuentaAtrasAniversario(INICIO, ar('2026-12-14', '23:59')).texto, 'Falta 1 día para nuestra primera vuelta al Sol');
  assert.deepEqual(cuentaAtrasAniversario(INICIO, ar('2026-12-15', '00:00')), { dias: 0, anios: 1, texto: 'Hoy, un año · nuestra primera vuelta al Sol' });
  assert.equal(cuentaAtrasAniversario(INICIO, ar('2026-12-16')), null);
  assert.equal(cuentaAtrasAniversario(INICIO, ar('2027-01-20')), null);
});
test('la cuenta atrás sigue la medianoche de Argentina, no la de España', () => {
  // 14/12 a las 23:30 en Buenos Aires ya es 15/12 en Madrid: todavía falta un día.
  assert.equal(cuentaAtrasAniversario(INICIO, new Date('2026-12-15T02:30:00Z')).dias, 1);
  assert.equal(cuentaAtrasAniversario(INICIO, new Date('2026-12-15T03:00:00Z')).dias, 0);
});
test('la cuenta atrás vuelve en los años siguientes y con aniversarios del 31', () => {
  assert.equal(cuentaAtrasAniversario(INICIO, ar('2027-12-14')).texto, 'Falta 1 día para nuestra segunda vuelta al Sol');
  assert.equal(cuentaAtrasAniversario(INICIO, ar('2027-12-15')).texto, 'Hoy, 2 años · nuestra segunda vuelta al Sol');
  assert.equal(cuentaAtrasAniversario('2025-03-31', ar('2026-02-28')).dias, 31);   // del 28/2 (mes 11) al 31/3
});
test('el 15/11 nace la estrella del mes 11 y tiene su recuerdo escrito', () => {
  const estrellas = estrellasDisponibles(INICIO, ar('2026-11-15', '00:01'));
  assert.equal(mesesCumplidos(INICIO, ar('2026-11-15', '00:01')), 11);
  assert.equal(estrellas.length, 12);
  assert.deepEqual(estrellas.at(-1), { id: '2026-11-15', mes: 11, capitulo: 1 });
  assert.ok(CONFIG.recuerdos[11]?.titulo && CONFIG.recuerdos[11].texto.length > 40);
  assert.equal(estrellasDisponibles(INICIO, ar('2026-12-15', '00:01')).length, 13);
});
test('cada mes puede tener su propia carta; los demás usan la general', () => {
  const carta = { general: ['Hola {n}'], 11: ['Mes once'] };
  assert.deepEqual(cartaDelMes(carta, 11), ['Mes once']);
  assert.deepEqual(cartaDelMes(carta, 12), ['Hola {n}']);
  assert.deepEqual(cartaDelMes({ general: ['G'], 12: [''] }, 12), ['G']);    // una carta propia vacía no tapa la general
  assert.deepEqual(cartaDelMes(['Antigua'], 11), ['Antigua']);              // formato antiguo: una lista para todos
  assert.ok(cartaDelMes(CONFIG.cartaMeses, 11).join(' ').includes('Once meses'));
  assert.ok(cartaDelMes(CONFIG.cartaMeses, 10).join(' ').includes('{n} meses'));
});
test('la validación acepta la lista antigua y el objeto por meses, y rechaza formatos rotos', () => {
  assert.deepEqual(validarContenido({ version: 1, config: { cartaMeses: ['a', 'b'] } }).config.cartaMeses, ['a', 'b']);
  assert.deepEqual(validarContenido({ version: 1, config: { cartaMeses: { general: ['g'], 11: ['o'] } } }).config.cartaMeses, { general: ['g'], 11: ['o'] });
  assert.throws(() => validarContenido({ version: 1, config: { cartaMeses: { 11: ['o'] } } }));           // sin general
  assert.throws(() => validarContenido({ version: 1, config: { cartaMeses: { general: ['g'], once: ['o'] } } }));
  assert.throws(() => validarContenido({ version: 1, config: { cartaMeses: { general: [] } } }));
  assert.throws(() => validarContenido({ version: 1, config: { cartaMeses: { general: ['g'], 11: 'texto suelto' } } }));
  assert.throws(() => validarContenido({ version: 1, config: { cartaMeses: [] } }));
  assert.throws(() => validarContenido({ version: 1, config: { cartaMeses: 'carta' } }));
  // El contenido predeterminado (con la carta del mes 11) sobrevive a guardarlo en JSON y volver a leerlo.
  const vuelta = validarContenido(JSON.parse(JSON.stringify(contenidoActual())));
  assert.deepEqual(cartaDelMes(vuelta.config.cartaMeses, 11), CONFIG.cartaMeses[11]);
});
