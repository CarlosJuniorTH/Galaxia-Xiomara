// Escalón suave (el smoothstep de GLSL: 0 antes de a, 1 después de b y una curva s entre medias), uno solo para todo el
// código (antes había once copias con el orden de argumentos de cada archivo). Mismo resultado, número a número, que las
// copias a las que sustituye (tests/suave.test.js), también con a > b (bajadas), a = b, infinitos y NaN.
// suave(a, b, x): el orden de GLSL.
export const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// suaveEn(x, a, b): lo mismo con el valor primero (los guiones de los videoclips).
export const suaveEn = (x, a, b) => suave(a, b, x);
// suaveEnSeguro(x, a, b): con el tramo nunca menor que 1e-6 (a = b no divide por cero; ojo, con a > b no es una bajada:
// sale 0 o 1 según el lado, como en las escenas de los gigantes, que siempre lo usan con a < b).
export const suaveEnSeguro = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / Math.max(1e-6, b - a))); return t * t * (3 - 2 * t); };
