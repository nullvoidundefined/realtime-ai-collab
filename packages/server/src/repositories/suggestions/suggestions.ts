import { query } from 'app/db/pool/pool.js';

export interface SuggestionRow {
  id: string;
  document_id: string;
  requested_by: string;
  prompt_type: string;
  suggestion_text: string;
  status: string;
  resolved_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createSuggestion(params: {
  documentId: string;
  requestedBy: string;
  promptType: string;
}): Promise<SuggestionRow> {
  const result = await query<SuggestionRow>(
    `INSERT INTO ai_suggestions (document_id, requested_by, prompt_type, status)
         VALUES ($1, $2, $3, 'streaming')
         RETURNING *`,
    [params.documentId, params.requestedBy, params.promptType],
  );
  return result.rows[0];
}

export async function updateSuggestionStatus(
  id: string,
  status: string,
  resolvedBy?: string,
  text?: string,
): Promise<SuggestionRow | null> {
  const sets: string[] = ['status = $1'];
  const values: unknown[] = [status];
  let i = 2;

  if (resolvedBy !== undefined) {
    sets.push(`resolved_by = $${i++}`);
    values.push(resolvedBy);
  }
  if (text !== undefined) {
    sets.push(`suggestion_text = $${i++}`);
    values.push(text);
  }

  values.push(id);
  const result = await query<SuggestionRow>(
    `UPDATE ai_suggestions SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function getSuggestionById(
  id: string,
): Promise<SuggestionRow | null> {
  const result = await query<SuggestionRow>(
    'SELECT * FROM ai_suggestions WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

export async function getDocumentSuggestions(
  documentId: string,
  statuses?: string[],
): Promise<SuggestionRow[]> {
  if (statuses && statuses.length > 0) {
    const placeholders = statuses.map((_, i) => `$${i + 2}`).join(', ');
    const result = await query<SuggestionRow>(
      `SELECT * FROM ai_suggestions WHERE document_id = $1 AND status IN (${placeholders}) ORDER BY created_at DESC`,
      [documentId, ...statuses],
    );
    return result.rows;
  }

  const result = await query<SuggestionRow>(
    'SELECT * FROM ai_suggestions WHERE document_id = $1 ORDER BY created_at DESC',
    [documentId],
  );
  return result.rows;
}
