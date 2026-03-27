'use client';

import type { PresenceUser } from '@/types';
import styles from './PresenceAvatars.module.scss';

interface PresenceAvatarsProps {
    users: PresenceUser[];
}

export default function PresenceAvatars({ users }: PresenceAvatarsProps) {
    if (users.length === 0) return null;

    return (
        <div className={styles.container}>
            {users.map((user) => (
                <div
                    key={user.userId}
                    className={styles.avatar}
                    style={{ backgroundColor: user.color }}
                    title={user.name ?? user.userId}
                >
                    {(user.name ?? user.userId).charAt(0).toUpperCase()}
                </div>
            ))}
        </div>
    );
}
