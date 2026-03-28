'use client';

import { Suspense, useEffect } from 'react';

import { apiFetch } from '@/lib/api';
import type { Document } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';

interface JoinResponse {
  document: Document;
}

function JoinContent() {
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
      }}
    >
      <p>Joining document...</p>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
          }}
        >
          <p>Loading...</p>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
