import { Document, Types } from "mongoose";

// Define the INotification type
export type INotification = {
  userId?: Types.ObjectId;
  adminId?: Types.ObjectId[]; // Optional array of ObjectId
  adminMsg?: string;
  userMsgTittle: string;
  adminMsgTittle: string;
  userMsg?: string;
  isUserRead?: boolean;
  isAdminRead?: boolean;
  unreadCount: number;
  createdAt: Date;
} & Document;

//--------> for push notifications <----------------------
export type INotificationPayload = {
  title: string;
  body: string;
};
