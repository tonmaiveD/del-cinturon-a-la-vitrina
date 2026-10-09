import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { abrirPestana } from './hoja';

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

  await abrirPestana(page, 'info');
  await page.getByRole('button', { name: 'Fuentes y créditos' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialogo = await auditar(page).analyze();
  expect(dialogo.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('sin violaciones WCAG 2.1 AA en el modo CNEOS (con filtros y detalle abiertos)', async ({
  page,
}) => {
  await page.goto('/?modo=cneos');
  await expect(page.locator('#cneos-evento')).toContainText('Bólido del');
  await abrirPestana(page, 'explorar');
  await page.locator('#seccion-cneos').getByText('Filtros', { exact: true }).click();
  const r = await auditar(page).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('todos los controles son alcanzables con el teclado y el diálogo devuelve el foco', async ({
  page,
}) => {
  // En GitHub (sin GPU) cada pulsación tarda más: con 30 s se agotaba el tiempo (2026-10-08)
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.locator('#descripcion')).toContainText('trayectoria de entrada');
  // En móvil se recorre la pestaña Escena de la hoja; «Ver el recorrido» está en su cabecera
  const movil = await page.locator('#hoja-asa').isVisible();
  await abrirPestana(page, 'escena');
  const vistos = new Set<string>();
  for (let k = 0; k < 30; k++) {
    await page.keyboard.press('Tab');
    const nombre = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? `${el.tagName.toLowerCase()}:${el.id || el.textContent?.trim()}` : '';
    });
    vistos.add(nombre);
  }
  const comunes = [
    'button:Tierra',
    'button:Sistema solar',
    'button:escala',
    'button:reproducir',
    'select:velocidad',
    'button:impacto',
    'input:fecha',
  ];
  const esperados = movil
    ? [...comunes, 'button:hoja-asa', 'button:hoja-recorrido', 'button:hoja-vista']
    : [...comunes, 'button:recorrido', 'button:abrir-fuentes'];
  for (const esperado of esperados) expect([...vistos], esperado).toContain(esperado);

  await abrirPestana(page, 'info');
  const boton = page.getByRole('button', { name: 'Fuentes y créditos' });
  await boton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(boton).toBeFocused({ timeout: 15_000 });
});

test('en producción la ficha en borrador no se publica', async ({ page }) => {
  await page.goto('/');
  await abrirPestana(page, 'info');
  await expect(page.getByRole('button', { name: 'Fuentes y créditos' })).toBeVisible();
  await expect(page.locator('#abrir-ficha')).toBeHidden();
});
