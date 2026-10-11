import mongoose, { Schema } from "mongoose";
import { INotification } from "./notification.interface";

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    adminId: [{ type: Schema.Types.ObjectId, ref: "User" }],
    userMsgTittle: { type: String },
    adminMsgTittle: { type: String },
    adminMsg: { type: String },
    userMsg: { type: String },
    isUserRead: { type: Boolean, default: false },
    isAdminRead: { type: Boolean, default: false },
    unreadCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const NotificationModel =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
