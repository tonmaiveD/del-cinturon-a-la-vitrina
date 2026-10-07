# Del cinturón a la vitrina — guía del proyecto

App web estática (español neutro, preparada para i18n) que muestra el viaje de meteoritos desde
su región de origen hasta la Tierra, con rigor científico verificable. Plan: fases 0–4.

## Retomar aquí

**Estado:** Fase 2 cerrada y confirmada (2026-10-06). Publicado en
https://tonmaived.github.io/del-cinturon-a-la-vitrina/ (repo público `tonmaiveD/del-cinturon-a-la-vitrina`;
la CI publica desde `main` si pasan las pruebas). El usuario sube los cambios con GitHub Desktop
("Push origin"); no hay `gh` ni credenciales de git en la terminal. Móvil real: «se ve bien».

**Fase 3 en curso.** Decisión del usuario (2026-10-06): opción (a), los eventos del grupo de
alto D_D se muestran **sin órbita** y con nota («no verificable de antemano»).

**F3-E1 (datos y órbitas), F3-E2 (escena) y F3-E3 (actualización diaria) hechas.** Siguiente:
E4, cierre de la Fase 3 (pendiente de OK del usuario).

**F3-E3:** `.github/workflows/cneos-diario.yml` (07:30 UTC y manual): descarga; si cambió
`data/cneos/eventos.json`, órbitas incrementales + reporte; lint, tests y build (con auditoría)
**antes** de guardar; commit como `github-actions[bot]` (nunca el email del usuario) y push a
`main`; luego llama a `ci.yml` (`workflow_call` con `ref` del commit nuevo: un push con
GITHUB_TOKEN no dispara workflows) para e2e y publicación. Si algo falla no se guarda ni publica
nada (p. ej. si el CNEOS revisa Chelyabinsk, falla el test de coherencia con la Fase 1 y se para).
Ensayo local del 2026-10-07: 1 evento nuevo y 1 revisado (vector añadido), 2 órbitas en 6 s.
La «última actualización» mostrada es la de la última consulta con cambios. Riesgo: GitHub
desactiva los workflows programados tras 60 días sin actividad en el repositorio.

**F3-E2, decisiones a recordar:**

- Modo «Bólidos del CNEOS» (`src/ui/modo.ts`, `?modo=cneos&evento=<id>`): los datos
  (`public/data/cneos/eventos.json`, ~240 kB) y `src/cneos/panel.ts` se cargan solo al entrar
  en el modo (carga inicial intacta: listo 2,73 s; cambio de modo 1,45 s en 4G lento).
- Globo: 887 eventos con ubicación (`src/scene/cneos-tierra.ts`), color por grupo de leyenda
  (`COLOR_LEYENDA` en `src/cneos/formato.ts`, compartido con el panel), tamaño ∝ log(energía);
  trayectoria de entrada solo con vector y altura (`src/scene/trayectoria-entrada.ts`, común con
  Chelyabinsk). Vista solar: nube del evento (`src/scene/cneos-solar.ts`), también los clones
  hiperbólicos (rama con r ≤ 6 AU, `puntosConica`).
- Panel: «No son en tiempo real» + fecha de consulta; comparación de energía solo con
  Chelyabinsk del mismo registro; avisos de órbita no verificable, no calculable, hiperbólica y
  nube sesgada (> 10 % de clones descartados).
- Auditoría ampliada (sección F): resumen = respuesta cruda, fecha de actualización = consulta,
  criterio = Tabla 4, σ y resúmenes = archivos de órbita. Test: ningún texto dice «en vivo».

- `npm run datos:cneos` = `datos:cneos:descargar` (respuesta cruda completa a
  `data/cneos/eventos.json`, solo se reescribe si cambian los datos) + `datos:cneos:orbitas`
  (`public/data/cneos/eventos.json` resumen + `public/data/cneos/orbitas/<id>.json`, 200 clones,
  incremental por huella; `CNEOS_FRAGMENTO=k/n` reparte el cálculo en procesos paralelos y una
  pasada final sin la variable escribe el resumen). Primera pasada: ~45 min en 7 procesos.
