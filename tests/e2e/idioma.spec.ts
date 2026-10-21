import { expect, test } from '@playwright/test';
import { abrirPestana } from './hoja';

// Con solo el español publicado el selector no aparece; el resto de la prueba exige un build con
// el inglés (aprobado, o en revisión con IDIOMAS_VISTA_PREVIA=en).
test('idioma: ?lang=en, idioma del navegador, selector y formatos (M38)', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-AR' });
  const page = await ctx.newPage();
  await page.goto('/');
  const conIngles = await page.locator('#idioma option[value="en"]').count();
  if (!conIngles) {
    await expect(page.locator('.cabecera .idioma')).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await ctx.close();
    test.skip(true, 'el inglés no está en este build');
    return;
  }
  await page.goto('/?lang=en&pieza=chelyabinsk');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.locator('#idioma')).toHaveValue('en');
  // Formato numérico de EE. UU. (punto decimal) en el panel
  await expect(page.locator('#procedencia')).toContainText('54.445°');
  // La URL conserva el idioma pedido al actualizar el estado
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/lang=en/);
  await page.screenshot({
    path: `tests/e2e/.resultados/idioma-en-${test.info().project.name}.png`,
  });

  // En el móvil el selector está en la pestaña Info
  await abrirPestana(page, 'info');
  await page.locator('#idioma').selectOption('es');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page).toHaveURL(/lang=es/);
  await expect(page.locator('#procedencia')).toContainText('54,445°');
  await ctx.close();

  // Navegador en inglés y sin ?lang: inglés
  const ctxEn = await browser.newContext({ locale: 'en-US' });
  const pEn = await ctxEn.newPage();
  await pEn.goto('/');
  await expect(pEn.locator('html')).toHaveAttribute('lang', 'en-US');
  await ctxEn.close();
});
