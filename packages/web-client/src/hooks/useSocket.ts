'use client';

import { useEffect, useRef, useState } from 'react';

import { fetchCsrfToken } from '@/lib/api';
import { type Socket, io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

export function useSocket(userId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let socket: Socket | null = null;

    async function connect() {
      const csrfToken = await fetchCsrfToken();

      socket = io(WS_URL, {
        auth: { userId, csrfToken },
        withCredentials: true,
      });

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));

      socketRef.current = socket;
    }

    connect();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
      setConnected(false);
    };
  }, [userId]);

  return { socket: socketRef.current, connected };
}
