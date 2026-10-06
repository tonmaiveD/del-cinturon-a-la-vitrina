/** Validación del dataset: esquemas + integridad referencial de fuentes. */
import type { z } from 'zod';
import {
  CalidadCneos,
  Fuentes,
  Meteorito,
  RegionEscape,
  RegionesOrigen,
  RespuestaCneos,
  referenciasDeFuente,
  type Fuente,
} from '../src/schema';

export interface Archivo {
  ruta: string;
  contenido: unknown;
}

export interface Dataset {
  fuentes: unknown;
  regiones: unknown;
  pedigri: Archivo[];
  escape?: unknown;
  /** data/cneos/eventos.json y data/calibracion/pena-asensio-2025-tabla4.json */
  cneos?: { eventos: unknown; calidad: unknown };
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

  const regiones = RegionesOrigen.safeParse(ds.regiones);
  if (!regiones.success) errores.push(...erroresZod('data/regiones-origen.json', regiones.error));
  if (ds.escape !== undefined) {
    const escape = RegionEscape.array().safeParse(ds.escape);
    if (!escape.success) errores.push(...erroresZod('data/regiones-escape.json', escape.error));
  }

  const archivos: Archivo[] = [{ ruta: 'data/regiones-origen.json', contenido: ds.regiones }];
  if (ds.escape !== undefined)
    archivos.push({ ruta: 'data/regiones-escape.json', contenido: ds.escape });
  if (ds.cneos) {
    const ev = RespuestaCneos.safeParse(ds.cneos.eventos);
    if (!ev.success) errores.push(...erroresZod('data/cneos/eventos.json', ev.error));
    const cal = CalidadCneos.safeParse(ds.cneos.calidad);
    if (!cal.success)
      errores.push(...erroresZod('data/calibracion/pena-asensio-2025-tabla4.json', cal.error));
    archivos.push(
      { ruta: 'data/cneos/eventos.json', contenido: ds.cneos.eventos },
      { ruta: 'data/calibracion/pena-asensio-2025-tabla4.json', contenido: ds.cneos.calidad },
    );
  }
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

  if (regiones.success) {
    const ids = new Set(ds.pedigri.map((a) => (a.contenido as { id?: string }).id));
    const vistos = new Map<string, number>();
    const contar = (id: string) => vistos.set(id, (vistos.get(id) ?? 0) + 1);
    regiones.data.asociaciones.forEach((r) => r.meteoritos.forEach(contar));
    regiones.data.sin_asociacion.forEach((x) => contar(x.meteorito));
    for (const [id, n] of vistos) {
      if (!ids.has(id)) errores.push(`data/regiones-origen.json: meteorito inexistente "${id}"`);
      if (n > 1) errores.push(`data/regiones-origen.json: "${id}" aparece ${n} veces`);
    }
    for (const id of ids)
      if (id && !vistos.has(id))
        errores.push(
          `data/regiones-origen.json: "${id}" no tiene asociación ni motivo en sin_asociacion`,
        );
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
