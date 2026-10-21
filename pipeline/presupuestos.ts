/**
 * Presupuestos de tamaño del build (M22): el build falla si lo que descarga el visitante crece
 * más de lo acordado. Se miden bytes comprimidos con gzip (como los sirve el hosting), que no
 * dependen del hardware: a diferencia de los tiempos, sí pueden bloquear la CI.
 *
 * Los límites tienen un margen de alrededor del 10 % sobre lo medido el 2026-10-21. Subir uno
 * es una decisión: anotar el motivo junto al valor. Uso: `tsx pipeline/presupuestos.ts [dist]`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

export interface Presupuesto {
  nombre: string;
  /** Límite en kB comprimidos con gzip (las imágenes WebP se cuentan tal cual). */
  limiteKb: number;
  /** Qué archivos entran (rutas relativas a dist/). */
  archivos: (dist: string) => string[];
  motivo: string;
}

const assets = (dist: string, patron: RegExp) =>
  readdirSync(join(dist, 'assets'))
    .filter((f) => patron.test(f))
    .map((f) => `assets/${f}`);

/** Lo que pide la página antes de ejecutar nada: HTML, script de entrada, precargas y estilos. */
export function cargaInicial(dist: string): string[] {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) =>
    m[1]!.replace(/^.*?assets\//, 'assets/'),
  );
  return ['index.html', ...new Set(refs)];
}

export const PRESUPUESTOS: Presupuesto[] = [
  {
    nombre: 'carga inicial (HTML, entrada, precargas, estilos)',
    limiteKb: 40,
    archivos: cargaInicial,
    motivo: 'textos y paneles visibles en ~0,45 s en 4G lento (medido: 35,4 kB)',
  },
  {
    nombre: 'módulo 3D (Three.js, escena)',
    limiteKb: 205,
    archivos: (d) => assets(d, /^app3d-.*\.js$/),
    motivo: 'escena lista en < 3 s en 4G lento (medido: 187,8 kB)',
  },
  {
    nombre: 'diccionario inglés (solo si se elige)',
    limiteKb: 11,
    archivos: (d) => assets(d, /^en-.*\.js$/),
    motivo: 'medido: 9,4 kB',
  },
  {
    nombre: 'datos iniciales (catálogo, nube y estela de Chelyabinsk)',
    limiteKb: 46,
    archivos: () => [
      'data/catalogo.json',
      'data/chelyabinsk-orbitas.json',
      'data/chelyabinsk-trayectoria.json',
    ],
    motivo: 'se precargan con la página (medido: 40,7 kB)',
  },
  {
    nombre: 'textura inicial del globo',
    limiteKb: 54,
    archivos: () => ['texturas/tierra-1024.webp'],
    motivo: 'primera imagen de la Tierra (medido: 47,8 kB); las mayores llegan después',
  },
  {
    nombre: 'nubes de las piezas (vista solar)',
    limiteKb: 75,
    archivos: () => ['data/nubes.json'],
    motivo: 'medido: 65,6 kB',
  },
  {
    nombre: 'resumen del CNEOS (modo CNEOS)',
    limiteKb: 90,
    archivos: () => ['data/cneos/eventos.json'],
    motivo:
      'medido: 51,5 kB; crece con cada bólido nuevo (el bot lo actualiza a diario), de ahí el margen amplio',
  },
];

export function kbDe(dist: string, archivo: string): number {
  const datos = readFileSync(join(dist, archivo));
  return (archivo.endsWith('.webp') ? datos.length : gzipSync(datos, { level: 9 }).length) / 1024;
}

/** Filas del informe y errores (presupuesto superado o sin archivos que medir). */
export function evaluar(dist: string, presupuestos = PRESUPUESTOS) {
  const filas: string[] = [];
  const errores: string[] = [];
  for (const p of presupuestos) {
    const archivos = p.archivos(dist).filter((a) => existsSync(join(dist, a)));
    if (!archivos.length) {
      errores.push(`${p.nombre}: no se encontró ningún archivo que medir`);
      continue;
    }
    const kb = archivos.reduce((s, a) => s + kbDe(dist, a), 0);
    const ok = kb <= p.limiteKb;
    filas.push(`${ok ? '  ' : '✗ '}${kb.toFixed(1).padStart(6)} / ${p.limiteKb} kB  ${p.nombre}`);
    if (!ok)
      errores.push(
        `${p.nombre}: ${kb.toFixed(1)} kB supera el presupuesto de ${p.limiteKb} kB (${p.motivo})`,
      );
  }
  return { filas, errores };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { filas, errores } = evaluar(process.argv[2] ?? 'dist');
  console.log(`Presupuestos de tamaño (gzip):\n${filas.join('\n')}`);
  if (errores.length) {
    console.error(errores.join('\n'));
    process.exit(1);
  }
}
