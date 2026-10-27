// Diagnóstico solo a petición: con #debug (las pruebas automáticas) o ?diag (en un aparato de verdad). Sin eso, la página no
// publica nada en window.__*, no informa al servidor (__diagnostico3d) ni escribe atributos que cambian en cada cuadro.
export const conDiagnostico = typeof location !== 'undefined' && (location.hash === '#debug' || new URLSearchParams(location.search).has('diag'));
