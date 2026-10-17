/**
 * Colección (Fase 4, M33 y M32): rutas y reglas que el esquema solo no puede comprobar.
 * La llama `validarDataset` (parte de `npm run build`) cuando existen los archivos.
 */
import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import type { Fuente, Meteorito, RegionesOrigen } from '../src/schema';
import {
  Ejemplar,
  EjemplarPrivado,
  MeteoritoColeccion,
  type TextoIdiomas,
} from '../src/schema/coleccion';
import { vistaEjemplar } from '../src/coleccion/vista';

export const RUTAS_COLECCION = {
  ejemplares: 'data/coleccion/ejemplares.json',
  meteoritos: 'data/coleccion/meteoritos.json',
  /** Ignorado por git (ver .gitignore): costos, proveedores, notas y fotos originales. */
  privado: 'data/coleccion/privado',
  privados: 'data/coleccion/privado/ejemplares.json',
  fotosOriginales: 'data/coleccion/privado/fotos',
  /** Fotos limpias (sin metadatos) de los ejemplares aprobados: `npm run datos:fotos`. */
  fotosPublicas: 'public/coleccion',
} as const;

export interface DatosColeccion {
  ejemplares?: unknown;
  meteoritos?: unknown;
  privados?: unknown;
}

/** Lee los archivos de la colección que existan (ninguno es obligatorio). */
export function leerColeccion(): DatosColeccion {
  const leer = (r: string) =>
    existsSync(r) ? (JSON.parse(readFileSync(r, 'utf8')) as unknown) : undefined;
  return {
    ejemplares: leer(RUTAS_COLECCION.ejemplares),
    meteoritos: leer(RUTAS_COLECCION.meteoritos),
    privados: leer(RUTAS_COLECCION.privados),
  };
}

const zodErrores = (ruta: string, e: z.ZodError) =>
  e.issues.map((i) => `${ruta}: ${i.path.join('.') || '$'} — ${i.message}`);

/** Textos visibles de un ejemplar (los que necesitan traducción). */
function textos(e: Ejemplar): TextoIdiomas[] {
  return [...e.fotos.map((f) => f.descripcion), ...(e.custodia ? [e.custodia] : [])];
}

export function erroresColeccion(
  c: DatosColeccion,
  ctx: { fuentes: Map<string, Fuente>; pedigri: Meteorito[]; regiones: RegionesOrigen },
): string[] {
  const errores: string[] = [];
  const R = RUTAS_COLECCION;

  const met = z.array(MeteoritoColeccion).safeParse(c.meteoritos ?? []);
  if (!met.success) errores.push(...zodErrores(R.meteoritos, met.error));
  const meteoritos = met.success ? met.data : [];
  const idsPedigri = new Set(ctx.pedigri.map((m) => m.id));
  const vistosMet = new Set<string>();
  for (const m of meteoritos) {
    if (idsPedigri.has(m.id))
      errores.push(`${R.meteoritos}: "${m.id}" ya está en data/pedigri (no se duplica)`);
    if (vistosMet.has(m.id)) errores.push(`${R.meteoritos}: "${m.id}" duplicado`);
    vistosMet.add(m.id);
  }

  const ej = z.array(Ejemplar).safeParse(c.ejemplares ?? []);
  if (!ej.success) errores.push(...zodErrores(R.ejemplares, ej.error));
  const ejemplares = ej.success ? ej.data : [];
  const skus = new Set<string>();
  const fotos = new Map<string, string>();
  for (const e of ejemplares) {
    const p = `${R.ejemplares}: ${e.sku}`;
    if (skus.has(e.sku)) errores.push(`${p} — SKU duplicado`);
    skus.add(e.sku);
    for (const f of e.fotos) {
      const otro = fotos.get(f.archivo);
      if (otro) errores.push(`${p} — la foto ${f.archivo} ya es de ${otro}`);
      fotos.set(f.archivo, e.sku);
    }

    const m =
      ctx.pedigri.find((x) => x.id === e.meteorito) ?? meteoritos.find((x) => x.id === e.meteorito);
    if (!m) {
      errores.push(`${p} — meteorito inexistente "${e.meteorito}"`);
      continue;
    }
    // La masa del ejemplar es un pesaje propio, en gramos, y menor que la masa total recuperada
    const masa = e.masa_muestra;
    if (masa.unidad !== 'g') errores.push(`${p} — masa_muestra debe ir en gramos ("g")`);
    if (typeof masa.valor !== 'number' || !(masa.valor > 0))
      errores.push(`${p} — masa_muestra debe ser un número positivo`);
    const fuente = ctx.fuentes.get(masa.fuente);
    if (fuente && fuente.tipo !== 'registro-coleccion')
      errores.push(
        `${p} — masa_muestra debe venir de un registro de la colección, no de ${masa.fuente} (la masa total del meteorito no es la del ejemplar)`,
      );
    const total = m.masa_total;
    if (
      total?.estado === 'verificado' &&
      typeof total.valor === 'number' &&
      typeof masa.valor === 'number'
    )
      if (masa.valor >= total.valor * 1000)
        errores.push(`${p} — masa_muestra no puede igualar ni superar la masa total recuperada`);

    // Aprobado en inglés exige cada texto visible en inglés
    if (e.revision.en && textos(e).some((t) => t.en === undefined))
      errores.push(`${p} — revisión en inglés sin todos los textos en inglés`);

    try {
      vistaEjemplar(e, ctx.pedigri, meteoritos, ctx.regiones);
    } catch (err) {
      errores.push(`${p} — ${(err as Error).message}`);
    }
  }

  const pr = z.array(EjemplarPrivado).safeParse(c.privados ?? []);
  if (!pr.success) errores.push(...zodErrores(R.privados, pr.error));
  const vistosPr = new Set<string>();
  for (const x of pr.success ? pr.data : []) {
    if (!skus.has(x.sku)) errores.push(`${R.privados}: ${x.sku} — no existe en ${R.ejemplares}`);
    if (vistosPr.has(x.sku)) errores.push(`${R.privados}: ${x.sku} — duplicado`);
    vistosPr.add(x.sku);
  }
  return errores;
}
