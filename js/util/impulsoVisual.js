// Intensidad cinematográfica a partir del vuelo y del giro medido. Un giro de
// cámara no equivale físicamente a traslación: aquí controla la respuesta visual.
const suave = (a,b,x) => {const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function impulsoVisual({ progreso=0, vuelo=false, corriente=1, angular=0, radial=0, reducido=false, ceremonia=false }={}) {
  if(reducido || ceremonia)return { viaje:0,giro:0,zoom:0,intensidad:0 };
  const viaje=vuelo?suave(0.01,0.12,progreso)*(1-suave(0.8,1,progreso))*corriente:0;
  const giro=suave(0.12,1.7,Math.abs(angular));
  const zoom=suave(120,1400,Math.abs(radial));
  return {viaje,giro,zoom,intensidad:Math.max(viaje,giro,zoom)};
}