- `src/cneos/eventos.ts`: `leerEventos`, `grupoBajoDd` (año ≥ 2018 o E_i ≥ 0,45 kt, Tabla 4
  de Peña-Asensio 2025, guardada en `data/calibracion/pena-asensio-2025-tabla4.json`), clases
  `orbita | orbita-no-fiable | sin-altura | sin-vector | sin-ubicacion`.
- Con los 18 calibrados la regla es conservadora: 0 falsos positivos; Košice y Baird Bay quedan
  «sin órbita» pese a tener D_D bajo (por eso la nota dice «no verificable», no «errónea»).
- Al 2026-10-06: 258 con órbita (2 no calculables: la retropropagación no sale de la influencia
  terrestre en 60 días; se guardan con `error`), 100 no fiables, 3 sin altura, 526 sin vector,
  186 sin ubicación. 5 nominales hiperbólicas; 10 eventos con > 10 % de clones descartados (nube
  posiblemente sesgada: avisar en la UI). Reporte: `npm run reporte:cneos` → `docs/reportes/cneos.md`.

**Borovička et al. 2013 (Nature):** PDF aportado por el usuario el 2026-10-07 en `revision/`
(carpeta local fuera de git; no redistribuir). Tabla 2 transcrita en `data/pedigri/chelyabinsk.json`
como órbita `borovicka-2013-nature`: osculadora **60 días antes del impacto** (no pre-atmosférica),
σ «±» sin nivel declarado. Sustituye a la cita indirecta vía Peña-Asensio 2025. Validación de
Chelyabinsk y verificación cruzada regeneradas: aprobadas (D_D 0,016 frente a la órbita CNEOS).

**Push rechazado con «Internal Server Error» (2026-10-07):** GitHub rechazaba los push de commits
firmados con apaec@yahoo.com tras cambios en la privacidad de emails de la cuenta; se resolvió
cuando el usuario añadió apaec@yahoo.com a su cuenta de GitHub. Si reaparece, revisar
https://github.com/settings/emails antes de sospechar del contenido.

**Respaldo privado:** `.trabajo/RESPALDO-historial-git-con-gmail-2026-10-06.bundle` (historial
anterior a la reescritura de email; contiene el gmail; no subir nunca). Ver
`.trabajo/LEEME-RESPALDO-HISTORIAL.md`. Se conserva por decisión del usuario.

**Licencias:** código MIT (`LICENSE`); datos, reportes y textos CC BY 4.0 (`data/LICENCIA.md`).
Textura Blue Marble: directrices de medios de NASA (uso educativo e informativo, reconocer a
NASA), verificado el 2026-10-05.

**Auditoría de trazabilidad** (`npm run auditoria`, parte del build): contrasta cada dato que
muestra la interfaz con `data/` y falla ante discrepancias, pendientes mostrados como firmes o
cifras escritas a mano en `src/i18n/es.json` (lista de excepciones con motivo en
`CIFRAS_PERMITIDAS`, `pipeline/auditoria.ts`). Informe: `docs/reportes/trazabilidad.md`. Si se
añade texto con una cifra, pasarla como parámetro desde el dataset o justificarla ahí.

**Etapa 4 (hecha), decisiones a recordar:**

- `public/data/catalogo.json` (`npm run datos:catalogo`, incluido en `datos:pedigri`) resume las
  25 piezas para el cliente; un test exige que esté al día con `data/`. Solo pasan valores
  verificados; el nombre va marcado como pendiente (MetBull).
- Globo: marcadores de tamaño fijo (símbolos, aviso en el panel) en `punto_trayectoria`,
  rotulados "posición de referencia del bólido" (no punto de caída). Clic o lista para elegir.
- Sistema solar: nube por pieza muestreada con σ 1σ, elementos independientes (supuesto
  declarado en la descripción); LOD por distancia al Sol (`DISTANCIA_LOD` 6 AU); selección con
  nube densa celeste. Mezcla **normal**, no aditiva (la aditiva satura el búfer HDR y el bloom
  hace neblina). Hungaria/Phocaea solo como **contornos** (un relleno translúcido hacía neblina).
