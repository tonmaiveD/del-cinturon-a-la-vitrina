/**
 * Qué puede mostrar la visualización para un ejemplar de la colección. Sale siempre del
 * meteorito, nunca del ejemplar: dos ejemplares del mismo meteorito tienen la misma vista.
 *
 * - `recorrido`: el meteorito es una caída con órbita publicada (data/pedigri).
 * - `procedencia-por-clase`: sin órbita, se muestran las asociaciones con progenitor de su clase
 *   (con su confianza). Nunca se inventa una órbita para completar la ficha.
 * - `sin-procedencia`: sin órbita y sin asociación aplicable, con el motivo.
 */
import type { Meteorito, RegionesOrigen } from '../schema';
import type { Ejemplar, MeteoritoColeccion } from '../schema/coleccion';

export type VistaEjemplar =
  | { tipo: 'recorrido'; pieza: string }
  | { tipo: 'procedencia-por-clase'; meteorito: string; asociaciones: string[] }
  | { tipo: 'sin-procedencia'; meteorito: string; motivo: string };

/**
 * Códigos de clase sin el tipo petrológico, tal como los usan las asociaciones («LL5» → LL,
 * «H5/6» → H, «CM2» → CM, «eucrita» → eucrita). Más de uno si la clase es ambigua («L/LL5»).
 */
export function clasesBase(clase: string): string[] {
  const bases = clase
    .split('/')
    .map((parte) => /^[A-Za-z]+/.exec(parte.trim())?.[0])
    .filter((b): b is string => b !== undefined);
  return [...new Set(bases)];
}

export function vistaEjemplar(
  e: Ejemplar,
  pedigri: Meteorito[],
  coleccion: MeteoritoColeccion[],
  regiones: RegionesOrigen,
): VistaEjemplar {
  const caida = pedigri.find((m) => m.id === e.meteorito);
  if (caida) {
    const conOrbita = caida.orbitas.some((o) => o.a.estado === 'verificado');
    if (conOrbita) return { tipo: 'recorrido', pieza: caida.id };
  }
  const m = caida ?? coleccion.find((x) => x.id === e.meteorito);
  if (!m) throw new Error(`${e.sku}: meteorito ${e.meteorito} inexistente`);
  if (m.clase.estado !== 'verificado')
    return { tipo: 'sin-procedencia', meteorito: m.id, motivo: 'clase sin verificar' };
  const bases = clasesBase(String(m.clase.valor));
  if (bases.length !== 1)
    return { tipo: 'sin-procedencia', meteorito: m.id, motivo: 'clase ambigua' };
  // Las asociaciones con un meteoroide observado (2008 TC3) valen solo para sus meteoritos
  const asociaciones = regiones.asociaciones
    .filter((a) => a.tipo !== 'meteoroide-observado')
    .filter((a) => a.clases.some((c) => c.toLowerCase() === bases[0]!.toLowerCase()))
    .map((a) => a.id);
  return asociaciones.length
    ? { tipo: 'procedencia-por-clase', meteorito: m.id, asociaciones }
    : {
        tipo: 'sin-procedencia',
        meteorito: m.id,
        motivo: 'sin asociación publicada para su clase',
      };
}
