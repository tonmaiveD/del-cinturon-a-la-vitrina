import { expect, test, type Page } from '@playwright/test';

const listo = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo !== undefined);

/** Coordenadas de pantalla del marcador de una pieza en la vista Tierra. */
async function pantallaDeMarcador(page: Page, id: string) {
  return page.evaluate((pid) => {
    interface V {
      x: number;
      y: number;
      project(c: unknown): V;
    }
    const app = (
      window as unknown as {
        __app: {
          marcadores: { posicionMundo(id: string): V };
          camT: { camara: unknown };
        };
      }
    ).__app;
    const p = app.marcadores.posicionMundo(pid).project(app.camT.camara);
    const r = document.querySelector('#escena')!.getBoundingClientRect();
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  }, id);
}

test('selección de pieza: lista, procedencia en dos capas, URL y vista solar', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));

  await page.goto('/');
  await listo(page);
  await expect(page.locator('#pieza option')).toHaveCount(25);
  await expect(page.locator('#procedencia')).toContainText('Según Popova et al. 2013');
  await expect(page.locator('#procedencia')).toContainText('Según Granvik y Brown 2018');
  await expect(page.locator('#procedencia')).toContainText('Confianza media');

  await page.locator('#pieza').selectOption('zdar-nad-sazavou');
  await expect(page.locator('#procedencia')).toContainText('Especulativa');
  await expect(page.locator('#procedencia')).toContainText('No es el punto de caída');
  await expect(page.locator('#descripcion')).toContainText('no es el punto de caída');
  await expect(page.locator('#recorrido')).toBeDisabled();
  await expect(page.locator('#nota-recorrido')).toBeVisible();
  await expect(page.locator('#abrir-ficha')).toBeHidden();
  await expect(page).toHaveURL(/pieza=zdar-nad-sazavou/);
  await expect(page.locator('#fecha-texto')).toContainText('2014');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `tests/e2e/.resultados/catalogo-tierra-${test.info().project.name}.png`,
  });

  await page.getByRole('button', { name: 'Sistema solar' }).click();
  await expect(page.locator('#descripcion')).toContainText('órbitas posibles de Žďár');
  await expect(page.locator('#descripcion')).toContainText('Hungaria');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `tests/e2e/.resultados/catalogo-solar-${test.info().project.name}.png`,
  });
  expect(errores).toEqual([]);
});

test('filtros por clase y por confianza', async ({ page }) => {
  await page.goto('/?pieza=chelyabinsk');
  await listo(page);
  await page.locator('#seccion-pedigri').getByText('Filtros', { exact: true }).click();
  await page.locator('#filtro-confianza').selectOption('ninguna');
  await expect(page.locator('#pieza-cuenta')).toContainText('4 de 25');
  // La pieza seleccionada sigue en la lista aunque quede fuera del filtro
  await expect(page.locator('#pieza option')).toHaveCount(5);
  await page.locator('#filtro-confianza').selectOption('');
  await page.locator('#filtro-grupo').selectOption('H');
  await expect(page.locator('#pieza-cuenta')).toContainText('11 de 25');
});

test('clic en un marcador del globo selecciona la pieza', async ({ page }, info) => {
  test.skip(info.project.name === 'movil', 'en móvil se usa la lista');
  await page.goto('/?pieza=moravka');
  await listo(page);
  // Morávka y Příbram están cerca: se hace clic en el marcador de Příbram
  const { x, y } = await pantallaDeMarcador(page, 'pribram');
  await page.mouse.click(x, y);
  await expect(page.locator('#pieza')).toHaveValue('pribram');
  await expect(page).toHaveURL(/pieza=pribram/);
});

test('sin fecha en la URL, la pieza arranca en su instante de impacto', async ({ page }) => {
  await page.goto('/?pieza=zdar-nad-sazavou');
  await listo(page);
  await expect(page.locator('#fecha-texto')).toContainText('instante de referencia del bólido');
});

test('pieza desconocida en la URL → Chelyabinsk', async ({ page }) => {
  await page.goto('/?pieza=no-existe');
  await listo(page);
  await expect(page.locator('#pieza')).toHaveValue('chelyabinsk');
  await expect(page.locator('#descripcion')).toContainText('trayectoria de entrada');
});
