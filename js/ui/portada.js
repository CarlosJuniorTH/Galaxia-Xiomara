// Portada: dos luces separadas se buscan, se encuentran y de su encuentro nace un universo.
// Lienzo 2D ligero (sprites precalculados y mezcla aditiva) que se detiene al entrar.
// Se ve siempre al abrir; con movimiento reducido aparece ya formado.
const TAU = Math.PI * 2;
const suave = k => k * k * (3 - 2 * k);
const salida = k => 1 - Math.pow(1 - k, 3);

function brillo(color, tam) {
  const c = document.createElement('canvas'); c.width = c.height = tam;
  const x = c.getContext('2d'), g = x.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
  g.addColorStop(0, `rgba(${color},1)`); g.addColorStop(0.18, `rgba(${color},.55)`); g.addColorStop(0.5, `rgba(${color},.12)`); g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g; x.fillRect(0, 0, tam, tam); return c;
}

// Hitos de la animación (segundos de su reloj t): las dos luces se encuentran, el corazón late, la galaxia se despliega
// y aparece la tarjeta (se forma a los 3,4 s del encuentro y la tarjeta entra 0,9 s después, js/ui/entrada.js). Con
// canción en la portada, su reloj se reescala para que cada hito caiga en la marca del mismo nombre (js/util/sincronia.js).
const ENCUENTRO = 4.6;
// voz: la primera frase de la presentación.
export const HITOS = Object.freeze({ voz: 0.25, encuentro: ENCUENTRO, corazon: ENCUENTRO + 0.5, galaxia: ENCUENTRO + 1.5, tarjeta: ENCUENTRO + 3.4 + 0.9 });

