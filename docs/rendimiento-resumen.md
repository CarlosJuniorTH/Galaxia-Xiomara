# Ultra fluido: resumen antes / después

Rama `rendimiento/ultra-fluido`. Encargo: [PROMPT-ULTRA-FLUIDO.md](PROMPT-ULTRA-FLUIDO.md). Datos completos (un JSON por tramo):
[rendimiento-antes.json](rendimiento-antes.json) (código de b112950 con el medidor) y
[rendimiento-despues.json](rendimiento-despues.json). Medido con `tests/navegador/recorrido.mjs` en Chromium con la GPU del PC:
móvil emulado (430×932, DPR 3, CPU ×4 desde la carga) y PC (1440×900, CPU ×1).

**Cómo se lee.** Un tramo cumple si p95 ≤ 17,5 ms y p99 < 20 ms, sin cuadros > 50 ms (vuelos y gestos: como mucho 1 cuadro
> 25 ms). **p95 ≤ 17,5 en lugar de < 16,7:** a 60 Hz el intervalo entre cuadros mide 16,7 ± 0,1 ms; 17,5 sigue siendo un solo
periodo de pantalla (ningún cuadro perdido). En tramos de menos de 10 cuadros (un toque, un clic) se exige que el peor cuadro
sea < 20 ms. Las subidas a la GPU cuentan texturas, compilaciones, geometrías, render targets y decodificaciones de imagen.
**MB:** se cuentan por la red como los sirve GitHub Pages (texto con gzip), igual antes y después (el servidor de antes no
comprimía); entre paréntesis, el tamaño en disco. La máquina de pruebas se comparte: cada configuración guarda la carga media
del sistema mientras se midió (`cargaMaquina`).

Cambios en cómo se parten los tramos respecto a la línea base (más precisos, mismas métricas): el viaje empieza en su primer
cuadro en movimiento (el clic, donde se prepara el plan y el búfer de la escena de destino, va aparte: «clic hacia…»); un gesto
dura hasta que la vista se para (luego «quieto tras…»); el videoclip acaba cuando acaba su clip («tras la escena…» es el
fundido de vuelta); la pantalla de carga que sigue al toque es carga («carga tras el toque»).

## Antes / después por tramo

Cada celda: FPS · p95/p99 (ms) · cuadros > 25 / > 50 ms. Las filas «clic hacia…», «tras la escena…» y «carga tras el toque» no existían en la línea base (allí iban dentro del viaje, de la escena o del toque). Los «quieto tras…» (calma después de un gesto) están en el JSON.

### Móvil (430×932, DPR 3, CPU ×4) · tramos que incumplen: antes 22 de 41, después 2 de 66 · carga media de la máquina al medir 2.71 (24 núcleos)

