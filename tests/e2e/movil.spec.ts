import { expect, test, type Page } from '@playwright/test';

const listo = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo !== undefined);

/** Fracción de la altura que no tapan la cabecera ni la hoja, y si hay scroll horizontal. */
const medir = (page: Page) =>
  page.evaluate(() => {
    const hoja = document.querySelector('#hoja')!.getBoundingClientRect();
    const cab = document.querySelector('.cabecera')!.getBoundingClientRect();
    return {
      libre: (hoja.top - cab.bottom) / innerHeight,
      scrollHorizontal: document.documentElement.scrollWidth > innerWidth,
    };
  });

test.describe('hoja de paneles en móvil (M02)', () => {
  test.skip(({ isMobile }) => !isMobile, 'solo con emulación táctil');

  for (const [w, h] of [
    [320, 568],
    [390, 844],
  ] as const)
    test(`${w}×${h}: la escena conserva al menos el 55 % de la altura`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      await listo(page);
      const m = await medir(page);
      expect(m.libre).toBeGreaterThanOrEqual(0.55);
      expect(m.scrollHorizontal).toBe(false);
    });

  test('Datos, Controles, Ampliar y Ocultar', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await listo(page);
    await page.getByRole('button', { name: 'Controles' }).click();
    await expect(page.getByRole('button', { name: 'Sistema solar' })).toBeInViewport();
    await page.getByRole('button', { name: 'Datos' }).click();
    await expect(page.getByLabel('Pieza')).toBeInViewport();

    const ampliar = page.getByRole('button', { name: 'Ampliar' });
    await ampliar.click();
    await expect(ampliar).toHaveAttribute('aria-pressed', 'true');
    expect((await medir(page)).libre).toBeLessThan(0.3);
    await ampliar.click();

    const ocultar = page.getByRole('button', { name: 'Ocultar' });
    await ocultar.click();
    const mostrar = page.getByRole('button', { name: 'Mostrar' });
    await expect(mostrar).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByLabel('Pieza')).toBeHidden();
    expect((await medir(page)).libre).toBeGreaterThan(0.75);
    // Ir a una sección vuelve a mostrar la hoja
    await page.getByRole('button', { name: 'Controles' }).click();
    await expect(page.getByRole('button', { name: 'Sistema solar' })).toBeInViewport();
  });

  test('horizontal: la hoja va al costado y la escena queda libre en vertical', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    await listo(page);
    const r = await page.locator('#hoja').boundingBox();
    expect(r!.x).toBeGreaterThan(844 * 0.5);
    expect(r!.height).toBeGreaterThan(380);
    expect((await medir(page)).scrollHorizontal).toBe(false);
  });
});
