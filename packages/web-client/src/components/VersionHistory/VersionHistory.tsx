'use client';

import { useState } from 'react';

import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

import styles from './VersionHistory.module.scss';

interface Version {
  id: string;
  document_id: string;
  content_snapshot: string;
  created_by: string;
  created_at: string;
}

interface VersionsResponse {
  versions: Version[];
}

interface VersionHistoryProps {
  documentId: string;
  onRestore: (content: string) => void;
}

export default function VersionHistory({
  documentId,
  onRestore,
}: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['versions', documentId],
    queryFn: () =>
      apiFetch<VersionsResponse>(`/documents/${documentId}/versions`),
    enabled: isOpen,
  });

  return (
    <div className={styles.container}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={styles.toggleButton}
      >
        Version History {isOpen ? '▲' : '▼'}
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Saved Versions</h3>
          {isLoading ? (
            <p className={styles.empty}>Loading...</p>
          ) : data?.versions.length === 0 ? (
            <p className={styles.empty}>No versions saved yet.</p>
          ) : (
            <ul className={styles.list}>
              {data?.versions.map((version, index) => (
                <li key={version.id} className={styles.versionItem}>
                  <div className={styles.versionInfo}>
                    <span className={styles.versionLabel}>
                      Version {(data?.versions.length ?? 0) - index}
                    </span>
                    <span className={styles.versionDate}>
                      {new Date(version.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => onRestore(version.content_snapshot)}
                    className={styles.restoreButton}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
