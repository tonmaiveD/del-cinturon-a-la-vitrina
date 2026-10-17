/**
 * Comprobación posterior al build: ningún archivo de dist/ (incluidos los mapas de fuentes)
 * contiene texto de una ficha que no esté aprobada. «No visible» no basta: no debe distribuirse.
 * Uso: tsx pipeline/verificar-dist.ts [carpeta]
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { Ejemplar, EjemplarPrivado } from '../src/schema/coleccion';
import { leerFicha } from '../src/ui/ficha';
import { leerColeccion, type DatosColeccion } from './coleccion';
import { metadatosSensibles } from './coleccion-fotos';
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

function textosDe(dir: string): (readonly [string, string])[] {
  return archivos(dir)
    .filter((p) => /\.(js|map|html|css|json|txt)$/.test(p))
    .map((p) => [p, readFileSync(p, 'utf8')] as const);
}

/** Cadenas que no pueden aparecer en dist/ como texto literal (ni escapadas de otro modo). */
const testigo = (s: string) => s.length >= 4 && JSON.stringify(s) === `"${s}"`;

/**
 * M32: nada de la parte privada de la colección (claves y valores de texto de
 * data/coleccion/privado/ejemplares.json) ni de los ejemplares en borrador viaja en dist/.
 */
export function coleccionEnDist(dir: string, c: DatosColeccion): string[] {
  const privados = z.array(EjemplarPrivado).parse(c.privados ?? []);
  const ejemplares = z.array(Ejemplar).parse(c.ejemplares ?? []);
  const buscados: [string, string][] = [];
  if (privados.length)
    for (const clave of ['costo', 'proveedor', 'fecha_compra', 'notas_privadas'])
      buscados.push([`"${clave}":`, `clave privada «${clave}»`]);
  for (const x of privados)
    for (const v of [x.proveedor, x.notas_privadas])
      if (v !== undefined && testigo(v)) buscados.push([v, `dato privado de ${x.sku}`]);
  for (const e of ejemplares.filter((x) => x.revision.es.estado !== 'aprobada'))
    for (const t of [...e.fotos.map((f) => f.descripcion.es), e.custodia?.es])
      if (t !== undefined && testigo(t)) buscados.push([t, `texto de ${e.sku} (borrador)`]);
  const errores: string[] = [];
  if (!buscados.length) return errores;
  for (const [p, txt] of textosDe(dir))
    for (const [s, motivo] of buscados)
      if (txt.includes(s)) errores.push(`${motivo} aparece en ${p}`);
  return errores;
}

/** M32: las fotos publicadas de la colección no conservan EXIF, XMP, IPTC ni ICC. */
export async function fotosConMetadatos(dir: string): Promise<string[]> {
  const carpeta = join(dir, 'coleccion');
  if (!existsSync(carpeta)) return [];
  const errores: string[] = [];
  for (const p of archivos(carpeta).filter((f) => /\.(jpe?g|png|webp|tiff?|heic|avif)$/i.test(f))) {
    const quedan = await metadatosSensibles(p);
    if (quedan.length) errores.push(`${p}: conserva metadatos (${quedan.join(', ')})`);
  }
  return errores;
}

export function borradoresEnDist(dir: string, crudas: Record<string, string>): string[] {
  const textos = textosDe(dir);
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
  const errores = [
    ...borradoresEnDist(dir, leerFichasCrudas()),
    ...coleccionEnDist(dir, leerColeccion()),
    ...(await fotosConMetadatos(dir)),
  ];
  if (errores.length) {
    console.error(errores.join('\n'));
    process.exit(1);
  }
  console.log(`dist sin fichas ni ejemplares en borrador ni datos privados (${dir}).`);
}
