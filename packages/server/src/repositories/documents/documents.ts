import { query } from "app/db/pool/pool.js";
import type { Document } from "app/schemas/document.js";

export interface DocumentRow extends Document {}

export interface CollaboratorRow {
    document_id: string;
    user_id: string;
    permission: string;
}

export interface VersionRow {
    id: string;
    document_id: string;
    content_snapshot: string;
    created_by: string;
    created_at: Date;
}

export async function createDocument(ownerId: string, title: string = "Untitled"): Promise<DocumentRow> {
    const result = await query<DocumentRow>(
        "INSERT INTO documents (owner_id, title) VALUES ($1, $2) RETURNING *",
        [ownerId, title]
    );
    return result.rows[0];
}

export async function getDocumentById(id: string): Promise<DocumentRow | null> {
    const result = await query<DocumentRow>(
        "SELECT * FROM documents WHERE id = $1",
        [id]
    );
    return result.rows[0] ?? null;
}

export async function getUserDocuments(userId: string): Promise<DocumentRow[]> {
    const result = await query<DocumentRow>(
        `SELECT DISTINCT d.* FROM documents d
         LEFT JOIN document_collaborators dc ON dc.document_id = d.id
         WHERE d.owner_id = $1 OR dc.user_id = $1
         ORDER BY d.updated_at DESC`,
        [userId]
    );
    return result.rows;
}

export async function updateDocument(id: string, fields: { title?: string; content?: string }): Promise<DocumentRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (fields.title !== undefined) {
        sets.push(`title = $${i++}`);
        values.push(fields.title);
    }
    if (fields.content !== undefined) {
        sets.push(`content = $${i++}`);
        values.push(fields.content);
    }

    if (sets.length === 0) return getDocumentById(id);

    values.push(id);
    const result = await query<DocumentRow>(
        `UPDATE documents SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
        values
    );
    return result.rows[0] ?? null;
}

export async function deleteDocument(id: string): Promise<void> {
    await query("DELETE FROM documents WHERE id = $1", [id]);
}

export async function setShareToken(id: string, token: string): Promise<DocumentRow | null> {
    const result = await query<DocumentRow>(
        "UPDATE documents SET share_token = $1 WHERE id = $2 RETURNING *",
        [token, id]
    );
    return result.rows[0] ?? null;
}

export async function getDocumentByShareToken(token: string): Promise<DocumentRow | null> {
    const result = await query<DocumentRow>(
        "SELECT * FROM documents WHERE share_token = $1",
        [token]
    );
    return result.rows[0] ?? null;
}

export async function addCollaborator(documentId: string, userId: string, permission: string = "edit"): Promise<void> {
    await query(
        `INSERT INTO document_collaborators (document_id, user_id, permission) VALUES ($1, $2, $3)
         ON CONFLICT (document_id, user_id) DO UPDATE SET permission = $3`,
        [documentId, userId, permission]
    );
}

export async function createVersion(documentId: string, contentSnapshot: string, createdBy: string): Promise<VersionRow> {
    const result = await query<VersionRow>(
        "INSERT INTO document_versions (document_id, content_snapshot, created_by) VALUES ($1, $2, $3) RETURNING *",
        [documentId, contentSnapshot, createdBy]
    );
    return result.rows[0];
}

export async function getVersions(documentId: string): Promise<VersionRow[]> {
    const result = await query<VersionRow>(
        "SELECT * FROM document_versions WHERE document_id = $1 ORDER BY created_at DESC",
        [documentId]
    );
    return result.rows;
}
