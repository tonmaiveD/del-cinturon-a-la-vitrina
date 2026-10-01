/**
 * Carga inicial en "4G lento" (perfil de Lighthouse: 1,6 Mbps, 150 ms RTT, CPU ×4).
 * Mide: primer pintado con contenido (texto) y "listo" (primera textura + cuadro 3D).
 */
import { expect, test } from '@playwright/test';

test('carga inicial en 4G lento', async ({ page, browserName }, info) => {
  test.skip(browserName !== 'chromium', 'la emulación de red usa CDP');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForFunction(
    () => (window as unknown as { __listo?: number }).__listo !== undefined,
    null,
    {
      timeout: 30_000,
    },
  );
  const m = await page.evaluate(() => ({
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? NaN,
    listo: (window as unknown as { __listo: number }).__listo,
    bytes: performance
      .getEntriesByType('resource')
      .reduce((s, e) => s + ((e as PerformanceResourceTiming).transferSize || 0), 0),
  }));
  const recursos = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map(
        (e) =>
          `${e.name.split('/').pop()} ${e.startTime.toFixed(0)}→${(e as PerformanceResourceTiming).responseEnd.toFixed(0)}`,
      ),
  );
  info.annotations.push({ type: 'recursos', description: recursos.join('; ') });
  info.annotations.push({ type: 'métricas', description: JSON.stringify(m) });
  console.log(
    `[${info.project.name}] FCP ${m.fcp.toFixed(0)} ms · listo ${m.listo.toFixed(0)} ms · ${(m.bytes / 1024).toFixed(0)} kB`,
  );
  expect(m.fcp).toBeLessThan(3000);
  expect(m.listo).toBeLessThan(3000);
});
