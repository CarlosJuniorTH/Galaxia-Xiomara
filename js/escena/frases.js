// Frases de amor flotando en los brazos de la galaxia
import * as THREE from 'three';
import { esMovil } from '../util/dispositivo.js';
import { lienzo } from '../util/dibujo.js';

const ESTILOS = [
  { relleno: '#FF69B4', sombra: '#C2185B' },
  { relleno: '#FF1493', sombra: '#880E4F' },
  { relleno: '#FFB6C1', sombra: '#E91E8C' },
  { relleno: '#FFFFFF', sombra: '#E91E8C' },
  { relleno: '#FFD6EC', sombra: '#C2185B' },
  { relleno: '#FF85C2', sombra: '#AD1457' }
];

function crearSprite(texto, estilo, renderer) {
  const W = 1100, H = 240, [c, x] = lienzo(W, H);
  let fs = 105;
  x.font = `bold ${fs}px 'Quicksand', sans-serif`;
  while (x.measureText(texto).width > W - 140 && fs > 50) { fs -= 5; x.font = `bold ${fs}px 'Quicksand', sans-serif`; }
  // Fondo tipo cápsula para que se lea sobre cualquier brillo
  const anchoTexto = x.measureText(texto).width, alto = fs * 1.5;
  const bx = (W - anchoTexto) / 2 - 44, by = (H - alto) / 2, bw = anchoTexto + 88, r = alto / 2;
  x.beginPath();
  x.roundRect ? x.roundRect(bx, by, bw, alto, r) : x.rect(bx, by, bw, alto);
  x.fillStyle = 'rgba(18,2,16,0.62)'; x.fill();
  x.strokeStyle = 'rgba(255,140,200,0.45)'; x.lineWidth = 3; x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.shadowColor = estilo.sombra; x.shadowBlur = 14; x.fillStyle = estilo.relleno; x.fillText(texto, W / 2, H / 2);
  x.shadowBlur = 0; x.fillText(texto, W / 2, H / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // Se sube con el alfa ya multiplicado: evita dividir por alfas casi nulos en los
  // bordes (puntitos de colores en Safari). Mezcla premultiplicada a juego; el
  // fundido escala también el color (ver actualizar).
  tex.premultiplyAlpha = true;
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, opacity: 0, color: 0x000000,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
  }));
}

export function crearFrases({ scene, renderer }, frases) {
  const grupo = new THREE.Group();
  scene.add(grupo);
  const mats = [];
  const ancho = esMovil ? 170 : 145, alto = esMovil ? 39 : 33;
  const total = Math.min(18, frases.length);
  for (let i = 0; i < total; i++) {
    const sp = crearSprite(frases[i % frases.length], ESTILOS[i % ESTILOS.length], renderer);
    const b = i % 5, base = (b / 5) * Math.PI * 2, t = i / total;
    const r = 270 + t * 730, ang = base + t * Math.PI * 4.2;
    sp.position.set(Math.cos(ang) * r, (Math.random() - 0.5) * (esMovil ? 55 : 110), Math.sin(ang) * r);
    sp.scale.set(ancho, alto, 1);
    sp.renderOrder = 10;             // por encima del gas y los brillos
    grupo.add(sp); mats.push(sp.material);
  }

  // Una frase cada vez, con intención: cada 8 s se elige una que esté a la vista
  // (dentro de la pantalla, no demasiado cerca), aparece, se queda para leerla y se va.
  const CICLO = 8, vista = new THREE.Vector3();
  let actual = -1, inicioFrase = -Infinity;
  function elegir(camera) {
    let mejor = -1, mejorD = Infinity;
    grupo.updateMatrixWorld();
    grupo.children.forEach((sp, i) => {
      if (i === actual) return;
      sp.getWorldPosition(vista);
      const lejos = vista.distanceTo(camera.position);
      vista.project(camera);
      if (vista.z > 1 || Math.abs(vista.x) > 0.7 || Math.abs(vista.y) > 0.6 || lejos < 250) return;
      const d = vista.x * vista.x + vista.y * vista.y + Math.random() * 0.15;
      if (d < mejorD) { mejorD = d; mejor = i; }
    });
    return mejor;
  }
  return {
    actualizar(t, dt, { tiempoDentro, camera, escala = 1 }) {
      grupo.rotation.y = t * 0.016;
      // Como el corazón y el nombre: al alejar crecen para seguir siendo legibles.
      for (const sp of grupo.children) sp.scale.set(ancho * escala, alto * escala, 1);
      if (tiempoDentro === null || tiempoDentro < 1.5) return;
      if (t - inicioFrase > CICLO) { actual = elegir(camera); inicioFrase = t; }
      const edad = t - inicioFrase;
      const visible = Math.min(1, edad / 1.2) * Math.min(1, Math.max(0, (CICLO - 1.2 - edad) / 1.2));
      mats.forEach((m, i) => {
        const meta = i === actual ? visible * 0.95 : 0;
        m.opacity += (meta - m.opacity) * Math.min(1, dt * 4);
        m.color.setScalar(m.opacity);
        // Las que no se leen ahora (todas menos una) no se dibujan: eran 17 órdenes de dibujo por cuadro con opacidad ~0.
        grupo.children[i].visible = m.opacity > 0.002 || meta > 0;
      });
    }
  };
}
