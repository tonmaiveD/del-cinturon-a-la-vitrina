import { defineConfig } from 'vitest/config';
import { fichasPublicables } from './pipeline/fichas-publicables.ts';
import { idiomasPublicables } from './pipeline/idiomas-publicables.ts';
import { temaCss } from './pipeline/tema-css.ts';

export default defineConfig({
  // GitHub Pages sirve el sitio bajo /<repositorio>/: la CI pasa la ruta en BASE_PUBLICA
  plugins: [fichasPublicables(), idiomasPublicables(), temaCss()],
  base: process.env.BASE_PUBLICA ?? '/',
  build: { target: 'es2022', sourcemap: true },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
