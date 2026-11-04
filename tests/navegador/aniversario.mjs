// Noviembre y el primer año, con la fecha simulada (arnes.mjs · fijarFecha):
//  · 15/11/2026: «Feliz mes 11», la cuenta atrás al año cabe en el móvil (430×932), nace la estrella 12 (mes 11) con su
//    recuerdo, cuenta en el total por encontrar y, al encontrarlas todas, sale la carta propia del mes 11.
//  · 15/12/2026: «Feliz primer año» y «Hoy, un año», trece estrellas y su constelación: trazos nítidos en UNA orden de
//    dibujo, que aparecen con un fundido lento. Antes del 15/12 no existe.
// Capturas en .pruebas/capturas/navegador/aniversario-*.png.
import { abrir } from './arnes.mjs';

const CAP = '.pruebas/capturas/navegador/aniversario';
const leer = pagina => pagina.evaluate(() => {
  const t = id => document.getElementById(id)?.textContent || '';
  const sub = document.getElementById('contador-sub'), r = sub.getBoundingClientRect();
  const { scene } = window.__galaxia.escena.interno;
  let trazos = null; scene.traverse(o => { if (o.isMesh && o.material.uniforms?.uRes && o.material.uniforms?.uOpacidad) trazos = { visible: o.visible, opacidad: o.material.uniforms.uOpacidad.value, tramos: o.geometry.index.count / 6 }; });
  return { titulo: t('titulo-texto'), sub: t('contador-sub'), clases: sub.className, cabe: r.left >= 0 && r.right <= innerWidth && sub.scrollWidth <= sub.clientWidth + 1, alto: Math.round(r.height), estrellas: window.__galaxia.estrellas.length, pastilla: t('pastilla-estrellas'), trazos };
});

