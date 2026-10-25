// Prepara un fragmento de la banda sonora (js/data/bandaSonora.js) a partir de una canción entera:
//   node scripts/preparar-audio.mjs <origen> --inicio 1:02.5 --fin 1:58 --nombre inicio [opciones]
// Corta [inicio, fin), normaliza el volumen con loudnorm en dos pasadas (unos −16 LUFS: todas las pistas suenan igual de
// fuertes y el fundido entre momentos no da saltos), añade un fundido de entrada y otro de salida y lo guarda como AAC en
// .m4a (128 kbps estéreo a 44,1 kHz: lo reproducen Safari en el iPhone y Chrome en Android sin nada más). Después mide el
// archivo de verdad (bytes y duración exacta con ffprobe, el AAC añade unos milisegundos de relleno) y lo apunta en el
// índice de la carpeta (indice.json), que la web lee para contar los MB de la pantalla de carga y para saber cuánto dura
// cada fragmento sin tener que descargarlo.
// Opciones: --destino assets/musica · --entrada 1.2 · --salida 2.5 (segundos de fundido; 0 = sin fundido) · --lufs -16 ·
// --kbps 128 · --nombre (por defecto, el del archivo de origen).
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const FFMPEG = process.env.FFMPEG || '/usr/bin/ffmpeg', FFPROBE = process.env.FFPROBE || FFMPEG.replace(/ffmpeg$/, 'ffprobe');
const args = process.argv.slice(2), opciones = {}, sueltos = [];
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) opciones[args[i].slice(2)] = args[++i]; else sueltos.push(args[i]); }
const origen = sueltos[0];
if (!origen || !existsSync(origen)) { console.error('Uso: node scripts/preparar-audio.mjs <origen> --inicio 0:12 --fin 0:58 --nombre inicio [--destino assets/musica] [--entrada 1.2] [--salida 2.5] [--lufs -16] [--kbps 128]'); process.exit(2); }

// «83.5», «1:23.5» o «0:01:23.5» → segundos.
export const segundos = texto => String(texto).split(':').reduce((a, p) => a * 60 + Number(p.replace(',', '.')), 0);
const ejecutar = (programa, lista) => { const r = spawnSync(programa, lista, { encoding: 'utf8', maxBuffer: 64 << 20 }); if (r.status !== 0) { console.error(r.stderr.slice(-2000)); process.exit(1); } return r; };
const medirDuracion = archivo => Number(ejecutar(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', archivo]).stdout.trim());

const total = medirDuracion(origen);
const inicio = opciones.inicio !== undefined ? segundos(opciones.inicio) : 0, fin = Math.min(total, opciones.fin !== undefined ? segundos(opciones.fin) : total);
if (!(fin > inicio)) { console.error(`El fin (${fin}) debe ir después del inicio (${inicio}); el origen dura ${total.toFixed(2)} s.`); process.exit(2); }
const dur = fin - inicio, entrada = Math.min(dur / 3, Number(opciones.entrada ?? 1.2)), salida = Math.min(dur / 3, Number(opciones.salida ?? 2.5));
const lufs = Number(opciones.lufs ?? -16), kbps = Number(opciones.kbps ?? 128);
const destino = path.resolve(opciones.destino || 'assets/musica'), nombre = (opciones.nombre || path.basename(origen).replace(/\.[^.]+$/, '')).replace(/\.m4a$/, '') + '.m4a';
mkdirSync(destino, { recursive: true });
const corte = `atrim=start=${inicio}:end=${fin},asetpts=PTS-STARTPTS`;

// 1.ª pasada: medir el fragmento ya cortado (loudnorm de una sola pasada «bombea» el volumen; con las medidas, es lineal).
const medida = ejecutar(FFMPEG, ['-hide_banner', '-nostats', '-i', origen, '-af', `${corte},loudnorm=I=${lufs}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-']).stderr;
const m = JSON.parse(medida.slice(medida.lastIndexOf('{'), medida.lastIndexOf('}') + 1));
// 2.ª pasada: normalizar con las medidas, volver a 44,1 kHz (loudnorm trabaja a 192 kHz) y los fundidos al final, sobre el
// volumen ya corregido (así el fundido no cambia la medida). La salida dura exactamente fin − inicio.
const filtros = [corte, `loudnorm=I=${lufs}:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`, 'aresample=44100'];
if (entrada > 0) filtros.push(`afade=t=in:st=0:d=${entrada}`);
if (salida > 0) filtros.push(`afade=t=out:st=${(dur - salida).toFixed(3)}:d=${salida}`);
filtros.push(`atrim=end=${dur}`);
const archivo = path.join(destino, nombre);
// +faststart: el índice del MP4 va al principio (el navegador sabe la duración en cuanto llegan los primeros bytes).
ejecutar(FFMPEG, ['-hide_banner', '-y', '-i', origen, '-vn', '-map_metadata', '-1', '-af', filtros.join(','), '-ac', '2', '-c:a', 'aac', '-b:a', `${kbps}k`, '-movflags', '+faststart', archivo]);

// Índice: bytes y duración de cada fragmento (lo lee js/ui/bandaSonora.js).
const rutaIndice = path.join(destino, 'indice.json');
let indice = {}; try { indice = JSON.parse(readFileSync(rutaIndice, 'utf8')); } catch {}
indice[nombre] = { bytes: statSync(archivo).size, duracion: +medirDuracion(archivo).toFixed(3), origen: path.basename(origen), desde: +inicio.toFixed(3), hasta: +fin.toFixed(3), lufs };
writeFileSync(rutaIndice, JSON.stringify(Object.fromEntries(Object.entries(indice).sort()), null, 2) + '\n');
console.log(`${path.relative(process.cwd(), archivo)} · ${indice[nombre].duracion} s · ${(indice[nombre].bytes / 1048576).toFixed(2)} MB · medido ${m.input_i} LUFS → ${lufs}`);
