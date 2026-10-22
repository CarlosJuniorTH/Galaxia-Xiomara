// Corazón de partículas que late sobre el agujero negro
import * as THREE from 'three';
import { esMovil, Q } from '../util/dispositivo.js';
import { texBrillo } from './texturas.js';
import { materialPuntos, geometriaPuntos } from './materiales.js';

export const ALTURA_CORAZON = esMovil ? 165 : 135;

function forma(t) {
  return {
    x: 16 * Math.pow(Math.sin(t), 3),
    y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  };
}

export function crearCorazon({ scene, uScale, uPR }) {
  const grupo = new THREE.Group();
  grupo.position.y = ALTURA_CORAZON;
  scene.add(grupo);
  const col = new THREE.Color();

  const mat = materialPuntos({ uScale, uPR, maximo: 5, titileo: 0.12, opacidad: 1, tam: { value: 1 } });
  const escala = 1;
  const n = Math.round(9000 * Math.max(Q.k, 0.6));
  const corazon = new THREE.Points(geometriaPuntos(n, (i, p) => {
    const t = Math.random() * Math.PI * 2;
    // Más partículas en el borde para que la silueta se lea mejor
    const borde = Math.random() < 0.3;
    const s = borde ? 0.92 + Math.random() * 0.1 : Math.sqrt(Math.random()) * 0.9;
    const f = forma(t);
    p.x = f.x * s * 3.8; p.y = f.y * s * 3.8; p.z = (Math.random() - 0.5) * 14 * (1.1 - s);
    // Rosa intenso por dentro, borde más claro y brillante
    // Colores atenuados porque se suman entre sí: así brilla en rosa sin volverse blanco
    let k;
    if (borde) { col.setHSL(0.945, 1, 0.64); k = 1.0; }
    else { col.setHSL(0.955 - s * 0.03, 1, 0.5); k = 0.34 + s * 0.16; }
    p.r = col.r * k; p.g = col.g * k; p.b = col.b * k;
    p.s = (borde ? 5.2 : 4.4) * escala;
  }), mat);
  corazon.renderOrder = 11;          // por encima de las frases
  grupo.add(corazon);

  // Resplandor detrás del corazón
  const brillo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texBrillo(), color: 0xff4f97, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  brillo.scale.set(230, 230, 1);
  brillo.renderOrder = 11;
  grupo.add(brillo);

  return {
    actualizar(t, dt, { pulso, camera, escala = 1, simbolos = 1 }) {
      mat.uniforms.uTime.value = t; mat.uniforms.uOp.value = simbolos; grupo.visible = simbolos > 0.003;
      // Latido "pum-pum"
      const b = (t * 1.15) % 1;
      const latido = 1 + 0.07 * Math.exp(-Math.pow((b - 0.08) * 14, 2)) + 0.045 * Math.exp(-Math.pow((b - 0.3) * 14, 2));
      const k = latido + pulso * 0.3;
      corazon.scale.setScalar(k);
      // Siempre de frente a ella, con un balanceo suave para que se note que es 3D
      grupo.quaternion.copy(camera.quaternion);
      corazon.rotation.y = Math.sin(t * 0.7) * 0.3;
      brillo.material.opacity = (0.18 + (latido - 1) * 1.5 + pulso * 0.3) * simbolos;
      brillo.scale.setScalar(230 * k);
      // Al alejar, crece y sube lo justo para no tapar el núcleo.
      grupo.scale.setScalar(escala);
      mat.uniforms.uTam.value = escala;
      grupo.position.y = ALTURA_CORAZON * (1 + (escala - 1) * 0.6) + Math.sin(t * 1.7) * 7 * escala;
    }
  };
}
