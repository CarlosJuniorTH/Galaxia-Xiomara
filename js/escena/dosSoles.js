// «Dos soles»: una estrella doble, el lugar nuevo del mes 11, en el estado en que acaba su videoclip: los dos ya en contacto y su
// flujo común trazando el infinito (js/escena/tejidoLuz.js). Gira despacio dentro de su grupo de mundos.js.
import * as THREE from 'three';
import { SEP_FINAL } from '../util/guionVuelta.js';
import { crearEstrella } from './estrellaSolida.js';
import { crearPlasmaDosSoles } from './tejidoLuz.js';

const RADIO = 2.43;
export function crearLugarDosSoles({ grupo, renderer, uPR, escala = 15 }) {
  const raiz = new THREE.Group(); raiz.scale.setScalar(escala);
  raiz.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), grupo.position.clone().negate().normalize());   // de cara a casa: se lee entero al llegar
  grupo.add(raiz);
  const plasma = crearPlasmaDosSoles(), pu = plasma.u;
  pu.uLineal.value = 1; pu.uSep.value = SEP_FINAL; pu.uRd.value = 46; pu.uFlujo.value = 1; pu.uInfinito.value = 1; pu.uR.value = RADIO; pu.uLuz.value = 0.72;   // (atenuado: aquí pasa por el bloom y no debe hacer halo)
  raiz.add(plasma.malla);
  const e = [crearEstrella({ radio: RADIO, color: [1, 0.72, 0.3], borde: [1, 0.3, 0.05], brillo: 0.56 }), crearEstrella({ radio: RADIO, color: [1, 0.46, 0.68], borde: [0.78, 0.1, 0.42], brillo: 0.56 })];
  for (const x of e) { raiz.add(x.malla); x.u.uMarea.value = 0.2; }
  return { puntos: raiz, actualizar(t) {
    const ang = t * 0.018, c = Math.cos(ang) * SEP_FINAL * 0.5, s = Math.sin(ang) * SEP_FINAL * 0.5;
    pu.uT.value = t; pu.uAng.value = ang;
    e[0].malla.position.set(c, 0, s); e[1].malla.position.set(-c, 0, -s);
    e[0].u.uDir.value.set(-Math.cos(ang), 0, -Math.sin(ang)); e[1].u.uDir.value.set(Math.cos(ang), 0, Math.sin(ang));
    for (const x of e) x.u.uT.value = t;
  } };
}
