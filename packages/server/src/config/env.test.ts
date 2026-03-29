import { afterEach, describe, expect, it } from 'vitest';

import { getPort, isProduction } from './env.js';

describe('env config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isProduction', () => {
    it('returns false when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });

    it('returns true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('returns false when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV;
      expect(isProduction()).toBe(false);
    });
  });

  describe('getPort', () => {
    it('returns 3001 as default', () => {
      delete process.env.PORT;
      expect(getPort()).toBe(3001);
    });

    it('returns PORT from environment', () => {
      process.env.PORT = '8080';
      expect(getPort()).toBe(8080);
    });
  });
});
