import express from "express";
import { ShiftController } from "./shift.controller";
import { guardRole } from "../../middlewares/roleGuard";
import upload from "../../multer/multer";
import { checkQualification } from "../../middlewares/qualificationCheck";

const router = express.Router();

router.post(
  "/",
  guardRole("admin"),
  upload.single("image"),
  ShiftController.createShiftController
);
router.get(
  "/",
  guardRole(["carer", "nurse", "cleaner"]),
  ShiftController.getShiftController
);

router.get(
  "/get/:id",
  guardRole(["carer", "nurse", "cleaner"]),
  ShiftController.getShiftByIdController
);

router
  .route("/apply/:shiftId")
  .post(
    guardRole(["carer", "nurse", "cleaner"]),
    checkQualification,
    ShiftController.applyShift
  );
router
  .route("/action/:applicationId")
  .patch(guardRole(["admin"]), ShiftController.action);
router
  .route("/status/:shiftId")
  .get(guardRole(["carer", "nurse", "cleaner"]), ShiftController.status);
router
  .route("/today-shift")
  .get(guardRole(["carer", "nurse", "cleaner"]), ShiftController.myShift);

router
  .route("/my-booking")
  .get(guardRole(["carer", "nurse", "cleaner"]), ShiftController.myBooking);
router
  .route("/my-booking/:shiftId")
  .get(guardRole(["carer", "nurse", "cleaner"]), ShiftController.myBookingById);

router
  .route("/today-checkin/:shiftId")
  .post(guardRole(["carer", "nurse", "cleaner"]), ShiftController.checkin);

router
  .route("/today-checkout/:shiftId")
  .post(guardRole(["carer", "nurse", "cleaner"]), ShiftController.checkout);

export const ShiftRoutes = router;
