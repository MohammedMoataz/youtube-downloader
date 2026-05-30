import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    globals: true,
    // Provide the public config var so config.ts loads with a base URL during unit tests.
    env: { PUBLIC_DOWNLOADER_API: 'http://localhost:8787' },
  },
});
