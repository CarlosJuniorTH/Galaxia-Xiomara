// Cielo de fondo (fondo óptico, a distancia infinita): velo de nebulosidad tenue y polvo estelar.
// La banda de la Vía Láctea ya no se hornea aquí (uBanda = 0): la Vía Láctea es una galaxia 3D
// persistente con centro en Sagitario A* (viaLactea.js); desde dentro de su disco su propia
// distribución de estrellas dibuja la banda, y desde fuera se ve como una galaxia.
// Se "hornea" una sola vez en un cubemap, así no cuesta nada en cada cuadro (ideal para celulares).
import * as THREE from 'three';
import { Q } from '../util/dispositivo.js';
import { direccionCielo } from './cosmos.js';

const vertex = /* glsl */`
  varying vec3 vDir;
  void main(){
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const fragment = /* glsl */`
  precision highp float;
  varying vec3 vDir;
  uniform float uSemilla, uBanda; uniform vec3 uPolo, uCentroG;

  float hash(vec3 p){
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float ruido(vec3 x){
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 7; i++){ v += a * ruido(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
    return v;
  }

  void main(){
    vec3 d = normalize(vDir);
    vec3 s = vec3(uSemilla);

    // Deformación del espacio para formas de nube más orgánicas
    vec3 q = vec3(fbm(d * 2.2 + s), fbm(d * 2.2 + s + 5.2), fbm(d * 2.2 + s + 9.7));
    float n1 = fbm(d * 2.6 + q * 1.8 + s);
    float n2 = fbm(d * 5.0 + q * 2.4 + s * 2.0);
    float n3 = fbm(d * 11.0 + q + 3.0);

    vec3 rosa   = vec3(1.00, 0.22, 0.55);
    vec3 magenta= vec3(0.85, 0.10, 0.65);
    vec3 lila   = vec3(0.50, 0.18, 0.95);
    vec3 azul   = vec3(0.15, 0.30, 0.95);
    vec3 calido = vec3(1.00, 0.72, 0.60);

    // Nebulosas
    float neb = smoothstep(0.42, 0.88, n2) * smoothstep(0.30, 0.65, n1);
    vec3 cn = mix(lila, rosa, smoothstep(0.35, 0.7, q.x));
    cn = mix(cn, azul, smoothstep(0.5, 0.75, q.y) * 0.75);
    cn = mix(cn, magenta, smoothstep(0.55, 0.8, q.z) * 0.6);
    // Sin velo de colores: el fondo es negro y las nebulosas están en el cielo profundo (cieloProfundo.js),
    // localizadas como en las fotos. Aquí solo quedan las estrellas finas.
    vec3 c = cn * neb * 0.0;
    // Zonas más brillantes dentro de la nebulosa
    c += mix(rosa, calido, 0.4) * pow(smoothstep(0.62, 0.95, n2), 2.0) * smoothstep(0.45, 0.7, n1) * 0.0;
    // Velo tenue que llena el cielo


    // Vía Láctea como en las fotos de cielo profundo: una banda de millones de estrellas que
    // rodea todo el cielo, más ancha y dorada hacia el centro galáctico (donde está
    // Sagitario A*), con nubes estelares, la Gran Grieta de polvo oscuro que la parte en dos,
    // filamentos de polvo y nudos rosados de hidrógeno.
    float lat = dot(d, uPolo);
    vec3 enPlano = normalize(d - uPolo * lat);
    float lon = acos(clamp(dot(enPlano, uCentroG), -1.0, 1.0));            // 0 en el centro galáctico
    float lonA = atan(dot(enPlano, cross(uPolo, uCentroG)), dot(enPlano, uCentroG));
    // Coordenadas galácticas: el ruido se estira a lo largo de la banda (nubes y filamentos alargados).
    vec3 gal = vec3(cos(lonA) * 4.0, sin(lonA) * 4.0, lat * 11.0);
    float bulbo = exp(-lon * lon * 1.6);
    float ancho = 0.07 + 0.09 * bulbo + 0.02 * (fbm(d * 3.0 + 4.0) - 0.5);
    float ondula = (fbm(d * 2.4 + 11.0) - 0.5) * 0.05;
    float l2 = (lat + ondula) / ancho;
    float banda = exp(-l2 * l2);
    // Nubes de estrellas a varias escalas (como las del Escudo y Sagitario) y grano de estrellas
    // sin resolver: la banda no es un degradado, es un enjambre.
    float grande = fbm(gal * 1.3 + q * 0.4), media = fbm(d * 9.0 + 5.0), fina = fbm(d * 24.0 + 3.0), grano = ruido(d * 160.0) * 0.6 + ruido(d * 330.0 + 2.0) * 0.4;
    float nubes = pow(smoothstep(0.3, 0.85, grande * 0.6 + media * 0.4), 1.4) * 0.8 + smoothstep(0.5, 0.9, fina) * 0.45;
    nubes = pow(nubes, 1.35) * (0.8 + 0.4 * grano);   // más contraste: huecos oscuros entre nubes
    // Grandes nubes estelares brillantes cerca del centro, a ambos lados de la grieta.
    float nubeEstelar = exp(-pow((lonA - 0.42) / 0.16, 2.0) - pow((lat + 0.03) / 0.05, 2.0)) + exp(-pow((lonA + 0.5) / 0.2, 2.0) - pow((lat - 0.02) / 0.045, 2.0)) * 0.7;
    nubes += nubeEstelar * (0.6 + 0.5 * fina);
    // Polvo oscuro: la Gran Grieta, filamentos finos (crestas de ruido) y nebulosas oscuras sueltas
    // como el Saco de Carbón.
    float grieta = smoothstep(0.42, 0.62, fbm(gal * 1.6 + vec3(2.0, 7.0, 1.0)) * 0.65 + fbm(d * 8.0 + 2.0) * 0.35) * exp(-pow((lat + ondula * 0.6 + 0.012) / (ancho * 0.3), 2.0));
    float cresta = 1.0 - abs(fbm(gal * 2.6 + q * 1.3) * 2.0 - 1.0), cresta2 = 1.0 - abs(fbm(d * 30.0 + q * 3.0) * 2.0 - 1.0);
    float filamentos = (smoothstep(0.7, 0.95, cresta) * 0.6 + smoothstep(0.75, 0.97, cresta2) * 0.22 * smoothstep(0.4, 0.7, grande)) * exp(-l2 * l2 * 0.6);
    float saco = 1.0 - smoothstep(0.0, 0.1, length(vec2(lonA - 2.3, (lat + 0.05) * 1.6)) - 0.05) + 1.0 - smoothstep(0.0, 0.08, length(vec2(lonA + 1.5, (lat + 0.08) * 1.3)) - 0.03);
    float polvoMW = clamp(grieta * (0.55 + 0.4 * bulbo) + filamentos * 0.55 + saco * 0.8 * (0.7 + 0.3 * fina), 0.0, 0.85);
    vec3 dorado = vec3(1.0, 0.8, 0.55), azulado = vec3(0.7, 0.78, 1.0);
    vec3 cmw = mix(azulado, dorado, bulbo * 0.85 + 0.15);
    // Junto al polvo la luz se enrojece (las estrellas se ven a través del polvo).
    float borde = smoothstep(0.05, 0.35, polvoMW) * (1.0 - smoothstep(0.35, 0.75, polvoMW));
    cmw = mix(cmw, vec3(1.0, 0.66, 0.45), borde * 0.3);
    cmw = mix(cmw, vec3(0.92, 0.94, 1.0), smoothstep(0.5, 0.95, nubes) * 0.35);   // nubes de estrellas blanco-azuladas
    float luzMW = banda * (0.1 + 0.95 * nubes) * (0.35 + 0.65 * bulbo) + exp(-pow(lat / (ancho * 2.6), 2.0)) * 0.07 * (0.8 + 0.4 * media);
    luzMW += exp(-lon * lon * 9.0 - lat * lat * 140.0) * 1.1 + exp(-lon * lon * 3.0 - lat * lat * 40.0) * 0.35;   // núcleo galáctico
    vec3 vMW = cmw * luzMW * (1.0 - polvoMW);
    // Nudos rosados de hidrógeno (como la Laguna o Carina) con un halo azul de polvo reflejado.
    float hii = pow(smoothstep(0.7, 0.9, fbm(d * 22.0 + 9.0)), 2.0) * banda * (1.0 - polvoMW);
    float laguna = exp(-pow((lonA - 0.12) / 0.035, 2.0) - pow((lat + 0.025) / 0.022, 2.0)) * (0.6 + 0.6 * fina) + exp(-pow((lonA - 1.35) / 0.05, 2.0) - pow((lat - 0.01) / 0.03, 2.0)) * (0.5 + 0.7 * media);
    vMW += vec3(1.0, 0.35, 0.5) * (hii * 0.35 + laguna * 0.55) + vec3(0.45, 0.6, 1.0) * smoothstep(0.55, 0.85, fina) * banda * (1.0 - polvoMW) * 0.08;
    c = c * (1.0 - polvoMW * banda * 0.7 * uBanda) + vMW * 0.32 * uBanda;
    float banda2 = banda * uBanda;

    // Polvo estelar fino (millones de estrellas lejanas), mucho más denso en la Vía Láctea
    float e = hash(floor(d * 1400.0));
    float densidad = 0.9975 - banda2 * (0.014 + bulbo * 0.012 + nubeEstelar * 0.01) * (1.0 - polvoMW) - neb * 0.002;
    c += step(densidad, e) * mix(vec3(0.75, 0.7, 0.85), cmw, banda2 * 0.6) * (0.35 + 0.9 * fract(e * 91.7));
    float e2 = hash(floor(d * 700.0) + 3.0);
    c += step(0.9993 - banda2 * 0.002, e2) * vec3(1.0, 0.97, 0.95) * 0.9 * (1.0 - polvoMW * 0.7);

    // Fondo muy oscuro con un toque violeta
    c += vec3(0.002, 0.001, 0.004);

    // Tramado para evitar bandas de color en degradados oscuros
    c += (hash(d * 4000.0 + 7.0) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
  }`;

export function crearCielo({ renderer, scene }) {
  const rt = new THREE.WebGLCubeRenderTarget(Q.cielo, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
  });
  const escenaCielo = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment,
    // Plano galáctico: pasa por Sagitario A* (centro galáctico) y cruza en diagonal el cielo de arriba.
    uniforms: (() => { const centro = direccionCielo(72, -5, 1), otro = direccionCielo(-60, 34, 1);   // el centro galáctico es Sagitario A*
      return { uSemilla: { value: 3.7 }, uBanda: { value: 0 }, uCentroG: { value: centro }, uPolo: { value: new THREE.Vector3().crossVectors(centro, otro).normalize() } }; })(),
    side: THREE.BackSide, depthWrite: false
  });
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(100, 64, 32), mat);
  escenaCielo.add(esfera);
  const cubo = new THREE.CubeCamera(1, 1000, rt);
  cubo.update(renderer, escenaCielo);
  esfera.geometry.dispose(); mat.dispose();

  scene.background = rt.texture;
  scene.backgroundIntensity = 0.5;   // cielo profundo y oscuro: así la galaxia resalta
  return { actualizar() {} };
}
