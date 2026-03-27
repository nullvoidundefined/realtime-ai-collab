'use client';

import styles from './ToastContainer.module.scss';
import Toast from './Toast';

interface ToastItem {
    id: string;
    message: string;
    type?: 'error' | 'success' | 'info';
}

interface ToastContainerProps {
    toasts: ToastItem[];
    onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className={styles.container}>
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onDismiss={() => onDismiss(toast.id)}
                />
            ))}
        </div>
    );
}
