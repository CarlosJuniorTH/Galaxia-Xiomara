import test from 'node:test';
import assert from 'node:assert/strict';
import { avanceAproximacion, duracionViaje, avanceLogaritmico } from '../js/util/aproximacion.js';
import { crearAtlasNebulosa } from '../js/util/volumenNebulosa.js';

test('la aproximación llega exactamente y conserva movimiento continuo a cualquier escala', () => {
  for(const d of [1000, 20000, 2e6, 5e7]) {
    assert.equal(avanceAproximacion(0,d,1000),0); assert.equal(avanceAproximacion(1,d,1000),1);
    let anterior=0;
    for(let i=0;i<=1000;i++){const p=avanceAproximacion(i/1000,d,1000);assert.ok(Number.isFinite(p)&&p>=anterior&&p<=1);anterior=p;}
    assert.ok((1-avanceAproximacion(0.99,d,1000))*d<5,'el último 1% no contiene un salto de cientos de unidades');
  }
});
test('cada viaje dura 10–15 s según la distancia (logarítmico): el más largo del universo, 15 s',()=>{
  assert.equal(duracionViaje(500),10); assert.equal(duracionViaje(1000),10);
  assert.ok(Math.abs(duracionViaje(7.74e7)-15)<0.01,'TON 618 ↔ Deneb'); assert.equal(duracionViaje(1e10),15);
  const casaGigante=duracionViaje(1.96e7); assert.ok(casaGigante>14&&casaGigante<14.7,`casa → gigante ${casaGigante.toFixed(2)} s`);
  let antes=0; for(let d=100;d<1e9;d*=1.3){const t=duracionViaje(d);assert.ok(t>=antes&&t>=10&&t<=15);antes=t;}
});
test('la nebulosa tiene profundidad, bordes vacíos y densidad reproducible sin ruido temporal',()=>{
  const a=crearAtlasNebulosa(11), b=crearAtlasNebulosa(11), c=crearAtlasNebulosa(12);
  assert.deepEqual(a.datos,b.datos);assert.notDeepEqual(a.datos,c.datos);
  const voxel=(x,y,z)=>a.datos[(((Math.floor(z/8)*32+y)*a.ancho)+(z%8)*32+x)*4];
  assert.equal(voxel(0,0,0),0);assert.equal(voxel(31,31,31),0);
  assert.ok(voxel(16,16,16)>0);
  const frente=Array.from({length:32},(_,i)=>voxel(i,16,10)),atras=Array.from({length:32},(_,i)=>voxel(i,16,22));
  assert.notDeepEqual(frente,atras,'no es una imagen repetida a lo largo de Z');
});

test('el perfil nuevo conserva el guardado y la reanudación de viajes', async()=>{
  const { crearViaje } = await import('../js/util/viaje.js');
  const datos=new Map(),almacen={getItem:k=>datos.get(k)??null,setItem:(k,v)=>datos.set(k,v),removeItem:k=>datos.delete(k)};
  const a=crearViaje(almacen);a.anotarDestino('cuasar');a.anotarPaso(4);a.marcarPortada();
  const b=crearViaje(almacen);assert.equal(b.destino,'cuasar');assert.equal(b.paso,4);assert.equal(b.portadaVista,true);
});

test('el volumen usa geometría 3D y transforma la cámara al espacio real de la nube',async()=>{
  const { Group,PerspectiveCamera,Vector3,Texture }=await import('three');
  const media=globalThis.matchMedia,loc=globalThis.location;globalThis.matchMedia=()=>({matches:false});globalThis.location={search:''};
  try{
    const { crearNube }=await import('../js/escena/nube.js');
    const parent=new Group();parent.scale.setScalar(40);parent.position.set(100,50,20);
    const nube=crearNube(new Texture(),new Vector3(20,30,40),1000,7);parent.add(nube);parent.updateMatrixWorld(true);
    const local=new Vector3(0,0,2),world=nube.localToWorld(local.clone());
    const camera=new PerspectiveCamera();camera.position.copy(world);camera.updateMatrixWorld(true);
    nube.onBeforeRender(null,null,camera);
    assert.equal(nube.geometry.type,'BoxGeometry');assert.ok(nube.material.uniforms.uCamara.value.distanceTo(local)<1e-9);
    nube.geometry.dispose();nube.material.dispose();
  }finally{globalThis.matchMedia=media;globalThis.location=loc;}
});

test('viaje cósmico: al salir la galaxia se aleja poco a poco y al llegar el destino crece con calma', () => {
  const D = 3e10;
  let anterior = 0;
  for (let i = 0; i <= 1000; i++) { const p = avanceLogaritmico(i / 1000, D, 1000, 1.4e10); assert.ok(Number.isFinite(p) && p >= anterior && p <= 1); anterior = p; }
  assert.equal(avanceLogaritmico(0, D, 1000, 1e9), 0); assert.equal(avanceLogaritmico(1, D, 1000, 1e9), 1);
  // El primer 15 % del tiempo no se aleja más de unas decenas de veces el tamaño de la galaxia.
  assert.ok(avanceLogaritmico(0.15, D, 1000, 1e9) * D < 60000, 'la salida es gradual');
  assert.ok((1 - avanceLogaritmico(0.99, D, 1000, 1e9)) * D < 1e9 * 0.05, 'la llegada no tiene un salto');
});
