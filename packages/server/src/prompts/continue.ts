export function buildContinuePrompt(context: string): string {
  return `Continue writing from where the document leaves off, maintaining the same tone and style. Document so far:\n\n${context}`;
}