// reloj(): si devuelve un número, es el tiempo t de la animación (guiado por la canción); null = a su ritmo, por cuadros.
// latido(): fase del pulso de la canción (0–1, 0 en el golpe) para que el corazón lata al compás; null = su latido propio.
// destello(): segundos del destello del encuentro a tiempo real (no estirados con la animación); null = los de t.
export function crearPortada(lienzo, { alFormarse = () => {}, frases = [], textoFrase = () => {}, empezar = true, reloj = null, latido = null, destello = null } = {}) {
  let empezada = empezar;
  const x = lienzo.getContext('2d');
  const movil = matchMedia('(pointer:coarse)').matches;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let ancho = 0, alto = 0, escala = 1, t = 0, anterior = 0, activo = true, formado = false, frase = -1, id = 0;
  const rosa = brillo('255,150,200', 128), azul = brillo('150,190,255', 128), blanco = brillo('255,240,250', 128), punto = brillo('255,255,255', 16);
  const tonos = ['255,170,215', '230,170,255', '190,190,255', '255,215,235'].map(c => brillo(c, 16));
  const rosasT = ['255,160,210', '255,190,225', '255,130,190'].map(c => brillo(c, 16)), azulesT = ['160,190,255', '190,210,255', '200,170,255'].map(c => brillo(c, 16)), centroT = ['255,240,220', '255,220,170'].map(c => brillo(c, 16));
  // Chispas del encuentro: salen disparadas en todas direcciones y se apagan.
  const chispas = Array.from({ length: movil ? 50 : 80 }, () => ({ a: Math.random() * TAU, v: 0.35 + Math.random() * 0.9, rosa: Math.random() < 0.5 }));
  const fondo = Array.from({ length: movil ? 110 : 170 }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.1, f: Math.random() * TAU }));
  const N = movil ? 900 : 1500;
  const particulas = Array.from({ length: N }, (_, i) => {
    const brazo = i % 2, r = Math.pow(Math.random(), 0.75);
    // Un brazo rosa y otro azul (cada uno viene de una de las dos luces); el centro, blanco y dorado.
    return { r, a: brazo * Math.PI + r * 5.2 + (Math.random() - 0.5) * (0.5 + r * 0.6), z: (Math.random() - 0.5) * 0.08 * (1 - r), tono: r < 0.18 && Math.random() < 0.7 ? centroT[Math.floor(Math.random() * 2)] : (brazo ? azulesT : rosasT)[Math.floor(Math.random() * 3)], tam: 0.6 + Math.random() * 1.6, retraso: Math.random() * 0.35, hc: Math.random() * TAU, hj: (Math.random() - 0.5) * 0.08 };
  });
  const estela = { rosa: [], azul: [] };

  function medir() {
    ancho = innerWidth; alto = innerHeight; escala = Math.min(ancho, alto);
    lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  medir(); addEventListener('resize', medir);

  // El universo nace en el centro; ya formado, se aparta para dejar sitio a la tarjeta:
  // sube en vertical y se va a la izquierda en horizontal.
  let aparte = 0;
  const vertical = () => alto > ancho;
  // Siempre centrada; ya formada, sube a la parte de arriba y la tarjeta queda debajo (en PC y en el móvil).
  const centroX = () => ancho / 2;
  const centroY = () => vertical() ? alto * (0.4 - 0.235 * suave(aparte)) : alto * (0.47 - 0.29 * suave(aparte));
  // Recorridos de las dos luces: arcos desde lados opuestos hasta el centro (t de 0 a 3,2 s).
  // Las dos luces se acercan girando una alrededor de la otra (como dos estrellas en una danza que se cierra): cada
  // vuelta más juntas y más rápido, hasta encontrarse en el centro (ENCUENTRO, arriba).
  function luz(lado, k) {
    const cx = centroX(), cy = centroY(), e = Math.min(1, k);
    const R0 = Math.min(ancho, alto) * (vertical() ? 0.42 : 0.4), r = R0 * Math.pow(1 - e, 0.75);
    const fi = (lado < 0 ? Math.PI : 0) + 0.6 + TAU * 2.6 * Math.pow(e, 1.7);
    return [cx + Math.cos(fi) * r, cy + Math.sin(fi) * r * 0.5];
  }
  function sprite(img, px, py, tam, alfa = 1) { x.globalAlpha = alfa; x.drawImage(img, px - tam / 2, py - tam / 2, tam, tam); }

  function cuadro(ahora) {
    if (!activo) return;
    id = requestAnimationFrame(cuadro);
    if (!empezada) { anterior = ahora; return; }   // espera a que termine la carga de paquetes
    const dt = Math.min(0.05, (ahora - (anterior || ahora)) / 1000); anterior = ahora;
    // Ya formado y en su sitio, basta con 30 FPS para el giro lento (menos trabajo mientras carga el 3D). Mientras sube
    // a su sitio, a 60: a 30 la subida se veía a saltos en el móvil.
    const lento = formado && movil && aparte >= 1;
    if (lento && (cuadro.salto = !cuadro.salto)) return;
    // Con canción, el reloj es el suyo (la animación no se adelanta ni se retrasa aunque se pierdan cuadros).
    const r = reloj?.();
    if (r !== null && r !== undefined) t = r; else t += lento ? dt * 2 : dt;
    if (formado) aparte = Math.min(1, aparte + dt * 0.7);
    const cx = centroX(), cy = centroY(), R = vertical() ? ancho * (0.47 - 0.03 * aparte) : escala * 0.42 + (Math.min(ancho * 0.32, alto * 0.34) - escala * 0.42) * suave(aparte);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.clearRect(0, 0, ancho, alto);
    x.globalCompositeOperation = 'lighter';
    for (const s of fondo) sprite(punto, s.x * ancho, s.y * alto, s.r * 3, 0.35 + 0.35 * Math.sin(t * 1.3 + s.f));
    // Frases breves de presentación, sincronizadas con la animación.
    const indice = frases.findIndex((f, i) => t >= f.desde && (i === frases.length - 1 || t < frases[i + 1].desde));
    if (indice !== frase) { frase = indice; textoFrase(frases[indice]?.texto ?? '', indice); }
    if (t < ENCUENTRO + 0.2) {
      const k = t / ENCUENTRO;
      for (const [lado, img, cola] of [[-1, rosa, estela.rosa], [1, azul, estela.azul]]) {
        const [px, py] = luz(lado, k);
        cola.push([px, py]); if (cola.length > 70) cola.shift();
        cola.forEach(([qx, qy], i) => sprite(img, qx, qy, 8 + i * 0.35, (i / cola.length) * 0.45));
        sprite(img, px, py, (60 + Math.sin(t * 6) * 6) * (1 + 0.5 * k), 0.95);
        sprite(punto, px, py, 9, 1);
      }
    }
    // Encuentro: destello y onda.
    const desde = t - ENCUENTRO, dDestello = destello?.() ?? desde;
    if (dDestello > 0 && dDestello < 1.6) {
      const k = dDestello / 1.6;
      sprite(blanco, cx, cy, R * (0.4 + k * 1.6), (1 - k) * 0.9);
      // Onda de choque (dos anillos, rosa y azul) y chispas disparadas.
      for (const [col, retr] of [['rgba(255,200,230,1)', 0], ['rgba(190,205,255,1)', 0.12]]) { const kk = Math.max(0, k - retr) / (1 - retr);
        x.globalAlpha = (1 - kk) * 0.6; x.strokeStyle = col; x.lineWidth = 2 * (1 - kk) + 0.5;
        x.beginPath(); x.ellipse(cx, cy, R * kk * 1.4, R * kk * 0.7, 0, 0, TAU); x.stroke(); }
      x.globalAlpha = 1;
      for (const c of chispas) { const d = R * c.v * salida(k) * 1.2; sprite(c.rosa ? rosa : azul, cx + Math.cos(c.a) * d, cy + Math.sin(c.a) * d * 0.55, 14 * (1 - k) + 3, (1 - k) * 0.9); }
    }
    // Del encuentro nace un corazón de luz (hecho de las dos luces, rosa y azul) que late; de su latido se despliega
    // la galaxia: cada mota sale de su sitio en el corazón hacia su brazo.
    if (desde > 0) {
      // Latido: al compás de la canción si la hay (un golpe en cada pulso), si no el suyo.
      const fl = latido?.(), golpe = fl === null || fl === undefined ? null : Math.max(0, Math.cos(fl * TAU));
      const giro = t * 0.05, kH = salida(Math.min(1, desde / 0.7)), lat = 1 + (golpe === null ? Math.pow(Math.max(0, Math.sin((desde - 0.5) * 4.4)), 10) : Math.pow(golpe, 10)) * 0.12 * (desde < 2.4 ? 1 : 0);
      const S = R * (vertical() ? 0.3 : 0.26) * lat;
      for (const p of particulas) {
        const kG = salida(Math.min(1, Math.max(0, (desde - 1.5 - p.retraso) / 2.4)));
        // Punto en el corazón (curva clásica), con un poco de desorden.
        const sh = Math.sin(p.hc), hx = 16 * sh * sh * sh / 17, hy = (13 * Math.cos(p.hc) - 5 * Math.cos(2 * p.hc) - 2 * Math.cos(3 * p.hc) - Math.cos(4 * p.hc)) / 17;
        const qx = cx + (hx + p.hj) * S * kH, qy = cy - (hy + p.hj) * S * kH - S * 0.1;
        const a = p.a + giro + Math.sin(t * 0.7 + p.r * 9) * 0.015, r = p.r * R * (1 + Math.sin(t * 0.9 + p.a * 3) * 0.006);
        const gx = cx + Math.cos(a) * r, gy = cy + Math.sin(a) * r * 0.42 + p.z * R;
        const px = qx + (gx - qx) * kG, py = qy + (gy - qy) * kG;
        sprite(p.tono, px, py, p.tam * (2.2 + (1 - p.r) * 1.6) * (1 + (1 - kG) * (lat - 1) * 3), (0.55 + 0.4 * (1 - p.r)) * Math.min(1, desde / 0.4));
      }
      // Corazón luminoso en el centro, latiendo (ya dentro de la galaxia).
      const k = Math.min(1, Math.max(0, desde - 1.2) / 1.5), lat2 = 1 + Math.pow(golpe === null ? Math.max(0, Math.sin(t * 2.2)) : golpe, 8) * 0.18;
      sprite(rosa, cx, cy, R * 0.55 * k * lat2, 0.8 * k);
      sprite(blanco, cx, cy, R * 0.18 * k * lat2, k);
      if (!formado && desde > 3.4) { formado = true; alFormarse(); }
    }
  }
  id = requestAnimationFrame(cuadro);

  return {
    // Salta al universo ya formado (visitas siguientes, movimiento reducido o «Saltar»).
    empezar() { empezada = true; },
    saltar() { if (t < ENCUENTRO + 4.5) { t = ENCUENTRO + 4.5; estela.rosa.length = estela.azul.length = 0; } },
    repetir() { t = 0; formado = false; aparte = 0; frase = -1; estela.rosa.length = estela.azul.length = 0; },
    parar() { activo = false; cancelAnimationFrame(id); removeEventListener('resize', medir); },
    get formado() { return formado; }
  };
}
