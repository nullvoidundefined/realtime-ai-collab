import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './auth.service.js';

describe('auth.service', () => {
  describe('hashPassword', () => {
    it('returns a bcrypt hash string', async () => {
      const hash = await hashPassword('mypassword');
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('mypassword');
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('produces different hashes for the same password (salted)', async () => {
      const hash1 = await hashPassword('mypassword');
      const hash2 = await hashPassword('mypassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const hash = await hashPassword('correct');
      const result = await verifyPassword('correct', hash);
      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hash = await hashPassword('correct');
      const result = await verifyPassword('wrong', hash);
      expect(result).toBe(false);
    });

    it('roundtrips with special characters', async () => {
      const password = 'p@$$w0rd!#%^&*()';
      const hash = await hashPassword(password);
      expect(await verifyPassword(password, hash)).toBe(true);
    });
  });
});
