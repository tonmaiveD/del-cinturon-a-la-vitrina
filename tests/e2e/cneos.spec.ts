import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface EventoPublicado {
  fecha: string;
  lat?: number;
  impacto_kt: number;
  calidad: string;
  orbita?: object;
}
const publicados = (
  JSON.parse(readFileSync('public/data/cneos/eventos.json', 'utf8')) as {
    eventos: EventoPublicado[];
  }
).eventos;
/** Eventos con ubicación en los datos publicados (cambia con cada actualización diaria). */
const conUbicacion = publicados.filter((e) => e.lat !== undefined).length;
const fallidas = publicados.filter(
  (e) => e.calidad === 'orbita' && (!e.orbita || 'error' in e.orbita),
).length;
const calculadas = publicados.filter((e) => e.calidad === 'orbita').length - fallidas;

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

test('modo CNEOS: filtros sin resultados dan un estado vacío inequívoco (M06)', async ({
  page,
}) => {
  // Combinación vacía calculada desde los datos publicados (el año más reciente y ≥ 10 kt, o
  // si no, la primera vacía): la prueba no depende de qué bólidos lleguen cada día
  const situables = publicados.filter((e) => e.lat !== undefined);
  const anios = [...new Set(situables.map((e) => Number(e.fecha.slice(0, 4))))].sort();
  const vacia = anios
    .reverse()
    .flatMap((a) => [10, 1, 0.1].map((kt) => ({ a, kt })))
    .find(({ a, kt }) =>
      situables.every((e) => Number(e.fecha.slice(0, 4)) < a || e.impacto_kt < kt),
    )!;
  await page.goto('/?modo=cneos');
  await listo(page);
  await page.locator('#seccion-cneos').getByText('Filtros', { exact: true }).click();
  const restablecer = page.getByRole('button', { name: 'Restablecer filtros' });
  await expect(restablecer).toBeHidden();
  await page.locator('#cneos-desde').selectOption(String(vacia.a));
  await page.locator('#cneos-energia').selectOption(String(vacia.kt));
  await expect(page.locator('#cneos-cuenta')).toContainText('Ningún bólido cumple estos filtros');
  await expect(page.locator('#cneos-recientes button')).toHaveCount(0);
  // La selección anterior sigue, pero marcada como fuera del filtro
  await expect(page.locator('#cneos-evento .fuera-filtro')).toContainText('no cumple los filtros');
  await expect(page.locator('#cneos-cuenta')).toContainText('no cumple estos filtros');
  await restablecer.click();
  await expect(page.locator('#cneos-cuenta')).toContainText(`${conUbicacion} bólidos`);
  await expect(page.locator('#cneos-evento .fuera-filtro')).toHaveCount(0);
  await expect(restablecer).toBeHidden();
});

test('modo CNEOS: la leyenda separa órbitas calculadas y cálculos fallidos (M25)', async ({
  page,
}) => {
  await page.goto('/?modo=cneos');
  await listo(page);
  const leyenda = page.locator('#cneos-leyenda');
  await expect(leyenda.locator('[data-grupo="con-orbita"]')).toContainText(`(${calculadas})`);
  await expect(leyenda.locator('[data-grupo="orbita-fallida"]')).toContainText(`(${fallidas})`);
});
