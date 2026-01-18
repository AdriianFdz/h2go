import path from 'node:path';
import eslint from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
  eslint.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  {
    ignores: ['eslint.config.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.resolve(),
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
];