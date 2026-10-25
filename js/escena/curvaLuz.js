// Piezas comunes de TON 618 y Sagitario A* (js/escena/ton618.js, js/escena/sagitario.js): la luz hecha de motas nítidas
// (sin halos ni degradados) y la lente gravitatoria aplicada a cada mota en la GPU.
import * as THREE from 'three';

// Lente de un agujero negro en el origen del objeto (ecuación de la lente puntual, como en la relatividad general): una
// mota que queda DETRÁS del agujero no se ve donde está, sino en dos imágenes, una por fuera del anillo de fotones (la
// principal, por el mismo lado) y otra muy pegada a la sombra por el lado opuesto (la secundaria). Así el disco que queda
// detrás asoma curvado por encima y por debajo de la sombra, como en las simulaciones reales. Lo que está delante se ve tal
// cual. Cada mota se dibuja tres veces (instancias: 0 directa, 1 principal, 2 secundaria); w = brillo (0: no se ve).
// Radio de Schwarzschild: la sombra mide 2,6 radios (√27/2). Todo en el espacio de la vista (cámara en el origen).
export const GLSL_LENTE = /* glsl */`
  uniform float uSombra;    // radio de la sombra en unidades de la vista
  vec4 imagenLente(vec3 p, float imagen){
    vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float D = length(c); vec3 eje = c / D;
    float dp = dot(p, eje), z = dp - D;
    if (imagen < 0.5) return vec4(p, z <= 0.0 ? 1.0 : 0.0);
    if (z <= 0.0 || dp <= 0.0) return vec4(p, 0.0);
    vec3 q = p * (D / dp) - c; float beta = length(q);
    vec3 dir = beta > D * 1e-7 ? q / beta : vec3(0.0, 1.0, 0.0);
    float rE2 = 2.0 * (uSombra / 2.6) * z * D / dp, rE = sqrt(rE2), raiz = sqrt(beta * beta + 4.0 * rE2);
    float b = imagen < 1.5 ? 0.5 * (beta + raiz) : 0.5 * (beta - raiz);
    float u = beta / max(rE, 1e-6), mu = (u * u + 2.0) / (2.0 * max(u, 1e-3) * sqrt(u * u + 4.0)) + (imagen < 1.5 ? 0.5 : -0.5);
    // Por dentro de la sombra la luz cae al agujero: no hay imagen.
    float fuera = smoothstep(1.0, 1.04, abs(b) / uSombra);
    return vec4(c + dir * b, min(abs(mu), 3.0) * fuera);
  }`;

// Tamaño en píxeles de una mota de «tam» unidades de diámetro (como un sprite del mismo tamaño, FOV 60°) y su luz: por
// debajo de 2 px se reparte en 2×2 con la misma energía (no parpadea al moverse).
export const GLSL_TAMANO = /* glsl */`
  uniform float uScale, uPR, uMaximo;
  float tamanoMota(float tam, float prof, out float luz){
    float px = tam * uScale / (max(prof, 0.1) * 0.57735);
    luz = min(px * px * 0.25, 1.0);
    return clamp(px, 2.0, max(2.0, uMaximo * uPR));
  }`;

// Una mota: núcleo nítido y borde que cae dentro de su propio punto (2–4 px), sin halo alrededor.
export const GLSL_MOTA = /* glsl */`
  varying vec3 vC; varying float vA;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = pow(max(1.0 - d * 2.0, 0.0), 1.5), nucleo = 1.0 - smoothstep(0.0, 0.2, d);
    gl_FragColor = vec4(vC * (a + nucleo * 0.7) * vA, a * vA);
  }`;

// Fuera de la vista (instancia o mota que no se ve).
export const GLSL_OCULTA = 'gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vC = vec3(0.0); vA = 0.0; return;';

// Geometría de motas con sus imágenes de la lente: las motas son los vértices y cada imagen una instancia (aImagen);
// instanceCount = 1 dibuja solo la directa (de lejos la lente no se distingue). La esfera envolvente es la del objeto
// (las posiciones se calculan en la GPU): así three.js la descarta cuando no está en pantalla.
export function geometriaMotas(atributos, radioEnvolvente, { lente = true } = {}) {
  const g = new THREE.InstancedBufferGeometry();
  for (const [nombre, [datos, n]] of Object.entries(atributos)) g.setAttribute(nombre, new THREE.BufferAttribute(datos, n));
  g.setAttribute('aImagen', new THREE.InstancedBufferAttribute(new Float32Array(lente ? [0, 1, 2] : [0]), 1));
  g.instanceCount = lente ? 3 : 1;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radioEnvolvente);
  g.boundingBox = new THREE.Box3(new THREE.Vector3(-1, -1, -1).multiplyScalar(radioEnvolvente), new THREE.Vector3(1, 1, 1).multiplyScalar(radioEnvolvente));
  return g;
}

export const materialMotas = (uniforms, vertexShader, extra = {}) => new THREE.ShaderMaterial({
  uniforms, vertexShader, fragmentShader: GLSL_MOTA, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, ...extra
});

// Anillo de fotones: una línea finísima pegada a la sombra (1–1,5 px a cualquier resolución, con el borde suavizado en su
// último píxel), más brillante por el lado del disco que viene hacia nosotros (uLado) y una segunda, más tenue, por
// dentro. Mira siempre a la cámara. uLuz: brillo (la escena lo aviva).
export function crearAnilloFotones(R, colores) {
  const malla = new THREE.Mesh(new THREE.RingGeometry(R * 0.97, R * 1.16, 384, 1), new THREE.ShaderMaterial({
    uniforms: { uR: { value: R }, uLuz: { value: 1 }, uLado: { value: new THREE.Vector2(1, 0) }, uA: { value: new THREE.Color(colores[0]) }, uB: { value: new THREE.Color(colores[1]) } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`uniform float uR, uLuz; uniform vec2 uLado; uniform vec3 uA, uB; varying vec2 vP;
      float linea(float r, float centro, float ancho){ float w = fwidth(r); return 1.0 - smoothstep(ancho * w, (ancho + 1.0) * w, abs(r - centro)); }
      void main(){
        float r = length(vP) / uR, lado = dot(vP / max(length(vP), 1e-4), uLado);
        float doppler = 0.45 + 0.55 * pow(0.5 + 0.5 * lado, 1.6);
        float l = linea(r, 1.035, 0.5) * doppler + linea(r, 1.012, 0.2) * 0.35 * (0.6 + 0.4 * doppler);
        vec3 c = mix(uB, uA, doppler);
        gl_FragColor = vec4(c * l * uLuz, l * min(1.0, uLuz)); }`,
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  }));
  return malla;
}
