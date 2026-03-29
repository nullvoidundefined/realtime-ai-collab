import {
  addCollaborator,
  createDocument,
  deleteDocument,
  getDocumentById,
  getDocumentByShareToken,
  getUserDocuments,
  getVersions,
  updateDocument,
} from 'app/repositories/documents/documents.js';
import { getDocumentSuggestions } from 'app/repositories/suggestions/suggestions.js';
import { ApiError } from 'app/utils/ApiError.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDocumentHandler,
  deleteDocumentHandler,
  getDocument,
  getSuggestionsHandler,
  getVersionsHandler,
  joinDocument,
  listDocuments,
  shareDocument,
  updateDocumentHandler,
} from './documents.js';

vi.mock('app/repositories/documents/documents.js', () => ({
  createDocument: vi.fn(),
  getDocumentById: vi.fn(),
  getUserDocuments: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  setShareToken: vi.fn(),
  getDocumentByShareToken: vi.fn(),
  addCollaborator: vi.fn(),
  getVersions: vi.fn(),
}));

vi.mock('app/repositories/suggestions/suggestions.js', () => ({
  getDocumentSuggestions: vi.fn(),
}));

function createMockReq(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    query: {},
    session: { userId: 'user-1' },
    ...overrides,
  } as any;
}

function createMockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return res;
}

describe('listDocuments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns documents for the authenticated user', async () => {
    const docs = [{ id: 'doc-1', title: 'Test' }];
    (getUserDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(docs);

    const req = createMockReq();
    const res = createMockRes();

    await listDocuments(req, res);

    expect(getUserDocuments).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith({ documents: docs });
  });
});

