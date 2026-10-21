import { expect, test, type Page } from '@playwright/test';
import { abrirPestana } from './hoja';

/** Ángulo (grados) entre la luz del globo y la dirección hacia la cámara, y entre luz y Sol real. */
interface V3 {
  x: number;
  y: number;
  z: number;
}
const angulos = (page: Page) =>
  page.evaluate(() => {
    const app = (
      window as unknown as {
        __app: {
          tierra: { luces: () => { presentacion: boolean; luz: V3; sol: V3 } };
          camT: { camara: { position: V3 } };
        };
      }
    ).__app;
    const { presentacion, luz, sol } = app.tierra.luces();
    const p = app.camT.camara.position;
    const n = Math.hypot(p.x, p.y, p.z);
    const cam = { x: p.x / n, y: p.y / n, z: p.z / n };
    const g = (a: V3, b: V3) =>
      (Math.acos(Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)) * 180) / Math.PI;
    return { presentacion, conCamara: g(luz, cam), conSol: g(luz, sol) };
  });

test('globo siempre de día por defecto, rotulado, y luz real con el interruptor (M35)', async ({
  page,
}) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));

  await page.goto('/?pieza=novato');
  await expect(page.locator('#descripcion')).toContainText('siempre de día');
  // El marcador del final no se atribuye al CNEOS en una pieza sin dato del CNEOS
  await expect(page.locator('#etiquetas')).toContainText('Final de la aproximación calculada');
  await expect(page.locator('#etiquetas')).not.toContainText('Pico de brillo (CNEOS)');
  await abrirPestana(page, 'escena');
  const luz = page.getByRole('switch', { name: 'Siempre de día' });
  await expect(luz).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#aviso-iluminacion')).toContainText('no sale de la posición real');
  await page.waitForTimeout(600);
  // La luz llega desde el lado de la cámara: la cara visible está iluminada
  const pres = await angulos(page);
  expect(pres.presentacion).toBe(true);
  expect(pres.conCamara).toBeLessThan(40);
  await page.screenshot({
    path: `tests/e2e/.resultados/luz-presentacion-${test.info().project.name}.png`,
  });

  await luz.click();
  await expect(luz).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#aviso-iluminacion')).toContainText('Luz real');
  await expect(page.locator('#descripcion')).toContainText('iluminado por el Sol de ese instante');
  await expect(page).toHaveURL(/luz=real/);
  await page.waitForTimeout(600);
  const real = await angulos(page);
  expect(real.presentacion).toBe(false);
  expect(real.conSol).toBeLessThan(0.01);
  await page.screenshot({ path: `tests/e2e/.resultados/luz-real-${test.info().project.name}.png` });

  // La URL conserva la elección; en la vista solar el aviso no aparece (ilumina el Sol real)
  await page.reload();
  await abrirPestana(page, 'escena');
  await expect(page.getByRole('switch', { name: 'Siempre de día' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.getByRole('button', { name: 'Sistema solar' }).click();
  await expect(page.locator('#aviso-iluminacion')).toBeHidden();
  expect(errores).toEqual([]);
});
