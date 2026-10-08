/**
 * CLI: `npm run cierre:fase-3` (requiere `npm run build` antes).
 * Video y capturas del modo «Bólidos del CNEOS» en docs/cierres/ con Playwright.
 */
import { chromium, devices, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PUERTO = 4182;
const DESTINO = 'docs/cierres';
const TEMPORAL = '.trabajo/video-fase-3';
const URL = `http://localhost:${PUERTO}/`;

const listo = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __listo?: number }).__listo !== undefined);
const captura = (page: Page, nombre: string) =>
  page.screenshot({ path: join(DESTINO, `fase-3-${nombre}.png`) });
const nubeLista = (page: Page) =>
  page.waitForFunction(
    () =>
      (window as unknown as { __app: { cneos: () => { nClones: number } } }).__app.cneos().nClones >
      0,
  );

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
  await page.goto(URL);
  await listo(page);
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Bólidos del CNEOS' }).click();
  await page.locator('#cneos-evento').getByText('Bólido del').waitFor();
  await page.waitForTimeout(2000);
  await captura(page, 'globo-recientes');
  // Chelyabinsk en el registro del CNEOS: trayectoria de entrada y nube de órbitas
  await page.goto(`${URL}?modo=cneos&evento=cneos-20130215-032026`);
  await listo(page);
  await page.waitForTimeout(2000);
  await captura(page, 'globo-chelyabinsk');
  await page.getByRole('button', { name: 'Sistema solar' }).click();
  await nubeLista(page);
  await page.waitForTimeout(2000);
  await captura(page, 'nube-chelyabinsk');
  // Un evento antiguo de baja energía: sin órbita, con explicación
  await page.goto(`${URL}?modo=cneos&evento=cneos-20081121-002644`);
  await listo(page);
  await page.waitForTimeout(2000);
  await captura(page, 'no-verificable');
  // Filtro por energía
  await page.locator('#seccion-cneos').getByText('Filtros', { exact: true }).click();
  await page.locator('#cneos-energia').selectOption('1');
  await page.waitForTimeout(2000);
  await captura(page, 'filtro-energia');
  await contexto.close();

  // Móvil
  const movil = await navegador.newContext({ ...devices['Pixel 7'] });
  const pm = await movil.newPage();
  await pm.goto(`${URL}?modo=cneos`);
  await listo(pm);
  await pm.locator('#cneos-evento').getByText('Bólido del').waitFor();
  await pm.waitForTimeout(1500);
  await captura(pm, 'movil');
  await movil.close();
  await navegador.close();

  const [video] = readdirSync(TEMPORAL).filter((f) => f.endsWith('.webm'));
  renameSync(join(TEMPORAL, video!), join(DESTINO, 'fase-3-cneos.webm'));
  console.log(`Video y capturas en ${DESTINO}/`);
} finally {
  servidor.kill();
}
