# Deuda técnica y pendientes consolidados

Fuente única del backlog técnico. Consolida la deuda que ya estaba en `CLAUDE.md` con la
auditoría externa del 2026-10-09 (copia privada en `revision/auditoria-externa-2026-10-09.md`,
42 mejoras M01–M42). Cada punto de la auditoría se comprobó contra el código antes de
aceptarlo. La columna «Nuestra prioridad» es la reevaluación propia; puede diferir de la
auditoría y se explica cuando difiere.

Esfuerzo en sesiones de trabajo con Claude: XS < ½ sesión, S ≈ ½–1, M ≈ 1–2, L > 2.

## Verificación de la auditoría (2026-10-09)

Confirmados en el código:

- **M01**: el texto de la ficha en borrador de Chelyabinsk viaja en el JS publicado
  (`import.meta.glob(..., eager)` en `src/ui/dialogos.ts`; `publicable()` solo oculta el botón).
  No es un dato privado, porque el repositorio es público, pero incumple el principio «solo se
  publican fichas aprobadas» y en la Fase 4 filtraría textos de la colección.
- **M04**: la ayuda promete «flechas sobre la escena: girar la cámara», pero OrbitControls no
  escucha teclas y el canvas no recibe foco.
- **M05**: la tecla I salta al impacto aunque el foco esté en un botón (solo se excluyen
  campos de texto).
- **M06**: con 0 resultados de los filtros del CNEOS siguen visibles el detalle y la nube del
  evento anterior.
- **M08**: el esquema `RespuestaCneos` acepta cualquier versión, un `count` incoherente y
  números como texto.
- **M09**: las σ de la Tabla 4 de Peña-Asensio (radiante **geocéntrico**) se aplican a la
  dirección del vector **aparente ECEF** (`src/core/montecarlo.ts`). Es una aproximación no
  declarada.
- **M20**: el bot hace push a `main` antes de los e2e.
- **M24**: el README dice «fase 2 de 4», `tiempo.solo-chelyabinsk.cneos` sigue diciendo que
  solo Chelyabinsk tiene recorrido, y el documento para tu amigo dice que 2008 TC3 es «el
  único» asteroide observado antes de caer (fue el primero).
- **M25**: «Con órbita calculada» incluye los 2 eventos cuyo cálculo falló.
- **M26**: el botón dice «Ir al impacto» aunque el final es el pico de brillo o la altura
  convencional de 100 km.
- **M23**: el documento para tu amigo afirma que el control automático «compara cada cifra con
  su fuente» y que todo se leyó «en el original». En realidad el control compara con las
  transcripciones locales, y `fuentes.json` registra 3 fuentes con metadatos sin verificar.

Matizados:

- **M17**: el panel ya dice «última actualización de los datos», no «última consulta», así que
  es correcto. Además, GitHub avisa por email si el workflow falla. Se baja a P3.
- **M10**: según las condiciones de GitHub Pages, no puede usarse como hosting principal de un
  comercio. La visualización divulgativa enlazada desde la tienda es otro uso, pero el
  documento para tu amigo recomienda Pages sin esa salvedad. Es una decisión de la Fase 4, no
  un defecto del código.
- **M09**: el esfuerzo es menor que el estimado («L»), porque ya existe
  `estadoDesdeRadianteGeocentrico` (de los recorridos). La «revisión por especialista» queda
  fuera de nuestro alcance; sí podemos medir la cobertura contra los 18 eventos calibrados.

## Etapas propuestas (en orden)

### Etapa A · Correcciones rápidas · **hecha el 2026-10-09**

Resultado: M01 con el módulo virtual `virtual:fichas` (`pipeline/fichas-publicables.ts`) y una
comprobación posterior al build (`pipeline/verificar-dist.ts`, parte de `npm run build`), que
falla si algún archivo de `dist/` o algún mapa de fuentes contiene un fragmento de una ficha no
aprobada. M05 ignora la tecla I desde botones y campos, y los atajos con un diálogo abierto. M06
conserva la selección y la marca «fuera del filtro» en el detalle y en el contador, con el
botón «Restablecer filtros». M25 añade un cuarto grupo, «orbita-fallida», con recuento por
grupo en la leyenda (258, 2, 100 y 714 con el snapshot del 2026-10-09). M26 nombra el botón
«Ir al pico de brillo» o «Ir al punto de referencia» y quita «impacto» de la narración. M28
antepone el mensaje de llegada a la descripción del método. M24 corrige el README, el aviso de
recorrido del CNEOS y la ayuda (ya no promete girar con flechas; los controles de cámara con
teclado quedan para M04). El documento del amigo se corrigió (rev 27) y se renombró. Pruebas:
237 unitarias y 47 e2e, con regresiones de M01, M05, M06, M25, M26 y M28.

Plan original:

| Id        | Qué                                                                                                                                                 | Nuestra prioridad                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| M01       | Excluir del build las fichas que no estén aprobadas, más un test que busque una cadena testigo en `dist/`                                           | P1 (requisito previo de la Fase 4) |
| M05       | La tecla I solo actúa con el foco en la escena o sin foco en un control, y nunca con un diálogo abierto                                             | P1                                 |
| M06       | Estado vacío del CNEOS: aviso de «selección fuera del filtro» más «Restablecer filtros»; marcador y nube coherentes                                 | P1                                 |
| M24       | Textos desactualizados: README, `tiempo.solo-chelyabinsk.cneos` y la ayuda de cámara (hasta hacer M04)                                              | P1                                 |
| M25       | Leyenda y contador del CNEOS: 260 elegibles, 258 calculadas, 2 fallidas                                                                             | P2                                 |
| M26       | Botón «Ir al pico de brillo» o «Ir al punto de referencia (100 km)» según el origen                                                                 | P2                                 |
| M28       | Mantener visible la descripción del método tras el recorrido (no reemplazarla por el mensaje de llegada)                                            | P2                                 |
| Doc amigo | Corregir: 2008 TC3 «el primero», el alcance del control automático, «leídas en el original», el teclado, la salvedad de Pages, el título «Untitled» | P1 (M23, M24, M10, M40)            |

### Etapa B · Móvil y accesibilidad real · **hecha el 2026-10-09**

Resultado, en cuatro commits:

- **M02.** `src/ui/hoja.ts`: en pantallas de hasta 640 px de ancho, o en horizontal con poca
  altura, los dos paneles van en una sola hoja inferior (lateral en horizontal). La hoja tiene
  accesos a Datos y Controles y botones Ampliar y Ocultar. La cámara se centra en la zona libre
  (`motor.fijarAreaLibre`, con `ResizeObserver`). Zona libre medida: 57 % de la altura en
  320×568 y 58 % en 390×844 (prueba: `tests/e2e/movil.spec.ts`). Escritorio sin cambios.
- **M04.** Botones de Cámara (girar en cuatro direcciones, acercar, alejar, restablecer).
  Además, la escena se puede enfocar con Tab (`role="application"`): con el foco en ella, las
  flechas giran la cámara sin mover el reloj, más y menos acercan o alejan, y cero restablece
  la vista. Prueba: `tests/e2e/camara.spec.ts`, que comprueba que la cámara se mueve, no solo
  el foco.
- **M03.** La lista del CNEOS contiene ahora los 1074 registros, paginados de 15 en 15. Se puede
  buscar por fecha, y cada evento dice su tipo en texto. Los 186 registros sin ubicación se
  abren con su explicación, y la leyenda tiene un grupo «sin ubicación» (antes se contaban
  como «solo posición»). El contador distingue los eventos de la lista de los situados en el
  globo.
- **M07.** `src/ui/avisos.ts` muestra un aviso fijo, también visible en móvil, con
  «Reintentar» en estos casos:
  - fallo de los datos del CNEOS (la promesa fallida ya no queda guardada);
  - nube de órbitas;
  - recorrido de una pieza;
  - índice de recorridos;
  - textura (el globo queda liso y la escena se puede usar);
  - pérdida del contexto WebGL, con recuperación automática.

  Sin WebGL, el aviso lo explica y los paneles siguen funcionando. `cargarJson` tiene un
  tiempo límite de 30 s y rechaza respuestas que no sean un objeto JSON. Prueba:
  `tests/e2e/fallos.spec.ts`, con 404, JSON inválido, red cortada, contexto perdido y sin
  WebGL.

Verificación: 238 tests unitarios, 69 e2e (7 omitidas por proyecto) y auditoría sin errores.
La carga inicial en 4G lento fue de 2,75 s. Los fps informativos de la vista solar (13,5)
salieron más bajos que antes porque la máquina estaba cargada por la sincronización de iCloud.

