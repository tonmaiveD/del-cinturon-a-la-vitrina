import { expect, test, type Page, type Route } from '@playwright/test';

const listo = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo !== undefined);
const aviso = (page: Page) => page.locator('#aviso-error');

/** Falla las primeras `n` peticiones que coinciden y deja pasar las siguientes. */
function fallarPrimeras(n: number, fallo: (r: Route) => Promise<void>) {
  let k = 0;
  return (r: Route) => (k++ < n ? fallo(r) : r.continue());
}
const error500 = (r: Route) => r.fulfill({ status: 500, body: 'error' });

test.describe('fallos recuperables (M07)', () => {
  test('el CNEOS no carga: aviso visible y el reintento lo recupera', async ({ page }) => {
    await page.route('**/data/cneos/eventos.json', fallarPrimeras(1, error500));
    await page.goto('/');
    await listo(page);
    await page.getByRole('button', { name: 'Bólidos del CNEOS' }).click();
    await expect(aviso(page)).toContainText('No se pudieron cargar los bólidos del CNEOS');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('#cneos-evento')).toContainText('Bólido del');
    await expect(aviso(page)).toBeHidden();
  });

  test('el CNEOS no carga: el modo de pedigrí sigue funcionando', async ({ page }) => {
    await page.route('**/data/cneos/eventos.json', error500);
    await page.goto('/');
    await listo(page);
    await page.getByRole('button', { name: 'Bólidos del CNEOS' }).click();
    await expect(aviso(page)).toContainText('No se pudieron cargar los bólidos del CNEOS');
    await page.getByRole('button', { name: 'Meteoritos con pedigrí' }).click();
    await page.getByLabel('Pieza').selectOption('pribram');
    await expect(page).toHaveURL(/pieza=pribram/);
    await expect(page.getByRole('button', { name: 'Ver el recorrido' })).toBeEnabled();
  });

  test('JSON inválido en la nube de un bólido: aviso y reintento', async ({ page }) => {
    await page.route(
      '**/data/cneos/orbitas/cneos-20130215-032026.json',
      fallarPrimeras(1, (r) =>
        r.fulfill({ status: 200, body: '{roto', contentType: 'application/json' }),
      ),
    );
    await page.goto('/?modo=cneos&evento=cneos-20130215-032026&vista=sistema-solar');
    await listo(page);
    await expect(aviso(page)).toContainText('nube de órbitas');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(aviso(page)).toBeHidden();
    await expect(page.locator('#descripcion')).toContainText('órbitas posibles del bólido');
  });

  test('red interrumpida en el recorrido de una pieza: aviso y reintento', async ({ page }) => {
    await page.route(
      '**/data/trayectorias/pribram.json',
      fallarPrimeras(1, (r) => r.abort()),
    );
    await page.goto('/?pieza=pribram');
    await listo(page);
    await expect(aviso(page)).toContainText('recorrido animado de esta pieza');
    await expect(page.getByRole('button', { name: 'Ver el recorrido' })).toBeDisabled();
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('button', { name: 'Ver el recorrido' })).toBeEnabled();
    await expect(aviso(page)).toBeHidden();
  });

  test('sin la imagen de la Tierra la escena se usa igual y se puede reintentar', async ({
    page,
  }) => {
    await page.route('**/texturas/tierra-1024.webp', fallarPrimeras(2, error500));
    await page.goto('/');
    await listo(page); // la escena queda lista aunque falte la imagen
    await expect(aviso(page)).toContainText('imagen de la Tierra');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(aviso(page)).toBeHidden();
  });

  test('pérdida del contexto WebGL: aviso mientras dura y recuperación', async ({ page }) => {
    await page.goto('/');
    await listo(page);
    await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('#escena')!;
      const gl = (c.getContext('webgl2') ?? c.getContext('webgl'))!;
      const ext = gl.getExtension('WEBGL_lose_context')!;
      (window as unknown as { __ext: WEBGL_lose_context }).__ext = ext;
      ext.loseContext();
    });
    await expect(aviso(page)).toContainText('liberó la tarjeta gráfica');
    await page.evaluate(() =>
      (window as unknown as { __ext: WEBGL_lose_context }).__ext.restoreContext(),
    );
    await expect(aviso(page)).toBeHidden();
  });

  test('sin WebGL: explicación visible y paneles operativos', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        tipo: string,
        ...resto: unknown[]
      ) {
        if (tipo.startsWith('webgl')) return null;
        return (original as (...a: unknown[]) => unknown).call(this, tipo, ...resto);
      } as typeof original;
    });
    await page.goto('/');
    await expect(aviso(page)).toContainText('WebGL no disponible');
    await page.getByLabel('Pieza').selectOption('pribram');
    await expect(page.locator('#procedencia')).toContainText('Příbram');
  });
});
