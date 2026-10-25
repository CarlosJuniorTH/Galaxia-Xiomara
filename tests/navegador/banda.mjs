// Banda sonora con audios de prueba (?pruebaAudio): tonos y ruido rosa generados con ffmpeg y preparados con
// scripts/preparar-audio.mjs (no es música). Comprueba el flujo de la intro: «Toca para empezar ♡» (la descarga empieza
// antes y cuenta en los MB de la carga), el toque solo desbloquea el sonido y da paso a la carga (sin canción aún); al
// 100 % empiezan a la vez el videoclip y la canción (contexto en «running», el reloj avanza); la tarjeta para entrar no
// aparece antes de la marca «tarjeta»; el vuelo de entrada no corta la canción; al terminar se funde con el ambiente; al
// viajar se funde a «viajes» y al llegar se vuelve; el botón de música; y que en la segunda visita tampoco se puede
// saltar. Si faltan las canciones (404, como en GitHub Pages), ni pantalla de toque: la carga y el clip con su reloj. La música de los viajes (15 s, sin bucle) entra en 15 − duración del viaje y acaba al llegar.
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { lanzar } from './arnes.mjs';
import { PRUEBA } from '../../js/data/bandaSonora.js';

const CARPETA = PRUEBA.carpeta, ORIGEN = '.pruebas/audio-origen', FFMPEG = process.env.FFMPEG || '/usr/bin/ffmpeg';
function prepararAudios() {
  if (['inicio', 'viajes', 'hogar', 'hogar-estancia'].every(n => existsSync(CARPETA + n + '.m4a')) && existsSync(CARPETA + 'indice.json')) return;
  mkdirSync(ORIGEN, { recursive: true });
  const ff = (...a) => { const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...a]); if (r.status) throw Error(String(r.stderr)); };
  // «inicio»: un tono que sube de nota en cada marca, sobre ruido rosa suave (36 s de origen → fragmento de 30 s).
  ff('-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*(220+110*gte(t,8)+110*gte(t,12)+110*gte(t,20))*t)':s=44100:d=36", '-f', 'lavfi', '-i', 'anoisesrc=c=pink:a=0.04:d=36', '-filter_complex', 'amix=inputs=2', '-ac', '2', ORIGEN + '/inicio.wav');
  // «viajes»: ruido rosa con un pulso lento (15 s exactos, como la de verdad).
  ff('-f', 'lavfi', '-i', "anoisesrc=c=pink:a=0.2:d=24", '-af', "volume='0.6+0.4*sin(2*PI*0.5*t)':eval=frame", '-ac', '2', ORIGEN + '/viajes.wav');
  // «hogar» (6 s) y su estancia (6 s, más suave): dos tonos distintos.
  ff('-f', 'lavfi', '-i', 'sine=f=330:d=8', '-ac', '2', ORIGEN + '/hogar.wav');
  ff('-f', 'lavfi', '-i', 'sine=f=262:d=8', '-ac', '2', ORIGEN + '/hogar-estancia.wav');
  for (const [n, ini, fin] of [['inicio', '2', '32'], ['viajes', '1', '16'], ['hogar', '1', '7'], ['hogar-estancia', '1', '7']]) {
    const r = spawnSync('node', ['scripts/preparar-audio.mjs', `${ORIGEN}/${n}.wav`, '--inicio', ini, '--fin', fin, '--nombre', n, '--destino', CARPETA], { encoding: 'utf8' });
    if (r.status) throw Error(r.stderr); console.log('  · ' + r.stdout.trim());
  }
}