**Revisión de la hoja móvil tras probar en el iPhone 16 Pro Max del usuario (2026-10-09).**
La primera versión dejaba la parte útil de la hoja en unos 150 px, con todo en una sola lista
y el botón principal escondido. Se evaluaron tres opciones: ajustes sueltos, ventanas a
pantalla completa y una hoja al estilo de Mapas de Apple. El usuario eligió la tercera.

- **Tres alturas.** La hoja tiene compacta (la inicial), media y completa. Se cambian
  arrastrando el asa o con el teclado: clic, o flechas arriba y abajo.
- **Cabecera siempre visible.** Muestra el nombre de lo seleccionado, «Ver el recorrido» (o
  «Saltar animación») y «Ver órbitas» o «Ver el globo». Estos botones delegan en los controles
  del panel y reflejan su estado con un `MutationObserver`.
- **Pestañas Explorar, Escena e Info.** Muestran una sección a la vez.
- **Comportamiento automático.** Al empezar el recorrido la hoja se baja; al tocar un marcador
  sube con su ficha; al girar el globo con el dedo se baja.
- **Ajustes para iOS.**
  - Letra de 16 px en campos y selectores, para que Safari no amplíe la página al tocarlos.
  - Objetivos táctiles de 44 px.
  - Áreas seguras (`viewport-fit=cover` y `env(safe-area-inset-*)`).
  - Etiquetas del globo más pequeñas.

En compacta, la escena ocupa el 81 % de la altura en 440×830 (iPhone 16 Pro Max con las barras
de Safari) y el 64 % en 320×568. Las pruebas e2e abren la pestaña correcta en el móvil con
`tests/e2e/hoja.ts`.

Pendiente de esta área (no bloqueante): probar en un teléfono real, con lector de pantalla
real y con zoom del navegador al 200–400 % (M21).

Plan original:

| Id  | Qué                                                                                                                                       | Nuestra prioridad |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| M02 | Móvil con una sola hoja inferior plegable o pestañas; ≥ 55 % de la altura para la escena en 320×568 y 390×844 (ya era nuestra deuda nº 1) | P1                |
| M04 | Botones y teclas de cámara (girar, acercar, alejar, restablecer) separados de los del tiempo                                              | P1                |
| M03 | Lista textual completa del CNEOS con búsqueda y paginación; los 186 eventos sin ubicación consultables sin inventar un punto              | P1                |
| M07 | Errores recuperables: reintento de las cargas, aviso visible, `webglcontextlost` y fallo de la textura                                    | P1                |
| M21 | Pruebas de regresión de cada punto anterior (va dentro de cada cambio, no como etapa aparte)                                              | —                 |

### Etapa C · Rigor del CNEOS · **hecha el 2026-10-12** (ola 2)

Resultado:

- **M18.** `pipeline/huella-metodo.ts` calcula un hash del código de `src/core/`, de la versión
  de astronomy-engine y de los parámetros, y sustituye a `VERSION_METODO`. Si cambia, las
  órbitas del CNEOS se recalculan solas; cada archivo guarda `metodo.huella`.
- **M09.**
  - Los errores de la Tabla 4 se aplican al radiante geocéntrico (α_g, δ_g) y a la velocidad
    de entrada. El clon se reconstruye en el pico de brillo con la inversa de la atracción
    cenital y se integra con N cuerpos (`src/core/montecarlo.ts`). Sin perturbación,
    reproduce la órbita nominal (prueba unitaria).
  - Se recalcularon las 260 órbitas del grupo fiable; la nube de Chelyabinsk y su validación
    se regeneraron.
  - Cobertura con los 12 eventos calibrados del grupo fiable (`docs/reportes/cobertura-cneos.md`):
    - dentro del 68 %, 35/48 comparaciones con el método nuevo (antes 37/48);
    - dentro del 95 %, 45/48 (antes 44/48).
  - Es una validación dentro de la muestra y con pocos eventos: orienta, no certifica. La
    revisión por un especialista sigue fuera de nuestro alcance.
- **M08.** `src/cneos/contrato.ts` comprueba, en la frontera de descarga y antes de guardar:
  versión admitida, campos, recuento, longitud de filas, fechas válidas y únicas, números
  finitos, rangos de coordenadas, altura y velocidad, ubicación y vector completos o ausentes,
  y una cuarentena si desaparecen más de 5 eventos. Hay 13 pruebas con datos corruptos y la
  respuesta en vivo del 2026-10-12 lo cumple. Advertencia, sin rechazo: 8 eventos cuyo
  |v| difiere de la velocidad publicada (uno de 2018, en 18 km/s); figuran en el informe del
  CNEOS.
- **M27.** Leyenda «Qué se ve en esta vista» en la vista solar (pestaña Escena en móvil), con
  la fuente y el método de cada capa y la advertencia de que la densidad no es una
  probabilidad calibrada. El texto del método del CNEOS describe el rango como «variantes de
  este modelo».

Plan original:

| Id  | Qué                                                                                                                                                                                                                    | Nuestra prioridad |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| M18 | Huella automática del método (hash del núcleo, de los parámetros y del lockfile) en lugar de `VERSION_METODO` manual. Va primero, para que el recálculo de M09 sea limpio                                              | P2                |
| M09 | Perturbar el radiante geocéntrico (α_g, δ_g, v_g) como describe la Tabla 4, medir la cobertura con los 18 eventos calibrados y declarar en pantalla «68 % de los clones de este modelo», no una probabilidad calibrada | P1                |
| M08 | Contrato estricto de la API: versión, `count`, números finitos, rangos, IDs únicos; cuarentena si hay cambios masivos                                                                                                  | P1                |
| M27 | Leyenda persistente por capa: fuente, método y la aclaración «la densidad no es una probabilidad calibrada»                                                                                                            | P2                |

### Revisión de la ficha de Chelyabinsk · **hecha el 2026-10-12**

Origen: auditoría consolidada de la ficha que trajo el usuario (dos auditorías contrastadas; copia
en `revision/`). Se auditó el código y la salida de la nube, la acción P0 que el documento no
podía cerrar.

Hallazgo principal, confirmado: la ficha citaba la órbita de Popova et al. 2013, pero el
recorrido dibujaba la nube, la órbita nominal y la estela calculadas desde el vector del CNEOS.
El centro de esa nube (i = 4,10°) quedaba fuera del intervalo citado (4,93 ± 0,48° a 2σ) y solo
el 23 % de las 300 órbitas entraba en él. La nube usaba σ de grupo a 1σ y el texto citaba 2σ. En
el catálogo, la misma pieza ya se dibujaba con la órbita de Popova. Afectaba solo al recorrido
de Chelyabinsk; las otras 24 piezas y el modo CNEOS usaban una sola órbita.

Resultado (opción recomendada, aprobada por el usuario):

- **Una sola órbita.** El recorrido de Chelyabinsk funciona como el de las demás piezas.
  `pipeline/trayectoria-chelyabinsk.ts` genera:
  - la nube de 300 órbitas muestreadas con la σ 1σ de Popova, con la misma semilla que el
    catálogo; la anomalía media sale del tiempo de perihelio publicado;
  - la estela del año previo, calculada desde el radiante y v_g de Popova en la posición e
    instante de referencia de Granvik & Brown. Contra la órbita de Popova da D_D 0,00097 y
    |z| ≤ 0,13.

  El cálculo desde el CNEOS queda como validación independiente en
  `docs/reportes/chelyabinsk.md`; sus cifras no cambian. En el globo, la entrada en la
  atmósfera y el pico siguen saliendo del CNEOS (etiquetados), y la aproximación sale de la
  estela nueva, con su propio instante de referencia.

- **Control automático.** Sección «Una sola órbita por pieza» de la auditoría: para las 25
  piezas, el panel, la nube, la estela y las cifras orbitales de la ficha deben usar la órbita
  principal. Hay una prueba que reproduce la mezcla encontrada.
- **Ficha reescrita.** Todas las cifras salen del dataset con su fuente:
  - alturas del CNEOS (23,3 km) y de Popova (29,7 km), y el destello de los fragmentos hacia
    24 km (verificado en el texto de Popova);
  - velocidad de entrada (19,16 km/s, Popova) y en el pico (18,6 km/s, CNEOS);
  - energía de 441 kt estimada con la fórmula de Brown et al. 2002 desde unos 90 kt
    radiados (campo `energy` del CNEOS), y explosión en el aire;
  - modelo de procedencia de Bottke et al. 2002 y «tres vías principales»;
  - σ a 1σ de la nube y 2σ publicada;
  - qué es la nube y qué no significa su densidad;
  - enlace al reporte de validación y fecha de consulta del CNEOS.

  Redacción: «asteroide» en toda la ficha, eclíptica, LL5 explicado, au y 03:20 UTC.

