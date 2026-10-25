import express from "express";
import {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  saveContent,
  deleteDocument,
  getShareLink,
  joinByShareId,
} from "../controllers/documentController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getDocuments).post(createDocument);
router.post("/join/:shareId", joinByShareId);
router.get("/:id/share", getShareLink);
router
  .route("/:id")
  .get(getDocument)
  .patch(updateDocument)
  .delete(deleteDocument);
router.put("/:id/content", saveContent);

export default router;
