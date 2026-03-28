'use client';

import { useCallback, useEffect, useState } from 'react';

import type { SuggestionState } from '@/types';
import type { Socket } from 'socket.io-client';

export function useSuggestion(
  socket: Socket | null,
  documentId: string,
  currentUserId: string | null,
) {
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null);

  useEffect(() => {
    if (!socket) return;

    function handleStream({
      token,
      suggestionId,
    }: {
      token: string;
      suggestionId: string;
    }) {
      setSuggestion((prev) => {
        if (prev && prev.id === suggestionId) {
          return { ...prev, text: prev.text + token, status: 'streaming' };
        }
        return prev;
      });
    }

    function handleComplete({
      suggestionId,
      text,
    }: {
      suggestionId: string;
      text: string;
    }) {
      setSuggestion((prev) =>
        prev?.id === suggestionId ? { ...prev, text, status: 'pending' } : prev,
      );
    }

    function handleCommitted() {
      setSuggestion(null);
    }

    function handleRejected() {
      setSuggestion(null);
    }

    function handleError({ message }: { message: string }) {
      console.error('AI error:', message);
      setSuggestion(null);
    }

    socket.on('ai:stream', handleStream);
    socket.on('ai:complete', handleComplete);
    socket.on('ai:committed', handleCommitted);
    socket.on('ai:rejected', handleRejected);
    socket.on('ai:error', handleError);

    return () => {
      socket.off('ai:stream', handleStream);
      socket.off('ai:complete', handleComplete);
      socket.off('ai:committed', handleCommitted);
      socket.off('ai:rejected', handleRejected);
      socket.off('ai:error', handleError);
    };
  }, [socket]);

  const requestSuggestion = useCallback(
    (promptType: string, context: string) => {
      if (!socket || !currentUserId) return;
      const tempId = crypto.randomUUID();
      setSuggestion({
        id: tempId,
        text: '',
        status: 'streaming',
        requestedBy: currentUserId,
      });
      socket.emit('ai:request', { documentId, promptType, context });
    },
    [socket, documentId, currentUserId],
  );

  const acceptSuggestion = useCallback(
    (currentContent: string) => {
      if (!socket || !suggestion) return;
      socket.emit('ai:accept', {
        documentId,
        suggestionId: suggestion.id,
        currentContent,
      });
    },
    [socket, suggestion, documentId],
  );

  const rejectSuggestion = useCallback(() => {
    if (!socket || !suggestion) return;
    socket.emit('ai:reject', { documentId, suggestionId: suggestion.id });
  }, [socket, suggestion, documentId]);

  const editSuggestion = useCallback(
    (editedText: string, currentContent: string) => {
      if (!socket || !suggestion) return;
      socket.emit('ai:edit', {
        documentId,
        suggestionId: suggestion.id,
        editedText,
        currentContent,
      });
    },
    [socket, suggestion, documentId],
  );

  return {
    suggestion,
    requestSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    editSuggestion,
  };
}
