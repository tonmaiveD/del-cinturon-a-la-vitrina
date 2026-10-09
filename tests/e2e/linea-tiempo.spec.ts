import { expect, test } from '@playwright/test';

const dir = 'tests/e2e/.resultados';

test.describe('línea de tiempo y estado en URL', () => {
  test('restaura vista, escala e instante desde la URL', async ({ page }) => {
    await page.goto('/?pieza=chelyabinsk&t=2012-12-01T00:00:00Z&vista=sistema-solar&escala=real');
    await expect(page.getByRole('button', { name: 'Sistema solar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('switch', { name: 'Escala visual' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(page.locator('#fecha-texto')).toContainText('1 de diciembre de 2012');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${dir}/url-${test.info().project.name}.png` });
  });

  test('reproducir avanza el reloj y el teclado navega', async ({ page }) => {
    await page.goto('/?t=2012-06-01T00:00:00Z');
    const fecha = page.locator('#fecha-texto');
    await expect(fecha).toContainText('1 de junio de 2012');
    await page.getByRole('button', { name: 'Reproducir' }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(fecha).not.toContainText('1 de junio de 2012');
    // Los atajos de la escena actúan sin foco en un control (el foco quedó en «Pausar»)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.locator('body').press('i');
    await expect(fecha).toContainText('instante del pico de brillo');
    await page.locator('body').press('ArrowLeft');
    await expect(fecha).toContainText('1 d antes');
    await expect(page).toHaveURL(/t=2013-02-14T03%3A20%3A26Z/);
  });

  test('la tecla I no actúa desde un botón ni con un diálogo abierto (M05)', async ({ page }) => {
    await page.goto('/?t=2012-06-01T00:00:00Z');
    await page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo);
    const fecha = page.locator('#fecha-texto');
    await expect(page.getByRole('button', { name: 'Ir al pico de brillo' })).toBeVisible();
    await page.getByRole('button', { name: 'Reproducir' }).focus();
    await page.keyboard.press('i');
    await expect(fecha).toContainText('1 de junio de 2012');
    await page.getByRole('button', { name: 'Fuentes y créditos' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('i');
    await page.keyboard.press('ArrowRight');
    await expect(fecha).toContainText('1 de junio de 2012');
  });

  test('movimiento reducido: corte directo sin animación', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    // El botón responde cuando la escena 3D terminó de cargar
    await page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo);
    await page.getByRole('button', { name: 'Ver el recorrido' }).click();
    await expect(page.getByRole('button', { name: 'Sistema solar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('#descripcion')).toContainText('Movimiento reducido');
    await expect(page.getByRole('button', { name: 'Saltar animación' })).toBeHidden();
  });
});

test('recorrido cinematográfico completo', async ({ page }) => {
  // El paso por cuadro se limita a 0,1 s (src/scene/escena.ts): sin GPU (p. ej. los runners de
  // GitHub) hay pocos fps y el recorrido de ~21 s dura bastante más en tiempo real
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await page.goto('/');
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Ver el recorrido' }).click();
  const t0 = Date.now();
  await expect(page.getByRole('button', { name: 'Saltar animación' })).toBeVisible();
  const p = test.info().project.name;
  for (const [s, nombre] of [
    [2, 'a-alejar'],
    [6, 'b-sistema'],
    [11.5, 'c-acercar'],
    [16, 'd-llegada'],
  ] as const) {
    await page.waitForTimeout(Math.max(0, t0 + s * 1000 - Date.now()));
    await page.screenshot({ path: `${dir}/recorrido-${nombre}-${p}.png` });
  }
  await expect(page.locator('#descripcion')).toContainText('Pico de brillo del bólido', {
    timeout: 180_000,
  });
  await expect(page.getByRole('button', { name: 'Tierra', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('#fecha-texto')).toContainText('instante del pico de brillo');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/recorrido-e-final-${p}.png` });
  expect(errores).toEqual([]);
});
