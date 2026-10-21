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
  // Reposo de verdad: después de las cargas tardías, que sí deben dibujarse (la vista solar se
  // construye en segundo plano y trae las nubes; la textura grande llega después). En la CI, sin
  // GPU, todo eso tarda varios segundos.
  await page.waitForFunction(() => performance.getEntriesByName('nubes').length > 0, null, {
    timeout: 60_000,
  });
  await expect
    .poll(
      async () => {
        const a = (await motor(page)).dibujados;
        await page.waitForTimeout(1500);
        return (await motor(page)).dibujados - a;
      },
      { timeout: 60_000, intervals: [0] },
    )
    .toBeLessThanOrEqual(2);
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
  // Se parte de una elección explícita («apagado»), que desactiva la activación automática: sin
  // ella, en la CI (sin GPU) el modo se encendería solo a mitad de la prueba
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('prueba-iniciada')) {
      localStorage.setItem('modo-economico', '0');
      sessionStorage.setItem('prueba-iniciada', '1');
    }
  });
  await page.goto('/');
  await page.waitForFunction(() => performance.getEntriesByName('escena').length > 0);
  await abrirPestana(page, 'escena');
  const sw = page.getByRole('switch', { name: 'Modo económico' });
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
