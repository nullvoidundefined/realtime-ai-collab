import {
  addCollaborator,
  createDocument,
  deleteDocument,
  getDocumentById,
  getDocumentByShareToken,
  getUserDocuments,
  getVersions,
  setShareToken,
  updateDocument,
} from 'app/repositories/documents/documents.js';
import { getDocumentSuggestions } from 'app/repositories/suggestions/suggestions.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
} from 'app/schemas/document.js';
import { ApiError } from 'app/utils/ApiError.js';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';

export async function listDocuments(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.session.userId!;
  const docs = await getUserDocuments(userId);
  res.json({ documents: docs });
}

export async function createDocumentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = createDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }

  const userId = req.session.userId!;
  const doc = await createDocument(userId, parsed.data.title ?? 'Untitled');
  res.status(201).json({ document: doc });
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  const doc = await getDocumentById(req.params.id as string);
  if (!doc) {
    throw ApiError.notFound('Document not found');
  }
  res.json({ document: doc });
}

export async function updateDocumentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = updateDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }

  const doc = await updateDocument(req.params.id as string, parsed.data);
  if (!doc) {
    throw ApiError.notFound('Document not found');
  }
  res.json({ document: doc });
}

export async function deleteDocumentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  await deleteDocument(req.params.id as string);
  res.status(204).send();
}

export async function shareDocument(
  req: Request,
  res: Response,
): Promise<void> {
  const doc = await getDocumentById(req.params.id as string);
  if (!doc) {
    throw ApiError.notFound('Document not found');
  }

  const token = doc.share_token ?? randomBytes(32).toString('hex');
  if (!doc.share_token) {
    await setShareToken(req.params.id as string, token);
  }

  const shareUrl = `${process.env.CORS_ORIGIN ?? 'http://localhost:3000'}/join?token=${token}`;
  res.json({ shareUrl, shareToken: token });
}

export async function joinDocument(req: Request, res: Response): Promise<void> {
  const { shareToken } = req.body;
  if (!shareToken) {
    throw ApiError.badRequest('shareToken is required');
  }

  const doc = await getDocumentByShareToken(shareToken);
  if (!doc) {
    throw ApiError.notFound('Invalid share token');
  }

  const userId = req.session.userId!;
  await addCollaborator(doc.id, userId, 'edit');
  res.json({ document: doc });
}

export async function getVersionsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const versions = await getVersions(req.params.id as string);
  res.json({ versions });
}

export async function getSuggestionsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const statusParam = req.query.status as string | undefined;
  const statuses = statusParam ? statusParam.split(',') : undefined;
  const suggestions = await getDocumentSuggestions(
    req.params.id as string,
    statuses,
  );
  res.json({ suggestions });
}
