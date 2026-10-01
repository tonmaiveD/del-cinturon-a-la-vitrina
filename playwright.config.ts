import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/e2e/.resultados',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npx vite build && npx tsx pipeline/servidor-estatico.ts 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] }, testIgnore: /rendimiento/ },
    { name: 'movil', use: { ...devices['Pixel 7'] }, testIgnore: /rendimiento/ },
    // Medición aislada: `npm run e2e:rendimiento` (un solo worker, sin otras pruebas en paralelo)
    { name: 'rendimiento', use: { ...devices['Pixel 7'] }, testMatch: /rendimiento/ },
  ],
});
