import { expect, test } from '@playwright/test';

test('cada recurso precargado se descarga una sola vez y se usa (M15)', async ({ page }) => {
  const pedidas: string[] = [];
  const avisos: string[] = [];
  page.on('request', (r) => pedidas.push(new URL(r.url()).pathname));
  page.on('console', (m) => /preload/i.test(m.text()) && avisos.push(m.text()));
  await page.goto('/');
  await page.waitForFunction(() => performance.getEntriesByName('escena').length > 0);
  await page.waitForTimeout(3500); // el navegador avisa si una precarga no se usa en unos segundos
  for (const f of [
    'catalogo.json',
    'chelyabinsk-orbitas.json',
    'chelyabinsk-trayectoria.json',
    'tierra-1024.webp',
  ])
    expect(
      pedidas.filter((p) => p.endsWith(`/${f}`)),
      f,
    ).toHaveLength(1);
  expect(avisos).toEqual([]);
});
