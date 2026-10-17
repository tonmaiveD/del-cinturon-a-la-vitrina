/**
 * Esquemas de la colección (Fase 4, M33 y M32).
 *
 * Un meteorito no es un ejemplar. El meteorito (clase, masa total, órbita, procedencia) es
 * información científica compartida: vive en `data/pedigri/` o, si no tiene órbita publicada,
 * en `data/coleccion/meteoritos.json`. El ejemplar es la pieza concreta (SKU, masa de la
 * muestra, fotos) y solo se enlaza al meteorito por su id; nunca copia sus datos.
 *
 * Lo privado (costos, proveedores, notas, fotos originales con EXIF) va en
 * `data/coleccion/privado/`, ignorado por git: el repositorio es público. Los esquemas públicos
 * son estrictos, así que un campo privado escrito por error en un archivo público no valida.
 *
 * Preparado para dos idiomas (decisión del 2026-10-14): todo texto visible es `TextoIdiomas` y
 * cada idioma tiene su propia revisión.
 */
import { z } from 'zod';
import { idSlug, Valor } from '.';

/** Texto visible en cada idioma: el español es obligatorio; el inglés llegará con M38. */
export const TextoIdiomas = z
  .object({ es: z.string().min(1), en: z.string().min(1).optional() })
  .strict();
export type TextoIdiomas = z.infer<typeof TextoIdiomas>;

/** Revisión humana en un idioma: nada se publica en un idioma sin aprobación en ese idioma. */
export const Revision = z
  .object({
    estado: z.enum(['borrador', 'aprobada']),
    revisado_por: z.string().min(1).optional(),
    fecha_revision: z.iso.date().optional(),
  })
  .strict()
  .refine((r) => r.estado !== 'aprobada' || (r.revisado_por && r.fecha_revision), {
    message: 'una revisión aprobada exige revisado_por y fecha_revision',
  });
export type Revision = z.infer<typeof Revision>;

/** Lo pone quien aporta la colección; el validador solo exige que sea único. */
export const Sku = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'SKU: letras, cifras, punto, guion o guion bajo');

export const TIPOS_EJEMPLAR = ['individual', 'fragmento', 'corte', 'lamina', 'otro'] as const;

export const Foto = z
  .object({
    /** Nombre del original en `data/coleccion/privado/fotos/` (con sus metadatos, privado). */
    archivo: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp|tiff?|heic)$/i),
    /** Texto alternativo de la foto. */
    descripcion: TextoIdiomas,
    credito: z.string().min(1),
    licencia: z.string().min(1),
  })
  .strict();
export type Foto = z.infer<typeof Foto>;

/** Parte pública de un ejemplar (`data/coleccion/ejemplares.json`). */
export const Ejemplar = z
  .object({
    sku: Sku,
    /** Id del meteorito: una caída de `data/pedigri/` o uno de `data/coleccion/meteoritos.json`. */
    meteorito: idSlug,
    tipo: z.enum(TIPOS_EJEMPLAR),
    /** Masa de esta muestra, en gramos, de una fuente `registro-coleccion`. Nunca la total. */
    masa_muestra: Valor,
    fotos: z.array(Foto),
    /** Historia del ejemplar que se puede publicar (de quién viene, colecciones previas). */
    custodia: TextoIdiomas.optional(),
    revision: z.object({ es: Revision, en: Revision.optional() }).strict(),
  })
  .strict();
export type Ejemplar = z.infer<typeof Ejemplar>;

/**
 * Meteorito de la colección sin órbita publicada: solo lo científico compartido por todos sus
 * ejemplares. No admite órbita (esquema estricto): su vista es la procedencia por clase.
 */
export const MeteoritoColeccion = z
  .object({
    id: idSlug,
    nombre_oficial: Valor,
    metbull_id: z.number().int().positive().optional(),
    clase: Valor,
    masa_total: Valor.optional(), // kg recuperados
  })
  .strict();
export type MeteoritoColeccion = z.infer<typeof MeteoritoColeccion>;

/** Parte privada de un ejemplar (`data/coleccion/privado/ejemplares.json`, fuera de git). */
export const EjemplarPrivado = z
  .object({
    sku: Sku,
    costo: z
      .object({ valor: z.number().nonnegative(), moneda: z.string().regex(/^[A-Z]{3}$/) })
      .strict()
      .optional(),
    proveedor: z.string().min(1).optional(),
    fecha_compra: z.iso.date().optional(),
    notas_privadas: z.string().optional(),
  })
  .strict();
export type EjemplarPrivado = z.infer<typeof EjemplarPrivado>;
