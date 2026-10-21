import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { abrirPestana } from './hoja';

test('ficha exportable: datos con manifiesto, cita e impresión solo de la ficha (M42)', async ({
  page,
  browserName,
}) => {
  // Sin cuadro de impresión real: la prueba revisa lo que se imprimiría
  await page.addInitScript(() => (window.print = () => undefined));
  await page.goto('/');
  await abrirPestana(page, 'info');
  await page.getByRole('button', { name: 'Ficha de Chelyabinsk' }).click();
  const dialogo = page.locator('#dialogo-ficha');
  await expect(dialogo).toContainText('Cómo citar: Del cinturón a la vitrina');

  // Descarga de los datos
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    dialogo.getByRole('button', { name: 'Descargar los datos (JSON)' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^ficha-chelyabinsk-es-[0-9a-f]{7}\.json$/);
  const datos = JSON.parse(readFileSync((await descarga.path())!, 'utf8'));
  expect(datos.manifiesto.licencia).toBe('CC BY 4.0');
  expect(datos.manifiesto.version.commit).toMatch(/^[0-9a-f]{7}$/);
  expect(datos.manifiesto.cneos_consultado).toBeTruthy();
  expect(Object.keys(datos.manifiesto.tipos)).toEqual([
    'medicion',
    'calculo_propio',
    'ilustracion',
    'reportes',
  ]);
  // Cada cifra mostrada lleva su fuente, y todas las fuentes van con su cita
  expect(Object.values(datos.valores).every((v) => (v as { fuente: string }).fuente)).toBe(true);
  expect(datos.fuentes.length).toBeGreaterThan(3);
  expect(datos.meteorito.id).toBe('chelyabinsk');

  // Impresión: solo la ficha, sin la escena ni los paneles, y desde su título
  await dialogo.getByRole('button', { name: 'Imprimir o guardar en PDF' }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#titulo-ficha')).toBeInViewport();
  // La ficha entera entra en el documento impreso (no se corta en la altura de la ventana)
  const corte = await page.evaluate(() => {
    const cita = document.querySelector('#dialogo-ficha .cita')!.getBoundingClientRect();
    return { finCita: cita.bottom + scrollY, alto: document.documentElement.scrollHeight };
  });
  expect(corte.finCita).toBeLessThanOrEqual(corte.alto);
  expect(corte.alto).toBeGreaterThan(page.viewportSize()!.height);
  await expect(page.locator('#escena')).toBeHidden();
  await expect(page.locator('#hoja')).toBeHidden();
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole('button', { name: 'Imprimir o guardar en PDF' })).toBeHidden();
  if (browserName === 'chromium' && !test.info().project.use.isMobile) {
    const pdf = await page.pdf({ format: 'A4' });
    expect(pdf.byteLength).toBeGreaterThan(20_000);
  }
});
