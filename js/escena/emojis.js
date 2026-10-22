// Emojis flotando alrededor de la galaxia
import * as THREE from 'three';
import { lienzo } from '../util/dibujo.js';

const EMOJIS = ['💖', '💕', '🌸', '🌷', '🌺', '💗', '✨', '💫', '🌹', '💎'];

function crearEmoji(e) {
  const [c, x] = lienzo(256);
  x.font = "195px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(e, 128, 150);
  const t = new THREE.CanvasTexture(c);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(44, 44),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.04, depthWrite: false })
  );
}

export function crearEmojis({ scene }) {
  const grupo = new THREE.Group();
  scene.add(grupo);
  const base = [];
  const total = 14;
  for (let i = 0; i < total; i++) {
    const m = crearEmoji(EMOJIS[i % EMOJIS.length]);
    const a = (i / total) * Math.PI * 2 + 0.2, r = 260 + Math.random() * 600;
    m.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 115, Math.sin(a) * r);
    m.renderOrder = 10;
    base.push(m.position.y);
    grupo.add(m);
  }
  return {
    actualizar(t, dt, { camera, simbolos = 1 }) {
      grupo.rotation.y = t * 0.01; grupo.visible = simbolos > 0.003;
      if (!grupo.visible) return;
      grupo.children.forEach((m, i) => {
        m.position.y = base[i] + Math.sin(t * 0.9 + i) * 6;
        m.lookAt(camera.position); m.material.opacity = simbolos;
      });
    }
  };
}