- **Datos y fuentes.** Fuentes nuevas `bottke-2002` y `brown-2002`, verificadas en Crossref.
  En el esquema se añadieron `atmosfera`, `punto_trayectoria.instante` y `procedencia.modelo`.
  Las fichas admiten enlaces `[texto](https://…)`.
- **Unidad «au»** (IAU 2012) en el panel de las piezas y en el panel del CNEOS.

Dos fallos de la Etapa A (M01) que aparecieron al verificar, corregidos con su prueba:

- el diálogo buscaba la ficha como «…/chelyabinsk.md», pero el módulo `virtual:fichas` usa el
  nombre del archivo, de modo que la ficha no se habría mostrado ni siquiera aprobada
  (`fichaDe` en `src/ui/ficha.ts`);
- en `npm run dev`, la ruta relativa que el módulo registraba para vigilar las fichas rompía la
  carga de la página; ahora es absoluta. La web publicada no estaba afectada.

Queda en manos del usuario: aprobar la ficha (`revision/ficha-chelyabinsk-para-revisar.md`) o
pedir cambios.

### Segunda revisión de la ficha · etapa 1, nubes desde el radiante · **hecha el 2026-10-12**

Origen: segunda auditoría consolidada de la ficha (versión del 12 de octubre), con un hallazgo
P0. Sortear cada elemento orbital por separado produce órbitas que no pasan por la Tierra. La
medición se extendió a las 25 piezas: solo Almahata Sitta, con su órbita telescópica, tenía el
100 % de las órbitas a menos de 0,002 au de la Tierra. En 21 piezas no llegaba a la mitad;
Chelyabinsk tenía el 6 % y Maribo y Villalbeto de la Peña, ninguna.

Resultado:

- **Método.** `nubeDesdeRadiante` (`src/core/montecarlo.ts`) sortea α_g, δ_g y v_g con su
  σ a 1σ e integra cada clon con N cuerpos desde la posición e instante de referencia, igual
  que la estela. `pipeline/nubes-pedigri.ts` (`npm run datos:nubes`, también dentro de
  `datos:pedigri`) tarda unos 50 s y genera:
  - `public/data/nubes.json`: 160 formas por pieza, unos 63 kB comprimido; se carga al crear
    la vista solar, fuera de la carga inicial;
  - `chelyabinsk-orbitas.json`: 300 órbitas, de las que las 160 primeras son las del catálogo;
  - `docs/reportes/nubes.md`.

  Almahata Sitta conserva el sorteo de la órbita de JPL.

- **Criterios de parada.** Radiante central frente a la órbita principal: D_D ≤ 0,1, con un
  máximo obtenido de 0,0019. Todas las órbitas a menos de 0,002 au de la Tierra: el máximo
  obtenido fue de 0,0005 au. Descartes ≤ 10 %: hubo 0.
- **Dispersión.** En muchas piezas la σ de la nube coincide con la publicada, porque la fuente
  calculó la órbita desde ese radiante. En 12 difiere más de un 40 % en a, e o i (lista en el
  reporte). En Chelyabinsk la nube es más estrecha en a (0,054 frente a 0,08 au) y más ancha en i
  (0,42° frente a 0,24°): sin covarianza, los márgenes del radiante y los de la órbita de Popova
  no son coherentes. Queda anotado también en el reporte de validación.
- **Textos.** Se actualizaron:
  - el párrafo de la ficha, que ahora cita la incertidumbre del radiante, explica qué significa
    sortear a 1σ (hallazgo 5) y enlaza el reporte de las nubes;
  - las descripciones de la escena (con una variante para la órbita de JPL);
  - la leyenda;
  - la Wiki.
- **Control automático.** La auditoría «Una sola órbita por pieza» comprueba también la fuente
  de cada nube del catálogo y su criterio. Pruebas nuevas en `tests/unit/nubes.test.ts`, entre
  ellas la que respalda la frase de la ficha sobre la dispersión.
- **Huella del CNEOS.** Al cambiar `src/core/` se recalcularon en local las 260 órbitas. Sus
  valores no cambian, porque el cálculo es el mismo; cambia la huella.

### Segunda revisión de la ficha · etapa 2, texto y fuentes · **hecha el 2026-10-12**

- **Material suplementario de Popova et al.** Descargado con permiso del usuario (7 MB, 157
  págs.) en `.trabajo/popova-suplemento/`; no se redistribuye. De él se verificaron:
  - la Tabla S1 (pág. 3), con hora, posición, altura y velocidad de cada episodio;
  - las cinco probabilidades del modelo de Bottke et al. (sección 1.1, pág. 20):
    62 / 25 / 11 / 2 / 0 %;
  - la lista completa de autores de Bottke et al. 2002.
- **Destellos (hallazgo 2).** La ficha ya no sugiere que el CNEOS registrara el destello de
  24 km: dice que no se ha establecido. El reporte de validación tiene una sección nueva, «¿Qué
  episodio registró el CNEOS?», con la Tabla S1 (`data/verificacion/chelyabinsk-destellos.json`)
  y el anuncio de JPL de 2013 (fuente nueva `cneos-anuncio-2013`). La longitud, la altura y la
  hora de 2013 encajan mejor con la disrupción secundaria (23,9 km); la latitud y la velocidad,
  con el pico principal. A la hora actual de la API, el bólido estaba a unos 66 km. Es un
  indicio, no una prueba.
- **Validación con el CNEOS (hallazgo 3).** La frase queda acotada a los errores típicos de
  Peña-Asensio et al. 2025, que ahora figura entre las fuentes de la ficha.
- **Procedencias (hallazgo 4).** El 2 % del cinturón exterior y el 0 % de los cometas de la
  familia de Júpiter entraron al dataset con su fuente; la ficha y el panel muestran las cinco.
- **Redacción (hallazgo 5).**
  - LL5: el tipo petrológico describe el metamorfismo en el cuerpo progenitor, y el «5» sale
    del dataset;
  - «se fragmentó en el aire en varias etapas»;
  - «donde el asteroide se rompió».
- **Trazabilidad (hallazgo 6).** La versión legible imprime los DOI. Se corrigió la nota de
  Borovička: δ_g = +0,28°, no 10,28°.

### Tercera revisión de la ficha (auditoría V3) · etapa 3 · **hecha el 2026-10-12**

Origen: una auditoría de la versión con nubes desde el radiante, hecha antes de la etapa 2, que
pedía pruebas reproducibles del algoritmo. El 2 % del cinturón exterior, la compatibilidad con
el CNEOS acotada a Peña-Asensio et al. y LL5 ya estaban resueltos en la etapa 2.

- **Reproducibilidad (requisito 4).** `docs/reportes/nubes.md` documenta, para cada pieza:
  - las entradas: instante, posición, radiante, v_g con su σ y nivel publicado;
  - la semilla numérica;
  - las σ efectivamente sorteadas frente a las declaradas;
  - la mediana de a, e, i y q de la nube frente a la órbita publicada (todas a menos de
    0,72σ).

  `nubes.json` guarda esas entradas, la semilla, el resumen y la sensibilidad.

- **Distribución (P0).** Hay una sensibilidad de Chelyabinsk que varía una sola entrada cada vez
  y repite el cálculo con el radiante de Borovička et al.:
  - el margen de la declinación produce la mayor parte de σi (0,37° de 0,42°);
  - con los márgenes de Borovička, radiante y órbita casi encajan (σa 0,023 frente a 0,02;
    σi 0,08 frente a 0,12).

  La diferencia con Popova está en sus propios márgenes, que la fuente no reconcilia. Dato nuevo
  en `data/verificacion/borovicka-2013-radiante.json`.

- **Pruebas (requisitos 1 a 3).** Las nuevas son:
  - umbrales de regresión cercanos a los valores obtenidos (D_D del centro < 0,005; órbitas a
    < 0,001 au de la Tierra; 0 descartes);
  - medianas a menos de 1σ;
  - σ sorteadas dentro de 4 errores típicos, con las entradas iguales al dataset;
  - reproducibilidad con la semilla: tres órbitas recalculadas coinciden con las guardadas;
  - la sensibilidad que respalda la frase de la ficha.
