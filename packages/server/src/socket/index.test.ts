import { describe, expect, it } from 'vitest';

import { getUserColor } from './index.js';

describe('getUserColor', () => {
  it('returns a hex color string', () => {
    const color = getUserColor('user-1');
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns the same color for the same userId', () => {
    const c1 = getUserColor('user-abc');
    const c2 = getUserColor('user-abc');
    expect(c1).toBe(c2);
  });

  it('is deterministic across calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getUserColor('stable-user'));
    }
    expect(results.size).toBe(1);
  });

  it('returns different colors for different users (in general)', () => {
    const colors = new Set<string>();
    for (let i = 0; i < 50; i++) {
      colors.add(getUserColor(`user-${i}`));
    }
    // With 6 possible colors and 50 users, we should see multiple distinct colors
    expect(colors.size).toBeGreaterThan(1);
  });
});
