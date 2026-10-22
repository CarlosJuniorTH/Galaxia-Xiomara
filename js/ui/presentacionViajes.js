// Una sola indicación durante el vuelo, sin paneles que tapen la aproximación: hacia dónde vamos,
// por qué región pasamos y qué encuentro se ve ahora, con la distancia a casa. Se puede saltar el
// resto del crucero o elegir la modalidad breve. Lejos de casa, «Mirar hacia casa».
export function crearPresentacionViajes({ canvas, nombre, elegirDestino, escena }) {
  const css = document.createElement('link'); css.rel='stylesheet'; css.href=new URL('../../css/viajes.css',import.meta.url).href;document.head.append(css);
  const caja=document.createElement('section');caja.id='viaje-visual';caja.hidden=true;caja.setAttribute('aria-label','Viaje por el universo');
  caja.innerHTML='<div class="viaje-texto"><small>UN CAMINO ENTRE ESTRELLAS</small><p aria-live="polite"></p><span class="viaje-lugar"></span></div><div class="viaje-botones"><button type="button" class="viaje-saltar">Saltar ⏭</button><button type="button" class="viaje-breve" aria-pressed="false">Viaje breve</button><button type="button" class="viaje-cambiar">Cambiar destino ↗</button></div><div class="viaje-hilo" role="progressbar" aria-label="Trayecto" aria-valuemin="0" aria-valuemax="100"><i></i></div>';
  document.body.append(caja);
  caja.querySelector('.viaje-cambiar').addEventListener('click',elegirDestino);
  const saltar=caja.querySelector('.viaje-saltar'),breve=caja.querySelector('.viaje-breve'),lugar=caja.querySelector('.viaje-lugar');
  saltar.addEventListener('click',()=>{if(escena?.saltarViaje())saltar.disabled=true;});
  const pintarBreve=()=>{const v=!!escena?.viajeBreve;breve.setAttribute('aria-pressed',String(v));breve.textContent=v?'Viaje breve ✓':'Viaje breve';breve.title=v?'Los próximos viajes largos serán más cortos':'Los próximos viajes largos serán más cortos (este sigue igual)';};
  breve.addEventListener('click',()=>{if(escena){escena.viajeBreve=!escena.viajeBreve;pintarBreve();}});pintarBreve();
  // Mirar hacia casa (solo lejos de Xiomara y sin viajar).
  const casa=document.createElement('button');casa.type='button';casa.id='btn-mirar-casa';casa.hidden=true;casa.textContent='⌂ Mirar hacia casa';casa.setAttribute('aria-pressed','false');document.body.append(casa);
  casa.addEventListener('click',e=>{e.stopPropagation();if(!escena)return;escena.mirarCasa(!escena.mirandoCasa);});
  const titulo=caja.querySelector('p'),hilo=caja.querySelector('.viaje-hilo'),luz=hilo.firstElementChild;
  let anterior='',enCurso=false; const bloqueados=new Map();
  const actualizar=()=>{
    const destino=canvas.dataset.viaje||'',activo=!!destino;
    document.body.classList.toggle('viajando',activo);
    if(activo!==enCurso){
      enCurso=activo; saltar.disabled=false;
      if(activo&&!document.body.classList.contains('en-ruta')){for(const e of document.querySelectorAll('#hud .lugar,#hud .muelle,#hud #btn-tour,#cometa-aviso,#supernova-aviso')){bloqueados.set(e,e.inert);e.inert=true;}}
      else{for(const [e,inert] of bloqueados)e.inert=inert;bloqueados.clear();}
    }
    caja.hidden=!activo;
    if(destino!==anterior){titulo.textContent=activo?`Hacia ${nombre(destino)}`:'';anterior=destino;}
    // Saltar solo tiene sentido en los viajes largos por fases, antes de la aproximación.
    const fase=canvas.dataset.fase||'';saltar.hidden=!fase||fase==='aproximacion'||fase==='llegada';
    const partes=[canvas.dataset.region,canvas.dataset.encuentro,canvas.dataset.distanciaMal?`a ${canvas.dataset.distanciaMal} millones de años luz de casa`:''].filter(Boolean);
    lugar.textContent=partes.join(' · ');lugar.hidden=!partes.length;
    const avance=Number(canvas.dataset.avance||0);luz.style.transform=`scaleX(${avance/100})`;hilo.setAttribute('aria-valuenow',String(avance));
    const mirando=canvas.dataset.mirandoCasa==='si';casa.setAttribute('aria-pressed',String(mirando));casa.textContent=mirando?'Volver a la vista':'⌂ Mirar hacia casa';
  };
  new MutationObserver(actualizar).observe(canvas,{attributes:true,attributeFilter:['data-viaje','data-avance','data-fase','data-region','data-encuentro','data-distancia-mal','data-mirando-casa']});actualizar();
  // El botón de casa aparece lejos de Xiomara, sin viaje en curso.
  setInterval(()=>{casa.hidden=!escena||!!canvas.dataset.viaje||!escena.lejosDeCasa||document.body.classList.contains('supernova-en-escena');},700);
}
