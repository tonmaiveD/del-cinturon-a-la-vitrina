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

### Etapa C · Rigor del CNEOS (1–2 sesiones más un recálculo de ~45 min)

| Id  | Qué                                                                                                                                                                                                                    | Nuestra prioridad |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| M18 | Huella automática del método (hash del núcleo, de los parámetros y del lockfile) en lugar de `VERSION_METODO` manual. Va primero, para que el recálculo de M09 sea limpio                                              | P2                |
| M09 | Perturbar el radiante geocéntrico (α_g, δ_g, v_g) como describe la Tabla 4, medir la cobertura con los 18 eventos calibrados y declarar en pantalla «68 % de los clones de este modelo», no una probabilidad calibrada | P1                |
| M08 | Contrato estricto de la API: versión, `count`, números finitos, rangos, IDs únicos; cuarentena si hay cambios masivos                                                                                                  | P1                |
| M27 | Leyenda persistente por capa: fuente, método y la aclaración «la densidad no es una probabilidad calibrada»                                                                                                            | P2                |

### Etapa D · CI y operación (1 sesión, S)

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
- **M39** escalado a un catálogo grande; **M41** caídas posteriores a 2016 (ya era una
  decisión pendiente tuya); **M42** ficha exportable.

## Deuda previa que sigue vigente (no cubierta por la auditoría)

- Recorrido animado de los bólidos del CNEOS: barato (las órbitas guardan la anomalía
  media); no hecho.
- No se modela la deceleración atmosférica antes del pico o del punto de referencia.
- Incertidumbres de órbitas publicadas como gaussianas independientes (sin covarianza); los
  clones de Chelyabinsk se mueven con Kepler (solo la nominal con N cuerpos).
- Regiones de escape aproximadas (Hungaria/Phocaea sin excentricidad; ν6 y JFC sin geometría).
- Pruebas e2e lentas en GitHub (reintento 1 y anotaciones públicas).
