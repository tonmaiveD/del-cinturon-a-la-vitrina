/**
 * Fichas que entran en el build. En producción solo las aprobadas: un borrador no debe viajar
 * en el JS publicado ni en sus mapas de fuentes (ocultar el botón no basta). En desarrollo
 * (`vite` sin build) se incluyen todas para poder revisarlas.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { leerFicha } from '../src/ui/ficha';

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

/** Subconjunto publicable: aprobadas (o todas en desarrollo). */
export function seleccionarFichas(
  crudas: Record<string, string>,
  desarrollo: boolean,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(crudas).filter(([, md]) => desarrollo || leerFicha(md).estado === 'aprobada'),
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
      for (const f of Object.keys(crudas)) this.addWatchFile(join(DIR_FICHAS, f));
      return `export default ${JSON.stringify(seleccionarFichas(crudas, desarrollo))};`;
    },
  };
}
