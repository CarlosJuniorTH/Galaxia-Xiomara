// Detección de dispositivo y nivel de calidad gráfica
const ua = navigator.userAgent;
const preferencia = new URLSearchParams(location.search).get('calidad');
export const modoCompatible = preferencia === 'compatible';
export const calidadFija = preferencia === 'alta';

// iPadOS se presenta como "Macintosh", por eso se revisa la pantalla táctil
export const esIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
export const esAndroid = /Android/i.test(ua);
export const esMovil = esIOS || esAndroid || /Mobi/i.test(ua) || matchMedia('(pointer:coarse)').matches;

// El teléfono conserva el mismo detalle inicial que el PC. Los perfiles
// reducidos solo se usan cuando se solicitan explícitamente en la dirección.
export const calidad = ['media', 'baja'].includes(preferencia) ? preferencia : 'alta';

const NIVELES = {
  alta:  { pr: 3,    k: 1.0,  cielo: 1024, galaxiasLejanas: 34 },
  media: { pr: 1.5,  k: 0.6,  cielo: 768,  galaxiasLejanas: 12 },
  baja:  { pr: 1.25, k: 0.42, cielo: 512,  galaxiasLejanas: 9 }
};

export const Q = modoCompatible ? { pr: 1, k: 0.42, cielo: 512, galaxiasLejanas: 9 } : NIVELES[calidad];

// Protección contra cierres (la única excepción al perfil ultra único, y nunca en caliente): si una carga no llegó a
// terminar (iOS cierra la página cuando le falta memoria), SOLO la visita siguiente arranca en un modo más ligero en memoria
// (nivelSeguro 1: sin HDR y con menos puntos; 2: además menos resolución y texturas; si vuelve a cerrarse, un nivel más).
// En cuanto una carga termina bien, la visita siguiente vuelve a la calidad completa.
// (v2: se reinicia el contador. Las cargas atascadas por un fallo ya corregido se contaron como cierres y dejaron algunos
// aparatos en modo seguro, sin resplandor y con texturas reducidas.)
const CLAVE_CARGA = 'xiomara:carga-v2';
let estadoCarga = { enCurso: false, nivel: 0 };
try { estadoCarga = { ...estadoCarga, ...JSON.parse(localStorage.getItem(CLAVE_CARGA) || '{}') }; } catch {}
const forzado = new URLSearchParams(location.search).get('seguro');
export const nivelSeguro = forzado !== null ? Math.max(0, Math.min(2, Number(forzado) || 0))
  : estadoCarga.enCurso ? Math.min(2, (estadoCarga.nivel || 0) + 1) : 0;
const marcarCarga = enCurso => { try { localStorage.setItem(CLAVE_CARGA, JSON.stringify({ enCurso, nivel: nivelSeguro })); } catch {} };
marcarCarga(true);
// Solo cuenta como cierre una página que muere VISIBLE en plena carga (iOS sin memoria). Si se oculta o se cierra mientras
// carga (recargar, cambiar de app, cerrar la pestaña, bloquear el móvil), la marca se retira y vuelve al mostrarse otra vez.
// Antes eso también contaba como cierre: la siguiente visita salía sin HDR ni resplandor y tardaba 4 cargas en volver.
let cargando = true;
if (typeof addEventListener === 'function') {
  const alOcultar = () => { if (cargando) marcarCarga(false); };
  addEventListener('pagehide', alOcultar);
  addEventListener('visibilitychange', () => { if (!cargando) return; if (document.hidden) marcarCarga(false); else marcarCarga(true); });
}
// Texturas a la medida de la pantalla: el móvil usa los mismos tamaños que el PC (sus objetos se ven igual de grandes o más
// en su pantalla; con la mitad se veían borrosos). Solo tras un cierre por memoria (modo seguro) se usan las reducidas.
export const texturasLigeras = nivelSeguro >= 1;
export function cargaTerminada() {
  cargando = false;
  try { localStorage.setItem(CLAVE_CARGA, JSON.stringify({ enCurso: false, nivel: 0 })); } catch {}
}
