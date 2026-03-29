import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('app/config/redis.js', () => ({
  redis: {
    setex: vi.fn(async () => 'OK'),
  },
}));

import { redis } from 'app/config/redis.js';
import { setupCursorHandler } from './cursor.js';

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

function createMockIo() {
  return {} as any;
}

describe('setupCursorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a cursor event handler', () => {
    const socket = createMockSocket();
    setupCursorHandler(socket as any, createMockIo(), 'doc-1', 'user-1', '#3b82f6');

    expect(socket.on).toHaveBeenCalledWith('cursor', expect.any(Function));
  });

  it('stores cursor position in Redis with 30s TTL', async () => {
    const socket = createMockSocket();
    setupCursorHandler(socket as any, createMockIo(), 'doc-1', 'user-1', '#3b82f6');

    const handler = socket._handlers.get('cursor')!;
    await handler({ documentId: 'doc-1', position: { line: 5, ch: 10 } });

    expect(redis.setex).toHaveBeenCalledWith(
      'cursors:doc-1:user-1',
      30,
      expect.any(String),
    );

    const storedData = JSON.parse(
      (redis.setex as ReturnType<typeof vi.fn>).mock.calls[0][2],
    );
    expect(storedData).toEqual({
      userId: 'user-1',
      position: { line: 5, ch: 10 },
      color: '#3b82f6',
    });
  });

  it('broadcasts cursor to other users in the document room', async () => {
    const socket = createMockSocket();
    setupCursorHandler(socket as any, createMockIo(), 'doc-1', 'user-1', '#3b82f6');

    const handler = socket._handlers.get('cursor')!;
    await handler({ documentId: 'doc-1', position: { line: 1, ch: 0 } });

    expect(socket.to).toHaveBeenCalledWith('doc-1');
    expect(socket._toEmit).toHaveBeenCalledWith('cursor', {
      userId: 'user-1',
      position: { line: 1, ch: 0 },
      color: '#3b82f6',
    });
  });
});
