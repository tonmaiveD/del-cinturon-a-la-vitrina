import { expect, test, type Page } from '@playwright/test';
import { abrirPestana } from './hoja';

interface Motor {
  dibujados(): number;
  economico(): boolean;
  fijarEconomico(si: boolean): void;
}
const motor = (page: Page) =>
  page.evaluate(() => {
    const m = (window as unknown as { __app: { motor: Motor } }).__app.motor;
    return { dibujados: m.dibujados(), economico: m.economico() };
  });

test('en reposo la escena casi no se redibuja, y un cambio sí se dibuja (M14)', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => performance.getEntriesByName('escena').length > 0);
  await page.waitForTimeout(1500); // termina la carga de la textura grande y la inercia
  const antes = (await motor(page)).dibujados;
  await page.waitForTimeout(3000);
  const enReposo = (await motor(page)).dibujados - antes;
  console.log(`[${test.info().project.name}] cuadros dibujados en 3 s de reposo: ${enReposo}`);
  // Red de seguridad: un cuadro por segundo (antes se dibujaban todos, ~60 por segundo)
  expect(enReposo).toBeLessThanOrEqual(6);

  const d0 = (await motor(page)).dibujados;
  await abrirPestana(page, 'escena');
  await page.getByRole('button', { name: 'Sistema solar' }).click();
  // El primer cuadro de la vista solar compila sus sombreadores (lento sin GPU): se espera a que
  // lleguen los cuadros que pide el cambio
  await expect
    .poll(async () => (await motor(page)).dibujados - d0, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(3);
});

test('modo económico: interruptor, aviso y elección recordada (M13)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => performance.getEntriesByName('escena').length > 0);
  await abrirPestana(page, 'escena');
  const sw = page.getByRole('switch', { name: 'Modo económico' });
  // Sin elección previa, el modo depende de la velocidad del equipo (puede activarse solo)
  if ((await sw.getAttribute('aria-checked')) === 'true') await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#aviso-economico')).toBeHidden();
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#aviso-economico')).toContainText('los datos son los mismos', {
    ignoreCase: true,
  });
  expect((await motor(page)).economico).toBe(true);
  await page.reload();
  await page.waitForFunction(() => performance.getEntriesByName('escena').length > 0);
  await abrirPestana(page, 'escena');
  await expect(page.getByRole('switch', { name: 'Modo económico' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});
