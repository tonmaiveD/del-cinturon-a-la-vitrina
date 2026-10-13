/**
 * Huella del método de cálculo (M18): cambia sola cuando cambia el código del núcleo orbital
 * (`src/core/`), la versión de astronomy-engine (efemérides) o los parámetros indicados. Los
 * datos derivados que la guardan se recalculan al cambiar, sin depender de que alguien se acuerde
 * de subir un número de versión.
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR_NUCLEO = 'src/core';

/** Versión exacta instalada de un paquete según package-lock.json. */
export function versionInstalada(paquete: string): string {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
    packages: Record<string, { version?: string }>;
  };
  const v = lock.packages[`node_modules/${paquete}`]?.version;
  if (!v) throw new Error(`${paquete} no está en package-lock.json`);
  return v;
}

/** Hash corto de los archivos del núcleo, la versión de las efemérides y `parametros`. */
export function huellaMetodo(parametros: unknown): string {
  const h = createHash('sha256');
  for (const f of readdirSync(DIR_NUCLEO)
    .filter((x) => x.endsWith('.ts'))
    .sort()) {
    h.update(f);
    h.update(readFileSync(join(DIR_NUCLEO, f)));
  }
  h.update(`astronomy-engine@${versionInstalada('astronomy-engine')}`);
  h.update(JSON.stringify(parametros));
  return h.digest('hex').slice(0, 16);
}

/**
 * Línea de procedencia para el encabezado de un reporte: commit, si había cambios sin confirmar,
 * versión de las efemérides y una huella de los archivos que lo generan (código y datos), que
 * identifica el contenido aunque el reporte se genere antes de confirmar.
 */
export function procedenciaReporte(archivos: string[]): string {
  const sh = (c: string) => {
    try {
      return execSync(c, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
    } catch {
      return '';
    }
  };
  const commit = sh('git rev-parse --short HEAD') || 'desconocido';
  const sucio = sh(`git status --porcelain -- src pipeline data ${archivos.join(' ')}`) !== '';
  const h = createHash('sha256');
  const nucleo = readdirSync(DIR_NUCLEO)
    .filter((x) => x.endsWith('.ts'))
    .sort()
    .map((x) => join(DIR_NUCLEO, x));
  for (const f of [...nucleo, ...archivos].sort()) {
    h.update(f);
    h.update(readFileSync(f));
  }
  return `Código: commit ${commit}${sucio ? ' con cambios sin confirmar' : ''} · astronomy-engine ${versionInstalada('astronomy-engine')} · Node ${process.version} · huella del código y los datos de entrada ${h.digest('hex').slice(0, 16)}`;
}
