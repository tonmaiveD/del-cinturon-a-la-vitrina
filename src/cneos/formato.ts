/** Textos y cifras del modo CNEOS (sin Three.js). */
import type { CalidadEvento, EventoCneos } from './eventos';
import type { Percentiles } from './resumen';

/**
 * Grupos de la leyenda. Elegible para órbita no es lo mismo que órbita calculada: si el cálculo
 * falló (o falta), el evento va a «orbita-fallida». sin-altura y sin-vector se dibujan igual;
 * los eventos sin ubicación solo aparecen en la lista, nunca en el globo.
 */
export type GrupoLeyenda =
  'con-orbita' | 'orbita-fallida' | 'no-verificable' | 'sin-trayectoria' | 'sin-ubicacion';
export interface ConCalidad {
  calidad: CalidadEvento;
  orbita?: object;
}
export const grupoLeyenda = ({ calidad, orbita }: ConCalidad): GrupoLeyenda =>
  calidad === 'orbita'
    ? orbita && !('error' in orbita)
      ? 'con-orbita'
      : 'orbita-fallida'
    : calidad === 'orbita-no-fiable'
      ? 'no-verificable'
      : calidad === 'sin-ubicacion'
        ? 'sin-ubicacion'
        : 'sin-trayectoria';

/** Colores de la leyenda, compartidos por el panel y los símbolos del globo. */
export const COLOR_LEYENDA: Record<GrupoLeyenda, string> = {
  'con-orbita': '#6fd3ff',
  'orbita-fallida': '#b58cff',
  'no-verificable': '#ffb25c',
  'sin-trayectoria': '#c8ccd8',
  'sin-ubicacion': '#7d8494',
};

const num = (x: number, dec: number) =>
  x.toLocaleString('es', { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Dos cifras significativas, sin notación científica para el rango habitual. */
export function dosCifras(x: number): string {
  if (x === 0) return '0';
  const dec = Math.max(0, 1 - Math.floor(Math.log10(Math.abs(x))));
  return num(Number(x.toPrecision(2)), dec);
}

/**
 * Comparación con la energía de impacto de Chelyabinsk (misma fuente: CNEOS).
 * Devuelve el factor y si es menor; null si es el propio Chelyabinsk o igual.
 */
export function comparacionChelyabinsk(
  kt: number,
  ktChelyabinsk: number,
): { factor: string; menor: boolean } | null {
  if (kt === ktChelyabinsk) return null;
  const r = kt / ktChelyabinsk;
  return r < 1 ? { factor: dosCifras(1 / r), menor: true } : { factor: dosCifras(r), menor: false };
}

/** «1,8 (1,7–2,0)»: mediana y percentiles 16–84 de la nube. */
export function rango(p: Percentiles | null, dec: number): string {
  if (!p) return '—';
  return `${num(p[1], dec)} (${num(p[0], dec)}–${num(p[2], dec)})`;
}

export interface FiltroCneos {
  grupo: GrupoLeyenda | '';
  desde: number;
  energiaMin: number;
  /** Búsqueda por fecha (UTC): «2013», «2013-02», «2013-02-15» o «15/02/2013», «02/2013». */
  fecha?: string;
}

/** Normaliza la búsqueda de fecha a un prefijo ISO; null si no es una fecha reconocible. */
export function prefijoFecha(q: string): string | null {
  const s = q.trim();
  if (s === '') return '';
  let m = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(s);
  if (m)
    return [m[1], m[2], m[3]]
      .filter(Boolean)
      .map((x, i) => (i ? x!.padStart(2, '0') : x))
      .join('-');
  m = /^(?:(\d{1,2})\/)?(\d{1,2})\/(\d{4})$/.exec(s);
  if (m)
    return [m[3], m[2], m[1]]
      .filter(Boolean)
      .map((x, i) => (i ? x!.padStart(2, '0') : x))
      .join('-');
  return null;
}

/** Filtro de la lista: incluye los eventos sin ubicación (el globo solo dibuja los situables). */
export function cumpleFiltroCneos(e: EventoCneos & ConCalidad, f: FiltroCneos): boolean {
  if (f.grupo && grupoLeyenda(e) !== f.grupo) return false;
  if (Number(e.fecha.slice(0, 4)) < f.desde) return false;
  if (f.fecha) {
    const p = prefijoFecha(f.fecha);
    if (p === null || !e.fecha.startsWith(p)) return false;
  }
  return e.impacto_kt >= f.energiaMin;
}

/** Los `n` eventos más recientes de la lista (por fecha, descendente). */
export const recientes = <T extends { fecha: string }>(eventos: T[], n: number): T[] =>
  [...eventos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, n);
