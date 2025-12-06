import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Run tests sequentially since integration tests share a database
    sequence: {
      concurrent: false,
    },
    // Run test files sequentially
    fileParallelism: false,
  },
});