| Tramo | Antes: FPS · p95/p99 ms · >25/>50 | Después | Subidas GPU a→d | Desfase máx. ms a→d | Llamadas a→d | Antes incumple | Después incumple |
|---|---|---|---|---|---|---|---|
| carga | 4.9 · 633.3/633.3 · 5/4 | 6.5 · 369.8/369.8 · 4/4 | 18→18 | —→— | 0→0 | ✓ | ✓ |
| toque | 7.9 · 350/816.6 · 22/12 | 8.6 · 333.3/333.3 · 7/6 | 3962→21 | —→— | 15→0 | p95 350 > 16,7 ms; p99 816.6 ≥ 20 ms; 12 cuadros > 50 ms | un tramo corto con un cuadro de 333.3 ms (≥ 20 ms) |
| carga tras el toque | — | 7.6 · 733.3/982 · 20/10 | —→4286 | —→0 | —→45 | — | ✓ |
| clip de la intro | 59.3 · 16.8/16.8 · 2/1 | 60 · 16.8/16.8 · 1/0 | 0→0 | 20.4→4.76 | 0→0 | 1 cuadros > 50 ms; desfase audio↔imagen hasta 20.4 ms (p95 16.8) | ✓ |
| tarjeta | 60 · 16.7/16.8 · 0/0 | 60.6 · 16.7/16.8 · 0/0 | 0→0 | 18→4 | 0→220 | ✓ | ✓ |
| empezar | 48.7 · 66.7/66.7 · 1/1 | 59.1 · 33.4/33.4 · 1/0 | 0→0 | 16.8→0.07 | 254→220 | p95 66.7 > 16,7 ms; p99 66.7 ≥ 20 ms; 1 cuadros > 50 ms | un tramo corto con un cuadro de 33.4 ms (≥ 20 ms) |
| vuelo de entrada | 59.9 · 16.8/16.8 · 1/0 | 60.1 · 16.7/16.8 · 0/0 | 0→0 | —→4.07 | 236→205 | ✓ | ✓ |
| casa | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→31 | —→— | 189→144 | ✓ | ✓ |
| giro en casa | 60 · 16.7/16.8 · 0/0 | 60.3 · 16.7/16.8 · 0/0 | 0→0 | —→— | 168→152 | ✓ | ✓ |
| zoom en casa | 60 · 16.7/16.8 · 0/0 | 60.2 · 16.7/16.8 · 0/0 | 0→0 | —→— | 168→123 | ✓ | ✓ |
| clic hacia cuasar | — | 84.4 · 16.7/16.7 · 0/0 | —→0 | —→— | —→132 | — | ✓ |
| viaje a cuasar | 59.9 · 16.7/16.8 · 1/0 | 60 · 16.7/16.8 · 0/0 | 8→0 | —→4.03 | 158→138 | 8 subidas/compilaciones (tex 0, comp 0, enl 0, geo 8, RT 0, dec 0) | ✓ |
| escena cuasar | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | 23.6→4.09 | 143→120 | desfase audio↔imagen hasta 23.6 ms (p95 21.4) | ✓ |
| tras la escena cuasar | — | 60.5 · 16.7/16.8 · 0/0 | —→6 | —→— | —→116 | — | ✓ |
| clic hacia pulsar | — | 312.5 · 3.2/3.2 · 0/0 | —→0 | —→— | —→117 | — | ✓ |
| viaje a pulsar | 60 · 16.7/16.8 · 0/0 | 60.1 · 16.7/16.8 · 0/0 | 0→0 | —→5.73 | 147→115 | ✓ | ✓ |
| escena pulsar | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | 45.7→4.4 | 127→102 | desfase audio↔imagen hasta 45.7 ms (p95 19.1) | ✓ |
| tras la escena pulsar | — | 60.3 · 16.8/16.8 · 0/0 | —→0 | —→— | —→102 | — | ✓ |
| clic hacia deneb | — | 212.8 · 4.7/4.7 · 0/0 | —→0 | —→— | —→102 | — | ✓ |
| viaje a deneb | 60 · 16.8/16.8 · 0/0 | 60.1 · 16.8/16.8 · 0/0 | 0→0 | —→4.01 | 118→100 | ✓ | ✓ |
| escena deneb | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 21→0 | 35.8→5.58 | 96→81 | desfase audio↔imagen hasta 35.8 ms (p95 29.1); 21 subidas/compilaciones (tex 0, comp 0, enl 0, geo 21, RT 0, dec 0) | ✓ |
| tras la escena deneb | — | 60.4 · 16.8/16.8 · 0/0 | —→0 | —→— | —→79 | — | ✓ |
| clic hacia ton618 | — | 192.3 · 5.2/5.2 · 0/0 | —→0 | —→— | —→75 | — | ✓ |
| viaje a ton618 | 60 · 16.7/16.8 · 0/0 | 60.1 · 16.8/16.8 · 0/0 | 0→0 | —→4.04 | 167→131 | ✓ | ✓ |
| escena ton618 | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | 87.1→4.13 | 131→109 | desfase audio↔imagen hasta 87.1 ms (p95 28.4) | ✓ |
| tras la escena ton618 | — | 60.3 · 16.8/16.8 · 0/0 | —→0 | —→— | —→111 | — | ✓ |
| clic hacia sagitario | — | 666.7 · 1.5/1.5 · 0/0 | —→0 | —→— | —→110 | — | ✓ |
| viaje a sagitario | 60 · 16.8/16.8 · 0/0 | 60.1 · 16.8/16.8 · 0/0 | 0→0 | —→4.11 | 133→108 | ✓ | ✓ |
| escena sagitario | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | 87.1→4.14 | 116→99 | desfase audio↔imagen hasta 87.1 ms (p95 25.9) | ✓ |
| tras la escena sagitario | — | 60.4 · 16.7/16.8 · 0/0 | —→0 | —→— | —→100 | — | ✓ |
| clic hacia gigante | — | 112.4 · 16.7/16.7 · 0/0 | —→6 | —→— | —→100 | — | ✓ |
| viaje a gigante | 60 · 16.8/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 6→0 | —→4.14 | 163→132 | 6 subidas/compilaciones (tex 1, comp 0, enl 0, geo 0, RT 5, dec 0) | ✓ |
| escena gigante | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→— | 47→39 | ✓ | ✓ |
| clic hacia constelacion | — | 78.7 · 12.7/12.7 · 0/0 | —→3 | —→— | —→39 | — | ✓ |
| viaje a constelacion | 58.7 · 16.8/16.8 · 6/3 | 60.1 · 16.7/16.8 · 0/0 | 7→0 | —→4.01 | 180→138 | 3 cuadros > 50 ms; 6 cuadros > 25 ms (máx. 1); 7 subidas/compilaciones (tex 1, comp 0, enl 0, geo 4, RT 2, dec 0) | ✓ |
| escena constelacion | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→— | 176→137 | aterriza a -21.5 ms del fin de su música | ✓ |
| clic hacia cartas | — | 75.2 · 16.7/16.7 · 0/0 | —→6 | —→— | —→137 | — | ✓ |
| viaje a cartas | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 6→0 | —→4.04 | 91→89 | 6 subidas/compilaciones (tex 1, comp 0, enl 0, geo 0, RT 5, dec 0) | ✓ |
| escena cartas | 60 · 16.8/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | —→— | 54→52 | aterriza a -28 ms del fin de su música | ✓ |
| clic hacia suenos | — | 112.4 · 16.6/16.6 · 0/0 | —→3 | —→— | —→52 | — | ✓ |
| viaje a suenos | 60 · 16.7/16.8 · 0/0 | 60.1 · 16.7/16.8 · 0/0 | 3→0 | —→4 | 179→127 | 3 subidas/compilaciones (tex 1, comp 0, enl 0, geo 0, RT 2, dec 0) | ✓ |
| escena suenos | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | —→— | 176→127 | ✓ | ✓ |
| clic hacia capsulas | — | 61 · 16.4/16.4 · 0/0 | —→0 | —→— | —→127 | — | ✓ |
| viaje a capsulas | 60 · 16.7/16.8 · 0/0 | 60.1 · 16.8/16.8 · 0/0 | 4→0 | —→4.04 | 185→150 | 4 subidas/compilaciones (tex 0, comp 0, enl 0, geo 4, RT 0, dec 0) | ✓ |
| escena capsulas | 60 · 16.8/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | —→— | 192→151 | ✓ | ✓ |
| clic hacia calma | — | 61.7 · 16.2/16.2 · 0/0 | —→0 | —→— | —→150 | — | ✓ |
| viaje a calma | 60 · 16.8/16.8 · 0/0 | 60.1 · 16.7/16.8 · 0/0 | 0→0 | —→4.09 | 179→128 | ✓ | ✓ |
| escena calma | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | —→— | 170→113 | ✓ | ✓ |
| clic hacia azul | — | 178.6 · 5.6/5.6 · 0/0 | —→6 | —→— | —→113 | — | ✓ |
| viaje a azul | 59.9 · 16.7/16.8 · 1/0 | 60.1 · 16.8/16.8 · 0/0 | 6→0 | —→4.02 | 95→93 | 6 subidas/compilaciones (tex 1, comp 0, enl 0, geo 0, RT 5, dec 0) | ✓ |
| escena azul | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→— | 61→76 | aterriza a -27.6 ms del fin de su música | ✓ |
| clic hacia rosa | — | 79.4 · 12.6/12.6 · 0/0 | —→0 | —→— | —→76 | — | ✓ |
| viaje a rosa | 60 · 16.7/16.8 · 0/0 | 59.9 · 16.7/16.8 · 1/0 | 0→0 | —→4.03 | 53→45 | ✓ | ✓ |
| escena rosa | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→— | 56→48 | ✓ | ✓ |
| sistema solar | 60 · 16.7/16.8 · 0/0 | 60.3 · 16.7/16.8 · 0/0 | 0→0 | —→— | 56→49 | ✓ | ✓ |
| giro en el sistema solar | 60 · 16.7/16.8 · 0/0 | 60.1 · 16.8/16.8 · 0/0 | 0→0 | —→— | 52→47 | ✓ | ✓ |
| clic hacia supernova | — | 163.9 · 6.1/6.1 · 0/0 | —→3 | —→— | —→43 | — | ✓ |
| viaje a supernova | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 3→0 | 0→4.05 | 146→121 | 3 subidas/compilaciones (tex 1, comp 0, enl 0, geo 0, RT 2, dec 0) | ✓ |
| escena supernova | 58.5 · 16.8/33.3 · 96/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | 16.5→5.3 | 138→119 | p99 33.3 ≥ 20 ms; aterriza a -28.4 ms del fin de su música | ✓ |
| tras la escena supernova | — | 60.6 · 16.8/16.8 · 0/0 | —→0 | —→4.06 | —→115 | — | ✓ |
| clic hacia hogar | — | 416.7 · 2.4/2.4 · 0/0 | —→0 | —→— | —→115 | — | ✓ |
| vuelta a casa | 59.2 · 16.8/16.8 · 7/1 | 60.1 · 16.7/16.8 · 0/0 | 8→0 | —→4.02 | 175→143 | 1 cuadros > 50 ms; 7 cuadros > 25 ms (máx. 1); 8 subidas/compilaciones (tex 0, comp 0, enl 0, geo 8, RT 0, dec 0) | ✓ |
| casa al volver | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→4.04 | 187→141 | aterriza a (sin música de viajes) del fin de su música | ✓ |

