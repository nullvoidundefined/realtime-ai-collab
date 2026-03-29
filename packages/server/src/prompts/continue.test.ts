import { describe, expect, it } from 'vitest';

import { buildContinuePrompt } from './continue.js';

describe('buildContinuePrompt', () => {
  it('includes the context in the prompt', () => {
    const result = buildContinuePrompt('Once upon a time');
    expect(result).toContain('Once upon a time');
  });

  it('includes instruction to continue writing', () => {
    const result = buildContinuePrompt('text');
    expect(result.toLowerCase()).toContain('continue');
  });
});
