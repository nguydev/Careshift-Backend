import express from "express";
import {
  adminSendPushNotification,
  getMyNotification,
  getUnreadBadgeCount,
} from "./notification.controller";
import { guardRole } from "../../middlewares/roleGuard";

const router = express.Router();

router.get(
  "/",
  guardRole(["admin", "carer", "nurse", "cleaner"]),
  getMyNotification
);
router.get(
  "/badge-count",
  guardRole(["admin", "carer", "nurse", "cleaner"]),
  getUnreadBadgeCount
);
router.post("/send-push", guardRole("admin"), adminSendPushNotification); //-----> inpout
// {
//   "fcmTokens": ["user_token_1", "user_token_2"],
//   "title": "Important Update",
//   "body": "Please check the latest news in your app."
// }

export const NotificationRoutes = router;
