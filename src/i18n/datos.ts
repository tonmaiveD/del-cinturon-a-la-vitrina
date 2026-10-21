/**
 * Textos de los datos que la interfaz muestra (no pasan por el diccionario): nombres de las
 * regiones de escape, nombre y justificación de cada asociación con progenitor y motivo de las
 * piezas sin asociación. Cada uno tiene una clave estable para su traducción
 * (`src/i18n/datos.<idioma>.json`).
 */
import type { Catalogo, PiezaCatalogo } from '../ui/catalogo';

export const claveRegion = (id: string) => `region:${id}`;
export const claveAsociacion = (id: string, campo: 'nombre' | 'justificacion') =>
  `asociacion:${id}:${campo}`;
export const claveSinAsociacion = (meteorito: string) => `sin-asociacion:${meteorito}`;

function textosDePieza(p: PiezaCatalogo): [string, string][] {
  const out: [string, string][] = [];
  for (const g of p.escape) for (const r of g.regiones) out.push([claveRegion(r.region), r.nombre]);
  const a = p.asociacion;
  if ('confianza' in a)
    out.push(
      [claveAsociacion(a.id, 'nombre'), a.nombre],
      [claveAsociacion(a.id, 'justificacion'), a.justificacion],
    );
  else out.push([claveSinAsociacion(p.id), a.sin]);
  return out;
}

/** Todos los textos de datos visibles, por clave (el original en español). */
export function textosDeDatos(c: Catalogo): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of c.piezas)
    for (const [k, v] of textosDePieza(p)) {
      // Una misma clave con dos textos distintos sería ambigua para traducir
      if (out[k] !== undefined && out[k] !== v) throw new Error(`${k}: dos textos distintos`);
      out[k] = v;
    }
  return out;
}
