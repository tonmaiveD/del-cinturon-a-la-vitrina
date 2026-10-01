/**
 * CLI: `npm run cierre:video` (requiere `npm run build` antes).
 * Graba el recorrido cinematográfico y capturas clave en docs/cierres/ con Playwright.
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PUERTO = 4180;
const DESTINO = 'docs/cierres';
const TEMPORAL = '.trabajo/video';

const servidor = spawn('npx', ['tsx', 'pipeline/servidor-estatico.ts', String(PUERTO)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 1500));
try {
  rmSync(TEMPORAL, { recursive: true, force: true });
  mkdirSync(DESTINO, { recursive: true });
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: TEMPORAL, size: { width: 1280, height: 720 } },
  });
  const page = await contexto.newPage();
  await page.goto(`http://localhost:${PUERTO}/`);
  await page.waitForFunction(
    () => (window as unknown as { __listo?: number }).__listo !== undefined,
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(DESTINO, 'fase-1-tierra.png') });
  await page.getByRole('button', { name: 'Ver el recorrido' }).click();
  const capturas: [number, string][] = [
    [6, 'fase-1-sistema-solar.png'],
    [11.5, 'fase-1-acercamiento.png'],
    [16.5, 'fase-1-llegada.png'],
  ];
  const t0 = Date.now();
  for (const [s, nombre] of capturas) {
    await page.waitForTimeout(Math.max(0, t0 + s * 1000 - Date.now()));
    await page.screenshot({ path: join(DESTINO, nombre) });
  }
  await page
    .locator('#descripcion')
    .filter({ hasText: 'Pico de brillo del bólido' })
    .waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(DESTINO, 'fase-1-final.png') });
  await contexto.close();
  await navegador.close();
  const [video] = readdirSync(TEMPORAL).filter((f) => f.endsWith('.webm'));
  renameSync(join(TEMPORAL, video!), join(DESTINO, 'fase-1-recorrido.webm'));
  console.log(`Video y capturas en ${DESTINO}/`);
} finally {
  servidor.kill();
}
