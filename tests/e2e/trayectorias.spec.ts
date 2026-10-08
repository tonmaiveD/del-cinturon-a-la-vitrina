import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const indice = (
  JSON.parse(readFileSync('public/data/trayectorias/indice.json', 'utf8')) as { piezas: string[] }
).piezas;
const listo = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo !== undefined);

test('una pieza con trayectoria habilita el recorrido y lo completa', async ({ page }) => {
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await page.goto('/?pieza=pribram');
  await listo(page);
  const boton = page.getByRole('button', { name: 'Ver el recorrido' });
  await expect(boton).toBeEnabled();
  await expect(page.locator('#nota-recorrido')).toBeHidden();
  await expect(page.locator('#descripcion')).toContainText('altura convencional de 100 km');
  await boton.click();
  await expect(page.getByRole('button', { name: 'Saltar animación' })).toBeVisible();
  await page.waitForTimeout(6000);
  await page.screenshot({
    path: `tests/e2e/.resultados/recorrido-pribram-${test.info().project.name}.png`,
  });
  await expect(page.locator('#descripcion')).toContainText('Llegada del meteoroide de Příbram', {
    timeout: 180_000,
  });
  await expect(page.locator('#fecha-texto')).toContainText('instante de referencia');
  expect(errores).toEqual([]);
});

test('una pieza sin trayectoria mantiene el recorrido desactivado y lo explica', async ({
  page,
}) => {
  const sin = ['almahata-sitta', 'annama', 'zdar-nad-sazavou', 'ejby'].find(
    (id) => !indice.includes(id),
  );
  test.skip(!sin, 'todas las piezas tienen trayectoria');
  await page.goto(`/?pieza=${sin}`);
  await listo(page);
  await expect(page.getByRole('button', { name: 'Ver el recorrido' })).toBeDisabled();
  await expect(page.locator('#nota-recorrido')).toContainText('todavía no está disponible');
});

test('al volver a Chelyabinsk se restaura su trayectoria del CNEOS', async ({ page }) => {
  await page.goto('/?pieza=peekskill');
  await listo(page);
  await expect(page.getByRole('button', { name: 'Ver el recorrido' })).toBeEnabled();
  await page.locator('#pieza').selectOption('chelyabinsk');
  await expect(page.locator('#descripcion')).toContainText('trayectoria de entrada');
  await expect(page.getByRole('button', { name: 'Ver el recorrido' })).toBeEnabled();
});

test('todas las piezas con trayectoria habilitan su recorrido', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await listo(page);
  for (const id of indice) {
    await page.locator('#pieza').selectOption(id);
    await expect(page.getByRole('button', { name: 'Ver el recorrido' }), id).toBeEnabled();
    await expect(page.locator('#descripcion'), id).toContainText(
      /altura convencional|observaciones telescópicas/,
    );
  }
});

test('Almahata Sitta: trayectoria desde el estado de JPL con el criterio explicado en pantalla', async ({
  page,
}) => {
  await page.goto('/?pieza=almahata-sitta&vista=sistema-solar');
  await listo(page);
  await expect(page.getByRole('button', { name: 'Ver el recorrido' })).toBeEnabled();
  await expect(page.locator('#descripcion')).toContainText('criterio de Drummond');
  await expect(page.locator('#descripcion')).toContainText('incertidumbre formal de JPL');
  await page.getByRole('button', { name: 'Tierra', exact: true }).click();
  await expect(page.locator('#descripcion')).toContainText('observaciones telescópicas');
  await expect(page.locator('#descripcion')).not.toContainText('altura convencional');
});