Red (MB por la red, texto con gzip como GitHub Pages; entre paréntesis, en disco): antes del toque 17.2 (19.29) → 5.85 (7.5); antes del clip 28.7 (30.87) → 13.26 (14.92); archivos pedidos más de una vez: 0 → 0. antes del toque 5.85 MB > 5 MB

### PC (1440×900) · tramos que incumplen: antes 19 de 41, después 1 de 66 · carga media de la máquina al medir 2.35 (24 núcleos)

| Tramo | Antes: FPS · p95/p99 ms · >25/>50 | Después | Subidas GPU a→d | Desfase máx. ms a→d | Llamadas a→d | Antes incumple | Después incumple |
|---|---|---|---|---|---|---|---|
| carga | 12.4 · 233.3/233.3 · 6/3 | 15.2 · 160.5/160.5 · 6/3 | 38→38 | —→— | 0→0 | ✓ | ✓ |
| toque | 7.2 · 616.7/616.7 · 14/7 | 7.5 · 583.3/583.3 · 5/3 | 3942→1167 | —→— | 37→0 | p95 616.7 > 16,7 ms; p99 616.7 ≥ 20 ms; 7 cuadros > 50 ms | un tramo corto con un cuadro de 583.3 ms (≥ 20 ms) |
| carga tras el toque | — | 13.5 · 299.9/299.9 · 9/3 | —→3120 | —→0.24 | —→142 | — | ✓ |
| clip de la intro | 59.4 · 16.7/16.8 · 1/1 | 60 · 16.7/16.8 · 1/0 | 0→0 | 15.6→4.39 | 0→0 | 1 cuadros > 50 ms | ✓ |
| tarjeta | 60 · 16.8/16.8 · 0/0 | 60.6 · 16.7/16.8 · 0/0 | 0→0 | 14.7→0.37 | 0→231 | ✓ | ✓ |
| empezar | 60 · 16.7/16.7 · 0/0 | 79.5 · 16.7/16.7 · 0/0 | 0→0 | 4.3→0.05 | 0→231 | ✓ | ✓ |
| vuelo de entrada | 60 · 16.7/16.8 · 0/0 | 60.1 · 16.7/16.8 · 0/0 | 0→0 | —→4.07 | 264→215 | ✓ | ✓ |
| casa | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→24 | —→— | 216→163 | aterriza a -22.3 ms del fin de su música | ✓ |
| giro en casa | 60 · 16.8/16.8 · 0/0 | 60.1 · 16.7/16.8 · 0/0 | 0→0 | —→— | 244→188 | ✓ | ✓ |
| zoom en casa | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | —→— | 246→189 | ✓ | ✓ |
| clic hacia cuasar | — | 250 · 4/4 · 0/0 | —→0 | —→— | —→207 | — | ✓ |
| viaje a cuasar | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 20→0 | —→4.32 | 201→172 | 20 subidas/compilaciones (tex 0, comp 0, enl 0, geo 20, RT 0, dec 0) | ✓ |
| escena cuasar | 60 · 16.8/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | 31.1→4.24 | 157→137 | desfase audio↔imagen hasta 31.1 ms (p95 29.8) | ✓ |
| tras la escena cuasar | — | 68 · 14.7/14.7 · 0/0 | —→0 | —→— | —→130 | — | ✓ |
| clic hacia pulsar | — | 0 · null/null · 0/0 | —→0 | —→— | —→— | — | ✓ |
| viaje a pulsar | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 24→0 | —→4.06 | 183→134 | 24 subidas/compilaciones (tex 0, comp 0, enl 0, geo 24, RT 0, dec 0) | ✓ |
| escena pulsar | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | 45.7→4.17 | 154→114 | desfase audio↔imagen hasta 45.7 ms (p95 33.2) | ✓ |
| tras la escena pulsar | — | 67.6 · 14.8/14.8 · 0/0 | —→0 | —→— | —→126 | — | ✓ |
| clic hacia deneb | — | 0 · null/null · 0/0 | —→0 | —→— | —→— | — | ✓ |
| viaje a deneb | 59.9 · 16.7/16.8 · 1/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→4.17 | 122→103 | ✓ | ✓ |
| escena deneb | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | 35.8→4.27 | 104→84 | desfase audio↔imagen hasta 35.8 ms (p95 18.9) | ✓ |
| tras la escena deneb | — | 65.8 · 15.2/15.2 · 0/0 | —→0 | —→— | —→83 | — | ✓ |
| clic hacia ton618 | — | 0 · null/null · 0/0 | —→0 | —→— | —→— | — | ✓ |
| viaje a ton618 | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→5.78 | 218→157 | ✓ | ✓ |
| escena ton618 | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | 87.1→5.55 | 155→128 | desfase audio↔imagen hasta 87.1 ms (p95 21.7) | ✓ |
| tras la escena ton618 | — | 73.5 · 13.6/13.6 · 0/0 | —→0 | —→— | —→129 | — | ✓ |
| clic hacia sagitario | — | 0 · null/null · 0/0 | —→0 | —→— | —→— | — | ✓ |
| viaje a sagitario | 60 · 16.8/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | —→5.8 | 177→132 | ✓ | ✓ |
| escena sagitario | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | 43.5→5.78 | 134→105 | desfase audio↔imagen hasta 43.5 ms (p95 33.6) | ✓ |
| tras la escena sagitario | — | 65.4 · 15.3/15.3 · 0/0 | —→0 | —→— | —→108 | — | ✓ |
| clic hacia gigante | — | 0 · null/null · 0/0 | —→6 | —→— | —→— | — | ✓ |
| viaje a gigante | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 10→0 | —→4.14 | 228→168 | 10 subidas/compilaciones (tex 1, comp 0, enl 0, geo 4, RT 5, dec 0) | ✓ |
| escena gigante | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→— | 68→67 | ✓ | ✓ |
| clic hacia constelacion | — | 80 · 12.5/12.5 · 0/0 | —→3 | —→— | —→67 | — | ✓ |
| viaje a constelacion | 60 · 16.8/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 3→0 | —→3.98 | 236→171 | 3 subidas/compilaciones (tex 1, comp 0, enl 0, geo 0, RT 2, dec 0) | ✓ |
| escena constelacion | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→— | 221→164 | ✓ | ✓ |
| clic hacia cartas | — | 114.9 · 8.7/8.7 · 0/0 | —→6 | —→— | —→165 | — | ✓ |
| viaje a cartas | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 6→0 | —→4.06 | 108→105 | 6 subidas/compilaciones (tex 1, comp 0, enl 0, geo 0, RT 5, dec 0) | ✓ |
| escena cartas | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | —→— | 57→55 | ✓ | ✓ |
| clic hacia suenos | — | 135.1 · 7.4/7.4 · 0/0 | —→3 | —→— | —→55 | — | ✓ |
| viaje a suenos | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 7→0 | —→4.03 | 226→149 | 7 subidas/compilaciones (tex 1, comp 0, enl 0, geo 4, RT 2, dec 0) | ✓ |
| escena suenos | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→— | 227→160 | aterriza a -20.3 ms del fin de su música | ✓ |
| clic hacia capsulas | — | 200 · 5/5 · 0/0 | —→0 | —→— | —→160 | — | ✓ |
| viaje a capsulas | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | —→4.24 | 240→198 | ✓ | ✓ |
| escena capsulas | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | —→— | 257→208 | ✓ | ✓ |
| clic hacia calma | — | 588.2 · 1.7/1.7 · 0/0 | —→0 | —→— | —→207 | — | ✓ |
| viaje a calma | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | —→4 | 227→165 | ✓ | ✓ |
| escena calma | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→— | 213→149 | ✓ | ✓ |
| clic hacia azul | — | 98 · 10.2/10.2 · 0/0 | —→6 | —→— | —→149 | — | ✓ |
| viaje a azul | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 6→0 | —→4.02 | 108→106 | 6 subidas/compilaciones (tex 1, comp 0, enl 0, geo 0, RT 5, dec 0) | ✓ |
| escena azul | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→— | 96→89 | ✓ | ✓ |
| clic hacia rosa | — | 178.6 · 5.6/5.6 · 0/0 | —→0 | —→— | —→90 | — | ✓ |
| viaje a rosa | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→4.06 | 65→68 | ✓ | ✓ |
| escena rosa | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→— | 58→51 | ✓ | ✓ |
| sistema solar | 60 · 16.8/16.8 · 0/0 | 60.3 · 16.7/16.8 · 0/0 | 0→0 | —→— | 58→51 | ✓ | ✓ |
| giro en el sistema solar | 60 · 16.8/16.8 · 0/0 | 60.1 · 16.8/16.8 · 0/0 | 0→0 | —→— | 81→72 | ✓ | ✓ |
| clic hacia supernova | — | 77.5 · 12.9/12.9 · 0/0 | —→3 | —→— | —→81 | — | ✓ |
| viaje a supernova | 60 · 16.8/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 11→0 | —→4.03 | 167→140 | 11 subidas/compilaciones (tex 1, comp 0, enl 0, geo 8, RT 2, dec 0) | ✓ |
| escena supernova | 60 · 16.7/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 0→0 | 20.4→4.1 | 157→134 | desfase audio↔imagen hasta 20.4 ms (p95 19) | ✓ |
| tras la escena supernova | — | 71.4 · 14/14 · 0/0 | —→0 | —→3.96 | —→134 | — | ✓ |
| clic hacia hogar | — | 0 · null/null · 0/0 | —→0 | —→— | —→— | — | ✓ |
| vuelta a casa | 60 · 16.8/16.8 · 0/0 | 60 · 16.8/16.8 · 0/0 | 4→0 | —→4.11 | 215→172 | 4 subidas/compilaciones (tex 0, comp 0, enl 0, geo 4, RT 0, dec 0) | ✓ |
| casa al volver | 60 · 16.7/16.8 · 0/0 | 60 · 16.7/16.8 · 0/0 | 0→0 | —→4.05 | 213→160 | ✓ | ✓ |