- **Ficha.**
  - velocidad geocéntrica (15,3 km/s) distinta de la de entrada (19,16 km/s);
  - 1σ por variable (cerca de un tercio fuera) y conjunta (algo más de dos de cada tres con
    alguna fuera);
  - energía radiada en el óptico según los sensores;
  - origen de la anchura en inclinación.

Queda en manos del usuario: aprobar la ficha (`revision/ficha-chelyabinsk-para-revisar.md`) o
pedir cambios.

### Cuarta revisión de la ficha · validada el 2026-10-12 · **etapa 4 hecha el 2026-10-12**

Documento «Mejoras priorizadas de la ficha de Chelyabinsk». Se validó contra el material
suplementario de Popova et al. (págs. 17–19 y 3) y con el código del proyecto:

- **Confirmado:**
  1. _P1._ La ficha dice que Popova no explica cómo obtuvo los márgenes de la órbita, pero el
     suplemento (pág. 18) dice: «Error bars were calculated from a Monte Carlo propagation of
     errors», partiendo del radiante aparente y la velocidad, corregidos por la rotación y la
     gravedad terrestres. **Bloquea la aprobación.**
  2. Con las cifras redondeadas de la Tabla 1, la línea central pasa a 259 656 km de la Tierra;
     con las cifras completas del suplemento (a 1,763270; e 0,580953; i 4,928787°;
     ω 108,301927°; Ω 326,442018°; q 0,738893), a 6008 km. Medido aquí con 3 millones de
     puntos por elipse.
  3. La estela y la nube parten del punto e instante de Granvik & Brown, que la ficha no cita.
     Popova da el suyo: 97,1 km sobre 54,445° N 64,565° E a las 03:20:19,8. Su Tabla S1 da
     la primera detección a las 03:20:20,8: hay 1 s de diferencia dentro de la propia fuente.
  4. Con σq 0,010 y σe 0,009 (Tabla S5B, 1σ), σa no puede pasar de 0,0618 ni con correlación
     perfecta. La Tabla 1 da 0,08 (±0,16 a 2σ) y la S5B no da σa.
  5. El radiante aparente y la velocidad de entrada de Popova (S5A: 328,62 ± 0,09°,
     +7,26 ± 0,10°, 19,16 ± 0,15 km/s) reproducen su órbita con el código del proyecto:
     a 1,7640; e 0,5811; i 4,910°; q 0,7390. Esto valida el método.
- **Hallazgo propio.** El suplemento da el radiante geocéntrico con ±1,0°, ±1,1° y ±0,2 km/s
  (pág. 17, sin nivel). La Tabla 1 del artículo da ±1,6°, ±1,8° y ±0,4 a 2σ, es decir 0,8, 0,9
  y 0,2 a 1σ. Los dos son mucho más anchos de lo que implica el radiante aparente (±0,1°). Por
  eso la nube actual, que sortea el radiante geocéntrico, sale 1,75 veces más ancha en i.
- **Válido en parte o de redacción:**
  - «pasan por donde estaba la Tierra»: la separación real es de 13 913 km de mediana y
    14 661 km como máximo; 0,002 au es solo el umbral de parada;
  - la frase del 0 %;
  - el encabezado de la versión legible, que dice «etapas 1 y 2»;
  - la frase de 1σ conjunta, que pesa para el público;
  - el commit y las versiones en los reportes.

**Decisión pendiente del usuario: qué entradas alimentan la nube de Chelyabinsk.**

| Opción                                                         | σa (au) | σe     | σi (°) | σq (au) | Nota                                               |
| -------------------------------------------------------------- | ------- | ------ | ------ | ------- | -------------------------------------------------- |
| A. Radiante geocéntrico de la Tabla 1 (actual)                 | 0,054   | 0,011  | 0,42   | 0,0065  | i 1,75 veces más ancha que el margen citado        |
| B. Radiante aparente y V∞ (S5A), el método que describe Popova | 0,024   | 0,0067 | 0,14   | 0,0023  | más estrecha que los márgenes que cita la ficha    |
| C. Elementos de la S5B, solo los que pasan junto a la Tierra   | 0,036   | 0,0080 | 0,24   | 0,012   | reproduce σe, σi, σq y σω publicados (recomendada) |

Las cifras de B y C son las de la auditoría, con 300 a 500 clones; se recalcularán al
implementar. Las 24 piezas restantes no cambian: con Granvik & Brown, la nube desde el radiante
ya reproduce las σ publicadas.

**Decisión del usuario (2026-10-12): opción C y toda la figura desde el punto de Popova.**

Resultado de la etapa 4:

- **Datos con su página:**
  - la órbita de Popova con todas las cifras (`orbitas[].cifras_completas`);
  - la entrada en la atmósfera (`entrada_atmosferica`: instante 03:20:19,8; 54,445° N
    64,565° E; 97,1 km; radiante aparente 328,62 ± 0,09°, +7,26 ± 0,10°; V∞ 19,16 ± 0,15);
  - las notas sobre el radiante geocéntrico del suplemento y sobre σa.
- **Estela.** Sale de `calcularDesdeEntrada`: radiante aparente y V∞ en el punto de Popova,
  con la rotación terrestre y sin altura convencional. Frente a su órbita da D_D 0,00106 y
  |z| ≤ 0,08. La auditoría la contrasta con `entrada_atmosferica`.
- **Nube, opción C** (`nubeCondicionada`, `pipeline/nubes-pedigri.ts`):
  - se aceptaron 300 de 70 457 sorteos, todos a menos de 15 000 km de la Tierra a las
    03:20:19,8, con una mediana de unos 9000 km;
  - σe 0,0093 (publicada 0,009) y σi 0,24° (0,24°); σq 0,0074, menor que 0,010 por el encuentro;
    σa 0,042, por debajo del máximo coherente de 0,062;
  - la línea central, con todas las cifras, pasa a unos 6000 km; con las cifras redondeadas
    pasaba a unos 260 000 km;
  - la sensibilidad A/B/C y la variante con el radio de captura (7994 km), que apenas cambia la
    dispersión, están en `nubes.md` y en `nubes.json`.
- **Ficha:**
  - el Monte Carlo de Popova (P1);
  - qué es la nube y qué reproduce;
  - la nota sobre σa;
  - «pasan rozando la Tierra», con la causa de la separación;
  - la frase del 0 %;
  - la velocidad geocéntrica frente a la de entrada, ahora en «Qué ocurrió».

  La 1σ conjunta pasó al reporte, y el encabezado de la versión legible se actualizó.

- **Reportes.** `nubes.md`, `chelyabinsk.md` y `trayectorias.md` llevan una línea de
  procedencia: commit, si había cambios sin confirmar, versión de astronomy-engine, Node y una
  huella del código y los datos de entrada. Si un reporte se genera antes de confirmar, la
  línea lo dice y la huella identifica el contenido. `npm run datos:trayectorias -- informe`
  regenera solo ese reporte, que ya incluye la estela de Chelyabinsk.
- **Pruebas:** la opción C reproduce σe y σi, la línea central pasa junto a la Tierra y la
  redondeada no, la sensibilidad A/B/C y la reproducibilidad de C y de una nube desde el
  radiante. Hay 270 pruebas unitarias.

### Quinta revisión de la ficha (auditoría V5) · **hecha el 2026-10-12**

La auditoría V5 se validó antes de aplicarla. Su diagnóstico del criterio de encuentro era
correcto, pero la corrección que proponía (cambiar 15 000 por 7994 km sobre la misma distancia)
no lo era: el radio de captura se compara con el parámetro de impacto, no con la distancia
geométrica en un instante. Medido:

- las órbitas calculadas desde estados reales de entrada (método A) tienen un parámetro de
  impacto de 7476 a 7707 km, por debajo del radio de captura (unos 7990 km), pero en el
  instante de entrada están a entre 13 199 y 14 716 km de la Tierra;
- con el criterio anterior (distancia < 15 000 km), 89 de las 300 órbitas de la nube no habrían
  chocado (parámetro de impacto de hasta 11 171 km).

Resultado:

- **Criterio nuevo** (`src/ciencia/encuentro.ts`, hoy `src/core/encuentro.ts`; fuera de `src/core` para no cambiar la huella
  del CNEOS): cada órbita sorteada se coloca en su punto más cercano a la Tierra a las
  03:20:19,8 y se conserva si su parámetro de impacto no supera su radio de captura,
  r·√(1 + v_esc²/v_g²), con r = 6371 + 100 km. La altura de atmósfera es un parámetro.
