import { describe, expect, it, vi } from 'vitest';

import { checkSuggestionRate } from './ai.js';

function createMockRedis() {
  const store = new Map<string, number>();
  return {
    incr: vi.fn(async (key: string) => {
      const val = (store.get(key) ?? 0) + 1;
      store.set(key, val);
      return val;
    }),
    expire: vi.fn(async () => 1),
    _store: store,
  };
}

describe('checkSuggestionRate', () => {
  it('allows up to 10 requests and blocks the 11th', async () => {
    const mockRedis = createMockRedis();

    for (let i = 1; i <= 10; i++) {
      const allowed = await checkSuggestionRate('user-1', mockRedis as any);
      expect(allowed).toBe(true);
    }

    // 11th request should be denied
    const blocked = await checkSuggestionRate('user-1', mockRedis as any);
    expect(blocked).toBe(false);
  });

  it('sets TTL on first request only', async () => {
    const mockRedis = createMockRedis();

    await checkSuggestionRate('user-2', mockRedis as any);
    expect(mockRedis.expire).toHaveBeenCalledTimes(1);
    expect(mockRedis.expire).toHaveBeenCalledWith(
      'suggestion_rate:user-2',
      300,
    );

    await checkSuggestionRate('user-2', mockRedis as any);
    // expire should NOT be called again (count is now 2, not 1)
    expect(mockRedis.expire).toHaveBeenCalledTimes(1);
  });
});
