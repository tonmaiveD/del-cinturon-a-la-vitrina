import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const auditar = (page: import('@playwright/test').Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('#escena');

test('sin violaciones WCAG 2.1 AA en la página principal y en el diálogo de fuentes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#descripcion')).toContainText('trayectoria de entrada');
  const principal = await auditar(page).analyze();
  expect(principal.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

  await page.getByRole('button', { name: 'Fuentes y créditos' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialogo = await auditar(page).analyze();
  expect(dialogo.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('todos los controles son alcanzables con el teclado y el diálogo devuelve el foco', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#descripcion')).toContainText('trayectoria de entrada');
  const vistos = new Set<string>();
  for (let k = 0; k < 20; k++) {
    await page.keyboard.press('Tab');
    const nombre = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? `${el.tagName.toLowerCase()}:${el.id || el.textContent?.trim()}` : '';
    });
    vistos.add(nombre);
  }
  for (const esperado of [
    'button:Tierra',
    'button:Sistema solar',
    'button:escala',
    'button:recorrido',
    'button:reproducir',
    'select:velocidad',
    'button:impacto',
    'input:fecha',
    'button:abrir-fuentes',
  ])
    expect([...vistos], esperado).toContain(esperado);

  const boton = page.getByRole('button', { name: 'Fuentes y créditos' });
  await boton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(boton).toBeFocused();
});

test('en producción la ficha en borrador no se publica', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Fuentes y créditos' })).toBeVisible();
  await expect(page.locator('#abrir-ficha')).toBeHidden();
});
