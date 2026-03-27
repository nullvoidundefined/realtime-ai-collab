'use client';

import styles from './SuggestionControls.module.scss';

interface SuggestionControlsProps {
    onRequest: (promptType: string, context: string) => void;
    content: string;
    selectedText: string;
    disabled: boolean;
}

export default function SuggestionControls({
    onRequest,
    content,
    selectedText,
    disabled,
}: SuggestionControlsProps) {
    const hasSelection = selectedText.trim().length > 0;

    return (
        <div className={styles.container}>
            <span className={styles.label}>AI Assist:</span>
            <button
                onClick={() => onRequest('continue', content)}
                disabled={disabled}
                className={styles.button}
            >
                Continue
            </button>
            <button
                onClick={() => onRequest('summarize', content)}
                disabled={disabled}
                className={styles.button}
            >
                Summarize
            </button>
            {hasSelection && (
                <>
                    <button
                        onClick={() => onRequest('improve', selectedText)}
                        disabled={disabled}
                        className={styles.button}
                    >
                        Improve
                    </button>
                    <button
                        onClick={() => onRequest('expand', selectedText)}
                        disabled={disabled}
                        className={styles.button}
                    >
                        Expand
                    </button>
                </>
            )}
        </div>
    );
}
