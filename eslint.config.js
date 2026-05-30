// Flat ESLint config (ESLint 9). Kept minimal per constitution Principle V (Simplicity).
export default [
  {
    ignores: ['dist/', '.astro/', 'node_modules/', 'coverage/', 'playwright-report/', 'test-results/'],
  },
  {
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'off',
    },
  },
];
