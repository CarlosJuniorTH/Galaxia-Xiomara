import { CONFIG } from '../config.js';
import { CARTAS, CAPSULAS, SUENOS } from './universo.js';
const texto = (valor, limite = 20000) => { if (typeof valor !== 'string' || valor.length > limite) throw Error('Hay un texto vacío de formato o demasiado largo.'); return valor; };
const fecha = v => {
  texto(v, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(`${v}T12:00:00Z`)) || new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) !== v) throw Error('Revisa las fechas: usa un día real del calendario.');
  return v;
};
const recurso = v => { texto(v, 2000); if (v && !/^(?:https:\/\/|\.?\/?assets\/)/.test(v)) throw Error('Las fotos y canciones deben usar una ruta assets/ o una dirección https.'); return v; };
function lista(datos, normalizar) {
  if (!Array.isArray(datos) || datos.length > 1500) throw Error('Hay una lista de contenido que no es válida.');
  const ids = new Set();
  return datos.map((dato, i) => {
    const limpio = normalizar(dato, i);
    if (limpio && typeof limpio === 'object' && 'id' in limpio) { if (!/^[a-zA-Z0-9_-]{1,100}$/.test(limpio.id)) throw Error('Un identificador no es válido.'); if (ids.has(limpio.id)) throw Error('Hay dos elementos con el mismo identificador.'); ids.add(limpio.id); }
    return limpio;
  });
}
const parrafos = v => lista(v, p => texto(p));
export function validarContenido(valor) {
  if (!valor || valor.version !== 1) throw Error('El archivo de contenido no tiene la versión esperada.');
  const limpio = { version: 1 };
  if (valor.config) {
    const c = {}; const originales = valor.config;
    for (const k of ['nombre','firma','cita','titulo','cartaTitulo','celebracionTitulo']) if (k in originales) c[k] = texto(originales[k], 1000);
    if ('fechaInicio' in originales) c.fechaInicio = fecha(originales.fechaInicio);
    for (const k of ['foto','fotoRespaldo','cancion']) if (k in originales) c[k] = recurso(originales[k]);
    for (const k of ['carta','cartaMeses','frases','mensajes','toques']) if (k in originales) c[k] = parrafos(originales[k]);
    if ('recuerdos' in originales) c.recuerdos = lista(originales.recuerdos, r => ({ titulo: texto(r.titulo, 300), texto: texto(r.texto), ...(r.foto ? { foto: recurso(r.foto) } : {}) }));
    limpio.config = c;
  }
  if ('cartas' in valor) limpio.cartas = lista(valor.cartas, c => ({ id: texto(c.id, 100), icono: texto(c.icono || '✉', 20), titulo: texto(c.titulo, 300), subtitulo: texto(c.subtitulo || '', 500), texto: parrafos(c.texto) }));
  if ('capsulas' in valor) limpio.capsulas = lista(valor.capsulas, c => ({ id: texto(c.id, 100), fecha: fecha(c.fecha), titulo: texto(c.titulo, 300), texto: texto(c.texto) }));
  if ('suenos' in valor) limpio.suenos = lista(valor.suenos, c => ({ id: texto(c.id, 100), titulo: texto(c.titulo, 300), texto: texto(c.texto) }));
  if (limpio.suenos && !limpio.suenos.length) throw Error('El jardín necesita al menos un sueño.');
  if (limpio.config) for (const k of ['carta','cartaMeses','frases','mensajes','toques','recuerdos']) if (k in limpio.config && !limpio.config[k].length) throw Error(`La lista ${k} necesita al menos un elemento.`);
  return limpio;
}
export function aplicarContenido(datos) {
  const limpio = validarContenido(datos);
  if (limpio.config) Object.assign(CONFIG, limpio.config);
  for (const [clave, destino] of [['cartas', CARTAS], ['capsulas', CAPSULAS], ['suenos', SUENOS]]) if (limpio[clave]) destino.splice(0, destino.length, ...limpio[clave]);
}
export async function cargarContenido() {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 4500);
  try {
    const respuesta = await fetch('./assets/contenido.json', { cache: 'no-cache', signal: controlador.signal });
    if (!respuesta.ok) throw Error('No se pudo cargar el archivo de contenido.');
    aplicarContenido(await respuesta.json());
  } finally { clearTimeout(temporizador); }
}
export function contenidoActual() { return structuredClone({ version: 1, config: CONFIG, cartas: CARTAS, capsulas: CAPSULAS, suenos: SUENOS }); }
