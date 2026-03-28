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
} from 'app/handlers/documents/documents.js';
import { requireAuth } from 'app/middleware/requireAuth/requireAuth.js';
import { Router } from 'express';

const router = Router();

router.use(requireAuth);

router.get('/', listDocuments);
router.post('/', createDocumentHandler);
router.post('/join', joinDocument);
router.get('/:id', getDocument);
router.put('/:id', updateDocumentHandler);
router.delete('/:id', deleteDocumentHandler);
router.post('/:id/share', shareDocument);
router.get('/:id/versions', getVersionsHandler);
router.get('/:id/suggestions', getSuggestionsHandler);

export { router as documentsRouter };
