import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses default PORT when not set', async () => {
    delete process.env.PORT;
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';

    const { config } = await import('../src/config.js');

    expect(config.PORT).toBe(3001);
  });

  it('parses PORT from environment', async () => {
    process.env.PORT = '4000';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';

    const { config } = await import('../src/config.js');

    expect(config.PORT).toBe(4000);
  });

  it('uses default NODE_ENV when not set', async () => {
    delete process.env.NODE_ENV;
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';

    const { config } = await import('../src/config.js');

    expect(config.NODE_ENV).toBe('development');
  });

  it('reads DATABASE_URL from environment', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@host/db';

    const { config } = await import('../src/config.js');

    expect(config.DATABASE_URL).toBe('postgresql://user:pass@host/db');
  });
});