- **Nube:** 300 órbitas aceptadas de 108 763 sorteos (0,276 %); parámetro de impacto de 4926 a
  7997 km; distancia de 5109 a 13 342 km; σa 0,039, σe 0,0088, σi 0,24°, σq 0,0072, σω 1,21°.
  La línea central tiene un parámetro de impacto de 5870 km frente a un radio de captura de 7994.
- **Reporte de las nubes:** criterio, tasa de aceptación, mínimo, mediana y máximo del parámetro
  de impacto, del radio de captura y de la distancia, desfase de la máxima aproximación, columna
  σω, comprobación del criterio con el método A y comparación con el criterio anterior.
- **Ficha:** el párrafo de la nube describe el criterio (radio de captura de unos 8000 km,
  calculado desde la v_g de Popova), dice que el tercio fuera de margen es del sorteo inicial y
  que la nube sale más estrecha en la distancia y la orientación del perihelio. La nota sobre σa
  dice que se basa en una propagación lineal y que la documentación no explica la diferencia. La
  estela se describe con las mediciones de entrada de Popova, y la energía como «energía de
  impacto total del evento».
- **Pruebas:** 274 unitarias. Nuevas: cada órbita de la nube cumple el criterio, el criterio
  acepta las órbitas calculadas desde estados reales, la línea central choca, σω sale menor que la
  publicada, el criterio anterior dejaba pasar órbitas sin choque y las funciones de encuentro.
- No cambian la visualización ni los datos astronómicos.

### Ficha de Chelyabinsk · **aprobada el 2026-10-12**

El usuario la aprobó (revisor Pablo Hoffenberg) tras las etapas 1 a 4 y la revisión V5, hecha en
otra sesión (commits 4552763 y 2c3f0fd: criterio de encuentro por parámetro de impacto). Desde
ahora se publica en producción; la prueba e2e de accesibilidad lo comprueba.

### Mantenimiento corto · **hecho el 2026-10-13** (antes de la ola 3)

- **Imagen del runner fijada.** Los cuatro jobs (`ci.yml` y `cneos-diario.yml`) usan
  `ubuntu-24.04` en vez de `ubuntu-latest`, que pasa a Ubuntu 26 el 2026-10-19. Se actualiza a
  mano, comprobando la CI.
- **Aviso de Vite** (`configLoader: 'native'`): los dos imports sin extensión
  (`vite.config.ts` y `pipeline/fichas-publicables.ts`) llevan `.ts`, con
  `allowImportingTsExtensions` en `tsconfig.json` (posible porque no se emite JavaScript).
- **Posición de referencia de Chelyabinsk.** El catálogo usa el punto de entrada de la fuente
  de la órbita principal cuando lo publica (`entrada_atmosferica`: Popova, 54,445° N,
  64,565° E), que es donde empieza la estela, y si no, `punto_trayectoria` (Granvik & Brown, a
  unos 6 km al oeste en Chelyabinsk). El dato de Granvik & Brown se conserva para la
  verificación cruzada. La auditoría contrasta el panel con el dato que corresponde y la
  sección H incluye la posición de referencia entre los usos de la órbita principal; un test
  unitario y uno e2e lo comprueban.

### Evaluación de un tercero (2026-10-17) · validada contra el código

Evaluación de solo lectura del repositorio (copia en la conversación del 2026-10-17). Sus datos
se comprobaron: `app3d.ts` tiene 1027 líneas (826 en la auditoría del 2026-10-09),
`sourcemap: true` en producción, tres respaldos con el gmail en `.trabajo/` (~35 MB), `'es'`
fijo en 5 archivos, `MutationObserver` solo en `hoja.ts`. Las notas por dimensión no se usan.
Qué se adopta y en qué orden:

1. **Etapa 2 (M33 + M32)** con la centralización de formatos por idioma: **hecha el
   2026-10-17** (abajo).
2. **Huella del CNEOS por grafo de imports** (**hecha el 2026-10-17**, abajo). La evaluación propone una lista explícita de
   archivos; se descarta porque se desactualiza sin aviso. Además encontramos una laguna que no
   menciona: la huella solo cubre `src/core/`, así que un cambio en `registroDe()`
   (`src/cneos/eventos.ts`) o en la lógica de `pipeline/cneos-orbitas.ts` dejaría órbitas
   guardadas obsoletas. Solución: huella sobre el cierre transitivo de imports de
   `cneos-orbitas.ts`; permite devolver `encuentro.ts` a `src/core/`. Coste: un recálculo de las
   260 órbitas.
3. **Dividir `app3d.ts`** (M37; **hecha el 2026-10-17**, abajo) antes de la interfaz de ejemplares: coreografía, controlador del
   modo CNEOS y textos descriptivos en módulos propios, sin cambiar comportamiento; un estado
   tipado en lugar de leer el DOM solo si esa interfaz lo pide.
4. **Mapas de fuentes**: desactivarlos o `'hidden'` si la colección pasa a privada (M10).
5. **Modo CNEOS sin GPU** (M22, ola 5): medir con un perfil antes de optimizar; la evaluación
   supone que el coste es la geometría, sin medirlo.

No se adopta: cambiar el flujo con GitHub Desktop (decisión del usuario, riesgo cubierto por
`--ff-only` y la comprobación `ls-remote`). Recordatorio que sí vale: `.gitignore` no protege
una copia comprimida de la carpeta (respaldos con el gmail y, desde la etapa 2, lo privado).

### Etapa 2 de la Fase 4 · M33 y M32 · **hecha el 2026-10-17**

Modelo y protecciones, sin interfaz todavía (guía en `docs/coleccion.md`):

- **M33.** `src/schema/coleccion.ts`: `Ejemplar` (SKU, meteorito por id, tipo, `masa_muestra`
  en gramos de una fuente `registro-coleccion`, fotos, custodia, revisión por idioma) y
  `MeteoritoColeccion` (meteoritos sin órbita, sin campo de órbita). `src/coleccion/vista.ts`:
  recorrido si es una caída con órbita; si no, procedencia por clase (sin la asociación de
  2008 TC3, que es solo de Almahata Sitta); clase ambigua → sin procedencia, con motivo.
  `pipeline/coleccion.ts` (dentro de `npm run validate`): SKU y fotos únicos, meteorito
  existente, masa propia menor que la total, revisión en inglés solo con textos en inglés.
- **M32.** Esquemas públicos estrictos (un costo en el archivo público no valida);
  `EjemplarPrivado` en `data/coleccion/privado/` (en `.gitignore`; un test comprueba que git lo
  ignora y no tiene nada de ella); `npm run datos:fotos` publica solo las fotos de ejemplares
  aprobados, sin EXIF/XMP/IPTC/ICC; `verificar-dist` rechaza claves y textos privados, textos de
  ejemplares en borrador y fotos con metadatos en `dist/`. El campo privado de notas se llama
  `notas_privadas` porque `"notas":` ya aparece en el bundle (fuentes.json).
- **Formatos por idioma.** `src/i18n/formato.ts` (`numero`, `fijo`, `fecha`) sustituye los 17
  usos de `'es'` fijo; un test impide volver a fijar el idioma fuera de `src/i18n/`.
- Esquemas JSON regenerados (`docs/esquemas/`, el de meteorito estaba desactualizado) y los tres
  de la colección.
- Queda para la interfaz: dónde y cómo se muestran los ejemplares, la ficha del ejemplar
  (separada de la divulgativa) y, si hiciera falta, un campo de certificado.

### Ola 5 · plan acordado el 2026-10-21

Orden aprobado por el usuario: **O1** medir (M22) → **O2** no trabajar de más (M14, M13, con
prueba en su iPhone) → **O3** coste inicial y modo CNEOS (M15) → **O4** estado operativo y
errores (M17, M16; reporte por GitHub Issues) → **O5** CSP por `<meta>` (M31) → **O6** ficha
exportable (M42). Fuera por ahora: M39 (sin carga objetivo), M41 (decisión del usuario) y el
recorrido animado de los bólidos del CNEOS (función nueva, a pedido).

### O6 · ficha exportable (M42) · **hecha el 2026-10-21**

- Sección «Usar esta ficha» al final de la ficha publicada (`src/ui/dialogos.ts`), en los dos
  idiomas: imprimir o guardar en PDF (impresión del navegador), descargar los datos en JSON y
  cómo citar (proyecto, año, versión, dirección, licencia CC BY 4.0), más una frase que separa
  medición, cálculo propio e ilustración. Solo existe en fichas publicadas: no se exportan
  borradores ni nada privado.
