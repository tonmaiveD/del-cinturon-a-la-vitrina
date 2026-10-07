/** Textos y cifras del modo CNEOS (sin Three.js). */
import type { CalidadEvento, EventoCneos } from './eventos';
import type { Percentiles } from './resumen';

/** Grupos de la leyenda (sin-altura y sin-vector se dibujan igual: sin trayectoria). */
export type GrupoLeyenda = 'con-orbita' | 'no-verificable' | 'sin-trayectoria';
export const grupoLeyenda = (c: CalidadEvento): GrupoLeyenda =>
  c === 'orbita' ? 'con-orbita' : c === 'orbita-no-fiable' ? 'no-verificable' : 'sin-trayectoria';

/** Colores de la leyenda, compartidos por el panel y los símbolos del globo. */
export const COLOR_LEYENDA: Record<GrupoLeyenda, string> = {
  'con-orbita': '#6fd3ff',
  'no-verificable': '#ffb25c',
  'sin-trayectoria': '#c8ccd8',
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
}

export function cumpleFiltroCneos(e: EventoCneos, f: FiltroCneos): boolean {
  if (e.lat === undefined) return false; // solo los que se pueden situar en el globo
  if (f.grupo && grupoLeyenda(e.calidad) !== f.grupo) return false;
  if (Number(e.fecha.slice(0, 4)) < f.desde) return false;
  return e.impacto_kt >= f.energiaMin;
}

/** Los `n` eventos más recientes de la lista (por fecha, descendente). */
export const recientes = <T extends { fecha: string }>(eventos: T[], n: number): T[] =>
  [...eventos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, n);
