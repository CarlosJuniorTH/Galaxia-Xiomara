import test from 'node:test';
import assert from 'node:assert/strict';
import { crearProgreso, CLAVE } from '../js/util/progreso.js';
import { estrellasDisponibles, mesesCumplidos, partesEnZona, capsulaAbierta, relojZona } from '../js/util/tiempo.js';
const memoria = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
test('las estrellas mensuales no cambian de identidad al crecer ni se cortan a los 25 meses', () => {
  const antes = estrellasDisponibles('2025-12-15', new Date('2026-10-17T12:00:00Z'));
  assert.equal(antes.length, 11); assert.equal(antes[0].id, '2025-12-15');
  const despues = estrellasDisponibles('2025-12-15', new Date('2028-12-15T12:00:00Z'));
  assert.equal(despues.length, 37); assert.deepEqual(despues.slice(0, 11), antes); assert.equal(despues[24].capitulo, 3);
});
test('el mes cambia en Argentina y no a la medianoche de España', () => {
  assert.equal(mesesCumplidos('2025-12-15', new Date('2026-10-15T01:00:00Z')), 9);
  assert.equal(mesesCumplidos('2025-12-15', new Date('2026-10-15T03:00:00Z')), 10);
});
test('aniversarios del día 31 se adaptan a febrero', () => {
  const estrellas = estrellasDisponibles('2026-01-31', new Date('2026-02-28T12:00:00Z'));
  assert.equal(estrellas.length, 2); assert.equal(estrellas[1].id, '2026-02-28');
});
test('cápsula cerrada hasta su medianoche en Argentina', () => {
  assert.equal(capsulaAbierta('2026-12-15', new Date('2026-12-15T02:59:59Z')), false);
  assert.equal(capsulaAbierta('2026-12-15', new Date('2026-12-15T03:00:00Z')), true);
});
test('Madrid cambia horario de verano y Argentina conserva su fecha', () => {
  assert.equal(relojZona(new Date('2026-07-01T12:00:00Z'), 'Europe/Madrid'), '14:00');
  assert.equal(relojZona(new Date('2026-12-01T12:00:00Z'), 'Europe/Madrid'), '13:00');
  assert.equal(partesEnZona(new Date('2026-12-15T01:00:00Z')).fecha, '2026-12-14');
});
test('progreso duradero, sin duplicados; reinicio recuperable', () => {
  const store = memoria(), p = crearProgreso(store);
  assert.equal(p.anotar('estrellas', '2025-12-15'), true); assert.equal(p.anotar('estrellas', '2025-12-15'), false);
  p.anotar('cartas', 'extranar');
  assert.equal(crearProgreso(store).tiene('estrellas', '2025-12-15'), true);
  p.reiniciar(); assert.equal(p.estado.estrellas.length, 0); assert.equal(p.restaurar(), true); assert.equal(p.estado.cartas.length, 1);
});
test('datos corruptos y almacenamiento bloqueado permiten continuar sin fingir guardado', () => {
  const store = memoria(); store.setItem(CLAVE, 'roto'); const p = crearProgreso(store); assert.deepEqual(p.estado.estrellas, []);
  let aviso = ''; const q = crearProgreso({ getItem: () => null, setItem: () => { throw Error('quota'); } }, x => aviso = x);
  q.anotar('estrellas', 'a'); assert.equal(q.disponible, false); assert.ok(aviso); assert.equal(q.tiene('estrellas', 'a'), true);
});
test('solo se aceptan listas conocidas y cadenas al leer guardado', () => {
  const store = memoria(); store.setItem(CLAVE, JSON.stringify({ version: 2, estrellas: ['a', 'a', 3, null], cartas: false }));
  assert.deepEqual(crearProgreso(store).estado.estrellas, ['a']); assert.deepEqual(crearProgreso(store).estado.cartas, []);
});
test('las copias se fusionan sin borrar descubrimientos; un formato erróneo no modifica el viaje', () => {
  const p = crearProgreso(memoria()), q = crearProgreso(memoria());
  p.anotar('estrellas', 'a'); q.anotar('estrellas', 'b'); p.importar(q.estado);
  assert.deepEqual(p.estado.estrellas, ['a','b']);
  assert.throws(() => p.importar({ version: 2, estrellas: [] })); assert.equal(p.estado.estrellas.length, 2);
});
test('marcar un sueño es reversible', () => {
  const p = crearProgreso(memoria()); p.anotar('suenos','mar'); assert.equal(p.retirar('suenos','mar'),true); assert.equal(p.tiene('suenos','mar'),false);
});
test('no se reinicia el viaje si no se puede conservar la copia anterior', () => {
  const p = crearProgreso({getItem:()=>null,setItem:()=>{throw Error('quota');}});
  p.anotar('estrellas','recuerdo'); assert.equal(p.reiniciar(),false); assert.equal(p.tiene('estrellas','recuerdo'),true);
});
