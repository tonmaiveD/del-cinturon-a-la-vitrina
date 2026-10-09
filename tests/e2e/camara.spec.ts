import { expect, test, type Page } from '@playwright/test';

const listo = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo !== undefined);
/** Posición de la cámara terrestre (redondeada) y distancia al centro. */
const camara = (page: Page) =>
  page.evaluate(() => {
    const app = (
      window as unknown as {
        __app: { camT: { camara: { position: { x: number; y: number; z: number } } } };
      }
    ).__app;
    const p = app.camT.camara.position;
    return { x: p.x, y: p.y, z: p.z, d: Math.hypot(p.x, p.y, p.z) };
  });
const distinta = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z) > 1e-3;

test.describe('cámara sin arrastrar (M04)', () => {
  test('con el foco en la escena, las flechas giran la cámara y no cambian la fecha', async ({
    page,
  }) => {
    await page.goto('/');
    await listo(page);
    const fecha = await page.locator('#fecha-texto').textContent();
    const antes = await camara(page);
    await page.locator('#escena').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => distinta(await camara(page), antes)).toBe(true);
    await expect(page.locator('#fecha-texto')).toHaveText(fecha!);

    const d0 = (await camara(page)).d;
    await page.keyboard.press('+');
    await expect.poll(async () => (await camara(page)).d).toBeLessThan(d0 * 0.95);
    await page.keyboard.press('0');
    await expect.poll(async () => Math.abs((await camara(page)).d - antes.d)).toBeLessThan(0.05);
  });

  test('los botones de Cámara giran, acercan y restablecen', async ({ page }) => {
    await page.goto('/');
    await listo(page);
    const antes = await camara(page);
    await page.getByRole('button', { name: 'Girar a la derecha' }).click();
    await expect.poll(async () => distinta(await camara(page), antes)).toBe(true);
    await page.getByRole('button', { name: 'Alejar' }).click();
    await expect.poll(async () => (await camara(page)).d).toBeGreaterThan(antes.d * 1.05);
    await page.getByRole('button', { name: 'Restablecer vista' }).click();
    await expect.poll(async () => Math.abs((await camara(page)).d - antes.d)).toBeLessThan(0.05);
  });
});