- **JSON** (`datosFicha`): manifiesto (versión y fecha del build, licencia, cita, fecha de
  consulta del CNEOS, tipos de valor con los reportes), las cifras tal como las muestra la ficha
  con su fuente, las fuentes citadas completas y el registro del meteorito en el dataset.
- **Impresión** (`@media print` con `body.imprimiendo-ficha`): solo la ficha, en negro sobre
  blanco, con la dirección de cada enlace. Se encontraron y corrigieron dos cortes: el diálogo
  modal vive en la capa superior del navegador y cortaba el principio (se imprime como diálogo
  normal y se vuelve a abrir como modal), y la página, de alto fijo y sin desbordamiento, cortaba
  el final (al imprimir crece con la ficha). PDF de prueba: dos páginas A4.
- e2e `tests/e2e/ficha-exportable.spec.ts`: descarga y contenido del JSON, impresión desde el
  título hasta la cita sin la escena ni los paneles, y PDF generado.

### Ola 5 · cierre (2026-10-21)

Hechas O1–O6 (M22, M14, M13, M15, M17, M16, M31, M42). Pendiente del usuario: probar en su
iPhone el dibujo bajo demanda, el modo económico y la CSP en Safari. Fuera de la ola, por
decisión: M39 (sin carga objetivo), M41 (caídas posteriores a 2016, decisión del usuario) y el
recorrido animado de los bólidos del CNEOS (función nueva, a pedido).

### O5 · política de seguridad de contenido (M31) · **hecha el 2026-10-21**

- `pipeline/csp.ts` (solo en el build) pone una CSP en `<meta>`, porque Pages no admite
  cabeceras: todo del propio sitio (`default-src`, `script-src`, `connect-src`, `font-src`),
  imágenes también `data:`/`blob:` (texturas de Three.js), `object-src 'none'`,
  `form-action 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`, y `Referrer-Policy`
  `strict-origin-when-cross-origin` también en `<meta>`. Sin `unsafe-inline`: el único estilo en
  línea, el del tema, va autorizado por su huella SHA-256, calculada en el build; si apareciera
  otro script o estilo en línea, el build falla.
- No se puede por `<meta>`: `frame-ancestors` (quién puede incrustar la web) y
  `X-Content-Type-Options`; exigen cabeceras, es decir, otro hosting (M10) si la tienda la
  incrusta. Pages ya sirve los tipos MIME correctos.
- e2e `tests/e2e/csp.spec.ts`: ninguna violación en los recorridos principales (Tierra, vista
  solar, recorrido, ficha, fuentes, modo CNEOS, inglés) y un script inyectado no se ejecuta;
  98 e2e con el build de Pages. Probado solo en Chromium: Safari se verá en la prueba del
  usuario en su iPhone.

### O4 · estado operativo y errores (M17 y M16) · **hecha el 2026-10-21**

- **Tres fechas del CNEOS**: `pipeline/cneos-descargar.ts` escribe en cada consulta válida, con
  o sin cambios, `public/data/cneos/consulta.json` (`ConsultaCneos`: fecha, si trajo cambios,
  número de eventos). El panel muestra la última consulta, el último cambio en los datos y el
  evento más reciente; la descripción del globo, la última consulta. La auditoría comprueba
  que la consulta no es anterior al último cambio y que cuenta los mismos eventos.
- **Bot** (`cneos-diario.yml`): guarda y publica cada día, aunque no haya cambios («Consulta
  del CNEOS sin cambios»); las órbitas, el reporte y las e2e solo corren si cambiaron los datos.
  El commit diario mantiene el repositorio activo (los cron se desactivan tras 60 días sin
  actividad). Archivo inicial con la última consulta conocida (2026-10-19).
- **Vigilancia** (`vigilancia.yml`, 19:30 UTC, `pipeline/vigilancia.ts` sin dependencias):
  falla, y GitHub avisa por correo, si la portada no responde, si el catálogo no es JSON válido
  o si la última consulta tiene más de 48 h.
- **Diagnóstico** (diálogo «Fuentes y créditos»): versión publicada (commit y fecha del build,
  `__VERSION__` en `vite.config.ts`, con el commit de la copia de trabajo, que es el publicado
  también cuando la CI la llama el bot) y enlace a GitHub Issues con título y cuerpo rellenados
  (versión, vista e idioma; nada del navegador ni del dispositivo). Decisión del usuario:
  GitHub Issues, que exige cuenta.
- e2e `tests/e2e/diagnostico.spec.ts` y unitario de la regla de 48 h.

### O3 · coste inicial y modo CNEOS (M15) · **hecha el 2026-10-21**

Primero se midió (perfil de CPU y traza del navegador, con 4G lento y CPU ×4, sin GPU y con la
GPU real del Mac en Chromium con ventana):

- **El código de la app no es el problema**: ninguna función pasa de unas decenas de ms.
- **Modo CNEOS «lento» en la CI = artefacto**: sin GPU, el navegador compone por software y lee
  cada cuadro de WebGL (`GLES2::ReadPixels`, ~790 ms del cambio de modo). Con GPU real no
  aparece y el cambio ocupa el hilo principal 237 ms en total. Los > 3 s de la CI no reflejan
  un equipo real; la medición sigue siendo informativa allí.
- **Carga inicial con GPU real**: 4 tareas largas (~320 ms), sobre todo la compilación de los
  sombreadores (`GetProgramiv`, que espera a la GPU) y la creación del contexto WebGL.
  Desactivar `checkShaderErrors` quitaba esa espera de la traza, pero los hitos con GPU real
  quedaban iguales (escena 2230 frente a 2224 ms, mismas tareas largas): la compilación pasaba
  al primer dibujo. **Se revirtió**, porque además ocultaría errores de sombreadores.
- **La red quedaba a medias** entre los 170 y los 520 ms: los datos iniciales y la textura se
  pedían solo cuando el script de entrada se ejecutaba. **Cambio adoptado**: `pipeline/
precargas.ts` los anuncia en el HTML (`<link rel="preload">`) con los mismos modos CORS que la
  petición real; un test unitario comprueba que las rutas coinciden y una e2e
  (`tests/e2e/precargas.spec.ts`) que cada uno se descarga una sola vez y se usa.
- **Probado y descartado**: precargar también el módulo 3D (mismo resultado, con o sin
  `fetchpriority="low"`) y cargar `postprocessing` después del primer cuadro (17,6 kB gzip, ~9 %
  del módulo: ganaría ~100–150 ms a cambio de que el brillo apareciera de golpe; no compensa).

**Resultado** (local, mediana de 3, sin GPU): escena 2752 → 2590 ms (−6 %); texto 523 → 622 ms
(+100 ms: el script de entrada comparte la red con las precargas; el primer pintado no cambia,
~440 ms); modo CNEOS, panel 1216 → 880 ms y nube completa 1831 → 1226 ms (junto con O2). Con GPU
real, escena 2224 → 2081 ms. De paso, ESLint ignora `.trabajo/` y `revision/`.

### O2 · no trabajar de más (M14 y M13) · **hecha el 2026-10-21**

- **Dibujo bajo demanda** (`src/scene/escena.ts`): el bucle sigue en cada cuadro del navegador,
  pero solo dibuja si algo cambió: `invalidar()` desde la app (estado, reloj, recorrido, cámara,
  cargas tardías de nubes, textura y nube del CNEOS), los controles (`update()` y su evento
  `change`, incluida la inercia) y cualquier interacción con la página. Tras cada aviso dibuja al
  menos 3 cuadros, aunque el navegador estuviera ocupado (crear la vista solar lo bloquea). En
  reposo, un cuadro por segundo como red de seguridad. Con la pestaña oculta, el bucle se para.
- **Modo económico**: interruptor `#economico` (aviso `#aviso-economico`, elección recordada en
  `localStorage`); DPR 1 y sin postprocesado (el mapeo de tonos lo hace el renderer). Se activa
  solo si los cuadros a ritmo completo tardan más de 1/24 s durante 3 s, y no vuelve solo
  (histéresis); una elección manual desactiva lo automático en la sesión. La información
  científica no cambia; solo se pierde el halo de los marcadores.
- **Medido** (local, la máquina con carga 7–9): cuadros dibujados en 3 s de reposo, 3 (antes,
  todos: ~180 a 60 fps); vista solar sin GPU, 29,6 fps normal y 60 en económico (antes 28,6,
  solo normal); modo CNEOS, panel 802 ms y nube 1642 ms (antes 1216 y 1831); carga inicial sin
  cambio (escena 2801 ms, dentro del ruido). La batería e2e completa pasó de 6,4 a 3,9 min.
