/**
 * Huella del método de cálculo (M18): cambia sola cuando cambia el código que ejecuta el cálculo
 * (el archivo de entrada y todo lo que importa en tiempo de ejecución, sin los imports de solo
 * tipos), la versión de los paquetes que usa (astronomy-engine: efemérides) o los parámetros
 * indicados. Los datos derivados que la guardan se recalculan al cambiar, sin depender de que
 * alguien se acuerde de subir un número de versión.
 *
 * Hasta el 2026-10-17 cubría todo `src/core/` y nada más: un cambio en `registroDe()`
 * (`src/cneos/eventos.ts`) o en el propio cálculo del pipeline no la cambiaba, y retocar un
 * archivo del núcleo que el cálculo no usa obligaba a recalcular sin motivo.
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

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

/** Imports de un archivo que se ejecutan: `import type` y `export type` no cuentan. */
const IMPORT =
  /(?:^|[\n;])\s*(?:import|export)\s+(type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolverLocal(desde: string, especificador: string): string {
  const base = resolve(dirname(desde), especificador);
  for (const c of [base, `${base}.ts`, join(base, 'index.ts')])
    if (existsSync(c) && statSync(c).isFile()) return relative(process.cwd(), c);
  throw new Error(`${desde}: no se resuelve el import "${especificador}"`);
}

/**
 * Cierre de los imports de ejecución desde `entrada`: los archivos locales (rutas relativas a la
 * raíz del proyecto, ordenadas) y los paquetes externos (sin los módulos de Node).
 */
export function dependenciasDelMetodo(entrada: string): { archivos: string[]; paquetes: string[] } {
  const archivos = new Set<string>();
  const paquetes = new Set<string>();
  const pendientes = [entrada];
  while (pendientes.length) {
    const f = pendientes.pop()!;
    if (archivos.has(f)) continue;
    archivos.add(f);
    if (!f.endsWith('.ts')) continue;
    for (const m of readFileSync(f, 'utf8').matchAll(IMPORT)) {
      if (m[1]) continue; // solo tipos: no afecta al resultado
      const esp = (m[2] ?? m[3])!;
      if (esp.startsWith('.')) pendientes.push(resolverLocal(f, esp));
      else if (!esp.startsWith('node:'))
        paquetes.add(
          esp.startsWith('@') ? esp.split('/').slice(0, 2).join('/') : esp.split('/')[0]!,
        );
    }
  }
  return { archivos: [...archivos].sort(), paquetes: [...paquetes].sort() };
}

/**
 * Hash corto del código que ejecuta `entrada` (archivo de entrada y su cierre de imports), de la
 * versión instalada de cada paquete que usa y de `parametros`.
 */
export function huellaMetodo(parametros: unknown, entrada: string): string {
  const { archivos, paquetes } = dependenciasDelMetodo(entrada);
  const h = createHash('sha256');
  for (const f of archivos) {
    h.update(f);
    h.update(readFileSync(f));
  }
  for (const p of paquetes) h.update(`${p}@${versionInstalada(p)}`);
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
