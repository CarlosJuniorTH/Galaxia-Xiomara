import { crearVentana } from './ventana.js';
import { crearEscritura } from './escritura.js';
import { fechaBonita } from '../util/tiempo.js';

export function crearRecuerdos(config, estrellas, progreso, { alEncontrar, alCompletar, alCerrar = () => {} }) {
  const $ = id => document.getElementById(id);
  let pendienteCelebrar = false;
  const ventana = crearVentana('recuerdo', { alCerrar: () => {
    alCerrar();
    if (pendienteCelebrar) { pendienteCelebrar = false; setTimeout(alCompletar, 550); }
  } });
  const escritura = crearEscritura($('celebracion-texto'), $('celebracion-firma'), 24);
  const celebracion = crearVentana('celebracion', { alCerrar: () => escritura.parar() });
  $('btn-celebracion').addEventListener('click', e => { e.stopPropagation(); celebracion.cerrar(); });
  celebracion.el.querySelector('.papel').addEventListener('click', e => { if (!e.target.closest('button')) escritura.terminar(); });
  const encontradas = () => estrellas.filter(s => progreso.tiene('estrellas', s.id));
  function actualizar() {
    const n = encontradas().length;
    $('pastilla-estrellas').textContent = `✧ ${n} de ${estrellas.length} estrellas · nuestra historia`;
    $('pastilla-estrellas').classList.add('visible');
  }
  function abrir(i, { album = false } = {}) {
    const estrella = estrellas[i]; if (!estrella || (album && !progreso.tiene('estrellas', estrella.id))) return;
    const r = config.recuerdos[i] || { titulo: `Nuestra estrella ${i}`, texto: 'Este mes ya tiene su lugar en nuestro cielo. Su historia está esperando a que Carlos la escriba.' };
    $('recuerdo-mes').textContent = `${i === 0 ? 'El comienzo' : `Mes ${i}`} · ${fechaBonita(estrella.id)}`;
    $('recuerdo-titulo').textContent = r.titulo; $('recuerdo-texto').textContent = r.texto;
    const foto = $('recuerdo-foto'); foto.classList.toggle('visible', !!r.foto); foto.alt = r.titulo;
    foto.onerror = () => { foto.classList.remove('visible'); foto.removeAttribute('src'); };
    if (r.foto) foto.src = r.foto; else foto.removeAttribute('src');
    const nueva = progreso.anotar('estrellas', estrella.id);
    if (nueva) { alEncontrar(i); actualizar(); }
    const faltan = estrellas.length - encontradas().length;
    $('recuerdo-progreso').textContent = faltan ? `Qued${faltan === 1 ? 'a' : 'an'} ${faltan} ${faltan === 1 ? 'luz por encontrar' : 'luces por encontrar'}. Este recuerdo ya vive en tu álbum.` : 'Todas nuestras estrellas están encendidas. Hay una sorpresa al cerrar…';
    pendienteCelebrar = nueva && faltan === 0 && !progreso.tiene('celebraciones', estrellas.at(-1).id);
    ventana.abrir();
  }
  function mostrarCelebracion() {
    const meses = estrellas.length - 1;
    const reemplazar = t => t.replaceAll('{n}', meses);
    $('celebracion-titulo').textContent = meses ? reemplazar(config.celebracionTitulo) : 'Nuestra primera estrella';
    $('celebracion-etiqueta').textContent = `${estrellas.length} recuerdos · un mismo cielo`;
    $('celebracion-firma').textContent = config.firma;
    progreso.anotar('celebraciones', estrellas.at(-1).id);
    celebracion.abrir(); escritura.escribir(reemplazar(config.cartaMeses.join('\n\n')), 200);
  }
  actualizar();
  return { abrir, actualizar, mostrarCelebracion, encontradas };
}
