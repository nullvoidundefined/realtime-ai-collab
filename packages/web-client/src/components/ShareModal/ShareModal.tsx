'use client';

import { useState } from 'react';

import { apiFetch } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

import styles from './ShareModal.module.scss';

interface ShareModalProps {
  documentId: string;
  onClose: () => void;
}

interface ShareResponse {
  shareUrl: string;
  shareToken: string;
}

export default function ShareModal({ documentId, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const shareMutation = useMutation({
    mutationFn: () =>
      apiFetch<ShareResponse>(`/documents/${documentId}/share`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
    },
  });

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Share Document</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {!shareUrl ? (
            <>
              <p className={styles.description}>
                Generate a share link to invite collaborators to this document.
              </p>
              <button
                onClick={() => shareMutation.mutate()}
                disabled={shareMutation.isPending}
                className={styles.generateButton}
              >
                {shareMutation.isPending
                  ? 'Generating...'
                  : 'Generate Share Link'}
              </button>
              {shareMutation.isError && (
                <p className={styles.error}>Failed to generate link</p>
              )}
            </>
          ) : (
            <>
              <p className={styles.description}>
                Share this link with collaborators:
              </p>
              <div className={styles.urlRow}>
                <input
                  type='text'
                  readOnly
                  value={shareUrl}
                  className={styles.urlInput}
                />
                <button onClick={handleCopy} className={styles.copyButton}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
