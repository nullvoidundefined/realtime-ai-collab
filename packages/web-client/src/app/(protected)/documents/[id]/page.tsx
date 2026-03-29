'use client';

import { useCallback, useEffect, useState } from 'react';

import PresenceAvatars from '@/components/Editor/PresenceAvatars';
import TiptapEditor from '@/components/Editor/TiptapEditor';
import ShareModal from '@/components/ShareModal/ShareModal';
import SuggestionControls from '@/components/Suggestions/SuggestionControls';
import SuggestionOverlay from '@/components/Suggestions/SuggestionOverlay';
import { usePresence } from '@/hooks/usePresence';
import { useSocket } from '@/hooks/useSocket';
import { useSuggestion } from '@/hooks/useSuggestion';
import { apiFetch } from '@/lib/api';
import type { Document, User } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import styles from './page.module.scss';

interface DocumentResponse {
  document: Document;
}

interface MeResponse {
  user: User;
}

export default function DocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<MeResponse>('/auth/me'),
  });

  const currentUser = meData?.user ?? null;

  const { data: docData, isLoading } = useQuery({
    queryKey: ['document', params.id],
    queryFn: () => apiFetch<DocumentResponse>(`/documents/${params.id}`),
  });

  useEffect(() => {
    if (docData?.document) {
      setContent(docData.document.content);
    }
  }, [docData]);

  const { socket, connected } = useSocket(currentUser?.id ?? null);

  useEffect(() => {
    if (socket && params.id) {
      socket.emit('join', params.id);
    }
  }, [socket, params.id]);

  const presenceUsers = usePresence(socket, currentUser?.id ?? null);
  const {
    suggestion,
    requestSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    editSuggestion,
  } = useSuggestion(socket, params.id, currentUser?.id ?? null);

  const titleMutation = useMutation({
    mutationFn: (title: string) =>
      apiFetch(`/documents/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['document', params.id] }),
  });

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Listen for ai:committed to update local content
  useEffect(() => {
    if (!socket) return;
    function handleCommitted({ content: newContent }: { content: string }) {
      setContent(newContent);
    }
    socket.on('ai:committed', handleCommitted);
    return () => {
      socket.off('ai:committed', handleCommitted);
    };
  }, [socket]);

  // Keyboard shortcut: Cmd+Enter to accept
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === 'Enter' &&
        suggestion?.status === 'pending'
      ) {
        acceptSuggestion(content);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestion, acceptSuggestion, content]);

  if (isLoading) {
    return <div className={styles.loading}>Loading document...</div>;
  }

  const doc = docData?.document;
  const isRequester = suggestion?.requestedBy === currentUser?.id;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          onClick={() => router.push('/dashboard')}
          className={styles.backButton}
        >
          ← Dashboard
        </button>
        <input
          type='text'
          defaultValue={doc?.title ?? 'Untitled'}
          className={styles.titleInput}
          onBlur={(e) => titleMutation.mutate(e.target.value)}
          aria-label='Document title'
        />
        <div className={styles.headerRight}>
          <button
            onClick={() => setShowShareModal(true)}
            className={styles.shareButton}
          >
            Share
          </button>
          <span
            className={
              connected ? styles.connectedBadge : styles.disconnectedBadge
            }
          >
            {connected ? 'Live' : 'Offline'}
          </span>
          <PresenceAvatars users={presenceUsers} />
        </div>
      </header>

      <div className={styles.toolbar}>
        <SuggestionControls
          onRequest={requestSuggestion}
          content={content}
          selectedText={selectedText}
          disabled={!!suggestion}
        />
      </div>

      <div className={styles.editorContainer}>
        <TiptapEditor
          content={content}
          onChange={handleContentChange}
          documentId={params.id}
          socket={socket}
        />

        {suggestion && (
          <SuggestionOverlay
            suggestion={suggestion}
            isRequester={isRequester}
            onAccept={acceptSuggestion}
            onReject={rejectSuggestion}
            onEdit={editSuggestion}
            currentContent={content}
          />
        )}
      </div>

      {showShareModal && (
        <ShareModal
          documentId={params.id}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
