import { updateDocument } from 'app/repositories/documents/documents.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setupEditHandler } from './edit.js';

vi.mock('app/repositories/documents/documents.js', () => ({
  updateDocument: vi.fn(async () => ({ id: 'doc-1', content: 'new content' })),
}));

function createMockSocket() {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const toEmitFn = vi.fn();
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    to: vi.fn(() => ({ emit: toEmitFn })),
    _handlers: handlers,
    _toEmit: toEmitFn,
  };
}

describe('setupEditHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers an edit event handler', () => {
    const socket = createMockSocket();
    setupEditHandler(socket as any, {} as any, 'doc-1', 'user-1');

    expect(socket.on).toHaveBeenCalledWith('edit', expect.any(Function));
  });

  it('updates document in database on edit', async () => {
    const socket = createMockSocket();
    setupEditHandler(socket as any, {} as any, 'doc-1', 'user-1');

    const handler = socket._handlers.get('edit')!;
    await handler({ documentId: 'doc-1', content: 'edited text' });

    expect(updateDocument).toHaveBeenCalledWith('doc-1', {
      content: 'edited text',
    });
  });

  it('broadcasts edit to other users in the room', async () => {
    const socket = createMockSocket();
    setupEditHandler(socket as any, {} as any, 'doc-1', 'user-1');

    const handler = socket._handlers.get('edit')!;
    await handler({ documentId: 'doc-1', content: 'edited text' });

    expect(socket.to).toHaveBeenCalledWith('doc-1');
    expect(socket._toEmit).toHaveBeenCalledWith('edit', {
      content: 'edited text',
      userId: 'user-1',
    });
  });
});
