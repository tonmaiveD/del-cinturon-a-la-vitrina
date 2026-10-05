/** Validación del dataset: esquemas + integridad referencial de fuentes. */
import type { z } from 'zod';
import { Fuentes, Meteorito, RegionOrigen, referenciasDeFuente, type Fuente } from '../src/schema';

export interface Archivo {
  ruta: string;
  contenido: unknown;
}

export interface Dataset {
  fuentes: unknown;
  regiones: unknown;
  pedigri: Archivo[];
}

function erroresZod(ruta: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${ruta}: ${i.path.join('.') || '$'} — ${i.message}`);
}

/** Devuelve la lista de errores; vacía si el dataset es válido. */
export function validarDataset(ds: Dataset): string[] {
  const errores: string[] = [];

  const fuentes = Fuentes.safeParse(ds.fuentes);
  if (!fuentes.success) return erroresZod('data/fuentes.json', fuentes.error);
  const porId = new Map<string, Fuente>(fuentes.data.map((f) => [f.id, f]));

  const regiones = RegionOrigen.array().safeParse(ds.regiones);
  if (!regiones.success) errores.push(...erroresZod('data/regiones-origen.json', regiones.error));

  const archivos: Archivo[] = [{ ruta: 'data/regiones-origen.json', contenido: ds.regiones }];
  for (const a of ds.pedigri) {
    const m = Meteorito.safeParse(a.contenido);
    if (!m.success) errores.push(...erroresZod(a.ruta, m.error));
    else if (
      m.data.orbita_principal &&
      !m.data.orbitas.some((o) => o.fuente === m.data.orbita_principal)
    )
      errores.push(
        `${a.ruta}: orbita_principal "${m.data.orbita_principal}" no está entre sus órbitas`,
      );
    archivos.push(a);
  }

  for (const a of archivos) {
    for (const ref of referenciasDeFuente(a.contenido)) {
      if (!porId.has(ref.id))
        errores.push(`${a.ruta}: ${ref.ruta} — fuente inexistente "${ref.id}"`);
    }
    errores.push(...verificadosConFuenteVerificada(a, porId));
  }
  return errores;
}

/** Un valor "verificado" no puede apoyarse en una fuente cuyos metadatos no se comprobaron. */
function verificadosConFuenteVerificada(a: Archivo, porId: Map<string, Fuente>): string[] {
  const out: string[] = [];
  const visitar = (obj: unknown, ruta: string): void => {
    if (Array.isArray(obj)) return obj.forEach((v, i) => visitar(v, `${ruta}[${i}]`));
    if (obj === null || typeof obj !== 'object') return;
    const o = obj as Record<string, unknown>;
    if (o.estado === 'verificado' && typeof o.fuente === 'string') {
      const f = porId.get(o.fuente);
      if (f && !f.metadatos_verificados)
        out.push(
          `${a.ruta}: ${ruta} — "verificado" con fuente sin metadatos verificados (${f.id})`,
        );
    }
    for (const [k, v] of Object.entries(o)) visitar(v, `${ruta}.${k}`);
  };
  visitar(a.contenido, '$');
  return out;
}
