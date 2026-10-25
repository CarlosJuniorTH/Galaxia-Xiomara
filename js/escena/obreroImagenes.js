// Web Worker (clásico): descarga y decodifica las texturas horneadas fuera del hilo principal, para que la animación
// de la portada siga fluida durante la carga. Devuelve los píxeles RGBA sin premultiplicar (transferidos, sin copia).
let lienzo = null;
self.onmessage = async ({ data: { id, url, ancho, alto } }) => {
  try {
    if (typeof OffscreenCanvas !== 'function') throw new Error('sin OffscreenCanvas');
    const r = await fetch(url); if (!r.ok) throw new Error(url + ': ' + r.status);
    const bmp = await createImageBitmap(await r.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    lienzo ||= new OffscreenCanvas(ancho, alto);
    if (lienzo.width !== ancho || lienzo.height !== alto) { lienzo.width = ancho; lienzo.height = alto; }
    const ctx = lienzo.getContext('2d', { willReadFrequently: true }); ctx.clearRect(0, 0, ancho, alto); ctx.drawImage(bmp, 0, 0); bmp.close?.();
    const datos = ctx.getImageData(0, 0, ancho, alto).data;
    self.postMessage({ id, datos }, [datos.buffer]);
  } catch (e) { self.postMessage({ id, error: String(e.message || e) }); }
};
self.postMessage({ listo: true });
