// Ruido de valor 3D con fbm, determinista por semilla. Se usa para texturas de planetas
// calculadas sobre la esfera (sin costura en la longitud ni pellizco en los polos).
export function crearRuido(semilla = 1) {
  const p = new Uint8Array(512);
  let s = (semilla * 2654435761) >>> 0;
  const azar = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const valores = Float32Array.from({ length: 256 }, () => azar());
  const v = (x, y, z) => valores[p[p[p[x & 255] + (y & 255)] + (z & 255)]];
  const suave = t => t * t * (3 - 2 * t);
  function ruido(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = suave(x - xi), fy = suave(y - yi), fz = suave(z - zi);
    const a = v(xi, yi, zi) + (v(xi + 1, yi, zi) - v(xi, yi, zi)) * fx;
    const b = v(xi, yi + 1, zi) + (v(xi + 1, yi + 1, zi) - v(xi, yi + 1, zi)) * fx;
    const c = v(xi, yi, zi + 1) + (v(xi + 1, yi, zi + 1) - v(xi, yi, zi + 1)) * fx;
    const d = v(xi, yi + 1, zi + 1) + (v(xi + 1, yi + 1, zi + 1) - v(xi, yi + 1, zi + 1)) * fx;
    const e = a + (b - a) * fy, f = c + (d - c) * fy;
    return e + (f - e) * fz;
  }
  function fbm(x, y, z, octavas = 5) {
    let total = 0, amplitud = 0.5, norma = 0;
    for (let i = 0; i < octavas; i++) { total += ruido(x, y, z) * amplitud; norma += amplitud; x *= 2.03; y *= 2.03; z *= 2.03; amplitud *= 0.5; }
    return total / norma;
  }
  return { ruido, fbm, azar };
}

// Recorre los píxeles de una textura equirectangular con el punto de la esfera unidad
// correspondiente: fn(x, y, z, u, v) devuelve [r, g, b] (0–255).
export function pintarEsfera(datos, ancho, alto, fn) {
  for (let py = 0; py < alto; py++) {
    const v = (py + 0.5) / alto, lat = (0.5 - v) * Math.PI, cl = Math.cos(lat), y = Math.sin(lat);
    for (let px = 0; px < ancho; px++) {
      const u = (px + 0.5) / ancho, lon = u * Math.PI * 2;
      const c = fn(Math.cos(lon) * cl, y, Math.sin(lon) * cl, u, v), j = (py * ancho + px) * 4;
      datos[j] = c[0]; datos[j + 1] = c[1]; datos[j + 2] = c[2]; datos[j + 3] = c[3] ?? 255;
    }
  }
}
