// Aísla el instante sin modificar el universo de Claude: las visibilidades se
// restauran en el mismo cuadro, incluso si el compositor falla.
export function conFocoSupernova(escena, cosmos, supernova, dibujar) {
  const ocultos = [], intensidad = escena.backgroundIntensity;
  escena.backgroundIntensity = intensidad * 0.055;
  const ocultar = o => { if (o.visible) { ocultos.push(o); o.visible = false; } };
  for (const o of escena.children) if (o !== cosmos) ocultar(o);
  for (const o of cosmos.children) if (o !== supernova) ocultar(o);
  try { return dibujar(); } finally { escena.backgroundIntensity = intensidad; for (const o of ocultos) o.visible = true; }
}
