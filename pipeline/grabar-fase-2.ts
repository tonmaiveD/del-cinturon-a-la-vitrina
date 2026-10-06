/**
 * CLI: `npm run cierre:fase-2` (requiere `npm run build` antes).
 * Video y capturas del catálogo de 25 caídas en docs/cierres/ con Playwright.
 */
import { chromium, devices, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PUERTO = 4181;
const DESTINO = 'docs/cierres';
const TEMPORAL = '.trabajo/video-fase-2';
const URL = `http://localhost:${PUERTO}/`;

const listo = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo !== undefined);
const captura = (page: Page, nombre: string) =>
  page.screenshot({ path: join(DESTINO, `fase-2-${nombre}.png`) });

const servidor = spawn('npx', ['tsx', 'pipeline/servidor-estatico.ts', String(PUERTO)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 1500));
try {
  rmSync(TEMPORAL, { recursive: true, force: true });
  mkdirSync(DESTINO, { recursive: true });
  const navegador = await chromium.launch();

  // Escritorio, con video
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: TEMPORAL, size: { width: 1280, height: 720 } },
  });
  const page = await contexto.newPage();
  await page.goto(`${URL}?pieza=chelyabinsk`);
  await listo(page);
  await page.waitForTimeout(2000);
  await captura(page, 'globo-chelyabinsk');
  for (const id of ['zdar-nad-sazavou', 'tagish-lake', 'almahata-sitta']) {
    await page.locator('#pieza').selectOption(id);
    await page.waitForTimeout(2200);
  }
  await captura(page, 'globo-almahata-sitta');
  await page.locator('#pieza').selectOption('park-forest');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Sistema solar' }).click();
  await page.waitForTimeout(2500);
  await captura(page, 'sistema-solar-park-forest');
  await page.getByText('Filtros', { exact: true }).click();
  await page.locator('#filtro-grupo').selectOption('L');
  await page.waitForTimeout(2500);
  await captura(page, 'filtro-condritas-l');
  await page.locator('#filtro-grupo').selectOption('');
  await page.locator('#pieza').selectOption('chelyabinsk');
  await page.waitForTimeout(2500);
  await captura(page, 'sistema-solar-chelyabinsk');
  await contexto.close();

  // Móvil
  const movil = await navegador.newContext({ ...devices['Pixel 7'] });
  const pm = await movil.newPage();
  await pm.goto(`${URL}?pieza=maribo`);
  await listo(pm);
  await pm.waitForTimeout(1500);
  await pm.getByText('Procedencia', { exact: true }).click();
  await pm.waitForTimeout(500);
  await captura(pm, 'movil-procedencia');
  await movil.close();
  await navegador.close();

  const [video] = readdirSync(TEMPORAL).filter((f) => f.endsWith('.webm'));
  renameSync(join(TEMPORAL, video!), join(DESTINO, 'fase-2-catalogo.webm'));
  console.log(`Video y capturas en ${DESTINO}/`);
} finally {
  servidor.kill();
}