Red (MB por la red, texto con gzip como GitHub Pages; entre paréntesis, en disco): antes del toque 19.13 (21.22) → 8.2 (9.86); antes del clip 31.55 (33.72) → 16.9 (18.56); archivos pedidos más de una vez: 0 → 0. antes del toque 8.2 MB > 7 MB

Música en todo el recorrido, antes → después: aterrizaje de cada viaje frente al fin de su música, peor caso 28 → 4 ms (móvil) y 22 → 4 ms (PC); desfase audio↔imagen máximo en clip y escenas 87 → 6 ms; 0 cambios de playbackRate, 0 saltos, 0 cortes (antes y después); `play()` en el toque 17 → 1. Errores de consola: 0.

(Medidas finales: móvil en c8f7c33 y PC en 13046e2, cada una con la máquina en calma; entre las dos solo cambia el relleno del campo cercano de la telaraña, que afecta a la GPU del primer viaje en el móvil.)

## Capturas comparadas (calidad)

Mismas poses, mismo segundo de cada videoclip y la misma ventana: `docs/capturas-rendimiento/antes/` y `…/despues/`
(`<config>-<pose>.jpg`: intro-1…5, casa, pulsar, cuasar, deneb, ton618, sagitario, supernova-estallido, supernova-corazon,
sistema-solar). Números en `docs/capturas-rendimiento/comparacion.json` (`python3 scripts/comparar-capturas.py`).
Reproducir: `DESTINO=despues node tests/navegador/capturasRendimiento.mjs movil pc`.

