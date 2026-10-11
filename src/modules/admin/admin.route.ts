import { Router } from "express";

// import {
//   handleWorkDay,
//   viewAvailability,
// } from '../availability/availability.controller';

import { guardRole } from "../../middlewares/roleGuard";
import { AdminController } from "./admin.controller";
import upload from "../../multer/multer";
const router = Router();

router.route("/clients-list").get(guardRole("admin"), AdminController.clients);
router.route("/driver-list").get(guardRole("admin"), AdminController.drivers);

router
  .route("/change-user/status/:userId")
  .get(guardRole("admin"), AdminController.changeUserStatus);

router
  .route("/add-artical")
  .post(guardRole("admin"), upload.single("image"), AdminController.addArtical);

router
  .route("/update-artical/:articalId")
  .patch(
    guardRole("admin"),
    upload.single("image"),
    AdminController.updateArtical
  );

router.route("/add-faq").post(guardRole("admin"), AdminController.addFaq);

router
  .route("/update-faq/:faqId")
  .patch(guardRole("admin"), AdminController.updateFAQ);
//===============================================
router
  .route("/dashboard/stacks")
  .get(guardRole("admin"), AdminController.dashboardStacks);

router
  .route("/dashboard/user-chart")
  .get(guardRole("admin"), AdminController.dashboardUserChart);

router
  .route("/dashboard/workers")
  .get(guardRole("admin"), AdminController.workers);
router
  .route("/notification/workers")
  .get(guardRole("admin"), AdminController.workersForNotification);

router
  .route("/dashboard/worker/:userId")
  .get(guardRole("admin"), AdminController.getWorker);

router
  .route("/dashboard/update-wstatus/:userId")
  .patch(guardRole("admin"), AdminController.updateWorkerStatus);
router
  .route("/monthly-history/:userId")
  .get(guardRole("admin"), AdminController.monthlyEarning);

router
  .route("/daily-history/:userId")
  .get(guardRole("admin"), AdminController.getEarningsGroupedByDay);
router
  .route("/payment-status/:userId")
  .patch(guardRole("admin"), AdminController.paymentStatus);
router.get("/shift/get/:id", guardRole("admin"), AdminController.getShiftById);
router.get(
  "/shift/get-mini/:id",
  guardRole("admin"),
  AdminController.getShiftMiniById
);
router.patch(
  "/shift/action/:shiftId",
  guardRole("admin"),
  AdminController.shiftAction
);

router.get("/shift", guardRole("admin"), AdminController.getShift);
router.get(
  "/shift-applyedWorker/:shiftId",
  guardRole("admin"),
  AdminController.applyedWorker
);
router.get("/shifts", guardRole("admin"), AdminController.getShifts);
router.get(
  "/schedule/:userId",
  guardRole("admin"),
  AdminController.getUserSchedule
);
router.get("/profit-filter", guardRole("admin"), AdminController.profitFilter);
router.get(
  "/profit-filter-details/:shiftId",
  guardRole("admin"),
  AdminController.profitFilterDetails
);
export const AdminRoutes = router;
