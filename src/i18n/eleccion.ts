/** Elección del idioma al cargar la página (función pura; la usa src/i18n/idioma.ts). */

/** Nombre de cada idioma en su propio idioma (no se traduce). */
export const NOMBRES_IDIOMA: Record<string, string> = { es: 'Español', en: 'English' };

/**
 * `?lang=` si es un idioma disponible; si no, el primero de los preferidos del navegador que lo
 * sea (por su código base: «en-US» → en); si no, español.
 */
export function idiomaInicial(
  busqueda: string,
  preferidos: readonly string[],
  disponibles: readonly string[],
): { idioma: string; explicito?: string } {
  const pedido = new URLSearchParams(busqueda).get('lang');
  if (pedido && disponibles.includes(pedido)) return { idioma: pedido, explicito: pedido };
  for (const p of preferidos) {
    const base = p.toLowerCase().split('-')[0]!;
    if (disponibles.includes(base)) return { idioma: base };
  }
  return { idioma: 'es' };
}
