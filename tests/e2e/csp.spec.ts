import { expect, test, type Page } from '@playwright/test';
import { abrirPestana } from './hoja';

/** Registra toda violación de la política desde antes de cargar la página. */
async function vigilarCsp(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const v: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = v;
    document.addEventListener('securitypolicyviolation', (e) =>
      v.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  return () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}

test('la política de seguridad no bloquea nada de la web (M31)', async ({ page }) => {
  const violaciones = await vigilarCsp(page);
  await page.goto('/');
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
  await page.waitForFunction(() => performance.getEntriesByName('nubes').length > 0, null, {
    timeout: 60_000,
  });
  await abrirPestana(page, 'escena');
  await page.getByRole('button', { name: 'Sistema solar' }).click();
  await page.getByRole('button', { name: 'Ver el recorrido' }).click();
  await page.getByRole('button', { name: 'Saltar animación' }).click();
  await abrirPestana(page, 'info');
  await page.getByRole('button', { name: 'Ficha de Chelyabinsk' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Fuentes y créditos' }).click();
  await page.keyboard.press('Escape');
  await abrirPestana(page, 'explorar');
  await page.getByRole('button', { name: 'Bólidos del CNEOS' }).click();
  await page.waitForFunction(() => performance.getEntriesByName('cneos-panel').length > 0);
  expect(await violaciones()).toEqual([]);

  // El inglés se carga en su propio fragmento: también debe estar permitido
  await page.goto('/?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await page.waitForFunction(() => performance.getEntriesByName('escena').length > 0);
  expect(await violaciones()).toEqual([]);
});

test('un script inyectado en la página no se ejecuta (M31)', async ({ page }) => {
  const violaciones = await vigilarCsp(page);
  await page.goto('/');
  await page.waitForFunction(() => performance.getEntriesByName('texto').length > 0);
  const ejecutado = await page.evaluate(async () => {
    const s = document.createElement('script');
    s.textContent = 'window.__inyectado = true';
    document.body.append(s);
    await new Promise((r) => setTimeout(r, 200));
    return (window as unknown as { __inyectado?: boolean }).__inyectado === true;
  });
  expect(ejecutado).toBe(false);
  expect((await violaciones()).some((v) => v.startsWith('script-src'))).toBe(true);
});
