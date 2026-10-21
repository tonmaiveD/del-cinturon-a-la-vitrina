import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // .trabajo y revision: material de trabajo local, fuera de git
    ignores: [
      'dist',
      'node_modules',
      'public/data',
      'tests/e2e/.resultados',
      'playwright-report',
      '.trabajo',
      'revision',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
