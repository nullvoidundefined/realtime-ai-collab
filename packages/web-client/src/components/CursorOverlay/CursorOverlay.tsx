'use client';

import type { PresenceUser } from '@/types';
import styles from './CursorOverlay.module.scss';

interface CursorPosition {
    x: number;
    y: number;
}

interface CursorUser extends PresenceUser {
    position?: CursorPosition;
}

interface CursorOverlayProps {
    users: CursorUser[];
    currentUserId: string | null;
}

export default function CursorOverlay({ users, currentUserId }: CursorOverlayProps) {
    const otherUsers = users.filter(
        (u) => u.userId !== currentUserId && u.position
    );

    if (otherUsers.length === 0) return null;

    return (
        <div className={styles.overlay}>
            {otherUsers.map((user) => (
                user.position && (
                    <div
                        key={user.userId}
                        className={styles.cursor}
                        style={{
                            left: user.position.x,
                            top: user.position.y,
                            borderColor: user.color,
                        }}
                    >
                        <div
                            className={styles.cursorLabel}
                            style={{ backgroundColor: user.color }}
                        >
                            {user.name ?? user.userId.slice(0, 8)}
                        </div>
                    </div>
                )
            ))}
        </div>
    );
}
