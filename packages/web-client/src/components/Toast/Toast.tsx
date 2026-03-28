'use client';

import { useEffect } from 'react';

import styles from './Toast.module.scss';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = 'info',
  onDismiss,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.message}>{message}</span>
      <button onClick={onDismiss} className={styles.dismiss}>
        ✕
      </button>
    </div>
  );
}
