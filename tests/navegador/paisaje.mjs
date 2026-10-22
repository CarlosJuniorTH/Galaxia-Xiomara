// Paisaje alrededor de la supernova, medido en la escena real (no solo en capturas):
//  · ningún objeto independiente a menos de 1,5 veces el semiancho del corazón (su gas propio sí es suyo);
//  · su universo de llegada: galaxias alrededor, lejos, en varias direcciones;
//  · desde la llegada, nada sobre su silueta; en 36 órbitas, pocos objetos visibles sobre ella;
//  · visitar la supernova no reorganiza el universo (posiciones idénticas antes y después).
import { abrir, visitar } from './arnes.mjs';
import { SEMIEJES_CORAZON, LLEGADA_GIGANTE } from '../../js/data/escalaCosmica.js';

const inventario = pagina => pagina.evaluate(() => {
  const { scene, cosmos, THREE } = window.__galaxia.escena.interno, out = [];
  let campo = null; scene.traverse(o => { if (o.userData.campo) campo = o.userData.campo; });
  for (const g of campo.lista) out.push({ clase: 'galaxia', id: g.id, pos: g.pos.toArray(), radio: g.radio });
  // Nebulosas del catálogo: sus datos fijos (la malla se crea al acercarse, así que no sirve para comparar).
  for (const n of window.__galaxia.escena.interno.lejanas.universo.nebulosas) out.push({ clase: 'nebulosa', id: n.id, pos: n.pos.toArray(), radio: n.r });
  scene.traverse(o => { if (!o.userData.volumen3D || o.userData.brilloPropio || o.userData.nebulosa) return; let p = o, fondo = false; while (p) { if (p.name?.startsWith('Fondo óptico')) fondo = true; p = p.parent; } if (fondo) return; const s = o.getWorldScale(new THREE.Vector3()); out.push({ clase: 'nebulosa', pos: o.getWorldPosition(new THREE.Vector3()).toArray(), radio: Math.max(s.x, s.y, s.z) * 0.35 }); });
  return { S: cosmos.supernova.grupo.getWorldPosition(new THREE.Vector3()).toArray(), objetos: out };
});

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc');
  try {
    await pagina.evaluate(() => window.__galaxia.escena.recordarSupernova());
    if (await pagina.evaluate(() => window.__galaxia.escena.destino) !== 'hogar') await visitar(pagina, 'hogar');
    const antes = await inventario(pagina);
    await visitar(pagina, 'supernova'); await pagina.waitForTimeout(1500);
    const despues = await inventario(pagina);
    const llegada = await pagina.evaluate(() => window.__galaxia.escena.interno.camera.position.toArray());
    const iguales = antes.objetos.length === despues.objetos.length && antes.objetos.every((o, k) => o.pos.every((x, j) => Math.abs(x - despues.objetos[k].pos[j]) < 1e-6) && o.radio === despues.objetos[k].radio);
    informe.comprobar(iguales, 'visitar la supernova no mueve ni reescala ningún objeto del paisaje', { objetos: antes.objetos.length });

    const V = a => ({ x: a[0], y: a[1], z: a[2] }), sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], n = a => Math.hypot(...a);
    const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (n(a) * n(b)))));
    const S = despues.S, H = SEMIEJES_CORAZON[0], f = 900 / (2 * Math.tan(Math.PI / 6)), objs = despues.objetos;
    const cerca = objs.filter(o => n(sub(o.pos, S)) < H * 1.5);
    informe.comprobar(cerca.length === 0, 'ningún objeto independiente a menos de 1,5 semianchos del corazón', cerca.slice(0, 3));
    const region = objs.filter(o => o.clase === 'galaxia' && n(sub(o.pos, S)) < LLEGADA_GIGANTE.supernova + H * 5.5);
    const octantes = new Set(region.map(o => sub(o.pos, S).map(x => x > 0).join()));
    informe.comprobar(region.length >= 10 && octantes.size >= 4, 'su universo de llegada no está vacío: galaxias alrededor, en varias direcciones', { galaxias: region.length, octantes: octantes.size });
    // Sobre la silueta (±1,25 semiancho angular) con tamaño visible (> 6 px), desde una cámara.
    const sobre = cam => { const D = n(sub(cam, S)), semi = Math.atan(H / D); return objs.filter(o => { const v = sub(o.pos, cam), d = n(v), px = f * o.radio / d; return px > 6 && ang(v, sub(S, cam)) - Math.atan(o.radio / d) < semi * 1.25; }); };
    const enLlegada = sobre(llegada);
    informe.comprobar(enLlegada.length === 0, 'desde la llegada, nada visible sobre la silueta del corazón ni en su borde', enLlegada.slice(0, 3));
    // 36 órbitas alrededor del corazón a la distancia de llegada.
    const D = n(sub(llegada, S)), eje = sub(llegada, S).map(x => x / D), u = [eje[2], 0, -eje[0]].map((x, _, a) => x / Math.hypot(a[0], a[2])), w = [eje[1] * u[2] - eje[2] * u[1], eje[2] * u[0] - eje[0] * u[2], eje[0] * u[1] - eje[1] * u[0]];
    let total = 0, brillantes = 0, peor = 0;
    for (const el of [-40, 0, 40]) for (let az = 0; az < 360; az += 30) {
      const a = az * Math.PI / 180, e = el * Math.PI / 180, d = [0, 1, 2].map(k => eje[k] * Math.cos(e) * Math.cos(a) + u[k] * Math.cos(e) * Math.sin(a) + w[k] * Math.sin(e));
      const cam = S.map((x, k) => x + d[k] * D), s = sobre(cam); total += s.length; peor = Math.max(peor, s.length);
      brillantes += s.filter(o => f * o.radio / n(sub(o.pos, cam)) > 40).length;
    }
    informe.nota(`36 órbitas: ${(total / 36).toFixed(2)} objetos de media sobre la silueta (antes 21,3), ${(brillantes / 36).toFixed(2)} de más de 40 px; peor vista ${peor}`);
    informe.comprobar(total / 36 < 8 && brillantes / 36 < 2.5, 'en distintas órbitas el corazón queda despejado (media < 8 objetos y < 2,5 grandes sobre la silueta)', { media: +(total / 36).toFixed(2), grandes: +(brillantes / 36).toFixed(2) });
    informe.comprobar(errores.length === 0, 'sin errores de consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
