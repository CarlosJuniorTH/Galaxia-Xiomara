// Cola de avisos: de uno en uno, sin repetirse seguidos, y el urgente (la supernova) pasa delante.
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearAvisos } from '../js/ui/avisos.js';

// Avanza el reloj de prueba en pasos cortos (los temporizadores que se programan dentro de otro también corren).
const pasar = (t, ms) => { for (let hecho = 0; hecho < ms; hecho += 50) t.mock.timers.tick(Math.min(50, ms - hecho)); };
// Presentadores de prueba que anotan lo que se ve en cada momento.
function montar() {
  const visibles = new Set(), registro = [];
  const presentador = (tipo, duracion, salida) => ({ duracion, salida, mostrar(t) { visibles.add(tipo); registro.push(`${tipo}:${t}`); }, ocultar() { visibles.delete(tipo); } });
  const avisos = crearAvisos({ brindis: presentador('brindis', 5200, 700), cometa: presentador('cometa', 8000, 1200) });
  return { avisos, visibles, registro };
}

test('dos avisos a la vez salen de uno en uno: el segundo cuando el primero ya se fue', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const { avisos, visibles, registro } = montar();
  avisos.poner('Empieza por «Deja que te lleve»');
  avisos.poner('Pasaba por aquí', { tipo: 'cometa' });
  assert.deepEqual([...visibles], ['brindis']);
  pasar(t, 5200);   // se va el primero…
  assert.equal(visibles.size, 0);
  pasar(t, 699);
  assert.equal(visibles.size, 0, 'mientras el primero se desvanece no sale nada encima');
  pasar(t, 1);
  assert.deepEqual([...visibles], ['cometa']);
  pasar(t, 8000 + 1200);
  assert.equal(visibles.size, 0);
  assert.deepEqual(registro, ['brindis:Empieza por «Deja que te lleve»', 'cometa:Pasaba por aquí']);
});

test('el mismo aviso no se repite seguido (ni visible, ni en la cola, ni recién terminado)', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const { avisos, registro } = montar();
  assert.equal(avisos.poner('Hola'), true);
  assert.equal(avisos.poner('Hola'), false);
  avisos.poner('Otro'); assert.equal(avisos.poner('Otro'), false);
  pasar(t, 5900 + 5900);
  assert.equal(avisos.poner('Otro'), false, 'recién terminado');
  pasar(t, 20000);
  assert.equal(avisos.poner('Otro'), true, 'pasado un rato vuelve a poder salir');
  assert.deepEqual(registro, ['brindis:Hola', 'brindis:Otro', 'brindis:Otro']);
});

test('el urgente pasa delante: quita el que se ve y sale ya, y luego sigue la cola', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const { avisos, visibles, registro } = montar();
  avisos.poner('Frase del cometa', { tipo: 'cometa' });
  avisos.poner('Bienvenida');
  avisos.poner('La supernova va a estallar', { urgente: true });
  assert.deepEqual([...visibles], ['brindis']);
  assert.equal(avisos.actual, 'La supernova va a estallar');
  assert.deepEqual(avisos.pendientes, ['Bienvenida']);
  pasar(t, 5200 + 700);
  assert.equal(avisos.actual, 'Bienvenida');
  assert.deepEqual(registro, ['cometa:Frase del cometa', 'brindis:La supernova va a estallar', 'brindis:Bienvenida']);
});

test('un aviso que ya no es vigente al llegarle el turno se salta', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const { avisos, registro } = montar();
  let cometa = true;
  avisos.poner('Primero');
  avisos.poner('Frase', { tipo: 'cometa', vigente: () => cometa });
  avisos.poner('Último');
  cometa = false;   // p. ej., se viajó a una de las grandes
  pasar(t, 5900);
  assert.equal(avisos.actual, 'Último');
  assert.deepEqual(registro, ['brindis:Primero', 'brindis:Último']);
});
