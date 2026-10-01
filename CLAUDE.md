# Del cinturón a la vitrina — guía del proyecto

App web estática que muestra el viaje de meteoritos desde su región de origen hasta su caída.
Plan aprobado: fases 0–4 (ver "Estado"). Interfaz en español neutro, preparada para i18n.

## Principios no negociables

1. **Nunca inventar datos científicos.** Todo valor es un `Valor` (`src/schema/index.ts`) con
   `fuente` registrada en `data/fuentes.json` y `estado: verificado | pendiente`. Lo no
   verificado se marca "pendiente" y la UI no lo muestra como dato firme.
2. **La incertidumbre se muestra:** órbitas estimadas como nubes/bandas, nunca línea única.
3. **Toda escala exagerada se etiqueta**; interruptor "escala real / escala visual".
4. **CNEOS no es tiempo real:** nunca "en vivo"; "eventos recientes" + fecha de última actualización.
5. **Ninguna API key en el cliente.** La de Claude solo en `.env` local o secreto de GitHub.

## Flujo de trabajo

- **Todo el proyecto vive en esta carpeta** (`~/Documents/del-cinturon-a-la-vitrina`): código,
  datos, texturas, reportes, configuración de vista previa. No dejar archivos ni configuración
  del proyecto en otras carpetas.
- Commits: git no tiene identidad global; usar
  `git -c user.name="Pablo Hoffenberg" -c user.email="apaec@yahoo.com" commit ...`.
- Al retomar: leer la sección **Estado** de este archivo.
- Una etapa a la vez: proponer → esperar OK del usuario → implementar → verificar → documentar.
- No avanzar de fase sin confirmación. Al cerrar fase: resumen, deuda técnica, riesgos y capturas
  en `docs/cierres/`.
- Parada obligatoria: si la órbita de Chelyabinsk calculada desde CNEOS discrepa de la publicada
  más allá de la incertidumbre documentada del CNEOS, detenerse y reportar.

## Arquitectura (decisiones)

- Vite + TypeScript + **Three.js vanilla** (sin React): la escena es la app, coreografía de cámara
  imperativa, menos peso inicial. Bloom con `postprocessing` (pmndrs). `logarithmicDepthBuffer`.
- Efemérides: **solo `astronomy-engine`**. No implementar efemérides propias.
- **Núcleo orbital único** en `src/core/`, compartido por navegador y pipeline (Node/TS con `tsx`).
- Pipeline de build → JSON estáticos en `public/data/` (generados; no editar a mano).
- Marcos: geocéntrico (km) y heliocéntrico (AU) con origen flotante para evitar jitter float32.
  Elementos orbitales en eclíptica y equinoccio J2000.
- Hosting: pendiente de decidir al cerrar la Fase 1.
- Escena (`src/scene/`): dos `Scene` independientes, cada una con sus unidades (Tierra: radios
  terrestres en EQJ; sistema solar: AU en eclíptica J2000), en vez de un origen flotante único.
  Mapeo núcleo → Three: (x, y, z) → (x, z, −y) (`coordenadas.ts`). La geometría de la esfera de
  Three coincide con ECEF bajo ese mapeo; el globo se orienta con ECEF → EQJ de la fecha.
- Escala visual: Sol ×10, planetas interiores ×1500, Júpiter ×150, meteoroide ~900 000 km en la
  vista solar y 60 km en la terrestre, marcador del bólido 60 km. Siempre etiquetada.
- Animación: `public/data/chelyabinsk-trayectoria.json` (`npm run datos:trayectoria`) es la
  trayectoria N-cuerpos nominal del último año (pasos del integrador, densos cerca de la Tierra);
  los 300 clones se mueven con Kepler (sin perturbaciones) solo como nube de posiciones.
- Tiempo: `src/timeline/reloj.ts` (rango: 365 días antes del pico → pico). Secuencia
  cinematográfica en `src/camera/coreografia.ts` + pasos en `main.ts`; con
  `prefers-reduced-motion` se hace un corte directo. URL: `?pieza&t&vista&escala`.
