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
const altura = (page: Page) => page.locator('#hoja').getAttribute('data-altura');

test.describe('hoja de paneles en móvil (M02, estilo Mapas de Apple)', () => {
  test.skip(({ isMobile }) => !isMobile, 'solo con emulación táctil');

  for (const [w, h] of [
    [320, 568],
    [390, 844],
    [440, 830], // iPhone 16 Pro Max con las barras de Safari
  ] as const)
    test(`${w}×${h}: la hoja compacta deja la escena casi entera`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      await listo(page);
      expect(await altura(page)).toBe('compacta');
      const m = await medir(page);
      expect(m.libre).toBeGreaterThanOrEqual(0.6);
      expect(m.scrollHorizontal).toBe(false);
      // Las acciones principales están a la vista sin abrir nada
      await expect(page.locator('#hoja-titulo')).toHaveText('Chelyabinsk (2013, LL5)');
      await expect(page.getByRole('button', { name: 'Ver el recorrido' })).toBeInViewport();
      await expect(page.getByRole('button', { name: 'Ver órbitas' })).toBeInViewport();
    });

  test('pestañas, alturas y acciones de la cabecera', async ({ page }) => {
    await page.setViewportSize({ width: 440, height: 830 });
    await page.goto('/');
    await listo(page);
    // Una pestaña desde la altura compacta sube la hoja y muestra solo su sección
    await page.getByRole('button', { name: 'Escena' }).click();
    expect(await altura(page)).toBe('media');
    await expect(page.getByRole('button', { name: 'Girar a la izquierda' })).toBeVisible();
    await expect(page.getByLabel('Pieza')).toBeHidden();
    await page.getByRole('button', { name: 'Explorar' }).click();
    await expect(page.getByLabel('Pieza')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Girar a la izquierda' })).toBeHidden();

    // El asa recorre las alturas
    const asa = page.locator('#hoja-asa');
    await asa.click();
    expect(await altura(page)).toBe('completa');
    expect((await medir(page)).libre).toBeLessThan(0.15);
    await asa.click();
    expect(await altura(page)).toBe('compacta');

    // «Ver órbitas» cambia de vista y la etiqueta pasa a «Ver el globo»
    await page.getByRole('button', { name: 'Ver órbitas' }).click();
    await expect(page.getByRole('button', { name: 'Ver el globo' })).toBeVisible();
    await page.getByRole('button', { name: 'Ver el globo' }).click();
    await expect(page.getByRole('button', { name: 'Ver órbitas' })).toBeVisible();
  });

  test('arrastrar el asa cambia la altura; empezar el recorrido la baja', async ({ page }) => {
    await page.setViewportSize({ width: 440, height: 830 });
    await page.goto('/');
    await listo(page);
    const caja = (await page.locator('#hoja-asa').boundingBox())!;
    const x = caja.x + caja.width / 2;
    const y = caja.y + caja.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 200, { steps: 5 });
    await page.mouse.up();
    expect(await altura(page)).toBe('media');
    await page.getByRole('button', { name: 'Ver el recorrido' }).click();
    expect(await altura(page)).toBe('compacta');
    await expect(page.getByRole('button', { name: 'Saltar animación' })).toBeVisible();
  });

  test('las letras de los campos miden al menos 16 px (sin zoom automático de iOS)', async ({
    page,
  }) => {
    await page.goto('/');
    await listo(page);
    const tamanos = await page.evaluate(() =>
      // El deslizador de fecha no provoca zoom: solo cuentan los campos de texto y los selectores
      [...document.querySelectorAll('select, input:not([type="range"])')].map((e) =>
        parseFloat(getComputedStyle(e).fontSize),
      ),
    );
    expect(Math.min(...tamanos)).toBeGreaterThanOrEqual(16);
  });

  test('horizontal: la hoja va al costado y la escena queda libre', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 400 });
    await page.goto('/');
    await listo(page);
    const r = (await page.locator('#hoja').boundingBox())!;
    expect(r.x).toBeGreaterThan(900 * 0.5);
    expect((await medir(page)).scrollHorizontal).toBe(false);
    await page.getByRole('button', { name: 'Explorar' }).click();
    const r2 = (await page.locator('#hoja').boundingBox())!;
    expect(r2.height).toBeGreaterThan(390);
  });
});
