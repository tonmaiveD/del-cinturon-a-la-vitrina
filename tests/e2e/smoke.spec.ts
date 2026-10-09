import { expect, test } from '@playwright/test';
import { abrirPestana } from './hoja';

test('carga la vista Tierra, cambia a sistema solar y alterna la escala sin errores', async ({
  page,
}) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Del cinturón a la vitrina');
  await expect(page.locator('#descripcion')).toContainText('trayectoria de entrada');
  await abrirPestana(page, 'escena');
  await expect(page.getByRole('button', { name: 'Tierra', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `tests/e2e/.resultados/tierra-${test.info().project.name}.png` });

  await abrirPestana(page, 'escena');
  await page.getByRole('button', { name: 'Sistema solar' }).click();
  await expect(page.locator('#descripcion')).toContainText('órbitas posibles');
  await abrirPestana(page, 'escena');
  const escala = page.getByRole('switch', { name: 'Escala visual' });
  await expect(page.locator('#aviso-escala')).toContainText('Escala visual');
  await escala.click();
  await expect(escala).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#aviso-escala')).toContainText('Escala real');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `tests/e2e/.resultados/sistema-solar-${test.info().project.name}.png`,
  });

  // Sin scroll horizontal
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(ancho).toBeLessThanOrEqual(0);
  expect(errores).toEqual([]);
});
