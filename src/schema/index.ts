/**
 * Esquemas del dataset científico.
 *
 * Regla central: todo valor científico es un `Valor` con fuente registrada en
 * `data/fuentes.json` y un `estado`. La UI solo muestra como dato firme los valores
 * con estado "verificado"; los "pendiente" se muestran marcados o no se muestran.
 */
import { z } from 'zod';

export const ESTADOS = ['verificado', 'pendiente'] as const;
export const Estado = z.enum(ESTADOS);

export const CONFIANZAS = ['alto', 'medio', 'especulativo'] as const;
export const Confianza = z.enum(CONFIANZAS);

const idSlug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id en kebab-case ASCII');

export const Fuente = z.object({
  id: idSlug,
  tipo: z.enum(['articulo', 'circular', 'base-de-datos', 'api', 'software', 'textura']),
  cita: z.string().min(1),
  doi: z
    .string()
    .regex(/^10\.\d{4,9}\/\S+$/)
    .optional(),
  url: z.url().optional(),
  licencia: z.string().min(1),
  consultado: z.iso.date(),
  /** true solo si los metadatos bibliográficos se comprobaron en la fuente primaria. */
  metadatos_verificados: z.boolean(),
  notas: z.string().optional(),
});
export type Fuente = z.infer<typeof Fuente>;

export const Fuentes = z.array(Fuente).superRefine((fs, ctx) => {
  const vistos = new Set<string>();
  for (const f of fs) {
    if (vistos.has(f.id)) ctx.addIssue({ code: 'custom', message: `fuente duplicada: ${f.id}` });
    vistos.add(f.id);
  }
});

/** Un dato científico con su procedencia. `sigma` es 1σ en la misma unidad. */
export const Valor = z.object({
  valor: z.union([z.number(), z.string()]),
  unidad: z.string().optional(),
  sigma: z.number().nonnegative().optional(),
  fuente: idSlug,
  /** Página, tabla o ecuación dentro de la fuente. */
  ubicacion: z.string().optional(),
  estado: Estado,
  nota: z.string().optional(),
});
export type Valor = z.infer<typeof Valor>;

/** Elementos orbitales heliocéntricos osculadores, eclíptica y equinoccio J2000. */
export const Orbita = z.object({
  fuente: idSlug,
  marco: z.literal('ecliptica-J2000'),
  epoca: Valor, // fecha ISO 8601 TDB/UTC según la fuente (indicar en nota)
  a: Valor, // AU
  e: Valor,
  i: Valor, // grados
  omega: Valor, // argumento del perihelio, grados
  nodo: Valor, // longitud del nodo ascendente Ω, grados
  q: Valor.optional(), // AU
});
export type Orbita = z.infer<typeof Orbita>;

export const Meteorito = z.object({
  id: idSlug,
  nombre_oficial: Valor,
  metbull_id: z.number().int().positive().optional(),
  clase: Valor,
  masa_total: Valor.optional(), // kg recuperados
  fecha_caida: Valor, // ISO 8601 UTC
  punto_caida: z.object({ lat: Valor, lon: Valor }),
  orbitas: z.array(Orbita),
});
export type Meteorito = z.infer<typeof Meteorito>;

export const RegionOrigen = z.object({
  id: idSlug,
  nombre: z.string(),
  clases: z.array(z.string()),
  confianza: Confianza,
  justificacion: z.string(),
  fuentes: z.array(idSlug).min(1),
});
export type RegionOrigen = z.infer<typeof RegionOrigen>;

/** Recorre un objeto y devuelve todas las referencias a fuentes (claves `fuente`/`fuentes`). */
export function referenciasDeFuente(obj: unknown, ruta = '$'): { ruta: string; id: string }[] {
  if (Array.isArray(obj)) return obj.flatMap((v, i) => referenciasDeFuente(v, `${ruta}[${i}]`));
  if (obj === null || typeof obj !== 'object') return [];
  const out: { ruta: string; id: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'fuente' && typeof v === 'string') out.push({ ruta: `${ruta}.${k}`, id: v });
    else if (k === 'fuentes' && Array.isArray(v))
      v.forEach((id, i) => typeof id === 'string' && out.push({ ruta: `${ruta}.${k}[${i}]`, id }));
    else out.push(...referenciasDeFuente(v, `${ruta}.${k}`));
  }
  return out;
}
