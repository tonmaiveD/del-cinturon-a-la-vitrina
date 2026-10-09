/**
 * Comprobación posterior al build: ningún archivo de dist/ (incluidos los mapas de fuentes)
 * contiene texto de una ficha que no esté aprobada. «No visible» no basta: no debe distribuirse.
 * Uso: tsx pipeline/verificar-dist.ts [carpeta]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { leerFicha } from '../src/ui/ficha';
import { leerFichasCrudas } from './fichas-publicables';

/** Fragmentos literales de la plantilla (entre marcadores), largos y sin caracteres que JSON escape. */
export function testigos(cuerpo: string, n = 5): string[] {
  return cuerpo
    .split(/\{\{[^}]+\}\}|\n|\*+|#+ /)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && JSON.stringify(s) === `"${s}"`)
    .slice(0, n);
}

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? archivos(p) : [p];
  });
}

export function borradoresEnDist(dir: string, crudas: Record<string, string>): string[] {
  const textos = archivos(dir)
    .filter((p) => /\.(js|map|html|css|json|txt)$/.test(p))
    .map((p) => [p, readFileSync(p, 'utf8')] as const);
  const errores: string[] = [];
  for (const [nombre, md] of Object.entries(crudas)) {
    const f = leerFicha(md);
    if (f.estado === 'aprobada') continue;
    const ts = testigos(f.cuerpo);
    if (ts.length === 0) errores.push(`${nombre}: sin fragmentos testigo para comprobar`);
    for (const [p, txt] of textos)
      for (const s of ts) if (txt.includes(s)) errores.push(`${nombre} (borrador) aparece en ${p}`);
  }
  return errores;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? 'dist';
  const errores = borradoresEnDist(dir, leerFichasCrudas());
  if (errores.length) {
    console.error(errores.join('\n'));
    process.exit(1);
  }
  console.log(`dist sin fichas en borrador (${dir}).`);
}
