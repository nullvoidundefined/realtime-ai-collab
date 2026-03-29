import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('app/config/redis.js', () => {
  const store = new Map<string, string>();
  return {
    redis: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
        return 1;
      }),
      incr: vi.fn(async () => 1),
      expire: vi.fn(async () => 1),
      _store: store,
    },
  };
});

vi.mock('app/repositories/documents/documents.js', () => ({
  updateDocument: vi.fn(async () => ({ id: 'doc-1' })),
  createVersion: vi.fn(async () => ({ id: 'v-1' })),
}));

vi.mock('app/repositories/suggestions/suggestions.js', () => ({
  createSuggestion: vi.fn(async () => ({
    id: 'sug-1',
    document_id: 'doc-1',
    status: 'streaming',
  })),
  updateSuggestionStatus: vi.fn(async (_id: string, status: string) => ({
    id: 'sug-1',
    status,
    suggestion_text: 'AI generated text',
  })),
}));

vi.mock('app/services/suggestion.service.js', () => ({
  streamSuggestion: vi.fn(async () => {}),
}));

import { redis } from 'app/config/redis.js';
import {
  updateDocument,
  createVersion,
} from 'app/repositories/documents/documents.js';
import {
  createSuggestion,
  updateSuggestionStatus,
} from 'app/repositories/suggestions/suggestions.js';
import { streamSuggestion } from 'app/services/suggestion.service.js';
import { setupAiHandlers } from './ai.js';

function createMockSocket() {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const emitFn = vi.fn();
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    emit: emitFn,
    _handlers: handlers,
    _emit: emitFn,
  };
}

function createMockIo() {
  const toEmitFn = vi.fn();
  return {
    to: vi.fn(() => ({ emit: toEmitFn })),
    _toEmit: toEmitFn,
  };
}

describe('HITL state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = (redis as any)._store as Map<string, string>;
    store.clear();
  });

  describe('ai:request', () => {
    it('creates a suggestion and starts streaming', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:request')!;
      await handler({
        documentId: 'doc-1',
        promptType: 'continue',
        context: 'Hello world',
      });

      expect(createSuggestion).toHaveBeenCalledWith({
        documentId: 'doc-1',
        requestedBy: 'user-1',
        promptType: 'continue',
      });

      expect(streamSuggestion).toHaveBeenCalledWith(
        io,
        'doc-1',
        'sug-1',
        'continue',
        'Hello world',
        expect.any(AbortController),
      );
    });

    it('sets active_suggestion lock in Redis', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:request')!;
      await handler({
        documentId: 'doc-1',
        promptType: 'continue',
        context: 'text',
      });

      expect(redis.set).toHaveBeenCalledWith(
        'active_suggestion:doc-1',
        expect.any(String),
        'EX',
        300,
      );
    });

    it('rejects second request when one is already active', async () => {
      const socket = createMockSocket();
      const io = createMockIo();

      // Pre-set an active suggestion in the mock store
      const store = (redis as any)._store as Map<string, string>;
      store.set(
        'active_suggestion:doc-1',
        JSON.stringify({ suggestionId: 'sug-existing', requestedBy: 'user-2' }),
      );

      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:request')!;
      await handler({
        documentId: 'doc-1',
        promptType: 'continue',
        context: 'text',
      });

      expect(socket._emit).toHaveBeenCalledWith('ai:error', {
        message: 'Another AI suggestion is in progress',
      });
      expect(createSuggestion).not.toHaveBeenCalled();
    });
  });

  describe('ai:accept', () => {
    it('updates suggestion status to accepted', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:accept')!;
      await handler({
        documentId: 'doc-1',
        suggestionId: 'sug-1',
        currentContent: 'existing content',
      });

      expect(updateSuggestionStatus).toHaveBeenCalledWith(
        'sug-1',
        'accepted',
        'user-1',
      );
    });

    it('appends suggestion text to document and creates version', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:accept')!;
      await handler({
        documentId: 'doc-1',
        suggestionId: 'sug-1',
        currentContent: 'existing',
      });

      expect(updateDocument).toHaveBeenCalledWith('doc-1', {
        content: 'existing\nAI generated text',
      });
      expect(createVersion).toHaveBeenCalledWith(
        'doc-1',
        'existing\nAI generated text',
        'user-1',
      );
    });

    it('releases Redis lock after acceptance', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:accept')!;
      await handler({
        documentId: 'doc-1',
        suggestionId: 'sug-1',
        currentContent: 'existing',
      });

      expect(redis.del).toHaveBeenCalledWith('active_suggestion:doc-1');
    });

    it('emits ai:committed to the document room', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:accept')!;
      await handler({
        documentId: 'doc-1',
        suggestionId: 'sug-1',
        currentContent: 'existing',
      });

      expect(io.to).toHaveBeenCalledWith('doc-1');
      expect(io._toEmit).toHaveBeenCalledWith('ai:committed', {
        content: 'existing\nAI generated text',
      });
    });

    it('emits ai:error when suggestion not found', async () => {
      (updateSuggestionStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        null,
      );

      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:accept')!;
      await handler({
        documentId: 'doc-1',
        suggestionId: 'sug-missing',
        currentContent: 'existing',
      });

      expect(socket._emit).toHaveBeenCalledWith('ai:error', {
        message: 'Suggestion not found',
      });
    });
  });

  describe('ai:reject', () => {
    it('updates suggestion status to rejected', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:reject')!;
      await handler({ documentId: 'doc-1', suggestionId: 'sug-1' });

      expect(updateSuggestionStatus).toHaveBeenCalledWith(
        'sug-1',
        'rejected',
        'user-1',
      );
    });

    it('releases Redis lock after rejection', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:reject')!;
      await handler({ documentId: 'doc-1', suggestionId: 'sug-1' });

      expect(redis.del).toHaveBeenCalledWith('active_suggestion:doc-1');
    });

    it('emits ai:rejected to the document room', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:reject')!;
      await handler({ documentId: 'doc-1', suggestionId: 'sug-1' });

      expect(io.to).toHaveBeenCalledWith('doc-1');
      expect(io._toEmit).toHaveBeenCalledWith('ai:rejected', {
        suggestionId: 'sug-1',
      });
    });
  });

  describe('ai:edit', () => {
    it('updates suggestion status to edited with custom text', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:edit')!;
      await handler({
        documentId: 'doc-1',
        suggestionId: 'sug-1',
        editedText: 'user-modified text',
        currentContent: 'existing',
      });

      expect(updateSuggestionStatus).toHaveBeenCalledWith(
        'sug-1',
        'edited',
        'user-1',
        'user-modified text',
      );
    });

    it('applies edited text to document', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:edit')!;
      await handler({
        documentId: 'doc-1',
        suggestionId: 'sug-1',
        editedText: 'my edits',
        currentContent: 'old content',
      });

      expect(updateDocument).toHaveBeenCalledWith('doc-1', {
        content: 'old content\nmy edits',
      });
      expect(createVersion).toHaveBeenCalledWith(
        'doc-1',
        'old content\nmy edits',
        'user-1',
      );
    });

    it('releases Redis lock after edit', async () => {
      const socket = createMockSocket();
      const io = createMockIo();
      setupAiHandlers(socket as any, io as any, 'doc-1', 'user-1');

      const handler = socket._handlers.get('ai:edit')!;
      await handler({
        documentId: 'doc-1',
        suggestionId: 'sug-1',
        editedText: 'edits',
        currentContent: 'content',
      });

      expect(redis.del).toHaveBeenCalledWith('active_suggestion:doc-1');
    });
  });
});