- **Pendiente del usuario**: probar en su iPhone (recorrido, vista solar, modo económico, batería
  y temperatura tras unos minutos).

### O1 · medir antes de optimizar (M22) · **hecha el 2026-10-21**

- **Hitos** con User Timing (`src/ui/metricas.ts`, sin enviar nada): `texto`, `catalogo`,
  `escena` (además de `__listo`), `nubes`, `cneos-panel`, `cneos-nube` (la nube completa: antes
  la medición del modo CNEOS terminaba al aparecer el título).
- **Prueba de rendimiento** (`tests/e2e/rendimiento.spec.ts`): 3 cargas en sesiones nuevas
  (`REPETICIONES`), mediana; LCP, CLS y tareas largas con observadores desde antes de la carga;
  resultados en `tests/e2e/.resultados/rendimiento-<proyecto>.json`. Bloquea (en local): FCP y
  escena < 3 s en mediana, CLS < 0,1 en todas. En la CI sigue informativa por el hardware.
- **Presupuestos de tamaño** (`pipeline/presupuestos.ts`, último paso de `npm run build`, sí
  bloquean la CI porque no dependen del hardware): siete grupos en kB gzip con ~10 % de margen.
- **Línea de base** (local, 4G lento, CPU ×4, mediana de 3): FCP 420 ms, texto 523, catálogo
  785, LCP 580, escena 2752 ms; CLS 0; 5 tareas largas (1,0 s en total); 314 kB transferidos.
  Modo CNEOS: panel 1216 ms, nube completa 1831 ms. fps vista solar (sin GPU): 28,6.
  Tamaños: inicial 35,3 kB, módulo 3D 187,8, datos iniciales 40,7, textura 47,8, nubes 65,6,
  CNEOS 51,5, inglés 9,4.

### M38 · etapa E2, traducción al inglés · **aprobada y publicada el 2026-10-21**

- `src/i18n/en.json` (todas las claves, mismos parámetros), `src/i18n/datos.en.json` (25 textos
  de datos y 13 licencias, cada uno con su original) y `content/fichas/chelyabinsk.en.md`
  (mismos marcadores; sin cifras a mano). `revision.json`: `en` en borrador.
- Términos: «meteorites with known orbits» (pedigrí), «fireball» (bólido), «fall» (caída),
  «fact sheet» (ficha), «Always daytime». Las tres citas de Granvik & Brown 2018 van con sus
  palabras originales (LaTeX en `.trabajo/gb2018`: «potentially linked to (6) Hebe», «most
  likely», «somewhat at odds with»), no retraducidas del español.
- Para no usar «real-time» (lo prohíbe el test del CNEOS aunque sea para negarlo): «Not
  continuously updated»; la velocidad «Tiempo real» es «True speed».
- Encontrado al revisar las capturas y corregido: la letra del oeste estaba fija («O»; en
  inglés, W) y los porcentajes llevaban el espacio del español; ahora `cardinal()` y
  `porcentaje()` en `src/i18n/formato.ts`. La conjunción de las citas cortas («Granvik y Brown»)
  sigue el idioma (`citaLocal`). Las licencias del diálogo de fuentes también se traducen.
- La ficha va por idioma (`chelyabinsk.en.md`, aprobación propia); sin ficha aprobada en un
  idioma, no hay botón en ese idioma. El build de revisión incluye la ficha en borrador.
- Las e2e fijan `locale: 'es-ES'`: con el inglés publicado, el navegador de pruebas (en-US)
  habría abierto la web en inglés.
- **Revisión de terminología del 2026-10-21** (pedida por el usuario): el título no se traduce
  (es el nombre del proyecto; la web llevará el de la tienda); horas UTC en formato de 24 horas
  en todos los idiomas (`hourCycle: 'h23'` en `fecha()`: «03:20 UTC», no «3:20 AM»); «true
  scale», «luminous trajectory», «atmospheric entry trajectory», «N-body integration», «escape
  route» e «intermediate Mars-crossers (IMC)» como en Granvik et al. 2018; «inner / middle /
  outer main belt»; en la ficha, los nombres de región conservan la mayúscula de los nombres
  propios («the Jupiter-family comets»). Ningún texto en inglés añade afirmaciones que no estén
  en el español (se retiró una sobre Benešov durante la revisión).
- **Aprobación del usuario** (2026-10-21, Pablo Hoffenberg), con una pasada previa de estilo
  pedida por él: frases directas en la prosa (ficha, descripciones, avisos, justificaciones,
  licencias), sin rayas ni dos puntos o punto y coma como recurso; las etiquetas de interfaz del
  tipo «Visual scale: …» se mantienen. Con el inglés en el build pasan las 84 e2e; el visitante
  en español no descarga el fragmento inglés (29 kB). Medición de carga con la máquina cargada
  (promedio 8–13 en 8 núcleos): 2,94 s, dentro del límite; los fps bajaron por la carga.

### M38 · etapa E1, infraestructura de idiomas · **hecha el 2026-10-21**

Sin traducir aún (guía en `docs/idiomas.md`). Decisiones del usuario: detección del navegador,
unidades métricas, revisa él, wiki solo en español.

- Elección al cargar (`?lang=` → navegador → español) y selector que recarga con `?lang=`
  (cabecera; en pantallas ≤ 640 px pasa a la pestaña Info, porque en la cabecera le quitaba a la
  escena del 320×568 más de lo que admite la prueba). La URL conserva `lang` si se pidió.
- `virtual:idiomas`: un idioma solo entra en el build aprobado (`src/i18n/revision.json`, con
  revisor y fecha); en desarrollo, todos; `IDIOMAS_VISTA_PREVIA=en` para un build de revisión.
  Cada idioma va en su fragmento y solo se descarga si se elige (carga inicial igual: 2,8 s).
- Textos de datos (25, 484 palabras: regiones de escape, asociaciones, motivos) con clave
  estable y traducción guardada junto a su original: si el español cambia, se muestra el
  español y un test lo señala.
- Auditoría: cifras en otros idiomas con las mismas excepciones, y ninguna cifra nueva en una
  traducción de datos. `verificar-dist`: ningún texto de un idioma en borrador en `dist/`.
  Tests: mismas claves y parámetros; nada de «live»/«real-time»; completo y al día si aprobado.
- e2e `tests/e2e/idioma.spec.ts` (se salta sin inglés en el build): `lang="en-US"`, punto
  decimal, vuelta al español, navegador en inglés. Verificada con un diccionario temporal.

### M35 · iluminación de presentación y tema de marca · **hecha el 2026-10-21** (parte)

Pedido del amigo («que siempre sea de día» y adaptar el aspecto a la tienda):

- **Siempre de día** (por defecto): `fijarIluminacion` en `src/scene/tierra.ts`; la luz sale de
  detrás de la cámara, algo arriba y a la izquierda, y la atmósfera la sigue. Rotulado como
  la escala visual: interruptor «Siempre de día», aviso `#aviso-iluminacion` y una frase en la
  descripción accesible; `?luz=real` vuelve al Sol real. La vista solar no cambia. e2e nueva
  (`tests/e2e/iluminacion.spec.ts`): luz a < 40° de la cámara en presentación y a < 0,01° del
  Sol en real; con Novato (caída nocturna) se ve la diferencia.
- **Tema** (`src/tema.ts`, guía `docs/marca.md`): variables CSS de la interfaz (inyectadas en
  `index.html` por `pipeline/tema-css.ts`, sin destello inicial), colores de capa de la escena y
  de la leyenda, grupos del CNEOS. Tests: cada `var(--…)` existe en el tema, la leyenda usa
  colores de capa, la escena no escribe colores de capa a mano.
- **Corregido de paso**: (1) con cualquier pieza que no fuera Chelyabinsk, el marcador final
  del globo decía «Pico de brillo (CNEOS)»; ahora «Final de la aproximación calculada»;
  (2) la leyenda pintaba la estela de las piezas con el color de la línea central de
  Chelyabinsk (`#ffe2b8`) en lugar del de la estela (`#ffd08a`).
- **Queda de M35**: los recursos de marca de la tienda (colores, tipografía, logo); la
  jerarquía de avisos que compiten con la escena y las etiquetas que se cruzan con los paneles.

### Etapa 4 de la Fase 4 · `app3d.ts` dividido (M37) · **hecha el 2026-10-17**

