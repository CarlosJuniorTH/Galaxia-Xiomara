import { avanceLogaritmico, duracionViaje } from '../util/aproximacion.js';
import { sembrarAzar, semillaDe, SEMILLA_UNIVERSO, ceder } from '../util/azarSemilla.js';
import { conFocoSupernova } from './focoSupernova.js';
import * as THREE from 'three';
import { crearNucleo, BRILLO_BASE } from './nucleo.js';
import { crearCielo } from './cielo.js';
import { crearEstrellas } from './estrellas.js';
import { crearGalaxiasLejanas } from './galaxiasLejanas.js';
import { crearViaLactea } from './viaLactea.js';
import { crearGalaxia, enBrazo } from './galaxia.js';
import { crearSolar } from './solar.js';
import { texBrillo, texDestello, texTexto, texEstrellaGigante } from './texturas.js';
import { crearAgujeroNegro } from './agujeroNegro.js';
import { crearCorazon } from './corazon.js';
import { crearNombre } from './nombre.js';
import { crearFrases } from './frases.js';
import { crearPlanetas, CENTRO_GIGANTE, RADIO_GIGANTE, OTROS_PLANETAS } from './planetas.js';
import { crearEstrellasSecretas } from './estrellasSecretas.js';
import { crearAmor } from './amor.js';
import { crearMundos } from './mundos.js';
import { crearCosmos, ESCALA_CIELO, ESCALA_FONDO } from './cosmos.js';
import { crearVelocidad } from './velocidad.js';
import { crearUniversoLocal } from './universoLocal.js';
import { EXPOSICION } from './exposicion.js';
import { crearTelaranaCosmica, pedirDatosTelarana } from './telarana.js';
import { crearCieloProfundo } from './cieloProfundo.js';
import { crearPreparacion } from './carga/preparacion.js';
import { crearGestorCalidad } from './calidad/gestor.js';
import { crearRutas } from './camara/rutas.js';
import { crearMaravillas } from './maravillas.js';
import { crearPolvo } from './polvo.js';
import { texturasListas, texturasTodas } from './fabricaTexturas.js';
import { DESTINOS, LEJANOS } from '../data/universo.js';
import { encuadreHogar, escalaSimbolos, desplazamientoZonaLibre, compensacionPuntos, distanciaDestino, correccionAlLlegar, cambioInterfazApreciable } from '../util/encuadre.js';
import { esMovil } from '../util/dispositivo.js';
import { crearPlanificador } from '../util/planificador.js';
import { MUESTRAS as muestrasNube } from './nube.js';
import { crearGiro } from '../util/giro.js';
import { crearZoom } from '../util/zoom.js';
import { crearCapaVolumen } from './capaVolumen.js';
import { nivelSeguro } from '../util/dispositivo.js';
import { esquivar, sinRepetidos } from '../util/ruta.js';
import { planificarVuelo, DURACION } from '../util/vuelo.js';
import { aMal, SEMIEJES_CORAZON, ESCALA_SUPERNOVA, PROGENITORA_RELATIVA, LLEGADA_GIGANTE } from '../data/escalaCosmica.js';
const RADIO_ESTRELLA = 110 * ESCALA_SUPERNOVA * PROGENITORA_RELATIVA;
import { resolucionPostal, crearCapturador } from '../util/captura.js';
import { vista } from '../util/vista.js';