| Pose | Móvil: SSIM · nitidez después/antes | PC: SSIM · nitidez | Mirado a ojo |
|---|---|---|---|
| intro-1…5 | 0,994–0,997 · 0,5–1,5 | 0,999–1,0 · 1,0 | Igual. En el móvil el lienzo 2D del clip va a DPR 1,5 (encargo 19): los puntos finos, apenas más suaves; no se aprecia. |
| casa | 0,70 · 0,89 | 0,65 · 0,99 | Igual de nítida (estrellas, «Xiomara», corazón). La diferencia es la rotación de la galaxia y los brillos animados. |
| púlsar, cuásar, TON 618, Sagitario A* | 0,74–0,89 · 1,0 | 0,40–0,83 · 1,0 | Misma imagen; el disco y los haces giran (fase distinta en el mismo segundo de la canción). |
| Deneb | 0,95 · 0,99 | 0,92 · 0,98 | Igual. |
| supernova (estallido, corazón) | 0,69–0,84 · 0,87–0,95 | 0,64–0,84 · 1,0 | Igual; las chispas del estallido son aleatorias. |
| sistema solar | 0,90 · 1,0 | 0,92 · 0,99 | Igual. |

Brillo medio igual (±1–4 sobre 255) en todas. Una sola corrección por calidad: con el presupuesto de 1,3 Mpx del perfil ultra
el móvil dibujaba la escena a DPR 1,78 y salía algo blando (nitidez 0,7 en casa); con 1,65 Mpx vuelve a DPR 2 y queda como antes.

