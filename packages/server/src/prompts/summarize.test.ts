import { describe, expect, it } from 'vitest';

import { buildSummarizePrompt } from './summarize.js';

describe('buildSummarizePrompt', () => {
  it('includes the context in the prompt', () => {
    const result = buildSummarizePrompt('A long document about cats');
    expect(result).toContain('A long document about cats');
  });

  it('includes instruction to summarize', () => {
    const result = buildSummarizePrompt('text');
    expect(result.toLowerCase()).toContain('summar');
  });
});