const OBJETIVO = new THREE.Vector3(0, 70, 0);
// Figuras más pequeñas que la media para su distancia base (el planeta azul mide la mitad):
// en pantallas estrechas la cámara se acerca más para que se vean con el mismo protagonismo.
const TAMANO_FIGURA = { azul: 0.7, rosa: 1.4 };
const suave = k => k * k * k * (k * (k * 6 - 15) + 10);
// Avance de un viaje: primero casi quieto (mientras la mirada se vuelve hacia el destino),
// acelera entre el 10 y el 30 %, navega y frena despacio en la segunda mitad hasta cero.
// Integrado una vez en una tabla.
// Tabla de avance (fracción del recorrido según la del tiempo) a partir de una velocidad relativa v(k).
const tablaAvance = v => {
  const n = 400, tabla = new Float32Array(n + 1); let suma = 0;
  for (let i = 1; i <= n; i++) { suma += v((i - 0.5) / n); tabla[i] = suma; }
  for (let i = 0; i <= n; i++) tabla[i] /= suma;
  return k => { const x = Math.min(1, Math.max(0, k)) * n, i = Math.floor(x); return i >= n ? 1 : tabla[i] + (tabla[i + 1] - tabla[i]) * (x - i); };
};
const ss = THREE.MathUtils.smootherstep;
// Desde parado (antes arrancaba de golpe al 4 %) y sin cambios bruscos de aceleración.
const PERFIL = tablaAvance(k => (0.04 * ss(k, 0, 0.06) + 0.96 * ss(k, 0.1, 0.3)) * (1 - ss(k, 0.55, 1)));
// Paso al sistema solar (o fuera de él), como un salto a la velocidad de la luz: hasta el corte la cámara se LANZA
// acelerando (llega al corte a toda velocidad, sin frenar) y al otro lado aparece aún lanzada y frena hasta el lugar.
// Antes se paraba en el brazo de la galaxia y arrancaba de nuevo tras el corte.
const AVANCE = { lanzarse: tablaAvance(k => ss(k, 0, 0.8)), aterrizar: tablaAvance(k => 1 - ss(k, 0.12, 1)) };
const v3 = a => new THREE.Vector3(...a);
const EJE_Y = new THREE.Vector3(0, 1, 0);
export async function crearEscena(canvas, { config, cantidadSecretas, encontradas, fechaTexto, consteladas, alConstelar, alViajar = () => {}, alProblema = () => {}, alProgreso = () => {} }) {
  // Progreso de la carga (0–1) con el nombre de la etapa: la portada lo muestra como una barra.
  // Progreso de la carga: cada paso informa de dónde está (f) y hasta dónde llegará al terminar (techo); la barra
  // avanza despacio hacia el techo mientras el paso trabaja. Cada capa pesa lo que tarda de verdad (ms medidos en
  // un móvil modesto), así el porcentaje avanza al ritmo real y no se queda parado en las capas grandes.
  const avance = (f, techo = f) => alProgreso(Math.max(0, Math.min(1, f)), Math.max(0, Math.min(1, techo)));
  const PESO_CAPA = { mundos: 110, galaxia: 250, cosmos: 630, galaxiasLejanas: 2000, telarana: 2950, maravillas: 700, universoLocal: 100, viaLactea: 100 };
  const CAPAS = ['mundos', 'galaxia', 'cosmos', 'galaxiasLejanas', 'cieloProfundo', 'telarana', 'maravillas', 'universoLocal', 'viaLactea', 'amor', 'agujeroNegro', 'corazon', 'nombre', 'frases', 'estrellas', 'secretas', 'polvo'];
  const pesoCapa = n => PESO_CAPA[n] ?? 15, PESO_TOTAL = CAPAS.reduce((a, n) => a + pesoCapa(n), 0);
  let pesoHecho = 0; const enCapas = ms => 0.05 + 0.45 * Math.min(1, ms / PESO_TOTAL);   // las capas: del 5 % al 50 %
  const empiezaCapa = n => { window.__pasoCarga = 'capa ' + n; avance(enCapas(pesoHecho), enCapas(pesoHecho + pesoCapa(n))); };
  const terminaCapa = n => { pesoHecho += pesoCapa(n); avance(enCapas(pesoHecho)); };
  avance(0, 0.05);
  // Todo el universo se construye con la misma semilla: el mapa no cambia entre cargas.
  const restaurarAzar = sembrarAzar(SEMILLA_UNIVERSO);
  // La construcción se reparte en pasos: entre capa y capa se cede el control al navegador para que la portada siga
  // animándose (sin congelarse). Durante la pausa Math.random vuelve a ser el libre y después se retoma el generador
  // del universo exactamente donde estaba: el mapa sigue siendo el mismo en cada carga.
  // Capas que se construyen en varios pasos (ceden el control por dentro).
  const capaPorPasos = async (nombre, crear) => {
    empiezaCapa(nombre);
    const restaurar = sembrarAzar(semillaDe(nombre)), antes = new Set(scene.children), t0 = performance.now();
    let resultado; try { resultado = await crear(); } finally { restaurar(); }
    tiemposCapas[nombre] = Math.round(performance.now() - t0);
    for (const o of scene.children) if (!antes.has(o)) o.userData.capa = nombre;
    terminaCapa(nombre);
    return resultado;
  };
  // La telaraña cósmica se calcula desde ya en otro núcleo (Web Worker), en paralelo con todo lo demás.
  const datosTelarana = pedirDatosTelarana();
  const nucleo = crearNucleo(canvas);
  const { renderer, scene, camera, controls, composer, bloom } = nucleo;
  // Cada objeto añadido a la escena recuerda su capa: permite aislarlas en el diagnóstico.
  // Cada capa tiene su propia semilla (derivada de su nombre): lo que una capa genere de más o de
  // menos en un dispositivo no desplaza el mapa de las demás. El universo es el mismo en PC y móvil.
  const tiemposCapas = {}; window.__tiemposCapas = tiemposCapas;   // cuánto tarda en crearse cada capa (diagnóstico)
  const capa = (nombre, crear) => {
    empiezaCapa(nombre);
    const restaurar = sembrarAzar(semillaDe(nombre)), antes = new Set(scene.children);
    const t0 = performance.now(); let resultado; try { resultado = crear(); } finally { restaurar(); }
    tiemposCapas[nombre] = Math.round(performance.now() - t0);
    for (const o of scene.children) if (!antes.has(o)) o.userData.capa = nombre;
    terminaCapa(nombre);
    return resultado;
  };
  // Nuestro sistema solar, dentro de un brazo de la galaxia: una escena aparte con el Sol en el
  // centro. La Tierra, el planeta rosa, la luna del correo y el gigante viven allí; se llega
  // lanzándose a la velocidad de la luz hacia ese punto del brazo (entrarOSalir).
  const SOLARES = new Set(['rosa', 'azul', 'cartas', 'gigante']);
  const brazoInicial = enBrazo(1, 0.62, 0);
  const solar = crearSolar({ haciaCentroGalactico: new THREE.Vector3(-brazoInicial.x, 0, -brazoInicial.z), renderer, uPR: nucleo.uPR });
  const planetas = crearPlanetas({ ...nucleo, scene: solar.escena }, fechaTexto);
  await ceder();
  const mundos = capa('mundos', () => crearMundos(nucleo, { consteladas, alConstelar }));
  for (const id of SOLARES) if (mundos.grupos.get(id)) solar.escena.add(mundos.grupos.get(id));
  await ceder();
  // Escala de los puntos de la galaxia de casa: la de siempre, salvo con el teleobjetivo de «Mirar hacia casa», que la
  // amplía como al resto de la imagen (si no, sus estrellas, calculadas para la vista normal, eran miles de veces pequeñas).
  const uScaleCasa = { value: nucleo.uScale.value };
  const nucleoCasa = { scene: nucleo.scene, renderer: nucleo.renderer, camera: nucleo.camera, uScale: uScaleCasa, uPR: nucleo.uPR, uTamGalaxia: nucleo.uTamGalaxia };   // para todo lo de casa
  const galaxia = capa('galaxia', () => crearGalaxia(nucleoCasa));
  await ceder();
  const cosmos = capa('cosmos', () => { const c = crearCosmos(nucleo); nucleo.scene.add(c.raiz, c.decor); return c; });
  await ceder();
  const lejanas = await capaPorPasos('galaxiasLejanas', () => crearGalaxiasLejanas(nucleo));
  // El cielo del «más allá»: otro universo lleno de vida detrás de todo, lejos de casa.
  await ceder();
  const cieloProfundo = capa('cieloProfundo', () => crearCieloProfundo(nucleo));
  // La telaraña cósmica: filamentos y cúmulos de galaxias por todo el universo (se ve desde cualquier destino).
  await ceder();
  const telarana = await capaPorPasos('telarana', async () => crearTelaranaCosmica(nucleo, await datosTelarana));
  telarana.fijarGigantes(cosmos.cuerpos().filter(c => c.id !== 'xiomara').map(c => ({ centro: c.centro, radio: c.visible })));
  // Maravillas: rincones impresionantes (el Ojo, la enana de las burbujas, la espiral de hebras, la nube de fuego).
  await ceder();
  const maravillas = capa('maravillas', () => crearMaravillas({ ...nucleo, texBrillo: texBrillo(), centros: Object.fromEntries(['supernova', 'cuasar', 'ton618'].map(id => [id, cosmos.cuerpos().find(c => c.id === id).centro])) }));
  // El cielo propio de cada gigante (estrellas, velo de color y constelaciones): se enciende al llegar.
  await ceder();
  const universoLocal = capa('universoLocal', () => crearUniversoLocal({ ...nucleo, centros: Object.fromEntries(['supernova', 'cuasar', 'ton618', 'pulsar', 'sagitario', 'deneb'].map(id => [id, (cosmos.cuerpos().find(c => c.id === id)?.centro) ?? cosmos.objetivo(id).centro])) }));
  await ceder();
  const partes = [
    crearCielo(nucleo),
    lejanas,
    universoLocal,
    telarana,
    maravillas,
    capa('viaLactea', () => { const v = crearViaLactea(nucleo); return { ...v, actualizar: (t, dt, ctx) => v.actualizar(ctx.camera) }; }),
    cosmos,
    galaxia,
    capa('amor', () => crearAmor(nucleoCasa)),
    capa('agujeroNegro', () => crearAgujeroNegro(nucleo)),
    capa('corazon', () => crearCorazon(nucleoCasa)),
    capa('nombre', () => crearNombre(nucleoCasa, config.nombre)),
    capa('frases', () => crearFrases(nucleo, config.frases))
  ];
  await ceder();
  const estrellas = capa('estrellas', () => crearEstrellas(nucleo));
  let secretas = capa('secretas', () => crearEstrellasSecretas(nucleoCasa, cantidadSecretas, encontradas));
  const polvo = capa('polvo', () => crearPolvo(nucleo));
  partes.push(estrellas, secretas, mundos, polvo);
  // Marca del sistema solar en su brazo: una lucecita dorada que late (al tocarla se viaja allí).
  const marcaSolar = new THREE.Group(); scene.add(marcaSolar);
  const brilloMarca = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo(), color: '#ffd9a0', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  const destelloMarca = new THREE.Sprite(new THREE.SpriteMaterial({ map: texDestello(), color: '#fff1d8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const nombreMarca = new THREE.Sprite(new THREE.SpriteMaterial({ map: texTexto('Nuestro sistema solar', { fuente: "600 64px 'Quicksand', sans-serif" }), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  brilloMarca.scale.setScalar(70); destelloMarca.scale.setScalar(46); nombreMarca.scale.set(190, 30, 1); nombreMarca.position.y = 46;
  marcaSolar.add(brilloMarca, destelloMarca, nombreMarca);
  // La misma galaxia 3D a cualquier distancia: sin otra espiral ni tamaño artificial.
  marcaSolar.userData.capa = 'marcaSolar';
  // Luz no resuelta del corazón de la supernova: a 100 millones de años luz ocupa unos pocos píxeles y
  // el volumen apenas se dibuja; su luz (rosada, ∝ área, con la misma compresión perceptiva que las
  // galaxias lejanas) se funde con él al crecer. Es el mismo objeto, en su centro.
  const uLuzCorazon = { value: 0 };
  const luzCorazon = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3)), new THREE.ShaderMaterial({ uniforms: { uLuz: uLuzCorazon, uPR: nucleo.uPR },
    vertexShader: 'uniform float uPR; void main(){ gl_PointSize = 4.0 * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uLuz; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = pow(1.0 - d * 2.0, 1.6) * uLuz; gl_FragColor = vec4(vec3(1.0, 0.56, 0.76) * a, a); }',
    transparent: true, premultipliedAlpha: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  luzCorazon.frustumCulled = false; luzCorazon.renderOrder = -2; luzCorazon.userData.capa = 'cosmos'; scene.add(luzCorazon);
  // Faro de la supergigante: antes de estallar, desde casa y durante el viaje la estrella brilla como
  // un gran lucero rosado con sus destellos (unos 3,5° de cielo); al acercarse, su brillo se recoge y
  // queda la estrella de verdad.
  const faroEstrella = new THREE.Group(); faroEstrella.userData.capa = 'faroEstrella'; scene.add(faroEstrella);
  const faroRayos = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEstrellaGigante(), color: '#ffc2b0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const faroHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo(), color: '#ff7a8f', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  faroRayos.renderOrder = faroHalo.renderOrder = -2; faroEstrella.add(faroHalo, faroRayos);
  let escenaActiva = 'principal', solarPreparado = false;
  function cambiarEscena(cual) {
    const destino = cual === 'solar' ? solar.escena : scene;
    for (const o of cieloLejano) destino.add(o);
    destino.add(camera);   // las estelas de la luz viajan con la cámara
    nucleo.fijarEscena(destino); escenaActiva = cual;
  }
  const destellar = () => campoVelocidad.impulsar();
  camera.position.set(-2600, 3700, 4900); controls.target.copy(OBJETIVO); camera.lookAt(OBJETIVO);

  // Jerarquía visual: al visitar un lugar, el fondo (cielo, galaxias, la galaxia central y
  // sus símbolos) pierde protagonismo bajo un velo oscuro; el lugar se dibuja después,
  // con todo su brillo. El fondo se dibuja antes que el velo (orden −10 relativo a su
  // orden propio) y los lugares, después.
  const CAPAS_FONDO = new Set(['galaxiasLejanas', 'viaLactea', 'cosmos', 'galaxia', 'amor', 'agujeroNegro', 'corazon', 'nombre', 'frases', 'emojis', 'estrellas']);
  for (const o of scene.children) if (CAPAS_FONDO.has(o.userData.capa)) o.traverse(h => { h.renderOrder -= 10; });
  // La luz de un sol con posición real (Deneb) se dibuja después de las nebulosas remotas, que
  // están más lejos: su brillo pasa por delante de ellas. Solo los soles con posición real (Deneb) están más cerca que las nebulosas remotas; los del
  // fondo óptico (acompañan a la cámara, «infinitamente» lejos) quedan detrás y no se adelantan.
  for (const g of cosmos.soles) if (g.parent === cosmos.raiz) g.traverse(o => { if (o.material?.transparent) o.renderOrder = -12.5; });
  // El cielo profundo (estrellas, galaxias lejanas, nebulosas, soles gigantes, agujeros) está
  // tan lejos que nunca se acerca ni cambia de sitio al moverse: acompaña a la cámara, como el
  // cielo de verdad. Así se siente la distancia y nada se puede alcanzar ni solapar.
  const CAPAS_CIELO = new Set(['estrellas', 'galaxiasLejanas', 'viaLactea', 'cosmos']);
  const cieloLejano = scene.children.filter(o => CAPAS_CIELO.has(o.userData.capa));
  // Lo que tiene coordenadas reales (profundo: nebulosas, galaxias con nombre) no se escala ni
  // acompaña a la cámara; el resto del fondo es infinito y la acompaña.
  // Los soles, enanas rojas y cometas de nuestro cielo (decor) son fondo: muy por detrás de todo.
  for (const o of cieloLejano) { o.userData.escalaBase = o.userData.profundo ? 1 : o === cosmos.decor ? 11000 : o.userData.capa === 'cosmos' ? ESCALA_CIELO : ESCALA_FONDO; o.scale.setScalar(o.userData.escalaBase); if (o.userData.profundo) o.userData.fijo = true; }
  // El fondo infinito se aleja con el plano cercano (lejos de casa, millones de unidades): mismo
  // tamaño en el cielo, nunca recortado ni delante de lo que se visita.
  let escalaFondo = 1;
  const acompanar = () => { for (const o of cieloLejano) if (o !== cosmos.raiz && !o.userData.fijo) { o.position.copy(camera.position); o.scale.setScalar(o.userData.escalaBase * escalaFondo); o.updateMatrixWorld(); } };
  // Esas raíces ya se actualizan aquí (con todo lo que llevan dentro) en cada cuadro: three.js no las recorre otra vez al
  // dibujar (antes se calculaban dos veces por cuadro, tres en algunos; las galaxias lejanas son casi 300 objetos).
  for (const o of cieloLejano) if (o !== cosmos.raiz && !o.userData.fijo) o.matrixWorldAutoUpdate = false;
  // Para visitar algo del cielo profundo (púlsar, cuásar, TON 618, Sagitario A*, Deneb, la
  // supernova) el cielo deja de acompañar a la cámara ('fijo') y la cámara viaja hasta donde
  // está de verdad. Al volver, el cielo se recoge poco a poco en el tramo final ('regreso').
  const ID_LEJANOS = new Set(LEJANOS.map(l => l.id));
  let lejano = null, partida = null, faroBase = null;
  const soltarCielo = () => { lejano = null; };   // se deja de visitar un objeto lejano
  const velo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { uVelo: { value: 0 } },
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform float uVelo; void main(){ gl_FragColor = vec4(0.0, 0.0, 0.0, uVelo); }',
    transparent: true, depthTest: false, depthWrite: false
  }));
  velo.frustumCulled = false; velo.renderOrder = -5; velo.visible = false; scene.add(velo);
  // Cuánto se apaga el fondo en cada lugar: más donde el mensaje es un dibujo de luz.
  // Distancia mínima de la cámara a cada lugar (radio del objeto con margen).
  const CERCA = { hogar: 300, rosa: 240, azul: 95, cartas: 195, constelacion: 260, suenos: 235, capsulas: 180, calma: 245, cometa: 170 };
  // Salto a la velocidad de la luz: estelas de estrellas alrededor de la cámara que se
  // alargan con la velocidad del viaje (y el campo de visión se abre un poco en el tramo
  // más rápido). Fuera de los vuelos, ocultas.
  scene.add(camera);
  const campoVelocidad = crearVelocidad(camera, { reducido: matchMedia('(prefers-reduced-motion: reduce)').matches });
  const adelanteCamara = new THREE.Vector3(), movimiento = new THREE.Vector3();
  const proyectado = new THREE.Vector3();
  const camaraAntes = new THREE.Vector3();
  let distanciaAnterior = camera.position.distanceTo(controls.target), cuerposLente = null;
  let nubesFoco = null, focoNubes = 1, focoAplicado = false; const tmpFoco = new THREE.Vector3();
  let cometaAntes = null, escalaTiempo = 1;   // escalaTiempo: cámara lenta solo para pruebas (#debug)
  const VELO = { gigante: 0.2, deneb: 0, pulsar: 0, cuasar: 0, ton618: 0, sagitario: 0, supernova: 0, hogar: 0, constelacion: 0.62, calma: 0.45, capsulas: 0.4, suenos: 0.4, cartas: 0.35, rosa: 0.3, azul: 0.32, cometa: 0.2 };

  // Precalentado: compila todos los programas y sube todas las texturas mientras se
  // muestra «Preparando tu universo». Antes ocurría al aparecer cada objeto en
  // pantalla por primera vez y provocaba tirones al girar la cámara.
  // Con KHR_parallel_shader_compile la compilación no congela la pantalla de carga.
  const { subirTexturas, compilarTodo, calentar } = crearPreparacion({ renderer, camera, scene, nucleo, solar, telarana, composer, obtenerCapaVolumen: () => capaVolumen });   // carga/preparacion.js
  restaurarAzar();
  // Carga completa, como un videojuego: antes de entrar se crean todas las nebulosas, se calculan todas las texturas,
  // llega el cielo, se compilan todos los programas de GPU (también los del sistema solar) y todo se sube a la
  // tarjeta gráfica. Después ya no se prepara nada mientras se viaja: sin tirones.
  // three.js dibuja dos veces por cuadro (cara trasera y delantera, «recompilando» el material cada vez) todo material
  // transparente de dos caras. Con luz que se suma (aditiva) el orden no importa: una sola pasada da la misma imagen
  // con la mitad de llamadas y sin generar memoria temporal en cada cuadro (menos pausas del recolector en el móvil).
  const unaPasada = esc => esc.traverse(o => { for (const m of [].concat(o.material || [])) if (m.transparent && m.side === THREE.DoubleSide && m.blending === THREE.AdditiveBlending) m.forceSinglePass = true; });
  unaPasada(scene); unaPasada(solar.escena);
  // Luces siempre presentes: three.js compila cada material con el número de luces visibles, y una luz que se oculta con
  // su grupo (la casa vista desde un gigante) haría recompilar todos los materiales al llegar (un tirón la primera vez).
  // Las luces puntuales pasan a la raíz de la escena y siguen a su ancla; tienen alcance limitado, así que lejos de su
  // grupo no iluminan nada aunque sigan encendidas.
  const lucesFijas = [];
  scene.traverse(o => { if (o.isLight && !o.isAmbientLight && o.parent !== scene) lucesFijas.push(o); });
  for (const luz of lucesFijas) { const ancla = new THREE.Object3D(); ancla.position.copy(luz.position); luz.parent.add(ancla); luz.removeFromParent(); scene.add(luz); luz.userData.ancla = ancla; }
  const seguirLuces = () => { for (const luz of lucesFijas) { const a = luz.userData.ancla; let o = a; while (o && o.visible) o = o.parent; if (!o) luz.position.setFromMatrixPosition(a.matrixWorld); } };
  // Gas volumétrico a media resolución (capaVolumen.js): las nebulosas con volumen se pintan en su propia capa.
  const capaVolumen = crearCapaVolumen({ scene, renderer, uPR: nucleo.uPR, prTope: nucleo.prTope, hdr: canvas.dataset.brillo3d === 'hdr' });
  const listo = (async () => {
    window.__pasoCarga = 'nebulosas'; await lejanas.prepararTodas((h, t) => avance(0.5 + 0.06 * h / t, 0.56));
    window.__pasoCarga = 'texturas'; await texturasTodas((h, t) => avance(0.56 + 0.28 * h / t, 0.84));
    window.__pasoCarga = 'cielo'; avance(0.84, 0.86); await cieloProfundo.listo;
    window.__pasoCarga = 'cuasar'; avance(0.86, 0.88); cosmos.hornear(renderer); await new Promise(r => setTimeout(r, 0));
    avance(0.88, 0.96);
    window.__pasoCarga = 'compilar'; await texturasListas(); await compilarTodo(scene); await compilarTodo(solar.escena);
    avance(0.96, 0.99);
    window.__pasoCarga = 'subir'; subirTexturas(); subirTexturas(solar.escena); solarPreparado = true;
    await new Promise(r => setTimeout(r, 0));
    calentar(); avance(1);
  })();
  let vuelo = null, tiempo = 0, tEntrada = null, prev = performance.now(), pulso = 0, suspendida = false, cercaUniverso = Infinity, estrellasLocales = -1;
  const centroVia = cosmos.objetivo('sagitario')?.centro?.clone() ?? new THREE.Vector3();
  let destinoActual = 'hogar', pausa = false, captura = null, retornoGiro = 0;
  let cuadros = 0, acumulado = 0, entradaResuelta = false, coste = 0;
  // Calidad automática: resolución dinámica y escalones (calidad/gestor.js).
  const { regular, regularResolucion } = crearGestorCalidad({ canvas, nucleo, telarana, muestrasNube });

  // Ritmo de dibujo (ver util/planificador.js). En el móvil, igual que en el PC: siempre a 60 FPS, también en
  // reposo (a 30 los gigantes animados se veían a saltos). ?ritmo=ahorro vuelve a 30 en reposo en pantallas táctiles.
  const tactil = esMovil || matchMedia('(pointer:coarse)').matches;
  // Movimiento reducido: el universo sigue en 3D, pero la cámara no gira sola.
  const movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (movimientoReducido) controls.autoRotateSpeed = 0;
  // Cámara que respira: el giro automático arranca suave (sin tirón). La vista la mueve solo el dedo: el efecto
  // ventana del giroscopio (inclinar el teléfono movía el cielo unos grados) se quitó, en un móvil de verdad hacía que
  // la vista se moviera sola de lado a lado y temblara con el pulso de la mano al arrastrar.
  const giroBase = controls.autoRotateSpeed;
  let giroSuave = 0, respira = 0;
  const camaraGuardada = { pos: new THREE.Vector3(), rot: new THREE.Quaternion() }, haciaObjetivo = new THREE.Vector3();
  // En pantallas táctiles, sin tocar (tras 4 s) se dibuja a 30 FPS y al tocar vuelve a 60: medido en un iPhone, a 60
  // continuos el teléfono se calentaba y a los pocos minutos bajaba su GPU a la mitad (28 FPS con TODO). ?ritmo=fluido: siempre 60.
  const ritmoAhorro = tactil && new URLSearchParams(location.search).get('ritmo') !== 'fluido';
  const planificador = crearPlanificador({ interaccion: 60, contemplacion: ritmoAhorro ? 30 : 60, esperaMs: 4000 });
  let gesto = false, modoAnterior = null, cuadrosDibujados = 0, finGesto = -Infinity;
  const AMORTIGUACION = controls.dampingFactor;   // la de 60 FPS (nucleo.js)
  const marcarActividad = () => planificador.actividad(performance.now());
  for (const evento of ['pointerdown', 'wheel', 'keydown']) document.addEventListener(evento, marcarActividad, { passive: true });
  const capturador = crearCapturador({ obtener: () => nucleo.resolucion, fijar: v => { nucleo.fijarResolucion(v); regular.reiniciar(); } });
  let leyendo = false;
  const ventanas = [...document.querySelectorAll('dialog, .ventana')];
  const lectura = new MutationObserver(() => {
    leyendo = ventanas.some(v => v.open || v.classList.contains('abierta'));
  });
  for (const ventana of ventanas) lectura.observe(ventana, { attributes: true, attributeFilter: ['open', 'class'] });
  const medir = location.hash === '#debug';
  const diagnosticar = medir || (['render', 'completo', 'gigantes'].includes(new URLSearchParams(location.search).get('diag')) || new URLSearchParams(location.search).has('hud'));
  let exposicion = 1;
  const ctx = { camera, exposicion: 1, pulso: 0, tiempoDentro: null, escala: 1, velocidadPolvo: new THREE.Vector3() };

  // En pantallas estrechas la interfaz ocupa arriba y abajo: el centro de la
  // proyección se desplaza a la franja libre (solo en la vista de inicio).
  let desplazamiento = 0, desplazamientoMeta = 0, fraccionZona = 1;
  const cajas = selectores => selectores.flatMap(s => [...document.querySelectorAll(s)])
    // offsetParent es null en elementos fijos: getClientRects() vacío indica display:none.
    .filter(el => !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden')
    .map(el => el.getBoundingClientRect());
  function medirZonaLibre() {
    const estrecha = vista.ancho <= 600 || vista.ancho / vista.alto < 0.8;
    if (!estrecha) { desplazamientoMeta = 0; fraccionZona = 1; return; }
    const arriba = Math.max(0, ...cajas(['#titulo', '#btn-tour', '.marca-universo', '.horarios']).map(r => r.bottom));
    const abajo = Math.min(vista.alto, ...cajas(['#ruta', '#lugar', '#cometa-aviso']).map(r => r.top));
    desplazamientoMeta = -desplazamientoZonaLibre(arriba, abajo, vista.alto);
    // En casa, la galaxia algo más abajo: encima asoma la franja de cielo con los destinos.
    if (destinoActual === 'hogar') desplazamientoMeta -= vista.alto * 0.13;
    fraccionZona = Math.max(0, abajo - arriba) / vista.alto;
  }
  // Cada 1,5 s, pero nunca en mitad de un gesto, una inercia o un viaje (medir obliga al navegador a recalcular la
  // maquetación de la página, y el contador la cambia cada segundo) y cuando el navegador está libre.
  const libre = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 500 }) : f => setTimeout(f, 0);
  setInterval(() => { if (!gesto && !vuelo && !giro.moviendo && !zoom.moviendo) libre(medirZonaLibre); }, 1500);
  function aplicarDesplazamiento(dt) {
    const anterior = desplazamiento;
    desplazamiento += (desplazamientoMeta - desplazamiento) * Math.min(1, dt * 2.5);
    if (Math.abs(desplazamiento) < 0.5 && desplazamientoMeta === 0) { if (camera.view?.enabled) camera.clearViewOffset(); desplazamiento = 0; return; }
    if (Math.abs(desplazamiento - anterior) > 0.05 || !camera.view?.enabled) camera.setViewOffset(vista.ancho, vista.alto, 0, desplazamiento, vista.ancho, vista.alto);
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

  // Toque con margen de dedo: si no se acierta exactamente en un objeto, se elige el
  // destino cuyo centro proyectado esté más cerca, dentro de su tamaño en pantalla
  // (mínimo 44 px). Los nueve lugares se pueden tocar, también el cometa cuando se ve;
  // tocar el agujero negro desde otro lugar vuelve al centro.
  const centroToque = new THREE.Vector3();
  function destinoCercano(x, y) {
    const enSolar = escenaActiva === 'solar';
    const candidatos = DESTINOS.filter(d => SOLARES.has(d.id) === enSolar).map(d => [d.id, v3(d.posicion), d.id === 'hogar' ? 95 : 120]);
    if (enSolar) candidatos.push(['gigante', CENTRO_GIGANTE.clone(), 260]);
    else { candidatos.push(['rosa', marcaSolar.position.clone(), 60]); if (mundos.cometaVisible) candidatos.push(['cometa', mundos.posicionCometa(), 90]); }
    const escalaPx = vista.alto / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    let mejor = null, mejorD = Infinity;
    for (const [id, pos, radio] of candidatos) {
      // El lugar donde ya se está no cuenta (tras una pista se mira una estrella, no el centro).
      if (id === destinoActual && controls.target.distanceTo(pos) < 250) continue;
      const profundidad = pos.distanceTo(camera.position);
      centroToque.copy(pos).project(camera);
      if (centroToque.z < -1 || centroToque.z > 1) continue;
      const px = (centroToque.x + 1) / 2 * vista.ancho, py = (1 - centroToque.y) / 2 * vista.alto;
      const alcance = Math.max(44, Math.min(160, radio / profundidad * escalaPx));
      const d = Math.hypot(px - x, py - y);
      if (d < alcance && d / alcance < mejorD) { mejorD = d / alcance; mejor = id; }
    }
    return mejor;
  }
  function distanciaEncuadre(base) {
    const aspecto = vista.ancho / vista.alto;
    return base * Math.max(1, Math.min(1.8, 0.95 / aspecto));
  }
  // Viajes con intención: la cámara recorre una curva por puntos de paso propios de cada
  // destino (rozar un anillo, pasar tras una luna, seguir la ruta postal…). Sin puntos de
  // paso, un arco con altura evita atravesar el núcleo.
  let trasSalto = false;   // el próximo viaje sale del corte al sistema solar: empieza lanzado
  function desplazar(hasta, objetivo, duracion = 4.8, alLlegar, { paso = [], mirarAntes = 1, corriente = 0.45, fija = false, avance = null } = {}) {
    if (trasSalto) avance ??= 'aterrizar';
    vuelo?.resolver(false); if (vuelo?.plan) limpiarVuelo();
    let resolver;
    const promesa = new Promise(r => (resolver = r));
    const desde = camera.position.clone(), centroDesde = controls.target.clone();
    let puntos = sinRepetidos([desde, ...paso, hasta.clone()]);
    if (puntos.length < 2) puntos = [desde, hasta.clone().add(new THREE.Vector3(0, 0.5, 0))];
    if (!paso.length) { const intermedio = desde.clone().lerp(hasta, 0.5); intermedio.y += Math.min(450, desde.distanceTo(hasta) * 0.17); puntos = [desde, intermedio, hasta.clone()]; }
    const base = puntos.length === 3 && !paso.length ? new THREE.QuadraticBezierCurve3(...puntos) : new THREE.CatmullRomCurve3(puntos.length === 2 ? [puntos[0], puntos[0].clone().lerp(puntos[1], 0.5), puntos[1]] : puntos, false, 'centripetal');
    // Los viajes largos no atraviesan cuerpos: la galaxia y los objetos del cosmos (TON 618,
    // Sagitario A*, el cuásar, el púlsar, la supernova) son obstáculos con su radio real.
    const curva = esquivar(base, desde, hasta, [...OBSTACULOS, ...(desde.distanceTo(hasta) > 20000 ? [GALAXIA_OBSTACULO, ...cosmos.cuerpos().slice(1).map(c => ({ c: c.centro, r: c.radio }))] : [])], { porDistancia: true });
    vuelo = { curva, centroDesde, objetivo: objetivo.clone(), transcurrido: 0, duracion: fija ? duracion : duracionViaje(curva.getLength(), duracion), fija, distanciaTotal: curva.getLength(), llegada: hasta.distanceTo(objetivo), salida: Math.max(400, desde.distanceTo(centroDesde)), resolver, alLlegar, mirarAntes, corriente,
      // Al cometa se llega persiguiéndolo: el vuelo se desplaza con él mientras avanza.
      cometaInicio: destinoActual === 'cometa' ? mundos.posicionCometa() : null, perfil: paso.length > 0 || corriente >= 1, avance: avance && AVANCE[avance],
      // Con qué pantalla y qué encuadre ideal se trazó esta curva: si gira o cambia la interfaz
      // durante el vuelo, la llegada se corrige al aterrizar (correccionAlLlegar).
      vw: vista.ancho, vh: vista.alto, idealSalida: idealDelVuelo(hasta.distanceTo(objetivo)) };
    if (!fija) { canvas.dataset.viaje = destinoActual; canvas.dataset.avance = '0'; }   // un recorrido contemplativo no es un viaje (sin su tarjeta)
    controls.enabled = false; controls.autoRotate = false;
    return promesa;
  }
  // Cuerpos que la cámara no debe atravesar (centro y radio con margen, anillos incluidos).
  const OBSTACULOS = [
    { c: new THREE.Vector3(0, 0, 0), r: 420 },                                   // agujero negro (y el Sol, en el sistema solar)
    { c: v3(DESTINOS.find(d => d.id === 'rosa').posicion), r: 228 },           // planeta rosa, anillos, fecha y su luna
    { c: v3(DESTINOS.find(d => d.id === 'azul').posicion), r: 72 },            // la Tierra y su luna
    { c: v3(DESTINOS.find(d => d.id === 'cartas').posicion), r: 124 },         // luna del correo
    { c: v3(DESTINOS.find(d => d.id === 'capsulas').posicion), r: 165 },       // cápsula y astrolabio
    { c: v3(DESTINOS.find(d => d.id === 'suenos').posicion), r: 215 },         // jardín
    { c: v3(DESTINOS.find(d => d.id === 'calma').posicion), r: 215 },          // refugio
    { c: v3(DESTINOS.find(d => d.id === 'constelacion').posicion), r: 170 },   // constelación
    { c: CENTRO_GIGANTE.clone(), r: RADIO_GIGANTE * 3.2 },                     // gigante gaseoso y su cinturón
    ...OTROS_PLANETAS.map(p => ({ c: p.centro.clone(), r: p.radio * (p.anillos ? 2.6 : 1.8) + 30 }))   // el resto del sistema solar
  ];
  // La ruta esquiva los cuerpos (js/util/ruta.js): la curva final se comprueba por segmentos. En los
  // viajes lejanos la galaxia de Xiomara también es un obstáculo (radio con margen): el trayecto la
  // rodea por encima o por debajo; solo el tramo final de la llegada a casa entra en ella.
  const GALAXIA_OBSTACULO = { c: new THREE.Vector3(), r: 1600, llegada: true };
  // ── Vuelo cinematográfico por fases (js/util/vuelo.js) para los viajes largos: seleccionar el
  // destino, salir a un punto despejado, alinearse, romper, cruzar en línea recta y frenar. ──
  const marca = document.createElement('div'); marca.id = 'marca-destino'; marca.innerHTML = '<i></i>'; marca.setAttribute('aria-hidden', 'true'); document.body.append(marca);
  const obstaculosVuelo = () => [...OBSTACULOS, GALAXIA_OBSTACULO, ...cosmos.cuerpos().slice(1).map(c => ({ c: c.centro, r: c.radio }))];
  // Al cancelar o cambiar de viaje no puede quedar nada de la fase anterior (campo de visión, señal, ruptura).
  function limpiarVuelo() { marca.classList.remove('activa'); campoVelocidad?.ruptura(0, 0); campoVelocidad?.direccion(null); delete canvas.dataset.fase; delete canvas.dataset.region; delete canvas.dataset.encuentro; delete canvas.dataset.distanciaMal; if (camera.fov !== 60) { camera.fov = 60; camera.updateProjectionMatrix(); } }
  // Lo más cercano en el universo (catálogo y cuerpos del cosmos): velocidad del crucero y plano cercano.
  const cuerposCercania = () => cosmos.cuerpos().map(c => ({ c: c.centro, r: c.radio }));
  let cuerposCache = null;
  const cercaniaUniverso = p => {
    if (!cuerposCache) cuerposCache = cuerposCercania();
    let m = Math.min(lejanas.distanciaCercana(p), p.length() - 1100);
    for (const c of cuerposCache) m = Math.min(m, p.distanceTo(c.c) - c.r);
    return m;
  };
  // Durante el viaje: región, encuentro a la vista y distancia a casa (interfaz y pruebas).
  const nombreEncuentro = new Map(lejanas.universo.encuentros.map(e => [e.id, e.nombre]));
  const REGIONES_NOMBRE = { salida: 'Grupo de Xiomara', extragalactica: 'Primeras regiones extragalácticas', intermedia: 'Regiones intermedias', profunda: 'Universo profundo', llegada: 'Región de la supernova' };
  const dirTmp = new THREE.Vector3();
  function informarViaje(e) {
    const p = camera.position, mal = aMal(p.length()), aSupernova = aMal(p.distanceTo(cosmos.objetivo('supernova').centro));
    const region = mal < 3 ? 'salida' : (universoLocal.presencia.supernova ?? 0) > 0.5 ? 'llegada' : mal < 20 ? 'extragalactica' : mal < 80 ? 'intermedia' : 'profunda';
    canvas.dataset.region = REGIONES_NOMBRE[region]; canvas.dataset.distanciaMal = mal < 10 ? mal.toFixed(1) : String(Math.round(mal));
    // El encuentro que se ve ahora (el más reconocible delante).
    camera.getWorldDirection(dirTmp); let mejor = null, mw = 0.25;
    for (const g of lejanas.universo.galaxias) { if (!g.encuentro) continue; const v = g.pos.clone().sub(p), d = v.length(), px = g.radio / d * 780, c = v.dot(dirTmp) / d; const w = THREE.MathUtils.smoothstep(px, 6, 30) * THREE.MathUtils.smoothstep(c, 0.5, 0.85); if (w > mw) { mw = w; mejor = g; } }
    const nombre = mejor ? nombreEncuentro.get(mejor.encuentro) || '' : '';
    if (canvas.dataset.encuentro !== nombre) { if (nombre) canvas.dataset.encuentro = nombre; else delete canvas.dataset.encuentro; }
  }
  // «Mirar hacia casa»: lejos de Xiomara, la vista se vuelve hacia ella y se acerca ÓPTICAMENTE
  // (campo de visión estrecho). Ni Xiomara ni la cámara se mueven y nada cambia de tamaño: su tamaño
  // aparente es el de la perspectiva con ese campo de visión. Una señal la identifica.
  const marcaCasa = document.createElement('div'); marcaCasa.id = 'marca-casa'; marcaCasa.innerHTML = '<i></i><span></span>'; marcaCasa.setAttribute('aria-hidden', 'true'); document.body.append(marcaCasa);
  let mirada = null;
  const ORIGEN_CASA = new THREE.Vector3();
  const raicesLejanas = scene.children.filter(o => o.userData.capa === 'galaxiasLejanas');
  let gruposGigantes = null;
  const raicesCasa = scene.children.filter(o => ['frases', 'amor', 'mundos', 'secretas', 'agujeroNegro'].includes(o.userData.capa));
  // «Mirar hacia casa» desde un gigante: los gigantes están casi en el plano de la galaxia de Xiomara y se veía de canto (una
  // raya). Mientras se mira, casa se inclina hacia la cámara (como una foto desde arriba, ~45°) solo al dibujar: antes del
  // dibujo se gira alrededor de su centro y después vuelve a su sitio (la lógica de cada parte no lo nota).
  const todaCasa = scene.children.filter(o => ['mundos', 'galaxia', 'amor', 'agujeroNegro', 'corazon', 'nombre', 'frases', 'secretas', 'polvo', 'marcaSolar'].includes(o.userData.capa) || o === marcaSolar);
  const giroCasa = new THREE.Quaternion(), guardadoCasa = todaCasa.map(() => [new THREE.Vector3(), new THREE.Quaternion()]), ejeCasa = new THREE.Vector3(), haciaCamCasa = new THREE.Vector3();
  let casaInclinada = false; const cosmosVisible = [true, true, true, true], camaraTele = { pos: new THREE.Vector3(), fov: 60, escala: 1, activa: false };
  function inclinarCasa() {
    if (!mirada) return;
    const s = mirada.saliendo ? 1 - THREE.MathUtils.smootherstep(mirada.t, 0, 1) : THREE.MathUtils.smootherstep(mirada.t, 0.15, 0.9);
    if (s <= 0.001) return;
    haciaCamCasa.copy(camera.position).normalize();
    const cos = haciaCamCasa.y, normal = Math.sign(cos) || 1, a0 = Math.acos(Math.min(1, Math.abs(cos))), delta = Math.max(0, a0 - 0.8) * s;
    ejeCasa.set(0, normal, 0).cross(haciaCamCasa); giroCasa.identity(); if (delta > 1e-4 && ejeCasa.lengthSq() > 1e-12) giroCasa.setFromAxisAngle(ejeCasa.normalize(), delta);
    todaCasa.forEach((o, i) => { guardadoCasa[i][0].copy(o.position); guardadoCasa[i][1].copy(o.quaternion); o.position.applyQuaternion(giroCasa); o.quaternion.premultiply(giroCasa); });
    // Con el teleobjetivo ya cerrado sobre casa no se dibujan los gigantes ni los astros del cielo (cometas de nuestro entorno,
    // soles lejanos): lo que quedaba en la línea de visión (la estrella Deneb, un cometa) se ampliaba miles de veces y cubría
    // la vista de gris. Mientras gira hacia casa siguen ahí; vuelven al salir.
    cosmosVisible[0] = cosmos.raiz.visible; cosmosVisible[1] = cosmos.decor.visible; cosmosVisible[2] = telarana.raiz.visible; cosmosVisible[3] = capaVolumen.compuesto.visible;
    if (s > 0.6) cosmos.raiz.visible = cosmos.decor.visible = false;
    // Sin temblor: con el teleobjetivo cerrado, casa queda a decenas de millones de unidades y la GPU (precisión simple) solo
    // sitúa cada estrella en pasos de ~1 unidad; con la galaxia girando y un aumento de miles de veces, temblaba. Para este
    // dibujo la cámara se acerca a casa en la misma dirección y el campo de visión se abre en la misma proporción: la misma
    // imagen, con números pequeños y precisos. (Lo que no es casa ya no se dibuja en este encuadre.)
    if (s > 0.6 && camera.fov < 1) {
      camaraTele.pos.copy(camera.position); camaraTele.fov = camera.fov; camaraTele.escala = uScaleCasa.value;
      const fov = 1, k = Math.tan(camera.fov * Math.PI / 360) / Math.tan(fov * Math.PI / 360);
      camera.position.multiplyScalar(k); camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      uScaleCasa.value = nucleo.uScale.value * Math.tan(FOV_BASE * Math.PI / 360) / Math.tan(fov * Math.PI / 360);
      telarana.raiz.visible = false; capaVolumen.compuesto.visible = false; camaraTele.activa = true;
    }
    casaInclinada = true;
  }
  function restaurarCasa() {
    if (!casaInclinada) return;
    todaCasa.forEach((o, i) => { o.position.copy(guardadoCasa[i][0]); o.quaternion.copy(guardadoCasa[i][1]); });
    cosmos.raiz.visible = cosmosVisible[0]; cosmos.decor.visible = cosmosVisible[1];
    if (camaraTele.activa) { camera.position.copy(camaraTele.pos); camera.fov = camaraTele.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); uScaleCasa.value = camaraTele.escala; telarana.raiz.visible = cosmosVisible[2]; capaVolumen.compuesto.visible = cosmosVisible[3]; camaraTele.activa = false; }
    casaInclinada = false;
  }
  function mirarCasa(activar = !mirada || mirada.saliendo) {
    if (vuelo || tEntrada === null) return false;
    if (activar) {
      const d = camera.position.length(); if (d < 15000) return false;
      // La galaxia de casa llena la vista: ~85 % del ancho en una pantalla vertical, ~62 % del alto en una horizontal (antes,
      // 22 % del alto y un tope de campo de visión: desde Deneb era un puntito en una pantalla negra).
      const fov = Math.max(0.004, THREE.MathUtils.radToDeg(2 * Math.atan(980 / (d * Math.min(0.62, 0.85 * camera.aspect)))));
      mirada = { t: 0, desdeFov: camera.fov, aFov: Math.min(FOV_BASE, fov), desdeQ: camera.quaternion.clone(), aQ: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position, ORIGEN_CASA, camera.up)), objetivo: controls.target.clone(), saliendo: false, distanciaMal: aMal(d) };
      controls.enabled = false; controls.autoRotate = false; canvas.dataset.mirandoCasa = 'si';
    } else if (mirada) { mirada = { ...mirada, t: 0, saliendo: true, desdeFov: camera.fov, desdeQ: camera.quaternion.clone() }; }
    planificador.pedirCuadro(); return true;
  }
  function actualizarMirada(dt) {
    if (!mirada) return;
    mirada.t = Math.min(1, mirada.t + dt / (movimientoReducido ? 0.6 : 1.6)); const k = THREE.MathUtils.smootherstep(mirada.t, 0, 1);
    if (!mirada.saliendo) { camera.quaternion.slerpQuaternions(mirada.desdeQ, mirada.aQ, Math.min(1, k * 1.6)); camera.fov = mirada.desdeFov + (mirada.aFov - mirada.desdeFov) * THREE.MathUtils.smootherstep(mirada.t, 0.25, 1); }
    else { const vuelta = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position, mirada.objetivo, camera.up)); camera.quaternion.slerpQuaternions(mirada.desdeQ, vuelta, k); camera.fov = mirada.desdeFov + (FOV_BASE - mirada.desdeFov) * Math.min(1, k * 1.4); }
    camera.updateProjectionMatrix();
    // El fondo infinito (cubemap) no se amplía: con un campo de visión tan estrecho sus texeles se
    // verían como una niebla gris. Se atenúa con la ampliación (vuelve al terminar).
    scene.backgroundIntensity = 0.5 * (0.3 + 0.7 * Math.max(0, estrellasLocales)) * (0.12 + 0.88 * THREE.MathUtils.smoothstep(camera.fov, 2, 40));
    // Lo mismo para el cielo profundo y las galaxias y nebulosas lejanas que quedan delante: con el campo de visión tan
    // estrecho se ampliaban cientos de veces y, sumadas, dejaban la pantalla en blanco. Se apagan con la ampliación.
    const ampliacion = THREE.MathUtils.smoothstep(camera.fov, 3, 40);
    cieloProfundo.ampliar(ampliacion);
    for (const o of raicesLejanas) o.visible = ampliacion > 0.08;
    proyMarca.copy(ORIGEN_CASA).project(camera);
    const x = (proyMarca.x + 1) / 2 * vista.ancho, y = (1 - proyMarca.y) / 2 * vista.alto, rpx = 980 / camera.position.length() * vista.alto / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    marcaCasa.classList.toggle('activa', !mirada.saliendo && mirada.t > 0.6 && proyMarca.z < 1);
    const dpr = devicePixelRatio || 1, px = v => Math.round(v * dpr) / dpr;   // en píxeles exactos de la pantalla: nítido
    marcaCasa.style.transform = `translate(${px(x)}px, ${px(y)}px)`; marcaCasa.style.setProperty('--r', `${px(Math.max(18, rpx * (rpx > 60 ? 0.85 : 1.25)))}px`); marcaCasa.classList.toggle('grande', rpx > 60);   // si casa ya llena la vista, sin círculo (se salía de la pantalla): solo su nombre debajo
    const textoCasa = `Xiomara · ${mirada.distanciaMal < 10 ? mirada.distanciaMal.toFixed(1) : Math.round(mirada.distanciaMal)} millones de años luz`, rotulo = marcaCasa.querySelector('span');
    if (rotulo.textContent !== textoCasa) rotulo.textContent = textoCasa;   // solo si cambia (cada cambio rehace el texto de la página)
    if (mirada.saliendo && mirada.t >= 1) { cieloProfundo.ampliar(1); for (const o of raicesLejanas) o.visible = true; mirada = null; estrellasLocales = -1; controls.enabled = true; delete canvas.dataset.mirandoCasa; marcaCasa.classList.remove('activa'); camera.fov = FOV_BASE; camera.updateProjectionMatrix(); camera.lookAt(controls.target); }
    else planificador.pedirCuadro();
  }
  // Duración de referencia de los viajes largos (~55 s a la supernova), ajustable tras verla con
  // ?duracionViaje=0.8 (entre 0,3 y 2) sin tocar el código.
  { const e = Number(new URLSearchParams(location.search).get('duracionViaje')); if (e > 0) DURACION.escala = THREE.MathUtils.clamp(e, 0.3, 2); }
  // Modalidad breve del viaje (preferencia guardada) y salto del crucero.
  let viajeBreve = false; try { viajeBreve = localStorage.getItem('xiomara:viaje-breve') === '1'; } catch {}
  function volarCinematico(hasta, mira, { centro = mira, rAprox } = {}) {
    vuelo?.resolver(false); limpiarVuelo();
    let resolver; const promesa = new Promise(r => (resolver = r));
    const desde = camera.position.clone(), centroDesde = controls.target.clone();
    cuerposCache = null; const t0Plan = performance.now();
    // Si se sale de un gigante (supernova, cuásar, TON 618, púlsar), la cámara se coloca primero delante de él,
    // en la línea hacia el destino: se vuelve por el mismo camino de la ida.
    let salidaFrente = null;
    // También desde casa: si la vista estaba muy acercada o alejada, primero vuelve a su distancia normal,
    // gira con calma y luego sale (sin barrer el cielo con el zoom puesto).
    if (desde.length() < 20000 && centro.length() > 20000) salidaFrente = { centro: new THREE.Vector3(), minimo: 1700, radio: Math.max(6400, encuadre?.d || 0), soloAcercar: true, elevacion: 0.6 };   // a su distancia normal (en el móvil, la suya)
    else if (partida && desde.distanceTo(partida.centro) < partida.alcance) {
      const cuerpo = cosmos.cuerpos().find(c => c.id === partida.id);
      salidaFrente = { centro: partida.centro.clone(), minimo: Math.min(partida.radio * 0.9, cuerpo ? cuerpo.radio * 1.3 : partida.radio * 0.4), radio: partida.radio, soloAcercar: true };   // a su distancia normal: se aleja o se acerca
    } else {
      // El gigante donde se está de verdad: el más cercano, y solo si la cámara está dentro de unas pocas veces
      // su distancia de llegada (antes podía elegirse otro gigante lejano y la vista saltaba a él).
      let mejor = null;
      for (const c of cosmos.cuerpos()) { if (c.id === 'xiomara' || c.centro.distanceTo(centro) < 1) continue;
        const d = desde.distanceTo(c.centro), lim = Math.max(LLEGADA_GIGANTE[c.id] ?? 0, cosmos.objetivo(c.id)?.distancia ?? 0, c.radio, lejano && lejano.id === c.id ? lejano.dist : 0) * 6;   // también con el zoom alejado al máximo (en el móvil la llegada es hasta 1,6 veces más lejos)
        const propio = centroDesde.distanceTo(c.centro) < c.radio && d < Math.max(lim, controls.maxDistance * 1.05);   // el gigante que se mira manda, aunque el zoom esté al máximo
        if (propio) { mejor = { c, d }; break; }
        if (d < lim && (!mejor || d < mejor.d)) mejor = { c, d }; }
      if (mejor) { const c = mejor.c; salidaFrente = { centro: c.centro.clone(), minimo: c.radio * 1.3, radio: Math.max(cosmos.objetivo(c.id)?.distancia ?? 0, LLEGADA_GIGANTE[c.id] ?? 0, lejano && lejano.id === c.id ? lejano.dist : 0, centroDesde.distanceTo(c.centro) < c.radio ? encuadre?.d || 0 : 0) }; }
    }
    partida = null;
    const plan = planificarVuelo({ desde, miraDesde: centroDesde, hasta, mira, centro, obstaculos: obstaculosVuelo(), reducido: movimientoReducido, rAprox, cercania: cercaniaUniverso, breve: viajeBreve, salidaFrente });
    canvas.dataset.planMs = (performance.now() - t0Plan).toFixed(0);   // coste de planificar (diagnóstico)
    vuelo = { plan, curva: plan.trayectoria(), centroDesde, objetivo: mira.clone(), transcurrido: 0, get duracion() { return plan.duracion; }, distanciaTotal: plan.camino.getLength(), llegada: hasta.distanceTo(mira),
      salida: Math.max(400, desde.distanceTo(centroDesde)), resolver, corriente: 0, perfil: false, centroDestino: centro.clone(), rupturaHecha: false,
      vw: vista.ancho, vh: vista.alto, idealSalida: idealDelVuelo(hasta.distanceTo(mira)) };
    canvas.dataset.viaje = destinoActual; canvas.dataset.avance = '0'; canvas.dataset.fase = 'seleccion';
    controls.enabled = false; controls.autoRotate = false;
    return promesa;
  }
  const FOV_BASE = 60, proyMarca = new THREE.Vector3(), proyCentro = new THREE.Vector3(), adelante = new THREE.Vector3();
  // Señal del destino: estable (sin parpadeos). Su posición se suaviza, y los cambios de forma (círculo /
  // flecha en el borde) y de estado (alineada) tienen margen: no saltan de uno a otro en el límite.
  const marcaEstado = { x: null, y: null, fuera: false, alineada: false };
  function actualizarMarca(fase, centro) {
    // Solo mientras la cámara se alinea con el destino (no mientras maniobra o rodea un gigante): así no baila.
    const visible = fase === 'alineacion' || fase === 'ruptura';
    marca.classList.toggle('activa', visible && fase !== 'ruptura');
    if (!visible) {
      marcaEstado.x = null;
      // Tras el salto (ya invisible), vuelve a su forma inicial para el próximo viaje: abierto, no ya apuntado.
      if (fase !== 'ruptura' && marcaEstado.alineada) { marcaEstado.alineada = false; marca.classList.remove('alineada'); }
      return;
    }
    camera.updateMatrixWorld();   // con la orientación de ESTE cuadro (antes usaba la del anterior: temblaba al girar)
    proyMarca.copy(centro).project(camera);
    const detras = proyMarca.z > 1, x = (proyMarca.x + 1) / 2 * vista.ancho, y = (1 - proyMarca.y) / 2 * vista.alto;
    // Apuntado: el destino está donde mira la cámara. En el móvil la proyección está desplazada hacia la franja libre de
    // la interfaz, así que ese punto no es el centro de la pantalla (antes nunca contaba como apuntado y el círculo no se cerraba).
    camera.getWorldDirection(adelante); proyCentro.copy(camera.position).addScaledVector(adelante, 1000).project(camera);
    const cx = (proyCentro.x + 1) / 2 * vista.ancho, cy = (1 - proyCentro.y) / 2 * vista.alto;
    const m = marcaEstado.fuera ? 52 : 30;   // histéresis en el borde
    const fuera = detras || x < m || x > vista.ancho - m || y < m || y > vista.alto - m, aCentro = Math.hypot(x - cx, y - cy);
    const alineada = !fuera && aCentro < (marcaEstado.alineada ? 70 : 36);
    if (fuera !== marcaEstado.fuera) { marcaEstado.fuera = fuera; marca.classList.toggle('fuera', fuera); }
    if (alineada !== marcaEstado.alineada) { marcaEstado.alineada = alineada; marca.classList.toggle('alineada', alineada); }
    let px = x, py = y;
    if (fuera) { let dx = (proyMarca.x) * (detras ? -1 : 1), dy = (-proyMarca.y) * (detras ? -1 : 1); const k = Math.max(Math.abs(dx), Math.abs(dy)) || 1; dx /= k; dy /= k;
      px = vista.ancho / 2 + dx * (vista.ancho / 2 - 36); py = vista.alto / 2 + dy * (vista.alto / 2 - 36); marca.style.setProperty('--giro', `${Math.atan2(dy, dx) * 180 / Math.PI + 90}deg`); }
    if (marcaEstado.x === null) { marcaEstado.x = px; marcaEstado.y = py; }
    marcaEstado.x = px; marcaEstado.y = py;   // exactamente sobre el destino
    // En píxeles exactos de la pantalla (sin medios píxeles, que la emborronaban).
    const dpr = devicePixelRatio || 1;
    marca.style.transform = `translate(${Math.round(marcaEstado.x * dpr) / dpr}px, ${Math.round(marcaEstado.y * dpr) / dpr}px)`;
  }
  // Rutas de los viajes cortos (camara/rutas.js).
  const { recta, pasoHacia } = crearRutas({ camera, mundos });
  // Encuadre del corazón de la supernova: mide su tamaño real y la franja de pantalla que dejan
  // libre la cabecera y el texto, y coloca el centro del corazón en el centro de esa franja,
  // entero y con margen, en vertical y en horizontal.
  function franjaSupernova() {
    const H = vista.alto, estrecha = vista.ancho <= 600 || vista.ancho / vista.alto < 0.8;
    const cab = document.querySelector('#supernova-amor .sn-cabecera')?.getBoundingClientRect();
    const msg = document.querySelector('#supernova-amor .sn-mensaje')?.getBoundingClientRect();
    const arriba = cab && cab.height ? cab.bottom + 14 : H * 0.08;
    // Se reserva el alto del texto más largo (título y dedicatoria), aunque aún no se muestre.
    const abajo = msg && msg.height ? msg.bottom - (estrecha ? 190 : 175) : H * (estrecha ? 0.58 : 0.72);
    return { arriba: Math.min(arriba, H * 0.3), abajo: Math.max(abajo, H * 0.45) };
  }
  // El corazón mira siempre a casa: la cámara se coloca delante de él (en su eje), a la distancia
  // a la que se ve entero en la franja libre de la pantalla, y nunca es el corazón el que se gira.
  // modo 'lugar': con la tarjeta de abajo, como en los demás destinos; 'ceremonia': con el texto.
  function encuadreCorazon(modo = 'lugar') {
    const sn = cosmos.supernova, q = sn.corazon.getWorldQuaternion(new THREE.Quaternion());
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(q), arriba = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const escala = sn.corazon.getWorldScale(new THREE.Vector3()).x, caja = sn.cajaCorazon;
    const c = sn.corazon.localToWorld(caja.getCenter(new THREE.Vector3())), mitad = caja.getSize(new THREE.Vector3()).multiplyScalar(0.5 * escala);
    const H = vista.alto, tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), estrecha = vista.ancho <= 600 || vista.ancho / vista.alto < 0.8;
    let fraccion, yc;
    if (modo === 'ceremonia') { const { arriba: a, abajo: b } = franjaSupernova(); fraccion = (b - a) / H; yc = 1 - (a + b) / H; }
    // En vertical la proyección ya se desplaza a la franja libre (medirZonaLibre).
    else if (estrecha) { fraccion = Math.max(0.45, fraccionZona * 0.95); yc = 0; }
    else { fraccion = 0.64; yc = 0.08; }   // libre entre el título y la barra de abajo
    const margen = 1.12;
    const distancia = Math.max(mitad.y * margen / (tanV * fraccion), mitad.x * margen / (tanV * camera.aspect * 0.92)) + mitad.z * 0.5;
    const posicion = c.clone().addScaledVector(dir, distancia);
    return { posicion, objetivo: c.clone().addScaledVector(arriba, -yc * tanV * distancia), distancia, centro: c };
  }
  // Viaje a un objeto lejano sin acercarlo: se llega por el lado desde el que se viene, un poco
  // por encima, a la distancia a la que se ve entero; la duración crece con el trayecto.
  function viajarLejos(id, { duracion } = {}) {
    const profundo = id !== 'gigante';
    const o = profundo ? cosmos.objetivo(id) : { centro: CENTRO_GIGANTE.clone(), distancia: 680, alto: 0.22 };
    if (!o) return Promise.resolve(false);
    if (profundo) { o.centro.multiplyScalar(ESCALA_CIELO); o.distancia *= ESCALA_CIELO; }
    destinoActual = id; mundos.enfocar(id); alViajar(id);
    // La cámara gira despacio hacia el destino, sale recta hacia él (ya enfocado) y se detiene
    // delante, a la distancia a la que se ve entero: sin rodeos, subidas ni giros al llegar.
    const desde = camera.position.clone(), dir = desde.clone().sub(o.centro).normalize();
    let dist = o.distancia * Math.max(1, Math.min(1.6, 0.95 / (vista.ancho / vista.alto))), hasta = o.centro.clone().addScaledVector(dir, dist), mira = o.centro;
    // Se llega de frente, por el lado desde el que se viene: la cámara apunta todo el viaje al destino.
    lejano = { id, centro: o.centro, dist };
    // Al corazón ya nacido se llega por delante (mira a casa), encuadrado como los demás lugares.
    // Se llega en la recta hacia el punto que se mira: el punto de fuga de la velocidad queda en el
    // centro todo el viaje (no se va hacia un lado al final).
    if (id === 'supernova' && cosmos.supernova.estado === 'remanente') { const e = encuadreCorazon('lugar'); mira = e.objetivo; lejano.dist = dist = e.distancia; hasta = mira.clone().add(desde.clone().sub(mira).normalize().multiplyScalar(e.posicion.distanceTo(mira))); }
    // Viajes largos: vuelo por fases con corredor recto. Cortos (el agujero de casa): curva suave.
    if (desde.distanceTo(hasta) > 12000) return volarCinematico(hasta, mira, { centro: o.centro });
    return desplazar(hasta, mira, duracion ?? Math.min(22, 6 + desde.distanceTo(hasta) / 120000), undefined, { paso: recta(desde, hasta), mirarAntes: 1, corriente: 1 });
  }
  // Entrar en el sistema solar (o salir de él): lanzarse a la velocidad de la luz hacia su punto
  // del brazo de la galaxia, un destello, y aparecer al otro lado; luego el viaje sigue normal.
  const ENTRADA_SOLAR = new THREE.Vector3(1900, 1500, 7800), ORIGEN = new THREE.Vector3();
  async function entrarOSalir(id, opciones) {
    const haciaSolar = SOLARES.has(id);
    destinoActual = id; mundos.enfocar(id); alViajar(id); soltarCielo();
    if (haciaSolar) {
      const p = galaxia.puntoBrazo(), aviso = setTimeout(destellar, 3200);
      const ok = await desplazar(p.clone().add(new THREE.Vector3(0, 3, 0)), p, 3.8, undefined, { corriente: 1, mirarAntes: 1.5, avance: 'lanzarse' });
      clearTimeout(aviso);
      if (!ok || destinoActual !== id) return false;
      cambiarEscena('solar');
      camera.position.copy(ENTRADA_SOLAR); controls.target.copy(ORIGEN); camera.lookAt(ORIGEN);
    } else {
      const fuera = camera.position.clone().setY(0).normalize().multiplyScalar(9500).add(new THREE.Vector3(0, 1800, 0));
      const aviso = setTimeout(destellar, 2700);
      const ok = await desplazar(fuera, fuera.clone().multiplyScalar(2), 3.2, undefined, { corriente: 1, avance: 'lanzarse' });
      clearTimeout(aviso);
      if (!ok || destinoActual !== id) return false;
      cambiarEscena('principal');
      const p = galaxia.puntoBrazo(), sale = p.clone().setY(0).normalize();
      camera.position.copy(p).addScaledVector(sale, 30).add(new THREE.Vector3(0, 14, 0)); controls.target.copy(p).addScaledVector(sale, 600); camera.lookAt(controls.target);
    }
    camaraAntes.copy(camera.position);
    trasSalto = true; const viaje = viajar(id, opciones); trasSalto = false;   // (lo usa el desplazamiento que viajar crea en el acto)
    return viaje;
  }
  function viajar(id, { duracion = 4.8 } = {}) {
    // De dónde se sale: el objeto lejano que se visitaba y su distancia de llegada (se recuerda antes de
    // que el nuevo destino lo sustituya; la salida vuelve primero a esa distancia, también con el zoom al máximo).
    partida = lejano ? { id: lejano.id, centro: lejano.centro.clone(), radio: encuadre?.d || lejano.dist, alcance: Math.max(controls.maxDistance, lejano.dist * 3) * 1.05 } : null;
    if (tEntrada !== null && SOLARES.has(id) !== (escenaActiva === 'solar')) return entrarOSalir(id, { duracion });
    cosmos.supernova.visitada = id === 'supernova';
    if (ID_LEJANOS.has(id)) return viajarLejos(id, { duracion: id === destinoActual ? 3 : undefined });
    soltarCielo();
    const d = DESTINOS.find(d => d.id === id);
    if (!d && id !== 'cometa') return Promise.resolve(false);
    destinoActual = id; mundos.enfocar(id); alViajar(id);
    const objetivo = id === 'cometa' ? mundos.posicionCometa() : v3(d.posicion);
    // En vertical la figura se centra en la franja libre mediante el desplazamiento de la proyección.
    // Punto de mira propio de cada lugar (centro de su composición), por defecto algo bajo.
    if (id !== 'hogar') objetivo.add(v3(d?.foco || [0, -15, 0]));
    let offset;
    if (id === 'hogar') {
      const aspecto = vista.ancho / vista.alto, { distancia, elevacion } = encuadreHogar(aspecto);
      // En pantallas anchas se conserva exactamente el vector de escritorio.
      offset = aspecto >= 0.8 ? new THREE.Vector3(distancia * 0.2, distancia * 0.42, distancia * 0.88)
        : new THREE.Vector3(0.2, 0, 0.88).normalize().multiplyScalar(Math.cos(elevacion) * distancia).setY(Math.sin(elevacion) * distancia);
    } else {
      // Se mide la franja libre con la tarjeta del nuevo destino ya actualizada.
      medirZonaLibre();
      const aspecto = vista.ancho / vista.alto, base = d?.distancia || 530;
      const dist = distanciaDestino(base * (aspecto < 0.95 ? TAMANO_FIGURA[id] || 1 : 1), aspecto, fraccionZona);
      // Se llega desde el lado iluminado (la luz sale del centro de la galaxia), girando
      // unos 40° para ver el relieve en tres cuartos con el terminador a un lado.
      // En la Tierra se llega mirando al Atlántico, entre las dos orillas (sea de día o de noche).
      const haciaLuz = id === 'azul' ? planetas.atlantico().setY(0).normalize() : objetivo.clone().multiplyScalar(-1).setY(0).normalize().applyAxisAngle(EJE_Y, d?.giro ?? 0.7);
      // Rodear el destino como mucho ~26°: el viaje llega casi en línea recta (las estelas
      // nacen donde está el destino) y el pequeño giro final se hace ya frenando.
      const desdeAqui = camera.position.clone().sub(objetivo).setY(0).normalize(), giroTotal = haciaLuz.angleTo(desdeAqui);
      if (giroTotal > 0.45) {
        const eje = new THREE.Vector3().crossVectors(haciaLuz, desdeAqui).normalize();
        if (eje.lengthSq() > 0.5) haciaLuz.applyAxisAngle(eje, giroTotal - 0.45);
      }
      offset = haciaLuz.multiplyScalar(dist).setY(dist * (d?.altura ?? 0.2));
      // Horizontal bajo (móvil girado): la figura se aparta de la tarjeta de la izquierda.
      if (vista.alto < 620 && vista.ancho > vista.alto && vista.ancho <= 900) {
        const derecha = new THREE.Vector3().crossVectors(offset.clone().negate(), EJE_Y).normalize();
        objetivo.addScaledVector(derecha, -base * 0.32);
      }
    }
    medirZonaLibre();
    const hasta = objetivo.clone().add(offset);
    // El primer vuelo (entrada) conserva su arco amplio; los demás cuentan algo y llegan
    // girando alrededor del lugar en su último tramo, en lugar de entrar de frente.
    const opciones = tEntrada !== null && tiempo - tEntrada > 1 ? pasoHacia(id, hasta, objetivo) : {};
    // Desde muy lejos (el cuásar, TON 618…) el viaje dura lo que su distancia, a la velocidad de la luz.
    const recorrido = camera.position.distanceTo(hasta);
    // Volver a casa desde lejos: vuelo por fases. El crucero apunta al centro de la galaxia y termina
    // a 12 000 de ella (fuera de su disco); el arco final, amplio, llega de frente al encuadre de casa.
    if (id === 'hogar' && recorrido > 20000 && escenaActiva === 'principal') return volarCinematico(hasta, objetivo, { centro: new THREE.Vector3(), rAprox: 12000 });
    if (recorrido > 60000) { duracion = Math.max(duracion, Math.min(22, 6 + recorrido / 120000)); opciones.corriente = 1; }
    return desplazar(hasta, objetivo, duracion, undefined, opciones);
  }
  // Reencuadre al cambiar la ventana (girar el móvil, redimensionar, mostrar u ocultar la
  // tarjeta): la distancia a la que el destino se ve entero depende del aspecto y de la franja
  // libre. Se conserva la órbita y el zoom relativo de la persona (se escala su distancia por la
  // razón entre el encuadre nuevo y el anterior) y se hace suave; los cambios pequeños de alto
  // (barras del navegador que aparecen y desaparecen) no reencuadran.
  let encuadre = null, ajuste = null, esperaAjuste = 0;
  function distanciaIdeal() {
    const aspecto = vista.ancho / vista.alto, id = destinoActual;
    // Durante la explosión el encuadre ya es el del corazón que se forma (la cámara se retira a él).
    if (lejano?.id === 'supernova' && (cosmos.supernova.estado === 'remanente' || cosmos.supernova.desdeEstallido !== null || cosmos.supernova.fase === 'silencio')) { const e = encuadreCorazon('lugar'); return { d: e.distancia, mira: e.objetivo }; }
    if (lejano) { const o = lejano.id === 'gigante' ? { distancia: 680 } : cosmos.objetivo(lejano.id); return o ? { d: o.distancia * ESCALA_CIELO * Math.max(1, Math.min(1.6, 0.95 / aspecto)) } : null; }
    if (id === 'hogar') return { d: encuadreHogar(aspecto).distancia };
    const d = DESTINOS.find(x => x.id === id); if (!d) return null;
    medirZonaLibre();
    // Punto de mira del lugar; en horizontal bajo (móvil girado) se aparta de la tarjeta, como al llegar.
    const mira = v3(d.posicion).add(v3(d.foco || [0, -15, 0])), base = d.distancia || 530;
    if (vista.alto < 620 && vista.ancho > vista.alto && vista.ancho <= 900) mira.addScaledVector(new THREE.Vector3().crossVectors(controls.target.clone().sub(camera.position), EJE_Y).normalize(), -base * 0.32);
    return { mira, d: distanciaDestino((d.distancia || 530) * (aspecto < 0.95 ? TAMANO_FIGURA[id] || 1 : 1), aspecto, fraccionZona) };
  }
  // Solo los vuelos que van al encuadre del destino (su llegada coincide con la distancia ideal
  // ±25 %) se corrigen al aterrizar; un vuelo a otra cosa (entrar en el sistema solar, acercarse
  // a la estrella antes de repetir) no se reescala con un encuadre que no es el suyo.
  function idealDelVuelo(llegada) { const d = distanciaIdeal()?.d; return d > 0 && Math.abs(llegada / d - 1) < 0.25 ? d : undefined; }
  const fijarEncuadre = () => { const n = distanciaIdeal(); encuadre = n ? { ...n, vw: vista.ancho, vh: vista.alto } : null; };
  function reencuadrar({ interfaz = false } = {}) {
    if (vuelo || !encuadre || tEntrada === null) return;
    if (interfaz) { if (gesto || ajuste || giro.moviendo || zoom.moviendo) return; }   // nunca contra un gesto, en plena inercia ni encima de otro ajuste
    else if (vista.ancho === encuadre.vw && Math.abs(vista.alto - encuadre.vh) / encuadre.vh < 0.2) return;
    medirZonaLibre(); const n = distanciaIdeal(); if (!n) return;
    if (interfaz && !cambioInterfazApreciable(encuadre.d, n.d)) return;
    const r = n.d / encuadre.d; encuadre = { ...n, vw: vista.ancho, vh: vista.alto };
    if (lejano) lejano.dist = n.d;
    const actual = camera.position.distanceTo(controls.target);
    if (!CERCA[destinoActual]) controls.minDistance *= r;
    controls.maxDistance = Math.max(controls.maxDistance * r, actual * r * 1.05);
    ajuste = { t: 0, desdeMira: controls.target.clone(), aMira: n.mira ? n.mira.clone() : controls.target.clone(), desdeD: actual, aD: actual * r };
    planificador.pedirCuadro();   // en pausa el bucle duerme: el ajuste necesita cuadros
  }
  // Cambios de interfaz sin redimensionar la ventana (una tarjeta que aparece o desaparece, otro
  // tamaño de texto, un panel): se observan las cajas que delimitan la franja libre.
  let esperaInterfaz = 0;
  if (typeof ResizeObserver === 'function') {
    const obs = new ResizeObserver(() => { clearTimeout(esperaInterfaz); esperaInterfaz = setTimeout(() => reencuadrar({ interfaz: true }), 320); });
    for (const sel of ['#titulo', '#lugar', '#ruta', '#cometa-aviso']) { const el = document.querySelector(sel); if (el) obs.observe(el); }
  }
  // Exportado para pruebas: cuánto mide el encuadre ahora y cuánto debería medir.
  const estadoEncuadre = () => ({ actual: camera.position.distanceTo(controls.target), ideal: distanciaIdeal()?.d ?? null, ajustando: !!ajuste });
  canvas.addEventListener('pointerdown', () => { if (mirada && !mirada.saliendo) mirarCasa(false); });
  // Inicio y fin de un gesto (giro propio o acercamiento con OrbitControls): despiertan la interfaz y esperan a que la
  // cámara se quede quieta para cambiar la resolución.
  const empezarGesto = () => { ajuste = null; gesto = true; marcarActividad(); controls.autoRotate = false; clearTimeout(retornoGiro); };
  const terminarGesto = () => { gesto = giro?.arrastrando ?? false; finGesto = performance.now(); marcarActividad(); retornoGiro = setTimeout(() => { if (!vuelo && !pausa && giraSolo()) controls.autoRotate = true; }, 8000); };
  controls.addEventListener('start', empezarGesto);
  // En los destinos lejanos no hay giro automático: daría vueltas todo el cielo alrededor.
  // La cámara no gira sola en ningún lugar: el cielo (telaraña, nubes, estrellas) se queda quieto mientras se mira;
  // solo se mueve cuando la mueve quien mira.
  const giraSolo = () => false;
  controls.addEventListener('end', terminarGesto);
  // El giro con el dedo o el ratón lo lleva util/giro.js (sigue al dedo, impulso real al soltar, frenado parejo);
  // OrbitControls queda solo para acercar y alejar.
  controls.enableRotate = false;
  const giro = crearGiro({ canvas, camera, controls, sensibilidad: controls.rotateSpeed, alEmpezar: empezarGesto, alTerminar: terminarGesto });
  // La rueda del ratón acerca y aleja con suavidad (util/zoom.js): antes cada paso se aplicaba de golpe en un cuadro.
  const zoom = crearZoom({ canvas, camera, controls, alGesto: () => { empezarGesto(); terminarGesto(); } });
  addEventListener('resize', () => { clearTimeout(esperaAjuste); esperaAjuste = setTimeout(reencuadrar, 220); nucleo.redimensionar(); regular.reiniciar(); planificador.pedirCuadro(); if (camera.view?.enabled) camera.setViewOffset(vista.ancho, vista.alto, 0, desplazamiento, vista.ancho, vista.alto); medirZonaLibre(); });
  document.addEventListener('visibilitychange', () => { prev = performance.now(); });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); delete canvas.dataset.viaje; suspendida = true; vuelo?.resolver(false); vuelo = null; alProblema('El navegador ha pausado los gráficos. Tu viaje está guardado. Podemos volver a encender las estrellas.'); });
  canvas.addEventListener('webglcontextrestored', () => { suspendida = false; prev = performance.now(); document.getElementById('problema-3d')?.setAttribute('hidden', ''); });

  const tmpDir = new THREE.Vector3(), tmpProy = new THREE.Vector3();   // temporales del bucle (sin crear objetos en cada cuadro)
  function animar(ahora) {
    requestAnimationFrame(animar);
    // Estados: con una carta o panel abiertos se conserva la última imagen sin trabajo 3D
    // (en todos los dispositivos); una postal pendiente siempre obtiene su cuadro.
    // Junto al cometa se sigue dibujando mientras se lee: se le ve alejarse con la carta abierta.
    const lecturaActiva = leyendo && !captura && destinoActual !== 'cometa';
    const estadoDibujo = lecturaActiva ? 'lectura' : 'activo';
    if (canvas.dataset.dibujo !== estadoDibujo) canvas.dataset.dibujo = estadoDibujo;
    // Mientras se ve la portada (opaca) el 3D no se dibuja: menos trabajo y calor al empezar.
    const reposo = document.hidden || suspendida || lecturaActiva || (tEntrada === null && !document.body.classList.contains('dentro') && !captura);
    // Motivo por el que se dibuja a ritmo de interacción (se informa en el diagnóstico).
    // La inercia del giro (y el final de un zoom) también son movimiento: a 60 hasta que se paran del todo. Antes, a los 4 s
    // sin tocar se pasaba a 30 aunque la vista siguiera deslizándose y el final del giro iba a frenitos.
    const motivo = vuelo ? 'vuelo' : gesto ? 'gesto' : giro.moviendo || zoom.moviendo ? 'inercia' : mirada && mirada.t < 1 ? 'mirada' : pulso > 0.02 ? 'pulso' : captura ? 'captura'
      : document.body.classList.contains('celebrando') || document.body.classList.contains('reuniendo') ? 'celebracion' : tEntrada !== null && tiempo - tEntrada < 12 ? 'entrada'
      : Math.abs(desplazamientoMeta - desplazamiento) > 0.5 ? 'encuadre' : '';
    const activo = !!motivo;
    const modo = planificador.decidir(ahora, { reposo, quieto: pausa && !vuelo && !captura, activo });
    if (modo === null) { if (reposo) prev = ahora; return; }
    if (modo !== modoAnterior) { regular.reiniciar(); modoAnterior = modo; canvas.dataset.ritmo = modo; }
    const motivoActual = modo === 'interaccion' ? motivo || 'reciente' : '';
    if (canvas.dataset.motivo !== motivoActual) canvas.dataset.motivo = motivoActual;
    const dtReal = Math.max(0, (ahora - prev) / 1000); prev = ahora;
    // En pausa completa el tiempo se congela: solo se redibuja la imagen.
    const dt = modo === 'quieto' ? 0 : Math.min(0.065, dtReal) * escalaTiempo;
    // Tiempo para los ajustes de CÁMARA, que deben resolverse también con el universo
    // congelado: no lleva `escalaTiempo` ni el cero de la pausa.
    const dtInterfaz = Math.min(0.065, dtReal);
    cuadrosDibujados++;
    const inicioCuadro = medir ? performance.now() : 0;
    tiempo += dt;
    if (tEntrada === null) {
      camera.position.x = Math.sin(tiempo * 0.025) * 400 - 2400;
      camera.lookAt(OBJETIVO);
    } else if (vuelo) {
      if (!pausa) {
        vuelo.real = (vuelo.real ?? vuelo.transcurrido) + dt;
        // Saltar el viaje: el resto del crucero se recorre en unos segundos (vuelo.js, saltar).
        if (vuelo.saltoPedido && vuelo.plan && vuelo.transcurrido >= vuelo.plan.ruptura[0]) { vuelo.salto = vuelo.plan.saltar(vuelo.transcurrido, movimientoReducido ? 1.5 : 2.5); vuelo.salto0 = vuelo.real - dt; vuelo.saltoPedido = false; }   // salto0: el instante del cuadro anterior (sin un cuadro quieto)
        vuelo.transcurrido = vuelo.salto ? vuelo.salto(vuelo.real - vuelo.salto0) : vuelo.transcurrido + dt;
      }
      const porcentaje = String(Math.min(100, Math.floor(vuelo.transcurrido / vuelo.duracion * 100))); if (!vuelo.fija && canvas.dataset.avance !== porcentaje) canvas.dataset.avance = porcentaje;
      const k = Math.min(1, vuelo.transcurrido / vuelo.duracion), lejos = vuelo.distanciaTotal > 20000 && !vuelo.fija;   // fija: recorrido contemplativo a ritmo uniforme
      if (vuelo.plan) {
        // Vuelo por fases: posición y mirada planificadas; las estelas siguen la fase. El perfil del viaje se termina de
        // preparar a trozos en estos primeros cuadros (antes se calculaba entero en el cuadro del clic: una pausa al pulsar).
        if (!vuelo.plan.listo) vuelo.plan.preparar(esMovil ? 3 : 2);
        const e = vuelo.plan.evaluar(vuelo.transcurrido);
        camera.position.copy(e.pos); controls.target.copy(e.mira); camera.lookAt(controls.target);
        vuelo.corriente = e.corriente; vuelo.fase = e.fase; if (canvas.dataset.fase !== e.fase) canvas.dataset.fase = e.fase; if (diagnosticar) canvas.dataset.recorrido = e.avance.toFixed(3);   // (solo para diagnóstico: cambiaba un atributo del lienzo en cada cuadro)
        const [r0, r1] = vuelo.plan.ruptura;
        if (e.fase === 'ruptura' && !vuelo.rupturaHecha) { vuelo.rupturaHecha = true; campoVelocidad.impulsar(); }
        // Dónde estamos: región, encuentro a la vista y distancia recorrida (para la interfaz y las pruebas).
        if (cuadrosDibujados % 6 === 0) informarViaje(e);
        campoVelocidad.ruptura(e.ruptura, THREE.MathUtils.clamp((vuelo.transcurrido - r0) / Math.max(1e-3, r1 - r0), 0, 1)); vuelo.rupturaValor = movimientoReducido ? 0 : e.ruptura;
        campoVelocidad.direccion(e.fase === 'ruptura' || e.fase === 'crucero' || e.fase === 'aproximacion' ? tmpDir.subVectors(vuelo.plan.recta.v2, vuelo.plan.recta.v1) : null);
        // Al romper, el campo de visión se abre un poco y vuelve en el crucero: sensación de aceleración.
        const fov = FOV_BASE + (movimientoReducido ? 0 : 9 * e.ruptura + 3 * (e.fase === 'crucero' ? 1 : 0) * Math.min(1, (vuelo.transcurrido - r1) / 1.5) * Math.max(0, 1 - e.avance * 1.1));
        if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
        actualizarMarca(e.fase, vuelo.centroDestino);
      } else {
      // En los saltos lejanos, primero la cámara se gira y fija el centro del destino (casi sin
      // moverse) y después sale disparada; si el camino se curva, el punto de fuga se desplaza
      // y las estelas se curvan con él.
      const giro = lejos && vuelo.corriente >= 1 ? Math.min(0.2, 2.4 / vuelo.duracion) : 0, kv = giro ? Math.max(0, (k - giro) / (1 - giro)) : k;
      const e = vuelo.avance ? vuelo.avance(k) : lejos ? avanceLogaritmico(kv, vuelo.distanciaTotal, vuelo.salida, vuelo.llegada) : vuelo.perfil ? PERFIL(k) : suave(k);
      const punto = vuelo.curva.getPointAt(Math.min(1, Math.max(0, e)));
      const desvio = vuelo.cometaInicio ? mundos.posicionCometa().sub(vuelo.cometaInicio) : null;
      if (desvio) punto.addScaledVector(desvio, e);
      if (Number.isFinite(punto.x)) camera.position.copy(punto);
      const destinoMirada = desvio ? vuelo.objetivo.clone().add(desvio) : vuelo.objetivo;
      controls.target.lerpVectors(vuelo.centroDesde, destinoMirada, Math.min(1, e * vuelo.mirarAntes));
      if (vuelo.perfil) {
        // La mirada pasa con suavidad al destino en el primer tercio y lo mantiene centrado
        // el resto del viaje (sin giros dramáticos ni mirar al vacío).
        controls.target.lerpVectors(vuelo.centroDesde, destinoMirada, giro ? THREE.MathUtils.smootherstep(k, 0, giro * 0.95) : THREE.MathUtils.smoothstep(k, 0, 0.22));
      }
      camera.lookAt(controls.target);
      }
      if (k >= 1) {
        delete canvas.dataset.viaje; delete canvas.dataset.fase; delete canvas.dataset.region; delete canvas.dataset.encuentro; delete canvas.dataset.distanciaMal; marca.classList.remove('activa'); campoVelocidad.ruptura(0, 0); campoVelocidad.direccion(null);
        if (camera.fov !== FOV_BASE) { camera.fov = FOV_BASE; camera.updateProjectionMatrix(); }
        const fin = vuelo; vuelo = null; controls.enabled = true; controls.autoRotate = !pausa && giraSolo();
        // Encuadres cercanos con límites propios: explorar sin entrar en superficies.
        controls.minDistance = CERCA[destinoActual] ?? (lejano ? lejano.dist * 0.3 : 300);
        controls.maxDistance = destinoActual === 'hogar' ? 14000 : lejano ? lejano.dist * 3 : 4200;
        controls.update(); fin.resolver(true); fin.alLlegar?.(); entradaResuelta = true; medirZonaLibre();
        fijarEncuadre(); ajuste = null;
        // Si la pantalla giró o cambió la interfaz DURANTE el vuelo, la curva llevó la cámara al
        // punto bueno para la situación anterior: se corrige con el mismo ajuste suave del giro en
        // reposo (conserva la órbita, solo cambia la distancia: no atraviesa ni reescala nada).
        const correccion = correccionAlLlegar({ vwVuelo: fin.vw, vhVuelo: fin.vh, vw: vista.ancho, vh: vista.alto,
          distanciaActual: camera.position.distanceTo(controls.target), distanciaIdeal: encuadre?.d, idealSalida: fin.idealSalida });
        if (correccion && fin.idealSalida) {
          ajuste = { t: 0, desdeMira: controls.target.clone(), aMira: encuadre?.mira ? encuadre.mira.clone() : controls.target.clone(), ...correccion };
          controls.maxDistance = Math.max(controls.maxDistance, correccion.aD * 1.05);
          controls.minDistance = Math.min(controls.minDistance, correccion.aD * 0.95);
        }
      }
    } else if (!pausa) {
      // Junto al cometa, la cámara viaja con él hasta el final de su recorrido (el resto del
      // universo se queda atrás). Cuando termina y se va, se vuelve al centro.
      if (destinoActual === 'cometa' && !mundos.cometaVisible) { cometaAntes = null; viajar('hogar', { duracion: 5 }); }
      else if (destinoActual === 'cometa') {
        const ahoraCometa = mundos.posicionCometa();
        if (cometaAntes) { const d = ahoraCometa.clone().sub(cometaAntes); camera.position.add(d); controls.target.add(d); }
        cometaAntes = ahoraCometa;
      } else cometaAntes = null;
      // Inercia de la cámara al soltar el dedo con tiempo real (como en los juegos): OrbitControls amortigua por cuadro;
      // el factor se ajusta a lo que ha durado este cuadro, así un cuadro más largo no frena el giro ni uno corto lo acelera.
      // OrbitControls (acercar/alejar) con su amortiguación ajustada al tiempo real; después, el giro propio (util/giro.js).
      if (!mirada) { controls.dampingFactor = 1 - Math.pow(1 - AMORTIGUACION, THREE.MathUtils.clamp(dtReal * 60, 0.25, 4)); controls.update(dt); }
      // Tope de 0,1 s (antes 0,05): tras un cuadro lento, la inercia avanza el tiempo que de verdad ha pasado (con un tope
      // menor se quedaba atrás y se notaba un frenito).
      giro.actualizar(Math.min(0.1, dtReal), !mirada && !vuelo, ahora);
      zoom.actualizar(Math.min(0.1, dtReal), !mirada && !vuelo);
    }
    if (ajuste && !vuelo) {
      // Mantiene la dirección actual de la cámara (su órbita) y cambia la distancia y el punto de mira.
      // El encuadre es interfaz, no animación del universo: avanza con tiempo real también en pausa.
      ajuste.t = Math.min(1, ajuste.t + dtInterfaz / 0.8); const s = THREE.MathUtils.smootherstep(ajuste.t, 0, 1);
      const dir = tmpDir.subVectors(camera.position, controls.target).normalize();
      controls.target.lerpVectors(ajuste.desdeMira, ajuste.aMira, s);
      camera.position.copy(controls.target).addScaledVector(dir, THREE.MathUtils.lerp(ajuste.desdeD, ajuste.aD, s)); camera.lookAt(controls.target);
      if (ajuste.t >= 1) ajuste = null;
      else planificador.pedirCuadro();   // en pausa el planificador solo dibuja a petición
    }
    actualizarMirada(dtInterfaz);
    pulso *= Math.exp(-dt * 4.3);
    ctx.pulso = pulso; ctx.tiempoDentro = tEntrada === null ? null : tiempo - tEntrada; ctx.destino = vuelo ? null : destinoActual;
    const distanciaCamara = camera.position.distanceTo(controls.target);
    // Tamaño de los puntos y símbolos de la galaxia según lo lejos que está la galaxia, no el
    // objetivo (al mirar hacia un destino lejano no deben hincharse).
    // Con el teleobjetivo de «Mirar hacia casa», casa se ve como desde su distancia APARENTE (la real dividida por el aumento):
    // corazón, nombre y estrellas como desde cerca (antes se apagaban por estar a millones de unidades).
    const aumentoTele = mirada ? Math.tan(FOV_BASE * Math.PI / 360) / Math.tan(camera.fov * Math.PI / 360) : 1;
    uScaleCasa.value = nucleo.uScale.value * aumentoTele;
    const distanciaGalaxia = (mirada ? camera.position.length() : Math.min(distanciaCamara, camera.position.length())) / aumentoTele;
    ctx.escala = escalaSimbolos(distanciaGalaxia);
    // Los símbolos de casa (su nombre, el corazón) son dedicatoria, no cuerpos del universo: se
    // leen desde casa y se desvanecen al alejarse (no se agrandan para seguir viéndose de lejos).
    ctx.simbolos = 1 - THREE.MathUtils.smoothstep(distanciaGalaxia, 4500, 9000);
    nucleo.uTamGalaxia.value = compensacionPuntos(distanciaGalaxia);
    // Precisión de profundidad local: no usar el mismo plano cercano para un jardín
    // y para un disco a millones de unidades (producía superficies que parpadeaban).
    // Se mide con lo que de verdad está cerca: el objetivo o la galaxia (y el Sol) en el origen.
    // Con solo el objetivo, al salir hacia un destino lejano el plano subía a miles de unidades
    // y recortaba la galaxia: parecía volverse transparente y desaparecer.
    // Y lo más cercano del universo (galaxias, nebulosas, cuerpos del cosmos): a mitad de un viaje de
    // 100 Mal el objetivo y Xiomara están a millones de unidades, pero una galaxia puede pasar a 3000.
    if (cuadrosDibujados % 4 === 0 || vuelo) cercaUniverso = cercaniaUniverso(camera.position);
    const cercaObjetivo = Math.max(0.5, Math.min(1e8, Math.max(1, Math.min(distanciaCamara, camera.position.length(), cercaUniverso)) * 0.002));
    escalaFondo = Math.max(1, cercaObjetivo * 1000 / (8400 * 1000));   // 8400 ×1000: radio de los soles del fondo
    if (Math.abs(camera.near - cercaObjetivo) > Math.max(0.01, cercaObjetivo * 0.03)) { camera.near = cercaObjetivo; camera.updateProjectionMatrix(); }
    aplicarDesplazamiento(dt);
    // El velo sigue al viaje: llega a su valor a la vez que la cámara al lugar.
    const reuniendo = document.body.classList.contains('reuniendo');
    const veloMeta = tEntrada === null ? 0 : Math.max(reuniendo ? 0.55 : 0, (VELO[destinoActual] ?? 0.3) * (vuelo ? Math.min(1, vuelo.transcurrido / vuelo.duracion * 1.4) : 1));
    // Jerarquía visual en los destinos lejanos: el velo no sirve (se dibuja después del propio
    // destino y lo oscurecería), así que las nebulosas que no son parte del destino bajan un poco su
    // brillo con suavidad; siguen ahí, con su forma y su color, pero no compiten con el protagonista.
    // Las nebulosas del catálogo se crean al acercarse: la lista se rehace de vez en cuando.
    if (!nubesFoco || cuadrosDibujados % 90 === 0) { nubesFoco = []; scene.traverse(o => { if (o.userData.volumen3D && !o.userData.brilloPropio && o.material.uniforms?.uBrillo) { o.userData.brilloBase ??= o.material.uniforms.uBrillo.value; nubesFoco.push({ o, base: o.userData.brilloBase }); } }); }
    const centroFoco = lejano && !vuelo ? lejano.centro : null, metaFoco = centroFoco ? 0.78 : 1;
    focoNubes += (metaFoco - focoNubes) * Math.min(1, dtInterfaz * 1.2);
    if (Math.abs(focoNubes - 1) > 0.001 || focoAplicado) {
      for (const n of nubesFoco) { const propia = centroFoco && n.o.getWorldPosition(tmpFoco).distanceTo(centroFoco) < 6000; n.o.material.uniforms.uBrillo.value = n.base * (propia ? 1 : focoNubes); }
      focoAplicado = Math.abs(focoNubes - 1) > 0.001;
    }
    const u = velo.material.uniforms.uVelo; u.value += (veloMeta - u.value) * Math.min(1, dt * 2.2);
    // Corriente: su fuerza sigue la velocidad de la cámara durante el vuelo.
    const rapidez = dt > 0 ? camera.position.distanceTo(camaraAntes) / dt : 0;
    // Avance o retroceso (zoom con la rueda o el pellizco): también se siente la velocidad.
    camera.getWorldDirection(adelanteCamara);
    movimiento.copy(camera.position).sub(camaraAntes);
    const radial = dt > 0 ? (distanciaAnterior-distanciaCamara)/dt : 0;
    distanciaAnterior=distanciaCamara;
    ctx.velocidadPolvo.copy(movimiento).divideScalar(Math.max(dt, 1e-3));
    if (!vuelo) ctx.velocidadPolvo.copy(adelanteCamara).multiplyScalar(radial);   // solo cuenta acercarse o alejarse
    camaraAntes.copy(camera.position);
    camera.updateMatrixWorld();
    campoVelocidad.actualizar(dt,{vuelo,radial,ceremonia:document.body.classList.contains('supernova-en-escena') && cosmos.supernova.estado!=='remanente' && !(cosmos.supernova.desdeEstallido>=19),entrada:tEntrada!==null});
    velo.visible = u.value > 0.004;
    // El fondo (nebulosas, galaxias, estrellas lejanas) acompaña siempre a la cámara: está
    // infinitamente lejos y se ve igual desde cualquier punto. Solo lo que se visita (cosmos:
    // soles, púlsar, cuásar, agujeros, supernova) se queda quieto en los viajes lejanos.
    acompanar();
    // Los cuerpos visitables tienen coordenadas fijas. El fondo óptico puede seguir
    // a la cámara, pero una supernova o un agujero no se recolocan durante el regreso.
    giroSuave += ((controls.autoRotate ? 1 : 0) - giroSuave) * Math.min(1, dt * 0.7);
    controls.autoRotateSpeed = giroBase * giroSuave;
    ctx.lejano = lejano ? lejano.id : null;
    // Exposición automática (como en los juegos): la luz que se suma (telaraña, polvo) tiene puntos de tamaño fijo en
    // pantalla; al alejar la cámara de un gigante más allá de su encuadre normal (el del PC), se amontonan y se
    // quemaban en blanco, sobre todo en el móvil (pantalla vertical: la cámara ya está más lejos). Más allá de esa
    // distancia la luz se compensa; en el encuadre normal del PC no cambia nada.
    // En vertical (móvil) la misma luz cabe en menos pantalla: base 1/1,6 siempre (también en los viajes, en casa y al
    // mirar hacia casa). Junto a un gigante, además, se compensa al alejar más del doble de su encuadre normal.
    const marco = Math.max(1, Math.min(1.6, 0.95 / camera.aspect));
    // Calibrado con capturas de un iPhone real (se veía más brillante que en el emulador, con más resplandor): en
    // vertical la luz que se suma va a 0,45 en todo momento (gigantes, viajes de ida y vuelta, casa).
    let metaExpo = THREE.MathUtils.lerp(1, 0.45, (marco - 1) / 0.6);   // 1 en horizontal, 0,45 en un móvil vertical
    // De viaje la cámara pasa junto a los filamentos (y entre los gigantes cruza el centro de la telaraña): en vertical, algo menos.
    if (vuelo && marco > 1) metaExpo *= 0.75;
    // Sin HDR (búferes de 8 bits) la luz sumada se satura antes: algo menos.
    if (canvas.dataset.brillo3d === 'sin-brillo') metaExpo *= 0.6;
    if (lejano && !vuelo) {
      const d = camera.position.distanceTo(lejano.centro);
      metaExpo *= marco > 1 ? THREE.MathUtils.clamp(Math.pow(lejano.dist / Math.max(1, d), 0.8), 0.3, 1) : THREE.MathUtils.clamp(lejano.dist * 2 / Math.max(1, d), 0.5, 1);   // en vertical, desde el encuadre normal
    }
    exposicion += (metaExpo - exposicion) * Math.min(1, dt * 4); ctx.exposicion = EXPOSICION.value = exposicion;
    // Estrellas locales: las del cielo de casa (campo titilante, soles y cometas de decoración) son de
    // Xiomara y su vecindad. Lejos de ella y de la Vía Láctea casi desaparecen: en el espacio
    // intergaláctico el cielo es oscuro y lo que brilla son galaxias (luces no resueltas del catálogo).
    const locales = Math.max(1 - THREE.MathUtils.smoothstep(camera.position.length(), 9000, 70000), 1 - THREE.MathUtils.smoothstep(camera.position.distanceTo(centroVia), 3000, 32000));
    if (Math.abs(locales - estrellasLocales) > 0.004) {
      estrellasLocales = locales; const f = 0.08 + 0.92 * locales; cieloProfundo.fijar(1 - locales);
      estrellas.intensidad(f); scene.backgroundIntensity = 0.5 * (0.3 + 0.7 * locales);
      // Los soles del cielo son masivos: siguen viéndose (algo más tenues) desde el cuásar, el púlsar o la supernova.
      const fs = 0.55 + 0.45 * locales;
      cosmos.decor.traverse(o => { for (const m of [].concat(o.material || [])) { if (m.uniforms?.uOpacidad) { m.userData.base ??= m.uniforms.uOpacidad.value; m.uniforms.uOpacidad.value = m.userData.base * fs; } else if (m.opacity !== undefined) { m.userData.base ??= m.opacity; m.opacity = m.userData.base * fs; } } });
      cosmos.decor.visible = true; canvas.dataset.estrellasLocales = locales.toFixed(2);
    }
    // En el sistema solar (Rosa, Azul, las cartas) solo se dibuja su escena: las piezas del universo principal no trabajan
    // (antes se actualizaban en cada cuadro sin verse). Los mundos sí: el correo de la luna vive allí.
    for (const p of partes) if (escenaActiva !== 'solar' || p === mundos) p.actualizar(tiempo, dt, ctx);
    // Lejos de casa (en los gigantes y en los viajes largos) lo de casa es un punto invisible: frases, el corazón de luz,
    // los lugares y el agujero negro de casa no se dibujan (la galaxia de Xiomara se queda como su punto de luz). Con
    // «Mirar hacia casa» (teleobjetivo) se vuelven a ver.
    const casaVisible = camera.position.length() < 600000 || !!mirada;
    for (const o of raicesCasa) o.visible = casaVisible;
    // Los gigantes que no se visitan y desde aquí miden menos de ~3 px no dibujan su detalle (en un móvil cada uno costaba
    // varios FPS siendo un puntito); sus luces en el cielo se quedan. Al acercarse, vuelven enteros.
    if (cuadrosDibujados % 10 === 0) {
      gruposGigantes ??= (() => { const raizC = scene.children.find(o => o.userData.capa === 'cosmos'), w = new THREE.Vector3(), l = [];
        for (const g of raizC?.children ?? []) { if (!g.isGroup) continue; g.getWorldPosition(w); const c = cosmos.cuerpos().find(c => c.id !== 'xiomara' && c.centro.distanceTo(w) < c.radio * 4); if (c) l.push({ g, c }); }
        return l; })();
      const focal = vista.alto / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      // Con histéresis (aparece a 3,5 px y se oculta a 2,5): en el umbral parpadeaba y la GPU daba saltos.
      for (const { g, c } of gruposGigantes) { const px = c.visible * focal / Math.max(1, camera.position.distanceTo(c.centro)); g.visible = c.id === destinoActual || !!mirada || px > (g.visible ? 2.5 : 3.5); }
    }
    cieloProfundo.actualizar?.();
    planetas.actualizar(tiempo, dt, ctx); solar.actualizar(tiempo, camera);
    {
      const sn = cosmos.supernova, c = sn.grupo.getWorldPosition(luzCorazon.position), f = vista.alto / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      const px = SEMIEJES_CORAZON[0] / Math.max(1, c.distanceTo(camera.position)) * f, fundido = 1 - THREE.MathUtils.smoothstep(px, 4, 12);
      const comprime = Math.pow(Math.max(1, 1.5 / Math.max(px, 0.02)), 1.0);   // GAMMA_LUZ = 0,5 (campoGalaxias.js)
      uLuzCorazon.value = sn.estado === 'remanente' ? fundido * Math.min(4, 0.16 * 4 * px * px * comprime / (0.1678 * 16)) : 0;
      luzCorazon.visible = uLuzCorazon.value > 0.002;
      // Faro de la estrella: tamaño angular fijo de lejos (diámetro ≈ 3,5°), se apaga al verse ya la estrella grande.
      const d = Math.max(1, c.distanceTo(camera.position)), pxEstrella = RADIO_ESTRELLA / d * f, estable = sn.estado === 'estable' || sn.estado === 'inestable';
      const kFaro = estable ? 1 - THREE.MathUtils.smoothstep(pxEstrella, 6, 40) : 0;
      faroEstrella.visible = kFaro > 0.003;
      if (faroEstrella.visible) { faroEstrella.position.copy(c); const lat = 1 + Math.sin(tiempo * 1.3) * 0.05; faroRayos.scale.setScalar(d * 0.16 * lat); faroHalo.scale.setScalar(d * 0.09); faroRayos.material.opacity = kFaro; faroHalo.material.opacity = 0.55 * kFaro; }
    }
    // Las marcas de casa (el sistema solar) son interfaz de casa: lejos de Xiomara no se dibujan.
    marcaSolar.visible = camera.position.length() < 20000;
    if (escenaActiva === 'principal') { marcaSolar.position.copy(galaxia.puntoBrazo()); const lat = 1 + Math.sin(tiempo * 2.2) * 0.18; brilloMarca.scale.setScalar(70 * lat); destelloMarca.material.rotation = tiempo * 0.2; }
    // El destello de la supernova ilumina la pantalla si se está mirando hacia ella.
    let flash = cosmos.supernova.destello;
    if (flash > 0.001) { proyectado.copy(cosmos.supernova.grupo.position).multiplyScalar(cosmos.raiz.scale.x).add(cosmos.raiz.position).project(camera); flash *= proyectado.z < 1 ? Math.max(0, 1 - Math.hypot(proyectado.x, proyectado.y) * 0.45) : 0; }
    // La ruptura del salto también se siente en el brillo: un golpe breve de luz (sin pantalla blanca).
    bloom.strength = BRILLO_BASE + pulso * 0.22 + flash * 1.4 + (vuelo?.rupturaValor ?? 0) * 0.55;
    // La luz anuncia aceleración y llegada, sin desplazar ni desenfocar un píxel.
    if (nucleo.salto) {
      nucleo.salto.uniforms.uFuerza.value = 0;
      nucleo.salto.uniforms.uFlash.value = 0;
      nucleo.salto.uniforms.uAspecto.value = camera.aspect;
      const e = cosmos.supernova.desdeEstallido;
      const ceremonia = document.body.classList.contains('supernova-en-escena');
      const penumbra = ceremonia ? (cosmos.supernova.estado === 'inestable' ? 0.65 : e !== null ? 0.65 * (1-THREE.MathUtils.smoothstep(e,3,12)) : 0) : 0;
      nucleo.salto.uniforms.uPenumbra.value = penumbra;
      // La penumbra se dibuja con CSS (#supernova-amor::before): esta pasada, antes del brillo,
      // dejaba bloques grises en los bordes.
      nucleo.salto.enabled = false;
    }
    // Lente gravitacional en pantalla para Sagitario A* y TON 618 (solo si se ven).
    if (nucleo.lente) {
      const u = nucleo.lente.uniforms, tanMedio = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      let alguna = false;
      // La lente depende de la geometría, no del destino elegido: se activa si el agujero se ve y
      // su zona curvada ocupa algo apreciable de la pantalla. La lente deforma la imagen ya
      // dibujada (sin profundidad): si un cuerpo más cercano se solapa con esa zona, se suspende
      // para no curvar el primer plano (límite documentado en docs/ESCALA-Y-ESPACIO.md).
      if (!cuerposLente || tiempo - cuerposLente.t > 1) cuerposLente = { t: tiempo, lista: cosmos.cuerpos() };
      cosmos.lentes().forEach((l, i) => {
        const dist = l.centro.distanceTo(camera.position); proyectado.copy(l.centro).project(camera);
        const rDentro = l.dentro / (2 * dist * tanMedio), alcance = rDentro * l.alcance;
        // Cuánto queda libre la zona curvada: 1 sin nada delante; baja con suavidad hasta 0 a
        // medida que un cuerpo más cercano se solapa con ella (antes se apagaba de golpe).
        let libre = 1;
        for (const c of cuerposLente.lista) {
          const dc = c.centro.distanceTo(camera.position); if (dc >= dist - c.visible || c.centro.distanceTo(l.centro) < 1) continue;
          const p = tmpProy.copy(c.centro).project(camera); if (p.z > 1) continue; const rc = c.visible / (2 * dc * tanMedio);   // lo que tapa: su extensión visible densa
          const sep = Math.hypot((p.x - proyectado.x) * camera.aspect, p.y - proyectado.y) / 2;
          libre = Math.min(libre, THREE.MathUtils.smoothstep(sep, rc + alcance * 0.4, rc + alcance * 1.6));
        }
        // Y entra con suavidad según su tamaño en pantalla (antes, umbral fijo).
        // Y se desvanece al salir de la pantalla (antes se cortaba de golpe al cruzar el límite).
        const fuera = (1 - THREE.MathUtils.smoothstep(Math.abs(proyectado.x), 1 + alcance * 1.5, 1 + alcance * 4)) * (1 - THREE.MathUtils.smoothstep(Math.abs(proyectado.y), 1 + alcance * 0.8, 1 + alcance * 2));
        const peso = libre * THREE.MathUtils.smoothstep(rDentro, 0.004, 0.009) * fuera;
        const visible = peso > 0.001 && proyectado.z < 1;
        if (visible) { u.uL.value[i].set((proyectado.x + 1) / 2, (proyectado.y + 1) / 2, rDentro, peso * l.fuerza / (2 * dist * tanMedio)); u.uF.value[i].set(alcance, alcance * 0.55); alguna = true; }
        else u.uL.value[i].set(0, 0, 0, 0);
      });
      u.uAspecto.value = camera.aspect; nucleo.lente.enabled = alguna;
    }
    // Respiración y temblor del estallido: desplazamientos temporales solo para este cuadro.
    respira = 0;   // sin respiración: la cámara quieta no se acerca, aleja ni balancea (el cielo no se mueve al mirar)
    const temporal = respira > 0.001 || flash > 0.05;
    if (temporal) {
      camaraGuardada.pos.copy(camera.position); camaraGuardada.rot.copy(camera.quaternion);
      const dist = haciaObjetivo.copy(controls.target).sub(camera.position).length();
      haciaObjetivo.normalize();
      camera.position.addScaledVector(haciaObjetivo, Math.sin(tiempo * 0.22) * dist * 0.014 * respira);
      camera.position.y += Math.sin(tiempo * 0.13 + 1.1) * dist * 0.006 * respira;
      // La onda del estallido sacude un poco la cámara.
      if (flash > 0.05 && !movimientoReducido) { const fuerzaTemblor = flash * 0.012; camera.rotateX((Math.random() - 0.5) * fuerzaTemblor); camera.rotateY((Math.random() - 0.5) * fuerzaTemblor); }
      camera.updateMatrixWorld();
      // El cielo infinitamente lejano (soles, estrellas, cometas, galaxias, nebulosas) va con la
      // cámara tal como se dibuja: si no, la respiración lo hacía acercarse, alejarse y moverse.
      acompanar();
    }
    if (escenaActiva !== 'solar') { capaVolumen.dibujar(camera); telarana.dibujarGalaxias(renderer, camera); }   // capas a menor resolución: gas volumétrico (capaVolumen.js) y galaxias de la telaraña (telarana.js)
    seguirLuces(); inclinarCasa();
    try { if (document.body.dataset.supernovaAislada === 'true') conFocoSupernova(scene, cosmos.raiz, cosmos.supernova.grupo, () => composer.render()); else composer.render(); } catch (e) { suspendida = true; alProblema('No se ha podido dibujar el universo. Conservamos tu progreso; vuelve a intentarlo en 3D.'); console.error(e); }
    // El sistema solar se prepara (shaders y texturas) en un momento tranquilo tras la entrada,
    // no durante la carga: así se entra antes y el móvil trabaja menos al principio.
    if (!solarPreparado && tEntrada !== null && tiempo - tEntrada > 9 && !vuelo) {
      solarPreparado = true;
      const preparar = () => { (paralela ? renderer.compileAsync(solar.escena, camera) : Promise.resolve(renderer.compile(solar.escena, camera))).catch(() => {}).then(() => subirTexturas(solar.escena)); };
      (window.requestIdleCallback || (f => setTimeout(f, 300)))(preparar);
    }
    restaurarCasa();
    if (temporal) { camera.position.copy(camaraGuardada.pos); camera.quaternion.copy(camaraGuardada.rot); camera.updateMatrixWorld(); }
    if (captura) { const pendiente = captura; captura = null; clearTimeout(pendiente.timer); pendiente.resolver(renderer.domElement); }
    // La resolución dinámica mide a 60 FPS: en interacción y, ahora que el reposo también va a 60, en reposo.
    if ((modo === 'interaccion' || (modo === 'contemplacion' && !ritmoAhorro)) && tEntrada !== null && entradaResuelta && dtReal < 0.5) regularResolucion(dtReal * 1000);
    if (medir && tEntrada !== null && entradaResuelta) {
      cuadros++; acumulado += dtReal; coste += performance.now() - inicioCuadro;
      if (acumulado > 4) {
        canvas.dataset.fps = (cuadros / acumulado).toFixed(1);
        canvas.dataset.cpuMs = (coste / cuadros).toFixed(2);
        canvas.dataset.texturas = String(renderer.info.memory.textures);
        cuadros = 0; acumulado = 0; coste = 0;
      }
    }
  }
  requestAnimationFrame(animar);
  return {
    listo,
    iniciar(destino = 'hogar', { duracion = 7 } = {}) { if (tEntrada !== null) return; tEntrada = tiempo; return viajar(destino, { duracion }); },
    actividad: marcarActividad,
    pedirCuadro: () => planificador.pedirCuadro(),
    // Para el medidor ?hud: programas de GPU compilados, geometrías y texturas en la GPU y frecuencia medida de la pantalla.
    get rendimiento() { const i = renderer.info; return { programas: i.programs?.length ?? 0, geometrias: i.memory.geometries, texturas: i.memory.textures, hz: planificador.hz }; },
    get cuadrosDibujados() { return cuadrosDibujados; },
    viajar,
    cancelarViaje() { delete canvas.dataset.viaje; vuelo?.resolver(false); vuelo = null; limpiarVuelo(); controls.enabled = true; controls.autoRotate = false; },
    // Saltar el resto del crucero (se recorre en unos segundos y se llega con la aproximación normal).
    saltarViaje() { if (!vuelo?.plan) return false; if (vuelo.salto || vuelo.transcurrido >= vuelo.plan.tiempos.aproximacion[0] - 0.5) return false; vuelo.saltoPedido = true; return true; },
    get viajeBreve() { return viajeBreve; },
    set viajeBreve(v) { viajeBreve = !!v; try { localStorage.setItem('xiomara:viaje-breve', viajeBreve ? '1' : '0'); } catch {} },
    mirarCasa: activar => mirarCasa(activar),
    get mirandoCasa() { return !!mirada && !mirada.saliendo; },
    get lejosDeCasa() { return camera.position.length() > 15000; },
    volver: () => viajar('hogar'),
    pausar(valor) { pausa = valor; controls.autoRotate = !valor && !vuelo && giraSolo(); planificador.pedirCuadro(); },
    // Quieta la cámara sin congelar el tiempo (la celebración sigue animándose).
    detenerGiro(valor) { controls.autoRotate = !valor && !pausa && !vuelo && giraSolo(); },
    // Solo en #debug: acceso a la escena para vistas de diagnóstico por capas.
    get interno() { return diagnosticar ? { THREE, scene, camera, controls, renderer, bloom, nucleo, telarana, capaVolumen, cosmos, galaxia, planetas, solar, get escenaActiva() { return escenaActiva; }, lento: v => { escalaTiempo = v; }, get encuadre() { return estadoEncuadre(); }, get tiempo() { return tiempo; }, get estelas() { return campoVelocidad.mesh.material.uniforms.uFuerza.value; }, nube: { MUESTRAS: muestrasNube }, get curvaVuelo() { return vuelo ? { curva: vuelo.curva, desde: vuelo.curva.getPoint(0), hasta: vuelo.curva.getPoint(1), duracion: vuelo.duracion, transcurrido: vuelo.transcurrido, real: vuelo.real ?? vuelo.transcurrido, plan: vuelo.plan } : null; }, lejanas, cercania: cercaniaUniverso, get lente() { return { activa: nucleo.lente.enabled, uL: nucleo.lente.uniforms.uL.value.map(v => v.toArray()) }; } } : null; },
    get destino() { return destinoActual; },
    get viajando() { return !!vuelo; },
    get cometaVisible() { return mundos.cometaVisible; },
    get supernovaActiva() { return cosmos.supernovaActiva; },
    get estadoSupernova() { return cosmos.supernova.estado; },
    get supernovaQuiereEstallar() { return cosmos.supernova.quiereEstallar; },
    aplazarSupernova: s => cosmos.supernova.aplazar(s),
    // El remanente es un lugar duradero, no un evento que desaparece al volver a casa.
    recordarSupernova() { cosmos.supernova.recordar(); },
    async encuadrarSupernova() {
      if (!lejano || lejano.id !== 'supernova') return false;
      cosmos.supernova.orientar();
      const { posicion, objetivo, distancia } = encuadreCorazon();
      lejano.dist = distancia;
      controls.maxDistance = Math.max(controls.maxDistance, distancia * 1.4);
      const ok = await desplazar(posicion, objetivo, movimientoReducido ? 2 : 7.5, undefined, { corriente: 0 });
      if (destinoActual === 'supernova') controls.autoRotate = false;
      return ok;
    },
    async verEstallido({ repetir = false, alFase = () => {} } = {}) {
      if (!lejano || lejano.id !== 'supernova' || vuelo) return false;
      const sn = cosmos.supernova;
      if (repetir) {
        sn.reiniciar(); alFase('encuentro');
        const c = lejano.centro, dir = camera.position.clone().sub(c).normalize();
        const dist = cosmos.objetivo('supernova').distancia * ESCALA_CIELO * Math.max(1, Math.min(1.6, 0.95 / camera.aspect));
        lejano.dist = dist;
        const ok = await desplazar(c.clone().addScaledVector(dir, dist), c, movimientoReducido ? 2 : 4, undefined, { corriente: 0 });
        if (!ok || destinoActual !== 'supernova') return false;
        controls.autoRotate = false;
      }
      const espera = sn.preparar({ repetir });
      if (espera < 0) return false;
      // La interfaz serializa las repeticiones; los cambios de destino cancelan.
      const inicio = sn;
      let ultima = '', retrayendo = false; const t0Estallido = performance.now();
      return new Promise(resolve => {
        const seguir = () => {
          if (destinoActual !== 'supernova' || cosmos.supernova !== inicio) { resolve(false); return; }
          if (!document.hidden) {
            const fase = sn.fase;
            if (fase !== ultima) { ultima = fase; alFase(fase); }
            // Se aleja durante los últimos latidos (≈ 3 s antes): la bola de fuego se ve crecer desde fuera.
            if (!retrayendo && (sn.desdeEstallido !== null || fase === 'silencio' || performance.now() - t0Estallido > (espera - 7) * 1000)) {
              retrayendo = true;
              const { posicion, objetivo, distancia } = encuadreCorazon('lugar');   // el mismo encuadre que al llegar: al terminar no hay saltos
              lejano.dist = distancia;   // los límites del zoom al llegar son los del remanente, no los de la estrella
              controls.maxDistance = Math.max(controls.maxDistance, distancia * 1.4);
              desplazar(posicion, objetivo, movimientoReducido ? 2 : 4.5, undefined, { corriente: 0 }).then(() => { if (destinoActual === 'supernova') controls.autoRotate = false; });
            }
            if (fase === 'recuerdo' && !vuelo) { resolve(true); return; }
          }
          requestAnimationFrame(seguir);
        };
        seguir();
      });
    },
    posicionCometa: () => mundos.posicionCometa(),
    besar() { pulso = 1; planificador.pedirCuadro(); },
    constelar() { mundos.constelar(); },
    elegirConstelacion: (id, reiniciar) => mundos.elegirConstelacion(id, reiniciar),
    cumplirSuenos: ids => mundos.cumplirSuenos(ids),
    unirNodo: i => mundos.unirNodo(i),
    get unidas() { return mundos.unidas; },
    get constelada() { return mundos.constelada; },
    probarToque(x, y) {
      if (vuelo) return null;
      const enSolar = escenaActiva === 'solar';
      // Solo cuenta lo que hay en la escena que se ve (la principal o el sistema solar).
      const mundo = mundos.probarToque(x, y, camera); if (mundo && !(mundo.id && SOLARES.has(mundo.id) !== enSolar) && !(enSolar && mundo.tipo !== 'destino')) return mundo;
      ndc.set(x / vista.ancho * 2 - 1, 1 - y / vista.alto * 2); ray.setFromCamera(ndc, camera);
      if (enSolar) { const hit = ray.intersectObjects(planetas.objetos, false)[0]; if (hit) return { tipo: 'destino', id: hit.object.userData.destino }; }
      else { const estrella = secretas.probarToque(x, y); if (estrella >= 0) return { tipo: 'estrella', id: estrella }; }
      const cercano = destinoCercano(x, y);
      return cercano ? { tipo: 'destino', id: cercano } : null;
    },
    // Acción característica de cada lugar: un movimiento de cámara que cuenta algo antes
    // de abrir su contenido. Devuelve una promesa que se resuelve al terminar.
    accion(id) {
      if (vuelo || id !== destinoActual) return Promise.resolve(false);
      if (lejano && lejano.id === id) {
        // Una vuelta lenta alrededor del objeto lejano, subiendo y bajando un poco.
        const c = lejano.centro, desdeC = camera.position.clone().sub(c), r = desdeC.length();
        const paso = [1, 2, 3, 4, 5, 6, 7, 8].map(k => c.clone().add(desdeC.clone().applyAxisAngle(EJE_Y, k * Math.PI / 4)).add(new THREE.Vector3(0, Math.sin(k * Math.PI / 4) * r * 0.22, 0)));
        return desplazar(paso.pop(), c, 14, undefined, { paso, mirarAntes: 1, corriente: 0 });
      }
      const d = DESTINOS.find(x => x.id === id); if (!d) return Promise.resolve(false);
      const centro = v3(d.posicion), aqui = camera.position.clone(), dir = aqui.clone().sub(centro).normalize();
      const en = (dist, giro = 0, alto = 0) => centro.clone().add(dir.clone().applyAxisAngle(EJE_Y, giro).multiplyScalar(dist)).add(new THREE.Vector3(0, alto, 0));
      if (id === 'azul') {
        // Rodar con su luna: la cámara la acompaña media órbita alrededor del planeta.
        const paso = [1, 2, 3, 4, 5].map(k => { const l = planetas.lunaAzulEn(k * 1.5); return l.add(l.clone().sub(centro).normalize().multiplyScalar(105)).add(new THREE.Vector3(0, 28, 0)); });
        return desplazar(aqui, centro, 9, undefined, { paso, mirarAntes: 1, corriente: 0 });
      }
      if (id === 'capsulas') return desplazar(en(CERCA.capsulas + 25, 0.5, 30), centro, 3.6, undefined, { paso: [en(330, 0.9, 90)], corriente: 0 });
      if (id === 'rosa') return desplazar(en(290, -0.35, 60), centro, 3.4, undefined, { corriente: 0 });
      if (id === 'suenos') { mundos.florecer(); return desplazar(en(330, 0.4, -10), centro.clone().add(new THREE.Vector3(0, -20, 0)), 3.8, undefined, { corriente: 0 }); }
      if (id === 'calma') return desplazar(en(360, 0.25, -40), centro.clone().add(new THREE.Vector3(0, -30, 0)), 6, undefined, { corriente: 0 });
      if (id === 'constelacion') return desplazar(en(480), centro, 3, undefined, { corriente: 0 });
      return Promise.resolve(true);
    },
    // El faro del cuásar: recorrido de cámara por fases ('inicio', 'arco', 'chorros', 'final'), siempre
    // por fuera: a la distancia de llegada y lejos del eje de los chorros (elevación 20–32° sobre el
    // plano del disco), sin cruzar la sombra, el disco, el anillo ni los chorros. Con movimiento
    // reducido la cámara no se mueve. Devuelve una promesa (false si se interrumpe).
    faro(fase) {
      if (vuelo || destinoActual !== 'cuasar' || !lejano || lejano.id !== 'cuasar') return Promise.resolve(false);
      if (movimientoReducido) return Promise.resolve(true);
      const c = lejano.centro, R = lejano.dist, g = Math.PI / 180;
      if (fase === 'inicio' || !faroBase) {
        const n = cosmos.ejeCuasar(), rel = camera.position.clone().sub(c);
        const u = rel.clone().projectOnPlane(n); if (u.lengthSq() < 1e-6) u.copy(new THREE.Vector3(1, 0, 0).projectOnPlane(n)); u.normalize();
        faroBase = { u, w: n.clone().cross(u).normalize(), n, lado: Math.sign(rel.dot(n)) || 1 };
      }
      const b = faroBase, en = (az, el, k = 1) => c.clone().addScaledVector(b.u, Math.cos(el * g) * Math.cos(az * g) * R * k).addScaledVector(b.w, Math.cos(el * g) * Math.sin(az * g) * R * k).addScaledVector(b.n, b.lado * Math.sin(el * g) * R * k);
      const ir = (puntos, s) => { const fin = puntos.pop(); return desplazar(fin, c, s, undefined, { paso: puntos, mirarAntes: 1, corriente: 0, fija: true }); };
      if (fase === 'inicio') return ir([en(0, 30, 1.04)], 4.5);
      if (fase === 'arco') return ir([20, 40, 60, 80, 100].map(a => en(a, 30 - a * 0.06, 1.04 - a * 0.0004)), 10);
      if (fase === 'chorros') return ir([en(108, 24, 1), en(118, 23, 0.99)], 7.5);
      if (fase === 'final') return ir([en(128, 25, 0.98), en(138, 27, 0.97)], 5.5);
      return Promise.resolve(false);
    },
    faroAcento: v => cosmos.acentoCuasar(v),
    olvidarFaro() { faroBase = null; cosmos.acentoCuasar(-1); },
    // Segunda y tercera pista: iluminar la zona y acercar la cámara a ella (sin la estrella).
    zonaPista(i) { return !!secretas.iluminarZona(i); },
    acercarZona(i) {
      const c = secretas.centroZona(i); if (!c) return Promise.resolve(false);
      secretas.iluminarZona(i); soltarCielo(); destinoActual = 'hogar'; mundos.enfocar('hogar'); alViajar('hogar');
      // La estrella queda en el centro de la pantalla, a media distancia, con su onda.
      const fuera = c.clone().setY(0).normalize();
      return desplazar(c.clone().add(fuera.multiplyScalar(distanciaEncuadre(560))).add(new THREE.Vector3(0, 300, 0)), c, 4.4);
    },
    async pista(i) {
      const pos = secretas.posicion(i); if (!pos) return false;
      secretas.senalar(i); soltarCielo(); destinoActual = 'hogar'; mundos.enfocar('hogar'); alViajar('hogar');
      return desplazar(pos.clone().add(new THREE.Vector3(50, 150, distanciaEncuadre(410))), pos, 4.2);
    },
    posicionEstrella: i => secretas.posicion(i),
    dondeEstrella(i) {
      const v = secretas.posicion(i); if (!v) return null; v.project(camera);
      return { x: (v.x + 1) / 2 * vista.ancho, y: (1 - v.y) / 2 * vista.alto, visible: v.z > -1 && v.z < 1 };
    },
    dondeNodo(i) {
      const nodos = scene.getObjectsByProperty('isSprite', true).find(s => s.userData.nodo === i);
      if (!nodos) return null;
      const v = nodos.getWorldPosition(new THREE.Vector3()).project(camera);
      return { x: (v.x + 1) / 2 * vista.ancho, y: (1 - v.y) / 2 * vista.alto };
    },
    marcarEstrella: i => { secretas.marcar(i); pulso = 1; },
    reunirEstrellas: indices => secretas.reunir(indices),
    encenderEstrella: i => { secretas.encender(i); pulso = Math.max(pulso, 0.4); },
    reiniciarEstrellas() { secretas.reiniciar(); },
    actualizarEstrellas(cantidad, encontradas) {
      const indice = partes.indexOf(secretas); secretas.destruir();
      secretas = capa('secretas', () => crearEstrellasSecretas(nucleoCasa, cantidad, encontradas)); partes[indice] = secretas;
    },
    capturar() {
      if (suspendida || document.hidden) return Promise.reject(new Error('Vuelve al universo para guardar la postal.'));
      // Resolución máxima con presupuesto de memoria; se restaura en éxito, error o tiempo agotado.
      return capturador(resolucionPostal(vista.ancho, vista.alto, nucleo.prMaximo), () => new Promise((resolve, reject) => {
        const timer = setTimeout(() => { captura = null; reject(Error('La postal no pudo terminarse. Vuelve al universo e inténtalo otra vez.')); }, 6000);
        captura = { timer, resolver: canvas => {
          try { const copia = document.createElement('canvas'); copia.width = canvas.width; copia.height = canvas.height; copia.getContext('2d').drawImage(canvas, 0, 0); resolve(copia); }
          catch (e) { reject(e); }
        } };
        planificador.pedirCuadro();
      }));
    }
  };
}
