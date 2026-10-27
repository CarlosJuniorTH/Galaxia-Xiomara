// Web Worker: calcula su parte de los datos de la telaraña cósmica (telaranaDatos.js) en otro núcleo del procesador
// mientras el resto del universo se prepara: { parte: 'filamentos' | 'segunda' | 'menores', puertos } (un puerto hacia
// cada uno de los otros obreros) o, sin parte, todo. three.js se carga por su ruta (los obreros no usan el mapa de
// importaciones).
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import { generarDatosTelarana, parteFilamentos, parteSegunda, parteMenores, transferibles } from './telaranaDatos.js';

const PARTES = { filamentos: parteFilamentos, segunda: parteSegunda, menores: parteMenores };

self.onmessage = async ({ data }) => {
  // Latido en cada pausa del cálculo: el hilo principal sabe que sigue vivo (iOS puede cerrarlo sin avisar si falta memoria).
  const latido = async () => self.postMessage({ latido: true });
  try {
    let datos;
    if (data?.puertos) {
      // Cada otro obrero manda como mucho un mensaje a este: se espera desde ya (no se pierde aunque llegue pronto).
      const llegadas = Object.fromEntries(Object.entries(data.puertos).map(([otra, p]) => [otra, new Promise(r => { p.onmessage = e => r(e.data); })]));
      const canal = { enviar: (a, m, tr) => data.puertos[a].postMessage(m, tr), recibir: de => llegadas[de] };
      datos = await PARTES[data.parte](THREE, latido, canal);
    } else datos = await generarDatosTelarana(THREE, latido);
    self.postMessage({ datos }, transferibles(datos));
  }
  catch (error) { self.postMessage({ error: String(error) }); }
};
