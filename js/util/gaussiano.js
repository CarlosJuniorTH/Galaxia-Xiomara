// Mismos coeficientes que UnrealBloomPass r160. Dos texeles contiguos se
// pueden leer juntos por interpolación lineal conservando su suma ponderada.
export function nucleoGaussiano(radio) {
  const pesos = Array.from({ length: radio }, (_, i) => 0.39894 * Math.exp(-0.5 * i * i / (radio * radio)) / radio);
  const pares = [];
  for (let i = 1; i < radio; i += 2) {
    const siguiente = pesos[i + 1] || 0, peso = pesos[i] + siguiente;
    pares.push({ peso, distancia: i + siguiente / peso });
  }
  return { pesos, pares, total: pesos[0] + 2 * pesos.slice(1).reduce((a, b) => a + b, 0) };
}
