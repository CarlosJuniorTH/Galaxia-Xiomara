// Densidad tridimensional en un atlas 2D: compatible con WebGL 1 y 2.
// Se calcula una vez, no se ejecuta ruido fractal por cada paso de cada píxel.
// variante (nebulosas con volumen propio, no una lámina): 'cavidad' (cáscara con una abertura, como
// la Roseta), 'filamentos' (remanente antiguo: velos finos y rotos), 'reflexion' (nube suave),
// 'oscura' (núcleo de polvo con borde brillante), 'pilares' (columnas con cabezas iluminadas).
// Canales: R densidad del gas, G ruido, B polvo.
export function crearAtlasNebulosa(semilla = 1, corazon = false, lado = 32, variante = null) {
  const columnas = 8, filas = Math.ceil(lado / columnas), ancho = lado * columnas, alto = lado * filas;
  const datos = new Uint8Array(ancho * alto * 4);
  const hash = (x, y, z) => { let h = Math.imul(x + semilla * 31, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const ruido = (x, y, z) => {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z); let a = x - i, b = y - j, c = z - k;
    a = a * a * (3 - 2 * a); b = b * b * (3 - 2 * b); c = c * c * (3 - 2 * c);
    const mix = (u, v, t) => u + (v - u) * t;
    return mix(mix(mix(hash(i,j,k),hash(i+1,j,k),a),mix(hash(i,j+1,k),hash(i+1,j+1,k),a),b),mix(mix(hash(i,j,k+1),hash(i+1,j,k+1),a),mix(hash(i,j+1,k+1),hash(i+1,j+1,k+1),a),b),c);
  };
  for (let z = 0; z < lado; z++) for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    const px = x / (lado - 1) * 2 - 1, py = y / (lado - 1) * 2 - 1, pz = z / (lado - 1) * 2 - 1;
    const n = ruido(px * 2.8 + 9, py * 2.8 + 9, pz * 2.8 + 9) * 0.64 + ruido(px * 7.5 + 13, py * 7.5 + 13, pz * 7.5 + 13) * 0.36;
    const r = Math.sqrt(px * px + py * py * 1.15 + pz * pz);
    // Envolvente irregular: nudos y columnas independientes, cavidades y bordes
    // erosionados. No se recorta cada nebulosa dentro de la misma esfera.
    const wx = px + (ruido(px*2+17,py*2,pz*2)-0.5)*0.3;
    const wy = py + (ruido(px*2,py*2+17,pz*2)-0.5)*0.3;
    const wz = pz + (n-0.5)*0.3;
    const borde = Math.max(0,Math.min(1,(1-Math.max(Math.abs(px),Math.abs(py),Math.abs(pz)))*7));
    let cuerpo=0;
    for(let i=0;i<4;i++){
      const cx=(hash(i,13,2)-0.5)*1.1,cy=(hash(i,21,3)-0.5)*0.7,cz=(hash(i,7,4)-0.5)*0.7;
      const columna=semilla%3===1;
      const dx=(wx-cx-Math.sin(wy*3+i)*0.09)/(columna?0.18:0.43),dy=(wy-cy)/(columna?0.72:0.38),dz=(wz-cz)/(columna?0.23:0.4);
      cuerpo=Math.max(cuerpo,Math.exp(-(dx*dx+dy*dy+dz*dz)*1.7));
    }
    let forma = borde * Math.max(0,Math.min(1,cuerpo*2.1)) * Math.max(0,Math.min(1,(n-0.25)*5));
    if (corazon) {
      const X=px*1.25+(n-0.5)*0.08,Y=py*1.25+0.18+(n-0.5)*0.06,Z=pz*1.45;
      const q=X*X+Y*Y+2.25*Z*Z-1;
      const f=q*q*q-X*X*Y*Y*Y-0.1125*Z*Z*Y*Y*Y;
      forma=Math.max(0,Math.min(1,-f*7));
    }
    const filamento = Math.exp(-Math.pow((n - 0.59) / 0.045, 2));
    if(semilla===44&&!corazon)forma=Math.max(0,Math.min(1,(1-r)*5));
    const cascaron = semilla === 44 ? Math.exp(-Math.pow((r - 0.66 - (n - 0.5) * 0.25) / 0.18, 2)) : 1;
    const densidad = forma * cascaron * (0.2 + filamento * 0.8) * Math.max(0, Math.min(1, (n - 0.18) * 3));
    let gas = densidad, polvo = Math.max(0, Math.min(1, (n - 0.57) * 6)) * forma;
    if (variante) {
      const n2 = ruido(px * 11 + 5, py * 11 + 1, pz * 11 + 3), cresta = 1 - Math.abs(n2 * 2 - 1), rr = Math.sqrt(wx * wx + wy * wy + wz * wz);
      const lim = Math.max(0, Math.min(1, (1 - Math.max(Math.abs(px), Math.abs(py), Math.abs(pz))) * 6));
      if (variante === 'cavidad') {
        const cascara = Math.exp(-Math.pow((rr - 0.6 - (n - 0.5) * 0.32) / 0.17, 2));
        const abertura = Math.max(0, Math.min(1, (pz / Math.max(rr, 1e-3) - 0.35) * 2.2));   // un lado abierto: se ve el hueco
        gas = cascara * (1 - abertura * 0.9) * (0.35 + 0.65 * Math.pow(cresta, 2)) * Math.max(0, Math.min(1, (n - 0.15) * 3));
        polvo = Math.exp(-Math.pow((rr - 0.78) / 0.07, 2)) * Math.max(0, Math.min(1, (n - 0.45) * 4)) * 0.8;
      } else if (variante === 'filamentos') {
        const cascara = Math.exp(-Math.pow((rr - 0.66 - (n - 0.5) * 0.4) / 0.07, 2));
        gas = cascara * Math.pow(cresta, 3) * Math.max(0, Math.min(1, (n - 0.2) * 2.5)) * 1.3; polvo = 0;
      } else if (variante === 'reflexion') {
        const nube = Math.max(0, 1 - rr * 1.15 + (n - 0.5) * 0.7);
        gas = Math.pow(nube, 1.4) * (0.55 + 0.45 * n); polvo = Math.max(0, Math.min(1, (n2 - 0.62) * 4)) * nube * 0.6;
      } else if (variante === 'oscura') {
        const nucleo = Math.max(0, 1 - rr * 1.3 + (n - 0.5) * 0.8), borde = Math.exp(-Math.pow((rr - 0.62 - (n - 0.5) * 0.3) / 0.1, 2));
        gas = borde * (0.4 + 0.6 * cresta) + nucleo * 0.25; polvo = Math.min(1, Math.pow(nucleo, 0.7) * 1.4);
      } else if (variante === 'pilares') {
        let col = 0, cabeza = 0;
        for (let i = 0; i < 3; i++) {
          const cx = -0.45 + i * 0.42 + (hash(i, 3, 9) - 0.5) * 0.12, cz = (hash(i, 5, 1) - 0.5) * 0.35, alto = 0.25 + hash(i, 8, 2) * 0.45;
          const ancho = 0.11 + 0.05 * (1 - (py + 1) / 2) + (n - 0.5) * 0.05, dx = (wx - cx - Math.sin(wy * 4 + i) * 0.05) / ancho, dz = (wz - cz) / (ancho * 1.1);
          const enAltura = py < alto ? 1 : Math.exp(-Math.pow((py - alto) / 0.06, 2));
          col = Math.max(col, Math.exp(-(dx * dx + dz * dz)) * enAltura);
          cabeza = Math.max(cabeza, Math.exp(-(dx * dx * 0.7 + dz * dz * 0.7 + Math.pow((py - alto) / 0.09, 2))));
        }
        const fondo = Math.max(0, Math.min(1, (0.15 - py) * 1.5)) * Math.max(0, Math.min(1, (n - 0.3) * 3));
        gas = Math.min(1, cabeza * 1.2 + col * 0.45 + fondo * 0.5) * (0.5 + 0.5 * cresta); polvo = Math.min(1, col * 0.9 + fondo * 0.3);
      }
      gas *= lim; polvo *= lim;
    }
    const ix = (z % columnas) * lado + x, iy = Math.floor(z / columnas) * lado + y, p = (iy * ancho + ix) * 4;
    datos[p] = Math.round(Math.min(1, gas) * 255); datos[p + 1] = Math.round(n * 255); datos[p + 2] = Math.round(Math.min(1, polvo) * 255); datos[p + 3] = 255;
  }
  return { datos, ancho, alto, lado, columnas, filas };
}
