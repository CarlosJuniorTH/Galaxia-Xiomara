// Los videoclips de la primera vuelta al Sol: «Falta una luz» (mes 11), «La primera vuelta» (mes 12) y «Dos soles». Nunca hay
// negro antes de un clip: lo que estrenan (geometría, sombreador) se prepara antes (en la carga o al llegar a su lugar) y, si aún
// no está, con lo que había a la vista; el corte es directo a su primer cuadro, aunque la canción tarde un poco en entrar. El
// segundo del guion es el de la canción (reloj maestro); sin música, el clip lleva el mismo reloj. Se libera al terminar.
import { relojMaestro } from '../util/relojMaestro.js';
import { guionVuelta, mesEnEscena, fraseEnEscena } from '../util/guionVuelta.js';
import { fechaBonita } from '../util/tiempo.js';
import { ocupado } from '../util/descargas.js';

const esperar = ms => new Promise(r => setTimeout(r, ms));
const FUNDIDO_MS = 600;       // (el de .teatro-negro en css/teatro.css)
const ESPERA_CANCION = 2.5;   // lo más que se espera a la canción con el primer cuadro a la vista; si tarda, entra luego en su sitio

export function crearTeatroUI({ escena, banda, config, estrellas }) {
  const raiz = document.getElementById('teatro'), negro = raiz.querySelector('.teatro-negro'), caja = raiz.querySelector('.teatro-mes');
  const fecha = caja.querySelector('small'), nombre = caja.querySelector('strong'), textos = raiz.querySelector('.teatro-textos');
  let enCurso = null, desfase = 0;
  const reproducir = (meses, opciones) => enCurso ||= hacer(meses, opciones).finally(() => { enCurso = null; });

  // Se deja listo de antemano (al llegar a su lugar), para que al pedirlo empiece en el acto.
  const anticipar = async meses => {
    const guion = guionVuelta(meses); if (!guion || enCurso) return;
    if (banda.activa && banda.tiene(guion.id)) banda.preparada(guion.id, 8000);
    if (escena.teatroVuelta.guion !== guion) await escena.teatroVuelta.preparar(meses).catch(() => false);
  };
  const soltar = () => { if (!enCurso) escena.teatroVuelta.liberar(); };

  // alFinal: lo que sigue, aún a oscuras.
  async function hacer(meses, { alFinal } = {}) {
    const guion = guionVuelta(meses); if (!guion) return false;
    ocupado('clip', true);
    const listo = escena.teatroVuelta.guion === guion || await escena.teatroVuelta.preparar(meses).catch(e => { console.warn('El videoclip no se pudo preparar:', e); return false; });
    if (!listo) { ocupado('clip', false); cerrar(); alFinal?.(); return false; }
    document.body.classList.add('en-teatro'); raiz.hidden = false;
    // Sus textos, ya escritos y sin mostrar: en cada cuadro solo cambia una clase si toca.
    textos.textContent = '';
    const lineas = guion.textos.map(t => { const d = document.createElement('div'); d.className = `teatro-linea ${t.clase}`; d.textContent = t.texto; textos.append(d); return { ...t, el: d, puesta: false }; });
    // Los nombres sobre sus ciudades: solo cambia su transform en cada cuadro (sin recalcular la página).
    const etiquetas = guion.etiquetas ? guion.etiquetas.textos.map((t, i) => { const d = document.createElement('div'); d.className = `teatro-ciudad ${i ? 'rosa' : 'oro'}`; d.textContent = t; textos.append(d); return d; }) : [];
    let etiquetasPuestas = false, lados = null;
    // Los nombres y el corazón del final: letra de verdad y un corazón con su volumen, dentro del anillo de las doce estrellas.
    let nombres = null, corazon = null, nombresPuestos = false, latidoPuesto = -1;
    if (guion.corona) {
      nombres = document.createElement('div'); nombres.className = 'teatro-nombres';
      nombres.innerHTML = '<svg viewBox="-20 -20 40 38" aria-hidden="true"><defs><radialGradient id="cz" cx="38%" cy="28%" r="85%"><stop offset="0" stop-color="#ffd9e8"/><stop offset=".38" stop-color="#ff6fa8"/><stop offset="1" stop-color="#b3124f"/></radialGradient></defs><path fill="url(#cz)" d="M0 15C-9 8-17 2-17-7c0-5 4-9 9-9 3.300 0 6.200 1.800 8 4.500C1.800-14.200 4.700-16 8-16c5 0 9 4 9 9 0 9-8 15-17 22z"/></svg><strong>Carlos</strong><span>&amp;</span><strong>Xiomara</strong>';
      corazon = nombres.querySelector('svg'); textos.append(nombres);
    }
    let mesPuesto = -1, cancionLista = false;
    const conSonido = banda.activa && banda.tiene(guion.id);
    if (conSonido) banda.preparada(guion.id, 8000).then(ok => { cancionLista = ok; });
    const visible = performance.now();   // (la espera, con su propio reloj: el maestro puede estar parado si el audio no arranca)
    let t0 = null, conCancion = false;
    await new Promise(fin => {
      let fundiendo = false;
      escena.abrirTeatro(() => {
        const ahora = relojMaestro.ahora();
        // Hasta que suene: el primer plano a la vista y vivo (su titileo sigue), no una pantalla negra.
        if (t0 === null) {
          const espera = (performance.now() - visible) / 1000;
          if (conSonido && !cancionLista && espera < ESPERA_CANCION) { escena.teatroVuelta.fijar(0, espera); escena.teatroVuelta.dibujar(); return; }
          t0 = ahora + 0.2; conCancion = conSonido;
          if (conCancion) banda.ceremonia(guion.id, 0);
        }
        const ancla = conCancion ? banda.ancla(guion.id) : null;
        const s = Math.max(0, (ancla === null || ancla === undefined ? ahora - t0 : ahora - ancla) + desfase);
        if (s >= guion.duracion) { fin(); return; }
        if (!fundiendo && s >= guion.duracion - 1.1) { fundiendo = true; negro.classList.add('activo'); }
        escena.teatroVuelta.fijar(s); escena.teatroVuelta.dibujar();
        if (etiquetas.length) {
          const ve = s >= guion.etiquetas.desde && s < guion.etiquetas.hasta, pos = ve ? escena.teatroVuelta.ciudades() : null;
          if (!!pos !== etiquetasPuestas) { etiquetasPuestas = !!pos; for (const d of etiquetas) d.classList.toggle('visible', etiquetasPuestas); }
          // Fuera del disco de cada uno: encima el de arriba y debajo el de abajo (decidido una vez: no salta al girar).
          if (pos) { lados ||= pos.map(c => (c[1] < 0.5 ? -1 : 1)); etiquetas.forEach((d, i) => { d.style.transform = `translate(${(Math.min(0.76, Math.max(0.24, pos[i][0])) * innerWidth).toFixed(1)}px,${((pos[i][1] + lados[i] * (innerWidth < innerHeight ? 0.155 : 0.135)) * innerHeight).toFixed(1)}px) translate(-50%,-50%)`; }); }
        }
        if (nombres) {
          const v = guion.nombres(s) > 0.1; if (v !== nombresPuestos) { nombresPuestos = v; nombres.classList.toggle('visible', v); }
          // El corazón late con cada golpe: solo su transform (y solo si cambia de verdad).
          if (v) { const l = Math.round((guion.latido?.(s) ?? 0) * 50) / 50; if (l !== latidoPuesto) { latidoPuesto = l; corazon.style.transform = `scale(${(1 + l * 0.16).toFixed(3)})`; } }
        }
        const frase = fraseEnEscena(guion, s), m = guion.frases ? (frase ? frase.mes : -1) : mesEnEscena(guion, s);
        if (m !== mesPuesto) {
          mesPuesto = m; caja.classList.toggle('visible', m >= 0);
          if (m >= 0) {
            const r = config.recuerdos[m], id = estrellas[m]?.id;
            fecha.textContent = m === 0 ? `El comienzo · ${fechaBonita(id)}` : m === 12 ? '15 de diciembre de 2026' : `Mes ${m} · ${fechaBonita(id)}`;
            // En el clip del año, sus palabras de ese mes; en el del mes 11, que corre más, solo su título.
            nombre.classList.toggle('frase', !!guion.frases);
            nombre.textContent = guion.frases ? r?.texto || r?.titulo || '' : m === 12 ? 'Nuestra primera vuelta' : r?.titulo || 'Una estrella más';
          }
        }
        for (const l of lineas) { const v = s >= l.desde && s < l.hasta; if (v !== l.puesta) { l.puesta = v; l.el.classList.toggle('visible', v); } }
      });
    });
    escena.cerrarTeatro(); escena.teatroVuelta.liberar(); ocupado('clip', false);
    if (conCancion) banda.ir('reposo');
    // Lo que sigue arranca bajo el negro: se destapa con cuadros ya dibujados.
    if (alFinal) { alFinal(); await esperar(450); }
    cerrar();
    return true;
  }
  function cerrar() {
    caja.classList.remove('visible'); textos.textContent = ''; desfase = 0;
    document.body.classList.remove('en-teatro'); negro.classList.remove('activo');
    setTimeout(() => { if (!enCurso) raiz.hidden = true; }, FUNDIDO_MS + 100);
  }
  // (Las pruebas saltan a un segundo del clip para capturarlo.)
  return { reproducir, anticipar, soltar, saltar: s => { desfase += s; }, get activo() { return !!enCurso; } };
}
