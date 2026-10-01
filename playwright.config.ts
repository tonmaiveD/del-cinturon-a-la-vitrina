import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/e2e/.resultados',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
});
