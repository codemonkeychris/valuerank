/**
 * Vitest setup file
 *
 * Sets required environment variables for tests
 */

// Set JWT_SECRET before any other imports
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
