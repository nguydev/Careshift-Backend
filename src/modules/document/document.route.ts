import express from "express";
import { DocumentController } from "./document.controller";
import { guardRole } from "../../middlewares/roleGuard";
import upload from "../../multer/multer";

const router = express.Router();

router.post(
  "/upload",
  guardRole(["carer", "nurse", "cleaner"]),
  DocumentController.uploadDocument
);
router.patch(
  "/update/:docId",
  guardRole(["admin"]),
  DocumentController.updateDocument
);
router.get(
  "/my-documents",
  guardRole(["carer", "nurse", "cleaner"]),
  DocumentController.getDocuments
);
router
  .route("/upload-file")
  .post(
    guardRole(["carer", "nurse", "cleaner"]),
    upload.single("image"),
    DocumentController.uploadFile
  );
export const DocumentRoutes = router;
