import test from 'node:test';
import assert from 'node:assert/strict';
import { impulsoVisual } from '../js/util/impulsoVisual.js';
import { puntoCorazonVolumen } from '../js/util/supernovaAmor.js';
import { crearAtlasNebulosa } from '../js/util/volumenNebulosa.js';
test('el giro rápido produce estelas sin necesitar vuelo; el giro lento y el reposo no',()=>{
  assert.equal(impulsoVisual({angular:0.04}).intensidad,0);
  assert.ok(impulsoVisual({angular:1.8}).giro>0.95);
  assert.equal(impulsoVisual().intensidad,0);
});
test('el vuelo sostiene el impulso durante el trayecto y lo suelta al llegar',()=>{
  assert.equal(impulsoVisual({vuelo:true,progreso:0}).viaje,0);
  for(const progreso of [0.2,0.4,0.6,0.8])assert.ok(impulsoVisual({vuelo:true,progreso}).viaje>0.95);
  assert.equal(impulsoVisual({vuelo:true,progreso:1}).viaje,0);
  assert.equal(impulsoVisual({vuelo:true,progreso:0.5,angular:2,reducido:true}).intensidad,0);
  assert.equal(impulsoVisual({angular:2,ceremonia:true}).intensidad,0);
  assert.ok(impulsoVisual({radial:-2000}).zoom>0.95);
});
test('el corazón se estrecha hacia ambas caras y posee relieve lateral irregular',()=>{
  const centro=puntoCorazonVolumen(Math.PI/2,0),frente=puntoCorazonVolumen(Math.PI/2,0.8),atras=puntoCorazonVolumen(Math.PI/2,-0.8);
  assert.ok(Math.abs(frente[0])<Math.abs(centro[0])*0.75);
  assert.ok(Math.abs(atras[0])<Math.abs(centro[0])*0.75);
  assert.ok(frente[2]>500&&atras[2]<-500);
  for(let a=0;a<=Math.PI*2;a+=0.05)for(const z of [-1,-0.8,0,0.8,1])assert.ok(puntoCorazonVolumen(a,z).every(Number.isFinite));
});
test('las secciones del gas del corazón varían en profundidad en vez de repetir la misma silueta',()=>{
  const a=crearAtlasNebulosa(1801,true);
  const seccion=z=>{let n=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=((Math.floor(z/8)*32+y)*a.ancho+(z%8)*32+x)*4;if(a.datos[i]>3)n++;}return n;};
  const medio=seccion(16);assert.ok(medio>100);assert.ok(seccion(5)<medio*0.75);assert.ok(seccion(27)<medio*0.75);
});

test('el campo sigue el sentido real del giro y se apaga tras detener la cámara',async()=>{
  const nombres=['innerWidth','innerHeight','addEventListener','matchMedia','location'];
  const previos=Object.fromEntries(nombres.map(k=>[k,globalThis[k]]));
  Object.assign(globalThis,{innerWidth:1280,innerHeight:720,addEventListener:()=>{},matchMedia:()=>({matches:false}),location:{search:''}});
  try{
    const {PerspectiveCamera}=await import('three');const {crearVelocidad}=await import('../js/escena/velocidad.js');
    const camera=new PerspectiveCamera(),campo=crearVelocidad(camera);
    campo.actualizar(1/60);assert.equal(campo.mesh.visible,false);
    camera.rotateY(0.1);campo.actualizar(1/60);assert.equal(campo.mesh.visible,true);
    assert.ok(campo.mesh.material.uniforms.uGiro.value.x>0);
    camera.rotateY(-0.2);campo.actualizar(1/60);assert.ok(campo.mesh.material.uniforms.uGiro.value.x<0);
    for(let i=0;i<200;i++)campo.actualizar(1/60);
    assert.equal(campo.mesh.visible,false);assert.equal(camera.children.length,1,'un único lote, sin objetos por estela');
    campo.mesh.geometry.dispose();campo.mesh.material.dispose();
  }finally{Object.assign(globalThis,previos);}
});
