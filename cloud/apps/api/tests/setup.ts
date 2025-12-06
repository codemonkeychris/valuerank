/**
 * Vitest setup file
 *
 * Sets required environment variables for tests.
 * This file runs BEFORE test files are imported.
 *
 * DO NOT export functions from this file - it runs as a script, not a module.
 * For test helpers, see tests/test-utils.ts
 */

// Set JWT_SECRET before any other imports
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
