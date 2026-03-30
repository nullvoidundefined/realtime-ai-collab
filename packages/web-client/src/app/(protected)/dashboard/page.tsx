'use client';

import { apiFetch } from '@/lib/api';
import type { Document } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import styles from './page.module.scss';

interface DocumentsResponse {
  documents: Document[];
}

interface CreateDocumentResponse {
  document: Document;
}

export default function DashboardPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => apiFetch<DocumentsResponse>('/documents'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<CreateDocumentResponse>('/documents', {
        method: 'POST',
        body: JSON.stringify({ title: 'Untitled' }),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      router.push(`/documents/${res.document.id}`);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
    onSuccess: () => router.push('/login'),
  });

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Documents</h1>
        <div className={styles.headerActions}>
          <button
            onClick={() => createMutation.mutate()}
            className={styles.createButton}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : '+ New Document'}
          </button>
          <button
            onClick={() => logoutMutation.mutate()}
            className={styles.logoutButton}
          >
            Sign Out
          </button>
        </div>
      </header>

      {isLoading ? (
        <p className={styles.loading}>Loading documents...</p>
      ) : data?.documents.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No documents yet.</p>
          <button
            onClick={() => createMutation.mutate()}
            className={styles.createButton}
          >
            Create your first document
          </button>
        </div>
      ) : (
        <ul className={styles.documentList}>
          {data?.documents.map((doc) => (
            <li key={doc.id} className={styles.documentItem}>
              <button
                onClick={() => router.push(`/documents/${doc.id}`)}
                className={styles.documentButton}
              >
                <span className={styles.documentTitle}>{doc.title}</span>
                <span className={styles.documentDate}>
                  {new Date(doc.updated_at).toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
