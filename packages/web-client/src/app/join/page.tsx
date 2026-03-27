'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Document } from '@/types';

interface JoinResponse {
    document: Document;
}

export default function JoinPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const joinMutation = useMutation({
        mutationFn: (shareToken: string) =>
            apiFetch<JoinResponse>('/documents/join', {
                method: 'POST',
                body: JSON.stringify({ shareToken }),
            }),
        onSuccess: (data) => {
            router.push(`/documents/${data.document.id}`);
        },
        onError: () => {
            router.push('/dashboard');
        },
    });

    useEffect(() => {
        if (token) {
            joinMutation.mutate(token);
        } else {
            router.push('/dashboard');
        }
    }, [token]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <p>Joining document...</p>
        </div>
    );
}
