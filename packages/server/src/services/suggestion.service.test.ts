import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
const { mockStream } = vi.hoisted(() => ({
  mockStream: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn(),
        stream: mockStream,
      };
    },
  };
});

vi.mock('app/repositories/suggestions/suggestions.js', () => ({
  updateSuggestionStatus: vi.fn(),
}));

vi.mock('app/prompts/continue.js', () => ({
  buildContinuePrompt: vi.fn((ctx: string) => `continue: ${ctx}`),
}));
vi.mock('app/prompts/improve.js', () => ({
  buildImprovePrompt: vi.fn((ctx: string) => `improve: ${ctx}`),
}));
vi.mock('app/prompts/summarize.js', () => ({
  buildSummarizePrompt: vi.fn((ctx: string) => `summarize: ${ctx}`),
}));
vi.mock('app/prompts/expand.js', () => ({
  buildExpandPrompt: vi.fn((ctx: string) => `expand: ${ctx}`),
}));

import { updateSuggestionStatus } from 'app/repositories/suggestions/suggestions.js';
import { streamSuggestion } from './suggestion.service.js';

function createMockIo() {
  const emitFn = vi.fn();
  return {
    to: vi.fn(() => ({ emit: emitFn })),
    _emit: emitFn,
  };
}

function createMockStream(tokens: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const token of tokens) {
        yield {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: token },
        };
      }
    },
  };
}

function createErrorStream(tokensBeforeError: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const token of tokensBeforeError) {
        yield {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: token },
        };
      }
      throw new Error('API connection lost');
    },
  };
}

describe('streamSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('streams tokens and emits ai:stream for each', async () => {
    mockStream.mockResolvedValue(
      createMockStream(['Hello', ' world', '!']),
    );

    const io = createMockIo();
    const abort = new AbortController();

    await streamSuggestion(
      io as any,
      'doc-1',
      'sug-1',
      'continue',
      'Some context',
      abort,
    );

    // Verify tokens were emitted
    const streamCalls = io._emit.mock.calls.filter(
      (c: unknown[]) => c[0] === 'ai:stream',
    );
    expect(streamCalls).toHaveLength(3);
    expect(streamCalls[0][1]).toEqual({ token: 'Hello', suggestionId: 'sug-1' });
    expect(streamCalls[1][1]).toEqual({ token: ' world', suggestionId: 'sug-1' });
    expect(streamCalls[2][1]).toEqual({ token: '!', suggestionId: 'sug-1' });
  });

  it('emits ai:complete with full text on success', async () => {
    mockStream.mockResolvedValue(
      createMockStream(['Hello', ' world']),
    );

    const io = createMockIo();
    const abort = new AbortController();

    await streamSuggestion(
      io as any,
      'doc-1',
      'sug-1',
      'continue',
      'context',
      abort,
    );

    const completeCalls = io._emit.mock.calls.filter(
      (c: unknown[]) => c[0] === 'ai:complete',
    );
    expect(completeCalls).toHaveLength(1);
    expect(completeCalls[0][1]).toEqual({
      suggestionId: 'sug-1',
      text: 'Hello world',
    });
  });

  it('updates suggestion status to pending with full text on success', async () => {
    mockStream.mockResolvedValue(
      createMockStream(['Done']),
    );

    const io = createMockIo();
    const abort = new AbortController();

    await streamSuggestion(
      io as any,
      'doc-1',
      'sug-1',
      'continue',
      'context',
      abort,
    );

    expect(updateSuggestionStatus).toHaveBeenCalledWith(
      'sug-1',
      'pending',
      undefined,
      'Done',
    );
  });

  it('emits ai:error and sets status to rejected on API failure', async () => {
    mockStream.mockResolvedValue(
      createErrorStream(['partial']),
    );

    const io = createMockIo();
    const abort = new AbortController();

    await streamSuggestion(
      io as any,
      'doc-1',
      'sug-1',
      'continue',
      'context',
      abort,
    );

    const errorCalls = io._emit.mock.calls.filter(
      (c: unknown[]) => c[0] === 'ai:error',
    );
    expect(errorCalls).toHaveLength(1);
    expect(errorCalls[0][1]).toEqual({ message: 'AI streaming failed' });

    expect(updateSuggestionStatus).toHaveBeenCalledWith(
      'sug-1',
      'rejected',
      undefined,
      'partial',
    );
  });

  it('does not emit error when abort is triggered', async () => {
    const abort = new AbortController();
    mockStream.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        abort.abort();
        throw new Error('AbortError');
      },
    });

    const io = createMockIo();

    await streamSuggestion(
      io as any,
      'doc-1',
      'sug-1',
      'continue',
      'context',
      abort,
    );

    const errorCalls = io._emit.mock.calls.filter(
      (c: unknown[]) => c[0] === 'ai:error',
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('uses correct prompt type for improve', async () => {
    mockStream.mockResolvedValue(
      createMockStream(['improved']),
    );

    const io = createMockIo();
    const abort = new AbortController();

    await streamSuggestion(
      io as any,
      'doc-1',
      'sug-1',
      'improve',
      'rough text',
      abort,
    );

    expect(mockStream).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'improve: rough text' }],
      }),
      expect.any(Object),
    );
  });
});
