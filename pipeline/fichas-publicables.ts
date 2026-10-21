/**
 * Fichas que entran en el build. En producción solo las aprobadas: un borrador no debe viajar
 * en el JS publicado ni en sus mapas de fuentes (ocultar el botón no basta). En desarrollo
 * (`vite` sin build) se incluyen todas para poder revisarlas.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { leerFicha } from '../src/ui/ficha.ts';

export const DIR_FICHAS = 'content/fichas';
const ID = 'virtual:fichas';
const ID_RESUELTO = '\0' + ID;

/** Fichas crudas por nombre de archivo. */
export function leerFichasCrudas(dir = DIR_FICHAS): Record<string, string> {
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => [f, readFileSync(join(dir, f), 'utf8')]),
  );
}

/** Idioma de una ficha por su nombre de archivo («x.md» español, «x.en.md» inglés). */
export const idiomaDeFicha = (archivo: string) => /\.([a-z]{2})\.md$/.exec(archivo)?.[1] ?? 'es';

/**
 * Subconjunto publicable: aprobadas (o todas en desarrollo). Con `IDIOMAS_VISTA_PREVIA=en`, un
 * build local de revisión incluye también los borradores en inglés.
 */
export function seleccionarFichas(
  crudas: Record<string, string>,
  desarrollo: boolean,
  vistaPrevia = (process.env.IDIOMAS_VISTA_PREVIA ?? '').split(',').filter(Boolean),
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(crudas).filter(
      ([archivo, md]) =>
        desarrollo ||
        leerFicha(md).estado === 'aprobada' ||
        vistaPrevia.includes(idiomaDeFicha(archivo)),
    ),
  );
}

/** Módulo virtual `virtual:fichas`: `export default { 'archivo.md': '---…' }`. */
export function fichasPublicables(): Plugin {
  let desarrollo = false;
  return {
    name: 'fichas-publicables',
    configResolved(c) {
      desarrollo = c.command === 'serve' && c.mode !== 'test';
    },
    resolveId: (id) => (id === ID ? ID_RESUELTO : undefined),
    load(id) {
      if (id !== ID_RESUELTO) return;
      const crudas = leerFichasCrudas();
      // Ruta absoluta: con una relativa, el servidor de desarrollo intenta resolverla como import
      for (const f of Object.keys(crudas)) this.addWatchFile(resolve(DIR_FICHAS, f));
      return `export default ${JSON.stringify(seleccionarFichas(crudas, desarrollo))};`;
    },
  };
}
