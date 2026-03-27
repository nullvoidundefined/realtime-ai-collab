'use client';

import { useState } from 'react';
import type { SuggestionState } from '@/types';
import styles from './SuggestionOverlay.module.scss';

interface SuggestionOverlayProps {
    suggestion: SuggestionState;
    isRequester: boolean;
    onAccept: (currentContent: string) => void;
    onReject: () => void;
    onEdit: (editedText: string, currentContent: string) => void;
    currentContent: string;
}

export default function SuggestionOverlay({
    suggestion,
    isRequester,
    onAccept,
    onReject,
    onEdit,
    currentContent,
}: SuggestionOverlayProps) {
    const [editMode, setEditMode] = useState(false);
    const [editedText, setEditedText] = useState(suggestion.text);

    const isStreaming = suggestion.status === 'streaming';

    function handleEdit() {
        setEditedText(suggestion.text);
        setEditMode(true);
    }

    function handleSaveEdit() {
        onEdit(editedText, currentContent);
        setEditMode(false);
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.header}>
                <span className={styles.label}>
                    {isStreaming ? 'AI is writing...' : 'AI Suggestion'}
                </span>
                {isStreaming && <span className={styles.spinner} />}
            </div>

            {editMode ? (
                <textarea
                    className={styles.editArea}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={6}
                />
            ) : (
                <div className={styles.suggestionText}>
                    {suggestion.text}
                    {isStreaming && <span className={styles.cursor}>|</span>}
                </div>
            )}

            {isRequester && !isStreaming && (
                <div className={styles.actions}>
                    {editMode ? (
                        <>
                            <button onClick={handleSaveEdit} className={styles.acceptButton}>
                                Save Edit
                            </button>
                            <button onClick={() => setEditMode(false)} className={styles.rejectButton}>
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => onAccept(currentContent)} className={styles.acceptButton}>
                                Accept
                            </button>
                            <button onClick={handleEdit} className={styles.editButton}>
                                Edit
                            </button>
                            <button onClick={onReject} className={styles.rejectButton}>
                                Reject
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
