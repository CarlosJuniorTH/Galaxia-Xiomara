// Efectos 2D sobre la galaxia: estrellas fugaces, explosiones de corazones y fuegos artificiales
import { esMovil } from '../util/dispositivo.js';
import { trazarCorazon, azar } from '../util/dibujo.js';

const COLORES = ['#ff4f97', '#ff86bd', '#ffc2dc', '#ffffff', '#d68bff', '#ff2d7a', '#ffd27a'];

export function crearEfectos() {
  const lienzo = document.getElementById('efectos');
  const ctx = lienzo.getContext('2d');
  let W = 0, H = 0;
  const parts = [], fugaces = [];
  let pendiente = 0, anterior = 0;
  function despertar() {
    if (!pendiente && !document.hidden) { anterior = performance.now(); pendiente = requestAnimationFrame(cuadro); }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(pendiente); pendiente = 0; }
    else if (parts.length || fugaces.length) despertar();
  });

  function ajustar() {
    const dpr = Math.min(devicePixelRatio, 2);
    W = innerWidth; H = innerHeight;
    lienzo.width = W * dpr; lienzo.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ajustar();
  addEventListener('resize', ajustar);

  function explosion(x, y, cantidad = esMovil ? 18 : 28, fuerza = 1) {
    for (let i = 0; i < cantidad; i++) {
      const a = Math.random() * Math.PI * 2, v = azar(1.5, 6) * fuerza;
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, vida: 1,
        dec: azar(0.011, 0.022), s: azar(7, 19), c: COLORES[i % COLORES.length], rot: azar(-0.35, 0.35)
      });
    }
    despertar();
  }

  // Meteoros como los reales: la cabeza (blanca, con un tinte verde azulado de magnesio o
  // anaranjado de sodio) parpadea al desintegrarse, suelta chispas y deja un rastro de gas
  // ionizado que sigue brillando un instante después de que pase; algunos acaban en un destello.
  const TONOS_METEORO = [[170, 255, 210], [190, 220, 255], [255, 205, 150]];
  function estrellaFugaz({ x, y, ang, v, vida = 1, deseo = false } = {}) {
    const izq = Math.random() < 0.5;
    x ??= izq ? Math.random() * W * 0.55 : W * 0.45 + Math.random() * W * 0.55; y ??= Math.random() * H * 0.45;
    ang ??= (izq ? 0.45 : Math.PI - 0.45) + azar(-0.2, 0.2); v ??= azar(13, 21);
    fugaces.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida, dec: deseo ? 0.0065 : azar(0.016, 0.026), tono: TONOS_METEORO[Math.floor(Math.random() * 3)],
      deseo, rastro: [], chispas: [], estallido: deseo || Math.random() < 0.3, fin: false, tamano: deseo ? 1.8 : azar(0.8, 1.25) });
    despertar();
  }

  function programarFugaces() {
    setTimeout(() => { if (!document.hidden) estrellaFugaz(); programarFugaces(); }, azar(6000, 16000));
  }

  // Pedir un deseo: una estrella fugaz grande y lenta nace donde se toca.
  function deseo(x, y) {
    const ang = (x < W / 2 ? 0.55 : Math.PI - 0.55) + azar(-0.12, 0.12);
    estrellaFugaz({ x, y, ang, v: 7.5, deseo: true });
  }

  // Fuegos artificiales de corazones (para la celebración)
  function fuegos(duracion = 6000) {
    const fin = performance.now() + duracion;
    (function lanzar() {
      if (performance.now() > fin) return;
      explosion(azar(W * 0.15, W * 0.85), azar(H * 0.15, H * 0.55), esMovil ? 22 : 34, 1.3);
      setTimeout(lanzar, azar(250, 550));
    })();
  }

  function cuadro(ahora) {
    pendiente = 0;
    const paso = Math.min(2, Math.max(0, (ahora - anterior) / (1000 / 60))); anterior = ahora;
    if (!parts.length && !fugaces.length) { ctx.clearRect(0, 0, W, H); return; }
    ctx.clearRect(0, 0, W, H);

    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = fugaces.length - 1; i >= 0; i--) {
      const f = fugaces[i], [r, gr, b] = f.tono;
      if (!f.fin) {
        f.x += f.vx * paso; f.y += f.vy * paso; f.vida -= f.dec * paso;
        f.rastro.push({ x: f.x, y: f.y, edad: 0 });
        // Chispas que se desprenden de la cabeza.
        if (Math.random() < 0.35 * paso * f.tamano) f.chispas.push({ x: f.x, y: f.y, vx: f.vx * azar(0.05, 0.25) + azar(-0.6, 0.6), vy: f.vy * azar(0.05, 0.25) + azar(-0.6, 0.6), vida: 1 });
        if (f.vida <= 0) { f.fin = true; if (f.estallido) for (let k = 0; k < (f.deseo ? 16 : 7); k++) { const a = Math.random() * Math.PI * 2, vv = azar(0.6, 2.2); f.chispas.push({ x: f.x, y: f.y, vx: Math.cos(a) * vv, vy: Math.sin(a) * vv, vida: 1 }); } f.destello = 1; }
      }
      for (const p of f.rastro) p.edad += 0.045 * paso;
      while (f.rastro.length && f.rastro[0].edad > 1) f.rastro.shift();
      for (const c of f.chispas) { c.x += c.vx * paso; c.y += c.vy * paso; c.vida -= 0.04 * paso; }
      f.chispas = f.chispas.filter(c => c.vida > 0);
      if (f.fin && !f.rastro.length && !f.chispas.length && !(f.destello > 0.02)) { fugaces.splice(i, 1); continue; }
      const brillo = f.fin ? 0 : Math.min(1, (1 - f.vida) * 7) * Math.min(1, f.vida * 1.8) * (0.85 + Math.random() * 0.3);
      // Rastro: brillante junto a la cabeza (blanco → color), y el gas ionizado que queda, verdoso.
      for (let k = 1; k < f.rastro.length; k++) {
        const a = f.rastro[k - 1], c = f.rastro[k], cerca = k / f.rastro.length;
        const alfa = (1 - c.edad) * (0.15 + 0.85 * Math.pow(cerca, 2.2) * (f.fin ? 0.3 : 1)) * (f.fin ? 0.6 : 1);
        if (alfa <= 0.01) continue;
        const mezcla = Math.pow(cerca, 3);
        ctx.strokeStyle = `rgba(${Math.round(r + (255 - r) * mezcla)},${Math.round(gr + (255 - gr) * mezcla)},${Math.round(b + (255 - b) * mezcla)},${alfa * 0.18})`;
        ctx.lineWidth = 5 * f.tamano * (0.4 + cerca); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${alfa * 0.8 * mezcla + alfa * 0.25})`;
        ctx.lineWidth = 1.1 * f.tamano * (0.5 + cerca); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
      }
      for (const c of f.chispas) { ctx.fillStyle = `rgba(${r},${gr},${b},${c.vida * 0.8})`; ctx.beginPath(); ctx.arc(c.x, c.y, 0.9 * f.tamano, 0, Math.PI * 2); ctx.fill(); }
      if (brillo > 0) {
        const radio = (f.deseo ? 10 : 5) * f.tamano * (0.8 + brillo * 0.4), cabeza = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radio);
        cabeza.addColorStop(0, `rgba(255,255,255,${brillo})`); cabeza.addColorStop(0.35, `rgba(${r},${gr},${b},${brillo * 0.55})`); cabeza.addColorStop(1, `rgba(${r},${gr},${b},0)`);
        ctx.fillStyle = cabeza; ctx.beginPath(); ctx.arc(f.x, f.y, radio, 0, Math.PI * 2); ctx.fill();
      }
      if (f.destello > 0.02) {
        const radio = (f.deseo ? 26 : 13) * f.tamano * (1.2 - f.destello * 0.4), g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radio);
        g.addColorStop(0, `rgba(255,255,255,${f.destello})`); g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, radio, 0, Math.PI * 2); ctx.fill();
        f.destello *= Math.pow(0.86, paso);
      }
    }
    ctx.restore();

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx * paso; p.y += p.vy * paso; p.vy += 0.06 * paso; p.vx *= Math.pow(0.985, paso); p.vida -= p.dec * paso;
      if (p.vida <= 0) { parts.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = p.vida; ctx.fillStyle = p.c;
      if (!esMovil) { ctx.shadowColor = p.c; ctx.shadowBlur = 10; }
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      trazarCorazon(ctx, 0, 0, p.s * (0.6 + 0.4 * p.vida)); ctx.fill();
      ctx.restore();
    }
    // Limpiar también el último fotograma antes de dejar el lienzo en reposo.
    pendiente = requestAnimationFrame(cuadro);
  }

  // Texto flotante (al tocar la pantalla)
  function texto(x, y, frase) {
    const d = document.createElement('div');
    d.className = 'flotante';
    d.textContent = frase;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2700);
  }

  return { explosion, fuegos, texto, programarFugaces, deseo };
}