De 1027 a 736 líneas, sin cambiar comportamiento (80 e2e iguales; carga 2,8 s y modo CNEOS
1,2 s, como antes). Salieron con una interfaz explícita:

- `src/ui/descripcion-escena.ts`: descripción accesible de cada vista, fecha relativa, botón
  del final, mensaje de llegada, aviso de escala y leyenda de capas, como funciones puras de una
  instantánea del estado (`EstadoDescrito`); 5 tests unitarios nuevos (antes solo las e2e).
- `src/camera/recorrido.ts`: los 9 pasos del recorrido y sus duraciones, sobre un contexto
  (`ContextoRecorrido`).
- `src/ui/teclado.ts`: cámara con botones y teclas (M04) y atajos globales.
- `src/scene/puntero.ts`: selección con el puntero (clic frente a arrastre).
- `src/ui/trayectorias.ts`: tipo y carga con caché de las trayectorias de las piezas.

Queda en `app3d.ts` el orquestador: estado, vista solar bajo demanda, selección de pieza y el
controlador del modo CNEOS, que comparten estado. Sacarlo exige el estado central tipado, que se
introducirá con la interfaz de ejemplares si la pide (punto 8 de la evaluación).

### Etapa 3 de la Fase 4 · huella del CNEOS por grafo de imports · **hecha el 2026-10-17**

- El cálculo de cada órbita pasó a `pipeline/cneos-calculo.ts`; `pipeline/cneos-orbitas.ts`
  conserva la lectura, la caché y el resumen, y `pipeline/cneos-metodo.ts` los parámetros y la
  huella (separada para que retocarla no obligue a recalcular).
- `dependenciasDelMetodo` (`pipeline/huella-metodo.ts`) recorre los imports de ejecución desde
  el archivo del cálculo (sin `import type`) y la huella suma la versión de cada paquete
  externo. Hoy cubre `pipeline/cneos-calculo.ts`, `src/cneos/eventos.ts` (`registroDe()`, la
  laguna) y nueve archivos de `src/core/`; deja fuera `resonancias`, `similitud`, `encuentro`,
  el esquema y el resumen.
- `encuentro.ts` volvió a `src/core/` (estaba en `src/ciencia/` solo por la huella).
- Test nuevo (`tests/unit/huella-metodo.test.ts`): falla si alguna órbita guardada no
  corresponde al código actual, así que un cambio en el cálculo no llega a `main` sin recalcular
  en local (el bot no podría hacerlo en su tiempo límite).
- Recálculo: 260 órbitas en 7 procesos, unos 4 minutos (no 45: aquella cifra era de la primera
  pasada, con otro método). Las 260 salieron **idénticas a las anteriores salvo la huella**
  (`05d8fa3622d57dfd` → `3f9ef82a84dd4f50`) y el resumen público, idéntico byte a byte: el
  cambio no alteró ningún resultado. `docs/reportes/cneos.md` regenerado (solo cambia la huella).
- `procedenciaReporte` (encabezado informativo de los reportes) sigue usando `src/core/` más los
  archivos que se le pasan; no decide recálculos.

### Etapa D · CI y operación · **hecha el 2026-10-11** (ola 1)

Resultado:

- **M19.** Un solo build con la ruta de Pages; las e2e prueban ese `dist/` servido bajo el
  mismo prefijo. El servidor de pruebas ahora da 404 reales, como Pages; antes devolvía la
  portada para cualquier archivo inexistente y podía ocultar errores de rutas. El artefacto
  publicado es el probado (se registra su huella), y tras publicar se comprueba la web en vivo.
  El procedimiento de reversión está en `CLAUDE.md`.
- **M20.** El bot del CNEOS pasa las e2e antes de guardar en `main`, y la publicación se omite
  si `main` ya avanzó, de modo que dos ejecuciones no pueden servir la más antigua.
- **M30.** Dependabot (npm y Actions) con 14 días de espera y grupos de cambios menores;
  `npm audit --omit=dev --audit-level=high` en un job aparte. Acciones fijadas por SHA a
  versiones con Node 24: checkout v7.0.1, setup-node v7.0.0 (la v7.1.0 tenía 3 días),
  upload-pages-artifact v5.0.0 y deploy-pages v5.0.1. Se quitó configure-pages, que no hacía
  falta sin build en el job de publicación.
- La medición «cambio al modo CNEOS» que falló en la CI no era una regresión: con la hoja
  móvil, el botón estaba en una pestaña cerrada. Medido de nuevo: 1,2 s.
- M16 (versión visible) y M17 (alerta por antigüedad) siguen en P3.

Plan original:

| Id  | Qué                                                                                               | Nuestra prioridad |
| --- | ------------------------------------------------------------------------------------------------- | ----------------- |
| M20 | El bot ejecuta los e2e antes de hacer push a `main`                                               | P2                |
| M19 | Construir una vez con la base de Pages, probar ese `dist` y desplegarlo sin recompilar            | P2                |
| M30 | Dependabot (npm y Actions) con revisión, sin actualizar a ciegas el núcleo numérico               | P2                |
| M16 | Versión, commit y fecha del dataset visibles en «Fuentes y créditos»; sin telemetría (privacidad) | P3                |
| M17 | Aviso si pasan más de 48 h sin una ejecución correcta del workflow                                | P3                |

### Entradas de diseño de la Fase 4 (no son tareas sueltas)

- **M33**: separar **meteorito** (científico, compartido) de **ejemplar** (SKU, masa de la
  muestra, fotos, procedencia). Nunca reutilizar la masa total como masa del ejemplar.
- **M32**: clasificar los campos públicos y privados (costos, proveedores, EXIF de las fotos).
  Un repositorio privado no hace privada la web publicada.
- **M10**: decidir el alojamiento según el uso: divulgación enlazada desde la tienda (Pages
  vale) o parte del embudo comercial (otro hosting).
- **M11**: identificación en MetBull de las 25 piezas (pendiente tuyo: los PDF en
  `revision/metbull/`).
- **M29**: inventario de licencias por activo; antes de un uso comercial, revisar la
  textura Blue Marble y las condiciones de la NASA.

### Después (P3, solo si se necesita)

- **M12** páginas estáticas por pieza, con SEO y Open Graph: solo si la visualización debe
  captar tráfico por sí misma.
- **M13–M15, M22** rendimiento: modo económico, render bajo demanda, división del módulo 3D
  de 721 kB y presupuestos medidos. Se fusiona con la deuda previa «Módulo 3D > 500 kB» y
  «fps en GPU real».
- **M31** CSP por `<meta>` (Pages no permite cabeceras propias).
- **M34–M36** entrada guiada, iluminación de presentación (lo que pidió tu amigo con «solo de
  día»), botón de compartir y Atrás.
- **M37** dividir `app3d.ts` (826 líneas) cuando la Fase 4 lo exija, no antes.
- **M38** i18n: la estimación de «uno o dos días» del documento para tu amigo es optimista; con
  revisión son 3–5 días por idioma.
  **Confirmado el 2026-10-14:** habrá versión en inglés de EE. UU. después de la Fase 4; lo que
  se diseñe antes (M33, fichas de la Fase 4) se prepara para dos idiomas. Medido: 227 textos de
  interfaz (~2500 palabras), ~500 palabras de textos del dataset visibles, la ficha de
  Chelyabinsk (~900, con aprobación propia en inglés), `'es'` fijo en 5 archivos (números con
  coma decimal, fechas), 151 comprobaciones de texto en las e2e. Esfuerzo: 2–3 sesiones más la
  revisión del usuario; coste continuo: cada texto nuevo, dos veces.
- **M39** escalado a un catálogo grande; **M41** caídas posteriores a 2016 (ya era una
  decisión pendiente tuya); **M42** ficha exportable.

## Deuda previa que sigue vigente (no cubierta por la auditoría)

- Recorrido animado de los bólidos del CNEOS: barato (las órbitas guardan la anomalía
  media); no hecho.
- No se modela la deceleración atmosférica antes del pico o del punto de referencia.
- Nubes calculadas desde el radiante publicado, con sus errores tratados como gaussianos
  independientes (las fuentes no publican la covarianza). Los clones de la nube de Chelyabinsk
  se mueven con Kepler; la estela y el cálculo de cada clon usan N cuerpos.
- Regiones de escape aproximadas (Hungaria/Phocaea sin excentricidad; ν6 y JFC sin geometría).
- Pruebas e2e lentas en GitHub (reintento 1 y anotaciones públicas).
