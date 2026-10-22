// Índice espacial de esferas (árbol k-d): distancia exacta de un punto a la superficie más cercana,
// min(|p − c| − r), sin recorrer todas. Cada nodo guarda su caja y el radio mayor de lo que contiene:
// una rama se descarta si ni su esfera más grande, en el punto más cercano de su caja, mejora lo hallado.
const HOJA = 8;

export function crearIndiceEsferas(esferas) {
  const n = esferas.length, x = new Float64Array(n), y = new Float64Array(n), z = new Float64Array(n), r = new Float64Array(n);
  esferas.forEach((e, i) => { x[i] = e.x; y[i] = e.y; z[i] = e.z; r[i] = e.r; });
  const orden = Uint32Array.from({ length: n }, (_, i) => i), nodos = [];
  const ejes = [x, y, z];
  function construir(a, b) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, rm = 0;
    for (let k = a; k < b; k++) { const i = orden[k]; x0 = Math.min(x0, x[i]); x1 = Math.max(x1, x[i]); y0 = Math.min(y0, y[i]); y1 = Math.max(y1, y[i]); z0 = Math.min(z0, z[i]); z1 = Math.max(z1, z[i]); rm = Math.max(rm, r[i]); }
    const nodo = { a, b, caja: [x0, y0, z0, x1, y1, z1], rm, izq: null, der: null };
    nodos.push(nodo);
    if (b - a > HOJA) {
      const ex = x1 - x0, ey = y1 - y0, ez = z1 - z0, eje = ejes[ex >= ey && ex >= ez ? 0 : ey >= ez ? 1 : 2];
      const parte = Array.from(orden.subarray(a, b)).sort((p, q) => eje[p] - eje[q]); orden.set(parte, a);
      const m = (a + b) >> 1; nodo.izq = construir(a, m); nodo.der = construir(m, b);
    }
    return nodo;
  }
  const raiz = n ? construir(0, n) : null;
  function distancia(px, py, pz, mejor = Infinity) {
    if (!raiz) return mejor;
    const pila = [raiz];
    while (pila.length) {
      const nodo = pila.pop(), c = nodo.caja;
      const dx = Math.max(c[0] - px, 0, px - c[3]), dy = Math.max(c[1] - py, 0, py - c[4]), dz = Math.max(c[2] - pz, 0, pz - c[5]);
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) - nodo.rm >= mejor) continue;
      if (!nodo.izq) {
        for (let k = nodo.a; k < nodo.b; k++) { const i = orden[k], ax = x[i] - px, ay = y[i] - py, az = z[i] - pz, d = Math.sqrt(ax * ax + ay * ay + az * az) - r[i]; if (d < mejor) mejor = d; }
        continue;
      }
      // Primero la rama más cercana (se apila la otra debajo).
      const ci = nodo.izq.caja, cd = nodo.der.caja;
      const di = Math.max(ci[0] - px, 0, px - ci[3]) + Math.max(ci[1] - py, 0, py - ci[4]) + Math.max(ci[2] - pz, 0, pz - ci[5]);
      const dd = Math.max(cd[0] - px, 0, px - cd[3]) + Math.max(cd[1] - py, 0, py - cd[4]) + Math.max(cd[2] - pz, 0, pz - cd[5]);
      if (di < dd) pila.push(nodo.der, nodo.izq); else pila.push(nodo.izq, nodo.der);
    }
    return mejor;
  }
  return { distancia };
}
