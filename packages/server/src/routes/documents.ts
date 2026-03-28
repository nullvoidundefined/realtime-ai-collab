import { Router } from "express";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";
import {
    listDocuments,
    createDocumentHandler,
    getDocument,
    updateDocumentHandler,
    deleteDocumentHandler,
    shareDocument,
    joinDocument,
    getVersionsHandler,
    getSuggestionsHandler,
} from "app/handlers/documents/documents.js";

const router = Router();

router.use(requireAuth);

router.get("/", listDocuments);
router.post("/", createDocumentHandler);
router.post("/join", joinDocument);
router.get("/:id", getDocument);
router.put("/:id", updateDocumentHandler);
router.delete("/:id", deleteDocumentHandler);
router.post("/:id/share", shareDocument);
router.get("/:id/versions", getVersionsHandler);
router.get("/:id/suggestions", getSuggestionsHandler);

export { router as documentsRouter };
