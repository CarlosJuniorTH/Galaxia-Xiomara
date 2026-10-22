// Encuadre adaptable: giros durante viajes, en pausa, durante la explosión y con paneles; cambios
// de interfaz sin redimensionar; barras del navegador; gesto durante la corrección.
import { abrir, visitar, esperarLlegada } from './arnes.mjs';

const HORIZONTAL = { width: 900, height: 430 }, VERTICAL = { width: 430, height: 775 };

// Contorno del corazón en pantalla (plano medio de su caja, proyección real con su desplazamiento de vista).
const contornoCorazon = pagina => pagina.evaluate(() => {
  const { THREE, camera, cosmos } = window.__galaxia.escena.interno, sn = cosmos.supernova, c = sn.cajaCorazon;
  const z = (c.min.z + c.max.z) / 2, pts = [[c.min.x, c.min.y], [c.max.x, c.min.y], [c.min.x, c.max.y], [c.max.x, c.max.y]];
  sn.corazon.updateMatrixWorld(true); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) { const p = sn.corazon.localToWorld(new THREE.Vector3(x, y, z)).project(camera); const px = (p.x + 1) / 2 * innerWidth, py = (1 - p.y) / 2 * innerHeight; minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); }
  return { minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY), W: innerWidth, H: innerHeight };
});
// Cabe de ancho y además ocupa una parte digna de la pantalla (no se aleja sin motivo).
const cabeDeAncho = c => c.minX >= -4 && c.maxX <= c.W + 4 && (c.maxX - c.minX) > 0.45 * c.W;
const estado = pagina => pagina.evaluate(() => { const i = window.__galaxia.escena.interno, e = i.encuadre; const d = i.camera.position.clone().sub(i.controls.target).normalize();
  return { actual: Math.round(e.actual), ideal: Math.round(e.ideal), ajustando: e.ajustando, tiempo: i.tiempo, dir: d.toArray() }; });
