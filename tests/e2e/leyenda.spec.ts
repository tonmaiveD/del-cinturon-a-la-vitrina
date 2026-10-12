import { expect, test, type Page } from '@playwright/test';
import { abrirPestana } from './hoja';

const listo = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo !== undefined);

test('leyenda por capa de la vista solar (M27)', async ({ page }) => {
  await page.goto('/?pieza=pribram');
  await listo(page);
  const leyenda = page.locator('#leyenda-capas');
  // En la vista de la Tierra no hay leyenda de capas
  await expect(leyenda).toBeHidden();
  await abrirPestana(page, 'escena');
  await page.getByRole('button', { name: 'Sistema solar' }).click();
  await expect(leyenda).toBeVisible();
  await expect(leyenda).toContainText('Órbitas posibles de la pieza elegida');
  await expect(leyenda).toContainText('Región Hungaria');
  await expect(leyenda).toContainText(/no es una probabilidad calibrada/i);

  // En el modo de bólidos la leyenda describe su nube y su método
  await page.goto('/?modo=cneos&evento=cneos-20130215-032026&vista=sistema-solar');
  await listo(page);
  await abrirPestana(page, 'escena');
  await expect(leyenda).toContainText('variantes del vector del CNEOS');
  await expect(leyenda).not.toContainText('Región Hungaria');
  await abrirPestana(page, 'explorar');
  await expect(page.locator('#cneos-evento')).toContainText('no una probabilidad calibrada');
});