- `npm run datos` regenera reporte de validación y trayectoria.
- Texturas en `public/texturas/` (Blue Marble reescalada: 4096 escritorio, 2048 móvil).
- Vista previa: `.claude/launch.json` del proyecto (configuración `vite`, puerto 5173). La sesión
  de trabajo debe estar abierta en esta carpeta para que la herramienta de vista previa la lea.

## Núcleo orbital (`src/core/`)

- Unidades internas: AU, días, radianes; GM en AU³/día² vía `Astro.MassProduct` (DE405). Tiempo
  del integrador: días UT desde J2000 (convención de astronomy-engine, que aproxima UT1 ≈ UTC).
- `kepler.ts`: Kepler elíptico/hiperbólico (Halley), estado ↔ elementos. Casi parabólicas
  (|e−1| < 1e-9) no soportadas. Convenciones degeneradas: ecuatorial → Ω = 0; circular → ω = 0.
- `integrador.ts`: DOPRI5 adaptativo (Dormand & Prince 1980), admite integrar hacia atrás y
  detenerse con `alPaso`. Orden 5 verificado empíricamente en tests.
- `dinamica.ts`: marco **heliocéntrico** EQJ con término indirecto y planetas vía `HelioVector`.
  No se usa el marco baricéntrico porque `BaryState` de astronomy-engine define el baricentro
  solo con Sol + gigantes (aceleración espuria ~GM⊕/AU²).
- `marcos.ts`: EQJ ↔ ECL J2000 (rotaciones de astronomy-engine; sus matrices están por columnas),
  ECEF ↔ EQJ vía GAST + `Rotation_EQD_EQJ` (sin movimiento del polo), estado de un punto
  terrestre con `ObserverState` (válido 0–100 km de altura).
- Validación medida (2026-10-01): vs `GravitySimulator` misma física < 0,2 km a 16 días.
  Los estados VSOP truncados de astronomy-engine no son autoconsistentes a ~10³ km en 30 días
  (≈ 1 m/s en velocidad de la Tierra; despreciable frente a la σ del CNEOS ~0,5 km/s).

## Datos y fuentes

- `data/` es la fuente de verdad, editada a mano: `fuentes.json`, `pedigri/*.json`,
  `regiones-origen.json` (confianza `alto | medio | especulativo`), `coleccion/`.
- `npm run validate` (corre también en `build`) falla si: un esquema no valida, se referencia una
  fuente inexistente, o un valor "verificado" usa una fuente con `metadatos_verificados: false`.
- `npm run schemas` exporta JSON Schema a `docs/esquemas/`.
- Incertidumbres: `sigma` siempre 1σ; si la fuente publica 2σ se guarda también `sigma_publicada`
  y `nivel_sigma` (el esquema verifica la conversión). Popova et al. 2013 publica a **2σ**.
- `data/cneos/*.json`: respuestas crudas de la API, sin modificar, con URL y fecha de consulta.
- Discrepancia conocida CNEOS vs. Popova para Chelyabinsk: hora del pico 03:20:26 vs 03:20:32.2 UTC
  y altura 23,3 vs 29,7 km. Tenerla en cuenta en la etapa 3.
- Fichas narrativas: `content/fichas/*.md` con `estado: borrador | aprobada`; solo se publican
  las aprobadas. Se generan con la API de Claude en build, nunca en el navegador (Fase 4).

### CNEOS Fireball API — notas verificadas (doc oficial, consultada 2026-10-01)

- Filtros `req-loc`, `req-alt`, `req-vel-comp`; selector `vel-comp=true` añade `vx, vy, vz`.
- La doc solo dice "Earth centered" para `vx, vy, vz`; **no especifica si el marco rota con la
  Tierra**. La literatura lo trata como ECEF. Se resolverá empíricamente con Chelyabinsk
  (ambas hipótesis) y se documentará en `docs/reportes/chelyabinsk.md`.
