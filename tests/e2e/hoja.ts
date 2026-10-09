import type { Page } from '@playwright/test';

export type Pestana = 'explorar' | 'escena' | 'info';

/**
 * En móvil los controles están en pestañas de la hoja inferior: abre la indicada (y sube la hoja
 * si estaba compacta). En escritorio no hace nada: los paneles están siempre a la vista.
 */
export async function abrirPestana(page: Page, p: Pestana): Promise<void> {
  const boton = page.locator(`[data-pestana-boton="${p}"]`);
  if (await boton.isVisible()) await boton.click();
}
