'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { User } from '@/types';
import styles from './page.module.scss';

interface LoginResponse {
    user: User;
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: () =>
            apiFetch<LoginResponse>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            }),
        onSuccess: () => {
            router.push('/dashboard');
        },
        onError: (err: Error) => {
            setError(err.message);
        },
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        mutation.mutate();
    }

    return (
        <main className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Sign In</h1>
                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <p className={styles.error}>{error}</p>}
                    <div className={styles.field}>
                        <label htmlFor="email" className={styles.label}>Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.input}
                            required
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="password" className={styles.label}>Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                <p className={styles.link}>
                    Don&apos;t have an account?{' '}
                    <Link href="/register">Create one</Link>
                </p>
            </div>
        </main>
    );
}
