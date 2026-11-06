// La hora real, no la del reloj del móvil: un evento no se adelanta aunque el reloj esté mal puesto (a mano o por error). El
// servidor que publica la página da su hora en la cabecera Date de cualquier respuesta; se pregunta sin descargar nada (HEAD, que
// el service worker deja pasar) y sin mandar datos a nadie. Si no hay red o tarda, vale el reloj del móvil: sin red, tampoco hay
// nada nuevo que descargar. Si el reloj está bien (lo normal), Date ni se toca. Solo en la web publicada: en casa manda ?fecha=.
export const TOLERANCIA_MS = 120000, ESPERA_MS = 1500;
export function desfaseReal(cabecera, ahora = Date.now()) {
  const t = Date.parse(cabecera || ''); if (!Number.isFinite(t)) return 0;
  const d = t - ahora; return Math.abs(d) > TOLERANCIA_MS ? d : 0;
}
function corregirReloj(desfase) {
  const D = Date;
  globalThis.Date = class extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + desfase); } static now() { return D.now() + desfase; } };
}
if (typeof location !== 'undefined' && /github\.io$/.test(location.hostname)) {
  try {
    const r = await Promise.race([fetch(`./?hora=${Date.now()}`, { method: 'HEAD', cache: 'no-store' }), new Promise(f => setTimeout(f, ESPERA_MS))]);
    const d = desfaseReal(r?.headers?.get('date'));
    if (d) { corregirReloj(d); console.info('Reloj del dispositivo corregido con la hora del servidor.'); }
  } catch { /* sin red: vale el reloj del dispositivo */ }
}
