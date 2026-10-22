// Web Worker: calcula los datos de la telaraña cósmica (telaranaDatos.js) en otro núcleo del procesador mientras el
// resto del universo se prepara. three.js se carga por su ruta (los obreros no usan el mapa de importaciones).
import * as THREE from '../../assets/vendor/three/three.module.js';
import { generarDatosTelarana, transferibles } from './telaranaDatos.js';

self.onmessage = async () => {
  // Latido en cada pausa del cálculo: el hilo principal sabe que sigue vivo (iOS puede cerrarlo sin avisar si falta memoria).
  try { const datos = await generarDatosTelarana(THREE, async () => self.postMessage({ latido: true })); self.postMessage({ datos }, transferibles(datos)); }
  catch (error) { self.postMessage({ error: String(error) }); }
};