## Qué causaba cada tirón y cómo quedó

| Causa (encargo) | Cómo quedó |
|---|---|
| A1–A2 Intro y escenas siguiendo `audio.currentTime` a saltos (esperas de 3 s, recolocaciones) | Reloj maestro único (`js/util/relojMaestro.js`, AudioContext con latencia compensada): desfase audio↔imagen máx. ~5 ms (antes 20 ms en la intro y 24–87 ms en los gigantes). |
| A3 `acompasar()` forzando la música de los viajes (playbackRate / saltos) | La música de viajes se programa una vez y el vuelo sigue su reloj: 0 cambios de playbackRate, 0 saltos; cada viaje aterriza a ≤ 4 ms del fin de su música. |
| A4 17 `play()` a la vez en el toque | `desbloquear()` solo reanuda el contexto: 0 `play()` en el toque (antes 17). |
| B5–B6 Todo descargado antes de empezar, three.js sin minificar y pedido varias veces | Carga por prioridad, cola de reposo, mapa de importación al minificado. Antes del clip: 28,7 → 13,3 MB (móvil), 31,6 → 16,9 MB (PC). Ningún archivo pedido dos veces (el obrero de la telaraña aún pedía el three grande: corregido). |
| C7–C10 GPU sin presupuesto (sobrepintado, pasadas siempre activas, resolución por DPR, backdrop-filter) | Perfil ultra único con presupuesto de píxeles, bloom por mips, volumétrica a ¼/½ con reproyección, pasada final única, recorte por grupos, menos órdenes de dibujo (casa móvil 189 → ~144), interfaz sin backdrop-filter sobre el 3D. |
| D11–D14 Estrenos en frío y trabajo en mal momento | Calentamiento a tamaño real en cada destino, 3D caliente detrás de la portada, plan del vuelo en un obrero, subidas grandes por franjas solo en momentos libres. Quedaban: geometrías nuevas del campo cercano de la telaraña en pleno videoclip de Deneb (ahora geometría reservada), el búfer principal recreado en el clip de la intro, subidas del cielo grande durante el zoom con rueda y la capa del fundido de la portada creada en el clic de «Entrar» (corregidos). |
| E15–E16 Paso 60↔30 y resolución dinámica en caliente | Fuera: 60 FPS fijos (0 FPS solo quieto), resolución interna fija. En el móvil se subió el presupuesto a 1,65 Mpx (DPR 2 en 430×932, como antes): con 1,3 Mpx las capturas salían más blandas. |

