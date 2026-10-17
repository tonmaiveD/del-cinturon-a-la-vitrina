# Colección: cómo se cargan los ejemplares

Modelo de la Fase 4 (M33 y M32, hecho el 2026-10-17). Todavía no hay interfaz que muestre los
ejemplares: esto define los datos, su validación y lo que nunca puede publicarse.

## Meteorito y ejemplar son cosas distintas

- El **meteorito** es la información científica compartida: nombre oficial, clase, masa total
  recuperada, órbita y procedencia. Las 25 caídas con órbita están en `data/pedigri/`. Un
  meteorito sin órbita publicada se añade a `data/coleccion/meteoritos.json`, sin órbita: su
  vista será la procedencia por clase.
- El **ejemplar** es la pieza concreta: SKU, tipo, masa de la muestra, fotos e historia. Se
  enlaza al meteorito por su id y nunca copia sus datos. Dos ejemplares del mismo meteorito
  comparten toda la parte científica y cada uno conserva su masa y sus fotos.

Qué muestra la visualización para cada ejemplar (`src/coleccion/vista.ts`):

| Meteorito                                  | Vista                                                     |
| ------------------------------------------ | --------------------------------------------------------- |
| Caída de `data/pedigri/` con órbita        | su recorrido                                              |
| Sin órbita, clase con asociación publicada | procedencia por clase (p. ej. H → Hebe, con su confianza) |
| Sin órbita, clase ambigua o sin asociación | sin procedencia, con el motivo                            |

La asociación de 2008 TC3 es solo de Almahata Sitta: otra ureilita no la hereda.

## Archivos

| Archivo                                  | Contenido                                 | En git |
| ---------------------------------------- | ----------------------------------------- | ------ |
| `data/coleccion/ejemplares.json`         | parte pública de cada ejemplar            | sí     |
| `data/coleccion/meteoritos.json`         | meteoritos sin órbita de la colección     | sí     |
| `data/coleccion/privado/ejemplares.json` | costo, proveedor, fecha de compra, notas  | **no** |
| `data/coleccion/privado/fotos/`          | fotos originales (con EXIF, GPS, cámara)  | **no** |
| `public/coleccion/<sku>-<n>.webp`        | fotos limpias de los ejemplares aprobados | sí     |

Los esquemas en JSON Schema están en `docs/esquemas/coleccion-*.schema.json`
(`npm run schemas`).

**La carpeta `privado/` no se sube nunca** (está en `.gitignore`) y por eso no tiene copia en
GitHub: necesita su propio respaldo (por ejemplo, Time Machine). No compartas la carpeta del
proyecto comprimida: llevaría lo privado y los respaldos con el gmail de `.trabajo/`.

## Campos de un ejemplar

- `sku`: lo pones tú; letras, cifras, punto, guion o guion bajo. Debe ser único.
- `meteorito`: id de una caída de `data/pedigri/` o de `data/coleccion/meteoritos.json`.
- `tipo`: `individual`, `fragmento`, `corte`, `lamina` u `otro`.
- `masa_muestra`: en gramos (`"unidad": "g"`), con una fuente de tipo `registro-coleccion` en
  `data/fuentes.json` (tu registro de pesajes). Nunca la masa total del meteorito: el validador
  rechaza otra fuente y una masa igual o mayor que la total recuperada.
- `fotos`: `archivo` (el nombre del original en `privado/fotos/`), `descripcion` (texto
  alternativo), `credito` y `licencia`.
- `custodia` (opcional): la historia que se puede publicar (de qué colección viene, etc.).
- `revision`: estado por idioma, `borrador` o `aprobada` (con `revisado_por` y
  `fecha_revision`). Solo lo aprobado se publica.

Los textos visibles se escriben por idioma, `{ "es": "…" }`; el inglés (`"en"`) se añadirá con
la versión en inglés, y aprobar un ejemplar en inglés exige todos sus textos en inglés.

Un campo que no esté en el esquema hace fallar la validación. Así, un costo escrito por error en
el archivo público no llega a la web.

## Lo que comprueba el build

- `npm run validate`: esquemas, SKU y fotos únicos, meteorito existente, masa propia en gramos,
  revisiones completas, parte privada solo con SKU existentes.
- `npm run datos:fotos`: vuelve a codificar las fotos de los ejemplares aprobados sin ningún
  metadato y comprueba el resultado.
- `pipeline/verificar-dist.ts` (después de `vite build`): `dist/` no contiene claves ni textos
  de la parte privada, ni textos de ejemplares en borrador, ni fotos con EXIF, XMP, IPTC o ICC.

## Pendiente de decisiones

Colección pública o privada (M10: si es privada, otro hosting, sin mapas de fuentes y con
acceso restringido también a imágenes y JSON), la lista de piezas, licencias por activo (M29) y
la interfaz que mostrará los ejemplares.