export default async function ({ base, informe }) {
  prepararAudios();
  const indice = JSON.parse(readFileSync(CARPETA + 'indice.json', 'utf8'));
  const marcas = PRUEBA.momentos.inicio.marcas;
  const { navegador, pagina, errores } = await lanzar('pc');
  const estado = () => pagina.evaluate(() => window.__bandaSonora.estado());
  try {
    // 0. Las canciones configuradas, pero sus archivos dan 404 (como en GitHub Pages): como siempre.
    const pedidosAudio = [];
    pagina.on('request', r => { if (r.url().includes('/assets/musica/')) pedidosAudio.push({ url: r.url(), t: Date.now() }); });
    await pagina.goto(`${base}/?calidad=alta#debug`);
    await pagina.waitForTimeout(2500);
    const sinArchivos = await pagina.evaluate(() => ({ toque: document.getElementById('toque').hidden, clases: document.getElementById('entrada').className, carga: getComputedStyle(document.getElementById('carga')).opacity }));
    informe.comprobar(sinArchivos.toque && !/con-toque/.test(sinArchivos.clases) && sinArchivos.carga !== '0', 'si faltan las canciones (404), no hay pantalla de toque y la carga se ve', sinArchivos);
    await pagina.waitForFunction(() => window.__intro?.empezado, null, { timeout: 120000, polling: 100 });
    informe.comprobar(await pagina.evaluate(() => !window.__intro.conCancion && document.getElementById('btn-entrar').classList.contains('preparado')), 'al 100 % empieza el clip, con su propio reloj');
    await pagina.waitForFunction(() => document.getElementById('entrada').classList.contains('formado'), null, { timeout: 60000 });
    const sinT = await pagina.evaluate(() => window.__intro.tiempo);
    informe.comprobar(sinT >= 29.8 && sinT < 31, 'y la tarjeta sale al final de sus 32 s (en «tarjeta»)', sinT);

    // 1. Con canción: pantalla de toque y descarga desde el principio.
    pedidosAudio.length = 0;
    await pagina.goto(`${base}/?calidad=alta&pruebaAudio#debug`);
    await pagina.waitForSelector('#toque:not([hidden])', { timeout: 30000 });
    const toque = await pagina.evaluate(() => ({ texto: document.querySelector('.toque-texto').textContent, fuente: getComputedStyle(document.querySelector('.toque-texto')).fontFamily, carga: getComputedStyle(document.getElementById('carga')).opacity, frase: document.getElementById('portada-frase').textContent }));
    informe.comprobar(toque.texto === 'Toca para empezar ♡' && /Great Vibes/.test(toque.fuente), 'pantalla «Toca para empezar ♡» con la letra del proyecto', toque);
    informe.comprobar(toque.carga === '0' && toque.frase === '', 'antes del toque no se ve la carga ni empieza el clip', toque);
    // Que la descarga empiece sin esperar al toque (se espera un poco a propósito antes de tocar).
    await pagina.waitForTimeout(3000);
    const antesDelToque = pedidosAudio.filter(p => /inicio\.m4a$/.test(p.url)).length;
    informe.comprobar(antesDelToque > 0, 'la canción de la portada se descarga antes del toque');
    const previstos = await pagina.evaluate(() => { const p = window.__bandaSonora.estado().pistas; return { inicio: p.inicio.previsto, viajes: p.viajes.previsto }; });
    informe.comprobar(previstos.inicio === indice['inicio.m4a'].bytes && previstos.viajes === indice['viajes.m4a'].bytes, 'los bytes de «inicio» y «viajes» (del índice) cuentan en el total de MB de la carga', previstos);
    // Registro, en la propia página, del segundo de la canción en que la tarjeta aparece y en que la carga termina.
    await pagina.evaluate(() => {
      const R = window.__registroBanda = {}, banda = window.__bandaSonora;
      new MutationObserver(() => { if (!R.formado && document.getElementById('entrada').classList.contains('formado')) R.formado = banda.tiempo('inicio'); }).observe(document.getElementById('entrada'), { attributes: true });
      new MutationObserver(() => { if (!R.preparado && document.getElementById('btn-entrar').classList.contains('preparado')) R.preparado = banda.tiempo('inicio'); }).observe(document.getElementById('btn-entrar'), { attributes: true });
      if (document.getElementById('btn-entrar').classList.contains('preparado')) R.preparado = 0;
    });
    const antes = await estado();
    informe.comprobar(antes.contexto === null || antes.contexto !== 'running', 'sin toque, el audio no suena', antes.contexto);

    // 2. El toque: da paso a la carga (sin canción aún); al 100 %, el clip y la canción a la vez.
    await pagina.click('#toque');
    await pagina.waitForTimeout(900);
    const trasToque = await pagina.evaluate(() => ({ preparado: document.getElementById('btn-entrar').classList.contains('preparado'), carga: getComputedStyle(document.getElementById('carga')).opacity, empezado: window.__intro.empezado, sonando: window.__bandaSonora.estado().pistas.inicio.sonando }));
    if (!trasToque.preparado) informe.comprobar(trasToque.carga !== '0' && !trasToque.empezado && !trasToque.sonando, 'tras el toque, la pantalla de carga y aún sin canción', trasToque);
    else informe.nota('la carga ya había terminado al tocar: el clip empezó con el toque');
    await pagina.waitForFunction(() => window.__intro.empezado, null, { timeout: 120000, polling: 50 });
    informe.comprobar(await pagina.evaluate(() => document.getElementById('btn-entrar').classList.contains('preparado') && window.__intro.conCancion), 'el clip empieza al 100 % y con la canción');
    await pagina.waitForTimeout(1500);
    const e1 = await estado(); await pagina.waitForTimeout(1000); const e2 = await estado();
    informe.comprobar(e2.contexto === 'running', 'tras el toque el AudioContext está en «running»', e2.contexto);
    informe.comprobar(e2.pistas.inicio.sonando && e2.pistas.inicio.tiempo - e1.pistas.inicio.tiempo > 0.7, 'la canción de la portada suena y su reloj avanza', [e1.pistas.inicio.tiempo, e2.pistas.inicio.tiempo]);
    informe.comprobar(e2.objetivo === 'inicio' && e2.pistas.inicio.ganancia > 0.3, 'su pista está en el aire (ganancia)', e2.pistas.inicio.ganancia);
    informe.comprobar(await pagina.evaluate(() => !document.querySelector('#portada-saltar, .portada-saltar')), 'no hay forma de saltar el clip');

    // 3. La tarjeta, en la marca «tarjeta» (y no antes), aunque la carga acabe antes.
    await pagina.waitForFunction(() => window.__registroBanda.formado !== undefined, null, { timeout: 150000, polling: 200 });
    const R = await pagina.evaluate(() => window.__registroBanda);
    informe.comprobar(R.formado >= marcas.tarjeta - 0.15, `la tarjeta para entrar aparece en la marca «tarjeta» (${marcas.tarjeta} s), no antes`, R);

    // 4. Entrar: el vuelo de entrada no corta la canción; al acabar, se funde con el ambiente.
    await pagina.waitForTimeout(1400);
    await pagina.click('#btn-entrar');
    await pagina.waitForFunction(() => window.__galaxia?.escena.viajando, null, { timeout: 10000, polling: 50 }).catch(() => {});
    await pagina.waitForTimeout(800);
    const vuelo = await estado();
    if (vuelo.pistas.inicio.tiempo < 28) informe.comprobar(vuelo.objetivo === 'inicio', 'el vuelo de entrada no corta la canción de la portada', vuelo.objetivo);
    await pagina.waitForFunction(() => window.__galaxia && !window.__galaxia.escena.viajando && document.body.classList.contains('dentro'), null, { timeout: 60000 });
    await pagina.waitForFunction(() => window.__bandaSonora.estado().objetivo === 'ambiente', null, { timeout: 40000, polling: 200 }).catch(() => {});
    await pagina.waitForTimeout(2500);
    const fin = await estado();
    informe.comprobar(fin.objetivo === 'ambiente' && fin.ambiente.encendido && fin.ambiente.ganancia > 0.5 && !fin.pistas.inicio.sonando, 'al terminar la canción de la portada, se funde con el ambiente', { objetivo: fin.objetivo, ambiente: fin.ambiente, inicio: fin.pistas.inicio });

    // 5. Un viaje: funde a «viajes» y, al llegar a un lugar sin canción propia, vuelve al ambiente.
    await pagina.evaluate(() => { window.__galaxia.interfaz.visitar('rosa'); });   // (sin esperar a la llegada)
    await pagina.waitForFunction(() => window.__galaxia.escena.viajando, null, { timeout: 5000, polling: 30 });
    await pagina.waitForTimeout(400);
    const v1 = await estado(); await pagina.waitForTimeout(1400); const v2 = await estado();
    const subiendo = v2.pistas.viajes.ganancia > v1.pistas.viajes.ganancia || v2.pistas.viajes.ganancia > 0.6;
    informe.comprobar(v2.objetivo === 'viajes' && v2.pistas.viajes.sonando && subiendo && v2.pistas.viajes.ganancia > 0.4, 'al empezar un viaje se funde a «viajes»', { objetivo: v2.objetivo, viajes: [v1.pistas.viajes.ganancia, v2.pistas.viajes.ganancia] });
    informe.comprobar(v2.ambiente.ganancia < v1.ambiente.ganancia || v2.ambiente.ganancia < 0.1, 'y el ambiente baja a la vez (fundido cruzado)', [v1.ambiente.ganancia, v2.ambiente.ganancia]);
    // Su final cae en la llegada: segundo de la canción + lo que le queda al viaje = 15, durante todo el viaje (también
    // en este, que cruza al sistema solar en dos tramos con un fundido).
    const sumas = [];
    for (let i = 0; i < 40; i++) {
      const m = await pagina.evaluate(() => ({ v: window.__galaxia.escena.viajando, r: window.__galaxia.escena.restanteViaje, t: window.__bandaSonora.tiempo('viajes'), sonando: window.__bandaSonora.estado().pistas.viajes.sonando }));
      if (!m.v || m.r < 1) break; if (m.sonando) sumas.push(+(m.t + m.r).toFixed(2)); await pagina.waitForTimeout(250);
    }
    const desvio = Math.max(...sumas.map(x => Math.abs(x - 15)));
    informe.comprobar(sumas.length > 5 && desvio < 0.35, 'la música de los viajes empieza en 15 − duración y acaba justo al llegar', { muestras: sumas.length, desvioMax: +desvio.toFixed(2) });
    await pagina.waitForFunction(() => !window.__galaxia.escena.viajando, null, { timeout: 60000, polling: 100 });
    await pagina.waitForTimeout(2600);
    const llegada = await estado();
    informe.comprobar(llegada.objetivo === 'ambiente' && llegada.pistas.viajes.ganancia < 0.05 && !llegada.pistas.viajes.sonando && llegada.ambiente.ganancia > 0.5, 'al llegar se vuelve al ambiente y «viajes» se pausa', { objetivo: llegada.objetivo, viajes: llegada.pistas.viajes, ambiente: llegada.ambiente });

    // 6. Volver a casa: su canción empieza en el cuadro en que termina el viaje; al acabar, su estancia (fundido de 3 s) y,
    // al acabar esta, el ambiente. Nada en bucle.
    await pagina.evaluate(() => { window.__llegadaBanda = null; window.__galaxia.interfaz.visitar('hogar').then(() => { window.__llegadaBanda = window.__bandaSonora.estado(); }); });
    await pagina.waitForFunction(() => window.__llegadaBanda, null, { timeout: 60000, polling: 100 });
    const enCasa = await pagina.evaluate(() => window.__llegadaBanda);
    informe.comprobar(enCasa.objetivo === 'hogar' && enCasa.pistas.hogar.tiempo < 0.15, 'al volver a casa, su canción empieza justo al llegar', { objetivo: enCasa.objetivo, t: enCasa.pistas.hogar.tiempo });
    await pagina.waitForFunction(() => window.__bandaSonora.estado().objetivo === 'hogar-estancia', null, { timeout: 24000, polling: 100 });
    await pagina.waitForTimeout(2400);
    const estancia = await estado();
    informe.comprobar(estancia.pistas['hogar-estancia'].sonando && estancia.pistas.hogar.ganancia < estancia.pistas['hogar-estancia'].ganancia, 'al acabar, funde a su versión de estancia', { hogar: estancia.pistas.hogar.ganancia, estancia: estancia.pistas['hogar-estancia'].ganancia });
    await pagina.waitForFunction(() => window.__bandaSonora.estado().objetivo === 'ambiente', null, { timeout: 15000, polling: 100 });
    await pagina.waitForTimeout(3600);
    const tras = await estado();
    informe.comprobar(tras.ambiente.encendido && !tras.pistas['hogar-estancia'].sonando && !tras.pistas.hogar.sonando, 'y al acabar la estancia, el ambiente (sin repetir la canción)', { ambiente: tras.ambiente });

    // 7. El botón de música apaga y vuelve a encender.
    await pagina.click('#btn-musica'); await pagina.waitForTimeout(900);
    const mudo = await estado();
    informe.comprobar(!mudo.activa && mudo.ambiente.ganancia < 0.02, 'el botón de música lo silencia todo', mudo.ambiente);
    await pagina.click('#btn-musica'); await pagina.waitForTimeout(1500);
    const otraVez = await estado();
    informe.comprobar(otraVez.activa && otraVez.ambiente.ganancia > 0.5, 'y lo vuelve a encender', otraVez.ambiente);

    // 8. Segunda visita: el clip tampoco se puede saltar; la tarjeta, otra vez en su marca.
    await pagina.reload();   // (goto a la misma dirección con # no recarga)
    await pagina.waitForSelector('#toque:not([hidden])', { timeout: 30000 });
    await pagina.click('#toque');
    await pagina.waitForFunction(() => window.__intro.empezado, null, { timeout: 120000, polling: 50 });
    await pagina.waitForTimeout(800);
    informe.comprobar(await pagina.evaluate(() => !document.querySelector('#portada-saltar, .portada-saltar') && !document.getElementById('entrada').classList.contains('formado')), 'en la segunda visita tampoco se puede saltar');
    await pagina.waitForFunction(() => document.getElementById('entrada').classList.contains('formado'), null, { timeout: 60000, polling: 100 });
    const segunda = await pagina.evaluate(() => window.__bandaSonora.tiempo('inicio'));
    informe.comprobar(segunda >= marcas.tarjeta - 0.15, 'y la tarjeta vuelve a salir en su marca', segunda);
    informe.comprobar(errores.length === 0, 'sin errores en la consola', errores.slice(0, 5));
  } finally { await navegador.close(); }
}
