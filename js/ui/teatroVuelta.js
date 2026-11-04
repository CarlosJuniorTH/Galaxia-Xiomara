// Los videoclips de la primera vuelta al Sol: «Falta una luz» (mes 11) y «La primera vuelta» (mes 12). Empiezan y acaban en
// negro: todo lo que estrena (geometría, sombreador, canción) se prepara con la pantalla a oscuras y se libera al terminar.
// El segundo del guion es el de la canción (reloj maestro); sin música, el clip lleva el mismo reloj por su cuenta.
import { relojMaestro } from '../util/relojMaestro.js';
import { guionVuelta, mesEnEscena } from '../util/guionVuelta.js';
import { fechaBonita } from '../util/tiempo.js';

const esperar = ms => new Promise(r => setTimeout(r, ms));
const FUNDIDO_MS = 900;

export function crearTeatroUI({ escena, banda, config, estrellas }) {
  const raiz = document.getElementById('teatro'), negro = raiz.querySelector('.teatro-negro'), caja = raiz.querySelector('.teatro-mes');
  const fecha = caja.querySelector('small'), nombre = caja.querySelector('strong'), textos = raiz.querySelector('.teatro-textos');
  let enCurso = null, desfase = 0;
  const reproducir = meses => enCurso ||= hacer(meses).finally(() => { enCurso = null; });

  async function hacer(meses) {
    const guion = guionVuelta(meses); if (!guion) return false;
    document.body.classList.add('en-teatro'); raiz.hidden = false; negro.classList.add('activo');
    await esperar(FUNDIDO_MS);
    const listo = await escena.teatroVuelta.preparar(meses).catch(e => { console.warn('El videoclip no se pudo preparar:', e); return false; });
    if (!listo) { cerrar(); return false; }
    banda.pedir?.(guion.id);
    const conCancion = await banda.preparada(guion.id, 8000) && banda.activa;
    // Sus textos, ya escritos y sin mostrar: en cada cuadro solo cambia una clase si toca.
    textos.textContent = '';
    const lineas = guion.textos.map(t => { const d = document.createElement('div'); d.className = `teatro-linea ${t.clase}`; d.textContent = t.texto; textos.append(d); return { ...t, el: d, puesta: false }; });
    let mesPuesto = -1;
    const t0 = relojMaestro.ahora() + (conCancion ? 0 : 0.2);
    escena.teatroVuelta.fijar(0); escena.teatroVuelta.dibujar();
    if (conCancion) banda.ceremonia(guion.id, 0);
    await new Promise(fin => {
      let fundiendo = false;
      escena.abrirTeatro(() => {
        const ancla = conCancion ? banda.ancla(guion.id) : null, ahora = relojMaestro.ahora();
        const s = Math.max(0, (ancla === null || ancla === undefined ? ahora - t0 : ahora - ancla) + desfase);
        if (s >= guion.duracion) { fin(); return; }
        if (negro.classList.contains('activo') && !fundiendo && s < guion.duracion - 2) negro.classList.remove('activo');
        if (!fundiendo && s >= guion.duracion - 1.8) { fundiendo = true; negro.classList.add('activo'); }
        escena.teatroVuelta.fijar(s); escena.teatroVuelta.dibujar();
        const m = mesEnEscena(guion, s);
        if (m !== mesPuesto) {
          mesPuesto = m; caja.classList.toggle('visible', m >= 0);
          if (m >= 0) {
            const r = config.recuerdos[m], id = estrellas[m]?.id;
            fecha.textContent = m === 0 ? `El comienzo · ${fechaBonita(id)}` : m === 12 ? '15 de diciembre de 2026' : `Mes ${m} · ${fechaBonita(id)}`;
            nombre.textContent = m === 12 ? 'Nuestra primera vuelta' : r?.titulo || 'Una estrella más';
          }
        }
        for (const l of lineas) { const v = s >= l.desde && s < l.hasta; if (v !== l.puesta) { l.puesta = v; l.el.classList.toggle('visible', v); } }
      });
    });
    escena.cerrarTeatro(); escena.teatroVuelta.liberar();
    if (conCancion) banda.ir('reposo');
    cerrar();
    return true;
  }
  function cerrar() {
    caja.classList.remove('visible'); textos.textContent = ''; desfase = 0;
    document.body.classList.remove('en-teatro'); negro.classList.remove('activo');
    setTimeout(() => { if (!enCurso) raiz.hidden = true; }, FUNDIDO_MS + 100);
  }
  // (Las pruebas saltan a un segundo del clip para capturarlo.)
  return { reproducir, saltar: s => { desfase += s; }, get activo() { return !!enCurso; } };
}
