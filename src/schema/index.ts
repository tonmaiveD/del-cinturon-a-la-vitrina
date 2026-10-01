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

/** Nivel de la incertidumbre tal como la publica la fuente. */
export const NivelSigma = z.enum(['1-sigma', '2-sigma', '3-sigma', 'formal-sin-nivel']);

/**
 * Un dato científico con su procedencia.
 * `sigma` es SIEMPRE 1σ en la misma unidad (derivada de `sigma_publicada` si la fuente da 2σ).
 * Si la fuente no declara el nivel (`formal-sin-nivel`), `sigma` asume 1σ y debe decirlo `nota`.
 */
export const Valor = z
  .object({
    valor: z.union([z.number(), z.string()]),
    unidad: z.string().optional(),
    sigma: z.number().nonnegative().optional(),
    sigma_publicada: z.number().nonnegative().optional(),
    nivel_sigma: NivelSigma.optional(),
    fuente: idSlug,
    /** Página, tabla o ecuación dentro de la fuente. */
    ubicacion: z.string().optional(),
    estado: Estado,
    nota: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.sigma_publicada === undefined) return;
    if (!v.nivel_sigma || v.sigma === undefined) {
      ctx.addIssue({ code: 'custom', message: 'sigma_publicada exige nivel_sigma y sigma (1σ)' });
      return;
    }
    const k = { '1-sigma': 1, '2-sigma': 2, '3-sigma': 3, 'formal-sin-nivel': 1 }[v.nivel_sigma];
    if (Math.abs(v.sigma * k - v.sigma_publicada) > 1e-12 * Math.max(1, v.sigma_publicada))
      ctx.addIssue({ code: 'custom', message: `sigma (${v.sigma}) no es sigma_publicada/${k}` });
  });
export type Valor = z.infer<typeof Valor>;

/** Elementos orbitales heliocéntricos osculadores, eclíptica y equinoccio J2000. */
export const Orbita = z.object({
  fuente: idSlug,
  /** Tabla o sección de la fuente donde aparece la órbita. */
  ubicacion: z.string(),
  marco: z.literal('ecliptica-J2000'),
  epoca: Valor, // fecha con su escala de tiempo (TT, ET, UTC) tal como la da la fuente
  a: Valor, // AU
  e: Valor,
  i: Valor, // grados
  omega: Valor, // argumento del perihelio, grados
  nodo: Valor, // longitud del nodo ascendente Ω, grados
  q: Valor.optional(), // AU
  Q: Valor.optional(), // AU
  M: Valor.optional(), // anomalía media en la época, grados
  tiempo_perihelio: Valor.optional(),
});
export type Orbita = z.infer<typeof Orbita>;

export const Meteorito = z.object({
  id: idSlug,
  nombre_oficial: Valor,
  metbull_id: z.number().int().positive().optional(),
  clase: Valor,
  masa_total: Valor.optional(), // kg recuperados
  diametro_preatmosferico: Valor.optional(), // m
  fecha_caida: Valor, // ISO 8601 UTC
  /** Puede faltar mientras no haya fuente accesible; la UI no lo muestra entonces. */
  punto_caida: z.object({ lat: Valor, lon: Valor }).optional(),
  /** Radiante geocéntrico y velocidades publicadas (para validar órbitas calculadas). */
  radiante_geocentrico: z
    .object({
      ra: Valor, // grados, J2000
      dec: Valor, // grados, J2000
      v_geocentrica: Valor, // km/s
      v_entrada: Valor.optional(), // km/s, V∞
    })
    .optional(),
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

const ElementosTabla = z.object({
  a: z.number(),
  e: z.number(),
  i: z.number(),
  omega: z.number(),
  nodo: z.number(),
});

/** Eventos con vector CNEOS y órbita terrestre independiente, transcritos de una fuente. */
export const Calibracion = z.object({
  fuente: idSlug,
  ubicacion: z.string(),
  consultado: z.iso.date(),
  nota: z.string(),
  eventos: z.array(
    z.object({
      nombre: z.string(),
      fecha: z.iso.datetime(),
      lat: z.number(),
      lon: z.number(),
      alt_km: z.number(),
      energia_impacto_kt: z.number(),
      v_ecef_kms: z.tuple([z.number(), z.number(), z.number()]),
      ref: ElementosTabla.extend({ fuente: z.string(), dd: z.number() }),
      cneos_pena: ElementosTabla,
    }),
  ),
});
export type Calibracion = z.infer<typeof Calibracion>;
export type EventoCalibrado = Calibracion['eventos'][number];
