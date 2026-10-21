/**
 * Rendimiento de laboratorio (M22) en «4G lento» (perfil de Lighthouse: 1,6 Mbps, 150 ms de RTT
 * y CPU ×4). Cada medición se repite (REPETICIONES, por defecto 3) en una sesión nueva y se usa
 * la mediana. Son métricas de laboratorio en un navegador de escritorio emulado: no son datos de
 * campo ni equivalen a aprobar Core Web Vitals. Los tamaños se controlan aparte, en el build
 * (pipeline/presupuestos.ts), porque no dependen del hardware.
 *
 * Hitos de la app (src/ui/metricas.ts): texto, catálogo, escena; en el modo CNEOS, panel y nube.
 * Resultados en tests/e2e/.resultados/rendimiento-<proyecto>.json.
 */
import { writeFileSync } from 'node:fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { abrirPestana } from './hoja';

const REPETICIONES = Number(process.env.REPETICIONES ?? 3);
// Varias cargas completas por prueba en red y CPU lentas
test.describe.configure({ timeout: 180_000 });

interface Corrida {
  fcp: number;
  texto: number;
  catalogo: number;
  escena: number;
  lcp: number;
  cls: number;
  tareasLargas: number;
  msTareasLargas: number;
  kb: number;
}
const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b);
  return o.length % 2 ? o[(o.length - 1) / 2]! : (o[o.length / 2 - 1]! + o[o.length / 2]!) / 2;
};
const resultados: Record<string, unknown> = {};
const guardar = (proyecto: string, clave: string, valor: unknown) => {
  resultados[clave] = valor;
  writeFileSync(
    `tests/e2e/.resultados/rendimiento-${proyecto}.json`,
    JSON.stringify(resultados, null, 2),
  );
};

async function lento(ctx: BrowserContext, page: Page) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  return cdp;
}

/** Observadores de LCP, saltos de diseño y tareas largas desde antes de la carga. */
const OBSERVADORES = () => {
  const m = { lcp: 0, cls: 0, tareasLargas: 0, msTareasLargas: 0 };
  (window as unknown as { __metricas: typeof m }).__metricas = m;
  const obs = (tipo: string, f: (e: PerformanceEntry) => void) => {
    try {
      new PerformanceObserver((l) => l.getEntries().forEach(f)).observe({
        type: tipo,
        buffered: true,
      });
    } catch {
      // tipo no admitido por este navegador
    }
  };
  obs('largest-contentful-paint', (e) => (m.lcp = e.startTime));
  obs('layout-shift', (e) => {
    const s = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (!s.hadRecentInput) m.cls += s.value;
  });
  obs('longtask', (e) => {
    m.tareasLargas++;
    m.msTareasLargas += e.duration;
  });
};