## Lo que queda (no cumple del todo)

- **El toque mientras aún carga** (móvil y PC): la pantalla de toque aparece en cuanto se sabe que hay canción y la carga
  sigue detrás; si se toca antes del 100 %, el segundo siguiente comparte el hilo con la construcción de la escena (tareas de
  hasta ~300 ms con la CPU ×4) y el botón se va a tirones. Es carga (la pantalla de carga, HTML). Para que fuera fluido
  habría que trocear la construcción de cada capa en tareas de < 16 ms o llevarla a obreros.
- **«Empezar» en el móvil**: un cuadro de 33 ms en el clic (estilo y maquetación del cambio de interfaz al entrar, no
  JavaScript ni GPU). En el PC, 0.
- **Carga antes del toque**: 5,85 MB en el móvil (objetivo ≤ 5) y 8,2 MB en el PC (≤ 7), por la red con gzip. Depende de
  cuándo se toque (aquí, medio segundo después de aparecer el botón, en la red local). Lo imprescindible de la lista del
  encargo (paquete horneado 2,6 MB, canciones de inicio y viajes 0,75 MB, three.js, módulos, fuentes, cielo) ya son ~4,7 MB;
  el resto son las texturas horneadas, que la carga baja a continuación. Antes del clip: 13,3 MB (antes 28,7) y 16,9 MB
  (antes 31,6). Bajarlo más pide texturas más ligeras o diferir las de destinos lejanos a después de la intro.
