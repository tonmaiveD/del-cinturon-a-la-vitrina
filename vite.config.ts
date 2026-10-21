import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';
import { fichasPublicables } from './pipeline/fichas-publicables.ts';
import { idiomasPublicables } from './pipeline/idiomas-publicables.ts';
import { csp } from './pipeline/csp.ts';
import { precargas } from './pipeline/precargas.ts';
import { temaCss } from './pipeline/tema-css.ts';

/**
 * Commit que se construye. Primero el de la copia de trabajo: cuando el bot publica, la CI corre
 * llamada desde su tarea y GITHUB_SHA es el commit anterior al del bot, no el publicado.
 */
function commitActual(): string {
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 7) ?? 'desconocido';
  }
}

export default defineConfig({
  // GitHub Pages sirve el sitio bajo /<repositorio>/: la CI pasa la ruta en BASE_PUBLICA
  plugins: [fichasPublicables(), idiomasPublicables(), temaCss(), precargas(), csp()],
  base: process.env.BASE_PUBLICA ?? '/',
  // Idiomas en revisión local (pipeline/idiomas-publicables.ts); vacío en la CI y en producción
  define: {
    __VISTA_PREVIA__: JSON.stringify(process.env.IDIOMAS_VISTA_PREVIA ?? ''),
    // Versión publicada (M16): commit y fecha del build, para el diagnóstico y los reportes
    __VERSION__: JSON.stringify({ commit: commitActual(), fecha: new Date().toISOString() }),
  },
  build: { target: 'es2022', sourcemap: true },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