describe('createDocumentHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a document with title', async () => {
    const doc = { id: 'doc-1', title: 'New Doc' };
    (createDocument as ReturnType<typeof vi.fn>).mockResolvedValue(doc);

    const req = createMockReq({ body: { title: 'New Doc' } });
    const res = createMockRes();

    await createDocumentHandler(req, res);

    expect(createDocument).toHaveBeenCalledWith('user-1', 'New Doc');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('creates a document with default title when none provided', async () => {
    const doc = { id: 'doc-1', title: 'Untitled' };
    (createDocument as ReturnType<typeof vi.fn>).mockResolvedValue(doc);

    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await createDocumentHandler(req, res);

    expect(createDocument).toHaveBeenCalledWith('user-1', 'Untitled');
  });

  it('throws VALIDATION_ERROR for empty string title', async () => {
    const req = createMockReq({ body: { title: '' } });
    const res = createMockRes();

    await expect(createDocumentHandler(req, res)).rejects.toThrow(ApiError);
    await expect(createDocumentHandler(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('getDocument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the document when found', async () => {
    const doc = { id: 'doc-1', title: 'Test' };
    (getDocumentById as ReturnType<typeof vi.fn>).mockResolvedValue(doc);

    const req = createMockReq({ params: { id: 'doc-1' } });
    const res = createMockRes();

    await getDocument(req, res);

    expect(res.json).toHaveBeenCalledWith({ document: doc });
  });

  it('throws NOT_FOUND when document not found', async () => {
    (getDocumentById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = createMockReq({ params: { id: 'missing' } });
    const res = createMockRes();

    await expect(getDocument(req, res)).rejects.toThrow(ApiError);
    await expect(getDocument(req, res)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('updateDocumentHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates document fields', async () => {
    const doc = { id: 'doc-1', title: 'Updated' };
    (updateDocument as ReturnType<typeof vi.fn>).mockResolvedValue(doc);

    const req = createMockReq({
      params: { id: 'doc-1' },
      body: { title: 'Updated' },
    });
    const res = createMockRes();

    await updateDocumentHandler(req, res);

    expect(updateDocument).toHaveBeenCalledWith('doc-1', { title: 'Updated' });
    expect(res.json).toHaveBeenCalledWith({ document: doc });
  });

  it('throws NOT_FOUND when document not found', async () => {
    (updateDocument as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = createMockReq({
      params: { id: 'missing' },
      body: { title: 'X' },
    });
    const res = createMockRes();

    await expect(updateDocumentHandler(req, res)).rejects.toThrow(ApiError);
    await expect(updateDocumentHandler(req, res)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws VALIDATION_ERROR for invalid body', async () => {
    const req = createMockReq({
      params: { id: 'doc-1' },
      body: { title: '' },
    });
    const res = createMockRes();

    await expect(updateDocumentHandler(req, res)).rejects.toThrow(ApiError);
    await expect(updateDocumentHandler(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('deleteDocumentHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the document and returns 204', async () => {
    (deleteDocument as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = createMockReq({ params: { id: 'doc-1' } });
    const res = createMockRes();

    await deleteDocumentHandler(req, res);

    expect(deleteDocument).toHaveBeenCalledWith('doc-1');
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('shareDocument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when document not found', async () => {
    (getDocumentById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = createMockReq({ params: { id: 'missing' } });
    const res = createMockRes();

    await expect(shareDocument(req, res)).rejects.toThrow(ApiError);
    await expect(shareDocument(req, res)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns existing share token when already set', async () => {
    (getDocumentById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'doc-1',
      share_token: 'existing-token',
    });

    const req = createMockReq({ params: { id: 'doc-1' } });
    const res = createMockRes();

    await shareDocument(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ shareToken: 'existing-token' }),
    );
  });
});

describe('joinDocument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_ERROR when shareToken missing', async () => {
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await expect(joinDocument(req, res)).rejects.toThrow(ApiError);
    await expect(joinDocument(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws NOT_FOUND for invalid share token', async () => {
    (getDocumentByShareToken as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );

    const req = createMockReq({ body: { shareToken: 'invalid' } });
    const res = createMockRes();

    await expect(joinDocument(req, res)).rejects.toThrow(ApiError);
    await expect(joinDocument(req, res)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('adds collaborator and returns document on success', async () => {
    const doc = { id: 'doc-1', title: 'Shared' };
    (getDocumentByShareToken as ReturnType<typeof vi.fn>).mockResolvedValue(
      doc,
    );
    (addCollaborator as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = createMockReq({ body: { shareToken: 'valid-token' } });
    const res = createMockRes();

    await joinDocument(req, res);

    expect(addCollaborator).toHaveBeenCalledWith('doc-1', 'user-1', 'edit');
    expect(res.json).toHaveBeenCalledWith({ document: doc });
  });
});

describe('getVersionsHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns versions for a document', async () => {
    const versions = [{ id: 'v-1' }];
    (getVersions as ReturnType<typeof vi.fn>).mockResolvedValue(versions);

    const req = createMockReq({ params: { id: 'doc-1' } });
    const res = createMockRes();

    await getVersionsHandler(req, res);

    expect(getVersions).toHaveBeenCalledWith('doc-1');
    expect(res.json).toHaveBeenCalledWith({ versions });
  });
});

describe('getSuggestionsHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all suggestions when no status filter', async () => {
    const suggestions = [{ id: 's-1' }];
    (getDocumentSuggestions as ReturnType<typeof vi.fn>).mockResolvedValue(
      suggestions,
    );

    const req = createMockReq({ params: { id: 'doc-1' }, query: {} });
    const res = createMockRes();

    await getSuggestionsHandler(req, res);

    expect(getDocumentSuggestions).toHaveBeenCalledWith('doc-1', undefined);
    expect(res.json).toHaveBeenCalledWith({ suggestions });
  });

  it('passes status filter when provided', async () => {
    (getDocumentSuggestions as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = createMockReq({
      params: { id: 'doc-1' },
      query: { status: 'pending,accepted' },
    });
    const res = createMockRes();

    await getSuggestionsHandler(req, res);

    expect(getDocumentSuggestions).toHaveBeenCalledWith('doc-1', [
      'pending',
      'accepted',
    ]);
  });
});
