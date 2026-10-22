// La telaraña cósmica de nuestro universo (pura, sin escena; determinista): nudos (cúmulos de
// galaxias) repartidos por todo el volumen y filamentos curvos que los unen, con grandes vacíos entre
// ellos. Desde cualquier destino se ven sus siluetas enormes en el cielo. La población del catálogo
// (grupos y galaxias sueltas) se reparte sobre ella (js/data/catalogo.js) y su luz difusa y sus
// miles de galaxias lejanas se dibujan en js/escena/telarana.js.
import { posicionDestino } from './sitios.js';
import { LEJANIA } from './escalaCosmica.js';
import { generador, semillaDe } from '../util/azarSemilla.js';

export const TELARANA = Object.freeze({
  radio: 7000000 * LEJANIA,          // ≈ 360 millones de años luz alrededor del centro de los destinos
  nudos: 150,
  separacion: 900000 * LEJANIA,      // entre nudos
  vecinos: 3,              // filamentos por nudo (hacia sus vecinos más cercanos)
  largoMax: 2600000 * LEJANIA,
  reserva: 260000 * LEJANIA          // ningún nudo tan cerca de un destino
});

// Devuelve { centro, nudos: [{ pos, r, peso }], filamentos: [{ a, b, control, grosor }] } (V: clase de vector).
export function crearTelarana(V) {
  const T = TELARANA, azar = generador(semillaDe('telarana'));
  const destinos = ['xiomara', 'supernova', 'cuasar', 'ton618', 'pulsar', 'sagitario', 'deneb'].map(id => posicionDestino(id, V));
  const centro = destinos.reduce((s, p) => s.add(p), new V()).multiplyScalar(1 / destinos.length);
  const nudos = [];
  for (let i = 0; nudos.length < T.nudos && i < 40000; i++) {
    // Algo aplanado (como un muro cósmico) y más denso hacia dentro.
    const u = azar() * 2 - 1, a = azar() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = T.radio * Math.pow(azar(), 0.55);
    const p = centro.clone().add(new V(s * Math.cos(a) * r, u * r * 0.55, s * Math.sin(a) * r));
    if (destinos.some(d => d.distanceTo(p) < T.reserva)) continue;
    if (nudos.some(n => n.pos.distanceTo(p) < T.separacion)) continue;
    nudos.push({ pos: p, r: (90000 + Math.pow(azar(), 2) * 160000) * LEJANIA, peso: 0.4 + azar() * 0.9 });
  }
  const filamentos = [], unidos = new Set();
  nudos.forEach((n, i) => {
    const cerca = nudos.map((m, j) => [j, m.pos.distanceTo(n.pos)]).filter(([j, d]) => j !== i && d < T.largoMax).sort((x, y) => x[1] - y[1]).slice(0, T.vecinos);
    for (const [j] of cerca) {
      const clave = i < j ? `${i}-${j}` : `${j}-${i}`; if (unidos.has(clave)) continue; unidos.add(clave);
      const a = n.pos, b = nudos[j].pos, medio = a.clone().add(b).multiplyScalar(0.5), largo = a.distanceTo(b);
      // Curvado: el punto de control se aparta del centro del segmento.
      const control = medio.add(new V(azar() - 0.5, (azar() - 0.5) * 0.6, azar() - 0.5).normalize().multiplyScalar(largo * (0.08 + azar() * 0.22)));
      filamentos.push({ a: i, b: j, control, grosor: (40000 + azar() * 90000) * LEJANIA });
    }
  });
  return { centro, nudos, filamentos };
}

// Punto de un filamento (curva de Bézier cuadrática) en t ∈ [0, 1].
export function puntoFilamento(t, nudos, f, V) {
  const a = nudos[f.a].pos, b = nudos[f.b].pos, u = 1 - t;
  return new V(u * u * a.x + 2 * u * t * f.control.x + t * t * b.x, u * u * a.y + 2 * u * t * f.control.y + t * t * b.y, u * u * a.z + 2 * u * t * f.control.z + t * t * b.z);
}
