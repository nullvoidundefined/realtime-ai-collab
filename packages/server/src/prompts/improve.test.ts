import { describe, expect, it } from 'vitest';

import { buildImprovePrompt } from './improve.js';

describe('buildImprovePrompt', () => {
  it('includes the context in the prompt', () => {
    const result = buildImprovePrompt('rough draft text');
    expect(result).toContain('rough draft text');
  });

  it('includes instruction to improve', () => {
    const result = buildImprovePrompt('text');
    expect(result.toLowerCase()).toContain('improve');
  });
});
