import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import { EarningControllers } from "./earning.controller";

const router = Router();

router
  .route("/monthly-history")
  .get(
    guardRole(["carer", "nurse", "cleaner"]),
    EarningControllers.monthlyEarning
  );
router
  .route("/daily-history")
  .get(
    guardRole(["carer", "nurse", "cleaner"]),
    EarningControllers.getEarningsGroupedByDay
  );

export const EarningRoutes = router;