- Panel lateral `aside.panel-pieza`: región de escape (barras por fuente, banda ±1σ) y
  progenitor (insignia de confianza) en secciones separadas. Filtros por grupo de clase
  (`grupoClase`) y por confianza. `?pieza=` en la URL; id desconocido → Chelyabinsk.
- Recorrido animado solo para Chelyabinsk: las órbitas de Granvik & Brown no dan la anomalía en
  la época. Se podría derivar del encuentro con la Tierra (propuesta, no hecha).
- Medido: listo 2,72 s en 4G lento. fps en navegador sin GPU: 18,7 con catálogo y 24,7 sin él
  (escritorio); el coste es de relleno de píxeles, no de segmentos. Falta GPU real.
- Las etiquetas CSS2D ignoran `transform` en CSS (CSS2DRenderer lo escribe en línea): usar margin.
- El navegador integrado de la app abre el `launch.json` de otro proyecto: verificar con
  Playwright.

**Pendientes que dependen del usuario:**

- Revisar la ficha `content/fichas/chelyabinsk.md` (estado `borrador`; no se publica en producción).
- Decidir hosting (recomendado: GitHub Pages; ver `docs/cierres/fase-1.md`).
- MetBull: el sitio exige verificación anti-bots (no se elude). Nombres oficiales, masas y puntos
  de caída siguen "pendiente" hasta que el usuario aporte el registro (Chelyabinsk: 57165).
- Medir rendimiento en un móvil real (solo hay emulación).

**Mejoras opcionales ya identificadas:** añadir caídas posteriores a 2016 (Hamburg, Motopi Pan,
Flensburg, Novo Mesto, Winchcombe, Ribbeck…) desde sus artículos originales.

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
- Vista previa en el navegador integrado: `.claude/launch.json` (configuración `vite`, puerto
  5173); solo funciona si la sesión está abierta en esta carpeta. Si no, verificar con Playwright
  (capturas en `tests/e2e/.resultados/`).

## Comandos

- `npm run dev` · `npm test` · `npm run lint` · `npm run build` (incluye `validate`)
- `npm run e2e` (escritorio + móvil) · `npm run e2e:rendimiento` (4G lento + CPU ×4, aislado)
- Datos: `npm run datos` (validación Chelyabinsk + trayectoria), `npm run datos:pedigri`
  (Granvik & Brown + JPL 2008 TC3 + catálogo), `npm run datos:texturas`, `npm run verificacion:cruzada`
- `npm run cierre:video` / `npm run cierre:fase-2` (requieren `build`): video y capturas en
  `docs/cierres/`. `npm run auditoria`: trazabilidad.

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
  Medido: texto 0,41 s, escena lista 2,57 s en 4G lento.
- Tiempo: `src/timeline/reloj.ts` (365 días antes del pico → pico); secuencia en
  `src/camera/coreografia.ts` + pasos en `app3d.ts`; `prefers-reduced-motion` → corte directo.
  URL: `?pieza&t&vista&escala` (`src/ui/estado-url.ts`).
- Animación de Chelyabinsk: `public/data/chelyabinsk-trayectoria.json` (N cuerpos nominal);
  los 300 clones se mueven con Kepler solo como nube de posiciones.
- Fichas: `content/fichas/*.md`, plantillas con `{{clave}}` resueltas desde el dataset
  (`src/ui/ficha-datos.ts`); un test prohíbe cifras escritas a mano. Solo se publican las
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
  Grupo pre-2018 y < 0,45 kt: D_D mediana 0,31 (decidir en Fase 3 cómo mostrarlo).
- Chelyabinsk: CNEOS da 03:20:26 UTC y 23,3 km; Popova 03:20:32,2 y 29,7 km (documentado).

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
trazabilidad, licencias, publicación preparada).
Deuda técnica y riesgos: `docs/cierres/fase-1.md`.
