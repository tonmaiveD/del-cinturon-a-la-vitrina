import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages sirve el sitio bajo /<repositorio>/: la CI pasa la ruta en BASE_PUBLICA
  base: process.env.BASE_PUBLICA ?? '/',
  build: { target: 'es2022', sourcemap: true },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