- La velocidad se reporta en el pico de brillo, no al tope de la atmósfera.
- Marco: Peña-Asensio et al. 2025 (§2.1) lo describen como ECEF. Con 18 eventos calibrados las
  hipótesis ECEF-relativa (se suma ω × r) e inercial **no se distinguen** frente a órbitas
  terrestres. Se adopta ECEF-relativa; con ella reproducimos las órbitas CNEOS de ese artículo
  (D_D mediana 0.008).
- Incertidumbre (Monte Carlo): Tabla 4 de Peña-Asensio et al. 2025 da **medianas** de error del
  grupo bajo D_D (≥ 2018 o ≥ 0.45 kt): 0.55 km/s, 1.35° (α_g), 0.84° (δ_g). Parametrización:
  σ = mediana / 0.6745 (principal) y σ = mediana (sensibilidad). Pre-2018 y < 0.45 kt: errores
  mucho mayores (D_D mediano 0.31); decidir en Fase 3 cómo mostrarlos.
- Similitud orbital: **D_D de Drummond** (no D_SH), umbral 0.1 (`src/core/similitud.ts`).
- Órbita desde CNEOS (`src/core/orbita-bolido.ts`): retro N-cuerpos hasta 0.05 AU, luego hacia
  adelante sin Tierra/Luna hasta la época del impacto (elementos "pre-atmosféricos").

## Convenciones

- Código, identificadores de dominio y textos en español; APIs de librerías en su idioma.
- Todo texto de UI en `src/i18n/*.json` y se usa vía `t()`.
- IDs en kebab-case ASCII. Fechas ISO 8601 UTC. Unidades explícitas en cada `Valor`.
- Tests: Vitest en `tests/unit/`, Playwright en `tests/e2e/` (proyectos escritorio y móvil).
- Formato: Prettier (`npm run format`); lint: `npm run lint`.

## Comandos

`npm run dev` · `npm test` · `npm run e2e` · `npm run build` · `npm run validate` · `npm run lint`

## Estado

- **Fase 0 (andamiaje): completa.**
- **Fase 1, etapa 1 (núcleo orbital + tests): completa** (38 tests).
- **Fase 1, etapa 2 (datos de Chelyabinsk): completa** con dos pendientes (ver abajo).
- **Fase 1, etapa 3 (validación científica): APROBADA** — `docs/reportes/chelyabinsk.md`
  (`npm run validacion:chelyabinsk`, ~35 s). 51 tests.
- **Fase 1, etapa 4 (escena 3D): completa** — vistas Tierra y sistema solar, nube de 300 clones,
  interruptor de escala, bloom, etiquetas, descripciones textuales; e2e en escritorio y móvil.
- **Fase 1, etapa 5 (transición y línea de tiempo): completa** — recorrido de ~21 s, reloj
  (×1 a ×10⁶), deslizador de fecha, movimiento reducido, estado en URL, atajos de teclado.
  59 tests unitarios y 10 e2e.
- Siguiente: Fase 1, etapa 6 — ficha de Chelyabinsk, atribuciones, accesibilidad (contraste AA,
  revisión de teclado) y presupuesto de rendimiento (textura WebP/KTX2, división del bundle)
  (esperando OK).

### Pendientes de datos

- **MetBull** responde con verificación anti-bots: nombre oficial, masa y punto de caída siguen
  "pendiente" (no se intenta eludir la verificación). Requiere que el usuario consulte el registro
  57165 o una vía de acceso autorizada.
- **Borovička et al. 2013**: elementos en la Tabla 2 del artículo de pago; no leídos. Referencias
  de órbita usadas: Popova et al. 2013 (Tabla 1, 2σ) y Emel'yanenko et al. 2014 (arXiv, formal).

## Deuda técnica conocida

- Carga inicial en móvil ≈ 183 kB gzip de JS + 524 kB de textura + 50 kB de órbitas. Con 4G
  lento (1,6 Mbps) supera los 3 s: pasar la textura a WebP/KTX2 y dividir el bundle (etapa 6).
- Rendimiento móvil solo medido en emulación (GPU de escritorio): falta medir en un móvil real.
