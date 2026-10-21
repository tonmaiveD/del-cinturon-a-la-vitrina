import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/e2e/.resultados',
  // En GitHub (sin GPU, más lento): un reintento, y los fallos e inestabilidades como anotaciones
  // públicas del workflow (el registro completo exige sesión iniciada)
  retries: process.env.CI ? 1 : 0,
  // Sin GPU la escena va a unos 4 fps y Playwright espera cuadros estables antes de cada acción:
  // las pruebas con muchos pasos (pestañas de la hoja móvil) pasaban de 30 s (2026-10-09)
  timeout: process.env.CI ? 90_000 : 30_000,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  // Navegador en español: las pruebas esperan los textos en español aunque el inglés esté
  // publicado (la web elige el idioma del navegador; tests/e2e/idioma.spec.ts usa otros)
  use: { baseURL: 'http://localhost:4173', locale: 'es-ES' },
  webServer: {
    // En la CI se prueba el mismo dist/ que se publica (construido una vez con BASE_PUBLICA):
    // E2E_DIST_LISTO evita reconstruirlo. En local se construye antes de probar.
    command: process.env.E2E_DIST_LISTO
      ? 'npx tsx pipeline/servidor-estatico.ts 4173'
      : 'npx vite build && npx tsx pipeline/servidor-estatico.ts 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], locale: 'es-ES' },
      testIgnore: /rendimiento/,
    },
    { name: 'movil', use: { ...devices['Pixel 7'], locale: 'es-ES' }, testIgnore: /rendimiento/ },
    // Medición aislada: `npm run e2e:rendimiento` (un solo worker, sin otras pruebas en paralelo)
    {
      name: 'rendimiento',
      use: { ...devices['Pixel 7'], locale: 'es-ES' },
      testMatch: /rendimiento/,
    },
  ],
});
