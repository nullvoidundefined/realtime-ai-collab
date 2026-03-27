export function buildSummarizePrompt(context: string): string {
    return `Condense the following text into a brief summary:\n\n${context}`;
}
