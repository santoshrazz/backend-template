import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['node_modules', 'dist', 'eslint.config.*'],
  },

  js.configs.recommended,

  // ✅ basic TS rules
  ...tseslint.configs.recommended,

  // ✅ type-aware rules (apply globally but with project)
  ...tseslint.configs.recommended.map((config) => ({
    ...(config as any),
    files: ['**/*.ts'],
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  })),

  // ✅ your custom rules
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];