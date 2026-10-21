/**
 * Idiomas que entran en el build, además del español. Como las fichas (M01), un idioma sin
 * aprobar no viaja en la web publicada: en desarrollo (`npm run dev`) se incluyen todos para
 * revisarlos, y `IDIOMAS_VISTA_PREVIA=en` los incluye en un build local de revisión.
 *
 * Cada idioma son dos archivos en `src/i18n/`: `<código>.json` (interfaz, mismas claves que
 * es.json) y `datos.<código>.json` (textos de los datos, con el original del que salieron), y
 * su revisión en `src/i18n/revision.json`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export const DIR_I18N = 'src/i18n';
const ID = 'virtual:idiomas';
const PREFIJO = 'virtual:idioma/';

export interface RevisionIdioma {
  estado: 'borrador' | 'aprobada';
  revisado_por?: string;
  fecha_revision?: string;
}

export const rutasIdioma = (codigo: string, dir = DIR_I18N) => ({
  interfaz: `${dir}/${codigo}.json`,
  datos: `${dir}/datos.${codigo}.json`,
});

export function leerRevisiones(dir = DIR_I18N): Record<string, RevisionIdioma> {
  const ruta = `${dir}/revision.json`;
  return existsSync(ruta)
    ? (JSON.parse(readFileSync(ruta, 'utf8')) as Record<string, RevisionIdioma>)
    : {};
}

/** Aprobado: estado «aprobada» con revisor y fecha (como las fichas). */
export const aprobado = (r: RevisionIdioma | undefined) =>
  r?.estado === 'aprobada' && !!r.revisado_por && !!r.fecha_revision;

/** Idiomas que se incluyen: los que tienen archivo y están aprobados (o en revisión local). */
export function idiomasIncluidos(
  revisiones: Record<string, RevisionIdioma>,
  desarrollo: boolean,
  vistaPrevia = (process.env.IDIOMAS_VISTA_PREVIA ?? '').split(',').filter(Boolean),
  dir = DIR_I18N,
): string[] {
  return Object.keys(revisiones)
    .filter((c) => existsSync(rutasIdioma(c, dir).interfaz))
    .filter((c) => desarrollo || aprobado(revisiones[c]) || vistaPrevia.includes(c))
    .sort();
}

/**
 * `virtual:idiomas`: `export default { en: () => import('virtual:idioma/en') }`; cada idioma va
 * en su propio fragmento y solo se descarga si se elige.
 */
export function idiomasPublicables(): Plugin {
  let desarrollo = false;
  return {
    name: 'idiomas-publicables',
    configResolved(c) {
      desarrollo = c.command === 'serve' && c.mode !== 'test';
    },
    resolveId: (id) => (id === ID || id.startsWith(PREFIJO) ? '\0' + id : undefined),
    load(id) {
      if (!id.startsWith('\0virtual:idioma')) return;
      const revisiones = leerRevisiones();
      this.addWatchFile(resolve(DIR_I18N, 'revision.json'));
      const incluidos = idiomasIncluidos(revisiones, desarrollo);
      if (id === '\0' + ID)
        return `export default {${incluidos
          .map((c) => `${JSON.stringify(c)}: () => import(${JSON.stringify(PREFIJO + c)})`)
          .join(',')}};`;
      const codigo = id.slice(('\0' + PREFIJO).length);
      if (!incluidos.includes(codigo)) throw new Error(`idioma no publicable: ${codigo}`);
      const r = rutasIdioma(codigo);
      this.addWatchFile(resolve(r.interfaz));
      const leer = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '{}');
      if (existsSync(r.datos)) this.addWatchFile(resolve(r.datos));
      return `export const interfaz = ${leer(r.interfaz)};\nexport const datos = ${leer(r.datos)};`;
    },
  };
}
