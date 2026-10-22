import { cargarContenido, contenidoActual, validarContenido } from './data/contenido.js';
import { sumarMeses, leerFecha, fechaLarga } from './util/fechas.js';
const $ = id => document.getElementById(id), form = $('editor');
let datos, seccion = 'identidad';
const nombres = { identidad: 'El comienzo', recuerdos: 'Recuerdos', cartas: 'Cartas', capsulas: 'Cápsulas', suenos: 'Sueños' };
function nodo(tag, texto, clase) { const n = document.createElement(tag); if (texto) n.textContent = texto; if (clase) n.className = clase; return n; }
function estado(texto) { $('editor-estado').textContent = texto; }
function campo(grupo, titulo, valor, cambiar, { largo = false, tipo = 'text' } = {}) {
  const l = nodo('label', titulo), input = nodo(largo ? 'textarea' : 'input');
  if (!largo) input.type = tipo;
  input.value = Array.isArray(valor) ? valor.join('\n\n') : valor || '';
  input.addEventListener('input', () => { cambiar(input.value); estado('Hay cambios en preparación. Puedes guardar el borrador o descargar el contenido.'); });
  l.append(input); grupo.append(l);
}
function grupo(titulo) { const g = nodo('section', '', 'grupo-editor'); g.append(nodo('h2', titulo)); form.append(g); return g; }
function render() {
  form.replaceChildren();
  document.querySelectorAll('[data-seccion]').forEach(b => b.setAttribute('aria-current', String(b.dataset.seccion === seccion)));
  if (seccion === 'identidad') {
    const g = grupo('Las pequeñas cosas que nos nombran');
    for (const [k, titulo] of [['nombre','Su nombre'],['firma','Tu firma'],['fechaInicio','El día que empezó todo'],['cita','Frase de bienvenida'],['foto','Foto o ilustración de entrada'],['cancion','Canción opcional (vacío = ambiente original)']]) campo(g, titulo, datos.config[k], v => datos.config[k] = v, { tipo: k === 'fechaInicio' ? 'date' : 'text' });
    g.append(nodo('small','Para las fotos y la canción, copia los archivos en assets/ y escribe su ruta. Por ejemplo: assets/fotos/nosotros.jpg.'));
    const c = grupo('La carta principal'); campo(c, 'Título', datos.config.cartaTitulo, v => datos.config.cartaTitulo = v); campo(c, 'Carta (separa los párrafos con una línea vacía)', datos.config.carta, v => datos.config.carta = v.split(/\n\s*\n/), { largo: true });
    const fin = grupo('La carta al encontrar todas las estrellas'); campo(fin, 'Título ({n} se sustituye por los meses)', datos.config.celebracionTitulo, v => datos.config.celebracionTitulo = v); campo(fin, 'Carta especial', datos.config.cartaMeses, v => datos.config.cartaMeses = v.split(/\n\s*\n/), { largo: true });
  } else if (seccion === 'recuerdos') {
    datos.config.recuerdos.forEach((r, i) => {
      const inicio = leerFecha(datos.config.fechaInicio);
      const g = grupo(`${i === 0 ? 'El comienzo' : `Mes ${i}`} · ${inicio ? fechaLarga(sumarMeses(inicio, i)) : 'fecha pendiente'}`);
      campo(g, 'Título del recuerdo', r.titulo, v => r.titulo = v); campo(g, 'La historia de esta estrella', r.texto, v => r.texto = v, { largo: true }); campo(g, 'Foto opcional', r.foto, v => r.foto = v);
    });
    const b = nodo('button', '+ Preparar el siguiente mes'); b.type = 'button'; b.onclick = () => { datos.config.recuerdos.push({ titulo: 'Una nueva estrella', texto: '' }); render(); }; form.append(b);
  } else {
    datos[seccion].forEach((c, i) => {
      const g = grupo(c.titulo || `Nueva página ${i + 1}`); campo(g, 'Título', c.titulo, v => c.titulo = v);
      if (seccion === 'cartas') campo(g, 'Dedicatoria breve', c.subtitulo, v => c.subtitulo = v);
      if (seccion === 'capsulas') campo(g, 'Día en que se abre en Argentina', c.fecha, v => c.fecha = v, { tipo: 'date' });
      campo(g, seccion === 'cartas' ? 'Carta (párrafos separados por una línea vacía)' : 'Mensaje', c.texto, v => c.texto = seccion === 'cartas' ? v.split(/\n\s*\n/) : v, { largo: true });
      g.append(nodo('small', `Identificador estable: ${c.id}. Se conserva para no perder los descubrimientos.`));
    });
    const b = nodo('button', `+ Añadir ${seccion === 'cartas' ? 'una carta' : seccion === 'capsulas' ? 'una cápsula' : 'un sueño'}`); b.type = 'button'; b.onclick = () => {
      const nuevo = { id: `${seccion}-${crypto.randomUUID()}`, titulo: 'Una nueva luz', texto: seccion === 'cartas' ? [''] : '' };
      if (seccion === 'cartas') Object.assign(nuevo, { icono: '✉', subtitulo: '' });
      if (seccion === 'capsulas') nuevo.fecha = '2027-12-15';
      datos[seccion].push(nuevo); render();
    }; form.append(b);
  }
}
function guardar() {
  const limpio = validarContenido(datos);
  localStorage.setItem('xiomara:contenido-borrador', JSON.stringify(limpio));
  estado('Borrador guardado en este navegador. La versión normal del universo conserva el contenido del proyecto.'); return limpio;
}
try {
  await cargarContenido(); datos = contenidoActual();
  const previo = localStorage.getItem('xiomara:contenido-borrador'); if (previo) { const d = validarContenido(JSON.parse(previo)); datos = { ...datos, ...d, config: { ...datos.config, ...d.config } }; }
  for (const [id, titulo] of Object.entries(nombres)) { const b = nodo('button', titulo); b.type = 'button'; b.dataset.seccion = id; b.onclick = () => { seccion = id; render(); }; $('secciones').append(b); }
  form.addEventListener('submit', e => e.preventDefault()); render();
  $('guardar-borrador').onclick = () => { try { guardar(); } catch (e) { estado(e.message); } };
  $('ver-borrador').onclick = e => { try { guardar(); } catch (error) { e.preventDefault(); estado(error.message); } };
  $('exportar').onclick = () => {
    try {
      const limpio = guardar(); const url = URL.createObjectURL(new Blob([JSON.stringify(limpio, null, 2)], { type: 'application/json' }));
      const a = nodo('a'); a.href = url; a.download = 'contenido.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
      estado('Archivo preparado. Sustituye assets/contenido.json por esta descarga y recarga el universo para incorporar el contenido.');
    } catch (e) { estado(e.message); }
  };
} catch (e) { estado(`No se ha podido abrir el contenido: ${e.message}`); }
