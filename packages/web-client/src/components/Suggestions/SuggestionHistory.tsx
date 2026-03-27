'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import styles from './SuggestionHistory.module.scss';

interface Suggestion {
    id: string;
    document_id: string;
    requested_by: string;
    prompt_type: string;
    suggestion_text: string;
    status: string;
    created_at: string;
}

interface SuggestionsResponse {
    suggestions: Suggestion[];
}

interface SuggestionHistoryProps {
    documentId: string;
}

const STATUS_LABELS: Record<string, string> = {
    accepted: 'Accepted',
    rejected: 'Rejected',
    edited: 'Edited',
    pending: 'Pending',
    streaming: 'Streaming',
};

const STATUS_COLORS: Record<string, string> = {
    accepted: styles.badgeAccepted,
    rejected: styles.badgeRejected,
    edited: styles.badgeEdited,
    pending: styles.badgePending,
    streaming: styles.badgeStreaming,
};

export default function SuggestionHistory({ documentId }: SuggestionHistoryProps) {
    const [isOpen, setIsOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['suggestions', documentId],
        queryFn: () =>
            apiFetch<SuggestionsResponse>(
                `/documents/${documentId}/suggestions?status=accepted,rejected,edited`
            ),
        enabled: isOpen,
    });

    return (
        <div className={styles.container}>
            <button
                onClick={() => setIsOpen((v) => !v)}
                className={styles.toggleButton}
            >
                AI History {isOpen ? '▲' : '▼'}
            </button>

            {isOpen && (
                <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>Past Suggestions</h3>
                    {isLoading ? (
                        <p className={styles.empty}>Loading...</p>
                    ) : data?.suggestions.length === 0 ? (
                        <p className={styles.empty}>No suggestions yet.</p>
                    ) : (
                        <ul className={styles.list}>
                            {data?.suggestions.map((suggestion) => (
                                <li key={suggestion.id} className={styles.suggestionItem}>
                                    <div className={styles.suggestionHeader}>
                                        <span className={styles.promptType}>
                                            {suggestion.prompt_type}
                                        </span>
                                        <span className={`${styles.badge} ${STATUS_COLORS[suggestion.status] ?? ''}`}>
                                            {STATUS_LABELS[suggestion.status] ?? suggestion.status}
                                        </span>
                                    </div>
                                    <p className={styles.suggestionPreview}>
                                        {suggestion.suggestion_text.slice(0, 120)}
                                        {suggestion.suggestion_text.length > 120 ? '...' : ''}
                                    </p>
                                    <span className={styles.suggestionDate}>
                                        {new Date(suggestion.created_at).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