export default async function ({ base, informe }) {
  // ── 15 de noviembre, en el móvil grande ──
  {
    const { navegador, pagina, errores } = await abrir(base, 'movil430', { fecha: '2026-11-15T10:00:00-03:00', espera: 3000 });
    try {
      const d = await leer(pagina);
      informe.comprobar(d.titulo === 'Feliz mes 11, mi amor ♡', '15/11: el título dice «Feliz mes 11»', d.titulo);
      informe.comprobar(d.sub === 'Faltan 30 días para nuestra primera vuelta al Sol' && /cuenta-atras/.test(d.clases), '15/11: cuenta atrás de 30 días, en dorado', d.sub);
      informe.comprobar(d.cabe && d.alto < 40, 'la cuenta atrás cabe en 430 px sin salirse', { alto: d.alto });
      informe.comprobar(d.estrellas === 12 && /de 12 estrellas/.test(d.pastilla), 'la estrella del mes 11 cuenta en el total (12)', d.pastilla);
      informe.comprobar(d.trazos === null, 'antes del primer año no hay constelación (ni malla ni orden de dibujo)');
      await pagina.screenshot({ path: `${CAP}-15nov-movil.png` });
      // Encontrarlas todas, una a una, como al tocarlas.
      const textos = [];
      for (let i = 0; i < 12; i++) {
        textos.push(await pagina.evaluate(i => { window.__galaxia.recuerdos.abrir(i); return { titulo: document.getElementById('recuerdo-titulo').textContent, texto: document.getElementById('recuerdo-texto').textContent }; }, i));
        if (i === 11) await pagina.screenshot({ path: `${CAP}-recuerdo-mes11-movil.png` });
        if (i < 11) await pagina.evaluate(() => document.querySelector('#recuerdo .cerrar').click());
        await pagina.waitForTimeout(150);
      }
      informe.comprobar(textos[11].titulo === 'Once meses' && textos[11].texto.length > 40, 'la estrella del mes 11 abre su recuerdo «Once meses»', textos[11].titulo);
      informe.comprobar(textos.every(t => !/Carlos/.test(t.texto)), 'ningún recuerdo dice que falta que Carlos lo escriba');
      informe.comprobar(/Todas nuestras estrellas están encendidas/.test(await pagina.textContent('#recuerdo-progreso')), 'con la duodécima, todas están encendidas');
      // Al cerrar el último recuerdo empieza la celebración (viaje a casa, corazón de estrellas), su videoclip y luego la carta.
      await pagina.evaluate(() => document.querySelector('#recuerdo .cerrar').click());
      await pagina.waitForFunction(() => document.getElementById('celebracion').classList.contains('abierta'), null, { timeout: 180000 });
      await pagina.click('#celebracion .papel', { position: { x: 30, y: 200 } }).catch(() => {});   // termina de escribirla
      await pagina.waitForTimeout(800);
      const carta = await pagina.evaluate(() => ({ titulo: document.getElementById('celebracion-titulo').textContent, texto: document.getElementById('celebracion-texto').textContent }));
      informe.comprobar(carta.titulo === '¡Feliz mes 11, mi amor!' && /Once meses encendidos/.test(carta.texto) && /Feliz mes once/.test(carta.texto), 'al encontrarlas todas sale la carta propia del mes 11', carta.titulo);
      await pagina.screenshot({ path: `${CAP}-carta-mes11-movil.png` });
      informe.comprobar(!errores.length, 'sin errores en la consola (15/11)', errores.slice(0, 3));
    } finally { await navegador.close(); }
  }
  // ── 14 de diciembre: singular ──
  {
    const { navegador, pagina } = await abrir(base, 'movil430', { fecha: '2026-12-14T23:58:00-03:00', espera: 1500 });
    try {
      const d = await leer(pagina);
      informe.comprobar(d.sub === 'Falta 1 día para nuestra primera vuelta al Sol', '14/12: «Falta 1 día» en singular', d.sub);
    } finally { await navegador.close(); }
  }
  // ── 15 de diciembre: un año y su constelación (PC y móvil) ──
  for (const perfil of ['pc', 'movil430']) {
    const { navegador, pagina, errores } = await abrir(base, perfil, { fecha: '2026-12-15T10:00:00-03:00', espera: 500 });
    try {
      const d0 = await leer(pagina);
      informe.comprobar(d0.titulo === 'Feliz primer año, mi amor ♡' && d0.sub === 'Hoy, un año · nuestra primera vuelta al Sol' && /aniversario/.test(d0.clases), `${perfil} · 15/12: «Feliz primer año» y «Hoy, un año»`, [d0.titulo, d0.sub]);
      informe.comprobar(d0.estrellas === 13 && d0.trazos?.tramos === 13, `${perfil} · trece estrellas y su vuelta de trece trazos en una sola malla`, d0.trazos);
      // Duración del fundido: desde que empieza a verse hasta que está entero (la primera vez, ~9 s).
      const fundido = await pagina.evaluate(async () => {
        const { scene, camera } = window.__galaxia.escena.interno; let malla; scene.traverse(o => { if (o.isMesh && o.material.uniforms?.uRes) malla = o; });
        const op = () => malla.material.uniforms.uOpacidad.value, t0 = performance.now(); let inicio = null;
        while (performance.now() - t0 < 25000) {
          const v = op(); if (inicio === null && v > 0.01) inicio = performance.now();
          if (v >= 0.495) return { segundos: inicio === null ? 0 : (performance.now() - inicio) / 1000, desde: inicio === null ? null : 'visto', distanciaCamara: Math.round(camera.position.length()) };
          await new Promise(r => setTimeout(r, 100));
        }
        return { segundos: -1, opacidad: op(), distanciaCamara: Math.round(camera.position.length()) };
      });
      const d = await leer(pagina);
      informe.comprobar(fundido.segundos > 5 && d.trazos.visible, `${perfil} · la constelación aparece con un fundido lento`, fundido);
      await pagina.screenshot({ path: `${CAP}-15dic-${perfil}.png` });
      informe.comprobar(!errores.length, `${perfil} · sin errores en la consola (15/12)`, errores.slice(0, 3));
    } finally { await navegador.close(); }
  }
}
