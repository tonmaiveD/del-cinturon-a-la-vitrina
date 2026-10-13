# Del cinturón a la vitrina — guía del proyecto

App web estática (español neutro, preparada para i18n) que muestra el viaje de meteoritos desde
su región de origen hasta la Tierra, con rigor científico verificable. Plan: fases 0–4.

## Retomar aquí

### Estado (2026-10-12)

- **2026-10-12: revisión de la ficha de Chelyabinsk hecha** (auditoría consolidada que trajo
  el usuario; detalle en `docs/deuda-tecnica.md`). El recorrido de Chelyabinsk ya dibuja la
  órbita de Popova, la misma que cita la ficha; la nube del CNEOS queda como validación. La
  ficha sigue en `borrador` a la espera de su aprobación.
- **2026-10-12: segunda revisión de la ficha hecha** (etapas 1 y 2): las nubes de las 25
  piezas se calculan desde el radiante (`npm run datos:nubes`); la ficha cita la tabla S1 y las
  cinco procedencias del material suplementario de Popova (en `.trabajo/popova-suplemento/`, no
  se redistribuye). Etapa 3 (auditoría V3) hecha: reporte de nubes reproducible (entradas,
  semillas, sensibilidad) y pruebas más estrictas.
- **2026-10-12: cuarta revisión hecha (etapa 4)**, con la opción C elegida por el usuario. La
  estela de Chelyabinsk sale del radiante aparente y el punto de entrada de Popova, y su nube
  sortea los elementos publicados y conserva las órbitas que pasan a menos de 15 000 km de la
  Tierra. La ficha corrige lo del Monte Carlo. **Falta que el usuario apruebe la ficha**; después,
  ola 3.
- **Siguiente paso: ola 3 = Fase 4 (colección y fichas).** Necesita decisiones del usuario
  (ver «Fase 4» abajo). Si aún no las tiene, se puede empezar por lo que no las necesita: el
  modelo meteorito ≠ ejemplar (M33) y el manejo de campos privados (M32). Se lo propuse el
  2026-10-12 y está pendiente su respuesta.
- **Fases 0–3 cerradas** (`docs/cierres/fase-1.md`, `fase-2.md`, `fase-3.md`; la 3 confirmada
  el 2026-10-09) y **olas 0, 1 y 2 de la hoja de ruta hechas y publicadas** (etapas A, B, C y D
  de la deuda técnica).
- **Ubicación:** `~/Proyectos/del-cinturon-a-la-vitrina` (fuera de iCloud) y la wiki en
  `~/Proyectos/del-cinturon-a-la-vitrina.wiki`. La copia antigua de Documentos ya fue borrada.
- **Publicación:** https://tonmaived.github.io/del-cinturon-a-la-vitrina/ (repo público
  `tonmaiveD/del-cinturon-a-la-vitrina`) y wiki en
  https://github.com/tonmaiveD/del-cinturon-a-la-vitrina/wiki. La CI publica desde `main`
  (ver «CI desde la Etapa D» en las notas operativas). El CNEOS se actualiza solo cada día
  (`cneos-diario.yml`, 07:30 UTC, con retrasos posibles) y Dependabot revisa dependencias los
  lunes.
- **Verificación al 2026-10-12:**
  - 255 tests unitarios y 80 e2e (escritorio y móvil), más la medición de rendimiento
    (aislada: `npm run e2e:rendimiento`; en paralelo con las demás roza el límite de 3 s);
  - auditoría: 587 datos, 0 errores;
  - carga inicial unos 2,8 s en 4G lento;
  - cambio al modo CNEOS: 1,2 s en local y 3,2–3,4 s en la CI sin GPU. Esa medición
    informativa falla en la CI y no bloquea; queda para la ola 5.

### Hoja de ruta acordada (2026-10-09)

Criterios: primero lo roto o lo que bloquea; luego dependencias; luego impacto sobre el
objetivo (la web de la tienda del amigo: confianza, presentación, uso) dividido por esfuerzo.
Lo que depende del usuario corre en paralelo, y la Fase 4 se adelanta si llegan sus datos.

0. **Hecha (2026-10-11).** La hoja móvil está publicada y el usuario la probó en su iPhone
   16 Pro Max («se ve bien»). La Fase 3 quedó cerrada. El proyecto vive en `~/Proyectos`; el
   usuario quitó la carpeta antigua de Documentos y la quitó de GitHub Desktop. La primera
   página de la Wiki fue creada desde la web.
1. **Hecha (2026-10-12).** Publicada por la CI nueva: se probó el mismo artefacto, se comprobó
   que era el último commit de `main` y se verificó la web en vivo; 76 e2e en verde.
   - Duración del recorrido elegible.
   - Etapa D.
   - Wiki publicada (8 páginas); su historia y la de `main` se reescribieron el 2026-10-11 para
     que solo aparezca apaec@yahoo.com, con push forzado hecho por el usuario y respaldos en
     `.trabajo/`.
   - Dependabot: TypeScript >= 6.1 ignorado mientras typescript-eslint no lo admita.
   - Dato de rendimiento: el cambio al modo CNEOS tarda 1,2 s en local y 3,2–3,4 s en la CI
     (sin GPU, CPU ×4); es una medición informativa, para la ola 5 (M22).
