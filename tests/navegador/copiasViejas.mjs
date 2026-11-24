// Copias guardadas viejas, a medias o rotas + publicación nueva: ha de arrancar sola, con el progreso intacto; sin red no se borra
// nada. Necesita <carpeta> con un dist/ por versión (9c52a7b… y «nueva», con fechas distintas): node … <carpeta> [casos]. Local.
import { lanzar } from './arnes.mjs';
import { spawn } from 'node:child_process'; import { symlinkSync, unlinkSync } from 'node:fs';
const V=process.argv[2], PU=8096;
const casos=[]; for(const h of ['9c52a7b','71c5a17','b5ed0cf','ea6736a','ed75dcc','40389bd']) for(const m of ['unica','larga']) casos.push([h,m]);
for(const h of ['71c5a17','40389bd','nueva']) for(const m of ['sintaxis','mezcla']) casos.push([h,m]);
const caso=async([viejo,modo],n)=>{ const L=V+'/act'+n, port=PU+n; const pon=h=>{try{unlinkSync(L)}catch{} symlinkSync(V+'/'+h,L)}; pon(viejo);
 const s=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',L],{stdio:'ignore'}); await new Promise(r=>setTimeout(r,800));
 const {navegador,pagina}=await lanzar('android',{musica:true}); const PE=[]; pagina.on('pageerror',e=>PE.push(e.message.slice(0,60)));
 let nav=0; pagina.on('framenavigated',f=>{if(f===pagina.mainFrame())nav++});
 try{ const U=`http://localhost:${port}/?sw=1`; await pagina.goto(U); await pagina.evaluate(()=>{localStorage.setItem('xiomara:universo:v2',JSON.stringify({version:2,estrellas:['2025-12-15'],cartas:['principal'],constelaciones:[],suenos:[],capsulas:[],cometas:[],visitas:['hogar'],celebraciones:['estreno-dossoles-v2'],iniciado:'2026-10-27T06:18:43.937Z'}))});
  await pagina.waitForTimeout(7000);
  if(modo!=='unica'){ await pagina.evaluate(()=>navigator.serviceWorker.ready.then(r=>r.active.postMessage('completar'))); await pagina.waitForTimeout(9000); }
  if(modo==='sintaxis'||modo==='mezcla') await pagina.evaluate(async m=>{for(const k of await caches.keys()){const c=await caches.open(k); const u=m==='sintaxis'?'./js/main.js':'./js/escena/teatroVuelta.js'; await c.put(u,new Response(m==='sintaxis'?'import {noExiste} from "./util/webgl.js";':'export const crearTeatroVuelta=()=>{undefined.add()};export const crearLugarVuelta=crearTeatroVuelta,crearEscenaVuelta=crearTeatroVuelta',{headers:{'Content-Type':'text/javascript'}}))}},modo);
  pon('nueva'); nav=0; await pagina.goto(U).catch(()=>{}); let ok=null, t=Date.now();
  while(Date.now()-t<45000){ await pagina.waitForTimeout(500); ok=await pagina.evaluate(async()=>({t:document.getElementById('carga-texto')?.textContent.startsWith('Universo listo'),av:!document.getElementById('problema-3d').hidden,k:(await caches.keys()).map(x=>x.slice(9,13)).join(),nv:!!window.__rescate,pr:(localStorage.getItem('xiomara:universo:v2')||'').includes('2025-12-15'),rs:!!localStorage.getItem('xiomara:rescate')})).catch(()=>null); if(ok?.t&&!ok.av&&ok.nv&&Date.now()-t>9000)break; }
  console.log(ok?.t&&!ok.av&&ok.nv&&ok.pr?'BIEN':'MAL ',viejo,modo,((Date.now()-t)/1000).toFixed(0)+'s','aperturas',nav,JSON.stringify(ok),PE[0]||''); 
  if(viejo==='nueva'&&modo==='mezcla'){ await pagina.waitForTimeout(3000); await pagina.evaluate(()=>navigator.serviceWorker.ready.then(r=>r.active.postMessage('completar'))); await pagina.waitForTimeout(9000); s.kill(); await pagina.waitForTimeout(500); const a=await pagina.evaluate(()=>caches.keys()); console.log('copia antes',a.join()); await pagina.evaluate(()=>window.__rescate.pulsado()).catch(()=>{}); await pagina.waitForTimeout(14000); console.log('sin conexión: copia conservada',JSON.stringify(a)===JSON.stringify(await pagina.evaluate(()=>caches.keys()).catch(e=>e.message)),'abre',await pagina.evaluate(()=>document.getElementById('carga-texto').textContent.slice(0,20)).catch(e=>e.message.slice(0,50))); }
 }catch(e){console.log('EXC',viejo,modo,e.message.slice(0,150))} finally{ await navegador.close(); s.kill(); try{unlinkSync(L)}catch{} } };
if(process.argv[3]){const f=process.argv[3].split(',');casos.splice(0,casos.length,...casos.filter(c=>f.includes(c.join('-'))))}
let i=0; await Promise.all([0,1,2].map(async()=>{ while(i<casos.length){const n=i++; await caso(casos[n],n);} }));
