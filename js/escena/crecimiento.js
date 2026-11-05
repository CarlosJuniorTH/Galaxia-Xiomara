// La galaxia crece con el tiempo: cada mes juntos es un poco más grande, toda ella a la vez (gas, estrellas, brazos, polvo) con
// la misma escala en su grupo. Nada de motas añadidas por fuera: así no puede haber costura ni tiras que no concuerden, y no
// cuesta ni un dibujo. Empieza a contar desde el mes 10 (como se ve hoy) y se va frenando: siempre cabe dentro de su anillo.
const DESDE_MES = 10, POR_MES = 0.03, MAXIMA = 1.36;
export const escalaGalaxia = meses => Math.min(MAXIMA, 1 + Math.max(0, meses - DESDE_MES) * POR_MES);
