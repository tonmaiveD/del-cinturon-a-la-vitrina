# Idiomas: cómo se revisa y se publica el inglés

Infraestructura hecha el 2026-10-21 (M38, etapa E1). El español es el idioma base; cualquier
otro se publica solo cuando su revisión está aprobada, como las fichas.

## Archivos

| Archivo                  | Contenido                                                       |
| ------------------------ | --------------------------------------------------------------- |
| `src/i18n/es.json`       | interfaz en español (base)                                      |
| `src/i18n/en.json`       | interfaz en inglés, con las mismas claves y los mismos `{…}`    |
| `src/i18n/datos.en.json` | textos de los datos en inglés, cada uno con su original español |
| `src/i18n/revision.json` | estado de cada idioma: `borrador` o `aprobada` (revisor, fecha) |

Si un texto de los datos cambia en español, su traducción deja de usarse (se ve el español) y
un test lo señala hasta que se revise.

## Cómo revisar

1. `npm run dev` y abrir la web con `?lang=en` (en desarrollo se incluyen los borradores).
2. Recorrer las piezas, el modo CNEOS, los diálogos y la ficha.
3. Corregir en `en.json` / `datos.en.json`, o pedir los cambios.

Para revisar exactamente lo que se publicaría: `IDIOMAS_VISTA_PREVIA=en npm run build` y
`npx tsx pipeline/servidor-estatico.ts 4173`. Ese build incluye también la ficha en inglés en
borrador (`content/fichas/chelyabinsk.en.md`); el normal, no.

Las pruebas e2e usan un navegador en español (`locale: 'es-ES'` en `playwright.config.ts`):
con el inglés publicado, un navegador en inglés abriría la web en inglés y las pruebas que
esperan textos en español fallarían. Con el build de revisión pasan las 84.

## Cómo aprobar

En `src/i18n/revision.json`:

```json
{
  "en": { "estado": "aprobada", "revisado_por": "Pablo Hoffenberg", "fecha_revision": "AAAA-MM-DD" }
}
```

Al aprobarlo, los tests exigen que estén todas las claves y todos los textos de los datos al
día. La ficha de cada pieza en inglés tiene su propia aprobación.

## Qué ve el visitante

- Idioma por `?lang=en`; si no lo hay, el del navegador (inglés si es «en-…»); si no, español.
- Un selector (cabecera; en el móvil, pestaña Info) recarga la página en el otro idioma; la
  escena conserva su estado porque viaja en la URL.
- Números y fechas con el formato del idioma (19.16 en inglés, 19,16 en español). Unidades
  métricas en los dos (decisión del 2026-10-21).
- Mientras solo el español esté publicado, el selector no aparece.

## Lo que comprueba el build

- Auditoría: ninguna cifra escrita a mano en otro idioma (mismas excepciones por clave) y
  ninguna cifra en una traducción de datos que no esté en el original.
- `verificar-dist`: ningún texto de un idioma sin aprobar aparece en `dist/`.
- Tests: mismas claves y parámetros; nada de «live» o «real-time» (el CNEOS no es en tiempo real).
