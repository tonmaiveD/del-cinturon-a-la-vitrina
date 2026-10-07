# Del cinturón a la vitrina

Visualización web del viaje de los meteoritos desde su región de origen en el Sistema Solar
hasta su caída en la Tierra, con rigor científico verificable: cada dato mostrado tiene fuente,
la incertidumbre se dibuja (nubes de órbitas, nunca una línea única) y toda escala exagerada
se etiqueta.

Estado: en desarrollo (fase 2 de 4). Incluye Chelyabinsk con su recorrido animado y las 25
caídas con órbita instrumental recalculadas por Granvik y Brown (2018), con su probabilidad de
región de escape y la asociación propuesta con su cuerpo progenitor.

## Rigor

- `npm run validate`: el dataset cumple el esquema y todo valor «verificado» tiene una fuente
  con metadatos verificados.
- `npm run auditoria`: contrasta cada dato que muestra la interfaz con su origen y genera
  [`docs/reportes/trazabilidad.md`](docs/reportes/trazabilidad.md). El build falla si hay
  discrepancias o cifras escritas a mano en los textos.
- Validaciones científicas: [`docs/reportes/chelyabinsk.md`](docs/reportes/chelyabinsk.md) y
  [`docs/reportes/cruzada.md`](docs/reportes/cruzada.md).

## Actualización de los datos del CNEOS

Un workflow diario de GitHub Actions (`.github/workflows/cneos-diario.yml`) descarga la API
Fireball del CNEOS, calcula las órbitas de los eventos nuevos, valida el dataset, pasa las
pruebas y la auditoría, y solo entonces guarda los datos y publica. Los datos no son en tiempo
real: la web muestra la fecha de la última actualización.

## Desarrollo

```
npm ci
npm run dev        # servidor local
npm test           # pruebas unitarias
npm run build      # validación + auditoría + tipos + build
npm run e2e        # pruebas de extremo a extremo (Playwright)
```

Guía interna y decisiones del proyecto: [`CLAUDE.md`](CLAUDE.md).

## Licencias

- Código: [MIT](LICENSE).
- Datos, reportes y textos: [CC BY 4.0](data/LICENCIA.md). Los valores científicos conservan la
  atribución a sus fuentes primarias (`data/fuentes.json`).
- Textura terrestre: NASA Earth Observatory, _Blue Marble: Next Generation_.
- Dependencias: Three.js (MIT), postprocessing (Zlib), astronomy-engine (MIT), zod (MIT).
