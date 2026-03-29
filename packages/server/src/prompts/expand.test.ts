import { describe, expect, it } from 'vitest';

import { buildExpandPrompt } from './expand.js';

describe('buildExpandPrompt', () => {
  it('includes the context in the prompt', () => {
    const result = buildExpandPrompt('Brief note about topic');
    expect(result).toContain('Brief note about topic');
  });

  it('includes instruction to expand', () => {
    const result = buildExpandPrompt('text');
    expect(result.toLowerCase()).toContain('expand');
  });
});
