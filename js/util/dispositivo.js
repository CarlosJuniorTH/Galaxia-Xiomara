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
