import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import { ArticalsController } from "./articals.controller";

const router = Router();

router
  .route("/")
  .get(
    guardRole(["admin", "carer", "nurse", "cleaner"]),
    ArticalsController.getArticals
  );
export const ArticalsRoute = router;