2. **Hecha y publicada (2026-10-12).** Etapa C completa (M18, M09, M08,
   M27); detalle en `docs/deuda-tecnica.md`. Se recalcularon las 260 órbitas del CNEOS con los
   errores aplicados al radiante geocéntrico. Cobertura frente a los 12 eventos calibrados del
   grupo fiable: 35/48 dentro del 68 % y 45/48 dentro del 95 %. La validación de Chelyabinsk
   sigue aprobada; con el método nuevo la nube es más estrecha en inclinación, y en el análisis
   de sensibilidad (σ = mediana, informativo) Emel'yanenko 2014 queda a 3,9σ en i. Wiki
   actualizada y publicada.
3. **Fase 4 (2 sesiones):** con M33, M32, M10 y M29; necesita las decisiones del usuario.
4. **Presentación para la tienda (2–3 sesiones):**
   - iluminación de día (M35, la pidió el amigo) y marca;
   - soundtrack con los MP3 del usuario: apagado por defecto, carga diferida, «todos los
     derechos reservados», fuera de la CC BY;
   - M34 y M36; M12 solo si hace falta captar tráfico.
5. **Optimización y ampliación:** M13–M16, M22, M31, M37 (antes si la Fase 4 lo exige), M38,
   M39, M41, M42.

**Tarea continua: Wiki de GitHub** (pedida el 2026-10-11). Documentar el proyecto en la
sección Wiki del repositorio, siguiendo sus convenciones:

- `Home.md` como portada;
- `_Sidebar.md` con el índice y `_Footer.md` con licencia y enlace a la web;
- una página por tema, con nombres separados por guiones (por ejemplo `Fuentes-y-licencias.md`);
- enlaces internos `[[Nombre de la página]]`.

Escribir en lenguaje natural, de modo que no se note el uso de IA. Son las mismas reglas que se
usaron en el documento para el amigo: sin dos puntos como recurso, sin negritas de entrada,
sin comillas «», párrafos en vez de listas salvo cuando una lista sea lo natural, frases
directas y sin muletillas.

- **Primera versión publicada el 2026-10-11.** Tiene 8 páginas: Home, Cómo usar la web, De
  dónde salen los datos, Método y límites, Actualización diaria de bólidos, Licencias,
  Arquitectura y desarrollo, Historial de cambios; más `_Sidebar` y `_Footer`. Se actualizó con
  la ola 2.
- **Mantenimiento:** se actualiza al cerrar cada ola, sin quedar como una etapa aparte.
- **Cómo se trabaja.** La wiki es un repositorio git aparte, clonado en
  `~/Proyectos/del-cinturon-a-la-vitrina.wiki` y añadido a GitHub Desktop. Yo hago commits en
  local con apaec@yahoo.com (configurado en el repo) y el usuario sube con «Push origin».
  Nunca editar la wiki desde la web (firmaría con el gmail).

En paralelo, del usuario:

- colección pública o privada;
- lista de piezas;
- aprobar la ficha de Chelyabinsk;
- PDF de MetBull;
- clave de la API (al llegar a la Fase 4);
- marca del amigo y los MP3;
- opcional: pedir al soporte de GitHub que purgue las vistas cacheadas de los commits
  reescritos el 2026-10-11 (aún accesibles por enlace directo, p. ej. desde Actions).

### Fase 4 (colección y fichas con la API de Claude)

M01 (borradores fuera del build), su requisito previo, está hecho. El diseño de la Fase 4 debe
incorporar M33 (meteorito ≠ ejemplar), M32 (campos privados), M10 (hosting según el uso:
Pages no admite ser el alojamiento principal de una tienda) y M29 (licencias por activo,
sobre todo Blue Marble para uso comercial).

Explicada al usuario el 2026-10-08; falta su respuesta para presentar el plan detallado.

1. **Colección del usuario**: él aporta la lista de sus piezas (nombre, masa del ejemplar,
   número de catálogo, procedencia, fotos opcionales; formato planilla/CSV o JSON con esquema
   zod en `data/coleccion/`). Validación de nombres contra MetBull (bloqueado por anti-bots: no
   se elude) con respaldo en NASA Meteorite Landings. Si la pieza es de un meteorito con órbita,
   se enlaza con su recorrido; si no, «nube de procedencia» por clase (capa de asociación con
   progenitor ya existente), nunca una órbita inventada.
2. **Fichas narrativas** generadas con la API de Claude **en build** (nunca en el navegador;
   clave como secreto de GitHub, principio 5), estado `borrador` hasta revisión del usuario;
   el control de cifras (`cifrasFueraDeMarcadores`, auditoría) se aplica igual. Antes de
   generar, calcular el coste con la tarifa vigente (skill `claude-api`), no de memoria.
