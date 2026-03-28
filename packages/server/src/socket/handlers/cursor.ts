import { redis } from 'app/config/redis.js';
import type { Server, Socket } from 'socket.io';

export function setupCursorHandler(
  socket: Socket,
  io: Server,
  documentId: string,
  userId: string,
  color: string,
): void {
  socket.on(
    'cursor',
    async (data: { documentId: string; position: unknown }) => {
      const cursorData = JSON.stringify({
        userId,
        position: data.position,
        color,
      });
      await redis.setex(`cursors:${data.documentId}:${userId}`, 30, cursorData);
      socket
        .to(data.documentId)
        .emit('cursor', { userId, position: data.position, color });
    },
  );
}
