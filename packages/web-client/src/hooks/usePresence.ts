'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { PresenceUser } from '@/types';

interface PresenceUserWithCursor extends PresenceUser {
    position?: { x: number; y: number };
}

export function usePresence(socket: Socket | null, currentUserId: string | null) {
    const [users, setUsers] = useState<PresenceUserWithCursor[]>([]);

    useEffect(() => {
        if (!socket) return;

        function handlePresence({ users: presenceUsers }: { users: PresenceUser[] }) {
            setUsers(presenceUsers);
        }

        function handleUserJoined({ userId, color }: { userId: string; color: string }) {
            setUsers((prev) => {
                if (prev.find((u) => u.userId === userId)) return prev;
                return [...prev, { userId, color }];
            });
        }

        function handleUserLeft({ userId }: { userId: string }) {
            setUsers((prev) => prev.filter((u) => u.userId !== userId));
        }

        function handleCursor({
            userId,
            position,
            color,
        }: {
            userId: string;
            position: { x: number; y: number };
            color: string;
        }) {
            setUsers((prev) => {
                const existing = prev.find((u) => u.userId === userId);
                if (existing) {
                    return prev.map((u) =>
                        u.userId === userId ? { ...u, position, color } : u
                    );
                }
                return [...prev, { userId, color, position }];
            });
        }

        socket.on('presence', handlePresence);
        socket.on('user:joined', handleUserJoined);
        socket.on('user:left', handleUserLeft);
        socket.on('cursor', handleCursor);

        return () => {
            socket.off('presence', handlePresence);
            socket.off('user:joined', handleUserJoined);
            socket.off('user:left', handleUserLeft);
            socket.off('cursor', handleCursor);
        };
    }, [socket]);

    return users;
}
