import { expect, test } from '@playwright/test';
import { abrirPestana } from './hoja';

test('fuentes y créditos: versión publicada y reporte por GitHub Issues (M16)', async ({
  page,
}) => {
  await page.goto('/?pieza=novato');
  await abrirPestana(page, 'info');
  await page.getByRole('button', { name: 'Fuentes y créditos' }).click();
  const dialogo = page.locator('#dialogo-fuentes');
  await expect(dialogo).toContainText(/Versión publicada: [0-9a-f]{7}/);
  const enlace = dialogo.getByRole('link', { name: 'Informar de un error en GitHub' });
  const href = new URL((await enlace.getAttribute('href'))!);
  expect(href.origin + href.pathname).toBe(
    'https://github.com/tonmaiveD/del-cinturon-a-la-vitrina/issues/new',
  );
  const cuerpo = href.searchParams.get('body')!;
  expect(cuerpo).toMatch(/Versión: [0-9a-f]{7}/);
  expect(cuerpo).toContain('pieza=novato');
  expect(cuerpo).toContain('Idioma: es');
  // Solo versión, vista e idioma: nada del navegador ni del dispositivo
  expect(cuerpo).not.toMatch(/Mozilla|Chrome|Safari/);
});

test('modo CNEOS: distingue la última consulta del último cambio (M17)', async ({ page }) => {
  await page.goto('/?modo=cneos');
  await expect(page.locator('#cneos-actualizacion')).toContainText('última consulta');
  await expect(page.locator('#cneos-actualizacion')).toContainText('último cambio en los datos');
  await expect(page.locator('#cneos-actualizacion')).not.toContainText(/en vivo/i);
});
