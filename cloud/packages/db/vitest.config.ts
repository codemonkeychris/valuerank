import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: ['default', 'json'],
    outputFile: {
      json: 'coverage/test-results.json',
    },
    // Run tests sequentially since integration tests share a database
    sequence: {
      concurrent: false,
    },
    // Run test files sequentially
    fileParallelism: false,
    // Load .env file
    env: loadEnv('', process.cwd(), ''),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types.ts', 'src/queries/index.ts'],
    },
  },
});
