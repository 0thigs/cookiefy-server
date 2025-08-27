
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
  // ignore paths
  { ignores: ['dist/**', 'node_modules/**'] },
    
  // regras para .ts
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // sem type-checking por enquanto (mais rápido e simples)
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: { ...globals.node },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      // preferir os avisos do plugin TS
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },

  // Se quiser desativar conflitos com Prettier, descomente:
  // prettier,
];
