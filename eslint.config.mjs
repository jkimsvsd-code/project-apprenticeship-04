import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import next from '@next/eslint-plugin-next';
import typescript from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['.next/**', 'node_modules/**', 'public/task-assets/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**']),
  eslint.configs.recommended,
  ...typescript.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { ...next.configs['core-web-vitals'], files: ['src/**/*.{ts,tsx}'] },
  { ...hooks.configs.flat.recommended, files: ['src/**/*.{ts,tsx}'] },
]);
