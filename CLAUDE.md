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
- Precisión: Peña-Asensio et al. 2025 (A&A 701, A202) — confirmar σ en el artículo antes de usar.

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
- Siguiente: Fase 1, etapa 3 — órbita desde el vector CNEOS + Monte Carlo + reporte de
  validación (esperando OK).

### Pendientes de datos

- **MetBull** responde con verificación anti-bots: nombre oficial, masa y punto de caída siguen
  "pendiente" (no se intenta eludir la verificación). Requiere que el usuario consulte el registro
  57165 o una vía de acceso autorizada.
- **Borovička et al. 2013**: elementos en la Tabla 2 del artículo de pago; no leídos. Referencias
  de órbita usadas: Popova et al. 2013 (Tabla 1, 2σ) y Emel'yanenko et al. 2014 (arXiv, formal).

## Deuda técnica conocida

- Bundle inicial ~524 kB (130 kB gzip), casi todo Three.js. Revisar presupuesto en Fase 1.