const angulo = (a, b) => Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) * 180 / Math.PI;
const esperarAjuste = pagina => pagina.waitForFunction(() => !window.__galaxia.escena.interno.encuadre.ajustando, null, { timeout: 8000, polling: 50 }).catch(() => {});

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc');
  try {
    await pagina.setViewportSize(HORIZONTAL); await pagina.waitForTimeout(600);
    await pagina.evaluate(() => window.__galaxia.escena.recordarSupernova());

    // 1. Giro DURANTE el viaje de casa al corazón descubierto (el caso reproducido).
    await pagina.evaluate(() => { window.__galaxia.interfaz.visitar('supernova'); });
    await pagina.waitForFunction(() => window.__galaxia.escena.viajando, null, { timeout: 10000, polling: 16 });
    await pagina.waitForFunction(() => +(document.getElementById('galaxia')?.dataset.avance || 0) > 60, null, { timeout: 60000, polling: 50 });
    const enVuelo = await pagina.evaluate(() => window.__galaxia.escena.viajando);
    informe.comprobar(enVuelo, 'el giro ocurre de verdad durante el vuelo');
    await pagina.setViewportSize(VERTICAL);
    await esperarLlegada(pagina); await esperarAjuste(pagina); await pagina.waitForTimeout(400);
    let c = await contornoCorazon(pagina);
    informe.comprobar(cabeDeAncho(c), 'giro durante el viaje: el corazón cabe de ancho al llegar', c);

    // 2. Giro en pausa: la cámara se ajusta y el universo sigue congelado.
    await pagina.setViewportSize(HORIZONTAL); await esperarAjuste(pagina); await pagina.waitForTimeout(800);
    await pagina.evaluate(() => window.__galaxia.escena.pausar(true)); await pagina.waitForTimeout(300);
    const t0 = (await estado(pagina)).tiempo;
    await pagina.setViewportSize(VERTICAL); await pagina.waitForTimeout(1600);
    const e2 = await estado(pagina); c = await contornoCorazon(pagina);
    informe.comprobar(cabeDeAncho(c) && !e2.ajustando, 'giro en pausa: el ajuste termina y el corazón cabe', { c, ajustando: e2.ajustando });
    informe.comprobar(Math.abs(e2.tiempo - t0) < 1e-6, 'giro en pausa: la animación del universo sigue congelada', { t0, t1: e2.tiempo });
    await pagina.evaluate(() => window.__galaxia.escena.pausar(false));

    // 3. Se conserva la órbita (dirección) y el zoom relativo de la persona.
    await pagina.evaluate(() => { const { camera, controls, THREE } = window.__galaxia.escena.interno; const v = camera.position.clone().sub(controls.target); v.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.35).multiplyScalar(1.15); camera.position.copy(controls.target).add(v); camera.lookAt(controls.target); controls.update(); });
    await pagina.waitForTimeout(300);
    const a = await estado(pagina), relA = a.actual / a.ideal;
    await pagina.setViewportSize(HORIZONTAL); await pagina.waitForTimeout(400); await esperarAjuste(pagina); await pagina.waitForTimeout(300);
    const b = await estado(pagina), relB = b.actual / b.ideal;
    informe.comprobar(angulo(a.dir, b.dir) < 2, 'el reencuadre conserva la órbita', { grados: +angulo(a.dir, b.dir).toFixed(2) });
    informe.comprobar(Math.abs(relB / relA - 1) < 0.04, 'el reencuadre conserva el zoom relativo', { antes: +relA.toFixed(3), despues: +relB.toFixed(3) });

    // 4. Barras del navegador (alto −10 %): no reencuadra.
    await pagina.setViewportSize(VERTICAL); await pagina.waitForTimeout(400); await esperarAjuste(pagina); await pagina.waitForTimeout(300);
    const d0 = (await estado(pagina)).actual;
    await pagina.setViewportSize({ width: 430, height: 700 }); await pagina.waitForTimeout(900);
    const d1 = (await estado(pagina)).actual;
    informe.comprobar(Math.abs(d1 / d0 - 1) < 0.005, 'barras del navegador: la cámara no se mueve', { d0, d1 });
    await pagina.setViewportSize(VERTICAL); await pagina.waitForTimeout(500);

    // 5. Gesto durante la corrección: la corrección se cancela y se respeta el gesto.
    await pagina.setViewportSize(HORIZONTAL); await pagina.waitForTimeout(330);
    const g = await pagina.evaluate(() => { const i = window.__galaxia.escena.interno; return i.encuadre.ajustando; });
    await pagina.mouse.move(450, 215); await pagina.mouse.down(); await pagina.mouse.move(520, 230, { steps: 6 });
    const tras = await estado(pagina); await pagina.mouse.up(); await pagina.waitForTimeout(900);
    const fin = await estado(pagina);
    informe.comprobar(g && !tras.ajustando, 'un gesto cancela la corrección en curso', { ajustandoAntes: g, ajustandoTras: tras.ajustando });
    informe.comprobar(Math.abs(fin.actual / tras.actual - 1) < 0.03, 'tras el gesto la cámara no salta', { tras: tras.actual, fin: fin.actual });

    // 6. Cambios de interfaz sin redimensionar (vertical, en un lugar con tarjeta): tamaño del texto.
    await pagina.setViewportSize(VERTICAL); await pagina.waitForTimeout(400);
    await visitar(pagina, 'rosa'); await esperarAjuste(pagina); await pagina.waitForTimeout(1200);
    const r0 = await estado(pagina);
    await pagina.evaluate(() => { document.documentElement.style.fontSize = '130%'; });
    await pagina.waitForTimeout(700); await esperarAjuste(pagina); await pagina.waitForTimeout(300);
    const r1 = await estado(pagina);
    // Cada lugar llega a una distancia propia respecto a su ideal (altura, giro): se compara la razón.
    const sigue = (x, y) => Math.abs((y.actual / x.actual) / (y.ideal / x.ideal) - 1) < 0.03;
    informe.comprobar(r1.ideal / r0.ideal > 1.04 && sigue(r0, r1), 'texto más grande sin resize: el lugar se reencuadra a su nueva franja', { antes: [r0.actual, r0.ideal], despues: [r1.actual, r1.ideal] });
    await pagina.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await pagina.waitForTimeout(700); await esperarAjuste(pagina);
    // Ocultar y mostrar la tarjeta.
    await pagina.evaluate(() => { document.getElementById('lugar').hidden = true; }); await pagina.waitForTimeout(700); await esperarAjuste(pagina); await pagina.waitForTimeout(300);
    const r2 = await estado(pagina);
    await pagina.evaluate(() => { document.getElementById('lugar').hidden = false; }); await pagina.waitForTimeout(700); await esperarAjuste(pagina); await pagina.waitForTimeout(300);
    const r3 = await estado(pagina);
    informe.comprobar(sigue(r0, r2) && sigue(r0, r3), 'tarjeta que desaparece y aparece: encuadre a la franja libre', { sinTarjeta: [r2.actual, r2.ideal], conTarjeta: [r3.actual, r3.ideal] });
    // Sin cambios: no hay recentrado constante.
    const q0 = await estado(pagina); await pagina.waitForTimeout(2500); const q1 = await estado(pagina);
    informe.comprobar(!q1.ajustando && Math.abs(q1.actual / q0.actual - 1) < 0.01, 'sin cambios no se recentra', { q0: q0.actual, q1: q1.actual });

    // 7. Giro con un panel abierto (cartas): al cerrarlo, el lugar está bien encuadrado.
    await pagina.click('[data-panel="cartas"]'); await pagina.waitForTimeout(800);
    await pagina.setViewportSize(HORIZONTAL); await pagina.waitForTimeout(1500);
    await pagina.evaluate(() => document.querySelector('#panel-universo')?.close?.()); await pagina.waitForTimeout(1200); await esperarAjuste(pagina);
    const p1 = await estado(pagina);
    informe.comprobar(Math.abs(p1.actual / p1.ideal - r0.actual / r0.ideal) < 0.06, 'giro con el panel de cartas abierto: encuadre correcto al cerrarlo', { actual: p1.actual, ideal: p1.ideal });

    // 8. Giro mientras se forma el corazón (repetición de la supernova).
    await pagina.setViewportSize(HORIZONTAL); await visitar(pagina, 'supernova'); await pagina.waitForTimeout(800);
    await pagina.click('#lugar-accion');
    await pagina.waitForFunction(() => window.__galaxia.escena.interno.cosmos.supernova.desdeEstallido > 4, null, { timeout: 120000, polling: 100 });
    await pagina.setViewportSize(VERTICAL);
    await pagina.waitForFunction(() => window.__galaxia.escena.estadoSupernova === 'remanente' && !document.body.classList.contains('supernova-en-escena'), null, { timeout: 200000, polling: 200 });
    await esperarLlegada(pagina); await esperarAjuste(pagina); await pagina.waitForTimeout(800);
    c = await contornoCorazon(pagina);
    informe.comprobar(cabeDeAncho(c), 'giro mientras se forma el corazón: al terminar cabe de ancho', c);
    await pagina.screenshot({ path: '.pruebas/capturas/navegador/encuadre-formacion-vertical.jpg', type: 'jpeg', quality: 80 }).catch(() => {});
    informe.comprobar(errores.length === 0, 'sin errores de consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
