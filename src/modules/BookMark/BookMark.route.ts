import express from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  createBookMarkController,
  getBookMarkController,
  removeBookMarkController,
} from "./BookMark.controller";

const router = express.Router();

router.get(
  "/add",
  guardRole(["admin", "carer", "nurse", "cleaner"]),
  createBookMarkController
);
router.delete(
  "/remove",
  guardRole(["admin", "carer", "nurse", "cleaner"]),
  removeBookMarkController
);
router.get(
  "/",
  guardRole(["admin", "carer", "nurse", "cleaner"]),
  getBookMarkController
);

export const BookMarkRoutes = router;