3. **Decisiones que necesita el usuario antes de empezar:** (a) colección **pública o
   privada** (hoy el repo es público: todo lo subido es visible; si privada → Cloudflare Pages o
   Netlify con repo privado y, si hace falta, acceso con contraseña); (b) la lista de piezas;
   (c) crear la API key de Anthropic y guardarla como secreto (pasos a darle en su momento).
4. Esfuerzo estimado: ~2 sesiones largas (colección; fichas), por etapas con OK.

### Pendientes del usuario (sin urgencia)

- **Ficha de Chelyabinsk** (`content/fichas/chelyabinsk.md`, `borrador`, reescrita el
  2026-10-12 tras la auditoría consolidada): versión legible en
  `revision/ficha-chelyabinsk-para-revisar.md` (regenerar con `.trabajo/ficha-legible.ts` si
  cambia). Respuesta esperada: «apruebo» + nombre del revisor (→ `estado: aprobada`,
  `revisado_por`, `fecha_revision`) o cambios en sus palabras.
- **MetBull**: PDF de cada registro en `revision/metbull/` (instrucciones dadas: buscar en
  https://www.lpi.usra.edu/meteor/metbull.php, Archivo → Imprimir → Guardar como PDF). Con ellos:
  nombres oficiales (hoy los 25 «pendiente»), masa recuperada y punto de caída. Chelyabinsk: 57165.
- **Decidir** si se añaden caídas posteriores a 2016 (Hamburg, Flensburg, Novo Mesto,
  Winchcombe, Ribbeck…) desde sus artículos originales; recomendado después de la Fase 4.
- **Rutina de publicación**: «Fetch origin» (y «Pull origin» si aparece) antes de «Push origin»
  en GitHub Desktop, porque el bot del CNEOS hace commits en `main`. Desktop tiene dos
  repositorios: el proyecto y la wiki. Si alguna vez hace falta un push forzado (solo con
  autorización expresa), el usuario lo hizo con éxito desde el menú de Desktop: el botón
  principal solo ofrecía «Pull origin».

### Decisiones del usuario (no reabrir)

- 2026-10-01: proyecto en `~/Documents/del-cinturon-a-la-vitrina`; todo en esta carpeta.
  **Sustituida el 2026-10-09:** el proyecto vive en `~/Proyectos/del-cinturon-a-la-vitrina`,
  fuera de iCloud, para que la sincronización no ralentice las pruebas ni suba a iCloud el
  respaldo con el gmail. Todo sigue en esta carpeta.
- 2026-10-05: Almahata Sitta → órbita principal JPL (telescópica); incertidumbres de Granvik &
  Brown solo documentadas, no infladas.
- 2026-10-06: hosting GitHub Pages, repo público; licencias MIT (código) y CC BY 4.0 (datos y
  textos); email de commits apaec@yahoo.com (historial reescrito; gmail fuera de GitHub).
- 2026-10-06: CNEOS grupo de alto D_D → **sin órbita** con nota (opción a).
- 2026-10-07: el PDF de Borovička 2013 se usa (en `revision/`, sin redistribuir).
- 2026-10-08: recorridos de las 25 piezas por lotes; **altura convencional de 100 km**
  declarada; Almahata Sitta desde el estado de JPL con **criterio solo D_D** explicado en
  pantalla (opción A). Conservar el respaldo con el gmail (`.trabajo/`, ver abajo).
- 2026-10-09: la auditoría externa se adopta como backlog (`docs/deuda-tecnica.md`) y el orden
  de trabajo es el de la «Hoja de ruta acordada» (olas 0–5).
- 2026-10-09: hoja móvil al estilo de Mapas de Apple (opción C), probada por el usuario en su
  iPhone 16 Pro Max.
- 2026-10-11: documentación continua en la wiki, en lenguaje natural y sin rasgos de texto de
  IA.
- 2026-10-12: **una sola órbita por pieza**. El recorrido de Chelyabinsk dibuja la órbita de
  Popova et al. 2013 (nube muestreada con su σ y estela desde su radiante), la misma que cita
  la ficha; el cálculo desde el CNEOS queda como validación independiente. La auditoría
  comprueba esa coherencia en las 25 piezas. Unidad «au» en la interfaz.
- 2026-10-12: **nubes desde el radiante** en todas las piezas salvo Almahata Sitta (órbita de
  JPL): se sortean α_g, δ_g y v_g y cada clon se integra como la estela. Sustituye al sorteo de
  elementos independientes, que daba órbitas que no pasan por la Tierra.
- 2026-10-12: **Chelyabinsk, opción C**: su nube sortea los elementos publicados de Popova y
  conserva las órbitas a menos de 15 000 km de la Tierra; su estela y su punto salen de Popova,
  así que toda la figura viene de una sola fuente.
- 2026-10-11: el usuario **mantiene el gmail como correo principal** de su cuenta de GitHub y
  quiere que **solo apaec@yahoo.com sea visible**. Autorizó reescribir la historia de la wiki y
  de `main` (hecho, con push forzado suyo). Nunca escribir el gmail en archivos del repo.

### Deuda técnica

**Fuente única: `docs/deuda-tecnica.md`** (consolida la deuda previa con la auditoría externa
del 2026-10-09, M01–M42, verificada contra el código; copia de la auditoría en `revision/`).
Etapas: **A** correcciones rápidas (M01 borradores fuera del build, M05 tecla I, M06 estado
vacío CNEOS, M24–M26, M28, documento del amigo) **hecha el 2026-10-09**; **B** móvil y
accesibilidad (M02 hoja móvil, M04 cámara con teclado, M03 lista completa CNEOS, M07 fallos
recuperables) **hecha el 2026-10-09**; **D** CI (M20, M19, M30) **hecha el 2026-10-11**; **C**
rigor CNEOS (M18, M09, M08, M27) **hecha el 2026-10-12**. Lo que queda (M10–M17, M21–M23,
M29, M31–M42) está repartido en las olas 3–5 de la hoja de ruta.

### Riesgos

- Cambios de formato o revisiones en la API del CNEOS (mitigado: se detiene sin publicar).
- GitHub desactiva los workflows programados tras 60 días sin actividad.
- Lectura sensacionalista de las 5 órbitas hiperbólicas (llevan aviso).
- Criterio de fiabilidad del CNEOS basado en 18 eventos calibrados.
- Rendimiento en móviles de gama baja sin medir. En la CI sin GPU, el cambio al modo CNEOS
  pasa de 3 s, aunque en local tarda 1,2 s.
- 8 eventos del CNEOS tienen |v| incoherente con la velocidad publicada (dato de la fuente,
  documentado en `docs/reportes/cneos.md`).
- Dependabot abre PR semanales: revisarlos con el usuario. Nunca integrar a ciegas cambios que
  afecten al núcleo numérico.
- Hasta el 2026-10-09 el proyecto estuvo en Documentos, que iCloud sincroniza. iCloud creaba
  copias «archivo 2.ext» (el video de la Fase 3 y `.git/index 2`/`3`). Fuera de iCloud ya no
  debería pasar, pero conviene revisar `git status` antes de cada commit.

### Notas operativas

- El usuario sube con **GitHub Desktop**; en la terminal no hay `gh` ni credenciales de push.
  Para leer estado de la CI: API pública (`/actions/runs`, `/check-runs/<id>/annotations`);
  el registro completo exige sesión.
- **Push rechazado con «Internal Server Error»** (2026-10-07): era el email de los commits no
  asociado a la cuenta; resuelto al añadir apaec@yahoo.com a GitHub. Si reaparece, revisar
  https://github.com/settings/emails antes de sospechar del contenido.
- **Respaldo privado**: `.trabajo/RESPALDO-historial-git-con-gmail-2026-10-06.bundle`
  (contiene el gmail; no subir nunca; ver `.trabajo/LEEME-RESPALDO-HISTORIAL.md`).
- **Ediciones desde la web de GitHub firman con el gmail** del usuario, que sigue siendo el
  correo principal de su cuenta por decisión suya (2026-10-11). No pedirle que edite el
  repositorio ni la wiki desde la web: todos los cambios se hacen en local con apaec@yahoo.com
  y él los sube con GitHub Desktop. La wiki se clonó en `~/Proyectos/del-cinturon-a-la-vitrina.wiki`.
  Su historia se reescribió el 2026-10-11 para quitar el commit inicial creado desde la web, con
  respaldo en `.trabajo/RESPALDO-wiki-con-gmail-2026-10-11.bundle`.
- `revision/` (ignorada por git): material del usuario (PDF de Nature, ficha legible, MetBull).
- El navegador integrado de la app abre el `launch.json` de otro proyecto: verificar con
  Playwright. Claude in Chrome: la pestaña del grupo puede estar en uso por el usuario; no
  tocar pestañas ajenas.
- Etiquetas CSS2D: CSS2DRenderer escribe `transform` en línea → desplazar con `margin`.
- **e2e locales con la máquina cargada** (Spotlight `mds_stores` y, mientras estuvo en
  Documentos, iCloud `bird`/`fileproviderd`): fallos por tiempo agotado que desaparecen al
  repetir. Usar `--workers=2` y repetir de uno en uno lo que falle antes de buscar un error de
  código.
- **CI sin GPU:** la escena va a unos 4 fps en GitHub. El límite por prueba en la CI es de
  90 s (`playwright.config.ts`); en local, 30 s.
- **CI desde la Etapa D (2026-10-11).**
  - **Publicación:** se construye una sola vez con `BASE_PUBLICA=/<repo>/`; las e2e prueban
    ese `dist/` (`E2E_DIST_LISTO=1`, servidor fiel a Pages: 404 reales y recursos solo bajo el
    prefijo) y se publica ese mismo artefacto. Antes de publicar se comprueba que el commit
    sigue siendo el último de `main`, y después se comprueba la web en vivo.
  - **Bot del CNEOS:** pasa las e2e antes de guardar en `main`.
  - **Dependencias:** Dependabot propone PR semanales con 14 días de espera (se integran a
    mano tras la CI); `npm audit` de producción en un job aparte que no bloquea la publicación.
  - **Acciones:** fijadas por SHA.
  - Para reproducir la CI en local: `BASE_PUBLICA=/del-cinturon-a-la-vitrina/ npm run build`
    y luego `BASE_PUBLICA=/del-cinturon-a-la-vitrina/ E2E_DIST_LISTO=1 npm run e2e`.
- **Reversión si la web publicada falla** (el paso «Comprobación de la web publicada» da error
  o el usuario ve un fallo):
  1. En GitHub, pestaña Actions, abrir la última ejecución correcta de «CI y publicación» y
     pulsar «Re-run all jobs»: vuelve a publicar ese commit.
  2. Corregir en local, o hacer `git revert <commit>`, y subir; la CI publica la versión
     corregida.
     No reescribir el historial de `main` sin autorización expresa del usuario.
- **Hoja móvil** (`src/ui/hoja.ts`): en móvil los controles están en pestañas; las pruebas
  e2e abren la correcta con `abrirPestana` (`tests/e2e/hoja.ts`) antes de interactuar.

### Notas técnicas por etapa

**Recorridos de las piezas (2026-10-08):** `npm run datos:trayectorias -- <a|b|c>`
(`pipeline/trayectorias-pedigri.ts`, `LOTES`, `DESDE_JPL`). Estado desde el radiante
geocéntrico y v_g de Granvik & Brown con altura convencional de 100 km; Almahata Sitta desde el
vector geocéntrico de JPL (`data/verificacion/originales.json`, 27 h antes) integrado hasta el
instante de referencia (llega a 63 km sobre 20,84° N 31,72° E). N cuerpos 365 d hacia atrás
(`pipeline/trayectoria-comun.ts`, común con Chelyabinsk). Criterio: D_D ≤ 0,1 y |z| ≤ 3
(`dd-y-z`) o solo D_D (`solo-dd`, Almahata: D_D 0,00028; z = 17, 32, 5,7σ por la σ formal de
JPL). Resto: D_D ≤ 0,0019. Salidas `public/data/trayectorias/<id>.json` + `indice.json`,
`docs/reportes/trayectorias.md`. Escena: `tierra.fijarBolido`, `solar.fijarTrayectoria`,
`mostrarNubeChelyabinsk`/`mostrarTrayectoria`; `cargarTrayectoriaPieza` en `app3d.ts`; durante
el recorrido solo se ve la nube de la pieza. Auditoría sección G. Panel: `conSigma` redondea
según σ sin añadir cifras.

**Borovička et al. 2013 (Nature):** Tabla 2 en `data/pedigri/chelyabinsk.json` como
`borovicka-2013-nature`: osculadora **60 días antes del impacto**, σ «±» sin nivel. Sustituye
a la cita vía Peña-Asensio 2025. Validación y verificación cruzada aprobadas (D_D 0,016).

**F3-E3, actualización diaria:** `cneos-diario.yml` descarga; si cambió
`data/cneos/eventos.json`, órbitas incrementales + reporte; lint, tests y build **antes** de
guardar; commit `github-actions[bot]` y push a `main`; luego llama a `ci.yml` (`workflow_call`
con `ref`: un push con GITHUB_TOKEN no dispara workflows). Si algo falla no se guarda ni publica
(p. ej. si el CNEOS revisa Chelyabinsk falla el test de coherencia con la Fase 1). La «última
actualización» mostrada es la de la última consulta con cambios. **Antes de trabajar en local:
`git pull --ff-only origin main`.**

**F3-E2, modo CNEOS:** `src/ui/modo.ts`, `?modo=cneos&evento=<id>`; datos y `src/cneos/panel.ts`
solo al entrar en el modo. Globo (`src/scene/cneos-tierra.ts`): color por grupo
(`COLOR_LEYENDA`, `src/cneos/formato.ts`), tamaño ∝ log(energía); trayectoria de entrada con
vector y altura (`src/scene/trayectoria-entrada.ts`). Nube del evento
(`src/scene/cneos-solar.ts`), también hiperbólicas (`puntosConica`, r ≤ 6 AU). Panel: «No son
en tiempo real» + fecha; detalle arriba; energías sin redondear; comparación solo con
Chelyabinsk del mismo registro; avisos no verificable / no calculable / hiperbólica / nube
sesgada (> 10 % descartados). Auditoría sección F; test: ningún texto dice «en vivo».

**F3-E1, datos y órbitas del CNEOS:** `npm run datos:cneos` = descarga cruda
(`data/cneos/eventos.json`, solo si cambia) + órbitas (`public/data/cneos/eventos.json` y
`orbitas/<id>.json`, 200 clones, incremental por huella; `CNEOS_FRAGMENTO=k/n` en paralelo; la
primera pasada tardó ~45 min en 7 procesos). `grupoBajoDd`: año ≥ 2018 o E_i ≥ 0,45 kt (Tabla 4
en `data/calibracion/pena-asensio-2025-tabla4.json`); conservadora con los 18 calibrados (0
falsos positivos; Košice y Baird Bay quedan sin órbita). Al 2026-10-07: 1074 eventos, 888 con
ubicación, 260 con órbita (2 no calculables, guardadas con `error`), 100 no fiables, 3 sin
altura. Reporte: `npm run reporte:cneos`.

**F2-E4, escena de las 25 caídas:** `public/data/catalogo.json` (`npm run datos:catalogo`);
marcadores de tamaño fijo en `punto_trayectoria` («posición de referencia», no punto de caída);
nubes por pieza (σ 1σ, elementos independientes, declarado), LOD (`DISTANCIA_LOD` 6 AU), mezcla
**normal** (la aditiva satura el HDR); Hungaria/Phocaea solo contornos; panel con región de
escape y progenitor separados; filtros por clase y confianza; `?pieza=`.

**Auditoría de trazabilidad** (`npm run auditoria`, parte del build): contrasta cada dato de la
interfaz con `data/`; falla ante discrepancias, pendientes mostrados como firmes o cifras escritas
a mano en `src/i18n/es.json` (excepciones con motivo en `CIFRAS_PERMITIDAS`). Informe:
`docs/reportes/trazabilidad.md`. Una cifra nueva en un texto: pasarla como parámetro desde el
dataset o justificarla ahí.

**Licencias:** código MIT (`LICENSE`); datos, reportes y textos CC BY 4.0 (`data/LICENCIA.md`);
textura Blue Marble según las directrices de medios de NASA (verificado el 2026-10-05).

## Principios no negociables

1. **Nunca inventar datos.** Todo valor es un `Valor` (`src/schema/index.ts`) con `fuente` en
   `data/fuentes.json` y `estado: verificado | pendiente`; lo pendiente no se muestra como firme.
   Un valor "verificado" exige una fuente con `metadatos_verificados: true` (lo valida el build).
2. **La incertidumbre se muestra:** órbitas estimadas como nubes, nunca línea única.
3. **Toda escala exagerada se etiqueta**; interruptor "escala real / escala visual".
4. **CNEOS no es tiempo real:** nunca "en vivo"; "eventos recientes" + fecha de actualización.
5. **Ninguna API key en el cliente.** La de Claude solo en `.env` local o secreto de GitHub.

## Flujo de trabajo

- Todo el proyecto vive en esta carpeta; nada del proyecto en otras carpetas. Archivos de trabajo
  temporales (PDFs y LaTeX descargados, scripts sueltos): `.trabajo/` (ignorado por git; los
  pipelines vuelven a descargar lo que necesitan).
- Una etapa a la vez: proponer → esperar OK → implementar → verificar → documentar → commit.
  No avanzar de fase sin confirmación. Al cerrar fase: resumen, deuda, riesgos y capturas en
  `docs/cierres/`.
- Criterios de parada: si una validación científica discrepa más allá de la incertidumbre
  documentada, detenerse y reportar antes de seguir (así se resolvió Almahata Sitta).
- Leer siempre la fuente primaria (LaTeX de arXiv cuando exista, mejor que el PDF). Verificar
  metadatos bibliográficos en Crossref.
- Commits: git no tiene identidad global →
  `git -c user.name="Pablo Hoffenberg" -c user.email="apaec@yahoo.com" commit ...`
- Verificación visual con Playwright (capturas en `tests/e2e/.resultados/`); el navegador
  integrado de la app no sirve (abre el `launch.json` de otro proyecto).
- Antes de trabajar: `git pull --ff-only origin main` (commits diarios del bot).

## Comandos

- `npm run dev` · `npm test` · `npm run lint` · `npm run build` (incluye `validate`)
- `npm run e2e` (escritorio + móvil) · `npm run e2e:rendimiento` (4G lento + CPU ×4, aislado)
- Datos: `npm run datos` (validación Chelyabinsk + trayectoria), `npm run datos:pedigri`
  (Granvik & Brown + JPL 2008 TC3 + catálogo), `npm run datos:texturas`, `npm run verificacion:cruzada`
- CNEOS: `npm run datos:cneos` (descarga + órbitas), `npm run reporte:cneos`.
- Nubes de las piezas: `npm run datos:nubes` (unos 50 s; incluido en `datos:pedigri`).
  Recorridos: `npm run datos:trayectorias -- <a|b|c>`.
- `npm run cierre:video` / `cierre:fase-2` / `cierre:fase-3` (requieren `build`): video y
  capturas en `docs/cierres/`. `npm run auditoria`: trazabilidad.

## Arquitectura

- Vite + TypeScript + **Three.js vanilla**; bloom con `postprocessing`; `logarithmicDepthBuffer`.
- Efemérides: **solo `astronomy-engine`**. Núcleo orbital único en `src/core/`, compartido por
  navegador y pipeline (Node/TS con `tsx`). Pipelines en `pipeline/` → JSON en `public/data/`.
- Escena (`src/scene/`): dos `Scene` independientes con sus unidades (Tierra: radios terrestres,
  EQJ; sistema solar: AU, eclíptica J2000). Mapeo núcleo → Three: (x, y, z) → (x, z, −y). La
  esfera de Three coincide con ECEF bajo ese mapeo; el globo se orienta con ECEF → EQJ.
- Escala visual: Sol ×10, planetas interiores ×1500, Júpiter ×150, meteoroide ~900 000 km
  (vista solar) y 60 km (vista terrestre), marcador del bólido 60 km.
- Carga: `main.ts` ligero (textos, panel, diálogos, precarga de datos y textura de 1024);
  `app3d.ts` con Three.js por `import()` dinámico; la vista solar se construye bajo demanda.
  Medido: texto ~0,45 s, escena lista 2,7–2,9 s en 4G lento (los datos del CNEOS y las
  trayectorias de las piezas se cargan bajo demanda).
- Tiempo: `src/timeline/reloj.ts` (365 días antes del pico → pico); secuencia en
  `src/camera/coreografia.ts` + pasos en `app3d.ts`; `prefers-reduced-motion` → corte directo.
  URL: `?pieza&t&vista&escala` o `?modo=cneos&evento&t&vista&escala` (`src/ui/estado-url.ts`).
- Animación: Chelyabinsk con `public/data/chelyabinsk-trayectoria.json`
  (`npm run datos:trayectoria`: estela N cuerpos desde el radiante aparente, la velocidad, el
  punto y el instante de entrada de Popova, a las 03:20:19,8, 6 s antes del pico del CNEOS) y
  `chelyabinsk-orbitas.json` (`npm run datos:nubes`: 300 órbitas de la opción C, es decir,
  elementos de Popova condicionados al encuentro, que se mueven con Kepler; la línea central es
  la órbita con todas las cifras); en el globo, la entrada y el pico son los del CNEOS. Las otras 24 piezas con
  `public/data/trayectorias/<id>.json`.
- Nubes del catálogo: `public/data/nubes.json` (160 formas por pieza, calculadas desde el
  radiante; Almahata Sitta, desde la órbita de JPL), cargado al crear la vista solar
  (`cat.fijarNubes`). Validación en `docs/reportes/nubes.md`. Cambiar `src/core/` cambia la
  huella del CNEOS: hay que recalcular sus órbitas en local (`CNEOS_FRAGMENTO=k/4` en paralelo
  y una pasada final), o lo hará el bot en la CI.
- Fichas: `content/fichas/*.md`, plantillas con `{{clave}}` resueltas desde el dataset
  (`src/ui/ficha-datos.ts`, que también nombra modelos y fórmulas desde `fuentes.json`); un
  test prohíbe cifras escritas a mano. Admiten enlaces `[texto](https://…)`. Solo se publican las
  `aprobada` con `revisado_por` y `fecha_revision`. En Fase 4 se generarán con la API de Claude
  en build, nunca en el navegador.
- e2e contra `pipeline/servidor-estatico.ts` (gzip, como un hosting real; `vite preview` no
  comprime y falsea la medición).

## Núcleo orbital (`src/core/`)

- Unidades: AU, días, radianes; GM vía `Astro.MassProduct` (DE405). Tiempo del integrador: días
  UT desde J2000.
- `kepler.ts` (Halley; |e−1| < 1e-9 no soportado), `integrador.ts` (DOPRI5, orden 5 verificado),
  `dinamica.ts` (**heliocéntrico** con término indirecto; no usar `BaryState`, cuyo baricentro
  solo incluye Sol + gigantes), `marcos.ts` (EQJ ↔ ECL; ECEF ↔ EQJ vía GAST; las matrices de
  astronomy-engine están por columnas), `similitud.ts` (**D_D de Drummond**, umbral 0,1),
  `montecarlo.ts`, `resonancias.ts` (centro nominal a = a_J·(q/p)^(2/3)).
- `orbita-bolido.ts`: `orbitaDesdeBolido` (CNEOS), `elementosSinTierra` (retro N cuerpos hasta
  0,05 AU y vuelta sin Tierra/Luna → elementos "pre-atmosféricos"; validado contra JPL Horizons,
  D_D = 0,0003), `orbitaDesdeRadianteGeocentrico` (inverso de la atracción cenital).
- Con estados de JPL usar el **vector geocéntrico** + la Tierra de astronomy-engine (su Tierra
  difiere ~1100 km de DE441; con el estado heliocéntrico de JPL el encuentro sale mal).
- Las efemérides VSOP truncadas no son autoconsistentes a ~10³ km en 30 días (≈1 m/s en la
  velocidad terrestre; despreciable frente a la σ del CNEOS).

## Datos

- `data/` es la fuente de verdad: `fuentes.json`, `pedigri/*.json` (25 caídas),
  `regiones-escape.json`, `regiones-origen.json`, `cneos/*.json` (respuestas crudas),
  `calibracion/` (18 eventos de Peña-Asensio 2025), `verificacion/` (transcripciones para
  contrastar; no se muestran).
- Incertidumbres: `sigma` siempre 1σ; si la fuente publica 2σ se guardan `sigma_publicada` y
  `nivel_sigma` (Popova et al. 2013 publica a **2σ**). Sin nivel declarado → `formal-sin-nivel`.
- Pedigrí: Granvik & Brown 2018 recalcula 25 órbitas (1σ) con el método analítico de Ceplecha;
  clasificación compilada por ellos; nombres "pendiente" hasta MetBull.
- `orbita_principal` indica la órbita que se muestra (Chelyabinsk: Popova 2013; Almahata Sitta:
  JPL Horizons). `discrepancia_documentada` es la única excepción admitida por el test de
  compatibilidad entre órbitas. Al mostrar una cifra atribuida a una fuente, filtrar por `fuente`.
- Definiciones de órbita que no se mezclan: "pre-atmosférica" (sin deflexión terrestre, época
  del impacto) vs. "osculadora" cerca de la Tierra (Jenniskens 2009 y Borovička 2015 dan esta
  para 2008 TC3; Peña-Asensio 2025 también la usa como referencia).
- Regiones, dos capas que no se mezclan en la UI: (1) región de escape (probabilidades por
  meteorito; zonas dibujables solo con rangos publicados: Hungaria —Warner 2009— y Phocaea
  —Novaković 2017, elementos propios—; 3:1, 5:2, 2:1 con centro nominal: 2,502, 2,825 y
  3,278 AU; ν6 y JFC sin geometría → solo texto). (2) Asociación con progenitor, confianza
  `alto|medio|especulativo`, lista explícita de meteoritos; cada meteorito está en una
  asociación o en `sin_asociacion` con motivo (lo exige el validador).

### CNEOS

- `vel-comp=true` añade `vx, vy, vz` ("Earth centered"; Peña-Asensio 2025 §2.1: ECEF). Con 18
  eventos calibrados, las hipótesis ECEF-relativa e inercial no se distinguen; se adopta
  ECEF-relativa (reproduce las órbitas de ese artículo, D_D mediana 0,008).
- Velocidad en el pico de brillo, no al tope de la atmósfera.
- Monte Carlo: Tabla 4 de Peña-Asensio 2025 da **medianas** de error del grupo de bajo D_D
  (≥ 2018 o ≥ 0,45 kt): 0,55 km/s, 1,35° (α_g), 0,84° (δ_g) → σ = mediana/0,6745 (principal).
  Grupo pre-2018 y < 0,45 kt: D_D mediana 0,31 → se muestra sin órbita (decisión del usuario).
- Chelyabinsk: CNEOS da 03:20:26 UTC, 23,3 km y 18,6 km/s; Popova 03:20:32,2, 29,7 km y
  V∞ = 19,16 km/s; los dos fragmentos principales destellaron hacia 24 km (Popova). `impact-e`
  (441 kt) sale de la energía radiada (`energy`, 89,6 kt) con la fórmula de Brown et al. 2002.

## Convenciones

- Código, dominio y textos en español; textos de UI en `src/i18n/*.json` vía `t()`.
- IDs kebab-case ASCII; fechas ISO 8601 UTC; unidades explícitas en cada `Valor`.
- Vitest en `tests/unit/`, Playwright en `tests/e2e/`; Prettier + ESLint.

## Historial

Fase 0 andamiaje · F1-E1 núcleo orbital · F1-E2 datos Chelyabinsk · F1-E3 validación científica
(aprobada, `docs/reportes/chelyabinsk.md`) · F1-E4 escena 3D · F1-E5 recorrido y línea de
tiempo · F1-E6 ficha, accesibilidad (axe WCAG 2.1 AA: 0 violaciones), rendimiento y cierre ·
F2-E1 dataset de 25 caídas · F2-E2 verificación cruzada (aprobada, `docs/reportes/cruzada.md`;
Almahata Sitta → JPL por decisión del usuario del 2026-10-05) · F2-E3 regiones de origen ·
F2-E4 escena con las 25 caídas (catálogo, filtros, nubes, regiones) · Cierre F2 (auditoría de
trazabilidad, licencias, publicación preparada) · F3-E1 datos y órbitas del CNEOS · F3-E2 modo
CNEOS · F3-E3 actualización diaria · Cierre F3 (`docs/cierres/fase-3.md`) · Recorridos
animados de las 25 piezas (lotes A, B, C; 2026-10-08).
Deuda técnica y riesgos vigentes: sección «Retomar aquí»; históricos en `docs/cierres/`.
