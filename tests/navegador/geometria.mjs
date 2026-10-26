// Límites geométricos y rutas.
//  1. Lo que dice medidas() coincide con la geometría real: vértices transformados al mundo (con
//     todos los padres), no los mismos parámetros que usa medidas().
//  2. La tabla de escalas coincide con lo medido.
//  3. Rutas pedidas, en ambos sentidos, desde órbitas modificadas y con cancelación: la curva FINAL
//     de cada vuelo (densa, por segmentos) y la cámara cuadro a cuadro no cruzan el radio de
//     navegación de ningún cuerpo. La supernova estable, en explosión y como corazón.
import { abrir, visitar, esperarLlegada } from './arnes.mjs';

export default async function ({ base, informe }) {
  const { navegador, pagina, errores } = await abrir(base, 'pc');
  try {
    // ── 1 y 2. Medidas frente a vértices reales y frente a la tabla ──
    const m = await pagina.evaluate(async () => {
      const { THREE, cosmos, scene } = window.__galaxia.escena.interno, med = cosmos.medidas();
      scene.updateMatrixWorld(true);
      // Mayor distancia, en el mundo, de los vértices de las mallas de un tipo de geometría bajo un grupo.
      const extension = (raiz, tipo, filtro = () => true) => { let max = 0; const c = raiz.getWorldPosition(new THREE.Vector3()), v = new THREE.Vector3();
        raiz.traverse(o => { if (o.geometry?.type === tipo && filtro(o)) { const a = o.geometry.attributes.position; for (let i = 0; i < a.count; i++) max = Math.max(max, v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld).distanceTo(c)); } }); return Math.round(max); };
      const grupoDe = id => { const c = cosmos.cuerpos().find(x => x.id === id); let g = null; scene.traverse(o => { if (!g && o.isGroup && o.getWorldPosition(new THREE.Vector3()).distanceTo(c.centro) < 1 && o.children.length > 3) g = o; }); return g; };
      const ton = grupoDe('ton618'), sgr = grupoDe('sagitario'), cua = grupoDe('cuasar'), pul = grupoDe('pulsar');
      const { ESCALA_UNIVERSO } = await import('/js/data/escalaCosmica.js');
      return {
        med,
        real: {
          tonSombra: extension(ton, 'SphereGeometry'), tonDisco: extension(ton, 'RingGeometry', o => o.geometry.parameters.outerRadius > o.geometry.parameters.innerRadius * 4),
          sgrSombra: extension(sgr, 'SphereGeometry'), cuaToro: extension(cua, 'TorusGeometry'), cuaDisco: extension(cua, 'RingGeometry'),
          pulToro: extension(pul, 'RingGeometry'),   // el toro de plasma (láminas en el ecuador del giro)
          pulEstrella: extension(pul, 'SphereGeometry', o => o.geometry.parameters.radius < 100)
        },
        tabla: Object.fromEntries(ESCALA_UNIVERSO.filter(o => typeof o.radio === 'number').map(o => [o.id, { radio: o.radio, distancia: o.distancia }]))
      };
    });
    const cerca = (a, b, tol = 0.02) => Math.abs(a - b) <= Math.max(2, Math.abs(b) * tol);
    for (const [nombre, medido, real] of [['TON 618: sombra', m.med.ton618.cuerpo, m.real.tonSombra], ['TON 618: disco', m.med.ton618.disco, m.real.tonDisco], ['Sagitario A*: sombra', m.med.sagitario.cuerpo, m.real.sgrSombra],
      ['cuásar: toro de polvo', m.med.cuasar.toro, m.real.cuaToro], ['cuásar: disco', m.med.cuasar.disco, m.real.cuaDisco], ['púlsar: toro', m.med.pulsar.toro, m.real.pulToro], ['púlsar: estrella de neutrones', m.med.pulsar.cuerpo, m.real.pulEstrella]])
      informe.comprobar(cerca(medido, real), `medidas() = geometría real: ${nombre}`, { medidas: medido, vertices: real });
    for (const [id, med] of [['ton618', m.med.ton618.disco], ['cuasar', m.med.cuasar.anfitriona], ['pulsar', m.med.pulsar.gas], ['supernova', m.med.corazon.semiancho], ['progenitora', m.med.progenitora.radio], ['deneb', m.med.deneb.estrella]])
      informe.comprobar(cerca(m.tabla[id].radio, med, 0.03), `tabla de escalas = medida: ${id}`, { tabla: m.tabla[id].radio, medida: med });
    for (const id of ['ton618', 'sagitario', 'cuasar', 'pulsar']) informe.comprobar(cerca(m.tabla[id].distancia, m.med[id].distancia, 0.01), `tabla de escalas = medida: distancia de ${id}`, { tabla: m.tabla[id].distancia, medida: m.med[id].distancia });
    informe.nota('radios de navegación: ' + ['ton618', 'sagitario', 'cuasar', 'pulsar', 'supernova', 'xiomara'].map(k => `${k} ${m.med[k].navegacion}`).join(' · '));

    // ── 3. Rutas ──
    // Registro cuadro a cuadro: holgura de la cámara (distancia/radio de navegación) a cada cuerpo,
    // y holgura de la curva final de cada vuelo (por segmentos).
    await pagina.evaluate(async () => {
      const { holgura } = await import('/js/util/ruta.js');
      const i = window.__galaxia.escena.interno, R = window.__rutas = { cuadros: [], curvas: [], vistas: new Set() };
      const f = () => {
        const v = i.curvaVuelo, cs = i.cosmos.cuerpos(), cam = i.camera.position;
        if (v) {
          if (!R.vistas.has(v.curva)) { R.vistas.add(v.curva); const obs = cs.map(c => ({ c: c.centro, r: c.radio, llegada: c.id === 'xiomara', id: c.id })); const h = holgura(v.curva, v.desde, v.hasta, obs); R.curvas.push({ minimo: h.minimo, contra: h.obstaculo >= 0 ? obs[h.obstaculo].id : null }); }
          for (const c of cs) { const d = cam.distanceTo(c.centro) / c.radio, desde = v.desde.distanceTo(c.centro) / c.radio, hasta = v.hasta.distanceTo(c.centro) / c.radio;
            // Salir de dentro o llegar dentro (casa) está permitido: cuenta lo que se adentra más allá.
            const minimoPermitido = Math.min(1, desde, hasta) * 0.95; /* casa está dentro del radio de la galaxia: 5 % de margen (mismo criterio que ruta.js) */ if (d < minimoPermitido) R.cuadros.push({ id: c.id, d: +d.toFixed(3), permitido: +minimoPermitido.toFixed(3) }); }
        }
        requestAnimationFrame(f); };
      f();
    });
    const tramo = async (id, { cancelarA = null } = {}) => {
      if (cancelarA) { await pagina.evaluate(id => { window.__galaxia.interfaz.visitar(id); }, id); await pagina.waitForTimeout(cancelarA); await visitar(pagina, 'hogar'); return; }
      await visitar(pagina, id); await pagina.waitForTimeout(500);
    };
    const orbitar = (ang, zoom = 1) => pagina.evaluate(([ang, zoom]) => { const { camera, controls, THREE } = window.__galaxia.escena.interno; const v = camera.position.clone().sub(controls.target); v.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).multiplyScalar(zoom); camera.position.copy(controls.target).add(v); camera.lookAt(controls.target); controls.update(); }, [ang, zoom]);
    // Supernova estable (estrella aún sin explotar).
    const estado0 = await pagina.evaluate(() => window.__galaxia.escena.estadoSupernova);
    informe.nota(`supernova al empezar: ${estado0}`);
    await tramo('supernova'); await tramo('hogar');
    await tramo('pulsar'); await orbitar(1.2, 1.4); await tramo('cuasar'); await tramo('pulsar'); await tramo('hogar');
    await orbitar(-0.8); await tramo('cuasar'); await tramo('supernova'); await orbitar(2.0); await tramo('cuasar');
    // Cancelación a mitad y nueva ruta.
    await tramo('ton618', { cancelarA: 2500 });
    // Supernova en explosión: se repite y se sale a mitad hacia TON 618.
    await pagina.evaluate(() => window.__galaxia.escena.recordarSupernova());
    await tramo('supernova'); await pagina.click('#lugar-accion').catch(() => {});
    await pagina.waitForFunction(() => window.__galaxia.escena.interno.cosmos.supernova.desdeEstallido > 3, null, { timeout: 120000 });
    const eyecta = await pagina.evaluate(() => window.__galaxia.escena.interno.cosmos.medidas().supernova);
    informe.nota(`en explosión: navegación de la supernova ${eyecta.navegacion} (eyecta ${eyecta.eyecta})`);
    await tramo('ton618'); await tramo('hogar');
    // Corazón (remanente): ida y vuelta, y TON 618 desde él.
    await pagina.waitForFunction(() => window.__galaxia.escena.estadoSupernova === 'remanente', null, { timeout: 120000 });
    await tramo('supernova'); await orbitar(0.9, 1.2); await tramo('ton618'); await tramo('supernova'); await tramo('hogar');
    const r = await pagina.evaluate(() => ({ cuadros: window.__rutas.cuadros, curvas: window.__rutas.curvas }));
    const peor = r.curvas.reduce((a, b) => (b.minimo < a.minimo ? b : a), { minimo: Infinity });
    informe.comprobar(r.curvas.length >= 15 && peor.minimo >= 1, `las curvas finales de ${r.curvas.length} vuelos no cruzan ningún radio de navegación`, { peor });
    informe.comprobar(r.cuadros.length === 0, 'cuadro a cuadro, la cámara no entra en ningún cuerpo', r.cuadros.slice(0, 5));
    informe.comprobar(errores.length === 0, 'sin errores de consola', errores.slice(0, 3));
  } finally { await navegador.close(); }
}
