/**
 * Formato de números y fechas según el idioma activo (una sola definición para toda la
 * interfaz, preparada para el inglés de EE. UU.: coma o punto decimal, orden de la fecha).
 */
import { idiomaActivo, t } from '.';

/** Etiqueta BCP 47 de cada diccionario. */
const LOCALES: Record<string, string> = { es: 'es', en: 'en-US' };

export const localeActivo = (): string => LOCALES[idiomaActivo()] ?? 'es';

/** Número con las opciones de `Intl.NumberFormat`. */
export const numero = (x: number, opciones?: Intl.NumberFormatOptions): string =>
  x.toLocaleString(localeActivo(), opciones);

/** Número con exactamente `dec` decimales. */
export const fijo = (x: number, dec: number): string =>
  numero(x, { minimumFractionDigits: dec, maximumFractionDigits: dec });

/**
 * Fecha con las opciones de `Intl.DateTimeFormat` (las de la interfaz siempre en UTC). La hora,
 * en formato de 24 horas en todos los idiomas, como es convención con UTC («03:20», no «3:20 AM»).
 */
export const fecha = (d: Date, opciones: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat(localeActivo(), {
    ...opciones,
    ...((opciones.timeStyle || opciones.hour) && { hourCycle: 'h23' as const }),
  }).format(d);

/** Letra de un punto cardinal en el idioma activo (el oeste es «O» en español y «W» en inglés). */
export const cardinal = (letra: 'N' | 'S' | 'E' | 'O'): string => t(`cardinal.${letra}`);

/** Porcentaje ya formateado (`valor` o `valor ± σ`) con la tipografía del idioma («62 %», «62%»). */
export const porcentaje = (texto: string): string => t('formato.porcentaje', { v: texto });
