import { FRASE_SUPERNOVA, RECUERDO_SUPERNOVA } from '../util/supernovaAmor.js';

// La ceremonia de la supernova: solo mientras la estrella estalla y nace el corazón. Sin botones:
// unas pocas palabras sobre la escena y una penumbra suave. Al terminar, el corazón queda como
// un lugar más, con la misma tarjeta que los demás (volver a sentirlo y volver a casa).
export function crearSupernovaAmor({ escena, progreso, musica, alDescubrir = () => {} }) {
  const hoja = document.createElement('link'); hoja.rel = 'stylesheet'; hoja.href = new URL('../../css/supernova.css', import.meta.url).href; document.head.append(hoja);
  const raiz = document.createElement('section'); raiz.id = 'supernova-amor'; raiz.hidden = true;
  raiz.setAttribute('aria-label', 'De tanta luz, nacimos nosotros');
  raiz.innerHTML = '<div class="sn-mensaje" aria-live="polite" aria-atomic="true"><p class="sn-ceja"></p><h2></h2><p class="sn-dedicatoria"></p></div>';
  document.body.append(raiz);
  const ceja = raiz.querySelector('.sn-ceja'), titulo = raiz.querySelector('h2'), frase = raiz.querySelector('.sn-dedicatoria');
  let activa = false, revision = 0, sonido = null, vigilancia = null, descubierta = progreso.tiene('visitas', RECUERDO_SUPERNOVA);
  if (descubierta) escena.recordarSupernova();
  function mostrarFase(fase) {
    raiz.dataset.fase = fase; sonido?.fase(fase);
    const textos = {
      encuentro: ['UNA ESTRELLA. UN ÚLTIMO LATIDO.', 'Hay encuentros que lo cambian todo.'],
      silencio: ['', ''], expansion: ['DE TANTA LUZ…', ''],
      formacion: ['…NACIMOS NOSOTROS.', 'Mira lo que está naciendo.'],
      revelacion: ['DONDE NUESTRA LUZ SE ENCONTRÓ', 'De tanta luz, nacimos nosotros'],
      recuerdo: ['DONDE NUESTRA LUZ SE ENCONTRÓ', 'De tanta luz, nacimos nosotros']
    };
    const [c, t] = textos[fase] || ['', '']; ceja.textContent = c; titulo.textContent = t;
    frase.textContent = fase === 'recuerdo' || fase === 'revelacion' ? FRASE_SUPERNOVA : '';
    if (fase === 'recuerdo' && !descubierta) { descubierta = true; progreso.anotar('visitas', RECUERDO_SUPERNOVA); alDescubrir(); }
  }
  function cerrar() {
    if (!activa) return;
    activa = false; revision++; clearInterval(vigilancia); vigilancia = null;
    sonido?.cerrar(); sonido = null; raiz.hidden = true;
    if (descubierta) escena.recordarSupernova();
    delete document.body.dataset.supernovaAislada; document.body.classList.remove('supernova-en-escena'); escena.detenerGiro(false);
    document.dispatchEvent(new Event('despertar-interfaz'));   // vuelve la tarjeta del lugar
  }
  // repetir: volver a sentirlo (la estrella renace y vuelve a estallar). Sin repetir, solo hay
  // ceremonia si la estrella aún no ha estallado.
  async function abrir({ repetir = false } = {}) {
    if (activa) return;
    if (!repetir && (descubierta || escena.estadoSupernova === 'remanente')) return;
    activa = true; const mia = ++revision;
    raiz.hidden = false; document.body.classList.add('supernova-en-escena'); escena.detenerGiro(true);
    vigilancia = setInterval(() => { if (escena.destino !== 'supernova') cerrar(); }, 250);
    mostrarFase('encuentro');
    try {
      // El sonido (la canción de la supernova, o los tonos sintéticos sin ella) empieza con la cuenta atrás de la escena:
      // espera = lo que le falta para estallar (si ya había empezado, la canción entra por ese mismo segundo).
      const terminado = await escena.verEstallido({ repetir, alEmpezar: espera => { if (activa && mia === revision) sonido = musica.supernova?.(espera); }, alFase: fase => { if (activa && mia === revision) mostrarFase(fase); } });
      if (activa && mia === revision && terminado) { mostrarFase('recuerdo'); await new Promise(r => setTimeout(r, 4500)); }
    } catch (error) { console.warn('La supernova conserva su recuerdo:', error); }
    if (mia === revision) cerrar();
  }
  document.addEventListener('keydown', e => { if (activa && e.key === 'Escape' && !document.querySelector('dialog[open]')) { e.preventDefault(); cerrar(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) sonido?.silenciar(); });
  return { abrir, cerrar, get descubierta() { return descubierta; } };
}
