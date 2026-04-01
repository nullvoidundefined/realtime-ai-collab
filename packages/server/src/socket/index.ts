import { redis } from 'app/config/redis.js';
import { validateRequest } from 'app/middleware/csrfGuard/csrfGuard.js';
import { setupAiHandlers } from 'app/socket/handlers/ai.js';
import { setupCursorHandler } from 'app/socket/handlers/cursor.js';
import { setupEditHandler } from 'app/socket/handlers/edit.js';
import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';

const COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim()),
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const userId = socket.handshake.auth.userId as string | undefined;
    if (!userId) {
      return next(new Error('Authentication required'));
    }

    /* Validate CSRF token passed as auth.csrfToken during handshake.
       We build a minimal request-like object so validateRequest can
       check the double-submit cookie + header/body token pair. */
    const csrfToken = socket.handshake.auth.csrfToken as string | undefined;
    const cookies = socket.handshake.headers.cookie ?? '';
    const fakeReq = {
      headers: {
        cookie: cookies,
        'x-csrf-token': csrfToken ?? '',
      },
      cookies: Object.fromEntries(
        cookies
          .split(';')
          .filter(Boolean)
          .map((c: string) => {
            const [k, ...v] = c.trim().split('=');
            return [k, v.join('=')];
          }),
      ),
    } as any;

    if (!validateRequest(fakeReq)) {
      return next(new Error('Invalid CSRF token'));
    }

    (socket as Socket & { userId: string }).userId = userId;
    next();
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as Socket & { userId: string }).userId;
    const color = getUserColor(userId);

    socket.on('join', async (documentId: string) => {
      await socket.join(documentId);
      await redis.sadd(`presence:${documentId}`, userId);

      socket.to(documentId).emit('user:joined', { userId, color });

      // Send presence snapshot to the joining user
      const members = await redis.smembers(`presence:${documentId}`);
      socket.emit('presence', {
        users: members.map((uid: string) => ({
          userId: uid,
          color: getUserColor(uid),
        })),
      });

      // Store document association for disconnect
      (socket as Socket & { userId: string; documentId?: string }).documentId =
        documentId;

      setupEditHandler(socket, io, documentId, userId);
      setupCursorHandler(socket, io, documentId, userId, color);
      setupAiHandlers(socket, io, documentId, userId);
    });

    socket.on('disconnect', async () => {
      const docId = (socket as Socket & { userId: string; documentId?: string })
        .documentId;
      if (docId) {
        await redis.srem(`presence:${docId}`, userId);
        io.to(docId).emit('user:left', { userId });
      }
    });
  });

  return io;
}
