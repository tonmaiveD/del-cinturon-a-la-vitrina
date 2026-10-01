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

## Datos y fuentes

- `data/` es la fuente de verdad, editada a mano: `fuentes.json`, `pedigri/*.json`,
  `regiones-origen.json` (confianza `alto | medio | especulativo`), `coleccion/`.
- `npm run validate` (corre también en `build`) falla si: un esquema no valida, se referencia una
  fuente inexistente, o un valor "verificado" usa una fuente con `metadatos_verificados: false`.
- `npm run schemas` exporta JSON Schema a `docs/esquemas/`.
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
- Siguiente: Fase 1, etapa 1 — núcleo orbital + tests (esperando OK).

## Deuda técnica conocida

- Bundle inicial ~524 kB (130 kB gzip), casi todo Three.js. Revisar presupuesto en Fase 1.