- **Pruebas de navegador que ya fallaban antes de la rama** (fallan igual en b112950): `encuadre`, `geometria`, `nebulosas`,
  `paisaje`, `rendimiento` (comprobación de estrellas por galaxia) y `universo` (salvo la de la Vía Láctea). `vuelo` falla igual
  en 439ab39 (prueba del vuelo antiguo). **Nueva en la rama** (falla en 439ab39 y no en b112950): `universo` · «Vía Láctea: su
  luz por área es continua» (la cámara que coloca la prueba no está donde la pone al medir). El resto pasa: `npm test` (179) y
  avisos, banda, brillo, clipCortes, entrada, escenas, fluidez, intro, introCarga, llamadas, matrices, musicaViajes,
  panelTrasClip, paquetes, pasadas, precarga, profundidad, redCarga, resplandor, ritmo, solar, supernovaFinal, tironesViajes,
  viajes, videoclips, videoclipsMovil y xiomara.

## Probarlo en el iPhone y en el Moto (servidor de casa)

1. En el PC, con la rama activa en la carpeta principal: `git checkout rendimiento/ultra-fluido`. **Reiniciar el servidor de
   Carlos** (ejecuta `scripts/servir.py`; tiene que arrancar de nuevo para servir con gzip y el `paquetes.json` nuevo):
   pararlo y volver a lanzar `python3 scripts/servir.py --lan --port 3000`.
2. En el iPhone 14 Pro Max (Safari) y en el Moto G54 (Chrome), en la Wi-Fi de casa: **http://192.168.1.34:3000/?fps**.
   Primera visita en una pestaña privada (o tras borrar los datos del sitio) para medir la carga entera.
3. Recorrer: toque, clip entero, Entrar, girar con el dedo, pellizcar, viajar a cada gigante y ver su escena entera, el sistema
   solar y volver a casa.

**Qué mirar en el panel `?fps`** (arriba a la izquierda, se actualiza cada medio segundo con los últimos 2 s):
- Línea 1: `FPS` (60), `p50 / p95 / p99` en ms (≈16,7 / ≤17,5 / <20), `>25` y `>50` (cuadros lentos: 0) y `LoAF` (tareas
  largas del navegador: 0 durante vuelos, clips y gestos).
- Línea 2: `dibujo` (órdenes de dibujo: < 150 en casa, < 250 en el gigante más cargado), `tri`, `interna` (resolución 3D en
  Mpx), `lienzo` y `GPU` (ms de GPU por cuadro, si el navegador lo permite; en Safari suele ser «n/d»).
- Línea 3: contadores desde que se abrió la página: `tex`, `comp`, `geo`, `RT` (no deben subir mientras se vuela, se ve un
  clip o se gira), `ritmo` y `saltos` de la música (0), `cortes` (0) y `desfase` audio↔imagen (< 20 ms).
- Desde la consola (Safari con el Mac, Chrome con `chrome://inspect`): `__medidor.resumen()` da el JSON por tramo; con
  `__medidor.tramo('nombre')` se marcan tramos a mano.
