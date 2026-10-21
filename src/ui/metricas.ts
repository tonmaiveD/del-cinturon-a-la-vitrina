/**
 * Hitos de carga (M22) con la API estándar del navegador (User Timing): las pruebas de
 * rendimiento los leen con `performance.getEntriesByName`. No se envía nada a ningún sitio.
 *
 * - `texto`: textos y paneles escritos.
 * - `catalogo`: lista de piezas y su procedencia disponibles.
 * - `escena`: primera textura del globo y un cuadro dibujado (antes, solo `__listo`).
 * - `nubes`: nubes de órbitas de las piezas en la vista solar.
 * - `cneos-panel` y `cneos-nube`: modo CNEOS con su panel y con la nube del bólido completa.
 */
export type Hito = 'texto' | 'catalogo' | 'escena' | 'nubes' | 'cneos-panel' | 'cneos-nube';

export function marcar(hito: Hito): void {
  try {
    performance.mark(hito);
  } catch {
    // Sin User Timing la página funciona igual
  }
}