test('carga inicial en 4G lento', async ({ browser, browserName }, info) => {
  test.skip(browserName !== 'chromium', 'la emulación de red usa CDP');
  const corridas: Corrida[] = [];
  for (let k = 0; k < REPETICIONES; k++) {
    const ctx = await browser.newContext(info.project.use);
    const page = await ctx.newPage();
    await page.addInitScript(OBSERVADORES);
    const cdp = await lento(ctx, page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForFunction(() => performance.getEntriesByName('escena').length > 0, null, {
      timeout: 30_000,
    });
    await page.waitForTimeout(300); // el LCP y los saltos tardíos se registran
    corridas.push(
      await page.evaluate((): Corrida => {
        const hito = (n: string) => performance.getEntriesByName(n)[0]?.startTime ?? NaN;
        const m = (window as unknown as { __metricas: Record<string, number> }).__metricas;
        return {
          fcp: hito('first-contentful-paint'),
          texto: hito('texto'),
          catalogo: hito('catalogo'),
          escena: hito('escena'),
          lcp: m.lcp!,
          cls: m.cls!,
          tareasLargas: m.tareasLargas!,
          msTareasLargas: m.msTareasLargas!,
          kb:
            performance
              .getEntriesByType('resource')
              .reduce((s, e) => s + ((e as PerformanceResourceTiming).transferSize || 0), 0) / 1024,
        };
      }),
    );
    await ctx.close();
  }
  const claves = Object.keys(corridas[0]!) as (keyof Corrida)[];
  const med = Object.fromEntries(claves.map((c) => [c, mediana(corridas.map((r) => r[c]))]));
  guardar(info.project.name, 'carga inicial (mediana)', { ...med, corridas });
  console.log(
    `[${info.project.name}] mediana de ${REPETICIONES}: FCP ${med.fcp!.toFixed(0)} · texto ${med.texto!.toFixed(0)} · catálogo ${med.catalogo!.toFixed(0)} · escena ${med.escena!.toFixed(0)} · LCP ${med.lcp!.toFixed(0)} ms · CLS ${med.cls!.toFixed(3)} · tareas largas ${med.tareasLargas} (${med.msTareasLargas!.toFixed(0)} ms) · ${med.kb!.toFixed(0)} kB`,
  );
  info.annotations.push({ type: 'carga inicial', description: JSON.stringify(med) });
  expect(med.fcp).toBeLessThan(3000);
  expect(med.escena).toBeLessThan(3000);
  // Los paneles y la cabecera no deben saltar mientras carga la escena
  expect(Math.max(...corridas.map((r) => r.cls))).toBeLessThan(0.1);
});

test('fps con las 25 nubes de órbitas (vista solar, nivel de detalle cercano)', async ({
  page,
}, info) => {
  await page.goto('/?pieza=zdar-nad-sazavou&vista=sistema-solar');
  await page.waitForFunction(() => performance.getEntriesByName('nubes').length > 0);
  await expect(page.locator('#descripcion')).toContainText('160 órbitas posibles');
  await page.waitForTimeout(4000); // el promedio móvil de fps se estabiliza
  const fps = await page.evaluate(() =>
    (window as unknown as { __app: { motor: { fps(): number } } }).__app.motor.fps(),
  );
  guardar(info.project.name, 'fps vista solar', fps);
  info.annotations.push({ type: 'fps', description: fps.toFixed(1) });
  console.log(`[${info.project.name}] fps vista solar con catálogo: ${fps.toFixed(1)}`);
  // Navegador sin GPU (renderizado por software): solo se registra; el objetivo de 30 fps en
  // móvil se mide en dispositivo real
  expect(fps).toBeGreaterThan(0);
});

test('cambio al modo CNEOS en 4G lento (panel y nube completa)', async ({
  browser,
  browserName,
}, info) => {
  test.skip(browserName !== 'chromium', 'la emulación de red usa CDP');
  const corridas: { panel: number; nube: number }[] = [];
  for (let k = 0; k < REPETICIONES; k++) {
    const ctx = await browser.newContext(info.project.use);
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForFunction(() => performance.getEntriesByName('escena').length > 0);
    const cdp = await lento(ctx, page);
    // En móvil el selector de modo está en la pestaña Explorar de la hoja: se abre antes de medir
    await abrirPestana(page, 'explorar');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t0 = await page.evaluate(() => performance.now());
    await page.getByRole('button', { name: 'Bólidos del CNEOS' }).click();
    await page.waitForFunction(() => performance.getEntriesByName('cneos-panel').length > 0, null, {
      timeout: 30_000,
    });
    // La nube solo existe si el evento seleccionado tiene órbita (si no, no hay marca)
    await page
      .waitForFunction(() => performance.getEntriesByName('cneos-nube').length > 0, null, {
        timeout: 15_000,
      })
      .catch(() => undefined);
    corridas.push(
      await page.evaluate(
        (t) => ({
          panel: (performance.getEntriesByName('cneos-panel')[0]?.startTime ?? NaN) - t,
          nube: (performance.getEntriesByName('cneos-nube')[0]?.startTime ?? NaN) - t,
        }),
        t0,
      ),
    );
    await ctx.close();
  }
  const panel = mediana(corridas.map((c) => c.panel));
  const nubes = corridas.map((c) => c.nube).filter(Number.isFinite);
  const nube = nubes.length ? mediana(nubes) : NaN;
  guardar(info.project.name, 'modo CNEOS (mediana)', { panel, nube, corridas });
  info.annotations.push({ type: 'modo CNEOS', description: `panel ${panel} ms · nube ${nube} ms` });
  console.log(
    `[${info.project.name}] modo CNEOS, mediana de ${REPETICIONES}: panel ${panel.toFixed(0)} ms · nube completa ${Number.isFinite(nube) ? `${nube.toFixed(0)} ms` : 'sin órbita'}`,
  );
  expect(panel).toBeLessThan(3000);
});
