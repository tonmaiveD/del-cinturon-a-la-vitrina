import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/** Eventos con ubicación en los datos publicados (cambia con cada actualización diaria). */
const conUbicacion = (
  JSON.parse(readFileSync('public/data/cneos/eventos.json', 'utf8')) as {
    eventos: { lat?: number }[];
  }
).eventos.filter((e) => e.lat !== undefined).length;

const listo = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo !== undefined);
const estadoCneos = (page: Page) =>
  page.evaluate(() => {
    const app = (window as unknown as { __app: { cneos: () => { modo: string; nClones: number } } })
      .__app;
    const c = app.cneos();
    return { modo: c.modo, nClones: c.nClones };
  });

test('modo CNEOS: carga diferida, actualización visible, selección, URL y nube', async ({
  page,
}) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  const pedidos: string[] = [];
  page.on('request', (r) => pedidos.push(r.url()));

  await page.goto('/');
  await listo(page);
  // La carga inicial no descarga los datos del CNEOS
  expect(pedidos.some((u) => u.includes('data/cneos/'))).toBe(false);

  await page.getByRole('button', { name: 'Bólidos del CNEOS' }).click();
  await expect(page.locator('#cneos-actualizacion')).toContainText('No son en tiempo real');
  await expect(page.locator('#cneos-actualizacion')).not.toContainText(/en vivo/i);
  // En móvil la lista empieza plegada, como los demás bloques del panel
  const lista = page.locator('#seccion-cneos details:has(#cneos-recientes)');
  if ((await lista.getAttribute('open')) === null) await lista.locator('summary').click();
  await expect(page.locator('#cneos-recientes button').first()).toBeVisible();
  await expect(page).toHaveURL(/modo=cneos&evento=cneos-/);
  await expect(page.locator('#descripcion')).toContainText('registrado por el CNEOS');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `tests/e2e/.resultados/cneos-tierra-${test.info().project.name}.png`,
  });

  // Un evento con órbita: la vista solar dibuja su nube
  await page.goto('/?modo=cneos&evento=cneos-20130215-032026&vista=sistema-solar');
  await listo(page);
  await expect(page.locator('#cneos-evento')).toContainText('Es el propio bólido de Chelyabinsk');
  await expect(page.locator('#cneos-evento')).toContainText('Semieje mayor');
  await expect.poll(async () => (await estadoCneos(page)).nClones).toBeGreaterThan(100);
  await expect(page.locator('#descripcion')).toContainText('órbitas posibles del bólido');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `tests/e2e/.resultados/cneos-solar-${test.info().project.name}.png`,
  });
  expect(errores).toEqual([]);
});

test('modo CNEOS: un evento antiguo de baja energía no tiene órbita y lo explica', async ({
  page,
}) => {
  // Buzzard Coulee (2008, 0,41 kt): grupo de alto D_D
  await page.goto('/?modo=cneos&evento=cneos-20081121-002644');
  await listo(page);
  await expect(page.locator('#cneos-evento')).toContainText('no se puede verificar de antemano');
  await expect(page.locator('#cneos-evento')).toContainText('Peña-Asensio');
});

test('modo CNEOS: filtros y vuelta al modo pedigrí', async ({ page }) => {
  await page.goto('/?modo=cneos');
  await listo(page);
  await expect(page.locator('#cneos-cuenta')).toContainText(`de ${conUbicacion}`);
  await page.locator('#seccion-cneos').getByText('Filtros', { exact: true }).click();
  await page.locator('#cneos-energia').selectOption('10');
  await expect(page.locator('#cneos-cuenta')).not.toContainText(new RegExp(`^${conUbicacion} `));
  await page.getByRole('button', { name: 'Meteoritos con pedigrí' }).click();
  await expect(page.locator('#seccion-pedigri')).toBeVisible();
  await expect(page).toHaveURL(/pieza=/);
  await expect(page).not.toHaveURL(/modo=cneos/);
});
