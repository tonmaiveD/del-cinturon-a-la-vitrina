import { expect, test } from '@playwright/test';

test('la página carga con título, canvas y sin errores de consola', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Del cinturón a la vitrina');
  await expect(page.locator('canvas#escena')).toHaveAttribute('aria-label', /Vista 3D/);
  await page.screenshot({ path: 'tests/e2e/.resultados/inicio.png' });
  expect(errores).toEqual([]);
});
