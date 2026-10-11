import express from "express";
import { UserController } from "./user.controller";

import upload from "../../multer/multer";
import { guardRole } from "../../middlewares/roleGuard";

const router = express.Router();

router.post("/register", upload.single("image"), UserController.registerUser);

router.post("/login", UserController.loginUser);
router.post("/forget-password", UserController.forgotPassword);
router.post("/reset-password", UserController.resetPassword);
router.post("/verify-otp", UserController.verifyOTP);
router.post("/resend-otp", UserController.resendOTP);
router.post(
  "/change-password",
  guardRole(["admin", "carer", "nurse", "cleaner"]),
  UserController.changePassword
);
router.patch(
  "/profile-update",
  guardRole(["admin", "carer", "nurse", "cleaner"]),
  upload.single("image"),
  UserController.updateUser
);

router.get(
  "/my-profile",
  guardRole(["admin", "carer", "nurse", "cleaner"]),
  UserController.getSelfInfo
);

router.delete(
  "/account-delete",
  guardRole(["admin", "carer", "nurse", "cleaner"]),
  UserController.deleteUser
);

//----------------------->Admin route <--------------------------------

router.post("/admin-login", UserController.adminloginUser);
router.get("/user-list", guardRole("admin"), UserController.getAllUsers);

export const UserRoutes = router;
