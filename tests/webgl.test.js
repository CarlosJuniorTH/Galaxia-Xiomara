import test from 'node:test';
import assert from 'node:assert/strict';
import { crearContextoWebGL, describirFallo } from '../js/util/webgl.js';
function canvasCon(responder) {
  const eventos = new Map(), llamadas = [];
  return { llamadas, eventos,
    addEventListener: (n, f) => eventos.set(n,f), removeEventListener: n => eventos.delete(n),
    getContext(api, opciones) { llamadas.push({api,...opciones}); return responder(api,opciones,eventos); }
  };
}
test('el contexto normal respeta la GPU que decida el navegador',()=>{
  const gl = {}, canvas = canvasCon(()=>gl);
  const resultado = crearContextoWebGL(canvas);
  assert.equal(resultado.contexto,gl); assert.equal(resultado.api,'webgl2');
  assert.equal(canvas.llamadas[0].powerPreference,'default'); assert.equal(canvas.eventos.size,0);
});
test('puede arrancar en 3D sin multisampling cuando la primera petición falla',()=>{
  const gl = {}, canvas = canvasCon((api,op)=>api==='webgl2' && !op.antialias ? gl : null);
  const resultado = crearContextoWebGL(canvas);
  assert.equal(resultado.contexto,gl); assert.equal(resultado.intentos.length,2);
});
test('recurre a WebGL 1 si el dispositivo no concede WebGL 2',()=>{
  const gl = {}, canvas = canvasCon(api=>api==='webgl' ? gl : null);
  assert.equal(crearContextoWebGL(canvas).api,'webgl'); assert.equal(canvas.llamadas.length,4);
});
test('conserva el motivo del navegador al rechazar todas las opciones',()=>{
  const canvas = canvasCon((api,op,eventos)=>{eventos.get('webglcontextcreationerror')({statusMessage:'Context creation rejected by browser'});return null;});
  assert.throws(()=>crearContextoWebGL(canvas),error=>{
    assert.equal(error.name,'ContextoWebGLNoDisponible'); assert.equal(error.intentos.length,6);
    assert.match(error.message,/rejected by browser/); return true;
  });
  assert.equal(canvas.eventos.size,0);
});
test('un fallo de módulos o de interfaz no se atribuye a la aceleración gráfica',()=>{
  const informe = describirFallo(new TypeError('Failed to fetch dynamically imported module'), 'carga de módulos 3D');
  assert.equal(informe.etapa,'carga de módulos 3D');
  assert.match(informe.mensaje,/Failed to fetch/); assert.match(informe.texto,/no significa/);
});
